import { createHash, randomUUID } from 'node:crypto';
import { mkdirSync, createWriteStream } from 'node:fs';
import { unlink } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { PassThrough } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { desc, eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { recordingAssets, recordings, users } from '../db/schema.js';
import type { PublicUser } from './userService.js';

type RecordingRow = {
  id: string;
  title: string;
  description: string | null;
  durationMs: number | null;
  recordedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string | null;
  ownerEmail: string | null;
  ownerDisplayName: string | null;
};

export type RecordingSummary = {
  id: string;
  title: string;
  description: string | null;
  durationMs: number;
  recordedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    email: string;
    displayName: string | null;
  } | null;
};

export type CreateRecordingInput = {
  title: string;
  description?: string | null;
  durationMs?: number | null;
  recordedAt?: string | number | Date | null;
};

export type RecordingListFilters = {
  ownerId?: string;
};

export type AudioUpload = {
  filename?: string;
  mimetype?: string;
  stream: NodeJS.ReadableStream;
};

export async function listRecordings(
  db: BetterSQLite3Database,
  viewer: PublicUser,
  filters: RecordingListFilters = {}
): Promise<RecordingSummary[]> {
  let whereClause;
  if (viewer.role !== 'admin') {
    whereClause = eq(recordings.ownerId, viewer.id);
  } else if (filters.ownerId) {
    whereClause = eq(recordings.ownerId, filters.ownerId);
  }

  const baseQuery = db
    .select({
      id: recordings.id,
      title: recordings.title,
      description: recordings.description,
      durationMs: recordings.durationMs,
      recordedAt: recordings.recordedAt,
      createdAt: recordings.createdAt,
      updatedAt: recordings.updatedAt,
      ownerId: recordings.ownerId,
      ownerEmail: users.email,
      ownerDisplayName: users.displayName
    })
    .from(recordings)
    .leftJoin(users, eq(recordings.ownerId, users.id));

  const filteredQuery = whereClause ? baseQuery.where(whereClause) : baseQuery;

  const rows = await filteredQuery.orderBy(desc(recordings.recordedAt), desc(recordings.createdAt));
  return rows.map(mapRowToSummary);
}

export async function createRecording(
  db: BetterSQLite3Database,
  owner: PublicUser,
  input: CreateRecordingInput
): Promise<RecordingSummary> {
  const recordingId = await insertRecording(db, prepareRecordingValues(owner, input));
  const recording = await getRecordingForViewer(db, owner, recordingId);
  if (!recording) {
    throw new Error('Recording not found after creation');
  }
  return recording;
}

export async function createRecordingWithFile(
  db: BetterSQLite3Database,
  owner: PublicUser,
  storageDir: string,
  input: CreateRecordingInput,
  audio: AudioUpload
): Promise<RecordingSummary> {
  const values = prepareRecordingValues(owner, input);
  const recordingId = await insertRecording(db, values);

  let stored: PersistedRecordingFile | null = null;
  try {
    stored = await persistRecordingFile(storageDir, owner.id, recordingId, audio);

    await db.insert(recordingAssets).values({
      recordingId,
      storagePath: stored.storagePath,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      checksum: stored.checksum
    });
  } catch (error) {
    await db.delete(recordings).where(eq(recordings.id, recordingId));
    if (stored) {
      await safeUnlink(join(storageDir, stored.storagePath));
    }
    throw error;
  }

  const recording = await getRecordingForViewer(db, owner, recordingId);
  if (!recording) {
    throw new Error('Recording not found after creation');
  }
  return recording;
}

export async function getRecordingForViewer(
  db: BetterSQLite3Database,
  viewer: PublicUser,
  recordingId: string
): Promise<RecordingSummary | null> {
  const [row] = await db
    .select({
      id: recordings.id,
      title: recordings.title,
      description: recordings.description,
      durationMs: recordings.durationMs,
      recordedAt: recordings.recordedAt,
      createdAt: recordings.createdAt,
      updatedAt: recordings.updatedAt,
      ownerId: recordings.ownerId,
      ownerEmail: users.email,
      ownerDisplayName: users.displayName
    })
    .from(recordings)
    .leftJoin(users, eq(recordings.ownerId, users.id))
    .where(eq(recordings.id, recordingId))
    .limit(1);

  if (!row) {
    return null;
  }

  const isOwner = row.ownerId === viewer.id;
  if (viewer.role !== 'admin' && !isOwner) {
    return null;
  }

  return mapRowToSummary(row);
}

export async function ensureRecordingAccess(
  db: BetterSQLite3Database,
  viewer: PublicUser,
  recordingId: string
): Promise<RecordingSummary | null> {
  return getRecordingForViewer(db, viewer, recordingId);
}

type RecordingInsertValues = {
  ownerId: string;
  title: string;
  description: string | null;
  durationMs: number;
  recordedAt: Date;
};

type PersistedRecordingFile = {
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  checksum: string;
};

async function insertRecording(db: BetterSQLite3Database, values: RecordingInsertValues): Promise<string> {
  const [inserted] = await db
    .insert(recordings)
    .values(values)
    .returning({
      id: recordings.id
    });

  if (!inserted) {
    throw new Error('Failed to create recording');
  }

  return inserted.id;
}

function prepareRecordingValues(owner: PublicUser, input: CreateRecordingInput): RecordingInsertValues {
  const title = (input.title ?? '').trim();
  if (title.length === 0) {
    throw new Error('Title is required');
  }

  const description = input.description ? input.description.trim() : null;
  const durationMs = normalizeDuration(input.durationMs);
  const recordedAt = parseRecordedAt(input.recordedAt) ?? new Date();

  return {
    ownerId: owner.id,
    title,
    description,
    durationMs,
    recordedAt
  };
}

async function persistRecordingFile(
  storageDir: string,
  ownerId: string,
  recordingId: string,
  audio: AudioUpload
): Promise<PersistedRecordingFile> {
  const extension = inferExtension(audio.mimetype, audio.filename);
  const relativePath = join(ownerId, `${recordingId}-${randomUUID()}${extension}`);
  const absolutePath = join(storageDir, relativePath);

  mkdirSync(dirname(absolutePath), { recursive: true });

  const hash = createHash('sha256');
  const passThrough = new PassThrough();
  let sizeBytes = 0;

  passThrough.on('data', (chunk: Buffer) => {
    sizeBytes += chunk.length;
    hash.update(chunk);
  });

  try {
    await pipeline(audio.stream, passThrough, createWriteStream(absolutePath));
  } catch (error) {
    await safeUnlink(absolutePath);
    throw error;
  }

  return {
    storagePath: relativePath,
    contentType: audio.mimetype ?? 'application/octet-stream',
    sizeBytes,
    checksum: hash.digest('hex')
  };
}

async function safeUnlink(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error: any) {
    if (error && error.code !== 'ENOENT') {
      throw error;
    }
  }
}

function inferExtension(mimetype?: string, filename?: string): string {
  const normalizedMime = mimetype?.split(';')[0]?.toLowerCase();
  const mimeMap: Record<string, string> = {
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/mp4': '.m4a',
    'audio/aac': '.aac',
    'audio/flac': '.flac'
  };

  if (normalizedMime && mimeMap[normalizedMime]) {
    return mimeMap[normalizedMime];
  }

  if (filename) {
    const existing = extname(filename);
    if (existing) {
      return existing;
    }
  }

  return '.webm';
}

function mapRowToSummary(row: RecordingRow): RecordingSummary {
  const owner =
    row.ownerId && row.ownerEmail
      ? {
          id: row.ownerId,
          email: row.ownerEmail,
          displayName: row.ownerDisplayName ?? null
        }
      : null;

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    durationMs: row.durationMs ?? 0,
    recordedAt: toIsoString(row.recordedAt),
    createdAt: toIsoString(row.createdAt) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updatedAt) ?? new Date().toISOString(),
    owner
  };
}

function toIsoString(value: Date | null | undefined): string | null {
  if (!value) return null;
  try {
    return new Date(value).toISOString();
  } catch {
    return null;
  }
}

function normalizeDuration(value?: number | null): number {
  if (value === null || value === undefined) return 0;
  const sanitized = Math.max(0, Math.round(value));
  return Number.isFinite(sanitized) ? sanitized : 0;
}

function parseRecordedAt(value: CreateRecordingInput['recordedAt']): Date | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }
  if (typeof value === 'string') {
    const fromString = new Date(value);
    return Number.isNaN(fromString.getTime()) ? null : fromString;
  }
  return null;
}
