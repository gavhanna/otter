import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-vite-plugin";

export default defineConfig({
    plugins: [
        react(),
        tanstackRouter({
            routesDirectory: "./src/routes",
        }),
    ],
    resolve: {
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
