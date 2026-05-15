"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  Loader2,
  Share2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportView } from "@/components/reports/report-view";
import {
  useRegenerateReportShareToken,
  useReport,
  useToggleReportShare,
} from "@/lib/api/reports";
import type { Report } from "@/lib/mocks/reports";
import { cn } from "@/lib/utils";

function downloadMockPdf(report: Report) {
  const text = [
    report.title,
    report.subtitle,
    "",
    `${report.pages} pages`,
    "",
    report.narrative.summary,
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

function shareUrl(token: string): string {
  if (typeof window === "undefined") return `/r/${token}`;
  return `${window.location.origin}/r/${token}`;
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
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Public link</p>
                <p className="text-xs text-muted-foreground">
                  {report.shareEnabled ? `${report.shareViews} views` : "Sharing is off"}
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
                  className="flex-1 h-8 rounded-md border bg-muted/30 px-2 text-xs"
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

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, isLoading, error } = useReport(id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-40 rounded bg-muted animate-pulse" />
        <div className="h-44 rounded-2xl bg-muted/60 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <p className="text-sm font-medium">We couldn&apos;t load this report.</p>
        <Link href="/reports" className="mt-3 inline-block text-sm text-primary hover:underline">
          ← Back to reports
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All reports
        </Link>
        <div className="flex items-center gap-2">
          <ShareDialog report={data} />
          <Button variant="outline" size="sm" onClick={() => downloadMockPdf(data)}>
            <Download className="size-3.5" />
            Download PDF
          </Button>
        </div>
      </div>
      <ReportView report={data} />
    </div>
  );
}
