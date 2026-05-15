import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * @swagger
 * /api/onboarding/join-org:
 *   post:
 *     tags: [Onboarding]
 *     summary: Join organization
 *     description: Joins an existing organization using an invite code. User must not already be in an org.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [inviteCode]
 *             properties:
 *               inviteCode: { type: string }
 *     responses:
 *       200:
 *         description: Joined organization
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orgId: { type: string }
 *                 orgName: { type: string }
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Invalid invite code
 *       409:
 *         description: Already in an organization
 *       500:
 *         description: Internal server error
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verify user needs onboarding (org_id is NULL)
  const { data: profile } = await admin
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (profile.org_id !== null) {
    return NextResponse.json(
      { error: "Already in an organization" },
      { status: 409 }
    );
  }

  const body = await request.json();
  const { inviteCode } = body as { inviteCode?: string };

  if (!inviteCode || inviteCode.trim().length === 0) {
    return NextResponse.json(
      { error: "Invite code is required" },
      { status: 400 }
    );
  }

  // Find org by invite code
  const { data: org } = await admin
    .from("organizations")
    .select("id, name")
    .eq("invite_code", inviteCode.trim().toLowerCase())
    .maybeSingle();

  if (!org) {
    logger.warn("Invalid invite code used", {
      userId: user.id,
      action: "onboarding.invalid_invite",
    });
    return NextResponse.json(
      { error: "Invalid invite code" },
      { status: 404 }
    );
  }

  // Assign user to org as analyst (safe default for joiners)
  const { error: updateError } = await admin
    .from("profiles")
    .update({ org_id: org.id, role: "analyst" })
    .eq("id", user.id);

  if (updateError) {
    logger.error("Failed to join organization", {
      userId: user.id,
      tenantId: org.id,
      action: "onboarding.join_failed",
    });
    return NextResponse.json(
      { error: "Failed to join organization" },
      { status: 500 }
    );
  }

  logger.info("User joined organization", {
    userId: user.id,
    tenantId: org.id,
    action: "onboarding.org_joined",
  });
  return NextResponse.json({ orgId: org.id, orgName: org.name });
}
