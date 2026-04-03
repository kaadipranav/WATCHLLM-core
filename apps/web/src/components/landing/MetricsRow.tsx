const METRICS = [
  { value: '20+', label: 'attack categories' },
  { value: '< 5 min', label: 'to first simulation' },
  { value: '100%', label: 'run coverage via graph replay' },
  { value: '0', label: 'cold reruns with fork & replay' },
] as const;

export function MetricsRow() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map((metric) => (
          <article key={metric.label} className="rounded-lg border border-border bg-surface px-5 py-6">
            <p className="font-mono text-3xl text-accent">{metric.value}</p>
            <p className="mt-2 text-sm text-text-secondary">{metric.label}</p>
          </article>
        ))}
      </div>
    </section>
  );
}