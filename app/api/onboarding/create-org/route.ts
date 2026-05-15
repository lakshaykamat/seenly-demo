import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * @swagger
 * /api/onboarding/create-org:
 *   post:
 *     tags: [Onboarding]
 *     summary: Create organization
 *     description: Creates a new organization and assigns the user as admin. User must not already be in an org.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: Organization created
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
 *         description: Profile not found
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

  // Check if user already has an org (profile may be missing if trigger failed at signup)
  const { data: profile } = await admin
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.org_id) {
    return NextResponse.json(
      { error: "Already in an organization" },
      { status: 409 }
    );
  }

  const body = await request.json();
  const { name } = body as { name?: string };

  if (!name || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Organization name is required" },
      { status: 400 }
    );
  }

  // Create org with slugified name
  const slug =
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || user.id;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: name.trim(), slug })
    .select("id")
    .single();

  if (orgError) {
    logger.error("Failed to create organization", {
      userId: user.id,
      action: "onboarding.create_org_failed",
    });
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 }
    );
  }

  // Assign user to org as admin — upsert handles both missing profile (trigger failed at signup)
  // and existing profile with null org_id (normal onboarding flow)
  const { error: profileError } = await admin
    .from("profiles")
    .upsert(
      { id: user.id, org_id: org.id, role: "admin" },
      { onConflict: "id" }
    );

  if (profileError) {
    await admin.from("organizations").delete().eq("id", org.id);
    logger.error("Failed to assign user to org", {
      userId: user.id,
      tenantId: org.id,
      action: "onboarding.assign_failed",
    });
    return NextResponse.json(
      { error: "Failed to assign organization" },
      { status: 500 }
    );
  }

  logger.info("Organization created", {
    userId: user.id,
    tenantId: org.id,
    action: "onboarding.org_created",
  });
  return NextResponse.json(
    { orgId: org.id, orgName: name.trim() },
    { status: 201 }
  );
}
