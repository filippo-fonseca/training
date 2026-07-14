// Small SQL emit helpers for the seed generator: literal escaping, deterministic
// UUIDs, and an idempotent upsert builder.

import { createHash } from 'node:crypto';

export type SqlValue = string | number | boolean | null | { raw: string };

/** Escape a Postgres string literal (single quotes doubled). */
export function lit(value: SqlValue): string {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Non-finite number literal: ${value}`);
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'object' && 'raw' in value) return value.raw;
  return `'${value.replace(/'/g, "''")}'`;
}

// UUIDv5 (RFC 4122, name-based, SHA-1) for stable, reproducible primary keys so
// the seed is idempotent (upsert on id) across regenerations.
const NAMESPACE = 'a3f1c0de-0000-4000-8000-baystate2026'; // fixed app namespace

function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ''), 'hex');
}

export function uuid5(name: string): string {
  const hash = createHash('sha1');
  hash.update(uuidToBytes(NAMESPACE));
  hash.update(Buffer.from(name, 'utf8'));
  const bytes = hash.digest().subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // RFC 4122 variant
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Build an idempotent upsert statement. The conflict target defaults to the `id`
 * primary key but can be overridden (e.g. `plan_id` for tables keyed on the plan
 * rather than a synthetic id). On conflict every column except the conflict
 * target and created_at is refreshed from the excluded row and updated_at is
 * bumped, so re-running the seed reflects the latest parse without
 * cascade-deleting any user data (logs, health entries).
 */
export function upsert(
  table: string,
  row: Record<string, SqlValue>,
  conflictTarget: string = 'id',
): string {
  const cols = Object.keys(row);
  const values = cols.map((c) => lit(row[c]!));
  const updatable = cols.filter((c) => c !== conflictTarget && c !== 'created_at');
  const setClause = updatable.map((c) => `${c} = excluded.${c}`);
  if (updatable.some((c) => c === 'updated_at')) {
    // keep updated_at fresh via the trigger too, but be explicit for clarity
  }
  return (
    `insert into public.${table} (${cols.join(', ')})\n` +
    `values (${values.join(', ')})\n` +
    `on conflict (${conflictTarget}) do update set ${setClause.join(', ')};`
  );
}
