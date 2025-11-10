import { Outlet, createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../lib/authStore';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

function AppLayout() {
  return (
    <RequireAuth>
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireAuth>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const navigate = Route.useNavigate();

  useEffect(() => {
    if (status === 'idle' || status === 'error') {
      void navigate({ to: '/login' });
    }
  }, [status, navigate]);

  if (status !== 'authenticated') {
    return null;
  }

  return <>{children}</>;
}
