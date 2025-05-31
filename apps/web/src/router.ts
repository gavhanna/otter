import { RootRoute, Route, Router } from '@tanstack/react-router';
import App from './App'; // Assuming App.tsx is your root layout component
import { IndexRoute } from './routes/index'; // Import the new component

// Create a root route
const rootRoute = new RootRoute({
  component: App,
});

// Create an index route
const indexRoute = new Route({
  getParentRoute: () => rootRoute,
  path: '/',
  component: IndexRoute, // Use the imported component
});

// Create the route tree
const routeTree = rootRoute.addChildren([indexRoute]);

// Create the router instance
export const router = new Router({ routeTree });

// Register your router for maximum type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
} 