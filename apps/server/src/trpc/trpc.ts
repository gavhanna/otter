import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // TODO: Move to env

const t = initTRPC.context<Context>().create();

// Public procedure (no auth required)
export const publicProcedure = t.procedure;

// Middleware to verify JWT token
const isAuthed = t.middleware(async ({ ctx, next }) => {
  const token = ctx.req.headers.authorization?.split(' ')[1];

  if (!token) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'No token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await ctx.prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'User not found',
      });
    }

    return next({
      ctx: {
        ...ctx,
        user,
      },
    });
  } catch (error) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Invalid token',
    });
  }
});

// Protected procedure (requires auth)
export const protectedProcedure = t.procedure.use(isAuthed);

export const router = t.router; 