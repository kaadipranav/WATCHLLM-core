import type { Env } from '../../types/env';
import type { CheckoutResult, PaymentProvider, SubscriptionStatus, WebhookEvent } from './types';

interface DodoCustomerResponse {
  id?: string;
  customer_id?: string;
}

interface DodoCheckoutResponse {
  id?: string;
  checkout_id?: string;
  url?: string;
  checkout_url?: string;
  amount?: number;
  currency?: string;
}

interface DodoSubscriptionItem {
  id?: string;
  plan_id?: string;
  status?: string;
  current_period_end?: number;
}

interface DodoSubscriptionsResponse {
  data?: DodoSubscriptionItem[];
  items?: DodoSubscriptionItem[];
}

function dodoBase(env: Env): string {
  return env.DODO_API_BASE.replace(/\/$/, '');
}

function dodoAuth(env: Env): string {
  return `Bearer ${env.DODO_API_KEY}`;
}

async function dodoFetch<T>(
  env: Env,
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${dodoBase(env)}${path}`, {
    ...options,
    headers: {
      Authorization: dodoAuth(env),
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Dodo API error: ${body}`);
  }

  return response.json() as Promise<T>;
}

function mapTierFromPlan(env: Env, planId: string | null): 'pro' | 'team' | 'free' {
  if (!planId) {
    return 'free';
  }

  if (planId === env.DODO_PLAN_PRO) {
    return 'pro';
  }

  if (planId === env.DODO_PLAN_TEAM) {
    return 'team';
  }

  return 'free';
}

function mapSubscriptionStatus(status: string | null): SubscriptionStatus['status'] {
  if (!status) {
    return 'free';
  }

  const normalized = status.toLowerCase();
  if (normalized === 'active' || normalized === 'trialing') {
    return 'active';
  }

  if (normalized === 'past_due' || normalized === 'unpaid') {
    return 'past_due';
  }

  if (normalized === 'cancelled' || normalized === 'canceled' || normalized === 'expired') {
    return 'cancelled';
  }

  return 'free';
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

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' ? value : null;
}

function getNestedRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = record[key];
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function createDodoAdapter(env: Env): PaymentProvider {
  return {
    async createCheckout({ userId, userEmail, tier, existingCustomerId }): Promise<CheckoutResult> {
      let customerId = existingCustomerId;

      if (!customerId) {
        const customer = await dodoFetch<DodoCustomerResponse>(env, '/customers', {
          method: 'POST',
          body: JSON.stringify({
            email: userEmail,
            external_id: userId,
          }),
        });

        customerId = customer.id ?? customer.customer_id ?? null;
      }

      const checkout = await dodoFetch<DodoCheckoutResponse>(env, '/checkouts', {
        method: 'POST',
        body: JSON.stringify({
          customer_id: customerId,
          plan_id: tier === 'pro' ? env.DODO_PLAN_PRO : env.DODO_PLAN_TEAM,
          success_url: env.DODO_SUCCESS_URL,
          cancel_url: env.DODO_CANCEL_URL,
          metadata: {
            user_id: userId,
            billing_mode: 'credit_and_usage_mor',
          },
        }),
      });

      const checkoutUrl = checkout.url ?? checkout.checkout_url;
      if (!checkoutUrl) {
        throw new Error('Dodo checkout did not include a redirect URL');
      }

      return {
        provider: 'dodo',
        checkout_url: checkoutUrl,
        credit_purchase_url: checkoutUrl,
        dodo_checkout_id: checkout.id ?? checkout.checkout_id,
        dodo_customer_id: customerId ?? undefined,
        amount: checkout.amount,
        currency: checkout.currency,
      };
    },

    async getSubscriptionStatus({ customerId }): Promise<SubscriptionStatus> {
      if (!customerId) {
        return {
          provider: 'dodo',
          tier: 'free',
          status: 'free',
          current_period_end: null,
        };
      }

      const subscriptions = await dodoFetch<DodoSubscriptionsResponse>(
        env,
        `/customers/${customerId}/subscriptions?limit=1`,
      );

      const first = (subscriptions.data ?? subscriptions.items ?? [])[0];
      if (!first) {
        return {
          provider: 'dodo',
          tier: 'free',
          status: 'free',
          current_period_end: null,
        };
      }

      return {
        provider: 'dodo',
        tier: mapTierFromPlan(env, first.plan_id ?? null),
        status: mapSubscriptionStatus(first.status ?? null),
        current_period_end: first.current_period_end ?? null,
      };
    },

    async constructWebhookEvent({ rawBody, signature, secret }): Promise<WebhookEvent> {
      const expectedSignature = await computeHmacSha256Hex(secret, rawBody);
      if (expectedSignature !== signature) {
        throw new Error('Invalid Dodo webhook signature');
      }

      const parsed = JSON.parse(rawBody) as unknown;
      if (typeof parsed !== 'object' || parsed === null) {
        return {
          type: 'unknown',
          customerId: null,
          subscriptionId: null,
          tier: null,
        };
      }

      const envelope = parsed as Record<string, unknown>;
      const eventType = readString(envelope, 'type') ?? readString(envelope, 'event_type') ?? 'unknown';
      const data =
        getNestedRecord(envelope, 'data') ??
        getNestedRecord(envelope, 'payload') ??
        {};

      const customer = getNestedRecord(data, 'customer');
      const subscription = getNestedRecord(data, 'subscription');
      const usage = getNestedRecord(data, 'usage');

      const customerId =
        readString(data, 'customer_id') ??
        readString(customer ?? {}, 'id');

      const subscriptionId =
        readString(data, 'subscription_id') ??
        readString(subscription ?? {}, 'id') ??
        readString(data, 'id');

      const planId =
        readString(data, 'plan_id') ??
        readString(subscription ?? {}, 'plan_id');

      const creditsDelta =
        readNumber(data, 'credits_delta') ??
        readNumber(data, 'credit_delta');

      const usageBytes =
        readNumber(data, 'usage_bytes') ??
        readNumber(usage ?? {}, 'bytes');

      const meterCategory =
        readString(data, 'meter_category') ??
        readString(usage ?? {}, 'category') ??
        null;

      if (
        eventType === 'subscription.activated' ||
        eventType === 'subscription.updated' ||
        eventType === 'subscription.created'
      ) {
        return {
          type: 'subscription.activated',
          customerId,
          subscriptionId,
          tier: mapTierFromPlan(env, planId),
        };
      }

      if (
        eventType === 'subscription.cancelled' ||
        eventType === 'subscription.canceled' ||
        eventType === 'subscription.expired'
      ) {
        return {
          type: 'subscription.cancelled',
          customerId,
          subscriptionId,
          tier: 'free',
        };
      }

      if (eventType === 'invoice.payment_failed' || eventType === 'payment.failed') {
        return {
          type: 'payment.failed',
          customerId,
          subscriptionId,
          tier: null,
        };
      }

      if (eventType === 'credits.granted' || eventType === 'credits.added') {
        return {
          type: 'credits.granted',
          customerId,
          subscriptionId,
          tier: null,
          creditsDelta,
          externalEventId: readString(envelope, 'id'),
        };
      }

      if (eventType === 'usage.metered' || eventType === 'usage.recorded') {
        return {
          type: 'usage.metered',
          customerId,
          subscriptionId,
          tier: null,
          usageBytes,
          meterCategory,
          externalEventId: readString(envelope, 'id'),
        };
      }

      return {
        type: 'unknown',
        customerId,
        subscriptionId,
        tier: null,
      };
    },
  };
}