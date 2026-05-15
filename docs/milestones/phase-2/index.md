# Phase 2: Analysis Engine

> Turn a `pending` run into scored, evidence-backed results.
>
> **Timeline:** 3 weeks + 2 update steps — **Complete**
>
> **Depends on:** Phase 1 (auth, runs table, dashboard shell)

This is the core of the product. A background worker picks up jobs, crawls the website, asks AI engines questions about the brand, and turns all of that into a score. Everything else in the product depends on this working correctly.

**Status: Done.** All 11 steps shipped. Worker is running in Docker Compose. Run detail dashboard shows score cards, evidence, crawl, and competitors tabs. Retry on failed runs and stale run recovery are live.

---

## What was built

- Python worker with `ThreadPoolExecutor` concurrency, atomic run claiming via `claim_pending_run()`
- Playwright crawl with sitemap discovery and JS rendering fallback
- Business understanding: LLM extracts offer clusters from crawled content, generates 4 query types (discovery, comparison, alternatives, educational)
- AI querying: OpenAI, Anthropic, Google via OpenRouter — consensus rule (2+ engines must agree per query)
- Scoring: AVS 45%, AEO 35%, Sentiment 20% → Seenly Score with penalties
- Competitor detection per run
- Run detail dashboard: score cards, Evidence (expandable snippets), Crawl, Competitors tabs
- Retry button on failed runs showing `results_meta.error`; stale run recovery
- Crawl fallback: project settings → domain keywords when site is unreachable
- Docker Compose + `.dockerignore` for worker deployment

---

## Steps

| Step | File | What it covers | Week |
|------|------|---------------|------|
| 0 | [00-project-layout.md](./00-project-layout.md) | Create the `workers/` folder with all the pipeline files | 1 |
| 1 | [01-database.md](./01-database.md) | Five new tables: projects, crawled pages, AI results, scores, competitors | 1 |
| 2 | [02-queue-worker.md](./02-queue-worker.md) | Worker that picks up runs from the database and processes them | 1 |
| 3 | [03-crawl.md](./03-crawl.md) | Visit the target site, pull content from pages, score each page | 1–2 |
| 4 | [04-business-understanding.md](./04-business-understanding.md) | Use an LLM to understand what the business does, then write questions to ask AI engines | 2 |
| 5 | [05-ai-querying.md](./05-ai-querying.md) | Send those questions to ChatGPT, Claude, and Gemini, record what they say | 2–3 |
| 6 | [06-scoring-competitors.md](./06-scoring-competitors.md) | Turn all those responses into a score, detect which competitors showed up | 3 |
| 7 | [07-api-routes.md](./07-api-routes.md) | API endpoints so the dashboard can show the results | 3 |
| 8 | [08-dashboard.md](./08-dashboard.md) | The run detail page — score cards, evidence table, crawl results | 3 |
| 9 | [09-prompt-types.md](./09-prompt-types.md) | Make question generation cover all four types: discovery, comparison, alternatives, educational | after core |
| 10 | [10-crawl-fallback.md](./10-crawl-fallback.md) | When a site can't be crawled, generate questions from project info instead | after core |

Steps 9 and 10 are updates to the already-built pipeline. They don't change how the engine works structurally — they make it more thorough and more resilient.

---

## Plan limits

| Limit | Starter | Growth | Enterprise |
|-------|---------|--------|------------|
| Runs per month | 50 | 500 | Unlimited |
| Pages crawled | 3 | 10 | 30 |
| Questions asked | 5 suggested + 2 from user = 7 | 10 + 5 = 15 | 20 + 15 = 35 |
| AI engines used | 2 of 3 | 3 of 3 | 3 of 3 |
| Competitors tracked | 3 | 5 | 10+ |

---

## Rules that don't bend

- **Scores are permanent.** Once a run completes, its scores can't be changed or deleted.
- **Missing data isn't zero.** If we couldn't measure something, it shows as "N/A" — not 0.
- **Blocked sites aren't penalized.** If a site refuses to be crawled, that's not a content quality problem.
- **Bad AI responses are kept.** If an AI engine returns garbage, we flag it and keep it — we don't pretend it didn't happen.
- **Two engines must agree.** A mention only counts toward the score if at least two AI engines said the same thing for the same question.

---

## Deliverable

User creates a run → worker picks it up → crawls the site, asks AI engines questions, computes scores → results are saved → dashboard shows scores, evidence, and which competitors came up.
