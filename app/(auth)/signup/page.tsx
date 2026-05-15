"use client";

import { useState } from "react";
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

function friendlyError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("rate limit")) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }
  if (lower.includes("valid email")) {
    return "Please enter a valid email address.";
  }
  if (lower.includes("password")) {
    return "Password must be at least 6 characters.";
  }
  return msg;
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(friendlyError(error.message));
      setLoading(false);
      return;
    }

    if (
      !data.session ||
      (data.user && (!data.user.identities || data.user.identities.length === 0))
    ) {
      setError(
        "An account with this email already exists. Try signing in instead."
      );
      setLoading(false);
      return;
    }

    window.location.href = "/onboarding";
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
        <CardTitle className="text-xl font-semibold">Create your account</CardTitle>
        <CardDescription className="text-muted-foreground">
          Get started with Seenly for free
        </CardDescription>
      </CardHeader>

      <CardContent className="px-6 pb-8">
        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
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

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
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
            {loading ? "Creating account\u2026" : "Create account"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
