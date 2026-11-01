"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, FlaskConical, GitCompareArrows, Play, Pin, ExternalLink, CircleDot } from "lucide-react";
import { COMPARE, EVAL_CATEGORIES, EVAL_STATS, EVAL_VERSIONS, PASS_BAR, REGRESSION } from "@/lib/data";
import { PageHeader, Sparkline, Avatar } from "./chrome";
import { Rise } from "./motion";

/* -------------------------------- stat cards ------------------------------- */

function EvalStats() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {[
        { label: "Overall score · v18", value: String(EVAL_STATS.overall), delta: `▼ ${EVAL_STATS.overallDelta}`, good: false, sub: "vs v17" },
        { label: "Pass rate", value: `${EVAL_STATS.passRate}%`, delta: `▼ ${EVAL_STATS.passDelta}`, good: false, sub: "vs v17" },
        { label: "Judge agreement", value: String(EVAL_STATS.judgeAgreement), delta: `↗ ${EVAL_STATS.judgeDelta.replace("+", "")}`, good: true, sub: "vs v17" },
        { label: "Human spot checks", value: String(EVAL_STATS.spotChecks), delta: null, good: true, sub: EVAL_STATS.spotNote },
      ].map((c) => (
        <div key={c.label} className="panel p-3.5">
          <p className="eyebrow flex items-center justify-between">
            {c.label}
            {c.delta && (
              <span className="num font-semibold" style={{ color: c.good ? "#3fd99f" : "#f4627e" }}>
                {c.delta}
              </span>
            )}
          </p>
          <p className="num mt-1.5 text-[25px] font-bold leading-none text-fg">{c.value}</p>
          <p className="num mt-1 text-[10px] text-mute">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ evaluation matrix --------------------------- */

function cellColor(score: number | null): string {
  if (score === null) return "transparent";
  const t = Math.max(0, Math.min(1, (score - 50) / 50)); // 50 → 100 maps to alpha 0.08 → 0.75
  return `rgba(143, 123, 255, ${0.08 + t * 0.62})`;
}

function Matrix({ bIdx, onPickVersion }: { bIdx: number; onPickVersion: (i: number) => void }) {
  const aIdx = Math.max(0, bIdx - 1);
  const regressedRow = 2; // "Cite KB article"
  const regressedCol = 7; // v18

  return (
    <div className="panel overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-edge px-4 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-[13px] font-bold">
            <FlaskConical size={13} className="text-accent" /> Evaluation matrix
          </p>
          <p className="mt-0.5 text-[11px] text-mute">Score per task category and workflow version — click a version to compare it with the one before</p>
        </div>
        <span className="num text-[10px] text-mute">{EVAL_CATEGORIES.length} × {EVAL_VERSIONS.length} cells</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-[3px] p-2 text-center">
          <thead>
            <tr>
              <th className="eyebrow !text-[9px] px-2 pb-1 text-left">Task category</th>
              {EVAL_VERSIONS.map((v, i) => (
                <th key={v.id} className="pb-1">
                  <button
                    onClick={() => onPickVersion(i)}
                    className={`mx-auto flex w-[58px] flex-col items-center rounded-lg border px-1 py-1 transition-colors ${
                      i === bIdx ? "border-accent/60 bg-accent/15" : "border-transparent hover:bg-panel-2"
                    }`}
                    aria-pressed={i === bIdx}
                    aria-label={`Compare ${v.id}`}
                  >
                    <span className="num flex items-center gap-1 text-[11px] font-bold text-fg">
                      {v.id}
                      {v.arm && (
                        <span className="grid h-[13px] w-[13px] place-items-center rounded bg-accent/30 text-[8px] font-bold text-accent-2">{v.arm}</span>
                      )}
                    </span>
                    <span className="num text-[8.5px] text-mute">{v.date}</span>
                  </button>
                </th>
              ))}
              <th className="eyebrow !text-[9px] pb-1 pl-1">Δ B−A</th>
            </tr>
          </thead>
          <tbody>
            {EVAL_CATEGORIES.map((cat, ri) => {
              const delta = (cat.scores[bIdx] ?? 0) - (cat.scores[aIdx] ?? 0);
              const isRegRow = ri === regressedRow;
              return (
                <tr key={cat.name}>
                  <td className={`max-w-[150px] rounded-lg px-2 py-1 text-left ${isRegRow ? "bg-accent/[0.07]" : ""}`}>
                    <span className={`block truncate text-[11.5px] ${isRegRow ? "font-bold text-fg" : "font-medium text-fg-2"}`}>{cat.short}</span>
                    <span className="num block text-[9px] text-mute">{cat.tasks} tasks</span>
                  </td>
                  {cat.scores.map((s, vi) => {
                    const fail = cat.fail?.includes(vi);
                    const isRegCell = isRegRow && vi === regressedCol;
                    return (
                      <td key={vi} className="p-0">
                        <button
                          onClick={() => onPickVersion(vi)}
                          aria-label={`${cat.name} ${EVAL_VERSIONS[vi].id}: ${s ?? "n/a"}`}
                          className={`relative mx-auto flex h-[30px] w-[58px] items-center justify-center rounded-md text-[11.5px] transition-transform hover:scale-[1.06] ${
                            isRegCell ? "ring-[1.5px] ring-red" : vi === bIdx ? "ring-1 ring-white/25" : ""
                          }`}
                          style={{ background: cellColor(s), color: s !== null && s < PASS_BAR ? "#ffb3c0" : "#f0f0f7" }}
                        >
                          <span className="num font-semibold">{s ?? "–"}</span>
                          {fail && <CircleDot size={7} className="absolute right-[3px] top-[3px] text-red" aria-label="has failing tasks" />}
                        </button>
                      </td>
                    );
                  })}
                  <td className="pl-1">
                    <span className="num text-[11px] font-bold" style={{ color: delta < 0 ? "#f4627e" : delta > 0 ? "#3fd99f" : "#63637c" }}>
                      {delta > 0 ? `+${delta}` : delta}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* footer strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-edge px-4 py-2.5">
        <p className="num flex flex-wrap items-center gap-2 text-[11px]">
          <span className="h-[8px] w-[8px] rounded-[2px] bg-accent" />
          <span className="font-bold text-fg">Cite KB article</span>
          <span className="text-mute">·</span>
          <span className="text-fg-2">{EVAL_VERSIONS[bIdx].id}</span>
          <span className="text-mute">·</span>
          <span className="text-fg-2">{EVAL_CATEGORIES[regressedRow].scores[bIdx]}/100</span>
          <span className="text-mute">·</span>
          <span className="text-fg-2">2 of {EVAL_CATEGORIES[regressedRow].tasks} passed</span>
          <span className="font-bold text-red">· {(EVAL_CATEGORIES[regressedRow].scores[bIdx] ?? 0) - (EVAL_CATEGORIES[regressedRow].scores[aIdx] ?? 0)} vs {EVAL_VERSIONS[aIdx].id}</span>
        </p>
        <p className="flex items-center gap-2 text-[10px] text-mute">
          ≤60
          <span className="h-[6px] w-24 rounded-full" style={{ background: "linear-gradient(90deg, rgba(143,123,255,0.08), rgba(143,123,255,0.75))" }} />
          100
          <span className="flex items-center gap-1">
            <CircleDot size={8} className="text-red" /> below pass bar ({PASS_BAR})
          </span>
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ regression card ----------------------------- */

function RegressionCard({ onOpenRun }: { onOpenRun: (id: string) => void }) {
  return (
    <div className="relative overflow-hidden rounded-[14px] border border-red/30 p-4" style={{ background: "linear-gradient(160deg, rgba(244,98,126,0.10), rgba(244,98,126,0.03) 60%)" }}>
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12.5px] font-bold text-red">
          <AlertTriangle size={13} /> Regression detected
        </p>
        <span className="num text-[9.5px] text-mute">{REGRESSION.when}</span>
      </div>
      <p className="mt-2 text-[15px] font-bold text-fg">{REGRESSION.category}</p>
      <div className="mt-1 flex items-center gap-2.5">
        <p className="num text-[22px] font-bold text-fg">
          {REGRESSION.from} <span className="mx-0.5 text-mute">→</span> <span className="text-red">{REGRESSION.to}</span>
        </p>
        <span className="num rounded-full bg-red/15 px-2 py-0.5 text-[10px] font-bold text-red">{REGRESSION.delta}</span>
        <span className="ml-auto opacity-80">
          <Sparkline data={[0.9, 0.94, 0.92, 0.88, 0.9, 0.86, 0.52]} color="#f4627e" w={92} h={26} />
        </span>
      </div>
      <p className="mt-2 text-[11.5px] leading-relaxed text-fg-2">{REGRESSION.cause}</p>
      <div className="mt-3 flex items-center gap-2">
        <button
          className="btn !border-red/50 !bg-red/20 text-[12px] !text-red hover:!bg-red/30"
          onClick={() => onOpenRun(REGRESSION.failingRun)}
        >
          <ExternalLink size={12} /> Open failing run
        </button>
        <button className="btn text-[12px]">
          <Pin size={12} /> Pin v17
        </button>
        <span className="ml-auto flex items-center gap-1.5 text-[10.5px] text-mute">
          <Avatar name="Owen Park" size={18} colorIdx={5} /> {REGRESSION.owner}
        </span>
      </div>
    </div>
  );
}

/* -------------------------------- compare card ------------------------------ */

function CompareCard({ bIdx }: { bIdx: number }) {
  const versions = EVAL_VERSIONS.map((v) => v.id);
  const [a, setA] = useState(COMPARE.a);
  const [b, setB] = useState(COMPARE.b);

  // reflect matrix selection (B drives both)
  const bFromMatrix = versions[bIdx];
  const aFromMatrix = versions[Math.max(0, bIdx - 1)];

  const aAvg = useMemo(() => {
    const ia = Math.max(0, versions.indexOf(bFromMatrix) - 1);
    return EVAL_CATEGORIES.reduce((s, c) => s + (c.scores[ia] ?? 0), 0) / EVAL_CATEGORIES.length;
  }, [bFromMatrix, versions]);
  const bAvg = useMemo(
    () => EVAL_CATEGORIES.reduce((s, c) => s + (c.scores[bIdx] ?? 0), 0) / EVAL_CATEGORIES.length,
    [bIdx]
  );
  const delta = Math.round((bAvg - aAvg) * 10) / 10;

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[13px] font-bold">
          <GitCompareArrows size={13} className="text-accent" /> Compare
        </p>
        <div className="flex items-center gap-1.5">
          <span className="chip num !text-[10px] !text-accent-2">A {aFromMatrix}</span>
          <span className="chip num !text-[10px] !text-accent-2">B {bFromMatrix}</span>
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline gap-3">
        <p className="num text-[15px] font-bold text-fg-2">
          {aFromMatrix} <span className="text-fg">{aAvg.toFixed(1)}</span>
        </p>
        <span className="text-mute">→</span>
        <p className="num text-[15px] font-bold text-fg">
          {bFromMatrix} <span className="text-fg">{bAvg.toFixed(1)}</span>
        </p>
        <span className="num text-[11px] font-bold" style={{ color: delta < 0 ? "#f4627e" : "#3fd99f" }}>
          {delta > 0 ? "+" : ""}
          {delta}
        </span>
      </div>

      <ul className="mt-2.5">
        {COMPARE.rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between border-b border-edge/50 py-[7px] text-[11.5px] last:border-0">
            <span className="text-fg-2">{r.label}</span>
            <span className="num flex items-center gap-2.5">
              <span className="text-mute">{r.a}</span>
              <span className="font-semibold text-fg">{r.b}</span>
              <span className="w-[46px] text-right font-bold" style={{ color: r.good ? "#3fd99f" : "#f4627e" }}>
                {r.delta}
              </span>
            </span>
          </li>
        ))}
      </ul>

      <p className="eyebrow mt-3 mb-1.5">Biggest moves</p>
      <ul className="flex flex-col gap-1.5">
        {COMPARE.moves.map((m) => (
          <li key={m.label} className="flex items-center gap-2 text-[11px]">
            <span className="w-[130px] truncate text-fg-2">{m.label}</span>
            <span className="relative h-[6px] flex-1">
              <span
                className="absolute left-1/2 top-0 h-full -translate-x-full rounded-l-full"
                style={{
                  width: m.delta < 0 ? `${(Math.abs(m.delta) / 19) * 50}%` : 0,
                  background: "#f4627e",
                }}
              />
              <span
                className="absolute left-1/2 top-0 h-full rounded-r-full"
                style={{
                  width: m.delta > 0 ? `${((m.delta / 2) * 50) / 2}%` : 0,
                  background: "#34d9c3",
                }}
              />
            </span>
            <span className="num w-[26px] text-right font-bold" style={{ color: m.delta < 0 ? "#f4627e" : "#3fd99f" }}>
              {m.delta > 0 ? `+${m.delta}` : m.delta}
            </span>
          </li>
        ))}
      </ul>
      <p className="num mt-3 text-[9.5px] text-mute">Scores are invented demo data; wire your own eval runner.</p>
    </div>
  );
}

/* ---------------------------------- view ----------------------------------- */

export default function EvalsView({ onOpenRun }: { onOpenRun: (id: string) => void }) {
  const [bIdx, setBIdx] = useState(7);
  const [running, setRunning] = useState(false);

  const rerun = () => {
    if (running) return;
    setRunning(true);
    window.setTimeout(() => setRunning(false), 2400);
  };

  return (
    <div>
      <PageHeader
        title="Evals"
        sub="Support triage suite · 48 tasks in 10 categories · LLM judge with human spot checks (simulated scores)"
      >
        <button className="btn !border-accent/50 !bg-accent/25 hover:!bg-accent/35" onClick={rerun} disabled={running}>
          {running ? (
            <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-accent-2 border-t-transparent" />
          ) : (
            <Play size={12} />
          )}
          {running ? "Running suite…" : "Re-run suite"}
        </button>
      </PageHeader>

      <Rise className="flex flex-col gap-3">
        <EvalStats />
        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Matrix bIdx={bIdx} onPickVersion={(i) => setBIdx(Math.max(1, i))} />
          <div className="flex flex-col gap-3">
            <RegressionCard onOpenRun={onOpenRun} />
            <CompareCard bIdx={bIdx} />
          </div>
        </div>
      </Rise>
    </div>
  );
}
