import type { Env } from '../../types/env';
import { createRazorpayAdapter } from './razorpay-adapter';
import { createStripeAdapter } from './stripe-adapter';
import type { PaymentProvider } from './types';

export function getPaymentProvider(env: Env): PaymentProvider {
  if (env.PAYMENT_PROVIDER === 'razorpay') {
    return createRazorpayAdapter(env);
  }
  return createStripeAdapter(env);
}

export type { CheckoutResult, PaymentProvider, SubscriptionStatus, WebhookEvent } from './types';
