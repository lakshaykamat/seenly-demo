# Step 4: API Routes

> **When:** Day 4–7
>
> **Goal:** Backend endpoints for auth context, onboarding, member management, runs, and admin settings.

The API is the contract between the frontend and the database. Every mutation goes through an API route — the frontend never talks to Supabase directly for writes.

---

## Auth & onboarding routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/me` | Session | Returns user context or `{ needsOnboarding: true }` |
| DELETE | `/api/account/delete` | Session | Deletes profile + auth user (cascade) |
| POST | `/api/onboarding/create-org` | Session, no org | Creates org, assigns admin role |
| POST | `/api/onboarding/join-org` | Session, no org | Joins org by invite code, assigns analyst role |

### GET `/api/me`

The first call the frontend makes after login. Returns the full tenant context: `userId`, `email`, `role`, `orgId`, `orgName`, `plan`. If the user hasn't onboarded yet, returns `{ needsOnboarding: true }` so the frontend can redirect.

### POST `/api/onboarding/create-org`

Creates a new organization with the given name. Generates a slug from the name, creates a random 8-char invite code, sets the user as admin. If any step fails, the entire operation rolls back — no orphaned orgs.

> Returns 409 if the user already belongs to an org.

### POST `/api/onboarding/join-org`

Looks up an org by invite code. If found, adds the user as an analyst. Same 409 guard as create.

---

## Member routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/members` | Admin | Lists all members in the org |
| PATCH | `/api/members/[id]` | Admin | Updates a member's role |

### GET `/api/members`

Returns all profiles in the admin's org. Each member includes `id`, `email` (from `auth.users`), `role`, and `createdAt`.

### PATCH `/api/members/[id]`

Changes a member's role. Two safety checks:

1. **Can't change own role** — prevents admins from accidentally demoting themselves
2. **Same-org check** — can only modify members in your own org

Roles are assigned from `ASSIGNABLE_ROLES` (`analyst`, `executive`). The admin role is assigned only during org creation.

---

## Run routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/run` | Tenant | Lists all runs for the org |
| POST | `/api/run` | Admin, analyst | Creates a new run |
| GET | `/api/runs/check-quota` | Tenant | Returns usage vs limit |

### POST `/api/run`

Creates a run with `status: pending`. Before creating, checks the monthly quota:

1. Count runs created this month by this org
2. Compare against `PLAN_LIMITS[plan].runsPerMonth`
3. Return 429 if exceeded

> In Phase 1, runs sit at `pending` forever. Phase 2 wires up the worker to process them.

### GET `/api/runs/check-quota`

Returns `{ allowed, used, limit, plan }`. The dashboard uses this to show the quota progress bar and determine whether the "New Run" button should be enabled.

---

## Admin settings routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/admin/settings` | Admin | Org settings (name, slug, plan, invite code) |
| PATCH | `/api/admin/settings` | Admin | Update name, slug, or regenerate invite code |

### PATCH `/api/admin/settings`

Supports three operations:
- Update org name
- Update org slug (uniqueness enforced at DB level)
- Regenerate invite code (generates new 8-char hex, invalidates old one)

---

## Health check

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/health` | None | Returns `{ status: "ok" }` |

Used by monitoring and CI/CD to verify the app is running.

---

## Auth pattern

All protected routes use `withTenant()` from `lib/api/with-tenant.ts`. This wrapper:

1. Reads the session from cookies
2. Resolves the tenant context (userId, orgId, role, plan)
3. Checks role against allowed roles for the route
4. Returns 401 if unauthenticated, 403 if wrong role
5. Passes the context to the route handler

```ts
export async function GET(req: Request) {
  return withTenant(req, ["admin"], async (ctx) => {
    // ctx.userId, ctx.orgId, ctx.role, ctx.plan available
  });
}
```

> This is the API-level equivalent of the middleware route guards. Double protection — even if middleware has a bug, the API route still checks auth.

---

## Done when

- [x] `/api/me` returns tenant context or onboarding flag
- [x] Account deletion cascades correctly
- [x] Both onboarding routes work (create org, join org)
- [x] Duplicate org membership returns 409
- [x] Member list and role updates work with safety checks
- [x] Run creation enforces quota limits
- [x] Quota check endpoint returns correct numbers
- [x] Admin settings CRUD works
- [x] Invite code regeneration invalidates old code
- [x] Health check returns OK
- [x] All routes use `withTenant()` with correct role requirements
