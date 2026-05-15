"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeRuns } from "@/lib/mocks/store";

/**
 * Subscribe to run-state changes from the mock store and invalidate
 * relevant React Query caches so the UI reflects stage transitions
 * without waiting for the next polling tick.
 */
export function useLiveRuns() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const unsubscribe = subscribeRuns((runId) => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      queryClient.invalidateQueries({ queryKey: ["run", runId] });
    });
    return unsubscribe;
  }, [queryClient]);
}
