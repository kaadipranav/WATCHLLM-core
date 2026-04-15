'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { billing, type SubscriptionStatus } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';
import { TIER_LIMITS } from '@watchllm/types';
import { SpotlightCard } from '../../../../components/motion/spotlight-card';

const PAYMENT_PROVIDER = (process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? 'dodo') as 'stripe' | 'dodo';

const PRICING = {
  stripe: { pro: '$29/mo', team: '$99/mo', currency: 'USD' },
  dodo: { pro: '$39/mo + usage credits', team: '$129/mo + usage credits', currency: 'Global (MoR)' },
};

const TIER_COLORS: Record<string, string> = {
  free: 'var(--text-secondary)',
  pro:  'var(--accent)',
  team: 'var(--accent-2)',
};

const TIER_FEATURES = {
  free: [
    '5 simulations / month',
    'prompt_injection, tool_abuse, hallucination',
    '7-day history',
    '1 team member',
  ],
  pro: [
    '100 simulations / month',
    'All 8 attack categories',
    '90-day history',
    'Graph replay',
    'Fork & rerun workflows',
    '1 member',
  ],
  team: [
    '500 simulations / month',
    'All 8 attack categories',
    '365-day history',
    'Graph replay',
    'Fork & rerun workflows',
    '10 team members',
    'Priority support',
  ],
};

type UserTier = 'free' | 'pro' | 'team';

function FeatureRow({ label, available }: { label: string; available: boolean }) {
  return (
    <li style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: available ? 'var(--text-secondary)' : 'var(--text-tertiary)', padding: '5px 0' }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={available ? 'var(--accent)' : 'var(--text-tertiary)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {available
          ? <polyline points="20 6 9 17 4 12" />
          : <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>
        }
      </svg>
      {label}
    </li>
  );
}

export default function BillingPage(): JSX.Element {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loadingTier, setLoadingTier] = useState<'pro' | 'team' | null>(null);
  const [error, setError] = useState('');
  const [subLoading, setSubLoading] = useState(true);
  const pricing = PRICING[PAYMENT_PROVIDER];

  useEffect(() => {
    async function loadSub() {
      const res = await billing.subscription();
      if (res.data) setSubscription(res.data);
      setSubLoading(false);
    }
    void loadSub();
  }, []);

  const currentTier = (subscription?.tier ?? 'free') as UserTier;
  const limits = TIER_LIMITS[currentTier];

  const handleUpgrade = async (tier: 'pro' | 'team') => {
    setError('');
    setLoadingTier(tier);
    const res = await billing.checkout(tier);
    setLoadingTier(null);
    if (res.error) { setError(res.error.message); return; }
    if (res.data?.checkout_url) {
      window.location.href = res.data.checkout_url;
    }
  };

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="dash-page-title neue-haas-heading">Billing</h1>
          <p>Manage your plan and payment details.</p>
        </div>
      </div>

      {/* Current plan banner */}
      <div className="card" style={{ marginBottom: 28, padding: '20px 24px', background: 'linear-gradient(135deg, rgba(0,229,160,0.04), var(--surface))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 6 }}>Current plan</p>
            {subLoading ? (
              <div className="skeleton" style={{ height: 32, width: 80 }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 700, textTransform: 'capitalize', color: TIER_COLORS[currentTier] }}>
                  {currentTier}
                </span>
                {subscription?.status === 'active' && (
                  <span className="badge badge-success">Active</span>
                )}
                {(subscription?.credits_balance ?? 0) > 0 && (
                  <span className="badge badge-info">{subscription?.credits_balance} credits</span>
                )}
              </div>
            )}
            {subscription?.current_period_end && (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 6 }}>
                Renews {new Date(subscription.current_period_end * 1000).toLocaleDateString()}
              </p>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: '8px 24px' }}>
            {[
              { label: 'Simulations/mo', value: limits.simulations_per_month },
              { label: 'History', value: `${limits.history_days}d` },
              { label: 'Replay', value: limits.graph_replay ? '✓' : '✗' },
              { label: 'Team members', value: limits.team_members },
            ].map((stat) => (
              <div key={stat.label}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{stat.label}</p>
                <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginTop: 2 }}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 28 }}>
        {(['free', 'pro', 'team'] as UserTier[]).map((tier) => {
          const isCurrent = currentTier === tier;
          const priceStr = tier === 'free' ? 'Free' : tier === 'pro' ? pricing.pro : pricing.team;

          return (
            <SpotlightCard
              key={tier}
              className="card"
              style={{
                border: isCurrent ? '1px solid rgba(0,229,160,0.35)' : '1px solid var(--border)',
                background: isCurrent ? 'linear-gradient(160deg, rgba(0,229,160,0.04), var(--surface))' : undefined,
                position: 'relative',
              }}
            >
              {isCurrent && (
                <div style={{
                  position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--accent)', color: '#04120c',
                  fontSize: '0.69rem', fontWeight: 700, padding: '2px 10px',
                  borderRadius: '0 0 6px 6px', whiteSpace: 'nowrap',
                }}>
                  CURRENT PLAN
                </div>
              )}

              <div style={{ marginTop: isCurrent ? 12 : 0 }}>
                <p style={{ fontWeight: 600, textTransform: 'capitalize', fontSize: '0.9375rem', color: TIER_COLORS[tier], marginBottom: 6 }}>{tier}</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', letterSpacing: '-0.03em', marginBottom: 16 }}>
                  {priceStr}
                </p>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', marginBottom: 24 }}>
                  {TIER_FEATURES[tier].map((f) => <FeatureRow key={f} label={f} available />)}
                </ul>

                {!isCurrent && tier !== 'free' && (
                  <button
                    className="btn btn-primary w-full"
                    style={{ justifyContent: 'center' }}
                    disabled={loadingTier !== null}
                    onClick={() => void handleUpgrade(tier as 'pro' | 'team')}
                  >
                    {loadingTier === tier ? (
                      <>
                        <div className="spin" style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.2)', borderTopColor: '#04120c', borderRadius: '50%' }} />
                        Redirecting…
                      </>
                    ) : (
                      `Upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)}`
                    )}
                  </button>
                )}
                {isCurrent && (
                  <div style={{ textAlign: 'center', padding: '8px 0', fontSize: '0.875rem', color: 'var(--accent)' }}>
                    ✓ Your current plan
                  </div>
                )}
              </div>
            </SpotlightCard>
          );
        })}
      </div>

      {error && (
        <div style={{
          background: 'var(--danger-dim)', border: '1px solid rgba(255,77,109,0.2)',
          borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 20,
        }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>{error}</p>
        </div>
      )}

      {/* Payment provider note */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Payments processed securely via{' '}
            <strong style={{ color: 'var(--text-primary)' }}>
              {PAYMENT_PROVIDER === 'dodo' ? 'Dodo Payments' : 'Stripe'}
            </strong>
            {' '}· Currency: <strong>{pricing.currency}</strong> · MoR: <strong>{PAYMENT_PROVIDER === 'dodo' ? 'enabled' : 'disabled'}</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
