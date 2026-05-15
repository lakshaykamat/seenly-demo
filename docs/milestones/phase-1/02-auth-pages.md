# Step 2: Auth Pages

> **When:** Day 2–4
>
> **Goal:** Complete authentication flow — signup, login, password recovery, OAuth callback, and onboarding.

Six routes handle every auth scenario a user will encounter. The goal is zero dead ends — every flow has a success path and clear error feedback.

---

## Pages

| Page | Route | What it does |
|------|-------|-------------|
| Login | `/login` | Email + password sign-in. Redirects to `/dashboard`. |
| Signup | `/signup` | Registration with duplicate detection. Redirects to `/onboarding`. |
| Onboarding | `/onboarding` | Two tabs: create org (become admin) or join via invite code (become analyst). |
| Forgot password | `/forgot-password` | Sends reset email via Supabase Auth. |
| Reset password | `/reset-password` | New password form from email link. Toast on success. |
| OAuth callback | `/callback` | Handles Supabase OAuth redirects. |

All pages are `force-dynamic` — no static rendering, no caching. Auth state must always be fresh.

---

## Auth layout

The auth pages share a layout at `app/(auth)/layout.tsx`:

- Centered card on a gradient background (`bg-gradient-to-br from-primary/5 via-background to-background`)
- Cards use `max-w-md` width
- No sidebar, no header — just the card

---

## Login (`/login`)

- Email and password fields
- Submit calls `supabase.auth.signInWithPassword()`
- On success → redirect to `/dashboard`
- On error → styled error block with `AlertCircle` icon
- Link to signup and forgot password

> Logged-in users hitting `/login` get redirected away by middleware.

---

## Signup (`/signup`)

- Email and password fields
- Submit calls `supabase.auth.signUp()`
- Duplicate email detection — Supabase returns a specific error code
- On success → redirect to `/onboarding` (user has no org yet)
- On error → styled error block

---

## Onboarding (`/onboarding`)

This is the org association step. New users land here after signup.

Two tabs (using shadcn `Tabs` component):

**Create organization:**
- Org name field
- Calls `POST /api/onboarding/create-org`
- User becomes admin of the new org
- Generates invite code automatically

**Join organization:**
- Invite code field (8-char hex)
- Calls `POST /api/onboarding/join-org`
- User becomes analyst in the existing org
- Returns 409 if user already has an org

> Users who already belong to an org are redirected away from `/onboarding` by middleware.

---

## Forgot password (`/forgot-password`)

- Email field with `Mail` icon (lucide-react)
- Calls `supabase.auth.resetPasswordForEmail()`
- Shows success message ("Check your email") regardless of whether email exists (prevents enumeration)
- Error handling for network failures

---

## Reset password (`/reset-password`)

- New password + confirm password fields
- Calls `supabase.auth.updateUser({ password })`
- On success → `toast.success("Password updated")` + redirect to login
- Accessed via email link from forgot password flow

---

## OAuth callback (`/callback`)

- Handles the redirect from Supabase OAuth (e.g., Google login)
- Exchanges auth code for session
- Redirects to `/dashboard` or `/onboarding` based on profile state

---

## Error styling

All auth pages use the same error block pattern:

```tsx
<div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
  <AlertCircle className="size-4 shrink-0" />
  <span>{error}</span>
</div>
```

Consistent, visible, and not a browser alert.

---

## Done when

- [x] All six auth routes render correctly
- [x] Signup creates user and redirects to onboarding
- [x] Login authenticates and redirects to dashboard
- [x] Onboarding creates or joins org, assigns correct role
- [x] Forgot/reset password flow works end to end
- [x] OAuth callback handles Supabase redirects
- [x] Duplicate detection works (signup + join)
- [x] Error states display with styled error blocks
- [x] Logged-in users are redirected away from auth pages
