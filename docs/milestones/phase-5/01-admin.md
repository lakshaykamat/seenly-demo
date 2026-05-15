# Step 1: Admin Dashboard

> **When:** Week 1–2
>
> **Goal:** Seenly staff can see who's using the product, manage users and orgs, and track revenue — without touching the database directly.

---

## Admin auth

Internal admin accounts are separate from tenant accounts. They live in their own table and require TOTP two-factor auth to log in.

```sql
CREATE TABLE admin_users (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email        text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  totp_secret  text,           -- null until 2FA is set up
  totp_enabled boolean DEFAULT false,
  backup_codes text[],         -- hashed backup codes
  last_login   timestamptz,
  created_at   timestamptz DEFAULT now()
);
```

Admin sessions are completely separate from tenant JWTs. A middleware guards all `/admin` routes and checks for a valid admin session + completed 2FA.

---

## What the admin dashboard shows

**Users page:** Search by email or org. See plan, join date, last active, run count. Impersonate a user to see exactly what they see (read-only impersonation, logged in the audit trail).

**Orgs page:** List of all organizations with plan, member count, run usage, and billing status.

**Revenue page:** MRR, churn, new subscriptions this month, plan breakdown. Pulled from Stripe.

**Usage page:** Total runs this week/month, runs by plan tier, average run duration, worker error rate.

**Audit log page:** Searchable log of every privileged action taken by admins or users (see compliance step for the full audit trail spec).

---

## API routes (internal, admin-only)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/admin/users` | List users with search |
| GET | `/api/admin/users/[id]` | User detail |
| POST | `/api/admin/users/[id]/impersonate` | Start impersonation session |
| GET | `/api/admin/orgs` | List orgs |
| GET | `/api/admin/kpis/revenue` | Stripe revenue metrics |
| GET | `/api/admin/kpis/usage` | Platform usage metrics |
| GET | `/api/admin/audit-log` | Admin audit log |

---

## Done when

- [ ] `admin_users` table with migration
- [ ] Admin login with TOTP 2FA — backup codes work too
- [ ] All `/admin` routes gated by admin middleware
- [ ] Users page: search, plan, run count, impersonation
- [ ] Orgs page: plan, members, usage, billing status
- [ ] Revenue page: MRR, churn, new subs, plan breakdown
- [ ] Usage page: run counts, plan breakdown, error rate
- [ ] Audit log page: searchable, timestamped
- [ ] Impersonation is read-only and logged
