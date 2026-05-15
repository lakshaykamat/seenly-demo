# Seenly — Milestones

Five phases from zero to enterprise-ready. Each phase builds on the last. Nothing gets skipped.

---

## M1: Foundation — _Done_

> Auth, multi-tenancy, roles, dashboard shell, CI/CD.

The groundwork. Users can sign up, create or join an org, and land on a working dashboard. Three roles enforce access at every layer — middleware, API, and database. Runs can be created but sit at `pending` because there's no engine behind them yet.

Broken into [7 reference steps](./phase-1/index.md) documenting what was built.

---

## M2: Analysis Engine — _Done_

> Crawl sites, query AI engines, compute scores, show results.

This is the core product. A Python worker polls the database for pending runs, claims them atomically, crawls the target site, sends queries to three AI engines across four question types (discovery, comparison, alternatives, educational), applies the consensus rule, and computes the Seenly Score across three measured pillars: AVS, AEO, and Sentiment. GEO analysis is Phase 4. Results are immutable once written. The dashboard shows score cards, evidence tables, and competitor detection. Crawl fallback uses project settings when a site can't be reached.

Broken into [11 steps (0–10)](./phase-2/index.md) — steps 0–8 are the core pipeline, steps 9–10 are prompt types and crawl fallback.

---

## M3: Billing, Email & Notifications — _2–3 weeks_

> Payments and communication.

Stripe handles subscriptions — checkout, portal, webhooks. Plan changes sync quota immediately. Resend (or SendGrid) powers transactional emails: welcome, onboarding drip, run completed, payment confirmations. A notification bell in the header shows unread alerts for runs, payments, and role changes.

Well-trodden territory. Stripe and email providers have good docs. Two weeks covers the critical path (billing + core emails + notifications). Third week is buffer for onboarding drip and email template polish. Broken into [5 implementation steps](./phase-3/index.md).

---

## M4: Intelligence & Action — _4 weeks_

> Turn scores into something users can act on. Multi-project support, scoped analysis, and data flowing in and out.

Recommendations are the top priority here — each one says what's wrong, where it applies (dimension scope), and what to do. Marking one resolved snapshots the current scores so the next run can measure actual impact.

Projects get full CRUD with dimension fields (activity, country, language, market) and an onboarding wizard for first-time users. With dimensions in place, scores break down by market and country — a GEO Analysis page shows a region matrix at a glance. Competitors are tracked persistently across runs. Scheduled runs (daily/weekly/monthly) keep monitoring automatic. Data flows in via CSV import (topics, competitors, custom prompts) and out via CSV export. The Evidence tab gets a Sankey chart. The sidebar is restructured into four named groups. Scenario runs are enterprise-only and explicitly deferrable.

Broken into [5 implementation steps](./phase-4/index.md).

---

## M5: Scale & Enterprise — _4–5 weeks_

> Everything needed to hand this to a large org and trust it won't break, leak, or get exploited.

An internal admin dashboard for Seenly staff with TOTP 2FA, user management, revenue KPIs, and system health. Tenant-facing API keys with rate limiting and a read-only API (`/scores`, `/topics`, `/competitors`, `/recommendations`) — no write operations, just enough to pull data programmatically. Webhook delivery for enterprise integrations. SSO via SAML/OIDC plus Google and Apple OAuth.

GDPR compliance: cookie consent, right to deletion, data portability, legal pages. An immutable audit log for admin and privileged actions. Sentry for error monitoring, request tracing, and alerting. Security hardening, a full test suite, and white-label + approval workflows for enterprise contracts.

Broken into [5 implementation steps](./phase-5/index.md).

---

## Timeline

| Phase  | Focus                                 | Duration  | Buffer                                      | Status |
| ------ | ------------------------------------- | --------- | ------------------------------------------- | ------ |
| **M1** | Auth, tenancy, roles, dashboard       | 2 weeks   | —                                           | Done   |
| **M2** | Crawl, AI consensus, scoring, results | 4 weeks   | —                                           | Done   |
| **M3** | Stripe, emails, notifications         | 2–3 weeks | Week 3 for drip + polish                    | Next   |
| **M4** | Recommendations, intelligence, exports | 4 weeks   | Scenario runs deferrable (enterprise-only)  | —      |
| **M5** | Admin, API, security, compliance       | 4–5 weeks | Week 5 for hardening + pen-test prep        | —      |

> **Total estimated: 17–20 weeks** from M2 start to M5 complete. Phases are sequential — each depends on the one before it.
>
> The range accounts for reality: 17 weeks if everything goes smoothly, 20 if the risk weeks (LLM integration, SAML) need extra time. Every phase has an identified buffer week and deferral options for non-critical features.

---

## What changed (Mar 19 update)

Run detail UI polish (all in `app/(dashboard)/runs/[id]/page.tsx`):
- Retry button on failed runs — calls `POST /api/run`, shows `results_meta.error` instead of generic message
- Expandable evidence snippets — click to expand/collapse truncated text
- Summary counts (queries · pages · competitors) hidden until run is `completed`
- Tab counts `(n)` hidden when zero
- Degraded rows show tooltip explaining why the row is dimmed
- Docker Compose (`docker-compose.yml`) + worker `.dockerignore` added

---

## What changed (Mar 13 update)

Scope was tightened to focus on the core product loop. All changes are folded directly into the phase docs.

**Cut entirely:** Prompt volume analytics, Agent Analytics, Audit Trail (user-facing), Recap, History, third-party integrations.

**Post-MVP (not in any phase):** Content Engine (AI article generation). Scenario runs remain in Phase 4 as an enterprise-only deferrable.

**Phase 2 additions:** Four prompt types — discovery, comparison, alternatives, educational (step 9). Crawl fallback — when a site can't be crawled, fall back to project settings instead of failing (step 10).

**Phase 4 additions:** Recommendations engine promoted to top priority (step 1) — each recommendation includes source ecosystem evidence (Reddit, blogs, review platforms, etc.), estimated score impact, and a content draft generated by the worker. Source intelligence aggregation — worker classifies sources from AI responses into seven ecosystems; per-run breakdown stored in `run_scores.source_distribution`, surfaced as "AI Citation Sources" card on run detail, exportable as CSV (step 3). Dimension fields on projects — activity, country, language, market (step 2). Scoped scoring and GEO Analysis page — AVS/Sentiment breakdowns by country and activity, region matrix (step 3). Competitor citation share tracked alongside brand citations across runs (step 3). CSV import for topics, competitors, and custom prompts — replaces third-party integrations (step 5). Sankey chart on Evidence tab (step 5). Sidebar restructure into four named groups (step 5).

**Phase 5 clarification:** Read-only API — five endpoints (`/scores`, `/topics`, `/competitors`, `/recommendations`, `/source-intelligence`), no write operations, bearer token auth — sits alongside API key management and webhooks in step 2.
