import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api/with-tenant";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/run/[id]/competitors
 *
 * Returns all detected competitors for a run.
 */
export const GET = withTenant(async (ctx, _request, params) => {
  const { id } = params;
  const admin = createAdminClient();

  // Verify run belongs to this org
  const { data: run } = await admin
    .from("runs")
    .select("id")
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .single();

  if (!run) {
    return NextResponse.json({ error: "Run not found" }, { status: 404 });
  }

  const { data: competitors } = await admin
    .from("competitors")
    .select("*")
    .eq("run_id", id)
    .order("mention_count", { ascending: false });

  return NextResponse.json(competitors ?? []);
});
