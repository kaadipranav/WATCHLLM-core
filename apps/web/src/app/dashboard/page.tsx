'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { projects, agents, simulations } from '../../lib/api';
import type { ProjectRow, AgentRow, SimulationRow } from '@watchllm/types';
import { useAuth } from '../../lib/auth-context';

const CATEGORY_COLORS: Record<string, string> = {
  prompt_injection:  'var(--danger)',
  jailbreak:         'var(--danger)',
  data_exfiltration: 'var(--danger)',
  tool_abuse:        'var(--warning)',
  hallucination:     'var(--warning)',
  context_poisoning: 'var(--warning)',
  infinite_loop:     'var(--info)',
  role_confusion:    'var(--info)',
};

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    queued:    { cls: 'badge-neutral', label: 'Queued' },
    running:   { cls: 'badge-info',    label: 'Running' },
    completed: { cls: 'badge-success', label: 'Completed' },
    failed:    { cls: 'badge-danger',  label: 'Failed' },
  };
  const { cls, label } = map[status] ?? { cls: 'badge-neutral', label: status };
  return (
    <span className={`badge ${cls}`}>
      {status === 'running' && <span className="dot dot-success dot-pulse" style={{ width: 5, height: 5 }} />}
      {label}
    </span>
  );
}

function parseCategories(configJson: string): string[] {
  try {
    const cfg = JSON.parse(configJson) as { categories?: string[] };
    return cfg.categories ?? [];
  } catch { return []; }
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function DashboardPage(): JSX.Element {
  const { user } = useAuth();
  const [projectList, setProjectList] = useState<ProjectRow[]>([]);
  const [agentList, setAgentList] = useState<AgentRow[]>([]);
  const [simList, setSimList] = useState<SimulationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [pRes, sRes] = await Promise.all([
        projects.list(),
        simulations.list(),
      ]);
      const projectRows = pRes.data ?? [];
      setProjectList(projectRows);
      setSimList(sRes.data ?? []);

      // Load agents across all projects (first 3 projects)
      if (projectRows.length > 0) {
        const agentResults = await Promise.all(
          projectRows.slice(0, 3).map((p) => agents.list(p.id))
        );
        setAgentList(agentResults.flatMap((r) => r.data ?? []));
      }

      setLoading(false);
    }
    void load();
  }, []);

  const completedSims = simList.filter((s) => s.status === 'completed');
  const runningSims  = simList.filter((s) => s.status === 'running');
  const failedSims   = simList.filter((s) => s.status === 'failed');
  const recentSims   = simList.slice(0, 6);

  const statCards = [
    {
      label: 'Projects',
      value: loading ? '–' : projectList.length,
      sub: 'active projects',
      accent: '#00d4d4',
      subDanger: false,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      label: 'Agents',
      value: loading ? '–' : agentList.length,
      sub: 'registered agents',
      accent: '#00b8ff',
      subDanger: false,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        </svg>
      ),
    },
    {
      label: 'Simulations',
      value: loading ? '–' : simList.length,
      sub: `${completedSims.length} completed`,
      accent: '#6aa3ff',
      subDanger: false,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 12 8 12 10 8 14 16 16 12 20 12" />
        </svg>
      ),
    },
    {
      label: 'Running',
      value: loading ? '–' : runningSims.length,
      sub: failedSims.length > 0 ? `${failedSims.length} failed` : '0 failed',
      accent: '#ffb347',
      subDanger: failedSims.length > 0,
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 15" />
        </svg>
      ),
    },
  ];

  return (
    <div className="fade-in-up dashboard-home">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="ops-command-title dash-page-title dash-command-title neue-haas-heading">
            Reliability Command{user?.name ? ` // ${user.name.split(' ')[0].toUpperCase()}` : ''}
          </h1>
          <p>Monitor attack posture, isolate weak paths, and trigger chaos runs before prod gets hit.</p>
        </div>
        <Link href="/dashboard/simulations?new=1" className="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Run Simulation
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid-4" style={{ marginBottom: 32 }}>
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="stat-card card-hover ops-stat-card"
            style={{ borderLeftColor: stat.accent }}
          >
            <div className="ops-stat-head">
              <p className="stat-label">{stat.label}</p>
              <div
                className="ops-stat-icon"
                style={{
                  color: stat.accent,
                  background: `${stat.accent}1c`,
                  boxShadow: `0 0 0 1px ${stat.accent}3d, 0 0 24px ${stat.accent}36`,
                }}
              >
                {stat.icon}
              </div>
            </div>
            {loading ? (
              <div className="skeleton" style={{ height: 40, width: 60, marginTop: 8 }} />
            ) : (
              <p className="stat-value">{stat.value}</p>
            )}
            <p className={`stat-sub${stat.subDanger ? ' stat-sub-danger' : ''}`}>{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Recent simulations */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: '0.9375rem' }}>Recent Simulations</h3>
            <Link href="/dashboard/simulations" style={{ fontSize: '0.8125rem', color: 'var(--accent)' }}>View all →</Link>
          </div>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--r-lg)' }} />
              ))}
            </div>
          ) : recentSims.length === 0 ? (
            <div className="card empty-state ops-empty-state" style={{ padding: '28px 32px' }}>
              <div className="empty-icon ops-empty-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="5" cy="12" r="1.5" />
                  <circle cx="12" cy="6" r="1.5" />
                  <circle cx="19" cy="12" r="1.5" />
                  <circle cx="12" cy="18" r="1.5" />
                  <path d="M6.4 11l4.2-3.2M13.4 7.8l4.2 3.2M17.6 13l-4.2 3.2M10.6 16.2L6.4 13" />
                </svg>
              </div>
              <h3>No simulations yet</h3>
              <p>No runs yet. Register an agent and fire your first chaos test.</p>
              <Link href="/dashboard/simulations?new=1" className="btn btn-primary">Run Simulation</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentSims.map((sim) => {
                const cats = parseCategories(sim.config_json);
                return (
                  <Link
                    key={sim.id}
                    href={`/dashboard/simulations/${sim.id}`}
                    className="card card-hover"
                    style={{ display: 'block', padding: '16px 20px', textDecoration: 'none' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {sim.id.slice(0, 18)}…
                        </code>
                        <StatusBadge status={sim.status} />
                        {sim.parent_sim_id && (
                          <span className="badge badge-purple">Fork</span>
                        )}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{timeAgo(sim.created_at)}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {cats.map((cat) => (
                        <span key={cat} className="cat-chip" style={{ borderColor: CATEGORY_COLORS[cat] ? `${CATEGORY_COLORS[cat]}33` : undefined }}>
                          {cat}
                        </span>
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Right sidebar: quick actions + projects */}
        <div className="dashboard-side-column" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick actions */}
          <div className="card quick-panel">
            <div className="quick-panel-head">
              <h3 style={{ fontSize: '0.875rem' }}>Quick Actions</h3>
            </div>
            <div className="quick-panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { label: 'New Project', href: '/dashboard/projects?new=1', icon: '📁' },
                { label: 'Register Agent', href: '/dashboard/agents?new=1', icon: '🤖' },
                { label: 'Run Simulation', href: '/dashboard/simulations?new=1', icon: '▶' },
                { label: 'Create API Key', href: '/dashboard/keys?new=1', icon: '🔑' },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 10px', borderRadius: 'var(--r-md)',
                    fontSize: '0.85rem', color: 'var(--text-secondary)',
                    transition: 'background 0.15s ease, color 0.15s ease',
                  }}
                  className="quick-action"
                >
                  <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>{action.icon}</span>
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Projects list */}
          <div className="card quick-panel">
            <div className="quick-panel-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '0.875rem' }}>Projects</h3>
              <Link href="/dashboard/projects" style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>All →</Link>
            </div>
            <div className="quick-panel-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 36 }} />)}
              </div>
            ) : projectList.length === 0 ? (
              <div className="quick-panel-empty" style={{ textAlign: 'left', padding: '8px 2px' }}>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 12 }}>No projects yet</p>
                <Link href="/dashboard/projects?new=1" className="btn btn-secondary btn-sm">Create Project</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {projectList.slice(0, 5).map((p) => (
                  <Link
                    key={p.id}
                    href={`/dashboard/projects/${p.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: 'var(--r-md)',
                      fontSize: '0.85rem', color: 'var(--text-secondary)',
                    }}
                    className="quick-action"
                  >
                    <span className="quick-project-name">
                      <span className="project-status-dot" aria-hidden="true" />
                      <span>{p.name}</span>
                    </span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </Link>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
