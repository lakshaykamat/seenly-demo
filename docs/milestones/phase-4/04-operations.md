# Step 4: Operations — Scheduled Runs

> **When:** Week 4
>
> **Goal:** Runs happen automatically on a schedule so users don't have to remember to kick them off.

---

## Scheduled runs

Right now runs are always manual. Scheduled runs let users set a cadence — daily, weekly, or monthly — and the system handles it automatically. This is what turns Seenly from a "check in when you remember" tool into something that actively monitors AI visibility.

**New table:**

```sql
CREATE TABLE run_schedules (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id   uuid REFERENCES projects(id) NOT NULL,
  org_id       uuid REFERENCES organizations(id) NOT NULL,
  cadence      text NOT NULL,          -- 'daily', 'weekly', 'monthly'
  day_of_week  int,                    -- 0–6, for weekly schedules
  day_of_month int,                    -- 1–28, for monthly schedules
  next_run_at  timestamptz NOT NULL,
  enabled      boolean DEFAULT true,
  created_by   uuid REFERENCES profiles(id),
  created_at   timestamptz DEFAULT now()
);
```

**How it works:**

A cron job runs every hour and queries for schedules where `next_run_at <= now()` and `enabled = true`. For each one, it creates a new run (quota-checked — scheduled runs count against the monthly quota) and updates `next_run_at`.

If the org is out of quota, skip the run and send a notification. Don't silently fail.

**Plan limits:**

| Plan | Allowed schedules | Minimum cadence |
|------|------------------|----------------|
| Starter | 0 — no scheduling | — |
| Growth | 1 per project | Weekly |
| Enterprise | Unlimited | Daily |

Starter users see a "Scheduled runs are available on Growth and above" message when they try to set one up.

**Scenario runs (enterprise, deferrable):**

What-if runs let enterprise users test a hypothetical — "what if I added these questions?" or "how would we score against this competitor set?" — against a saved baseline. This is explicitly enterprise-only and can be deferred to after Phase 5 if anything in Phase 4 slips. It doesn't block anything else.

---

## API routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/projects/[id]/schedules` | Tenant | List schedules for a project |
| POST | `/api/projects/[id]/schedules` | Admin, analyst | Create a schedule |
| PATCH | `/api/schedules/[id]` | Admin, analyst | Enable/disable or update cadence |
| DELETE | `/api/schedules/[id]` | Admin | Remove a schedule |

---

## Done when

- [ ] `run_schedules` table with migration and RLS
- [ ] Cron job creates runs for due schedules
- [ ] Quota-checked before creating — skips and notifies if over limit
- [ ] `next_run_at` updated correctly after each trigger
- [ ] Plan limits enforced (Starter blocked, Growth weekly minimum)
- [ ] All four API routes working
- [ ] Schedule management UI in project settings
