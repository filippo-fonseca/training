/**
 * Time helpers for the public journey. "Today" is always resolved in the
 * athlete's race timezone (America/New_York, per the seed's oracle) so the
 * dashboard shows the same day the athlete is living, regardless of where the
 * server or viewer sits. All arithmetic is date-only (calendar days), never
 * wall-clock milliseconds, so a countdown never drifts by an hour across DST.
 */

export const RACE_TIMEZONE = "America/New_York";

/** The current calendar date in a given IANA timezone, as `YYYY-MM-DD`. */
export function todayInZone(
  zone: string = RACE_TIMEZONE,
  now: Date = new Date(),
): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the ISO date shape we store.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Parse a `YYYY-MM-DD` date to a UTC-midnight epoch for date-only math. */
function isoToUtcDays(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Whole calendar days from `fromISO` to `toISO` (positive if `to` is later). */
export function daysBetween(fromISO: string, toISO: string): number {
  return Math.round(isoToUtcDays(toISO) - isoToUtcDays(fromISO));
}

export type RaceStatus = "upcoming" | "today" | "past";

export interface Countdown {
  /** Calendar days until the race; 0 on race day, negative once it has passed. */
  days: number;
  status: RaceStatus;
}

/** Days from `todayISO` until `raceISO`, plus a coarse status. */
export function countdown(todayISO: string, raceISO: string): Countdown {
  const days = daysBetween(todayISO, raceISO);
  const status: RaceStatus = days > 0 ? "upcoming" : days === 0 ? "today" : "past";
  return { days, status };
}

/** A friendly long-form label like "Sunday, October 18, 2026" from an ISO date. */
export function formatLongDate(iso: string, zone: string = RACE_TIMEZONE): string {
  const [y, m, d] = iso.split("-").map(Number);
  // Anchor at noon UTC so the zone conversion can never roll to an adjacent day.
  const at = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(at);
}

/** A compact label like "Oct 18" for milestone rows. */
export function formatShortDate(iso: string, zone: string = RACE_TIMEZONE): string {
  const [y, m, d] = iso.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    month: "short",
    day: "numeric",
  }).format(at);
}
