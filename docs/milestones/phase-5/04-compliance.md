# Step 4: Compliance — Audit Log & GDPR

> **When:** Week 5
>
> **Goal:** An immutable record of everything important that happens in the product, and the legal/privacy tooling needed to operate in Europe.

---

## Audit log

Every privileged action gets a timestamped, immutable record. Users can see what happened in their org. Seenly staff can see everything.

```sql
CREATE TABLE audit_log (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      uuid REFERENCES organizations(id),
  actor_id    uuid,               -- user or admin who took the action
  actor_type  text NOT NULL,      -- 'user' | 'admin' | 'worker' | 'system'
  action      text NOT NULL,      -- e.g. 'run.created', 'member.invited', 'key.revoked'
  target_type text,               -- 'run' | 'project' | 'user' | etc.
  target_id   uuid,
  metadata    jsonb,              -- context: before/after values, request IP, etc.
  created_at  timestamptz DEFAULT now()
);
```

Rows are insert-only — no updates, no deletes. 7-year retention.

**Actions to instrument (minimum 40):** All run lifecycle events, project creates/updates/deletes, member invites/removals/role changes, API key creates/revocations/rotations, webhook creates/removes, SSO config changes, billing events, admin impersonation starts/ends, settings changes.

A `logger.audit()` helper wraps the insert so adding new audit points is one line in any route.

---

## GDPR

**Cookie consent banner:** Shows on first visit. Three choices: essential only, analytics, all. Choice stored in a cookie and respected until changed. No analytics scripts load until the user consents.

**Right to deletion:** When a user requests account deletion, a cascade job runs:
1. Anonymize the user's profile (replace name/email with `[deleted]`)
2. Remove all personal data from `profiles`, session data, API keys
3. Org data (runs, scores, projects) stays — it belongs to the org, not the user
4. Send a confirmation email

**Data portability:** A user can request a download of all their personal data. The export includes their profile, activity log, and any data specifically tied to them. Available from account settings, delivered as a JSON download.

**Legal pages:** Privacy policy and terms of service as static pages at `/privacy` and `/terms`. Keep them readable — not 40 pages of legalese.

---

## Done when

- [ ] `audit_log` table with insert-only policy
- [ ] `logger.audit()` helper
- [ ] All 40+ actions instrumented
- [ ] Audit log viewer in admin dashboard
- [ ] Tenant audit log (filtered to their org) in settings
- [ ] Cookie consent banner with three tiers
- [ ] Analytics scripts gated on consent
- [ ] Account deletion cascade (anonymize profile, keep org data)
- [ ] Data portability download from account settings
- [ ] `/privacy` and `/terms` pages
