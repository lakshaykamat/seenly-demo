import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api/with-tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/projects/[id]
 *
 * Returns a project with its most recent completed run's scores.
 */
export const GET = withTenant(async (ctx, _request, params) => {
  const { id } = params;
  const admin = createAdminClient();

  const { data: project, error } = await admin
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .single();

  if (error || !project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch latest completed run for this project
  const { data: latestRun } = await admin
    .from("runs")
    .select("id, status, created_at")
    .eq("project_id", id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let latestScores = null;
  if (latestRun) {
    const { data: scores } = await admin
      .from("run_scores")
      .select("*")
      .eq("run_id", latestRun.id)
      .single();
    latestScores = scores ?? null;
  }

  return NextResponse.json({
    ...project,
    latest_run: latestRun ?? null,
    latest_scores: latestScores,
  });
});

/**
 * PATCH /api/projects/[id]
 *
 * Update project name, sector, or geo. Domain changes not allowed.
 * Admin only.
 */
export const PATCH = withTenant(
  async (ctx, request, params) => {
    const { id } = params;

    const body = (await request.json()) as {
      name?: string;
      sector?: string;
      geo?: string;
    };

    const admin = createAdminClient();

    // Verify project belongs to this org
    const { data: existing } = await admin
      .from("projects")
      .select("id")
      .eq("id", id)
      .eq("org_id", ctx.orgId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Build update payload (only allowed fields)
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) {
      if (body.name.trim().length === 0) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
      updates.name = body.name.trim();
    }
    if (body.sector !== undefined) {
      updates.sector = body.sector.trim() || null;
    }
    if (body.geo !== undefined) {
      updates.geo = body.geo.trim() || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const { data: updated, error } = await admin
      .from("projects")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      logger.error("Failed to update project", {
        userId: ctx.userId,
        tenantId: ctx.orgId,
        action: "projects.update_failed",
      });
      return NextResponse.json(
        { error: "Failed to update project" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  },
  { roles: ["admin"] }
);
