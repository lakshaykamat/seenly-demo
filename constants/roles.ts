import type { Role } from "@/types";

export const ROLES = ["admin", "analyst", "executive"] as const;

/** Roles that an admin can assign to members */
export const ASSIGNABLE_ROLES: Role[] = ["analyst", "executive"];

/** Which roles can access which route prefixes (used by proxy + sidebar) */
export const ROLE_ROUTE_ACCESS: Record<string, Role[]> = {
  "/settings": ["admin"],
  "/members": ["admin"],
  "/runs": ["admin", "analyst"],
};

/** Which roles can perform which server actions */
export const ROLE_ACTION_ACCESS: Record<string, Role[]> = {
  "org:update": ["admin"],
  "run:create": ["admin", "analyst"],
  "report:view": ["admin", "analyst", "executive"],
};
