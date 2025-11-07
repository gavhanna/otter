# syntax=docker/dockerfile:1.7

FROM node:20-bookworm-slim AS base
WORKDIR /app

# Better-sqlite3 needs native build tooling
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 build-essential \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY api/package*.json ./api/
COPY tsconfig.base.json ./
COPY api/tsconfig.json ./api/

RUN npm ci --workspace=@otter/api

FROM base AS builder
COPY api ./api
RUN npm run build --workspace=@otter/api \
  && npm prune --omit=dev --workspaces --include-workspace-root=false

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    DATABASE_PATH=/data/otter.sqlite \
    STORAGE_DIR=/data/audio \
    HOST=0.0.0.0 \
    PORT=4000

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/api/dist ./api/dist
COPY api/package.json ./api/package.json

RUN mkdir -p /data/audio
EXPOSE 4000
WORKDIR /app/api
CMD ["node", "dist/server.js"]
