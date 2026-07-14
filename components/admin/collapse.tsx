import type { ReactNode } from 'react';
import { cn } from '@/lib/design/cn';
import { ChevronRightGlyph } from '@/components/admin/icons';

/**
 * Native <details> disclosure in the panel grammar, used for inline add/edit
 * forms in the CRUD tables. No client JS: the marker rotates via [open].
 */
export interface CollapseProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  tone?: 'default' | 'accent';
  className?: string;
}

export function Collapse({ summary, children, defaultOpen = false, tone = 'default', className }: CollapseProps) {
  return (
    <details open={defaultOpen} className={cn('sd-panel group overflow-hidden p-0', className)}>
      <summary
        className={cn(
          'flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium',
          'transition-colors hover:bg-sd-hover [&::-webkit-details-marker]:hidden',
          tone === 'accent' ? 'text-sd-accent-faint' : 'text-sd-ink',
        )}
      >
        <ChevronRightGlyph
          width={14}
          height={14}
          className="shrink-0 text-sd-ink-faint transition-transform duration-150 group-open:rotate-90"
        />
        {summary}
      </summary>
      <div className="border-t border-sd-divider px-4 py-4">{children}</div>
    </details>
  );
}
