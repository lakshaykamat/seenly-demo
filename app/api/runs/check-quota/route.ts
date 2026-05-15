import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api/with-tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_LIMITS } from "@/constants";
import { logger } from "@/lib/logger";

/**
 * @swagger
 * /api/runs/check-quota:
 *   get:
 *     tags: [Runs]
 *     summary: Check run quota
 *     description: Returns current run usage and limit for the org's plan.
 *     responses:
 *       200:
 *         description: Quota status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 allowed: { type: boolean }
 *                 used: { type: integer }
 *                 limit: { type: integer, description: "-1 = unlimited" }
 *                 plan: { type: string, enum: [starter, growth, enterprise] }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
export const GET = withTenant(async (ctx) => {
  const limit = PLAN_LIMITS[ctx.plan].runsPerMonth;

  // Unlimited plan
  if (limit === -1) {
    return NextResponse.json({
      allowed: true,
      used: 0,
      limit: -1,
      plan: ctx.plan,
    });
  }

  // Count runs this month for the org
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const admin = createAdminClient();
  const { count, error } = await admin
    .from("runs")
    .select("*", { count: "exact", head: true })
    .eq("org_id", ctx.orgId)
    .gte("created_at", startOfMonth.toISOString());

  if (error) {
    logger.error("Failed to count runs", {
      userId: ctx.userId,
      tenantId: ctx.orgId,
      action: "runs.check_quota",
    });
    return NextResponse.json(
      { error: "Failed to check quota" },
      { status: 500 }
    );
  }

  const used = count ?? 0;
  const allowed = used < limit;

  if (!allowed) {
    logger.info("Run quota exceeded", {
      userId: ctx.userId,
      tenantId: ctx.orgId,
      action: "runs.quota_exceeded",
    });
  }

  return NextResponse.json({ allowed, used, limit, plan: ctx.plan });
});
