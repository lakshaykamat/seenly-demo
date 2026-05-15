"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { AlertCircle, Mail } from "lucide-react";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="text-center space-y-2 px-6 pt-8 pb-2">
          <Link
            href="/"
            className="text-2xl font-bold tracking-tight text-primary mb-2 block"
          >
            Seenly
          </Link>
          <div className="mx-auto size-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="size-5 text-primary" />
          </div>
          <CardTitle className="text-xl font-semibold">Check your email</CardTitle>
          <CardDescription>
            We sent a reset link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-8 flex justify-center">
          <Link
            href="/login"
            className="text-sm font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
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
        <CardTitle className="text-xl font-semibold">Reset your password</CardTitle>
        <CardDescription className="text-muted-foreground">
          Enter your email and we&apos;ll send a reset link
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

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" className="w-full h-10" disabled={loading}>
            {loading ? "Sending\u2026" : "Send reset link"}
          </Button>
        </form>

        <p className="text-center text-sm mt-6">
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
