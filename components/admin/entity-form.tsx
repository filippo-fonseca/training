'use client';

import type { ReactNode } from 'react';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/app/admin/_lib/form';

const INITIAL: ActionResult = { ok: true };

type BoundAction = (prev: ActionResult, formData: FormData) => Promise<ActionResult>;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving…' : label}
    </Button>
  );
}

/**
 * Reusable admin form driven by a bound server action with the (prev, formData)
 * signature. Renders its fields as children, then a status row + submit. On a
 * successful update the action returns { ok, saved } and a transient "Saved"
 * confirmation shows; create/delete actions redirect and never return.
 */
export interface EntityFormProps {
  action: BoundAction;
  children: ReactNode;
  submitLabel?: string;
  /** Extra controls rendered next to the submit button (e.g. a cancel link). */
  aside?: ReactNode;
  className?: string;
}

export function EntityForm({ action, children, submitLabel = 'Save', aside, className }: EntityFormProps) {
  const [state, formAction] = useActionState(action, INITIAL);

  return (
    <form action={formAction} className={className} noValidate>
      {children}
      <div className="mt-4 flex items-center gap-3">
        <SubmitButton label={submitLabel} />
        {aside}
        {state.error ? (
          <span role="alert" className="text-xs" style={{ color: 'var(--ink-coral)' }}>
            {state.error}
          </span>
        ) : null}
        {state.ok && state.saved ? (
          <span className="sd-enter inline-flex items-center gap-1.5 text-xs text-sd-ink-dull">
            <span className="size-1.5 rounded-full" style={{ background: 'var(--ink-sage)' }} />
            Saved
          </span>
        ) : null}
      </div>
    </form>
  );
}
