'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { agents, projects } from '../../../lib/api';
import type { AgentRow, ProjectRow } from '@watchllm/types';

const FRAMEWORKS = ['langchain', 'crewai', 'openai', 'autogen', 'custom'];

const FRAMEWORK_COLORS: Record<string, string> = {
  langchain: 'var(--accent)',
  crewai:    'var(--accent-2)',
  openai:    'var(--info)',
  autogen:   'var(--warning)',
  custom:    'var(--text-secondary)',
};

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

export default function AgentsPage(): JSX.Element {
  const [allAgents, setAllAgents] = useState<(AgentRow & { project_name?: string })[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [selProject, setSelProject] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentUrl, setAgentUrl] = useState('');
  const [agentFramework, setAgentFramework] = useState('');

  const load = async () => {
    const pRes = await projects.list();
    const projectRows = pRes.data ?? [];
    setAllProjects(projectRows);
    const agentResults = await Promise.all(projectRows.map((p) => agents.list(p.id)));
    const flat = agentResults.flatMap((r, i) =>
      (r.data ?? []).map((a) => ({ ...a, project_name: projectRows[i]?.name }))
    );
    setAllAgents(flat);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new') === '1') {
      setAddOpen(true);
    }
  }, []);

  const handleCreate = async () => {
    if (!selProject || !agentName.trim()) { setError('Project and name are required'); return; }
    setSubmitting(true);
    setError('');
    const res = await agents.create({
      project_id: selProject,
      name: agentName.trim(),
      endpoint_url: agentUrl.trim() || undefined,
      framework: agentFramework as 'langchain' | 'crewai' | 'openai' | 'autogen' | 'custom' || undefined,
    });
    setSubmitting(false);
    if (res.error) { setError(res.error.message); return; }
    setAddOpen(false);
    setAgentName(''); setAgentUrl(''); setAgentFramework(''); setSelProject('');
    await load();
  };

  const handleDelete = async (id: string) => {
    await agents.delete(id);
    await load();
  };

  return (
    <div className="fade-in-up">
      {/* Add Agent Modal */}
      {addOpen && (
        <div className="modal-overlay" onClick={() => setAddOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3>Register Agent</h3>
              <button onClick={() => setAddOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <div className="field">
                <label className="label">Project *</label>
                <select className="select" value={selProject} onChange={(e) => setSelProject(e.target.value)} autoFocus>
                  <option value="">Select a project…</option>
                  {allProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                {allProjects.length === 0 && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                    <Link href="/dashboard/projects?new=1" style={{ color: 'var(--accent)' }}>Create a project first →</Link>
                  </p>
                )}
              </div>
              <div className="field">
                <label className="label">Agent name *</label>
                <input className="input" placeholder="e.g. customer-support-v2" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
              </div>
              <div className="field">
                <label className="label">Endpoint URL</label>
                <input className="input" placeholder="https://your-agent.com/api/chat" value={agentUrl} onChange={(e) => setAgentUrl(e.target.value)} />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4 }}>
                  WatchLLM will send adversarial payloads to this URL during simulations.
                </p>
              </div>
              <div className="field">
                <label className="label">Framework</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {FRAMEWORKS.map((fw) => (
                    <button
                      key={fw}
                      type="button"
                      onClick={() => setAgentFramework(agentFramework === fw ? '' : fw)}
                      className="cat-chip"
                      style={{
                        cursor: 'pointer',
                        background: agentFramework === fw ? 'var(--accent-dim)' : 'var(--surface-3)',
                        borderColor: agentFramework === fw ? 'rgba(0,229,160,0.4)' : 'var(--border)',
                        color: agentFramework === fw ? 'var(--accent)' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {fw}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setAddOpen(false)}>Cancel</button>
              <button className="btn btn-primary" disabled={submitting || !agentName.trim() || !selProject} onClick={() => void handleCreate()}>
                {submitting ? 'Registering…' : 'Register Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <h1 className="dash-page-title neue-haas-heading">Agents</h1>
          <p>All agents across your projects.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(''); setAddOpen(true); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Register Agent
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 'var(--r-lg)' }} />)}
        </div>
      ) : allAgents.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
            </svg>
          </div>
          <h3>No agents yet</h3>
          <p>Register your first agent to start running adversarial simulations.</p>
          <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>Register Agent</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {allAgents.map((agent) => (
            <div key={agent.id} className="card card-hover" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--r-md)',
                  background: 'var(--accent-dim)', border: '1px solid rgba(0,229,160,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)', fontSize: '1.1rem', flexShrink: 0,
                }}>🤖</div>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--danger)', borderColor: 'transparent', padding: '0 6px' }}
                  onClick={() => void handleDelete(agent.id)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  </svg>
                </button>
              </div>

              <h3 style={{ fontSize: '1rem', marginBottom: 4 }}>{agent.name}</h3>
              {agent.project_name && (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  in <span style={{ color: 'var(--accent)' }}>{agent.project_name}</span>
                </p>
              )}

              {agent.framework && (
                <span
                  className="badge"
                  style={{
                    background: `${FRAMEWORK_COLORS[agent.framework]}1a`,
                    color: FRAMEWORK_COLORS[agent.framework],
                    marginBottom: 10,
                    display: 'inline-flex',
                  }}
                >
                  {agent.framework}
                </span>
              )}

              {agent.endpoint_url && (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: 10, wordBreak: 'break-all' }}>
                  {agent.endpoint_url}
                </p>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <code style={{ fontSize: '0.69rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{agent.id}</code>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{timeAgo(agent.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
