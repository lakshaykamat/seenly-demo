# Product Update — Mar 13

---

## What changed

### Removed from scope

**Prompt volume analytics** — not a meaningful signal at this stage, cutting it.

**Agent Analytics, Audit Trail, Recap, History** — too much overlap between them, and none of them were well-defined enough. Dropped entirely.

**Third-party integrations** — replacing with simple CSV imports. Users can upload a CSV to populate their topics, competitors, and prompts. That covers 90% of the use case without the integration complexity.

**Content Engine** — pushed post-MVP. The AI content generation feature isn't needed to validate the core product.

---

### Added / clarified

**Prompt types** — generation should cover four types: discovery, comparison, alternatives, educational. The current worker only generates high-intent and informational queries. This needs to be explicit.

**Crawl fallback** — if the target domain is inaccessible (blocked, down, no content), don't fail the run. Fall back to generating prompts from onboarding inputs: domain name, category, products, and competitors. A partial run is better than a failed one.

**Simple read-only API** — alongside CSV export, expose four endpoints:
- `GET /scores`
- `GET /topics`
- `GET /competitors`
- `GET /recommendations`

No write operations. Just enough for users to pull their data programmatically.

**Recommendations engine — top priority** — this is now the most important feature to build after the analysis engine. Every recommendation must show three things: the issue (what's wrong), the dimension scope (where it's wrong), and the suggested action (what to do about it).

---

### What didn't change

Everything else in the MVP plan stays as-is. The dimension model, scoring, GEO analysis, sidebar restructure, and Sankey chart are all still in scope. The plans for those haven't moved.
