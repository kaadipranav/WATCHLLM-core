import Link from 'next/link';
import { Manrope, Syne } from 'next/font/google';

const syne = Syne({ subsets: ['latin'], weight: ['500', '700', '800'] });
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

const CAPABILITIES = [
  {
    title: 'Adversarial category matrix',
    description:
      'Run prompt injection, tool abuse, hallucination, and role-confusion attacks against every release candidate.',
  },
  {
    title: 'Replayable execution graphs',
    description:
      'Inspect node-by-node execution and pinpoint where context, tool routing, or policy checks actually failed.',
  },
  {
    title: 'Fork-and-fix workflow',
    description:
      'Branch directly from the failure node, patch the prompt or tool logic, and verify the same path in minutes.',
  },
];

export default function HomePage(): JSX.Element {
  return (
    <main className={`polar-page ${manrope.className}`}>
      <div className="polar-atmosphere" aria-hidden="true" />
      <div className="polar-ring polar-ring-left" aria-hidden="true" />
      <div className="polar-ring polar-ring-right" aria-hidden="true" />

      <svg className="polar-scribble" viewBox="0 0 930 420" aria-hidden="true">
        <path d="M38 316C188 146 338 350 520 170C670 24 768 66 888 208" />
      </svg>

      <header className="polar-header reveal reveal-1">
        <div className="polar-brand">
          <p className={`${syne.className} polar-logo`}>WATCHLLM</p>
          <p className="polar-tag">Agent Reliability Lab</p>
        </div>
        <nav className="polar-nav" aria-label="Primary">
          <span className="polar-chip polar-chip-light">LIVE CHAOS RIG</span>
          <Link className="polar-chip polar-chip-dark" href="/dashboard">
            OPEN DASHBOARD
          </Link>
          <a className="polar-chip polar-chip-outline" href="mailto:team@watchllm.dev">
            TALK TO US
          </a>
        </nav>
      </header>

      <section className="polar-hero reveal reveal-2">
        <h1 className={`${syne.className} polar-title`}>
          <span>Pressure-Test</span>
          <span>Every Agent</span>
          <span>Path</span>
        </h1>
      </section>

      <section className="polar-intro reveal reveal-3">
        <p>
          WatchLLM intentionally breaks your agent in controlled scenarios, captures every decision as a graph,
          and gives your team a direct route from failure to verified fix.
        </p>

        <div className="polar-intro-actions">
          <Link className="polar-approach" href="/dashboard/settings/billing">
            <span className="polar-dot" aria-hidden="true" />
            START STRESS SIM
          </Link>
          <Link className="polar-secondary-link" href="/dashboard/simulations">
            Explore simulations
          </Link>
        </div>

        <div className="polar-metrics" aria-label="Platform highlights">
          <article className="polar-metric">
            <p className={`${syne.className} polar-metric-value`}>8</p>
            <p className="polar-metric-label">attack categories</p>
          </article>
          <article className="polar-metric">
            <p className={`${syne.className} polar-metric-value`}>0.7+</p>
            <p className="polar-metric-label">critical severity threshold</p>
          </article>
          <article className="polar-metric">
            <p className={`${syne.className} polar-metric-value`}>3.2s</p>
            <p className="polar-metric-label">median run feedback time</p>
          </article>
        </div>
      </section>

      <section className="polar-lab reveal reveal-4">
        <article className="polar-lab-art" aria-hidden="true">
          <div className="polar-grid-fade" />
          <div className="polar-orbit" />
          <div className="polar-track" />
          <div className="polar-track polar-track-alt" />
        </article>

        <div className="polar-cap-grid">
          {CAPABILITIES.map((capability) => (
            <article key={capability.title} className="polar-cap-card">
              <h2 className={syne.className}>{capability.title}</h2>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
