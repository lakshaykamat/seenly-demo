"use client";

import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RunStatus } from "@/lib/api/runs";

const STATUS_VARIANT: Record<
  RunStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  queued: "outline",
  running: "secondary",
  completed: "default",
  failed: "destructive",
  cancelled: "outline",
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]} className="capitalize">
      {status === "running" && <Loader2 className="size-3 animate-spin" />}
      {status}
    </Badge>
  );
}
