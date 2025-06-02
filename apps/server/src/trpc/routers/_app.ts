import { router } from '../trpc';
import { authRouter } from './auth';
import { recordingRouter } from './recording';
import { userRouter } from './user';
import { adminRouter } from './admin';

export const appRouter = router({
  auth: authRouter,
  recording: recordingRouter,
  user: userRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter; 