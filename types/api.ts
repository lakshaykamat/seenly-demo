import type { Plan } from "./plans";
import type { Role } from "./roles";

/** Response from /api/runs/check-quota */
export interface QuotaResponse {
  allowed: boolean;
  used: number;
  limit: number;
  plan: Plan;
}

/** Standard API error response */
export interface ApiError {
  error: string;
}

/** Member object returned by GET /api/members */
export interface Member {
  id: string;
  email: string;
  role: Role;
  createdAt: string;
}

/** Org settings returned by GET /api/admin/settings */
export interface OrgSettings {
  id: string;
  name: string;
  slug: string;
  plan: Plan;
  inviteCode: string;
}
