import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/authStore";
import packageJson from "../../package.json";
import { useRecordingsQuery } from "../hooks/recordings";

const UI_VERSION = packageJson.version ?? "0.0.0";

interface SidebarProps {
    selectedRecordingId: string | null;
    onRecordingSelect: (id: string) => void;
    onNewRecording: (options?: { autoStart?: boolean }) => void;
    onCloseMobile?: () => void;
}

export function Sidebar({
    selectedRecordingId,
    onRecordingSelect,
    onNewRecording,
    onCloseMobile,
}: SidebarProps) {
    const { user, status } = useAuth();
    const [sidebarTab, setSidebarTab] = useState<"all" | "favourites">("all");

    const {
        data: recordingsData,
        isLoading: isLoadingRecordings,
        error: recordingsError,
    } = useRecordingsQuery(status === "authenticated");

    const { data: storageData, isLoading: isLoadingStorage } = useQuery({
        queryKey: ["storage"],
        queryFn: async () => {
            const response = await api.getStorageUsage();
            return response.storage;
        },
        enabled: status === "authenticated",
        refetchInterval: 30000, // Refetch every 30 seconds
    });

    const { data: healthData, isLoading: isLoadingHealth } = useQuery({
        queryKey: ["health"],
        queryFn: () => api.getHealth(),
        refetchInterval: 5 * 60 * 1000,
    });

    const recordings = user ? (recordingsData ?? []) : [];
    const storageUsage = storageData || {
        formattedSize: "0 B",
        usagePercentage: 0,
        totalFiles: 0,
    };
    const apiVersion = healthData?.version ?? "0.0.0";

    // Filter recordings based on selected tab
    const filteredRecordings = recordings.filter((recording) => {
        switch (sidebarTab) {
            case "favourites":
                return recording.isFavourited === true;
            default:
                return true;
        }
    });

    // Group recordings by month
    const groupedRecordings = filteredRecordings.reduce(
        (groups, recording) => {
            const date = new Date(recording.recordedAt ?? recording.createdAt);
            const monthKey = formatMonthKey(date);

            if (!groups[monthKey]) {
                groups[monthKey] = {
                    monthLabel: formatMonthLabel(date),
                    recordings: [],
                };
            }

            groups[monthKey].recordings.push(recording);
            return groups;
        },
        {} as Record<
            string,
            { monthLabel: string; recordings: typeof recordings }
        >
    );

    // Convert to array and sort by month (most recent first)
    const sortedGroups = Object.entries(groupedRecordings)
        .sort(([a], [b]) => b.localeCompare(a))
        .map(([, group]) => group);

    return (
        <aside
            className="flex w-full flex-col border-b border-slate-800 bg-slate-900 md:h-screen md:w-80 md:border-b-0 md:border-r"
            style={{ height: "100dvh" }}
        >
            <div className="p-4 border-b border-slate-800">
                <div className="mb-6 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand text-slate-900 font-semibold">
                            <img
                                src="/favicon.svg"
                                alt="Otter Logo"
                                className="h-6 w-6"
                            />
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
                    {onCloseMobile && (
                        <button
                            onClick={onCloseMobile}
                            className="md:hidden rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
                        >
                            Close
                        </button>
                    )}
                </div>

                <button
                    onClick={() => onNewRecording({ autoStart: true })}
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

            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="px-4 py-3 border-b border-slate-800">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        {sidebarTab === "all" && "All Recordings"}
                        {sidebarTab === "favourites" && "Favourite Recordings"}
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
                            onClick={() => setSidebarTab("favourites")}
                            className={`flex-1 rounded px-2 py-1 text-xs transition ${
                                sidebarTab === "favourites"
                                    ? "bg-slate-700 text-white"
                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                            }`}
                        >
                            Favourites
                        </button>
                    </div>
                </div>

                <div className="px-4 py-3 space-y-2">
                    {recordingsError ? (
                        <div className="rounded-xl border border-rose-500 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                            Failed to load recordings.
                        </div>
                    ) : null}

                    {isLoadingRecordings ? (
                        <div className="space-y-2">
                            <SkeletonRow />
                            <SkeletonRow />
                            <SkeletonRow />
                        </div>
                    ) : filteredRecordings.length === 0 ? (
                        <div className="text-center py-8 text-sm text-slate-400">
                            {sidebarTab === "all" && "No recordings yet."}
                            {sidebarTab === "favourites" &&
                                "No favourite recordings."}
                        </div>
                    ) : (
                        sortedGroups.map((group) => (
                            <div key={group.monthLabel} className="mb-4">
                                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                    {group.monthLabel}
                                </h3>
                                <div className="space-y-2">
                                    {group.recordings.map((recording) => (
                                        <article
                                            key={recording.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() =>
                                                onRecordingSelect(recording.id)
                                            }
                                            onKeyDown={(event) => {
                                                if (
                                                    event.key === "Enter" ||
                                                    event.key === " "
                                                ) {
                                                    event.preventDefault();
                                                    onRecordingSelect(
                                                        recording.id
                                                    );
                                                }
                                            }}
                                            className={[
                                                "rounded-xl border p-3 transition focus:outline-none focus:ring-2 focus:ring-brand cursor-pointer",
                                                recording.id ===
                                                selectedRecordingId
                                                    ? "border-brand bg-brand/10 text-white"
                                                    : "border-slate-800 bg-slate-900/60 hover:border-brand hover:bg-slate-900",
                                            ].join(" ")}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-2 flex-1 min-w-0">
                                                    {recording.isFavourited && (
                                                        <svg
                                                            className="h-4 w-4 text-brand mt-0.5 flex-shrink-0"
                                                            fill="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                                                        </svg>
                                                    )}
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
                                                </div>
                                                <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                                                    {formatDuration(
                                                        recording.durationMs
                                                    )}
                                                </span>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-slate-800 space-y-4">
                <div className="space-y-1">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Storage
                    </h3>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>
                                {isLoadingStorage ? (
                                    <span className="flex items-center gap-1">
                                        <div className="w-3 h-3 border border-slate-600 border-t-brand rounded-full animate-spin"></div>
                                        Loading...
                                    </span>
                                ) : (
                                    `${storageUsage.totalFiles} file${
                                        storageUsage.totalFiles !== 1 ? "s" : ""
                                    }`
                                )}
                            </span>
                            <span>{storageUsage.formattedSize}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all duration-500 ease-out ${
                                    storageUsage.usagePercentage > 80
                                        ? "bg-rose-500"
                                        : storageUsage.usagePercentage > 60
                                          ? "bg-amber-500"
                                          : "bg-brand"
                                }`}
                                style={{
                                    width: `${Math.min(
                                        100,
                                        storageUsage.usagePercentage
                                    )}%`,
                                }}
                            ></div>
                        </div>
                        {storageUsage.usagePercentage > 60 && (
                            <div
                                className={`text-xs ${
                                    storageUsage.usagePercentage > 80
                                        ? "text-rose-400"
                                        : "text-amber-400"
                                }`}
                            >
                                {storageUsage.usagePercentage > 80
                                    ? "⚠️ Storage almost full"
                                    : "ℹ️ Storage getting full"}
                            </div>
                        )}
                    </div>
                </div>
                <p className="text-xs text-slate-500 text-center">
                    <span>UI v{UI_VERSION}</span>
                    <span className="mx-2 text-slate-700">•</span>
                    <span>
                        API {isLoadingHealth ? "loading..." : `v${apiVersion}`}
                    </span>
                </p>
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

function formatMonthKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    return `${year}-${month}`;
}

function formatMonthLabel(date: Date): string {
    const now = new Date();
    const isCurrentYear = date.getFullYear() === now.getFullYear();

    const month = date.toLocaleDateString("en-US", {
        month: "long",
        year: isCurrentYear ? undefined : "numeric",
    });

    return month;
}
