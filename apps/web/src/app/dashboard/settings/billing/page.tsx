'use client';

import { useState } from 'react';

type BillingTier = 'pro' | 'team';

type CheckoutResponse = {
  provider: 'stripe' | 'razorpay';
  checkout_url?: string;
  razorpay_order_id?: string;
  razorpay_key_id?: string;
  amount?: number;
  currency?: string;
};

type ApiError = {
  message: string;
  code: number;
};

type ApiResponse<T> = {
  data: T | null;
  error: ApiError | null;
};

const api = {
  billing: {
    async checkout(tier: BillingTier): Promise<CheckoutResponse> {
      const response = await fetch('/api/v1/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ tier }),
      });

      const payload = (await response.json()) as ApiResponse<CheckoutResponse>;
      if (!response.ok || payload.error || !payload.data) {
        throw new Error(payload.error?.message ?? 'Checkout failed');
      }

      return payload.data;
    },
  },
};

export default function BillingPage(): JSX.Element {
  const [loadingTier, setLoadingTier] = useState<BillingTier | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleUpgrade(tier: BillingTier): Promise<void> {
    setErrorMessage(null);
    setLoadingTier(tier);

    try {
      const result = await api.billing.checkout(tier);
      if (!result.checkout_url) {
        throw new Error('Checkout URL was not returned by the billing provider');
      }

      // Works for both Stripe and Razorpay — both return checkout_url.
      window.location.href = result.checkout_url;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start checkout';
      setErrorMessage(message);
    } finally {
      setLoadingTier(null);
    }
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Billing</h1>
      <p>Choose a plan to upgrade your workspace.</p>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button
          type="button"
          onClick={() => {
            void handleUpgrade('pro');
          }}
          disabled={loadingTier !== null}
        >
          {loadingTier === 'pro' ? 'Redirecting...' : 'Upgrade to Pro'}
        </button>

        <button
          type="button"
          onClick={() => {
            void handleUpgrade('team');
          }}
          disabled={loadingTier !== null}
        >
          {loadingTier === 'team' ? 'Redirecting...' : 'Upgrade to Team'}
        </button>
      </div>

      {errorMessage ? <p style={{ color: '#ff4444' }}>{errorMessage}</p> : null}
    </main>
  );
}
