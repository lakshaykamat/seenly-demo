"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  deleteAccount,
  getSettings,
  regenerateInviteCode,
} from "@/lib/mocks/store";
import { toast } from "sonner";
import { Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { OrgSettings } from "@/types";

export default function SettingsPage() {
  const { user, loading } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery<OrgSettings>({
    queryKey: ["admin-settings"],
    queryFn: () => getSettings(),
    enabled: !!user,
  });

  const regenerateMutation = useMutation({
    mutationFn: () => regenerateInviteCode(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Invite code regenerated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to regenerate invite code");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(),
    onSuccess: () => {
      toast.success("Account deleted");
      window.location.href = "/dashboard";
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete account");
    },
  });

  async function handleCopy() {
    if (!settings?.inviteCode) return;
    await navigator.clipboard.writeText(settings.inviteCode);
    toast.success("Invite code copied");
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
      />

      {settings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">Invite code</CardTitle>
            <CardDescription>
              Share this code with people you want to invite to your
              organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Label htmlFor="invite-code" className="sr-only">
                Invite code
              </Label>
              <Input
                id="invite-code"
                readOnly
                value={settings.inviteCode ?? ""}
                className="font-mono max-w-48"
              />
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="size-3.5 mr-1.5" />
                Copy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => regenerateMutation.mutate()}
                disabled={regenerateMutation.isPending}
              >
                <RefreshCw
                  className={`size-3.5 mr-1.5 ${regenerateMutation.isPending ? "animate-spin" : ""}`}
                />
                {regenerateMutation.isPending
                  ? "Regenerating\u2026"
                  : "Regenerate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base font-medium text-destructive">
            Danger zone
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action
            cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger
              render={
                <Button variant="destructive" size="sm">
                  Delete account
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete account</DialogTitle>
                <DialogDescription>
                  This will permanently delete your account and all associated
                  data. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose
                  render={
                    <Button variant="ghost" size="sm">
                      Cancel
                    </Button>
                  }
                />
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending
                    ? "Deleting\u2026"
                    : "Yes, delete my account"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}
