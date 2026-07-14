/**
 * Minimal className joiner. Filters falsy values so conditional classes read
 * cleanly without pulling in a dependency. Later-wins on conflicts is the
 * caller's responsibility (Tailwind source order), which is fine for our
 * token-driven utility set.
 */
export type ClassValue = string | number | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
