import * as trpcExpress from '@trpc/server/adapters/express';

// Created for each request
export const createContext = ({ req, res }: trpcExpress.CreateExpressContextOptions) => {
  // If you need to pass session or user data, you can extract it from req here
  // Example: const user = req.session?.user ?? null;
  return {
    // user,
    req,
    res,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>; 