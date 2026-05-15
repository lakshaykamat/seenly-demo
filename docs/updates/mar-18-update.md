Here's the full document with the summary table appended at the end:

---

# Seenly: Recommendation & AI Source Intelligence Logic

One of Seenly's core pillars is understanding where LLMs build their answers from — and transforming that intelligence into actionable recommendations.

Instead of only measuring whether a brand appears in AI answers, Seenly analyzes the sources that shape those answers and uses them to generate strategic recommendations and content actions.

This creates a full product loop:

**Domain input → Topic generation → Prompt generation → LLM analysis → Score calculation → Source intelligence → Recommendations → Content draft generation → Impact tracking → CSV / API export**

---

## The Key Differentiator: LLM Source Intelligence

For each prompt and each LLM response, Seenly extracts and classifies the sources used or implied in the answer. These sources represent the ecosystems influencing AI-generated responses.

**Knowledge sources** — Wikipedia, documentation pages, official websites, knowledge bases

**Community / discussion sources** — Reddit, Quora, forums, developer communities

**Professional / authority sources** — LinkedIn articles, expert blogs, research publications, industry reports

**Review / reputation platforms** — G2, Capterra, Yelp, Trustpilot, Amazon

**Media / editorial sources** — news websites, industry magazines, press releases

**Content / educational sources** — blogs, tutorials, guides, YouTube videos, podcasts

**Local / ecosystem sources** — directories, local review platforms, mapping services

Seenly aggregates these signals to understand which ecosystems influence AI responses the most. Example output:

| Source | Share |
|---|---|
| Reddit | 28% |
| Blogs | 22% |
| Review platforms | 17% |
| Knowledge sources | 15% |
| LinkedIn / professional | 10% |
| Media / news | 8% |

This intelligence directly feeds the recommendation engine.

---

## KPI Framework

Each recommendation links back to Seenly's KPI framework.

### Primary KPIs

**AI Visibility Score (AVS)**
Measures brand presence and prominence across LLM responses. Key drivers: mention rate, citation frequency, answer prominence, brand authority signals.

**Answer Engine Optimization Score (AEO)**
Measures the ability of structured content to be selected as a primary answer. Key drivers: primary answer rate, structured content quality, schema coverage, query coverage.

**Generative Engine Optimization Score (GEO)**
Measures coverage across markets, languages, and AI ecosystems. Key drivers: market coverage, language coverage, local authority signals.

**Sentiment Score**
Measures the tone of AI responses about the brand. Key drivers: positive framing rate, negative framing rate, narrative consistency.

### Secondary KPIs

Citation frequency · Answer prominence · Mention rate · Content authority · Topic coverage · Competitor citation share · Structured content score · Market coverage rate · Language coverage rate

---

## Recommendations

Seenly's recommendations always link to KPI improvement and source intelligence. Each one includes:

- **Target KPI**
- **Root cause analysis**
- **Source intelligence evidence**
- **Estimated score impact**
- **Suggested content action**

### Example Recommendations

**Increase presence on discussion platforms**
Detected gap: competitor citations heavily influenced by Reddit and community discussions.
Impact: improves AVS through higher citation frequency.

**Strengthen structured knowledge content**
Detected gap: LLM answers rely heavily on structured sources like documentation or Wikipedia.
Impact: improves AEO through higher primary answer rate.

**Expand authority blog content**
Detected gap: competitor blogs dominate topic coverage in AI responses.
Impact: improves AVS and AEO.

**Increase review ecosystem visibility**
Detected gap: AI answers reference G2 and review platforms.
Impact: improves brand authority signals.

**Expand GEO coverage in specific markets**
Detected gap: missing presence in certain languages or regions.
Impact: improves GEO score.

### Full Recommendation Example

> **Recommendation:** Increase Reddit presence on topic "workflow automation"
>
> **Root cause:** 42% of AI responses cite Reddit discussions.
>
> **Estimated impact:** AVS +2.8
>
> **Suggested actions:** Create expert discussions · Answer community threads · Publish comparison insights

---

## Recommendation History

Each recommendation has a lifecycle:

**Detected → Suggested → In progress → Marked as done → Impact measured**

When a recommendation is marked as done, the next analysis run measures the score delta:

> **Recommendation executed:** "Improve structured content schema"
>
> **Next run result:** AEO score +3.1 · Seenly Score +1.2

This creates a clear feedback loop between analysis, action, and measurable impact.

---

## Content Generation

Content generation connects directly to recommendations. For each recommendation, Seenly generates a content draft adapted to the target source ecosystem:

| Source influence | Content generated |
|---|---|
| Reddit | Discussion-style posts |
| LinkedIn | Expert authority posts |
| Blogs | Long-form articles |
| Documentation | Structured knowledge content |
| Reviews | Comparison content |
| Media | Thought leadership content |

The tone and structure adapt depending on which source ecosystem is influencing LLM responses — so the generated content directly addresses the visibility gap Seenly detected.

---

The overall goal is to transform AI visibility monitoring into a full **AI intelligence → recommendation → execution → impact tracking** system. Seenly's an AI Visibility Intelligence platform, not just a monitoring tool.

---
## Document Summary: What Needs to Change

| # | Item | Action | Reason | Difficulty | Where |
|---|---|---|---|---|---|
| 1 | Product loop layout | **Change** | Currently plain text lines — needs a visual flow or pipeline diagram for clarity | Medium | Frontend |
| 2 | Source category formatting | **Change** | Inline formatting reads faster and saves vertical space over bullet lists | Low | Frontend |
| 3 | KPI definitions | **Keep** | Well-structured, clear, nothing redundant | — | — |
| 4 | Secondary KPIs section | **Change** | Needs a brief note on how these feed into the primary KPIs | Low | Frontend |
| 5 | "Full Recommendation Example" | **Keep** | Blockquote format is scannable and works well | — | — |
| 6 | Recommendation lifecycle states | **Change** | Arrow chain works but a visual state tracker would be clearer | Medium | Frontend |
| 7 | Score delta example | **Keep** | Concrete numbers make it real — don't abstract this | — | — |
| 8 | Content generation table | **Keep** | Clean and direct — right format for this information | — | — |
| 9 | Closing paragraph | **Remove** | Document already makes the case — restating it reads like filler | Low | Frontend |
| 10 | "AI Citation Source Distribution" label | **Add** | Example table is missing its title — readers need context for what they're looking at | Low | Frontend |
| 11 | Competitor intelligence detail | **Add** | Competitor citation share is listed as a KPI but never explained — needs a short clarification | Medium | Worker + Frontend |
| 12 | CSV / API export | **Add / Clarify** | Mentioned in the product loop with zero detail — either expand or cut it | High | Worker + Frontend (M4) · API routes (M5) |
