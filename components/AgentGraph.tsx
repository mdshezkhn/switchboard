"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, CheckCircle2, Layers, Sparkles, Activity } from "lucide-react";
import {
  AGENTS,
  AGENT_QUEUE,
  EDGES,
  EDGE_COLORS,
  JUST_COMPLETED,
  LAST_OUTPUT,
  QUEUES,
  RESOLVED_TODAY,
  type AgentId,
} from "@/lib/data";
import { RelayGraph, type Projected } from "@/lib/canvas";
import { onReducedMotionChange } from "@/lib/reduced-motion";
import { useSize } from "@/lib/useSize";
import { AGENT_ICONS } from "./agentIcons";
import { PageHeader, StatusDot } from "./chrome";
import { Rise } from "./motion";

/* ------------------------------- simulation -------------------------------- */

type Stop = AgentId | "reply.out" | "ticket.in";

interface SimRun {
  id: string;
  seq: Stop[];
  idx: number; // index of the stop we're currently processing
  t: number;
  dur: number;
}

function buildSeq(): { seq: Stop[]; revision: boolean } {
  const branchA = Math.random() < 0.62;
  const revision = Math.random() < 0.22;
  const seq: Stop[] = ["planner"];
  if (branchA) seq.push("researcher", "retriever");
  else seq.push("toolcalls");
  if (branchA && Math.random() < 0.5) seq.push("toolcalls");
  seq.push("writer", "reviewer");
  if (revision) seq.push("writer", "reviewer");
  seq.push("reply.out" as Stop);
  return { seq, revision };
}

const STAGE_MIN = 0.9;
const STAGE_JITTER = 1.0;

function useRelaySim(graphRef: React.RefObject<RelayGraph | null>) {
  const [busy, setBusy] = useState<Set<AgentId>>(new Set());
  const [inFlight, setInFlight] = useState<{ id: string; at: Stop; progress: number }[]>([]);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [thinking, setThinking] = useState(3);

  const runsRef = useRef<SimRun[]>([]);
  const pausedRef = useRef(false);
  const speedRef = useRef(1);
  const spawnRef = useRef({ last: 0, next: 2.5, counter: 214 });
  const clockRef = useRef(0);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    speedRef.current = speed;
    graphRef.current?.setSpeed(speed);
  }, [speed, graphRef]);

  useEffect(() => {
    const STEP = 0.12;
    const id = window.setInterval(() => {
      if (pausedRef.current) return;
      const dt = STEP * speedRef.current;
      clockRef.current += dt;
      const clock = clockRef.current;

      // spawn new traffic
      const sp = spawnRef.current;
      if (clock - sp.last > sp.next && runsRef.current.length < 5) {
        sp.last = clock;
        sp.next = 4.2 + Math.random() * 3.2;
        const { seq } = buildSeq();
        sp.counter += 1;
        const run: SimRun = { id: `r-90${sp.counter}`, seq, idx: 0, t: 0, dur: STAGE_MIN + Math.random() * STAGE_JITTER };
        runsRef.current.push(run);
        graphRef.current?.spawnPacket("ticket.in", seq[0], "handoff");
      }

      // advance runs
      const finished: SimRun[] = [];
      for (const run of runsRef.current) {
        run.t += dt;
        if (run.t >= run.dur) {
          run.t = 0;
          run.dur = STAGE_MIN + Math.random() * STAGE_JITTER;
          const from = run.seq[run.idx];
          run.idx += 1;
          if (run.idx >= run.seq.length) {
            finished.push(run);
            continue;
          }
          const to = run.seq[run.idx];
          const kind = EDGES.find((e) => e.from === from && e.to === to)?.kind ?? "handoff";
          graphRef.current?.spawnPacket(from, to, kind);
        }
      }
      if (finished.length) runsRef.current = runsRef.current.filter((r) => !finished.includes(r));

      // project sim → react state (throttled by the interval itself)
      const busyNow = new Set<AgentId>();
      const tray: { id: string; at: Stop; progress: number }[] = [];
      for (const run of runsRef.current) {
        const at = run.seq[run.idx];
        if (at !== "reply.out") busyNow.add(at as AgentId);
        if (tray.length < 4) {
          tray.push({
            id: run.id,
            at,
            progress: Math.min(1, (run.idx + run.t / run.dur) / run.seq.length),
          });
        }
      }
      setBusy((prev) => {
        if (prev.size === busyNow.size && [...prev].every((v) => busyNow.has(v))) return prev;
        return busyNow;
      });
      setInFlight(tray);
      setThinking(Math.max(1, Math.min(6, busyNow.size || 1 + Math.round(Math.sin(clock / 3)))));
    }, STEP * 1000);
    return () => window.clearInterval(id);
  }, [graphRef]);

  useEffect(() => {
    graphRef.current?.setBusy(new Set(busy));
  }, [busy, graphRef]);

  return { busy, inFlight, paused, speed, thinking, setPaused, setSpeed };
}

/* ------------------------------- relay panel ------------------------------- */

function RelayPanel({
  graphRef,
  busy,
  inFlight,
  thinking,
  selected,
  onSelect,
}: {
  graphRef: React.RefObject<RelayGraph | null>;
  busy: Set<AgentId>;
  inFlight: { id: string; at: Stop; progress: number }[];
  thinking: number;
  selected: AgentId;
  onSelect: (id: AgentId) => void;
}) {
  const { ref: hostRef, width, height } = useSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chipRefs = useRef(new Map<string, HTMLDivElement | null>(null));
  const [reduced, setReduced] = useState(false);

  // create / recreate the canvas engine when the host size is known
  useEffect(() => {
    if (!canvasRef.current || width < 10 || height < 10) return;
    const graph = new RelayGraph(canvasRef.current, reduced);
    graphRef.current = graph;
    graph.onProject = (proj: Projected[]) => {
      for (const p of proj) {
        const el = chipRefs.current.get(p.id);
        if (!el) continue;
        const s = 0.82 + (p.scale - 1) * 0.35;
        el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -100%) scale(${s.toFixed(3)})`;
        el.style.zIndex = `${Math.round(30 - p.z * 10)}`;
      }
    };
    graph.start();
    if (reduced) graph.renderOnce();
    return () => {
      graph.stop();
      graphRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height]);

  useEffect(() => onReducedMotionChange((r) => setReduced(r)), []);

  // react to reduced-motion changes live
  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    g.setReduced(reduced);
    if (reduced) {
      g.stop();
      g.renderOnce();
    } else {
      g.start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const busyLabel = useMemo(() => `${thinking} agent${thinking === 1 ? "" : "s"} thinking · ${Math.max(1, inFlight.length)} runs in flight`, [thinking, inFlight.length]);

  const setChip = useCallback((id: string) => (el: HTMLDivElement | null) => {
    chipRefs.current.set(id, el);
  }, []);

  return (
    <div className="panel relative overflow-hidden">
      {/* header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-3.5">
        <div>
          <p className="eyebrow flex items-center gap-1.5">
            <StatusDot tone="green" pulse />
            Live relay
          </p>
          <h2 className="mt-0.5 text-[19px] font-bold tracking-tight">Support triage graph</h2>
          <p className="num mt-0.5 text-[11px] text-mute">{busyLabel}</p>
        </div>
        <div className="hidden gap-1.5 sm:flex">
          {[
            ["7.9s", "p50 run"],
            ["4.1k", "tok/run"],
            ["98.6%", "success"],
          ].map(([v, l]) => (
            <div key={l} className="panel-inset px-2.5 py-1.5 text-center">
              <div className="num text-[13px] font-semibold text-fg">{v}</div>
              <div className="eyebrow !text-[9px]">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* canvas stage */}
      <div ref={hostRef} className="relative h-[380px] sm:h-[420px]">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-label="Animated relay graph of six cooperating agents" role="img" />
        {/* DOM label chips, positioned by the canvas engine; clicking inspects */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {AGENTS.map((a) => {
            const Icon = AGENT_ICONS[a.id];
            const isBusy = busy.has(a.id);
            const active = a.id === selected;
            return (
              <div key={a.id} ref={setChip(a.id)} className="absolute left-0 top-0 will-change-transform">
                <button
                  data-agent-chip
                  onClick={() => onSelect(a.id)}
                  aria-pressed={active}
                  aria-label={`Inspect ${a.name}`}
                  className={`pointer-events-auto flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1.5 backdrop-blur-sm transition-colors duration-300 ${active ? "border-accent/60 bg-accent/15" : isBusy ? "border-edge-2 bg-panel-3/95" : "border-edge bg-panel-2/90"}`}
                >
                  <span className="grid h-[18px] w-[18px] place-items-center rounded-md" style={{ background: `${a.color[0]}26`, color: a.color[0] }}>
                    <Icon size={11} strokeWidth={2} />
                  </span>
                  <span>
                    <span className="block text-left text-[11px] font-bold leading-none text-fg">{a.name}</span>
                    <span className="num block text-left text-[9px] leading-none text-mute mt-[3px]">
                      {isBusy ? a.verb : `${a.model.split(" ")[0].toLowerCase()} · idle`}
                    </span>
                  </span>
                </button>
              </div>
            );
          })}
          {(["ticket.in", "reply.out"] as const).map((t) => (
            <div key={t} ref={setChip(t)} className="absolute left-0 top-0 opacity-0 will-change-transform">
              {/* terminals are captioned on-canvas; keep an anchor for the engine */}
            </div>
          ))}
        </div>

        {/* legend */}
        <div className="absolute bottom-3 left-4 flex items-center gap-4">
          {(Object.entries(EDGE_COLORS) as [keyof typeof EDGE_COLORS, string][]).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1.5 text-[10.5px] text-mute">
              <span className="h-[2px] w-4 rounded-full" style={{ background: c }} />
              {k === "handoff" ? "Handoff" : k === "tool" ? "Tool call / reply" : "Revision"}
            </span>
          ))}
        </div>

        {/* in-flight tray */}
        <div className="absolute bottom-3 right-3 hidden w-[340px] rounded-xl border border-edge bg-bg/80 p-2 backdrop-blur md:block">
          <p className="eyebrow mb-1.5 px-1">In flight</p>
          <div className="grid grid-cols-2 gap-1.5">
            {inFlight.map((r) => {
              const agent = AGENTS.find((a) => a.id === r.at);
              return (
                <div key={r.id} className="rounded-lg border border-edge bg-panel-2 px-2 py-1.5">
                  <div className="flex items-baseline justify-between gap-1">
                    <span className="num text-[10.5px] text-fg-2">{r.id}</span>
                    <span className="truncate text-[10px] text-mute">→ {agent?.name ?? (r.at === "reply.out" ? "Reply" : r.at)}</span>
                  </div>
                  <div className="mt-1 h-[2.5px] overflow-hidden rounded-full bg-panel-3">
                    <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${r.progress * 100}%` }} />
                  </div>
                </div>
              );
            })}
            {inFlight.length === 0 && <p className="num col-span-2 px-1 py-1 text-[10.5px] text-mute">waiting for tickets…</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------- inspector -------------------------------- */

function Inspector({ busy, selected, onSelect }: { busy: Set<AgentId>; selected: AgentId; onSelect: (id: AgentId) => void }) {
  const [chars, setChars] = useState(0);
  const agent = AGENTS.find((a) => a.id === selected)!;
  const Icon = AGENT_ICONS[selected];
  const reduced = useRef(false);
  useEffect(() => onReducedMotionChange((r) => (reduced.current = r)), []);

  // typewriter for the last output
  useEffect(() => {
    setChars(0);
    if (reduced.current) {
      setChars(LAST_OUTPUT.text.length);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const CPS = 220;
    const tick = (now: number) => {
      const n = Math.floor(((now - t0) / 1000) * CPS);
      setChars(Math.min(n, LAST_OUTPUT.text.length));
      if (n < LAST_OUTPUT.text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [selected]);

  const done = chars >= LAST_OUTPUT.text.length;
  const queue = AGENT_QUEUE[selected];

  return (
    <aside className="panel flex flex-col gap-3 p-3.5" aria-label="Agent inspector">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[13px] font-bold">
          <Activity size={14} className="text-accent" />
          Inspector
        </p>
        <p className="num text-[10px] text-mute">
          <span className="text-accent">{busy.size || 0}</span> of 6 agents busy
        </p>
      </div>

      {/* agent picker */}
      <div className="flex items-center justify-between gap-1">
        {AGENTS.map((a) => {
          const AIcon = AGENT_ICONS[a.id];
          const active = a.id === selected;
          return (
            <button
              key={a.id}
              onClick={() => onSelect(a.id)}
              aria-label={`Inspect ${a.name}`}
              aria-pressed={active}
              className={`icon-btn !h-8 !w-8 ${active ? "!border-accent/50 !bg-accent/20 !text-fg" : ""}`}
              title={a.name}
            >
              <AIcon size={14} strokeWidth={1.9} />
              <span
                className="absolute bottom-1 h-[3px] w-[3px] rounded-full"
                style={{ background: busy.has(a.id) ? a.color[0] : "transparent" }}
              />
            </button>
          );
        })}
      </div>

      {/* selected agent */}
      <div className="flex items-start gap-3">
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
          style={{ background: `linear-gradient(135deg, ${agent.color[0]}33, ${agent.color[1]}22)`, border: `1px solid ${agent.color[0]}55`, color: agent.color[0] }}
        >
          <Icon size={19} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-[15px] font-bold">{agent.name}</h3>
            <span className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: `${agent.color[0]}1f`, color: agent.color[0] }}>
              {busy.has(selected) ? agent.verb : "idle"}
            </span>
          </div>
          <p className="mt-0.5 text-[11.5px] leading-snug text-fg-2">{agent.desc}</p>
        </div>
      </div>

      {/* spec grid */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          ["Model", agent.model, "cog"],
          ["Temp", String(agent.temp), "t"],
          ["Context", agent.context, "#"],
        ].map(([label, value]) => (
          <div key={label} className="panel-inset px-2 py-1.5">
            <p className="eyebrow !text-[9px]">{label}</p>
            <p className="num mt-0.5 text-[12.5px] font-semibold text-fg">{value}</p>
          </div>
        ))}
      </div>

      {/* tools */}
      <div className="flex flex-wrap gap-1.5">
        {agent.tools.map((t) => (
          <code key={t} className="num rounded-md border border-teal/30 bg-teal/10 px-1.5 py-0.5 text-[10.5px] text-teal">
            {t}
          </code>
        ))}
      </div>

      {/* perf stats */}
      <div className="grid grid-cols-3 gap-1.5">
        {[
          ["p50 latency", agent.p50],
          ["Tokens / run", agent.tokensPerRun],
          ["Success", agent.success],
        ].map(([l, v]) => (
          <div key={l} className="px-0.5">
            <p className="eyebrow !text-[9px] flex items-center gap-1">
              <Sparkles size={8} /> {l}
            </p>
            <p className="num mt-0.5 text-[13px] font-semibold">{v}</p>
          </div>
        ))}
      </div>

      {/* last output */}
      <div className="panel-inset flex min-h-0 flex-1 flex-col p-2.5">
        <div className="mb-1.5 flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-fg-2">
            <span className="h-[6px] w-[6px] rounded-full bg-accent" />
            Last output <span className="num text-mute">{LAST_OUTPUT.run}</span>
          </p>
          <p className="num text-[10px] text-mute">
            {Math.round((chars / 4) * 1.4)} tok · {done ? "done" : "84 tok/s"}
          </p>
        </div>
        <div className="num min-h-[150px] whitespace-pre-wrap text-[11px] leading-[1.55] text-fg-2">
          {LAST_OUTPUT.text.slice(0, chars)}
          {!done && <span className="animate-blink text-accent">▍</span>}
          {done && <span className="sr-only"> (complete)</span>}
        </div>
      </div>

      {/* queue */}
      <div>
        <p className="eyebrow mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers size={9} /> Queue
          </span>
          <span>{queue.length} waiting</span>
        </p>
        <ul className="flex flex-col gap-1">
          {queue.map((q, i) => (
            <li key={q.id} className="flex items-center gap-2 rounded-lg border border-edge bg-panel-2/60 px-2 py-1.5">
              <StatusDot tone={(["amber", "blue", "mute"] as const)[i % 3]} />
              <span className="num text-[10.5px] text-mute">{q.id}</span>
              <span className="truncate text-[11.5px] text-fg-2">{q.subject}</span>
              <span className="num ml-auto text-[10px] text-mute">{q.eta}</span>
            </li>
          ))}
          {queue.length === 0 && <li className="num px-1 py-1 text-[10.5px] text-mute">empty</li>}
        </ul>
      </div>
    </aside>
  );
}

/* ------------------------------- bottom cards ------------------------------ */

function ResolvedToday() {
  return (
    <div className="relative overflow-hidden rounded-[14px] p-4" style={{ background: "linear-gradient(150deg, #7c5cff 0%, #6d55f2 55%, #5537d4 100%)", boxShadow: "0 8px 30px rgba(109,85,242,0.25)" }}>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold text-white/90">
          <CheckCircle2 size={13} /> Resolved today
        </p>
        <span className="rounded-full bg-white/18 px-1.5 py-0.5 text-[10px] font-bold text-white">{RESOLVED_TODAY.delta}</span>
      </div>
      <p className="num mt-2 text-[34px] font-bold leading-none text-white">{RESOLVED_TODAY.total.toLocaleString()}</p>
      <p className="mt-1 text-[11px] text-white/70">{RESOLVED_TODAY.caption}</p>
      <div className="mt-3 flex h-9 items-end gap-[3px]" aria-hidden>
        {RESOLVED_TODAY.bars.map((b, i) => (
          <span key={i} className="flex-1 rounded-sm bg-white/85" style={{ height: `${Math.max(6, b * 100)}%`, opacity: 0.35 + b * 0.65 }} />
        ))}
      </div>
      <div className="num mt-1 flex justify-between text-[9px] text-white/60">
        <span>8am</span>
        <span>12h</span>
        <span>23h</span>
      </div>
    </div>
  );
}

function Queues() {
  const toneColor: Record<string, string> = { teal: "#34d9c3", amber: "#f5b544", red: "#f4627e" };
  const statusColor: Record<string, string> = { Healthy: "#3fd99f", Backlog: "#f5b544", Throttled: "#f4627e" };
  return (
    <div className="panel p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12.5px] font-bold">
          <Layers size={13} className="text-accent" /> Queues
        </p>
        <p className="num text-[10.5px] text-mute">{QUEUES.reduce((s, q) => s + q.waiting, 0)} waiting</p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {QUEUES.map((q) => (
          <li key={q.name}>
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-semibold text-fg-2">{q.name}</span>
              <span className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10.5px]" style={{ color: statusColor[q.status] }}>
                  <StatusDot tone={q.status === "Healthy" ? "green" : q.status === "Backlog" ? "amber" : "red"} />
                  {q.status}
                </span>
                <span className="num text-[10.5px] text-mute">
                  {q.waiting} · {q.eta}
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-panel-3">
              <div className="h-full rounded-full" style={{ width: `${q.load * 100}%`, background: toneColor[q.tone] }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function JustCompleted() {
  return (
    <div className="panel p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12.5px] font-bold">
          <CheckCircle2 size={13} className="text-green" /> Just completed
        </p>
        <StatusDot tone="green" pulse />
      </div>
      <ul className="flex flex-col gap-[7px]">
        {JUST_COMPLETED.map((c) => (
          <li key={c.subject} className="flex items-center gap-2 text-[11.5px]">
            <CheckCircle2 size={11} className="shrink-0 text-green/80" />
            <span className="truncate text-fg-2">{c.subject}</span>
            <span className="num ml-auto shrink-0 text-[10.5px] text-mute">
              {c.dur} · {c.tok}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------- view ----------------------------------- */

export default function AgentGraphView() {
  const graphRef = useRef<RelayGraph | null>(null);
  const { busy, inFlight, paused, speed, thinking, setPaused, setSpeed } = useRelaySim(graphRef);
  const [selected, setSelected] = useState<AgentId>("writer");

  return (
    <div>
      <PageHeader
        title="Agents"
        chip={
          <span className="num flex items-center gap-1.5 rounded-md border border-accent/40 bg-accent/15 px-2 py-1 text-[11px] font-semibold text-accent-2">
            support-triage · v18
          </span>
        }
        sub="Six agents relay each ticket from intake to reply — replaying production-shaped traffic (simulated)"
      >
        <button className="btn num !px-2.5" onClick={() => setSpeed(speed === 1 ? 2 : 1)} aria-label={`Replay speed ${speed}×`}>
          <Play size={11} /> {speed}×
        </button>
        <button className="btn" onClick={() => setPaused(!paused)}>
          {paused ? <Play size={12} /> : <Pause size={12} />}
          {paused ? "Resume" : "Pause"}
        </button>
      </PageHeader>

      <Rise className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="flex min-w-0 flex-col gap-3">
          <RelayPanel graphRef={graphRef} busy={busy} inFlight={inFlight} thinking={thinking} selected={selected} onSelect={setSelected} />
          <div className="grid gap-3 md:grid-cols-3">
            <ResolvedToday />
            <Queues />
            <JustCompleted />
          </div>
        </div>
        <Inspector busy={busy} selected={selected} onSelect={setSelected} />
      </Rise>
    </div>
  );
}
