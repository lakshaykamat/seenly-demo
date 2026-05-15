# Seenly — Technology Stack

Technologies used to deliver the product in **business-overview.md** and the architecture in **system-design.md**.

---

## Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **App** | Next.js (React) | Single repo: frontend (dashboard, run history, reporting; SSR) and API routes (auth, RBAC, orchestration, Stripe). One Next.js application. |
| **Queue** | Amazon SQS | Managed; decouples run creation from execution; DLQ for failures. |
| **Workers** | Python | Crawl and parsing; rich ecosystem and AI SDKs; async I/O; deploy as container or serverless. |
| **Database** | Supabase (PostgreSQL) | Managed Postgres, auth, EU option; relational model for tenants and runs. |
| **Object storage** | Supabase Storage / Amazon S3 | Run artifacts (crawl, AI, evidence); keeps DB small. |
| **AI** | OpenAI, Anthropic, Google (Gemini) | Multi-engine consensus; abstraction for flexibility. |

---

## How it fits

- **Single repo, one Next.js app** — Frontend and API routes in the same codebase serve the user-facing features (account, projects, analyses, dashboard, billing).
- **Queue** and **Workers** deliver the analysis (run) pipeline described in system-design.
- **Database** and **storage** hold all durable data; **AI** providers power the visibility scores and recommendations in the business overview.
