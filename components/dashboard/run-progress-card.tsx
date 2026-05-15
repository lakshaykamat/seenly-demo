"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ProcessingStages } from "@/components/onboarding/processing-stages";
import {
  NEW_RUN_STAGES,
  NEW_RUN_TOTAL_MS_VALUE,
} from "@/lib/mocks/onboarding-stages";
import type { RunDetail } from "@/lib/api/runs";

interface RunProgressCardProps {
  run: RunDetail;
  domain: string;
}

export function RunProgressCard({ run, domain }: RunProgressCardProps) {
  const queryClient = useQueryClient();

  const handleDone = () => {
    queryClient.invalidateQueries({ queryKey: ["runs"] });
    queryClient.invalidateQueries({ queryKey: ["run", run.id] });
  };

  return (
    <ProcessingStages
      key={run.id}
      domain={domain}
      stages={NEW_RUN_STAGES}
      totalMs={NEW_RUN_TOTAL_MS_VALUE}
      onDone={handleDone}
      holdMs={600}
    />
  );
}
