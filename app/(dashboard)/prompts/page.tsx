"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookmarkPlus,
  Check,
  Columns2,
  Copy,
  CornerDownLeft,
  ExternalLink,
  Loader2,
  Play,
  RefreshCw,
  Sparkles,
  Square,
  Star,
  StopCircle,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { Sparkline } from "@/components/charts/sparkline";
import { Tag } from "@/components/ui/tag";
import { ModelMark } from "@/components/icons/model-logos";
import { AI_MODELS } from "@/lib/mocks/aiCitations";
import { useAddPromptToSet, usePromptSets } from "@/lib/api/prompts";
import {
  buildPromptHistory,
  findSandboxAnswer,
  type SandboxAnswer,
} from "@/lib/mocks/prompts";
import type { AiModel } from "@/lib/mocks/aiCitations";
import { cn } from "@/lib/utils";

const MODEL_BUBBLE: Record<AiModel, string> = {
  "gpt-4o": "bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  "claude-sonnet-4-6": "bg-orange-500/10 text-orange-900 dark:text-orange-100",
  "gemini-2.5-pro": "bg-blue-500/10 text-blue-900 dark:text-blue-100",
  "perplexity-online": "bg-teal-500/10 text-teal-900 dark:text-teal-100",
};

const SAMPLE_PROMPTS = [
  "best AI visibility platform for B2B SaaS in 2026",
  "Octify vs Datadog for AI search visibility",
  "pricing for AI brand tracking software",
  "what is answer engine optimization and how does it work",
];

export default function PromptSandboxPage() {
  const { data, refetch } = usePromptSets();
  const addPrompt = useAddPromptToSet();
  const [mode, setMode] = useState<"single" | "compare">("single");
  const [model, setModel] = useState<AiModel>("gpt-4o");
  const [modelB, setModelB] = useState<AiModel>("claude-sonnet-4-6");
  const [prompt, setPrompt] = useState(SAMPLE_PROMPTS[0]);
  const [draft, setDraft] = useState(SAMPLE_PROMPTS[0]);
  const [selectedSet, setSelectedSet] = useState<string>("set_discovery");

  const handlePick = (text: string, id?: string) => {
    setDraft(text);
    setPrompt(text);
    if (id) {
      const set = data?.sets.find((s) => s.promptIds.includes(id));
      if (set) setSelectedSet(set.id);
    }
  };

  const activePrompt = useMemo(
    () => data?.prompts.find((p) => p.text === prompt),
    [data, prompt]
  );

  function runDraft() {
    if (!draft.trim()) return;
    setPrompt(draft.trim());
  }

  async function handleSavePrompt() {
    const text = draft.trim();
    if (!text) return;
    try {
      await addPrompt.mutateAsync({ text, setId: selectedSet });
      toast.success("Saved to monitored set");
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    }
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader
        title="Prompt Sandbox"
        actions={
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as typeof mode)}
          >
            <TabsList>
              <TabsTrigger value="single">
                <Wand2 className="size-3.5" />
                Single
              </TabsTrigger>
              <TabsTrigger value="compare">
                <Columns2 className="size-3.5" />
                Compare
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

      {/* Hero input card */}
      <div className="relative rounded-2xl bg-card ring-1 ring-border focus-within:ring-foreground/30 focus-within:shadow-lg transition-all p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="size-5 mt-3 shrink-0 text-[color:var(--pillar-ai)]" />
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault();
                runDraft();
              }
            }}
            placeholder="What prompt do you want to test?"
            rows={2}
            className="flex-1 resize-none bg-transparent text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground py-2.5"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-3 border-t border-border/60">
          {mode === "single" ? (
            <ModelPicker value={model} onChange={setModel} />
          ) : (
            <div className="flex items-center gap-2">
              <ModelPicker value={model} onChange={setModel} />
              <span className="text-xs text-muted-foreground font-medium">
                vs
              </span>
              <ModelPicker value={modelB} onChange={setModelB} />
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Select
              value={selectedSet}
              onValueChange={(v) => setSelectedSet(v ?? "set_discovery")}
            >
              <SelectTrigger className="h-9 text-xs">
                <span className="text-muted-foreground">Save to</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(data?.sets ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSavePrompt}
              disabled={addPrompt.isPending || !draft.trim()}
            >
              <BookmarkPlus className="size-3.5" />
              Monitor
            </Button>
            <Button size="sm" onClick={runDraft} disabled={!draft.trim()}>
              Run
              <kbd className="ml-1 hidden sm:inline-flex items-center gap-0.5 text-[10px] opacity-70">
                ⌘<CornerDownLeft className="size-2.5" />
              </kbd>
            </Button>
          </div>
        </div>
      </div>

      {/* Sample prompts */}
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
          Try a prompt
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {SAMPLE_PROMPTS.map((s) => (
            <button
              key={s}
              onClick={() => handlePick(s)}
              className={cn(
                "group text-left rounded-xl border border-border bg-card px-4 py-3 hover:border-foreground/30 hover:shadow-sm transition-all",
                draft === s &&
                  "border-foreground/30 bg-muted/40 ring-1 ring-foreground/10"
              )}
            >
              <p className="text-sm leading-relaxed group-hover:text-foreground transition-colors">
                {s}
              </p>
            </button>
          ))}
        </div>
      </div>

      {mode === "single" ? (
        <AnswerPanel
          key={`${model}-${prompt}`}
          prompt={prompt}
          promptId={activePrompt?.id ?? null}
          model={model}
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <AnswerPanel
            key={`${model}-${prompt}-a`}
            prompt={prompt}
            promptId={activePrompt?.id ?? null}
            model={model}
          />
          <AnswerPanel
            key={`${modelB}-${prompt}-b`}
            prompt={prompt}
            promptId={activePrompt?.id ?? null}
            model={modelB}
          />
        </div>
      )}

      {/* Monitored prompt sets */}
      <div className="pt-2">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-base font-semibold">Monitored prompt sets</h2>
          <p className="text-xs text-muted-foreground">
            Click a prompt to load it
          </p>
        </div>
        <Tabs
          value={selectedSet}
          onValueChange={(v) => setSelectedSet(v ?? "set_discovery")}
        >
          <TabsList variant="line">
            {(data?.sets ?? []).map((s) => (
              <TabsTrigger key={s.id} value={s.id}>
                {s.name}
                <Tag tone="neutral" className="ml-1.5">
                  {s.promptIds.length}
                </Tag>
              </TabsTrigger>
            ))}
          </TabsList>

          {(data?.sets ?? []).map((s) => (
            <TabsContent key={s.id} value={s.id} className="mt-5">
              <p className="text-xs text-muted-foreground mb-3 max-w-2xl">
                {s.description}
              </p>
              <ul className="divide-y divide-border/60">
                {s.promptIds.map((id) => {
                  const p = data?.prompts.find((x) => x.id === id);
                  if (!p) return null;
                  const history = buildPromptHistory(id);
                  const cited = history.filter((h) => h.cited).length;
                  const total = history.length;
                  const rate = Math.round((cited / total) * 100);
                  return (
                    <li
                      key={id}
                      className="py-4 first:pt-0 last:pb-0 flex items-center gap-4 group"
                    >
                      <button
                        onClick={() => handlePick(p.text, p.id)}
                        className="text-left flex-1 min-w-0"
                      >
                        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                          {p.text}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                          weight {p.weight} · {cited} / {total} runs cited (
                          {rate}%)
                        </p>
                      </button>
                      <div className="text-[color:var(--pillar-ai)] shrink-0">
                        <Sparkline
                          data={history.map((h) =>
                            h.cited ? (h.position ?? 0) : 0
                          )}
                          width={96}
                          height={28}
                          invert
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handlePick(p.text, p.id)}
                      >
                        <Play className="size-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

function ModelPicker({
  value,
  onChange,
}: {
  value: AiModel;
  onChange: (v: AiModel) => void;
}) {
  const current = AI_MODELS.find((m) => m.id === value);
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange((v ?? "gpt-4o") as AiModel)}
    >
      <SelectTrigger className="h-9 min-w-[150px] text-sm gap-2">
        <ModelMark model={value} className="size-4" />
        <span className="font-medium">{current?.label}</span>
      </SelectTrigger>
      <SelectContent className="min-w-[260px] p-1">
        {AI_MODELS.map((m) => (
          <SelectItem key={m.id} value={m.id} className="py-2 pl-2.5">
            <div className="flex items-center gap-2.5 w-full pr-2">
              <ModelMark model={m.id} className="size-4 shrink-0" />
              <span className="font-medium">{m.label}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {m.vendor}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AnswerPanel({
  prompt,
  promptId,
  model,
}: {
  prompt: string;
  promptId: string | null;
  model: AiModel;
}) {
  const [streaming, setStreaming] = useState(false);
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState<SandboxAnswer | null>(null);
  const [thinking, setThinking] = useState(false);
  const rafRef = useRef<number | null>(null);
  const indexRef = useRef(0);
  const lastTickRef = useRef(0);
  const nextDelayRef = useRef(0);

  const modelMeta = AI_MODELS.find((m) => m.id === model)!;
  const tint = MODEL_BUBBLE[model];

  useEffect(() => {
    runPrompt();
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, model]);

  function runPrompt() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    if (!prompt.trim()) {
      setAnswer(null);
      setText("");
      return;
    }
    const next = findSandboxAnswer(model, promptId, prompt);
    setAnswer(next);
    setText("");
    setThinking(true);
    setStreaming(true);
    indexRef.current = 0;

    const ttft = 380 + Math.random() * 320;
    window.setTimeout(() => {
      setThinking(false);
      lastTickRef.current = performance.now();
      nextDelayRef.current = 18 + Math.random() * 20;
      streamLoop(next.text);
    }, ttft);
  }

  function streamLoop(full: string) {
    const tick = (now: number) => {
      if (now - lastTickRef.current >= nextDelayRef.current) {
        const chunk = 2 + Math.floor(Math.random() * 4);
        indexRef.current = Math.min(indexRef.current + chunk, full.length);
        setText(full.slice(0, indexRef.current));
        lastTickRef.current = now;
        nextDelayRef.current = 18 + Math.random() * 20;
        if (indexRef.current >= full.length) {
          setStreaming(false);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function stop() {
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    setStreaming(false);
    setThinking(false);
    if (answer) {
      setText(answer.text);
      indexRef.current = answer.text.length;
    }
  }

  function copy() {
    if (!answer) return;
    navigator.clipboard.writeText(answer.text);
    toast.success("Answer copied");
  }

  const targetCitations = answer?.citations.filter((c) => c.isTarget) ?? [];
  const isCited = targetCitations.length > 0;
  const firstPosition = targetCitations[0]?.position ?? null;

  return (
    <div className="space-y-5">
      {/* Bubble */}
      <div>
        <div className="flex items-center justify-between mb-3 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <ModelMark model={model} className="size-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-none">
                {modelMeta.label}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {modelMeta.vendor} · {model}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Tag tone={isCited ? "success" : "danger"}>
              {isCited ? (
                <>
                  <Check className="size-3" />
                  Cited{firstPosition ? ` #${firstPosition}` : ""}
                </>
              ) : (
                <>
                  <Square className="size-3" />
                  Not cited
                </>
              )}
            </Tag>
            <Button
              size="sm"
              variant="ghost"
              onClick={copy}
              disabled={streaming}
            >
              <Copy className="size-3.5" />
            </Button>
            {streaming ? (
              <Button size="sm" variant="outline" onClick={stop}>
                <StopCircle className="size-3.5" />
                Stop
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={runPrompt}>
                <RefreshCw className="size-3.5" />
                Re-run
              </Button>
            )}
          </div>
        </div>

        <div
          className={cn(
            "rounded-2xl rounded-tl-md px-5 py-4 text-[15px] leading-relaxed min-h-[140px]",
            tint
          )}
        >
          {thinking ? (
            <div className="flex items-center gap-2 text-foreground/60">
              <Loader2 className="size-3.5 animate-spin" />
              <span className="text-sm">
                {modelMeta.label} is composing an answer…
              </span>
            </div>
          ) : answer ? (
            streaming ? (
              <StreamingText text={text} />
            ) : (
              <FormattedAnswer text={text} citations={answer.citations} />
            )
          ) : (
            <p className="text-foreground/60">
              No answer yet — pick a prompt and a model.
            </p>
          )}
        </div>
      </div>

      {answer && !streaming && (
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
              Sources · {answer.citations.length}
            </h3>
            <ul className="space-y-1.5">
              {answer.citations.map((c) => (
                <li
                  key={`${c.position}-${c.url}`}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs group",
                    c.isTarget
                      ? "bg-[color:var(--positive)]/[0.06]"
                      : "hover:bg-muted/40"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center justify-center size-5 rounded text-[10px] font-bold shrink-0",
                      c.isTarget
                        ? "bg-[color:var(--positive)] text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {c.position}
                  </span>
                  <span className="font-medium shrink-0">{c.domain}</span>
                  {c.isTarget && (
                    <Tag
                      tone="success"
                      className="ml-0.5 [&>svg]:size-2.5"
                    >
                      <Star className="size-2.5" />
                      You
                    </Tag>
                  )}
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-auto text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] truncate min-w-0"
                  >
                    <span className="truncate">
                      {c.url.replace("https://", "")}
                    </span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {answer.followUp.length > 0 && (
            <div>
              <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-3">
                Likely follow-ups
              </h3>
              <ul className="space-y-1.5">
                {answer.followUp.map((q) => (
                  <li key={q}>
                    <button className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors text-xs group">
                      <ArrowRight className="size-3 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                      <span className="truncate">{q}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StreamingText({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap break-words">
      {text}
      <span className="inline-block w-[2px] h-[1.1em] align-text-bottom bg-foreground/70 ml-0.5 animate-caret-blink" />
    </div>
  );
}

function FormattedAnswer({
  text,
  citations,
}: {
  text: string;
  citations: SandboxAnswer["citations"];
}) {
  const nodes = useMemo(() => renderAnswer(text, citations), [text, citations]);
  return <div className="whitespace-pre-wrap break-words">{nodes}</div>;
}

function renderAnswer(
  text: string,
  citations: SandboxAnswer["citations"]
): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const superMap: Record<string, number> = {
    "¹": 1,
    "²": 2,
    "³": 3,
    "⁴": 4,
    "⁵": 5,
    "⁶": 6,
    "⁷": 7,
    "⁸": 8,
    "⁹": 9,
  };
  let buf = "";
  let key = 0;
  const flushBuf = () => {
    if (!buf) return;
    const parts = buf.split(/(\*\*[^*]+\*\*)/g);
    parts.forEach((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) {
        const inner = p.slice(2, -2);
        const isTargetMention = citations.some(
          (c) =>
            c.isTarget &&
            (inner.toLowerCase().includes(c.domain.split(".")[0]) ||
              inner.toLowerCase().includes("octify"))
        );
        out.push(
          <strong
            key={`b-${key}-${i}`}
            className={cn(
              isTargetMention &&
                "bg-[color:var(--positive)]/15 text-[color:var(--positive)] px-1 rounded"
            )}
          >
            {inner}
          </strong>
        );
      } else if (p) {
        out.push(<span key={`t-${key}-${i}`}>{p}</span>);
      }
    });
    buf = "";
    key++;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (superMap[ch]) {
      flushBuf();
      const idx = superMap[ch];
      const cit = citations.find((c) => c.position === idx);
      const isTarget = cit?.isTarget;
      out.push(
        <sup
          key={`s-${i}`}
          className={cn(
            "inline-flex items-center justify-center min-w-[16px] h-[16px] text-[9px] font-bold rounded-sm mx-0.5 px-0.5 align-text-top",
            isTarget
              ? "bg-[color:var(--positive)] text-white"
              : "bg-muted text-muted-foreground"
          )}
          title={cit ? cit.domain : undefined}
        >
          {idx}
        </sup>
      );
    } else {
      buf += ch;
    }
  }
  flushBuf();
  return out;
}
