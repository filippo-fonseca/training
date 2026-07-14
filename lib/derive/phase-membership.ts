// Phase membership: the single, shared rule for grouping weeks into phases by
// date containment. Pure functions over already-fetched rows; no network, no DB.
//
// The rule (mirrors how a day matches into its week):
//   * A phase owns a date when its [start_date, end_date] window CONTAINS that
//     date, inclusive on both ends.
//   * A week belongs to the phase that contains the week's start_date.
//   * Ties / overlaps resolve to the phase with the LATEST start_date (the most
//     specific, innermost block). A same-start tie then prefers the narrower
//     window (earlier end_date) so the result is always deterministic.
//   * A phase with a null start_date or end_date has no window and matches
//     nothing; a date (or week) inside no phase belongs to none.
//
// Every consumer (journey model, progress bands, admin, import) derives phase
// membership through these functions, so there is exactly one rule to reason
// about and to test.

/** The minimal phase shape the containment rule needs. */
export interface PhaseDateRange {
  start_date: string | null;
  end_date: string | null;
}

/** The minimal week shape: a week is placed by its own start_date. */
export interface WeekStartDate {
  start_date: string | null;
}

/**
 * The phase whose [start_date, end_date] window contains `date` (inclusive).
 * Ties/overlaps resolve to the latest start_date, then the narrower window.
 * Returns null when `date` is null or no dated phase contains it. Dates are ISO
 * 'YYYY-MM-DD' strings, so lexical comparison is chronological.
 */
export function phaseForDate<P extends PhaseDateRange>(
  phases: P[],
  date: string | null,
): P | null {
  if (!date) return null;
  let best: P | null = null;
  for (const p of phases) {
    if (!p.start_date || !p.end_date) continue; // null-dated phase matches nothing
    if (date < p.start_date || date > p.end_date) continue; // not contained
    if (best === null) {
      best = p;
      continue;
    }
    // Tie-break: latest start_date wins; on equal starts, the narrower window
    // (earlier end_date) is the more specific block.
    const laterStart = p.start_date > (best.start_date as string);
    const sameStartNarrower =
      p.start_date === best.start_date && (p.end_date as string) < (best.end_date as string);
    if (laterStart || sameStartNarrower) best = p;
  }
  return best;
}

/**
 * The phase that owns `week`, by containment of the week's start_date. Sibling
 * of phaseForDate for the common "which phase is this week in?" question.
 */
export function phaseForWeek<P extends PhaseDateRange, W extends WeekStartDate>(
  phases: P[],
  week: W,
): P | null {
  return phaseForDate(phases, week.start_date);
}

/** The result of placing every week into its phase (or into the orphan set). */
export interface WeekAssignment<W> {
  /** phase.id -> its weeks, each list sorted ascending by week_index. */
  byPhaseId: Map<string, W[]>;
  /** Weeks whose start_date falls inside no phase window. */
  orphans: W[];
}

/**
 * Assign every week to exactly one phase (or to the orphan set) using the
 * containment rule and its tie-break. Weeks in each phase list are ordered by
 * week_index. Used for the admin read-only "weeks in this phase" list, progress
 * banding, and the journey model's phase-week position.
 */
export function assignWeeksToPhases<
  P extends PhaseDateRange & { id: string },
  W extends WeekStartDate & { id: string; week_index: number },
>(phases: P[], weeks: W[]): WeekAssignment<W> {
  const byPhaseId = new Map<string, W[]>();
  const orphans: W[] = [];
  for (const w of weeks) {
    const phase = phaseForWeek(phases, w);
    if (!phase) {
      orphans.push(w);
      continue;
    }
    const list = byPhaseId.get(phase.id) ?? [];
    list.push(w);
    byPhaseId.set(phase.id, list);
  }
  for (const list of byPhaseId.values()) {
    list.sort((a, b) => a.week_index - b.week_index);
  }
  return { byPhaseId, orphans };
}

/**
 * The ids of phases whose date windows overlap another phase. Two dated phases
 * overlap when their [start_date, end_date] intervals intersect (inclusive).
 * Drives the admin overlap warning chip. Null-dated phases never overlap.
 */
export function overlappingPhaseIds<P extends PhaseDateRange & { id: string }>(
  phases: P[],
): Set<string> {
  const dated = phases.filter((p) => p.start_date && p.end_date);
  const out = new Set<string>();
  for (let i = 0; i < dated.length; i++) {
    for (let j = i + 1; j < dated.length; j++) {
      const a = dated[i];
      const b = dated[j];
      if (
        (a.start_date as string) <= (b.end_date as string) &&
        (b.start_date as string) <= (a.end_date as string)
      ) {
        out.add(a.id);
        out.add(b.id);
      }
    }
  }
  return out;
}
