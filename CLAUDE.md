# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What Seenly is

Seenly measures how well a company is **recommended by AI assistants** (ChatGPT, Gemini, Claude) and **search engines** (Google), and tells them what to fix — with scores, evidence, and prioritized actions.

It tracks three pillars: search visibility (SERP), AI recommendation (are we cited in AI answers?), and AI understanding (is our site structured for AI to use?). Users run analyses, get traceable scores per engine/question/date, compare to competitors, and follow recommendations. Plans: Starter, Growth, Enterprise.

## ⚠️ MOCK-JSON MODE — A complete product backed by JSON

**This is a complete, working product. The only thing that's mocked is the data layer.** There is no backend, no real API, no Supabase, no worker, no LLM calls — the entire data layer is JSON fixtures and an in-memory store under `lib/mocks/`. Every flow — onboarding, runs, scores, citations, recommendations, reports, alerts, integrations, billing — must work end-to-end against those fixtures with the network disabled.

This is **not** a stubbed-out preview. It is a production-feeling SaaS whose data happens to be JSON.

- No backend. No API routes. No Supabase. No worker. No LLM calls. No env vars.
- All data — reads **and** writes (create, update, delete) — is mocked inside the UI.
- The UI must look and behave 100% real: realistic data, realistic flows, realistic latency.

### Rules

1. **UI-only edits.** Touch components, pages, hooks, and mock fixtures. Do not modify (or rely on) API routes, server actions, Supabase clients, middleware, or the worker.
2. **Clean out all backend wiring from the UI.** Wherever the UI currently calls an API route, Supabase, a server action, or any external service — rip it out and replace with a mock fixture or in-memory mutation. No `fetch("/api/...")`, no `createClient()`, no `supabase.from(...)`, no `await fetch(externalUrl)`, no SDK calls (Stripe, OpenRouter, etc.) anywhere in the UI layer. If you find a component or hook still touching the network or a DB, that's a bug — clean it.
3. **No dependency on any other server or service.** The app must boot, render every page, and complete every flow with the network disabled. If a feature can't work fully offline against mocks, the mock is incomplete — fix the mock.
4. **Mock all JSON inline.** Fixtures live in `lib/mocks/`. Import them directly. Shape them to match the existing types in `types/`.
5. **Mock CRUD too.** Create/update/delete operations mutate an in-memory store (e.g. `useState`, Zustand, or a module-level array) and re-render. No network. Add a small artificial delay (200–600ms) so loading states still render.
6. **Realistic data only.** No `foo`, `test`, `lorem ipsum`, round 100s, or placeholder names. Use:
   - Real-sounding companies, domains, competitor sets, model names (`gpt-4o`, `claude-sonnet-4-6`, `gemini-2.5-pro`).
   - URLs with deep paths, plausible score distributions with natural variance, ISO-8601 timestamps spread across recent days.
   - Mixed statuses (`completed`, `running`, `failed`, `queued`, `degraded`), partial overlaps, sentiment splits that aren't always favorable.
   - 8–40 entries where a real dataset would have them — not 2–3 placeholder rows.
   - Cross-references that stay consistent (a `run_id` in one fixture exists in the runs fixture; competitor names match across files).
7. **Realistic flow over instant data.** A real product makes the user *do* things to see numbers. Critical flows must show staged progress with labels (e.g., "Crawling pages on {domain}", "Asking ChatGPT, Claude, Gemini, Perplexity"), not snap to a populated screen. Loading skeletons, empty states, error states, optimistic updates, pagination, filters, sorting, role guards — all driven by mock state. Successful mutations show toasts; failed ones (occasionally, for realism) surface errors.
8. **First-run gate: no populated dashboard until the user enters a URL.** A first-time visitor must land on a URL-entry surface, submit a domain, watch a multi-stage processing flow (~10–14s with labeled stages), and only then reach a populated `/dashboard`. The mock JSON populates the workspace *after* the flow completes — never on bare page load. After onboarding, the user's domain appears in headers, project list, and wherever the UI references "your site". A "Try a sample" escape hatch may skip the URL prompt and run the same flow against a baked-in domain.
9. **Auth is mocked.** Return a fixed user (admin role, Growth plan, single org) synchronously — no listeners, no `/api/me` fetch. Login/signup fakes a short delay then routes into the onboarding flow (or `/dashboard` if onboarding is already complete in this session).
10. **Drill-downs are mandatory.** Every KPI, chart, and matrix cell that names a thing must navigate to a detail surface for that thing. No dead-end numbers — if a number is on screen, the user can click through to the evidence.
11. **Runs with `pnpm dev` and zero configuration.**
12. **Never reveal the data is mocked in the UI.** Forbidden words in user-visible copy (banners, badges, tooltips, toasts, empty states, page titles, meta tags, console logs, alt text):

    > `demo`, `mock`, `fake`, `sample`, `preview`, `coming soon`, `placeholder`

    No `// TODO`-flavored microcopy. No fake-looking emails like `user@example.com` in the header. The product must read as a fully shipped, production SaaS. The words above may exist only inside code comments, file names, and this file.

## Code Style

Write simple, readable code. Prioritize clarity over cleverness.

- Self-explanatory names. Single-responsibility functions.
- Don't over-engineer or build for hypothetical future requirements.
- Keep business logic lean. Extract utilities only when an operation is actually reused.
- Centralize types in `types/` — never scatter them across feature folders.
- Use language-native conventions (TS/React idioms; no custom patterns where built-ins exist).
- Create abstractions only when a concrete duplication forces it. Avoid circular dependencies.
- Handle errors idiomatically and log meaningfully.
- Let code be self-documenting. If a line needs a comment explaining _what_ it does, rewrite it instead.

## Auth & onboarding routing

There is no auth layer. `AuthProvider` returns a fixed user synchronously — no listeners, no `/api/me` fetch. There is no "Log out" affordance in the UI.

Routing for first-run vs. returning user (within the in-memory session):

- `/` → if `store.hasOnboarded === false`, render the URL-entry landing surface. If `true`, redirect to `/dashboard`.
- `/onboarding` → always renders the URL-entry surface (so the flow is re-enterable on demand).
- `/dashboard`, `/visibility/*`, `/competitors`, `/recommendations`, `/prompts`, `/reports`, `/alerts`, `/runs`, `/members`, `/settings/*` → if `store.hasOnboarded === false`, redirect to `/onboarding`. Otherwise render normally.
- `/login`, `/signup`, `/forgot-password`, `/reset-password` → fake a short delay then route into the same gate (`/onboarding` if not onboarded, otherwise `/dashboard`).

`hasOnboarded` is set to `true` only when the URL-entry processing flow finishes successfully (or the user takes the "Try a sample" escape hatch). It resets when the in-memory store resets (page hard reload that drops the JS module).

## Stack (UI only)

- Next.js 16 (App Router), React 19, TypeScript (strict)
- shadcn/ui on `@base-ui/react` primitives (NOT Radix), Tailwind CSS 4, Lucide icons
- TanStack React Query (use it against mock fixtures with artificial delay)
- pnpm 10

## Commands

```bash
pnpm dev          # Dev server
pnpm lint         # ESLint
pnpm type-check   # TypeScript check
pnpm check        # lint + format:check + type-check
```

## Import alias

`@/*` maps to repo root. Use `@/lib/...`, `@/components/...`, `@/constants/...`, `@/types/...`, `@/lib/mocks/...`.

## shadcn / base-ui gotcha

Components use `@base-ui/react`, not Radix. `DropdownMenuLabel` must be inside `DropdownMenuGroup`. Some prop APIs differ from Radix examples online.
