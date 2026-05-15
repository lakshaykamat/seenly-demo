# Seenly — Business Overview

Short, non-technical summary of what Seenly is and what it offers.

---

## What Seenly is

Seenly is a **visibility platform** that helps companies understand and improve how they are **found and recommended by AI** (e.g. ChatGPT, Gemini, Claude) and by **search engines** (e.g. Google).

It answers: _“When people or AI assistants look for solutions in my space, do they see and recommend us—and why or why not?”_

---

## The problem

- People increasingly ask **AI assistants** for recommendations instead of only using search.
- Many companies still focus on **traffic, rankings, and content volume** and have little insight into **AI recommendation**.
- They don’t know if AI engines cite them, for which questions, or how they compare to competitors.

Seenly was built for this shift: **measure and improve how AI recommends you**, in a clear and actionable way.

---

## What Seenly measures

Three pillars, combined into one view:

| Pillar                     | What it answers                                                               |
| -------------------------- | ----------------------------------------------------------------------------- |
| **Search (SERP)**          | Are we visible on Google (and similar) for the right queries?                 |
| **AI recommendation**      | Do ChatGPT, Gemini, and Claude actually cite or recommend us when people ask? |
| **AI understanding (AEO)** | Is our site structured so AI can understand and use our content well?         |

Every result is **traceable**: which engine, which question, which date. No black box. One analysis = one fixed result; progress is measured by new analyses over time.

---

## How it works (pipeline)

The system follows a simple sequence: it sets up **what to analyze** (dimensions), **generates prompts**, runs them against **AI models**, **analyzes the responses**, **calculates scores**, and **delivers recommendations**. No step is a black box; each run is reproducible and auditable.

---

## The dimension model

Everything revolves around a central **Entity** (a company or product). That entity is viewed through four parallel lenses—**Brand** (identity and reputation), **Domain** (web properties and citations), **Country** (geographic market), and **Competitor** (peer benchmarking). These lenses are not hierarchical; they work in parallel to give a full picture of AI visibility.

---

## Query logic

One **query** = one prompt sent to one AI model for one brand (or competitor), producing one analyzed response. The number of prompts, models, and brands you can track scales with your plan. If an AI returns a degraded or unusable response, it is **labeled as such** and never silently dropped—so you always know the quality of what was measured.

---

## Scoring

The overall **Seenly Score** is a weighted blend of four primary scores:

| Score                                    | Weight | What it reflects                                             |
| ---------------------------------------- | ------ | ------------------------------------------------------------ |
| **AI Visibility Score (AVS)**            | 40%    | How often and how well the brand appears in AI answers.      |
| **Answer Engine Optimization (AEO)**     | 30%    | How well content is structured for AI to understand and use. |
| **Geographic Engine Optimization (GEO)** | 20%    | Visibility and relevance in target markets.                  |
| **Sentiment**                            | 10%    | How AI describes the brand (tone, positioning).              |

Each of these is built from secondary indicators (e.g. mention rate, citation frequency, market coverage). The same scoring logic applies to all plans; higher tiers get more data points, not different formulas.

---

## Runs: Core vs Scenario

- **Core Runs** — Automatic, immutable baselines. They define the “current state” and do not change after the run.
- **Scenario Runs** — Manual experiments where you tweak prompts or assumptions and compare results **against the baseline** via a **delta**. This lets you test “what if?” without altering the core record.

---

## Recommendations and impact

Each recommendation is tied to **specific score indicators**, includes a **projected impact**, and can be marked as **done**. When marked as done, the system records a **snapshot** so that the **next run** can measure the **actual impact** of that change—closing the loop between recommendation and result.

---

## What customers get

- **Scores** — A single visibility score plus breakdown by search, AI, and site structure.
- **Evidence** — Clear view of where they are cited (or not), by question and by engine.
- **Recommendations** — Prioritized actions (e.g. fix structure, improve content) linked to real gaps and evidence.
- **History** — Compare results over time to see if changes are working.
- **Competitive context** — How they compare to others in AI answers (where relevant).

Seenly **does not publish content** for the customer. It tells them what to fix and how to prioritize; they (or their team) execute.

---

## Core features

- **Account & access** — Sign up, sign in (email or Google/Apple), password reset, email verification. Teams and workspaces with roles (e.g. Admin, Member).
- **Onboarding** — Guided setup (website, sector, goals, keywords) and an in-app checklist so new users get value in the first days.
- **Projects** — Create and manage one or more projects (e.g. one per brand or client). Each project has its own domain, queries, and run history.
- **Analyses (runs)** — Run an AI visibility analysis on demand or on a schedule. Each run produces fixed scores and evidence that don't change later.
- **Dashboard** — View visibility scores (search, AI, site structure), citations, competitive positioning, and run history in one place.
- **Recommendations** — Get prioritized actions (e.g. fix structure, improve content for AI) with evidence; mark items as done or ignored and track progress.
- **Competitor tracking** — See how you compare to selected competitors in AI answers (within plan limits).
- **Subscriptions & billing** — Subscribe to Starter, Growth, or Enterprise; upgrade, downgrade, or cancel; manage payment method via a billing portal.
- **Notifications** — Email and in-app alerts for new results, score changes, plan or payment issues.
- **Data & privacy** — Request account deletion or export your data; cookie consent; data held in the EU. Enterprise can use a data processing agreement.
- **API & integrations** — Use an API key to run analyses or pull data from your own systems; optional webhooks for enterprise (e.g. when a run completes).

---

## Who it’s for

- **Marketing and digital leads** — Own visibility and positioning.
- **SMEs and consultants** — Need to be found and recommended in their niche.
- **Agencies** — Manage visibility for multiple clients or brands.
- **Larger organizations** — Govern AI visibility across brands, regions, or business units.

Use cases: a single site, multiple brands, or international operations. Same idea: measure, understand, improve.

---

## Plans (high level)

| Plan           | Typical Use                                                                                         |
| -------------- | --------------------------------------------------------------------------------------------------- |
| **Starter**    | Freelancers, small businesses.<br>Understand why you’re not visible or recommended; fix the basics. |
| **Growth**     | SMEs, agencies.<br>Monitor and improve over time; more analyses and deeper insights.                |
| **Enterprise** | Large organizations.<br>Multi-brand, governance, reporting for leadership.                          |

All plans see the **same data and scores** (same scoring logic and score types). What changes by tier is:

- **Volume** — More runs, more prompts, more AI models (LLMs) as you move from Starter → Growth → Enterprise.
- **Action features** — Scenario runs, article generation, and mark-as-done tracking (with impact measurement on the next run) are available on higher tiers.
- **Enterprise features** — SSO, white-label, approval workflows, unlimited dimensions (and related limits) on Enterprise.

_Limits_ (e.g. number of analyses, projects, or tracked competitors) increase with plan. Billing is subscription-based (e.g. monthly); upgrades, downgrades, and cancellations are supported.

---

## Why Seenly

- **Recommendation, not just visibility** — Focus on “are we recommended?” not only “do we rank?”
- **Explainable** — Every score and recommendation can be traced to a source.
- **Actionable** — Recommendations are concrete and evidence-based.
- **Stable and auditable** — One analysis = one fixed result; no retroactive changes.
- **Built for decision-making** — For people who need to prioritize and report, not only monitor.

---

## One sentence

**Seenly measures how well your company is recommended by AI and search, and tells you what to change—with clear scores, evidence, and priorities.**
