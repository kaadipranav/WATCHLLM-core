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
  razorpay_customer_id: string | null;
  payment_subscription_id: string | null;
  tier: string;
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
    `SELECT email, stripe_customer_id, razorpay_customer_id, payment_subscription_id, tier
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
    c.env.PAYMENT_PROVIDER === 'razorpay' ? user.razorpay_customer_id : user.stripe_customer_id;

  const result = await provider.createCheckout({
    userId,
    userEmail: user.email,
    tier: parsedBody.data.tier,
    existingCustomerId,
  });

  if (c.env.PAYMENT_PROVIDER === 'razorpay') {
    await c.env.DB.prepare(
      `UPDATE users
       SET payment_provider = 'razorpay',
           payment_subscription_id = COALESCE(?, payment_subscription_id)
       WHERE id = ?`,
    )
      .bind(result.razorpay_order_id ?? null, userId)
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
    `SELECT stripe_customer_id, razorpay_customer_id, payment_subscription_id, tier
     FROM users
     WHERE id = ?
     LIMIT 1`,
  )
    .bind(userId)
    .first<{
      stripe_customer_id: string | null;
      razorpay_customer_id: string | null;
      payment_subscription_id: string | null;
      tier: string;
    }>();

  if (!user) {
    return c.json(err('User not found', 404), 404);
  }

  const customerId =
    c.env.PAYMENT_PROVIDER === 'razorpay' ? user.razorpay_customer_id : user.stripe_customer_id;

  const status = await provider.getSubscriptionStatus({
    customerId,
    subscriptionId: user.payment_subscription_id,
  });

  return c.json(ok(status), 200);
});

export default billingRouter;
