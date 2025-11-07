# Deploying Otter with Docker

The project ships with production-ready Dockerfiles for the Fastify API and the React UI plus a reference `docker-compose.yml`. This guide walks through building, publishing, and running the containers on a machine such as Unraid.

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

## 2. Build images
Use the provided Dockerfiles from the repo root (replace tags with whatever suits your registry):
```bash
docker build -f api/Dockerfile -t registry.example.com/otter-api:latest .
docker build -f web/Dockerfile -t registry.example.com/otter-web:latest .
```
Builds perform a multi-stage install so runtime images only contain what the services need.

## 3. Push to your registry (optional)
```bash
docker push registry.example.com/otter-api:latest
docker push registry.example.com/otter-web:latest
```
On Unraid you can also skip this step and let the compose file build locally.

## 3b. Automate pushes with GitHub Actions
The repo includes `.github/workflows/docker-images.yml`, which builds both Dockerfiles and publishes them to GitHub Container Registry (GHCR) on every push to `main`, on Git tags that start with `v`, and when manually dispatched.

How it works:
- Images are tagged as `ghcr.io/<repo_owner>/otter-api:<ref>` and `ghcr.io/<repo_owner>/otter-web:<ref>` where `<ref>` is `main`, the Git tag (e.g. `v1.0.0`), and the commit SHA.
- Authentication uses the built-in `GITHUB_TOKEN`, so no extra secrets are required. You only need to enable “Read and write packages” permissions for the repository if they’re not already granted.

After a run completes you can pull the published image and plug it straight into the compose stack:
```bash
docker pull ghcr.io/<repo_owner>/otter-api:main
docker pull ghcr.io/<repo_owner>/otter-web:main
```
Replace `<repo_owner>` with your GitHub username or org. Update `docker-compose.yml` to use these tags (or reference a versioned tag) so Unraid can deploy from GHCR without building locally.

## 4. Run with Docker Compose
The root `docker-compose.yml` wires the API and web UI together. Key points:
- `api` service mounts a `otter_data` volume at `/data` for the SQLite database and recorded audio (`DATABASE_PATH` and `STORAGE_DIR` already point there).
- `web` service serves the static Vite build over Nginx and proxies `/api/*` to the API container, mirroring the Vite dev proxy behaviour.

To run locally:
```bash
docker compose up -d
```
Otter will be reachable on <http://localhost:8080>. If you need to bind to a specific host port or integrate with an existing reverse proxy, edit the `ports:` mapping on the `web` service.

## 5. Customising for Unraid
1. Copy `docker-compose.yml` into your Unraid compose stack or the Docker folder used by the **Compose Manager** plugin.
2. Change the `image:` tags so they match the registry you pushed to, or remove the `image:` lines to have Unraid build directly from the Dockerfiles.
3. Replace the `otter_data` named volume with a bind mount to one of your array shares if you prefer:
   ```yaml
   volumes:
     - /mnt/user/appdata/otter:/data
   ```
4. If you already run a global reverse proxy (Traefik, Nginx Proxy Manager, Caddy, etc.), expose only the API service internally and publish the web container through that proxy instead of the default `8080:80` mapping.

## 6. First-time bootstrap
After the containers start, browse to the UI and walk through the bootstrap screen or call `POST /auth/bootstrap` with the credentials from your `.env`. Once the admin account exists you can clear the `BOOTSTRAP_ADMIN_*` variables.

## Maintenance
- Logs: `docker compose logs -f api` or `web`.
- Upgrades: pull the latest code, rebuild both images, and redeploy with `docker compose up -d`.
- Backups: capture the `/data` volume; it contains the SQLite database and audio assets.
