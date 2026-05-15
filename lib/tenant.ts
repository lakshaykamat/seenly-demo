import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TenantContext, Role, Plan } from "@/types";

export type { TenantContext };

/**
 * Resolves the full tenant context for the current authenticated user.
 * Authenticates via cookie session, then uses the admin client to
 * look up profile + org (bypassing RLS to avoid recursion).
 *
 * Returns `null` if not authenticated or profile is missing.
 */
export async function getTenantContext(): Promise<TenantContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: org } = await admin
    .from("organizations")
    .select("name, plan")
    .eq("id", profile.org_id)
    .maybeSingle();

  return {
    userId: user.id,
    email: user.email ?? "",
    role: profile.role as Role,
    orgId: profile.org_id,
    orgName: (org?.name as string) ?? "My Organization",
    plan: (org?.plan ?? "starter") as Plan,
  };
}
