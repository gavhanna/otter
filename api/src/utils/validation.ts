import type { FastifyReply } from "fastify";
import { z, type ZodSchema, type ZodError } from "zod";

type ValidationTarget = "body" | "query" | "params";

export type ValidationResult<T> = {
    success: true;
    data: T;
} | {
    success: false;
};

export function validateRequest<T>(
    reply: FastifyReply,
    schema: ZodSchema<T>,
    payload: unknown,
    target: ValidationTarget = "body"
): ValidationResult<T> {
    const result = schema.safeParse(payload);
    if (result.success) {
        return { success: true, data: result.data };
    }

    reply.status(400).send({
        message: `Invalid request ${target}`,
        errors: flattenZodError(result.error),
    });

    return { success: false };
}

export function flattenZodError(error: ZodError) {
    return error.issues.map((err) => ({
        path: err.path.join(".") || "(root)",
        message: err.message,
    }));
}

export { z };
