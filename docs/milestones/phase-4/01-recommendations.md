# Step 1: Recommendations

> **When:** Week 1 — this is the top priority feature after the analysis engine
>
> **Goal:** After every run, tell the user exactly what's wrong, where it's wrong, and what to do about it.

Scores are only half the product. A user sees AVS 34, AEO 51, and the natural next question is: "OK, what do I actually fix?" Recommendations answer that. Each one includes the issue, where it applies, what's driving it (which source ecosystems — Reddit, blogs, review platforms, etc.), the estimated score impact, and a suggested action.

---

## Database

```sql
CREATE TABLE recommendations (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id           uuid REFERENCES runs(id) NOT NULL,
  org_id           uuid REFERENCES organizations(id) NOT NULL,
  issue            text NOT NULL,            -- what's wrong
  dimension_scope  jsonb NOT NULL DEFAULT '{}', -- where it's wrong
  suggested_action text NOT NULL,            -- what to do
  pillar           text NOT NULL,            -- 'avs', 'aeo', 'geo', 'sentiment'
  severity         text NOT NULL,            -- 'high', 'medium', 'low'
  source_evidence  jsonb,                    -- source ecosystem breakdown driving the issue
  estimated_impact jsonb,                    -- { "pillar": "avs", "delta": 2.8 }
  status           text NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
  completed_at     timestamptz,
  score_snapshot   jsonb,                    -- scores at time of completion
  created_at       timestamptz DEFAULT now()
);
```

`dimension_scope` is a JSONB snapshot of whichever dimensions are relevant — `{ "activity": "Oncology", "country": "France" }` or just `{}` for a global issue. This makes every recommendation self-contained.

`source_evidence` holds the top source ecosystems influencing that run's AI responses — e.g. `{ "reddit": 28, "blogs": 22, "review_platforms": 17 }`. The worker extracts this from the AI response text and citations per run.

`estimated_impact` is a rough score delta the worker calculates based on how strongly a gap correlates with lower scores in the evidence — e.g. `{ "pillar": "avs", "delta": 2.8 }`.

RLS: org members can read and update status. The worker writes them (service role).

---

## Detection rules

The worker generates recommendations at the end of every run. Every recommendation must come from actual evidence — no generic advice.

**AVS (brand not showing up in AI responses):**

| Condition | Issue | Suggested action | Severity |
|-----------|-------|-----------------|----------|
| AVS < 20 | Brand absent from AI responses on almost all questions | Publish content directly targeting the questions used in this run | high |
| AVS 20–40 | Brand has weak AI presence | Increase content volume and freshness for your main topic clusters | medium |
| Avg citation position > 2.5 | Brand shows up but consistently ranked 2nd or 3rd | Strengthen authority signals — more backlinks, more thorough content on key topics | medium |
| Consensus rate < 30% | Only one AI engine mentions the brand | Work on content breadth — being cited by one engine is a weak signal | medium |

**AEO (website not built for AI consumption):**

| Condition | Issue | Suggested action | Severity |
|-----------|-------|-----------------|----------|
| AEO < 40 | Website structure is poor for AI engines to read | Add structured markup, fix heading structure, add FAQ sections | high |
| AEO 40–60 | Website is partially optimized | Fix the specific checks that are failing — see the Crawl tab for details | medium |
| FAQ missing on ≥80% of pages | No FAQ sections detected on the site | Add FAQ markup to main product and category pages | medium |
| Schema missing on ≥80% of pages | No structured data found | Add JSON-LD schema for Article, FAQ, and Product types | medium |

**Sentiment (brand mentioned but described poorly):**

| Condition | Issue | Suggested action | Severity |
|-----------|-------|-----------------|----------|
| Sentiment < 40 | AI engines describe the brand with caution or negatively | Review the exact mentions — find the specific concern AI engines are picking up on and address it | high |
| Cautious mentions > 50% of citations | Brand cited with hedging language | Add case studies, testimonials, and third-party validation to strengthen the brand's credibility | medium |

**Dimension-specific** (only when scoped scoring data exists):

| Condition | Issue | Suggested action | Severity |
|-----------|-------|-----------------|----------|
| Country/activity AVS < 30 | Weak visibility in a specific market or business area | Build content specifically for that activity and country combination | high |

**Source intelligence** (based on which ecosystems dominate AI responses):

| Condition | Issue | Suggested action | Severity |
|-----------|-------|-----------------|----------|
| Reddit share > 25% but brand not in those responses | AI answers draw heavily from community discussions you're absent from | Start contributing to the key Reddit threads and Quora topics AI engines are citing | high |
| Review platform share > 20% but AVS low | Brand underrepresented on platforms AI engines cite most | Strengthen presence on G2, Capterra, or Trustpilot — whichever the AI engines are pulling from | medium |
| Competitor blog/authority share > 30% | Competitor content dominates AI topic coverage | Publish long-form content targeting the exact questions used in this run | medium |
| Knowledge source share > 20% and brand missing | AI engines lean on structured knowledge sources — brand has no structured presence | Create or improve Wikipedia page, documentation, and structured knowledge content | medium |

Source categories tracked: knowledge (Wikipedia, docs), community (Reddit, Quora, forums), professional (LinkedIn, expert blogs), review platforms (G2, Capterra, Trustpilot), media/editorial, content/educational (blogs, tutorials), local/directory.

---

## Content draft generation

For each recommendation, the worker generates a content draft tailored to the target source ecosystem. This gives users a starting point — not a finished piece, but something to edit and publish.

| Source ecosystem | Draft type |
|-----------------|------------|
| Reddit / community | Discussion post or thread reply |
| LinkedIn / professional | Expert authority post |
| Blogs / educational | Long-form article outline |
| Documentation / knowledge | Structured knowledge content |
| Review platforms | Comparison content brief |
| Media / editorial | Thought leadership pitch |

The draft is stored on the recommendation and shown on expand. It's generated once, not regenerated on each view. Users can copy it — no in-app editing needed for now.

**New column on `recommendations`:**
```sql
ALTER TABLE recommendations ADD COLUMN content_draft text;
```

---

## Don't create duplicates

Before writing a new recommendation, check if an `open` recommendation with the same `pillar` and `dimension_scope` already exists for this org. If one does, skip it. Users shouldn't see the same issue listed five times across five runs.

---

## Impact tracking

When a user marks a recommendation as resolved:

1. Save `completed_at`
2. Snapshot the current scores into `score_snapshot`
3. Next time a run completes for this project, compare the new scores against the snapshot
4. Show the delta in the UI: "Since you did this, your AVS went from 34 → 51"

This is what makes recommendations worth acting on instead of just reading. Users see the direct result of their work.

---

## API routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/recommendations` | Tenant | List recommendations — supports `?run_id=`, `?status=`, `?pillar=` |
| GET | `/api/recommendations/[id]` | Tenant | Single recommendation |
| PATCH | `/api/recommendations/[id]` | Admin, analyst | Update status; snapshots scores when marked resolved |

---

## UI

**`/recommendations` page:** Sorted by severity, high first. Each row shows the issue, a pillar badge (AVS / AEO / Sentiment), dimension scope chips (e.g. "Oncology · France"), severity, and a status dropdown. Click a row to expand to see:
- Suggested action
- Source evidence — which ecosystems are driving the gap (small bar or percentage list)
- Estimated score impact (e.g. "AVS +2.8")
- Content draft — copy button, collapsed by default
- Which run triggered it

No separate detail page — inline expand is enough for now.

**On the run detail page:** After the score cards, show a count: "3 recommendations →" linking to the filtered list for that run.

---

## Done when

- [ ] `recommendations` table with migration and RLS (includes `source_evidence`, `estimated_impact`, `content_draft`)
- [ ] Worker extracts source ecosystems from AI response text and citations per run
- [ ] Worker generates recommendations after scoring using all detection rules above (AVS, AEO, Sentiment, dimension, source intelligence)
- [ ] Worker generates a content draft per recommendation based on the target ecosystem
- [ ] Deduplication — no same-pillar/same-scope duplicates across runs
- [ ] `GET /api/recommendations` with `run_id`, `status`, and `pillar` filters
- [ ] `PATCH /api/recommendations/[id]` snapshots scores when marked resolved
- [ ] `/recommendations` page sorted by severity with inline expand
- [ ] Expanded row shows source evidence, estimated impact, content draft (copy button), suggested action
- [ ] Pillar badge, dimension scope, severity, status visible on each row
- [ ] Run detail page links to that run's recommendations
- [ ] Impact delta shown on subsequent runs when a recommendation was resolved
