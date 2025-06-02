import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

export const appRouter = router({
  greeting: publicProcedure
    .input(
      z.object({
        name: z.string().optional(),
      }),
    )
    .query(({ input }) => {
      return {
        text: `Hello ${input.name ?? 'world'}`,
      };
    }),
});

export type AppRouter = typeof appRouter; 