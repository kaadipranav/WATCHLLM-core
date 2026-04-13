import Link from 'next/link';
import { Manrope, Space_Grotesk } from 'next/font/google';
import { DashboardCta } from '../components/dashboard-cta';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], weight: ['500', '600', '700'] });
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600'] });

const STATEMENTS = [
  {
    title: 'Attack Every Release Candidate.',
    copy:
      'Trigger prompt injection, tool abuse, and hallucination scenarios before production traffic ever touches your agent.',
  },
  {
    title: 'Replay Every Failure As A Graph.',
    copy:
      'Inspect node-by-node execution to see where context, routing, or policy guardrails drifted from expected behavior.',
  },
  {
    title: 'Ship Fixes With Proof, Not Guesswork.',
    copy:
      'Fork from the exact failure node, patch the issue, and verify the same path with one controlled rerun.',
  },
];

export default function HomePage(): JSX.Element {
  return (
    <main className={`lusion-page ${manrope.className}`}>
      {/* Background Glow */}
      <div className="lusion-bg-glow" aria-hidden="true" />

      {/* Decorative Swoosh / Accent Line */}
      <div className="lusion-swoosh-container" aria-hidden="true">
        <svg viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
          <path d="M-100 800 C 300 800, 600 200, 1000 200 C 1300 200, 1400 400, 1600 400" 
                stroke="var(--accent)" 
                strokeWidth="80" 
                strokeLinecap="round" 
                fill="none" 
                opacity="0.8" 
                filter="url(#glow)"/>
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="40" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
        </svg>
      </div>

      <header className="lusion-header">
        <div className="lusion-logo-container">
          <p className={`${spaceGrotesk.className} lusion-logo`}>WATCHLLM</p>
        </div>
        
        <nav className="lusion-nav" aria-label="Primary">
          <div className="lusion-pill-dash"></div>
          <DashboardCta
            className="lusion-pill btn-primary"
            signedOutLabel="LET'S TALK"
            signedInLabel="OPEN DASHBOARD"
          />
          <button className="lusion-menu-btn" aria-label="Menu">
            <span className="lusion-dot"></span>
            <span className="lusion-dot"></span>
            <span className="lusion-dot"></span>
          </button>
        </nav>
      </header>

      <section className="lusion-hero">
        <h1 className={`${spaceGrotesk.className} lusion-title`}>
          <span>Bold Ideas,</span>
          <br />
          <span>Brought to Life.</span>
        </h1>
      </section>

      <section className="lusion-content">
        <div className="lusion-grid">
          {/* Left container with 3 browser-style project thumbnails */}
          <div className="lusion-projects-card">
            <div className="lusion-browser">
               <div className="lusion-browser-header"><span></span><span></span><span></span></div>
               <div className="lusion-browser-body bg-accent-dim"></div>
            </div>
            <div className="lusion-browser">
               <div className="lusion-browser-header"><span></span><span></span><span></span></div>
               <div className="lusion-browser-body bg-surface-3"></div>
            </div>
            <div className="lusion-browser">
               <div className="lusion-browser-header"><span></span><span></span><span></span></div>
               <div className="lusion-browser-body bg-border-strong"></div>
            </div>
          </div>

          {/* Right text content */}
          <div className="lusion-description">
            <p>
              We combine design, motion, 3D, and development to create digital experiences that feel visually striking and technically seamless. From campaign launches to immersive brand worlds, we build work that captures attention and invites interaction.
            </p>
            <Link className="lusion-approach-cta btn btn-secondary" href="/dashboard/simulations">
              OUR APPROACH
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
