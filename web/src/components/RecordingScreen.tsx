import { useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { formatDefaultRecordingName } from "../lib/utils";
import { useRecorder } from "../hooks/useRecorder";
import { recordingsQueryKey } from "../hooks/recordings";

interface RecordingScreenProps {
    onRecordingComplete: (recordingId: string) => void;
    onClose?: () => void;
    autoStartTrigger?: number | null;
    onAutoStartConsumed?: () => void;
}

export function RecordingScreen({
    onClose,
    onRecordingComplete,
    autoStartTrigger,
    onAutoStartConsumed,
}: RecordingScreenProps) {
    const queryClient = useQueryClient();
    const {
        state,
        error,
        setError,
        title,
        setTitle,
        durationMs,
        audioBlob,
        audioUrl,
        visualizerData,
        startRecording,
        pauseRecording,
        resumeRecording,
        stopRecording,
        resetRecorder,
        supportsMediaRecorder,
    } = useRecorder();

    const formattedDuration = useMemo(
        () => formatDuration(durationMs),
        [durationMs]
    );

    useEffect(() => {
        if (autoStartTrigger && state === "idle") {
            void startRecording();
            onAutoStartConsumed?.();
        }
    }, [autoStartTrigger, state, startRecording, onAutoStartConsumed]);

    const saveRecordingMutation = useMutation({
        mutationFn: async (formData: FormData) => api.createRecording(formData),
        onSuccess: async (response) => {
            await queryClient.invalidateQueries({
                queryKey: recordingsQueryKey,
            });
            onRecordingComplete(response.recording.id);
            resetRecorder();
            onClose?.();
        },
        onError: (err: unknown) => {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to upload recording"
            );
        },
    });

    const saveRecording = async () => {
        if (!audioBlob) return;
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
            await saveRecordingMutation.mutateAsync(formData);
        } catch {
            // Error handled in onError
        }
    };

    const isSaving = saveRecordingMutation.isPending;

    return (
        <div className="flex-1 flex flex-col bg-slate-950">
            <div className="flex-1 overflow-y-auto w-full">
                <div className="max-w-2xl mx-auto p-6 space-y-8">
                    {/* Main Recording Interface */}
                    <div className="bg-slate-900/70 rounded-3xl border border-slate-800 p-8">
                        <div className="text-center space-y-8">
                            {/* Recording Status */}
                            <div className="space-y-4">
                                {(state === "recording" ||
                                    state === "paused") && (
                                    <div className="space-y-6">
                                        <div className="flex items-center justify-center gap-3">
                                            <div
                                                className={`w-3 h-3 rounded-full ${
                                                    state === "recording"
                                                        ? "bg-rose-500 animate-pulse"
                                                        : "bg-amber-500 animate-none"
                                                } ${
                                                    state === "paused"
                                                        ? "animate-bounce"
                                                        : ""
                                                }`}
                                            ></div>
                                            <span
                                                className={`${
                                                    state === "recording"
                                                        ? "text-rose-400"
                                                        : "text-amber-400"
                                                } font-medium transition-colors duration-300`}
                                            >
                                                {state === "recording"
                                                    ? "Recording"
                                                    : "Paused"}
                                            </span>
                                        </div>
                                        <div className="text-6xl font-mono font-bold text-white">
                                            {formattedDuration}
                                        </div>

                                        {/* Live Audio Visualizer */}
                                        {visualizerData && (
                                            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-700">
                                                <div className="flex items-center justify-center gap-1 h-24">
                                                    {Array.from({
                                                        length: Math.min(
                                                            32,
                                                            visualizerData.length
                                                        ),
                                                    }).map((_, i) => {
                                                        const value =
                                                            visualizerData[
                                                                i *
                                                                    Math.floor(
                                                                        visualizerData.length /
                                                                            32
                                                                    )
                                                            ] || 0;
                                                        const height = Math.max(
                                                            4,
                                                            (value / 255) * 96
                                                        ); // Max height 96px (24 * 4)
                                                        return (
                                                            <div
                                                                key={i}
                                                                className={`flex-1 bg-gradient-to-t from-brand to-orange-400 rounded-full transition-all duration-100 ${
                                                                    state ===
                                                                    "paused"
                                                                        ? "opacity-50"
                                                                        : ""
                                                                }`}
                                                                style={{
                                                                    height: `${height}px`,
                                                                    minHeight:
                                                                        "4px",
                                                                    maxHeight:
                                                                        "96px",
                                                                }}
                                                            />
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {(state === "idle" || state === "preview") && (
                                    <div className="space-y-4">
                                        <div className="w-32 h-32 mx-auto rounded-full bg-slate-800 flex items-center justify-center">
                                            {state === "idle" ? (
                                                <svg
                                                    className="w-12 h-12 text-slate-600"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                                    />
                                                </svg>
                                            ) : (
                                                <svg
                                                    className="w-12 h-12 text-brand"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                                                    />
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
                                    <audio
                                        controls
                                        src={audioUrl}
                                        className="w-full"
                                    />
                                </div>
                            )}

                            {/* Control Buttons */}
                            <div className="flex justify-center gap-4">
                                {state === "idle" && (
                                    <button
                                        onClick={startRecording}
                                        className="w-20 h-20 rounded-full bg-brand text-slate-950 hover:bg-orange-400 hover:scale-105 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 group"
                                    >
                                        <svg
                                            className="w-8 h-8 transition-transform duration-200 group-hover:scale-110"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <circle cx="12" cy="12" r="8" />
                                        </svg>
                                    </button>
                                )}

                                {state === "recording" && (
                                    <div className="flex justify-center gap-4 animate-fade-in">
                                        <button
                                            onClick={pauseRecording}
                                            className="w-16 h-16 rounded-full bg-amber-500 text-white hover:bg-amber-400 hover:scale-105 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
                                        >
                                            <svg
                                                className="w-6 h-6"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <rect
                                                    x="6"
                                                    y="4"
                                                    width="4"
                                                    height="16"
                                                    rx="1"
                                                />
                                                <rect
                                                    x="14"
                                                    y="4"
                                                    width="4"
                                                    height="16"
                                                    rx="1"
                                                />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={stopRecording}
                                            className="w-20 h-20 rounded-full bg-rose-500 text-white hover:bg-rose-400 hover:scale-105 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
                                        >
                                            <svg
                                                className="w-8 h-8"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <rect
                                                    x="8"
                                                    y="8"
                                                    width="8"
                                                    height="8"
                                                    rx="1"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                )}

                                {state === "paused" && (
                                    <div className="flex justify-center gap-4 animate-fade-in">
                                        <button
                                            onClick={resumeRecording}
                                            className="w-16 h-16 rounded-full bg-brand text-slate-950 hover:bg-orange-400 hover:scale-105 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 animate-pulse"
                                        >
                                            <svg
                                                className="w-6 h-6"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path d="M8 5v14l11-7z" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={stopRecording}
                                            className="w-20 h-20 rounded-full bg-rose-500 text-white hover:bg-rose-400 hover:scale-105 flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95"
                                        >
                                            <svg
                                                className="w-8 h-8"
                                                fill="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <rect
                                                    x="8"
                                                    y="8"
                                                    width="8"
                                                    height="8"
                                                    rx="1"
                                                />
                                            </svg>
                                        </button>
                                    </div>
                                )}

                                {state === "preview" && (
                                    <>
                                        <button
                                            onClick={() => {
                                                resetRecorder();
                                                onClose?.();
                                            }}
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
                                            {isSaving
                                                ? "Saving..."
                                                : "Save Recording"}
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Title Input */}
                            {state === "preview" && (
                                <div className="max-w-md mx-auto">
                                    <label className="block text-left">
                                        <span className="text-sm font-medium text-slate-300">
                                            Title
                                        </span>
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) =>
                                                setTitle(e.target.value)
                                            }
                                            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-white focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                                            placeholder="Morning ideas, Grocery note…"
                                        />
                                    </label>
                                </div>
                            )}

                            {/* Loading Screen */}
                            {isSaving && (
                                <div className="max-w-md mx-auto text-center">
                                    <div className="flex flex-col items-center space-y-4">
                                        <div className="w-12 h-12 border-4 border-slate-600 border-t-brand rounded-full animate-spin"></div>
                                        <div>
                                            <h3 className="text-lg font-semibold text-white mb-2">
                                                Saving Recording
                                            </h3>
                                            <p className="text-sm text-slate-400">
                                                This may take a moment for
                                                longer recordings...
                                            </p>
                                        </div>
                                    </div>
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
                    {!supportsMediaRecorder && (
                        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 px-6 py-4 text-sm text-amber-200">
                            Recording requires a modern browser with
                            MediaRecorder support.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

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
