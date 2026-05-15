"use client";

import { useAuth } from "@/lib/auth-context";
import { MemberList } from "@/components/dashboard/member-list";
import { Skeleton } from "@/components/ui/skeleton";

export default function MembersPage() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-5 w-64" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-muted-foreground mt-1">
          Manage team members in your organization.
        </p>
      </div>

      <MemberList />
    </div>
  );
}
