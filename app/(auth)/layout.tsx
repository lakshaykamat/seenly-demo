export const dynamic = "force-dynamic";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-primary/5 to-background">
      <div className="w-full max-w-[420px]">{children}</div>
    </div>
  );
}
