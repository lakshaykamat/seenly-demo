import type { Role } from "./roles";
import type { Plan } from "./plans";

/** Server-side tenant context resolved from session + admin lookup */
export interface TenantContext {
  userId: string;
  email: string;
  role: Role;
  orgId: string;
  orgName: string;
  plan: Plan;
}

/** Client-side user object (returned by /api/me, consumed by AuthProvider) */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  orgId: string;
  orgName: string;
  plan: Plan;
}
