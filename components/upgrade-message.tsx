"use client";

import { Card, CardContent } from "@/components/ui/card";

interface UpgradeMessageProps {
  message?: string;
}

export function UpgradeMessage({
  message = "This feature is available on a higher plan.",
}: UpgradeMessageProps) {
  return (
    <Card className="border-warning/30 bg-warning/10">
      <CardContent className="flex items-center justify-between gap-4 py-3">
        <p className="text-sm text-warning">{message}</p>
        <a
          href="/settings/billing"
          className="text-sm font-medium underline text-warning hover:opacity-80"
        >
          Upgrade
        </a>
      </CardContent>
    </Card>
  );
}
