"use client";

import { Search, Settings, Command, GitBranch } from "lucide-react";
import { useEffect, useRef } from "react";
import { AVATAR_COLORS } from "./agentIcons";

/* ---------------------------------- logo ----------------------------------- */

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="grid place-items-center rounded-[9px]"
      style={{
        width: size,
        height: size,
        background: "linear-gradient(135deg, #a78bfa 0%, #6d55f2 60%, #4f34d8 100%)",
        boxShadow: "0 0 18px rgba(109,85,242,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
      }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 16 16" fill="none">
        <circle cx="3.2" cy="8" r="1.7" fill="#fff" />
        <circle cx="12.4" cy="3.6" r="1.7" fill="#fff" opacity="0.92" />
        <circle cx="12.4" cy="12.4" r="1.7" fill="#fff" opacity="0.92" />
        <path d="M4.6 7.2 11 4.2M4.6 8.8 11 11.8" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

/* --------------------------------- avatars --------------------------------- */

export function Avatar({ name, size = 22, colorIdx = 0 }: { name: string; size?: number; colorIdx?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const color = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length];
  return (
    <span
      title={name}
      className="inline-grid place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, ${color}, ${shade(color, -38)})`,
        border: "1.5px solid rgba(6,6,11,0.9)",
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((n >> 16) & 255) + amt);
  const g = clamp(((n >> 8) & 255) + amt);
  const b = clamp((n & 255) + amt);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export function AvatarStack({ names, extra }: { names: string[]; extra?: number }) {
  return (
    <span className="flex items-center" style={{ direction: "rtl" }}>
      {names.map((n, i) => (
        <span key={n} style={{ marginRight: i > 0 ? -7 : 0, direction: "ltr" }}>
          <Avatar name={n} colorIdx={i} />
        </span>
      ))}
      {extra ? <span className="chip !px-2 !py-0.5 !text-[10px] ml-1.5">+{extra}</span> : null}
    </span>
  );
}

/* --------------------------------- sidebar --------------------------------- */

export type ViewId = "agents" | "runs" | "usage" | "evals";

export function Sidebar({ view, onView }: { view: ViewId; onView: (v: ViewId) => void }) {
  const items: { id: ViewId; label: string; d: string }[] = [
    { id: "agents", label: "Agents", d: "M12 12h.01M12 5a3 3 0 1 0 0-0.01M12 19a3 3 0 1 0 0-0.01M5 12a3 3 0 1 0 0-.01M19 12a3 3 0 1 0 0-.01M9.5 10.5 6.5 11.5M14.5 10.5l3 1M9.5 13.5l3 3" },
    { id: "runs", label: "Runs", d: "M4 6h16M4 12h16M4 18h10" },
    { id: "usage", label: "Usage", d: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
    { id: "evals", label: "Evals", d: "M9 3h6M10 3v6l-5 8a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-8V3" },
  ];
  return (
    <nav aria-label="Primary" className="hidden sm:flex w-[52px] shrink-0 flex-col items-center gap-1 border-r border-edge bg-panel/60 py-3">
      <a href="#" aria-label="Switchboard home" className="mb-3 grid place-items-center">
        <Logo />
      </a>
      {items.map((it) => {
        const active = view === it.id;
        return (
          <button
            key={it.id}
            onClick={() => onView(it.id)}
            aria-label={it.label}
            aria-current={active ? "page" : undefined}
            title={it.label}
            className={`icon-btn relative !h-9 !w-9 ${active ? "!bg-panel-3 !text-fg" : ""}`}
          >
            {active && <span className="absolute left-[-10px] top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-accent" />}
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d={it.d} />
            </svg>
          </button>
        );
      })}
      <div className="mt-auto flex flex-col items-center gap-1">
        <button className="icon-btn" aria-label="Settings" title="Settings">
          <Settings size={16} strokeWidth={1.8} />
        </button>
        <button className="mt-1" aria-label="Account" title="Account">
          <Avatar name="Mo Shehzad" size={24} colorIdx={4} />
        </button>
      </div>
    </nav>
  );
}

/* ---------------------------------- topbar --------------------------------- */

export function Topbar({
  view,
  agentsRunning,
  onSearchShortcut,
}: {
  view: ViewId;
  agentsRunning: number;
  onSearchShortcut?: (input: HTMLInputElement | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    onSearchShortcut?.(inputRef.current);
  }, [onSearchShortcut]);

  const crumbs = view.charAt(0).toUpperCase() + view.slice(1);

  return (
    <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-edge bg-panel/50 px-4 backdrop-blur">
      <div className="flex items-center gap-2 sm:hidden">
        <Logo size={24} />
      </div>
      <div className="hidden md:flex items-center gap-1.5 text-[13px] font-semibold">
        <span className="flex items-center gap-1.5 text-fg">
          <GitBranch size={13} className="text-accent" />
          Switchboard
        </span>
        <span className="text-mute">›</span>
        <span className="flex items-center gap-1.5 rounded-md border border-edge bg-panel-2 px-2 py-1 text-[12px] text-fg-2">
          <span className="grid h-4 w-4 place-items-center rounded bg-teal/20 text-[9px] font-bold text-teal">C</span>
          Cobalt Bay / Support Ops
        </span>
        <span className="text-mute">›</span>
        <span className="text-fg-2">{crumbs}</span>
      </div>

      <div className="relative mx-auto w-full max-w-[340px]">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
        <input
          ref={inputRef}
          placeholder="Search agents, runs, traces…"
          aria-label="Search"
          className="h-8 w-full rounded-lg border border-edge bg-panel-2 pl-8 pr-10 text-[12.5px] text-fg placeholder:text-mute focus:border-accent/50 focus:outline-none"
        />
        <kbd className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5 rounded border border-edge bg-panel px-1.5 py-0.5 text-[10px] text-mute">
          <Command size={9} />K
        </kbd>
      </div>

      <div className="ml-auto hidden items-center gap-2 lg:flex">
        <button className="chip !py-1.5 hover:!border-edge-2" role="button" aria-pressed="true">
          <span className="h-1.5 w-1.5 rounded-full bg-blue" />
          Production
        </button>
        <button className="chip !py-1.5 hover:!border-edge-2 opacity-80">
          <span className="h-1.5 w-1.5 rounded-full bg-amber" />
          Staging
        </button>
        <span className="chip !py-1.5">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-green" />
          <span className="num text-fg">{agentsRunning}</span> agents running
        </span>
      </div>
      <div className="ml-auto lg:ml-2">
        <AvatarStack names={["Maya Ito", "Ravi Menon", "Iris Kato"]} extra={2} />
      </div>
    </header>
  );
}

/* -------------------------------- page header ------------------------------- */

export function PageHeader({
  title,
  chip,
  sub,
  children,
}: {
  title: string;
  chip?: React.ReactNode;
  sub?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[26px] font-extrabold tracking-tight text-fg">{title}</h1>
          {chip}
        </div>
        {sub ? <p className="mt-1 text-[12.5px] text-fg-2">{sub}</p> : null}
      </div>
      {children ? <div className="flex shrink-0 items-center gap-2">{children}</div> : null}
    </div>
  );
}

/* ------------------------------ small widgets ------------------------------- */

export function StatusDot({ tone, pulse }: { tone: "green" | "red" | "amber" | "blue" | "mute"; pulse?: boolean }) {
  const color = { green: "#3fd99f", red: "#f4627e", amber: "#f5b544", blue: "#5aa2ff", mute: "#63637c" }[tone];
  return (
    <span
      aria-hidden
      className={`inline-block h-[7px] w-[7px] shrink-0 rounded-full ${pulse ? "animate-pulse-dot" : ""}`}
      style={{ background: color, boxShadow: `0 0 8px ${color}66` }}
    />
  );
}

export function StatusPill({ status }: { status: "ok" | "fail" | "warn" }) {
  const map = {
    ok: { label: "Succeeded", tone: "green" },
    fail: { label: "Failed", tone: "red" },
    warn: { label: "Retried", tone: "amber" },
  } as const;
  const s = map[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[11px] font-semibold"
      style={{ borderColor: `${s.tone === "green" ? "#3fd99f" : s.tone === "red" ? "#f4627e" : "#f5b544"}44`, color: s.tone === "green" ? "#3fd99f" : s.tone === "red" ? "#f4627e" : "#f5b544", background: `${s.tone === "green" ? "#3fd99f" : s.tone === "red" ? "#f4627e" : "#f5b544"}14` }}>
      <StatusDot tone={s.tone} />
      {s.label}
    </span>
  );
}

/** tiny inline sparkline (viewBox 0 0 100 32) */
export function Sparkline({ data, color, w = 100, h = 32, fill = false }: { data: number[]; color: string; w?: number; h?: number; fill?: boolean }) {
  const max = Math.max(...data, 0.0001);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 6)}`);
  const line = `M${pts.join(" L")}`;
  const id = `sg-${color.replace(/[^a-z0-9]/gi, "")}-${w}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      {fill && (
        <>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
        </>
      )}
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** delta text: good = teal/green, bad = red */
export function Delta({ value, good, suffix = "" }: { value: string; good: boolean; suffix?: string }) {
  const up = value.startsWith("+") || value.startsWith("↗");
  return (
    <span className="num inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: good ? "#3fd99f" : "#f4627e" }}>
      {value}
      {suffix}
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden style={{ transform: up ? "none" : "rotate(180deg)" }}>
        <path d="M5 1.5 9 8H1z" fill="currentColor" />
      </svg>
    </span>
  );
}
