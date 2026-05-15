# Step 2: Developer API — API Keys, Webhooks & Read-Only Endpoints

> **When:** Week 3
>
> **Goal:** Tenants can pull their Seenly data programmatically, get notified via webhooks, and manage API keys from settings.

---

## API keys

Tenants generate API keys from their settings page (admin only). Keys authenticate requests to the read-only data endpoints and webhooks.

**Security rules that don't bend:**
- Never store the plaintext key — only a SHA-256 hash and the first 8 characters for display
- Show the full key exactly once, at creation. After that it's gone.
- Revocation is immediate. No grace period for revoked keys.

```sql
CREATE TABLE api_keys (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       uuid REFERENCES organizations(id) NOT NULL,
  key_hash     text NOT NULL UNIQUE,
  key_prefix   text NOT NULL,        -- 'sk_live_Ab12...' for display
  name         text NOT NULL,
  scopes       text[] DEFAULT '{read}',
  rate_limit   int,                  -- requests per minute
  last_used_at timestamptz,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_by   uuid REFERENCES profiles(id),
  created_at   timestamptz DEFAULT now()
);
```

**Rate limits by plan:**

| Plan | Requests/min |
|------|-------------|
| Starter | 30 |
| Growth | 120 |
| Enterprise | 600 |

**Key rotation:** Creates a new key, old key gets a 24-hour grace period, then auto-revokes. Gives customers time to update their integrations without downtime.

---

## Read-only data endpoints

Four endpoints that let users pull their data out. Bearer token auth, no write operations.

**`GET /api/v1/scores`** — latest run scores per project. Supports `?project_id=` and `?run_id=`.

**`GET /api/v1/topics`** — questions used across runs. Returns query text, type, run, and project.

**`GET /api/v1/competitors`** — aggregated competitors: domain, total mentions, average position, last seen date.

**`GET /api/v1/recommendations`** — open recommendations with issue, dimension scope, suggested action, source evidence, and estimated impact. Supports `?status=` filter.

**`GET /api/v1/source-intelligence`** — source ecosystem distribution for a run or project's latest run. Returns share percentages per ecosystem (knowledge, community, professional, review, media, educational, local). Supports `?run_id=` and `?project_id=`.

All five return JSON. Rate limit: 100 requests/minute per key, 429 with `Retry-After` on breach.

---

## Webhooks

Enterprise tier gets webhook delivery. Seenly calls a URL they provide when specific events happen.

**Events:**
- `run.completed` — a run finished, with scores in the payload
- `run.failed` — a run failed, with error info
- `recommendation.created` — new recommendations generated
- `quota.warning` — org has used 80% of their monthly run quota

**Delivery:** Signed with HMAC-SHA256 so recipients can verify the payload came from Seenly. Three retries with exponential backoff on failure. After 3 failures, the webhook is disabled and the admin is notified.

```sql
CREATE TABLE webhook_configs (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       uuid REFERENCES organizations(id) NOT NULL,
  url          text NOT NULL,
  events       text[] NOT NULL,
  secret       text NOT NULL,        -- used to sign payloads
  enabled      boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE webhook_deliveries (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id     uuid REFERENCES webhook_configs(id) NOT NULL,
  event          text NOT NULL,
  payload        jsonb NOT NULL,
  status         text NOT NULL,      -- 'delivered', 'failed', 'pending'
  attempts       int DEFAULT 0,
  last_attempt   timestamptz,
  response_code  int
);
```

---

## API routes (tenant-facing)

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/keys` | Admin | List keys (no secrets shown) |
| POST | `/api/keys` | Admin | Create key (plaintext shown once) |
| PATCH | `/api/keys/[id]` | Admin | Update name or scopes |
| DELETE | `/api/keys/[id]` | Admin | Revoke key |
| POST | `/api/keys/[id]/rotate` | Admin | Rotate with 24h grace |
| GET | `/api/webhooks` | Admin | List webhook configs |
| POST | `/api/webhooks` | Admin | Add webhook |
| DELETE | `/api/webhooks/[id]` | Admin | Remove webhook |

---

## Done when

- [ ] `api_keys` table with migration
- [ ] Key creation stores only hash, shows plaintext once
- [ ] Rotation works with 24h grace period
- [ ] Auth middleware validates key, checks scope and rate limit
- [ ] All five read-only endpoints working with API key auth
- [ ] 429 with `Retry-After` on rate limit breach
- [ ] `webhook_configs` and `webhook_deliveries` tables
- [ ] HMAC-SHA256 signing on all webhook payloads
- [ ] Three retries with backoff, auto-disable after failures
- [ ] All key and webhook management routes working
- [ ] Settings UI: key list, create, revoke, rotate, webhook management
