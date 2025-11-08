import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";
import { api } from "../lib/api";

interface RecordingViewProps {
    recordingId: string | null;
    onRecordingDeleted?: () => void;
    onClose?: () => void;
}

export function RecordingView({
    recordingId,
    onRecordingDeleted,
    onClose,
}: RecordingViewProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isWaveformReady, setIsWaveformReady] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitle, setEditTitle] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);
    const [isEditingLocation, setIsEditingLocation] = useState(false);
    const [editLocation, setEditLocation] = useState("");
    const waveformRef = useRef<HTMLDivElement>(null);
    const wavesurferRef = useRef<WaveSurfer | null>(null);
    const queryClient = useQueryClient();

    const {
        data: recording,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["recording", recordingId],
        queryFn: async () => {
            if (!recordingId) return null;
            const response = await api.getRecording(recordingId);
            return response.recording;
        },
        enabled: !!recordingId,
    });

    const audioSrc =
        recording && recordingId && recording.id
            ? `/api/recordings/${recording.id}/stream`
            : null;

    // Handle favourite toggle
    const handleToggleFavourite = async () => {
        if (!recording || !recordingId) {
            console.error("Missing recording data:", {
                recording,
                recordingId,
            });
            return;
        }

        if (!recording.id) {
            console.error("Recording ID is missing:", recording);
            return;
        }

        const newFavouriteStatus = !recording.isFavourited;

        // Create a stable copy to avoid triggering WaveSurfer re-initialization
        const originalRecording = { ...recording };

        // Optimistic update - update UI immediately
        queryClient.setQueryData(["recording", recordingId], (oldData: any) => {
            if (!oldData?.recording) return oldData;
            return {
                ...oldData,
                recording: {
                    ...oldData.recording,
                    isFavourited: newFavouriteStatus,
                },
            };
        });

        // Update the recording in the list cache
        queryClient.setQueryData(["recordings"], (oldData: any) => {
            if (!oldData?.recordings) return oldData;
            return {
                ...oldData,
                recordings: oldData.recordings.map((r: any) =>
                    r.id === recording.id
                        ? { ...r, isFavourited: newFavouriteStatus }
                        : r
                ),
            };
        });

        try {
            await api.updateFavourite(recording.id, newFavouriteStatus);

            // Invalidate queries to ensure both sidebar and recording view update
            queryClient.invalidateQueries({ queryKey: ["recordings"] });
            queryClient.invalidateQueries({
                queryKey: ["recording", recordingId],
            });
        } catch (error) {
            console.error("Failed to update favourite status:", error);
            // Revert on error
            queryClient.setQueryData(
                ["recording", recordingId],
                (oldData: any) => {
                    if (!oldData?.recording) return oldData;
                    return {
                        ...oldData,
                        recording: originalRecording,
                    };
                }
            );
            queryClient.setQueryData(["recordings"], (oldData: any) => {
                if (!oldData?.recordings) return oldData;
                return {
                    ...oldData,
                    recordings: oldData.recordings.map((r: any) =>
                        r.id === recording.id ? originalRecording : r
                    ),
                };
            });
        }
    };

    // Handle delete recording
    const handleDeleteRecording = async () => {
        if (!recording || !recordingId) {
            console.error("Missing recording data:", {
                recording,
                recordingId,
            });
            return;
        }

        if (!recording.id) {
            console.error("Recording ID is missing:", recording);
            return;
        }

        setIsDeleting(true);
        try {
            await api.deleteRecording(recording.id);

            // Remove recording from cache
            queryClient.removeQueries({ queryKey: ["recording", recordingId] });

            // Update recordings list cache
            queryClient.setQueryData(["recordings"], (oldData: any) => {
                if (!oldData?.recordings) return oldData;
                return {
                    ...oldData,
                    recordings: oldData.recordings.filter(
                        (r: any) => r.id !== recording.id
                    ),
                };
            });

            // Invalidate queries to ensure UI components are updated
            queryClient.invalidateQueries({ queryKey: ["recordings"] });

            // Notify parent component
            onRecordingDeleted?.();
        } catch (error) {
            console.error("Failed to delete recording:", error);
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    // Handle title editing
    const handleStartEditTitle = () => {
        if (!recording) return;
        setEditTitle(recording.title);
        setIsEditingTitle(true);
    };

    const handleSaveTitle = async () => {
        if (!recording || !recordingId) return;

        const trimmedTitle = editTitle.trim();
        if (trimmedTitle === recording.title) {
            setIsEditingTitle(false);
            return;
        }

        setIsUpdating(true);

        try {
            // Call API first to ensure the update works
            await Promise.race([
                api.updateRecording(recording.id, { title: trimmedTitle }),
                new Promise((_, reject) =>
                    setTimeout(
                        () =>
                            reject(
                                new Error(
                                    "Title update timeout - please try again"
                                )
                            ),
                        45000
                    )
                ),
            ]);

            // Success - now update local state
            setIsEditingTitle(false);

            // Invalidate queries to ensure UI is up to date
            queryClient.invalidateQueries({ queryKey: ["recordings"] });
            queryClient.invalidateQueries({
                queryKey: ["recording", recordingId],
            });
        } catch (error) {
            console.error("Failed to update recording title:", error);

            // Don't change state on error - keep editing mode active
            // User can try again or cancel manually
            setEditTitle(recording.title); // Reset to original title

            // Show error message
            alert(
                `Failed to save title: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancelEditTitle = () => {
        if (!recording) return;
        setEditTitle(recording.title);
        setIsEditingTitle(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSaveTitle();
        } else if (e.key === "Escape") {
            handleCancelEditTitle();
        }
    };

    // Handle location editing
    const handleStartEditLocation = () => {
        if (!recording) return;
        setEditLocation(recording.location || "");
        setIsEditingLocation(true);
    };

    const handleSaveLocation = async () => {
        if (!recording || !recordingId) return;

        const trimmedLocation = editLocation.trim();
        if (trimmedLocation === recording.location) {
            setIsEditingLocation(false);
            return;
        }

        setIsUpdating(true);

        // Create a stable copy to avoid triggering unnecessary re-renders
        const originalRecording = { ...recording };

        // Optimistic update
        queryClient.setQueryData(["recording", recordingId], (oldData: any) => {
            if (!oldData?.recording) return oldData;
            return {
                ...oldData,
                recording: {
                    ...oldData.recording,
                    location: trimmedLocation || null,
                    locationSource: trimmedLocation ? "manual" : null,
                },
            };
        });

        // Update the recording in the list cache
        queryClient.setQueryData(["recordings"], (oldData: any) => {
            if (!oldData?.recordings) return oldData;
            return {
                ...oldData,
                recordings: oldData.recordings.map((r: any) =>
                    r.id === recording.id
                        ? {
                              ...r,
                              location: trimmedLocation || null,
                              locationSource: trimmedLocation ? "manual" : null,
                          }
                        : r
                ),
            };
        });

        try {
            await api.updateRecording(recording.id, {
                location: trimmedLocation || null,
                locationSource: trimmedLocation ? "manual" : null,
            });
            setIsEditingLocation(false);

            // Invalidate queries to ensure UI is up to date
            queryClient.invalidateQueries({ queryKey: ["recordings"] });
            queryClient.invalidateQueries({
                queryKey: ["recording", recordingId],
            });
        } catch (error) {
            console.error("Failed to update recording location:", error);

            // Revert on error
            queryClient.setQueryData(
                ["recording", recordingId],
                (oldData: any) => {
                    if (!oldData?.recording) return oldData;
                    return {
                        ...oldData,
                        recording: originalRecording,
                    };
                }
            );

            queryClient.setQueryData(["recordings"], (oldData: any) => {
                if (!oldData?.recordings) return oldData;
                return {
                    ...oldData,
                    recordings: oldData.recordings.map((r: any) =>
                        r.id === recording.id ? originalRecording : r
                    ),
                };
            });

            setEditLocation(recording.location || ""); // Reset input
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCancelEditLocation = () => {
        if (!recording) return;
        setEditLocation(recording.location || "");
        setIsEditingLocation(false);
    };

    const handleLocationKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSaveLocation();
        } else if (e.key === "Escape") {
            handleCancelEditLocation();
        }
    };

    // Initialize WaveSurfer when recording changes (but not when only favourite status changes)
    useEffect(() => {
        if (!audioSrc || !waveformRef.current || !recordingId) {
            return;
        }

        // Destroy existing instance
        if (wavesurferRef.current) {
            wavesurferRef.current.destroy();
        }

        // Create new WaveSurfer instance
        const wavesurfer = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: "#374151", // darker gray for better contrast
            progressColor: "#8da6cfff",
            cursorColor: "#f97316",
            barWidth: 4,
            barRadius: 4,
            cursorWidth: 2,
            height: "auto", // fixed height for consistent appearance
            barGap: 12,
            normalize: true,
            backend: "WebAudio",
            mediaControls: false,
            interact: true,
            hideScrollbar: true,
            autoCenter: true,
            autoScroll: true,
            fillParent: true,
            dragToSeek: true,
        });

        // Event listeners
        wavesurfer.on("ready", () => {
            setIsWaveformReady(true);
            setIsPlaying(false);
            console.log(
                "WaveSurfer ready, duration:",
                wavesurfer.getDuration()
            );
        });

        wavesurfer.on("play", () => {
            setIsPlaying(true);
        });

        wavesurfer.on("pause", () => {
            setIsPlaying(false);
        });

        wavesurfer.on("timeupdate", (currentTime) => {
            setCurrentTime(currentTime);
        });

        wavesurfer.on("finish", () => {
            setIsPlaying(false);
            setCurrentTime(0);
        });

        wavesurfer.on("error", (error) => {
            console.error("WaveSurfer error:", error);
            console.error("Audio source:", audioSrc);
            console.error("Error details:", {
                name: error.name,
                message: error.message,
                stack: error.stack,
            });
            setIsWaveformReady(false);
        });

        // Set initial playback speed
        wavesurfer.setPlaybackRate(playbackSpeed);

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
    }, [audioSrc, recordingId]); // Keep these dependencies but ensure audioSrc is stable

    // Update playback speed when it changes
    useEffect(() => {
        if (wavesurferRef.current && isWaveformReady) {
            wavesurferRef.current.setPlaybackRate(playbackSpeed);
        }
    }, [playbackSpeed, isWaveformReady]);

    if (!recordingId) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
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
                                d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                            />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">
                        Select a recording
                    </h2>
                    <p className="text-slate-400">
                        Choose a recording from the sidebar to view its details,
                        transcript, and more.
                    </p>
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
                        <svg
                            className="w-12 h-12 text-rose-500"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">
                        Recording not found
                    </h2>
                    <p className="text-slate-400">
                        The recording you're looking for doesn't exist or
                        couldn't be loaded.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden max-w-full">
            <header className="border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-sm px-4 md:px-8 py-4 flex-shrink-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                    {/* Mobile back button */}
                    <button
                        onClick={onClose}
                        className="md:hidden w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 transition-colors"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                    </button>
                    <div className="flex-1"></div>
                    <div className="flex items-center gap-2 ml-auto flex-shrink-0">
                        <button
                            onClick={handleToggleFavourite}
                            disabled={!recording?.id}
                            aria-label={
                                recording?.isFavourited
                                    ? "Unfavourite recording"
                                    : "Favourite recording"
                            }
                            className={`rounded-lg border px-2 md:px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                                !recording?.id
                                    ? "border-slate-800 text-slate-500 cursor-not-allowed"
                                    : recording?.isFavourited
                                    ? "border-brand bg-brand/20 text-brand hover:bg-brand/30"
                                    : "border-slate-700 text-slate-300 hover:bg-slate-800"
                            }`}
                        >
                            {recording?.isFavourited ? (
                                <svg
                                    className="w-4 h-4"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                </svg>
                            ) : (
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                                    />
                                </svg>
                            )}
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={!recording?.id || isDeleting}
                            className="rounded-lg border border-rose-700 px-2 md:px-3 py-2 text-sm text-rose-400 hover:bg-rose-900/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Delete recording"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex flex-col h-full min-h-0">
                {/* Google Recorder Style Full Height Layout */}
                <div className="flex-1 flex flex-col bg-slate-900/30 relative min-h-0">
                    {/* Recording Title and Info */}
                    <div className="px-6 pt-6 pb-4 bg-slate-900/50 backdrop-blur-sm border-b border-slate-800/30">
                        {isEditingTitle ? (
                            <div className="flex flex-col gap-3 max-w-4xl mx-auto">
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) =>
                                        setEditTitle(e.target.value)
                                    }
                                    onKeyDown={handleKeyDown}
                                    disabled={isUpdating}
                                    className="text-2xl md:text-3xl font-bold text-white bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 focus:outline-none focus:border-brand w-full"
                                    placeholder="Recording title..."
                                    autoFocus
                                />
                                <div className="flex gap-3 justify-center">
                                    <button
                                        onClick={handleSaveTitle}
                                        disabled={
                                            isUpdating ||
                                            editTitle.trim() === ""
                                        }
                                        className="rounded-lg border border-green-700 bg-green-900/20 text-green-400 px-6 py-2 text-sm font-medium hover:bg-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isUpdating ? (
                                            <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin"></div>
                                        ) : (
                                            "Save"
                                        )}
                                    </button>
                                    <button
                                        onClick={handleCancelEditTitle}
                                        disabled={isUpdating}
                                        className="rounded-lg border border-slate-700 text-slate-300 px-6 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="max-w-4xl mx-auto text-center">
                                <h1
                                    className="text-2xl md:text-3xl font-bold text-white cursor-pointer hover:text-brand transition-colors mb-2"
                                    onClick={handleStartEditTitle}
                                    title="Click to edit title"
                                >
                                    {recording.title}
                                </h1>
                                <p className="text-sm text-slate-400">
                                    {formatDate(
                                        recording.recordedAt ??
                                            recording.createdAt
                                    )}{" "}
                                    • {formatDuration(recording.durationMs)}
                                </p>
                            </div>
                        )}
                    </div>
                    {/* Main Waveform Area - Takes up most of the space */}
                    <div className="flex-1 relative bg-slate-950/60 overflow-hidden">
                        {/* Waveform Display */}
                        <div className="relative h-full flex items-center justify-center p-8">
                            <div
                                ref={waveformRef}
                                className="w-full max-w-4xl mx-auto cursor-pointer group"
                                onClick={(e) => {
                                    if (
                                        wavesurferRef.current &&
                                        isWaveformReady
                                    ) {
                                        // Check if clicking on waveform itself (not just the container)
                                        if (
                                            e.target === waveformRef.current ||
                                            waveformRef.current?.contains(
                                                e.target as Node
                                            )
                                        ) {
                                            const rect =
                                                waveformRef.current.getBoundingClientRect();
                                            const percent =
                                                (e.clientX - rect.left) /
                                                rect.width;
                                            const duration =
                                                wavesurferRef.current.getDuration();
                                            console.log("Waveform click:", {
                                                percent,
                                                duration,
                                                seekTo: percent,
                                            });
                                            wavesurferRef.current.seekTo(
                                                percent
                                            );
                                        } else {
                                            // Toggle play/pause when clicking container but not waveform
                                            if (isPlaying) {
                                                wavesurferRef.current.pause();
                                            } else {
                                                wavesurferRef.current.play();
                                            }
                                        }
                                    }
                                }}
                            >
                                {!isWaveformReady && audioSrc && (
                                    <div className="flex items-center justify-center h-full">
                                        <div className="flex items-center gap-3 text-slate-500">
                                            <div className="w-6 h-6 border-2 border-slate-600 border-t-orange-500 rounded-full animate-spin"></div>
                                            <span className="text-lg">
                                                Loading waveform...
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {!audioSrc && (
                                    <div className="flex items-center justify-center h-full">
                                        <p className="text-slate-500 text-lg">
                                            No audio available
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Volume Control - Top right, visible on hover */}
                            <div className="absolute top-8 right-8 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2">
                                <svg
                                    className="w-5 h-5 text-white/80"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                                    />
                                </svg>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={volume}
                                    onChange={(e) => {
                                        const newVolume = parseFloat(
                                            e.target.value
                                        );
                                        setVolume(newVolume);
                                        if (wavesurferRef.current) {
                                            wavesurferRef.current.setVolume(
                                                newVolume
                                            );
                                        }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-24 h-1 accent-orange-500 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                    ;{/* Bottom Controls Section */}
                    <div className="bg-slate-900/80 backdrop-blur-sm border-t border-slate-800/50 p-6 flex-shrink-0">
                        {/* Media Playback Controls */}
                        <div className="flex items-center justify-center gap-8 md:gap-12">
                            {/* Skip Backward 10s Button */}
                            <button
                                onClick={() => {
                                    if (
                                        wavesurferRef.current &&
                                        isWaveformReady
                                    ) {
                                        wavesurferRef.current.skip(-5);
                                    }
                                }}
                                disabled={!isWaveformReady}
                                className="w-16 h-16 md:w-14 md:h-14 rounded-full bg-slate-700/80 text-white flex items-center justify-center hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                                title="Skip backward 5 seconds"
                            >
                                <svg
                                    className="w-6 h-6 md:w-5 md:h-5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z" />
                                </svg>
                            </button>
                            {/* Play/Pause Button */}
                            <button
                                onClick={() => {
                                    if (
                                        wavesurferRef.current &&
                                        isWaveformReady
                                    ) {
                                        if (isPlaying) {
                                            wavesurferRef.current.pause();
                                        } else {
                                            wavesurferRef.current.play();
                                        }
                                    }
                                }}
                                disabled={!isWaveformReady}
                                className="w-24 h-24 md:w-20 md:h-20 rounded-full bg-orange-500 text-white flex items-center justify-center hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-2xl hover:shadow-3xl transform hover:scale-105 active:scale-95"
                            >
                                {isPlaying ? (
                                    <svg
                                        className="w-10 h-10 md:w-8 md:h-8"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                    </svg>
                                ) : (
                                    <svg
                                        className="w-10 h-10 md:w-8 md:h-8 ml-1"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                )}
                            </button>
                            {/* Skip Forward 10s Button */}
                            <button
                                onClick={() => {
                                    if (
                                        wavesurferRef.current &&
                                        isWaveformReady
                                    ) {
                                        wavesurferRef.current.skip(10);
                                    }
                                }}
                                disabled={!isWaveformReady}
                                className="w-16 h-16 md:w-14 md:h-14 rounded-full bg-slate-700/80 text-white flex items-center justify-center hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                                title="Skip forward 10 seconds"
                            >
                                <svg
                                    className="w-6 h-6 md:w-5 md:h-5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z" />
                                </svg>
                            </button>
                        </div>

                        {/* Speed Control and Time Display */}
                        <div className="flex items-center justify-between mt-6 px-4">
                            {/* Speed Control */}
                            <div className="flex items-center gap-3">
                                <label
                                    htmlFor="playback-speed"
                                    className="text-sm text-slate-400 sr-only"
                                >
                                    Speed:
                                </label>
                                <select
                                    id="playback-speed"
                                    value={playbackSpeed}
                                    onChange={(e) =>
                                        setPlaybackSpeed(
                                            parseFloat(e.target.value)
                                        )
                                    }
                                    disabled={!isWaveformReady}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 bg-slate-800 text-white border border-slate-600 focus:border-brand focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`}
                                >
                                    <option value={0.5}>0.5x</option>
                                    <option value={0.75}>0.75x</option>
                                    <option value={1}>1x</option>
                                    <option value={1.25}>1.25x</option>
                                    <option value={1.5}>1.5x</option>
                                    <option value={2}>2x</option>
                                </select>
                            </div>

                            {/* Time Display */}
                            <div className="text-white/90 font-mono text-lg">
                                {formatTime(currentTime)} /{" "}
                                {formatTime(
                                    recording?.durationMs
                                        ? recording.durationMs / 1000
                                        : 0
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-xl p-6 max-w-md mx-4 border border-slate-700">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-rose-500/20 flex items-center justify-center">
                                <svg
                                    className="w-6 h-6 text-rose-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">
                                    Delete Recording
                                </h3>
                                <p className="text-sm text-slate-400">
                                    This action cannot be undone
                                </p>
                            </div>
                        </div>

                        <p className="text-slate-300 mb-6">
                            Are you sure you want to delete "
                            <span className="font-medium text-white">
                                {recording?.title}
                            </span>
                            "? This will permanently remove the recording and
                            its audio file.
                        </p>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteRecording}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm bg-rose-600 text-white hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <svg
                                            className="w-4 h-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            />
                                        </svg>
                                        Delete Recording
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function formatDate(isoString: string | null): string {
    if (!isoString) return "Unknown date";
    try {
        return new Date(isoString).toLocaleString();
    } catch {
        return isoString;
    }
}

function formatDuration(durationMs: number | null | undefined): string {
    if (!durationMs || durationMs <= 0) return "0:00";
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
}

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
    return `${mins}:${secs}`;
}

function formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return "0 B";

    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function getFormatName(contentType: string): string {
    if (!contentType) return "Unknown";

    const mimeToFormat: Record<string, string> = {
        "audio/webm": "WebM Audio",
        "audio/ogg": "OGG Audio",
        "audio/mpeg": "MP3 Audio",
        "audio/wav": "WAV Audio",
        "audio/mp4": "M4A Audio",
        "audio/aac": "AAC Audio",
        "audio/flac": "FLAC Audio",
        "audio/mp3": "MP3 Audio", // Some browsers use audio/mp3
    };

    return (
        mimeToFormat[contentType.toLowerCase()] ||
        contentType.split("/")[1]?.toUpperCase() ||
        "Audio"
    );
}
