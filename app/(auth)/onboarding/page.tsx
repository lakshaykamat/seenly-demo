"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function OnboardingPage() {
  const [orgName, setOrgName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const supabase = createClient();

  // Redirect already-onboarded users to dashboard
  useEffect(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && !data.needsOnboarding && data.id) {
          window.location.href = "/dashboard";
        } else {
          setReady(true);
        }
      })
      .catch(() => setReady(true));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/onboarding/create-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: orgName }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(
        (body as { error?: string }).error ?? "Failed to create organization"
      );
      setLoading(false);
      return;
    }

    await supabase.auth.refreshSession();
    window.location.href = "/dashboard";
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/onboarding/join-org", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(
        (body as { error?: string }).error ?? "Failed to join organization"
      );
      setLoading(false);
      return;
    }

    await supabase.auth.refreshSession();
    window.location.href = "/dashboard";
  }

  if (!ready) return null;

  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center space-y-2 px-6 pt-8 pb-2">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight text-primary mb-2 block"
        >
          Seenly
        </Link>
        <CardTitle className="text-xl font-semibold">Set up your workspace</CardTitle>
        <CardDescription className="text-muted-foreground">
          Create a new organization or join an existing one
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-8 mt-4">
        <Tabs
          defaultValue="create"
          onValueChange={() => setError(null)}
        >
          <TabsList className="w-full mb-6">
            <TabsTrigger value="create" className="flex-1">
              Create organization
            </TabsTrigger>
            <TabsTrigger value="join" className="flex-1">
              Join organization
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <form onSubmit={handleCreate} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  id="org-name"
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Acme Inc."
                  required
                  className="h-10"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? "Creating\u2026" : "Create & continue"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="join">
            <form onSubmit={handleJoin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="invite-code">Invite code</Label>
                <Input
                  id="invite-code"
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="e.g. a1b2c3d4"
                  required
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Ask your organization admin for the invite code.
                </p>
              </div>
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? "Joining\u2026" : "Join & continue"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
