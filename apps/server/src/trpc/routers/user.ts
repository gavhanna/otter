import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '../../db';
import bcrypt from 'bcryptjs';

export const userRouter = router({
  // Get current user's profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        isAdmin: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }),

  // Update user profile
  update: protectedProcedure
    .input(
      z.object({
        email: z.string().email().optional(),
        username: z.string().min(3).optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // Check if new email/username is already taken
      if (input.email || input.username) {
        const existingUser = await prisma.user.findFirst({
          where: {
            AND: [
              { id: { not: ctx.user.id } },
              {
                OR: [
                  ...(input.email ? [{ email: input.email }] : []),
                  ...(input.username ? [{ username: input.username }] : []),
                ],
              },
            ],
          },
        });

        if (existingUser) {
          throw new Error('Email or username already taken');
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
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

  // Change password
  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string(),
        newPassword: z.string().min(6),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.user.id },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const validPassword = await bcrypt.compare(input.currentPassword, user.password);
      if (!validPassword) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { password: hashedPassword },
      });

      return { success: true };
    }),
}); 