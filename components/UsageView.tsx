"use client";

import { useMemo, useState } from "react";
import { Download, PiggyBank, Coins, CircleDollarSign, Zap, TrendingUp, ListOrdered } from "lucide-react";
import {
  BUDGET,
  DAILY_SPEND,
  MODELS,
  SPEND_AVG,
  SPEND_PACE,
  TOKENS_BY_AGENT,
  TOKENS_PER_DAY,
  TOP_WORKFLOWS,
  USAGE_COLUMNS,
  USAGE_STATS,
} from "@/lib/data";
import { fmtMoneyShort } from "@/lib/format";
import { PageHeader, Sparkline, Delta, Avatar } from "./chrome";
import { Rise } from "./motion";

/* -------------------------------- stat cards ------------------------------- */

function StatCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="relative overflow-hidden rounded-[14px] p-3.5" style={{ background: "linear-gradient(140deg,#7c5cff,#6d55f2 70%,#5537d4)", boxShadow: "0 8px 26px rgba(109,85,242,0.25)" }}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold text-white/90">
            <PiggyBank size={13} /> Spend this month
          </p>
          <span className="rounded-full bg-white/18 px-1.5 py-0.5 text-[10px] font-bold text-white">{USAGE_STATS.spendPctOfBudget}</span>
        </div>
        <p className="num mt-1.5 text-[27px] font-bold leading-none text-white">${USAGE_STATS.spendMonth.toLocaleString()}</p>
        <div className="mt-2.5 h-[4px] overflow-hidden rounded-full bg-white/25">
          <div className="h-full w-[92.1%] rounded-full bg-white" />
        </div>
      </div>

      {[
        {
          icon: Coins,
          label: "Tokens",
          value: `${USAGE_STATS.tokens}M`,
          delta: USAGE_STATS.tokensDelta,
          good: true,
          sub: "Month to date",
          spark: USAGE_STATS.tokensSpark,
          color: "#8f7bff",
          arrow: "↗",
        },
        {
          icon: CircleDollarSign,
          label: "Cost per run",
          value: `$${USAGE_STATS.costPerRun.toFixed(3)}`,
          delta: `↘ ${USAGE_STATS.costDelta.replace("-", "")}`,
          good: true,
          sub: "All workflows",
          spark: USAGE_STATS.costSpark,
          color: "#3fd99f",
          arrow: "↘",
        },
        {
          icon: Zap,
          label: "Cache hit rate",
          value: `${USAGE_STATS.cacheHit}%`,
          delta: `↗ ${USAGE_STATS.cacheDelta.replace("+", "+")}`,
          good: true,
          sub: "Prompt + retrieval cache",
          spark: USAGE_STATS.cacheSpark,
          color: "#3fd99f",
          arrow: "↗",
        },
      ].map((c) => (
        <div key={c.label} className="panel flex items-stretch justify-between p-3.5">
          <div>
            <p className="flex items-center gap-1.5 eyebrow">
              <c.icon size={11} /> {c.label}
            </p>
            <p className="num mt-1.5 text-[23px] font-bold leading-none text-fg">{c.value}</p>
            <p className="mt-1 text-[11px] text-mute">{c.sub}</p>
          </div>
          <div className="flex flex-col items-end justify-between">
            <Delta value={c.delta} good={c.good} />
            <Sparkline data={c.spark} color={c.color} w={86} h={30} fill />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------ 3D stacked bars ----------------------------- */

const DEPTH = { dx: 7, dy: 4.5 };

function lighten(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt));
  return `#${((c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, "0")}`;
}

function TokensPerDay() {
  const [byAgent, setByAgent] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const data = byAgent ? TOKENS_BY_AGENT : TOKENS_PER_DAY;

  const W = 720;
  const H = 240;
  const padB = 22;
  const padL = 30;
  const plotW = W - padL - 14;
  const plotH = H - padB - 8;
  const maxV = 40;
  const bw = Math.min(30, (plotW / data.length) * 0.5);
  const step = plotW / data.length;

  const yPix = (v: number) => 8 + plotH - (v / maxV) * plotH;

  const series = byAgent
    ? [
        { name: "Planner", color: "#5aa2ff", share: 18 },
        { name: "Researcher", color: "#f5b544", share: 27 },
        { name: "Writer", color: "#8f7bff", share: 41 },
        { name: "Reviewer", color: "#e479f3", share: 14 },
      ]
    : MODELS.map((m) => ({ name: m.name, color: m.color, share: m.share }));

  const bars = data.map((d) => {
    let acc = 0;
    return d.values.map((v) => {
      const seg = { y0: acc, y1: acc + v };
      acc += v;
      return seg;
    });
  });

  return (
    <div className="panel p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[13px] font-bold">
            <TrendingUp size={13} className="text-accent" /> Tokens per day
          </p>
          <p className="num mt-0.5 text-[10.5px] text-mute">
            Last 14 days, stacked by {byAgent ? "agent" : "model"} · 421.4M total
          </p>
        </div>
        <div className="flex items-center rounded-lg border border-edge bg-panel-2 p-0.5">
          {["By model", "By agent"].map((l, i) => (
            <button
              key={l}
              onClick={() => setByAgent(i === 1)}
              aria-pressed={(i === 1) === byAgent}
              className={`rounded-[7px] px-2.5 py-1 text-[11.5px] font-semibold ${((i === 1) === byAgent) ? "bg-panel-3 text-fg" : "text-mute hover:text-fg-2"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* legend */}
      <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((s) => (
          <span key={s.name} className="flex items-center gap-1.5 text-[10.5px] text-fg-2">
            <span className="h-[8px] w-[8px] rounded-[2px]" style={{ background: s.color }} />
            {s.name} <span className="num text-mute">{s.share}%</span>
          </span>
        ))}
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Stacked tokens per day bar chart">
          {/* grid */}
          {[0, 10, 20, 30, 40].map((v) => (
            <g key={v}>
              <line x1={padL} x2={W - 8} y1={yPix(v)} y2={yPix(v)} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
              <text x={padL - 6} y={yPix(v) + 3} textAnchor="end" fontSize="9" fill="#63637c" fontFamily="JetBrains Mono Variable, monospace">
                {v === 0 ? "0" : `${v}M`}
              </text>
            </g>
          ))}

          {data.map((d, di) => {
            const x = padL + step * di + (step - bw - DEPTH.dx) / 2;
            const totalV = d.total;
            const px = (v: number) => yPix(v);
            const hoverRing = hover === di;
            return (
              <g key={d.day} onMouseEnter={() => setHover(di)} onMouseLeave={() => setHover(null)}>
                {/* hit area */}
                <rect x={padL + step * di} y={0} width={step} height={H} fill="transparent" />
                {bars[di].map((seg, si) => {
                  const color = series[si].color;
                  const yTop = px(seg.y1);
                  const yBot = px(seg.y0);
                  const h = yBot - yTop;
                  return (
                    <g key={si}>
                      {/* front */}
                      <rect x={x} y={yTop} width={bw} height={Math.max(h, 1.5)} fill={color} opacity={hoverRing ? 1 : 0.92} />
                      {/* right side */}
                      <polygon points={`${x + bw},${yTop} ${x + bw + DEPTH.dx},${yTop - DEPTH.dy} ${x + bw + DEPTH.dx},${yTop - DEPTH.dy + h} ${x + bw},${yBot}`} fill={lighten(color, -46)} />
                      {/* top */}
                      <polygon points={`${x},${yTop} ${x + bw},${yTop} ${x + bw + DEPTH.dx},${yTop - DEPTH.dy} ${x + DEPTH.dx},${yTop - DEPTH.dy}`} fill={lighten(color, 34)} />
                    </g>
                  );
                })}
                {hoverRing && (
                  <text x={x + bw / 2} y={px(totalV) - DEPTH.dy - 8} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#f0f0f7" fontFamily="JetBrains Mono Variable, monospace">
                    {totalV.toFixed(1)}M
                  </text>
                )}
                <text x={x + bw / 2} y={H - 6} textAnchor="middle" fontSize="9" fill={d.day === "today" ? "#8f7bff" : "#63637c"} fontFamily="JetBrains Mono Variable, monospace">
                  {d.day}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

/* ------------------------------- budget donut ------------------------------- */

function BudgetDonut() {
  const R = 52;
  const C = 2 * Math.PI * R;
  const segs = MODELS.map((m) => m.spendPct);
  let offset = 0;
  return (
    <div className="panel flex flex-col p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[13px] font-bold">
          <CircleDollarSign size={13} className="text-accent" /> Monthly budget
        </p>
      </div>
      <p className="num -mt-1 mb-2 text-[10.5px] text-mute">
        {BUDGET.month} · day {BUDGET.day} of {BUDGET.days}
      </p>

      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="128" height="128" viewBox="0 0 128 128" role="img" aria-label="Budget donut chart">
            <circle cx="64" cy="64" r={R} fill="none" stroke="#16162a" strokeWidth="13" />
            {segs.map((pct, i) => {
              const len = (pct / 100) * C;
              const dash = `${Math.max(len - 3, 2)} ${C - len + 3}`;
              const rot = (offset / 100) * 360 - 90;
              offset += pct;
              return (
                <circle
                  key={i}
                  cx="64"
                  cy="64"
                  r={R}
                  fill="none"
                  stroke={MODELS[i].color}
                  strokeWidth={i === 0 ? 13 : 11}
                  strokeLinecap="round"
                  strokeDasharray={dash}
                  transform={`rotate(${rot} 64 64)`}
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="eyebrow !text-[8.5px]">Spent</p>
              <p className="num text-[17px] font-bold leading-tight text-fg">${BUDGET.spent.toLocaleString()}</p>
              <p className="num text-[9px] text-mute">of ${BUDGET.cap.toLocaleString()}</p>
              <p className="mx-auto mt-0.5 w-fit rounded-full bg-orange/15 px-1.5 text-[9.5px] font-bold text-orange">{BUDGET.pct}%</p>
            </div>
          </div>
        </div>

        <ul className="min-w-0 flex-1">
          {MODELS.map((m) => (
            <li key={m.id} className="flex items-center gap-2 border-b border-edge/50 py-[5px] last:border-0">
              <span className="h-[10px] w-[3px] rounded-full" style={{ background: m.color }} />
              <span className="min-w-0">
                <span className="block truncate text-[11.5px] font-semibold text-fg">{m.name}</span>
                <span className="block text-[9.5px] text-mute">{m.role}</span>
              </span>
              <span className="num ml-auto text-right">
                <span className="block text-[11.5px] font-semibold">{m.spend}</span>
                <span className="block text-[9px] text-mute">{m.spendPct}%</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-edge bg-panel-2 px-2.5 py-1.5">
        <span className="num flex items-center gap-1.5 text-[11px] text-fg-2">
          <TrendingUp size={10} className="text-orange" /> Forecast <span className="font-bold text-fg">{BUDGET.forecast}</span>
        </span>
        <span className="num text-[10.5px] text-orange">{BUDGET.forecastPct}% of budget</span>
      </div>
    </div>
  );
}

/* -------------------------------- daily spend ------------------------------- */

function DailySpend() {
  const W = 560;
  const H = 210;
  const padL = 34;
  const padB = 22;
  const plotW = W - padL - 10;
  const plotH = H - padB - 10;
  const maxV = 1000;
  const x = (i: number) => padL + (i / (DAILY_SPEND.length - 1)) * plotW;
  const y = (v: number) => 10 + plotH - (v / maxV) * plotH;
  const line = DAILY_SPEND.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(DAILY_SPEND.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const xLabels = [0, 7, 14, 21, 28];

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[13px] font-bold">
          <CircleDollarSign size={13} className="text-accent" /> Daily spend
        </p>
        <p className="num flex items-center gap-3 text-[10.5px]">
          <span className="text-mute">
            avg <span className="font-bold text-fg">${SPEND_AVG}</span>/day
          </span>
          <span className="flex items-center gap-1 text-mute">
            <span className="inline-block h-0 w-4 border-t border-dashed border-orange" /> pace ${SPEND_PACE}
          </span>
        </p>
      </div>
      <p className="num mb-1 mt-0.5 text-[10.5px] text-mute">Month to date $18,426</p>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Daily spend area chart">
        <defs>
          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8f7bff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8f7bff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 250, 500, 750, 1000].map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - 8} y1={y(v)} y2={y(v)} stroke="rgba(255,255,255,0.06)" />
            <text x={padL - 5} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#63637c" fontFamily="JetBrains Mono Variable, monospace">
              ${v}
            </text>
          </g>
        ))}
        <line x1={padL} x2={W - 8} y1={y(SPEND_PACE)} y2={y(SPEND_PACE)} stroke="#f5b544" strokeDasharray="4 4" strokeWidth="1" opacity="0.55" />
        <path d={area} fill="url(#spendFill)" />
        <path d={line} fill="none" stroke="#a78bfa" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx={x(DAILY_SPEND.length - 1)} cy={y(DAILY_SPEND[DAILY_SPEND.length - 1])} r="3" fill="#a78bfa" />
        {xLabels.map((d) => (
          <text key={d} x={x(d)} y={H - 5} textAnchor="middle" fontSize="9" fill="#63637c" fontFamily="JetBrains Mono Variable, monospace">
            Oct {d + 1}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ------------------------------ top workflows ------------------------------- */

type SortKey = "name" | "runs" | "tokens" | "spend" | "costPerRun" | "share";

function TopWorkflows() {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "spend", dir: -1 });

  const rows = useMemo(() => {
    const num = (r: (typeof TOP_WORKFLOWS)[number], k: SortKey): number | string => {
      switch (k) {
        case "runs": return parseFloat(r.runs.replace(/,/g, ""));
        case "tokens": return parseFloat(r.tokens);
        case "spend": return r.spend;
        case "costPerRun": return parseFloat(r.costPerRun.replace("$", ""));
        case "share": return r.share;
        default: return r.name;
      }
    };
    return [...TOP_WORKFLOWS].sort((a, b) => {
      const va = num(a, sort.key);
      const vb = num(b, sort.key);
      if (typeof va === "string" || typeof vb === "string") return String(va).localeCompare(String(vb)) * sort.dir;
      return (va - vb) * sort.dir;
    });
  }, [sort]);

  const sortable: { label: string; key: SortKey }[] = [
    { label: "Workflow", key: "name" },
    { label: "Runs", key: "runs" },
    { label: "Tokens", key: "tokens" },
    { label: "Spend", key: "spend" },
    { label: "Cost / run", key: "costPerRun" },
  ];

  return (
    <div className="panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[13px] font-bold">
          <ListOrdered size={13} className="text-accent" /> Top workflows
        </p>
        <p className="num text-[10.5px] text-mute">219,300 runs · click a column to sort</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-left">
          <thead>
            <tr className="border-b border-edge">
              {USAGE_COLUMNS.map((col) => {
                const s = sortable.find((x) => x.label.toLowerCase() === col.toLowerCase());
                const active = s && sort.key === s.key;
                return (
                  <th key={col} aria-sort={active ? (sort.dir === -1 ? "descending" : "ascending") : undefined} className="pb-2 pr-3">
                    {s ? (
                      <button
                        onClick={() => setSort((p) => ({ key: s.key, dir: p.key === s.key && p.dir === -1 ? 1 : -1 }))}
                        className={`eyebrow flex items-center gap-1 hover:!text-fg-2 ${active ? "!text-fg" : ""}`}
                      >
                        {col}
                        {active && <span aria-hidden>{sort.dir === -1 ? "↓" : "↑"}</span>}
                      </button>
                    ) : (
                      <span className="eyebrow">{col}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const idx = TOP_WORKFLOWS.indexOf(r);
              return (
                <tr key={r.name} className="border-b border-edge/40 last:border-0 hover:bg-panel-2/50">
                  <td className="py-2 pr-3">
                    <span className="flex items-center gap-2">
                      <Avatar name={r.name} size={22} colorIdx={idx} />
                      <span>
                        <span className="block text-[12.5px] font-semibold text-fg">{r.name}</span>
                        <span className="block text-[9.5px] text-mute">{r.owner}</span>
                      </span>
                    </span>
                  </td>
                  <td className="num py-2 pr-3 text-[11.5px] text-fg-2">{r.runs}</td>
                  <td className="num py-2 pr-3 text-[11.5px] text-fg-2">{r.tokens}</td>
                  <td className="num py-2 pr-3 text-[12px] font-bold text-fg">{fmtMoneyShort(r.spend)}</td>
                  <td className="num py-2 pr-3 text-[11.5px] text-fg-2">{r.costPerRun}</td>
                  <td className="py-2 pr-3">
                    <Sparkline data={r.trend} color="#8f7bff" w={72} h={18} />
                  </td>
                  <td className="py-2">
                    <span className="flex items-center gap-2">
                      <span className="h-[4px] w-16 overflow-hidden rounded-full bg-panel-3">
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${(r.share / 54) * 100}%` }} />
                      </span>
                      <span className="num text-[10.5px] text-mute">{r.share}%</span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------- view ----------------------------------- */

function exportCsv() {
  const lines = ["day,spend_usd", ...DAILY_SPEND.map((v, i) => `Oct ${i + 1},${v}`)];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "switchboard-daily-spend.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function UsageView() {
  return (
    <div>
      <PageHeader
        title="Usage"
        sub="Tokens and spend across models and agents · October, month to date · Production (simulated metering)"
      >
        <button className="btn" onClick={exportCsv}>
          <Download size={13} /> Export CSV
        </button>
      </PageHeader>

      <Rise className="flex flex-col gap-3">
        <StatCards />
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
          <TokensPerDay />
          <BudgetDonut />
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          <DailySpend />
          <TopWorkflows />
        </div>
      </Rise>
    </div>
  );
}
