# Step 3: Intelligence — Scoped Scoring, GEO Analysis & Competitor Registry

> **When:** Week 3
>
> **Goal:** Scores broken down by market and country, a GEO page to see it all at a glance, and competitors tracked persistently across runs.

---

## Scoped scoring

Right now every run produces one global score. With project dimensions in place, we can do better — compute score breakdowns by activity, country, and their combination.

A pharma company with `activity = Oncology` and `country = France` gets their global AVS plus an Oncology AVS, a France AVS, and an Oncology+France AVS. That's actionable in a way a single number isn't.

**New table:**

```sql
CREATE TABLE dimension_scores (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id          uuid REFERENCES runs(id) NOT NULL,
  dimension_key   text NOT NULL,   -- 'activity', 'country', 'activity+country'
  dimension_val   text NOT NULL,   -- 'Oncology', 'France', 'Oncology+France'
  avs_score       int,
  sentiment_score int,
  seenly_score    int,
  question_count  int,
  confidence      int              -- below 30 shows as N/A in the UI
);
```

AEO stays global — it measures the website, not a market. Only AVS and Sentiment get dimension breakdowns.

The scoring step groups `ai_results` by dimension values after computing the global scores. A scope needs at least 2 questions to get a score. Low confidence (under 30) shows as "N/A" rather than a misleading number.

`GET /api/run/[id]` includes `dimension_scores` alongside the main scores.

---

## GEO Analysis page

A new page at `/geo` that shows a matrix: each row is a country or region, each column is a score. Color-coded cells — green above 70, yellow 40–69, red below 40. A glance tells you where you're strong and where you're not.

It pulls from the most recent completed run per project in the org, filtered to country and region dimension scores.

A GEO Score card sits alongside the matrix as a placeholder — the computation is deferred but the card should exist with a brief explanation of what's coming.

Empty state: if no projects have country or region dimensions, show a message and link to project settings.

`GET /api/geo` — returns country/region dimension scores for the latest run per project in the org.

---

## Source intelligence aggregation

As part of scoring, the worker classifies sources referenced or implied in each AI response into seven ecosystems: knowledge (Wikipedia, docs), community (Reddit, Quora, forums), professional (LinkedIn, expert blogs, research), review platforms (G2, Capterra, Trustpilot), media/editorial, content/educational (blogs, tutorials), and local/directory.

The run scores payload includes a `source_distribution` breakdown — what share of AI responses pulled from each ecosystem. This feeds recommendations and is surfaced on the run detail page as an "AI Citation Sources" card.

**Storage:** Add a `source_distribution` column to `run_scores`:

```sql
ALTER TABLE run_scores ADD COLUMN source_distribution jsonb;
-- e.g. { "community": 28, "educational": 22, "review": 17, "knowledge": 15, "professional": 10, "media": 8 }
```

Keeping it as a dedicated column (not buried in `results_meta`) makes it queryable for aggregations and the Phase 5 API endpoint.

---

## Competitor registry

Right now competitors are detected per run and that's it — they don't persist anywhere. This adds persistent tracking across runs so users can see if a competitor's AI presence is growing or shrinking over time.

**Competitor citation share** is a secondary KPI: for each run, what percentage of AI citations went to competitors vs. the brand. A brand might show up in 40% of responses while competitors collectively appear in 65% — that gap is actionable. The registry tracks this per run so users can see whether the gap is widening or closing over time.

**New table:**

```sql
CREATE TABLE competitor_registry (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id   uuid REFERENCES projects(id) NOT NULL,
  org_id       uuid REFERENCES organizations(id) NOT NULL,
  domain       text NOT NULL,
  source       text DEFAULT 'auto_detected',  -- 'auto_detected' | 'csv_import' | 'manual'
  first_seen   timestamptz DEFAULT now(),
  last_seen    timestamptz DEFAULT now(),
  UNIQUE (project_id, domain)
);
```

After each run, the worker upserts detected competitors into the registry. Users can also manually add competitors or remove false positives.

The competitor list on the project page now shows trends: detected in 4 of the last 5 runs, average position 1.8.

---

## Done when

- [ ] `dimension_scores` table with migration and RLS
- [ ] Scoring pipeline writes dimension breakdowns (min 2 questions per scope)
- [ ] Low-confidence scores (< 30) show as N/A in the UI
- [ ] `run_scores.source_distribution` column added (migration)
- [ ] Worker classifies sources from AI response text/citations into seven ecosystems and writes breakdown to `source_distribution`
- [ ] `GET /api/run/[id]` includes `dimension_scores` and `source_distribution`
- [ ] Run detail page shows "AI Citation Sources" card with ecosystem breakdown (percentages)
- [ ] `/geo` page with color-coded region matrix and GEO placeholder card
- [ ] `GET /api/geo` endpoint
- [ ] GEO page empty state links to project settings
- [ ] `competitor_registry` table with migration and RLS
- [ ] Worker upserts detected competitors after each run and records per-run citation share
- [ ] Project competitor view shows run history, trends, and citation share vs. brand
