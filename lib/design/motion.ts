/**
 * Motion helpers. The design system's entrance grammar is expressed in CSS
 * (see .sd-enter in globals.css) so entrances work without client JS and stay
 * compositor-only. These helpers compute the per-item stagger delay:
 *   opacity 0->1, y 4->0, 160ms easeOut, delay = min(index, 24) * 10ms.
 *
 * For richer choreography (AnimatePresence height collapses, spring success
 * moments) downstream units use `motion` directly; the tokens/easings live in
 * globals.css so both paths stay in sync.
 */
import type { CSSProperties } from "react";

const STAGGER_STEP_MS = 10;
const STAGGER_CAP = 24;

/** Inline style carrying the staggered entrance delay for `.sd-enter`. */
export function staggerStyle(index: number): CSSProperties {
  const delay = Math.min(Math.max(index, 0), STAGGER_CAP) * STAGGER_STEP_MS;
  return { ["--sd-stagger" as string]: `${delay}ms` } as CSSProperties;
}

/** Framer-motion variants matching the CSS entrance, for units that opt in. */
export const enterVariants = {
  hidden: { opacity: 0, y: 4 },
  visible: (index = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.16,
      ease: [0.25, 1, 0.5, 1] as const,
      delay: (Math.min(index, STAGGER_CAP) * STAGGER_STEP_MS) / 1000,
    },
  }),
};

/** Spring overshoot — success/confirm moments ONLY (never hover). */
export const successSpring = {
  type: "spring" as const,
  stiffness: 500,
  damping: 18,
  mass: 0.6,
};
