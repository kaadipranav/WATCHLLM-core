'use client';

import { GraphVisualizer } from '@/components/graph/GraphVisualizer';
import { NodeInspector } from '@/components/graph/NodeInspector';
import { TimelineScrubber } from '@/components/graph/TimelineScrubber';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useSimulation } from '@/hooks/useSimulation';
import { useSimulationReplay } from '@/hooks/useSimulationReplay';

interface SimulationDetailClientProps {
  simulationId: string;
}

export function SimulationDetailClient({ simulationId }: SimulationDetailClientProps) {
  const simulation = useSimulation(simulationId);
  const replay = useSimulationReplay(simulationId);

  if (simulation.isLoading || replay.isLoading) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-text-secondary">Loading simulation...</div>
    );
  }

  if (simulation.error) {
    return (
      <EmptyState
        icon={<span className="text-2xl">!</span>}
        title="Failed to load simulation"
        description={simulation.error}
      />
    );
  }

  if (replay.upgradeRequired) {
    return (
      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3l3 6 6 .8-4.5 4.4 1 6.3L12 17l-5.5 3.5 1-6.3L3 9.8 9 9z" />
          </svg>
        }
        title="Replay requires a paid tier"
        description="Graph replay is disabled on the free plan. Upgrade to Pro or Team to inspect traces and fork from failures."
        ctaLabel="Upgrade plan"
        onCtaClick={() => {
          window.location.href = '/pricing';
        }}
      />
    );
  }

  if (replay.error) {
    return (
      <EmptyState
        icon={<span className="text-2xl">!</span>}
        title="Failed to load replay"
        description={replay.error}
      />
    );
  }

  if (!replay.activeGraph) {
    return (
      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 12h16M12 4v16" />
          </svg>
        }
        title="No trace graph available"
        description="This simulation has no completed replay graph yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-xs text-text-tertiary">Simulation</p>
            <h1 className="text-xl font-semibold text-text-primary">{simulation.data?.id}</h1>
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge status={simulation.data?.status ?? 'queued'} />
            {replay.graphs.length > 1 ? (
              <select
                className="h-9 rounded-[7px] border border-border bg-surface-raised px-3 text-sm text-text-primary"
                value={replay.activeGraph.run_id}
                onChange={(event) => replay.selectRun(event.target.value)}
              >
                {replay.graphs.map((graph) => (
                  <option key={graph.run_id} value={graph.run_id}>
                    {graph.category} ({graph.run_id})
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-4 xl:grid-cols-5">
        <section className="space-y-4 xl:col-span-3">
          <GraphVisualizer
            graph={replay.activeGraph}
            selectedNodeId={replay.selectedNode?.id ?? null}
            highlightedNodeIds={replay.highlightedNodeIds}
            onNodeSelect={replay.selectNode}
          />
          <TimelineScrubber
            totalNodes={replay.activeGraph.nodes.length}
            value={replay.scrubIndex}
            onScrub={replay.scrubTo}
          />
        </section>

        <section className="xl:col-span-2">
          <NodeInspector node={replay.selectedNode} />
        </section>
      </div>
    </div>
  );
}