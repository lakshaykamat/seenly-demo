# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ DEMO MODE — UI ONLY

**This is a demo project. Edit the UI only. Ignore everything else.**

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
   - 8–40 entries where a real dataset would have them — not 2–3 demo rows.
   - Cross-references that stay consistent (a `run_id` in one fixture exists in the runs fixture; competitor names match across files).
7. **Realistic flow.** Loading skeletons, empty states, error states, optimistic updates, pagination, filters, sorting, role guards — all driven by mock state. Successful mutations should show toasts; failed ones (occasionally, for realism) should surface errors.
8. **Auth is mocked.** Return a fixed demo user (admin role, Growth plan, demo org). Login/signup fakes a short delay then routes to the dashboard.
9. **Runs with `pnpm dev` and zero configuration.**
10. **Never reveal it's a demo in the UI.** No "demo", "mock", "fake", "sample", "preview", "coming soon", or "placeholder" copy anywhere a user can see — not in banners, badges, tooltips, toasts, empty states, page titles, meta tags, console logs, or alt text. No `// TODO`-flavored microcopy. No `demo@example.com` shown in the header. The product must read as a fully shipped, production SaaS. Treat the word "demo" as forbidden in user-facing strings — keep it only in code comments, file names, and this file.

## Code Style

Write simple, readable code. Prioritize clarity over cleverness.

- Self-explanatory names. Single-responsibility functions.
- Don't over-engineer or build for hypothetical future requirements.
- Keep business logic lean. Extract utilities only when an operation is actually reused.
- Centralize types in `types/` — never scatter them across feature folders.
- Use language-native conventions (TS/React idioms; no custom patterns where built-ins exist).
- Create abstractions only when a concrete duplication forces it. Avoid circular dependencies.
- Handle errors idiomatically and log meaningfully.
- Let code be self-documenting. If a line needs a comment explaining *what* it does, rewrite it instead.

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
