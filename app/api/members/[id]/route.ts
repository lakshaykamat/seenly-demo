import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api/with-tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { ASSIGNABLE_ROLES } from "@/constants";
import { logger } from "@/lib/logger";
import type { Role } from "@/types";

/**
 * @swagger
 * /api/members/{id}:
 *   patch:
 *     tags: [Members]
 *     summary: Update member role
 *     description: Updates a member's role. Admin only. Cannot change own role.
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: Member ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [analyst, executive]
 *                 description: New role
 *     responses:
 *       200:
 *         description: Role updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Member not found
 *       500:
 *         description: Internal server error
 */
export const PATCH = withTenant(
  async (ctx, request, params) => {
    const { id: memberId } = params;

    if (memberId === ctx.userId) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    const body = (await request.json()) as { role?: string };

    if (!body.role || !ASSIGNABLE_ROLES.includes(body.role as Role)) {
      return NextResponse.json(
        { error: `Role must be one of: ${ASSIGNABLE_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify member belongs to same org
    const { data: profile } = await admin
      .from("profiles")
      .select("org_id")
      .eq("id", memberId)
      .maybeSingle();

    if (!profile || profile.org_id !== ctx.orgId) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const { error } = await admin
      .from("profiles")
      .update({ role: body.role })
      .eq("id", memberId);

    if (error) {
      logger.error("Failed to update member role", {
        userId: ctx.userId,
        tenantId: ctx.orgId,
        action: "members.role_update_failed",
      });
      return NextResponse.json(
        { error: "Failed to update role" },
        { status: 500 }
      );
    }

    logger.info("Member role updated", {
      userId: ctx.userId,
      tenantId: ctx.orgId,
      action: "members.role_updated",
    });
    return NextResponse.json({ ok: true });
  },
  { roles: ["admin"] }
);
