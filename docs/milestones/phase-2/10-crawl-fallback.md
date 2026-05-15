# Step 10: Crawl Fallback

> **When:** After the core pipeline is working (steps 0–8)
>
> **Goal:** When a site can't be crawled, generate questions from what the user told us during setup — don't fail the run.

---

## The problem

Some sites block crawlers. Some are behind a login. Some just go down. Right now, if crawling fails entirely, the pipeline falls back to "brand-only mode" — it pulls keywords from the domain name and generates generic questions. That's barely useful.

A partial run is always better than a failed one. And we usually have enough information from project setup to do something meaningful.

---

## What changes

When a site can't be crawled, instead of falling back to domain name keywords, use what the user told us when they created the project: the business name, category, products, competitors, country, and language.

The fallback chain:

```
1. Crawl succeeds → use the page content (current behavior)
2. Crawl fails or all pages are blocked → use project settings
3. Project has almost nothing filled in → use domain name keywords (last resort)
```

**In `understand.py`:** When the crawl returns nothing useful, build a prompt from the project record instead of page content:

```
Business: {project.name}
Category: {project.activity or project.sector}
Products: {project.product}
Competitors: {project.aliases}
Market: {project.country}, {project.region}
Language: {project.language}
```

The LLM can still generate all four question types from this. The questions will be broader than crawl-derived ones — we're working from a brief, not from actual page content — but they'll be about the right business.

**Flag the run** by setting `crawl_status: 'fallback'` in `runs.results_meta`. The dashboard should show a small notice on these runs: "Crawl wasn't available — questions were generated from project settings."

---

## Done when

- [x] When all pages are blocked or unreachable, pipeline uses project fields instead of failing
- [x] Brand-only mode (domain name keywords) still exists as the absolute last resort
- [x] `runs.results_meta` records `crawl_status: 'fallback'` when this happens
- [x] Run detail page shows a notice explaining why questions were generated differently
