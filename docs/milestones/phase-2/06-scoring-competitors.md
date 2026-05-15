# Step 6: Scoring & Competitor Detection

> **When:** Week 3 (after AI querying)
>
> **Goal:** Compute the three-pillar Seenly Score and detect competitors from AI responses.

Deterministic formulas — same inputs always produce the same output. No randomness.

---

## Competitor detection

Run before scoring so competitors are available in the dashboard alongside scores.

### How it works

1. Aggregate all non-target domains from `ai_results`
2. Filter out noise domains:
   - Directories: Yelp, Yellow Pages, TripAdvisor
   - Marketplaces: Amazon, eBay, Etsy
   - Media/social: Wikipedia, Reddit, YouTube, LinkedIn, Twitter
   - Government: .gov, .edu domains
3. Keep domains that appear in **2 or more distinct queries**
4. Cap by plan: starter 3, growth 5, enterprise 10+
5. For each competitor, compute: mention count, query count, average position
6. Write `competitors` rows to the database

---

## Scoring

All scores are 0–100. **Null means "not measurable" — never use 0 for missing data.**

### AVS (AI Visibility Score) — weight 45%

Measures how visible the brand is across AI engines.

```
citation_rate = consensus_citations / total_queries_tested
avs_base = citation_rate × 100
```

Where `consensus_citations` = queries where the target domain appears in 2+ engines.

**Bonuses (cap at +10 total):**
- +5 if cited by all enabled engines on any single query
- +5 if cited on 50%+ of all queries

**Weight adjustments:**
- User-added queries contribute at 0.7x weight
- Brand-only fallback queries contribute at 0.5x weight

### AEO Score — weight 35%

Measures how well the site is optimized for AI engine consumption.

```
aeo = average(page_quality_score) across all crawled pages
```

If all pages are blocked → AEO = null (not 0).

### Sentiment Score — weight 20%

Measures how favorably AI engines talk about the brand.

```
Per citation: favorable=100, neutral=50, cautious=25, unfavorable=0
sentiment = average across all consensus citations
```

If no consensus citations exist → Sentiment = null.

> **GEO score deferred to Phase 4.** The geo-tagging spec needs more work before it's reliable enough to score on.

---

## Seenly Score

The final composite score, combining three pillars:

```
base = (AVS × 0.45) + (AEO × 0.35) + (Sentiment × 0.20)
```

If any pillar is null, exclude it and normalize the remaining weights. Example: if Sentiment is null, formula becomes AVS × (0.45/0.80) + AEO × (0.35/0.80).

### Penalties

| Condition | Penalty |
|-----------|---------|
| AVS = 0 | Final score capped at 59 |
| AVS < 30 | Final = base × 0.85 |

If AI engines don't know you exist, your Seenly Score shouldn't be above 59 no matter how good your site optimization is.

---

## Writing results

Write `run_scores` with all computed values. **Immutable after creation.**

Update `runs.results_meta` with timing and cost info (ai_calls, tokens, duration_ms, estimated cost).

Update `runs.status` to `completed`.

If scoring fails, set `runs.status = failed`. Don't write partial scores.

---

## Done when

- [x] Competitor detection works: noise filtered, 2-query threshold, plan cap
- [x] AVS computed from consensus citations with bonuses
- [x] AEO computed from average page quality scores
- [x] Sentiment computed from consensus citation sentiment
- [x] Seenly Score combines three pillars with correct weights
- [x] Null pillars excluded with weight normalization
- [x] Penalties applied correctly
- [x] `run_scores` row is written and immutable
- [x] `competitors` rows are written
- [x] Run status updated to `completed`
