import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/authStore';

export function RecordingsPage() {
  const { user, status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'idle' || status === 'error') {
      void navigate({ to: '/login' });
    }
  }, [status, navigate]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['recordings'],
    queryFn: async () => {
      const response = await api.listRecordings();
      return response.recordings;
    },
    enabled: !!user
  });

  if (!user) {
    return null;
  }

  const recordings = data ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">Recent recordings</h1>
          <span className="text-xs text-slate-400">
            {isLoading ? 'Loading…' : `${recordings.length} items`}
          </span>
        </header>
        <div className="space-y-2">
          {error ? (
            <div className="rounded-xl border border-rose-500 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
              Failed to load recordings.
            </div>
          ) : null}

          {isLoading ? (
            <div className="space-y-2">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
          ) : recordings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 py-12 text-center text-sm text-slate-400">
              No recordings yet.
            </div>
          ) : (
            recordings.map((recording) => (
              <article
                key={recording.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-brand hover:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-100">{recording.title}</h2>
                  <span className="text-xs text-slate-400">
                    {formatDuration(recording.durationMs)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formatDate(recording.recordedAt ?? recording.createdAt)}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="min-h-[320px] rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Selected recording</p>
            <h2 className="text-xl font-semibold text-white">Pick an item to start</h2>
          </div>
          <div className="flex gap-2">
            <button className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800">
              Share
            </button>
            <button className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800">
              Delete
            </button>
          </div>
        </header>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 text-slate-500">
          <div className="flex h-32 w-full items-center justify-center rounded-2xl border border-dashed border-slate-700">
            Waveform preview coming soon
          </div>
          <div className="flex items-center gap-3">
            <button className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-slate-950 font-semibold">
              ▶
            </button>
            <span className="text-sm text-slate-300">00:00 / 00:00</span>
          </div>
        </div>
      </section>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="h-16 animate-pulse rounded-2xl bg-slate-800/50">
      <span className="sr-only">Loading</span>
    </div>
  );
}

function formatDate(isoString: string | null): string {
  if (!isoString) return 'Unknown date';
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return isoString;
  }
}

function formatDuration(durationMs: number | null | undefined): string {
  if (!durationMs || durationMs <= 0) return '00:00';
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
