import type { FastifyRequest } from "fastify";
import type { PublicUser } from "../services/userService.js";

export function assertAuthenticated(
    request: FastifyRequest
): asserts request is FastifyRequest & { authUser: PublicUser } {
    if (!request.authUser) {
        throw new Error(
            "Expected authenticated user. Ensure app.authenticate is registered as a preHandler."
        );
    }
}
