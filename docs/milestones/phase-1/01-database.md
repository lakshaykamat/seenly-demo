# Step 1: Database & Migrations

> **When:** Day 1–2
>
> **Goal:** Three core tables, triggers, and RLS policies. Everything the app needs to store users, orgs, and runs.

This is the foundation of the foundation. Nothing else works without these tables.

---

## Tables

### organizations

The multi-tenant anchor. Every user belongs to exactly one org.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default `gen_random_uuid()` |
| name | text | NOT NULL |
| slug | text | UNIQUE |
| plan | text | Default `'starter'` |
| invite_code | text | UNIQUE, 8-char hex |
| created_at | timestamptz | Default `now()` |
| updated_at | timestamptz | Auto-updated via trigger |

> The invite code is how analysts join an org. Admin shares the code, analyst enters it during onboarding. Simple, no email invitation flow needed yet.

### profiles

One profile per auth user. The `org_id` starts as NULL — gets populated during onboarding.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, FK → `auth.users` (CASCADE) |
| org_id | uuid | FK → organizations (CASCADE), nullable |
| role | text | Default `'analyst'` |
| created_at | timestamptz | Default `now()` |
| updated_at | timestamptz | Auto-updated |

> A NULL `org_id` means the user signed up but hasn't onboarded yet. The middleware uses this to redirect to `/onboarding`.

### runs

A run is a single analysis job. Created by the API, picked up by the worker (Phase 2).

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, default `gen_random_uuid()` |
| org_id | uuid | FK → organizations (CASCADE) |
| created_by | uuid | FK → `auth.users` (SET NULL on delete) |
| status | text | Default `'pending'` |
| created_at | timestamptz | Default `now()` |
| updated_at | timestamptz | Auto-updated |

> Status stays `pending` for all of Phase 1 — there's no worker to pick runs up yet. Phase 2 adds `queued`, `running`, `completed`, and `failed`.

---

## Triggers & functions

Three database functions, all created in early migrations:

| Function | Trigger | Purpose |
|----------|---------|---------|
| `update_updated_at()` | BEFORE UPDATE on every table | Sets `updated_at = now()` automatically |
| `handle_new_user()` | AFTER INSERT on `auth.users` | Creates a profile row with `org_id = NULL` |
| `custom_access_token_hook()` | JWT hook (configured in Supabase dashboard) | Injects `org_id` and `user_role` into JWT claims |

The JWT hook is the clever part. Instead of querying the database on every API call to figure out which org a user belongs to, the JWT already carries `org_id` and `user_role`. The middleware reads these claims directly — no round trip.

> **Important:** The JWT hook must be configured in the Supabase dashboard under Auth → Hooks. It won't work from migrations alone.

---

## RLS policies

Row-Level Security is the final layer of access control. Even if the API has a bug, RLS prevents data leaks at the database level.

### organizations

| Policy | Effect | Condition |
|--------|--------|-----------|
| Read own org | SELECT | `auth.uid()` has profile with matching `org_id` |
| Admin updates | UPDATE | Same + user role is `admin` |

### profiles

| Policy | Effect | Condition |
|--------|--------|-----------|
| Read own | SELECT | `id = auth.uid()` |
| Read org members | SELECT | Same org + viewer is admin |
| Update own | UPDATE | `id = auth.uid()` |
| Admin inserts | INSERT | Admin in same org |
| Admin deletes non-self | DELETE | Admin + target is not self |

### runs

| Policy | Effect | Condition |
|--------|--------|-----------|
| Org members read | SELECT | Same org |
| Admin + analyst create | INSERT | Same org + role in (`admin`, `analyst`) |
| Admin + analyst update | UPDATE | Same org + role in (`admin`, `analyst`) |
| Admin deletes | DELETE | Same org + admin |

---

## Migrations

Seven migration files in `supabase/migrations/`, applied in order. Each one is idempotent — safe to re-run during development.

> All migrations live at the repo root under `supabase/` so they're shared across apps (relevant when the monorepo restructure happens in Phase 2).

---

## Done when

- [x] Three tables exist with correct columns and constraints
- [x] `update_updated_at` trigger fires on all tables
- [x] `handle_new_user` creates profile on signup
- [x] JWT hook injects `org_id` and `user_role` into claims
- [x] RLS policies enforce org-scoped access
- [x] All migrations apply cleanly on a fresh Supabase instance
