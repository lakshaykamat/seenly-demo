"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bulkUpdateRecommendations,
  listRecommendations,
  updateRecommendation,
} from "@/lib/mocks/store";
import type {
  Recommendation,
  RecommendationStatus,
} from "@/lib/mocks/recommendations";

const KEY = ["recommendations", "list"] as const;

export function useRecommendations() {
  return useQuery<Recommendation[]>({
    queryKey: KEY,
    queryFn: () => listRecommendations(),
    staleTime: 30_000,
  });
}

export function useUpdateRecommendation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      patch: Partial<Pick<Recommendation, "status" | "assigneeId" | "dueAt">>;
    }) => updateRecommendation(input.id, input.patch),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData<Recommendation[]>(KEY);
      if (previous) {
        qc.setQueryData<Recommendation[]>(
          KEY,
          previous.map((r) =>
            r.id === input.id
              ? { ...r, ...input.patch, updatedAt: new Date().toISOString() }
              : r
          )
        );
      }
      return { previous };
    },
    onError: (_err, _input, ctx) => {
      if (ctx?.previous) qc.setQueryData(KEY, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useBulkUpdateRecommendations() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      ids: string[];
      patch: Partial<Pick<Recommendation, "status" | "assigneeId">>;
    }) => bulkUpdateRecommendations(input.ids, input.patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export type { Recommendation, RecommendationStatus };
