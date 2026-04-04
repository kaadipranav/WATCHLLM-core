import type { Env } from '../../types/env';
import type { CheckoutResult, PaymentProvider, SubscriptionStatus, WebhookEvent } from './types';

interface RazorpayCustomerResponse {
  id: string;
}

interface RazorpaySubscriptionResponse {
  id: string;
  short_url: string;
  status: string;
  plan_id: string;
  current_end: number;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: {
      entity: {
        id: string;
        customer_id: string;
        plan_id: string;
        status: string;
      };
    };
  };
}

function razorpayAuth(env: Env): string {
  return `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`;
}

async function razorpayFetch<T>(env: Env, path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: razorpayAuth(env),
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Razorpay API error: ${message}`);
  }

  return response.json() as Promise<T>;
}

function buildTierMap(env: Env): Record<string, 'pro' | 'team'> {
  return {
    [env.RAZORPAY_PLAN_PRO]: 'pro',
    [env.RAZORPAY_PLAN_TEAM]: 'team',
  };
}

function mapRazorpayStatus(status: string): SubscriptionStatus['status'] {
  if (status === 'active' || status === 'authenticated') {
    return 'active';
  }

  if (status === 'cancelled' || status === 'completed') {
    return 'cancelled';
  }

  return 'past_due';
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

async function computeHmacSha256Hex(secret: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return bytesToHex(new Uint8Array(signature));
}

export function createRazorpayAdapter(env: Env): PaymentProvider {
  return {
    async createCheckout({ userId, userEmail, tier, existingCustomerId }): Promise<CheckoutResult> {
      let customerId = existingCustomerId;

      if (!customerId) {
        const customer = await razorpayFetch<RazorpayCustomerResponse>(env, '/customers', {
          method: 'POST',
          body: JSON.stringify({
            name: userEmail,
            email: userEmail,
            notes: { user_id: userId },
          }),
        });
        customerId = customer.id;
      }

      const planId = tier === 'pro' ? env.RAZORPAY_PLAN_PRO : env.RAZORPAY_PLAN_TEAM;
      const subscription = await razorpayFetch<RazorpaySubscriptionResponse>(
        env,
        '/subscriptions',
        {
          method: 'POST',
          body: JSON.stringify({
            plan_id: planId,
            customer_id: customerId,
            customer_notify: 1,
            quantity: 1,
            total_count: 12,
            notes: { user_id: userId },
          }),
        },
      );

      if (!subscription.short_url) {
        throw new Error('Razorpay checkout did not include a redirect URL');
      }

      return {
        provider: 'razorpay',
        checkout_url: subscription.short_url,
        razorpay_order_id: subscription.id,
        razorpay_key_id: env.RAZORPAY_KEY_ID,
      };
    },

    async getSubscriptionStatus({ subscriptionId }): Promise<SubscriptionStatus> {
      if (!subscriptionId) {
        return {
          provider: 'razorpay',
          tier: 'free',
          status: 'free',
          current_period_end: null,
        };
      }

      const subscription = await razorpayFetch<RazorpaySubscriptionResponse>(
        env,
        `/subscriptions/${subscriptionId}`,
      );

      const tierMap = buildTierMap(env);
      const tier = tierMap[subscription.plan_id] ?? 'free';

      return {
        provider: 'razorpay',
        tier,
        status: mapRazorpayStatus(subscription.status),
        current_period_end: subscription.current_end,
      };
    },

    async constructWebhookEvent({ rawBody, signature, secret }): Promise<WebhookEvent> {
      const expectedSignature = await computeHmacSha256Hex(secret, rawBody);
      if (expectedSignature !== signature) {
        throw new Error('Invalid Razorpay webhook signature');
      }

      const payload = JSON.parse(rawBody) as RazorpayWebhookPayload;
      const subscription = payload.payload.subscription?.entity;
      if (!subscription) {
        return {
          type: 'unknown',
          customerId: null,
          subscriptionId: null,
          tier: null,
        };
      }

      const tierMap = buildTierMap(env);

      switch (payload.event) {
        case 'subscription.activated':
        case 'subscription.charged':
          return {
            type: 'subscription.activated',
            customerId: subscription.customer_id,
            subscriptionId: subscription.id,
            tier: tierMap[subscription.plan_id] ?? 'free',
          };
        case 'subscription.cancelled':
        case 'subscription.completed':
          return {
            type: 'subscription.cancelled',
            customerId: subscription.customer_id,
            subscriptionId: subscription.id,
            tier: 'free',
          };
        case 'subscription.pending':
          return {
            type: 'payment.failed',
            customerId: subscription.customer_id,
            subscriptionId: subscription.id,
            tier: null,
          };
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
