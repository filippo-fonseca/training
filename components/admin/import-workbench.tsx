'use client';

import Link from 'next/link';
import { useRef, useState, useTransition, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { previewImport, applyImport, type PreviewResult, type ApplyResult } from '@/app/admin/import/actions';
import type { ImportCounts } from '@/app/admin/import/_lib/schema';

const COUNT_KEYS: [keyof ImportCounts, string][] = [
  ['phases', 'Phases'],
  ['weeks', 'Weeks'],
  ['days', 'Days'],
  ['sessions', 'Sessions'],
  ['alternatives', 'Alternatives'],
  ['milestones', 'Milestones'],
  ['checkpoints', 'Checkpoints'],
];

function CountGrid({ counts }: { counts: ImportCounts }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {COUNT_KEYS.map(([k, label]) => (
        <div key={k} className="rounded-sd-tile border border-sd-line bg-sd-dark-box px-3 py-2">
          <div className="sd-numeral text-base font-semibold text-sd-ink">{counts[k]}</div>
          <div className="sd-stat-label mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  );
}

function ErrorList({ errors }: { errors: string[] }) {
  return (
    <div
      className="rounded-sd-chrome border px-4 py-3"
      style={{
        color: 'var(--ink-coral)',
        background: 'color-mix(in srgb, var(--ink-coral) 10%, var(--sd-box))',
        borderColor: 'color-mix(in srgb, var(--ink-coral) 30%, var(--sd-line))',
      }}
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider">
        {errors.length} problem{errors.length === 1 ? '' : 's'} found
      </p>
      <ul className="space-y-1 text-xs">
        {errors.slice(0, 50).map((e, i) => (
          <li key={i} className="font-mono">
            {e}
          </li>
        ))}
        {errors.length > 50 ? <li className="opacity-70">…and {errors.length - 50} more.</li> : null}
      </ul>
    </div>
  );
}

export function ImportWorkbench() {
  const [json, setJson] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [applied, setApplied] = useState<ApplyResult | null>(null);
  const [isPreviewing, startPreview] = useTransition();
  const [isApplying, startApply] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setJson(String(reader.result ?? ''));
      setPreview(null);
      setApplied(null);
    };
    reader.readAsText(file);
  }

  function runPreview() {
    setApplied(null);
    startPreview(async () => {
      setPreview(await previewImport(json));
    });
  }

  function runApply() {
    startApply(async () => {
      const res = await applyImport(json);
      setApplied(res);
      if (res.ok) setPreview(null);
    });
  }

  const canApply = preview?.ok === true && !isApplying;

  return (
    <div className="flex flex-col gap-5">
      <Panel className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <span className="sd-stat-label">Plan JSON</span>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="sd-btn sd-btn-quiet px-3 py-1.5 text-tiny"
            >
              Upload file
            </button>
          </div>
        </div>
        <textarea
          value={json}
          onChange={(e) => {
            setJson(e.target.value);
            setPreview(null);
            setApplied(null);
          }}
          spellCheck={false}
          rows={14}
          placeholder='{ "version": 1, "plan": { "slug": "…", "title": "…" }, "phases": [], "weeks": [], "days": [] }'
          className="w-full resize-y rounded-sd-chrome border border-sd-line bg-sd-input px-3 py-2 font-mono text-xs leading-relaxed text-sd-ink placeholder:text-sd-ink-faint"
        />
        <div className="mt-4 flex items-center gap-3">
          <Button type="button" onClick={runPreview} disabled={!json.trim() || isPreviewing}>
            {isPreviewing ? 'Validating…' : 'Validate & preview'}
          </Button>
          <Button type="button" variant="quiet" onClick={runApply} disabled={!canApply}>
            {isApplying ? 'Applying…' : 'Apply import'}
          </Button>
        </div>
      </Panel>

      {preview && !preview.ok ? <ErrorList errors={preview.errors} /> : null}

      {preview && preview.ok && preview.counts ? (
        <Panel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <span
              className="size-1.5 rounded-full"
              style={{ background: preview.mode === 'replace' ? 'var(--ink-amber)' : 'var(--ink-sage)' }}
            />
            <span className="text-sm font-semibold text-sd-ink">
              {preview.mode === 'replace' ? 'Replaces an existing plan' : 'Creates a new plan'}
            </span>
          </div>
          <p className="mb-4 text-sm text-sd-ink-dull">
            <span className="sd-numeral">{preview.slug}</span> · {preview.title}
          </p>
          {preview.mode === 'replace' && preview.existing ? (
            <p className="mb-4 text-xs text-sd-ink-faint">
              A plan with this slug exists ({preview.existing.days} days, {preview.existing.weeks} weeks). Applying
              deletes it and everything under it, then imports the JSON below.
            </p>
          ) : null}
          <CountGrid counts={preview.counts} />
          <p className="mt-4 text-xs text-sd-ink-faint">
            Review the counts, then Apply import. This is a dry-run preview; nothing has been written yet.
          </p>
        </Panel>
      ) : null}

      {applied && !applied.ok ? <ErrorList errors={applied.errors} /> : null}

      {applied && applied.ok && applied.counts ? (
        <Panel className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="size-1.5 rounded-full" style={{ background: 'var(--ink-sage)' }} />
            <span className="text-sm font-semibold text-sd-ink">
              Imported ({applied.mode === 'replace' ? 'replaced' : 'created'})
            </span>
          </div>
          <CountGrid counts={applied.counts} />
          <div className="mt-4">
            <Link href={`/admin/plan/${applied.planId}`} className="sd-btn sd-btn-primary">
              Open plan
            </Link>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
