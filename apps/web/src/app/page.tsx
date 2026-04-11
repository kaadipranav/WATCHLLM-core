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
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: 'Adversarial Simulation',
    desc: '8 attack categories targeting prompt injection, jailbreaks, tool abuse, hallucination, and data exfiltration. Every vector your agent will face in the wild.',
    accent: 'var(--accent)',
  },
  {
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'LLM Judge Scoring',
    desc: 'Fast rule scorer + optional LLM judge gives every run a severity score 0–1. Anything ≥ 0.7 is compromised. Hard numbers, not vibes.',
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
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
];

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
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>watchllm — zsh</span>
      </div>
      <div className="terminal-body">
        {lines.map((line, i) => (
          <p key={i} style={{ color: line.color, fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: 2, margin: 0 }}>
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
          max-width: 800px;
          box-shadow: 0 32px 100px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,229,160,0.06);
        }
        .terminal-bar {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 16px;
          background: #0d0d12;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .tb {
          width: 12px; height: 12px;
          border-radius: 50%;
        }
        .tb-red    { background: #ff5f57; }
        .tb-yellow { background: #ffbd2e; }
        .tb-green  { background: #27c93f; }
        .terminal-body {
          padding: 24px;
          min-height: 250px;
        }
        .cursor {
          display: inline-block;
          width: 8px; height: 16px;
          background: var(--accent);
          vertical-align: middle;
          margin-left: 4px;
          animation: blink 1s step-end infinite;
        }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

function LoginButton({ large = false }: { large?: boolean }) {
  const { loginWithGitHub } = useAuth();
  return (
    <button onClick={() => loginWithGitHub()} className={`btn-pill ${large ? 'btn-pill-accent' : 'btn-pill-dark'}`} style={large ? { height: '60px', padding: '0 40px', fontSize: '1rem' } : {}}>
      <svg width={large ? "20" : "15"} height={large ? "20" : "15"} viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: large ? '12px' : '8px' }}>
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
      Sign in with GitHub
    </button>
  );
}

function NavBar({ user }: { user: any }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav className="nav-bar-modern" style={{
      background: scrolled ? 'rgba(8, 8, 8, 0.95)' : 'transparent',
      backdropFilter: scrolled ? 'blur(20px)' : 'none',
      borderBottom: scrolled ? '1px solid rgba(255,255,255,0.05)' : 'none',
    }}>
      <div className="nav-left">
        <span className="logo-text">WATCH<span style={{ color: 'var(--accent)' }}>LLM</span></span>
      </div>
      <div className="nav-right">
        {user ? (
          <Link href="/dashboard" className="btn-pill btn-pill-dark">Dashboard →</Link>
        ) : (
          <LoginButton />
        )}
      </div>

      <style>{`
        .nav-bar-modern {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 40px;
          z-index: 1000;
          transition: background 0.3s ease, border-bottom 0.3s ease, backdrop-filter 0.3s ease;
        }
        .logo-text {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .nav-right {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .btn-pill {
          height: 40px;
          padding: 0 24px;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease, opacity 0.2s ease, background 0.2s ease;
          border: none;
          outline: none;
          text-decoration: none;
        }
        .btn-pill:hover { transform: scale(1.05); }
        .btn-pill:active { transform: scale(0.95); }
        .btn-pill-dark {
          background: #1a1a1a;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.1);
        }
        .btn-pill-dark:hover {
          background: #2a2a2a;
        }
        .btn-pill-light {
          background: #f0f0f0;
          color: #000;
        }
        .btn-pill-accent {
          background: var(--accent);
          color: #000;
          box-shadow: 0 0 30px rgba(0, 200, 150, 0.4);
        }
        .btn-pill-accent:hover {
          background: #00ffb3;
          box-shadow: 0 0 50px rgba(0, 200, 150, 0.6);
        }
      `}</style>
    </nav>
  );
}

export default function HomePage(): JSX.Element {
  const { user, loading } = useAuth();
  const paymentProvider = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER === 'razorpay' ? 'inr' : 'usd';

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 60;
      const y = (e.clientY / window.innerHeight - 0.5) * 60;
      document.documentElement.style.setProperty('--mouse-x', `${x}px`);
      document.documentElement.style.setProperty('--mouse-y', `${y}px`);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div style={{ background: '#080808', minHeight: '100vh', overflowX: 'hidden', position: 'relative' }}>
      <NavBar user={user} />

      {/* Hero Glows */}
      <div className="massive-glow" style={{ top: '-10%', left: '-10%', background: 'var(--accent)', animationDelay: '0s' }} />
      <div className="massive-glow" style={{ top: '40%', right: '-20%', background: 'var(--accent-2)', animationDelay: '-3s', filter: 'blur(200px)' }} />
      
      <div className="grid-overlay" />

      {/* HERO SECTION */}
      <section className="hero-massive" style={{ paddingTop: '20vh' }}>
        <h1 className="hero-title">
          <span className="hero-line">Break Agents</span>
          <span className="hero-line">Before They</span>
          <span className="hero-line indent">Break You.</span>
        </h1>
        
        <div className="hero-sub fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <p>
            We combine adversarial fuzzing, trace graph analysis, and LLM judges to create digital environments that stress-test your AI agents. From prompt injection to infinite loops, we build tests that capture the real world.
          </p>
          <div style={{ marginTop: '40px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            {loading ? null : user ? (
              <Link href="/dashboard" className="btn-pill btn-pill-accent" style={{ height: '60px', padding: '0 40px', fontSize: '1rem' }}>
                Open Dashboard
              </Link>
            ) : (
              <LoginButton large />
            )}
          </div>
        </div>
      </section>

      {/* Terminal Demo Section */}
      <section style={{ position: 'relative', zIndex: 10, padding: '120px 40px', display: 'flex', justifyContent: 'center' }}>
        <LiveTerminal />
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '120px 40px', maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div style={{ marginBottom: 100 }}>
          <h2 className="section-title">Everything you need to ship reliable AI agents.</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 40 }}>
          {FEATURES.map((f, i) => (
            <div key={i} className="feature-card fade-in-up" style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'both' }}>
              <div className="feature-icon" style={{ color: f.accent }}>
                {f.icon}
              </div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '120px 40px', maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 10 }}>
        <div style={{ marginBottom: 100 }}>
          <h2 className="section-title">Start free. Scale when it matters.</h2>
        </div>

        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          {PRICING_TIERS.map((tier) => (
            <div key={tier.name} className={`pricing-card ${tier.highlight ? 'highlight' : ''}`}>
              {tier.highlight && <div className="pricing-badge">MOST POPULAR</div>}
              <h3>{tier.name}</h3>
              <div className="price-row">
                <span className="price">{tier.price[paymentProvider]}</span>
                <span className="period">{tier.period}</span>
              </div>
              <p className="desc">{tier.desc}</p>
              
              <ul className="feature-list">
                {tier.features.map((f, i) => (
                  <li key={i}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 'auto', paddingTop: '40px' }}>
                {user ? (
                  <Link href="/dashboard" className={`btn-pill ${tier.highlight ? 'btn-pill-accent' : 'btn-pill-light'}`} style={{ width: '100%', height: '54px', fontSize: '1rem' }}>
                    Go to Dashboard
                  </Link>
                ) : (
                  <button onClick={() => auth.loginWithGitHub()} className={`btn-pill ${tier.highlight ? 'btn-pill-accent' : 'btn-pill-light'}`} style={{ width: '100%', height: '54px', fontSize: '1rem' }}>
                    {tier.name === 'Free' ? 'Start Free' : tier.cta}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '60px 40px', display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 10, flexWrap: 'wrap', gap: '40px' }}>
        <div>
          <span className="logo-text" style={{ fontSize: '1.2rem' }}>WATCH<span style={{ color: 'var(--accent)' }}>LLM</span></span>
          <p style={{ color: 'var(--text-tertiary)', marginTop: '16px', fontSize: '0.9rem' }}>© {new Date().getFullYear()} WatchLLM. Agent Reliability Platform.</p>
        </div>
        <div style={{ display: 'flex', gap: '40px' }}>
          <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}>Docs</a>
          <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}>GitHub</a>
          <a href="#" style={{ color: 'var(--text-secondary)', textDecoration: 'none', transition: 'color 0.2s' }}>Privacy</a>
        </div>
      </footer>

      {/* STYLES */}
      <style>{`
        .massive-glow {
          position: absolute;
          width: 60vw;
          height: 60vw;
          max-width: 1200px;
          max-height: 1200px;
          border-radius: 50%;
          filter: blur(180px);
          opacity: 0.12;
          z-index: 1;
          pointer-events: none;
          transform: translate(var(--mouse-x, 0), var(--mouse-y, 0));
          animation: floatGlow 15s infinite ease-in-out alternate;
        }
        @keyframes floatGlow {
          0% { transform: translate(var(--mouse-x, 0), var(--mouse-y, 0)) scale(1); }
          100% { transform: translate(calc(var(--mouse-x, 0) + 100px), calc(var(--mouse-y, 0) - 100px)) scale(1.1); }
        }
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.02) 1px, transparent 1px);
          background-size: 80px 80px;
          z-index: 2;
          pointer-events: none;
          mask-image: linear-gradient(to bottom, black 20%, transparent 80%);
          -webkit-mask-image: linear-gradient(to bottom, black 20%, transparent 80%);
        }
        .hero-massive {
          position: relative;
          z-index: 10;
          padding: 0 40px;
          max-width: 1600px;
          margin: 0 auto;
        }
        .hero-title {
          font-family: var(--font-display);
          font-size: clamp(5rem, 12vw, 15rem);
          line-height: 0.85;
          letter-spacing: -0.04em;
          margin: 0;
          color: #fff;
          display: flex;
          flex-direction: column;
        }
        .hero-line {
          display: block;
          background: linear-gradient(to right, #ffffff 30%, #888888 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-line.indent {
          padding-left: 15%;
          background: linear-gradient(to right, var(--accent), #007a5b);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-sub {
          margin-top: 100px;
          max-width: 650px;
          margin-left: auto;
          margin-right: 10%;
        }
        .hero-sub p {
          font-family: var(--font-display);
          font-size: 1.5rem;
          line-height: 1.6;
          color: var(--text-secondary);
          margin: 0;
        }

        .section-title {
          font-size: clamp(3rem, 6vw, 6rem);
          line-height: 1;
          letter-spacing: -0.03em;
          color: #fff;
          max-width: 1000px;
          margin: 0;
        }

        .feature-card {
          padding: 40px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 24px;
          transition: transform 0.3s ease, background 0.3s ease, box-shadow 0.3s ease;
        }
        .feature-card:hover {
          transform: translateY(-5px);
          background: rgba(255,255,255,0.04);
          border-color: rgba(255,255,255,0.1);
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .feature-icon {
          width: 80px; height: 80px;
          background: rgba(255,255,255,0.03);
          border-radius: 20px;
          display: flex; alignItems: center; justifyContent: center;
          margin-bottom: 30px;
        }
        .feature-card h3 {
          font-size: 1.8rem;
          margin-bottom: 20px;
          color: #fff;
        }
        .feature-card p {
          font-size: 1.1rem;
          line-height: 1.7;
          color: var(--text-secondary);
        }

        .pricing-card {
          flex: 1;
          min-width: 350px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 32px;
          padding: 60px;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .pricing-card.highlight {
          border-color: rgba(0, 200, 150, 0.4);
          background: linear-gradient(180deg, rgba(0, 200, 150, 0.05) 0%, rgba(255,255,255,0.02) 100%);
          box-shadow: 0 0 80px rgba(0, 200, 150, 0.1);
        }
        .pricing-badge {
          position: absolute;
          top: -16px; left: 50%;
          transform: translateX(-50%);
          background: var(--accent);
          color: #000;
          padding: 8px 24px;
          border-radius: 9999px;
          font-weight: 700;
          font-size: 0.85rem;
          letter-spacing: 0.05em;
        }
        .pricing-card h3 { font-size: 2rem; color: #fff; margin-bottom: 20px; }
        .price-row { display: flex; alignItems: baseline; gap: 8px; margin-bottom: 20px; }
        .price-row .price { font-size: 4rem; font-weight: 700; letter-spacing: -0.04em; color: #fff; line-height: 1; }
        .price-row .period { color: var(--text-tertiary); font-size: 1.2rem; }
        .pricing-card .desc { color: var(--text-secondary); font-size: 1.1rem; margin-bottom: 40px; }
        .feature-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 20px; }
        .feature-list li { display: flex; alignItems: center; gap: 16px; font-size: 1.1rem; color: var(--text-secondary); }

        @media (max-width: 1024px) {
          .hero-title { font-size: clamp(4rem, 10vw, 8rem); }
          .hero-sub { margin-right: 0; max-width: 100%; margin-top: 60px; }
          .hero-sub p { font-size: 1.25rem; }
          .section-title { font-size: clamp(2.5rem, 5vw, 4rem); }
          .pricing-card { padding: 40px; }
        }
        @media (max-width: 768px) {
          .hero-massive { padding: 0 20px; }
          .hero-line.indent { padding-left: 0; }
        }
        
        .fade-in-up {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

const auth = {
  loginWithGitHub() {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.watchllm.dev').replace(/\/$/, '');
    window.location.href = `${base}/api/v1/auth/sign-in/social?provider=github&callbackURL=${encodeURIComponent(window.location.origin + '/dashboard')}`;
  },
};
