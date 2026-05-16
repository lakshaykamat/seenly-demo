"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Bookmark,
  CheckCheck,
  Clock,
  FileText,
  Info,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  useClearNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useSnoozeNotification,
  type Notification,
} from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

const SEVERITY_COLOR: Record<Notification["severity"], string> = {
  critical: "var(--negative)",
  warning: "var(--warning)",
  info: "var(--pillar-ai)",
};

const CATEGORY_ICON: Record<Notification["category"], React.ComponentType<{ className?: string }>> = {
  rank_drop: AlertTriangle,
  citation_drop: AlertTriangle,
  competitor_mention: Bookmark,
  schema_regression: AlertTriangle,
  crawl_failure: AlertTriangle,
  share_of_voice: Info,
  system: Info,
  report: FileText,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const snooze = useSnoozeNotification();
  const clear = useClearNotification();

  const visible = useMemo(
    () =>
      (data ?? []).filter(
        (n) => !n.snoozedUntil || new Date(n.snoozedUntil) <= new Date()
      ),
    [data]
  );
  const unreadCount = visible.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleOpen(n: Notification) {
    if (!n.read) markRead.mutate({ id: n.id, read: true });
  }

  function handleSnooze(n: Notification) {
    snooze.mutate(
      { id: n.id, hours: 4 },
      {
        onSuccess: () => toast.success("Snoozed for 4h"),
      }
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications (${unreadCount} unread)`}
        className={cn(
          "relative grid place-items-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open && "bg-foreground/5 text-foreground"
        )}
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span
            aria-hidden
            className="absolute top-1 right-1 size-2 rounded-full bg-[color:var(--negative)] ring-2 ring-background"
          />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-w-[calc(100vw-2rem)] rounded-xl bg-popover ring-1 ring-foreground/10 shadow-lg z-50 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold tracking-tight">Inbox</p>
              {unreadCount > 0 && (
                <span className="text-[11px] px-1.5 h-4 grid place-items-center rounded-full bg-foreground/5 text-muted-foreground tabular-nums">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => markAll.mutate()}
              disabled={unreadCount === 0 || markAll.isPending}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:hover:text-muted-foreground"
            >
              <CheckCheck className="size-3.5" />
              Mark all read
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {visible.length === 0 && (
              <div className="px-4 py-12 text-center">
                <div className="size-10 mx-auto rounded-full bg-muted grid place-items-center text-muted-foreground mb-3">
                  <Bell className="size-4" />
                </div>
                <p className="text-sm font-medium">You&apos;re all caught up</p>
                <p className="text-xs text-muted-foreground mt-1">
                  New alerts will appear here.
                </p>
              </div>
            )}
            {visible.map((n) => {
              const Icon = CATEGORY_ICON[n.category];
              const color = SEVERITY_COLOR[n.severity];
              return (
                <div
                  key={n.id}
                  className={cn(
                    "group relative px-4 py-3 border-b border-border/60 last:border-b-0 transition-colors",
                    !n.read && "bg-foreground/[0.025]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="shrink-0 size-7 rounded-md grid place-items-center"
                      style={{
                        background: `color-mix(in oklab, ${color} 12%, transparent)`,
                        color,
                      }}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "text-sm leading-snug",
                            !n.read ? "font-semibold" : "font-medium"
                          )}
                        >
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: color }} />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {n.body}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-muted-foreground">
                          {timeAgo(n.createdAt)}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                          {n.href && (
                            <Link
                              href={n.href}
                              onClick={() => {
                                handleOpen(n);
                                setOpen(false);
                              }}
                              className="text-[11px] text-primary hover:underline"
                            >
                              View
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSnooze(n)}
                            className="grid place-items-center size-5 rounded text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                            aria-label="Snooze 4h"
                          >
                            <Clock className="size-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => clear.mutate(n.id)}
                            className="grid place-items-center size-5 rounded text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                            aria-label="Dismiss"
                          >
                            <X className="size-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="border-t px-4 py-2.5 flex items-center justify-between">
            <Link
              href="/alerts"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Manage alert rules
            </Link>
            <Link
              href="/alerts"
              onClick={() => setOpen(false)}
              className="text-xs text-primary hover:underline"
            >
              See all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
