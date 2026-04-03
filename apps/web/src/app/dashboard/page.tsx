export default function DashboardHomePage() {
  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
      <p className="mt-2 text-text-secondary">
        Select a simulation to inspect trace graphs, replay failures, and fork from compromised nodes.
      </p>
    </section>
  );
}