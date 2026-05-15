"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { fetcher } from "@/lib/api/fetcher";
import { Can } from "@/components/can";
import { UpgradeMessage } from "@/components/upgrade-message";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Settings, Play, BarChart3 } from "lucide-react";
import { NewRunDialog } from "@/components/dashboard/new-run-dialog";
import type { QuotaResponse } from "@/types";

export default function DashboardPage() {
  const { user, loading } = useAuth();

  const { data: quota } = useQuery({
    queryKey: ["quota"],
    queryFn: () => fetcher<QuotaResponse>("/api/runs/check-quota"),
    enabled: !!user,
  });

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2 mt-2">
          <Badge className="capitalize">{user?.role}</Badge>
          <Badge variant="outline" className="capitalize">
            {user?.plan} plan
          </Badge>
        </div>
      </div>

      {/* Quota */}
      {quota && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium">
                Monthly usage
              </CardTitle>
              {quota.limit !== -1 && (
                <span className="text-sm text-muted-foreground tabular-nums">
                  {quota.used} / {quota.limit} runs
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {quota.limit !== -1 && (
              <Progress
                value={Math.min((quota.used / quota.limit) * 100, 100)}
              />
            )}
            {quota.limit === -1 && (
              <p className="text-sm text-muted-foreground">
                Unlimited runs on your Enterprise plan.
              </p>
            )}
            {!quota.allowed && (
              <UpgradeMessage message="You've reached your monthly run limit. Upgrade to continue." />
            )}
          </CardContent>
        </Card>
      )}

      {/* Feature cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Can roles={["admin"]}>
          <Card className="group hover:border-primary/30 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Settings className="size-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Settings</CardTitle>
                  <CardDescription>
                    Manage members and org details.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href="/settings">
                <Button variant="outline" size="sm">Manage</Button>
              </Link>
            </CardContent>
          </Card>
        </Can>

        <Can roles={["admin", "analyst"]}>
          <Card className="group hover:border-primary/30 transition-colors">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Play className="size-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">Runs</CardTitle>
                  <CardDescription>
                    Create and manage analysis runs.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <NewRunDialog>
                <Button size="sm" disabled={quota != null && !quota.allowed}>
                  New run
                </Button>
              </NewRunDialog>
            </CardContent>
          </Card>
        </Can>

        <Card className="group hover:border-primary/30 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <BarChart3 className="size-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Reports</CardTitle>
                <CardDescription>
                  View analytics and reports.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" disabled>
              Coming soon
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
