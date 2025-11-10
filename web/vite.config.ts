import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-vite-plugin";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const reactPath = require.resolve("react");
const reactJsxPath = require.resolve("react/jsx-runtime");
const reactDomPath = require.resolve("react-dom");
const reactDomClientPath = require.resolve("react-dom/client");

export default defineConfig({
    plugins: [
        react(),
        tanstackRouter({
            routesDirectory: "./src/routes",
        }),
    ],
    resolve: {
        alias: [
            { find: "react/jsx-runtime", replacement: reactJsxPath },
            { find: "react-dom/client", replacement: reactDomClientPath },
            { find: "react-dom", replacement: reactDomPath },
            { find: "react", replacement: reactPath },
        ],
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
