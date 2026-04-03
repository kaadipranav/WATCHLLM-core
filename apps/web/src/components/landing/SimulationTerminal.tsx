'use client';

import { useSimulationTerminal } from '@/hooks/useSimulationTerminal';

function severityClass(severity: number) {
  if (severity >= 0.7) return 'text-danger';
  if (severity >= 0.35) return 'text-warning';
  return 'text-accent';
}

export function SimulationTerminal() {
  const { visibleRuns } = useSimulationTerminal();

  return (
    <div className="mt-12 w-full max-w-2xl rounded-lg border border-border bg-surface p-5 font-mono text-sm shadow-[0_0_0_1px_rgba(255,255,255,0.01),0_20px_40px_rgba(0,0,0,0.35)]">
      <div className="mb-4 flex items-center gap-2 text-xs text-text-tertiary">
        <span className="h-2 w-2 rounded-full bg-danger/70" />
        <span className="h-2 w-2 rounded-full bg-warning/70" />
        <span className="h-2 w-2 rounded-full bg-accent/70" />
        <span className="ml-2">watchllm terminal</span>
      </div>

      <p className="text-text-secondary">$ watchllm simulate --agent agt_f4kd8vk81sf9c8d2</p>
      <p className="mt-1 text-accent">Running simulation sim_8n29avlk2m0q1x9...</p>

      <div className="mt-4 space-y-2">
        {visibleRuns.map((run) => (
          <div key={run.category} className="flex items-center justify-between rounded-md bg-surface-raised px-3 py-2">
            <span className="text-text-primary">{run.category}</span>
            <span className={severityClass(run.severity)}>severity {run.severity.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}