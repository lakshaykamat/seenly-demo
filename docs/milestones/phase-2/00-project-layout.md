# Step 0: Project Layout

> **When:** Before any other Phase 2 work
>
> **Goal:** Add a Python worker directory alongside the existing Next.js app. No monorepo restructure.

---

## What changes

Add one new directory at the project root:

```
seenly/
  workers/
    requirements.txt
    worker.py
    pipeline/
      __init__.py
      crawl.py
      understand.py
      ai_query.py
      scoring.py
      competitors.py
    config.py
    db.py
    Dockerfile
```

Everything else stays where it is. The Next.js app remains at root. No `apps/web/` move, no pnpm workspaces.

---

## Why not a monorepo

Moving the Next.js app into `apps/web/` would:
- Break every import path in the codebase
- Require pnpm workspace config (`pnpm-workspace.yaml`, root `package.json` scripts)
- Break CI/CD (deploy.yml paths, Vercel config)
- Break all relative paths in `tsconfig.json`, `tailwind.config.ts`, `next.config.ts`
- Take a full day of refactoring for zero user value

The worker only needs `SUPABASE_URL` and API keys. There's no shared code between the web app and the Python worker. They communicate through the database.

---

## New scripts

Add to the root `package.json`:

```json
{
  "scripts": {
    "worker:dev": "cd workers && python worker.py"
  }
}
```

---

## New environment variables

Add to `.env.example`:

```
# Worker (Python)
OPENROUTER_API_KEY=
```

The worker reuses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` that already exist.

---

## Done when

- [ ] `workers/` directory exists with the file structure above
- [ ] All pipeline files are stubs (empty functions)
- [ ] `requirements.txt` lists dependencies: `httpx`, `supabase`, `openai`, `playwright`
- [ ] `python worker.py` runs without errors (polls DB, finds nothing, sleeps)
- [ ] Dockerfile builds and runs the worker
- [ ] `.env.example` updated with new variables
