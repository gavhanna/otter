import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { RecorderPanel } from '../components/RecorderPanel';
import { api } from '../lib/api';
import { useAuth } from '../lib/authStore';

export function RecordingsPage() {
  const { user, status } = useAuth();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  useEffect(() => {
    if (recordings.length === 0) {
      setSelectedId(null);
      return;
    }
    const exists = selectedId ? recordings.some((recording) => recording.id === selectedId) : false;
    if (!exists) {
      setSelectedId(recordings[0].id);
    }
  }, [recordings, selectedId]);

  const selectedRecording = useMemo(
    () => recordings.find((recording) => recording.id === selectedId) ?? null,
    [recordings, selectedId]
  );

  const audioSrc = selectedRecording ? `/api/recordings/${selectedRecording.id}/stream` : null;

  return (
    <div className="space-y-6">
      <RecorderPanel />
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
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(recording.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedId(recording.id);
                    }
                  }}
                  className={[
                    'rounded-2xl border p-4 transition focus:outline-none focus:ring-2 focus:ring-brand',
                    recording.id === selectedId
                      ? 'border-brand bg-brand/10 text-white'
                      : 'border-slate-800 bg-slate-900/60 hover:border-brand hover:bg-slate-900'
                  ].join(' ')}
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
              <h2 className="text-xl font-semibold text-white">
                {selectedRecording ? selectedRecording.title : 'Pick an item to start'}
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                disabled={!selectedRecording}
              >
                Share
              </button>
              <button
                className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
                disabled={!selectedRecording}
              >
                Delete
              </button>
            </div>
          </header>
          {selectedRecording ? (
            <div className="mt-8 space-y-6 text-sm text-slate-300">
              <audio
                key={`${selectedRecording.id}:${selectedRecording.updatedAt}`}
                controls
                src={audioSrc ?? undefined}
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
              >
                Your browser does not support audio playback.
              </audio>
              <div className="space-y-2 text-xs text-slate-400">
                <div>
                  <span className="font-semibold text-slate-300">Recorded:</span>{' '}
                  {formatDate(selectedRecording.recordedAt ?? selectedRecording.createdAt)}
                </div>
                <div>
                  <span className="font-semibold text-slate-300">Duration:</span>{' '}
                  {formatDuration(selectedRecording.durationMs)}
                </div>
                {selectedRecording.description ? (
                  <p className="text-slate-300">{selectedRecording.description}</p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-10 flex flex-col items-center justify-center gap-4 text-slate-500">
              <div className="flex h-32 w-full items-center justify-center rounded-2xl border border-dashed border-slate-700">
                Select a recording to preview and play it here.
              </div>
            </div>
          )}
        </section>
      </div>
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
