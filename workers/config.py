"""Worker configuration — all tunables in one place."""

import os
from pathlib import Path

import openai as _openai
from dotenv import load_dotenv

# Load .env from project root (one level up from workers/)
_project_root = Path(__file__).resolve().parent.parent
load_dotenv(_project_root / ".env")

# ── Credentials ─────────────────────────────────────────────

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ["NEXT_PUBLIC_SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

OPENROUTER_API_KEY = os.environ["OPENROUTER_API_KEY"]
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

# Shared OpenRouter client — import this instead of creating per-module instances
openrouter_client = _openai.OpenAI(api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE_URL)

# ── Worker loop ─────────────────────────────────────────────

POLL_INTERVAL_SECONDS = 5
MAX_CONCURRENT_RUNS = 3       # parallel runs processed at once
MAX_CONCURRENT_API_CALLS = 10  # parallel query×engine calls per run

# ── Pipeline tunables ────────────────────────────────────────

CRAWL = {
    "request_timeout": 30,            # seconds per HTTP request
    "thin_content_threshold": 800,    # chars — below this, try JS render
    "user_agent": "Mozilla/5.0 (compatible; Seenly/1.0; +https://seenly.ai)",
}

UNDERSTAND = {
    "max_content_chars": 18_000,      # truncate crawl text before sending to LLM
    "max_page_chars": 6_000,          # max chars taken from each crawled page
    "model": "openai/gpt-4o-mini",
    "temperature": 0.2,
    "max_tokens": 2000,
    "query_weight_brand_only": 0.5,   # lower weight for brand-only fallback queries
    "query_weight_normal": 1.0,
    "min_cluster_confidence": 0.4,    # drop clusters below this confidence
}

QUERY = {
    "max_retries": 3,
    "backoff_base": 2,                # wait = backoff_base ** attempt (seconds)
    "max_mentions": 10,               # top N domain mentions extracted per response
    # All models accessed via OpenRouter — use provider/model format
    "openai_model": "openai/gpt-4o-mini",
    "openai_temperature": 0.3,
    "openai_max_tokens": 2000,
    "anthropic_model": "anthropic/claude-3.5-haiku",
    "anthropic_max_tokens": 2000,
    "google_model": "google/gemini-2.5-flash-lite",
    "google_max_tokens": 2000,
}

SCORING = {
    # Pillar weights — must sum to 1.0
    "weight_avs": 0.45,
    "weight_aeo": 0.35,
    "weight_sentiment": 0.20,
    # Sentiment → numeric value
    "sentiment_values": {"favorable": 100, "neutral": 50, "cautious": 25, "unfavorable": 0},
    # Query source weights for AVS
    "query_weight_user_added": 0.7,
    "query_weight_suggested": 1.0,
    # AVS consensus: target must be cited by this many engines on the same query
    "avs_consensus_min_engines": 2,
    # AVS bonuses (combined cap: 10 pts)
    "avs_bonus_all_engines": 5,       # cited by ALL engines on any single query
    "avs_bonus_coverage": 5,          # consensus on avs_coverage_threshold+ of queries
    "avs_coverage_threshold": 0.5,
    # Confidence normalisers
    "avs_confidence_query_norm": 5,
    "avs_confidence_engine_norm": 3,
    "aeo_confidence_multiplier": 33,  # each crawled page adds this many points (cap 100)
    # Penalties
    "penalty_avs_zero_cap": 59,       # max score when AVS = 0
    "penalty_avs_low_threshold": 30,  # AVS below this triggers the low multiplier
    "penalty_avs_low_multiplier": 0.85,
}

COMPETITORS = {
    "min_query_count": 2,             # domain must appear in this many distinct queries
}

# ── Plan limits (mirrors constants/plans.ts) ─────────────────

_MAX_LIMITS = {
    "runs_per_month": -1,
    "crawl_pages": 40,
    "suggested_queries": 25,
    "user_queries": 15,
    "engines": 3,
    "competitors": 15,
}

PLAN_LIMITS = {
    "starter": _MAX_LIMITS,
    "growth": _MAX_LIMITS,
    "enterprise": _MAX_LIMITS,
}
