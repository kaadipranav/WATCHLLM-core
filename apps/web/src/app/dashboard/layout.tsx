'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth-context';

type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
  icon: React.ReactNode;
};

type NavGroup = {
  section: string;
  items: NavItem[];
};

const NAV: NavGroup[] = [
  {
    section: 'Overview',
    items: [
      {
        href: '/dashboard',
        label: 'Dashboard',
        exact: true,
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Workspace',
    items: [
      {
        href: '/dashboard/projects',
        label: 'Projects',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        ),
      },
      {
        href: '/dashboard/agents',
        label: 'Agents',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="8" r="4" /><path d="M6 20v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
          </svg>
        ),
      },
      {
        href: '/dashboard/simulations',
        label: 'Simulations',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Developer',
    items: [
      {
        href: '/dashboard/keys',
        label: 'API Keys',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
          </svg>
        ),
      },
    ],
  },
  {
    section: 'Settings',
    items: [
      {
        href: '/dashboard/settings/billing',
        label: 'Billing',
        icon: (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
          </svg>
        ),
      },
    ],
  },
];

const CMD_ACTIONS = [
  { label: 'Dashboard', href: '/dashboard', icon: '⬛' },
  { label: 'Projects', href: '/dashboard/projects', icon: '📁' },
  { label: 'Agents', href: '/dashboard/agents', icon: '🤖' },
  { label: 'Simulations', href: '/dashboard/simulations', icon: '▶' },
  { label: 'API Keys', href: '/dashboard/keys', icon: '🔑' },
  { label: 'Billing', href: '/dashboard/settings/billing', icon: '💳' },
  { label: 'New Project', href: '/dashboard/projects?new=1', icon: '+' },
  { label: 'Run Simulation', href: '/dashboard/simulations?new=1', icon: '⚡' },
];

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = CMD_ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setSel(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const go = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [router, onClose]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && filtered[sel]) go(filtered[sel].href);
    if (e.key === 'Escape') onClose();
  }, [filtered, sel, go, onClose]);

  if (!open) return null;

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Search commands…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSel(0); }}
            onKeyDown={handleKey}
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="cmd-results">
          {filtered.length === 0 ? (
            <p style={{ padding: '16px', color: 'var(--text-tertiary)', fontSize: '0.875rem', textAlign: 'center' }}>No results</p>
          ) : (
            filtered.map((item, i) => (
              <div
                key={item.href}
                className={`cmd-item${i === sel ? ' selected' : ''}`}
                onClick={() => go(item.href)}
                onMouseEnter={() => setSel(i)}
              >
                <span style={{ width: 24, textAlign: 'center', fontSize: '0.875rem', opacity: 0.6 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))
          )}
        </div>
        <div className="cmd-footer">
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">Enter</span> select</span>
          <span><span className="kbd">Esc</span> close</span>
        </div>
      </div>
    </div>
  );
}

function UserAvatar({ user }: { user: { email: string; name?: string; image?: string } }) {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const initial = (user.name ?? user.email)[0]?.toUpperCase() ?? '?';

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 30, height: 30, borderRadius: '50%',
          background: user.image ? 'none' : 'var(--accent-dim)',
          border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', overflow: 'hidden',
          color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700,
        }}
      >
        {user.image ? <img src={user.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
      </button>
      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)', padding: 'var(--sp-2)',
            minWidth: 200, zIndex: 50,
            boxShadow: 'var(--shadow-lg)',
          }}>
            <div style={{ padding: '8px 12px 10px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
              <p style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{user.name ?? 'User'}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{user.email}</p>
            </div>
            <button
              onClick={() => void signOut()}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                width: '100%', padding: '8px 12px',
                border: 'none', background: 'none',
                color: 'var(--danger)', fontSize: '0.875rem',
                cursor: 'pointer', borderRadius: 'var(--r-sm)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [cmdOpen, setCmdOpen] = useState(false);
  const crumbs = pathname.split('/').filter(Boolean).slice(1);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // ⌘K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
        <div className="spin" style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="dash-shell polar-dash-shell">
      <div className="dash-shell-matrix" aria-hidden="true" />
      <div className="dash-shell-glow" aria-hidden="true" />

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Sidebar */}
      <aside className="dash-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark" aria-hidden="true" />
          <div className="sidebar-logo-copy">
            <span>WATCHLLM</span>
            <small>Agent Reliability Lab</small>
          </div>
        </div>

        <div className="sidebar-nav-actions">
          <Link href="/dashboard/simulations?new=1" className="sidebar-primary-cta">
            Run Simulation
          </Link>
          <button type="button" className="polar-chip polar-chip-outline dash-search-chip" onClick={() => setCmdOpen(true)}>
            Search
            <span className="kbd">⌘K</span>
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV.map((group) => (
            <div key={group.section}>
              <p className="sidebar-section-label">{group.section}</p>
              {group.items.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-item${isActive ? ' active' : ''}`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="dash-main">
        <header className="dash-topbar">
          {/* Breadcrumb */}
          <div className="dash-crumbs">
            <Link href="/dashboard" className="dash-crumb-root">Dashboard</Link>
            {crumbs.map((seg, i) => (
              <span key={`${seg}-${i}`} className="dash-crumb-node">
                <span className="dash-crumb-divider">›</span>
                <span className={i === crumbs.length - 1 ? 'dash-crumb-current' : 'dash-crumb-label'}>
                  {seg.charAt(0).toUpperCase() + seg.slice(1)}
                </span>
              </span>
            ))}
          </div>

          {/* Search trigger */}
          <button
            onClick={() => setCmdOpen(true)}
            className="dash-search-trigger"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Search…
            <span className="kbd">⌘K</span>
          </button>

          <UserAvatar user={user} />
        </header>

        <main className="dash-content">
          {children}
        </main>
      </div>
    </div>
  );
}
