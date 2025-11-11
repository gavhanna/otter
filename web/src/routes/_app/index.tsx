import { useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useRecordingsQuery } from "../../hooks/recordings";

export const Route = createFileRoute("/_app/")({
    component: LatestRecordingRedirect,
});

function LatestRecordingRedirect() {
    const navigate = Route.useNavigate();
    const {
        data: recordings,
        isLoading,
        error,
        refetch,
    } = useRecordingsQuery(true);

    const latestRecording = useMemo(() => {
        if (!recordings || recordings.length === 0) {
            return null;
        }

        return [...recordings].sort(
            (a, b) =>
                getRecordingTimestamp(b) - getRecordingTimestamp(a)
        )[0];
    }, [recordings]);

    useEffect(() => {
        if (latestRecording) {
            void navigate({
                to: "/recording/$recordingId",
                params: { recordingId: latestRecording.id },
                replace: true,
            });
        }
    }, [latestRecording, navigate]);

    if (isLoading) {
        return (
            <EmptyState
                title="Loading your recordings"
                description="Fetching your most recent recording..."
            />
        );
    }

    if (error) {
        return (
            <EmptyState
                title="We couldn’t load your recordings"
                description={
                    error instanceof Error
                        ? error.message
                        : "Something went wrong. Please try again."
                }
                actionLabel="Try again"
                onAction={() => {
                    void refetch();
                }}
            />
        );
    }

    if (!latestRecording) {
        return (
            <EmptyState
                title="No recordings yet"
                description="Start a new recording to build your private audio library."
                actionLabel="Start recording"
                onAction={() => {
                    void navigate({ to: "/record" });
                }}
            />
        );
    }

    return null;
}

function getRecordingTimestamp(recording: {
    recordedAt: string | null;
    createdAt: string;
}) {
    return new Date(recording.recordedAt ?? recording.createdAt).getTime();
}

type EmptyStateProps = {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
};

function EmptyState({
    title,
    description,
    actionLabel,
    onAction,
}: EmptyStateProps) {
    return (
        <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-300">
            <div className="max-w-md space-y-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
                    <svg
                        className="h-8 w-8 text-slate-500"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 17v-6a3 3 0 016 0v6m-7 4h8a2 2 0 002-2v-8a8 8 0 10-12 0v8a2 2 0 002 2z"
                        />
                    </svg>
                </div>
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold text-white">
                        {title}
                    </h1>
                    <p className="text-slate-400">{description}</p>
                </div>
                {actionLabel ? (
                    <button
                        type="button"
                        onClick={onAction}
                        className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2 text-sm font-medium text-slate-950 hover:bg-brand/90"
                    >
                        {actionLabel}
                    </button>
                ) : null}
            </div>
        </div>
    );
}
