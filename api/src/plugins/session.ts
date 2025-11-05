import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { findActiveUserById } from '../services/userService.js';

export const sessionPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest('authUser', null);

  app.addHook('preHandler', async (request, reply) => {
    if (request.authUser) return;
    const token = request.cookies[app.config.sessionCookieName];
    if (!token) return;

    try {
      const payload = await request.jwtVerify<{ sub: string; role: 'admin' | 'user' }>();
      if (!payload.sub) return;

      const user = await findActiveUserById(app.db, payload.sub);
      if (!user) {
        reply.clearCookie(app.config.sessionCookieName, { path: '/' });
        request.authUser = null;
        return;
      }
      request.authUser = user;
    } catch (error) {
      request.log.debug({ err: error }, 'Failed to verify session token');
      reply.clearCookie(app.config.sessionCookieName, { path: '/' });
      request.authUser = null;
    }
  });

  app.decorate('authenticate', async function (request, reply) {
    if (!request.authUser) {
      reply.clearCookie(this.config.sessionCookieName, { path: '/' });
      return reply.status(401).send({ message: 'Authentication required' });
    }
  });

  app.decorate('requireAdmin', async function (request, reply) {
    const authResponse = await this.authenticate(request, reply);
    if (authResponse !== undefined) return authResponse;

    if (request.authUser?.role !== 'admin') {
      return reply.status(403).send({ message: 'Admin access required' });
    }
  });
});

export type SessionPlugin = typeof sessionPlugin;
