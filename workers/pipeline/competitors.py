"""
Competitor detection step — find competing domains from AI responses.

Runs before scoring so competitors are available in the dashboard.

Flow:
  1. Aggregate all non-target domains from ai_results
  2. Filter noise (directories, marketplaces, media, .gov/.edu)
  3. Keep domains appearing in 2+ distinct queries
  4. Cap by plan limit
  5. Compute mention_count, query_count, avg_position per competitor
  6. Write competitors rows to database
"""

import logging
from collections import defaultdict

from config import COMPETITORS, PLAN_LIMITS
from db import insert_competitors
from pipeline.helpers import domains_match, get_target_domain, is_noise_domain

logger = logging.getLogger("competitors")


# ── Public API ──────────────────────────────────────────────


def detect_competitors(run: dict, ai_results: list[dict]) -> list[dict]:
    """
    Detect competitor domains from AI engine responses.

    Returns list of competitor dicts (already inserted into DB).
    """
    run_id = run["id"]
    config = run.get("config") or {}
    plan = config.get("plan_at_run_time", "starter")
    max_competitors = PLAN_LIMITS[plan]["competitors"]

    target_domain = get_target_domain(run)

    # Collect per-domain stats
    domain_stats: dict[str, dict] = defaultdict(
        lambda: {"positions": [], "queries": set()}
    )

    for result in ai_results:
        if result.get("is_degraded"):
            continue

        cited = result.get("cited_domain")
        if not cited:
            continue

        cited = cited.lower().strip(".")

        if domains_match(cited, target_domain) or is_noise_domain(cited):
            continue

        domain_stats[cited]["positions"].append(result.get("position"))
        domain_stats[cited]["queries"].add(result.get("query", ""))

    # On starter (5 queries total), requiring 2 queries is a 40% bar — too high.
    # Scale threshold: 1 for small query sets, 2 for larger ones.
    total_queries = len({r.get("query") for r in ai_results if not r.get("is_degraded")})
    min_queries = 1 if total_queries <= 6 else COMPETITORS["min_query_count"]

    qualified = {
        domain: stats
        for domain, stats in domain_stats.items()
        if len(stats["queries"]) >= min_queries
    }

    if not qualified:
        logger.info("[%s] No competitors found  candidates=%d threshold=%d queries", run_id, len(domain_stats), min_queries)
        return []

    # Boost domains appearing in alternatives/comparison queries — stronger signal of direct competitors
    alt_queries = {
        r.get("query", "")
        for r in ai_results
        if r.get("query_type") in ("alternatives", "comparison")
    }

    # Build rows sorted by: alt/comparison appearances → query count → mention count → avg position (asc)
    competitor_rows: list[dict] = []
    for domain, stats in sorted(
        qualified.items(),
        key=lambda x: (
            len(x[1]["queries"] & alt_queries),
            len(x[1]["queries"]),
            len(x[1]["positions"]),
            # Lower avg_position = mentioned earlier = more prominent (negate for desc sort)
            -(sum(p for p in x[1]["positions"] if p) / max(len(x[1]["positions"]), 1)),
        ),
        reverse=True,
    ):
        positions = [p for p in stats["positions"] if p is not None]
        avg_pos = round(sum(positions) / len(positions), 1) if positions else None

        competitor_rows.append({
            "run_id": run_id,
            "domain": domain,
            "mention_count": len(stats["positions"]),
            "query_count": len(stats["queries"]),
            "avg_position": avg_pos,
        })

    competitor_rows = competitor_rows[:max_competitors]

    if competitor_rows:
        insert_competitors(competitor_rows)

    top = [r["domain"] for r in competitor_rows[:3]]
    logger.info(
        "[%s] Competitors saved  found=%d candidates=%d top=%s",
        run_id, len(competitor_rows), len(domain_stats), top,
    )

    return competitor_rows
