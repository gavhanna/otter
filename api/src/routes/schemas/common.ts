import { z } from "../../utils/validation.js";

export const emailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address");

export const passwordSchema = z
    .string()
    .trim()
    .min(8, "Password must be at least 8 characters long");

export const optionalDisplayNameSchema = z
    .string()
    .trim()
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional()
    .transform((value) => value ?? undefined);

export const roleSchema = z.enum(["admin", "user"]);

export const booleanLikeSchema = z.union([
    z.boolean(),
    z.string().transform((value, ctx) => {
        const normalized = value.toLowerCase().trim();
        if (["true", "1"].includes(normalized)) return true;
        if (["false", "0"].includes(normalized)) return false;
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Expected boolean value",
        });
        return z.NEVER;
    }),
]);

export const optionalBooleanSchema = booleanLikeSchema.optional();
