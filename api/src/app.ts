import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import { registerHealthRoutes } from './routes/health.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerRecordingRoutes } from './routes/recordings.js';
import type { AppConfig } from './settings.js';

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.logLevel } });

  await app.register(fastifyCors, {
    origin: config.corsOrigin,
    credentials: true
  });

  await app.register(fastifyCookie, {
    parseOptions: {
      secure: config.cookieSecure,
      sameSite: config.cookieSecure ? 'strict' : 'lax',
      httpOnly: true
    }
  });

  await app.register(async (instance) => {
    await registerHealthRoutes(instance);
    await registerAuthRoutes(instance);
    await registerRecordingRoutes(instance);
  });

  return app;
}
