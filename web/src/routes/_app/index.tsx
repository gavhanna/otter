import { useMemo } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { RecordingScreen } from '../../components/RecordingScreen';
import { useMobileSidebar } from '../../components/AppShell';

export const Route = createFileRoute('/_app/')({
  validateSearch: (search: Record<string, unknown>) => ({
    autoStart: search?.autoStart === true || search?.autoStart === 'true',
  }),
  component: RecorderRouteComponent,
});

function RecorderRouteComponent() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const { openSidebar } = useMobileSidebar();
  const autoStartTrigger = useMemo(
    () => (search.autoStart ? Date.now() : null),
    [search.autoStart]
  );

  const handleRecordingComplete = (recordingId: string) => {
    void navigate({ to: '/recording/$recordingId', params: { recordingId } });
  };

  const handleAutoStartConsumed = () => {
    if (search.autoStart) {
      void navigate({ to: '/', replace: true, search: { autoStart: false } });
    }
  };

  return (
    <RecordingScreen
      autoStartTrigger={autoStartTrigger}
      onAutoStartConsumed={handleAutoStartConsumed}
      onRecordingComplete={handleRecordingComplete}
      onClose={openSidebar}
    />
  );
}
