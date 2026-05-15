"use client";

import { useQuery } from "@tanstack/react-query";
import { fetcher } from "./fetcher";

// ── Types ──────────────────────────────────────────────────

interface Project {
  id: string;
  org_id: string;
  domain: string;
  name: string;
  sector: string | null;
  geo: string | null;
  created_at: string;
}

// ── Hooks ──────────────────────────────────────────────────

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => fetcher("/api/projects"),
  });
}

export type { Project };
