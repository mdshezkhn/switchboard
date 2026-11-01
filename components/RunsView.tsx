"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ListFilter, RotateCw, Search, CheckCircle2, XCircle, Timer, Coins, CircleDollarSign } from "lucide-react";
import { RUNS, RUN_FILTERS, SPAN_KIND_META, stepDetailFor, type AgentId, type Run, type RunFilter, type TraceSpan } from "@/lib/data";
import { fmtDur, fmtInt, fmtMoney, fmtTokens, fmtAgo } from "@/lib/format";
import { AGENT_ICONS, SPAN_ICONS } from "./agentIcons";
import { PageHeader, StatusDot, StatusPill, Avatar } from "./chrome";
import { Rise } from "./motion";

const REPLAY_SECONDS = 3.6;

/* --------------------------------- run list -------------------------------- */

function RunList({
  runs,
  selectedId,
  onSelect,
}: {
  runs: Run[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="panel flex min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-edge px-3.5 py-2.5">
        <p className="flex items-center gap-1.5 text-[12.5px] font-bold">
          <ListFilter size={13} className="text-accent" />
          Recent runs
        </p>
        <p className="num text-[10px] text-mute">
          {runs.length} shown
          {runs.some((r) => r.status === "fail") && <span className="text-red"> · 1 failing</span>}
        </p>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {runs.map((r) => {
          const active = r.id === selectedId;
          return (
            <li key={r.id}>
              <button
                data-run-row
                onClick={() => onSelect(r.id)}
                aria-current={active ? "true" : undefined}
                className={`relative w-full border-b border-edge/60 px-3.5 py-2.5 text-left transition-colors hover:bg-panel-2/70 ${active ? "bg-accent/[0.08]" : ""}`}
              >
                {active && <span className="absolute inset-y-0 left-0 w-[2.5px] rounded-r bg-accent" />}
                <div className="flex items-baseline justify-between gap-2">
                  <span className="num flex items-center gap-2 text-[11.5px] text-fg-2">
                    <StatusDot tone={r.status === "ok" ? "green" : r.status === "fail" ? "red" : "amber"} />
                    {r.id}
                  </span>
                  <span className="num text-[11px] text-fg-2">{r.dur.toFixed(2)}s</span>
                </div>
                <p className={`mt-1 truncate text-[12.5px] font-semibold ${active ? "text-fg" : "text-fg/90"}`}>{r.subject}</p>
                <p className="num mt-1 flex items-center gap-1.5 text-[10px] text-mute">
                  <span className="truncate">{r.workflow}</span>·<span>{fmtTokens(r.tokens)} tok</span>·<span>{fmtMoney(r.cost)}</span>·
                  <span>{fmtAgo(r.agoSec)}</span>
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------- waterfall -------------------------------- */

function Waterfall({ run, onPickSpan, selectedSpanId }: { run: Run; onPickSpan: (s: TraceSpan) => void; selectedSpanId: string }) {
  const plotRef = useRef<HTMLDivElement | null>(null);
  const clockRef = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef(0);
  const [replaying, setReplaying] = useState(false);

  const groups = useMemo(() => {
    const out: { agent: string; agentId?: AgentId; spans: TraceSpan[] }[] = [];
    for (const s of run.spans) {
      let g = out.find((x) => x.agent === s.agent);
      if (!g) {
        g = { agent: s.agent, agentId: s.agentId, spans: [] };
        out.push(g);
      }
      g.spans.push(s);
    }
    return out;
  }, [run]);

  const ticks = useMemo(() => {
    const n = 5;
    return Array.from({ length: n }, (_, i) => (run.dur * i) / (n - 1));
  }, [run]);

  // set --p to 1 whenever the run changes (bars fully drawn)
  useEffect(() => {
    plotRef.current?.style.setProperty("--p", "1");
    setReplaying(false);
  }, [run]);

  const replay = () => {
    const plot = plotRef.current;
    if (!plot) return;
    cancelAnimationFrame(rafRef.current);
    setReplaying(true);
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - t0) / (REPLAY_SECONDS * 1000), 1);
      const eased = t < 0.04 ? t * 0.5 : t; // near-linear; the waterfall is a clock
      plot.style.setProperty("--p", String(eased));
      if (clockRef.current) clockRef.current.textContent = `${(eased * run.dur).toFixed(2)}s`;
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else setReplaying(false);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const total = run.dur;
  const pct = (v: number) => `${(v / total) * 100}%`;

  return (
    <div className="panel overflow-hidden">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-edge px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num text-[13px] font-semibold text-fg">{run.id}</span>
            <StatusPill status={run.status} />
            <span className="chip !py-0.5 !text-[10px]">{run.workflow}</span>
          </div>
          <h2 className="mt-1 truncate text-[17px] font-bold tracking-tight">{run.subject}</h2>
        </div>
        <div className="flex items-center gap-1.5">
          {[
            [Timer, run.dur.toFixed(2) + "s", "Duration"],
            [Coins, fmtInt(run.tokens), "Tokens"],
            [CircleDollarSign, fmtMoney(run.cost), "Cost"],
          ].map(([Icon, v, l]) => {
            const I = Icon as typeof Timer;
            return (
              <div key={l as string} className="panel-inset px-2.5 py-1.5 text-center">
                <p className="eyebrow flex items-center justify-center gap-1 !text-[9px]">
                  <I size={9} /> {l as string}
                </p>
                <p className="num mt-0.5 text-[13px] font-semibold">{v as string}</p>
              </div>
            );
          })}
          <button className="btn ml-1" onClick={replay} disabled={replaying} aria-label="Replay trace">
            <RotateCw size={12} className={replaying ? "animate-spin" : ""} style={{ animationDuration: "1.2s" }} />
            Replay
          </button>
        </div>
      </div>

      {/* plot */}
      <div className="relative px-4 pb-2 pt-2.5">
        <div className="mb-1 flex items-center justify-between">
          <p className="eyebrow">Span</p>
          <div className="flex w-full max-w-[62%] items-center justify-between pl-2 sm:max-w-[70%]">
            {ticks.map((t) => (
              <span key={t} className="num text-[9.5px] text-mute">
                {t.toFixed(0)}s
              </span>
            ))}
          </div>
        </div>

        <div className="flex">
          {/* label column */}
          <div className="w-[118px] shrink-0 sm:w-[150px]" aria-hidden>
            {groups.map((g) => (
              <div key={g.agent}>
                <div className="flex items-center gap-1.5 py-[5px]">
                  {g.agentId && (() => { const I = AGENT_ICONS[g.agentId]; return <I size={11} className="text-fg-2" />; })()}
                  <span className="text-[11.5px] font-bold text-fg">{g.agent}</span>
                </div>
                {g.spans.map((s) => (
                  <div key={s.id} className="flex items-center gap-1 py-[4.5px] pl-4">
                    {(() => { const I = SPAN_ICONS[s.kind]; return <I size={10} style={{ color: SPAN_KIND_META[s.kind].color }} />; })()}
                    <span className="num truncate text-[10.5px] text-fg-2">{s.label}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* track column */}
          <div ref={plotRef} className="relative min-w-0 flex-1 border-l border-edge/70" style={{ "--p": 1 } as React.CSSProperties}>
            {/* time grid */}
            {ticks.map((t) => (
              <span key={t} aria-hidden className="absolute inset-y-0 w-px bg-edge/50" style={{ left: pct(t) }} />
            ))}

            {groups.map((g) => (
              <div key={g.agent}>
                <div className="h-[26px] border-b border-edge/30" />
                {g.spans.map((s) => {
                  const meta = SPAN_KIND_META[s.kind];
                  const active = s.id === selectedSpanId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => onPickSpan(s)}
                      title={`${s.label} — ${s.dur.toFixed(2)}s · ${fmtTokens(s.tokens)} tok`}
                      className="group relative block h-[24px] w-full border-b border-transparent text-left"
                      aria-label={`${s.label}, ${meta.label}, ${s.dur.toFixed(2)} seconds`}
                    >
                      <span
                        className={`absolute top-1/2 h-[9px] -translate-y-1/2 rounded-[3px] transition-shadow ${active ? "ring-1 ring-fg/50" : "group-hover:ring-1 group-hover:ring-white/30"}`}
                        style={{
                          left: `calc(${pct(s.start)} + 4px)`,
                          width: `calc(${pct(s.dur)} - 8px)`,
                          background: s.kind === "llm" ? "linear-gradient(90deg,#7c5cff,#b39dff)" : `${meta.color}cc`,
                          boxShadow: `0 0 10px ${meta.color}55`,
                          transformOrigin: "left",
                          transform: `scaleX(min(max(calc((var(--p) * ${total} - ${s.start}) / ${s.dur}), 0), 1))`,
                        }}
                      />
                      <span className="num pointer-events-none absolute top-1/2 hidden -translate-y-1/2 whitespace-nowrap pl-1.5 text-[9.5px] text-mute group-hover:block sm:block" style={{ left: `calc(${pct(s.start + s.dur)} + 8px)` }}>
                        {s.dur.toFixed(2)}s{s.tokens ? ` · ${fmtInt(s.tokens)} tok` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}

            {/* playhead */}
            <div aria-hidden className="pointer-events-none absolute inset-y-0 z-10" style={{ left: "min(calc(var(--p) * 100%), calc(100% - 1px))", opacity: replaying ? 1 : 0 }}>
              <div className="h-full w-[1.5px] bg-green" style={{ boxShadow: "0 0 8px #3fd99f88" }} />
              <span ref={clockRef} className="num absolute -top-0.5 left-1.5 rounded bg-green/15 px-1 py-px text-[9px] font-semibold text-green" />
            </div>
          </div>
        </div>

        {/* legend */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-edge/60 pt-2.5">
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
            {Object.entries(SPAN_KIND_META).map(([k, m]) => (
              <span key={k} className="flex items-center gap-1.5 text-[10px] text-mute">
                <span className="h-[7px] w-[14px] rounded-[2px]" style={{ background: k === "llm" ? "linear-gradient(90deg,#7c5cff,#b39dff)" : `${m.color}cc` }} />
                {m.label}
              </span>
            ))}
          </div>
          <span className="flex items-center gap-1.5 text-[10.5px] text-mute">
            <Avatar name={run.owner} size={16} /> Owner {run.owner}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ step inspector ------------------------------ */

function StepInspector({ run, span }: { run: Run; span: TraceSpan }) {
  const detail = stepDetailFor(run, span);
  const Icon = SPAN_ICONS[span.kind];
  const meta = SPAN_KIND_META[span.kind];
  const error = detail.status === "error";
  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: `${meta.color}1f`, color: meta.color }}>
            <Icon size={14} />
          </span>
          <div>
            <p className="num text-[13px] font-semibold text-fg">{span.label}</p>
            <p className="eyebrow !text-[9px]">Step inspector · {meta.label}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="chip num !text-[10px]">start {detail.start.toFixed(2)}s</span>
          <span className="chip num !text-[10px]">{detail.dur.toFixed(2)}s</span>
          <span className="chip num !text-[10px]">{fmtInt(detail.tokens)} tok</span>
          <span className="chip num !border-accent/40 !bg-accent/15 !text-[10px] !text-accent-2">{detail.model}</span>
        </div>
      </div>
      <div className="grid gap-px bg-edge/50 md:grid-cols-2">
        {[
          ["Prompt", detail.prompt],
          ["Response", detail.response],
        ].map(([label, body], i) => (
          <div key={label} className="bg-panel p-3.5">
            <p className="eyebrow mb-2 flex items-center justify-between">
              {label}
              {i === 1 &&
                (error ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-red">
                    <XCircle size={10} /> error
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-green">
                    <CheckCircle2 size={10} /> ok
                  </span>
                ))}
            </p>
            <pre className="num whitespace-pre-wrap text-[11px] leading-[1.6] text-fg-2">{body}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------- view ----------------------------------- */

export default function RunsView({ focusRunId }: { focusRunId?: string | null }) {
  const [selectedId, setSelectedId] = useState(RUNS[0].id);
  const [filter, setFilter] = useState<RunFilter>("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (focusRunId) setSelectedId(focusRunId);
  }, [focusRunId]);

  const runs = useMemo(() => {
    let out = RUNS;
    if (filter === "Issues") out = out.filter((r) => r.status !== "ok");
    if (filter === "Live") out = out.filter((r) => r.status === "ok");
    const q = query.trim().toLowerCase();
    if (q) out = out.filter((r) => r.id.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q));
    return out;
  }, [filter, query]);

  const run = runs.find((r) => r.id === selectedId) ?? runs[0] ?? RUNS[0];
  const [span, setSpan] = useState<TraceSpan>(run.spans[0]);

  useEffect(() => {
    // default the inspector to the first LLM call, like a tracer would
    const llm = run.spans.find((s) => s.kind === "llm");
    setSpan(llm ?? run.spans[0]);
  }, [run]);

  return (
    <div>
      <PageHeader
        title="Runs"
        sub={
          <>
            Every run is a scripted trace replayed locally · last hour · <span className="num">{runs.length} runs</span>
          </>
        }
      >
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by id or subject"
            aria-label="Filter runs"
            className="h-8 w-[190px] rounded-lg border border-edge bg-panel-2 pl-8 pr-3 text-[12px] text-fg placeholder:text-mute focus:border-accent/50 focus:outline-none"
          />
        </div>
        <div className="flex items-center rounded-lg border border-edge bg-panel-2 p-0.5">
          {RUN_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={`rounded-[7px] px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${filter === f ? "bg-panel-3 text-fg" : "text-mute hover:text-fg-2"}`}
            >
              {f}
            </button>
          ))}
        </div>
      </PageHeader>

      <Rise className="grid gap-3 xl:grid-cols-[330px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="max-h-[560px] xl:max-h-none">
            <RunList runs={runs} selectedId={run.id} onSelect={setSelectedId} />
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <Waterfall run={run} selectedSpanId={span?.id ?? ""} onPickSpan={setSpan} />
          {span && <StepInspector run={run} span={span} />}
        </div>
      </Rise>
    </div>
  );
}
