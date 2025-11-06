import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { and, desc, eq, sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { recordingAssets, recordings, users } from "../db/schema.js";
import type { PublicUser } from "./userService.js";
import { formatDefaultRecordingName } from "../utils/dateUtils.js";
import { getLocationFromIp, formatLocation, isLocalDevelopment, getLocalDevelopmentLocation, type LocationData } from "./locationService.js";

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
    isFavourited: boolean | null;
    location: string | null;
    locationLatitude: string | null;
    locationLongitude: string | null;
    locationSource: string | null;
    // Asset fields from JOIN (nullable)
    assetStoragePath: string | null;
    assetContentType: string | null;
    assetSizeBytes: number | null;
};

export type RecordingAsset = {
    recordingId: string;
    storagePath: string;
    contentType: string;
    sizeBytes: number;
};

export type RecordingSummary = {
    id: string;
    title: string;
    description: string | null;
    durationMs: number;
    recordedAt: string | null;
    createdAt: string;
    updatedAt: string;
    isFavourited: boolean;
    location: string | null;
    locationLatitude: number | null;
    locationLongitude: number | null;
    locationSource: 'ip' | 'manual' | 'geolocation' | null;
    owner: {
        id: string;
        email: string;
        displayName: string | null;
    } | null;
    asset: {
        sizeBytes: number;
        contentType: string;
    } | null;
};

export type CreateRecordingInput = {
    title: string;
    description?: string | null;
    durationMs?: number | null;
    recordedAt?: string | number | Date | null;
    location?: string | null;
    locationLatitude?: number | null;
    locationLongitude?: number | null;
    locationSource?: 'ip' | 'manual' | 'geolocation' | null;
};

export type RecordingListFilters = {
    ownerId?: string;
};

export type AudioUpload = {
    filename?: string;
    mimetype?: string;
    stream?: NodeJS.ReadableStream;
    buffer?: Buffer;
};

export async function listRecordings(
    db: BetterSQLite3Database,
    viewer: PublicUser,
    filters: RecordingListFilters = {}
): Promise<RecordingSummary[]> {
    let whereClause;
    if (viewer.role !== "admin") {
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
            isFavourited: recordings.isFavourited,
            location: recordings.location,
            locationLatitude: recordings.locationLatitude,
            locationLongitude: recordings.locationLongitude,
            locationSource: recordings.locationSource,
            ownerId: recordings.ownerId,
            ownerEmail: users.email,
            ownerDisplayName: users.displayName,
        })
        .from(recordings)
        .leftJoin(users, eq(recordings.ownerId, users.id));

    const filteredQuery = whereClause
        ? baseQuery.where(whereClause)
        : baseQuery;

    const rows = await filteredQuery.orderBy(
        desc(recordings.recordedAt),
        desc(recordings.createdAt)
    );
    return rows.map(row => mapRowToSummary({
        ...row,
        assetStoragePath: null,
        assetContentType: null,
        assetSizeBytes: null,
    }, null));
}

export async function createRecording(
    db: BetterSQLite3Database,
    owner: PublicUser,
    input: CreateRecordingInput,
    clientIp?: string
): Promise<RecordingSummary> {
    const recordingId = await insertRecording(
        db,
        await prepareRecordingValues(owner, input, clientIp)
    );
    const recording = await getRecordingForViewer(db, owner, recordingId);
    if (!recording) {
        throw new Error("Recording not found after creation");
    }
    return recording;
}

export async function createRecordingWithFile(
    db: BetterSQLite3Database,
    owner: PublicUser,
    storageDir: string,
    input: CreateRecordingInput,
    audio: AudioUpload,
    clientIp?: string
): Promise<RecordingSummary> {
    const values = await prepareRecordingValues(owner, input, clientIp);
    const recordingId = await insertRecording(db, values);

    let stored: PersistedRecordingFile | null = null;
    try {
        stored = await persistRecordingFile(
            storageDir,
            owner.id,
            recordingId,
            audio
        );

        await db.insert(recordingAssets).values({
            recordingId,
            storagePath: stored.storagePath,
            contentType: stored.contentType,
            sizeBytes: stored.sizeBytes,
            checksum: stored.checksum,
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
        throw new Error("Recording not found after creation");
    }
    return recording;
}

export async function getRecordingForViewer(
    db: BetterSQLite3Database,
    viewer: PublicUser,
    recordingId: string
): Promise<RecordingSummary | null> {
    // Single optimized query to get recording data, user info, and asset info
    const [row] = await db
        .select({
            // Recording fields
            id: recordings.id,
            title: recordings.title,
            description: recordings.description,
            durationMs: recordings.durationMs,
            recordedAt: recordings.recordedAt,
            createdAt: recordings.createdAt,
            updatedAt: recordings.updatedAt,
            isFavourited: recordings.isFavourited,
            location: recordings.location,
            locationLatitude: recordings.locationLatitude,
            locationLongitude: recordings.locationLongitude,
            locationSource: recordings.locationSource,
            ownerId: recordings.ownerId,
            // User fields
            ownerEmail: users.email,
            ownerDisplayName: users.displayName,
            // Asset fields (LEFT JOIN, so null if no asset)
            assetStoragePath: recordingAssets.storagePath,
            assetContentType: recordingAssets.contentType,
            assetSizeBytes: recordingAssets.sizeBytes,
        })
        .from(recordings)
        .leftJoin(users, eq(recordings.ownerId, users.id))
        .leftJoin(
            recordingAssets,
            and(
                eq(recordingAssets.recordingId, recordings.id),
                // Only get the primary (first) asset
                sql`recording_assets.id = (
                    SELECT id FROM recording_assets
                    WHERE recording_id = recordings.id
                    ORDER BY created_at DESC
                    LIMIT 1
                )`
            )
        )
        .where(eq(recordings.id, recordingId))
        .limit(1);

    if (!row) {
        return null;
    }

    const isOwner = row.ownerId === viewer.id;
    if (viewer.role !== "admin" && !isOwner) {
        return null;
    }

    // Create asset object from the joined data
    const asset = row.assetStoragePath ? {
        recordingId: recordingId,
        storagePath: row.assetStoragePath,
        contentType: row.assetContentType || '',
        sizeBytes: row.assetSizeBytes || 0,
    } : null;

    return mapRowToSummary(row, asset);
}

export async function ensureRecordingAccess(
    db: BetterSQLite3Database,
    viewer: PublicUser,
    recordingId: string
): Promise<boolean> {
    const [row] = await db
        .select({ ownerId: recordings.ownerId })
        .from(recordings)
        .where(eq(recordings.id, recordingId))
        .limit(1);

    if (!row) {
        return false;
    }

    const isOwner = row.ownerId === viewer.id;
    return viewer.role === "admin" || isOwner;
}

export async function getPrimaryAssetForViewer(
    db: BetterSQLite3Database,
    viewer: PublicUser,
    recordingId: string
): Promise<RecordingAsset | null> {
    const recording = await ensureRecordingAccess(db, viewer, recordingId);
    if (!recording) {
        return null;
    }

    const assets = await db
        .select({
            recordingId: recordingAssets.recordingId,
            storagePath: recordingAssets.storagePath,
            contentType: recordingAssets.contentType,
            sizeBytes: recordingAssets.sizeBytes,
        })
        .from(recordingAssets)
        .where(eq(recordingAssets.recordingId, recordingId))
        .orderBy(desc(recordingAssets.createdAt))
        .limit(1);

    return assets[0] ?? null;
}

type RecordingInsertValues = {
    ownerId: string;
    title: string;
    description: string | null;
    durationMs: number;
    recordedAt: Date;
    location: string | null;
    locationLatitude: string | null;
    locationLongitude: string | null;
    locationSource: 'ip' | 'manual' | 'geolocation' | null;
};

type PersistedRecordingFile = {
    storagePath: string;
    contentType: string;
    sizeBytes: number;
    checksum: string;
};

async function insertRecording(
    db: BetterSQLite3Database,
    values: RecordingInsertValues
): Promise<string> {
    const [inserted] = await db.insert(recordings).values(values).returning({
        id: recordings.id,
    });

    if (!inserted) {
        throw new Error("Failed to create recording");
    }

    return inserted.id;
}

async function prepareRecordingValues(
    owner: PublicUser,
    input: CreateRecordingInput,
    clientIp?: string
): Promise<RecordingInsertValues> {
    let title = (input.title ?? "").trim();
    if (title.length === 0) {
        // Use default naming format if no title provided
        title = formatDefaultRecordingName();
    }

    const description = input.description ? input.description.trim() : null;
    const durationMs = normalizeDuration(input.durationMs);
    const recordedAt = parseRecordedAt(input.recordedAt) ?? new Date();

    // Handle location data
    let location = input.location || null;
    let locationLatitude = input.locationLatitude ? input.locationLatitude.toString() : null;
    let locationLongitude = input.locationLongitude ? input.locationLongitude.toString() : null;
    let locationSource = input.locationSource || null;

    // If no location provided, try to get it from IP
    if (!location && clientIp) {
        try {
            // Check if we're in local development
            if (isLocalDevelopment({ ip: clientIp })) {
                const localLocation = await getLocalDevelopmentLocation();
                if (localLocation) {
                    location = formatLocation(localLocation);
                    locationLatitude = localLocation.latitude?.toString() || null;
                    locationLongitude = localLocation.longitude?.toString() || null;
                    locationSource = 'manual'; // Mark as manual since it's a fallback
                }
            } else {
                const locationData = await getLocationFromIp(clientIp);
                if (locationData) {
                    location = formatLocation(locationData);
                    locationLatitude = locationData.latitude?.toString() || null;
                    locationLongitude = locationData.longitude?.toString() || null;
                    locationSource = 'ip';
                }
            }
        } catch (error) {
            console.warn('Failed to get location from IP:', error);
        }
    }

    return {
        ownerId: owner.id,
        title,
        description,
        durationMs,
        recordedAt,
        location,
        locationLatitude,
        locationLongitude,
        locationSource,
    };
}

async function persistRecordingFile(
    storageDir: string,
    ownerId: string,
    recordingId: string,
    audio: AudioUpload
): Promise<PersistedRecordingFile> {
    const extension = inferExtension(audio.mimetype, audio.filename);
    const relativePath = join(
        ownerId,
        `${recordingId}-${randomUUID()}${extension}`
    );
    const absolutePath = join(storageDir, relativePath);

    mkdirSync(dirname(absolutePath), { recursive: true });

    const hash = createHash("sha256");
    let sizeBytes = 0;

    try {
        if (audio.buffer) {
            // Handle buffered audio data
            sizeBytes = audio.buffer.length;
            hash.update(audio.buffer);

            const { writeFile } = await import("node:fs/promises");
            await writeFile(absolutePath, audio.buffer);
        } else if (audio.stream) {
            // Handle streamed audio data
            const { Transform } = await import("node:stream");

            const hashTransform = new Transform({
                transform(chunk: Buffer, encoding, callback) {
                    sizeBytes += chunk.length;
                    hash.update(chunk);
                    callback(null, chunk); // Pass the chunk through unchanged
                }
            });

            await pipeline(
                audio.stream,
                hashTransform,
                createWriteStream(absolutePath)
            );
        } else {
            throw new Error("No audio data provided (buffer or stream required)");
        }
    } catch (error) {
        await safeUnlink(absolutePath);
        throw error;
    }

    // Normalize and validate content type for browser compatibility
    let contentType = audio.mimetype ?? "application/octet-stream";
    const normalizedMime = contentType.split(";")[0]?.toLowerCase();

    // Map to browser-compatible MIME types
    const mimeFixes: Record<string, string> = {
        "audio/x-wav": "audio/wav",
        "audio/x-m4a": "audio/mp4",
        "audio/mp4": "audio/mp4", // Ensure proper MP4 MIME type
    };

    if (mimeFixes[normalizedMime]) {
        contentType = mimeFixes[normalizedMime];
    }

    return {
        storagePath: relativePath,
        contentType,
        sizeBytes,
        checksum: hash.digest("hex"),
    };
}

async function safeUnlink(path: string): Promise<void> {
    try {
        await unlink(path);
    } catch (error: any) {
        if (error && error.code !== "ENOENT") {
            throw error;
        }
    }
}

function inferExtension(mimetype?: string, filename?: string): string {
    const normalizedMime = mimetype?.split(";")[0]?.toLowerCase();
    const mimeMap: Record<string, string> = {
        "audio/webm": ".webm",
        "audio/ogg": ".ogg",
        "audio/mpeg": ".mp3",
        "audio/wav": ".wav",
        "audio/mp4": ".m4a",
        "audio/aac": ".aac",
        "audio/flac": ".flac",
        "audio/x-wav": ".wav",
        "audio/x-m4a": ".m4a",
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

    return ".webm";
}

export async function updateRecordingFavourite(
    db: BetterSQLite3Database,
    viewer: PublicUser,
    recordingId: string,
    isFavourited: boolean
): Promise<RecordingSummary | null> {
    // First verify access
    const recording = await getRecordingForViewer(db, viewer, recordingId);
    if (!recording) {
        return null;
    }

    // Update the favorite status
    const [updated] = await db
        .update(recordings)
        .set({ isFavourited: Boolean(isFavourited) })
        .where(eq(recordings.id, recordingId))
        .returning({
            id: recordings.id,
            title: recordings.title,
            description: recordings.description,
            durationMs: recordings.durationMs,
            recordedAt: recordings.recordedAt,
            createdAt: recordings.createdAt,
            updatedAt: recordings.updatedAt,
            isFavourited: recordings.isFavourited,
            location: recordings.location,
            locationLatitude: recordings.locationLatitude,
            locationLongitude: recordings.locationLongitude,
            locationSource: recordings.locationSource,
            ownerId: recordings.ownerId,
        });

    if (!updated) {
        return null;
    }

    // Get owner info for the response
    const [rowWithOwner] = await db
        .select({
            ownerEmail: users.email,
            ownerDisplayName: users.displayName,
        })
        .from(users)
        .where(eq(users.id, updated.ownerId))
        .limit(1);

    const owner = rowWithOwner
        ? {
              id: updated.ownerId,
              email: rowWithOwner.ownerEmail,
              displayName: rowWithOwner.ownerDisplayName ?? null,
          }
        : null;

    return {
        id: updated.id,
        title: updated.title,
        description: updated.description ?? null,
        durationMs: updated.durationMs ?? 0,
        recordedAt: toIsoString(updated.recordedAt),
        createdAt: toIsoString(updated.createdAt) ?? new Date().toISOString(),
        updatedAt: toIsoString(updated.updatedAt) ?? new Date().toISOString(),
        isFavourited: Boolean(updated.isFavourited),
        location: updated.location ?? null,
        locationLatitude: updated.locationLatitude ? parseFloat(updated.locationLatitude) : null,
        locationLongitude: updated.locationLongitude ? parseFloat(updated.locationLongitude) : null,
        locationSource: updated.locationSource as 'ip' | 'manual' | 'geolocation' | null,
        owner,
        asset: null, // We don't need to fetch asset for these updates
    };
}

export async function updateRecordingMetadata(
    db: BetterSQLite3Database,
    viewer: PublicUser,
    recordingId: string,
    updates: {
        title?: string;
        description?: string | null;
        location?: string | null;
        locationLatitude?: number | null;
        locationLongitude?: number | null;
        locationSource?: 'manual' | 'geolocation' | null;
    }
): Promise<RecordingSummary | null> {
    // First verify access
    const recording = await getRecordingForViewer(db, viewer, recordingId);
    if (!recording) {
        return null;
    }

    // Prepare update object - only include fields that are actually being updated
    const updateData: any = {
        updatedAt: new Date(),
    };

    if (updates.title !== undefined) {
        const title = updates.title.trim();
        updateData.title = title.length > 0 ? title : formatDefaultRecordingName();
    }

    if (updates.description !== undefined) {
        updateData.description = updates.description && updates.description.trim() ? updates.description.trim() : null;
    }

    if (updates.location !== undefined) {
        updateData.location = updates.location && updates.location.trim() ? updates.location.trim() : null;
    }

    if (updates.locationLatitude !== undefined) {
        updateData.locationLatitude = updates.locationLatitude?.toString() || null;
    }

    if (updates.locationLongitude !== undefined) {
        updateData.locationLongitude = updates.locationLongitude?.toString() || null;
    }

    if (updates.locationSource !== undefined) {
        updateData.locationSource = updates.locationSource;
    }

    // Update the recording metadata
    const [updated] = await db
        .update(recordings)
        .set(updateData)
        .where(eq(recordings.id, recordingId))
        .returning({
            id: recordings.id,
            title: recordings.title,
            description: recordings.description,
            durationMs: recordings.durationMs,
            recordedAt: recordings.recordedAt,
            createdAt: recordings.createdAt,
            updatedAt: recordings.updatedAt,
            isFavourited: recordings.isFavourited,
            location: recordings.location,
            locationLatitude: recordings.locationLatitude,
            locationLongitude: recordings.locationLongitude,
            locationSource: recordings.locationSource,
            ownerId: recordings.ownerId,
        });

    if (!updated) {
        return null;
    }

    // Get owner info for the response
    const [rowWithOwner] = await db
        .select({
            ownerEmail: users.email,
            ownerDisplayName: users.displayName,
        })
        .from(users)
        .where(eq(users.id, updated.ownerId))
        .limit(1);

    const owner = rowWithOwner
        ? {
              id: updated.ownerId,
              email: rowWithOwner.ownerEmail,
              displayName: rowWithOwner.ownerDisplayName ?? null,
          }
        : null;

    return {
        id: updated.id,
        title: updated.title,
        description: updated.description ?? null,
        durationMs: updated.durationMs ?? 0,
        recordedAt: toIsoString(updated.recordedAt),
        createdAt: toIsoString(updated.createdAt) ?? new Date().toISOString(),
        updatedAt: toIsoString(updated.updatedAt) ?? new Date().toISOString(),
        isFavourited: Boolean(updated.isFavourited),
        location: updated.location ?? null,
        locationLatitude: updated.locationLatitude ? parseFloat(updated.locationLatitude) : null,
        locationLongitude: updated.locationLongitude ? parseFloat(updated.locationLongitude) : null,
        locationSource: updated.locationSource as 'ip' | 'manual' | 'geolocation' | null,
        owner,
        asset: null, // We don't need to fetch asset for these updates
    };
}

export async function deleteRecording(
    db: BetterSQLite3Database,
    viewer: PublicUser,
    recordingId: string,
    storageDir: string
): Promise<boolean> {
    // First verify access and get recording assets
    const recording = await getRecordingForViewer(db, viewer, recordingId);
    if (!recording) {
        return false;
    }

    // Get all assets for this recording to delete from storage
    const assets = await db
        .select({
            storagePath: recordingAssets.storagePath,
        })
        .from(recordingAssets)
        .where(eq(recordingAssets.recordingId, recordingId));

    try {
        // Delete from database (this will cascade delete assets due to foreign key constraint)
        const deleted = await db
            .delete(recordings)
            .where(eq(recordings.id, recordingId))
            .run();

        if (deleted.changes === 0) {
            return false;
        }

        // Delete asset files from storage
        for (const asset of assets) {
            try {
                await safeUnlink(join(storageDir, asset.storagePath));
            } catch (error) {
                // Log error but continue with deletion
                console.warn(`Failed to delete asset file: ${asset.storagePath}`, error);
            }
        }

        return true;
    } catch (error) {
        console.error('Failed to delete recording:', error);
        throw error;
    }
}

function mapRowToSummary(row: RecordingRow, asset?: RecordingAsset | null): RecordingSummary {
    const owner =
        row.ownerId && row.ownerEmail
            ? {
                  id: row.ownerId,
                  email: row.ownerEmail,
                  displayName: row.ownerDisplayName ?? null,
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
        isFavourited: Boolean(row.isFavourited),
        location: row.location ?? null,
        locationLatitude: row.locationLatitude ? parseFloat(row.locationLatitude) : null,
        locationLongitude: row.locationLongitude ? parseFloat(row.locationLongitude) : null,
        locationSource: row.locationSource as 'ip' | 'manual' | 'geolocation' | null,
        owner,
        asset: asset ? {
            sizeBytes: asset.sizeBytes,
            contentType: asset.contentType,
        } : null,
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

function parseRecordedAt(
    value: CreateRecordingInput["recordedAt"]
): Date | null {
    if (!value) return null;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        const fromNumber = new Date(value);
        return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
    }
    if (typeof value === "string") {
        const fromString = new Date(value);
        return Number.isNaN(fromString.getTime()) ? null : fromString;
    }
    return null;
}
