# Analysis Engine

The engine is a Python worker that picks up pending runs, processes them through a 5-step pipeline, and writes everything back to the database. It runs in Docker alongside the Next.js app.

## File layout

```
worker.py          Poll loop — claims pending runs, calls pipeline
config.py          Env vars, plan limits, all tunables in one place
db.py              Supabase client (service role), DB helpers
pipeline/
  __init__.py      Orchestrator — runs all steps in sequence
  helpers.py       Shared utilities (domain matching, noise filtering)
  crawl.py         Step 1 — discover + fetch + extract pages
  understand.py    Step 2 — LLM profile extraction + query generation
  ai_query.py      Step 3 — multi-engine querying + mention parsing
  competitors.py   Step 4 — competitor detection from AI responses
  scoring.py       Step 5 — AVS, AEO, Sentiment, Seenly Score
  cancellation.py  Cancellation token checked before each step
```

## Pipeline flow

```
POST /api/run (status: pending)
       │
       ▼
  ┌─────────┐
  │  Crawl   │  Discover URLs → fetch pages → extract content → score page quality
  └────┬─────┘
       │ crawl_pages[]
       ▼
  ┌──────────┐
  │Understand│  Page text → LLM → business profile → LLM → search queries
  └────┬─────┘
       │ profile + queries[]
       ▼
  ┌──────────┐
  │ AI Query │  Round 1: queries × engines → extract mentions → batch sentiment
  │          │  Round 2: follow-up queries vs top competitors
  └────┬─────┘
       │ ai_results[]
       ▼
  ┌────────────┐
  │Competitors │  Aggregate cited domains → filter noise → rank by query type
  └────┬───────┘
       │ competitors[]
       ▼
  ┌─────────┐
  │ Scoring  │  AVS + AEO + Sentiment → composite Seenly Score → apply penalties
  └────┬─────┘
       │
       ▼
  status: completed
```

Cancellation is checked before each step. If a run is cancelled mid-flight, it raises `RunCancelled` and stops cleanly.

---

## Step 1: Crawl

Gets real content from the target site — not just the homepage.

1. **URL discovery** — tries `sitemap.xml` first, then checks `robots.txt` for a Sitemap directive, then falls back to extracting links from the homepage
2. **Depth-2 discovery** — also extracts links from high-value pages found in step 1 (not just the homepage), so product pages and feature pages that aren't in the sitemap still get picked up
3. **Page selection** — filters out non-business pages (blog posts, legal, auth) and prefers paths like `/pricing`, `/features`, `/about`, `/compare`, `/use-cases`, `/customers`
4. **Fetch** — standard HTTP GET. Pages with thin content (<800 chars) are queued for JS rendering
5. **JS rendering** — thin pages are rendered with a single shared Playwright browser (one instance per crawl, not per page)
6. **Content extraction** — strips nav/header/footer/script/style noise before pulling text. Also grabs meta description and og:description as additional business signal. Extracts H1, H2s, FAQ detection, JSON-LD schema types, internal link count
7. **Deduplication** — content hash = MD5(H1 + text_length + URL path). Prevents storing near-duplicate pages
8. **Page quality score** — 6 checks, 0–100:

| Check | Points | Signal |
|-------|--------|--------|
| Topic clarity | 15 | H1 with 3+ words |
| Heading structure | 15 | H1 + 3+ H2s |
| Content depth | 20 | Word count (1000+ = full) |
| FAQ presence | 20 | FAQ section detected |
| Schema markup | 15 | JSON-LD types present |
| Internal linking | 15 | 10+ unique internal links |

**Writes:** `crawl_pages` rows.

---

## Step 2: Understand

Turns raw page text into a structured business profile, then generates the search queries that will actually run through the AI engines.

### Profile extraction

Three LLM tiers, tried in order. If all three fail, the run fails — there's no point generating junk queries.

**Tier 1 — crawled content** (`mode: full`): Combines the best page texts (up to 18k chars, truncated at a sentence boundary) and asks GPT-4o-mini to extract:
- A 2-3 sentence summary of what the company does, who it serves, and what makes it different
- 3–6 offer clusters, each with: name, specific search keywords, target buyer persona, differentiator, and confidence score (0–1)

Clusters below 0.4 confidence are dropped (keeps at least 1 if all are below threshold).

**Tier 2 — project settings** (`mode: project_settings`): When crawl returns nothing useful, falls back to the domain, business name, sector, and geo from the project record. The LLM infers a profile from those fields alone. Flags `crawl_fallback` on the run.

**Tier 3 — domain name** (`mode: minimal`): Last resort — gives the LLM just the domain name and sector and asks it to infer what the business likely does. Confidence is set low (0.3). Queries generated from this get a 0.5× weight penalty in scoring.

### Query generation

After extracting the profile, a second LLM call generates all the search queries — no templates.

The prompt includes the full profile: summary, clusters with their keywords and buyer personas, and differentiators. The LLM generates natural queries a real buyer would type into ChatGPT or Perplexity. Query count is capped at the plan limit (25 max).

Type distribution for 25 queries:

| Type | Count | Example |
|------|-------|---------|
| discovery | 8 | "best workflow automation for logistics teams" |
| comparison | 6 | "zapier vs make for enterprise" |
| alternatives | 6 | "alternatives to monday.com for project tracking" |
| educational | 5 | "how to choose a CRM for small teams" |

If the full query generation call fails, there's a simpler fallback: same LLM call but using only the summary instead of the full profile.

**Writes:** Generated queries to `runs.config.queries_used`.

---

## Step 3: AI Query

Sends every query to every engine, parses who they recommend, classifies sentiment.

### Round 1

All queries × engines run in parallel (up to 10 concurrent calls). For each response:

1. Extracts up to 10 domain mentions — the prompt asks engines to format recommendations as a numbered list with domains in parentheses, making extraction reliable
2. Records position (1 = first mentioned), query type, and whether it's the target domain
3. Classifies sentiment for target domain mentions in a **single batched LLM call** per query — all snippets from that query go in together rather than one call per mention
4. Marks degraded responses with a structured reason code

### Round 2

After round 1, the top 2 competitor domains get follow-up comparison queries:
- `"{brand} vs {competitor}"`
- `"why choose {brand} over {competitor}"`

These go through the same engine pipeline and land in `ai_results` with `query_type: comparison`.

### Engines

All three engines run on every plan.

| Engine | Model |
|--------|-------|
| OpenAI | gpt-4o-mini |
| Anthropic | claude-3.5-haiku |
| Google | gemini-2.5-flash-lite |

### Degraded reason codes

| Code | Cause |
|------|-------|
| `model_unavailable` | 404 — model not found on OpenRouter |
| `rate_limit` | 429 — rate limited |
| `timeout` | Request timed out |
| `auth_error` | 401/403 — bad API key |
| `api_error` | Other API error |
| `empty_response` | LLM returned empty content |
| `no_mentions` | Response had no extractable domains |

### Sentiment

One batched LLM call per query classifies all target snippets at once. Falls back to keyword matching if the LLM call fails.

| Sentiment | Signal |
|-----------|--------|
| favorable | recommend, best, excellent, leading, trusted |
| cautious | however, limitation, expensive, complex |
| unfavorable | avoid, poor, worst, disappointing |
| neutral | none of the above |

**Writes:** `ai_results` rows + token usage to `runs.config.ai_usage`.

---

## Step 4: Competitors

Finds the other domains AI engines are recommending when someone asks about your space.

1. Aggregates all non-target domains cited across all AI results
2. Filters ~50 noise domains (social, marketplaces, review sites, news outlets, AI providers, .gov/.edu)
3. Keeps domains appearing in 2+ distinct queries (1+ for runs with ≤6 queries total — small query sets make the 2-query bar too harsh)
4. Boosts domains that appear in comparison or alternatives queries — stronger signal of direct competitors
5. Ranks by: alt/comparison appearances → query count → mention count → avg position (lower = more prominent)
6. Caps at plan limit (15)

**Writes:** `competitors` rows.

---

## Step 5: Scoring

Computes the three-pillar Seenly Score.

### Pillars

| Pillar | Weight | Source | What it measures |
|--------|--------|--------|-----------------|
| **AVS** | 45% | AI results | How often AI engines cite the target across queries |
| **AEO** | 35% | Crawl pages | Average page quality from crawl |
| **Sentiment** | 20% | AI results | How favorably AI engines describe the target |

### AVS

AVS measures consensus — whether multiple engines agree the target is worth recommending for the same query.

```
consensus_citation = target cited by 2+ engines on the same query

Position-weighted: position 1 = 1.0×, position 10 = 0.1×

avs_base = (weighted_consensus_citations / weighted_total_queries) × 100

Bonuses (cap +10 total):
  +5  if cited by ALL three engines on any single query
  +5  if consensus on 50%+ of all queries
```

Queries from LLM-generated sources get 1.0× weight. User-added queries get 0.7×. Queries from brand-only profiles (domain name inference) get 0.5×.

### AEO

```
aeo = average(page_quality_score) across crawled pages with status ok/partial
```

### Sentiment

```
Per citation: favorable=100, neutral=50, cautious=25, unfavorable=0
sentiment = average across all target citations
```

### Composite

```
seenly_score = (AVS × 0.45) + (AEO × 0.35) + (Sentiment × 0.20)
```

If any pillar is null, it's excluded and the remaining weights are normalized.

### Penalties

| Condition | Effect |
|-----------|--------|
| AVS = 0 | Cap score at 59 |
| 0 < AVS < 30 | Score × 0.85 |

**Writes:** `run_scores` row.

---

## Plan limits

All plans currently use the same limits. Per-plan configuration will be added later.

| Limit | Value |
|-------|-------|
| Crawl pages | 40 |
| Suggested queries | 25 |
| User queries | 15 |
| AI engines | 3 |
| Competitors | 15 |

---

## Worker loop

```python
while not shutdown:
    run = claim_pending_run()   # Atomic — FOR UPDATE SKIP LOCKED
    if run is None:
        sleep(5 + jitter)
        continue

    try:
        if has_run_scores(run_id):  # Idempotency guard
            mark_completed()
            continue
        run_pipeline(run)
        mark_completed()
    except RunCancelled:
        mark_cancelled()
    except Exception:
        mark_failed(error + traceback)
```

Supports graceful shutdown (SIGTERM/SIGINT) and hot restart (SIGHUP). On startup, resets any runs stuck in `running` for 30+ minutes back to `pending`.

---

## Database tables

| Table | Written by | Key fields |
|-------|-----------|------------|
| `runs` | API + worker | status, config (queries_used, ai_usage), results_meta |
| `crawl_pages` | Step 1 | url, crawl_status, page_quality_score, h1, h2s, has_faq, has_schema |
| `ai_results` | Step 3 | query, engine, cited_domain, position, sentiment, is_target, is_degraded, degraded_reason, query_type |
| `competitors` | Step 4 | domain, mention_count, query_count, avg_position |
| `run_scores` | Step 5 | avs_score, aeo_score, sentiment_score, seenly_score_final, penalties_applied |
