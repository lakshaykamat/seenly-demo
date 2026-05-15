# Step 7: CI/CD & Deployment

> **When:** Day 11–14
>
> **Goal:** Automated builds and deployment via GitHub Actions → Vercel.

The last step. Once CI/CD works, every push to `main` deploys automatically. No manual deploys, no forgotten steps.

---

## GitHub Actions workflow

A single workflow file (`.github/workflows/deploy.yml`) handles the pipeline:

### Triggers

- Push to `main` branch
- Pull request to `main` (build check only, no deploy)

### Steps

1. **Checkout** — clone the repo
2. **Setup Node** — Node >= 20
3. **Setup pnpm** — pnpm 10
4. **Install dependencies** — `pnpm install`
5. **Build** — `pnpm run build`
6. **Deploy to Vercel** — using Vercel CLI with project token

> Pull requests run the build but don't deploy. This catches build errors before they hit production.

---

## Vercel configuration

- **Framework preset**: Next.js
- **Build command**: `pnpm run build`
- **Output directory**: `.next`
- **Environment variables**: Set in Vercel dashboard (Supabase URL, keys, etc.)

> After the Phase 2 monorepo restructure, the build command changes to `pnpm -F web build` and the root directory becomes `apps/web/`. The CI workflow gets updated to match.

---

## Environment variables

These must be set in Vercel:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (safe for browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server-only, bypasses RLS) |

> Never commit `.env` files. The `.env.example` file documents what's needed without values.

---

## Health check

`GET /api/health` returns `{ status: "ok" }`. Used by:
- CI to verify deployment succeeded
- Monitoring to detect downtime
- Load balancers for health probing

---

## What gets deployed

In Phase 1, only the Next.js app deploys. The Python worker (Phase 2) gets its own deployment pipeline later (Dockerfile → ECS Fargate).

---

## Done when

- [x] Push to `main` triggers build and deploy
- [x] PRs trigger build check without deploying
- [x] Build passes on clean checkout
- [x] Environment variables configured in Vercel
- [x] Health check endpoint responds after deploy
- [x] No secrets in the repo
