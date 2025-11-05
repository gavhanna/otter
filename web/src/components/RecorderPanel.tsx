import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

type RecorderState = 'idle' | 'recording' | 'preview' | 'saving';

const SUPPORTS_MEDIA_RECORDER =
  typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'mediaDevices' in navigator && 'MediaRecorder' in window;

export function RecorderPanel() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<RecorderState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [durationMs, setDurationMs] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);

  const formattedDuration = useMemo(() => formatDuration(durationMs), [durationMs]);

  useEffect(() => {
    return () => {
      cleanupMedia();
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startRecording = async () => {
    if (!SUPPORTS_MEDIA_RECORDER) {
      setError('Recording not supported in this browser.');
      return;
    }
    if (state === 'recording') {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
        setDurationMs(Date.now() - startTimeRef.current);
        setState('preview');
        cleanupMedia();
      };

      recorder.start();
      recorderRef.current = recorder;
      streamRef.current = stream;
      startTimeRef.current = Date.now();
      setError(null);
      setDurationMs(0);
      setTitle('');
      setState('recording');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to access microphone');
      cleanupMedia();
    }
  };

  const stopRecording = () => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      setState('preview');
    }
  };

  const resetRecorder = () => {
    setState('idle');
    setError(null);
    setTitle('');
    setDurationMs(0);
    setAudioBlob(null);
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    cleanupMedia();
  };

  const saveRecording = async () => {
    if (!audioBlob) return;
    setState('saving');
    setError(null);

    const recordingTitle = title.trim() || new Date().toLocaleString();
    const formData = new FormData();
    formData.append('title', recordingTitle);
    formData.append('recordedAt', new Date().toISOString());
    formData.append('durationMs', Math.max(0, Math.round(durationMs)).toString());
    formData.append('audio', audioBlob, `recording-${Date.now()}.webm`);

    try {
      await api.createRecording(formData);
      await queryClient.invalidateQueries({ queryKey: ['recordings'] });
      resetRecorder();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload recording');
      setState('preview');
    }
  };

  const isSaving = state === 'saving';

  return (
    <section
      id="recorder-panel"
      className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-inner backdrop-blur"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">Recorder</h2>
          <p className="text-xs text-slate-400">Capture a new moment and store it in your library.</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={state === 'recording' ? stopRecording : startRecording}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              state === 'recording'
                ? 'bg-rose-500 text-white hover:bg-rose-400'
                : 'bg-brand text-slate-950 hover:bg-orange-400'
            } ${isSaving ? 'cursor-not-allowed opacity-60' : ''}`}
            disabled={isSaving}
          >
            {state === 'recording' ? 'Stop Recording' : 'Start Recording'}
          </button>
          {state === 'preview' ? (
            <button
              type="button"
              className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
              onClick={resetRecorder}
              disabled={isSaving}
            >
              Discard
            </button>
          ) : null}
        </div>
      </header>

      {!SUPPORTS_MEDIA_RECORDER ? (
        <p className="mt-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Recording requires a modern browser with MediaRecorder support.
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {state === 'recording' ? (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-4 py-3 text-sm text-slate-300">
          <span className="flex h-2 w-2 animate-pulse rounded-full bg-rose-500" />
          Recording… {formattedDuration}
        </div>
      ) : null}

      {state === 'preview' || state === 'saving' ? (
        <div className="mt-6 grid gap-4 md:grid-cols-[240px_1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            {audioUrl ? (
              <audio controls src={audioUrl} className="w-full" />
            ) : (
              <p className="text-sm text-slate-400">No preview available.</p>
            )}
            <p className="mt-2 text-xs text-slate-500">Length: {formattedDuration}</p>
          </div>
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-slate-300">Title</span>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                placeholder="Morning ideas, Grocery note…"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveRecording}
                className="flex flex-1 items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSaving}
              >
                {isSaving ? 'Saving…' : 'Save Recording'}
              </button>
              <button
                type="button"
                onClick={resetRecorder}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                disabled={isSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );

  function cleanupMedia() {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }
}

function formatDuration(durationMs: number): string {
  if (!durationMs || durationMs <= 0) return '00:00';
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}
