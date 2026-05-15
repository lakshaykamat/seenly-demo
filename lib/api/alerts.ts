"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAlertRule,
  deleteAlertRule,
  listAlertRules,
  testFireAlertRule,
  updateAlertRule,
} from "@/lib/mocks/store";
import type { AlertRule, AlertChannel } from "@/lib/mocks/alerts";

const KEY = ["alerts", "rules"] as const;

export function useAlertRules() {
  return useQuery<AlertRule[]>({
    queryKey: KEY,
    queryFn: () => listAlertRules(),
    staleTime: 30_000,
  });
}

export function useCreateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      description: string;
      category: AlertRule["category"];
      severity: AlertRule["severity"];
      threshold: AlertRule["threshold"];
      scope: string;
      channels: AlertChannel[];
    }) => createAlertRule(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      patch: Partial<
        Pick<
          AlertRule,
          "enabled" | "muted" | "mutedUntil" | "channels" | "severity" | "name" | "description"
        >
      >;
    }) => updateAlertRule(input.id, input.patch),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<AlertRule[]>(KEY);
      if (previous) {
        qc.setQueryData<AlertRule[]>(
          KEY,
          previous.map((r) => (r.id === input.id ? { ...r, ...input.patch } : r))
        );
      }
      return { previous };
    },
    onError: (_e, _i, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDeleteAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAlertRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useTestFireAlertRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => testFireAlertRule(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export type { AlertRule, AlertChannel };
