# Deploying Otter with Docker

The project now ships with a single-container image (API + UI) plus optional per-service images and a reference `docker-compose.yml`. This guide walks through building, publishing, and running the containers on a machine such as Unraid.

## 1. Prepare API configuration
1. Copy the sample env file and update the values for your environment:
   ```bash
   cp api/.env.example api/.env
   ```
2. **Required settings**:
   - `JWT_SECRET` – generate a long random string.
   - `BOOTSTRAP_ADMIN_*` – only needed the first time to create the initial admin user.
3. Recommended settings when running behind Docker:
   - `CORS_ORIGIN=http://localhost:8080` (or the external URL you expose the UI on if you bypass the built-in proxy).
   - `COOKIE_SECURE=true` if you terminate TLS in front of the containers.
4. `UI_DIST_PATH` is managed automatically by the single-container image; only set it manually if you mount a custom UI build into the API container.

## 2. Build images
**Option A (recommended): single image**
```bash
docker build -t registry.example.com/otter-app:latest .
```
This Dockerfile installs both workspaces, builds the Fastify API and Vite UI, and serves the UI directly from Fastify so you only manage one container.

**Option B (advanced): split services**
```bash
docker build -f api/Dockerfile -t registry.example.com/otter-api:latest .
docker build -f web/Dockerfile -t registry.example.com/otter-web:latest .
```
Use this if you explicitly want to run API and UI separately (e.g. behind an existing reverse proxy tier).
When doing so, create a compose stack with two services (similar to the previous version of `docker-compose.yml`) where the web container proxies `/api/*` to the API container.

## 3. Push to your registry (optional)
```bash
docker push registry.example.com/otter-app:latest
```
On Unraid you can also skip this step and let the compose file build locally. If you used Option B above, push both images instead.

## 3b. Automate pushes with GitHub Actions
The repo includes `.github/workflows/docker-images.yml`, which builds both Dockerfiles and publishes them to GitHub Container Registry (GHCR) on every push to `main`, on Git tags that start with `v`, and when manually dispatched.

How it works:
- Images are tagged as `ghcr.io/<repo_owner>/otter-app:<ref>` (single container), `otter-api:<ref>`, and `otter-web:<ref>` where `<ref>` is `main`, the Git tag (e.g. `v1.0.0`), and the commit SHA.
- Authentication uses the built-in `GITHUB_TOKEN`, so no extra secrets are required. You only need to enable “Read and write packages” permissions for the repository if they’re not already granted.

After a run completes you can pull any published image and plug it straight into the compose stack. For the all-in-one container:
```bash
docker pull ghcr.io/<repo_owner>/otter-app:main
```
Replace `<repo_owner>` with your GitHub username or org. Update `docker-compose.yml` to use `${OTTER_IMAGE:-ghcr.io/<repo_owner>/otter-app:main}` (already supported) so Unraid can deploy from GHCR without building locally.

## 4. Run with Docker Compose
The root `docker-compose.yml` now starts a single `app` service. Key points:
- Exposes port `8080` on the host and forwards to Fastify on port `4000` inside the container so API + UI share the same origin.
- Mounts the `otter_data` volume at `/data` for the SQLite DB and recorded audio (referenced by `DATABASE_PATH` / `STORAGE_DIR`).
- Reads runtime configuration from `api/.env` just like local development.
- You can override the image via `OTTER_IMAGE=ghcr.io/<repo_owner>/otter-app:main docker compose up -d --pull always`.

To run locally:
```bash
docker compose up -d
```
Otter will be reachable on <http://localhost:8080>. If you need to bind to a specific host port or integrate with an existing reverse proxy, edit the `ports:` mapping on the `app` service.

## 5. Customising for Unraid
1. Copy `docker-compose.yml` into your Unraid compose stack or the Docker folder used by the **Compose Manager** plugin.
2. Set `OTTER_IMAGE=ghcr.io/<repo_owner>/otter-app:latest` (or edit the compose file) so Unraid pulls the published image instead of building locally.
3. Replace the `otter_data` named volume with a bind mount to one of your array shares if you prefer:
   ```yaml
   volumes:
     - /mnt/user/appdata/otter:/data
   ```
4. If you already run a global reverse proxy (Traefik, Nginx Proxy Manager, Caddy, etc.), map the container’s port 4000 to an internal-only host port and let the proxy handle TLS/hostnames.

## 6. First-time bootstrap
After the containers start, browse to the UI and walk through the bootstrap screen or call `POST /auth/bootstrap` with the credentials from your `.env`. Once the admin account exists you can clear the `BOOTSTRAP_ADMIN_*` variables.

## Maintenance
- Logs: `docker compose logs -f app`.
- Upgrades: pull the latest code, rebuild the single image (or let the GH Action do it), and redeploy with `docker compose up -d`.
- Backups: capture the `/data` volume; it contains the SQLite database and audio assets.
