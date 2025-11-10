import { createFileRoute } from "@tanstack/react-router";
import { RecordingView } from "../../components/RecordingView";
import { useMobileSidebar } from "../../components/AppShell";

export const Route = createFileRoute("/_app/recording/$recordingId")({
    component: RecordingDetailRoute,
});

function RecordingDetailRoute() {
    const navigate = Route.useNavigate();
    const params = Route.useParams();
    const { openSidebar } = useMobileSidebar();

    return (
        <RecordingView
            recordingId={params.recordingId}
            onRecordingDeleted={() => {
                openSidebar();
                void navigate({ to: "/", search: { autoStart: false } });
            }}
            onClose={() => {
                void navigate({ to: "/", search: { autoStart: false } });
            }}
        />
    );
}
