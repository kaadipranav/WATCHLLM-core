'use client';

import { useEffect, useState } from 'react';
import { agents, projects } from '../../../lib/api';
import type { AgentRow, ProjectRow } from '@watchllm/types';

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(ts * 1000).toLocaleDateString();
}

type ModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

function Modal({ open, title, onClose, children }: ModalProps): JSX.Element | null {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-lg border border-white/10 bg-[#111111] p-4" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="!text-sm font-semibold tracking-tight text-zinc-100">{title}</h2>
          <button type="button" onClick={onClose} className="rounded border border-white/10 p-1 text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function ProjectsPage(): JSX.Element {
  const [projectList, setProjectList] = useState<ProjectRow[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectRow | null>(null);
  const [agentList, setAgentList] = useState<AgentRow[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingAgents, setLoadingAgents] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ProjectRow | null>(null);
  const [addAgentOpen, setAddAgentOpen] = useState(false);

  const [projectName, setProjectName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentUrl, setAgentUrl] = useState('');
  const [agentFramework, setAgentFramework] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadProjects = async (): Promise<void> => {
    setLoadingProjects(true);
    const response = await projects.list();
    const rows = response.data ?? [];
    setProjectList(rows);
    setLoadingProjects(false);

    if (rows.length > 0 && !selectedProject) {
      setSelectedProject(rows[0] ?? null);
    }
  };

  const loadAgents = async (projectId: string): Promise<void> => {
    setLoadingAgents(true);
    const response = await agents.list(projectId);
    setAgentList(response.data ?? []);
    setLoadingAgents(false);
  };

  useEffect(() => {
    void loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      void loadAgents(selectedProject.id);
    }
  }, [selectedProject?.id]);

  const handleCreateProject = async (): Promise<void> => {
    if (!projectName.trim()) {
      setError('Project name is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    const response = await projects.create(projectName.trim());
    if (response.error) {
      setError(response.error.message);
      setSubmitting(false);
      return;
    }

    setCreateOpen(false);
    setProjectName('');
    await loadProjects();

    if (response.data) {
      setSelectedProject(response.data);
      await loadAgents(response.data.id);
    }

    setSubmitting(false);
  };

  const handleDeleteProject = async (): Promise<void> => {
    if (!deleteConfirm) {
      return;
    }

    await projects.delete(deleteConfirm.id);
    setDeleteConfirm(null);

    if (selectedProject?.id === deleteConfirm.id) {
      setSelectedProject(null);
      setAgentList([]);
    }

    await loadProjects();
  };

  const handleCreateAgent = async (): Promise<void> => {
    if (!selectedProject) {
      return;
    }

    if (!agentName.trim()) {
      setError('Agent name is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    const response = await agents.create({
      project_id: selectedProject.id,
      name: agentName.trim(),
      endpoint_url: agentUrl.trim() || undefined,
      framework: (agentFramework as 'langchain' | 'crewai' | 'openai' | 'autogen' | 'custom') || undefined,
    });

    if (response.error) {
      setError(response.error.message);
      setSubmitting(false);
      return;
    }

    setAgentName('');
    setAgentUrl('');
    setAgentFramework('');
    setAddAgentOpen(false);
    await loadAgents(selectedProject.id);
    setSubmitting(false);
  };

  const handleDeleteAgent = async (agentId: string): Promise<void> => {
    await agents.delete(agentId);
    if (selectedProject) {
      await loadAgents(selectedProject.id);
    }
  };

  return (
    <div className="space-y-5">
      <Modal open={createOpen} title="New Project" onClose={() => setCreateOpen(false)}>
        <div className="space-y-3">
          <label className="block text-xs text-zinc-400">Project name</label>
          <input
            className="h-9 w-full rounded-md border border-white/10 bg-black px-3 text-sm text-zinc-100 outline-none transition focus:border-white/20"
            value={projectName}
            onChange={(event) => setProjectName(event.target.value)}
            placeholder="e.g. support-bot"
            autoFocus
          />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="h-8 rounded-md border border-white/10 px-3 text-xs text-zinc-300 transition hover:bg-white/5">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateProject()}
              disabled={submitting}
              className="h-8 rounded-md bg-[#00C896] px-3 text-xs font-semibold text-black transition hover:bg-[#0fd7a4] disabled:opacity-60"
            >
              {submitting ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={addAgentOpen} title="Register Agent" onClose={() => setAddAgentOpen(false)}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-zinc-400">Agent name</label>
            <input
              className="mt-1 h-9 w-full rounded-md border border-white/10 bg-black px-3 text-sm text-zinc-100 outline-none transition focus:border-white/20"
              value={agentName}
              onChange={(event) => setAgentName(event.target.value)}
              placeholder="e.g. customer-agent-v2"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400">Endpoint URL</label>
            <input
              className="mt-1 h-9 w-full rounded-md border border-white/10 bg-black px-3 text-sm text-zinc-100 outline-none transition focus:border-white/20"
              value={agentUrl}
              onChange={(event) => setAgentUrl(event.target.value)}
              placeholder="https://agent.company.com/chat"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400">Framework</label>
            <select
              className="mt-1 h-9 w-full rounded-md border border-white/10 bg-black px-3 text-sm text-zinc-100 outline-none transition focus:border-white/20"
              value={agentFramework}
              onChange={(event) => setAgentFramework(event.target.value)}
            >
              <option value="">Optional</option>
              {['langchain', 'crewai', 'openai', 'autogen', 'custom'].map((framework) => (
                <option key={framework} value={framework}>{framework}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAddAgentOpen(false)} className="h-8 rounded-md border border-white/10 px-3 text-xs text-zinc-300 transition hover:bg-white/5">
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleCreateAgent()}
              disabled={submitting}
              className="h-8 rounded-md bg-[#00C896] px-3 text-xs font-semibold text-black transition hover:bg-[#0fd7a4] disabled:opacity-60"
            >
              {submitting ? 'Saving...' : 'Register Agent'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteConfirm} title="Delete Project" onClose={() => setDeleteConfirm(null)}>
        <p className="text-sm text-zinc-300">
          Delete <span className="font-medium text-zinc-100">{deleteConfirm?.name}</span>? This removes all associated agents and simulation history.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => setDeleteConfirm(null)} className="h-8 rounded-md border border-white/10 px-3 text-xs text-zinc-300 transition hover:bg-white/5">
            Cancel
          </button>
          <button type="button" onClick={() => void handleDeleteProject()} className="h-8 rounded-md border border-rose-500/30 bg-rose-500/15 px-3 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20">
            Delete
          </button>
        </div>
      </Modal>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="!text-2xl font-semibold tracking-tight text-white">Projects</h1>
          <p className="mt-1 text-sm text-zinc-400">Organize agents and isolate attack surfaces per product stream.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setError('');
            setCreateOpen(true);
          }}
          className="inline-flex h-9 items-center rounded-md bg-[#00C896] px-3 text-sm font-semibold text-black transition hover:bg-[#0fd7a4]"
        >
          + New Project
        </button>
      </div>

      <div className={`grid gap-4 ${selectedProject ? 'xl:grid-cols-[360px_1fr]' : 'grid-cols-1'}`}>
        <section className="rounded-lg border border-white/10 bg-[#111111]">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="!text-sm font-medium text-zinc-200">Project list</h2>
          </div>

          {loadingProjects ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded bg-zinc-800/70" />
              ))}
            </div>
          ) : projectList.length === 0 ? (
            <div className="m-4 rounded-lg border border-dashed border-white/15 bg-black/30 px-5 py-8 text-center">
              <p className="text-sm font-medium text-zinc-200">No projects yet</p>
              <p className="mt-1 text-xs text-zinc-400">Create your first project to register agents and run simulations.</p>
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="mt-4 inline-flex h-8 items-center rounded-md bg-[#00C896] px-3 text-xs font-semibold text-black transition hover:bg-[#0fd7a4]"
              >
                + Create Project
              </button>
            </div>
          ) : (
            <div>
              {projectList.map((project) => {
                const active = selectedProject?.id === project.id;
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProject(project)}
                    className={`flex w-full items-start justify-between gap-3 border-b border-white/10 px-4 py-3 text-left transition last:border-b-0 ${
                      active ? 'bg-white/5' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-medium ${active ? 'text-white' : 'text-zinc-200'}`}>{project.name}</p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">{project.id}</p>
                      <p className="mt-1 text-[11px] text-zinc-500">Created {timeAgo(project.created_at)}</p>
                    </div>
                    <button
                      type="button"
                      className="rounded border border-transparent px-1.5 py-1 text-zinc-500 transition hover:border-white/10 hover:bg-black hover:text-rose-300"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDeleteConfirm(project);
                      }}
                      aria-label={`Delete ${project.name}`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {selectedProject && (
          <section className="rounded-lg border border-white/10 bg-[#111111]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <h2 className="!text-sm font-semibold text-zinc-100">{selectedProject.name}</h2>
                <p className="mt-0.5 text-xs text-zinc-500">{selectedProject.id}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setAddAgentOpen(true);
                }}
                className="inline-flex h-8 items-center rounded-md bg-[#00C896] px-3 text-xs font-semibold text-black transition hover:bg-[#0fd7a4]"
              >
                + Register Agent
              </button>
            </div>

            {loadingAgents ? (
              <div className="space-y-2 p-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded bg-zinc-800/70" />
                ))}
              </div>
            ) : agentList.length === 0 ? (
              <div className="m-4 rounded-lg border border-dashed border-white/15 bg-black/30 px-5 py-8 text-center">
                <p className="text-sm font-medium text-zinc-200">No agents yet</p>
                <p className="mt-1 text-xs text-zinc-400">Register the first agent endpoint for this project.</p>
                <button
                  type="button"
                  onClick={() => setAddAgentOpen(true)}
                  className="mt-4 inline-flex h-8 items-center rounded-md bg-[#00C896] px-3 text-xs font-semibold text-black transition hover:bg-[#0fd7a4]"
                >
                  + Register Agent
                </button>
              </div>
            ) : (
              <div>
                {agentList.map((agent) => (
                  <div key={agent.id} className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 last:border-b-0 hover:bg-white/5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                        <p className="truncate text-sm font-medium text-zinc-100">{agent.name}</p>
                        {agent.framework && (
                          <span className="rounded border border-white/10 bg-black px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">{agent.framework}</span>
                        )}
                      </div>
                      {agent.endpoint_url && <p className="mt-1 truncate text-xs text-zinc-500">{agent.endpoint_url}</p>}
                      <p className="mt-1 truncate text-[11px] text-zinc-500">{agent.id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAgent(agent.id)}
                      className="rounded border border-transparent px-1.5 py-1 text-zinc-500 transition hover:border-white/10 hover:bg-black hover:text-rose-300"
                      aria-label={`Delete ${agent.name}`}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
