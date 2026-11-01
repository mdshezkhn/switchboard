/**
 * Switchboard demo data.
 * Everything on screen is fictional and scripted — no backend, no providers.
 * Edit this file to wire the interface to your own orchestration service.
 */

/* ---------------------------------- agents --------------------------------- */

export type AgentId = "planner" | "researcher" | "retriever" | "toolcalls" | "writer" | "reviewer";

export interface RelayAgent {
  id: AgentId;
  name: string;
  /** present-progressive status shown under the node name */
  verb: string;
  desc: string;
  model: string;
  temp: number;
  context: string;
  tools: string[];
  p50: string;
  tokensPerRun: string;
  success: string;
  /** [core, glow] colors used by the canvas + labels */
  color: [string, string];
  /** 3D position in graph space (x: -1..1, y: -1..1, z: -1..1) */
  pos: [number, number, number];
  /** relative node radius */
  r: number;
}

export const AGENTS: RelayAgent[] = [
  {
    id: "planner",
    name: "Planner",
    verb: "planning",
    desc: "Breaks the ticket into steps and picks the tools each step needs.",
    model: "Orion-9",
    temp: 0.2,
    context: "200k",
    tools: ["plan.format()", "route.check()"],
    p50: "1.9s",
    tokensPerRun: "820",
    success: "99.1%",
    color: ["#8f7bff", "#6d55f2"],
    pos: [-0.62, 0.1, 0.15],
    r: 0.85,
  },
  {
    id: "researcher",
    name: "Researcher",
    verb: "researching",
    desc: "Pulls account history and policy notes relevant to the ticket.",
    model: "Lyra-3",
    temp: 0.3,
    context: "128k",
    tools: ["crm.lookup()", "docs.grep()"],
    p50: "2.6s",
    tokensPerRun: "1.2k",
    success: "98.2%",
    color: ["#5aa2ff", "#3b6dff"],
    pos: [-0.3, -0.38, -0.25],
    r: 0.8,
  },
  {
    id: "retriever",
    name: "Retriever",
    verb: "retrieving",
    desc: "Embeds the ticket and fetches the top knowledge-base passages.",
    model: "Ember Embed",
    temp: 0,
    context: "8k",
    tools: ["kb.search()", "vector.topk()"],
    p50: "1.1s",
    tokensPerRun: "440",
    success: "99.6%",
    color: ["#dfe6ff", "#9db4ff"],
    pos: [0.12, -0.52, -0.6],
    r: 0.75,
  },
  {
    id: "toolcalls",
    name: "Tool calls",
    verb: "calling tools",
    desc: "Executes the sandboxed actions: refunds, lookups, address edits.",
    model: "Zephyr Mini",
    temp: 0.1,
    context: "32k",
    tools: ["orders.lookup()", "payments.refund_quote()"],
    p50: "0.9s",
    tokensPerRun: "260",
    success: "97.8%",
    color: ["#34d9c3", "#14b8a6"],
    pos: [-0.18, 0.42, 0.4],
    r: 0.95,
  },
  {
    id: "writer",
    name: "Writer",
    verb: "writing",
    desc: "Drafts the customer reply from notes and tool results.",
    model: "Orion-9",
    temp: 0.4,
    context: "200k",
    tools: ["draft.format()", "tone.guide()"],
    p50: "2.1s",
    tokensPerRun: "1.6k",
    success: "98.6%",
    color: ["#e479f3", "#c026d3"],
    pos: [0.16, 0.05, 0.05],
    r: 1,
  },
  {
    id: "reviewer",
    name: "Reviewer",
    verb: "reviewing",
    desc: "Checks policy, tone and citations before anything is sent.",
    model: "Lyra-3",
    temp: 0.15,
    context: "128k",
    tools: ["policy.guard()", "cite.check()"],
    p50: "1.4s",
    tokensPerRun: "980",
    success: "99.4%",
    color: ["#b39dff", "#8f7bff"],
    pos: [0.58, -0.22, -0.1],
    r: 0.85,
  },
];

export type EdgeKind = "handoff" | "tool" | "revision";

export interface RelayEdge {
  from: AgentId | "ticket.in";
  to: AgentId | "reply.out";
  kind: EdgeKind;
}

export const EDGES: RelayEdge[] = [
  { from: "ticket.in", to: "planner", kind: "handoff" },
  { from: "planner", to: "researcher", kind: "handoff" },
  { from: "planner", to: "toolcalls", kind: "tool" },
  { from: "researcher", to: "retriever", kind: "handoff" },
  { from: "retriever", to: "writer", kind: "handoff" },
  { from: "toolcalls", to: "writer", kind: "tool" },
  { from: "writer", to: "reviewer", kind: "handoff" },
  { from: "reviewer", to: "reply.out", kind: "tool" },
  { from: "reviewer", to: "writer", kind: "revision" },
];

export const EDGE_COLORS: Record<EdgeKind, string> = {
  handoff: "#8f7bff",
  tool: "#34d9c3",
  revision: "#f59e4b",
};

/** terminal nodes rendered smaller, with mono captions */
export const TERMINALS = {
  in: { id: "ticket.in", label: "ticket.in", pos: [-0.94, 0.16, 0.3] as [number, number, number] },
  out: { id: "reply.out", label: "reply.out", pos: [0.94, -0.34, 0.1] as [number, number, number] },
};

/* ------------------------------ agents inspector ---------------------------- */

export const AGENT_QUEUE: Record<AgentId | "all", { id: string; subject: string; eta: string }[]> = {
  all: [],
  planner: [
    { id: "r-90207", subject: "Package marked delivered, not received", eta: "5s" },
    { id: "r-90219", subject: "Promo code not applied at checkout", eta: "9s" },
  ],
  researcher: [
    { id: "r-90218", subject: "Weekly pricing digest, home goods", eta: "4s" },
    { id: "r-90221", subject: "Supplier lead times, Q4", eta: "11s" },
  ],
  retriever: [
    { id: "r-90216", subject: "Gift card balance question", eta: "3s" },
  ],
  toolcalls: [
    { id: "r-90215", subject: "Change shipping address", eta: "8s" },
    { id: "r-90217", subject: "Invoice copy request", eta: "12s" },
  ],
  writer: [
    { id: "r-90213", subject: "Wrong size delivered", eta: "5s" },
    { id: "r-90214", subject: "Change shipping address", eta: "8s" },
  ],
  reviewer: [
    { id: "r-90210", subject: "Damaged packaging claim", eta: "6s" },
    { id: "r-90220", subject: "Refund not received", eta: "10s" },
  ],
};

export const RESOLVED_TODAY = {
  total: 1285,
  delta: "+12.4%",
  caption: "tickets closed without a human",
  /** 24 hourly bars, values 0..1 */
  bars: [0.08, 0.05, 0.04, 0.05, 0.09, 0.16, 0.28, 0.42, 0.55, 0.68, 0.75, 0.82, 0.88, 0.9, 0.84, 0.8, 0.86, 0.92, 1.0, 0.94, 0.72, 0.5, 0.3, 0.16],
};

export const QUEUES = [
  { name: "Support triage", status: "Healthy" as const, waiting: 18, eta: "6.2s", load: 0.3, tone: "teal" },
  { name: "Content pipeline", status: "Backlog" as const, waiting: 41, eta: "58s", load: 0.72, tone: "amber" },
  { name: "Research digest", status: "Healthy" as const, waiting: 6, eta: "3.1s", load: 0.2, tone: "teal" },
  { name: "Lead enrichment", status: "Throttled" as const, waiting: 27, eta: "paused", load: 0.9, tone: "red" },
];

export const JUST_COMPLETED = [
  { subject: "Invoice copy request", dur: "9.3s", tok: "4.1k" },
  { subject: "Charged twice for order …", dur: "8.4s", tok: "4.1k" },
  { subject: "Change shipping address", dur: "9.7s", tok: "4.6k" },
  { subject: "Gift card balance", dur: "7.9s", tok: "3.9k" },
  { subject: "Damaged packaging", dur: "8.1s", tok: "4.0k" },
];

/** Writer's streamed reply shown in the inspector (r-90214) */
export const LAST_OUTPUT = {
  run: "r-90214",
  text: `Hi Dana, thanks for flagging this so quickly. You were charged twice for order A-4517, and that's on us.

I've refunded the duplicate $64.90 to your card today. It should appear within 3-5 business days, and I've added a $10 credit to your account for the trouble.

Anything else I can help with? — Cobalt Bay Support`,
};

/* ---------------------------------- runs ----------------------------------- */

export type SpanKind = "agent" | "llm" | "tool" | "retrieval" | "guard" | "error" | "retry";

export interface TraceSpan {
  id: string;
  /** agent group row */
  agent: string;
  agentId?: AgentId;
  label: string;
  kind: SpanKind;
  start: number;
  dur: number;
  tokens: number;
  kb?: string;
}

export type RunStatus = "ok" | "fail" | "warn";

export interface Run {
  id: string;
  subject: string;
  workflow: string;
  status: RunStatus;
  dur: number;
  tokens: number;
  cost: number;
  agoSec: number;
  owner: string;
  spans: TraceSpan[];
}

const W = "Support triage";
const C = "Content pipeline";
const R = "Research digest";

export const RUNS: Run[] = [
  {
    id: "r-90213",
    subject: "Charged twice for order A-4517",
    workflow: W,
    status: "ok",
    dur: 8.42,
    tokens: 4117,
    cost: 0.031,
    agoSec: 100,
    owner: "Maya Ito",
    spans: [
      { id: "s1", agent: "Planner", agentId: "planner", label: "plan.llm", kind: "llm", start: 0, dur: 1.51, tokens: 812 },
      { id: "s2", agent: "Planner", label: "route.check", kind: "tool", start: 1.6, dur: 0.28, tokens: 0 },
      { id: "s3", agent: "Tool calls", agentId: "toolcalls", label: "orders.lookup", kind: "tool", start: 1.95, dur: 0.61, tokens: 0, kb: "1.4kB" },
      { id: "s4", agent: "Tool calls", label: "payments.refund_quote", kind: "tool", start: 2.6, dur: 0.51, tokens: 0 },
      { id: "s5", agent: "Researcher", agentId: "researcher", label: "kb.search", kind: "retrieval", start: 1.95, dur: 0.44, tokens: 0, kb: "9.4kB" },
      { id: "s6", agent: "Retriever", agentId: "retriever", label: "embed.query", kind: "retrieval", start: 2.45, dur: 0.32, tokens: 318, kb: "2.1k tok" },
      { id: "s7", agent: "Retriever", label: "vector.topk", kind: "retrieval", start: 2.8, dur: 0.26, tokens: 0, kb: "6 pasg" },
      { id: "s8", agent: "Writer", agentId: "writer", label: "draft.llm", kind: "llm", start: 4.08, dur: 2.47, tokens: 1684 },
      { id: "s9", agent: "Reviewer", agentId: "reviewer", label: "policy_guard", kind: "guard", start: 6.6, dur: 0.35, tokens: 0 },
      { id: "s10", agent: "Reviewer", label: "review.llm", kind: "llm", start: 7.0, dur: 0.83, tokens: 536 },
      { id: "s11", agent: "Reviewer", label: "reply.send", kind: "tool", start: 7.9, dur: 0.32, tokens: 0 },
    ],
  },
  {
    id: "r-90212",
    subject: "Package marked delivered, not received",
    workflow: W,
    status: "ok",
    dur: 5.68,
    tokens: 2400,
    cost: 0.019,
    agoSec: 260,
    owner: "Maya Ito",
    spans: [
      { id: "t1", agent: "Planner", agentId: "planner", label: "plan.llm", kind: "llm", start: 0, dur: 1.2, tokens: 790 },
      { id: "t2", agent: "Tool calls", agentId: "toolcalls", label: "orders.lookup", kind: "tool", start: 1.3, dur: 0.55, tokens: 0, kb: "1.1kB" },
      { id: "t3", agent: "Retriever", agentId: "retriever", label: "embed.query", kind: "retrieval", start: 1.9, dur: 0.3, tokens: 300 },
      { id: "t4", agent: "Writer", agentId: "writer", label: "draft.llm", kind: "llm", start: 2.6, dur: 1.9, tokens: 1310 },
      { id: "t5", agent: "Reviewer", agentId: "reviewer", label: "policy_guard", kind: "guard", start: 4.6, dur: 0.3, tokens: 0 },
    ],
  },
  {
    id: "r-90218",
    subject: "Weekly pricing digest, home goods",
    workflow: R,
    status: "ok",
    dur: 21.7,
    tokens: 11800,
    cost: 0.094,
    agoSec: 900,
    owner: "Ravi Menon",
    spans: [
      { id: "u1", agent: "Planner", agentId: "planner", label: "plan.llm", kind: "llm", start: 0, dur: 1.8, tokens: 910 },
      { id: "u2", agent: "Researcher", agentId: "researcher", label: "web.sweep", kind: "retrieval", start: 1.9, dur: 6.4, tokens: 0, kb: "31kB" },
      { id: "u3", agent: "Retriever", agentId: "retriever", label: "embed.query", kind: "retrieval", start: 8.4, dur: 0.4, tokens: 480 },
      { id: "u4", agent: "Writer", agentId: "writer", label: "draft.llm", kind: "llm", start: 9.2, dur: 8.8, tokens: 8900 },
      { id: "u5", agent: "Reviewer", agentId: "reviewer", label: "review.llm", kind: "llm", start: 18.2, dur: 1.9, tokens: 1510 },
    ],
  },
  {
    id: "r-90207",
    subject: "Eval · cite KB article (v18)",
    workflow: W,
    status: "fail",
    dur: 6.98,
    tokens: 3400,
    cost: 0.026,
    agoSec: 1400,
    owner: "Sofia Lange",
    spans: [
      { id: "v1", agent: "Planner", agentId: "planner", label: "plan.llm", kind: "llm", start: 0, dur: 1.3, tokens: 760 },
      { id: "v2", agent: "Retriever", agentId: "retriever", label: "vector.topk", kind: "retrieval", start: 1.4, dur: 0.4, tokens: 0, kb: "9 pasg" },
      { id: "v3", agent: "Writer", agentId: "writer", label: "draft.llm", kind: "llm", start: 2.1, dur: 2.6, tokens: 2140 },
      { id: "v4", agent: "Reviewer", agentId: "reviewer", label: "cite.check", kind: "error", start: 4.8, dur: 0.9, tokens: 500 },
      { id: "v5", agent: "Reviewer", label: "retry.draft", kind: "retry", start: 5.8, dur: 1.1, tokens: 0 },
    ],
  },
  {
    id: "r-90204",
    subject: "Release notes draft, app 4.12",
    workflow: C,
    status: "ok",
    dur: 16.3,
    tokens: 9200,
    cost: 0.071,
    agoSec: 1900,
    owner: "Iris Kato",
    spans: [
      { id: "w1", agent: "Planner", agentId: "planner", label: "plan.llm", kind: "llm", start: 0, dur: 1.6, tokens: 880 },
      { id: "w2", agent: "Writer", agentId: "writer", label: "draft.llm", kind: "llm", start: 2.0, dur: 11.2, tokens: 6900 },
      { id: "w3", agent: "Reviewer", agentId: "reviewer", label: "review.llm", kind: "llm", start: 13.4, dur: 1.8, tokens: 1420 },
    ],
  },
  {
    id: "r-90201",
    subject: "Wrong size delivered",
    workflow: W,
    status: "warn",
    dur: 9.8,
    tokens: 4700,
    cost: 0.036,
    agoSec: 2300,
    owner: "Maya Ito",
    spans: [
      { id: "x1", agent: "Planner", agentId: "planner", label: "plan.llm", kind: "llm", start: 0, dur: 1.4, tokens: 800 },
      { id: "x2", agent: "Tool calls", agentId: "toolcalls", label: "payments.refund_quote", kind: "retry", start: 1.7, dur: 1.2, tokens: 0 },
      { id: "x3", agent: "Writer", agentId: "writer", label: "draft.llm", kind: "llm", start: 3.4, dur: 3.1, tokens: 2600 },
      { id: "x4", agent: "Reviewer", agentId: "reviewer", label: "policy_guard", kind: "guard", start: 6.9, dur: 0.4, tokens: 0 },
      { id: "x5", agent: "Reviewer", label: "review.llm", kind: "llm", start: 7.5, dur: 1.1, tokens: 1300 },
    ],
  },
  {
    id: "r-90198",
    subject: "Promo code not applied",
    workflow: W,
    status: "ok",
    dur: 7.1,
    tokens: 3500,
    cost: 0.027,
    agoSec: 2600,
    owner: "Kenji Oda",
    spans: [
      { id: "y1", agent: "Planner", agentId: "planner", label: "plan.llm", kind: "llm", start: 0, dur: 1.2, tokens: 740 },
      { id: "y2", agent: "Tool calls", agentId: "toolcalls", label: "orders.lookup", kind: "tool", start: 1.5, dur: 0.7, tokens: 0, kb: "0.9kB" },
      { id: "y3", agent: "Writer", agentId: "writer", label: "draft.llm", kind: "llm", start: 2.8, dur: 2.4, tokens: 1980 },
      { id: "y4", agent: "Reviewer", agentId: "reviewer", label: "review.llm", kind: "llm", start: 5.6, dur: 1.0, tokens: 780 },
    ],
  },
  {
    id: "r-90195",
    subject: "Help center article: returns",
    workflow: C,
    status: "ok",
    dur: 14.2,
    tokens: 8200,
    cost: 0.063,
    agoSec: 3100,
    owner: "Iris Kato",
    spans: [
      { id: "z1", agent: "Planner", agentId: "planner", label: "plan.llm", kind: "llm", start: 0, dur: 1.5, tokens: 830 },
      { id: "z2", agent: "Retriever", agentId: "retriever", label: "kb.search", kind: "retrieval", start: 1.7, dur: 0.6, tokens: 0, kb: "12kB" },
      { id: "z3", agent: "Writer", agentId: "writer", label: "draft.llm", kind: "llm", start: 3.0, dur: 8.4, tokens: 6100 },
      { id: "z4", agent: "Reviewer", agentId: "reviewer", label: "review.llm", kind: "llm", start: 11.8, dur: 1.7, tokens: 1270 },
    ],
  },
  {
    id: "r-90190",
    subject: "Supplier lead times, Q4",
    workflow: R,
    status: "ok",
    dur: 19.4,
    tokens: 10500,
    cost: 0.083,
    agoSec: 3800,
    owner: "Ravi Menon",
    spans: [
      { id: "q1", agent: "Planner", agentId: "planner", label: "plan.llm", kind: "llm", start: 0, dur: 1.7, tokens: 870 },
      { id: "q2", agent: "Researcher", agentId: "researcher", label: "web.sweep", kind: "retrieval", start: 2.0, dur: 5.9, tokens: 0, kb: "28kB" },
      { id: "q3", agent: "Writer", agentId: "writer", label: "draft.llm", kind: "llm", start: 8.4, dur: 7.6, tokens: 7400 },
      { id: "q4", agent: "Reviewer", agentId: "reviewer", label: "review.llm", kind: "llm", start: 16.4, dur: 1.6, tokens: 2230 },
    ],
  },
];

export const RUN_FILTERS = ["All", "Issues", "Live"] as const;
export type RunFilter = (typeof RUN_FILTERS)[number];

export const SPAN_KIND_META: Record<SpanKind, { label: string; color: string }> = {
  agent: { label: "Agent", color: "#8f7bff" },
  llm: { label: "LLM call", color: "#b39dff" },
  tool: { label: "Tool", color: "#34d9c3" },
  retrieval: { label: "Retrieval", color: "#5aa2ff" },
  guard: { label: "Guard", color: "#f472b6" },
  error: { label: "Error", color: "#f4627e" },
  retry: { label: "Retry", color: "#f59e4b" },
};

export interface StepDetail {
  model: string;
  start: number;
  dur: number;
  tokens: number;
  status: "ok" | "error";
  prompt: string;
  response: string;
}

/** Hand-written detail for the hero run's LLM steps. */
const HERO_STEPS: Record<string, StepDetail> = {
  s1: {
    model: "Orion-9",
    start: 0,
    dur: 1.51,
    tokens: 812,
    status: "ok",
    prompt: `system: You are the planner for Cobalt Bay support. Split the ticket
into ordered steps and name the tool for each.

user: Ticket r-90213 — customer reports a duplicate charge
on order A-4517. Card ending 4412. Include policy cite.`,
    response: `steps:
1. orders.lookup(A-4517) → confirm both charges
2. payments.refund_quote(dup amount)
3. retrieve policy "duplicate-charge-72h"
4. draft reply → tone: warm, sign Support`,
  },
  s8: {
    model: "Orion-9",
    start: 4.08,
    dur: 2.47,
    tokens: 1684,
    status: "ok",
    prompt: `system: Write a short, warm reply. Confirm what happened,
what we did, and when the money arrives. Sign as
Cobalt Bay Support.

user: facts + quote attached`,
    response: `Hi Dana, thanks for flagging this so quickly. You
were charged twice for order A-4517, and that's on us.

I've refunded the duplicate $64.90 to your card today.
It should appear within 3-5 business days, and I've
added a $10 credit to your account for the trouble.

Anything else I can help with? — Cobalt Bay Support`,
  },
  s10: {
    model: "Lyra-3",
    start: 7.0,
    dur: 0.83,
    tokens: 536,
    status: "ok",
    prompt: `system: Check the draft against policy 7.2 (refunds)
and citation rules. Reply PASS or list violations.

user: draft attached`,
    response: `PASS — refund wording matches 7.2; duplicate-charge
policy cited correctly; tone within guide.`,
  },
};

/** Synthesized detail for every other span, so the inspector is never empty. */
export function stepDetailFor(run: Run, span: TraceSpan): StepDetail {
  const hero = HERO_STEPS[span.id];
  if (hero) return hero;
  const base = {
    model: span.kind === "retrieval" ? "Ember Embed" : span.kind === "tool" ? "Zephyr Mini" : "Orion-9",
    start: span.start,
    dur: span.dur,
    tokens: span.tokens || 0,
    status: (span.kind === "error" ? "error" : "ok") as "ok" | "error",
  };
  if (span.kind === "llm") {
    return {
      ...base,
      prompt: `system: ${span.agent} step for ${run.id} — ${run.subject}.\n\nuser: context packet attached (${span.tokens} tok budget).`,
      response: span.kind === "llm" ? `…generated ${span.tokens} tokens for "${run.subject}".\n\n(step content is scripted demo data — wire your own tracer.)` : "",
    };
  }
  if (span.kind === "retrieval") {
    return {
      ...base,
      prompt: `query: "${run.subject}"\ntop_k: 6\nindex: kb-support-2026-10`,
      response: `returned ${span.kb ?? "6 passages"} · score ≥ 0.72 · latency ${span.dur.toFixed(2)}s`,
    };
  }
  if (span.kind === "tool") {
    return {
      ...base,
      prompt: `call: ${span.label}()\nargs: { ticket: "${run.id}" }`,
      response: `ok — ${span.kb ? `${span.kb} payload` : "no payload"} in ${span.dur.toFixed(2)}s`,
    };
  }
  if (span.kind === "guard") {
    return {
      ...base,
      prompt: `policy set: refunds@7.2, tone@2.1, citations@4.0\ninput: pending draft`,
      response: `0 violations · draft cleared to send`,
    };
  }
  if (span.kind === "retry") {
    return {
      ...base,
      status: "error",
      prompt: `attempt 2 of 3 — previous attempt failed validation`,
      response: `recovered — re-queued after backoff`,
    };
  }
  return {
    ...base,
    status: "error",
    prompt: `step ${span.label}`,
    response: `failed — see ${run.id} trace (scripted demo)`,
  };
}

/* ---------------------------------- usage ---------------------------------- */

export interface UsageModel {
  id: string;
  name: string;
  role: string;
  share: number;
  spend: string;
  spendPct: number;
  color: string;
}

export const MODELS: UsageModel[] = [
  { id: "orion", name: "Orion-9", role: "Reasoning", share: 54, spend: "$11.2k", spendPct: 61, color: "#8f7bff" },
  { id: "lyra", name: "Lyra-3", role: "General", share: 23, spend: "$4.1k", spendPct: 22, color: "#34d9c3" },
  { id: "zephyr", name: "Zephyr Mini", role: "Fast", share: 16, spend: "$2.8k", spendPct: 11, color: "#e479f3" },
  { id: "ember", name: "Ember Embed", role: "Embeddings", share: 7, spend: "$1.1k", spendPct: 6, color: "#f5b544" },
];

/** 14 days × 4 models, values in M tokens */
export const TOKENS_PER_DAY: { day: string; values: [number, number, number, number]; total: number }[] = [
  { day: "16", values: [14.2, 6.1, 4.0, 1.9], total: 26.2 },
  { day: "17", values: [9.8, 4.2, 3.1, 1.4], total: 18.5 },
  { day: "18", values: [10.4, 4.9, 3.3, 1.5], total: 20.1 },
  { day: "19", values: [16.8, 7.0, 4.6, 2.2], total: 30.6 },
  { day: "20", values: [17.4, 7.4, 5.0, 2.3], total: 32.1 },
  { day: "21", values: [18.9, 7.9, 5.2, 2.4], total: 34.4 },
  { day: "22", values: [19.6, 8.2, 5.6, 2.5], total: 35.9 },
  { day: "23", values: [13.1, 5.6, 3.8, 1.7], total: 24.2 },
  { day: "24", values: [12.0, 5.1, 3.4, 1.6], total: 22.1 },
  { day: "25", values: [15.2, 6.4, 4.3, 2.0], total: 27.9 },
  { day: "26", values: [22.8, 9.6, 6.3, 3.0], total: 41.7 },
  { day: "27", values: [21.4, 9.1, 6.0, 2.8], total: 39.3 },
  { day: "28", values: [20.7, 8.8, 5.8, 2.7], total: 38.0 },
  { day: "today", values: [12.4, 5.3, 3.6, 1.7], total: 23.0 },
];

export const TOKENS_BY_AGENT: { day: string; values: [number, number, number, number]; total: number }[] = TOKENS_PER_DAY.map((d) => ({
  day: d.day,
  // 4 "agents": Planner / Researcher / Writer / Reviewer (same totals, different split)
  values: [d.values[0] * 0.3, d.values[1] * 1.4, d.values[2] * 1.1, d.values[3] * 1.6].map((v) => Math.round(v * 10) / 10) as [number, number, number, number],
  total: d.total,
}));

export const BUDGET = {
  month: "October",
  day: 29,
  days: 31,
  spent: 18308,
  cap: 20000,
  pct: 92.1,
  forecast: "$19,710",
  forecastPct: 98.6,
};

export const USAGE_STATS = {
  spendMonth: 18426,
  spendPctOfBudget: "92.1% of budget",
  tokens: 931.4,
  tokensDelta: "+8.1%",
  costPerRun: 0.084,
  costDelta: "-6.3%",
  cacheHit: 38.2,
  cacheDelta: "+4.0 pts",
  /** sparkline series, normalized 0..1 */
  tokensSpark: [0.42, 0.45, 0.4, 0.5, 0.48, 0.56, 0.54, 0.62, 0.6, 0.7, 0.68, 0.78, 0.75, 0.86],
  costSpark: [0.8, 0.72, 0.76, 0.66, 0.6, 0.64, 0.52, 0.5, 0.44, 0.46, 0.38, 0.34, 0.3, 0.26],
  cacheSpark: [0.3, 0.34, 0.32, 0.4, 0.42, 0.48, 0.46, 0.54, 0.58, 0.62, 0.6, 0.68, 0.72, 0.78],
};

/** 29 days of October spend, in $ */
export const DAILY_SPEND: number[] = [
  420, 512, 468, 380, 402, 610, 640, 588, 602, 655, 690, 512, 468, 388, 420, 465, 610, 648, 700, 720, 660, 612, 590, 630, 672, 690, 645, 620, 588,
];
export const SPEND_AVG = 635;
export const SPEND_PACE = 645;

export interface WorkflowRow {
  name: string;
  owner: string;
  runs: string;
  tokens: string;
  spend: number;
  costPerRun: string;
  trend: number[];
  share: number;
}

export const TOP_WORKFLOWS: WorkflowRow[] = [
  { name: "Support triage", owner: "Maya", runs: "128,400", tokens: "512.3M", spend: 9880, costPerRun: "$0.077", trend: [0.5, 0.55, 0.48, 0.6, 0.58, 0.66, 0.62, 0.7], share: 54 },
  { name: "Research digest", owner: "Ravi", runs: "21,600", tokens: "182.9M", spend: 3420, costPerRun: "$0.158", trend: [0.4, 0.44, 0.42, 0.38, 0.46, 0.44, 0.5, 0.48], share: 19 },
  { name: "Content pipeline", owner: "Iris", runs: "9,840", tokens: "121.6M", spend: 2610, costPerRun: "$0.265", trend: [0.6, 0.52, 0.56, 0.5, 0.46, 0.48, 0.42, 0.4], share: 14 },
  { name: "Lead enrichment", owner: "Kenji", runs: "52,300", tokens: "86.2M", spend: 1780, costPerRun: "$0.034", trend: [0.3, 0.32, 0.3, 0.34, 0.33, 0.36, 0.35, 0.38], share: 10 },
  { name: "Release notes", owner: "Sofia", runs: "7,220", tokens: "28.4M", spend: 736, costPerRun: "$0.102", trend: [0.2, 0.24, 0.22, 0.26, 0.24, 0.28, 0.26, 0.3], share: 4 },
];

export const USAGE_COLUMNS = ["Workflow", "Runs", "Tokens", "Spend", "Cost / run", "Trend", "Share"] as const;

/* ---------------------------------- evals ---------------------------------- */

export interface EvalVersion {
  id: string;
  date: string;
  arm: "A" | "B" | null;
}

export const EVAL_VERSIONS: EvalVersion[] = [
  { id: "v11", date: "Aug 28", arm: null },
  { id: "v12", date: "Sep 4", arm: null },
  { id: "v13", date: "Sep 11", arm: null },
  { id: "v14", date: "Sep 18", arm: null },
  { id: "v15", date: "Sep 25", arm: null },
  { id: "v16", date: "Oct 2", arm: null },
  { id: "v17", date: "Oct 16", arm: "A" },
  { id: "v18", date: "Oct 28", arm: "B" },
];

export interface EvalCategory {
  name: string;
  short: string;
  tasks: number;
  /** score 0..100 per version; null = not run; fail = dot marker */
  scores: (number | null)[];
  fail?: number[]; // version indexes with a failing cell
}

export const EVAL_CATEGORIES: EvalCategory[] = [
  { name: "Refund policy lookup", short: "Refund policy loo…", tasks: 6, scores: [72, 76, 79, 83, 85, 88, 90, 91] },
  { name: "Duplicate charge handling", short: "Duplicate charge h…", tasks: 5, scores: [68, 71, 75, 78, 84, 86, 89, 90], fail: [0, 2, 4] },
  { name: "Cite KB article", short: "Cite KB article", tasks: 4, scores: [64, 70, 77, 82, 86, 89, 91, 72], fail: [7] },
  { name: "Order status via tool", short: "Order status via t…", tasks: 5, scores: [81, 83, 84, 84, 88, 90, 92, 94] },
  { name: "Escalate to a human", short: "Escalate to a human", tasks: 3, scores: [58, 63, 69, 74, 79, 83, 85, 87] },
  { name: "Refuse unsafe requests", short: "Refuse unsafe requ…", tasks: 4, scores: [88, 90, 91, 92, 94, 95, 96, 96] },
  { name: "Multilingual reply (FR/DE)", short: "Multilingual reply…", tasks: 3, scores: [55, 61, 66, 72, 76, 79, 84, 86] },
  { name: "Summarize long threads", short: "Summarize long thr…", tasks: 4, scores: [78, 73, 75, 78, 80, 83, 85, 83] },
  { name: "Empathetic tone", short: "Empathetic tone", tasks: 5, scores: [66, 70, 74, 79, 82, 84, 87, 89] },
  { name: "Structured ticket JSON", short: "Structured ticket…", tasks: 4, scores: [77, 80, 83, 85, 88, 90, 93, 95] },
];

export const EVAL_STATS = {
  overall: 88.3,
  overallDelta: -0.9,
  passRate: 93.8,
  passDelta: -4.2,
  judgeAgreement: 0.92,
  judgeDelta: "+1.8 pts",
  spotChecks: 240,
  spotNote: "this week · 95% agree",
};

export const REGRESSION = {
  category: "Cite KB article",
  from: 91,
  to: 72,
  delta: "-19 pts",
  when: "nightly · 14 min ago",
  cause:
    "The v18 Writer drops citations when the Retriever returns more than four passages. 2 of 6 citation tasks now fail the check.",
  failingRun: "r-90207",
  owner: "Owen",
};

export const COMPARE = {
  a: "v17",
  b: "v18",
  aScore: 89.2,
  bScore: 88.3,
  delta: -0.9,
  rows: [
    { label: "Pass rate", a: "97.5%", b: "93.8%", delta: "-4.3%", good: false },
    { label: "p50 latency", a: "8.1s", b: "7.6s", delta: "-6.2%", good: true },
    { label: "Cost / run", a: "$0.088", b: "$0.084", delta: "-4.5%", good: true },
    { label: "Tokens / run", a: "4,380", b: "4,120", delta: "-5.9%", good: true },
  ],
  moves: [
    { label: "Cite KB article", delta: -19 },
    { label: "Order status via tool", delta: +2 },
    { label: "Escalate to a human", delta: +2 },
    { label: "Multilingual reply (FR / DE)", delta: +2 },
  ],
};

export const PASS_BAR = 80;
