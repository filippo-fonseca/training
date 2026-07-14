// FormData parsing helpers shared by the admin server actions. Empty strings
// become null so optional DB columns stay null rather than '' — the DB keeps the
// raw prescription/target text, so blank means "not set", never an empty string.

export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t === '' ? null : t;
}

export function reqStr(fd: FormData, key: string): string {
  return str(fd, key) ?? '';
}

export function num(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function int(fd: FormData, key: string): number | null {
  const n = num(fd, key);
  return n === null ? null : Math.trunc(n);
}

export function bool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === 'on' || v === 'true' || v === '1';
}

/** Result shape for admin mutations driven by useActionState. */
export interface ActionResult {
  ok: boolean;
  error?: string;
  /** Set on success when the caller should show a transient confirmation. */
  saved?: boolean;
}

export const OK: ActionResult = { ok: true, saved: true };
export function fail(error: string): ActionResult {
  return { ok: false, error };
}

/** Turn a Supabase/PostgREST error into a readable admin message. */
export function dbMessage(context: string, message: string): string {
  const m = message.toLowerCase();
  if (m.includes('row-level security') || m.includes('violates row-level')) {
    return `${context}: you are not authorized to make this change (owner only).`;
  }
  if (m.includes('duplicate key') || m.includes('unique constraint')) {
    return `${context}: that already exists (duplicate index or slug).`;
  }
  if (m.includes('foreign key')) {
    return `${context}: a referenced record is missing.`;
  }
  return `${context}: ${message}`;
}
