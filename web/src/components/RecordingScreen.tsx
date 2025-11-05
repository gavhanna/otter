import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatDefaultRecordingName } from "../lib/utils";

type RecorderState = "idle" | "recording" | "preview" | "saving";

const SUPPORTS_MEDIA_RECORDER =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    "mediaDevices" in navigator &&
    "MediaRecorder" in window;

interface RecordingScreenProps {
  onClose: () => void;
  onRecordingComplete: (recordingId: string) => void;
}

export function RecordingScreen({ onClose, onRecordingComplete }: RecordingScreenProps) {
    const queryClient = useQueryClient();
    const [state, setState] = useState<RecorderState>("idle");
    const [error, setError] = useState<string | null>(null);
    const [title, setTitle] = useState("");
    const [durationMs, setDurationMs] = useState<number>(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const recorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const startTimeRef = useRef<number>(0);
    const chunksRef = useRef<Blob[]>([]);

    const formattedDuration = useMemo(
        () => formatDuration(durationMs),
        [durationMs]
    );

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
            setError("Recording not supported in this browser.");
            return;
        }
        if (state === "recording") {
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: true,
            });
            const recorder = new MediaRecorder(stream);
            chunksRef.current = [];
            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };
            recorder.onstop = () => {
                const blob = new Blob(chunksRef.current, {
                    type: recorder.mimeType || "audio/webm",
                });
                setAudioBlob(blob);
                setAudioUrl((prev) => {
                    if (prev) URL.revokeObjectURL(prev);
                    return URL.createObjectURL(blob);
                });
                setDurationMs(Date.now() - startTimeRef.current);
                setState("preview");
                cleanupMedia();
            };

            recorder.start();
            recorderRef.current = recorder;
            streamRef.current = stream;
            startTimeRef.current = Date.now();
            setError(null);
            setDurationMs(0);
            setTitle(formatDefaultRecordingName());
            setState("recording");
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Unable to access microphone"
            );
            cleanupMedia();
        }
    };

    const stopRecording = () => {
        if (recorderRef.current && recorderRef.current.state === "recording") {
            recorderRef.current.stop();
            setState("preview");
        }
    };

    const resetRecorder = () => {
        setState("idle");
        setError(null);
        setTitle("");
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
        setState("saving");
        setError(null);

        const recordingTitle = title.trim() || formatDefaultRecordingName();
        const formData = new FormData();
        formData.append("title", recordingTitle);
        formData.append("recordedAt", new Date().toISOString());
        formData.append(
            "durationMs",
            Math.max(0, Math.round(durationMs)).toString()
        );
        formData.append("audio", audioBlob, `recording-${Date.now()}.webm`);

        try {
            const response = await api.createRecording(formData);
            await queryClient.invalidateQueries({ queryKey: ["recordings"] });
            onRecordingComplete(response.recording.id);
            resetRecorder();
            onClose();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to upload recording"
            );
            setState("preview");
        }
    };

    const isSaving = state === "saving";

    const handleBack = () => {
        if (state === 'recording') {
            if (window.confirm('Are you sure you want to stop recording? Any unsaved audio will be lost.')) {
                cleanupMedia();
                setState('idle');
                onClose();
            }
        } else {
            onClose();
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-slate-950">
            <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-6 py-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-xl font-semibold text-white">New Recording</h1>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-2xl mx-auto p-6 space-y-8">
                    {/* Main Recording Interface */}
                    <div className="bg-slate-900/70 rounded-3xl border border-slate-800 p-8">
                        <div className="text-center space-y-8">
                            {/* Recording Status */}
                            <div className="space-y-4">
                                {state === "recording" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-center gap-3">
                                            <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></div>
                                            <span className="text-rose-400 font-medium">Recording</span>
                                        </div>
                                        <div className="text-6xl font-mono font-bold text-white">
                                            {formattedDuration}
                                        </div>
                                    </div>
                                )}

                                {(state === "idle" || state === "preview") && (
                                    <div className="space-y-4">
                                        <div className="w-32 h-32 mx-auto rounded-full bg-slate-800 flex items-center justify-center">
                                            {state === "idle" ? (
                                                <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                                </svg>
                                            ) : (
                                                <svg className="w-12 h-12 text-brand" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                                </svg>
                                            )}
                                        </div>
                                        {state === "preview" && (
                                            <div className="text-2xl font-mono font-semibold text-white">
                                                {formattedDuration}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Audio Preview */}
                            {state === "preview" && audioUrl && (
                                <div className="bg-slate-950/60 rounded-2xl p-6 border border-slate-800">
                                    <audio controls src={audioUrl} className="w-full" />
                                </div>
                            )}

                            {/* Control Buttons */}
                            <div className="flex justify-center gap-4">
                                {state === "idle" && (
                                    <button
                                        onClick={startRecording}
                                        className="w-20 h-20 rounded-full bg-brand text-slate-950 hover:bg-orange-400 flex items-center justify-center transition-colors shadow-lg"
                                    >
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="8" />
                                        </svg>
                                    </button>
                                )}

                                {state === "recording" && (
                                    <button
                                        onClick={stopRecording}
                                        className="w-20 h-20 rounded-full bg-rose-500 text-white hover:bg-rose-400 flex items-center justify-center transition-colors shadow-lg"
                                    >
                                        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                            <rect x="8" y="8" width="8" height="8" rx="1" />
                                        </svg>
                                    </button>
                                )}

                                {state === "preview" && (
                                    <>
                                        <button
                                            onClick={resetRecorder}
                                            disabled={isSaving}
                                            className="px-6 py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition-colors"
                                        >
                                            Discard
                                        </button>
                                        <button
                                            onClick={saveRecording}
                                            disabled={isSaving}
                                            className="px-8 py-3 rounded-xl bg-brand text-slate-950 hover:bg-orange-400 font-semibold disabled:opacity-50 transition-colors"
                                        >
                                            {isSaving ? "Saving..." : "Save Recording"}
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Title Input */}
                            {(state === "preview" || state === "saving") && (
                                <div className="max-w-md mx-auto">
                                    <label className="block text-left">
                                        <span className="text-sm font-medium text-slate-300">Title</span>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                                            placeholder="Morning ideas, Grocery note…"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-6 py-4 text-sm text-rose-200">
                            {error}
                        </div>
                    )}

                    {/* Browser Support Notice */}
                    {!SUPPORTS_MEDIA_RECORDER && (
                        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-4 text-sm text-amber-200">
                            Recording requires a modern browser with MediaRecorder support.
                        </div>
                    )}

                    {/* Instructions */}
                    {state === "idle" && (
                        <div className="text-center space-y-4">
                            <h3 className="text-lg font-semibold text-white">How to record</h3>
                            <div className="space-y-2 text-sm text-slate-400">
                                <p>• Click the red button to start recording</p>
                                <p>• Speak clearly into your microphone</p>
                                <p>• Click the stop button when you're finished</p>
                                <p>• Review and save your recording</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    function cleanupMedia() {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
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
    if (!durationMs || durationMs <= 0) return "00:00";
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
}