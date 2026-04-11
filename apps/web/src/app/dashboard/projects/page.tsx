'use client';

import { useEffect, useRef, useState } from 'react';
import { projects, agents } from '../../../lib/api';
import type { ProjectRow, AgentRow } from '@watchllm/types';

function Modal({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <h3 style={{ fontSize: '1.0625rem' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', line: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

export default function ProjectsPage(): JSX.Element {
  const [projectList, setProjectList] = useState<ProjectRow[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
  const [agentList, setAgentList] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [addAgentOpen, setAddAgentOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ProjectRow | null>(null);
  const [newName, setNewName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  // Agent form
  const [agentName, setAgentName] = useState('');
  const [agentUrl, setAgentUrl] = useState('');
  const [agentFramework, setAgentFramework] = useState('');

  const loadProjects = async () => {
    const res = await projects.list();
    setProjectList(res.data ?? []);
    setLoading(false);
  };

  useEffect(() => { void loadProjects(); }, []);

  const loadAgents = async (projectId: string) => {
    setAgentsLoading(true);
    const res = await agents.list(projectId);
    setAgentList(res.data ?? []);
    setAgentsLoading(false);
  };

  const handleSelectProject = (p: ProjectRow) => {
    setSelectedProject(p);
    void loadAgents(p.id);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setSubmitting(true);
    setError('');
    const res = await projects.create(newName.trim());
    if (res.error) { setError(res.error.message); setSubmitting(false); return; }
    setNewName('');
    setCreateOpen(false);
    await loadProjects();
    if (res.data) handleSelectProject(res.data);
    setSubmitting(false);
  };

  const handleDelete = async (p: ProjectRow) => {
    await projects.delete(p.id);
    setDeleteConfirm(null);
    if (selectedProject?.id === p.id) setSelectedProject(null);
    await loadProjects();
  };

  const handleAddAgent = async () => {
    if (!selectedProject || !agentName.trim()) return;
    setSubmitting(true);
    setError('');
    const res = await agents.create({
      project_id: selectedProject.id,
      name: agentName.trim(),
      endpoint_url: agentUrl.trim() || undefined,
      framework: (agentFramework as 'langchain' | 'crewai' | 'openai' | 'autogen' | 'custom') || undefined,
    });
    if (res.error) { setError(res.error.message); setSubmitting(false); return; }
    setAgentName(''); setAgentUrl(''); setAgentFramework('');
    setAddAgentOpen(false);
    await loadAgents(selectedProject.id);
    setSubmitting(false);
  };

  const handleDeleteAgent = async (agentId: string) => {
    await agents.delete(agentId);
    if (selectedProject) await loadAgents(selectedProject.id);
  };

  return (
    <div className="fade-in-up">
      {/* Create Project Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Project">
        <div className="field" style={{ marginBottom: 20 }}>
          <label className="label">Project name</label>
          <input
            ref={nameRef}
            className="input"
            placeholder="e.g. customer-support-bot"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleCreate()}
            autoFocus
          />
        </div>
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => void handleCreate()} disabled={submitting || !newName.trim()}>
            {submitting ? 'Creating…' : 'Create Project'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Project">
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          This will permanently delete <strong>{deleteConfirm?.name}</strong> and all its agents and simulations.
          This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
          <button className="btn btn-danger" onClick={() => deleteConfirm && void handleDelete(deleteConfirm)}>
            Delete Project
          </button>
        </div>
      </Modal>

      {/* Add Agent Modal */}
      <Modal open={addAgentOpen} onClose={() => setAddAgentOpen(false)} title="Register Agent">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div className="field">
            <label className="label">Agent name *</label>
            <input className="input" placeholder="e.g. support-bot-v2" value={agentName} onChange={(e) => setAgentName(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label className="label">Endpoint URL</label>
            <input className="input" placeholder="https://your-agent.com/chat" value={agentUrl} onChange={(e) => setAgentUrl(e.target.value)} />
          </div>
          <div className="field">
            <label className="label">Framework</label>
            <select className="select" value={agentFramework} onChange={(e) => setAgentFramework(e.target.value)}>
              <option value="">— Select framework (optional) —</option>
              {['langchain', 'crewai', 'openai', 'autogen', 'custom'].map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: 16 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={() => setAddAgentOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => void handleAddAgent()} disabled={submitting || !agentName.trim()}>
            {submitting ? 'Registering…' : 'Register Agent'}
          </button>
        </div>
      </Modal>

      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p>Organize your AI agents by project.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedProject ? '280px 1fr' : '1fr', gap: 24 }}>
        {/* Project list */}
        <div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--r-lg)' }} />)}
            </div>
          ) : projectList.length === 0 ? (
            <div className="card empty-state">
              <div className="empty-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>No projects yet</h3>
              <p>Create your first project to start organizing your agents.</p>
              <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>Create Project</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projectList.map((p) => (
                <div
                  key={p.id}
                  className="card card-hover"
                  style={{
                    cursor: 'pointer',
                    borderColor: selectedProject?.id === p.id ? 'rgba(0,229,160,0.35)' : 'var(--border)',
                    background: selectedProject?.id === p.id ? 'rgba(0,229,160,0.04)' : 'var(--surface)',
                    padding: '14px 18px',
                  }}
                  onClick={() => handleSelectProject(p)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '0.9375rem', marginBottom: 4 }}>{p.name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{p.id}</p>
                    </div>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)', borderColor: 'transparent', padding: '0 8px' }}
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(p); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 8 }}>Created {timeAgo(p.created_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Project detail: agents */}
        {selectedProject && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: '1.125rem' }}>{selectedProject.name}</h2>
                <code style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{selectedProject.id}</code>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => { setError(''); setAddAgentOpen(true); }}>
                Register Agent
              </button>
            </div>

            {agentsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--r-lg)' }} />)}
              </div>
            ) : agentList.length === 0 ? (
              <div className="card empty-state">
                <div className="empty-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
                  </svg>
                </div>
                <h3>No agents registered</h3>
                <p>Register your first agent to start running simulations.</p>
                <button className="btn btn-primary btn-sm" onClick={() => setAddAgentOpen(true)}>Register Agent</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {agentList.map((agent) => (
                  <div key={agent.id} className="card" style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{agent.name}</span>
                          {agent.framework && (
                            <span className="badge badge-neutral">{agent.framework}</span>
                          )}
                        </div>
                        {agent.endpoint_url && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                            {agent.endpoint_url}
                          </p>
                        )}
                        <code style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{agent.id}</code>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)', borderColor: 'transparent', padding: '0 8px' }}
                        onClick={() => void handleDeleteAgent(agent.id)}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
