import { type FastifyInstance } from "fastify";
import { calculateStorageUsage, getStorageLimit, type StorageUsage } from "../services/storageService.js";

export async function registerStorageRoutes(
    app: FastifyInstance
): Promise<void> {
    app.get(
        "/storage",
        {
            preHandler: app.authenticate,
        },
        async (request, reply) => {
            if (!request.authUser) {
                return reply
                    .status(401)
                    .send({ message: "Authentication required" });
            }

            try {
                const limit = getStorageLimit();
                const storageUsage = await calculateStorageUsage(
                    app.config.storageDir,
                    limit
                );

                return { storage: storageUsage };
            } catch (error) {
                request.log.error(error, "Failed to calculate storage usage");
                return reply
                    .status(500)
                    .send({ message: "Unable to calculate storage usage" });
            }
        }
    );
}