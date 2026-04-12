type PaymentProvider = 'stripe' | 'dodo';

type TierPricing = {
  pro: string;
  team: string;
};

const PRICING: Record<PaymentProvider, TierPricing> = {
  stripe: { pro: '$29/month', team: '$99/month' },
  dodo: { pro: '$39/month + credits', team: '$129/month + credits' },
};

function getProvider(): PaymentProvider {
  const provider = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER;
  return provider === 'dodo' ? 'dodo' : 'stripe';
}

export default function UpgradePrompt(): JSX.Element {
  const provider = getProvider();
  const pricing = PRICING[provider];

  return (
    <section className="surface-card" style={{ padding: '1.25rem' }}>
      <h2 style={{ marginTop: 0 }}>Upgrade Your Plan</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 0 }}>
        Prices shown for <strong>{provider}</strong> checkout.
      </p>

      <div className="pricing-grid">
        <article className="pricing-card">
          <p className="pricing-label">Pro</p>
          <p className="pricing-price">{pricing.pro}</p>
        </article>

        <article className="pricing-card">
          <p className="pricing-label">Team</p>
          <p className="pricing-price">{pricing.team}</p>
        </article>
      </div>
    </section>
  );
}
