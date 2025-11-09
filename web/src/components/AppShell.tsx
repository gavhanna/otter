import { type ReactNode, useCallback, useState } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useAuth } from '../lib/authStore';
import { Sidebar } from './Sidebar';
import { RecordingView } from './RecordingView';
import { RecordingScreen } from './RecordingScreen';
import { MobileRecordingList } from './MobileRecordingList';

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [isMobileRecorderOpen, setMobileRecorderOpen] = useState(false);
  const [autoStartTrigger, setAutoStartTrigger] = useState<number | null>(null);

  const isHomeRoute = location.pathname === '/';

  const clearAutoStartTrigger = useCallback(() => {
    setAutoStartTrigger(null);
  }, []);

  const handleRecordingComplete = (recordingId: string) => {
    setSelectedRecordingId(recordingId);
    setMobileRecorderOpen(false);
    clearAutoStartTrigger();
  };

  const handleNewRecording = (options?: { autoStart?: boolean }) => {
    setSelectedRecordingId(null);
    setMobileRecorderOpen(true);
    setAutoStartTrigger(options?.autoStart ? Date.now() : null);
    void navigate({ to: '/' });
  };

  const handleRecordingSelect = (recordingId: string | null) => {
    setSelectedRecordingId(recordingId);
    setMobileRecorderOpen(false);
    clearAutoStartTrigger();
  };

  const handleRecordingDeleted = () => {
    setSelectedRecordingId(null);
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:flex">
        <Sidebar
          selectedRecordingId={selectedRecordingId}
          onRecordingSelect={handleRecordingSelect}
          currentPath={location.pathname}
          onNewRecording={handleNewRecording}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col">
        {/* Desktop Header - Hidden on mobile */}
        <header className="hidden md:flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
                {user?.displayName?.slice(0, 1)?.toUpperCase() ?? 'U'}
              </div>
              <div className="hidden flex-col text-xs text-slate-400 sm:flex">
                <span className="text-slate-200">
                  {user?.displayName ?? user?.email ?? 'Unknown user'}
                </span>
                <button
                  className="text-left text-xs text-brand hover:underline"
                  onClick={() => {
                    void logout();
                  }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative">
          {/* Mobile Layout: Fullscreen recording and player views */}
          <div className="md:hidden h-full">
            {isMobileRecorderOpen ? (
              <RecordingScreen
                autoStartTrigger={autoStartTrigger}
                onAutoStartConsumed={clearAutoStartTrigger}
                onClose={() => {
                  setMobileRecorderOpen(false);
                  clearAutoStartTrigger();
                }}
                onRecordingComplete={handleRecordingComplete}
              />
            ) : selectedRecordingId ? (
              <RecordingView
                recordingId={selectedRecordingId}
                onRecordingDeleted={handleRecordingDeleted}
                onClose={() => setSelectedRecordingId(null)}
              />
            ) : (
              <div className="h-full relative">
                <MobileRecordingList
                  onRecordingSelect={handleRecordingSelect}
                  onNewRecording={handleNewRecording}
                />
              </div>
            )}
          </div>

          {/* Desktop Layout: Traditional sidebar + content */}
          <div className="hidden md:flex h-full flex-1">
            {selectedRecordingId ? (
              <RecordingView
                recordingId={selectedRecordingId}
                onRecordingDeleted={handleRecordingDeleted}
                onClose={() => setSelectedRecordingId(null)}
              />
            ) : isHomeRoute ? (
              <RecordingScreen
                onRecordingComplete={handleRecordingComplete}
              />
            ) : (
              <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                {children}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
