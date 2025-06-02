import { z } from 'zod';
import { router, publicProcedure } from '../trpc';
import { prisma } from '../../db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // TODO: Move to env

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        username: z.string().min(3),
        password: z.string().min(6),
      }),
    )
    .mutation(async ({ input }) => {
      const { email, username, password } = input;

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          // Check if this is the first user or matches ADMIN_USERNAME
          isAdmin: !(await prisma.user.findFirst()) || username === process.env.ADMIN_USERNAME,
        },
      });

      // Generate JWT
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: '7d',
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isAdmin: user.isAdmin,
        },
        token,
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { username, password } = input;

      // Find user
      const user = await prisma.user.findFirst({
        where: {
          OR: [{ username }, { email: username }],
        },
      });

      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: '7d',
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          isAdmin: user.isAdmin,
        },
        token,
      };
    }),
}); 