# Step 1: Database Migrations

> **When:** Week 1
>
> **Goal:** Create all tables the worker pipeline needs before any code touches them.

Five new tables plus extensions to the existing `runs` table. Kept minimal — no separate `run_config` or `run_ledger` tables. Configuration and cost data go in JSONB columns on `runs`.

---

## Extend the runs table

Add these columns to the existing `runs` table:

| Column | Type | Notes |
|--------|------|-------|
| project_id | uuid | FK → projects, nullable initially |
| config | jsonb | Frozen snapshot: queries, engines, crawl_limit, plan at run time |
| results_meta | jsonb | Cost/timing after completion: ai_calls, tokens, duration_ms, cost_usd |

Update the status check constraint to include `queued`:

```
pending | queued | running | completed | failed
```

Why JSONB instead of separate tables? `run_config` and `run_ledger` are write-once, read-rarely data. One `runs` row with everything is simpler to query, no joins needed. If these need indexing later, extract to tables then.

---

## New tables

### projects

One project per domain being tracked.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| org_id | uuid | FK → organizations |
| domain | text | Target website |
| name | text | Project name |
| sector | text | Business sector |
| geo | text | Geographic market |
| created_at | timestamptz | |

### crawl_pages

One row per page crawled. Evidence behind the AEO score.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| run_id | uuid | FK → runs |
| url | text | Page URL |
| crawl_status | text | `ok`, `partial`, `blocked`, `unreachable` |
| confidence | int | 0–100 |
| extraction_method | text | `html` or `js_render` |
| text_length | int | Extracted text length |
| h1 | text | |
| h2s | text[] | |
| has_faq | boolean | |
| has_schema | boolean | |
| schema_types | text[] | JSON-LD types found |
| internal_link_count | int | |
| page_quality_score | int | 0–100, composite of 5 AEO checks |
| raw_html | text | Raw HTML content (move to Supabase Storage if too large) |

### ai_results

One row per query per engine. Evidence behind the AVS score.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| run_id | uuid | FK → runs |
| query | text | The prompt sent |
| query_source | text | `seenly_suggested` or `user_added` |
| engine | text | `openai`, `anthropic`, `google` |
| position | int | 1, 2, or 3 (null if not cited) |
| cited_domain | text | Domain mentioned |
| snippet | text | Citation text |
| sentiment | text | `favorable`, `neutral`, `cautious`, `unfavorable` |
| is_target | boolean | Whether this is the target brand |
| is_degraded | boolean | Response was unusable or partial |
| raw_response | jsonb | Full AI response (for audit) |

### run_scores

Final scores for a run. One row per run. **Immutable after creation.**

| Column | Type | Notes |
|--------|------|-------|
| run_id | uuid | FK → runs, unique |
| avs_score | int | AI Visibility Score, 0–100, nullable |
| aeo_score | int | 0–100, nullable |
| sentiment_score | int | 0–100, nullable |
| seenly_score_base | int | Before penalties |
| seenly_score_final | int | After penalties |
| penalties_applied | jsonb | Array of penalty codes |
| avs_confidence | int | 0–100 |
| aeo_confidence | int | 0–100 |
| completed_at | timestamptz | |

No `geo_score` — deferred to Phase 4.

### competitors

Domains detected from AI responses.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| run_id | uuid | FK → runs |
| domain | text | Competitor domain |
| mention_count | int | Times cited across queries |
| query_count | int | Distinct queries where cited |
| avg_position | decimal | Average position (1–3) |

---

## RLS policies

All tables get RLS policies scoped by `org_id`:

- **projects** — read: org members. Write: admin + analyst. Delete: admin.
- **crawl_pages, ai_results, run_scores, competitors** — read: org members (join through `runs.org_id`). Write: service role only (worker).

---

## Migration file

Create `supabase/migrations/008_analysis_engine.sql`. Run it against the dev database and verify all tables, constraints, and indexes exist before moving to step 2.

---

## Done when

- [x] All 5 new tables exist with correct types and constraints
- [x] `runs` table has `project_id`, `config`, and `results_meta` columns
- [x] Status check constraint includes `queued`
- [x] RLS policies applied and tested
- [x] Migration runs clean on a fresh database
