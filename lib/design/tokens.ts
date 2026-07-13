/**
 * Typed handles onto the CSS custom properties defined in app/globals.css.
 * The CSS file is the single source of truth for VALUES; this module gives
 * TypeScript-friendly references so components never hard-code hex/oklch.
 *
 * Use `cssVar("--sd-box")` in inline styles, or `statusTone` for the
 * functional-hue rules (6px dots + 15% chips ONLY, per the brief §2d).
 */
import type { CSSProperties } from "react";

export function cssVar(name: `--${string}`): string {
  return `var(${name})`;
}

/** Functional status tones — the only place non-cyan hues are allowed. */
export const STATUS_TONES = {
  active: { label: "Active", var: "--ink-sage" },
  done: { label: "Done", var: "--ink-sage" },
  progress: { label: "In progress", var: "--sd-accent" },
  synced: { label: "Synced", var: "--sd-accent" },
  warn: { label: "Warning", var: "--ink-amber" },
  pending: { label: "Pending", var: "--ink-amber" },
  danger: { label: "Missed", var: "--ink-coral" },
  idle: { label: "Idle", var: "--sd-ink-faint" },
} as const;

export type StatusTone = keyof typeof STATUS_TONES;

/** Strict radius scale (D7) surfaced for inline use where a utility won't do. */
export const RADIUS = {
  thumb: "var(--sd-radius-thumb)",
  crumb: "var(--sd-radius-crumb)",
  chrome: "var(--sd-radius-chrome)",
  tile: "var(--sd-radius-tile)",
  card: "var(--sd-radius-card)",
  full: "var(--sd-radius-full)",
} as const;

/**
 * 15%-alpha functional chip recipe (brief §2d). Returns inline style props for
 * a tinted chip: background is the hue at 15% over --sd-box, border at 30%.
 */
export function chipStyle(hueVar: `--${string}`): CSSProperties {
  return {
    background: `color-mix(in srgb, var(${hueVar}) 15%, var(--sd-box))`,
    borderColor: `color-mix(in srgb, var(${hueVar}) 30%, var(--sd-line))`,
  };
}
