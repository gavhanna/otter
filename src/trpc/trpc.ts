import { initTRPC } from '@trpc/server';
import { Context } from './context';

// Avoid exporting the entire t-object
// since it's not very descriptive. 
// Instead, create procedures and routers based on it.
const t = initTRPC.context<Context>().create();

// Base router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;
// export const protectedProcedure = t.procedure.use(/* your auth middleware */); // Placeholder for auth 