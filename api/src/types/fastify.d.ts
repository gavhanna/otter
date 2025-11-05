import 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { AppConfig } from '../settings.js';
import type { PublicUser } from '../services/userService.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    db: BetterSQLite3Database;
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<FastifyReply | void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<FastifyReply | void>;
  }

  interface FastifyRequest {
    db: BetterSQLite3Database;
    authUser: PublicUser | null;
  }
}
