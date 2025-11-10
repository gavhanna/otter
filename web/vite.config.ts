import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-vite-plugin";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    plugins: [
        react(),
        tanstackRouter({
            routesDirectory: "./src/routes",
        }),
    ],
    resolve: {
        alias: {
            react: resolve(rootDir, "node_modules/react"),
            "react-dom": resolve(rootDir, "node_modules/react-dom"),
        },
        dedupe: ["react", "react-dom"],
    },
    server: {
        port: 5173,
        host: "0.0.0.0",
        proxy: {
            "/api": {
                target: "http://localhost:4000",
                changeOrigin: true,
            },
        },
    },
});
