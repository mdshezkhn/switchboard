# Switchboard

An **agent-operations dashboard** with an animated relay graph, run traces, model-usage
charts and evaluation comparisons. Dark, dense, ops-console aesthetic.

Built as a reusable template: Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 ·
motion (Framer) · Lucide icons · Manrope + JetBrains Mono. No backend, no auth, no AI
services — everything on screen is fictional scripted demo data.

## Run it

```bash
npm install        # if your npm omits dev deps: npm install --include=dev
npm run dev        # → http://localhost:3000
```

```bash
npm run build      # production build
npm run typecheck  # tsc --noEmit
npm run avatars    # regenerate public/avatars/*.svg (scripts/generate-avatars.mjs)
```

## The four views

| View | What it shows |
| --- | --- |
| **Agents** | A projected 3D relay graph (Canvas 2D) with glossy agent nodes, arcing handoff cables and glowing packets. Select an agent to inspect its output, queues and metrics; pause or change replay speed of the live simulation. |
| **Runs** | Search and filter sample runs, select one, inspect its trace spans (prompt/response detail per span) and replay the animated waterfall. |
| **Usage** | Token usage and spend by model or agent (isometric stacked bars), spend-per-day chart with budget line, and a sortable workflows table with share bars. |
| **Evals** | Evaluation score matrix by task category × version, compare two versions side by side, and open the sample run behind a regression (jumps to Runs). |

Keyboard: `1`–`4` switch views, `⌘K`/`Ctrl+K` focuses search. Reduced-motion is
respected everywhere (canvas sim pauses, waterfalls render complete, transitions
become quick fades).

## Layout

```
app/
  globals.css        design tokens (@theme), panel/chip/btn primitives
  layout.tsx         fonts + metadata
  page.tsx           mounts <App/>
components/
  App.tsx            shell: sidebar + topbar + view switch (AnimatePresence)
  chrome.tsx         logo, avatars, sidebar, topbar, sparkline, delta, page header
  AgentGraph.tsx     Agents view — canvas host, DOM label layer, inspector
  RunsView.tsx       run list, trace waterfall + replay, span detail
  UsageView.tsx      stat cards, stacked bar chart, spend chart, workflows table
  EvalsView.tsx      score matrix, version compare, regression card
  agentIcons.ts      lucide icon maps per agent/span
  motion.tsx         shared easing + view transitions + <Rise>
lib/
  canvas.ts          RelayGraph engine: projection, cables, packets, pulses, stars
  data.ts            ALL demo data — edit this to make it yours
  format.ts          number/money/duration formatters
  reduced-motion.ts  matchMedia helpers
  useSize.ts         ResizeObserver hook
public/avatars/      generated initial avatars (scripts/generate-avatars.mjs)
```

## Customizing

- **Data**: everything fictional lives in `lib/data.ts` (agents + positions/colors,
  queue payloads, runs + trace spans, usage series, eval scores). Swap it for your
  API and the views stay.
- **Colors / theme**: edit the `@theme` tokens in `app/globals.css`. Agent node
  colors are per-agent in `lib/data.ts` (`color: [core, glow]`).
- **Graph shape**: agent 3D positions are normalized `-1..1` triples (`pos`), node
  size `r`, edges in `EDGES` (`handoff | tool | revision` kinds color the cables).
- **Charts**: bar depth/geometry constants at the top of `UsageView.tsx`;
  matrix color scale in `EvalsView.tsx` (`cellColor`).
- **Avatars**: edit names/palette in `scripts/generate-avatars.mjs`, run `npm run avatars`.

## The canvas engine (lib/canvas.ts)

`RelayGraph` keeps 3D positions for every node and projects them with a simple
perspective divide (`CAMERA = 2.6`) each frame. It draws, back-to-front:
star field → nebula glows → cables (quadratic arcs with depth-scaled width and
alpha) → traveling packets (additive glow dots) → agent orbs (radial-gradient
gloss, halo ring, pulsing when busy) → terminal chips. Node **labels stay in the
DOM** — the engine reports projected positions through `onProject` and React
positions absolutely-placed chips; crisp text, screen-reader visible, zero
re-renders per frame.

The React side (`AgentGraph.tsx`) runs a separate ticket **simulation**: staged
runs that walk agent sequences, mark nodes busy, spawn packets on handoffs, and
feed the live queue/output panels. Pause + speed multiply the sim clock, not the
render clock.

## License

MIT — yours to use for personal and client projects.
