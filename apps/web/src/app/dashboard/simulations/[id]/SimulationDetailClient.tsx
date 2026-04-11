'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { simulations, agents } from '../../../../lib/api';
import type { SimulationRow, SimRunRow, TraceGraph } from '@watchllm/types';

const CATEGORY_ICONS: Record<string, string> = {
  prompt_injection: '💉', tool_abuse: '🔧', hallucination: '👻',
  context_poisoning: '☣️', infinite_loop: '🔁', jailbreak: '⛓️',
  data_exfiltration: '📤', role_confusion: '🎭',
};

function SeverityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? 'var(--danger)' : value >= 0.4 ? 'var(--warning)' : 'var(--accent)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="severity-bar" style={{ flex: 1, height: 6 }}>
        <div className="severity-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: '0.8125rem', fontFamily: 'var(--font-mono)', color, minWidth: 36 }}>{pct}%</span>
      {value >= 0.7 && (
        <span className="badge badge-danger">Compromised</span>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string }> = {
    queued: { cls: 'badge-neutral' }, running: { cls: 'badge-info' },
    completed: { cls: 'badge-success' }, failed: { cls: 'badge-danger' },
    pending: { cls: 'badge-neutral' },
  };
  return <span className={`badge ${map[status]?.cls ?? 'badge-neutral'}`}>{status}</span>;
}

function RunCard({ run, onReplayClick }: { run: SimRunRow; onReplayClick: (run: SimRunRow) => void }) {
  return (
    <div className="card" style={{ padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.2rem' }}>{CATEGORY_ICONS[run.category] ?? '🔬'}</span>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{run.category}</p>
            <code style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{run.id}</code>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <StatusBadge status={run.status} />
          {run.trace_r2_key && (
            <button className="btn btn-ghost btn-sm" onClick={() => onReplayClick(run)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.96" />
              </svg>
              Replay
            </button>
          )}
        </div>
      </div>
      {run.severity != null && (
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>Severity Score</p>
          <SeverityBar value={run.severity} />
        </div>
      )}
    </div>
  );
}

function TraceGraphViewer({ graph, onClose }: { graph: TraceGraph; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: '1.0625rem', marginBottom: 4 }}>Trace Graph — {graph.category}</h3>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={graph.compromised ? { color: 'var(--danger)', fontSize: '0.8125rem' } : { color: 'var(--accent)', fontSize: '0.8125rem' }}>
                {graph.compromised ? '⚠ Compromised' : '✓ Secure'}
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Severity: <strong style={{ color: graph.severity >= 0.7 ? 'var(--danger)' : graph.severity >= 0.4 ? 'var(--warning)' : 'var(--accent)' }}>
                  {Math.round(graph.severity * 100)}%
                </strong>
              </span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Nodes: {graph.nodes.length}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {(graph.judge_verdict || graph.suggested_fix) && (
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '12px 16px', marginBottom: 16, flexShrink: 0 }}>
            {graph.judge_verdict && (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: graph.suggested_fix ? 8 : 0 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Verdict:</strong> {graph.judge_verdict}
              </p>
            )}
            {graph.suggested_fix && (
              <p style={{ fontSize: '0.875rem', color: 'var(--accent)' }}>
                <strong>Suggested fix:</strong> {graph.suggested_fix}
              </p>
            )}
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {graph.nodes.map((node, i) => (
            <div key={node.id} style={{
              background: 'var(--surface-2)', border: '1px solid var(--border)',
              borderRadius: 'var(--r-md)', padding: '12px 16px',
              borderLeft: `3px solid ${node.type === 'llm_call' ? 'var(--accent)' : node.type === 'tool_call' ? 'var(--accent-2)' : 'var(--border-strong)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)' }}>{node.type}</span>
                <code style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>#{i + 1} {node.id.slice(0, 20)}</code>
                {node.latency_ms != null && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginLeft: 'auto' }}>{node.latency_ms}ms</span>
                )}
                {node.tokens_used != null && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{node.tokens_used} tokens</span>
                )}
              </div>
              {node.input != null && (
                <div style={{ marginBottom: 6 }}>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 3 }}>INPUT</p>
                  <pre style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, lineHeight: 1.6 }}>
                    {typeof node.input === 'string' ? node.input : JSON.stringify(node.input, null, 2)}
                  </pre>
                </div>
              )}
              {node.output != null && (
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginBottom: 3 }}>OUTPUT</p>
                  <pre style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0, lineHeight: 1.6, maxHeight: 120, overflowY: 'auto' }}>
                    {typeof node.output === 'string' ? node.output : JSON.stringify(node.output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SimulationDetailClient(): JSX.Element {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : '';

  const [sim, setSim] = useState<SimulationRow | null>(null);
  const [runs, setRuns] = useState<SimRunRow[]>([]);
  const [agentName, setAgentName] = useState('');
  const [loading, setLoading] = useState(true);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceGraph, setTraceGraph] = useState<TraceGraph | null>(null);
  const [upgradeRequired, setUpgradeRequired] = useState(false);

  useEffect(() => {
    // Don't fire for the dummy placeholder shell page
    if (!id || id === '_') { setLoading(false); return; }
    async function load() {
      const res = await simulations.get(id);
      if (res.data) {
        setSim(res.data.simulation);
        setRuns(res.data.runs);
        const agentRes = await agents.get(res.data.simulation.agent_id);
        if (agentRes.data) setAgentName(agentRes.data.name);
      }
      setLoading(false);
    }
    void load();
    const interval = setInterval(() => { void load(); }, 5000);
    return () => clearInterval(interval);
  }, [id]);

  const handleReplay = async (run: SimRunRow) => {
    setTraceLoading(true);
    const res = await simulations.replay(id);
    setTraceLoading(false);
    if (res.error) {
      if ((res.error as { upgrade_required?: boolean }).upgrade_required) setUpgradeRequired(true);
      return;
    }
    const graph = (res.data ?? []).find((g) => g.run_id === run.id) ?? res.data?.[0];
    if (graph) setTraceGraph(graph);
  };

  const parseCategories = (configJson: string): string[] => {
    try { return (JSON.parse(configJson) as { categories?: string[] }).categories ?? []; }
    catch { return []; }
  };

  if (loading) {
    return (
      <div className="fade-in-up">
        <div style={{ marginBottom: 24 }}>
          <div className="skeleton" style={{ height: 32, width: 200, marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 20, width: 140 }} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--r-lg)' }} />)}
        </div>
      </div>
    );
  }

  if (!sim) {
    return (
      <div className="fade-in-up card empty-state">
        <h3>Simulation not found</h3>
        <Link href="/dashboard/simulations" className="btn btn-ghost btn-sm">← Back to simulations</Link>
      </div>
    );
  }

  const cats = parseCategories(sim.config_json);
  const completedRuns = runs.filter((r) => r.status === 'completed');
  const avgSeverity = completedRuns.length > 0
    ? completedRuns.reduce((acc, r) => acc + (r.severity ?? 0), 0) / completedRuns.length
    : null;

  return (
    <div className="fade-in-up">
      {traceGraph && (
        <TraceGraphViewer graph={traceGraph} onClose={() => setTraceGraph(null)} />
      )}

      {upgradeRequired && (
        <div className="modal-overlay" onClick={() => setUpgradeRequired(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="tier-gate" style={{ flexDirection: 'column', alignItems: 'flex-start', marginBottom: 20 }}>
              <p style={{ fontSize: '1.5rem', marginBottom: 8 }}>🔒</p>
              <h3>Pro feature</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                Trace graph replay is available on Pro and Team plans.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setUpgradeRequired(false)}>Later</button>
              <Link href="/dashboard/settings/billing" className="btn btn-primary">Upgrade Now</Link>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <Link href="/dashboard/simulations" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Simulations
        </Link>
      </div>

      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <h1 style={{ fontSize: '1.5rem' }}>{agentName || 'Agent'}</h1>
            <span className={`badge ${sim.status === 'completed' ? 'badge-success' : sim.status === 'failed' ? 'badge-danger' : sim.status === 'running' ? 'badge-info' : 'badge-neutral'}`} style={{ fontSize: '0.8rem' }}>
              {sim.status}
            </span>
            {sim.parent_sim_id && <span className="badge badge-purple">Fork</span>}
          </div>
          <code style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{sim.id}</code>
        </div>
        {sim.status === 'completed' && (
          <button
            className="btn btn-secondary"
            onClick={async () => {
              setTraceLoading(true);
              const res = await simulations.replay(sim.id);
              setTraceLoading(false);
              if (res.error) {
                if ((res.error as { upgrade_required?: boolean }).upgrade_required) setUpgradeRequired(true);
                return;
              }
              if (res.data?.[0]) setTraceGraph(res.data[0]);
            }}
            disabled={traceLoading}
          >
            {traceLoading ? (
              <div className="spin" style={{ width: 14, height: 14, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3.96" />
              </svg>
            )}
            Replay All Traces
          </button>
        )}
      </div>

      <div className="grid-4" style={{ marginBottom: 28 }}>
        <div className="stat-card">
          <p className="stat-label">Attack categories</p>
          <p className="stat-value" style={{ fontSize: '1.5rem' }}>{cats.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Runs completed</p>
          <p className="stat-value" style={{ fontSize: '1.5rem' }}>{completedRuns.length} / {runs.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Avg severity</p>
          <p className="stat-value" style={{ fontSize: '1.5rem', color: avgSeverity !== null ? (avgSeverity >= 0.7 ? 'var(--danger)' : 'var(--accent)') : 'var(--text-tertiary)' }}>
            {avgSeverity !== null ? `${Math.round(avgSeverity * 100)}%` : '—'}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Compromised runs</p>
          <p className="stat-value" style={{ fontSize: '1.5rem', color: 'var(--danger)' }}>
            {runs.filter((r) => (r.severity ?? 0) >= 0.7).length}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28 }}>
        {cats.map((cat) => <span key={cat} className="cat-chip">{CATEGORY_ICONS[cat] ?? ''} {cat}</span>)}
      </div>

      <h3 style={{ fontSize: '0.9375rem', marginBottom: 14 }}>Attack Runs</h3>
      {runs.length === 0 ? (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {sim.status === 'queued' ? 'Simulation is queued, waiting for orchestrator…' : 'No runs found.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {runs.map((run) => (
            <RunCard key={run.id} run={run} onReplayClick={handleReplay} />
          ))}
        </div>
      )}

      {sim.status === 'completed' && (
        <div className="tier-gate" style={{ marginTop: 28 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Fork &amp; Replay</p>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Choose a node from a trace graph and re-run from that point with a different input. Pro &amp; Team only.
            </p>
          </div>
          <Link href="/dashboard/settings/billing" className="btn btn-primary btn-sm">Upgrade</Link>
        </div>
      )}
    </div>
  );
}
