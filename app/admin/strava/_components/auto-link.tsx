'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { autoLinkTodayAction } from '../actions';
import type { AutoLinkSummary } from '@/lib/strava';

function summarize(r: AutoLinkSummary): string {
  if (r.reason === 'no plan') return 'No plan configured.';
  if (r.reason === 'no plan day') return `No plan day for ${r.date ?? 'today'}.`;
  if (r.linked === 0 && r.skippedExisting === 0) {
    return `No runs found for ${r.date ?? 'today'}.`;
  }
  const off = r.offPlan > 0 ? `, off-plan ${r.offPlan}` : '';
  return `Linked ${r.linked}${off} (already linked ${r.skippedExisting}).`;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="ghost" disabled={pending} aria-disabled={pending}>
      {pending ? 'Linking…' : "Auto-link today's runs"}
    </Button>
  );
}

export function AutoLinkButton() {
  const [state, formAction] = useActionState<AutoLinkSummary | null, FormData>(
    autoLinkTodayAction,
    null,
  );
  return (
    <form action={formAction} className="flex items-center gap-3">
      <Submit />
      {state ? (
        <span className="sd-enter text-xs text-sd-ink-faint" role="status">
          {summarize(state)}
        </span>
      ) : null}
    </form>
  );
}
