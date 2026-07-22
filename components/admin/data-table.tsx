import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/design/cn';

/**
 * Lightweight admin table on the panel grammar. Headers use the mono stat-label;
 * rows separate with the divider hairline. `href` makes a row a navigable link.
 */
export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string | undefined;
  empty?: ReactNode;
  className?: string;
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  empty,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) {
    return <>{empty}</>;
  }

  return (
    <div className={cn('sd-panel overflow-hidden p-0', className)}>
      <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-sd-divider">
            {columns.map((c) => (
              <th
                key={c.key}
                className={cn('sd-stat-label px-4 py-2.5', alignClass[c.align ?? 'left'], c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <tr
                key={rowKey(row)}
                className="group border-b border-sd-divider transition-colors last:border-b-0 hover:bg-sd-hover"
              >
                {columns.map((c, ci) => {
                  const content = c.render(row);
                  const cellClass = cn(
                    'px-4 py-3 align-middle text-sd-ink-dull',
                    alignClass[c.align ?? 'left'],
                    c.className,
                  );
                  // First cell becomes the row link target when href is given.
                  if (href && ci === 0) {
                    return (
                      <td key={c.key} className={cellClass}>
                        <Link href={href} className="block font-medium text-sd-ink hover:text-sd-accent-faint">
                          {content}
                        </Link>
                      </td>
                    );
                  }
                  return (
                    <td key={c.key} className={cellClass}>
                      {content}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

/** Standard empty-state panel. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="sd-panel flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="text-sm font-medium text-sd-ink">{title}</p>
      {description ? <p className="max-w-md text-sm text-sd-ink-faint">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
