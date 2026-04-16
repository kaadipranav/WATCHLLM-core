'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { DashboardSidebar } from '../../components/dashboard-sidebar';
import { useAuth } from '../../lib/auth-context';

function formatSegment(segment: string): string {
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getCurrentPageLabel(pathname: string): string {
  if (pathname === '/dashboard') {
    return 'Overview';
  }

  const pieces = pathname.split('/').filter(Boolean);
  if (pieces.length === 0) {
    return 'Overview';
  }

  const last = pieces[pieces.length - 1];
  if (!last) {
    return 'Overview';
  }

  return formatSegment(last);
}

function UserMenu({ user }: { user: { email: string; name?: string; image?: string } }): JSX.Element {
  const [open, setOpen] = useState(false);
  const { signOut } = useAuth();
  const initial = (user.name ?? user.email)[0]?.toUpperCase() ?? '?';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#111111] text-sm font-semibold text-zinc-200"
      >
        {user.image ? <img src={user.image} alt="" className="h-full w-full object-cover" /> : initial}
      </button>

      {open && (
        <>
          <button type="button" aria-label="Close menu" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-white/10 bg-[#111111] p-1 shadow-2xl shadow-black/40">
            <div className="border-b border-white/10 px-3 py-2">
              <p className="truncate text-sm font-medium text-zinc-100">{user.name ?? 'User'}</p>
              <p className="truncate text-xs text-zinc-500">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-1 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-zinc-300 transition hover:bg-white/5 hover:text-white"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }): JSX.Element | null {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const pageLabel = useMemo(() => getCurrentPageLabel(pathname), [pathname]);
  const workspaceLabel = useMemo(() => {
    const first = user?.name?.split(' ')[0]?.trim();
    return first && first.length > 0 ? first : 'Kaadz';
  }, [user?.name]);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, router, user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a]">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 border-t-zinc-200" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-sans text-zinc-100">
      <div className="flex min-h-screen">
        <DashboardSidebar />

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur">
            <div className="flex h-14 items-center gap-3 px-4 md:px-6 lg:px-8">
              <p className="truncate text-sm tracking-tight text-zinc-500">
                <span className="text-zinc-300">{workspaceLabel}</span>
                <span className="mx-1 text-zinc-600">/</span>
                <span className="text-zinc-400">{pageLabel}</span>
              </p>

              <div className="ml-auto flex items-center gap-2">
                <label className="hidden h-9 items-center gap-2 rounded-md border border-white/10 bg-[#111111] px-3 text-sm text-zinc-400 sm:flex">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span>Search</span>
                  <span className="rounded border border-white/10 bg-black px-1.5 py-0.5 text-xs text-zinc-500">⌘K</span>
                </label>

                <Link
                  href="/dashboard/simulations?new=1"
                  className="hidden h-9 items-center rounded-md bg-[#00C896] px-3 text-sm font-semibold text-black transition hover:bg-[#0fd7a4] md:inline-flex"
                >
                  + Run Simulation
                </Link>

                <UserMenu user={user} />
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
