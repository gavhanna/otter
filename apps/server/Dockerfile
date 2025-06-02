# Dockerfile for apps/server

# ---- Base Node ----
FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# ---- Dependencies (Production Runtime Only) ----
# This stage is for creating a lean node_modules for runtime.
FROM base AS deps
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/package.json

# Copy prisma schema
COPY apps/server/prisma/schema.prisma ./apps/server/prisma/schema.prisma 

# Install production dependencies
RUN pnpm install --filter server --prod --frozen-lockfile

# ---- Builder ----
# This stage builds the application and generates Prisma client.
FROM base AS builder
WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/package.json
COPY apps/server/tsconfig.json ./apps/server/tsconfig.json

# Install ALL dependencies (dev included) for building and prisma generate
RUN pnpm install --filter server --frozen-lockfile

# Copy all necessary source files for the server app
COPY apps/server/prisma ./apps/server/prisma/
COPY apps/server/src ./apps/server/src/

# Generate Prisma Client
RUN pnpm --filter server exec prisma generate

# Build the server application
RUN pnpm --filter server build

# ---- Runner ----
FROM base AS runner
WORKDIR /app

# Copy production dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules

# Copy generated Prisma Client
COPY --from=builder /app/node_modules/.pnpm ./node_modules/.pnpm

# Copy compiled application code
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Copy necessary runtime files
COPY apps/server/package.json ./apps/server/package.json
COPY apps/server/prisma ./apps/server/prisma/

ENV NODE_ENV=production
EXPOSE ${PORT:-3001}
CMD ["node", "apps/server/dist/server.js"] 