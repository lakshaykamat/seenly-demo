-- Enable RLS on all tables
alter table public.organizations enable row level security;
alter table public.profiles enable row level security;

-- Helper: extract org_id from JWT claims (set by custom_access_token_hook)
-- Using JWT claims avoids infinite recursion when policies query the profiles table

-- Organizations: users can read their own org
create policy "Users can read own org"
  on public.organizations for select
  using (
    id = ((auth.jwt() ->> 'org_id')::uuid)
  );

-- Organizations: admins can update their own org
create policy "Admins can update own org"
  on public.organizations for update
  using (
    id = ((auth.jwt() ->> 'org_id')::uuid)
    and (auth.jwt() ->> 'user_role') = 'admin'
  );

-- Profiles: users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

-- Profiles: users can update their own profile (but not role or org_id)
create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- Profiles: admins can read all profiles in their org
create policy "Admins can read org profiles"
  on public.profiles for select
  using (
    org_id = ((auth.jwt() ->> 'org_id')::uuid)
    and (auth.jwt() ->> 'user_role') = 'admin'
  );

-- Profiles: admins can insert new members into their org
create policy "Admins can insert org profiles"
  on public.profiles for insert
  with check (
    org_id = ((auth.jwt() ->> 'org_id')::uuid)
    and (auth.jwt() ->> 'user_role') = 'admin'
  );

-- Profiles: admins can delete members from their org (but not themselves)
create policy "Admins can delete org profiles"
  on public.profiles for delete
  using (
    id <> auth.uid()
    and org_id = ((auth.jwt() ->> 'org_id')::uuid)
    and (auth.jwt() ->> 'user_role') = 'admin'
  );
