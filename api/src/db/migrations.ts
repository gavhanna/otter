import type { Database as SQLiteDatabase } from 'better-sqlite3';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  password_hash TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS recordings (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  duration_ms INTEGER DEFAULT 0,
  recorded_at INTEGER DEFAULT (unixepoch()),
  is_favorited INTEGER NOT NULL DEFAULT 0,
  transcript_status TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS recording_assets (
  id TEXT PRIMARY KEY,
  recording_id TEXT NOT NULL REFERENCES recordings(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  checksum TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  registration_enabled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_recordings_owner ON recordings(owner_id);
CREATE INDEX IF NOT EXISTS idx_recording_assets_recording ON recording_assets(recording_id);
`;

export function runMigrations(sqlite: SQLiteDatabase): void {
  sqlite.exec('BEGIN');
  try {
    sqlite.exec(SCHEMA_SQL);

    // Ensure is_favorited column exists and has proper values
    try {
      // Add the column if it doesn't exist
      sqlite.exec('ALTER TABLE recordings ADD COLUMN is_favorited INTEGER NOT NULL DEFAULT 0');
    } catch (error: any) {
      // Column already exists, ignore error
      if (!error.message.includes('duplicate column name')) {
        throw error;
      }
    }

    // Update any NULL values to 0
    sqlite.prepare('UPDATE recordings SET is_favorited = 0 WHERE is_favorited IS NULL').run();

    sqlite
      .prepare(
        `INSERT OR IGNORE INTO settings (id, registration_enabled, created_at, updated_at)
         VALUES (1, 0, unixepoch(), unixepoch())`
      )
      .run();
    sqlite.exec('COMMIT');
  } catch (error) {
    sqlite.exec('ROLLBACK');
    throw error;
  }
}
