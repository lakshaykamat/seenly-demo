import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api/with-tenant";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * PATCH /api/run/[id]
 *
 * Supported actions:
 *   { "action": "cancel" } — mark a pending/running run as cancelled
 */
export const PATCH = withTenant(async (ctx, request, params) => {
  const { id } = params;
  const body = await request.json().catch(() => ({}));

  if (body.action !== "cancel") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify ownership and current status
  const { data: run, error: runError } = await admin
    .from("runs")
    .select("id, status, org_id")
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  if (!["pending", "running"].includes(run.status)) {
    return NextResponse.json(
      { error: `Cannot cancel a run with status '${run.status}'` },
      { status: 409 }
    );
  }

  const { error: updateError } = await admin
    .from("runs")
    .update({ status: "cancelled" })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to cancel run" }, { status: 500 });
  }

  return NextResponse.json({ id, status: "cancelled" });
});

/**
 * GET /api/run/[id]
 *
 * Returns a single run with scores, config, and summary counts.
 * Verifies the run belongs to the caller's org.
 */
export const GET = withTenant(async (ctx, _request, params) => {
  const { id } = params;
  const admin = createAdminClient();

  // Fetch run + verify org ownership
  const { data: run, error: runError } = await admin
    .from("runs")
    .select("*")
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  // Fetch scores (may not exist if run hasn't completed)
  const { data: scores } = await admin
    .from("run_scores")
    .select("*")
    .eq("run_id", id)
    .single();

  // Summary counts
  const [
    { count: queryCount },
    { count: pageCount },
    { count: competitorCount },
  ] = await Promise.all([
    admin
      .from("ai_results")
      .select("*", { count: "exact", head: true })
      .eq("run_id", id),
    admin
      .from("crawl_pages")
      .select("*", { count: "exact", head: true })
      .eq("run_id", id),
    admin
      .from("competitors")
      .select("*", { count: "exact", head: true })
      .eq("run_id", id),
  ]);

  // Fetch project name if linked
  let projectName: string | null = null;
  if (run.project_id) {
    const { data: project } = await admin
      .from("projects")
      .select("name")
      .eq("id", run.project_id)
      .single();
    projectName = project?.name ?? null;
  }

  return NextResponse.json({
    ...run,
    scores: scores ?? null,
    project_name: projectName,
    summary: {
      total_queries: queryCount ?? 0,
      total_pages: pageCount ?? 0,
      total_competitors: competitorCount ?? 0,
    },
  });
});
