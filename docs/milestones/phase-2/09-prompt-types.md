# Step 9: Prompt Types

> **When:** After the core pipeline is working (steps 0–8)
>
> **Goal:** Make sure the questions we ask AI engines cover all four ways a real person would search for something — not just the obvious ones.

---

## Why this matters

Right now the worker generates "best X for Y" and "how to choose X" style questions. Those are fine, but they miss a big chunk of how people actually use AI. Someone who already knows the space asks different questions than someone just starting to look. If we only generate one type, we're measuring the wrong thing for half the audience.

Four types gives a much more accurate picture of how visible a brand actually is.

---

## The four types

| Type | What kind of person is asking | Example |
|------|------------------------------|---------|
| **Discovery** | Just starting to explore — doesn't know what they need yet | "best tools for managing oncology clinical trials" |
| **Comparison** | Knows what they want, picking between options | "Servier vs Roche vs Novartis for oncology research" |
| **Alternatives** | Already using something, looking to switch | "alternatives to Roche for rare disease drugs" |
| **Educational** | Trying to understand a topic, not ready to buy | "how do pharma companies use AI in drug discovery" |

Discovery and educational questions are where brands get recommended to people who weren't looking for them specifically. That's the whole point of AI visibility — showing up before someone knows to look for you.

---

## What changes

**In `understand.py`:** The `generate_queries()` function currently maps to three template types. Update it to generate all four, spread across the question budget:

| Plan | Budget | Split |
|------|--------|-------|
| Starter (7 questions) | 2 discovery, 1 comparison, 1 alternatives, 2 educational, 1 user-added |
| Growth (15 questions) | 4 discovery, 3 comparison, 3 alternatives, 4 educational, 1 reserve |
| Enterprise (35 questions) | 8 discovery, 7 comparison, 7 alternatives, 8 educational, 5 user-added |

Don't pad with weak questions just to hit the number. If the LLM can only come up with 3 good educational questions for a given business, use 3 and fill the gap with discovery.

**New `query_type` column:**

```sql
ALTER TABLE ai_results ADD COLUMN query_type text;
-- values: 'discovery', 'comparison', 'alternatives', 'educational', 'user_added'
```

Also snapshot the type in `runs.config.queries_used`:
```json
{ "query": "best oncology pharma in France", "source": "seenly_suggested", "type": "discovery" }
```

This lets the dashboard show which type each question was, and lets us eventually break down scores by question type.

---

## Done when

- [x] `ai_results.query_type` column added (migration 009)
- [x] `runs.config` snapshots `query_type` per question
- [x] `understand.py` generates all four types with plan-based distribution
- [x] Weak questions are dropped rather than padded to hit the count
