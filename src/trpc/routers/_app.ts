import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

// You can import other routers here and merge them: 
// import { userRouter } from './user'; 

export const appRouter = router({
  // userRouter, // Example of merging another router
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
  // Add more procedures here
});

// Export type router type signature, 
// NOT the router itself.
export type AppRouter = typeof appRouter; 