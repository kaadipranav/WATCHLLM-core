import type { Env } from '../../types/env';
import { createDodoAdapter } from './dodo-adapter';
import { createStripeAdapter } from './stripe-adapter';
import type { PaymentProvider } from './types';

export function getPaymentProvider(env: Env): PaymentProvider {
  if (env.PAYMENT_PROVIDER === 'stripe') {
    return createStripeAdapter(env);
  }
  return createDodoAdapter(env);
}

export type { CheckoutResult, PaymentProvider, SubscriptionStatus, WebhookEvent } from './types';
