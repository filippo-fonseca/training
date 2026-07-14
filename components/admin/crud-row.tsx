import type { ReactNode } from 'react';
import { DeleteButton } from '@/components/admin/delete-button';
import { ChevronRightGlyph } from '@/components/admin/icons';

/**
 * One editable record in a CRUD list: an always-visible summary header (title,
 * subtitle, badges) with a compact confirm-delete, and a native <details> "Edit"
 * disclosure holding the edit form. Server component; the delete/form actions are
 * bound server actions passed in by the page.
 */
export interface CrudRowProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ReactNode;
  deleteAction: (formData: FormData) => void | Promise<void>;
  deleteConfirm: string;
  deleteLabel?: string;
  children: ReactNode;
}

export function CrudRow({
  title,
  subtitle,
  badges,
  deleteAction,
  deleteConfirm,
  deleteLabel = 'Delete',
  children,
}: CrudRowProps) {
  return (
    <div className="sd-panel sd-card-hover overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-sd-ink">{title}</div>
          {subtitle ? <div className="truncate text-xs text-sd-ink-faint">{subtitle}</div> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badges}
          <DeleteButton action={deleteAction} confirm={deleteConfirm} label={deleteLabel} compact />
        </div>
      </div>
      <details className="group border-t border-sd-divider">
        <summary className="flex list-none items-center gap-1.5 px-4 py-2 text-tiny font-semibold uppercase tracking-wider text-sd-ink-faint transition-colors hover:bg-sd-hover/50 hover:text-sd-ink-dull [&::-webkit-details-marker]:hidden">
          <ChevronRightGlyph
            width={12}
            height={12}
            className="shrink-0 transition-transform duration-150 group-open:rotate-90"
          />
          Edit
        </summary>
        <div className="px-4 pb-4 pt-1">{children}</div>
      </details>
    </div>
  );
}
