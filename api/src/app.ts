import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import { registerHealthRoutes } from './routes/health.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerRecordingRoutes } from './routes/recordings.js';
import type { AppConfig } from './settings.js';
import { getDb } from './db/client.js';

export async function buildApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({ logger: { level: config.logLevel } });
  const db = getDb(config);

  app.decorate('config', config);
  app.decorate('db', db);
  app.decorateRequest('db', { getter: () => db });

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

  await app.register(fastifyJwt, {
    secret: config.jwtSecret,
    cookie: {
      cookieName: config.sessionCookieName,
      signed: false
    }
  });

  await app.register(async (instance) => {
    await registerHealthRoutes(instance);
    await registerAuthRoutes(instance);
    await registerRecordingRoutes(instance);
  });

  return app;
}
