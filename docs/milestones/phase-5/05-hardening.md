# Step 5: Hardening — Observability, Security & Enterprise

> **When:** Week 5–6
>
> **Goal:** The product is stable enough to trust in production, secure against common attacks, and ready for enterprise contracts.

---

## Observability

**Error monitoring:** Sentry in both the Next.js app and the Python worker. Every unhandled error gets captured with context — user ID, org ID, request details. Set up alerts for error spikes.

**Structured logging:** The existing `lib/logger.ts` already handles structured logs. Make sure every API route and worker step logs at the right level with consistent fields: `userId`, `orgId`, `action`, `duration_ms`.

**Alerting:** Critical alerts on PagerDuty or similar:
- Worker error rate > 5% in the last 15 minutes
- Run queue depth > 50 (worker falling behind)
- Database connection errors
- Stripe webhook failures

**SLO targets:** 99.5% uptime for the API, < 500ms p95 for dashboard page loads, < 10 minutes median run completion time.

---

## Security hardening

**Encryption at rest:** `oidc_client_secret` in `sso_configs` and webhook secrets in `webhook_configs` are encrypted before storage, not stored as plaintext.

**Secret management:** Production secrets rotate regularly. Use a secret manager (Doppler or AWS Secrets Manager) rather than hardcoding in environment variables. Rotate `SUPABASE_SERVICE_ROLE_KEY` and `OPENROUTER_API_KEY` on a schedule.

**Abuse prevention:** Rate limit login attempts (5 per minute per IP). Rate limit run creation (burst protection beyond the quota check). Block disposable email addresses on signup.

**Dependency scanning:** Run `pnpm audit` and `pip-audit` in CI. Block deploys if high-severity vulnerabilities are found.

**Security headers:** CSP, HSTS, X-Frame-Options, X-Content-Type-Options on all responses. Configure in `next.config.ts`.

---

## Enterprise features

**White-label:** Enterprise orgs can set a custom subdomain (`acme.seenly.com`) and upload a logo. Their employees see the org's branding, not Seenly's.

**Approval workflows:** Enterprise orgs can require admin approval before a new member can access the dashboard. Pending members get an email and see a "waiting for approval" screen.

**Unlimited dimensions:** Enterprise projects aren't restricted on the number of dimension fields or the number of aliases. Starter and Growth projects have a cap.

---

## Testing

Before calling Phase 5 done, the product needs a test suite that gives confidence to ship.

**Unit tests:** Pure functions — scoring calculations, query weight formulas, penalty rules, data transformations. These are fast and catch regressions immediately.

**Integration tests:** API routes with a real test database. Cover the happy path and key error cases for every route added in Phases 2–5.

**E2E tests (Playwright):** Five critical user flows: sign up → create project → run analysis → view recommendations → export CSV. These catch the kind of bugs that only appear when everything is wired together.

**Load testing (k6):** Simulate 50 concurrent users hitting the dashboard, 10 concurrent runs in the worker. Identify bottlenecks before they hit in production.

---

## Done when

- [ ] Sentry in Next.js app and Python worker
- [ ] Alerts configured for error rate, queue depth, and DB errors
- [ ] Structured logs have consistent fields across all routes and worker steps
- [ ] OIDC secrets and webhook secrets encrypted at rest
- [ ] Rate limiting on login attempts and run creation
- [ ] `pnpm audit` and `pip-audit` in CI, blocking on high severity
- [ ] Security headers set in `next.config.ts`
- [ ] White-label: custom subdomain + logo for enterprise orgs
- [ ] Approval workflows for enterprise orgs
- [ ] Unit tests for scoring, weights, and penalty rules
- [ ] Integration tests for all major API routes
- [ ] E2E tests for 5 critical user flows
- [ ] Load test results within acceptable SLO targets
