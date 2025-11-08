import { useRecording } from '../components/AppShell';

export function RecordingsPage() {
  const { setRecordingMode } = useRecording();

  const handleNewRecording = () => {
    setRecordingMode(true);
  };

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
          <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">All Recordings</h1>
        <p className="text-lg text-slate-400 mb-8">
          Select a recording from the sidebar to view details, transcripts, and more.
        </p>

        <button
          onClick={handleNewRecording}
          className="rounded-full bg-brand text-slate-950 hover:bg-orange-400 px-8 py-3 text-sm font-semibold transition-colors shadow-lg hover:shadow-xl flex items-center gap-2 mx-auto"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
          </svg>
          New Recording
        </button>

        <div className="mt-8 text-sm text-slate-500">
          <p>• Click on any recording in the sidebar to view its details</p>
          <p>• Use the tabs to filter between All, Recent, and Favourites</p>
          <p>• Record new audio using the "New Recording" button above</p>
        </div>
      </div>
    </div>
  );
}
