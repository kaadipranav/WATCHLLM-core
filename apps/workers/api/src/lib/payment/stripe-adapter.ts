import Stripe from 'stripe';
import type { Env } from '../../types/env';
import type { CheckoutResult, PaymentProvider, SubscriptionStatus, WebhookEvent } from './types';

const STRIPE_PRICE_IDS = {
  pro: 'price_pro_monthly',
  team: 'price_team_monthly',
} as const;

const STRIPE_TIER_MAP: Record<string, 'pro' | 'team' | 'free'> = {
  price_pro_monthly: 'pro',
  price_team_monthly: 'team',
};

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus['status'] {
  if (status === 'active') {
    return 'active';
  }

  if (status === 'past_due') {
    return 'past_due';
  }

  return 'cancelled';
}

export function createStripeAdapter(env: Env): PaymentProvider {
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
  });

  return {
    async createCheckout({ userId, userEmail, tier, existingCustomerId }): Promise<CheckoutResult> {
      let customerId = existingCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: userEmail,
          metadata: { user_id: userId },
        });
        customerId = customer.id;
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: STRIPE_PRICE_IDS[tier], quantity: 1 }],
        success_url: 'https://watchllm.dev/dashboard?upgraded=1',
        cancel_url: 'https://watchllm.dev/pricing',
        metadata: { user_id: userId },
      });

      if (!session.url) {
        throw new Error('Stripe checkout session did not include a redirect URL');
      }

      return {
        provider: 'stripe',
        checkout_url: session.url,
      };
    },

    async getSubscriptionStatus({ customerId }): Promise<SubscriptionStatus> {
      if (!customerId) {
        return {
          provider: 'stripe',
          tier: 'free',
          status: 'free',
          current_period_end: null,
        };
      }

      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 1,
      });

      const subscription = subscriptions.data[0];
      if (!subscription) {
        return {
          provider: 'stripe',
          tier: 'free',
          status: 'free',
          current_period_end: null,
        };
      }

      const priceId = subscription.items.data[0]?.price.id ?? '';
      const tier = STRIPE_TIER_MAP[priceId] ?? 'free';

      return {
        provider: 'stripe',
        tier,
        status: mapStripeStatus(subscription.status),
        current_period_end: subscription.items.data[0]?.current_period_end ?? null,
      };
    },

    async constructWebhookEvent({ rawBody, signature, secret }): Promise<WebhookEvent> {
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(rawBody, signature, secret);
      } catch {
        throw new Error('Invalid Stripe webhook signature');
      }

      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const priceId = subscription.items.data[0]?.price.id ?? '';
          return {
            type: 'subscription.activated',
            customerId: typeof subscription.customer === 'string' ? subscription.customer : null,
            subscriptionId: subscription.id,
            tier: STRIPE_TIER_MAP[priceId] ?? 'free',
          };
        }
        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          return {
            type: 'subscription.cancelled',
            customerId: typeof subscription.customer === 'string' ? subscription.customer : null,
            subscriptionId: subscription.id,
            tier: 'free',
          };
        }
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionFromParent = invoice.parent?.subscription_details?.subscription;

          return {
            type: 'payment.failed',
            customerId: typeof invoice.customer === 'string' ? invoice.customer : null,
            subscriptionId:
              typeof subscriptionFromParent === 'string' ? subscriptionFromParent : null,
            tier: null,
          };
        }
        default:
          return {
            type: 'unknown',
            customerId: null,
            subscriptionId: null,
            tier: null,
          };
      }
    },
  };
}
