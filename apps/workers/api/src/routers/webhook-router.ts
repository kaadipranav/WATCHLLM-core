import { Hono } from 'hono';
import { getPaymentProvider } from '../lib/payment';
import { err, ok } from '../lib/response';
import type { Env } from '../types/env';

export const webhookRouter = new Hono<{ Bindings: Env }>();

async function applyDodoUpdate(
  env: Env,
  tier: 'pro' | 'team' | 'free',
  customerId: string | null,
  subscriptionId: string | null,
): Promise<void> {
  if (customerId && subscriptionId) {
    await env.DB.prepare(
      `UPDATE users
       SET tier = ?,
           payment_provider = 'dodo',
           payment_subscription_id = COALESCE(?, payment_subscription_id),
           dodo_customer_id = COALESCE(?, dodo_customer_id)
       WHERE dodo_customer_id = ? OR payment_subscription_id = ?`,
    )
      .bind(tier, subscriptionId, customerId, customerId, subscriptionId)
      .run();
    return;
  }

  if (customerId) {
    await env.DB.prepare(
      `UPDATE users
       SET tier = ?,
           payment_provider = 'dodo',
           dodo_customer_id = COALESCE(?, dodo_customer_id)
       WHERE dodo_customer_id = ?`,
    )
      .bind(tier, customerId, customerId)
      .run();
    return;
  }

  if (subscriptionId) {
    await env.DB.prepare(
      `UPDATE users
       SET tier = ?,
           payment_provider = 'dodo',
           payment_subscription_id = COALESCE(?, payment_subscription_id)
       WHERE payment_subscription_id = ?`,
    )
      .bind(tier, subscriptionId, subscriptionId)
      .run();
  }
}

async function applyStripeUpdate(
  env: Env,
  tier: 'pro' | 'team' | 'free',
  customerId: string | null,
  subscriptionId: string | null,
): Promise<void> {
  if (customerId && subscriptionId) {
    await env.DB.prepare(
      `UPDATE users
       SET tier = ?,
           payment_provider = 'stripe',
           payment_subscription_id = COALESCE(?, payment_subscription_id)
       WHERE stripe_customer_id = ? OR payment_subscription_id = ?`,
    )
      .bind(tier, subscriptionId, customerId, subscriptionId)
      .run();
    return;
  }

  if (customerId) {
    await env.DB.prepare(
      `UPDATE users
       SET tier = ?,
           payment_provider = 'stripe'
       WHERE stripe_customer_id = ?`,
    )
      .bind(tier, customerId)
      .run();
    return;
  }

  if (subscriptionId) {
    await env.DB.prepare(
      `UPDATE users
       SET tier = ?,
           payment_provider = 'stripe',
           payment_subscription_id = COALESCE(?, payment_subscription_id)
       WHERE payment_subscription_id = ?`,
    )
      .bind(tier, subscriptionId, subscriptionId)
      .run();
  }
}

async function resolveUserId(
  env: Env,
  provider: 'stripe' | 'dodo',
  customerId: string | null,
  subscriptionId: string | null,
): Promise<string | null> {
  if (provider === 'dodo') {
    const user = await env.DB.prepare(
      `SELECT id
       FROM users
       WHERE dodo_customer_id = ? OR payment_subscription_id = ?
       LIMIT 1`,
    )
      .bind(customerId, subscriptionId)
      .first<{ id: string }>();

    return user?.id ?? null;
  }

  const user = await env.DB.prepare(
    `SELECT id
     FROM users
     WHERE stripe_customer_id = ? OR payment_subscription_id = ?
     LIMIT 1`,
  )
    .bind(customerId, subscriptionId)
    .first<{ id: string }>();

  return user?.id ?? null;
}

async function applyCreditDelta(
  env: Env,
  userId: string,
  delta: number,
  kind: string,
  reference: string,
): Promise<void> {
  if (delta === 0) {
    return;
  }

  const now = Math.floor(Date.now() / 1000);

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE users
       SET credits_balance = COALESCE(credits_balance, 0) + ?
       WHERE id = ?`,
    ).bind(delta, userId),
    env.DB.prepare(
      `INSERT INTO credit_transactions (id, user_id, delta, kind, reference_json, created_at)
       VALUES ('ctx_' || lower(hex(randomblob(10))), ?, ?, ?, ?, ?)`,
    ).bind(userId, delta, kind, reference, now),
  ]);
}

async function applyUsageEvent(
  env: Env,
  userId: string,
  category: string,
  value: number,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const periodStart = Math.floor(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1) / 1000);

  await env.DB.prepare(
    `INSERT INTO usage_events (id, user_id, category, value, unit, period_start, period_end, created_at)
     VALUES ('use_' || lower(hex(randomblob(10))), ?, ?, ?, 'bytes', ?, ?, ?)`,
  )
    .bind(userId, category, value, periodStart, now, now)
    .run();
}

// Both Stripe and Dodo webhooks hit the same endpoint.
// Provider is determined by PAYMENT_PROVIDER env var.
webhookRouter.post('/payment', async (c) => {
  const provider = getPaymentProvider(c.env);
  const rawBody = await c.req.text();

  // Stripe uses 'stripe-signature', Dodo uses 'x-dodo-signature'.
  const signature =
    c.env.PAYMENT_PROVIDER === 'dodo'
      ? c.req.header('x-dodo-signature') ?? ''
      : c.req.header('stripe-signature') ?? '';

  const secret =
    c.env.PAYMENT_PROVIDER === 'dodo'
      ? c.env.DODO_WEBHOOK_SECRET
      : c.env.STRIPE_WEBHOOK_SECRET;

  if (!signature) {
    return c.json(err('Missing webhook signature', 400), 400);
  }

  const event = await provider
    .constructWebhookEvent({ rawBody, signature, secret })
    .catch(() => null);

  if (!event) {
    return c.json(err('Invalid webhook signature', 400), 400);
  }

  if (event.type === 'unknown') {
    return c.json(ok({ received: true, processed: false }), 200);
  }

  const currentProvider = c.env.PAYMENT_PROVIDER === 'dodo' ? 'dodo' : 'stripe';

  if (event.type === 'subscription.activated' || event.type === 'subscription.cancelled') {
    const tier = event.type === 'subscription.activated' ? (event.tier ?? 'free') : 'free';
    if (currentProvider === 'dodo') {
      await applyDodoUpdate(c.env, tier, event.customerId, event.subscriptionId);
    } else {
      await applyStripeUpdate(c.env, tier, event.customerId, event.subscriptionId);
    }

    return c.json(ok({ received: true, processed: true }), 200);
  }

  if (event.type === 'credits.granted' || event.type === 'usage.metered') {
    const userId = await resolveUserId(
      c.env,
      currentProvider,
      event.customerId,
      event.subscriptionId,
    );

    if (userId) {
      if (event.type === 'credits.granted' && event.creditsDelta) {
        await applyCreditDelta(
          c.env,
          userId,
          event.creditsDelta,
          'topup',
          JSON.stringify({ external_event_id: event.externalEventId ?? null }),
        );
      }

      if (event.type === 'usage.metered' && event.usageBytes != null) {
        await applyUsageEvent(
          c.env,
          userId,
          event.meterCategory ?? 'replay_storage_bytes',
          event.usageBytes,
        );
      }
    }

    return c.json(ok({ received: true, processed: true }), 200);
  }

  if (event.type === 'payment.failed') {
    return c.json(ok({ received: true, processed: true }), 200);
  }

  return c.json(ok({ received: true, processed: true }), 200);
});

export default webhookRouter;
