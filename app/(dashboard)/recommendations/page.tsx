"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  Layers,
  ListChecks,
  MoreHorizontal,
  Search,
  Sparkles,
  Target,
  User,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  useBulkUpdateRecommendations,
  useRecommendations,
  useUpdateRecommendation,
  type Recommendation,
  type RecommendationStatus,
} from "@/lib/api/recommendations";
import { useQuery } from "@tanstack/react-query";
import { listMembers } from "@/lib/mocks/store";
import type { Member } from "@/types";
import { KpiTile } from "@/components/visibility/kpi-tile";
import { PageHeader } from "@/components/dashboard/page-header";
import { Section } from "@/components/visibility/section";
import { EmptyState } from "@/components/visibility/empty-state";
import { PillarSkeleton } from "@/components/visibility/pillar-skeleton";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<RecommendationStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  dismissed: "Dismissed",
};

const STATUS_COLOR: Record<RecommendationStatus, string> = {
  open: "bg-primary/10 text-primary",
  in_progress: "bg-warning/10 text-warning",
  done: "bg-positive/10 text-positive",
  dismissed: "bg-muted text-muted-foreground",
};

const STATUS_TONE: Record<
  RecommendationStatus,
  "info" | "warning" | "success" | "neutral"
> = {
  open: "info",
  in_progress: "warning",
  done: "success",
  dismissed: "neutral",
};

const STATUS_ICON: Record<
  RecommendationStatus,
  React.ComponentType<{ className?: string }>
> = {
  open: Circle,
  in_progress: Clock,
  done: CheckCircle2,
  dismissed: XCircle,
};

const PILLAR_LABEL: Record<Recommendation["pillar"], string> = {
  search: "Search",
  ai: "AI Rec.",
  understanding: "AI Underst.",
};

const PILLAR_COLOR: Record<Recommendation["pillar"], string> = {
  search: "var(--pillar-search)",
  ai: "var(--pillar-ai)",
  understanding: "var(--pillar-understanding)",
};

const KANBAN_COLUMNS: RecommendationStatus[] = [
  "open",
  "in_progress",
  "done",
  "dismissed",
];

function priorityScore(r: Recommendation): number {
  return r.impactScore * 1.4 - r.effortScore;
}

function initials(email: string): string {
  const local = email.split("@")[0];
  return local
    .split(/[._-]/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

function fmtDue(iso: string | null): string {
  if (!iso) return "No due date";
  const d = new Date(iso);
  const days = Math.round(
    (d.getTime() - new Date("2026-05-15T09:00:00.000Z").getTime()) / 86_400_000
  );
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  if (days > 0) return `Due in ${days}d`;
  return `${Math.abs(days)}d overdue`;
}

export default function RecommendationsPage() {
  const { data, isLoading, error, refetch } = useRecommendations();
  const { data: members } = useQuery({
    queryKey: ["members"],
    queryFn: () => listMembers(),
    staleTime: 60_000,
  });
  const update = useUpdateRecommendation();
  const bulk = useBulkUpdateRecommendations();

  const [view, setView] = useState<"queue" | "board" | "matrix">("queue");
  const [pillar, setPillar] = useState<string>("all");
  const [status, setStatus] = useState<string>("active");
  const [assignee, setAssignee] = useState<string>("all");
  const [sort, setSort] = useState<string>("priority");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Recommendation | null>(null);

  const filtered = useMemo<Recommendation[]>(() => {
    if (!data) return [];
    let rows = data;
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (pillar !== "all") rows = rows.filter((r) => r.pillar === pillar);
    if (status === "active")
      rows = rows.filter(
        (r) => r.status === "open" || r.status === "in_progress"
      );
    else if (status !== "all") rows = rows.filter((r) => r.status === status);
    if (assignee === "unassigned")
      rows = rows.filter((r) => r.assigneeId == null);
    else if (assignee !== "all")
      rows = rows.filter((r) => r.assigneeId === assignee);
    rows = [...rows];
    if (sort === "priority")
      rows.sort((a, b) => priorityScore(b) - priorityScore(a));
    else if (sort === "impact")
      rows.sort((a, b) => b.impactScore - a.impactScore);
    else if (sort === "effort")
      rows.sort((a, b) => a.effortScore - b.effortScore);
    else if (sort === "due")
      rows.sort(
        (a, b) =>
          (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999") ||
          a.updatedAt.localeCompare(b.updatedAt)
      );
    else if (sort === "recent")
      rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return rows;
  }, [data, query, pillar, status, assignee, sort]);

  if (isLoading) return <PillarSkeleton />;
  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Recommendations"
        />
        <EmptyState
          icon={<ListChecks className="size-5" />}
          title="Couldn't load recommendations"
          description="The queue didn't return. Try again — most issues resolve in a few seconds."
          action={
            <Button size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  const open = data.filter((r) => r.status === "open").length;
  const inProgress = data.filter((r) => r.status === "in_progress").length;
  const done = data.filter((r) => r.status === "done").length;
  const overdue = data.filter(
    (r) =>
      r.dueAt &&
      r.dueAt < "2026-05-15T09:00:00.000Z" &&
      (r.status === "open" || r.status === "in_progress")
  ).length;

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((r) => r.id)));
  }

  async function setStatusFor(id: string, next: RecommendationStatus) {
    try {
      await update.mutateAsync({ id, patch: { status: next } });
      toast.success(`Moved to ${STATUS_LABEL[next]}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update");
    }
  }

  async function assignTo(id: string, assigneeId: string | null) {
    try {
      await update.mutateAsync({ id, patch: { assigneeId } });
      toast.success("Reassigned");
    } catch {
      toast.error("Couldn't reassign");
    }
  }

  async function bulkSetStatus(next: RecommendationStatus) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      await bulk.mutateAsync({ ids, patch: { status: next } });
      toast.success(`${ids.length} moved to ${STATUS_LABEL[next]}`);
      setSelected(new Set());
    } catch {
      toast.error("Bulk update failed");
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Recommendations"
        actions={
          <Button size="sm">
            <Sparkles className="size-3.5" />
            Regenerate from latest run
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiTile
          label="Open"
          value={open}
          footnote={overdue > 0 ? `${overdue} overdue` : "On track"}
        />
        <KpiTile label="In progress" value={inProgress} accent="ai" />
        <KpiTile label="Shipped this month" value={done} accent="ai" />
        <KpiTile
          label="Predicted lift"
          value={estimatedLift(data)}
          decimals={1}
          suffix=" pts"
          footnote="If all open + in-progress ship"
        />
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList>
          <TabsTrigger value="queue">
            <ListChecks className="size-3.5" />
            Queue
          </TabsTrigger>
          <TabsTrigger value="board">
            <Layers className="size-3.5" />
            Board
          </TabsTrigger>
          <TabsTrigger value="matrix">
            <Target className="size-3.5" />
            Impact × Effort
          </TabsTrigger>
        </TabsList>
        <FilterBar
          query={query}
          setQuery={setQuery}
          pillar={pillar}
          setPillar={setPillar}
          status={status}
          setStatus={setStatus}
          assignee={assignee}
          setAssignee={setAssignee}
          sort={sort}
          setSort={setSort}
          members={members ?? []}
        />

        {selected.size > 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-2.5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selected.size} selected
              </span>
              <span className="text-xs text-muted-foreground">
                of {filtered.length} visible
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkSetStatus("in_progress")}
                disabled={bulk.isPending}
              >
                <Clock className="size-3.5" />
                In progress
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkSetStatus("done")}
                disabled={bulk.isPending}
              >
                <CheckCircle2 className="size-3.5" />
                Mark done
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => bulkSetStatus("dismissed")}
                disabled={bulk.isPending}
              >
                <XCircle className="size-3.5" />
                Dismiss
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelected(new Set())}
              >
                <X className="size-3.5" />
              </Button>
            </div>
          </div>
        )}

        <TabsContent value="queue" className="mt-4">
          <QueueTable
            rows={filtered}
            selected={selected}
            members={members ?? []}
            onToggle={toggleSelected}
            onToggleAll={toggleAllVisible}
            onSetStatus={setStatusFor}
            onAssign={assignTo}
            onOpen={setActive}
          />
        </TabsContent>

        <TabsContent value="board" className="mt-4">
          <KanbanBoard
            rows={filtered}
            members={members ?? []}
            onSetStatus={setStatusFor}
            onOpen={setActive}
          />
        </TabsContent>

        <TabsContent value="matrix" className="mt-4">
          <ImpactEffortMatrix rows={filtered} onOpen={setActive} />
        </TabsContent>
      </Tabs>

      {active && (
        <DetailDrawer
          rec={active}
          members={members ?? []}
          onClose={() => setActive(null)}
          onSetStatus={(s) => {
            setStatusFor(active.id, s);
            setActive({ ...active, status: s });
          }}
          onAssign={(id) => {
            assignTo(active.id, id);
            setActive({ ...active, assigneeId: id });
          }}
        />
      )}
    </div>
  );
}

function estimatedLift(rows: Recommendation[]): number {
  return (
    Math.round(
      rows
        .filter((r) => r.status === "open" || r.status === "in_progress")
        .reduce((s, r) => s + r.impactScore * 0.42, 0) * 10
    ) / 10
  );
}

function FilterBar({
  query,
  setQuery,
  pillar,
  setPillar,
  status,
  setStatus,
  assignee,
  setAssignee,
  sort,
  setSort,
  members,
}: {
  query: string;
  setQuery: (v: string) => void;
  pillar: string;
  setPillar: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  assignee: string;
  setAssignee: (v: string) => void;
  sort: string;
  setSort: (v: string) => void;
  members: Member[];
}) {
  const pillarLabel =
    pillar === "all"
      ? "all"
      : (PILLAR_LABEL[pillar as Recommendation["pillar"]] ?? pillar);
  const statusLabel =
    status === "active"
      ? "active"
      : status === "all"
        ? "all"
        : (STATUS_LABEL[status as RecommendationStatus]?.toLowerCase() ??
          status);
  const sortLabel = SORT_LABEL[sort] ?? sort;
  const ownerLabel =
    assignee === "all"
      ? "any"
      : assignee === "unassigned"
        ? "unassigned"
        : (members.find((m) => m.id === assignee)?.email.split("@")[0] ?? "any");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, tag, description"
          className="pl-9 h-9 text-xs"
        />
      </div>
      <Select value={pillar} onValueChange={(v) => setPillar(v ?? "all")}>
        <SelectTrigger className="h-9 text-xs">
          <span className="text-muted-foreground">Pillar</span>
          <span className="font-medium">{pillarLabel}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All pillars</SelectItem>
          <SelectItem value="search">Search</SelectItem>
          <SelectItem value="ai">AI Rec.</SelectItem>
          <SelectItem value="understanding">AI Underst.</SelectItem>
        </SelectContent>
      </Select>
      <Select value={status} onValueChange={(v) => setStatus(v ?? "active")}>
        <SelectTrigger className="h-9 text-xs">
          <span className="text-muted-foreground">Status</span>
          <span className="font-medium">{statusLabel}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="open">Open</SelectItem>
          <SelectItem value="in_progress">In progress</SelectItem>
          <SelectItem value="done">Done</SelectItem>
          <SelectItem value="dismissed">Dismissed</SelectItem>
        </SelectContent>
      </Select>
      <Select value={assignee} onValueChange={(v) => setAssignee(v ?? "all")}>
        <SelectTrigger className="h-9 text-xs">
          <span className="text-muted-foreground">Owner</span>
          <span className="font-medium">{ownerLabel}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Any assignee</SelectItem>
          <SelectItem value="unassigned">Unassigned</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.email.split("@")[0]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={sort} onValueChange={(v) => setSort(v ?? "priority")}>
        <SelectTrigger className="h-9 text-xs ml-auto">
          <ArrowUpDown className="size-3 opacity-60" />
          <span className="text-muted-foreground">Sort</span>
          <span className="font-medium">{sortLabel}</span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="priority">Priority</SelectItem>
          <SelectItem value="impact">Impact</SelectItem>
          <SelectItem value="effort">Effort</SelectItem>
          <SelectItem value="due">Due date</SelectItem>
          <SelectItem value="recent">Recently updated</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

const SORT_LABEL: Record<string, string> = {
  priority: "Priority",
  impact: "Impact",
  effort: "Effort",
  due: "Due date",
  recent: "Recently updated",
};

function QueueTable({
  rows,
  selected,
  members,
  onToggle,
  onToggleAll,
  onSetStatus,
  onAssign,
  onOpen,
}: {
  rows: Recommendation[];
  selected: Set<string>;
  members: Member[];
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  onSetStatus: (id: string, s: RecommendationStatus) => void;
  onAssign: (id: string, a: string | null) => void;
  onOpen: (r: Recommendation) => void;
}) {
  const allSelected = rows.length > 0 && selected.size === rows.length;
  if (rows.length === 0) {
    return (
      <Section title="Queue" description="No recommendations match the filters">
        <EmptyState
          icon={<ListChecks className="size-5" />}
          title="No matching recommendations"
          description="Try widening the status filter or clearing the search."
        />
      </Section>
    );
  }
  return (
    <Section
      title="Queue"
      description={`${rows.length} recommendations · sorted by priority`}
      contentClassName="p-0"
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[11px] uppercase tracking-wide text-muted-foreground border-b">
              <th className="px-4 py-3 w-8">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  aria-label="Select all"
                  className="size-3.5 rounded border-border accent-[color:var(--pillar-ai)]"
                />
              </th>
              <th className="text-left font-medium px-3 py-3">
                Recommendation
              </th>
              <th className="text-center font-medium px-3 py-3">Pillar</th>
              <th className="text-center font-medium px-3 py-3">Effort</th>
              <th className="text-center font-medium px-3 py-3">Impact</th>
              <th className="text-left font-medium px-3 py-3 hidden md:table-cell">
                Status
              </th>
              <th className="text-left font-medium px-3 py-3 hidden lg:table-cell">
                Assignee
              </th>
              <th className="text-left font-medium px-3 py-3 hidden lg:table-cell">
                Due
              </th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const StatusIcon = STATUS_ICON[r.status];
              const assignee = members.find((m) => m.id === r.assigneeId);
              const overdue =
                r.dueAt &&
                r.dueAt < "2026-05-15T09:00:00.000Z" &&
                (r.status === "open" || r.status === "in_progress");
              return (
                <tr
                  key={r.id}
                  className={cn(
                    "border-b last:border-b-0 transition-colors group hover:bg-muted/40",
                    selected.has(r.id) && "bg-[color:var(--pillar-ai-soft)]/40"
                  )}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => onToggle(r.id)}
                      aria-label="Select"
                      className="size-3.5 rounded border-border accent-[color:var(--pillar-ai)]"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => onOpen(r)}
                      className="text-left max-w-md group/title"
                    >
                      <p className="font-medium text-sm group-hover/title:underline">
                        {r.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {r.description}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {r.tags.slice(0, 3).map((t) => (
                          <Tag key={t} tone="neutral">
                            {t}
                          </Tag>
                        ))}
                      </div>
                    </button>
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <PillarChip pillar={r.pillar} />
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <EffortChip effort={r.effort} score={r.effortScore} />
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    <ImpactChip impact={r.impact} score={r.impactScore} />
                  </td>
                  <td className="px-3 py-3 hidden md:table-cell whitespace-nowrap">
                    <Tag tone={STATUS_TONE[r.status]}>
                      <StatusIcon className="size-3" />
                      {STATUS_LABEL[r.status]}
                    </Tag>
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    {assignee ? (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center size-6 rounded-full bg-[color:var(--pillar-ai-soft)] text-[color:var(--pillar-ai)] text-[10px] font-semibold">
                          {initials(assignee.email)}
                        </span>
                        <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                          {assignee.email.split("@")[0]}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Unassigned
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <span
                      className={cn(
                        "text-xs tabular-nums",
                        overdue
                          ? "text-[color:var(--negative)] font-medium"
                          : "text-muted-foreground"
                      )}
                    >
                      {overdue && (
                        <AlertTriangle className="inline size-3 mr-0.5" />
                      )}
                      {fmtDue(r.dueAt)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <RowMenu
                      rec={r}
                      members={members}
                      onSetStatus={onSetStatus}
                      onAssign={onAssign}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function KanbanBoard({
  rows,
  members,
  onSetStatus,
  onOpen,
}: {
  rows: Recommendation[];
  members: Member[];
  onSetStatus: (id: string, s: RecommendationStatus) => void;
  onOpen: (r: Recommendation) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      {KANBAN_COLUMNS.map((col) => {
        const items = rows.filter((r) => r.status === col);
        const Icon = STATUS_ICON[col];
        return (
          <div
            key={col}
            className="rounded-xl bg-card ring-1 ring-border flex flex-col min-h-[200px]"
          >
            <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {STATUS_LABEL[col]}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {items.length}
              </span>
            </div>
            <div className="p-2 space-y-2 flex-1">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Nothing here
                </p>
              ) : (
                items.map((r) => (
                  <KanbanCard
                    key={r.id}
                    rec={r}
                    members={members}
                    onSetStatus={onSetStatus}
                    onOpen={onOpen}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({
  rec,
  members,
  onSetStatus,
  onOpen,
}: {
  rec: Recommendation;
  members: Member[];
  onSetStatus: (id: string, s: RecommendationStatus) => void;
  onOpen: (r: Recommendation) => void;
}) {
  const assignee = members.find((m) => m.id === rec.assigneeId);
  return (
    <div className="rounded-lg border bg-background p-3 cursor-pointer hover:border-foreground/30 transition-colors group">
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <button onClick={() => onOpen(rec)} className="text-left flex-1">
          <p className="text-sm font-medium leading-tight group-hover:underline">
            {rec.title}
          </p>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="size-4" />
              </button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {KANBAN_COLUMNS.filter((s) => s !== rec.status).map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => onSetStatus(rec.id, s)}
                >
                  {STATUS_LABEL[s]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <PillarChip pillar={rec.pillar} />
        <EffortChip effort={rec.effort} score={rec.effortScore} compact />
        <ImpactChip impact={rec.impact} score={rec.impactScore} compact />
      </div>
      <div className="flex items-center justify-between">
        {assignee ? (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-[color:var(--pillar-ai-soft)] text-[color:var(--pillar-ai)] text-[9px] font-semibold">
              {initials(assignee.email)}
            </span>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground">Unassigned</span>
        )}
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {fmtDue(rec.dueAt)}
        </span>
      </div>
    </div>
  );
}

function ImpactEffortMatrix({
  rows,
  onOpen,
}: {
  rows: Recommendation[];
  onOpen: (r: Recommendation) => void;
}) {
  const visible = rows.filter(
    (r) => r.status === "open" || r.status === "in_progress"
  );
  const W = 560;
  const H = 360;
  const padX = 56;
  const padY = 36;

  return (
    <Section
      title="Impact × Effort"
    >
      <div className="overflow-x-auto">
        <svg
          width={W}
          height={H + 24}
          viewBox={`0 0 ${W} ${H + 24}`}
          className="block"
          role="img"
          aria-label="Impact vs Effort scatter"
        >
          {/* Quadrant background */}
          <rect
            x={padX}
            y={padY}
            width={(W - padX - 16) / 2}
            height={(H - padY - 16) / 2}
            fill="var(--pillar-ai-soft)"
            opacity={0.25}
          />
          <text
            x={padX + 10}
            y={padY + 18}
            className="fill-[color:var(--pillar-ai)] text-[10px] font-semibold uppercase tracking-wide"
          >
            Quick wins
          </text>
          <text
            x={padX + (W - padX - 16) / 2 + 10}
            y={padY + 18}
            className="fill-muted-foreground text-[10px] font-semibold uppercase tracking-wide"
          >
            Big bets
          </text>
          <text
            x={padX + 10}
            y={padY + (H - padY - 16) / 2 + 18}
            className="fill-muted-foreground text-[10px] font-semibold uppercase tracking-wide"
          >
            Fill-ins
          </text>
          <text
            x={padX + (W - padX - 16) / 2 + 10}
            y={padY + (H - padY - 16) / 2 + 18}
            className="fill-muted-foreground text-[10px] font-semibold uppercase tracking-wide"
          >
            Avoid
          </text>

          {/* Axes */}
          <line
            x1={padX}
            y1={H - 16}
            x2={W - 16}
            y2={H - 16}
            className="stroke-border"
            strokeWidth={1}
          />
          <line
            x1={padX}
            y1={padY}
            x2={padX}
            y2={H - 16}
            className="stroke-border"
            strokeWidth={1}
          />
          <text
            x={W - 16}
            y={H - 4}
            textAnchor="end"
            className="fill-muted-foreground text-[10px]"
          >
            More effort →
          </text>
          <text
            x={padX - 8}
            y={padY + 6}
            textAnchor="end"
            className="fill-muted-foreground text-[10px]"
            transform={`rotate(-90 ${padX - 8} ${padY + 6})`}
          >
            ← Higher impact
          </text>

          {/* Points */}
          {visible.map((r) => {
            const x = padX + ((r.effortScore - 1) / 9) * (W - padX - 16);
            const y = H - 16 - ((r.impactScore - 1) / 9) * (H - padY - 16);
            const radius = 6 + r.impactScore * 0.9;
            return (
              <g
                key={r.id}
                className="cursor-pointer animate-fade-up"
                onClick={() => onOpen(r)}
                style={{
                  animationDelay: `${(r.impactScore + r.effortScore) * 12}ms`,
                }}
              >
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={PILLAR_COLOR[r.pillar]}
                  fillOpacity={0.35}
                  stroke={PILLAR_COLOR[r.pillar]}
                  strokeWidth={1.5}
                />
                <title>{r.title}</title>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
        <span className="text-muted-foreground">Pillar:</span>
        {(["search", "ai", "understanding"] as const).map((p) => (
          <span key={p} className="inline-flex items-center gap-1.5">
            <span
              className="size-2.5 rounded-full"
              style={{ background: PILLAR_COLOR[p] }}
            />
            {PILLAR_LABEL[p]}
          </span>
        ))}
      </div>
    </Section>
  );
}

function RowMenu({
  rec,
  members,
  onSetStatus,
  onAssign,
}: {
  rec: Recommendation;
  members: Member[];
  onSetStatus: (id: string, s: RecommendationStatus) => void;
  onAssign: (id: string, a: string | null) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label="More"
            className="text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="size-4" />
          </button>
        }
      />
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Change status</DropdownMenuLabel>
          {KANBAN_COLUMNS.filter((s) => s !== rec.status).map((s) => (
            <DropdownMenuItem key={s} onClick={() => onSetStatus(rec.id, s)}>
              {STATUS_LABEL[s]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Assign to</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onAssign(rec.id, null)}>
            Unassigned
          </DropdownMenuItem>
          {members.map((m) => (
            <DropdownMenuItem key={m.id} onClick={() => onAssign(rec.id, m.id)}>
              {m.email.split("@")[0]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PillarChip({ pillar }: { pillar: Recommendation["pillar"] }) {
  return (
    <Tag
      tone="custom"
      style={{
        background: `color-mix(in oklch, ${PILLAR_COLOR[pillar]} 14%, transparent)`,
        color: PILLAR_COLOR[pillar],
      }}
    >
      {PILLAR_LABEL[pillar]}
    </Tag>
  );
}

function EffortChip({
  effort,
  score,
  compact,
}: {
  effort: Recommendation["effort"];
  score: number;
  compact?: boolean;
}) {
  const tone =
    effort === "S" ? "success" : effort === "M" ? "warning" : "danger";
  return (
    <Tag tone={tone} className="font-semibold tabular-nums">
      {effort}
      {!compact && <span className="opacity-60 font-normal">· {score}/10</span>}
    </Tag>
  );
}

function ImpactChip({
  impact,
  score,
  compact,
}: {
  impact: Recommendation["impact"];
  score: number;
  compact?: boolean;
}) {
  const tone =
    impact === "high" ? "primary" : impact === "medium" ? "info" : "neutral";
  return (
    <Tag tone={tone} className="font-semibold capitalize tabular-nums">
      {impact}
      {!compact && <span className="opacity-60 font-normal">· {score}/10</span>}
    </Tag>
  );
}

function DetailDrawer({
  rec,
  members,
  onClose,
  onSetStatus,
  onAssign,
}: {
  rec: Recommendation;
  members: Member[];
  onClose: () => void;
  onSetStatus: (s: RecommendationStatus) => void;
  onAssign: (id: string | null) => void;
}) {
  const assignee = members.find((m) => m.id === rec.assigneeId);
  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm animate-fade-up"
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[480px] bg-card ring-1 ring-border overflow-y-auto animate-fade-up"
        style={{ animationDelay: "30ms" }}
      >
        <header className="sticky top-0 bg-card/95 backdrop-blur-sm border-b px-5 py-4 flex items-center justify-between gap-3 z-10">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <PillarChip pillar={rec.pillar} />
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {rec.id}
              </span>
            </div>
            <h2 className="text-base font-semibold leading-tight">
              {rec.title}
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="size-4" />
          </Button>
        </header>
        <div className="px-5 py-4 space-y-5">
          <div className="grid grid-cols-3 gap-2">
            <DrawerField label="Effort">
              <EffortChip effort={rec.effort} score={rec.effortScore} />
            </DrawerField>
            <DrawerField label="Impact">
              <ImpactChip impact={rec.impact} score={rec.impactScore} />
            </DrawerField>
            <DrawerField label="Priority">
              <span className="text-sm font-semibold tabular-nums">
                {priorityScore(rec).toFixed(1)}
              </span>
            </DrawerField>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Description
            </h3>
            <p className="text-sm text-foreground leading-relaxed">
              {rec.description}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Evidence
            </h3>
            <p className="text-sm text-muted-foreground italic leading-relaxed border-l-2 border-[color:var(--pillar-ai)]/30 pl-3">
              {rec.evidence}
            </p>
            <p className="text-[11px] text-muted-foreground mt-2">
              Source · {rec.source}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Affected
            </h3>
            <ul className="space-y-1">
              {rec.affected.map((a) => (
                <li
                  key={a}
                  className="text-sm font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded inline-block mr-1.5"
                >
                  {a}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Status
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {KANBAN_COLUMNS.map((s) => {
                const Icon = STATUS_ICON[s];
                const isActive = rec.status === s;
                return (
                  <Button
                    key={s}
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    onClick={() => onSetStatus(s)}
                    disabled={isActive}
                  >
                    <Icon className="size-3.5" />
                    {STATUS_LABEL[s]}
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              Assignee
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                    {assignee ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center size-6 rounded-full bg-[color:var(--pillar-ai-soft)] text-[color:var(--pillar-ai)] text-[10px] font-semibold">
                          {initials(assignee.email)}
                        </span>
                        <span className="text-sm">{assignee.email}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground inline-flex items-center gap-2">
                        <User className="size-4" />
                        Unassigned
                      </span>
                    )}
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </button>
                }
              />
              <DropdownMenuContent align="start">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => onAssign(null)}>
                    Unassigned
                  </DropdownMenuItem>
                  {members.map((m) => (
                    <DropdownMenuItem key={m.id} onClick={() => onAssign(m.id)}>
                      {m.email}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
              Tags
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {rec.tags.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px]">
                  {t}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-3 border-t">
            <span>
              Created · {new Date(rec.createdAt).toLocaleDateString()}
            </span>
            <span>
              Updated · {new Date(rec.updatedAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}

function DrawerField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}
