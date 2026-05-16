"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Download,
  Eye,
  Loader2,
  Minus,
  Plus,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/dashboard/page-header";
import { Sparkline } from "@/components/charts/sparkline";
import {
  useGenerateReport,
  useReports,
  useToggleReportShare,
  useRegenerateReportShareToken,
  type Report,
} from "@/lib/api/reports";
import { cn } from "@/lib/utils";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shareUrl(token: string): string {
  if (typeof window === "undefined") return `/r/${token}`;
  return `${window.location.origin}/r/${token}`;
}

function downloadMockPdf(report: Report) {
  const text = [
    report.title,
    report.subtitle,
    "",
    `Generated ${formatDate(report.generatedAt)} · ${report.pages} pages`,
    "",
    "Headline metrics",
    ...report.kpis.map((k) => `  ${k.label}: ${k.value.toFixed(1)} (${k.delta >= 0 ? "+" : ""}${k.delta.toFixed(1)})`),
    "",
    "Executive summary",
    report.narrative.summary,
    "",
    "Top wins",
    ...report.narrative.wins.flatMap((w) => [`  • ${w.title}`, `    ${w.detail}`]),
    "",
    "Top risks",
    ...report.narrative.risks.flatMap((r) => [`  • ${r.title}`, `    ${r.detail}`]),
    "",
    "Recommended focus",
    ...report.narrative.focus.flatMap((f) => [`  • ${f.title}`, `    ${f.detail}`]),
  ].join("\n");
  const blob = new Blob([text], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.id}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function GenerateButton() {
  const router = useRouter();
  const generate = useGenerateReport();
  const [open, setOpen] = useState(false);
  const [pct, setPct] = useState(0);
  const [stage, setStage] = useState("");

  async function handleGenerate() {
    setOpen(true);
    setPct(0);
    setStage("Starting…");
    try {
      const period = new Date().toISOString().slice(0, 7);
      const report = await generate.mutateAsync({
        period,
        onProgress: (p, s) => {
          setPct(p);
          setStage(s);
        },
      });
      toast.success("Report ready", {
        description: report.title,
        action: {
          label: "Open",
          onClick: () => router.push(`/reports/${report.id}`),
        },
      });
      setOpen(false);
      router.push(`/reports/${report.id}`);
    } catch {
      toast.error("Couldn't generate report. Try again.");
      setOpen(false);
    }
  }

  return (
    <>
      <Button onClick={handleGenerate} disabled={generate.isPending}>
        {generate.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Plus className="size-4" />
        )}
        Generate this month
      </Button>
      <Dialog open={open} onOpenChange={(v) => !generate.isPending && setOpen(v)}>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generating executive report</DialogTitle>
            <DialogDescription>
              Aggregating runs, citation share, and pillar deltas across the
              current period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{stage}</span>
              <span className="tabular-nums font-medium">{pct}%</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ShareDialog({ report }: { report: Report }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const toggle = useToggleReportShare();
  const regen = useRegenerateReportShareToken();

  function copy() {
    navigator.clipboard.writeText(shareUrl(report.shareToken));
    setCopied(true);
    toast.success("Share link copied");
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="size-3.5" />
        Share
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share {report.title}</DialogTitle>
            <DialogDescription>
              Anyone with the link can view a read-only copy of this report.
              Toggle off to revoke.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Public link</p>
                <p className="text-xs text-muted-foreground">
                  {report.shareEnabled
                    ? `${report.shareViews} views${report.shareLastViewedAt ? ` · last viewed ${formatDate(report.shareLastViewedAt)}` : ""}`
                    : "Sharing is off"}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={report.shareEnabled}
                onClick={() => toggle.mutate(report.id)}
                disabled={toggle.isPending}
                className={cn(
                  "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
                  report.shareEnabled ? "bg-primary" : "bg-muted"
                )}
              >
                <span
                  className={cn(
                    "inline-block size-3.5 transform rounded-full bg-background shadow transition-transform",
                    report.shareEnabled ? "translate-x-5" : "translate-x-1"
                  )}
                />
              </button>
            </div>
            {report.shareEnabled && (
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl(report.shareToken)}
                  className="flex-1 h-8 rounded-md border bg-muted/30 px-2 text-xs tabular-nums"
                />
                <Button size="sm" variant="outline" onClick={copy}>
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => regen.mutate(report.id)}
              disabled={regen.isPending || !report.shareEnabled}
            >
              {regen.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Regenerate link
            </Button>
            <Button onClick={() => setOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function deltaIndicator(delta: number) {
  const Icon = delta === 0 ? Minus : delta > 0 ? ArrowUp : ArrowDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
        delta > 0 && "text-[color:var(--positive)]",
        delta < 0 && "text-[color:var(--negative)]",
        delta === 0 && "text-muted-foreground"
      )}
    >
      <Icon className="size-3" />
      {Math.abs(delta).toFixed(1)}
    </span>
  );
}

export default function ReportsPage() {
  const { data, isLoading } = useReports();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Executive Reports"
        actions={<GenerateButton />}
      />

      {isLoading && (
        <div className="grid gap-5 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-[420px] rounded-2xl bg-card ring-1 ring-border animate-pulse"
            />
          ))}
        </div>
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2">
          {[...data]
            .sort((a, b) => b.generatedAt.localeCompare(a.generatedAt))
            .slice(0, 2)
            .map((report) => {
              const visibility = report.kpis[0];
              const citation = report.kpis[1];
              const d = new Date(report.generatedAt);
              const monthShort = d
                .toLocaleDateString(undefined, { month: "short" })
                .toUpperCase();
              const year = d.getFullYear();
              return (
                <article
                  key={report.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-border hover:ring-foreground/20 hover:shadow-xl transition-all duration-300"
                >
                  {/* Cover band */}
                  <div className="relative h-32 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border/60">
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-[0.04]"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
                        backgroundSize: "18px 18px",
                      }}
                    />
                    <div className="relative h-full flex items-center justify-between px-6">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center justify-center size-16 rounded-xl bg-card ring-1 ring-border shadow-sm">
                          <span className="text-[11px] font-semibold tracking-[0.14em] text-primary">
                            {monthShort}
                          </span>
                          <span className="text-lg font-bold tabular-nums leading-none mt-0.5">
                            {year}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.18em] font-medium text-primary/80">
                            Executive report
                          </p>
                          <h3 className="text-base font-semibold tracking-tight mt-1 truncate max-w-[280px]">
                            {report.title}
                          </h3>
                        </div>
                      </div>
                      <div className="text-primary opacity-80">
                        <Sparkline
                          data={visibility.trend}
                          width={88}
                          height={32}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="flex-1 flex flex-col p-6 gap-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground tracking-[0.14em] font-medium">
                          Visibility
                        </p>
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                          <span className="text-2xl font-semibold tabular-nums">
                            {visibility.value.toFixed(1)}
                          </span>
                          {deltaIndicator(visibility.delta)}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-muted-foreground tracking-[0.14em] font-medium">
                          Citation share
                        </p>
                        <div className="flex items-baseline gap-1.5 mt-1.5">
                          <span className="text-2xl font-semibold tabular-nums">
                            {citation.value.toFixed(1)}%
                          </span>
                          {deltaIndicator(citation.delta)}
                        </div>
                      </div>
                    </div>

                    <blockquote className="border-l-2 border-primary/40 pl-4 text-[14px] leading-relaxed text-foreground/80 line-clamp-3">
                      {report.narrative.summary}
                    </blockquote>

                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Generated {formatDate(report.generatedAt)} ·{" "}
                      {report.pages} pages
                      {report.shareEnabled && (
                        <span className="inline-flex items-center gap-1 ml-2">
                          <span aria-hidden>·</span>
                          <Eye className="size-3" />
                          <span>{report.shareViews} views</span>
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Footer */}
                  <footer className="flex items-center justify-between gap-2 px-6 py-4 border-t border-border/60 bg-muted/20">
                    <Link
                      href={`/reports/${report.id}`}
                      className={cn(buttonVariants({ size: "sm" }))}
                    >
                      Open report
                      <ArrowUp className="size-3.5 rotate-45" />
                    </Link>
                    <div className="flex items-center gap-2">
                      <ShareDialog report={report} />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadMockPdf(report)}
                      >
                        <Download className="size-3.5" />
                        PDF
                      </Button>
                    </div>
                  </footer>
                </article>
              );
            })}
        </div>
      )}

      {!isLoading && (!data || data.length === 0) && (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-sm font-medium">No reports yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Generate this month&apos;s executive report to get started.
          </p>
        </div>
      )}
    </div>
  );
}
