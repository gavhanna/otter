import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { api } from '../lib/api';

interface RecordingViewProps {
  recordingId: string | null;
}

export function RecordingView({ recordingId }: RecordingViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isWaveformReady, setIsWaveformReady] = useState(false);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const { data: recording, isLoading, error } = useQuery({
    queryKey: ['recording', recordingId],
    queryFn: async () => {
      if (!recordingId) return null;
      const response = await api.getRecording(recordingId);
      return response.recording;
    },
    enabled: !!recordingId
  });

  const audioSrc = recording ? `/api/recordings/${recording.id}/stream` : null;

  // Initialize WaveSurfer when recording changes
  useEffect(() => {
    if (!audioSrc || !waveformRef.current) return;

    // Destroy existing instance
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    // Create new WaveSurfer instance
    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#64748b', // slate-500
      progressColor: '#fb923c', // brand (orange)
      cursorColor: '#f8fafc', // slate-50
      barWidth: 2,
      barRadius: 3,
      cursorWidth: 1,
      height: 80,
      barGap: 3,
      normalize: true,
      backend: 'WebAudio',
      mediaControls: false,
      interact: true,
      hideScrollbar: true,
      autoScroll: false,
    });

    // Event listeners
    wavesurfer.on('ready', () => {
      setIsWaveformReady(true);
      setIsPlaying(false);
    });

    wavesurfer.on('play', () => {
      setIsPlaying(true);
    });

    wavesurfer.on('pause', () => {
      setIsPlaying(false);
    });

    wavesurfer.on('timeupdate', (currentTime) => {
      setCurrentTime(currentTime);
    });

    wavesurfer.on('finish', () => {
      setIsPlaying(false);
      setCurrentTime(0);
    });

    wavesurfer.on('error', (error) => {
      console.error('WaveSurfer error:', error);
      setIsWaveformReady(false);
    });

    // Load audio
    wavesurfer.load(audioSrc);
    wavesurferRef.current = wavesurfer;

    // Cleanup
    return () => {
      if (wavesurferRef.current) {
        wavesurferRef.current.destroy();
        wavesurferRef.current = null;
      }
      setIsWaveformReady(false);
    };
  }, [audioSrc, recordingId]);

  if (!recordingId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
            <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Select a recording</h2>
          <p className="text-slate-400">Choose a recording from the sidebar to view its details, transcript, and more.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-800 animate-pulse"></div>
          <p className="text-slate-400">Loading recording...</p>
        </div>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-rose-500/20 flex items-center justify-center">
            <svg className="w-12 h-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Recording not found</h2>
          <p className="text-slate-400">The recording you're looking for doesn't exist or couldn't be loaded.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{recording.title}</h1>
            <p className="text-sm text-slate-400 mt-1">
              {formatDate(recording.recordedAt ?? recording.createdAt)} • {formatDuration(recording.durationMs)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Favorite
            </button>
            <button className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m9.032 4.026a9.001 9.001 0 01-7.432 0m9.032-4.026A9.001 9.001 0 0112 3c-4.474 0-8.268 3.12-9.032 7.326m0 0A9.001 9.001 0 0012 21c4.474 0 8.268-3.12 9.032-7.326" />
              </svg>
              Share
            </button>
            <button className="rounded-lg border border-rose-700 px-4 py-2 text-sm text-rose-400 hover:bg-rose-900/20 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          {/* Waveform and Audio Player */}
          <section className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Audio Player</h2>

            {/* Waveform */}
            <div className="mb-4">
              <div
                ref={waveformRef}
                className="rounded-xl bg-slate-950/60 min-h-[80px] flex items-center justify-center"
              >
                {!isWaveformReady && audioSrc && (
                  <div className="flex items-center gap-3 text-slate-500">
                    <div className="w-4 h-4 border-2 border-slate-600 border-t-brand rounded-full animate-spin"></div>
                    <span className="text-sm">Loading waveform...</span>
                  </div>
                )}
                {!audioSrc && (
                  <p className="text-slate-500">No audio available</p>
                )}
              </div>
            </div>

            {/* Playback Controls */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    if (wavesurferRef.current) {
                      if (isPlaying) {
                        wavesurferRef.current.pause();
                      } else {
                        wavesurferRef.current.play();
                      }
                    }
                  }}
                  disabled={!isWaveformReady}
                  className="w-12 h-12 rounded-full bg-brand text-slate-950 flex items-center justify-center hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(recording?.durationMs ? recording.durationMs / 1000 : 0)}</span>
                  </div>
                  <div className="h-1 bg-slate-800 rounded-full">
                    <div
                      className="h-1 bg-brand rounded-full transition-all duration-100"
                      style={{
                        width: `${recording?.durationMs ? (currentTime / (recording.durationMs / 1000)) * 100 : 0}%`
                      }}
                    ></div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => {
                      const newVolume = parseFloat(e.target.value);
                      setVolume(newVolume);
                      if (wavesurferRef.current) {
                        wavesurferRef.current.setVolume(newVolume);
                      }
                    }}
                    className="w-20 accent-brand"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Transcript */}
          <section className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Transcript</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <button className="w-8 h-8 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                  <span className="text-sm text-slate-300">00:00 - 00:15</span>
                </div>
              </div>
              <div className="text-slate-300 leading-relaxed">
                <p className="mb-4">Hello, this is a sample transcript. The actual transcription feature will be implemented in a future update. This will show the spoken content from your recording with timestamps.</p>
                <p>Each segment will be clickable and will allow you to jump to that specific part of the audio recording.</p>
              </div>
            </div>
          </section>

          {/* Metadata */}
          <section className="bg-slate-900/70 rounded-2xl border border-slate-800 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Recording Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Recorded:</span>
                <p className="text-white mt-1">{formatDate(recording.recordedAt ?? recording.createdAt)}</p>
              </div>
              <div>
                <span className="text-slate-400">Duration:</span>
                <p className="text-white mt-1">{formatDuration(recording.durationMs)}</p>
              </div>
              <div>
                <span className="text-slate-400">File Size:</span>
                <p className="text-white mt-1">~2.3 MB</p>
              </div>
              <div>
                <span className="text-slate-400">Format:</span>
                <p className="text-white mt-1">WebM Audio</p>
              </div>
            </div>
            {recording.description && (
              <div className="mt-4">
                <span className="text-slate-400">Description:</span>
                <p className="text-white mt-1">{recording.description}</p>
              </div>
            )}
          </section>
        </div>
      </div>
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
  if (!durationMs || durationMs <= 0) return '0:00';
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}