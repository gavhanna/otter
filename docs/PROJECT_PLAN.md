# Otter Recorder – Project Plan

## Vision
- Provide a self-hosted, privacy-first alternative to recorder.google.com tailored for homelab setups and family use.
- Make it effortless to capture, manage, and replay personal audio recordings from any browser.
- Deliver an MVP that runs well on modest hardware (SQLite + disk storage) and can gain opt-in enhancements like transcription later.

## Guiding Principles
- Keep the stack TypeScript-first (Node.js backend, React frontend with TanStack utilities).
- Bias toward the simplest solution that works; introduce abstractions only when maintenance becomes painful.
- Favor clear, auditable storage (SQLite + filesystem blobs) and deterministic builds.
- Ensure the first user bootstrap is straightforward, creating the initial admin without extra tooling.
- Default to lightweight dependencies so the app stays easy to host and update.

## Core Requirements
- **Authentication & Roles**: Admin role (full access), standard users (only their recordings). Admin manages user accounts; self-registration configurable (enabled/disabled).
- **Recording Management**: Capture audio from the browser, upload/stream to the backend, store audio files, maintain metadata (title, tags, duration).
- **Playback Experience**: List, search, and playback recordings with waveform preview (future enhancement).
- **Security & Privacy**: Enforce per-user access controls, secure storage, HTTPS when deployed behind a reverse proxy.
- **Deployment**: Single Docker compose target (Node API + Vite frontend) with persistent volumes for SQLite database and audio files.

## Architecture Overview

### Frontend
- **Framework**: React + Vite + TypeScript. Use TanStack Router for routing and TanStack Query for data fetching/cache.
- **State & Queries**: Auth/token stored via httpOnly cookies; React Query handles API calls with light caching.
- **Audio Capture**: Browser MediaRecorder API for recording, with a straightforward single upload flow (chunking optional upgrade).
- **UI Layer**: Tailwind CSS (or lightweight CSS-in-TS) for rapid styling; avoid heavy component suites to keep bundle small.

### Backend
- **Runtime**: Node.js (LTS) with Fastify for a lightweight, typed HTTP server.
- **Database**: SQLite via Drizzle ORM for schema-first migrations; ships with sensible defaults and no external service.
- **Storage**: Local filesystem for audio blobs (configurable path). Simple interface so swapping to S3 later remains possible.
- **Auth**: Password-based login with argon2 hashing. Session management via signed HTTP-only cookies handled directly in Fastify.
- **Background Tasks**: None for MVP; future transcription worker can run as a separate optional process.

### API Surface (MVP)
- `POST /auth/login`, `POST /auth/logout`, `POST /auth/bootstrap` (create first admin if none exist).
- `GET /recordings` (list by user, with admin override), `POST /recordings` (metadata + initiate upload).
- `POST /recordings/:id/upload` (audio file upload), `GET /recordings/:id/stream` (range stream for playback).
- `PATCH /recordings/:id`, `DELETE /recordings/:id`.
- Admin-only user management routes: `GET/POST/PATCH /admin/users`, toggle registration flag.
- Health check: `GET /health`.

## Data Model (initial)
- `users`: `id`, `email`, `display_name`, `role` (`admin`|`user`), `password_hash`, `is_active`, `created_at`, `updated_at`.
- `recordings`: `id`, `owner_id`, `title`, `description`, `duration_ms`, `recorded_at`, `is_favorited`, `transcript_status`, `created_at`, `updated_at`.
- `recording_assets`: `id`, `recording_id`, `storage_path`, `content_type`, `size_bytes`, `checksum`, `created_at`.
- `settings`: `id`, `registration_enabled`, `created_at`, `updated_at`.
- `sessions` (optional depending on auth impl): `id`, `user_id`, `session_token`, `expires_at`, `created_at`.

## Feature Roadmap

### Phase 0 – Project Skeleton
- Initialize monorepo (pnpm workspaces) or two packages (`/api`, `/web`) sharing TypeScript config.
- Add linting/formatting (ESLint, Prettier), testing harness (Vitest for shared utils).
- Configure environment handling (.env, type-safe config).

### Phase 1 – Auth & Admin Bootstrap
- Create database schema migrations.
- Implement `/auth/bootstrap`, `/auth/login`, `/auth/logout` endpoints.
- Build admin UI for user list, creation, activation toggle, and registration setting control.
- Protect routes client-side and server-side (Fastify hooks).

### Phase 2 – Recording Capture & Storage (MVP)
- Implement recording creation flow: metadata draft -> audio upload -> finalize.
- Handle MediaRecorder streaming/chunking on frontend with progress UI.
- Save audio to `recording_assets`, compute duration server-side.
- Implement playback endpoint with range requests and integrate frontend audio player.

### Phase 3 – Library Experience
- Build recordings list view with filters (date, search term, favorites).
- Detail view with waveform placeholder, metadata editing, delete/restore.
- Add tagging or simple categorization (stretch goal).

### Phase 4 – Enhancements (post-MVP)
- Optional transcription pipeline (worker service + external STT provider).
- Share links (expiring tokens) and collaborative comments.
- Waveform visualization (client-generated via Web Audio API or precomputed peaks).
- Import/export recordings, bulk actions.

## Cross-Cutting Concerns
- **Testing**: Keep to a slim suite—unit tests for critical helpers and a couple of API smoke tests. Manual end-to-end checks remain acceptable for MVP.
- **Logging**: Use Fastify's basic structured logger; surface errors to console and keep per-request IDs optional.
- **Security**: Rate-limit auth routes lightly, sanitize filenames, and validate MIME types. Encourage HTTPS via reverse proxy in docs.
- **Accessibility**: Keyboard-friendly controls and ARIA labels for the audio player are part of daily development.
- **Localization**: Centralize strings where practical, but ship with English-only copy to minimize overhead.

## Deployment & Operations
- Provide Dockerfile for API and static frontend build; docker-compose with named volumes for `/data/db.sqlite` and `/data/audio`.
- Document simple backup/restore steps (SQLite dump + copy audio directory).
- Offer a sample GitHub Actions workflow for optional use, but keep local development fully functional without CI.
- Use plain version tags and a lightweight changelog once releases start; no heavy release tooling required.

## Decision Log
- **Upload handling**: Defer resumable/chunked uploads; enforce a generous single-upload size limit and document expectations. Revisit chunked uploads once real-world usage surfaces longer recordings.
- **Tenancy model**: Target single-tenant deployments for homelab and family users. Structure code to allow a future `org_id`, but ship without multi-tenant complexity.
- **Transcription**: Default to an optional Whisper-based worker (whisper.cpp for on-device privacy) with a provider interface so hosted APIs like Deepgram can be added later.
- **Waveforms**: Persist precomputed waveform peaks server-side after upload to accelerate playback rendering while keeping raw audio untouched.
