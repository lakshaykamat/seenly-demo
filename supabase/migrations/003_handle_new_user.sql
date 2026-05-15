-- Trigger: when a new user signs up, create an org and a profile row
-- If a profile already exists (admin-invited user), skip org + profile creation
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_org_id uuid;
  existing_profile_id uuid;
begin
  -- Check if this user was pre-invited (profile already created by admin)
  select id into existing_profile_id
  from public.profiles
  where id = new.id;

  -- If profile exists, user was invited — skip org/profile creation
  if existing_profile_id is not null then
    return new;
  end if;

  -- Self-signup: create a new organization for the user
  insert into public.organizations (name, slug)
  values (
    coalesce(new.raw_user_meta_data ->> 'org_name', split_part(new.email, '@', 1)),
    new.id::text
  )
  returning id into new_org_id;

  -- Create profile with admin role (they own the org)
  insert into public.profiles (id, org_id, role)
  values (new.id, new_org_id, 'admin');

  return new;
end;
$$ language plpgsql security definer;

-- Grant execute to supabase_auth_admin so the trigger can fire
grant execute on function public.handle_new_user() to supabase_auth_admin;

-- Grant table access needed by the trigger function
grant insert on public.organizations to supabase_auth_admin;
grant insert on public.profiles to supabase_auth_admin;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
