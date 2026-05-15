"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { ROLE_ROUTE_ACCESS } from "@/constants";
import {
  LayoutDashboard,
  Play,
  Users,
  Settings,
  Search,
  Sparkles,
  Network,
  Crosshair,
  ListChecks,
  MessageSquare,
  FileText,
  Bell,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Search Visibility",
    href: "/visibility/search",
    icon: Search,
    group: "Visibility",
  },
  {
    label: "AI Recommendation",
    href: "/visibility/ai",
    icon: Sparkles,
    group: "Visibility",
  },
  {
    label: "AI Understanding",
    href: "/visibility/understanding",
    icon: Network,
    group: "Visibility",
  },
  {
    label: "Competitors",
    href: "/competitors",
    icon: Crosshair,
    group: "Analyze",
  },
  {
    label: "Recommendations",
    href: "/recommendations",
    icon: ListChecks,
    group: "Analyze",
  },
  {
    label: "Prompt Sandbox",
    href: "/prompts",
    icon: MessageSquare,
    group: "Analyze",
  },
  { label: "Reports", href: "/reports", icon: FileText, group: "Workspace" },
  { label: "Alerts", href: "/alerts", icon: Bell, group: "Workspace" },
  { label: "Runs", href: "/runs", icon: Play, group: "Workspace" },
  { label: "Members", href: "/members", icon: Users, group: "Workspace" },
  { label: "Settings", href: "/settings", icon: Settings, group: "Workspace" },
];

const MOBILE_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Search", href: "/visibility/search", icon: Search },
  { label: "Actions", href: "/recommendations", icon: ListChecks },
  { label: "Sandbox", href: "/prompts", icon: MessageSquare },
  { label: "Settings", href: "/settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(href + "/");
}

export function SidebarNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    const allowedRoles = ROLE_ROUTE_ACCESS[item.href];
    if (!allowedRoles) return true;
    return user && allowedRoles.includes(user.role);
  });

  const grouped = visibleItems.reduce<Record<string, NavItem[]>>(
    (acc, item) => {
      const key = item.group ?? "_main";
      (acc[key] ??= []).push(item);
      return acc;
    },
    {}
  );
  const orderedGroups = ["_main", "Visibility", "Analyze", "Workspace"].filter(
    (k) => grouped[k]
  );

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col gap-6 w-52 shrink-0 sticky top-20 self-start h-fit">
        {orderedGroups.map((group) => (
          <div key={group} className="flex flex-col gap-1">
            {group !== "_main" && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group}
              </p>
            )}
            {grouped[group].map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-foreground/[0.03]"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}

        {user && (
          <div className="mt-2 rounded-lg border bg-card/50 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {user.plan} plan
              </p>
              <span className="text-[10px] text-muted-foreground tabular-nums">
                137 / 500
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-700"
                style={{ width: "27%" }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground leading-snug">
              Runs reset in 16 days.
            </p>
          </div>
        )}
      </nav>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden border-t bg-background/95 backdrop-blur-sm">
        {MOBILE_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
