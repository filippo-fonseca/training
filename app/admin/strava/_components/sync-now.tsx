'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { syncNowAction } from '../actions';
import type { SyncResult } from '@/lib/strava';

function summarize(r: SyncResult): string {
  if (r.status === 'not_configured') return 'Strava is not configured.';
  if (r.status === 'not_connected') return 'Connect Strava first.';
  return `Pulled ${r.fetched}, matched ${r.matched} to plan days.`;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? 'Syncing…' : 'Sync now'}
    </Button>
  );
}

export function SyncNowButton() {
  const [state, formAction] = useActionState<SyncResult | null, FormData>(syncNowAction, null);
  return (
    <form action={formAction} className="flex items-center gap-3">
      <Submit />
      {state ? (
        <span className="text-xs text-sd-ink-faint" role="status">
          {summarize(state)}
        </span>
      ) : null}
    </form>
  );
}
