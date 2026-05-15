-- Phase 2, Step 1: Analysis engine tables
-- 5 new tables + runs table extensions + RLS policies + claim_pending_run RPC

-- ============================================================
-- 1. Projects table
-- ============================================================
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  domain text not null,
  name text not null,
  sector text,
  geo text,
  created_at timestamptz not null default now()
);

create index projects_org_id_idx on public.projects(org_id);

-- ============================================================
-- 2. Extend runs table
-- ============================================================

-- FK to projects (nullable — runs can exist without a project)
alter table public.runs
  add column project_id uuid references public.projects(id) on delete set null;

-- Frozen config snapshot (queries, engines, crawl_limit, plan at run time)
alter table public.runs
  add column config jsonb;

-- Cost/timing metadata written after completion
alter table public.runs
  add column results_meta jsonb;

-- Update status constraint to include 'queued'
alter table public.runs
  drop constraint runs_status_check,
  add constraint runs_status_check
    check (status in ('pending', 'queued', 'running', 'completed', 'failed'));

create index runs_project_id_idx on public.runs(project_id);
create index runs_status_idx on public.runs(status);

-- ============================================================
-- 3. Crawl pages table
-- ============================================================
create table public.crawl_pages (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  url text not null,
  crawl_status text not null check (crawl_status in ('ok', 'partial', 'blocked', 'unreachable')),
  confidence int check (confidence between 0 and 100),
  extraction_method text check (extraction_method in ('html', 'js_render')),
  text_length int,
  h1 text,
  h2s text[],
  has_faq boolean default false,
  has_schema boolean default false,
  schema_types text[],
  internal_link_count int,
  page_quality_score int check (page_quality_score between 0 and 100),
  raw_html text
);

create index crawl_pages_run_id_idx on public.crawl_pages(run_id);

-- ============================================================
-- 4. AI results table
-- ============================================================
create table public.ai_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  query text not null,
  query_source text not null check (query_source in ('seenly_suggested', 'user_added')),
  engine text not null check (engine in ('openai', 'anthropic', 'google')),
  position int check (position between 1 and 3),
  cited_domain text,
  snippet text,
  sentiment text check (sentiment in ('favorable', 'neutral', 'cautious', 'unfavorable')),
  is_target boolean default false,
  is_degraded boolean default false,
  raw_response jsonb
);

create index ai_results_run_id_idx on public.ai_results(run_id);
create index ai_results_run_engine_idx on public.ai_results(run_id, engine);

-- ============================================================
-- 5. Run scores table (immutable after creation)
-- ============================================================
create table public.run_scores (
  run_id uuid primary key references public.runs(id) on delete cascade,
  avs_score int check (avs_score between 0 and 100),
  aeo_score int check (aeo_score between 0 and 100),
  sentiment_score int check (sentiment_score between 0 and 100),
  seenly_score_base int check (seenly_score_base between 0 and 100),
  seenly_score_final int check (seenly_score_final between 0 and 100),
  penalties_applied jsonb default '[]'::jsonb,
  avs_confidence int check (avs_confidence between 0 and 100),
  aeo_confidence int check (aeo_confidence between 0 and 100),
  completed_at timestamptz not null default now()
);

-- ============================================================
-- 6. Competitors table
-- ============================================================
create table public.competitors (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs(id) on delete cascade,
  domain text not null,
  mention_count int not null default 0,
  query_count int not null default 0,
  avg_position decimal(3, 1)
);

create index competitors_run_id_idx on public.competitors(run_id);

-- ============================================================
-- 7. RLS policies
-- ============================================================

-- Projects
alter table public.projects enable row level security;

create policy "Users can read org projects"
  on public.projects for select
  using (org_id = ((auth.jwt() ->> 'org_id')::uuid));

create policy "Admin and analyst can insert projects"
  on public.projects for insert
  with check (
    org_id = ((auth.jwt() ->> 'org_id')::uuid)
    and (auth.jwt() ->> 'user_role') in ('admin', 'analyst')
  );

create policy "Admin and analyst can update projects"
  on public.projects for update
  using (
    org_id = ((auth.jwt() ->> 'org_id')::uuid)
    and (auth.jwt() ->> 'user_role') in ('admin', 'analyst')
  );

create policy "Admins can delete projects"
  on public.projects for delete
  using (
    org_id = ((auth.jwt() ->> 'org_id')::uuid)
    and (auth.jwt() ->> 'user_role') = 'admin'
  );

-- Crawl pages (read: org members via runs join, write: service role only)
alter table public.crawl_pages enable row level security;

create policy "Users can read org crawl pages"
  on public.crawl_pages for select
  using (
    exists (
      select 1 from public.runs
      where runs.id = crawl_pages.run_id
        and runs.org_id = ((auth.jwt() ->> 'org_id')::uuid)
    )
  );

-- AI results (read: org members via runs join, write: service role only)
alter table public.ai_results enable row level security;

create policy "Users can read org ai results"
  on public.ai_results for select
  using (
    exists (
      select 1 from public.runs
      where runs.id = ai_results.run_id
        and runs.org_id = ((auth.jwt() ->> 'org_id')::uuid)
    )
  );

-- Run scores (read: org members via runs join, write: service role only)
alter table public.run_scores enable row level security;

create policy "Users can read org run scores"
  on public.run_scores for select
  using (
    exists (
      select 1 from public.runs
      where runs.id = run_scores.run_id
        and runs.org_id = ((auth.jwt() ->> 'org_id')::uuid)
    )
  );

-- Competitors (read: org members via runs join, write: service role only)
alter table public.competitors enable row level security;

create policy "Users can read org competitors"
  on public.competitors for select
  using (
    exists (
      select 1 from public.runs
      where runs.id = competitors.run_id
        and runs.org_id = ((auth.jwt() ->> 'org_id')::uuid)
    )
  );

-- ============================================================
-- 8. claim_pending_run RPC (used by Python worker)
--    Atomically claims the oldest pending run via FOR UPDATE SKIP LOCKED
-- ============================================================
create or replace function public.claim_pending_run()
returns setof public.runs
language sql
security definer
as $$
  update public.runs
  set status = 'running', updated_at = now()
  where id = (
    select id from public.runs
    where status = 'pending'
    order by created_at asc
    limit 1
    for update skip locked
  )
  returning *;
$$;
