"""Analysis pipeline — orchestrates crawl → understand → query → score."""

import logging

from pipeline.cancellation import RunCancelled, check_cancelled
from pipeline.crawl import crawl_site
from pipeline.understand import extract_business_profile
from pipeline.ai_query import query_ai_engines, query_ai_engines_followup
from pipeline.scoring import compute_scores
from pipeline.competitors import detect_competitors

logger = logging.getLogger("pipeline")


def run_pipeline(run: dict):
    """
    Execute the full analysis pipeline for a run.

    Steps:
    1. Crawl the target site
    2. Extract business profile from crawled content
    3. Generate and send queries to AI engines
    4. Detect competitors from AI responses
    5. Compute scores

    """
    run_id = run["id"]
    domain = (run.get("config") or {}).get("domain", "unknown")
    logger.info("[%s] Pipeline starting  domain=%s", run_id, domain)

    # Step 1: Crawl
    check_cancelled(run_id)
    crawl_results = crawl_site(run)
    ok_pages = sum(1 for p in crawl_results if p.get("crawl_status") in ("ok", "partial"))
    logger.info("[%s] Crawl done  pages=%d ok=%d", run_id, len(crawl_results), ok_pages)

    # Step 2: Business understanding
    check_cancelled(run_id)
    profile = extract_business_profile(run, crawl_results)
    logger.info(
        "[%s] Profile ready  mode=%s clusters=%d queries=%d",
        run_id, profile.get("mode"), len(profile.get("clusters", [])), len(profile.get("queries", [])),
    )

    # Step 3: AI querying (round 1)
    check_cancelled(run_id)
    ai_results = query_ai_engines(run, profile)
    degraded = sum(1 for r in ai_results if r.get("is_degraded"))
    logger.info(
        "[%s] AI querying done  results=%d degraded=%d",
        run_id, len(ai_results), degraded,
    )

    # Step 3b: Follow-up querying based on competitors found in round 1
    check_cancelled(run_id)
    followup_results = query_ai_engines_followup(run, profile, ai_results)
    if followup_results:
        ai_results = ai_results + followup_results
        logger.info("[%s] Follow-up querying done  additional=%d", run_id, len(followup_results))

    # Step 4: Competitor detection
    check_cancelled(run_id)
    competitors = detect_competitors(run, ai_results)
    logger.info("[%s] Competitors done  found=%d", run_id, len(competitors))

    # Step 5: Scoring
    check_cancelled(run_id)
    scores = compute_scores(run, crawl_results, ai_results)
    logger.info(
        "[%s] Pipeline complete  avs=%s aeo=%s sentiment=%s final=%s",
        run_id,
        scores.get("avs_score"),
        scores.get("aeo_score"),
        scores.get("sentiment_score"),
        scores.get("seenly_score_final"),
    )

    return scores
