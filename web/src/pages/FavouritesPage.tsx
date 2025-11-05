import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { RecorderPanel } from '../components/RecorderPanel';
import { useAuth } from '../lib/authStore';

export function FavouritesPage() {
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Favourite Recordings</h1>
        <p className="text-lg text-slate-400 mb-8">
          Your starred recordings will appear here. Click the star icon on any recording to add it to your favourites.
        </p>

        <RecorderPanel />

        <div className="mt-8 text-sm text-slate-500">
          <p>• Click the star icon on any recording to favourite it</p>
          <p>• Favourite recordings are marked with a star in the sidebar</p>
          <p>• Use the "Favourites" tab to see only your starred recordings</p>
        </div>
      </div>
    </div>
  );
}