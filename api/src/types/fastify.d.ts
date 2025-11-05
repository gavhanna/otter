import 'fastify';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { AppConfig } from '../settings.js';

declare module 'fastify' {
  interface FastifyInstance {
    config: AppConfig;
    db: BetterSQLite3Database;
  }

  interface FastifyRequest {
    db: BetterSQLite3Database;
  }
}
