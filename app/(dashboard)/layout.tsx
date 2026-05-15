import { AuthProvider } from "@/lib/auth-context";
import { QueryProvider } from "@/lib/query-client";
import { TenantHeader } from "@/components/dashboard/tenant-header";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";

// All dashboard pages require auth — never statically prerender
export const dynamic = "force-dynamic";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AuthProvider>
        <OnboardingGate>
          <div className="min-h-screen">
            <TenantHeader />
            <div className="max-w-7xl mx-auto flex gap-8 px-6 py-8">
              <SidebarNav />
              <main className="flex-1 min-w-0 space-y-8 pb-20 md:pb-0">
                {children}
              </main>
            </div>
          </div>
        </OnboardingGate>
      </AuthProvider>
    </QueryProvider>
  );
}
