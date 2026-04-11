'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { projects, agents, simulations, type SimulationDetail } from '../../lib/api';
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

function SeverityBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.7 ? 'var(--danger)' : value >= 0.4 ? 'var(--warning)' : 'var(--accent)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="severity-bar" style={{ flex: 1 }}>
        <div className="severity-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color, minWidth: 30 }}>{pct}%</span>
    </div>
  );
}

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

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1>Good to see you{user?.name ? `, ${user.name.split(' ')[0]}` : ''}.</h1>
          <p>Here's what's happening with your agents.</p>
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
        {[
          {
            label: 'Projects',
            value: loading ? '–' : projectList.length,
            sub: 'active projects',
            color: 'var(--accent)',
          },
          {
            label: 'Agents',
            value: loading ? '–' : agentList.length,
            sub: 'registered agents',
            color: 'var(--accent)',
          },
          {
            label: 'Simulations',
            value: loading ? '–' : simList.length,
            sub: `${completedSims.length} completed`,
            color: 'var(--accent-2)',
          },
          {
            label: 'Running',
            value: loading ? '–' : runningSims.length,
            sub: `${failedSims.length} failed`,
            color: runningSims.length > 0 ? 'var(--warning)' : 'var(--text-tertiary)',
          },
        ].map((stat) => (
          <div key={stat.label} className="stat-card">
            <p className="stat-label">{stat.label}</p>
            {loading ? (
              <div className="skeleton" style={{ height: 40, width: 60, marginTop: 8 }} />
            ) : (
              <p className="stat-value" style={{ color: stat.color }}>{stat.value}</p>
            )}
            <p className="stat-sub">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
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
            <div className="card empty-state" style={{ padding: '40px' }}>
              <div className="empty-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <h3>No simulations yet</h3>
              <p>Create a project, register an agent, and run your first adversarial simulation.</p>
              <Link href="/dashboard/simulations?new=1" className="btn btn-primary btn-sm">Run first simulation</Link>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Quick actions */}
          <div className="card">
            <h3 style={{ fontSize: '0.875rem', marginBottom: 14 }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ fontSize: '0.875rem' }}>Projects</h3>
              <Link href="/dashboard/projects" style={{ fontSize: '0.78rem', color: 'var(--accent)' }}>All →</Link>
            </div>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1, 2].map((i) => <div key={i} className="skeleton" style={{ height: 36 }} />)}
              </div>
            ) : projectList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
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
                    <span>{p.name}</span>
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

      <style>{`
        .quick-action:hover {
          background: var(--surface-2);
          color: var(--text-primary);
        }
        @media (max-width: 900px) {
          .grid-4 { grid-template-columns: repeat(2, 1fr); }
          .dash-content > div:last-child { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
