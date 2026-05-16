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
import { Command } from "lucide-react";
import { RanklyMark } from "@/components/icons/rankly-mark";
import { NotificationBell } from "./notification-bell";
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
          <button
            type="button"
            className="hidden lg:inline-flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Search"
          >
            <Command className="size-3.5" />
            <span>Search</span>
            <kbd className="ml-1 inline-flex h-4 items-center rounded border border-border/70 bg-background px-1 font-mono text-[10px] text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          <NotificationBell />

          <span
            aria-hidden
            className="mx-1 hidden sm:block h-5 w-px bg-border/80"
          />

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="size-8 ring-1 ring-border/80 hover:ring-foreground/20 transition-shadow">
                    <AvatarFallback className="text-xs font-semibold bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
                      {user?.email?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              }
            />
            <DropdownMenuContent align="end" sideOffset={8} className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
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
