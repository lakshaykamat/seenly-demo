import Link from "next/link";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="space-y-1">
          <Link
            href="/"
            className="text-xl font-semibold tracking-tight text-primary mb-4 block"
          >
            Seenly
          </Link>
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
            <svg
              className="w-6 h-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <CardTitle className="text-xl">Access denied</CardTitle>
          <CardDescription>
            You don&apos;t have permission to view this page. Contact your
            organization admin if you need access.
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-primary hover:underline"
          >
            Go to dashboard
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
