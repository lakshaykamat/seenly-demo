"""Supabase client for the worker (service role — bypasses RLS)."""

from supabase import create_client, Client

from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

_client: Client | None = None


def get_client() -> Client:
    """Return a singleton Supabase client, recreating it if needed."""
    global _client
    if _client is None:
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def _reset_client() -> Client:
    """Force-recreate the Supabase client (call after connection errors)."""
    global _client
    _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


def claim_pending_run() -> dict | None:
    """
    Atomically claim the oldest pending run.

    Uses a raw SQL call with FOR UPDATE SKIP LOCKED to prevent
    two workers from grabbing the same row.

    Returns the run dict or None if no pending runs exist.
    """
    for attempt in range(2):
        try:
            client = get_client()
            result = client.rpc("claim_pending_run", {}).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception:
            if attempt == 0:
                _reset_client()
            else:
                raise


def reset_stale_runs(stale_after_minutes: int = 30) -> int:
    """
    Reset runs stuck in 'running' state back to 'pending' so they can be retried.

    A run is considered stale if it has been 'running' for longer than
    stale_after_minutes without completing. This handles worker crashes.

    Returns the number of runs reset.
    """
    client = get_client()
    result = client.rpc(
        "reset_stale_runs",
        {"stale_minutes": stale_after_minutes},
    ).execute()
    return len(result.data) if result.data else 0


def update_run_status(run_id: str, status: str, results_meta: dict | None = None):
    """Update a run's status and optionally merge into results_meta."""
    client = get_client()
    update_data: dict = {"status": status}
    if results_meta is not None:
        # Merge so we don't overwrite crawl_status=fallback or other existing keys
        row = client.table("runs").select("results_meta").eq("id", run_id).single().execute()
        existing = (row.data or {}).get("results_meta") or {}
        update_data["results_meta"] = {**existing, **results_meta}
    client.table("runs").update(update_data).eq("id", run_id).execute()


def has_run_scores(run_id: str) -> bool:
    """Check if run_scores already exist (idempotency guard)."""
    for attempt in range(2):
        try:
            client = get_client()
            result = (
                client.table("run_scores")
                .select("run_id")
                .eq("run_id", run_id)
                .execute()
            )
            return len(result.data) > 0
        except Exception:
            if attempt == 0:
                _reset_client()
            else:
                raise


def insert_crawl_pages(rows: list[dict]):
    """Insert crawl_pages rows. Accepts a list of dicts matching the table schema."""
    if not rows:
        return
    client = get_client()
    client.table("crawl_pages").insert(rows).execute()


def insert_ai_results(rows: list[dict]):
    """Insert ai_results rows."""
    if not rows:
        return
    client = get_client()
    client.table("ai_results").insert(rows).execute()


def insert_run_scores(row: dict):
    """Insert a single run_scores row."""
    client = get_client()
    client.table("run_scores").insert(row).execute()


def insert_competitors(rows: list[dict]):
    """Insert competitors rows."""
    if not rows:
        return
    client = get_client()
    client.table("competitors").insert(rows).execute()


def update_run_config(run_id: str, config: dict):
    """Update the config JSONB column on a run."""
    client = get_client()
    client.table("runs").update({"config": config}).eq("id", run_id).execute()

def is_run_cancelled(run_id: str) -> bool:
    """Check if a run has been cancelled while processing."""
    client = get_client()
    result = (
        client.table("runs")
        .select("status")
        .eq("id", run_id)
        .single()
        .execute()
    )
    return (result.data or {}).get("status") == "cancelled"


def cancel_run(run_id: str):
    """Mark a run as cancelled."""
    client = get_client()
    client.table("runs").update({"status": "cancelled"}).eq("id", run_id).execute()


def flag_crawl_fallback(run_id: str):
    """Record in results_meta that crawl was unavailable and questions used project settings."""
    client = get_client()
    client.table("runs").update({"results_meta": {"crawl_status": "fallback"}}).eq("id", run_id).execute()


def get_project(project_id: str) -> dict | None:
    """Fetch a project by ID."""
    client = get_client()
    result = (
        client.table("projects")
        .select("*")
        .eq("id", project_id)
        .execute()
    )
    if result.data and len(result.data) > 0:
        return result.data[0]
    return None
