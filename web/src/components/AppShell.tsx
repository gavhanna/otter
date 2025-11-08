import { type ReactNode, createContext, useContext, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { useAuth } from '../lib/authStore';
import { Sidebar } from './Sidebar';
import { RecordingView } from './RecordingView';
import { RecordingScreen } from './RecordingScreen';
import { MobileRecordingList } from './MobileRecordingList';

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
  const [isRecordingMode, setRecordingMode] = useState<boolean>(false); // Start in list mode by default for mobile

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

  const handleRecordingDeleted = () => {
    setSelectedRecordingId(null); // Clear selection when recording is deleted
  };

  return (
      <RecordingContext.Provider
          value={{ selectedRecordingId, setSelectedRecordingId, isRecordingMode, setRecordingMode }}
      >
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

                  <main className="flex-1 overflow-hidden relative">
                      {/* Mobile Layout: Fullscreen recording and player views */}
                      <div className="md:hidden h-full">
                          {isRecordingMode ? (
                              <RecordingScreen
                                  onClose={() => setRecordingMode(false)}
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
                      <div className="hidden md:flex h-full">
                          {isRecordingMode ? (
                              <RecordingScreen
                                  onClose={() => setRecordingMode(false)}
                                  onRecordingComplete={handleRecordingComplete}
                              />
                          ) : selectedRecordingId ? (
                              <RecordingView
                                recordingId={selectedRecordingId}
                                onRecordingDeleted={handleRecordingDeleted}
                                onClose={() => setSelectedRecordingId(null)}
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
      </RecordingContext.Provider>
  );
}
