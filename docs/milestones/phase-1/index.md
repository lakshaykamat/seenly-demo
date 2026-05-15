# Phase 1: Foundation

> Auth, multi-tenancy, roles, dashboard shell, CI/CD.
>
> **Status:** Done — completed in ~2 weeks.
>
> **Depends on:** Nothing. This is the starting point.

Everything below is already built and working. This doc serves as a reference for what exists and how the pieces fit together.

---

## Where we started from

A blank Next.js 16 repo with TypeScript, Tailwind CSS 4, and a Supabase project. No tables, no auth, no routes, no users. Just scaffolding.

---

## Steps

Phase 1 was built in 7 steps. Each one is documented separately.

| Step | File | What it covers |
|------|------|---------------|
| 1 | [01-database.md](./01-database.md) | 3 tables, triggers, RLS policies, migrations |
| 2 | [02-auth-pages.md](./02-auth-pages.md) | Signup, login, password recovery, OAuth, onboarding |
| 3 | [03-middleware.md](./03-middleware.md) | Route guards, JWT claims, role checks, redirects |
| 4 | [04-api-routes.md](./04-api-routes.md) | Auth, onboarding, members, runs, admin endpoints |
| 5 | [05-dashboard-ui.md](./05-dashboard-ui.md) | Dashboard pages, layout, components |
| 6 | [06-lib-types.md](./06-lib-types.md) | Supabase clients, tenant context, auth state, RBAC, types, constants |
| 7 | [07-cicd.md](./07-cicd.md) | GitHub Actions, Vercel deployment |

---

## Stack

- **Runtime**: Node >= 20, pnpm 10
- **Framework**: Next.js 16, React 19, TypeScript (strict)
- **UI**: shadcn/ui (`@base-ui/react` primitives), Tailwind CSS 4, Lucide icons, Sonner toasts
- **State**: TanStack React Query v5
- **Database**: Supabase (Postgres + Auth + RLS)
- **Deploy**: GitHub Actions → Vercel

---

## User flows

**Signup** — create auth user → trigger creates profile (org_id = NULL) → redirect to `/onboarding` → create or join org → profile gets org_id + role → session refresh → `/dashboard`

**Login** — sign in → middleware reads JWT claims → dashboard (or onboarding if no org)

**Access control** — enforced at three layers: middleware (route), API (`withTenant`), UI (`<Can>`)

**Quota** — plan-based monthly run limits checked at creation and exposed via `/api/runs/check-quota`

---

## Deliverable

User can sign up, create or join an org, log into a dashboard, manage members and settings, and trigger runs (which sit at `pending` until Phase 2 wires up the worker).
