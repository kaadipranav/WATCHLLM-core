'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { agents, projects, simulations } from '../../../lib/api';
import type { AgentRow, ProjectRow, SimulationRow, AttackCategory } from '@watchllm/types';
import { ALL_ATTACK_CATEGORIES, TIER_LIMITS } from '@watchllm/types';

const CATEGORY_ICONS: Record<string, string> = {
  prompt_injection: '💉', tool_abuse: '🔧', hallucination: '👻',
  context_poisoning: '☣️', infinite_loop: '🔁', jailbreak: '⛓️',
  data_exfiltration: '📤', role_confusion: '🎭',
};

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    queued:    { cls: 'badge-neutral', label: 'Queued' },
    running:   { cls: 'badge-info',    label: 'Running' },
    completed: { cls: 'badge-success', label: 'Completed' },
    failed:    { cls: 'badge-danger',  label: 'Failed' },
  };
  const { cls, label } = map[status] ?? { cls: 'badge-neutral', label: status };
  return <span className={`badge ${cls}`}>{label}</span>;
}

function parseCategories(configJson: string): string[] {
  try { return (JSON.parse(configJson) as { categories?: string[] }).categories ?? []; }
  catch { return []; }
}

export default function SimulationsPage(): JSX.Element {
  const [simList, setSimList] = useState<SimulationRow[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectRow[]>([]);
  const [allAgents, setAllAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // New simulation form
  const [selProject, setSelProject] = useState('');
  const [selAgent, setSelAgent] = useState('');
  const [selCategories, setSelCategories] = useState<Set<AttackCategory>>(new Set(['prompt_injection', 'tool_abuse', 'hallucination']));
  const [threshold, setThreshold] = useState('');

  const projectAgents = allAgents.filter((a) => a.project_id === selProject);

  const load = async () => {
    const [sRes, pRes] = await Promise.all([simulations.list(), projects.list()]);
    const projectRows = pRes.data ?? [];
    setSimList(sRes.data ?? []);
    setAllProjects(projectRows);
    // Load all agents
    const agentResults = await Promise.all(projectRows.map((p) => agents.list(p.id)));
    setAllAgents(agentResults.flatMap((r) => r.data ?? []));
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  // Handle URL param ?new=1
  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === '1') {
      setNewOpen(true);
    }
  }, []);

  const toggleCategory = (cat: AttackCategory) => {
    setSelCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) { if (next.size > 1) next.delete(cat); }
      else next.add(cat);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!selAgent) { setError('Please select an agent'); return; }
    setSubmitting(true);
    setError('');
    const res = await simulations.create({
      agent_id: selAgent,
      categories: Array.from(selCategories),
      threshold: threshold.trim() || undefined,
    });
    if (res.error) {
      const msg = res.error.message;
      setError(msg.includes('upgrade') || msg.includes('tier') ? `${msg} — Upgrade at /dashboard/settings/billing` : msg);
      setSubmitting(false);
      return;
    }
    setNewOpen(false);
    setSubmitting(false);
    await load();
  };

  return (
    <div className="fade-in-up">
      {/* New Simulation Modal */}
      {newOpen && (
        <div className="modal-overlay" onClick={() => setNewOpen(false)}>
          <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ fontSize: '1.0625rem' }}>New Simulation</h3>
              <button onClick={() => setNewOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="field">
                <label className="label">Project</label>
                <select className="select" value={selProject} onChange={(e) => { setSelProject(e.target.value); setSelAgent(''); }}>
                  <option value="">Select a project…</option>
                  {allProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="field">
                <label className="label">Agent</label>
                <select className="select" value={selAgent} onChange={(e) => setSelAgent(e.target.value)} disabled={!selProject}>
                  <option value="">{selProject ? 'Select an agent…' : 'Select a project first'}</option>
                  {projectAgents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              <div className="field">
                <label className="label">Attack categories</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {ALL_ATTACK_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`cat-chip`}
                      style={{
                        cursor: 'pointer',
                        background: selCategories.has(cat) ? 'var(--accent-dim)' : 'var(--surface-3)',
                        borderColor: selCategories.has(cat) ? 'rgba(0,229,160,0.4)' : 'var(--border)',
                        color: selCategories.has(cat) ? 'var(--accent)' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {CATEGORY_ICONS[cat] ?? ''} {cat}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
                  Free tier: only prompt_injection, tool_abuse, hallucination
                </p>
              </div>

              <div className="field">
                <label className="label">Severity threshold (optional)</label>
                <input
                  className="input"
                  placeholder='e.g. "severity < 0.3"'
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div style={{ background: 'var(--danger-dim)', border: '1px solid rgba(255,77,109,0.2)', borderRadius: 'var(--r-md)', padding: '10px 14px', marginTop: 16 }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--danger)' }}>{error}</p>
                {error.includes('Upgrade') && (
                  <Link href="/dashboard/settings/billing" style={{ fontSize: '0.8125rem', color: 'var(--accent)', marginTop: 6, display: 'block' }}>
                    View upgrade options →
                  </Link>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setNewOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => void handleCreate()} disabled={submitting || !selAgent}>
                {submitting ? 'Launching…' : 'Launch Simulation'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1>Simulations</h1>
          <p>Run adversarial attacks against your agents and inspect results.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(''); setNewOpen(true); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Simulation
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--r-lg)' }} />)}
        </div>
      ) : simList.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <h3>No simulations yet</h3>
          <p>Launch your first adversarial simulation to test your agents.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setNewOpen(true)}>Launch Simulation</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {simList.map((sim) => {
            const cats = parseCategories(sim.config_json);
            const agentName = allAgents.find((a) => a.id === sim.agent_id)?.name ?? sim.agent_id.slice(0, 12) + '…';
            return (
              <Link
                key={sim.id}
                href={`/dashboard/simulations/${sim.id}`}
                className="card card-hover"
                style={{ display: 'block', padding: '16px 20px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 'var(--r-md)',
                      background: sim.status === 'failed' ? 'var(--danger-dim)' : 'var(--accent-dim)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {sim.status === 'running' ? (
                        <div className="spin" style={{ width: 14, height: 14, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sim.status === 'failed' ? 'var(--danger)' : 'var(--accent)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{agentName}</span>
                        <StatusBadge status={sim.status} />
                        {sim.parent_sim_id && <span className="badge badge-purple">Fork</span>}
                      </div>
                      <code style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                        {sim.id}
                      </code>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>{timeAgo(sim.created_at)}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 48 }}>
                  {cats.map((cat) => (
                    <span key={cat} className="cat-chip">{CATEGORY_ICONS[cat] ?? ''} {cat}</span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
