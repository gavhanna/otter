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

## Docker
Production-grade Dockerfiles and a reference compose stack live in this repo, plus a GitHub Actions workflow that pushes both images to GHCR. See `docs/DOCKER.md` for build, registry, and Unraid deployment notes.

## First-Time Bootstrap
1. Copy the sample environment file: `cp api/.env.example api/.env`.
2. Either set bootstrap environment variables **before starting the API**:
   ```
   BOOTSTRAP_ADMIN_EMAIL=you@example.com
   BOOTSTRAP_ADMIN_PASSWORD=changeme123
   BOOTSTRAP_ADMIN_NAME=Your Name
   ```
   The server will create this admin automatically the first time it starts (only if no users exist yet).
3. Or run the bootstrap request manually after the server is running:
   ```bash
   curl -X POST http://localhost:4000/auth/bootstrap \
     -H "Content-Type: application/json" \
     -d '{"email":"you@example.com","password":"changeme123","displayName":"Your Name"}'
   ```
4. You should receive a `201` response confirming the admin account. Subsequent attempts will return `409` to prevent duplicates.

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

## Admin API (manual smoke tests)
- List users:
  ```bash
  curl http://localhost:4000/admin/users \
    -b cookies.txt
  ```
- Create a user:
  ```bash
  curl -X POST http://localhost:4000/admin/users \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{"email":"friend@example.com","password":"supersecret","displayName":"Friend"}'
  ```
- Toggle registration:
  ```bash
  curl -X PATCH http://localhost:4000/admin/settings \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{"registrationEnabled":true}'
  ```
  All admin endpoints expect an authenticated cookie session (login first).
