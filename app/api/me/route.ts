import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { Role, Plan } from "@/types";

/**
 * @swagger
 * /api/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     description: Returns the authenticated user's profile and org info.
 *     responses:
 *       200:
 *         description: User profile or needsOnboarding
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     id: { type: string }
 *                     email: { type: string }
 *                     role: { type: string, enum: [admin, analyst, executive] }
 *                     orgId: { type: string }
 *                     orgName: { type: string }
 *                     plan: { type: string, enum: [starter, growth, enterprise] }
 *                 - type: object
 *                   properties:
 *                     needsOnboarding: { type: boolean }
 *       401:
 *         description: Unauthorized
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logger.warn("Unauthenticated /api/me request", { action: "me.unauthorized" });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // Profile missing but user is authenticated — trigger was likely missed at signup.
    // Send to onboarding rather than 401 to avoid a redirect loop.
    logger.warn("Profile not found — redirecting to onboarding", { userId: user.id, action: "me.no_profile" });
    return NextResponse.json({ needsOnboarding: true });
  }

  // User exists but hasn't completed onboarding
  if (!profile.org_id) {
    logger.info("User needs onboarding", { userId: user.id, action: "me.needs_onboarding" });
    return NextResponse.json({ needsOnboarding: true });
  }

  const { data: org } = await admin
    .from("organizations")
    .select("name, plan")
    .eq("id", profile.org_id)
    .maybeSingle();

  return NextResponse.json({
    id: user.id,
    email: user.email ?? "",
    role: profile.role as Role,
    orgId: profile.org_id,
    orgName: (org?.name as string) ?? "My Organization",
    plan: (org?.plan ?? "starter") as Plan,
  });
}
