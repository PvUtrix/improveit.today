# Production Readiness — Status & Gaps

**Last verified:** 2026-07-08 (full-stack E2E run on commit `a60788a`)

## ✅ Verified working (not just written — exercised)

| Check | Evidence |
|---|---|
| Full lifecycle E2E | `tests/e2e/full-lifecycle.mjs` — 13/13 steps through the API gateway against live PostGIS + Kafka: register → login → report → vote → fund → contribute → solver → bid → accept → `in_progress` → resolve |
| Production builds | `npx turbo run build` — 16/16 packages compile with strict tsc |
| Web app | `tsc --noEmit` clean; production Vite build succeeds; auth, report, dashboard, detail flows render verified in browser |
| Infrastructure bring-up | `docker compose up` → PostGIS 3.3 with full schema auto-applied (20 tables + `vote_aggregates` matview), Kafka, Redis healthy |
| Gateway | JWT auth on all non-public routes, helmet, rate limiting, CORS; proxied POST/PATCH bodies fixed (`fixRequestBody`) |
| Secrets hygiene | No hardcoded secrets in source; all via env; k8s manifests use `secretKeyRef` |
| Container/deploy assets | Dockerfile per service (13); k8s manifest per core service (10) with health probes + resource limits; gateway env covers all routed services |

## 🚧 Gaps that gate a real public launch (ranked)

1. **Trust boundary — identity spoofable (HIGH).** Services accept `userId` from the request body. The gateway verifies the JWT but doesn't propagate identity, so any authenticated user can act as any other. Fix: gateway sets `X-User-Id`/`X-User-Role` from the verified JWT; services read identity from those headers only (strip them at the edge); never from body.
2. **No ownership/authorization checks (HIGH).** Any authenticated user can PATCH/DELETE any problem, accept bids on any problem, or release escrow. Fix: ownership checks per resource + role gates (only the reporter or an authority resolves; only the problem owner accepts bids).
3. **Payments are mocked (HIGH before real money).** `paymentProvider.ts` is a mock; Stripe keys are scaffolded but unwired. The provider webhook does not verify signatures. Do not process real funds until Stripe is integrated with signature-verified webhooks and idempotency keys.
4. **No TLS/Ingress (MEDIUM).** Manifests expose the gateway as a LoadBalancer on 8000; add an Ingress with cert-manager for HTTPS, HSTS via helmet config.
5. **No refresh-token flow (MEDIUM).** 15-minute JWTs with no refresh endpoint = users re-login every 15 minutes (web app stores the token but it silently expires). Implement `/api/auth/refresh` (the `sessions` table already exists) or lengthen expiry consciously.
6. **Observability (MEDIUM).** Winston console logs only. No metrics, tracing, or error reporting (SENTRY_DSN scaffolded, unused). Minimum: structured JSON logs + a `/metrics` endpoint or Sentry wiring.
7. **No CI (MEDIUM).** Nothing enforces builds/tests on push. Add GitHub Actions: `turbo run build` + typecheck + (nightly) the E2E against docker-compose.
8. **Rate limiting is per-pod memory (LOW).** With `replicas: 2` the effective limit doubles and resets on deploy; back it with Redis (`rate-limit-redis`).
9. **Vote matview refresh on every vote (LOW at MVP scale).** `REFRESH MATERIALIZED VIEW CONCURRENTLY` per vote won't scale; move to a debounced job or trigger-maintained aggregates.
10. **Media upload unwired (LOW).** Backend accepts `mediaUrls`; media-service and MinIO exist but the web/bot flows don't upload photos yet.

## Go-live checklist (in order)

- [ ] Identity propagation + ownership checks (items 1–2)
- [ ] Generate a strong `JWT_SECRET`; create `gateway-secrets` + `db-credentials` k8s secrets
- [ ] Set `CORS_ORIGIN` to the real web origin (manifest defaults to `https://improveit.today`)
- [ ] Ingress + TLS in front of the gateway
- [ ] CI pipeline green on main
- [ ] Sentry (or equivalent) wired in gateway + services
- [ ] Refresh-token flow (or explicit expiry decision)
- [ ] Stripe + signature-verified webhooks before enabling real payments (mock provider is fine for pilots with no real money)
- [ ] Load-test the vote path; debounce matview refresh if needed

## How to re-verify locally

```bash
docker compose up -d postgres redis zookeeper kafka   # infra
node packages/database/scripts/seed.js                # admin seed (needs .env)
# start the 7 core services (user, problem, voting, authority, payment, bidding, gateway)
node tests/e2e/full-lifecycle.mjs                     # expect: ALL PASSED 13/13
```
