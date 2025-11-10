import { z } from "../../utils/validation.js";

const optionalTrimmedString = z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional();

const optionalNullableTrimmedString = z
    .union([z.string(), z.null()])
    .transform((value) => {
        if (value === null) return null;
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    })
    .optional();

const nullableCoordinateSchema = z.preprocess((value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed.length === 0) return null;
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
}, z.number().nullable());

export const listRecordingsQuerySchema = z.object({
    ownerId: optionalTrimmedString,
});

export const recordingIdParamSchema = z.object({
    id: z
        .string()
        .trim()
        .min(1, "Recording id is required"),
});

export const updateFavouriteBodySchema = z
    .object({
        isFavourited: z
            .union([
                z.boolean(),
                z
                    .string()
                    .trim()
                    .transform((value) => value.toLowerCase() === "true"),
            ])
            .optional(),
    })
    .transform((data) => ({
        isFavourited: Boolean(data.isFavourited),
    }));

export const updateRecordingMetadataBodySchema = z
    .object({
        title: z.string().optional(),
        description: optionalNullableTrimmedString,
        location: optionalNullableTrimmedString,
        locationLatitude: nullableCoordinateSchema.optional(),
        locationLongitude: nullableCoordinateSchema.optional(),
        locationSource: z.enum(["manual", "geolocation"]).nullable().optional(),
    })
    .refine(
        (data) =>
            Object.values(data).some((value) => value !== undefined),
        {
            message: "At least one field must be provided for update",
        }
    );
