export interface CheckoutResult {
  // Stripe/Dodo redirect URL for hosted checkout
  provider: 'stripe' | 'dodo';
  checkout_url?: string;
  // Dodo credit/MoR flow metadata
  dodo_checkout_id?: string;
  dodo_customer_id?: string;
  credit_purchase_url?: string;
  credits_granted?: number;
  amount?: number; // in smallest currency unit (paise for INR)
  currency?: string;
}

export interface SubscriptionStatus {
  provider: 'stripe' | 'dodo';
  tier: 'free' | 'pro' | 'team';
  status: 'active' | 'cancelled' | 'past_due' | 'free';
  current_period_end: number | null; // Unix seconds
  credits_balance?: number;
}

export interface PaymentProvider {
  createCheckout(params: {
    userId: string;
    userEmail: string;
    tier: 'pro' | 'team';
    existingCustomerId: string | null;
  }): Promise<CheckoutResult>;

  getSubscriptionStatus(params: {
    customerId: string | null;
    subscriptionId: string | null;
  }): Promise<SubscriptionStatus>;

  constructWebhookEvent(params: {
    rawBody: string;
    signature: string;
    secret: string;
  }): Promise<WebhookEvent>;
}

export interface WebhookEvent {
  type:
    | 'subscription.activated'
    | 'subscription.cancelled'
    | 'payment.failed'
    | 'credits.granted'
    | 'usage.metered'
    | 'unknown';
  customerId: string | null;
  subscriptionId: string | null;
  tier: 'pro' | 'team' | 'free' | null;
  creditsDelta?: number | null;
  usageBytes?: number | null;
  meterCategory?: string | null;
  externalEventId?: string | null;
}
