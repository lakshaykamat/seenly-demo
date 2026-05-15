import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api/with-tenant";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/run/[id]/evidence
 *
 * Returns all ai_results and crawl_pages for a run.
 * No pagination for V1 — simple flat dump.
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

  // Fetch AI results and crawl pages in parallel
  const [aiRes, crawlRes] = await Promise.all([
    admin
      .from("ai_results")
      .select(
        "id, run_id, query, query_source, query_type, engine, position, cited_domain, snippet, sentiment, is_target, is_degraded"
      )
      .eq("run_id", id)
      .order("query")
      .order("engine")
      .order("position"),
    admin
      .from("crawl_pages")
      .select(
        "id, run_id, url, crawl_status, confidence, extraction_method, text_length, h1, h2s, has_faq, has_schema, schema_types, internal_link_count, page_quality_score"
      )
      .eq("run_id", id)
      .order("page_quality_score", { ascending: false }),
  ]);

  return NextResponse.json({
    ai_results: aiRes.data ?? [],
    crawl_pages: crawlRes.data ?? [],
  });
});
