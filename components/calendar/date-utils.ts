/**
 * Pure calendar-date helpers for the training calendar.
 *
 * Plan days are stored as DATE strings ('YYYY-MM-DD') and MUST be treated as
 * plain calendar dates — never routed through a machine-local timezone (that
 * would shift a date across midnight in some zones). We anchor every parsed date
 * at UTC noon so day-of-week / iteration math is DST-proof, and format back with
 * UTC getters. "Today" is resolved explicitly in America/New_York (the athlete's
 * zone) per the plan brief.
 */

export type ISODate = string; // 'YYYY-MM-DD'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** True for a well-formed 'YYYY-MM-DD' string. */
export function isISODate(value: string): value is ISODate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** Parse an ISO date into a UTC-noon Date (safe for weekday + arithmetic). */
export function isoToDate(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/** Format a UTC-anchored Date back to 'YYYY-MM-DD'. */
export function dateToISO(date: Date): ISODate {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Add (or subtract) whole days to an ISO date. */
export function addDays(iso: ISODate, days: number): ISODate {
  const date = isoToDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return dateToISO(date);
}

/** 0 = Monday … 6 = Sunday (ISO week ordering, matching the plan's Mon-Sun weeks). */
export function mondayIndex(iso: ISODate): number {
  return (isoToDate(iso).getUTCDay() + 6) % 7;
}

/** Today's date in America/New_York as an ISO string. */
export function todayInNewYork(now: Date = new Date()): ISODate {
  // en-CA yields ISO-shaped YYYY-MM-DD; timeZone does the zone resolution.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** 'YYYY-MM' month key for a date. */
export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7);
}

/** Validate a 'YYYY-MM' month key. */
export function isMonthKey(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** First day ('YYYY-MM-01') of a month key. */
export function firstOfMonth(month: string): ISODate {
  return `${month}-01`;
}

/** Add whole months to a 'YYYY-MM' key. */
export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

/** "August 2026" style label for a month key. */
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** Short weekday name ('Mon') for an ISO date. */
export function weekdayShort(iso: ISODate): string {
  return WEEKDAYS_SHORT[mondayIndex(iso)];
}

/** "Sun, Sep 20" style label. */
export function shortDateLabel(iso: ISODate): string {
  const date = isoToDate(iso);
  const wd = WEEKDAYS_SHORT[mondayIndex(iso)];
  return `${wd}, ${MONTHS[date.getUTCMonth()].slice(0, 3)} ${date.getUTCDate()}`;
}

/** "Sunday, September 20, 2026" style label. */
export function longDateLabel(iso: ISODate): string {
  const date = isoToDate(iso);
  const wdFull = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][
    mondayIndex(iso)
  ];
  return `${wdFull}, ${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/** Day-of-month number (1-31). */
export function dayOfMonth(iso: ISODate): number {
  return isoToDate(iso).getUTCDate();
}

/** True when `iso` falls inside the given month key. */
export function inMonth(iso: ISODate, month: string): boolean {
  return monthKey(iso) === month;
}

/**
 * A Monday-start month grid: whole weeks (Mon-Sun rows) covering `month`,
 * padded with leading/trailing days from adjacent months so every row has 7.
 * Returns rows of ISO date strings. Because the plan's weeks are Mon-Sun, each
 * row aligns to exactly one plan week where it overlaps the plan.
 */
export function monthGrid(month: string): ISODate[][] {
  const first = firstOfMonth(month);
  const lastOfMonth = addDays(firstOfMonth(addMonths(month, 1)), -1);
  const rows: ISODate[][] = [];
  // Start on the Monday on or before the 1st; emit whole weeks while a week's
  // Monday still falls on or before the month's last day (a hard 6-row cap).
  let weekStart = addDays(first, -mondayIndex(first));
  while (weekStart <= lastOfMonth && rows.length < 6) {
    const row: ISODate[] = [];
    for (let c = 0; c < 7; c++) row.push(addDays(weekStart, c));
    rows.push(row);
    weekStart = addDays(weekStart, 7);
  }
  return rows;
}

/** Clamp an ISO date to a [min, max] range, returning the nearest bound. */
export function clampISO(iso: ISODate, min: ISODate, max: ISODate): ISODate {
  if (iso < min) return min;
  if (iso > max) return max;
  return iso;
}
