-- Custom claim hook: inject org_id into JWT app_metadata
-- This function is called by Supabase Auth on token creation
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb as $$
declare
  claims jsonb;
  user_org_id uuid;
  user_role text;
begin
  claims := event -> 'claims';

  -- Look up org_id and role from profiles
  select org_id, role into user_org_id, user_role
  from public.profiles
  where id = (event ->> 'user_id')::uuid;

  -- Handle missing profile (deleted user, orphan auth record)
  if user_org_id is null or user_role is null then
    claims := jsonb_set(claims, '{org_id}', 'null'::jsonb);
    claims := jsonb_set(claims, '{user_role}', '"none"'::jsonb);
  else
    claims := jsonb_set(claims, '{org_id}', to_jsonb(user_org_id));
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  end if;

  -- Update the event with modified claims
  event := jsonb_set(event, '{claims}', claims);

  return event;
end;
$$ language plpgsql stable security definer;

-- Grant execute to supabase_auth_admin so the hook can be called
grant execute on function public.custom_access_token_hook to supabase_auth_admin;

-- Revoke from public
revoke execute on function public.custom_access_token_hook from public;

-- Grant read access on profiles to supabase_auth_admin for the hook
grant select on public.profiles to supabase_auth_admin;
