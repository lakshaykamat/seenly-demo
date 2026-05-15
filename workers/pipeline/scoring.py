"""
Scoring step — compute AVS, AEO, Sentiment, and Seenly Score.

Three pillars:
  AVS (45%) — consensus citation rate across AI engines
  AEO (35%) — average page quality from crawl
  Sentiment (20%) — average sentiment of consensus citations

Deterministic: same inputs always produce the same output.
"""

import logging
from collections import defaultdict

from config import SCORING
from db import insert_run_scores

logger = logging.getLogger("scoring")


# ── Public API ──────────────────────────────────────────────


def compute_scores(
    run: dict,
    crawl_results: list[dict],
    ai_results: list[dict],
) -> dict:
    """
    Compute the three-pillar Seenly Score.

    Writes run_scores row to DB.
    Returns scores dict with all computed values.
    """
    run_id = run["id"]
    config = run.get("config") or {}

    # Build per-query weight map from stored query config.
    # This carries brand-only 0.5x weights that _compute_avs would otherwise miss.
    query_weights_map = {
        q["text"]: q.get("weight", SCORING["query_weight_suggested"])
        for q in config.get("queries_used", [])
    }

    plan = config.get("plan_at_run_time", "starter")
    from config import PLAN_LIMITS
    enabled_engines = PLAN_LIMITS[plan]["engines"]
    avs, avs_confidence = _compute_avs(ai_results, query_weights_map, enabled_engines)
    aeo, aeo_confidence = _compute_aeo(crawl_results)
    sentiment = _compute_sentiment(ai_results)

    base_score = _compute_composite(avs, aeo, sentiment)
    final_score, penalties = _apply_penalties(base_score, avs)

    scores = {
        "run_id": run_id,
        "avs_score": avs,
        "aeo_score": aeo,
        "sentiment_score": sentiment,
        "seenly_score_base": base_score,
        "seenly_score_final": final_score,
        "penalties_applied": penalties,
        "avs_confidence": avs_confidence,
        "aeo_confidence": aeo_confidence,
    }

    insert_run_scores(scores)

    penalty_rules = [p["rule"] for p in penalties]
    logger.info(
        "[%s] Scores  avs=%s aeo=%s sentiment=%s base=%s final=%s penalties=%s",
        run_id, avs, aeo, sentiment, base_score, final_score,
        penalty_rules if penalty_rules else "none",
    )

    return scores


# ── AVS (AI Visibility Score) ──────────────────────────────


def _compute_avs(
    ai_results: list[dict],
    query_weights_map: dict[str, float] | None = None,
    enabled_engines: int = 3,
) -> tuple[int | None, int | None]:
    """
    Compute AVS from consensus citations.

    consensus_citation = target domain cited by 2+ engines for the same query
    avs_base = (consensus_citations / total_queries) × 100

    Bonuses (cap +10):
      +5 if cited by ALL enabled engines on any single query
      +5 if cited on 50%+ of all queries

    query_weights_map: per-query weights from run config (carries brand-only 0.5x).

    Returns (avs_score, avs_confidence).
    """
    if not ai_results:
        return None, None

    # query_engines[query][engine] = best position_weight seen for that engine
    query_engines: dict[str, dict[str, float]] = defaultdict(dict)
    all_queries: set[str] = set()
    all_engines: set[str] = set()
    query_weights: dict[str, float] = {}

    for r in ai_results:
        query = r.get("query", "")
        engine = r.get("engine", "")
        all_queries.add(query)
        all_engines.add(engine)

        if query not in query_weights:
            # Prefer stored per-query weight — correctly applies brand-only 0.5x
            if query_weights_map and query in query_weights_map:
                query_weights[query] = query_weights_map[query]
            else:
                source = r.get("query_source", "seenly_suggested")
                query_weights[query] = SCORING["query_weight_user_added"] if source == "user_added" else SCORING["query_weight_suggested"]

        if r.get("is_degraded") or not r.get("is_target"):
            continue

        # Weight by mention position: pos 1 = 1.0, pos 5 = 0.6, pos 10 = 0.1
        position = r.get("position") or 1
        position_weight = max(0.1, 1.0 - (position - 1) * 0.1)
        query_engines[query][engine] = max(
            query_engines[query].get(engine, 0), position_weight
        )

    total_queries = len(all_queries)
    num_engines = len(all_engines)

    if total_queries == 0:
        return None, None

    consensus_count = 0
    weighted_consensus = 0.0
    all_engines_count = 0

    for query, engine_weights in query_engines.items():
        if len(engine_weights) >= SCORING["avs_consensus_min_engines"]:
            consensus_count += 1
            # Weight by query importance × average position weight across citing engines
            avg_position_weight = sum(engine_weights.values()) / len(engine_weights)
            query_weight = query_weights.get(query, SCORING["query_weight_suggested"])
            weighted_consensus += query_weight * avg_position_weight
            if len(engine_weights) >= enabled_engines:
                all_engines_count += 1

    weighted_total = sum(query_weights.get(q, SCORING["query_weight_suggested"]) for q in all_queries)
    if weighted_total == 0:
        return None, None

    avs_base = (weighted_consensus / weighted_total) * 100

    bonus = 0
    if all_engines_count > 0:
        bonus += SCORING["avs_bonus_all_engines"]
    if consensus_count >= total_queries * SCORING["avs_coverage_threshold"]:
        bonus += SCORING["avs_bonus_coverage"]

    avs = min(100, round(avs_base + bonus))
    confidence = min(100, round(
        (total_queries / SCORING["avs_confidence_query_norm"]) * 50
        + (num_engines / SCORING["avs_confidence_engine_norm"]) * 50
    ))

    return avs, confidence


# ── AEO Score ──────────────────────────────────────────────


def _compute_aeo(crawl_results: list[dict]) -> tuple[int | None, int | None]:
    """
    Compute AEO from average page_quality_score across crawled pages.

    Returns (aeo_score, aeo_confidence).
    """
    if not crawl_results:
        return None, None

    quality_scores = [
        p["page_quality_score"]
        for p in crawl_results
        if p.get("crawl_status") in ("ok", "partial")
        and p.get("page_quality_score") is not None
    ]

    if not quality_scores:
        return None, None

    aeo = round(sum(quality_scores) / len(quality_scores))
    confidence = min(100, round(len(quality_scores) * SCORING["aeo_confidence_multiplier"]))

    return aeo, confidence


# ── Sentiment Score ────────────────────────────────────────


def _compute_sentiment(ai_results: list[dict]) -> int | None:
    """
    Compute sentiment from consensus citations of the target domain.

    Per citation: favorable=100, neutral=50, cautious=25, unfavorable=0
    sentiment = average across all consensus citations
    """
    if not ai_results:
        return None

    query_data: dict[str, dict[str, str | None]] = defaultdict(dict)

    for r in ai_results:
        if r.get("is_degraded") or not r.get("is_target"):
            continue

        query = r.get("query", "")
        engine = r.get("engine", "")
        query_data[query][engine] = r.get("sentiment")

    sentiment_values: list[int] = []
    for engine_sentiments in query_data.values():
        # Include sentiment from any citation — not just consensus ones.
        # Single-engine citations still carry signal, especially on Starter plan.
        for sentiment in engine_sentiments.values():
            if sentiment and sentiment in SCORING["sentiment_values"]:
                sentiment_values.append(SCORING["sentiment_values"][sentiment])

    if not sentiment_values:
        return None

    return round(sum(sentiment_values) / len(sentiment_values))


# ── Composite Seenly Score ─────────────────────────────────


def _compute_composite(
    avs: int | None,
    aeo: int | None,
    sentiment: int | None,
) -> int | None:
    """
    Compute composite Seenly Score from three pillars.

    base = (AVS × 0.45) + (AEO × 0.35) + (Sentiment × 0.20)

    If any pillar is null, exclude it and normalize remaining weights.
    """
    pillars: list[tuple[float, int]] = []

    if avs is not None:
        pillars.append((SCORING["weight_avs"], avs))
    if aeo is not None:
        pillars.append((SCORING["weight_aeo"], aeo))
    if sentiment is not None:
        pillars.append((SCORING["weight_sentiment"], sentiment))

    if not pillars:
        return None

    total_weight = sum(w for w, _ in pillars)
    if total_weight == 0:
        return None

    score = sum((w / total_weight) * s for w, s in pillars)
    return round(score)


# ── Penalties ──────────────────────────────────────────────


def _apply_penalties(
    base_score: int | None,
    avs: int | None,
) -> tuple[int | None, list[dict]]:
    """
    Apply penalties to the base Seenly Score.

    - AVS = 0 → cap at 59
    - AVS < 30 → multiply by 0.85
    """
    if base_score is None:
        return None, []

    final = base_score
    penalties: list[dict] = []

    if avs is not None:
        zero_cap = SCORING["penalty_avs_zero_cap"]
        low_threshold = SCORING["penalty_avs_low_threshold"]
        low_multiplier = SCORING["penalty_avs_low_multiplier"]

        if avs == 0 and final > zero_cap:
            penalties.append({
                "rule": "avs_zero_cap",
                "description": f"AVS=0: capped at {zero_cap}",
                "before": final,
                "after": zero_cap,
            })
            final = zero_cap
        elif 0 < avs < low_threshold:
            reduced = round(final * low_multiplier)
            penalties.append({
                "rule": "avs_low_multiplier",
                "description": f"AVS<{low_threshold}: score × {low_multiplier}",
                "before": final,
                "after": reduced,
            })
            final = reduced

    return final, penalties
