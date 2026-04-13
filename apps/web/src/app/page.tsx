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
    <main className={`monument-page ${manrope.className}`}>
      <div className="monument-ring monument-ring-left" aria-hidden="true" />
      <div className="monument-ring monument-ring-center" aria-hidden="true" />
      <div className="monument-ring monument-ring-right" aria-hidden="true" />

      <header className="monument-header">
        <p className={`${spaceGrotesk.className} monument-logo`}>WATCHLLM</p>
        <nav className="monument-nav" aria-label="Primary">
          <DashboardCta
            className="monument-pill monument-pill-dark"
            signedOutLabel="SIGN IN"
            signedInLabel="OPEN DASHBOARD"
          />
          <Link className="monument-pill monument-pill-light" href="/dashboard/simulations">
            SIMULATIONS
          </Link>
        </nav>
      </header>

      <section className="monument-hero">
        <p className="monument-kicker">Agent Reliability Platform</p>
        <h1 className={`${spaceGrotesk.className} monument-title`}>
          <span>Where Agent Failures</span>
          <span>Become Verified Fixes</span>
        </h1>
        <p className="monument-lead">
          Break your agents in controlled adversarial runs, replay the exact failure path, and validate every fix
          before users ever see the issue.
        </p>

        <div className="monument-actions">
          <Link className="monument-cta monument-cta-primary" href="/dashboard/settings/billing">
            START STRESS TEST
          </Link>
          <DashboardCta
            className="monument-cta monument-cta-secondary"
            signedOutLabel="LET'S TALK"
            signedInLabel="GO TO DASHBOARD"
          />
        </div>
      </section>

      <section className="monument-statements" aria-label="Core value">
        {STATEMENTS.map((statement, index) => (
          <article key={statement.title} className="monument-statement">
            <p className="monument-index">0{index + 1}</p>
            <h2 className={`${spaceGrotesk.className} monument-subtitle`}>{statement.title}</h2>
            <p className="monument-copy">{statement.copy}</p>
          </article>
        ))}
      </section>

      <section className="monument-closer">
        <h2 className={`${spaceGrotesk.className} monument-final`}>Ship agents your users can trust.</h2>
        <div className="monument-actions">
          <Link className="monument-cta monument-cta-primary" href="/dashboard/settings/billing">
            GET STARTED
          </Link>
          <a className="monument-cta monument-cta-secondary" href="mailto:team@watchllm.dev">
            CONTACT SALES
          </a>
        </div>
      </section>
    </main>
  );
}
