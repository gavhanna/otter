import * as trpcExpress from '@trpc/server/adapters/express';
import { prisma } from '../db'; // Import Prisma client

// Created for each request
export const createContext = ({ req, res }: trpcExpress.CreateExpressContextOptions) => {
  return {
    req,
    res,
    prisma,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>; 