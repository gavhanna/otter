import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { AppConfig } from '../settings.js';
import { runMigrations } from './migrations.js';

let db: BetterSQLite3Database | null = null;

export function getDb(config: AppConfig): BetterSQLite3Database {
  if (!db) {
    const dbDir = dirname(config.databasePath);
    if (dbDir && dbDir.length > 0 && !existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }
    if (!existsSync(config.storageDir)) {
      mkdirSync(config.storageDir, { recursive: true });
    }

    const sqlite = new Database(config.databasePath);
    sqlite.pragma('journal_mode = WAL');
    runMigrations(sqlite);
    db = drizzle(sqlite);
  }

  return db;
}
