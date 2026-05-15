# Seenly — Progress

_March 2026_

---

## Done

**M1 — Foundation**
- Signup, login, org creation, invite-code onboarding
- Role-based access — admin, analyst, executive
- Dashboard shell, sidebar, mobile nav

**M2 — Analysis Engine**
- Python worker — polls runs, processes up to 3 in parallel, recovers stale runs
- Crawls target site — sitemap, JS rendering, 5 AEO checks per page
- Queries ChatGPT, Claude, Gemini across 4 prompt types
- Scores AVS, AEO, Sentiment → Seenly Score with penalties
- Detects competitors mentioned across multiple queries
- Run detail dashboard — score cards, evidence, crawl, competitors tabs
- Retry on failed runs, stale run recovery, Docker Compose for worker

---

## Left to build

**M3 — Billing & notifications** _(2–3 weeks)_
- Stripe subscriptions, checkout, webhooks
- Transactional email — welcome, run completed, payment
- In-app notification bell

**M4 — Intelligence & action** _(4 weeks)_
- Recommendations engine
- Project dimension fields — country, language, market, activity
- GEO analysis — scores by region
- Scheduled runs — daily / weekly / monthly
- CSV import and export
- Persistent competitor tracking across runs

**M5 — Enterprise** _(4–5 weeks)_
- Internal admin dashboard
- Read-only API, API keys, webhooks
- SSO — SAML/OIDC, Google, Apple
- GDPR, audit log, security hardening

---

**Total remaining: ~10–12 weeks**
