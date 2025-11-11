import { useEffect, useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RecordingScreen } from "../../components/RecordingScreen";
import { useMobileSidebar } from "../../components/AppShell";

export const Route = createFileRoute("/_app/record")({
    component: RecordRouteComponent,
});

function RecordRouteComponent() {
    const navigate = Route.useNavigate();
    const { openSidebar, closeSidebar } = useMobileSidebar();
    const autoStartTrigger = useMemo(() => Date.now(), []);

    useEffect(() => {
        closeSidebar();
        return () => {
            openSidebar();
        };
    }, [closeSidebar, openSidebar]);

    return (
        <RecordingScreen
            autoStartTrigger={autoStartTrigger}
            onRecordingComplete={(recordingId) => {
                openSidebar();
                void navigate({
                    to: "/recording/$recordingId",
                    params: { recordingId },
                });
            }}
            onClose={() => {
                openSidebar();
                void navigate({ to: "/", replace: true });
            }}
        />
    );
}
