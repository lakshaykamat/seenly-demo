import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api/with-tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * @swagger
 * /api/members:
 *   get:
 *     tags: [Members]
 *     summary: List members
 *     description: Lists all members in the organization. Admin only.
 *     responses:
 *       200:
 *         description: List of members
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   email: { type: string }
 *                   role: { type: string, enum: [admin, analyst, executive] }
 *                   createdAt: { type: string, format: date-time }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const GET = withTenant(
  async (ctx) => {
    const admin = createAdminClient();

    const { data: profiles, error } = await admin
      .from("profiles")
      .select("id, role, created_at")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: true });

    if (error) {
      logger.error("Failed to load members", {
        userId: ctx.userId,
        tenantId: ctx.orgId,
        action: "members.load_failed",
      });
      return NextResponse.json(
        { error: "Failed to load members" },
        { status: 500 }
      );
    }

    // Fetch emails from auth.users for each profile
    const members = await Promise.all(
      (profiles ?? []).map(async (p) => {
        const {
          data: { user },
        } = await admin.auth.admin.getUserById(p.id);
        return {
          id: p.id,
          email: user?.email ?? "unknown",
          role: p.role,
          createdAt: p.created_at,
        };
      })
    );

    return NextResponse.json(members);
  },
  { roles: ["admin"] }
);
