"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  generateReport,
  getReport,
  listReports,
  regenerateReportShareToken,
  toggleReportShare,
} from "@/lib/mocks/store";
import type { Report } from "@/lib/mocks/reports";

const KEY = ["reports", "list"] as const;

export function useReports() {
  return useQuery<Report[]>({
    queryKey: KEY,
    queryFn: () => listReports(),
    staleTime: 60_000,
  });
}

export function useReport(id: string) {
  return useQuery<Report>({
    queryKey: ["reports", "detail", id],
    queryFn: () => getReport(id),
    staleTime: 60_000,
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      period: string;
      onProgress?: (pct: number, stage: string) => void;
    }) => generateReport(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useToggleReportShare() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleReportShare(id),
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["reports", "detail", report.id] });
    },
  });
}

export function useRegenerateReportShareToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => regenerateReportShareToken(id),
    onSuccess: (report) => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["reports", "detail", report.id] });
    },
  });
}

export type { Report };
