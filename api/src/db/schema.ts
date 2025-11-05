import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().default(sql`lower(hex(randomblob(16)))`),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  role: text('role', { enum: ['admin', 'user'] }).notNull().default('user'),
  passwordHash: text('password_hash').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const recordings = sqliteTable('recordings', {
  id: text('id').primaryKey().default(sql`lower(hex(randomblob(16)))`),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  durationMs: integer('duration_ms').default(0),
  recordedAt: integer('recorded_at', { mode: 'timestamp' }).default(sql`(unixepoch())`),
  isFavourited: integer('is_favourited', { mode: 'boolean' }).notNull().default(false),
  transcriptStatus: text('transcript_status'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const recordingAssets = sqliteTable('recording_assets', {
  id: text('id').primaryKey().default(sql`lower(hex(randomblob(16)))`),
  recordingId: text('recording_id')
    .notNull()
    .references(() => recordings.id, { onDelete: 'cascade' }),
  storagePath: text('storage_path').notNull(),
  contentType: text('content_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  checksum: text('checksum'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

export const settings = sqliteTable('settings', {
  id: integer('id').primaryKey(),
  registrationEnabled: integer('registration_enabled', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});
