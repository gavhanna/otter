import { useNavigate } from '@tanstack/react-router';

export function RecentPage() {
  const navigate = useNavigate();

  const handleNewRecording = () => {
    void navigate({ to: '/', search: { autoStart: true } });
  };

  return (
    <div className="space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-slate-800 flex items-center justify-center">
          <svg className="w-12 h-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Recent Recordings</h1>
        <p className="text-lg text-slate-400 mb-8">
          View your recordings from the last 7 days. Select any recording from the sidebar to see details.
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
          <p>• Recent recordings are shown in the sidebar by default</p>
          <p>• Click the "Recent" tab to filter recordings from the last 7 days</p>
          <p>• Switch between tabs to see different recording views</p>
        </div>
      </div>
    </div>
  );
}
