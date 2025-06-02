import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '../../db';

export const recordingRouter = router({
  // List user's recordings
  list: protectedProcedure.query(async ({ ctx }) => {
    const recordings = await prisma.recording.findMany({
      where: {
        userId: ctx.user.id,
      },
      include: {
        transcript: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return recordings;
  }),

  // Get a single recording
  get: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const recording = await prisma.recording.findUnique({
        where: {
          id: input.id,
        },
        include: {
          transcript: true,
        },
      });

      if (!recording) {
        throw new Error('Recording not found');
      }

      if (recording.userId !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      return recording;
    }),

  // Create a new recording
  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        filename: z.string(),
        filepath: z.string(),
        duration: z.number().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const recording = await prisma.recording.create({
        data: {
          ...input,
          userId: ctx.user.id,
          status: 'pending',
        },
      });

      return recording;
    }),

  // Delete a recording
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const recording = await prisma.recording.findUnique({
        where: {
          id: input.id,
        },
      });

      if (!recording) {
        throw new Error('Recording not found');
      }

      if (recording.userId !== ctx.user.id) {
        throw new Error('Unauthorized');
      }

      await prisma.recording.delete({
        where: {
          id: input.id,
        },
      });

      return { success: true };
    }),
}); 