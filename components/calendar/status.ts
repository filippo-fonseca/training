/**
 * Two independent visual channels for a plan day:
 *
 *  1. TYPE  — the session category (what kind of training). Rendered as a small
 *     leading dot / tint using the category-tint palette (blue, violet, coral,
 *     sage, amber, grey). Race is special and uses the accent-chrome chip.
 *  2. STATUS — planned | logged | missed | alternative-used | rest. Per the
 *     brief, status uses functional green/amber/coral ONLY as 6px dots and
 *     15%-alpha chips; planned/rest stay neutral. Cyan is never a status hue
 *     (it stays chrome-only); the race is the sole accent-chrome exception.
 *
 * Both channels resolve to a CSS custom-property NAME (never a raw literal) so
 * every colour flows through the design tokens in globals.css.
 */

import type { SessionCategory, SessionLog } from '@/lib/types/database';
import type { ISODate } from './date-utils';

export type DayStatus = 'planned' | 'logged' | 'missed' | 'alternative-used' | 'rest';

// --- Category (type) palette -------------------------------------------------
export interface CategoryMeta {
  label: string;
  /** CSS var for the 6px dot / 15% chip; null keeps the dot neutral (grey). */
  hueVar: `--${string}` | null;
  /** True for the race — rendered with the accent-chrome chip idiom. */
  accent?: boolean;
}

export const CATEGORY_META: Record<SessionCategory, CategoryMeta> = {
  easy_run: { label: 'Easy', hueVar: '--ink-blue' },
  long_run: { label: 'Long run', hueVar: '--ink-violet' },
  quality_run: { label: 'Quality', hueVar: '--ink-coral' },
  bike: { label: 'Bike', hueVar: '--ink-sage' },
  strength_only: { label: 'Strength', hueVar: '--ink-amber' },
  rest: { label: 'Rest', hueVar: null },
  race: { label: 'Race', hueVar: null, accent: true },
};

export function categoryMeta(category: SessionCategory | null): CategoryMeta {
  return category ? CATEGORY_META[category] : { label: 'Session', hueVar: null };
}

// --- Status palette ----------------------------------------------------------
export interface StatusMeta {
  label: string;
  /** CSS var for the 6px status dot; null = neutral (no functional hue). */
  hueVar: `--${string}` | null;
  /** Whether this status warrants a visible dot/chip (planned/rest are quiet). */
  emphasized: boolean;
}

export const STATUS_META: Record<DayStatus, StatusMeta> = {
  planned: { label: 'Planned', hueVar: null, emphasized: false },
  logged: { label: 'Logged', hueVar: '--ink-sage', emphasized: true },
  'alternative-used': { label: 'Alternative', hueVar: '--ink-amber', emphasized: true },
  missed: { label: 'Missed', hueVar: '--ink-coral', emphasized: true },
  rest: { label: 'Rest', hueVar: null, emphasized: false },
};

/**
 * Derive a day's status from its primary category, an optional log, and today.
 * Precedence: rest day → rest; then a recorded log (modified→alternative-used,
 * completed→logged, otherwise→missed); an un-logged past day → missed; else
 * planned. `today` and `date` are compared as ISO strings (lexicographic ==
 * chronological for 'YYYY-MM-DD').
 */
export function deriveStatus(
  category: SessionCategory | null,
  date: ISODate,
  today: ISODate,
  log: SessionLog | null | undefined,
): DayStatus {
  if (category === 'rest') return 'rest';
  if (log) {
    if (log.modified) return 'alternative-used';
    if (log.completed) return 'logged';
    return 'missed';
  }
  if (date < today) return 'missed';
  return 'planned';
}

/** Inline style for a 15%-alpha functional chip over --sd-box (brief §2d). */
export function chip(hueVar: `--${string}`) {
  return {
    background: `color-mix(in srgb, var(${hueVar}) 15%, var(--sd-box))`,
    borderColor: `color-mix(in srgb, var(${hueVar}) 30%, var(--sd-line))`,
  };
}

/** Inline style for the accent-chrome "current/info" chip (brief §7 badges). */
export const accentChip = {
  color: 'var(--sd-accent-faint)',
  background: 'color-mix(in srgb, var(--sd-accent) 12%, var(--sd-box))',
  borderColor: 'color-mix(in srgb, var(--sd-accent) 30%, var(--sd-line))',
} as const;

/** Traffic-light gate → functional hue var, for alternatives + logs. */
export function gateHue(gate: 'green' | 'yellow' | 'red'): `--${string}` {
  return gate === 'green' ? '--ink-sage' : gate === 'yellow' ? '--ink-amber' : '--ink-coral';
}
