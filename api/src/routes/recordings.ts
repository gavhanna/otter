import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import {
    type FastifyInstance,
    type FastifyRequest,
} from "fastify";
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
import { assertAuthenticated } from "../utils/auth.js";
import { validateRequest } from "../utils/validation.js";
import {
    listRecordingsQuerySchema,
    recordingIdParamSchema,
    updateFavouriteBodySchema,
    updateRecordingMetadataBodySchema,
} from "./schemas/recordings.js";

export async function registerRecordingRoutes(
    app: FastifyInstance
): Promise<void> {
    app.get(
        "/recordings",
        {
            preHandler: app.authenticate,
        },
        async (request, reply) => {
            assertAuthenticated(request);

            const queryResult = validateRequest(
                reply,
                listRecordingsQuerySchema,
                request.query ?? {},
                "query"
            );
            if (!queryResult.success) return;

            const recordings = await listRecordings(app.db, request.authUser, {
                ownerId: queryResult.data.ownerId,
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
            assertAuthenticated(request);

            if (!request.isMultipart()) {
                return reply
                    .status(400)
                    .send({ message: "Multipart form data required" });
            }

            const upload = await collectRecordingUpload(request);
            if (!upload.audio) {
                return reply
                    .status(400)
                    .send({ message: "Audio file is required" });
            }

            const recordingInput = buildRecordingInput(upload.fields);
            const clientIp = getClientIp(request);

            try {
                const recording = await createRecordingWithFile(
                    app.db,
                    request.authUser,
                    app.config.storageDir,
                    recordingInput,
                    upload.audio,
                    clientIp
                );

                return reply.status(201).send({ recording });
            } catch (error) {
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
            assertAuthenticated(request);

            const paramsResult = validateRequest(
                reply,
                recordingIdParamSchema,
                request.params,
                "params"
            );
            if (!paramsResult.success) return;
            const { id } = paramsResult.data;

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
            assertAuthenticated(request);

            const paramsResult = validateRequest(
                reply,
                recordingIdParamSchema,
                request.params,
                "params"
            );
            if (!paramsResult.success) return;

            const bodyResult = validateRequest(
                reply,
                updateFavouriteBodySchema,
                request.body ?? {},
                "body"
            );
            if (!bodyResult.success) return;
            const { isFavourited } = bodyResult.data;

            try {
                const updated = await updateRecordingFavourite(
                    app.db,
                    request.authUser,
                    paramsResult.data.id,
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
            assertAuthenticated(request);

            const paramsResult = validateRequest(
                reply,
                recordingIdParamSchema,
                request.params,
                "params"
            );
            if (!paramsResult.success) return;

            const bodyResult = validateRequest(
                reply,
                updateRecordingMetadataBodySchema,
                request.body ?? {},
                "body"
            );
            if (!bodyResult.success) return;

            try {
                const updated = await updateRecordingMetadata(
                    app.db,
                    request.authUser,
                    paramsResult.data.id,
                    bodyResult.data
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
            assertAuthenticated(request);

            const paramsResult = validateRequest(
                reply,
                recordingIdParamSchema,
                request.params,
                "params"
            );
            if (!paramsResult.success) return;

            const asset = await getPrimaryAssetForViewer(
                app.db,
                request.authUser,
                paramsResult.data.id
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
            assertAuthenticated(request);

            const paramsResult = validateRequest(
                reply,
                recordingIdParamSchema,
                request.params,
                "params"
            );
            if (!paramsResult.success) return;

            try {
                const deleted = await deleteRecording(
                    app.db,
                    request.authUser,
                    paramsResult.data.id,
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

type ParsedUpload = {
    fields: Record<string, string>;
    audio?: {
        filename?: string;
        mimetype?: string;
        buffer: Buffer;
    };
};

async function collectRecordingUpload(
    request: FastifyRequest
): Promise<ParsedUpload> {
    const fields: Record<string, string> = {};
    let audioBuffer: Buffer | null = null;
    let audioMeta: { filename?: string; mimetype?: string } | null = null;

    const start = Date.now();
    let partCount = 0;
    const maxFileSize = 100 * 1024 * 1024; // 100MB

    try {
        for await (const part of request.parts()) {
            partCount++;
            if (part.type === "file") {
                if (part.fieldname === "audio" && !audioBuffer) {
                    const chunks: Buffer[] = [];
                    let totalSize = 0;

                    for await (const chunk of part.file) {
                        totalSize += chunk.length;
                        if (totalSize > maxFileSize) {
                            throw new Error(
                                `File too large: ${totalSize} bytes (max: ${maxFileSize})`
                            );
                        }
                        chunks.push(chunk);
                    }

                    audioBuffer = Buffer.concat(chunks);
                    audioMeta = {
                        filename: part.filename,
                        mimetype: part.mimetype,
                    };
                    request.log.debug(
                        { sizeBytes: totalSize },
                        "Buffered audio upload"
                    );
                } else {
                    // Consume other files to prevent hanging
                    for await (const _chunk of part.file) {
                        // intentionally discarding
                    }
                }
            } else if (part.type === "field") {
                const value =
                    typeof part.value === "string"
                        ? part.value
                        : String(part.value);
                fields[part.fieldname] = value;
            }
        }
    } catch (error) {
        request.log.error(error, "Error parsing multipart payload");
        throw error;
    }

    request.log.debug(
        { partCount, durationMs: Date.now() - start },
        "Completed multipart parsing"
    );

    return {
        fields,
        audio: audioBuffer
            ? {
                  filename: audioMeta?.filename,
                  mimetype: audioMeta?.mimetype,
                  buffer: audioBuffer,
              }
            : undefined,
    };
}

function buildRecordingInput(fields: Record<string, string>): CreateRecordingInput {
    return {
        title: fields.title?.trim() ?? "",
        description: toNullableString(fields.description),
        durationMs: toOptionalNumber(fields.durationMs),
        recordedAt:
            fields.recordedAt && fields.recordedAt.trim().length > 0
                ? fields.recordedAt
                : null,
        location: toNullableString(fields.location),
        locationLatitude: toOptionalNumber(fields.locationLatitude) ?? null,
        locationLongitude: toOptionalNumber(fields.locationLongitude) ?? null,
        locationSource: toLocationSource(fields.locationSource),
    };
}

function toNullableString(value?: string): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function toOptionalNumber(value?: string): number | undefined {
    if (!value) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

function toLocationSource(
    value?: string
): "ip" | "manual" | "geolocation" | undefined {
    if (!value) return undefined;
    const normalized = value.trim().toLowerCase();
    if (normalized === "ip" || normalized === "manual" || normalized === "geolocation") {
        return normalized;
    }
    return undefined;
}

function getClientIp(request: FastifyRequest): string | undefined {
    const forwarded = request.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
        return forwarded.split(",")[0]?.trim() || request.ip;
    }

    const realIp = request.headers["x-real-ip"];
    if (typeof realIp === "string" && realIp.length > 0) {
        return realIp;
    }

    return request.ip || undefined;
}
