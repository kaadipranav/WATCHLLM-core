import { Hono } from 'hono';
import { getPaymentProvider } from '../lib/payment';
import { err, ok } from '../lib/response';
import type { Env } from '../types/env';

export const webhookRouter = new Hono<{ Bindings: Env }>();

async function applyRazorpayUpdate(
  env: Env,
  tier: 'pro' | 'team' | 'free',
  customerId: string | null,
  subscriptionId: string | null,
): Promise<void> {
  if (customerId && subscriptionId) {
    await env.DB.prepare(
      `UPDATE users
       SET tier = ?,
           payment_provider = 'razorpay',
           payment_subscription_id = COALESCE(?, payment_subscription_id),
           razorpay_customer_id = COALESCE(?, razorpay_customer_id)
       WHERE razorpay_customer_id = ? OR payment_subscription_id = ?`,
    )
      .bind(tier, subscriptionId, customerId, customerId, subscriptionId)
      .run();
    return;
  }

  if (customerId) {
    await env.DB.prepare(
      `UPDATE users
       SET tier = ?,
           payment_provider = 'razorpay',
           razorpay_customer_id = COALESCE(?, razorpay_customer_id)
       WHERE razorpay_customer_id = ?`,
    )
      .bind(tier, customerId, customerId)
      .run();
    return;
  }

  if (subscriptionId) {
    await env.DB.prepare(
      `UPDATE users
       SET tier = ?,
           payment_provider = 'razorpay',
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

// Both Stripe and Razorpay webhooks hit the same endpoint.
// Provider is determined by PAYMENT_PROVIDER env var.
webhookRouter.post('/payment', async (c) => {
  const provider = getPaymentProvider(c.env);
  const rawBody = await c.req.text();

  // Stripe uses 'stripe-signature', Razorpay uses 'x-razorpay-signature'
  const signature =
    c.env.PAYMENT_PROVIDER === 'razorpay'
      ? c.req.header('x-razorpay-signature') ?? ''
      : c.req.header('stripe-signature') ?? '';

  const secret =
    c.env.PAYMENT_PROVIDER === 'razorpay'
      ? c.env.RAZORPAY_WEBHOOK_SECRET
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

  if (event.type === 'payment.failed') {
    return c.json(ok({ received: true, processed: true }), 200);
  }

  const tier = event.type === 'subscription.activated' ? (event.tier ?? 'free') : 'free';

  if (c.env.PAYMENT_PROVIDER === 'razorpay') {
    await applyRazorpayUpdate(c.env, tier, event.customerId, event.subscriptionId);
  } else {
    await applyStripeUpdate(c.env, tier, event.customerId, event.subscriptionId);
  }

  return c.json(ok({ received: true, processed: true }), 200);
});

export default webhookRouter;
