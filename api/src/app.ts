import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import { registerHealthRoutes } from './routes/health.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerRecordingRoutes } from './routes/recordings.js';
import { registerAdminRoutes } from './routes/admin.js';
import { registerStorageRoutes } from './routes/storage.js';
import type { AppConfig } from './settings.js';
import { getDb } from './db/client.js';
import { sessionPlugin } from './plugins/session.js';

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

  await app.register(fastifyMultipart, {
    limits: {
      fileSize: 50 * 1024 * 1024,
      files: 1,
      fields: 10
    }
  });

  await app.register(sessionPlugin);

  await app.register(async (instance) => {
    await registerHealthRoutes(instance);
    await registerAuthRoutes(instance);
    await registerAdminRoutes(instance);
    await registerRecordingRoutes(instance);
    await registerStorageRoutes(instance);
  });

  return app;
}
