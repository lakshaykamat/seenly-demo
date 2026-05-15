import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportView } from "@/components/reports/report-view";
import { getReportByToken } from "@/lib/mocks/store";

export const dynamic = "force-dynamic";

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = getReportByToken(token);
  if (!report) notFound();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-primary"
          >
            Seenly
          </Link>
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-[color:var(--positive)]" />
            Read-only shared report
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <ReportView report={report} />
        <footer className="pt-8 border-t text-center text-xs text-muted-foreground">
          Shared from{" "}
          <Link href="/" className="text-primary hover:underline">
            Seenly
          </Link>{" "}
          · {report.subtitle}
        </footer>
      </main>
    </div>
  );
}
