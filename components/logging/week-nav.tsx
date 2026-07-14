import Link from 'next/link';
import { Panel } from '@/components/ui/panel';
import { cn } from '@/lib/design/cn';

/** Prev/this-week/next navigation shared by /admin/log and /admin/health. */
export interface WeekNavProps {
  basePath: string;
  weekIndex: number;
  weekCount: number;
  phaseLabel?: string | null;
}

const BTN = 'sd-btn sd-btn-quiet px-3 py-1.5 text-tiny';

export function WeekNav({ basePath, weekIndex, weekCount, phaseLabel }: WeekNavProps) {
  const prevHref = weekIndex > 1 ? `${basePath}?week=${weekIndex - 1}` : null;
  const nextHref = weekIndex < weekCount ? `${basePath}?week=${weekIndex + 1}` : null;

  return (
    <Panel className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="flex flex-col">
        <span className="sd-stat-label">
          Week {weekIndex} of {weekCount}
        </span>
        {phaseLabel ? <span className="text-xs text-sd-ink-faint">{phaseLabel}</span> : null}
      </div>
      <div className="flex items-center gap-2">
        {prevHref ? (
          <Link href={prevHref} className={BTN}>
            ← Prev
          </Link>
        ) : (
          <span className={cn(BTN, 'cursor-not-allowed opacity-40')}>← Prev</span>
        )}
        <Link href={basePath} className={BTN}>
          This week
        </Link>
        {nextHref ? (
          <Link href={nextHref} className={BTN}>
            Next →
          </Link>
        ) : (
          <span className={cn(BTN, 'cursor-not-allowed opacity-40')}>Next →</span>
        )}
      </div>
    </Panel>
  );
}
