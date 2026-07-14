// Pace math for the completion form: seconds-per-km stored implicitly via a
// derived mm:ss/km string, never the source of truth once the owner types a
// direct override (their text always wins, matching the plan's own
// "raw text always wins over parsed" convention).

/** "5:23/km" for a given seconds-per-km value. */
export function formatPaceFromSecondsPerKm(secPerKm: number): string {
  const s = Math.round(secPerKm);
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}/km`;
}

/** Derive "m:ss/km" from a distance + duration pair, or null when either is missing/zero. */
export function deriveActualPaceText(distanceKm: number | null, durationMin: number | null): string | null {
  if (distanceKm == null || distanceKm <= 0 || durationMin == null || durationMin <= 0) return null;
  const secPerKm = (durationMin * 60) / distanceKm;
  return formatPaceFromSecondsPerKm(secPerKm);
}
