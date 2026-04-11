'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth-context';

const ATTACK_CATEGORIES = [
  'prompt_injection',
  'tool_abuse',
  'hallucination',
  'context_poisoning',
  'infinite_loop',
  'jailbreak',
  'data_exfiltration',
  'role_confusion',
];

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Adversarial Simulation',
    desc: '8 attack categories targeting prompt injection, jailbreaks, tool abuse, hallucination, and data exfiltration. Every vector your agent will face in the wild.',
    accent: 'var(--accent)',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
    title: 'Trace Graph Replay',
    desc: 'Every simulation run is stored as a full execution graph — nodes, edges, tokens, latency, cost. Replay it frame-by-frame on Pro.',
    accent: 'var(--accent)',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="6" y1="3" x2="6" y2="15" /><circle cx="18" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
        <path d="M18 9a9 9 0 0 1-9 9" />
      </svg>
    ),
    title: 'Fork & Replay',
    desc: 'Found the failure node? Fork the trace from that exact point, inject new input, re-run only the broken branch. Iterative hardening at its fastest.',
    accent: 'var(--accent-2)',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'LLM Judge Scoring',
    desc: 'Fast rule scorer + optional LLM judge gives every run a severity score 0–1. Anything ≥ 0.7 is compromised. Hard numbers, not vibes.',
    accent: 'var(--accent-2)',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: 'Python SDK + CLI',
    desc: 'One decorator. Tests run in CI before you notice. `@watchllm.test(categories=[...])` wraps your agent and threshold-gates your pipeline.',
    accent: 'var(--accent)',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
    title: 'Multi-Framework Support',
    desc: 'LangChain, CrewAI, OpenAI Assistants, Autogen, or any custom HTTP endpoint. Connect your agent in 30 seconds.',
    accent: 'var(--accent-2)',
  },
];

const PRICING_TIERS = [
  {
    name: 'Free',
    price: { usd: '$0', inr: '₹0' },
    period: 'forever',
    desc: 'For hobbyists and early exploration.',
    features: [
      '5 simulations / month',
      '3 attack categories',
      '7-day history',
      '1 team member',
      'No replay / fork',
    ],
    cta: 'Start Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: { usd: '$29', inr: '₹2,499' },
    period: '/month',
    desc: 'For engineering teams shipping production agents.',
    features: [
      '100 simulations / month',
      'All 8 attack categories',
      '90-day history',
      'Graph replay',
      'Fork & rerun',
      'API key access',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    name: 'Team',
    price: { usd: '$99', inr: '₹8,499' },
    period: '/month',
    desc: 'For orgs that take agent reliability seriously.',
    features: [
      '500 simulations / month',
      'All 8 attack categories',
      '365-day history',
      'Graph replay',
      'Fork & rerun',
      '10 team members',
      'Priority support',
    ],
    cta: 'Upgrade to Team',
    highlight: false,
  },
];

// Animated terminal that cycles through attack categories
function LiveTerminal() {
  const [lines, setLines] = useState<{ text: string; color: string }[]>([]);
  const [catIndex, setCatIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const cat = ATTACK_CATEGORIES[catIndex % ATTACK_CATEGORIES.length] ?? 'prompt_injection';
    const newLines = [
      { text: `$ watchllm simulate --agent my_agent --categories ${cat}`, color: 'var(--text-secondary)' },
      { text: `→ Connecting to agent endpoint…`, color: 'var(--text-tertiary)' },
      { text: `→ Sending adversarial payload [${cat}]`, color: 'var(--text-tertiary)' },
      { text: `→ Scoring with LLM judge…`, color: 'var(--text-tertiary)' },
      { text: `✓ severity: 0.${Math.floor(Math.random() * 40 + 50)}  compromised: true`, color: 'var(--danger)' },
      { text: `✓ trace graph saved to R2`, color: 'var(--accent)' },
      { text: `✓ Simulation complete in 3.2s`, color: 'var(--accent)' },
    ];
    setLines([]);
    let i = 0;
    function addLine() {
      if (i < newLines.length) {
        const idx = i;
        i++;
        const lineToAdd = newLines[idx];
        if (lineToAdd) {
          setLines((prev) => [...prev, lineToAdd]);
        }
        intervalRef.current = setTimeout(addLine, 380);
      } else {
        intervalRef.current = setTimeout(() => {
          setCatIndex((prev) => prev + 1);
        }, 2800);
      }
    }
    intervalRef.current = setTimeout(addLine, 200);
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };

  }, [catIndex]);

  return (
    <div className="live-terminal">
      <div className="terminal-bar">
        <span className="tb tb-red" />
        <span className="tb tb-yellow" />
        <span className="tb tb-green" />
        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>watchllm — zsh</span>
      </div>
      <div className="terminal-body">
        {lines.map((line, i) => (
          <p key={i} style={{ color: line.color, fontFamily: 'var(--font-mono)', fontSize: '0.78rem', lineHeight: 1.7, margin: 0 }}>
            {line.text}
            {i === lines.length - 1 && <span className="cursor" />}
          </p>
        ))}
      </div>

      <style>{`
        .live-terminal {
          background: #08080c;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          overflow: hidden;
          width: 100%;
          max-width: 560px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,160,0.06);
        }
        .terminal-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          background: #0d0d12;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .tb {
          width: 11px; height: 11px;
          border-radius: 50%;
        }
        .tb-red    { background: #ff5f57; }
        .tb-yellow { background: #ffbd2e; }
        .tb-green  { background: #27c93f; }
        .terminal-body {
          padding: 16px 18px;
          min-height: 180px;
        }
        .cursor {
          display: inline-block;
          width: 7px; height: 14px;
          background: var(--accent);
          vertical-align: middle;
          margin-left: 2px;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

function NavBar({ user }: { user: { email: string } | null }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav
      className="nav-bar glass"
      style={{
        borderBottom: scrolled ? '1px solid var(--border)' : 'none',
        transition: 'border-color 0.2s ease, background 0.2s ease',
        background: scrolled ? 'rgba(6, 6, 8, 0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="1.5" />
          <polyline points="12 6 12 12 16 14" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span style={{ fontWeight: 700, letterSpacing: '-0.03em' }}>Watch<span style={{ color: 'var(--accent)' }}>LLM</span></span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="#features" className="nav-link">Features</a>
        <a href="#pricing" className="nav-link">Pricing</a>
        <a href="https://github.com" className="nav-link">Docs</a>
        {user ? (
          <Link href="/dashboard" className="btn btn-primary btn-sm">Dashboard →</Link>
        ) : (
          <LoginButton />
        )}
      </div>

      <style>{`
        .nav-link {
          font-size: 0.875rem;
          color: var(--text-secondary);
          transition: color 0.15s ease;
        }
        .nav-link:hover { color: var(--text-primary); }
        @media (max-width: 600px) {
          .nav-link { display: none; }
        }
      `}</style>
    </nav>
  );
}

function LoginButton() {
  const { loginWithGitHub } = useAuth();
  return (
    <button onClick={loginWithGitHub} className="btn btn-primary btn-sm">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
      Sign in with GitHub
    </button>
  );
}

export default function HomePage(): JSX.Element {
  const { user, loading } = useAuth();
  const paymentProvider = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === 'razorpay' ? 'inr' : 'usd';

  return (
    <>
      <NavBar user={user} />

      {/* HERO */}
      <section className="hero-section">
        <div className="hero-glow" />
        <div className="hero-glow" style={{ top: 'auto', bottom: '-200px', background: 'radial-gradient(ellipse, rgba(124, 106, 255, 0.06) 0%, transparent 70%)' }} />

        <div className="hero-badge">
          <span className="dot dot-success dot-pulse" />
          Agent Reliability Platform · 8 attack categories
        </div>

        <h1 style={{ maxWidth: '820px', marginBottom: '1.5rem' }}>
          Break Your Agent<br />
          <span style={{ color: 'var(--accent)' }}>Before Production Does.</span>
        </h1>

        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: '58ch', marginBottom: '2.5rem', lineHeight: 1.7 }}>
          WatchLLM stress-tests AI agents with adversarial simulations, stores execution as
          replayable trace graphs, and enables fork-based debugging from any failure node.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '4rem' }}>
          {loading ? null : user ? (
            <Link href="/dashboard" className="btn btn-primary btn-lg">
              Open Dashboard →
            </Link>
          ) : (
            <>
              <LoginButton />
              <a href="#features" className="btn btn-ghost btn-lg">See how it works</a>
            </>
          )}
        </div>

        {/* Attack category chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: '4rem', maxWidth: 640 }}>
          {ATTACK_CATEGORIES.map((cat) => (
            <span key={cat} className="cat-chip">
              <span className="dot dot-success" style={{ width: 5, height: 5 }} />
              {cat}
            </span>
          ))}
        </div>

        {/* Live terminal demo */}
        <LiveTerminal />
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '80px 32px', maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
            What WatchLLM does
          </p>
          <h2>Everything you need to ship <br />reliable AI agents</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-hover" style={{ '--feat-accent': f.accent } as React.CSSProperties}>
              <div style={{
                width: 44, height: 44,
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-md)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
                color: f.accent,
              }}>
                {f.icon}
              </div>
              <h3 style={{ marginBottom: 10, fontSize: '1rem' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SDK SECTION */}
      <section style={{ padding: '80px 32px', maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }}>
          <div>
            <p style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
              Python SDK
            </p>
            <h2>One decorator.<br />Test in CI.</h2>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: 20, marginBottom: 32 }}>
              Wrap your agent with <code style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>@watchllm.test</code> and
              gate your pipeline on severity thresholds. Zero config, instant signal.
            </p>
            <LoginButton />
          </div>
          <div>
            <pre className="code-block">
{`import watchllm

@watchllm.test(
    categories=["prompt_injection", "jailbreak"],
    threshold="severity < 0.3",
    wait=True
)
def my_agent(prompt: str) -> str:
    return llm.call(prompt)

# In CI — fails the build if severity >= 0.3
my_agent("hello")

# CLI usage
$ watchllm simulate \\
    --agent mymodule.my_agent \\
    --categories prompt_injection \\
    --threshold "severity < 0.3"`}
            </pre>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '80px 32px', maxWidth: 1140, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 16 }}>
            Pricing
          </p>
          <h2>Start free. Scale when it matters.</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className="card"
              style={{
                border: tier.highlight ? '1px solid rgba(0, 229, 160, 0.35)' : '1px solid var(--border)',
                background: tier.highlight ? 'linear-gradient(160deg, rgba(0,229,160,0.04), var(--surface))' : 'var(--surface)',
                position: 'relative',
              }}
            >
              {tier.highlight && (
                <div style={{
                  position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--accent)', color: '#04120c',
                  fontSize: '0.72rem', fontWeight: 700, padding: '2px 12px',
                  borderRadius: '0 0 8px 8px', whiteSpace: 'nowrap',
                }}>
                  MOST POPULAR
                </div>
              )}
              <div style={{ marginTop: tier.highlight ? 16 : 0 }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>{tier.name}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                  <span style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                    {tier.price[paymentProvider]}
                  </span>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>{tier.period}</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 24 }}>{tier.desc}</p>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
                  {tier.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {user ? (
                  tier.name === 'Free' ? (
                    <Link href="/dashboard" className={`btn ${tier.highlight ? 'btn-primary' : 'btn-ghost'} w-full`} style={{ justifyContent: 'center' }}>
                      Go to Dashboard
                    </Link>
                  ) : (
                    <Link href={`/dashboard/settings/billing?tier=${tier.name.toLowerCase()}`} className={`btn ${tier.highlight ? 'btn-primary' : 'btn-ghost'} w-full`} style={{ justifyContent: 'center' }}>
                      {tier.cta}
                    </Link>
                  )
                ) : (
                  <button
                    onClick={() => auth.loginWithGitHub()}
                    className={`btn ${tier.highlight ? 'btn-primary' : 'btn-ghost'} w-full`}
                    style={{ justifyContent: 'center' }}
                  >
                    {tier.name === 'Free' ? 'Start Free' : tier.cta}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid var(--border)',
        padding: '40px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: 1140,
        margin: '0 auto',
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="var(--accent)" strokeWidth="1.5" />
            <polyline points="12 6 12 12 16 14" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontWeight: 700, letterSpacing: '-0.03em', fontSize: '0.9rem' }}>
            Watch<span style={{ color: 'var(--accent)' }}>LLM</span>
          </span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem', marginLeft: 16 }}>
            © {new Date().getFullYear()} WatchLLM. Agent Reliability Platform.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['Docs', 'GitHub', 'Status', 'Privacy'].map((l) => (
            <a key={l} href="#" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{l}</a>
          ))}
        </div>
      </footer>
    </>
  );
}

// needed for the button outside the component
const auth = {
  loginWithGitHub() {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.watchllm.dev').replace(/\/$/, '');
    window.location.href = `${base}/api/v1/auth/sign-in/social?provider=github&callbackURL=${encodeURIComponent(window.location.origin + '/dashboard')}`;
  },
};
