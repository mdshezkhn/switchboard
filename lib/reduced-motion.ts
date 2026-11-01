/** Shared reduced-motion helper for canvas + JS-driven animation. */

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function onReducedMotionChange(cb: (reduced: boolean) => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) {
    cb(false);
    return () => {};
  }
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  cb(mq.matches);
  const handler = (e: MediaQueryListEvent) => cb(e.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
