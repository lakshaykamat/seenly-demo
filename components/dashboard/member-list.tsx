"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { fetcher } from "@/lib/api/fetcher";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Member } from "@/types";

export function MemberList() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["members"],
    queryFn: () => fetcher<Member[]>("/api/members"),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      fetcher(`/api/members/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success("Member role updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update role");
    },
  });

  if (isLoading) {
    return (
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 px-4 py-2.5">
          <Skeleton className="h-4 w-full max-w-xs" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3 border-t">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-4 w-24 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
        <div className="rounded-full bg-muted p-3 mb-3">
          <Users className="size-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium">No members yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Share your invite code to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left font-medium px-4 py-2.5">Email</th>
            <th className="text-left font-medium px-4 py-2.5">Role</th>
            <th className="text-left font-medium px-4 py-2.5">Joined</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-t">
              <td className="px-4 py-2.5">
                {m.email}
                {m.id === user?.id && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (you)
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5">
                {m.id === user?.id || m.role === "admin" ? (
                  <Badge variant="outline" className="capitalize">
                    {m.role}
                  </Badge>
                ) : (
                  <Select
                    value={m.role}
                    onValueChange={(role) => {
                      if (role)
                        roleMutation.mutate({ id: m.id, role });
                    }}
                    disabled={roleMutation.isPending}
                  >
                    <SelectTrigger className="w-28 h-8 text-xs capitalize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analyst">Analyst</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </td>
              <td className="px-4 py-2.5 text-muted-foreground">
                {new Date(m.createdAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
