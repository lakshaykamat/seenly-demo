import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { logger } from "@/lib/logger";
import type { TenantContext, Role } from "@/types";

type RouteParams = Record<string, string>;

type TenantHandler = (
  ctx: TenantContext,
  request: Request,
  params: RouteParams
) => Promise<NextResponse>;

interface Options {
  /** If set, only these roles are allowed to call the endpoint */
  roles?: Role[];
}

/**
 * Wraps an API route handler with tenant authentication and optional RBAC.
 * Resolves Next.js route params and forwards them to the handler.
 *
 * @example
 * export const GET = withTenant(async (ctx, _req, params) => {
 *   const { id } = params;
 *   return NextResponse.json({ id });
 * });
 */
export function withTenant(handler: TenantHandler, options?: Options) {
  return async (
    request: Request,
    context?: { params?: Promise<RouteParams> }
  ): Promise<NextResponse> => {
    const ctx = await getTenantContext();

    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (options?.roles && !options.roles.includes(ctx.role)) {
      logger.warn("Access denied", {
        userId: ctx.userId,
        tenantId: ctx.orgId,
        action: "rbac.denied",
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      const params = (await context?.params) ?? {};
      return await handler(ctx, request, params);
    } catch (err) {
      logger.error("Unhandled API error", {
        userId: ctx.userId,
        tenantId: ctx.orgId,
        action: "api.unhandled_error",
        message: err instanceof Error ? err.message : String(err),
      });
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
