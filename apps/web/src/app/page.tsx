import Link from 'next/link';
import { Manrope, Syne } from 'next/font/google';

const syne = Syne({ subsets: ['latin'], weight: ['500', '700', '800'] });
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'] });

const CAPABILITIES = [
  {
    title: 'Prompt attack rehearsals',
    description:
      'Simulate jailbreaks, role confusion, and context poisoning before users ever see unstable behavior.',
  },
  {
    title: 'Trace-first debugging',
    description:
      'Replay every node in the execution graph and isolate exactly where tool calls or memory decisions derailed.',
  },
  {
    title: 'Severity scoring',
    description:
      'Use rule scoring plus judge verdicts to prioritize fixes by impact, not by noise.',
  },
];

export default function HomePage(): JSX.Element {
  return (
    <main className={`polar-page ${manrope.className}`}>
      <div className="polar-atmosphere" aria-hidden="true" />
      <div className="polar-ring polar-ring-left" aria-hidden="true" />
      <div className="polar-ring polar-ring-right" aria-hidden="true" />

      <svg className="polar-scribble" viewBox="0 0 930 420" aria-hidden="true">
        <path d="M40 330C220 150 390 380 580 180C700 62 790 70 900 210" />
      </svg>

      <header className="polar-header reveal reveal-1">
        <p className={`${syne.className} polar-logo`}>WATCHLLM</p>
        <nav className="polar-nav" aria-label="Primary">
          <button type="button" className="polar-chip polar-chip-round" aria-label="Toggle controls">
            -
          </button>
          <a className="polar-chip polar-chip-dark" href="mailto:team@watchllm.dev">
            LET&apos;S TALK
          </a>
          <button type="button" className="polar-chip polar-chip-light" aria-label="Open menu">
            MENU ..
          </button>
        </nav>
      </header>

      <section className="polar-hero reveal reveal-2">
        <h1 className={`${syne.className} polar-title`}>
          <span>Where Creative Agents</span>
          <span>Become Unbreakable</span>
          <span>Experiences</span>
        </h1>
      </section>

      <section className="polar-intro reveal reveal-3">
        <p>
          We combine adversarial simulation, graph replay, and strict severity scoring to build AI products
          that feel sharp under pressure, not fragile after launch.
        </p>

        <div className="polar-intro-actions">
          <Link className="polar-approach" href="/dashboard/settings/billing">
            <span className="polar-dot" aria-hidden="true" />
            OUR APPROACH
          </Link>
          <Link className="polar-secondary-link" href="/dashboard">
            Open dashboard
          </Link>
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
