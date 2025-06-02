import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '../../db';
import { TRPCError } from '@trpc/server';

// Admin middleware to ensure only admin users can access these endpoints
const isAdmin = protectedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.user.isAdmin) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Admin access required',
    });
  }
  return next();
});

export const adminRouter = router({
  // List all users
  listUsers: isAdmin.query(async () => {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return users;
  }),

  // Get user details
  getUser: isAdmin
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          email: true,
          username: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
          recordings: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true,
            },
          },
        },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  // Update user (admin can update any user's details)
  updateUser: isAdmin
    .input(
      z.object({
        userId: z.string(),
        email: z.string().email().optional(),
        username: z.string().min(3).optional(),
        isAdmin: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const { userId, ...updateData } = input;

      // Check if new email/username is already taken
      if (updateData.email || updateData.username) {
        const existingUser = await prisma.user.findFirst({
          where: {
            AND: [
              { id: { not: userId } },
              {
                OR: [
                  ...(updateData.email ? [{ email: updateData.email }] : []),
                  ...(updateData.username ? [{ username: updateData.username }] : []),
                ],
              },
            ],
          },
        });

        if (existingUser) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Email or username already taken',
          });
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          username: true,
          isAdmin: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return updatedUser;
    }),

  // Delete user
  deleteUser: isAdmin
    .input(
      z.object({
        userId: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Prevent admin from deleting themselves
      if (input.userId === ctx.user.id) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Cannot delete your own admin account',
        });
      }

      await prisma.user.delete({
        where: { id: input.userId },
      });

      return { success: true };
    }),

  // List all recordings
  listRecordings: isAdmin.query(async () => {
    const recordings = await prisma.recording.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        transcript: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return recordings;
  }),
}); 