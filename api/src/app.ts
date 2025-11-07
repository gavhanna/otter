import Fastify, { type FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyJwt from '@fastify/jwt';
import fastifyMultipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
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

  app.addHook('onRequest', (request, _reply, done) => {
    const url = request.raw.url ?? '';
    if (url === '/api' || url === '/api/') {
      request.raw.url = '/';
    } else if (url.startsWith('/api/')) {
      request.raw.url = url.slice(4);
    } else if (url.startsWith('/api?')) {
      request.raw.url = `/?${url.slice(5)}`;
    }
    done();
  });

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

  if (config.uiDistPath) {
    const uiRoot = resolve(config.uiDistPath);
    if (existsSync(uiRoot)) {
      await app.register(fastifyStatic, {
        root: uiRoot,
        prefix: '/',
        decorateReply: true
      });

      app.setNotFoundHandler((request, reply) => {
        const acceptsHtml =
          typeof request.headers.accept === 'string' &&
          request.headers.accept.includes('text/html');
        if (request.method === 'GET' && acceptsHtml) {
          return reply.type('text/html').sendFile('index.html');
        }
        return reply.status(404).send({ message: 'Not Found' });
      });
    } else {
      app.log.warn({ uiRoot }, 'UI dist path configured but directory missing');
    }
  }

  return app;
}
