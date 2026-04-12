import { Hono } from 'hono';
import { z } from 'zod';
import { getPaymentProvider } from '../lib/payment';
import { err, ok } from '../lib/response';
import type { AuthVariables } from '../middleware/auth-types';
import { sessionMiddleware } from '../middleware/session';
import type { Env } from '../types/env';

const checkoutSchema = z.object({
  tier: z.enum(['pro', 'team']),
});

interface BillingUserRow {
  email: string;
  stripe_customer_id: string | null;
  dodo_customer_id: string | null;
  payment_subscription_id: string | null;
  tier: string;
  credits_balance: number | null;
}

interface CreditsAggregateRow {
  credited: number | string | null;
  debited: number | string | null;
}

interface UsageAggregateRow {
  category: string;
  total: number | string;
}

function monthStartUnix(now: Date): number {
  return Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1) / 1000);
}

export const billingRouter = new Hono<{
  Bindings: Env;
  Variables: AuthVariables;
}>();

billingRouter.use('*', sessionMiddleware);

// POST /api/v1/billing/checkout
billingRouter.post('/checkout', async (c) => {
  const rawBody: unknown = await c.req.json().catch(() => null);
  const parsedBody = checkoutSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    const message = parsedBody.error.issues[0]?.message ?? 'Invalid request body';
    return c.json(err(message, 400), 400);
  }

  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const provider = getPaymentProvider(c.env);

  const user = await c.env.DB.prepare(
    `SELECT email, stripe_customer_id, dodo_customer_id, payment_subscription_id, tier, credits_balance
     FROM users
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(userId)
    .first<BillingUserRow>();

  if (!user) {
    return c.json(err('User not found', 404), 404);
  }

  const existingCustomerId =
    c.env.PAYMENT_PROVIDER === 'dodo' ? user.dodo_customer_id : user.stripe_customer_id;

  const result = await provider.createCheckout({
    userId,
    userEmail: user.email,
    tier: parsedBody.data.tier,
    existingCustomerId,
  });

  if (c.env.PAYMENT_PROVIDER === 'dodo') {
    await c.env.DB.prepare(
      `UPDATE users
       SET payment_provider = 'dodo',
           payment_subscription_id = COALESCE(?, payment_subscription_id),
           dodo_customer_id = COALESCE(?, dodo_customer_id)
       WHERE id = ?`,
    )
      .bind(
        result.dodo_checkout_id ?? null,
        result.dodo_customer_id ?? existingCustomerId ?? null,
        userId,
      )
      .run();
  } else {
    await c.env.DB.prepare(
      `UPDATE users
       SET payment_provider = 'stripe'
       WHERE id = ?`,
    )
      .bind(userId)
      .run();
  }

  return c.json(ok(result), 200);
});

// GET /api/v1/billing/subscription
billingRouter.get('/subscription', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const provider = getPaymentProvider(c.env);

  const user = await c.env.DB.prepare(
    `SELECT stripe_customer_id, dodo_customer_id, payment_subscription_id, tier, credits_balance
     FROM users
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(userId)
    .first<{
      stripe_customer_id: string | null;
      dodo_customer_id: string | null;
      payment_subscription_id: string | null;
      tier: string;
      credits_balance: number | null;
    }>();

  if (!user) {
    return c.json(err('User not found', 404), 404);
  }

  const customerId =
    c.env.PAYMENT_PROVIDER === 'dodo' ? user.dodo_customer_id : user.stripe_customer_id;

  const status = await provider.getSubscriptionStatus({
    customerId,
    subscriptionId: user.payment_subscription_id,
  });

  return c.json(
    ok({
      ...status,
      credits_balance: user.credits_balance ?? 0,
    }),
    200,
  );
});

// GET /api/v1/billing/credits
billingRouter.get('/credits', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const user = await c.env.DB.prepare(
    `SELECT tier, credits_balance
     FROM users
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(userId)
    .first<{ tier: string; credits_balance: number | null }>();

  if (!user) {
    return c.json(err('User not found', 404), 404);
  }

  const monthStart = monthStartUnix(new Date());
  const aggregate = await c.env.DB.prepare(
    `SELECT
       COALESCE(SUM(CASE WHEN delta > 0 THEN delta ELSE 0 END), 0) AS credited,
       COALESCE(SUM(CASE WHEN delta < 0 THEN -delta ELSE 0 END), 0) AS debited
     FROM credit_transactions
     WHERE user_id = ? AND created_at >= ?`,
  )
    .bind(userId, monthStart)
    .first<CreditsAggregateRow>();

  return c.json(
    ok({
      tier: user.tier,
      credits_balance: user.credits_balance ?? 0,
      credited_this_month: Number(aggregate?.credited ?? 0),
      debited_this_month: Number(aggregate?.debited ?? 0),
    }),
    200,
  );
});

// GET /api/v1/billing/usage
billingRouter.get('/usage', async (c) => {
  const userId = c.get('userId');
  if (!userId) {
    return c.json(err('Unauthorized', 401), 401);
  }

  const monthStart = monthStartUnix(new Date());
  const rows = await c.env.DB.prepare(
    `SELECT category, COALESCE(SUM(value), 0) AS total
     FROM usage_events
     WHERE user_id = ? AND period_start >= ?
     GROUP BY category`,
  )
    .bind(userId, monthStart)
    .all<UsageAggregateRow>();

  const usage = {
    simulation_runs: 0,
    replay_storage_bytes: 0,
  };

  for (const row of rows.results ?? []) {
    if (row.category === 'simulation_run') {
      usage.simulation_runs = Number(row.total);
    }
    if (row.category === 'replay_storage_bytes') {
      usage.replay_storage_bytes = Number(row.total);
    }
  }

  return c.json(ok(usage), 200);
});

export default billingRouter;
