# API Reference

Base URL: `/api`

All protected routes require a valid Supabase session cookie. Routes using `withTenant` also resolve the user's org context (role, plan, orgId) from JWT custom claims.

## Auth

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/me` | session | — | Current user profile + org info |
| DELETE | `/account/delete` | session | — | Permanently delete account |

### GET /me

Returns the authenticated user's profile.

**Response (onboarded):**
```json
{ "id": "uuid", "email": "user@example.com", "role": "admin", "orgId": "uuid", "orgName": "Acme", "plan": "starter" }
```

**Response (not onboarded):**
```json
{ "needsOnboarding": true }
```

---

## Onboarding

Neither route uses `withTenant` — the user has no org yet.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/onboarding/create-org` | session | Create org, become admin |
| POST | `/onboarding/join-org` | session | Join org via invite code |

### POST /onboarding/create-org

```json
{ "name": "Acme Inc" }
```

→ `201` `{ "orgId": "uuid", "orgName": "acme-inc" }`

### POST /onboarding/join-org

```json
{ "inviteCode": "abc123" }
```

→ `200` `{ "orgId": "uuid", "orgName": "Acme Inc" }`

---

## Organization

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/admin/settings` | withTenant | admin | Get org settings |
| PATCH | `/admin/settings` | withTenant | admin | Update org settings |
| GET | `/members` | withTenant | admin | List org members |
| PATCH | `/members/:id` | withTenant | admin | Update member role |

### GET /admin/settings

→ `{ "id", "name", "slug", "plan", "inviteCode" }`

### PATCH /admin/settings

```json
{ "name?": "New Name", "slug?": "new-slug", "regenerateInviteCode?": true }
```

### PATCH /members/:id

```json
{ "role": "analyst" | "executive" }
```

Cannot change your own role. Target must be in the same org.

---

## Projects

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/projects` | withTenant | — | List org projects |
| POST | `/projects` | withTenant | admin, analyst | Create project |
| GET | `/projects/:id` | withTenant | — | Get project + latest run |
| PATCH | `/projects/:id` | withTenant | admin | Update project metadata |

### POST /projects

```json
{ "domain": "acme.com", "name": "Acme", "sector?": "SaaS", "geo?": "US" }
```

Domain is normalized (strips protocol, www, trailing slash). Domain is immutable after creation.

### GET /projects/:id

Returns project with latest completed run and its scores:

```json
{
  "id": "uuid", "domain": "acme.com", "name": "Acme",
  "latest_run": { "id": "uuid", "status": "completed", "created_at": "..." },
  "latest_scores": { "seenly_score_final": 72, "avs_score": 65, "aeo_score": 80, "sentiment_score": 75 }
}
```

### PATCH /projects/:id

```json
{ "name?": "New Name", "sector?": "Fintech", "geo?": "EU" }
```

---

## Runs

| Method | Path | Auth | Roles | Description |
|--------|------|------|-------|-------------|
| GET | `/run` | withTenant | — | List runs (newest first) |
| POST | `/run` | withTenant | admin, analyst | Create run |
| GET | `/run/:id` | withTenant | — | Get run detail + scores |
| GET | `/run/:id/evidence` | withTenant | — | AI results + crawl pages |
| GET | `/run/:id/competitors` | withTenant | — | Detected competitors |
| GET | `/runs/check-quota` | withTenant | — | Monthly usage vs limit |

### POST /run

```json
{ "project_id?": "uuid" }
```

- Checks monthly quota against plan limit before creating
- Returns `429` if quota exceeded
- Returns `404` if project_id doesn't belong to the org

→ `201` full run object (status: `pending`)

### GET /run/:id

```json
{
  "id": "uuid", "status": "completed",
  "scores": { "avs_score": 65, "aeo_score": 80, "sentiment_score": 75, "seenly_score_final": 72 },
  "project_name": "Acme",
  "summary": { "total_queries": 15, "total_pages": 5, "total_competitors": 4 }
}
```

### GET /run/:id/evidence

```json
{
  "ai_results": [{ "query": "...", "engine": "openai", "cited_domain": "acme.com", "position": 1, "sentiment": "favorable" }],
  "crawl_pages": [{ "url": "https://acme.com", "crawl_status": "ok", "page_quality_score": 80 }]
}
```

### GET /run/:id/competitors

```json
[{ "domain": "rival.com", "mention_count": 5, "query_count": 3, "avg_position": 1.5 }]
```

### GET /runs/check-quota

```json
{ "allowed": true, "used": 12, "limit": 50, "plan": "starter" }
```

Enterprise plans return `limit: -1`.

---

## Utility

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | — | `{ "status": "ok" }` |
| GET | `/openapi` | — | OpenAPI/Swagger JSON spec |

---

## Error format

All errors return:

```json
{ "error": "Human-readable message" }
```

Common status codes: `400` (bad input), `401` (no session), `403` (wrong role), `404` (not found), `429` (quota exceeded), `500` (server error).

---

## Roles

| Role | Can create runs | Can manage members | Can change settings |
|------|----------------|-------------------|-------------------|
| admin | yes | yes | yes |
| analyst | yes | no | no |
| executive | no | no | no |

## Plans

| Plan | Runs/month | Crawl pages | Queries | Engines | Competitors |
|------|-----------|-------------|---------|---------|-------------|
| starter | 50 | 3 | 5 | 2 | 3 |
| growth | 500 | 10 | 10 | 3 | 5 |
| enterprise | unlimited | 30 | 20 | 3 | 10 |
