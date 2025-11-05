import { type ReactNode, createContext, useContext, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useAuth } from '../lib/authStore';
import { Sidebar } from './Sidebar';
import { RecordingView } from './RecordingView';
import { RecordingScreen } from './RecordingScreen';

type AppShellProps = {
  children: ReactNode;
};

interface RecordingContextType {
  selectedRecordingId: string | null;
  setSelectedRecordingId: (id: string | null) => void;
  isRecordingMode: boolean;
  setRecordingMode: (enabled: boolean) => void;
}

const RecordingContext = createContext<RecordingContextType | undefined>(undefined);

export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within an AppShell');
  }
  return context;
}

export function AppShell({ children }: AppShellProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  const [isRecordingMode, setRecordingMode] = useState<boolean>(false);

  const handleRecordingComplete = (recordingId: string) => {
    setSelectedRecordingId(recordingId);
    setRecordingMode(false);
  };

  // Simple navigation handlers
  const handleNewRecording = () => {
    setRecordingMode(true);
    setSelectedRecordingId(null); // Clear recording selection when entering recording mode
  };

  const handleRecordingSelect = (recordingId: string | null) => {
    setSelectedRecordingId(recordingId);
    setRecordingMode(false); // Exit recording mode when selecting a recording
  };

  return (
      <RecordingContext.Provider
          value={{ selectedRecordingId, setSelectedRecordingId, isRecordingMode, setRecordingMode }}
      >
          <div className="flex min-h-screen bg-slate-950 text-slate-100">
              <Sidebar
                  selectedRecordingId={selectedRecordingId}
                  onRecordingSelect={handleRecordingSelect}
                  currentPath={location.pathname}
                  onNewRecording={handleNewRecording}
              />

              <div className="flex flex-1 flex-col">
                  <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3 backdrop-blur">
                      <div className="flex items-center gap-3 ml-auto">
                          <div className="flex items-center gap-2">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-white">
                                  {user?.displayName
                                      ?.slice(0, 1)
                                      ?.toUpperCase() ?? "U"}
                              </div>
                              <div className="hidden flex-col text-xs text-slate-400 sm:flex">
                                  <span className="text-slate-200">
                                      {user?.displayName ??
                                          user?.email ??
                                          "Unknown user"}
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

                  <main className="flex-1 overflow-hidden">
                      {/* Priority order: recording screen > recording view > main content */}
                      {isRecordingMode ? (
                          <RecordingScreen
                              onClose={() => setRecordingMode(false)}
                              onRecordingComplete={handleRecordingComplete}
                          />
                      ) : selectedRecordingId ? (
                          <RecordingView recordingId={selectedRecordingId} />
                      ) : (
                          <div className="flex-1 overflow-y-auto p-4 lg:p-8">
                              {children}
                          </div>
                      )}
                  </main>
              </div>
          </div>
      </RecordingContext.Provider>
  );
}
