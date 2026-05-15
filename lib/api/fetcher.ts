import {
  createProject,
  createRun,
  getCompetitors,
  getEvidence,
  getQuota,
  getRun,
  getSettings,
  listMembers,
  listProjects,
  listRuns,
  regenerateInviteCode,
  deleteAccount,
  retryRun,
  cancelRun,
  updateMemberRole,
  getCurrentUser,
} from "@/lib/mocks/store";
import type { Member } from "@/types";

interface RetryBody {
  action: "retry" | "cancel";
}

export async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const body = init?.body ? safeParse(init.body) : undefined;
  return route(url, method, body) as Promise<T>;
}

async function route(
  url: string,
  method: string,
  body: unknown
): Promise<unknown> {
  const path = url.split("?")[0];

  if (path === "/api/me" && method === "GET") return getCurrentUser();
  if (path === "/api/runs/check-quota" && method === "GET") return getQuota();

  if (path === "/api/projects" && method === "GET") return listProjects();
  if (path === "/api/projects" && method === "POST") {
    const input = body as {
      domain: string;
      name: string;
      sector?: string | null;
      geo?: string | null;
    };
    return createProject(input);
  }

  if (path === "/api/run" && method === "GET") return listRuns();
  if (path === "/api/run" && method === "POST") {
    const input = body as { projectId: string | null; userQueries?: string[] };
    return createRun(input);
  }

  const runMatch = path.match(/^\/api\/run\/([^/]+)$/);
  if (runMatch) {
    const id = runMatch[1];
    if (method === "GET") return getRun(id);
    if (method === "POST") {
      const { action } = body as RetryBody;
      if (action === "retry") return retryRun(id).then(() => ({ ok: true }));
      if (action === "cancel") return cancelRun(id).then(() => ({ ok: true }));
    }
  }

  const evidenceMatch = path.match(/^\/api\/run\/([^/]+)\/evidence$/);
  if (evidenceMatch && method === "GET") return getEvidence(evidenceMatch[1]);

  const competitorsMatch = path.match(/^\/api\/run\/([^/]+)\/competitors$/);
  if (competitorsMatch && method === "GET")
    return getCompetitors(competitorsMatch[1]);

  if (path === "/api/members" && method === "GET") return listMembers();
  const memberMatch = path.match(/^\/api\/members\/([^/]+)$/);
  if (memberMatch && method === "PATCH") {
    const { role } = body as { role: Member["role"] };
    return updateMemberRole(memberMatch[1], role);
  }

  if (path === "/api/admin/settings" && method === "GET") return getSettings();
  if (path === "/api/admin/settings" && method === "PATCH")
    return regenerateInviteCode();

  if (path === "/api/account/delete" && method === "DELETE") {
    return deleteAccount().then(() => ({ ok: true }));
  }

  throw new Error(`Unhandled mock route: ${method} ${path}`);
}

function safeParse(body: BodyInit): unknown {
  if (typeof body !== "string") return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
}
