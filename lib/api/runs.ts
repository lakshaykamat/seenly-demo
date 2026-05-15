"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getCompetitors,
  getEvidence,
  getRun,
  listRuns,
} from "@/lib/mocks/store";

// ── Types ──────────────────────────────────────────────────

type RunStatus =
  | "pending"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

interface RunListItem {
  id: string;
  org_id: string;
  created_by: string;
  status: RunStatus;
  status_stage: string | null;
  project_id: string | null;
  config: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  seenly_score: number | null;
  project_name: string | null;
}

interface RunScores {
  run_id: string;
  avs_score: number | null;
  aeo_score: number | null;
  sentiment_score: number | null;
  seenly_score_base: number | null;
  seenly_score_final: number | null;
  penalties_applied: unknown[];
  avs_confidence: number | null;
  aeo_confidence: number | null;
  completed_at: string;
}

interface RunDetail {
  id: string;
  org_id: string;
  created_by: string;
  status: RunStatus;
  status_stage: string | null;
  project_id: string | null;
  config: Record<string, unknown> | null;
  results_meta: {
    crawl_status?: "fallback";
    duration_ms?: number;
    ai_calls?: number;
    tokens_in?: number;
    tokens_out?: number;
    error?: string;
    traceback?: string;
  } | null;
  created_at: string;
  updated_at: string;
  scores: RunScores | null;
  project_name: string | null;
  summary: {
    total_queries: number;
    total_pages: number;
    total_competitors: number;
  };
}

interface AiResult {
  id: string;
  run_id: string;
  query: string;
  query_source: string;
  engine: string;
  position: number | null;
  cited_domain: string | null;
  snippet: string | null;
  sentiment: "favorable" | "neutral" | "cautious" | "unfavorable" | null;
  is_target: boolean;
  is_degraded: boolean;
}

interface CrawlPage {
  id: string;
  run_id: string;
  url: string;
  crawl_status: "ok" | "partial" | "blocked" | "unreachable";
  confidence: number | null;
  extraction_method: "html" | "js_render" | null;
  text_length: number | null;
  h1: string | null;
  h2s: string[] | null;
  has_faq: boolean;
  has_schema: boolean;
  schema_types: string[] | null;
  internal_link_count: number | null;
  page_quality_score: number | null;
}

interface Evidence {
  ai_results: AiResult[];
  crawl_pages: CrawlPage[];
}

interface Competitor {
  id: string;
  run_id: string;
  domain: string;
  mention_count: number;
  query_count: number;
  avg_position: number | null;
}

// ── Hooks ──────────────────────────────────────────────────

export function useRuns() {
  return useQuery<RunListItem[]>({
    queryKey: ["runs"],
    queryFn: () => listRuns(),
    refetchInterval: (query) => {
      const runs = query.state.data;
      const hasActive = runs?.some(
        (r) =>
          r.status === "pending" ||
          r.status === "queued" ||
          r.status === "running"
      );
      // Stop polling if all runs are terminal (completed, failed, cancelled)
      return hasActive ? 5000 : false;
    },
  });
}

export function useRun(id: string) {
  return useQuery<RunDetail>({
    queryKey: ["run", id],
    queryFn: () => getRun(id),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      // Poll every 5s while processing
      if (status === "pending" || status === "queued" || status === "running") {
        return 5000;
      }
      return false; // Stop polling once terminal (completed, failed, cancelled)
    },
  });
}

export function useEvidence(id: string, enabled = true) {
  return useQuery<Evidence>({
    queryKey: ["run", id, "evidence"],
    queryFn: () => getEvidence(id),
    enabled,
  });
}

export function useCompetitors(id: string, enabled = true) {
  return useQuery<Competitor[]>({
    queryKey: ["run", id, "competitors"],
    queryFn: () => getCompetitors(id),
    enabled,
  });
}

export type {
  RunStatus,
  RunListItem,
  RunDetail,
  RunScores,
  AiResult,
  CrawlPage,
  Evidence,
  Competitor,
};
