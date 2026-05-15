# Seenly — Premium Feature Blueprint

**Date:** 2026-05-15
**Mode:** Demo (UI-only, mocked data — see `CLAUDE.md`)
**Audience:** Enterprise-grade — CMO, SEO/GEO specialist, Content/Growth team
**Goal:** Make Seenly look and feel like a top-tier production SaaS at the level of Linear, Vercel, Stripe, or Datadog.

---

## 1. Product positioning recap

Seenly measures how well a company is **recommended by AI assistants** (ChatGPT, Claude, Gemini, Perplexity) and **search engines** (Google), and tells them what to fix — with scores, evidence, and prioritized actions.

Three pillars:

- **Search Visibility** — SERP presence, ranks, SERP features
- **AI Recommendation** — citation share in AI answers, sentiment, prompt coverage
- **AI Understanding** — site structure, schema, crawlability for AI agents

---

## 2. Information architecture

### Sidebar (top-level navigation)

1. **Overview** — role-tailored home (KPI strip / work queue / opportunity feed)
2. **Search Visibility**
3. **AI Recommendation**
4. **AI Understanding**
5. **Competitors**
6. **Recommendations**
7. **Prompt Sandbox**
8. **Reports**
9. **Runs** _(existing)_
10. **Settings** _(existing — expanded)_

### Persistent shell

- **Top bar:** project switcher (multi-project), global search (⌘K), notifications bell with inbox, help menu, avatar menu
- **Sidebar:** collapsible, density toggle, plan badge with usage meter at the bottom

### URL shape

```
/overview
/visibility/search
/visibility/ai
/visibility/understanding
/competitors
/recommendations
/prompts
/reports
/runs
/runs/[id]
/settings/{profile|organization|billing|members|integrations|api|audit|notifications}
```

---

## 3. The 12 core features

### Pillar surfaces (3)

**F1. Search Visibility**
SERP rank trends per tracked keyword, share-of-voice gauge, SERP-feature ownership (featured snippets, People Also Ask, image packs, AI Overviews), top movers (gainers/losers), keyword cannibalization flags.

**F2. AI Recommendation**
Citation share across ChatGPT / Claude / Gemini / Perplexity; prompt-level coverage matrix; brand sentiment split (favorable / neutral / unfavorable); head-to-head citation rate vs each competitor per prompt; "first-mention" rate.

**F3. AI Understanding**
Page-level audit: schema/structured-data coverage, `llms.txt` and `robots.txt` posture, semantic clarity score, entity recognition (which entities AI extracts from each page), AI-crawler accessibility (User-Agent matrix).

### Cross-cutting analyses (3)

**F4. Competitors Radar**
Multi-competitor comparison across all three pillars in one matrix. Gap analysis ("where they beat us"), mention deltas over time, citation overlap diagram, competitor watchlist.

**F5. Recommendations queue**
Prioritized action items scored on **effort × impact**. Each card: title, evidence, affected pages/queries, assignee, status (open / in-progress / done / dismissed), pillar tag. Sort, filter, bulk-update, assign to teammates.

**F6. Prompt Sandbox**
Pick a prompt + model (gpt-4o, claude-sonnet-4-6, gemini-2.5-pro, perplexity), see how the brand is cited in a mocked answer with inline citations highlighted. Save prompts into a monitored set. Compare two models side-by-side.

### Reporting & comms (2)

**F7. Executive Reports**
Auto-generated monthly narrative report — cover page, KPI summary, pillar breakdowns, top wins, top risks, recommended next month's focus. Downloadable PDF (mocked), shareable read-only link.

**F8. Alerts & Inbox**
Threshold-based alerts (rank drop > N positions, citation share drop > X%, new competitor mention, schema regression). Notification inbox with read/unread, snooze, mute rules. Bell badge in top bar.

### Premium polish & ops (4)

**F9. Command palette (⌘K)**
Global search across projects, runs, prompts, pages, members, recommendations. Quick actions ("New run", "Invite member", "Go to billing"). Recent items, keyboard-first.

**F10. Role-tailored Overview home**
The home page renders differently based on `user.role`:

- **Executive:** KPI strip (visibility score, citation share, rank delta), trend chart, top wins/risks, latest report.
- **Analyst:** Active runs, recommendations queue snapshot, recent evidence drops.
- **Content/Growth:** Opportunity feed (uncited prompts where we should rank), competitor content gaps, prompt sandbox CTA.

**F11. Integrations hub**
Slack alerts, Linear/Jira sync for recommendations, Google Search Console import, Webhooks. All UI-only — connect/disconnect flows, scopes, last-sync timestamps, test-fire buttons.

**F12. Audit log & API tokens**
Activity timeline of org actions (member invited, run started, report shared, integration connected) with actor, target, IP, timestamp. API token management UI — create, rotate, revoke, scope, last-used.

---

## 4. Premium-feel cross-cutting touches

Applied throughout, not as standalone features:

- **Motion:** subtle 150–200ms transitions, animated number counts on KPIs, chart enter animations, skeleton → content cross-fades.
- **Empty states:** illustrated, with one clear primary CTA — never a bare "No data" string.
- **Loading:** skeletons that match real layout density; staggered reveal.
- **Error states:** friendly copy, retry CTA, "what to do next" guidance.
- **Optimistic updates:** create/update/delete reflect instantly; rollback with toast on simulated failure.
- **Charts:** consistent palette tied to pillars (search = blue, AI rec = violet, AI understanding = emerald); tooltips with rich content (delta, sparkline, evidence link).
- **Tables:** sortable, filterable, column visibility menu, density toggle, sticky headers, row hover affordances, bulk-select with toolbar.
- **Keyboard:** ⌘K palette, `g d` go-to-dashboard, `?` shortcut help overlay, `j/k` row nav in tables.
- **Toasts:** softer than default — title + description + optional action ("Undo").
- **Demo realism:** mocked latencies (200–600ms), occasional simulated failures for realistic error UX.
- **Plan-aware UI:** Growth/Enterprise features show subtle "Growth" or "Enterprise" badges where Starter would be gated; never block flows in the demo.

---

## 5. Plan tiering (visual only)

| Feature                    | Starter      | Growth        | Enterprise               |
| -------------------------- | ------------ | ------------- | ------------------------ |
| Pillar dashboards (F1–F3)  | ✅ basic     | ✅ full       | ✅ full                  |
| Competitors Radar (F4)     | 1 competitor | 5             | unlimited                |
| Recommendations queue (F5) | view only    | full          | full + Jira sync         |
| Prompt Sandbox (F6)        | 5 prompts    | 50            | unlimited                |
| Executive Reports (F7)     | —            | monthly       | monthly + ad-hoc         |
| Alerts (F8)                | email        | email + Slack | + Webhooks               |
| Integrations (F11)         | —            | Slack, GSC    | + Linear, Jira, Webhooks |
| Audit log & API (F12)      | —            | —             | ✅                       |

Used to drive `<Can>` and `<UpgradeMessage>` surfaces already in the codebase.

---

## 6. Mock data needs (additions to `lib/mocks/`)

New fixtures required:

- `keywords.ts` — 30–60 tracked keywords with rank history, SERP features, volume, intent
- `aiCitations.ts` — citation events per (prompt × model × date), sentiment, snippet, source URL
- `prompts.ts` — 40+ monitored prompts grouped into sets
- `schemaAudit.ts` — per-page schema findings, severity, suggested fix
- `recommendations.ts` — 25+ items with effort/impact/status/assignee
- `alerts.ts` — rules + recent firings
- `notifications.ts` — inbox items with read/unread state
- `reports.ts` — 6 monthly reports with chart payloads
- `auditLog.ts` — 100+ activity entries
- `apiTokens.ts` — 3–5 tokens with scopes and last-used
- `integrations.ts` — connect state per integration
- `competitorsExt.ts` — extend existing with per-pillar scores and gap matrix

All cross-referenced (run_ids, prompt_ids, project_ids match across fixtures).

---

## 7. Phased delivery plan

Each phase is independently shippable — at the end of every phase the demo is fully functional with no broken surfaces.

### Phase 0 — Premium shell & foundations _(week 1)_

**Goal:** lift the chrome to feel premium before adding new surfaces.

- New top bar: project switcher, global search trigger, notifications bell (empty inbox OK), help, avatar
- Sidebar polish: collapsible, density toggle, plan/usage badge at bottom
- **F9 Command palette (⌘K)** — searches static items first; new entities added as later phases land
- Toast system refinement, skeleton library, empty-state illustration set, error-state component
- Motion primitives, chart palette tokens in `globals.css`
- Keyboard shortcut overlay (`?`)
- **F10 Role-tailored Overview home** — replaces current dashboard; reads `user.role` to pick layout

**Exit criteria:** every existing page still works; new shell visible everywhere; ⌘K opens and searches existing data.

---

### Phase 1 — Pillar surfaces _(weeks 2–3)_

**Goal:** stand up the product's three primary value surfaces.

- **F1 Search Visibility** — page with: visibility score KPI, rank-trend chart, SERP-feature ownership table, top movers, keyword table with filters
- **F2 AI Recommendation** — page with: citation share donut, prompt × model coverage matrix, sentiment split, head-to-head vs top 3 competitors
- **F3 AI Understanding** — page with: page-level audit table, schema coverage heatmap, AI-crawler accessibility matrix, semantic clarity distribution
- New fixtures: `keywords.ts`, `aiCitations.ts`, `schemaAudit.ts`, extend `competitorsExt.ts`
- Cross-link evidence drilldowns back to existing Runs detail page

**Exit criteria:** each pillar surface renders, filters work, charts animate, empty/loading/error states present, drilldowns navigate.

---

### Phase 2 — Cross-cutting analyses _(weeks 4–5)_

**Goal:** the analyst's daily-driver surfaces.

- **F4 Competitors Radar** — multi-select competitors, pillar comparison matrix, gap chart, mention timeline, watchlist CRUD
- **F5 Recommendations queue** — kanban + list views, effort/impact bubble chart, bulk actions, assign-to-member, status transitions (with optimistic update + simulated failure case)
- **F6 Prompt Sandbox** — prompt input, model picker, mocked streaming answer with citation highlights, save-to-monitored-set, side-by-side compare
- New fixtures: `recommendations.ts`, `prompts.ts`

**Exit criteria:** competitors comparable end-to-end; recommendations can be created/assigned/closed entirely in mocks; sandbox produces realistic streaming output and saves prompts.

---

### Phase 3 — Reporting & communication _(week 6)_

**Goal:** the executive's outputs.

- **F7 Executive Reports** — report list, report viewer with cover/sections/charts, "Generate this month's report" CTA with realistic 4s progress, PDF download (mocked blob), shareable read-only link page (`/r/[token]`)
- **F8 Alerts & Inbox** — alerts settings (rules CRUD), inbox panel from bell, mark read/all-read, snooze, mute-rule creation, in-app toast on simulated incoming alert
- New fixtures: `reports.ts`, `alerts.ts`, `notifications.ts`

**Exit criteria:** at least 6 prior reports viewable; a new report can be "generated" with realistic latency; alerts can be configured and fire in-session.

---

### Phase 4 — Enterprise ops _(week 7)_

**Goal:** the enterprise checkboxes.

- **F11 Integrations hub** under `/settings/integrations` — cards per integration (Slack, Linear, Jira, GSC, Webhooks), connect/disconnect flows, scopes, last-sync, test-fire button with toast
- **F12 Audit log** at `/settings/audit` — paginated activity timeline with actor/target/IP/time, filters
- **F12 API & Webhooks** at `/settings/api` — token CRUD (create with one-time-reveal modal, rotate, revoke, scopes, last-used), webhook endpoints CRUD with signing secret reveal
- Billing UI at `/settings/billing` — plan card, usage charts, invoice list (mocked), upgrade flow modal
- Notification preferences at `/settings/notifications` — channels × event matrix
- New fixtures: `auditLog.ts`, `apiTokens.ts`, `integrations.ts`, billing data

**Exit criteria:** every settings subroute is real; tokens & webhooks fully manageable in mocks; audit log paginated.

---

## 8. Out of scope (explicit non-goals)

- Any real backend, API, Supabase, worker, LLM, or third-party SDK calls
- Multi-tenant data isolation logic (single mocked org)
- Real auth, sessions, password reset (CLAUDE.md confirms all `redirect("/dashboard")`)
- Real PDF generation (the "download" returns a static mocked blob)
- Mobile app — responsive web only

---

## 9. Open questions

- Confirm phase weeks are guidance, not commitments
- Confirm whether plan badges (Growth/Enterprise) should appear on gated features in the demo
- Confirm whether to introduce a dark-mode toggle as part of Phase 0 polish

---

## 10. Success criteria

The blueprint is successful if a first-time visitor to the demo:

1. Cannot tell it's a demo without inspecting network requests
2. Reaches a "wow" moment within 30 seconds (role-tailored home + ⌘K + animated KPI)
3. Can complete a realistic end-to-end flow (run → recommendation → assign → close → report → share link) without dead ends
4. Encounters at least 4 surfaces that feel uniquely Seenly (pillar matrix, prompt sandbox, citation share donut, recommendations queue with effort/impact bubble)
