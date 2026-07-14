/** Small shared formatters for the calendar/day views. */

/** "12 km", "21.1 km", or "—" for null/zero. Trims a trailing ".0". */
export function formatKm(km: number | null | undefined): string {
  if (km == null || km === 0) return '—';
  const rounded = Math.round(km * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} km`;
}

/** Bare numeric km ("12", "21.1"), no unit; empty string for null/zero. */
export function kmValue(km: number | null | undefined): string {
  if (km == null || km === 0) return '';
  const rounded = Math.round(km * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** Sum a list of nullable kilometres. */
export function sumKm(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (v ?? 0), 0);
}
