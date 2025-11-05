import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { RecorderPanel } from '../components/RecorderPanel';
import { useAuth } from '../lib/authStore';

export function RecordingsPage() {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status === 'idle' || status === 'error') {
      void navigate({ to: '/login' });
    }
  }, [status, navigate]);

  if (status !== 'authenticated') {
    return null;
  }

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

        <RecorderPanel />

        <div className="mt-8 text-sm text-slate-500">
          <p>• Click on any recording in the sidebar to view its details</p>
          <p>• Use the tabs to filter between All, Recent, and Favourites</p>
          <p>• Record new audio using the "New Recording" button</p>
        </div>
      </div>
    </div>
  );
}
