"""
Business understanding step — extract profile and generate queries via LLM.

Flow:
  1. Collect best crawled page text
  2. LLM call 1 → extract business profile (summary + offer clusters)
  3. LLM call 2 → generate search queries from profile
  4. Fall back gracefully at each stage if LLM fails
"""

import json
import logging
import re

import openai

from config import OPENROUTER_API_KEY, PLAN_LIMITS, UNDERSTAND, openrouter_client
from db import flag_crawl_fallback, update_run_config
from pipeline.helpers import resolve_project_context

logger = logging.getLogger("understand")

_QUERY_TYPES = frozenset({"discovery", "comparison", "alternatives", "educational"})

# Type distribution by query budget
_TYPE_TARGETS: dict[int, dict[str, int]] = {
    8:  {"discovery": 3, "comparison": 2, "alternatives": 2, "educational": 1},
    15: {"discovery": 5, "comparison": 4, "alternatives": 3, "educational": 3},
    25: {"discovery": 8, "comparison": 6, "alternatives": 6, "educational": 5},
}


# ── Public API ──────────────────────────────────────────────


def extract_business_profile(run: dict, crawl_results: list[dict]) -> dict:
    """
    Analyze crawled content, extract business profile, generate queries.

    Returns:
        {
            "summary": str,
            "clusters": [{"name", "keywords", "target_buyers", "differentiator", "confidence"}],
            "queries": [{"text", "type", "source", "weight"}],
            "mode": "full" | "project_settings" | "minimal",
        }
    """
    run_id = run["id"]
    config = run.get("config") or {}
    plan = config.get("plan_at_run_time", "starter")
    limits = PLAN_LIMITS[plan]

    domain, geo, sector, project = resolve_project_context(run)

    page_texts = _collect_page_text(crawl_results)
    crawl_ok = bool(page_texts)

    if crawl_results and not crawl_ok:
        logger.warning("[%s] Crawl yielded no usable text — falling back to project settings", run_id)

    profile = None

    # Tier 1: extract from crawled page content
    if crawl_ok and OPENROUTER_API_KEY:
        logger.info("[%s] Extracting profile from crawl  pages=%d", run_id, len(page_texts))
        profile = _extract_profile_from_content(page_texts, domain, geo, sector, run_id)

    # Tier 2: extract from project settings when crawl fails
    if not profile and _has_project_context(project) and OPENROUTER_API_KEY:
        logger.info("[%s] Extracting profile from project settings", run_id)
        profile = _extract_profile_from_project(project, run_id)
        if profile:
            flag_crawl_fallback(run_id)

    # Tier 3: minimal LLM profile from domain name alone
    if not profile and OPENROUTER_API_KEY:
        logger.info("[%s] Extracting minimal profile from domain: %s", run_id, domain)
        profile = _extract_profile_from_domain(domain, sector, run_id)

    if not profile:
        raise RuntimeError(f"[{run_id}] All LLM profile extraction tiers failed — cannot continue")

    # Generate queries via LLM from the profile
    queries = _generate_queries(profile, geo, limits, run_id)
    profile["queries"] = queries

    updated_config = {**config, "queries_used": queries}
    update_run_config(run_id, updated_config)
    run["config"] = updated_config

    logger.info(
        "[%s] Profile: mode=%s clusters=%d queries=%d",
        run_id, profile["mode"], len(profile.get("clusters", [])), len(queries),
    )

    return profile


# ── LLM helpers ─────────────────────────────────────────────


def _call_llm(prompt: str, run_id: str, max_tokens: int | None = None) -> dict | list | None:
    """
    Call the LLM and parse JSON response. Retries once on failure.
    Returns parsed JSON (dict or list) or None.
    """
    for attempt in range(2):
        try:
            response = openrouter_client.chat.completions.create(
                model=UNDERSTAND["model"],
                messages=[{"role": "user", "content": prompt}],
                temperature=UNDERSTAND["temperature"],
                max_tokens=max_tokens or UNDERSTAND["max_tokens"],
            )
            text = response.choices[0].message.content or ""
            text = re.sub(r"^```(?:json)?\s*", "", text.strip())
            text = re.sub(r"\s*```$", "", text.strip())
            return json.loads(text)

        except (json.JSONDecodeError, openai.APIError, KeyError) as e:
            logger.warning("[%s] LLM call failed (attempt %d): %s", run_id, attempt + 1, e)
            if attempt == 0:
                prompt += "\n\nReturn ONLY raw JSON. No markdown, no explanation."

    return None


# ── Profile extraction ───────────────────────────────────────


def _extract_profile_from_content(
    page_texts: list[str],
    domain: str,
    geo: str | None,
    sector: str | None,
    run_id: str,
) -> dict | None:
    """Extract business profile from crawled page content."""
    combined = "\n\n---\n\n".join(page_texts)
    if len(combined) > UNDERSTAND["max_content_chars"]:
        combined = _truncate_at_sentence(combined, UNDERSTAND["max_content_chars"])

    context = f"Domain: {domain}"
    if sector:
        context += f"\nBusiness sector: {sector}"
    if geo:
        context += f"\nTarget market: {geo}"

    prompt = f"""Analyze this website content and extract a detailed business profile.

{context}

Website content:
{combined}

Return a JSON object:
{{
  "summary": "2-3 sentences: what they do, who they serve, their main differentiator",
  "clusters": [
    {{
      "name": "Specific offering name (e.g. 'AI-Powered Workflow Automation', not just 'Software')",
      "keywords": ["specific-search-term-1", "specific-search-term-2", "specific-search-term-3"],
      "target_buyers": "Specific persona (e.g. 'CTOs at mid-size logistics companies')",
      "differentiator": "One sentence on what makes this unique vs competitors",
      "confidence": 0.85
    }}
  ]
}}

Rules:
- 3 to 6 clusters, ordered by confidence descending
- Keywords must be real search terms buyers type — not generic words like "software", "tool", "platform"
- target_buyers must be specific — include role, industry, or company size
- confidence 0.0–1.0
- Return ONLY valid JSON"""

    data = _call_llm(prompt, run_id)
    if not isinstance(data, dict):
        return None
    if "summary" not in data or not data.get("clusters"):
        return None

    data["mode"] = "full"
    data["clusters"] = _filter_clusters(data["clusters"])
    return data if data["clusters"] else None


def _extract_profile_from_project(project: dict, run_id: str) -> dict | None:
    """Extract business profile from project settings fields."""
    brief = "\n".join(filter(None, [
        f"Domain: {project.get('domain', '')}",
        f"Business name: {project.get('name', '')}",
        f"Category: {project['sector']}" if project.get("sector") else None,
        f"Target market: {project['geo']}" if project.get("geo") else None,
    ]))

    prompt = f"""Extract a business profile from this brief.

{brief}

Return a JSON object:
{{
  "summary": "2-3 sentences: what they do, who they serve, their differentiator",
  "clusters": [
    {{
      "name": "Specific offering name",
      "keywords": ["search-term-1", "search-term-2", "search-term-3"],
      "target_buyers": "Specific buyer persona",
      "differentiator": "What makes this unique",
      "confidence": 0.7
    }}
  ]
}}

Rules:
- 2 to 4 clusters
- Keywords must be real search terms, not generic
- Return ONLY valid JSON"""

    data = _call_llm(prompt, run_id)
    if not isinstance(data, dict) or not data.get("clusters"):
        return None

    data["mode"] = "project_settings"
    data["clusters"] = _filter_clusters(data["clusters"])
    return data if data["clusters"] else None


def _extract_profile_from_domain(domain: str, sector: str | None, run_id: str) -> dict | None:
    """Ask the LLM to infer a business profile just from the domain name."""
    context = f"Domain: {domain}"
    if sector:
        context += f"\nSector: {sector}"

    prompt = f"""Infer a likely business profile from this domain name.

{context}

Return a JSON object:
{{
  "summary": "What this business likely does based on the domain name",
  "clusters": [
    {{
      "name": "Most likely offering",
      "keywords": ["inferred-keyword-1", "inferred-keyword-2", "inferred-keyword-3"],
      "target_buyers": "Most likely buyer",
      "differentiator": "Generic differentiator for this type of business",
      "confidence": 0.3
    }}
  ]
}}

Return ONLY valid JSON."""

    data = _call_llm(prompt, run_id)
    if not isinstance(data, dict) or not data.get("clusters"):
        return None

    data["mode"] = "minimal"
    return data


# ── Query generation ─────────────────────────────────────────


def _generate_queries(profile: dict, geo: str | None, limits: dict, run_id: str) -> list[dict]:
    """Generate search queries via LLM from the business profile."""
    is_brand_only = profile.get("mode") == "minimal"
    max_suggested = limits["suggested_queries"]
    weight = UNDERSTAND["query_weight_brand_only"] if is_brand_only else UNDERSTAND["query_weight_normal"]

    queries = _llm_generate_queries(profile, geo, max_suggested, run_id)

    if not queries:
        # Hard fallback — ask LLM with a simpler prompt using just the summary
        logger.warning("[%s] Query LLM failed — retrying with summary only", run_id)
        queries = _llm_generate_queries_simple(profile.get("summary", ""), geo, max_suggested, run_id)

    for q in queries:
        q["weight"] = weight

    return queries[:max_suggested]


def _llm_generate_queries(profile: dict, geo: str | None, count: int, run_id: str) -> list[dict]:
    """Full query generation — uses complete profile with clusters and differentiators."""
    summary = profile.get("summary", "")
    clusters = profile.get("clusters", [])

    cluster_lines = []
    for c in clusters[:5]:
        line = f"- {c['name']}"
        if c.get("keywords"):
            line += f" | keywords: {', '.join(c['keywords'][:4])}"
        if c.get("target_buyers"):
            line += f" | buyers: {c['target_buyers']}"
        if c.get("differentiator"):
            line += f" | differentiator: {c['differentiator']}"
        cluster_lines.append(line)

    geo_note = f"\nTarget market: {geo}" if geo else ""

    targets = _TYPE_TARGETS.get(count) or {
        "discovery": max(1, round(count * 0.35)),
        "comparison": max(1, round(count * 0.25)),
        "alternatives": max(1, round(count * 0.25)),
        "educational": max(1, round(count * 0.15)),
    }

    prompt = f"""Generate search queries for an AI visibility analysis.

Business:
{summary}{geo_note}

Offerings:
{chr(10).join(cluster_lines)}

Generate exactly {count} search queries a real buyer would type into an AI assistant or search engine.

Return a JSON array of exactly {count} objects:
[{{"text": "search query here", "type": "discovery"}}, ...]

Type distribution:
- discovery ({targets["discovery"]}): finding solutions — "best X for Y", "top X tools", "leading X platforms"
- comparison ({targets["comparison"]}): comparing options — "X vs Y", "compare X tools", "which X is best"
- alternatives ({targets["alternatives"]}): looking for options — "alternatives to X", "X competitors", "similar to X"
- educational ({targets["educational"]}): learning — "how to choose X", "what is X", "benefits of X"

Rules:
- Natural language exactly as a human types it
- Use specific industry terms from the profile — no generic words like "software" or "tool" alone
- Every query must be unique and cover a different angle
- Do NOT use specific brand or company names
- Return ONLY the JSON array"""

    data = _call_llm(prompt, run_id, max_tokens=UNDERSTAND["max_tokens"])
    return _parse_query_list(data)


def _llm_generate_queries_simple(summary: str, geo: str | None, count: int, run_id: str) -> list[dict]:
    """Simplified query generation using only the business summary."""
    geo_note = f" in {geo}" if geo else ""

    prompt = f"""Generate {count} search queries for this business{geo_note}:

{summary}

Return a JSON array of {count} objects:
[{{"text": "search query", "type": "discovery"}}, ...]

Types: discovery, comparison, alternatives, educational
Return ONLY the JSON array."""

    data = _call_llm(prompt, run_id, max_tokens=1000)
    return _parse_query_list(data)


def _parse_query_list(data) -> list[dict]:
    """Parse and validate a list of query objects from LLM output."""
    if not isinstance(data, list):
        return []

    queries = []
    seen: set[str] = set()
    for item in data:
        if not isinstance(item, dict):
            continue
        text = (item.get("text") or "").strip()
        qtype = item.get("type", "discovery")
        if text and text not in seen and qtype in _QUERY_TYPES:
            seen.add(text)
            queries.append({"text": text, "type": qtype, "source": "seenly_suggested"})

    return queries


# ── Helpers ──────────────────────────────────────────────────


def _has_project_context(project: dict | None) -> bool:
    return bool(project and project.get("name"))


def _filter_clusters(clusters: list[dict]) -> list[dict]:
    """Drop clusters below minimum confidence, keep at least 1."""
    min_conf = UNDERSTAND.get("min_cluster_confidence", 0.4)
    filtered = [c for c in clusters if c.get("confidence", 0) >= min_conf]
    return filtered if filtered else clusters[:1]


def _truncate_at_sentence(text: str, limit: int) -> str:
    """Truncate at the last sentence boundary before limit."""
    truncated = text[:limit]
    last_period = truncated.rfind(".")
    if last_period > limit * 0.8:
        return truncated[:last_period + 1]
    return truncated


def _collect_page_text(crawl_results: list[dict]) -> list[str]:
    """Get text from crawled pages, sorted by confidence (highest first)."""
    ok_pages = [
        p for p in crawl_results
        if p.get("crawl_status") in ("ok", "partial")
        and (p.get("_extracted_text") or p.get("raw_html"))
    ]
    ok_pages.sort(key=lambda p: p.get("confidence", 0), reverse=True)

    texts: list[str] = []
    for page in ok_pages:
        parts: list[str] = []
        if page.get("h1"):
            parts.append(f"Page: {page['h1']}")
        if page.get("h2s"):
            parts.append("Sections: " + ", ".join(page["h2s"]))

        body_text = page.get("_extracted_text", "")
        if not body_text and page.get("raw_html"):
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(page["raw_html"], "lxml")
            for tag in soup.find_all(["script", "style", "noscript"]):
                tag.decompose()
            body_text = soup.get_text(separator=" ", strip=True)

        if body_text:
            parts.append(body_text[:UNDERSTAND["max_page_chars"]])
        if parts:
            texts.append("\n".join(parts))

    return texts
