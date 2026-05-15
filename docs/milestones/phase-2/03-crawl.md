# Step 3: Crawl Pipeline

> **When:** Week 2
>
> **Goal:** Worker discovers pages on the target site, extracts content, computes page quality scores, and stores evidence.

This is the first pipeline step that actually does useful work. The crawl feeds into everything else — business understanding needs the page content, AEO scoring needs the page quality scores.

---

## How it works

### 1. Discover pages

Start by finding the site's pages:

1. Try fetching `/sitemap.xml` and `/sitemap_index.xml` variants
2. If no sitemap found, fetch the homepage and extract internal links
3. Select the top N business-relevant pages

**Page selection rules:**
- Skip: blog posts, careers pages, legal/privacy pages, parameterized URLs, login/signup pages
- Prefer: homepage, service/product pages, about page, contact page
- N comes from the plan: 3 for starter, 10 for growth, 30 for enterprise

### 2. Fetch each page

For each selected page:

1. **Fast path:** HTTP GET with httpx (no JS rendering)
2. **Fallback:** If extracted text < 800 characters, render with JS (Playwright or Firecrawl)
3. **Blocked detection:** Check for 403/401/429 status codes, Cloudflare challenges, empty response bodies

Set `crawl_status` per page:

| Status | Meaning |
|--------|---------|
| `ok` | Page fetched and content extracted successfully |
| `partial` | Page fetched but content extraction was incomplete |
| `blocked` | Got a 403/401/429 or a bot challenge |
| `unreachable` | Connection failed, DNS error, timeout |

> **Blocked pages are not failures.** They get `crawl_status = blocked` and AEO = null (not 0). Never penalize a site for being security-conscious.

### 3. Extract content

From each successfully fetched page, extract:

| Data | How |
|------|-----|
| Full text content | Strip HTML tags, normalize whitespace |
| H1 | First `<h1>` tag |
| H2s | All `<h2>` tags |
| FAQ sections | Look for `<details>`, FAQ schema, or heading-based Q&A patterns |
| JSON-LD schema | Parse `<script type="application/ld+json">` tags |
| Internal links | All `<a href>` pointing to the same domain |

### 4. Compute page quality score

Each page gets a `page_quality_score` (0–100) based on 5 AEO checks. Each check contributes up to 20 points:

| Check | What it measures | Max points |
|-------|-----------------|------------|
| Topic clarity | H1 aligns with page content | 20 |
| Heading structure | Proper H1 → H2 → H3 hierarchy, no skipped levels | 20 |
| FAQ presence | FAQ section exists and is relevant to the page topic | 20 |
| Schema markup | JSON-LD present with appropriate types (Article, FAQPage, Product, etc.) | 20 |
| Internal linking | Contextual links to other pages on the site (not just nav) | 20 |

### 5. Write to database

Write one `crawl_pages` row per page with all extracted data and scores. Raw HTML goes in the `raw_html` column. If pages are consistently too large (> 1MB), move raw HTML to Supabase Storage later.

---

## Edge cases

| Situation | What to do |
|-----------|-----------|
| Site has no sitemap and homepage has no links | Crawl only the homepage. Set confidence low. |
| All pages are blocked | Set overall `crawl_status = blocked`. AEO score = null. |
| Page redirects to another domain | Skip it. Log the redirect. |
| Page takes > 30 seconds to load | Timeout, mark as `unreachable`. |
| JavaScript-rendered page with no JS fallback available | Use whatever text was extracted. Set `extraction_method = html`, mark confidence low. |
| Duplicate pages (same content, different URLs) | Deduplicate by content hash before writing to DB. |

---

## Confidence scoring

Each page gets a `confidence` score (0–100) based on how complete the extraction was:

- Full HTML extraction with all fields → 90–100
- JS-rendered with complete content → 70–90
- Partial extraction (some fields missing) → 40–70
- Minimal content (< 500 chars) → 10–40
- Blocked or unreachable → 0

---

## Done when

- [x] Worker discovers pages via sitemap or homepage links
- [x] Pages are fetched with HTTP, with JS fallback for thin content
- [x] Blocked pages are correctly detected and labeled
- [x] Content extraction works: text, H1, H2s, FAQ, schema, links
- [x] Page quality score is computed from 5 AEO checks
- [x] `crawl_pages` rows written to database with raw HTML
- [x] Edge cases handled without crashing the pipeline
