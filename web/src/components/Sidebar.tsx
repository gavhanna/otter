import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/authStore";

interface SidebarProps {
    selectedRecordingId: string | null;
    onRecordingSelect: (id: string | null) => void;
    currentPath: string;
}

export function Sidebar({
    selectedRecordingId,
    onRecordingSelect,
    currentPath,
}: SidebarProps) {
    const { user, status } = useAuth();
    const [sidebarTab, setSidebarTab] = useState<
        "all" | "recent" | "favorites"
    >("all");

    const { data, isLoading, error } = useQuery({
        queryKey: ["recordings"],
        queryFn: async () => {
            const response = await api.listRecordings();
            return response.recordings;
        },
        enabled: status === "authenticated",
    });

    const recordings = user ? data ?? [] : [];

    // Filter recordings based on selected tab
    const filteredRecordings = recordings.filter((recording) => {
        const recordingDate = new Date(
            recording.recordedAt ?? recording.createdAt
        );
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        switch (sidebarTab) {
            case "recent":
                return recordingDate >= sevenDaysAgo;
            case "favorites":
                // Placeholder: favoriting logic can be implemented later
                return (
                    recording.title.includes("important") ||
                    recording.id.includes("fav")
                );
            default:
                return true;
        }
    });

    const isMainRecordingsView = currentPath === "/";

    return (
        <aside className="hidden w-80 flex-col border-r border-slate-800 bg-slate-900 lg:flex">
            <div className="p-4 border-b border-slate-800">
                <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-slate-900 font-semibold">
                        OR
                    </div>
                    <div>
                        <div className="text-lg font-semibold">
                            Otter Recorder
                        </div>
                        <div className="text-sm text-slate-400">
                            Your private audio library
                        </div>
                    </div>
                </div>

                <button
                    onClick={() =>
                        document
                            .getElementById("recorder-panel")
                            ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 mt-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                    <svg
                        className="h-5 w-5"
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
                    New Recording
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-3 border-b border-slate-800">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        {sidebarTab === "all" && "All Recordings"}
                        {sidebarTab === "recent" && "Recent Recordings"}
                        {sidebarTab === "favorites" && "Favorite Recordings"}
                    </h3>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setSidebarTab("all")}
                            className={`flex-1 rounded px-2 py-1 text-xs transition ${
                                sidebarTab === "all"
                                    ? "bg-slate-700 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setSidebarTab("recent")}
                            className={`flex-1 rounded px-2 py-1 text-xs transition ${
                                sidebarTab === "recent"
                                    ? "bg-slate-700 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                        >
                            Recent
                        </button>
                        <button
                            onClick={() => setSidebarTab("favorites")}
                            className={`flex-1 rounded px-2 py-1 text-xs transition ${
                                sidebarTab === "favorites"
                                    ? "bg-slate-700 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                        >
                            Favorites
                        </button>
                    </div>
                </div>

                <div className="px-4 py-3 space-y-2">
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
                    ) : filteredRecordings.length === 0 ? (
                        <div className="text-center py-8 text-sm text-slate-400">
                            {sidebarTab === "all" && "No recordings yet."}
                            {sidebarTab === "recent" && "No recent recordings."}
                            {sidebarTab === "favorites" &&
                                "No favorite recordings."}
                        </div>
                    ) : (
                        filteredRecordings.map((recording) => (
                            <article
                                key={recording.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => onRecordingSelect(recording.id)}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === "Enter" ||
                                        event.key === " "
                                    ) {
                                        event.preventDefault();
                                        onRecordingSelect(recording.id);
                                    }
                                }}
                                className={[
                                    "rounded-xl border p-3 transition focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer",
                                    recording.id === selectedRecordingId
                                        ? "border-brand bg-brand/10 text-white"
                                        : "border-slate-800 bg-slate-900/60 hover:border-brand hover:bg-slate-900",
                                ].join(" ")}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-semibold text-slate-100 truncate">
                                            {recording.title}
                                        </h4>
                                        <p className="text-xs text-slate-500 mt-1">
                                            {formatDate(
                                                recording.recordedAt ??
                                                    recording.createdAt
                                            )}
                                        </p>
                                    </div>
                                    <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                                        {formatDuration(recording.durationMs)}
                                    </span>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-slate-800">
                <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Storage
                    </h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>Storage used</span>
                            <span>2.3 GB</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800">
                            <div className="h-2 w-1/4 rounded-full bg-brand"></div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}

function SkeletonRow() {
    return (
        <div className="h-16 animate-pulse rounded-xl bg-slate-800/50">
            <span className="sr-only">Loading</span>
        </div>
    );
}

function formatDate(isoString: string | null): string {
    if (!isoString) return "Unknown date";
    try {
        const date = new Date(isoString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return `Today, ${date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
            })}`;
        } else if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday, ${date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
            })}`;
        } else {
            return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year:
                    date.getFullYear() !== today.getFullYear()
                        ? "numeric"
                        : undefined,
            });
        }
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
