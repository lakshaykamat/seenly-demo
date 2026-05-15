# Step 2: Projects, Dimensions & Onboarding

> **When:** Week 2
>
> **Goal:** Full project management — creation, editing, context fields for scoped analysis, and a guided setup for new users.

---

## Projects

Projects are the containers for everything in Seenly. Each project is a domain being tracked. Right now projects only have domain, name, sector, and geo. This step builds them out properly.

**What gets added:**

Full CRUD — create, read, update. No domain changes after creation (it would invalidate all historical runs). Name, sector, and geo can all be updated.

Plan limits on how many projects an org can have:

| Plan | Projects |
|------|---------|
| Starter | 1 |
| Growth | 5 |
| Enterprise | Unlimited |

---

## Dimension fields

Projects need more context than just a domain and sector. A pharma company tracking their oncology brand in France needs to tell Seenly: this is about oncology, in France, in French. That context flows into question generation, scoring, and recommendations.

Add these optional fields to the `projects` table:

```sql
ALTER TABLE projects ADD COLUMN entity       text;   -- parent company
ALTER TABLE projects ADD COLUMN brand        text;   -- brand being analyzed
ALTER TABLE projects ADD COLUMN product      text;   -- specific product or solution
ALTER TABLE projects ADD COLUMN activity     text;   -- business area (e.g. Oncology)
ALTER TABLE projects ADD COLUMN country      text;   -- target country
ALTER TABLE projects ADD COLUMN region       text;   -- broader region
ALTER TABLE projects ADD COLUMN market       text;   -- customer type (Enterprise, SMB)
ALTER TABLE projects ADD COLUMN language     text DEFAULT 'en';
ALTER TABLE projects ADD COLUMN department   text;
ALTER TABLE projects ADD COLUMN cost_center  text;
ALTER TABLE projects ADD COLUMN anchor_domain text;  -- what to look for in AI responses
ALTER TABLE projects ADD COLUMN aliases      text[]; -- other names AI engines might use
```

`anchor_domain` defaults to `domain`. `aliases` solve the problem where an AI says "HubSpot" instead of "hubspot.com" — without them we miss the citation.

All fields are optional. Small teams won't fill in department or cost center, and that's fine. Enterprise clients with multiple brands across multiple markets will use all of them.

**Worker impact:** `understand.py` reads `activity`, `country`, and `language` when generating questions. `ai_query.py` uses `anchor_domain` and `aliases` when detecting the brand in AI responses.

---

## Onboarding wizard

First-time users need a guided setup — a blank "create project" form isn't enough. The wizard walks them through:

1. **Add your domain** — URL input, auto-validates it's reachable
2. **Tell us about your business** — name, activity, what you sell
3. **Set your market** — country, language, customer type
4. **Your first run** — confirm and kick off the analysis

Keep it short. 4 steps, each with one primary input. Don't ask for everything at once.

After the wizard, show a checklist: "Your first run is processing — here's what to look at when it's done." Link to the evidence tab, the recommendations section, and the competitors list.

---

## API changes

- `POST /api/projects` — accepts all dimension fields, enforces plan project limit
- `PATCH /api/projects/[id]` — updates name, dimensions; blocks domain changes
- `GET /api/projects` — lists projects with latest run scores

---

## Done when

- [ ] `projects` table has all dimension columns (migration, all nullable)
- [ ] `language` defaults to `"en"`, `anchor_domain` defaults to `domain`
- [ ] Plan limits enforced on project creation
- [ ] Domain changes blocked on PATCH
- [ ] Project form has optional context section with dimension fields
- [ ] Onboarding wizard (4 steps) for first-time users
- [ ] Post-wizard checklist with links to key sections
- [ ] Worker uses `activity`, `country`, `language` for question generation
- [ ] Worker uses `aliases` for entity detection in AI responses
