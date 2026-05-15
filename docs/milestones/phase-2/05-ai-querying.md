# Step 5: AI Engine Querying

> **When:** Week 3
>
> **Goal:** Send generated queries to multiple AI engines, parse responses, extract citations, classify sentiment, and store everything.

This is where Seenly's core value proposition happens. We ask real AI engines about the user's brand and record exactly what they say. The consensus rule means we only count citations that appear across multiple engines — no single-engine flukes.

---

## How it works

For each query from step 4, and for each enabled engine:

### 1. Send the query

Call the provider API:

| Engine | Provider | SDK |
|--------|----------|-----|
| OpenAI | `openai` | `openai` Python package |
| Anthropic | `anthropic` | `anthropic` Python package |
| Google | `google-generativeai` | `google-generativeai` package |

The number of engines depends on the plan:

| Plan | Engines |
|------|---------|
| Starter | 2 of 3 |
| Growth | 3 of 3 |
| Enterprise | 3 of 3 |

### 2. Parse the response

From each AI response, extract the top 3 domain mentions:

| Field | What to capture |
|-------|----------------|
| Position | 1, 2, or 3 (order in which domains were mentioned) |
| Cited domain | The domain name mentioned |
| Snippet | The text surrounding the citation |
| Is target | Whether this is the brand being analyzed |

If the target domain isn't mentioned at all, `position` is null.

### 3. Classify sentiment

For each mention of the target domain, classify the tone:

| Sentiment | What it means | Score value |
|-----------|--------------|-------------|
| `favorable` | Positive recommendation, strong endorsement | 100 |
| `neutral` | Mentioned without strong opinion | 50 |
| `cautious` | Mentioned with caveats or hedging | 25 |
| `unfavorable` | Negative framing, discouragement | 0 |

Classification can be done by the same LLM call or as a separate classification step — whichever is more reliable.

### 4. Handle degraded responses

Sometimes AI engines return unusable results — empty responses, refusals, rate limit errors, or responses that don't contain any domain mentions.

> **Never drop a degraded response silently.** Set `is_degraded = true` on the `ai_results` row. The response is stored, counted, and visible in the dashboard — it just doesn't contribute to scoring.

### 5. Store results

- Store the full raw response in `ai_results.raw_response` (JSONB)
- Write one `ai_results` row per citation found

---

## The consensus rule

> A citation only counts toward the AVS score if the target domain appears in **2 or more engines** for the **same query**.

This is the foundation of Seenly's credibility. A single AI engine might hallucinate a citation. Two engines independently citing the same domain for the same query is a much stronger signal.

**What counts:**
- Domain X cited by OpenAI + Anthropic for "best CRM for startups" → counts
- Domain X cited by all 3 engines for the same query → counts (with bonus)

**What doesn't count (for scoring):**
- Domain X cited only by Google for "best CRM for startups" → stored in `ai_results` but doesn't affect AVS

The raw data is always preserved. The consensus rule only filters what goes into score calculation.

---

## Rate limiting & cost

AI API calls are the most expensive part of a run. Keep track of:

| Metric | Where it goes |
|--------|--------------|
| Number of API calls | `run_ledger.ai_calls` |
| Input tokens | `run_ledger.tokens_in` |
| Output tokens | `run_ledger.tokens_out` |

Run queries in parallel where possible (across engines for the same query), but respect provider rate limits. Use exponential backoff on 429s.

---

## Edge cases

| Situation | What to do |
|-----------|-----------|
| Engine returns 429 (rate limited) | Backoff and retry. After 3 retries, mark as degraded. |
| Engine returns empty response | Mark as degraded. Log it. Don't retry endlessly. |
| Engine refuses to answer the query | Mark as degraded. Store the refusal. |
| Engine mentions a domain that doesn't exist | Store it. Competitor detection (step 6) will filter noise. |
| Same domain appears multiple times in one response | Take the highest position. Deduplicate per query per engine. |

---

## Done when

- [x] Queries are sent to all enabled AI engines
- [x] Responses are parsed for domain mentions with position and snippet
- [x] Sentiment is classified for each target domain mention
- [x] Degraded responses are flagged, not dropped
- [x] Raw responses are stored in `ai_results.raw_response`
- [x] `ai_results` rows are written to the database
- [x] Consensus rule is applied correctly (2+ engines per query)
- [x] Token usage and call counts are tracked for the run ledger
