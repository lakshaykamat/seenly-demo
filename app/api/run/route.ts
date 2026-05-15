import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api/with-tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_LIMITS } from "@/constants";
import { logger } from "@/lib/logger";

/**
 * @swagger
 * /api/run:
 *   get:
 *     tags: [Runs]
 *     summary: List runs
 *     description: Lists all runs for the authenticated user's organization.
 *     responses:
 *       200:
 *         description: List of runs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   org_id: { type: string }
 *                   created_by: { type: string }
 *                   created_at: { type: string, format: date-time }
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   post:
 *     tags: [Runs]
 *     summary: Create run
 *     description: Creates a new run. Requires admin or analyst role.
 *     responses:
 *       201:
 *         description: Run created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string }
 *                 org_id: { type: string }
 *                 created_by: { type: string }
 *                 created_at: { type: string, format: date-time }
 *       401:
 *         description: Unauthorized
 *       429:
 *         description: Monthly run limit reached
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string }
 *       500:
 *         description: Internal server error
 */
export const GET = withTenant(async (ctx) => {
  const admin = createAdminClient();

  // Fetch runs with scores and project name
  const { data: runs, error } = await admin
    .from("runs")
    .select("*")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load runs" }, { status: 500 });
  }

  if (!runs || runs.length === 0) {
    return NextResponse.json([]);
  }

  // Batch-fetch scores for all run IDs
  const runIds = runs.map((r: { id: string }) => r.id);
  const { data: allScores } = await admin
    .from("run_scores")
    .select("run_id, seenly_score_final")
    .in("run_id", runIds);

  const scoreMap = new Map(
    (allScores ?? []).map(
      (s: { run_id: string; seenly_score_final: number | null }) => [
        s.run_id,
        s.seenly_score_final,
      ]
    )
  );

  // Batch-fetch project names for linked runs
  const projectIds = [
    ...new Set(
      runs
        .map((r: { project_id: string | null }) => r.project_id)
        .filter(Boolean) as string[]
    ),
  ];
  let projectMap = new Map<string, string>();
  if (projectIds.length > 0) {
    const { data: projects } = await admin
      .from("projects")
      .select("id, name")
      .in("id", projectIds);
    projectMap = new Map(
      (projects ?? []).map((p: { id: string; name: string }) => [p.id, p.name])
    );
  }

  const enriched = runs.map(
    (run: { id: string; project_id: string | null }) => ({
      ...run,
      seenly_score: scoreMap.get(run.id) ?? null,
      project_name: run.project_id
        ? (projectMap.get(run.project_id) ?? null)
        : null,
    })
  );

  return NextResponse.json(enriched);
});

export const POST = withTenant(
  async (ctx, request) => {
    const admin = createAdminClient();
    const limit = PLAN_LIMITS[ctx.plan].runsPerMonth;

    const body = (await request.json().catch(() => ({}))) as {
      project_id?: string;
    };

    // Validate project_id belongs to this org (if provided)
    if (body.project_id) {
      const { data: project } = await admin
        .from("projects")
        .select("id")
        .eq("id", body.project_id)
        .eq("org_id", ctx.orgId)
        .single();

      if (!project) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
        );
      }
    }

    // Check quota (skip for unlimited plans)
    if (limit !== -1) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await admin
        .from("runs")
        .select("*", { count: "exact", head: true })
        .eq("org_id", ctx.orgId)
        .gte("created_at", startOfMonth.toISOString());

      if ((count ?? 0) >= limit) {
        logger.info("Run quota exceeded", {
          userId: ctx.userId,
          tenantId: ctx.orgId,
          action: "runs.quota_exceeded",
        });
        return NextResponse.json(
          { error: "Monthly run limit reached. Upgrade your plan." },
          { status: 429 }
        );
      }
    }

    const insertData: Record<string, unknown> = {
      org_id: ctx.orgId,
      created_by: ctx.userId,
      config: { plan_at_run_time: ctx.plan },
    };
    if (body.project_id) {
      insertData.project_id = body.project_id;
    }

    const { data: run, error } = await admin
      .from("runs")
      .insert(insertData)
      .select("*")
      .single();

    if (error) {
      logger.error("Failed to create run", {
        userId: ctx.userId,
        tenantId: ctx.orgId,
        action: "runs.create_failed",
      });
      return NextResponse.json(
        { error: "Failed to create run" },
        { status: 500 }
      );
    }

    return NextResponse.json(run, { status: 201 });
  },
  { roles: ["admin", "analyst"] }
);
