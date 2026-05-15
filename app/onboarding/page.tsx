import { Eye } from "lucide-react";
import { OnboardingLanding } from "@/components/onboarding/onboarding-landing";

export const dynamic = "force-dynamic";

export default function OnboardingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <Aurora />
      <Grain />

      <header className="relative z-10 flex items-center justify-between px-6 md:px-10 h-16">
        <a
          href="/onboarding"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground"
        >
          <span className="inline-flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Eye className="size-4" strokeWidth={2.5} />
          </span>
          Seenly
        </a>
        <a
          href="/login"
          className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          Log in
        </a>
      </header>

      <div className="relative z-10 mx-auto px-6 pt-10 pb-16 md:pt-14">
        <OnboardingLanding />
      </div>
    </main>
  );
}

function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute -top-1/3 left-1/2 -translate-x-1/2 size-[1200px] rounded-full opacity-70 blur-[120px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(79,70,229,0.28), rgba(79,70,229,0) 70%)",
        }}
      />
      <div
        className="absolute top-1/4 -left-40 size-[700px] rounded-full opacity-55 blur-[120px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(99,102,241,0.22), rgba(99,102,241,0) 70%)",
        }}
      />
      <div
        className="absolute -bottom-40 right-0 size-[800px] rounded-full opacity-50 blur-[140px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(129,140,248,0.18), rgba(129,140,248,0) 70%)",
        }}
      />
    </div>
  );
}

function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 mix-blend-multiply opacity-[0.04]"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        backgroundSize: "160px 160px",
      }}
    />
  );
}
