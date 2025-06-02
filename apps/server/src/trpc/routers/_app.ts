import { router } from '../trpc';
import { authRouter } from './auth';
import { recordingRouter } from './recording';
import { userRouter } from './user';

export const appRouter = router({
  auth: authRouter,
  recording: recordingRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter; 