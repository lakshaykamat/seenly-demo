"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
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

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    toast.success("Password updated successfully");
    window.location.href = "/dashboard";
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="text-center space-y-2 px-6 pt-8 pb-2">
        <Link
          href="/"
          className="text-2xl font-bold tracking-tight text-primary mb-2 block"
        >
          Seenly
        </Link>
        <CardTitle className="text-xl font-semibold">Set new password</CardTitle>
        <CardDescription className="text-muted-foreground">
          Choose a secure password for your account
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-8">
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
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
            {loading ? "Updating\u2026" : "Update password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
