import * as trpcExpress from '@trpc/server/adapters/express';
import { prisma } from '../db'; // Import Prisma client

// Created for each request
export const createContext = ({ req, res }: trpcExpress.CreateExpressContextOptions) => {
  // If you need to pass session or user data, you can extract it from req here
  // Example: const user = req.session?.user ?? null;
  return {
    // user,
    req,
    res,
    prisma, // Add prisma to the context
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>; 