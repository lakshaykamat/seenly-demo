"""
AI engine querying step — send queries to LLMs, parse responses.

Flow:
  1. For each query × engine, call the provider API
  2. Parse top 3 domain mentions from each response
  3. Classify sentiment for target domain mentions
  4. Mark degraded responses (empty, refusals, rate limits)
  5. Store raw responses and write ai_results rows
  6. Track token usage for cost accounting
"""

import logging
import re
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

from config import (
    MAX_CONCURRENT_API_CALLS,
    PLAN_LIMITS,
    QUERY,
    openrouter_client,
)
from db import insert_ai_results, update_run_config
from pipeline.helpers import NOISE_DOMAINS, domains_match, get_target_domain

logger = logging.getLogger("ai_query")

# ── Domain extraction ──────────────────────────────────────

_DOMAIN_RE = re.compile(
    r"\b((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+"
    r"(?:com|org|net|io|co|ai|dev|app|xyz|me|info|biz|tech|cloud|"
    r"software|tools|solutions|agency|design|digital|marketing|"
    r"shop|store|edu|gov|so|to|cc|ly))\b",
    re.IGNORECASE,
)


# ── Sentiment keyword sets ─────────────────────────────────

_FAVORABLE_WORDS = frozenset(
    {
        "recommend", "best", "excellent", "leading", "top",
        "outstanding", "standout", "impressive", "strong", "popular",
        "trusted", "reliable", "premier", "ideal", "preferred",
        "highly", "great",
    }
)

_CAUTIOUS_WORDS = frozenset(
    {
        "however", "caveat", "limitation", "downside", "drawback",
        "although", "expensive", "pricey", "steep", "complex",
        "consider", "careful", "basic", "limited",
    }
)

_UNFAVORABLE_WORDS = frozenset(
    {
        "avoid", "poor", "worst", "disappointing", "unreliable",
        "outdated", "lacks", "inferior", "problematic", "frustrating",
        "terrible", "bad",
    }
)



# ── Public API ──────────────────────────────────────────────


def query_ai_engines_followup(
    run: dict,
    profile: dict,
    round1_results: list[dict],
) -> list[dict]:
    """
    Generate follow-up queries based on competitors found in round 1.

    For each top competitor domain found, asks:
    - "{target} vs {competitor}" to check if target appears in comparison
    - "why choose {target} over {competitor}"

    Capped at 4 follow-up queries to avoid excessive API usage.
    Only runs on growth/enterprise plans (starter gets 5 queries total).
    """
    run_id = run["id"]
    config = run.get("config") or {}
    plan = config.get("plan_at_run_time", "starter")

    if plan == "starter":
        return []

    limits = PLAN_LIMITS[plan]
    target_domain = get_target_domain(run)
    engines = _select_engines(limits["engines"])

    # Find top competitor domains from round 1
    competitor_counts: dict[str, int] = {}
    for r in round1_results:
        if r.get("is_degraded") or r.get("is_target"):
            continue
        cited = r.get("cited_domain")
        if cited:
            competitor_counts[cited] = competitor_counts.get(cited, 0) + 1

    top_competitors = sorted(competitor_counts, key=competitor_counts.get, reverse=True)[:2]
    if not top_competitors:
        return []

    # Use the brand domain as the subject — it's what AI engines will recognise
    brand = target_domain.split(".")[0]
    followup_queries = []
    for comp in top_competitors:
        comp_brand = comp.split(".")[0]
        followup_queries.append(f"{brand} vs {comp_brand}")
        followup_queries.append(f"why choose {brand} over {comp_brand}")

    followup_queries = followup_queries[:4]
    logger.info("[%s] Follow-up queries  competitors=%s queries=%d", run_id, top_competitors, len(followup_queries))

    tasks = [
        (q, "seenly_suggested", "comparison", engine)
        for q in followup_queries
        for engine in engines
    ]

    all_rows: list[dict] = []
    with ThreadPoolExecutor(max_workers=MAX_CONCURRENT_API_CALLS, thread_name_prefix="api") as executor:
        future_to_task = {
            executor.submit(
                _query_single,
                run_id=run_id,
                query_text=query_text,
                query_source=query_source,
                query_type=query_type,
                engine=engine,
                target_domain=target_domain,
            ): (query_text, engine)
            for query_text, query_source, query_type, engine in tasks
        }
        for future in as_completed(future_to_task):
            try:
                rows, _, _ = future.result()
                all_rows.extend(rows)
            except Exception as e:
                query_text, engine = future_to_task[future]
                logger.error("[%s] Follow-up error  engine=%s query='%s' error=%s", run_id, engine, query_text[:60], e)

    if all_rows:
        insert_ai_results(all_rows)

    return all_rows


def query_ai_engines(run: dict, profile: dict) -> list[dict]:
    """
    Send generated queries to multiple AI engines and parse responses.

    Returns list of ai_result row dicts (already inserted).
    """
    run_id = run["id"]
    config = run.get("config") or {}
    plan = config.get("plan_at_run_time", "starter")
    limits = PLAN_LIMITS[plan]

    target_domain = get_target_domain(run)
    queries = profile.get("queries", [])
    engines = _select_engines(limits["engines"])

    if not queries:
        logger.warning("[%s] No queries to send — skipping AI querying", run_id)
        return []

    if not engines:
        logger.warning("[%s] No AI engines available — check OPENROUTER_API_KEY", run_id)
        return []

    logger.info("[%s] Querying  engines=%s queries=%d tasks=%d", run_id, engines, len(queries), len(queries) * len(engines))

    # Build all (query, engine) tasks upfront
    tasks = [
        (q["text"], q.get("source", "seenly_suggested"), q.get("type", "discovery"), engine)
        for q in queries
        for engine in engines
    ]

    all_rows: list[dict] = []
    usage = {"ai_calls": 0, "tokens_in": 0, "tokens_out": 0}

    # Run all query×engine calls in parallel, capped by MAX_CONCURRENT_API_CALLS.
    # _query_single is thread-safe: it reads only immutable args and returns values.
    with ThreadPoolExecutor(
        max_workers=MAX_CONCURRENT_API_CALLS,
        thread_name_prefix="api",
    ) as executor:
        future_to_task = {
            executor.submit(
                _query_single,
                run_id=run_id,
                query_text=query_text,
                query_source=query_source,
                query_type=query_type,
                engine=engine,
                target_domain=target_domain,
            ): (query_text, engine)
            for query_text, query_source, query_type, engine in tasks
        }

        for future in as_completed(future_to_task):
            query_text, engine = future_to_task[future]
            try:
                rows, tok_in, tok_out = future.result()
                all_rows.extend(rows)
                usage["ai_calls"] += 1
                usage["tokens_in"] += tok_in
                usage["tokens_out"] += tok_out
            except Exception as e:
                logger.error(
                    "[%s] Unhandled error  engine=%s query='%s' error=%s",
                    run_id, engine, query_text[:60], e,
                )
                usage["ai_calls"] += 1

    # Bulk insert
    if all_rows:
        insert_ai_results(all_rows)

    # Write usage to run config (also update in-memory for downstream steps)
    updated_config = {**config, "ai_usage": usage}
    update_run_config(run_id, updated_config)
    run["config"] = updated_config

    target_hits = sum(1 for r in all_rows if r.get("is_target") and not r.get("is_degraded"))
    degraded = sum(1 for r in all_rows if r.get("is_degraded"))
    logger.info(
        "[%s] AI querying done  rows=%d target_hits=%d degraded=%d calls=%d tokens_in=%d tokens_out=%d",
        run_id, len(all_rows), target_hits, degraded,
        usage["ai_calls"], usage["tokens_in"], usage["tokens_out"],
    )

    return all_rows


# ── Engine selection ────────────────────────────────────────


def _select_engines(max_engines: int) -> list[str]:
    """Pick engines based on plan limit. All available via OpenRouter."""
    all_engines = ["openai", "anthropic", "google"]
    return all_engines[:max_engines]


# ── Single query × engine ──────────────────────────────────


def _query_single(
    run_id: str,
    query_text: str,
    query_source: str,
    query_type: str,
    engine: str,
    target_domain: str,
) -> tuple[list[dict], int, int]:
    """
    Call one engine for one query.

    Returns (rows, tokens_in, tokens_out). Thread-safe — no shared mutable state.
    """
    prompt = _build_prompt(query_text)
    response_text, tokens_in, tokens_out, error = _call_engine(engine, prompt)

    raw_response = {
        "engine": engine,
        "query": query_text,
        "response": response_text,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
    }
    if error:
        raw_response["error"] = error

    base = {
        "run_id": run_id,
        "query": query_text,
        "query_source": query_source,
        "query_type": query_type,
        "engine": engine,
        "raw_response": raw_response,
    }

    def degraded(reason: str, snippet: str | None = None) -> list[dict]:
        logger.warning(
            "[%s] Degraded  engine=%s reason=%s query='%s'",
            run_id, engine, reason, query_text[:60],
        )
        row = {
            **base,
            "position": None,
            "cited_domain": None,
            "snippet": snippet,
            "sentiment": None,
            "is_target": False,
            "is_degraded": True,
            "degraded_reason": reason,
        }
        return [row]

    if error:
        reason = _categorise_error(error)
        return degraded(reason), tokens_in, tokens_out

    if not response_text:
        return degraded("empty_response"), tokens_in, tokens_out

    mentions = _extract_mentions(response_text)
    if not mentions:
        return degraded("no_mentions", snippet=response_text[:500]), tokens_in, tokens_out

    # Collect target snippets for batch sentiment classification
    top_mentions = mentions[:QUERY["max_mentions"]]
    target_snippets = {
        m["domain"]: m["snippet"]
        for m in top_mentions
        if domains_match(m["domain"], target_domain)
    }
    sentiments = _classify_sentiments_batch(target_snippets)

    rows: list[dict] = []
    for m in top_mentions:
        is_target = domains_match(m["domain"], target_domain)
        rows.append({
            **base,
            "position": m["position"],
            "cited_domain": m["domain"],
            "snippet": m["snippet"],
            "sentiment": sentiments.get(m["domain"]) if is_target else None,
            "is_target": is_target,
            "is_degraded": False,
        })

    return rows, tokens_in, tokens_out


# ── Prompt ──────────────────────────────────────────────────


_SYSTEM_PROMPT = (
    "You are a helpful research assistant. When listing products, tools, or companies, "
    "always include the website domain (e.g. example.com) for each one."
)


def _build_prompt(query: str) -> str:
    """Build the query prompt sent to each AI engine."""
    return (
        f"A user is researching: {query}\n\n"
        "List the top 6-8 tools, products, or companies that best answer this.\n\n"
        "Format each as:\n"
        "1. Company Name (domain.com) — one sentence on why it fits, one sentence on a key strength or limitation.\n\n"
        "Always include the domain name in parentheses. Be specific."
    )


# ── Engine API calls ────────────────────────────────────────


# Model and max_tokens lookup per engine
_ENGINE_CONFIG = {
    "openai": {"model": QUERY["openai_model"], "max_tokens": QUERY["openai_max_tokens"]},
    "anthropic": {"model": QUERY["anthropic_model"], "max_tokens": QUERY["anthropic_max_tokens"]},
    "google": {"model": QUERY["google_model"], "max_tokens": QUERY["google_max_tokens"]},
}


def _call_engine(
    engine: str, prompt: str
) -> tuple[str | None, int, int, str | None]:
    """
    Call an AI engine via OpenRouter with retry + exponential backoff on 429s.

    Returns (response_text, tokens_in, tokens_out, error).
    """
    ec = _ENGINE_CONFIG.get(engine)
    if not ec:
        return None, 0, 0, f"Unknown engine: {engine}"

    for attempt in range(QUERY["max_retries"]):
        try:
            response = openrouter_client.chat.completions.create(
                model=ec["model"],
                messages=[
                    {"role": "system", "content": _SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=QUERY["openai_temperature"],
                max_tokens=ec["max_tokens"],
            )
            text = response.choices[0].message.content or ""
            tok_in = response.usage.prompt_tokens if response.usage else 0
            tok_out = response.usage.completion_tokens if response.usage else 0
            return text, tok_in, tok_out, None

        except Exception as e:
            error_str = str(e)
            is_rate_limit = "429" in error_str or "rate" in error_str.lower()

            if is_rate_limit and attempt < QUERY["max_retries"] - 1:
                wait = QUERY["backoff_base"] ** (attempt + 1)
                logger.warning(
                    "Rate limited  engine=%s attempt=%d retry_in=%ds",
                    engine, attempt + 1, wait,
                )
                time.sleep(wait)
                continue

            logger.error("Engine call failed  engine=%s attempt=%d/%d error=%s", engine, attempt + 1, QUERY["max_retries"], e)
            return None, 0, 0, error_str

    return None, 0, 0, "Max retries exceeded"


def _categorise_error(error: str) -> str:
    """Map raw error string to a structured degraded_reason code."""
    e = error.lower()
    if "404" in e or "no endpoints" in e or "not a valid model" in e:
        return "model_unavailable"
    if "429" in e or "rate" in e:
        return "rate_limit"
    if "timeout" in e or "timed out" in e:
        return "timeout"
    if "401" in e or "403" in e or "unauthorized" in e:
        return "auth_error"
    return "api_error"


# ── Response parsing ────────────────────────────────────────


def _extract_mentions(response_text: str) -> list[dict]:
    """
    Extract domain mentions from AI response text.

    Primary: regex domain extraction.
    Secondary: infer domain from company names mentioned near the target domain pattern.

    Returns list of {"domain", "position", "snippet"} ordered by first
    appearance. Deduplicates — keeps first (= highest) position per domain.
    """
    found_domains = _DOMAIN_RE.findall(response_text)

    seen: set[str] = set()
    mentions: list[dict] = []
    position = 1

    for raw_domain in found_domains:
        domain = raw_domain.lower().strip(".")
        if domain.startswith("www."):
            domain = domain[4:]

        if domain in NOISE_DOMAINS or domain in seen:
            continue
        seen.add(domain)

        snippet = _extract_snippet(response_text, raw_domain)
        mentions.append({"domain": domain, "position": position, "snippet": snippet})
        position += 1

        if position > QUERY["max_mentions"]:
            break

    return mentions


def _extract_snippet(text: str, domain: str) -> str:
    """Extract ~500 chars of context around a domain mention."""
    idx = text.lower().find(domain.lower())
    if idx == -1:
        return ""

    start = max(0, idx - 250)
    end = min(len(text), idx + len(domain) + 250)
    snippet = text[start:end].strip()

    if start > 0:
        snippet = "…" + snippet
    if end < len(text):
        snippet = snippet + "…"

    return snippet


# ── Sentiment classification ───────────────────────────────

_VALID_SENTIMENTS = {"favorable", "neutral", "cautious", "unfavorable"}


def _classify_sentiments_batch(snippets: dict[str, str]) -> dict[str, str]:
    """
    Classify sentiment for multiple domain snippets in one LLM call.

    snippets: {domain: snippet_text}
    Returns: {domain: sentiment}

    Falls back to keyword matching per-snippet if LLM call fails.
    """
    if not snippets:
        return {}

    # Build a numbered list so the LLM can reply with matching numbers
    items = list(snippets.items())
    numbered = "\n".join(
        f"{i + 1}. {snippet[:500]}" for i, (_, snippet) in enumerate(items)
    )

    prompt = (
        "Classify the sentiment of each text snippet about a company. "
        "Reply with ONLY a numbered list matching the input, one per line, "
        "using exactly one of: favorable, neutral, cautious, unfavorable.\n\n"
        f"{numbered}"
    )

    try:
        response = openrouter_client.chat.completions.create(
            model=QUERY["openai_model"],
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=len(items) * 5,
        )
        lines = (response.choices[0].message.content or "").strip().splitlines()
        results = {}
        for i, line in enumerate(lines):
            if i >= len(items):
                break
            # Strip "1. " prefix if present
            label = re.sub(r"^\d+\.\s*", "", line).strip().lower()
            domain = items[i][0]
            results[domain] = label if label in _VALID_SENTIMENTS else _keyword_sentiment(items[i][1])
        # Fill any missing with keyword fallback
        for i, (domain, snippet) in enumerate(items):
            if domain not in results:
                results[domain] = _keyword_sentiment(snippet)
        return results
    except Exception:
        return {domain: _keyword_sentiment(snippet) for domain, snippet in items}


def _keyword_sentiment(snippet: str) -> str:
    """Keyword-based sentiment classification. Used as fallback."""
    if not snippet:
        return "neutral"

    words = set(re.findall(r"\b\w+\b", snippet.lower()))

    if words & _UNFAVORABLE_WORDS or "not recommended" in snippet.lower():
        return "unfavorable"
    if (words & _FAVORABLE_WORDS) and not (words & _CAUTIOUS_WORDS):
        return "favorable"
    if words & _CAUTIOUS_WORDS:
        return "cautious"
    return "neutral"
