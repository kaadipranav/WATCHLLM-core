export interface CheckoutResult {
  // Stripe: redirect URL to Stripe hosted checkout
  // Razorpay: order_id + key_id (frontend opens Razorpay modal)
  provider: 'stripe' | 'razorpay';
  // Stripe flow
  checkout_url?: string;
  // Razorpay flow (frontend SDK handles modal)
  razorpay_order_id?: string;
  razorpay_key_id?: string;
  amount?: number; // in smallest currency unit (paise for INR)
  currency?: string;
}

export interface SubscriptionStatus {
  provider: 'stripe' | 'razorpay';
  tier: 'free' | 'pro' | 'team';
  status: 'active' | 'cancelled' | 'past_due' | 'free';
  current_period_end: number | null; // Unix seconds
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
  type: 'subscription.activated' | 'subscription.cancelled' | 'payment.failed' | 'unknown';
  customerId: string | null;
  subscriptionId: string | null;
  tier: 'pro' | 'team' | 'free' | null;
}
