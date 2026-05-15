# Step 6: Lib Utilities, Types & Constants

> **When:** Throughout Phase 1 (built as needed by other steps)
>
> **Goal:** Shared utilities, type definitions, and constants that every other step depends on.

These aren't a separate "step" in the linear sense — they were built alongside everything else. But they're documented here because they form the shared foundation that both frontend and API code import from.

---

## Supabase clients

Three client factories, each for a different context:

| File | Export | Context | Auth |
|------|--------|---------|------|
| `lib/supabase/server.ts` | `createClient()` | Server components, API routes | Cookie session |
| `lib/supabase/client.ts` | `createClient()` | Client components | Cookie session |
| `lib/supabase/admin.ts` | `createAdminClient()` | API routes (admin ops) | Service role key |
| `lib/supabase/middleware.ts` | `updateSession()` | Middleware | Session refresh |

> The admin client bypasses RLS — use it only in API routes where the service role key is needed (e.g., deleting users, reading across orgs). Never expose it to the browser.

---

## Tenant context

### `lib/tenant.ts` — `getTenantContext()`

Resolves the full tenant context from a Supabase session:

1. Get session from cookies
2. Look up profile (org_id, role)
3. Look up organization (name, plan)
4. Return `TenantContext`

Used by API routes via `withTenant()` and by server components directly.

### `lib/auth-context.tsx` — `AuthProvider` + `useAuth()`

Client-side auth state. Fetches `/api/me` on mount and provides the context to all dashboard components.

```tsx
const { user, isLoading } = useAuth();
// user: { userId, email, role, orgId, orgName, plan } | null
```

Handles the loading state — components can show skeletons until auth is resolved.

### `lib/api/with-tenant.ts` — `withTenant()`

API route wrapper that handles auth + RBAC + error handling in one function:

1. Resolve tenant context
2. Check role against allowed roles
3. Call the handler with context
4. Catch errors, return appropriate status codes

Eliminates boilerplate from every API route.

---

## Fetcher & query client

### `lib/api/fetcher.ts` — `fetcher()`

Client-side fetch wrapper:
- Calls `fetch()` with credentials
- Throws on non-OK responses (React Query catches these)
- Returns parsed JSON

### `lib/query-client.tsx` — `QueryProvider`

React Query provider with sensible defaults:
- 30-second stale time
- 1 retry on failure
- Wraps the entire dashboard layout

---

## Logger

### `lib/logger.ts` — `logger`

Structured JSON logger for server-side code:
- Outputs JSON to stdout (Vercel picks this up)
- Auto-redacts sensitive fields (passwords, tokens, keys)
- Levels: `info`, `warn`, `error`
- Includes timestamp and context

---

## Utility

### `lib/utils.ts` — `cn()`

`clsx` + `tailwind-merge`. Used by every component for conditional class names.

---

## Types

Defined in `types/`:

| Type | Shape |
|------|-------|
| `Role` | `"admin" \| "analyst" \| "executive"` |
| `Plan` | `"starter" \| "growth" \| "enterprise"` |
| `PlanLimit` | `{ runsPerMonth: number }` (−1 = unlimited) |
| `TenantContext` | `{ userId, email, role, orgId, orgName, plan }` |
| `QuotaResponse` | `{ allowed, used, limit, plan }` |
| `Member` | `{ id, email, role, createdAt }` |
| `OrgSettings` | `{ id, name, slug, plan, inviteCode }` |

> `PlanLimit` gets extended in Phase 2 to include crawl limits, query limits, engine counts, etc.

---

## Constants

Defined in `constants/`:

| Constant | Value | Purpose |
|----------|-------|---------|
| `ROLES` | `["admin", "analyst", "executive"]` | All valid roles |
| `ASSIGNABLE_ROLES` | `["analyst", "executive"]` | Roles an admin can assign (admin is auto-assigned at org creation) |
| `PLANS` | `["starter", "growth", "enterprise"]` | All valid plans |
| `PLAN_LIMITS` | Starter: 50/mo, Growth: 500/mo, Enterprise: unlimited | Quota enforcement |
| `ROLE_ROUTE_ACCESS` | `/settings` → admin, `/members` → admin, `/runs` → admin + analyst | Middleware route checks |

---

## Done when

- [x] Three Supabase client factories work in their respective contexts
- [x] `getTenantContext()` resolves session → profile → org
- [x] `AuthProvider` provides client-side auth state
- [x] `withTenant()` wraps all protected API routes
- [x] `fetcher()` handles client-side API calls
- [x] React Query provider configured with sensible defaults
- [x] Logger outputs structured JSON with redaction
- [x] All types and constants defined and used consistently
