# Otter

Self-hosted audio recording and transcription service.

## Overview

Otter is a web application designed for users who want to record audio, have it transcribed, and manage their recordings, all while keeping their data on their own infrastructure. It's inspired by services like Google Recorder but built with self-hosting and open-source principles in mind.

For the detailed project plan, please see [docs/PROJECT_PLAN.md](./docs/PROJECT_PLAN.md).

## Project Structure

*   **/apps/web**: Frontend application (TanStack Router, React, Vite, Shadcn UI)
*   **/apps/server**: Backend application (Node.js, Express, tRPC, Prisma)
*   **/packages/**: Shared packages (e.g., ESLint configs, TypeScript configs)
*   **/data/**: Default location for SQLite database and audio file storage (intended to be a Docker volume).
*   **/docs/**: Project documentation, including the main project plan.

## Getting Started (Placeholder)

Instructions for local development setup, building, and deployment will be added here.

1.  **Prerequisites:** Node.js, pnpm (recommended), Docker.
2.  **Clone the repository.**
3.  **Setup environment variables:** Copy `.env.example` to `.env` and fill in the required values.
4.  **Install dependencies:** `pnpm install` (if using pnpm workspaces from root)
5.  **Run database migrations:** (Details to come with Prisma setup)
6.  **Start development servers:** (Details for `apps/web` and `apps/server`)

## License

(To be determined - likely MIT or similar permissive open-source license)