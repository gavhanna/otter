import { router } from '../trpc';
import { authRouter } from './auth';
import { recordingRouter } from './recording';

export const appRouter = router({
  auth: authRouter,
  recording: recordingRouter,
});

export type AppRouter = typeof appRouter; 