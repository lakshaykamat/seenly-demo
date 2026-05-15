# Step 3: Middleware & Route Guards

> **When:** Day 3–4 (alongside auth pages)
>
> **Goal:** Route-level protection. No unauthenticated access to the dashboard. No org-less users past onboarding. Role-based route restrictions.

The middleware runs on every request before the page renders. It's the first line of defense — if a user shouldn't see a page, they never even get the HTML.

---

## How it works

All route protection lives in `proxy.ts` (Next.js middleware). Five checks run in order:

### 1. Public paths — pass through

Some routes don't need auth: `/login`, `/signup`, `/forgot-password`, `/callback`, `/api/health`.

If the user **is** logged in and hits `/login` or `/signup`, redirect them to `/dashboard`. No reason to show auth pages to authenticated users.

### 2. Protected + not authenticated

If the route requires auth and there's no session, redirect to `/login?redirectTo={path}`. The `redirectTo` param is used after login to send the user back to where they were trying to go.

### 3. Authenticated — decode JWT claims

Read `org_id` and `user_role` from the Supabase JWT. These were injected by the `custom_access_token_hook()` trigger (Step 1).

> No database query here. The JWT carries everything the middleware needs. This keeps the middleware fast — one token decode, no round trips.

### 4. No org on non-onboarding route

If the user has no `org_id` (hasn't completed onboarding) and they're trying to access anything other than `/onboarding`, redirect to `/onboarding`.

### 5. Role check

Match the route against `ROLE_ROUTE_ACCESS`:

| Route | Allowed roles |
|-------|--------------|
| `/settings` | admin |
| `/members` | admin |
| `/runs` | admin, analyst |
| `/dashboard` | all |

Unauthorized? Redirect to `/dashboard`.

---

## Session refresh

The middleware also refreshes the Supabase session via `updateSession()` from `lib/supabase/middleware.ts`. This extends the session cookie on every request, preventing unexpected logouts.

---

## Route config

```ts
export const ROLE_ROUTE_ACCESS: Record<string, Role[]> = {
  "/settings": ["admin"],
  "/members": ["admin"],
  "/runs": ["admin", "analyst"],
};
```

Routes not in this map are accessible to all authenticated users.

---

## Edge cases

| Situation | What happens |
|-----------|-------------|
| Expired session | Redirect to `/login` |
| Valid session, no org | Redirect to `/onboarding` |
| Analyst hits `/settings` | Redirect to `/dashboard` |
| Already logged in, hits `/login` | Redirect to `/dashboard` |
| API routes | Use `withTenant()` wrapper instead (Step 4) |

---

## Done when

- [x] Unauthenticated users can't access dashboard routes
- [x] Authenticated users are redirected away from login/signup
- [x] Users without an org are redirected to `/onboarding`
- [x] Role-based route access enforced (settings → admin only, etc.)
- [x] Session refresh extends cookie on every request
- [x] `redirectTo` param preserves intended destination after login
