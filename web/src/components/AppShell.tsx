import { type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useAuth } from '../lib/authStore';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-64 flex-col border-r border-slate-800 bg-slate-900 p-4 lg:flex">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-slate-900 font-semibold">
            OR
          </div>
          <div>
            <div className="text-lg font-semibold">Otter Recorder</div>
            <div className="text-sm text-slate-400">Your private audio library</div>
          </div>
        </div>
        <nav className="space-y-2 text-sm">
          <Link
            to="/"
            className={({ isActive }) =>
              [
                'block rounded-lg px-3 py-2 transition',
                isActive ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              ].join(' ')
            }
          >
            Recordings
          </Link>
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>Search</span>
            <span className="rounded bg-slate-800 px-2 py-1 text-xs text-slate-300">⌘K</span>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#recorder-panel"
              className="rounded-full bg-brand px-4 py-2 text-sm font-semibold text-slate-950 shadow hover:bg-orange-400"
            >
              New Recording
            </a>
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
                {user?.displayName?.slice(0, 1)?.toUpperCase() ?? 'U'}
              </div>
              <div className="hidden flex-col text-xs text-slate-400 sm:flex">
                <span className="text-slate-200">{user?.displayName ?? user?.email ?? 'Unknown user'}</span>
                <button
                  className="text-left text-xs text-brand hover:underline"
                  onClick={() => {
                    void logout();
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
