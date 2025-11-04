# Otter Recorder

Lightweight, self-hosted audio recorder inspired by recorder.google.com. Built with TypeScript end-to-end, Fastify on the backend, and React with TanStack tooling on the frontend.

## Structure
- `api/` – Fastify + Drizzle powered REST API with SQLite persistence and file storage.
- `web/` – Vite + React UI for recording, organizing, and playing audio.
- `docs/` – Project planning and documentation.

## Getting Started (once dependencies are installed)
```bash
# Install workspace deps
npm install

# Start backend (in api/)
npm run dev --workspace api

# Start frontend (in web/)
npm run dev --workspace web
```

Additional setup details live in `docs/PROJECT_PLAN.md`.
