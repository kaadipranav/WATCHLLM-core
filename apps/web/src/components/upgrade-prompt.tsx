type PaymentProvider = 'stripe' | 'razorpay';

type TierPricing = {
  pro: string;
  team: string;
};

const PRICING: Record<PaymentProvider, TierPricing> = {
  stripe: { pro: '$29/month', team: '$99/month' },
  razorpay: { pro: '₹2,499/month', team: '₹8,499/month' },
};

function getProvider(): PaymentProvider {
  const provider = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER;
  return provider === 'razorpay' ? 'razorpay' : 'stripe';
}

export default function UpgradePrompt(): JSX.Element {
  const provider = getProvider();
  const pricing = PRICING[provider];

  return (
    <section>
      <h2>Upgrade Your Plan</h2>
      <p>Pro: {pricing.pro}</p>
      <p>Team: {pricing.team}</p>
    </section>
  );
}
