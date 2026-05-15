"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addPromptToSet, listPromptSets } from "@/lib/mocks/store";
import type { MonitoredPrompt } from "@/lib/mocks/aiCitations";
import type { PromptSet } from "@/lib/mocks/prompts";

const KEY = ["prompts", "sets"] as const;

export function usePromptSets() {
  return useQuery<{ sets: PromptSet[]; prompts: MonitoredPrompt[] }>({
    queryKey: KEY,
    queryFn: () => listPromptSets(),
    staleTime: 60_000,
  });
}

export function useAddPromptToSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { text: string; setId: string }) =>
      addPromptToSet(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export type { PromptSet, MonitoredPrompt };
