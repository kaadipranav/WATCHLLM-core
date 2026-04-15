import Link from 'next/link';
import { DashboardCta } from '../components/dashboard-cta';
import { GridBackground } from '../components/motion/grid-background';
import { HeroGridBoxes } from '../components/motion/hero-grid-boxes';
import { TextReveal } from '../components/motion/text-reveal';

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

const TRUST_MARKS = ['NOVA BANK', 'ORBIT OPS', 'ARC BIO', 'METRIC LAYER', 'STRATA LEGAL'];

const LOOP_STEPS = [
  {
    phase: 'Inject',
    title: 'Launch adversarial runs',
    detail:
      'Target specific failure classes with curated payload sets for prompt injection, hallucination, and tool abuse.',
  },
  {
    phase: 'Inspect',
    title: 'Replay the failure graph',
    detail:
      'Inspect every node transition and isolate exactly where routing, context, or policy handling drifted.',
  },
  {
    phase: 'Iterate',
    title: 'Fork and verify fixes',
    detail:
      'Branch from the failure node, ship the fix, and re-run the same attack path with confidence in minutes.',
  },
];

const SECTION_INDEX = [
  { id: 'hero', no: '01', label: 'Hero' },
  { id: 'proof', no: '02', label: 'Proof' },
  { id: 'loop', no: '03', label: 'Loop' },
  { id: 'capabilities', no: '04', label: 'Stack' },
  { id: 'roi', no: '05', label: 'ROI' },
];

const ROI_METRICS = [
  {
    label: 'Simulation volume',
    value: '8.8k / mo',
    delta: '+214% QoQ',
    note: 'Scaled from 2.8k monthly attack runs after adding scheduled category sweeps.',
  },
  {
    label: 'Issue reduction',
    value: '-43%',
    delta: 'critical incidents',
    note: 'Drop in production-critical agent failures tied to prompt and tool-chain behavior.',
  },
  {
    label: 'Time-to-fix',
    value: '-61%',
    delta: 'mean remediation time',
    note: 'From 13.6h to 5.3h by replaying from exact failure checkpoints.',
  },
];

export default function HomePage(): JSX.Element {
  return (
    <main className="polar-page">
      <div className="polar-atmosphere" aria-hidden="true" />
      <div className="polar-ring polar-ring-left" aria-hidden="true" />
      <div className="polar-ring polar-ring-right" aria-hidden="true" />

      <svg className="polar-scribble" viewBox="0 0 930 420" aria-hidden="true">
        <path d="M38 316C188 146 338 350 520 170C670 24 768 66 888 208" />
      </svg>

      <header className="polar-header">
        <div className="polar-brand">
          <p className="polar-logo">WATCHLLM</p>
          <p className="polar-tag">Agent Reliability Lab</p>
        </div>
        <nav className="polar-nav" aria-label="Primary">
          <span className="polar-chip polar-chip-light">LIVE CHAOS RIG</span>
          <DashboardCta
            className="polar-chip polar-chip-dark"
            signedOutLabel="SIGN IN"
            signedInLabel="OPEN DASHBOARD"
          />
          <a className="polar-chip polar-chip-outline" href="mailto:team@watchllm.dev">
            TALK TO US
          </a>
        </nav>
      </header>

      <aside className="polar-index reveal reveal-1" aria-label="Section index">
        {SECTION_INDEX.map((section) => (
          <a key={section.id} href={`#${section.id}`} className="polar-index-link">
            <span className="polar-index-no">{section.no}</span>
            <span className="polar-index-text">{section.label}</span>
          </a>
        ))}
      </aside>

      <section id="hero" className="polar-hero reveal reveal-2">
        <div className="polar-hero-stage">
          <HeroGridBoxes className="polar-hero-grid-plane" rows={14} cols={26} />
          <div className="polar-hero-grid-vignette" aria-hidden="true" />
          <TextReveal
            as="h1"
            className="polar-title-hero-stage neue-haas-heading"
            text="Pressure-Test Every Agent Path"
            amount={0.2}
            stagger={0.06}
          />
          <p className="polar-hero-subtext">
            WatchLLM intentionally breaks your agent in controlled scenarios, captures every decision as a graph,
            and gives your team a direct route from failure to verified fix.
          </p>
        </div>
      </section>

      <section className="polar-intro reveal reveal-3">
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
            <p className="polar-metric-value">8</p>
            <p className="polar-metric-label">attack categories</p>
          </article>
          <article className="polar-metric">
            <p className="polar-metric-value">0.7+</p>
            <p className="polar-metric-label">critical severity threshold</p>
          </article>
          <article className="polar-metric">
            <p className="polar-metric-value">3.2s</p>
            <p className="polar-metric-label">median run feedback time</p>
          </article>
        </div>
      </section>

      <section id="proof" className="polar-proof reveal reveal-4" aria-label="Social proof">
        <p className="polar-proof-label">Teams shipping high-stakes agents trust this workflow</p>
        <div className="polar-proof-track">
          {TRUST_MARKS.map((mark) => (
            <span key={mark} className="polar-mark">
              {mark}
            </span>
          ))}
        </div>
      </section>

      <section id="loop" className="polar-theater reveal reveal-5">
        <div className="polar-theater-intro">
          <p className="polar-eyebrow">Operating loop</p>
          <TextReveal
            as="h2"
            className="polar-section-title polar-section-title-major neue-haas-heading"
            text="Convert every incident into a measurable hardening cycle."
            amount={0.38}
            stagger={0.042}
          />
        </div>

        <article className="polar-theater-card" aria-label="Sample simulation run">
          <p className="polar-theater-title">Simulation run: pro-funnel-agent-v4</p>
          <div className="polar-log-lines">
            <p><span>$</span> watchllm simulate --categories prompt_injection,tool_abuse</p>
            <p><span>→</span> Injecting adversarial payload set #07</p>
            <p><span>→</span> Tool-call chain drift detected at node 14</p>
            <p><span>→</span> Severity scored at 0.82 (critical)</p>
            <p><span>✓</span> Graph stored and replay checkpoint created</p>
          </div>
        </article>

        <div className="polar-loop-grid" aria-label="Operating loop">
          {LOOP_STEPS.map((step) => (
            <article key={step.phase} className="polar-loop-step">
              <p className="polar-loop-phase">{step.phase}</p>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="capabilities" className="polar-lab reveal reveal-6">
        <GridBackground className="polar-capabilities-grid" />
        <div className="polar-lab-intro">
          <p className="polar-eyebrow">Core capabilities</p>
          <TextReveal
            as="h2"
            className="polar-section-title polar-section-title-major neue-haas-heading"
            text="A reliability stack purpose-built for agent teams."
            amount={0.38}
            stagger={0.042}
          />
        </div>

        <article className="polar-lab-art" aria-hidden="true">
          <div className="polar-grid-fade" />
          <div className="polar-orbit" />
          <div className="polar-track" />
          <div className="polar-track polar-track-alt" />
        </article>

        <div className="polar-cap-grid">
          {CAPABILITIES.map((capability) => (
            <article key={capability.title} className="polar-cap-card">
              <h2>{capability.title}</h2>
              <p>{capability.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="roi" className="polar-roi reveal reveal-7" aria-label="ROI strip">
        <div className="polar-roi-head">
          <p className="polar-eyebrow">ROI strip</p>
          <h2 className="polar-section-title">
            Reliability outcomes your engineering and finance teams can both trust.
          </h2>
        </div>

        <div className="polar-roi-grid">
          {ROI_METRICS.map((metric) => (
            <article key={metric.label} className="polar-roi-card">
              <p className="polar-roi-label">{metric.label}</p>
              <p className="polar-roi-value">{metric.value}</p>
              <p className="polar-roi-delta">{metric.delta}</p>
              <p className="polar-roi-note">{metric.note}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="polar-closer reveal reveal-8">
        <div>
          <p className="polar-closer-kicker">Reliability is a product feature.</p>
          <h2 className="polar-closer-title">Ship agents your users can trust under pressure.</h2>
        </div>
        <div className="polar-closer-actions">
          <Link className="polar-chip polar-chip-dark" href="/dashboard/settings/billing">
            Start stress testing
          </Link>
          <a className="polar-chip polar-chip-outline" href="mailto:team@watchllm.dev">
            Talk to our team
          </a>
        </div>
      </section>
    </main>
  );
}
