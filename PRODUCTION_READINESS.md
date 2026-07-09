# Production Readiness — Status & Gaps

**Last verified:** 2026-07-09 (CI E2E on PostGIS: lifecycle 13/13 + authz 16/16 + refresh 8/8 + rate-limit 3/3)

## ✅ Verified working (not just written — exercised)

| Check | Evidence |
|---|---|
| Full lifecycle E2E | `tests/e2e/full-lifecycle.mjs` — 13/13 steps through the API gateway against live PostGIS + Kafka: register → login → report → vote → fund → contribute → solver → bid → accept → `in_progress` → resolve |
| Identity propagation | Gateway strips client-supplied `x-user-*` headers and injects the verified JWT identity; services take the acting user from those headers, never from the body (`getAuthUser` in `@improveit/common`) |
| Ownership & role checks | Problems (modify/delete), bids (submit-as-self, accept by problem owner, withdraw by bid owner), campaigns (cancel), escrow release, solver verification, profiles — all gated (`canActOn`) |
| Authorization E2E | `tests/e2e/authz.mjs` — 16/16: spoofed body `userId` ignored on create/vote; non-owners get 403 on resolve/delete/accept/withdraw/profile-edit; owners still succeed |
| Refresh tokens | `tests/e2e/auth-refresh.mjs` — 8/8: register/login issue rotating refresh tokens (stored SHA-256-hashed in `sessions`); `/auth/refresh` rotates + invalidates the consumed token; `/auth/logout` revokes; web app refreshes silently on 401 |
| CI | `.github/workflows/ci.yml` — lint + strict build on every push/PR, plus four E2E suites (lifecycle, authz, refresh, rate-limit) and an observability check (`/metrics` + request-id) against a PostGIS service container with all seven services booted |
| Production builds | `npx turbo run build` — 16/16 packages compile with strict tsc |
| Web app | `tsc --noEmit` clean; production Vite build succeeds; auth, report, dashboard, detail flows render verified in browser |
| Infrastructure bring-up | `docker compose up` → PostGIS 3.3 with full schema auto-applied (20 tables + `vote_aggregates` matview), Kafka, Redis healthy |
| Gateway | JWT auth on all non-public routes, helmet, CORS; proxied POST/PATCH bodies fixed (`fixRequestBody`) |
| Rate limiting | Global flood guard (100/min) + strict per-IP limiter on `/api/auth/{login,register,refresh}` (20 / 15 min, brute-force guard); both return the platform 429 envelope. Proven by `tests/e2e/rate-limit.mjs` |
| Secrets hygiene | No hardcoded secrets in source; all via env; k8s manifests use `secretKeyRef` |
| Container/deploy assets | Dockerfile per service (13); k8s manifest per core service (10) with health probes + resource limits; gateway env covers all routed services |

## 🚧 Gaps that gate a real public launch (ranked)

1. ~~**Trust boundary — identity spoofable.**~~ **RESOLVED 2026-07-09.** Gateway propagates verified identity via `x-user-*` headers (client values stripped); services never trust body `userId` when gateway identity is present. Note: services still accept body `userId` on direct (non-gateway) calls for dev convenience — in production, services must only be reachable through the gateway (they are ClusterIP-only in k8s).
2. ~~**No ownership/authorization checks.**~~ **RESOLVED 2026-07-09.** Ownership + role gates on all mutating routes; proven by `tests/e2e/authz.mjs`.
3. **Payments are mocked (HIGH before real money).** `paymentProvider.ts` is a mock; Stripe keys are scaffolded but unwired. The provider webhook does not verify signatures. Do not process real funds until Stripe is integrated with signature-verified webhooks and idempotency keys.
4. **TLS/Ingress — manifests authored, not yet applied (MEDIUM).** `deployment/kubernetes/ingress/` now has an nginx Ingress (TLS for `improveit.today` + `api.improveit.today`, HTTP→HTTPS redirect) and cert-manager `ClusterIssuer`s (Let's Encrypt staging + prod); the gateway Service is now `ClusterIP` so the Ingress is the only public entry point, and a `web-app` Deployment/Service was added to back the SPA route. HSTS ships by default via `helmet()`. Remaining: install nginx-ingress + cert-manager on the cluster, point DNS, `kubectl apply`, then flip the issuer annotation staging→prod. Not runtime-verifiable without a cluster.
5. ~~**No refresh-token flow.**~~ **RESOLVED 2026-07-09.** Rotating refresh tokens (hashed in `sessions`), `/auth/refresh` + `/auth/logout`, and silent 401-triggered refresh in the web app; proven by `tests/e2e/auth-refresh.mjs`. Remaining hardening: move the refresh token to an httpOnly cookie (currently in `localStorage` via the persisted store — acceptable for MVP, XSS-exposed at scale) and add a "revoke all sessions" path.
6. **Observability — baseline done, error-reporting pending (MEDIUM).** Gateway now exposes a Prometheus `/metrics` endpoint (default runtime metrics + request count/duration), propagates an `x-request-id` across services for tracing, and emits single-line JSON logs in production (proven in CI). Remaining: wire Sentry (or equivalent) for error reporting once a `SENTRY_DSN` is available, and add `/metrics` to the other services (currently gateway-only).
7. ~~**No CI.**~~ **RESOLVED 2026-07-09.** GitHub Actions runs lint + strict build + both E2E suites (PostGIS service container, seven live services) on every push/PR to main/develop. Remaining: no unit-test infrastructure (the scaffolded `jest` scripts have no jest installed and no tests) — E2E is the current safety net.
8. **Rate limiting is per-pod memory (LOW).** Auth brute-force limiter is in place (item above), but it's per-pod: with `replicas: 2` the effective limit doubles and resets on deploy. Back it with Redis (`rate-limit-redis`) so the budget is shared across pods.
9. ~~**Vote matview refresh on every vote.**~~ **RESOLVED 2026-07-09.** Per-problem stats now come straight from the votes table (exact, cheap); the `vote_aggregates` matview (trending only) is refreshed lazily, coalesced to at most once per `VOTE_AGG_REFRESH_MS`.
10. ~~**Media upload unwired (web).**~~ **RESOLVED 2026-07-09.** The web report form now has a photo picker that uploads via the media service (`/api/media/upload`) and passes the returned URLs as `mediaUrls`. Backend (sharp optimize + thumbnail + MinIO) was already complete. Round-trip needs MinIO running to verify (not in CI); the Telegram bot still doesn't attach photos.

## Go-live checklist (in order)

- [x] Identity propagation + ownership checks (items 1–2) — *done 2026-07-09*
- [x] CI pipeline (lint + build + E2E) — *done 2026-07-09*
- [ ] Generate a strong `JWT_SECRET`; create `gateway-secrets` + `db-credentials` k8s secrets
- [ ] Set `CORS_ORIGIN` to the real web origin (manifest defaults to `https://improveit.today`)
- [~] Ingress + TLS in front of the gateway — *manifests authored 2026-07-09 (`deployment/kubernetes/ingress/`); needs cluster apply + DNS*
- [x] Baseline observability — /metrics + request-id tracing + JSON logs (gateway) — *done 2026-07-09*
- [ ] Sentry (or equivalent) error reporting once `SENTRY_DSN` is provisioned
- [x] Refresh-token flow (rotating, revocable) — *done 2026-07-09*
- [ ] Stripe + signature-verified webhooks before enabling real payments (mock provider is fine for pilots with no real money)
- [x] Debounce vote matview refresh — *done 2026-07-09*; still worth a load test before high traffic

## How to re-verify locally

```bash
docker compose up -d postgres redis zookeeper kafka   # infra
node packages/database/scripts/seed.js                # admin seed (needs .env)
# start the 7 core services (user, problem, voting, authority, payment, bidding, gateway)
node tests/e2e/full-lifecycle.mjs                     # expect: ALL PASSED 13/13
```
