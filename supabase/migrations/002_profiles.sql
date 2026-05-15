-- Create profiles table linked to auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  role text not null default 'analyst' check (role in ('admin', 'analyst', 'executive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index for RLS lookups by org_id
create index profiles_org_id_idx on public.profiles(org_id);

-- Auto-update updated_at
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();
