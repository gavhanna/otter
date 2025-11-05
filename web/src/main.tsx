import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter
} from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import { AppShell } from './components/AppShell';
import { RecordingsPage } from './pages/RecordingsPage';
import { RecentPage } from './pages/RecentPage';
import { FavouritesPage } from './pages/FavouritesPage';
import { LoginPage } from './pages/LoginPage';
import { AuthProvider } from './lib/authStore';

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  )
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage
});

const recordingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: RecordingsPage
});

const recentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recent',
  component: RecentPage
});

const favouritesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/favourites',
  component: FavouritesPage
});

const routeTree = rootRoute.addChildren([loginRoute, recordingsRoute, recentRoute, favouritesRoute]);

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
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
