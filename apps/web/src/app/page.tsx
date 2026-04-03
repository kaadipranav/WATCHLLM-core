import { ForkReplayFeature } from '@/components/landing/ForkReplayFeature';
import { GraphReplayFeature } from '@/components/landing/GraphReplayFeature';
import { MetricsRow } from '@/components/landing/MetricsRow';
import { Navigation } from '@/components/landing/Navigation';
import { PricingSection } from '@/components/landing/PricingSection';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { PythonCodeBlock } from '@/components/landing/PythonCodeBlock';
import { SimulationTerminal } from '@/components/landing/SimulationTerminal';
import { StressTestFeature } from '@/components/landing/StressTestFeature';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <main className="bg-bg text-text-primary">
      <Navigation />

      <section className="flex min-h-screen flex-col items-center justify-center px-6 pt-24">
        <div className="mb-8 flex items-center gap-2 rounded-full border border-border px-4 py-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
          <span className="font-mono text-sm text-text-secondary">Agent Reliability Platform</span>
        </div>

        <h1 className="max-w-3xl text-center text-4xl font-semibold leading-[1.1] text-text-primary sm:text-5xl lg:text-6xl">
          Your agent works in dev.
          <br />
          WatchLLM makes it work in prod.
        </h1>

        <p className="mt-6 max-w-xl text-center text-lg text-text-secondary">
          Stress test, replay, and debug AI agents before your users find the failures.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="accent" href="/sign-up">
            Start testing free
          </Button>
          <Button variant="ghost" href="/docs">
            Read the docs
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 font-mono text-sm text-text-tertiary">
          <span>No credit card</span>
          <span>·</span>
          <span>Deploy in 5 min</span>
          <span>·</span>
          <span>Works with any framework</span>
        </div>

        <SimulationTerminal />
      </section>

      <ProblemSection />

      <section className="px-6 py-24">
        <div className="mx-auto flex max-w-6xl flex-col gap-6">
          <div className="flex">
            <div className="w-full lg:max-w-5xl">
              <StressTestFeature />
            </div>
          </div>
          <div className="flex lg:justify-end">
            <div className="w-full lg:max-w-5xl">
              <GraphReplayFeature />
            </div>
          </div>
          <div className="flex">
            <div className="w-full lg:max-w-5xl">
              <ForkReplayFeature />
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <PythonCodeBlock />
        </div>
      </section>

      <MetricsRow />
      <PricingSection />

      <footer className="border-t border-border px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 text-sm text-text-tertiary sm:flex-row sm:items-center">
          <span className="font-mono text-text-secondary">WatchLLM</span>
          <span>Break agents before production does.</span>
        </div>
      </footer>
    </main>
  );
}