# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Otter is a TypeScript-first, self-hosted audio recorder inspired by Google Recorder. It's built as a monorepo with two main workspaces:

- **API**: Fastify backend with SQLite database and file storage
- **Web**: Vite + React frontend using TanStack ecosystem

## Development Commands

### Root Level (Workspace Commands)
```bash
npm install                    # Install all workspace dependencies
npm run build                  # Build all workspaces
npm run dev                    # Start development servers for all workspaces
npm run lint                   # Lint all workspaces
npm run format                 # Format all workspaces
npm run test                   # Run tests across all workspaces
```

### API Development
```bash
npm run dev --workspace api   # Start API server with hot reload (tsx watch)
npm run build --workspace api # Compile TypeScript to JavaScript
npm start --workspace api     # Start production server
```

### Web Development
```bash
npm run dev --workspace web   # Start Vite dev server (host 0.0.0.0)
npm run build --workspace web # Build for production
npm run preview --workspace web # Preview production build
```

## Architecture

### Backend (api/)
- **Framework**: Fastify with TypeScript
- **Database**: SQLite with Drizzle ORM
- **Auth**: JWT with httpOnly cookies, argon2 password hashing
- **Storage**: Local filesystem (configurable path)
- **File Upload**: Multipart support with 50MB limit

#### Key API Structure
- `src/app.ts` - Main Fastify application builder
- `src/server.ts` - Server entry point
- `src/routes/` - Route handlers (auth, admin, recordings, storage, health)
- `src/services/` - Business logic (user, recording, settings, storage services)
- `src/db/` - Database client, schema, and migrations
- `src/plugins/session.ts` - Session management plugin

### Frontend (web/)
- **Framework**: React 18 + Vite + TypeScript
- **Routing**: TanStack Router
- **State Management**: TanStack Query for server state, React Context for auth
- **UI**: Tailwind CSS for styling
- **Audio**: WaveSurfer.js for audio playback and visualization

#### Key Frontend Structure
- `src/main.tsx` - React entry point
- `src/pages/` - Route components (LoginPage, RecordingsPage, etc.)
- `src/components/` - Reusable components (RecordingScreen, Sidebar, etc.)
- `src/lib/` - Utilities (auth store, API client, general utils)

## Bootstrap Process

The application requires an initial admin user setup:

1. Copy `api/.env.example` to `api/.env` and configure
2. Set bootstrap environment variables before first API start:
   - `BOOTSTRAP_ADMIN_EMAIL`
   - `BOOTSTRAP_ADMIN_PASSWORD`
   - `BOOTSTRAP_ADMIN_NAME`
3. Alternatively, use the bootstrap endpoint after server starts

## Data Model

Core entities:
- `users` - Authentication and roles (admin/user)
- `recordings` - Audio metadata (title, duration, favorites)
- `recording_assets` - File storage information
- `settings` - Configuration (registration enabled/disabled)

## API Endpoints

- Auth: `/auth/login`, `/auth/logout`, `/auth/bootstrap`
- Recordings: CRUD operations with upload/streaming
- Admin: User management and settings
- Storage: File upload and serving
- Health: Application health checks

## Development Notes

- TypeScript configuration is shared via `tsconfig.base.json`
- The project uses workspace-specific package naming (`@otter/api`, `@otter/web`)
- File uploads are stored in `api/data/audio/` with hash-based organization
- SQLite database located at `api/data/otter.sqlite`
- CORS is configured for development (adjustable via config)