"use client";

import { Card, CardContent } from "@/components/ui/card";

interface UpgradeMessageProps {
  message?: string;
}

export function UpgradeMessage({
  message = "This feature is available on a higher plan.",
}: UpgradeMessageProps) {
  return (
    <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
      <CardContent className="flex items-center justify-between gap-4 py-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">{message}</p>
        <a
          href="/settings/billing"
          className="text-sm font-medium underline text-amber-800 dark:text-amber-200 hover:opacity-80"
        >
          Upgrade
        </a>
      </CardContent>
    </Card>
  );
}
