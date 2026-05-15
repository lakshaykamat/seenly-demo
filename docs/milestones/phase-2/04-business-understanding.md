# Step 4: Business Understanding & Query Generation

> **When:** Week 2 (after crawl)
>
> **Goal:** Analyze crawled content to understand what the business does, then generate the right questions to ask AI engines.

This step bridges crawling and AI querying. The crawl gives us raw content. This step makes sense of it — what does the company do? Who do they serve? What questions would someone ask an AI engine when looking for this kind of business?

The quality of the generated queries directly impacts the quality of scores. Bad queries → irrelevant AI responses → misleading scores. Worth getting right.

---

## How it works

### 1. Send content to an LLM

Take the extracted text from the best crawled pages (highest confidence) and send it to an LLM (Claude or GPT) with a structured prompt.

The prompt asks the LLM to extract:

| Field                | Description                                               |
|----------------------|-----------------------------------------------------------|
| Company summary      | What they do, who they serve, what market they're in      |
| Offer clusters (3–6) | Each with: name, keywords, target buyers, confidence score |

### 2. Handle failures

If the LLM can't extract a clear business profile (extraction fails or confidence is low), fall back to **brand-only mode**:

1. Use domain name tokens as keywords (e.g. `acme-consulting.com` → "acme", "consulting")
2. Generate 6–12 generic queries marked `low_confidence`
3. Proceed with the pipeline — a partial result is better than no result

> The fallback exists so the pipeline never stalls. But results from brand-only mode should be clearly labeled as low-confidence in the dashboard.

### 3. Generate queries

From the offer clusters, generate four types of queries (extended in step 9):

| Query type        | What kind of person is asking                | Example                                            |
|-------------------|----------------------------------------------|----------------------------------------------------|
| **Discovery**     | Just starting to explore                     | "best project management tools for remote teams"   |
| **Comparison**    | Picking between known options                | "Asana vs Monday vs ClickUp"                       |
| **Alternatives**  | Already using something, looking to switch   | "alternatives to Asana for small teams"            |
| **Educational**   | Trying to understand the topic               | "how to choose a project management tool"          |

Each query gets geo-tagged based on the project's geographic setting. A project targeting France gets French-market queries.

> **Note:** The original spec had 3 types (high-intent, informational, competitive). Step 9 extended this to 4 types — discovery, comparison, alternatives, educational. The implementation uses the 4-type model.

### 4. Cap by plan

| Plan       | Max queries                   |
|------------|-------------------------------|
| Starter    | 5 suggested + 2 user = 7     |
| Growth     | 10 suggested + 5 user = 15   |
| Enterprise | 20 suggested + 15 user = 35  |

If the LLM generates more queries than the plan allows, keep the highest-confidence ones and drop the rest.

### 5. Assign weights

Not all queries are equal:

| Source                                 | Weight |
|----------------------------------------|--------|
| Seenly-suggested (from offer clusters) | 1.0    |
| User-added (manual)                    | 0.7    |
| Brand-only fallback                    | 0.5    |

Weights affect how much each query contributes to the final AVS score.

---

## Prompt design

The business understanding prompt should be:

- **Specific** — ask for structured output (JSON), not prose
- **Bounded** — cap the number of clusters (3–6), cap keywords per cluster
- **Geo-aware** — include the project's geographic market in the prompt context
- **Sector-aware** — include the project's business sector to guide cluster identification

Keep the prompt under 4,000 tokens of input. The crawled content should be summarized or truncated to fit.

---

## Edge cases

| Situation                              | What to do                                                                         |
|----------------------------------------|------------------------------------------------------------------------------------|
| LLM returns malformed JSON             | Retry once with a stricter prompt. If still fails, fall back to brand-only.        |
| Company does many unrelated things     | Pick the top 3–4 clusters by confidence. Don't try to cover everything.            |
| Domain is a marketplace (many sellers) | Detect this from the company summary. Flag as `marketplace` and adjust query types. |
| No crawled content available (all blocked) | Go straight to brand-only mode using domain name + project sector.             |

---

## Done when

- [x] Crawled content is sent to an LLM and business profile is extracted
- [x] Offer clusters are identified with confidence scores
- [x] Fallback to brand-only mode works when extraction fails
- [x] Four query types generated: discovery, comparison, alternatives, educational (see step 9)
- [x] Queries are geo-tagged based on project setting
- [x] Query count is capped by plan limits
- [x] Weights are assigned by source
- [x] Generated queries are stored in `run_config.queries_used`
