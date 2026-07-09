# Deploying ImproveIt.Today to Production (Coolify)

This is the runbook for deploying the whole platform as a **single Coolify
Docker Compose resource**. Everything runs on one internal Docker network;
only the web app is exposed to the internet.

## Architecture

```
                    Internet
                       │  https://improveit.today  (TLS by Coolify/Traefik)
                       ▼
              ┌──────────────────┐
              │     web-app      │  nginx : serves the SPA,
              │   (public :80)   │  reverse-proxies /api → gateway
              └────────┬─────────┘
                       │ /api/*        internal network "improveit"
                       ▼
              ┌──────────────────┐
              │   api-gateway    │  :8000  (JWT auth, rate limits, routing)
              └────────┬─────────┘
        ┌──────────────┼─────────────────────────────┐
        ▼              ▼                               ▼
   user/problem/   payment/bidding/            media-service → minio
   voting/... (12 services, :8001–8012)        search-service → elasticsearch
        │              │
        ▼              ▼
     postgres        kafka + zookeeper            redis   (all INTERNAL only)
```

**Public:** `web-app` only. **Never** assign a domain or publish host ports for
the gateway, backend services, postgres, redis, kafka, zookeeper, elasticsearch,
or minio — they talk over the internal network by service name.

## Files this deploy uses

| File | Purpose |
|---|---|
| `docker-compose.coolify.yml` | The whole stack (infra + 13 services + web-app + bot) |
| `.env.coolify.example` | Every env var / secret the compose needs |
| `interfaces/web-app/Dockerfile` + `nginx.conf` | SPA build + `/api` proxy |
| `interfaces/telegram-bot/Dockerfile` | Bot image (optional) |
| `.dockerignore` | Keeps build context lean |

---

## Step 1 — DNS
Point `improveit.today` (A / AAAA, or CNAME) at your Coolify server's IP.

## Step 2 — Create the Coolify resource
1. New Resource → **Docker Compose** (from your Git repo).
2. Branch: `deploy/coolify-production` (or `main` after you merge).
3. **Base Directory:** `/`  •  **Compose file:** `docker-compose.coolify.yml`.

## Step 3 — Environment variables
Copy every key from `.env.coolify.example` into the resource's **Environment
Variables** and fill real values. Generate secrets with `openssl rand -hex 32`.
Must-set before first deploy:

- `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `JWT_SECRET`
- `S3_ACCESS_KEY`, `S3_SECRET_KEY` (these are the MinIO root creds **and** the
  media-service client — they must match)
- `CORS_ORIGIN=https://improveit.today`
- `VITE_MAPBOX_TOKEN` (build-time — the map is blank without it)
- Provider keys as you enable features: `STRIPE_SECRET_KEY`, `SENDGRID_*`,
  `TWILIO_*`, `TELEGRAM_BOT_TOKEN`

> `VITE_MAPBOX_TOKEN` is baked into the JS bundle **at build time**. Changing it
> later requires a rebuild/redeploy of `web-app`, not just a restart.

## Step 4 — Assign the domain (web-app only)
In the resource's **Domains**, set `https://improveit.today` on the **`web-app`**
service (port 80). Leave every other service with no domain. Coolify's Traefik
provisions the Let's Encrypt certificate on first request.

## Step 5 — Deploy
Deploy. Coolify builds the images (each service builds from repo root via its
Dockerfile) and starts the stack. First build is slow (installs + turbo builds).

## Step 6 — Database schema
On a **fresh** postgres volume, `packages/database/schemas/001_initial_schema.sql`
is applied automatically on first boot (mounted into `docker-entrypoint-initdb.d`).

For an existing/managed DB, or to apply later migrations, run once against the
prod `DATABASE_URL` (Coolify → resource → **Execute Command**, or a one-off):
```
npm run db:migrate
```

## Step 7 — Verify
- `https://improveit.today` → SPA loads (hero + map).
- `https://improveit.today/api/health` → `{"status":"ok",...}` (proves the nginx
  `/api` proxy reaches the gateway).
- Register + log in end-to-end.
- From outside, confirm postgres/redis/kafka/elasticsearch/minio are **not**
  reachable (no host ports, no domains).

---

## Security checklist (do before go-live)
- [ ] Every secret rotated off the `CHANGE_ME` / dev defaults.
- [ ] No `ports:` published and no domain on any infra/backend service.
- [ ] `CORS_ORIGIN` is exactly `https://improveit.today`.
- [ ] Gateway `/metrics` is not routed publicly (it's unauthenticated — it stays
      internal because only `/api` and `/` are proxied by nginx).
- [ ] MinIO root creds are non-default; Stripe/SendGrid/Twilio use live keys.
- [ ] (Hardening) Enable Elasticsearch `xpack.security` once search-service uses it.

## Scaling & ops notes
- The gateway's rate limiter is Redis-backed, so you can run multiple gateway
  replicas without the limit multiplying. Redis needs `REDIS_PASSWORD` set.
- `analytics-service`, `moderation-service`, `search-service` are currently
  minimal (only bind a port). They deploy but do little until implemented.
- The `web-app` JS bundle is large (~1.1 MB + mapbox ~1.8 MB). Consider code
  splitting later; not a blocker for launch.
- Managed alternative: you can move `postgres` and `redis` to Coolify's one-click
  managed databases (automatic backups) and delete those two services here —
  just repoint `DATABASE_URL` / `REDIS_URL`. PostGIS + Kafka/ES/MinIO stay in
  this compose.
