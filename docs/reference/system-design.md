# Seenly — System Design

How we build the product described in **business-overview.md**. This doc covers architecture, boundaries, and key design choices. For schemas and endpoints, see database-design and api-specification.

---

## 1. Context

Seenly is a multi-tenant SaaS: customers run **analyses** (runs), get **scores** (search, AI, site structure), **recommendations**, and **history**. Plans (Starter, Growth, Enterprise) and core features are in the business overview. Here we focus on the system that delivers that: Next.js app, workers, data, and how they interact.

---

## 2. Architecture

Three main parts: **Next.js app** (frontend + API routes), **workers**. The app does not do heavy work—it enqueues jobs and serves data. Workers do crawl, AI calls, and scoring. All durable state is in Postgres or object storage. We use a **single repo** with one Next.js application.

```
                    Users
                      │
                      ▼
         ┌────────────────────────┐
         │   Next.js (single app)  │   Dashboard, runs, settings; API routes (auth, RBAC, enqueue run, read results)
         └─────┬─────────────┬─────┘
               │             │
    enqueue    │             │  read/write
               ▼             ▼
    ┌──────────────┐   ┌─────────────────┐
    │  Queue       │   │  Postgres        │
    │  (SQS)       │   │  (Supabase)     │
    └──────┬───────┘   └────────┬────────┘
           │                     │
           │ poll                │ artifact refs
           ▼                     ▼
    ┌──────────────┐   ┌─────────────────┐
    │  Workers     │──▶│  Object storage  │
    │  (Python)    │   │  (S3/Supabase)   │
    └──────┬───────┘   └─────────────────┘
           │
           │ HTTP (worker calls out)
           ▼
    ┌──────────────────────────┐
    │  AI providers (external) │   OpenAI, Anthropic, Google
    └──────────────────────────┘
```

**Workers** are part of our system. During a run they **call out** to **AI providers** (external APIs we don’t host) over HTTP.

**Why this split:** Analyses take minutes (crawl + multiple AI calls). Doing that in the app would tie up connections and complicate scaling. So the app only creates a run and enqueues one job; workers do the rest. The app stays fast; workers scale with run volume.

---

## 3. Design decisions

| Decision                     | Why                                                                                                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Postgres (Supabase)**      | Relational model fits tenants, projects, runs, subscriptions. We need joins and reporting (e.g. MRR, activation). JSONB for run payload; FKs and transactions for integrity.           |
| **Queue (SQS)**              | Managed, no ops. Decouples “create run” from “execute run.” Visibility timeout + run_id idempotency avoid double work. DLQ for failed jobs.                                            |
| **Workers in Python**        | Crawl and parse are I/O-heavy; Python’s ecosystem (e.g. httpx, asyncio) and AI SDKs fit well. We keep long-running work out of the app. Easy to deploy (e.g. container or serverless). |
| **AI in workers**            | LLM calls are slow. In a worker we can retry, back off, and track cost in the run ledger. App never calls LLMs.                                                                        |
| **Immutable runs**           | Each run is a fixed snapshot: we never change or delete it after it finishes. We link runs to projects by ID (not by name), so renames don’t break history.                            |
| **Object storage for blobs** | Crawl HTML and AI responses stay out of Postgres. App returns signed URLs for download.                                                                                                |

---

## 4. Run lifecycle

User or schedule triggers a run → **Next.js app** checks quota, creates run record, enqueues job → **Worker** crawls site, calls AI providers, computes scores, writes result once to DB and storage → app UI polls status and shows scores and artifact links when done.

Idempotency: same run_id never processed twice. After N failures, job goes to DLQ; we alert.

---

## 5. Multi-tenancy and security

- **Isolation:** All data and jobs scoped by tenant (and project). No cross-tenant access.
- **Auth:** Supabase (JWT) for users; API keys for integrations. Admin: JWT + admin role + 2FA.
- **Secrets:** In env or secret manager; never in code or logs.
- **Audit:** Admin and sensitive actions logged (append-only).

---

## 6. Failure and scaling

| Risk                     | Mitigation                                                               |
| ------------------------ | ------------------------------------------------------------------------ |
| Worker dies mid-run      | Message reappears; run_id check avoids duplicate work. Then DLQ + alert. |
| Crawl blocked / timeout  | Record status; no fake score. UI shows “crawl blocked,” score N/A.       |
| AI provider down or slow | Timeouts, retries; optionally fewer engines; log in ledger.              |
| Run volume spike         | Per-tenant quota; queue absorbs; scale workers.                          |
| DB or app load           | Index hot paths; add capacity or read replicas as needed.                |
| Cost spike               | Per-run cost in ledger; caps and alerts; optional degradation.           |

---

## 7. Summary

- **Next.js app** — Dashboard, run history, settings; API routes for auth, RBAC, create run (enqueue), read runs and results, Stripe, admin. No crawl, no LLMs.
- **Queue** — One queue for run jobs; DLQ for failures.
- **Workers** — Crawl, AI, score, write run and ledger once; blobs to storage.
- **Postgres** — Tenants, projects, runs (immutable), ledger, audit.
- **Storage** — Run artifacts; app issues signed URLs.
- **Repo** — Single repo; one Next.js application (frontend + API routes). Workers (Python) live in the same repo; run contract stays in one place.

For implementation: **database-design.md**, **api-specification.md**, and codebase docs.
