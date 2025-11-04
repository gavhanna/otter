import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { AppConfig } from '../settings.js';

let db: BetterSQLite3Database | null = null;

export function getDb(config: AppConfig): BetterSQLite3Database {
  if (!db) {
    const sqlite = new Database(config.databasePath);
    sqlite.pragma('journal_mode = WAL');
    db = drizzle(sqlite);
  }

  return db;
}
