import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { AuthProvider } from '../lib/authStore';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

export type RouterContext = {
  queryClient: QueryClient;
};

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-right" />}
    </AuthProvider>
  );
}
