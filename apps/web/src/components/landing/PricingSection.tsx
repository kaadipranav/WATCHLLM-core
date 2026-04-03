import { Button } from '@/components/ui/Button';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    features: ['5 simulations / month', '3 categories', '7d history', 'No replay, no fork'],
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$49',
    period: '/month',
    features: ['100 simulations / month', 'All categories', '90d history', 'Replay and fork enabled'],
    highlighted: true,
  },
  {
    name: 'Team',
    price: '$199',
    period: '/month',
    features: ['500 simulations / month', 'All categories', '365d history', '10 users included'],
    highlighted: false,
  },
] as const;

export function PricingSection() {
  return (
    <section id="pricing" className="px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-4xl font-semibold text-text-primary">Pricing that scales with your agents</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-text-secondary">
          Start free, upgrade when replay and fork become mission-critical.
        </p>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <article
              key={plan.name}
              className={`relative rounded-lg border bg-surface p-6 ${
                plan.highlighted ? 'border-accent shadow-[0_0_0_1px_rgba(0,200,150,0.3)]' : 'border-border'
              }`}
            >
              {plan.highlighted ? (
                <span className="absolute right-4 top-4 rounded-full border border-accent bg-accent-dim px-3 py-1 font-mono text-xs text-accent">
                  Most popular
                </span>
              ) : null}

              <h3 className="text-xl font-semibold text-text-primary">{plan.name}</h3>
              <p className="mt-3 flex items-end gap-1">
                <span className="font-mono text-4xl text-text-primary">{plan.price}</span>
                <span className="pb-1 text-text-secondary">{plan.period}</span>
              </p>

              <ul className="mt-6 space-y-3 text-sm text-text-secondary">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-0.5 text-accent">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                <Button variant={plan.highlighted ? 'accent' : 'ghost'} href="/sign-up">
                  Get started
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}