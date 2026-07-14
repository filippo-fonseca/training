// Small display helpers for the admin surfaces. Dates are plain calendar dates
// (no timezone); we format them without constructing a Date to avoid TZ drift.

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "2026-10-18" -> "Oct 18, 2026". Passes through anything unparseable. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const [, y, mo, d] = m;
  const month = MONTHS[Number(mo) - 1] ?? mo;
  return `${month} ${Number(d)}, ${y}`;
}

export function formatDateRange(start: string | null | undefined, end: string | null | undefined): string {
  if (!start && !end) return 'No dates set';
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** Numeric km with one decimal, or a dash. */
export function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return '—';
  return `${km.toFixed(1)} km`;
}

/** Title-case an enum/snake token for display, e.g. "easy_run" -> "Easy run". */
export function humanize(value: string | null | undefined): string {
  if (!value) return '—';
  const spaced = value.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
