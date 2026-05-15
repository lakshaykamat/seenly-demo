# Seenly — Fix Plan + Phase 4

**Date:** 2026-05-15 · **Mode:** Mock-JSON only (see `CLAUDE.md`)

Goal: make the product feel like a real, flowing app, then ship Phase 4 (enterprise ops). Each phase is independently shippable.

---

## 1. Locked decisions

- **First-run gate is required.** No populated dashboard on first visit. URL entry → staged processing → populated dashboard. Mock JSON fills the workspace *after* the flow.
- **Same staged flow** powers first-run AND "New run" / "Add project".
- **Drill-downs are mandatory.** Every KPI, chart, and matrix cell links to evidence. No dead-end numbers.
- **Backend bleed is a bug.** Anything still calling `fetcher("/api/...")` or Supabase from the UI must move to the mock store.
- **`CLAUDE.md` reframed:** complete working product, only the data layer is mocked. Forbidden words list updated.

---

## 2. Phase A — Foundation fixes

### A0. First-run URL entry → processing → dashboard *(highest priority, ~1 day)*

**Routing** (gated by `store.hasOnboarded`, default `false`):

- `/` → `/onboarding` if not onboarded, else `/dashboard`
- `/onboarding` → always renders the URL-entry surface
- `/dashboard` and all sub-routes → redirect to `/onboarding` if not onboarded

**Landing surface** (`/onboarding`):

- Marketing-grade hero with single domain input + "Analyze" button
- Three pillar cards explain what gets analyzed
- "Try a sample →" tertiary link skips URL prompt and runs against `octify.ai`

**Staged processing (~14s):**

| Stage              | t (s) | Label                                                                       |
| ------------------ | ----- | --------------------------------------------------------------------------- |
| validating         | 0.6   | Validating {domain}                                                         |
| discovering_pages  | 2.0   | Discovering 12 pages on {domain}                                            |
| fetching_serp      | 3.8   | Fetching live SERP for 28 tracked keywords                                  |
| crawling_pages     | 6.0   | Crawling pages for schema, structure, and crawlability                      |
| probing_engines    | 9.0   | Asking ChatGPT, Claude, Gemini, and Perplexity 18 prompts about your brand  |
| scoring            | 11.4  | Computing AVS, AEO, citation share, and pillar scores                       |
| building_workspace | 13.0  | Setting up your workspace, recommendations, and alerts                      |
| done               | 14.0  | Ready — Seenly score 74.6 · routing to dashboard…                           |

UI: tall card with stage label, percent bar, sub-line cycling through what's being learned. On `done`: 1.2s pause → `/dashboard`.

**Domain handling:** typed URL stored as `store.firstProject` and used as the primary project; demo `octify.ai` becomes a secondary example. Headers/breadcrumbs show the user's domain.

**Done when:** first visit cannot reach populated dashboard without finishing the flow; user's domain appears in headers; "Try a sample" works.

### A1. Fix backend bleed *(~2h, ship with A4)*

`components/dashboard/new-run-dialog.tsx` calls `fetcher("/api/projects")` and `fetcher("/api/run")`. Replace with `createProject` + `createRun` from `@/lib/mocks/store`.

Also: `grep -rn 'fetcher("/api/\|createClient\|supabase\.from' app components lib/api` and fix anything else.

### A2. Staged "New run" progression *(~3h)*

Reuse A0's stage component. New-run flow runs the same stages minus `building_workspace` (workspace exists), ~9s total. Surface on `/runs/[id]` (progress card), `/runs` (animated badge), and dashboard top bar (run-in-progress pill).

Implementation: add `status_stage` to `RunDetail`/`RunListItem`; emit changes from `scheduleRunProgression`; subscribe via the existing `subscribeNotifications` pattern.

### A3. Drill-downs across pillar surfaces *(~1.5d, split by pillar)*

| Surface                     | Click target                          | Detail route                                              |
| --------------------------- | ------------------------------------- | --------------------------------------------------------- |
| `/visibility/search`        | KPI / mover / keyword row             | `/visibility/search/keywords/[id]`                        |
| `/visibility/ai`            | matrix cell                           | `/visibility/ai/prompts/[promptId]?model=[modelId]`       |
| `/visibility/ai`            | sentiment bar                         | filtered prompt list                                      |
| `/visibility/understanding` | page audit row / crawler matrix cell  | `/visibility/understanding/pages/[pageId]`                |
| `/reports/[id]`             | KPI tile / citation bar               | corresponding pillar page filtered to the report period   |
| Inbox notification          | evidence chip (Page/Keyword/Prompt)   | new detail routes above                                   |

Detail pages populated by extending existing fixtures with per-entity blocks (history, raw payloads, evidence). No new fixture files.

### A4. `CLAUDE.md` cleanup *(done)*

Already updated: "MOCK-JSON MODE" framing, forbidden-word block, first-run gate rule, drill-down rule, routing section.

### A5. Drive-by audit *(~30min)*

Confirm no other component touches the network or DB.

---

## 3. Phase B — Phase 4 Enterprise Ops

Each subsection ships independently.

### B1. `/settings/integrations` — Integrations hub

Card grid: Slack, Linear, Jira, Google Search Console, Webhooks. Per card: connect/disconnect (mocked OAuth-style 2-stage progress, ~1.8s), connected state shows workspace + scopes + last sync, **Test fire** button (toast).

- Fixture: `lib/mocks/integrations.ts` (per-integration state + scopes + last sync)
- Hooks: `useIntegrations`, `useConnectIntegration`, `useDisconnectIntegration`, `useTestFireIntegration`
- Cross-cutting: alert rules with `slack`/`webhook` channels grey out if integration disconnected

### B2. `/settings/audit` — Audit log

Paginated timeline. Columns: Time · Actor · Action · Target · IP · Source. Filters: date range, actor, category, free-text. 25/page cursor pagination. 120 seeded entries cross-referenced to existing `MEMBERS`, `RUN_LIST`, `REPORTS`.

- Fixture: `lib/mocks/auditLog.ts`
- Hooks: `useAuditLog` (infinite query)
- Cross-cutting: every mutation in `lib/mocks/store.ts` calls `audit.append({...})` — entries appear live as the user works

### B3. `/settings/api` — API tokens & Webhooks

Two tabs.

**Tokens:** table (Name · Scopes · Created · Last used · Actions). Create dialog → one-time-reveal modal (`sk_live_...` with Copy + "won't see again"). Rotate, Revoke (confirm).

**Webhooks:** table (URL · Events · Created · Last delivery · Actions). Create dialog → one-time signing-secret reveal (`whsec_...`). Send test event, Disable/Enable, Delete.

- Fixtures: `lib/mocks/apiTokens.ts`, `lib/mocks/webhooks.ts`
- Hooks: full CRUD
- Plan gating: Enterprise badge + soft "Available on Enterprise" banner — never blocks

### B4. `/settings/billing` — Billing

Sections: plan card · usage charts (3, one per quota) · invoices table (6 months, mocked PDF download) · payment method (mocked) · upgrade flow modal (3-tier table → 1.5s confirm → toast + plan badge updates everywhere).

- Fixture: extend `fixtures.ts` with `BILLING`
- Hooks: `useBilling`, `useChangePlan`, `useInvoices`

### B5. `/settings/notifications` — Notification preferences

Event × Channel matrix (rows: 8 event categories, cols: in-app / email / slack / webhook). Greyed cells when channel disconnected (tooltip prompts to connect). Autosave + toast. Quiet-hours panel (time range + tz, applies to in-app + email).

- Fixture: extend `notifications.ts` with `NOTIFICATION_PREFS`
- Hooks: `useNotificationPrefs`, `useUpdateNotificationPrefs`
- Cross-cutting: `pushSimulatedNotification` respects prefs and quiet hours

### B6. Settings IA cleanup

Add `/settings/layout.tsx` with left-rail tabs:

```
profile · organization · billing · members · integrations · api · audit · notifications
```

`/members` redirects to `/settings/members`.

---

## 4. Mock JSON additions

| File                              | Purpose                                  | Phase |
| --------------------------------- | ---------------------------------------- | ----- |
| `lib/mocks/integrations.ts`       | Integration state + scopes               | B1    |
| `lib/mocks/auditLog.ts`           | 120 audit entries                        | B2    |
| `lib/mocks/apiTokens.ts`          | 3–5 API tokens                           | B3    |
| `lib/mocks/webhooks.ts`           | 2–3 webhook endpoints + delivery logs    | B3    |
| `fixtures.ts` `BILLING`           | Plan, payment method, 6 invoices         | B4    |
| `notifications.ts` `NOTIFICATION_PREFS` | Per-event-per-channel + quiet hours | B5    |

All cross-referenced to existing IDs.

---

## 5. Ship order

1. A0 *(1 day)*
2. A1 + A4 same PR *(2h)*
3. A2 *(3h)*
4. A3 *(1.5d, 3 PRs by pillar)*
5. A5 *(30min)*
6. B1 → B2 → B3 → B5 → B4 → B6 *(~1 week)*

---

## 6. Out of scope

Real backend, OAuth, PDF generation, Stripe Elements, multi-org switching, real-time presence, dark mode.

---

## 7. Success criteria

A reviewer can:

1. Open the app, **not see populated data**, complete the URL-entry flow (~14s), and land on a dashboard themed to their domain.
2. Click any number on any pillar page → reach an evidence detail.
3. Start a new run → watch labeled stages for ~9s before the score appears.
4. Connect Slack → enable Slack channel on an alert rule → fire it → toast. Disconnect → channel greys out.
5. Create an API token → copy the one-time secret → return later → confirm it cannot be re-revealed.
6. Take any mutating action → see it in `/settings/audit` in the same session.
7. Read `CLAUDE.md` and find no use of "demo" outside the forbidden-words block.
