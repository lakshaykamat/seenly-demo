# Step 1: Database

> **Goal:** Add billing columns to `organizations` and create the `notifications` table.

Two migrations, no application code. Everything else in Phase 3 depends on these columns existing.

---

## Add to `organizations`

| Column | Type | Notes |
|--------|------|-------|
| stripe_customer_id | text | UNIQUE, nullable |
| stripe_subscription_id | text | UNIQUE, nullable |
| subscription_status | text | `active`, `past_due`, `canceled` — nullable |
| current_period_end | timestamptz | When the current billing period ends |

All nullable — orgs start on starter with no Stripe customer. Columns populate when admin subscribes.

> Plain `text` not an enum — Stripe may add new statuses and altering enums requires a migration.

---

## New table: `notifications`

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, `gen_random_uuid()` |
| org_id | uuid | FK → organizations (CASCADE) |
| user_id | uuid | FK → auth.users (SET NULL), nullable — null = org-wide |
| type | text | Event type |
| title | text | Short display title |
| message | text | Detail text |
| read | boolean | Default `false` |
| created_at | timestamptz | Default `now()` |

```sql
CREATE INDEX idx_notifications_org_read ON notifications (org_id, read, created_at DESC);
```

Covers unread count (org + read = false) and notification list (org, ordered by date).

---

## RLS policies

| Policy | Effect | Condition |
|--------|--------|-----------|
| Read own | SELECT | Same org AND (`user_id = auth.uid()` OR `user_id IS NULL`) |
| Mark as read | UPDATE `read` only | Same as read |

Notifications are INSERT-only via service role. No tenant INSERT or DELETE policy.

---

## Migration files

| File | Contents |
|------|----------|
| `supabase/migrations/009_billing.sql` | ALTER TABLE organizations ADD COLUMN × 4 |
| `supabase/migrations/010_notifications.sql` | CREATE TABLE notifications + index + RLS |

---

## Done when

- [ ] Four billing columns exist on `organizations`
- [ ] `notifications` table created with index
- [ ] RLS allows org-scoped read and mark-as-read
- [ ] Migrations apply cleanly on a fresh instance
