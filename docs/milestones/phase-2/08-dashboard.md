# Step 8: Dashboard UI

> **When:** Week 3 (alongside API routes)
>
> **Goal:** Users can see their run results — scores, evidence, and competitors — in the dashboard.

---

## Run list page (`/runs`)

Update the existing runs page:

- Status badge per run (pending, queued, running, completed, failed)
- Seenly Score for completed runs
- Click a run to open the detail page
- Empty state stays as-is

---

## Run detail page (`/runs/[id]`)

New page. The main results view.

### Score cards

Four score cards across the top:

| Card | Score |
|------|-------|
| Seenly Score | `seenly_score_final` (badge if penalties applied) |
| AVS | `avs_score` with confidence |
| AEO | `aeo_score` with confidence |
| Sentiment | `sentiment_score` |

Null scores display as **"N/A"** — not 0, not blank.

### Tabs

Three tabs below the score cards:

1. **Evidence** — AI citations
2. **Crawl** — page analysis
3. **Competitors** — detected competitors

---

## Evidence tab

Table of AI results for this run.

| Column | Source |
|--------|--------|
| Query | `ai_results.query` |
| Engine | `ai_results.engine` |
| Position | `ai_results.position` (or "Not cited") |
| Cited domain | `ai_results.cited_domain` |
| Snippet | `ai_results.snippet` (truncated, expandable) |
| Sentiment | Badge: green/gray/yellow/red |
| Consensus | Badge if 2+ engines agree |

No filters for V1 — just display the data. Add filters later based on user feedback.

---

## Crawl tab

Table of crawled pages.

| Column | Source |
|--------|--------|
| URL | `crawl_pages.url` |
| Status | Badge: green/yellow/red |
| Quality score | 0–100 with progress bar |
| Method | html / js_render |

Click a page to expand and see headings, FAQ presence, schema types, link count.

---

## Competitors tab

Table of detected competitors.

| Column | Source |
|--------|--------|
| Domain | `competitors.domain` |
| Mentions | `competitors.mention_count` |
| Queries | `competitors.query_count` |
| Avg position | `competitors.avg_position` |

Sort by mention count (descending).

---

## Run status polling

While a run is `pending`, `queued`, or `running`:

1. Poll GET `/api/run/[id]` every 5 seconds via React Query's `refetchInterval`
2. Show a spinner
3. Stop polling on `completed` or `failed`
4. On `completed`: show scores
5. On `failed`: show error message

---

## Loading and error states

| State | What to show |
|-------|-------------|
| Loading | Skeleton placeholders (score cards + table rows) |
| Run not found | "Run not found" with back link |
| Run failed | Error message with option to retry |
| Processing | "Results will appear once analysis completes" |
| No competitors | "No competitors detected" |

---

## Deferred to Phase 4

- **Trend charts** — need 2+ runs, users won't have these on day 1
- **Evidence filters/sorting** — add based on user feedback
- **Run type badge** (light/deep) — only one run type for now
- **Cross-project comparison**

---

## Done when

- [x] Run list shows status badges and Seenly Scores
- [x] Run detail page shows 4 score cards with null handling
- [x] Evidence tab shows AI results (expandable snippets, consensus badges, query type)
- [x] Crawl tab shows pages with quality scores and expandable details
- [x] Competitors tab shows detected competitors
- [x] Polling works for in-progress runs
- [x] Loading skeletons on every section
- [x] Error states handled (retry button on failed runs, shows `results_meta.error`)
- [x] Mobile-responsive layout
