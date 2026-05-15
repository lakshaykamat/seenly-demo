-- Add 'cancelled' as a valid run status
alter table public.runs
  drop constraint runs_status_check;

alter table public.runs
  add constraint runs_status_check
  check (status in ('pending', 'running', 'completed', 'failed', 'cancelled'));
