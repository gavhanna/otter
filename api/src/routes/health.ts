import { type FastifyInstance } from "fastify";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { version: apiVersion } = require("../../package.json") as {
  version?: string;
};

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get("/health", async () => {
    return { status: "ok", version: apiVersion ?? "0.0.0" };
  });
}
