"""Cancellation token — passed through pipeline steps to support mid-run cancellation."""


class RunCancelled(Exception):
    """Raised when a run is cancelled while processing."""


def check_cancelled(run_id: str) -> None:
    """
    Check if the run has been cancelled in the DB and raise RunCancelled if so.

    Call this at the start of each pipeline step.
    """
    from db import is_run_cancelled

    if is_run_cancelled(run_id):
        raise RunCancelled(f"Run {run_id} was cancelled")
