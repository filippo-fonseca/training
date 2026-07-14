'use client';

import { useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/design/cn';
import { TrashGlyph } from '@/components/admin/icons';

/**
 * Confirm-then-delete control. Wraps a bound server action (no return value) in a
 * form and blocks submit until the user confirms. Delete is destructive, so the
 * default confirmation is always on unless the caller opts out.
 */
export interface DeleteButtonProps {
  action: (formData: FormData) => void | Promise<void>;
  confirm?: string;
  label?: string;
  /** Icon-only compact variant for table rows. */
  compact?: boolean;
  className?: string;
}

function Inner({ label, compact }: { label: string; compact: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      className={cn(
        'sd-press inline-flex items-center gap-1.5 rounded-sd-chrome border border-sd-line bg-sd-box text-sd-ink-faint',
        'hover:border-[color-mix(in_srgb,var(--ink-coral)_40%,var(--sd-line))] hover:bg-[color-mix(in_srgb,var(--ink-coral)_12%,var(--sd-box))] hover:text-[var(--ink-coral)]',
        'disabled:opacity-50',
        compact ? 'p-1.5' : 'px-3 py-1.5 text-tiny font-semibold uppercase tracking-wider',
      )}
    >
      <TrashGlyph width={14} height={14} />
      {compact ? null : <span>{pending ? 'Deleting…' : label}</span>}
    </button>
  );
}

export function DeleteButton({
  action,
  confirm = 'Delete this item? This cannot be undone.',
  label = 'Delete',
  compact = false,
  className,
}: DeleteButtonProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={action}
      className={cn('inline-block', className)}
      onSubmit={(e) => {
        if (!window.confirm(confirm)) {
          e.preventDefault();
        }
      }}
    >
      <Inner label={label} compact={compact} />
    </form>
  );
}
