-- Migration 012: Extend ai_results for engine improvements
--
-- 1. Increase position limit from 3 → 10 (engine now extracts up to 10 mentions)
-- 2. Add degraded_reason column for structured error tracking
-- 3. Add query_type column (discovery | comparison | alternatives | educational | user_added)

-- 1. Relax position constraint
alter table public.ai_results
  drop constraint if exists ai_results_position_check;

alter table public.ai_results
  add constraint ai_results_position_check check (position between 1 and 10);

-- 2. Add degraded_reason
alter table public.ai_results
  add column if not exists degraded_reason text
    check (degraded_reason in (
      'model_unavailable', 'rate_limit', 'timeout',
      'auth_error', 'api_error', 'empty_response', 'no_mentions'
    ));

-- 3. Add query_type
alter table public.ai_results
  add column if not exists query_type text
    check (query_type in ('discovery', 'comparison', 'alternatives', 'educational', 'user_added'));
