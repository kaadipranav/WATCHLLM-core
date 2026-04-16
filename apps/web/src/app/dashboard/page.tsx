'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { agents, projects, simulations } from '../../lib/api';
import type { AgentRow, ProjectRow, SimulationRow } from '@watchllm/types';

function parseCategories(configJson: string): string[] {
  try {
    const cfg = JSON.parse(configJson) as { categories?: string[] };
    return cfg.categories ?? [];
  } catch {
    return [];
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() / 1000 - ts;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  const normalized = status.toLowerCase();
  const color = normalized === 'completed'
    ? 'bg-emerald-400'
    : normalized === 'running'
      ? 'bg-emerald-300'
      : normalized === 'failed'
        ? 'bg-rose-400'
        : 'bg-zinc-500';

  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-black px-2 py-0.5 text-[11px] capitalize text-zinc-300">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {normalized}
    </span>
  );
}

export default function DashboardPage(): JSX.Element {
  const [projectList, setProjectList] = useState<ProjectRow[]>([]);
  const [agentList, setAgentList] = useState<AgentRow[]>([]);
  const [simList, setSimList] = useState<SimulationRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load(): Promise<void> {
      const [pRes, sRes] = await Promise.all([projects.list(), simulations.list()]);
      const projectRows = pRes.data ?? [];
      setProjectList(projectRows);
      setSimList(sRes.data ?? []);

      if (projectRows.length > 0) {
        const agentResults = await Promise.all(projectRows.slice(0, 6).map((p) => agents.list(p.id)));
        setAgentList(agentResults.flatMap((r) => r.data ?? []));
      }

      setLoading(false);
    }

    void load();
  }, []);

  const completedSims = simList.filter((s) => s.status === 'completed').length;
  const runningSims = simList.filter((s) => s.status === 'running').length;
  const failedSims = simList.filter((s) => s.status === 'failed').length;
  const recentSims = simList.slice(0, 8);

  const metrics = [
    {
      label: 'Projects',
      value: projectList.length,
      detail: 'active projects',
    },
    {
      label: 'Agents',
      value: agentList.length,
      detail: 'registered agents',
    },
    {
      label: 'Simulations',
      value: simList.length,
      detail: `${completedSims} completed`,
    },
    {
      label: 'Running',
      value: runningSims,
      detail: `${failedSims} failed`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="!text-2xl font-semibold tracking-tight text-white">Overview</h1>
          <p className="mt-1 text-sm text-zinc-400">Monitor reliability posture and trigger chaos runs before shipping.</p>
        </div>
        <Link
          href="/dashboard/simulations?new=1"
          className="inline-flex h-9 items-center rounded-md bg-[#00C896] px-3 text-sm font-semibold text-black transition hover:bg-[#0fd7a4]"
        >
          + Run Simulation
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-lg border border-white/10 bg-[#111111] p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{metric.label}</p>
            {loading ? (
              <div className="mt-3 h-8 w-14 animate-pulse rounded bg-zinc-800" />
            ) : (
              <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">{metric.value}</p>
            )}
            <p className="mt-1 text-xs text-zinc-400">{metric.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <section className="rounded-lg border border-white/10 bg-[#111111]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <h2 className="!text-sm font-medium text-zinc-200">Recent simulations</h2>
            <Link href="/dashboard/simulations" className="text-xs text-zinc-400 transition hover:text-zinc-200">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded border border-white/10 bg-black/40" />
              ))}
            </div>
          ) : recentSims.length === 0 ? (
            <div className="m-4 rounded-lg border border-dashed border-white/15 bg-black/30 px-5 py-8 text-center">
              <p className="text-sm font-medium text-zinc-200">No simulations yet</p>
              <p className="mt-1 text-xs text-zinc-400">Run your first chaos test to populate observability data.</p>
              <Link
                href="/dashboard/simulations?new=1"
                className="mt-4 inline-flex h-8 items-center rounded-md bg-[#00C896] px-3 text-xs font-semibold text-black transition hover:bg-[#0fd7a4]"
              >
                + Run Simulation
              </Link>
            </div>
          ) : (
            <div>
              {recentSims.map((sim) => {
                const categories = parseCategories(sim.config_json);
                return (
                  <Link
                    key={sim.id}
                    href={`/dashboard/simulations/${sim.id}`}
                    className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-sm transition hover:bg-white/5 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="truncate text-xs text-zinc-500">{sim.id}</code>
                        <StatusBadge status={sim.status} />
                      </div>
                      <p className="mt-1 truncate text-xs text-zinc-400">
                        {categories.length > 0 ? categories.join(' • ') : 'No categories'}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-zinc-500">{timeAgo(sim.created_at)}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <section className="rounded-lg border border-white/10 bg-[#111111]">
            <div className="border-b border-white/10 px-4 py-3">
              <h2 className="!text-sm font-medium text-zinc-200">Quick actions</h2>
            </div>
            <div className="p-2">
              {[
                { label: 'New Project', href: '/dashboard/projects?new=1' },
                { label: 'Register Agent', href: '/dashboard/agents?new=1' },
                { label: 'Run Simulation', href: '/dashboard/simulations?new=1' },
                { label: 'Create API Key', href: '/dashboard/keys?new=1' },
              ].map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between rounded-md px-2.5 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
                >
                  {action.label}
                  <span className="text-zinc-600">→</span>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-[#111111]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h2 className="!text-sm font-medium text-zinc-200">Projects</h2>
              <Link href="/dashboard/projects" className="text-xs text-zinc-400 transition hover:text-zinc-200">
                All
              </Link>
            </div>

            {loading ? (
              <div className="space-y-2 p-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-8 animate-pulse rounded bg-zinc-800/70" />
                ))}
              </div>
            ) : projectList.length === 0 ? (
              <div className="p-4">
                <p className="text-xs text-zinc-400">No projects yet.</p>
              </div>
            ) : (
              <div>
                {projectList.slice(0, 6).map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-sm text-zinc-300 transition hover:bg-white/5 last:border-b-0"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
                    <span className="truncate">{project.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
