"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addToWatchlist,
  listWatchlist,
  removeFromWatchlist,
  toggleWatchlistAlert,
} from "@/lib/mocks/store";
import {
  COMPETITOR_SCORES,
  MENTION_TIMELINE,
  TOP_GAPS,
  type CompetitorScores,
  type GapInsight,
  type MentionTrendPoint,
  type WatchlistEntry,
} from "@/lib/mocks/competitorsExt";

function delay(min = 220, max = 460): Promise<void> {
  return new Promise((r) =>
    setTimeout(r, Math.floor(min + Math.random() * (max - min)))
  );
}

export interface CompetitorRadarPayload {
  scores: CompetitorScores[];
  gaps: GapInsight[];
  mentionTimeline: MentionTrendPoint[];
}

export function useCompetitorRadar() {
  return useQuery<CompetitorRadarPayload>({
    queryKey: ["competitors", "radar"],
    queryFn: async () => {
      await delay();
      return {
        scores: COMPETITOR_SCORES,
        gaps: TOP_GAPS,
        mentionTimeline: MENTION_TIMELINE,
      };
    },
    staleTime: 60_000,
  });
}

const WATCH_KEY = ["competitors", "watchlist"] as const;

export function useWatchlist() {
  return useQuery<WatchlistEntry[]>({
    queryKey: WATCH_KEY,
    queryFn: () => listWatchlist(),
    staleTime: 30_000,
  });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { domain: string; name: string }) =>
      addToWatchlist(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: WATCH_KEY }),
  });
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeFromWatchlist(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: WATCH_KEY });
      const previous = qc.getQueryData<WatchlistEntry[]>(WATCH_KEY);
      if (previous) {
        qc.setQueryData(
          WATCH_KEY,
          previous.filter((w) => w.id !== id)
        );
      }
      return { previous };
    },
    onError: (_e, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(WATCH_KEY, ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: WATCH_KEY }),
  });
}

export function useToggleWatchlistAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => toggleWatchlistAlert(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: WATCH_KEY }),
  });
}

export type { WatchlistEntry, CompetitorScores };
