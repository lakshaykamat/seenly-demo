"use client";

import { useQuery } from "@tanstack/react-query";
import { listProjects } from "@/lib/mocks/store";

interface Project {
  id: string;
  org_id: string;
  domain: string;
  name: string;
  sector: string | null;
  geo: string | null;
  created_at: string;
}

export function useProjects() {
  return useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => listProjects(),
  });
}

export type { Project };
