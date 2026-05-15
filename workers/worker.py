"""
Seenly analysis worker.

Polls the runs table for pending jobs, claims them atomically,
and runs the analysis pipeline.

Concurrency model:
  - Up to MAX_CONCURRENT_RUNS runs are processed in parallel (ThreadPoolExecutor).
  - A semaphore gates claim attempts so we never hold more slots than we can fill.
  - Each run's pipeline also parallelises query×engine API calls internally.

Signals:
  - SIGTERM / SIGINT  → graceful shutdown (finish active runs, then exit)
  - SIGHUP            → restart signal (used by deploy scripts to hot-reload)
"""

import logging
import os
import random
import signal
import sys
import threading
import time
import traceback
from concurrent.futures import ThreadPoolExecutor

from config import (
    MAX_CONCURRENT_API_CALLS,
    MAX_CONCURRENT_RUNS,
    OPENROUTER_API_KEY,
    OPENROUTER_BASE_URL,
    POLL_INTERVAL_SECONDS,
    SUPABASE_URL,
    SUPABASE_SERVICE_KEY,
)
from db import claim_pending_run, has_run_scores, reset_stale_runs, update_run_status, cancel_run
from pipeline import run_pipeline
from pipeline.cancellation import RunCancelled

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(threadName)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stdout,
)

# Suppress noisy HTTP client logs from supabase/httpx/openai
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)
logging.getLogger("hpack").setLevel(logging.WARNING)
logging.getLogger("openai").setLevel(logging.WARNING)

logger = logging.getLogger("worker")

# ── Shutdown flag ────────────────────────────────────────────

_shutdown = threading.Event()


def _handle_shutdown(signum, frame):
    sig_name = signal.Signals(signum).name
    logger.info("Signal received  signal=%s  initiating graceful shutdown", sig_name)
    _shutdown.set()


def _handle_restart(signum, frame):
    """SIGHUP — used by deploy scripts to trigger a clean restart."""
    logger.info("SIGHUP received — restarting worker process")
    _shutdown.set()
    # Re-exec the current process (same args, fresh state)
    os.execv(sys.executable, [sys.executable] + sys.argv)


# ── Env verification ─────────────────────────────────────────


def _verify_env() -> bool:
    """
    Check all required environment variables are present and log a startup banner.
    Returns False if any critical var is missing.
    """
    ok = True

    checks = [
        ("SUPABASE_URL",          SUPABASE_URL,          True),
        ("SUPABASE_SERVICE_KEY",  SUPABASE_SERVICE_KEY,  True),
        ("OPENROUTER_API_KEY",    OPENROUTER_API_KEY,    True),
    ]

    logger.info("=" * 60)
    logger.info("Seenly Worker — startup checks")
    logger.info("=" * 60)

    for name, value, required in checks:
        if value:
            # Mask secrets — show first 8 chars only
            masked = value[:8] + "..." if len(value) > 8 else "***"
            logger.info("  %-28s %s  [OK]", name, masked)
        else:
            level = "ERROR" if required else "WARNING"
            getattr(logger, level.lower())("  %-28s (not set)  [%s]", name, level)
            if required:
                ok = False

    logger.info("-" * 60)
    logger.info(
        "  %-28s %s",
        "OPENROUTER_BASE_URL", OPENROUTER_BASE_URL,
    )
    logger.info(
        "  %-28s %d",
        "MAX_CONCURRENT_RUNS", MAX_CONCURRENT_RUNS,
    )
    logger.info(
        "  %-28s %d",
        "MAX_CONCURRENT_API_CALLS", MAX_CONCURRENT_API_CALLS,
    )
    logger.info(
        "  %-28s %ds",
        "POLL_INTERVAL", POLL_INTERVAL_SECONDS,
    )
    logger.info("=" * 60)

    if not ok:
        logger.error("Missing required environment variables — worker cannot start")

    return ok


# ── Run processor ────────────────────────────────────────────


def _process_run(run: dict) -> None:
    """Process a single run. Runs inside a thread pool worker."""
    run_id = run["id"]

    start_time = time.time()
    try:
        if has_run_scores(run_id):
            logger.info("run=%s status=skipped reason=already_scored", run_id)
            update_run_status(run_id, "completed")
            return
        run_pipeline(run)
        duration_ms = int((time.time() - start_time) * 1000)
        ai_usage = (run.get("config") or {}).get("ai_usage") or {}
        results_meta = {
            "duration_ms": duration_ms,
            "ai_calls": ai_usage.get("ai_calls", 0),
            "tokens_in": ai_usage.get("tokens_in", 0),
            "tokens_out": ai_usage.get("tokens_out", 0),
        }
        update_run_status(run_id, "completed", results_meta=results_meta)
        logger.info(
            "run=%s status=completed duration_ms=%d ai_calls=%d tokens_in=%d tokens_out=%d",
            run_id, duration_ms,
            ai_usage.get("ai_calls", 0),
            ai_usage.get("tokens_in", 0),
            ai_usage.get("tokens_out", 0),
        )

    except RunCancelled:
        duration_ms = int((time.time() - start_time) * 1000)
        logger.info("run=%s status=cancelled duration_ms=%d", run_id, duration_ms)
        # Status already set to 'cancelled' in DB by whoever cancelled it —
        # just ensure it's consistent.
        cancel_run(run_id)

    except Exception as e:
        tb = traceback.format_exc()
        logger.error("run=%s status=failed error=%s", run_id, e)
        logger.debug("run=%s traceback:\n%s", run_id, tb)
        update_run_status(run_id, "failed", results_meta={"error": str(e), "traceback": tb})


# ── Main loop ────────────────────────────────────────────────


def main() -> None:
    if not _verify_env():
        sys.exit(1)

    # Register signal handlers
    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)
    signal.signal(signal.SIGHUP, _handle_restart)
    logger.info("Signal handlers registered  SIGTERM=shutdown SIGINT=shutdown SIGHUP=restart")

    # On startup, recover any runs left in 'running' state from a previous crash.
    recovered = reset_stale_runs(stale_after_minutes=30)
    if recovered:
        logger.warning("Stale runs recovered  count=%d", recovered)
    else:
        logger.info("No stale runs to recover")

    logger.info("Worker ready  poll_interval=%ds max_concurrent=%d", POLL_INTERVAL_SECONDS, MAX_CONCURRENT_RUNS)

    semaphore = threading.Semaphore(MAX_CONCURRENT_RUNS)
    idle_polls = 0

    with ThreadPoolExecutor(
        max_workers=MAX_CONCURRENT_RUNS,
        thread_name_prefix="run",
    ) as executor:
        while not _shutdown.is_set():
            try:
                # Block until a slot is free, then try to claim a run.
                semaphore.acquire()

                if _shutdown.is_set():
                    semaphore.release()
                    break

                run = claim_pending_run()

                if run is None:
                    semaphore.release()
                    idle_polls += 1
                    # Log once per minute (~12 polls at 5s) to confirm the worker is alive
                    if idle_polls % 12 == 1:
                        logger.info("Polling  status=idle polls=%d", idle_polls)
                    time.sleep(POLL_INTERVAL_SECONDS + random.uniform(0, 2))
                    continue

                idle_polls = 0
                run_id = run["id"]
                logger.info("run=%s status=claimed", run_id)

                def task(r=run):
                    try:
                        _process_run(r)
                    finally:
                        semaphore.release()

                executor.submit(task)

            except Exception as e:
                # Transient poll-loop error (DB blip, network, etc.) — don't crash.
                semaphore.release()
                logger.error("Poll loop error  error=%s", e)
                time.sleep(POLL_INTERVAL_SECONDS + random.uniform(0, 2))

        logger.info("Shutdown initiated — waiting for %d active run(s) to finish", MAX_CONCURRENT_RUNS - semaphore._value)

    logger.info("Worker stopped cleanly")


if __name__ == "__main__":
    main()
