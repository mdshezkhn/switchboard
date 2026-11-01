/**
 * RelayGraph — the Canvas 2D engine behind the Agents view.
 *
 * A tiny perspective projector turns 3D node positions into 2D screen space;
 * on top of that we draw a star field, nebula glows, arcing handoff cables,
 * glowing packets that travel the cables, and glossy agent orbs with halo
 * rings. Node label chips stay in the DOM (crisp text, accessible) and are
 * positioned every frame via `onProject` — no React re-renders.
 */
import { AGENTS, EDGES, EDGE_COLORS, TERMINALS, type AgentId, type EdgeKind } from "./data";

export interface Projected {
  id: string;
  x: number;
  y: number;
  scale: number;
  z: number;
}

type Vec3 = [number, number, number];

interface Packet {
  edgeIdx: number;
  t: number;
  speed: number;
  color: string;
  size: number;
}

interface Pulse {
  x: number;
  y: number;
  r: number;
  max: number;
  color: string;
  alpha: number;
}

const CAMERA = 2.6;
const EDGE_ENDPOINTS: Record<string, { pos: Vec3; label: string; terminal: boolean }> = {
  "ticket.in": { pos: TERMINALS.in.pos, label: TERMINALS.in.label, terminal: true },
  "reply.out": { pos: TERMINALS.out.pos, label: TERMINALS.out.label, terminal: true },
};

export class RelayGraph {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private raf = 0;
  private running = false;
  private reduced = false;
  private t0 = performance.now();
  private t = 0; // seconds, pause-aware
  private speed = 1;
  private dpr = 1;
  private w = 0;
  private h = 0;

  private packets: Packet[] = [];
  private pulses: Pulse[] = [];
  private stars: { x: number; y: number; r: number; ph: number; sp: number }[] = [];

  /** busy override per node id (set by the React simulation) */
  private busy = new Set<string>();

  onProject: (p: Projected[]) => void = () => {};

  constructor(canvas: HTMLCanvasElement, reduced: boolean) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.reduced = reduced;
    this.initStars();
    this.resize();
  }

  /* ------------------------------- lifecycle ------------------------------ */

  private initStars() {
    for (let i = 0; i < 110; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.4 + Math.random() * 1.1,
        ph: Math.random() * Math.PI * 2,
        sp: 0.3 + Math.random() * 1.4,
      });
    }
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = Math.max(rect.width, 1);
    this.h = Math.max(rect.height, 1);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.t0 = performance.now() - this.t * 1000 / this.speed;
    const loop = () => {
      if (!this.running) return;
      this.frame();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  setSpeed(s: number) {
    const now = performance.now();
    this.t = (now - this.t0) * this.speed / 1000;
    this.t0 = now - this.t * 1000 / s;
    this.speed = s;
  }

  setReduced(r: boolean) {
    this.reduced = r;
  }

  /* ----------------------------- simulation API --------------------------- */

  setBusy(ids: Set<string>) {
    this.busy = ids;
  }

  /** emit a packet along an edge; returns false if the edge is unknown */
  spawnPacket(from: string, to: string, kind: EdgeKind, durationScale = 1): boolean {
    const idx = EDGES.findIndex((e) => e.from === from && e.to === to);
    if (idx < 0) return false;
    const len = this.edgeLen(idx);
    this.packets.push({
      edgeIdx: idx,
      t: 0,
      // ~1.1s to cross a typical edge at 1× speed
      speed: Math.max(0.45, 1.1 / Math.max(len, 0.2)) * durationScale,
      color: EDGE_COLORS[kind],
      size: kind === "tool" ? 2.6 : 2.2,
    });
    return true;
  }

  pulseAt(id: string, color?: string) {
    const p = this.nodePos(id);
    if (!p) return;
    const s = this.project(p);
    this.pulses.push({ x: s.x, y: s.y, r: 4, max: 30 + 16 * s.scale, color: color ?? "#b39dff", alpha: 0.55 });
  }

  /* -------------------------------- geometry ------------------------------ */

  private nodePos(id: string): Vec3 | null {
    if (EDGE_ENDPOINTS[id]) return EDGE_ENDPOINTS[id].pos;
    const a = AGENTS.find((a) => a.id === id);
    return a ? a.pos : null;
  }

  private project([x, y, z]: Vec3): { x: number; y: number; scale: number } {
    const unit = Math.min(this.w, this.h * 1.35) * 0.44;
    const persp = CAMERA / (CAMERA + z * 0.85);
    return {
      x: this.w / 2 + x * unit * persp,
      y: this.h / 2 + y * unit * 0.82 * persp,
      scale: persp,
    };
  }

  /** animated node center (gentle drift so the graph feels alive) */
  private nodeScreen(id: string, drift = true) {
    const base = this.nodePos(id);
    if (!base) return null;
    const dt = drift && !this.reduced ? this.t : 0;
    const [x, y, z] = base;
    return this.project([
      x + Math.sin(dt * 0.45 + x * 7) * 0.012,
      y + Math.cos(dt * 0.38 + y * 9) * 0.014,
      z,
    ]);
  }

  private edgePts(idx: number): { a: { x: number; y: number }; b: { x: number; y: number }; c: { x: number; y: number } } | null {
    const e = EDGES[idx];
    const A = this.nodeScreen(e.from as string);
    const B = this.nodeScreen(e.to as string);
    if (!A || !B) return null;
    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const dist = Math.hypot(dx, dy) || 1;
    // control point: lift perpendicular + slight sag toward the cable's own side
    const za = this.nodePos(e.from as string)![2];
    const zb = this.nodePos(e.to as string)![2];
    const lift = dist * (0.22 + Math.max(0, zb - za) * 0.08);
    const bow = dist * 0.1;
    const mx = (A.x + B.x) / 2;
    const my = (A.y + B.y) / 2;
    const nx = -dy / dist;
    const ny = dx / dist;
    return { a: A, b: B, c: { x: mx + nx * (lift * 0.35) - nx * bow, y: my + ny * (lift * 0.35) - lift * 0.6 } };
  }

  private edgeLen(idx: number): number {
    const pts = this.edgePts(idx);
    if (!pts) return 1;
    return Math.hypot(pts.b.x - pts.a.x, pts.b.y - pts.a.y) / 300;
  }

  private qPoint(p: { a: { x: number; y: number }; b: { x: number; y: number }; c: { x: number; y: number } }, t: number) {
    const u = 1 - t;
    return {
      x: u * u * p.a.x + 2 * u * t * p.c.x + t * t * p.b.x,
      y: u * u * p.a.y + 2 * u * t * p.c.y + t * t * p.b.y,
    };
  }

  /* --------------------------------- frame -------------------------------- */

  private frame() {
    const now = performance.now();
    const prev = this.t;
    this.t = (now - this.t0) * this.speed / 1000;
    const dt = Math.min(this.t - prev, 0.05);
    this.draw(dt);
  }

  /** one static frame (also used for reduced-motion rendering) */
  renderOnce() {
    this.draw(0);
  }

  private draw(dt: number) {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);

    // star field
    ctx.save();
    for (const s of this.stars) {
      const tw = this.reduced ? 0.55 : 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(this.t * s.sp + s.ph));
      ctx.globalAlpha = tw * 0.7;
      ctx.fillStyle = "#cdd3ff";
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // nebula glows (fixed anchors, breathing)
    const breath = this.reduced ? 1 : 1 + Math.sin(this.t * 0.35) * 0.08;
    const neb = (fx: number, fy: number, r: number, color: string, a: number) => {
      const g = ctx.createRadialGradient(fx * w, fy * h, 0, fx * w, fy * h, r * breath);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = a;
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    };
    neb(0.3, 0.72, this.h * 0.75, "rgba(20,184,166,0.05)", 1);
    neb(0.62, 0.42, this.h * 0.85, "rgba(109,85,242,0.08)", 1);
    neb(0.82, 0.3, this.h * 0.5, "rgba(224,121,243,0.05)", 1);

    // cables
    for (let i = 0; i < EDGES.length; i++) {
      const pts = this.edgePts(i);
      if (!pts) continue;
      const color = EDGE_COLORS[EDGES[i].kind];
      ctx.beginPath();
      ctx.moveTo(pts.a.x, pts.a.y);
      ctx.quadraticCurveTo(pts.c.x, pts.c.y, pts.b.x, pts.b.y);
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.14;
      ctx.lineWidth = 3.4;
      ctx.stroke();
      ctx.globalAlpha = 0.38;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // packets
    for (const p of this.packets) {
      const pts = this.edgePts(p.edgeIdx);
      if (!pts) continue;
      // trail
      for (let k = 0; k < 4; k++) {
        const tt = p.t - k * 0.022;
        if (tt <= 0) continue;
        const pos = this.qPoint(pts, Math.min(tt, 1));
        const g = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, p.size * (3 - k * 0.5));
        g.addColorStop(0, p.color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 0.5 - k * 0.1;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.size * (3 - k * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // advance packets
    if (!this.reduced && dt > 0) {
      const arrived: Packet[] = [];
      this.packets = this.packets.filter((p) => {
        p.t += p.speed * dt;
        if (p.t >= 1) {
          arrived.push(p);
          return false;
        }
        return true;
      });
      for (const p of arrived) {
        const dest = EDGES[p.edgeIdx].to as string;
        this.pulses.push({ x: this.nodeScreen(dest, false)!.x, y: this.nodeScreen(dest, false)!.y, r: 3, max: 26, color: p.color, alpha: 0.4 });
      }
    }

    // arrival pulses
    this.pulses = this.pulses.filter((p) => {
      if (!this.reduced) {
        p.r += dt * 34;
        p.alpha -= dt * 0.85;
      }
      if (p.alpha <= 0) return false;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = Math.max(p.alpha, 0);
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.globalAlpha = 1;
      return true;
    });

    // nodes (far → near)
    const drawn: Projected[] = [];
    const order = [...AGENTS].sort((a, b) => b.pos[2] - a.pos[2]);
    for (const a of order) {
      const s = this.nodeScreen(a.id);
      if (!s) continue;
      this.drawNode(a.id, s, a.color, a.r);
      drawn.push({ id: a.id, x: s.x, y: s.y, scale: s.scale, z: a.pos[2] });
    }
    for (const key of ["in", "out"] as const) {
      const term = TERMINALS[key];
      const s = this.nodeScreen(term.id);
      if (!s) continue;
      this.drawTerminal(term.label, s);
      drawn.push({ id: term.id, x: s.x, y: s.y, scale: s.scale, z: term.pos[2] });
    }
    this.onProject(drawn);
  }

  /* ------------------------------ node painter ---------------------------- */

  private drawNode(id: string, s: { x: number; y: number; scale: number }, color: [string, string], rRel: number) {
    const { ctx } = this;
    const busy = this.busy.has(id);
    const r = 13 * rRel * s.scale;
    const pulse = busy && !this.reduced ? 1 + 0.05 * Math.sin(this.t * 3.2) : 1;

    ctx.save();

    // outer halo
    const haloR = r * (busy ? 5.2 : 4.2) * pulse;
    const halo = ctx.createRadialGradient(s.x, s.y, r * 0.4, s.x, s.y, haloR);
    halo.addColorStop(0, this.withAlpha(color[1], busy ? 0.34 : 0.2));
    halo.addColorStop(0.55, this.withAlpha(color[1], busy ? 0.12 : 0.07));
    halo.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(s.x, s.y, haloR, 0, Math.PI * 2);
    ctx.fill();

    // concentric halo rings
    ctx.strokeStyle = this.withAlpha(color[0], 0.16);
    ctx.lineWidth = 1;
    for (const mult of [1.9, 2.7]) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, r * mult, 0, Math.PI * 2);
      ctx.stroke();
    }

    // busy sweep ring
    if (busy && !this.reduced) {
      const sweep = (this.t * 1.4) % (Math.PI * 2);
      ctx.strokeStyle = this.withAlpha(color[0], 0.5);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r * 2.3, sweep, sweep + 1.1);
      ctx.stroke();
    }

    // orb body
    const body = ctx.createRadialGradient(s.x - r * 0.35, s.y - r * 0.45, r * 0.1, s.x, s.y, r);
    body.addColorStop(0, "#ffffff");
    body.addColorStop(0.28, color[0]);
    body.addColorStop(0.8, color[1]);
    body.addColorStop(1, this.withAlpha(color[1], 0.4));
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.fill();

    // rim
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();

    // specular
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(s.x - r * 0.34, s.y - r * 0.4, r * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawTerminal(label: string, s: { x: number; y: number; scale: number }) {
    const { ctx } = this;
    const r = 6.5 * s.scale;
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#e7e9ff";
    ctx.beginPath();
    ctx.arc(s.x, s.y, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = `${Math.round(10 * Math.max(s.scale, 0.85))}px "JetBrains Mono Variable", monospace`;
    ctx.textAlign = "center";
    ctx.fillText(label, s.x, s.y + r + 14);
    ctx.restore();
  }

  private withAlpha(hex: string, a: number): string {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  }
}

export type { AgentId };
