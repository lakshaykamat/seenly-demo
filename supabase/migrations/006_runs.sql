-- Create runs table (tenant-scoped analytics runs)
create table public.runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'running', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for tenant-scoped queries and quota counting
create index runs_org_id_idx on public.runs(org_id);
create index runs_org_created_idx on public.runs(org_id, created_at);

-- Auto-update updated_at
create trigger runs_updated_at
  before update on public.runs
  for each row execute function public.update_updated_at();

-- Enable RLS
alter table public.runs enable row level security;

-- Users can read runs in their own org
create policy "Users can read org runs"
  on public.runs for select
  using (
    org_id = ((auth.jwt() ->> 'org_id')::uuid)
  );

-- Admin and analyst can create runs in their org
create policy "Members can insert org runs"
  on public.runs for insert
  with check (
    org_id = ((auth.jwt() ->> 'org_id')::uuid)
    and (auth.jwt() ->> 'user_role') in ('admin', 'analyst')
  );

-- Admin and analyst can update runs in their org
create policy "Members can update org runs"
  on public.runs for update
  using (
    org_id = ((auth.jwt() ->> 'org_id')::uuid)
    and (auth.jwt() ->> 'user_role') in ('admin', 'analyst')
  );

-- Only admins can delete runs
create policy "Admins can delete org runs"
  on public.runs for delete
  using (
    org_id = ((auth.jwt() ->> 'org_id')::uuid)
    and (auth.jwt() ->> 'user_role') = 'admin'
  );
