import { useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { RecorderPanel } from '../components/RecorderPanel';
import { useAuth } from '../lib/authStore';

export function RecentPage() {
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-4">Recent Recordings</h1>
        <p className="text-lg text-slate-400 mb-8">
          View your recordings from the last 7 days. Select any recording from the sidebar to see details.
        </p>

        <RecorderPanel />

        <div className="mt-8 text-sm text-slate-500">
          <p>• Recent recordings are shown in the sidebar by default</p>
          <p>• Click the "Recent" tab to filter recordings from the last 7 days</p>
          <p>• Switch between tabs to see different recording views</p>
        </div>
      </div>
    </div>
  );
}