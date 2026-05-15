-- 1. Make org_id nullable to support "pending onboarding" state
ALTER TABLE public.profiles
  ALTER COLUMN org_id DROP NOT NULL;

-- 2. Add invite_code column to organizations for join-by-code flow
ALTER TABLE public.organizations
  ADD COLUMN invite_code text UNIQUE DEFAULT substr(md5(random()::text), 1, 8);

-- Backfill existing orgs with unique invite codes
UPDATE public.organizations
SET invite_code = substr(md5(random()::text || id::text), 1, 8)
WHERE invite_code IS NULL;

-- Index for fast invite code lookups
CREATE INDEX organizations_invite_code_idx ON public.organizations(invite_code);

-- 3. Replace handle_new_user trigger function
--    Now only creates a profile with NULL org_id (pending onboarding)
--    Invited users (profile already exists) are still skipped
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  existing_profile_id uuid;
BEGIN
  -- Check if this user was pre-invited (profile already created by admin)
  SELECT id INTO existing_profile_id
  FROM public.profiles
  WHERE id = new.id;

  -- If profile exists, user was invited — skip
  IF existing_profile_id IS NOT NULL THEN
    RETURN new;
  END IF;

  -- Self-signup: create profile with NULL org_id (pending onboarding)
  INSERT INTO public.profiles (id, org_id, role)
  VALUES (new.id, NULL, 'admin');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update JWT hook to handle null org_id (onboarding users)
--    Previously: null org_id OR null role → set both to null/"none"
--    Now: set them independently so onboarding users keep their role
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb AS $$
DECLARE
  claims jsonb;
  user_org_id uuid;
  user_role text;
BEGIN
  claims := event -> 'claims';

  -- Look up org_id and role from profiles
  SELECT org_id, role INTO user_org_id, user_role
  FROM public.profiles
  WHERE id = (event ->> 'user_id')::uuid;

  -- Set org_id (null for onboarding users, uuid for established users)
  IF user_org_id IS NULL THEN
    claims := jsonb_set(claims, '{org_id}', 'null'::jsonb);
  ELSE
    claims := jsonb_set(claims, '{org_id}', to_jsonb(user_org_id));
  END IF;

  -- Set user_role (independent of org_id)
  IF user_role IS NULL THEN
    claims := jsonb_set(claims, '{user_role}', '"none"'::jsonb);
  ELSE
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
