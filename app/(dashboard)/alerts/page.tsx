"use client";

import { useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  Inbox,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  useAlertRules,
  useCreateAlertRule,
  useDeleteAlertRule,
  useTestFireAlertRule,
  useUpdateAlertRule,
  type AlertChannel,
  type AlertRule,
} from "@/lib/api/alerts";
import {
  useClearNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type Notification,
} from "@/lib/api/notifications";
import { cn } from "@/lib/utils";

const SEVERITY_TONE: Record<AlertRule["severity"], string> = {
  critical: "bg-[color:var(--negative)]/10 text-[color:var(--negative)] ring-[color:var(--negative)]/20",
  warning: "bg-[color:var(--warning)]/10 text-[color:var(--warning)] ring-[color:var(--warning)]/20",
  info: "bg-[color:var(--pillar-ai)]/10 text-[color:var(--pillar-ai)] ring-[color:var(--pillar-ai)]/20",
};

const CATEGORIES: { value: AlertRule["category"]; label: string }[] = [
  { value: "rank_drop", label: "Rank drop" },
  { value: "citation_drop", label: "Citation share drop" },
  { value: "competitor_mention", label: "Competitor mention" },
  { value: "schema_regression", label: "Schema regression" },
  { value: "crawl_failure", label: "AI crawler failure" },
  { value: "share_of_voice", label: "Share-of-voice swing" },
];

const ALL_CHANNELS: { value: AlertChannel; label: string }[] = [
  { value: "in_app", label: "In-app" },
  { value: "email", label: "Email" },
  { value: "slack", label: "Slack" },
  { value: "webhook", label: "Webhook" },
];

function formatThreshold(t: AlertRule["threshold"]): string {
  return `${t.metric.replace(/_/g, " ")} ${t.operator} ${t.value}${t.unit ? ` ${t.unit}` : ""}`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function NewRuleDialog() {
  const [open, setOpen] = useState(false);
  const create = useCreateAlertRule();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<AlertRule["category"]>("rank_drop");
  const [severity, setSeverity] = useState<AlertRule["severity"]>("warning");
  const [thresholdValue, setThresholdValue] = useState("5");
  const [scope, setScope] = useState("All projects");
  const [channels, setChannels] = useState<AlertChannel[]>(["in_app", "email"]);

  function reset() {
    setName("");
    setDescription("");
    setCategory("rank_drop");
    setSeverity("warning");
    setThresholdValue("5");
    setScope("All projects");
    setChannels(["in_app", "email"]);
  }

  function toggleChannel(c: AlertChannel) {
    setChannels((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  }

  async function submit() {
    if (!name.trim()) {
      toast.error("Give the rule a name");
      return;
    }
    const value = Number.parseFloat(thresholdValue);
    if (Number.isNaN(value)) {
      toast.error("Threshold must be a number");
      return;
    }
    try {
      await create.mutateAsync({
        name: name.trim(),
        description: description.trim() || `Triggers when ${category.replace(/_/g, " ")} threshold is met.`,
        category,
        severity,
        threshold: { metric: category, operator: ">=", value, unit: "" },
        scope,
        channels,
      });
      toast.success("Alert rule created");
      reset();
      setOpen(false);
    } catch {
      toast.error("Couldn't create rule");
    }
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New rule
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New alert rule</DialogTitle>
            <DialogDescription>
              Define a condition and where to deliver notifications when it fires.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rule-name">Name</Label>
              <Input
                id="rule-name"
                placeholder="Citation share drop on Claude"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rule-desc">Description</Label>
              <Input
                id="rule-desc"
                placeholder="Triggers when our citation share on Claude falls more than 3 points week-over-week."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(v) => v && setCategory(v as AlertRule["category"])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select value={severity} onValueChange={(v) => v && setSeverity(v as AlertRule["severity"])}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="rule-threshold">Threshold value</Label>
                <Input
                  id="rule-threshold"
                  type="number"
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rule-scope">Scope</Label>
                <Input
                  id="rule-scope"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Channels</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_CHANNELS.map((c) => {
                  const active = channels.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => toggleChannel(c.value)}
                      className={cn(
                        "h-7 px-2.5 text-xs rounded-md border transition-colors",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={create.isPending}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={create.isPending}>
              {create.isPending && <Loader2 className="size-4 animate-spin" />}
              Create rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MuteDialog({ rule, onClose }: { rule: AlertRule; onClose: () => void }) {
  const update = useUpdateAlertRule();
  const [hours, setHours] = useState(4);
  async function submit() {
    const mutedUntil = new Date(Date.now() + hours * 3_600_000).toISOString();
    await update.mutateAsync({ id: rule.id, patch: { muted: true, mutedUntil } });
    toast.success(`Muted "${rule.name}" for ${hours}h`);
    onClose();
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mute rule</DialogTitle>
          <DialogDescription>
            Stop &ldquo;{rule.name}&rdquo; from firing for a window. It&apos;ll resume automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>Mute for</Label>
          <Select value={String(hours)} onValueChange={(v) => v && setHours(Number(v))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 hour</SelectItem>
              <SelectItem value="4">4 hours</SelectItem>
              <SelectItem value="24">24 hours</SelectItem>
              <SelectItem value="168">7 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={update.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={update.isPending}>
            {update.isPending && <Loader2 className="size-4 animate-spin" />}
            Mute
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RuleRow({ rule }: { rule: AlertRule }) {
  const update = useUpdateAlertRule();
  const del = useDeleteAlertRule();
  const test = useTestFireAlertRule();
  const [muteOpen, setMuteOpen] = useState(false);

  const muteActive =
    rule.muted && (!rule.mutedUntil || new Date(rule.mutedUntil) > new Date());

  return (
    <div className="flex items-start gap-4 px-5 py-4 border-b last:border-b-0 group hover:bg-foreground/[0.015] transition-colors">
      <button
        type="button"
        role="switch"
        aria-checked={rule.enabled}
        onClick={() => update.mutate({ id: rule.id, patch: { enabled: !rule.enabled } })}
        className={cn(
          "mt-1 relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
          rule.enabled ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "inline-block size-3.5 transform rounded-full bg-background shadow transition-transform",
            rule.enabled ? "translate-x-5" : "translate-x-1"
          )}
        />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={cn("text-sm font-semibold", !rule.enabled && "text-muted-foreground")}>
            {rule.name}
          </p>
          <span
            className={cn(
              "text-[10px] font-medium uppercase tracking-wide px-1.5 h-4 grid place-items-center rounded ring-1",
              SEVERITY_TONE[rule.severity]
            )}
          >
            {rule.severity}
          </span>
          {muteActive && (
            <Badge variant="secondary" className="gap-1">
              <BellOff className="size-3" />
              Muted
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{rule.description}</p>
        <div className="mt-2 flex items-center gap-x-4 gap-y-1 flex-wrap text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-mono">
            <Zap className="size-3" />
            {formatThreshold(rule.threshold)}
          </span>
          <span>·</span>
          <span>{rule.scope}</span>
          <span>·</span>
          <span>Last fired {timeAgo(rule.lastFiredAt)}</span>
          <span>·</span>
          <span>{rule.fireCount30d} fires in 30d</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {rule.channels.map((c) => (
            <Badge key={c} variant="outline" className="text-[10px] px-1.5 h-4 capitalize">
              {c.replace("_", "-")}
            </Badge>
          ))}
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => test.mutate(rule.id, {
            onSuccess: () => toast.success(`Test fired: ${rule.name}`),
            onError: () => toast.error("Test failed"),
          })}
          disabled={test.isPending}
        >
          {test.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Zap className="size-3.5" />}
          Test fire
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button size="icon-sm" variant="ghost">
                <MoreHorizontal className="size-3.5" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuGroup>
              {muteActive ? (
                <DropdownMenuItem
                  onClick={() => update.mutate({ id: rule.id, patch: { muted: false, mutedUntil: null } })}
                >
                  <Bell className="size-3.5" />
                  Unmute
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => setMuteOpen(true)}>
                  <BellOff className="size-3.5" />
                  Mute…
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => del.mutate(rule.id, { onSuccess: () => toast.success("Rule deleted") })}
                className="text-[color:var(--negative)]"
              >
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {muteOpen && <MuteDialog rule={rule} onClose={() => setMuteOpen(false)} />}
    </div>
  );
}

const SEVERITY_DOT: Record<Notification["severity"], string> = {
  critical: "bg-[color:var(--negative)]",
  warning: "bg-[color:var(--warning)]",
  info: "bg-[color:var(--pillar-ai)]",
};

function InboxList() {
  const { data, isLoading } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const clear = useClearNotification();

  const items = useMemo(
    () => (data ?? []).filter((n) => !n.snoozedUntil || new Date(n.snoozedUntil) <= new Date()),
    [data]
  );
  const unread = items.filter((n) => !n.read).length;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/60 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 text-center">
        <div className="size-10 mx-auto rounded-full bg-muted grid place-items-center text-muted-foreground mb-3">
          <Inbox className="size-4" />
        </div>
        <p className="text-sm font-medium">No alerts in your inbox</p>
        <p className="text-xs text-muted-foreground mt-1">
          When a rule fires, you&apos;ll see the event and evidence here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          {items.length} events · {unread} unread
        </p>
        <button
          type="button"
          disabled={unread === 0 || markAll.isPending}
          onClick={() => markAll.mutate()}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:hover:text-muted-foreground"
        >
          Mark all read
        </button>
      </div>
      <div className="rounded-xl bg-card ring-1 ring-border divide-y divide-border/60 overflow-hidden">
        {items.map((n) => (
          <div
            key={n.id}
            className={cn(
              "p-4 group hover:bg-foreground/[0.015] transition-colors",
              !n.read && "bg-foreground/[0.025]"
            )}
          >
            <div className="flex items-start gap-3">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", SEVERITY_DOT[n.severity])} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-sm leading-snug", !n.read ? "font-semibold" : "font-medium")}>
                    {n.title}
                  </p>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.body}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {n.evidence.map((e) => (
                    <span
                      key={e.label}
                      className="inline-flex items-center gap-1 text-[11px] px-1.5 h-5 rounded bg-muted/60 text-muted-foreground"
                    >
                      <span className="font-medium">{e.label}:</span>
                      <span>{e.value}</span>
                    </span>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => markRead.mutate({ id: n.id, read: true })}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Mark read
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => clear.mutate(n.id)}
                    className="text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { data: rules, isLoading } = useAlertRules();
  const enabled = rules?.filter((r) => r.enabled).length ?? 0;
  const muted = rules?.filter((r) => r.muted).length ?? 0;
  const fires30d = rules?.reduce((sum, r) => sum + r.fireCount30d, 0) ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts & Inbox"
        actions={<NewRuleDialog />}
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-card ring-1 ring-border p-4">
          <p className="text-xs uppercase text-muted-foreground tracking-wide font-medium">Active rules</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{enabled}</p>
        </div>
        <div className="rounded-xl bg-card ring-1 ring-border p-4">
          <p className="text-xs uppercase text-muted-foreground tracking-wide font-medium">Muted</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{muted}</p>
        </div>
        <div className="rounded-xl bg-card ring-1 ring-border p-4">
          <p className="text-xs uppercase text-muted-foreground tracking-wide font-medium">Fires (30d)</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{fires30d}</p>
        </div>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Rules</TabsTrigger>
          <TabsTrigger value="inbox">Inbox</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="mt-4">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 rounded-xl bg-muted/60 animate-pulse" />
              ))}
            </div>
          )}
          {!isLoading && rules && rules.length > 0 && (
            <div className="rounded-xl bg-card ring-1 ring-border overflow-hidden">
              {rules.map((r) => (
                <RuleRow key={r.id} rule={r} />
              ))}
            </div>
          )}
          {!isLoading && (!rules || rules.length === 0) && (
            <div className="rounded-xl border border-dashed p-12 text-center">
              <p className="text-sm font-medium">No alert rules yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Create a rule to start receiving notifications when thresholds are crossed.
              </p>
            </div>
          )}
        </TabsContent>
        <TabsContent value="inbox" className="mt-4">
          <InboxList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
