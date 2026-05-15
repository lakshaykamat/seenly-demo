import { NextResponse } from "next/server";
import { withTenant } from "@/lib/api/with-tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * GET /api/projects
 *
 * List all projects in the org.
 */
export const GET = withTenant(async (ctx) => {
  const admin = createAdminClient();

  const { data: projects, error } = await admin
    .from("projects")
    .select("*")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load projects" },
      { status: 500 }
    );
  }

  return NextResponse.json(projects ?? []);
});

/**
 * POST /api/projects
 *
 * Create a new project. Requires admin or analyst role.
 * Body: { domain, name, sector?, geo? }
 */
export const POST = withTenant(
  async (ctx, request) => {
    const body = (await request.json()) as {
      domain?: string;
      name?: string;
      sector?: string;
      geo?: string;
    };

    // Validate required fields
    if (!body.domain || body.domain.trim().length === 0) {
      return NextResponse.json(
        { error: "Domain is required" },
        { status: 400 }
      );
    }
    if (!body.name || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }

    // Normalize domain: strip protocol and trailing slash
    let domain = body.domain.trim().toLowerCase();
    domain = domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/+$/, "");

    const admin = createAdminClient();

    const { data: project, error } = await admin
      .from("projects")
      .insert({
        org_id: ctx.orgId,
        domain,
        name: body.name.trim(),
        sector: body.sector?.trim() || null,
        geo: body.geo?.trim() || null,
      })
      .select("*")
      .single();

    if (error) {
      logger.error("Failed to create project", {
        userId: ctx.userId,
        tenantId: ctx.orgId,
        action: "projects.create_failed",
      });
      return NextResponse.json(
        { error: "Failed to create project" },
        { status: 500 }
      );
    }

    return NextResponse.json(project, { status: 201 });
  },
  { roles: ["admin", "analyst"] }
);
