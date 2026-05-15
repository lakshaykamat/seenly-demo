# Step 2: Worker Skeleton

> **When:** Week 1 (after database migrations)
>
> **Goal:** Runs move from `pending` → `running` → `completed/failed`. Worker polls the database and processes jobs.

No SQS. No message queues. The `runs` table is the queue. The worker polls it.

---

## How the queue works

The worker queries the `runs` table for pending jobs:

```sql
UPDATE runs
SET status = 'running', updated_at = now()
WHERE id = (
  SELECT id FROM runs
  WHERE status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED
)
RETURNING *;
```

`FOR UPDATE SKIP LOCKED` prevents two workers from grabbing the same row. This handles concurrency if you scale to multiple workers later.

Why not SQS? SQS adds AWS setup (IAM, queue creation, DLQ config, SDK), a new dependency, and failure modes (message → DB sync). The runs table already exists. Polling it is one SQL query. If volume outgrows this, add a queue then.

---

## Python worker

### Project structure

```
workers/
  requirements.txt      # httpx, supabase-py, openai, playwright
  worker.py             # Main loop: poll DB, dispatch pipeline
  pipeline/
    __init__.py
    crawl.py            # (stub for now)
    understand.py       # (stub for now)
    ai_query.py         # (stub for now)
    scoring.py          # (stub for now)
    competitors.py      # (stub for now)
  config.py             # Plan limits, engine configs, OpenRouter credentials
  db.py                 # Supabase client (service role key)
  Dockerfile
```

### Main loop (`worker.py`)

```
while True:
  1. Query for a pending run (claim it atomically)
  2. If no run found → sleep 5 seconds, continue
  3. Run the pipeline (steps 3-6 — stubs for now)
  4. On success → update status to "completed"
  5. On failure → update status to "failed", log error
     - Store error message in runs.results_meta for debugging
```

### Idempotency

Before doing any work, check if `run_scores` already has a row for this `run_id`. If yes, the run was already processed — mark as `completed` and skip. This handles edge cases like worker crashes mid-run being restarted.

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Database URL |
| `SUPABASE_SERVICE_KEY` | Service role key (bypasses RLS) |
| `OPENROUTER_API_KEY` | OpenRouter API key (routes to OpenAI, Anthropic, Google) |

No AWS credentials needed. No S3 bucket. Artifacts go in the database (JSONB) or Supabase Storage if raw HTML is too large.

---

## Deployment

Start with **Railway** or **Fly.io**. One service, one container. Deploy from Dockerfile.

```bash
# Local development
cd workers && python worker.py

# Docker
docker build -t seenly-worker workers/
docker run --env-file .env seenly-worker
```

Scale to ECS/Fargate later if needed. Don't build for scale you don't have.

---

## Done when

- [x] Worker polls `runs` table for pending jobs
- [x] Atomic claim prevents double-processing
- [x] Worker updates run status from `pending` → `running`
- [x] Idempotency check works (already-completed runs are skipped)
- [x] Failed runs get `status = 'failed'` with error in `results_meta`
- [x] Worker runs locally with `python worker.py`
- [x] Worker runs in Docker container (via `docker-compose.yml`)
