import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import './index.css';
import { AppShell, useMobileSidebar } from './components/AppShell';
import { RecentPage } from './pages/RecentPage';
import { FavouritesPage } from './pages/FavouritesPage';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider, useAuth } from './lib/authStore';
import { RecordingScreen } from './components/RecordingScreen';
import { RecordingView } from './components/RecordingView';

// Auth guard component for protected routes
function AuthGuard({ children }: { children: React.ReactNode }) {
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

  return <>{children}</>;
}

// Auth guard for login page (redirect if already authenticated)
function LoginGuard({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && status === 'authenticated') {
      void navigate({ to: '/' });
    }
  }, [user, status, navigate]);

  if (status === 'checking') {
    return null;
  }

  return <>{children}</>;
}

// Root route - provides auth context to all routes
const rootRoute = createRootRoute({
  component: () => (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  )
});

// Auth layout route - for login/register pages (no app shell)
const authLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'auth',
  component: () => (
    <LoginGuard>
      <Outlet />
    </LoginGuard>
  ),
});

const loginRoute = createRoute({
  getParentRoute: () => authLayoutRoute,
  path: '/login',
  component: LoginPage
});

// App layout route - for authenticated main application
const appLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: () => (
    <AuthGuard>
      <AppShell>
        <Outlet />
      </AppShell>
    </AuthGuard>
  )
});

const recordingsRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/',
  validateSearch: (search: Record<string, unknown>) => ({
    autoStart: search?.autoStart === true || search?.autoStart === 'true'
  }),
  component: RecorderRouteComponent
});

const recordingDetailRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/recording/$recordingId',
  component: RecordingDetailRouteComponent
});

const recentRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/recent',
  component: RecentPage
});

const favouritesRoute = createRoute({
  getParentRoute: () => appLayoutRoute,
  path: '/favourites',
  component: FavouritesPage
});

const routeTree = rootRoute.addChildren([
  authLayoutRoute.addChildren([loginRoute]),
  appLayoutRoute.addChildren([recordingsRoute, recordingDetailRoute, recentRoute, favouritesRoute])
]);

const router = createRouter({
  routeTree
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);

function RecorderRouteComponent() {
  const navigate = useNavigate();
  const { openSidebar } = useMobileSidebar();
  const search = recordingsRoute.useSearch();
  const autoStartTrigger = useMemo(() => (search.autoStart ? Date.now() : null), [search.autoStart]);

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

function RecordingDetailRouteComponent() {
  const navigate = useNavigate();
  const params = recordingDetailRoute.useParams();
  const { openSidebar } = useMobileSidebar();

  return (
      <RecordingView
          recordingId={params.recordingId}
          onRecordingDeleted={() => {
              openSidebar();
              void navigate({ to: "/" });
          }}
          onClose={() => {
              navigate({ to: "/" });
          }}
      />
  );
}
