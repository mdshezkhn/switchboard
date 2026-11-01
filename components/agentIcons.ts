import {
  Compass,
  Telescope,
  Database,
  Wrench,
  PenLine,
  ScanEye,
  Inbox,
  Send,
  Sparkles,
  Braces,
  BookOpen,
  ShieldCheck,
  RotateCcw,
  Radio,
} from "lucide-react";
import type { AgentId, SpanKind } from "@/lib/data";

export const AGENT_ICONS: Record<AgentId, typeof Compass> = {
  planner: Compass,
  researcher: Telescope,
  retriever: Database,
  toolcalls: Wrench,
  writer: PenLine,
  reviewer: ScanEye,
};

export const TERMINAL_ICONS: Record<string, typeof Inbox> = {
  "ticket.in": Inbox,
  "reply.out": Send,
};

export const SPAN_ICONS: Record<SpanKind, typeof Sparkles> = {
  agent: Radio,
  llm: Sparkles,
  tool: Braces,
  retrieval: BookOpen,
  guard: ShieldCheck,
  error: ShieldCheck,
  retry: RotateCcw,
};

/** small avatar palette shared by the topbar, tables and queues */
export const AVATAR_COLORS = ["#8f7bff", "#34d9c3", "#e479f3", "#f5b544", "#5aa2ff", "#f59e4b"];
