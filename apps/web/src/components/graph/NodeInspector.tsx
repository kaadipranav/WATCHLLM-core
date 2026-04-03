'use client';

import type { TraceNode } from '@watchllm/types';

interface NodeInspectorProps {
  node: TraceNode | null;
}

const TYPE_BADGE_STYLES: Record<TraceNode['type'], string> = {
  llm_call: 'bg-accent/10 text-accent border-accent/30',
  tool_call: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/40',
  decision: 'bg-warning/10 text-warning border-warning/40',
  memory_read: 'bg-white/5 text-text-secondary border-border',
  memory_write: 'bg-white/5 text-text-secondary border-border',
  agent_start: 'bg-white/5 text-text-primary border-border',
  agent_end: 'bg-white/5 text-text-primary border-border',
};

function formatTimestamp(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleString();
}

function formatCost(value: number | null) {
  if (value === null) return 'n/a';
  return `$${value.toFixed(4)}`;
}

function formatTokens(value: number | null) {
  if (value === null) return 'n/a';
  return value.toLocaleString();
}

export function NodeInspector({ node }: NodeInspectorProps) {
  if (!node) {
    return (
      <aside className="h-full rounded-lg border border-border bg-surface p-5">
        <h3 className="text-lg font-semibold text-text-primary">Node inspector</h3>
        <p className="mt-3 text-sm text-text-secondary">Select a node in the graph to inspect payloads and metadata.</p>
      </aside>
    );
  }

  return (
    <aside className="h-full rounded-lg border border-border bg-surface p-5">
      <h3 className="text-lg font-semibold text-text-primary">Node inspector</h3>

      <div className="mt-4 flex items-center gap-2">
        <span className={`rounded-full border px-3 py-1 font-mono text-xs ${TYPE_BADGE_STYLES[node.type]}`}>
          {node.type}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-md border border-border bg-surface-raised p-3">
          <dt className="text-text-tertiary">Timestamp</dt>
          <dd className="mt-1 text-text-primary">{formatTimestamp(node.timestamp)}</dd>
        </div>
        <div className="rounded-md border border-border bg-surface-raised p-3">
          <dt className="text-text-tertiary">Latency</dt>
          <dd className="mt-1 text-text-primary">{node.latency_ms} ms</dd>
        </div>
        <div className="rounded-md border border-border bg-surface-raised p-3">
          <dt className="text-text-tertiary">Tokens</dt>
          <dd className="mt-1 text-text-primary">{formatTokens(node.tokens_used)}</dd>
        </div>
        <div className="rounded-md border border-border bg-surface-raised p-3">
          <dt className="text-text-tertiary">Cost</dt>
          <dd className="mt-1 text-text-primary">{formatCost(node.cost_usd)}</dd>
        </div>
      </dl>

      <div className="mt-5 space-y-3">
        <details open className="rounded-md border border-border bg-surface-raised p-3">
          <summary className="cursor-pointer font-medium text-text-primary">Input</summary>
          <pre className="mt-3 overflow-auto rounded-lg bg-surface p-3 font-mono text-sm text-text-secondary">
            {JSON.stringify(node.input, null, 2)}
          </pre>
        </details>

        <details open className="rounded-md border border-border bg-surface-raised p-3">
          <summary className="cursor-pointer font-medium text-text-primary">Output</summary>
          <pre className="mt-3 overflow-auto rounded-lg bg-surface p-3 font-mono text-sm text-text-secondary">
            {JSON.stringify(node.output, null, 2)}
          </pre>
        </details>
      </div>
    </aside>
  );
}