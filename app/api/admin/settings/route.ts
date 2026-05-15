import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api/with-tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * @swagger
 * /api/admin/settings:
 *   get:
 *     tags: [Admin]
 *     summary: Get org settings
 *     description: Returns organization settings. Admin only.
 *     responses:
 *       200:
 *         description: Organization settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 name: { type: string }
 *                 slug: { type: string }
 *                 plan: { type: string, enum: [starter, growth, enterprise] }
 *                 inviteCode: { type: string }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   patch:
 *     tags: [Admin]
 *     summary: Update org settings
 *     description: Updates organization name, slug, or regenerates invite code. Admin only.
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               slug: { type: string }
 *               regenerateInviteCode: { type: boolean }
 *     responses:
 *       200:
 *         description: Updated settings
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 name: { type: string }
 *                 slug: { type: string }
 *                 plan: { type: string }
 *                 inviteCode: { type: string }
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const GET = withTenant(
  async (ctx) => {
    const admin = createAdminClient();

    const { data: org, error } = await admin
      .from("organizations")
      .select("*")
      .eq("id", ctx.orgId)
      .single();

    if (error || !org) {
      logger.error("Failed to load org settings", {
        userId: ctx.userId,
        tenantId: ctx.orgId,
        action: "admin.settings.load_failed",
      });
      return NextResponse.json(
        { error: "Failed to load settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      inviteCode: org.invite_code,
    });
  },
  { roles: ["admin"] }
);

export const PATCH = withTenant(
  async (ctx, request) => {
    const body = (await request.json()) as {
      name?: string;
      slug?: string;
      regenerateInviteCode?: boolean;
    };
    const updates: Record<string, string> = {};

    if (body.name && body.name.trim().length > 0) {
      updates.name = body.name.trim();
    }
    if (body.slug && body.slug.trim().length > 0) {
      updates.slug = body.slug.trim().toLowerCase();
    }
    if (body.regenerateInviteCode) {
      updates.invite_code = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: org, error } = await admin
      .from("organizations")
      .update(updates)
      .eq("id", ctx.orgId)
      .select("*")
      .single();

    if (error) {
      logger.error("Failed to update org settings", {
        userId: ctx.userId,
        tenantId: ctx.orgId,
        action: "admin.settings.update_failed",
      });
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    logger.info("Org settings updated", {
      userId: ctx.userId,
      tenantId: ctx.orgId,
      action: "admin.settings.updated",
    });

    return NextResponse.json({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      inviteCode: org.invite_code,
    });
  },
  { roles: ["admin"] }
);
