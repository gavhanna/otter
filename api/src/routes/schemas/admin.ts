import { z } from "../../utils/validation.js";
import {
    emailSchema,
    optionalBooleanSchema,
    optionalDisplayNameSchema,
    passwordSchema,
    roleSchema,
    booleanLikeSchema,
} from "./common.js";

export const createUserBodySchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    displayName: optionalDisplayNameSchema,
    role: roleSchema.optional().default("user"),
    isActive: optionalBooleanSchema.default(true),
});

export const updateUserBodySchema = z.object({
    displayName: optionalDisplayNameSchema,
    password: passwordSchema.optional(),
    role: roleSchema.optional(),
    isActive: optionalBooleanSchema,
});

export const updateSettingsBodySchema = z.object({
    registrationEnabled: booleanLikeSchema,
});

export const userIdParamSchema = z.object({
    id: z
        .string()
        .min(1, "User id is required"),
});
