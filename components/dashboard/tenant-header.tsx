"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { SeenlyMark } from "@/components/icons/seenly-mark";
import { NotificationBell } from "./notification-bell";
import { useOnboardingState } from "@/components/onboarding/onboarding-gate";
import { ActiveRunPill } from "./active-run-pill";

export function TenantHeader() {
  const { user } = useAuth();
  const { firstProject } = useOnboardingState();
  const workspaceLabel = firstProject?.domain ?? user?.orgName;

  return (
    <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-lg font-semibold tracking-tight text-primary shrink-0"
          >
            <SeenlyMark className="size-7 text-primary" />
            Seenly
          </Link>
          <ActiveRunPill />
        </div>
        <div className="flex items-center gap-3">
          {workspaceLabel && (
            <div className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground">
              <Globe className="size-3.5" />
              <span>{workspaceLabel}</span>
            </div>
          )}
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar>
                    <AvatarFallback className="text-xs font-medium">
                      {user?.email?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              }
            />
            <DropdownMenuContent align="end" sideOffset={8} className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role} &middot; {user?.plan} plan
                    </p>
                  </div>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
