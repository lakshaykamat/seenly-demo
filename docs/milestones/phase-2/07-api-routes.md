# Step 7: API Routes

> **When:** Week 3
>
> **Goal:** Expose run results, evidence, and projects through the API so the dashboard can display them.

---

## New run routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/run/[id]` | Tenant | Single run with scores, config, and evidence summary |
| GET | `/api/run/[id]/evidence` | Tenant | Full AI results + crawl pages for a run |
| GET | `/api/run/[id]/competitors` | Tenant | Detected competitors for a run |

No internal status endpoint — the worker has the service key and updates the DB directly.

### GET `/api/run/[id]`

Returns the run record joined with `run_scores`. Primary endpoint for the run detail page.

Response includes:
- Run metadata (id, status, created_at)
- Config snapshot (from `runs.config` JSONB)
- Scores (AVS, AEO, Sentiment, Seenly Score, penalties)
- Confidence values
- Summary counts (total queries, total pages crawled, total competitors)

### GET `/api/run/[id]/evidence`

Returns all `ai_results` rows and all `crawl_pages` rows for the run. No filtering or pagination for V1 — keep it simple. Add filters later if response sizes become a problem.

### GET `/api/run/[id]/competitors`

Returns all `competitors` rows for the run: domain, mention count, query count, average position.

---

## Modified run routes

### POST `/api/run`

Additional changes beyond the existing quota check:
- Accept `project_id` in the request body (optional)
- Validate `project_id` belongs to the user's org

### GET `/api/run`

Join with `run_scores` to include scores in the list response. Each run should show:
- Run id, status, created_at
- Seenly Score (final) if completed
- Project name (if linked to a project)

---

## Project routes

Replace the stubbed workspace routes.

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/projects` | Tenant | List all projects in the org |
| POST | `/api/projects` | Admin, analyst | Create a new project |
| GET | `/api/projects/[id]` | Tenant | Get project with latest run |
| PATCH | `/api/projects/[id]` | Admin | Update project name/sector/geo |

### POST `/api/projects`

Create a project with: domain, name, sector, geo.
- Validate domain is a reasonable URL (strip protocol, normalize)
- Name is not empty

### GET `/api/projects/[id]`

Returns the project with its most recent completed run's scores.

### PATCH `/api/projects/[id]`

Update name, sector, or geo. Domain changes not allowed after creation (would invalidate runs).

---

## Auth pattern

All routes use `withTenant()`. Role requirements:
- **Any role:** GET routes for runs, evidence, competitors, projects
- **Admin + analyst:** POST routes for runs and projects
- **Admin only:** PATCH for projects

---

## Done when

- [x] GET `/api/run/[id]` returns run with scores and config
- [x] GET `/api/run/[id]/evidence` returns AI results and crawl pages
- [x] GET `/api/run/[id]/competitors` returns detected competitors
- [x] POST `/api/run` accepts optional project_id
- [x] GET `/api/run` includes scores in list response
- [x] All four project routes work
- [x] Auth and role checks enforced on all routes
- [x] Stubbed workspace routes removed
