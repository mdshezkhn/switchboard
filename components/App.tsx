"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "motion/react";
import { Sidebar, Topbar, type ViewId } from "./chrome";
import { MotionProvider, viewVariants, motion } from "./motion";
import AgentGraphView from "./AgentGraph";
import RunsView from "./RunsView";
import UsageView from "./UsageView";
import EvalsView from "./EvalsView";

export default function App() {
  const [view, setView] = useState<ViewId>("agents");
  const [focusRunId, setFocusRunId] = useState<string | null>(null);
  const [agentsRunning, setAgentsRunning] = useState(17);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const openFailingRun = useCallback((id: string) => {
    setFocusRunId(id);
    setView("runs");
  }, []);

  const bindSearch = useCallback((el: HTMLInputElement | null) => {
    searchRef.current = el;
  }, []);

  // keyboard: ⌘K / Ctrl+K focuses search, 1-4 switch views
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (typing) return;
      const map: Record<string, ViewId> = { "1": "agents", "2": "runs", "3": "usage", "4": "evals" };
      const v = map[e.key];
      if (v) setView(v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // reset scroll when switching views (matches native app navigation)
  const mainRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [view]);

  // the live "agents running" counter jitters like real traffic
  useEffect(() => {
    const id = window.setInterval(() => {
      setAgentsRunning(16 + Math.floor(Math.random() * 3));
    }, 6000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <MotionProvider>
    <div className="flex h-dvh overflow-hidden bg-bg">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-accent focus:px-3 focus:py-1.5 focus:text-white">
        Skip to content
      </a>
      <Sidebar view={view} onView={setView} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar view={view} agentsRunning={agentsRunning} onSearchShortcut={bindSearch} />
        <main ref={mainRef} id="main" className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          <AnimatePresence mode="wait">
            <motion.div key={view} variants={viewVariants} initial="initial" animate="animate" exit="exit" className="mx-auto max-w-[1440px]">
              {view === "agents" && <AgentGraphView />}
              {view === "runs" && <RunsView focusRunId={focusRunId} />}
              {view === "usage" && <UsageView />}
              {view === "evals" && <EvalsView onOpenRun={openFailingRun} />}
            </motion.div>
          </AnimatePresence>
          <footer className="mx-auto mt-6 max-w-[1440px] pb-2">
            <p className="num text-[10px] text-mute">
              Switchboard · every number on screen is fictional demo data — wire the views to your own orchestration, tracing and billing services.
            </p>
          </footer>
        </main>
      </div>
    </div>
    </MotionProvider>
  );
}
