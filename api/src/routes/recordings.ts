import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { type FastifyInstance } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { Readable } from "node:stream";
import {
    createRecordingWithFile,
    deleteRecording,
    getRecordingForViewer,
    getPrimaryAssetForViewer,
    listRecordings,
    updateRecordingFavourite,
    updateRecordingMetadata,
    type CreateRecordingInput,
} from "../services/recordingService.js";

type ListQuery = {
    ownerId?: string;
};

export async function registerRecordingRoutes(
    app: FastifyInstance
): Promise<void> {
    app.get(
        "/recordings",
        {
            preHandler: app.authenticate,
        },
        async (request, reply) => {
            if (!request.authUser) {
                return reply
                    .status(401)
                    .send({ message: "Authentication required" });
            }

            const query = request.query as ListQuery | undefined;
            const recordings = await listRecordings(app.db, request.authUser, {
                ownerId: query?.ownerId,
            });
            return { recordings };
        }
    );

    app.post(
        "/recordings",
        {
            preHandler: app.authenticate,
        },
        async (request, reply) => {
            if (!request.authUser) {
                return reply
                    .status(401)
                    .send({ message: "Authentication required" });
            }

            if (!request.isMultipart()) {
                return reply
                    .status(400)
                    .send({ message: "Multipart form data required" });
            }

            const fields: Record<string, string> = {};
            let audioPart: MultipartFile | null = null;
            let audioBuffer: Buffer | null = null;

            console.log("Starting multipart processing...");
            const partsStart = Date.now();
            let partCount = 0;

            try {
                for await (const part of request.parts()) {
                    partCount++;
                    console.log(`Processing part ${partCount}: type=${part.type}, fieldname=${part.fieldname}`);

                    if (part.type === "file") {
                        if (part.fieldname === "audio" && !audioPart) {
                            audioPart = part;
                            console.log(`Found audio file: ${part.filename}`);
                            // We need to consume the stream to allow multipart processing to continue
                            // Buffer the chunks to pass to the recording service
                            const chunks: Buffer[] = [];
                            let totalSize = 0;
                            const maxFileSize = 100 * 1024 * 1024; // 100MB limit

                            for await (const chunk of part.file) {
                                totalSize += chunk.length;
                                if (totalSize > maxFileSize) {
                                    throw new Error(`File too large: ${totalSize} bytes (max: ${maxFileSize})`);
                                }
                                chunks.push(chunk);
                            }

                            // Concatenate all chunks into a single buffer
                            audioBuffer = Buffer.concat(chunks);
                            console.log(`Audio file buffered: ${totalSize} bytes`);
                        } else {
                            console.log(`Skipping file part: ${part.fieldname}`);
                            // Consume other files to prevent hanging
                            for await (const chunk of part.file) {
                                // Just consume the chunk
                            }
                        }
                    } else if (part.type === "field") {
                        const value = typeof part.value === "string" ? part.value : String(part.value);
                        fields[part.fieldname] = value;
                        console.log(`Field ${part.fieldname}: ${value.substring(0, 50)}${value.length > 50 ? '...' : ''}`);
                    }
                }
            } catch (error) {
                console.error("Error in multipart processing loop:", error);
                throw error;
            }

            const partsDuration = Date.now() - partsStart;
            console.log(`Multipart processing completed in ${partsDuration}ms, processed ${partCount} parts`);

            const title = fields.title?.trim() ?? "";
            // Title is no longer required as we'll generate a default one on the server side

            if (!audioPart || !audioBuffer) {
                return reply
                    .status(400)
                    .send({ message: "Audio file is required" });
            }

            const durationParsed = fields.durationMs
                ? Number(fields.durationMs)
                : undefined;
            const durationMs =
                durationParsed !== undefined && Number.isFinite(durationParsed)
                    ? durationParsed
                    : undefined;

            const description =
                fields.description && fields.description.trim().length > 0
                    ? fields.description.trim()
                    : null;
            const recordedAt =
                fields.recordedAt && fields.recordedAt.length > 0
                    ? fields.recordedAt
                    : null;

            // Extract location fields from form data
            const location =
                fields.location && fields.location.trim().length > 0
                    ? fields.location.trim()
                    : null;
            const locationLatitude = fields.locationLatitude
                ? Number(fields.locationLatitude)
                : undefined;
            const locationLongitude = fields.locationLongitude
                ? Number(fields.locationLongitude)
                : undefined;
            const locationSource = fields.locationSource as 'ip' | 'manual' | 'geolocation' | undefined;

            // Get client IP for automatic location detection
            const clientIp = request.headers['x-forwarded-for'] as string ||
                request.headers['x-real-ip'] as string ||
                request.ip ||
                undefined;
            
            console.log({
                title,
                description,
                durationMs,
                recordedAt,
                location,
                locationLatitude,
                locationLongitude,
                locationSource,
                clientIp,
            });

            try {
                console.log("Starting createRecordingWithFile call...");
                const startTime = Date.now();

                const recording = await createRecordingWithFile(
                    app.db,
                    request.authUser,
                    app.config.storageDir,
                    {
                        title,
                        description,
                        durationMs,
                        recordedAt,
                        location,
                        locationLatitude,
                        locationLongitude,
                        locationSource,
                    },
                    {
                        filename: audioPart.filename,
                        mimetype: audioPart.mimetype,
                        buffer: audioBuffer
                    },
                    clientIp
                );

                const duration = Date.now() - startTime;
                console.log(`createRecordingWithFile completed in ${duration}ms`);

                return reply.status(201).send({ recording });
            } catch (error) {
                console.error("Failed to create recording:", error);
                request.log.error(error, "Failed to create recording");
                return reply
                    .status(500)
                    .send({ message: "Unable to create recording" });
            }
        }
    );

    app.get(
        "/recordings/:id",
        {
            preHandler: app.authenticate,
        },
        async (request, reply) => {
            if (!request.authUser) {
                return reply
                    .status(401)
                    .send({ message: "Authentication required" });
            }

            const { id } = request.params as { id: string };
            if (!id) {
                return reply
                    .status(400)
                    .send({ message: "Recording id is required" });
            }

            const recording = await getRecordingForViewer(
                app.db,
                request.authUser,
                id
            );
            if (!recording) {
                return reply
                    .status(404)
                    .send({ message: "Recording not found" });
            }

            return { recording };
        }
    );

    app.patch(
        "/recordings/:id/favourite",
        {
            preHandler: app.authenticate,
        },
        async (request, reply) => {
            if (!request.authUser) {
                return reply
                    .status(401)
                    .send({ message: "Authentication required" });
            }

            const { id } = request.params as { id: string };
            if (!id) {
                return reply
                    .status(400)
                    .send({ message: "Recording id is required" });
            }

            const body = request.body as { isFavourited?: boolean } | undefined;
            const isFavourited = Boolean(body?.isFavourited);

            try {
                const updated = await updateRecordingFavourite(
                    app.db,
                    request.authUser,
                    id,
                    isFavourited
                );

                if (!updated) {
                    return reply
                        .status(404)
                        .send({ message: "Recording not found" });
                }

                return reply.status(200).send({ recording: updated });
            } catch (error) {
                request.log.error(error, "Failed to update recording favorite status");
                return reply
                    .status(500)
                    .send({ message: "Unable to update recording" });
            }
        }
    );

    app.patch(
        "/recordings/:id",
        {
            preHandler: app.authenticate,
        },
        async (request, reply) => {
            if (!request.authUser) {
                return reply
                    .status(401)
                    .send({ message: "Authentication required" });
            }

            const { id } = request.params as { id: string };
            if (!id) {
                return reply
                    .status(400)
                    .send({ message: "Recording id is required" });
            }

            const body = request.body as {
                title?: string;
                description?: string | null;
                location?: string | null;
                locationLatitude?: number | null;
                locationLongitude?: number | null;
                locationSource?: 'manual' | 'geolocation' | null;
            } | undefined;

            if (!body || (
                body.title === undefined &&
                body.description === undefined &&
                body.location === undefined &&
                body.locationLatitude === undefined &&
                body.locationLongitude === undefined &&
                body.locationSource === undefined
            )) {
                return reply
                    .status(400)
                    .send({ message: "At least one field must be provided for update" });
            }

            const updates: {
                title?: string;
                description?: string | null;
                location?: string | null;
                locationLatitude?: number | null;
                locationLongitude?: number | null;
                locationSource?: 'manual' | 'geolocation' | null;
            } = {};

            if (body.title !== undefined) {
                updates.title = body.title;
            }
            if (body.description !== undefined) {
                updates.description = body.description;
            }
            if (body.location !== undefined) {
                updates.location = body.location;
            }
            if (body.locationLatitude !== undefined) {
                updates.locationLatitude = body.locationLatitude;
            }
            if (body.locationLongitude !== undefined) {
                updates.locationLongitude = body.locationLongitude;
            }
            if (body.locationSource !== undefined) {
                updates.locationSource = body.locationSource;
            }

            try {
                const updated = await updateRecordingMetadata(
                    app.db,
                    request.authUser,
                    id,
                    updates
                );

                if (!updated) {
                    return reply
                        .status(404)
                        .send({ message: "Recording not found" });
                }

                return reply.status(200).send({ recording: updated });
            } catch (error) {
                request.log.error(error, "Failed to update recording metadata");
                return reply
                    .status(500)
                    .send({ message: "Unable to update recording" });
            }
        }
    );

    app.get(
        "/recordings/:id/stream",
        {
            preHandler: app.authenticate,
        },
        async (request, reply) => {
            if (!request.authUser) {
                return reply
                    .status(401)
                    .send({ message: "Authentication required" });
            }

            const { id } = request.params as { id: string };
            if (!id) {
                return reply
                    .status(400)
                    .send({ message: "Recording id is required" });
            }

            const asset = await getPrimaryAssetForViewer(
                app.db,
                request.authUser,
                id
            );
            if (!asset) {
                return reply
                    .status(404)
                    .send({ message: "Recording not found" });
            }

            const filePath = join(app.config.storageDir, asset.storagePath);

            try {
                const fileStat = await stat(filePath);
                const rangeHeader = request.headers.range;
                const fileSize = fileStat.size;

                reply.header("Accept-Ranges", "bytes");
                reply.header("Content-Type", asset.contentType);
                reply.header("Access-Control-Allow-Origin", "*");
                reply.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
                reply.header("Access-Control-Allow-Headers", "Range");
                reply.header("Cross-Origin-Resource-Policy", "cross-origin");
                reply.header("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
                reply.header("ETag", `"${asset.sizeBytes}-${Date.now()}"`);

                if (rangeHeader) {
                    const matches = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
                    if (matches) {
                        const start = Number(matches[1]);
                        const end = matches[2]
                            ? Number(matches[2])
                            : fileSize - 1;
                        if (start >= fileSize || end >= fileSize) {
                            reply.header(
                                "Content-Range",
                                `bytes */${fileSize}`
                            );
                            return reply.status(416).send();
                        }
                        const chunkSize = end - start + 1;
                        reply.header(
                            "Content-Range",
                            `bytes ${start}-${end}/${fileSize}`
                        );
                        reply.header("Content-Length", chunkSize);
                        reply.code(206);
                        return reply.send(
                            createReadStream(filePath, { start, end })
                        );
                    }
                }

                reply.header("Content-Length", fileSize);
                reply.code(200);
                return reply.send(createReadStream(filePath));
            } catch (error) {
                request.log.error(error, "Failed to stream recording");
                return reply
                    .status(500)
                    .send({ message: "Unable to stream recording" });
            }
        }
    );

    app.delete(
        "/recordings/:id",
        {
            preHandler: app.authenticate,
        },
        async (request, reply) => {
            if (!request.authUser) {
                return reply
                    .status(401)
                    .send({ message: "Authentication required" });
            }

            const { id } = request.params as { id: string };
            if (!id) {
                return reply
                    .status(400)
                    .send({ message: "Recording id is required" });
            }

            try {
                const deleted = await deleteRecording(
                    app.db,
                    request.authUser,
                    id,
                    app.config.storageDir
                );

                if (!deleted) {
                    return reply
                        .status(404)
                        .send({ message: "Recording not found" });
                }

                return reply.status(200).send({ message: "Recording deleted successfully" });
            } catch (error) {
                request.log.error(error, "Failed to delete recording");
                return reply
                    .status(500)
                    .send({ message: "Unable to delete recording" });
            }
        }
    );
}
