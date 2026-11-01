"use client";

import { MotionConfig, motion, useReducedMotion, type Variants } from "motion/react";
import type { ReactNode } from "react";

/** Shared easing — one place to retune the whole product. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * View swap variants. Initial ALWAYS matches the server render (no
 * useReducedMotion branching) — reduced motion is handled globally by
 * <MotionProvider> so transforms are stripped at animation time, never
 * changing the first client paint.
 */
export const viewVariants: Variants = {
  initial: { opacity: 0, y: 14, scale: 0.995 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: EASE } },
  exit: { opacity: 0, y: -8, scale: 0.997, transition: { duration: 0.14, ease: "easeIn" } },
};

/** Global motion policy: respect prefers-reduced-motion everywhere. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Staggered entrance for cards inside a view. */
export function Rise({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

export { motion, useReducedMotion };
