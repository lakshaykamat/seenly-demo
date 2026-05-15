-- Reset runs stuck in 'running' state back to 'pending' for retry.
-- Called on worker startup to recover from crashes.

create or replace function public.reset_stale_runs(stale_minutes int default 30)
returns setof public.runs
language sql
security definer
as $$
  update public.runs
  set status = 'pending', updated_at = now()
  where status = 'running'
    and updated_at < now() - (stale_minutes || ' minutes')::interval
  returning *;
$$;
