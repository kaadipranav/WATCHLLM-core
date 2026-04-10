import Link from 'next/link';
import UpgradePrompt from '../components/upgrade-prompt';

export default function HomePage(): JSX.Element {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="hero-kicker">Agent Reliability Platform</p>
        <h1>Break Your Agent Before Production Does.</h1>
        <p className="hero-copy">
          WatchLLM stress-tests your AI agents with adversarial simulations, stores graph traces,
          and helps your team replay failures safely.
        </p>

        <div className="hero-actions">
          <Link href="/dashboard/settings/billing" className="btn btn-primary">
            Open Billing
          </Link>
          <a className="btn btn-ghost" href="https://watchllm-api.watchllm.workers.dev/health">
            API Health
          </a>
        </div>
      </section>

      <UpgradePrompt />
    </main>
  );
}
