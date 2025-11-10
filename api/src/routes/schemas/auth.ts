import { z } from "../../utils/validation.js";
import {
    emailSchema,
    passwordSchema,
    optionalDisplayNameSchema,
} from "./common.js";

export const bootstrapBodySchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    displayName: optionalDisplayNameSchema,
});

export const loginBodySchema = z.object({
    email: emailSchema,
    password: passwordSchema,
});
