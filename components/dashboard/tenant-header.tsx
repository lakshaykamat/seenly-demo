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
import { RanklyMark } from "@/components/icons/rankly-mark";
import { ActiveRunPill } from "./active-run-pill";

export function TenantHeader() {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-6 h-14">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-[15px] font-semibold tracking-tight text-foreground shrink-0"
          >
            <RanklyMark className="size-6 text-primary" />
            Rankly
          </Link>

          <ActiveRunPill />
        </div>

        <div className="flex items-center gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="inline-flex items-center gap-2 rounded-full pl-1 pr-3 py-1 hover:bg-foreground/[0.04] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="size-7 ring-1 ring-border/80">
                    <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium text-foreground/85">
                    {user?.name}
                  </span>
                </button>
              }
            />
            <DropdownMenuContent align="end" sideOffset={8} className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize mt-1">
                      {user?.role} · {user?.plan} plan
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
