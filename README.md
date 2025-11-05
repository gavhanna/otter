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

## First-Time Bootstrap
1. Copy the sample environment file: `cp api/.env.example api/.env`.
2. Start the API and run the bootstrap request once to create the first admin:
   ```bash
   curl -X POST http://localhost:4000/auth/bootstrap \
     -H "Content-Type: application/json" \
     -d '{"email":"you@example.com","password":"changeme123","displayName":"Your Name"}'
   ```
3. You should receive a `201` response confirming the admin account. Subsequent attempts will return `409` to prevent duplicates.

## Auth API (early testing helpers)
- Login:
  ```bash
  curl -X POST http://localhost:4000/auth/login \
    -H "Content-Type: application/json" \
    -c cookies.txt \
    -d '{"email":"you@example.com","password":"changeme123"}'
  ```
- Logout:
  ```bash
  curl -X POST http://localhost:4000/auth/logout \
    -b cookies.txt
  ```
  Cookies are stored in `cookies.txt` above so you can simulate a browser session during manual testing.
