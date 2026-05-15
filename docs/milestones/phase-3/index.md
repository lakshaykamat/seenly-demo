# Phase 3: Billing, Email & Notifications

> Payments, transactional emails, and in-app alerts.
>
> **Timeline:** 2–3 weeks
>
> **Depends on:** Phase 2 complete

---

## Starting point

- Three plans in `constants/plans.ts` — starter (50 runs/mo), growth (500), enterprise (unlimited)
- `organizations.plan` column exists (default `starter`)
- Quota enforced at run creation via `PLAN_LIMITS`
- `<UpgradeMessage>` links to `/settings/billing` — page doesn't exist yet
- No Stripe, no email provider, no notifications

---

## Steps

| Step | File | What it covers |
|------|------|----------------|
| 1 | [01-database.md](./01-database.md) | Billing columns on organizations, notifications table |
| 2 | [02-stripe.md](./02-stripe.md) | Checkout, portal, webhook handler, plan sync |
| 3 | [03-billing-ui.md](./03-billing-ui.md) | Billing page — plan cards, manage subscription |
| 4 | [04-email.md](./04-email.md) | Welcome, run completed, payment emails |
| 5 | [05-notifications.md](./05-notifications.md) | Notification bell, run + payment alerts |

---

## Plan sync

When plan changes via webhook: update `organizations.plan`. Quota limits are read from `PLAN_LIMITS[plan]` at check time — no extra sync step. Downgrade applies immediately; existing runs are not deleted.

---

## Deliverable

Users subscribe via Stripe Checkout, manage through the portal, and drop to starter on cancellation. They get emails for welcome, completed runs, and payment events. The notification bell shows unread alerts for runs and payments.
