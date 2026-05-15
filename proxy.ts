import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { ROLE_ROUTE_ACCESS } from "@/constants";
import type { Role } from "@/types";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/callback",
  "/unauthorized",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function isRoleAllowed(pathname: string, role: Role): boolean {
  for (const [prefix, allowedRoles] of Object.entries(ROLE_ROUTE_ACCESS)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) {
      return allowedRoles.includes(role);
    }
  }
  // No restriction defined — allow all authenticated users
  return true;
}

/** Decode JWT payload without verification (session is already verified by Supabase) */
function decodeJwtClaims(
  token: string
): Record<string, unknown> {
  const base64 = token.split(".")[1];
  return JSON.parse(Buffer.from(base64, "base64").toString());
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets and API routes (API routes handle their own auth)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const { supabase, user, response } = await updateSession(request);

  // Public routes — allow through
  if (isPublicPath(pathname)) {
    // If logged in and visiting auth pages, redirect appropriately
    if (user && ["/login", "/signup"].includes(pathname)) {
      // Check if user has an org before deciding where to redirect
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const claims = session?.access_token
        ? decodeJwtClaims(session.access_token)
        : null;
      const hasOrg =
        claims?.org_id !== null &&
        claims?.org_id !== undefined &&
        claims?.org_id !== "null";

      return NextResponse.redirect(
        new URL(hasOrg ? "/dashboard" : "/onboarding", request.url)
      );
    }
    return response;
  }

  // Protected routes — require auth
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Read org_id and role from JWT claims (the hook sets them at the root level)
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const claims = session?.access_token
    ? decodeJwtClaims(session.access_token)
    : null;
  const orgId = claims?.org_id ?? null;
  const userRole = (claims?.user_role as string) ?? null;

  const isOnboarding =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");
  const hasOrg =
    orgId !== null && orgId !== undefined && orgId !== "null";

  // User needs onboarding but is not on /onboarding → redirect
  if (!hasOrg && !isOnboarding) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // Note: we intentionally do NOT redirect /onboarding → /dashboard here.
  // The onboarding page checks /api/me itself and redirects if the user is
  // already onboarded. Doing it in middleware causes a redirect loop when
  // the JWT has a stale org_id (e.g. profile deleted after login).

  // Role-based route protection (only for users with orgs)
  if (
    hasOrg &&
    userRole &&
    userRole !== "none" &&
    !isRoleAllowed(pathname, userRole as Role)
  ) {
    return NextResponse.redirect(new URL("/unauthorized", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
