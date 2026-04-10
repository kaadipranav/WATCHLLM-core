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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
      const endpoint = `${baseUrl.replace(/\/$/, '')}/api/v1/billing/checkout`;

      const response = await fetch(endpoint, {
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
    <main className="billing-wrap">
      <section className="surface-card billing-card">
        <h1 className="billing-title">Billing</h1>
        <p className="billing-subtitle">Choose a plan to upgrade your workspace.</p>

        <div className="billing-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={() => {
            void handleUpgrade('pro');
          }}
          disabled={loadingTier !== null}
        >
          {loadingTier === 'pro' ? 'Redirecting...' : 'Upgrade to Pro'}
        </button>

        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => {
            void handleUpgrade('team');
          }}
          disabled={loadingTier !== null}
        >
          {loadingTier === 'team' ? 'Redirecting...' : 'Upgrade to Team'}
        </button>
        </div>

        {errorMessage ? <p className="billing-error">{errorMessage}</p> : null}
      </section>
    </main>
  );
}
