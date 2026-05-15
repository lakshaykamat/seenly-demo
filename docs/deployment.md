# Deployment

Two services to run: the **Next.js app** and the **Python worker**.

---

## Next.js app

Deployed automatically to Vercel via GitHub Actions on every push to `main`.

No manual steps needed. The workflow lives in `.github/workflows/deploy.yml`.

---

## Python worker

The worker runs as a Docker container. It connects directly to Supabase and OpenRouter — no other services needed.

### Environment variables

Copy `.env.example` to `.env` and fill in all values before running.

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPENROUTER_API_KEY=
```

### Run with Docker Compose

```bash
# Build and start
docker compose up -d

# View logs
docker compose logs -f worker

# Stop
docker compose down
```

### Run without Docker (local dev)

```bash
cd workers
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
python worker.py
```

### Docker files

| File | Purpose |
|---|---|
| `Dockerfile` | Builds the worker image from repo root |
| `docker-compose.yml` | Runs the worker container with env vars and restart policy |
| `.dockerignore` | Keeps the image small — only `workers/` source is copied |

---

## Database migrations

Migrations are in `supabase/migrations/`. Run them in order against your Supabase project.

```bash
supabase db push
```

Or apply manually via the Supabase SQL editor in the order they're numbered (`001_` → `010_`).
