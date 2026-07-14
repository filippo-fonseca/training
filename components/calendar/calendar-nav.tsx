import Link from 'next/link';
import { cn } from '@/lib/design/cn';

interface CalendarNavProps {
  title: string;
  subtitle?: string;
  view: 'month' | 'week';
  monthHref: string;
  weekHref: string;
  prevHref: string | null;
  nextHref: string | null;
  todayHref: string;
}

/**
 * Calendar header: the current-range title, a month/week segmented toggle, and
 * prev / today / next navigation. All navigation is plain links (no client JS),
 * keeping the calendar a server component.
 */
export function CalendarNav({
  title,
  subtitle,
  view,
  monthHref,
  weekHref,
  prevHref,
  nextHref,
  todayHref,
}: CalendarNavProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col">
        <h1 className="text-xl font-semibold tracking-tight text-sd-ink">{title}</h1>
        {subtitle ? <span className="text-xs text-sd-ink-faint">{subtitle}</span> : null}
      </div>

      <div className="flex items-center gap-2">
        {/* Month / Week toggle */}
        <div className="sd-pill-blur inline-flex items-center gap-0.5 rounded-full p-0.5">
          <ToggleLink href={monthHref} active={view === 'month'}>
            Month
          </ToggleLink>
          <ToggleLink href={weekHref} active={view === 'week'}>
            Week
          </ToggleLink>
        </div>

        {/* Prev / Today / Next */}
        <div className="inline-flex items-center gap-1">
          <ArrowLink href={prevHref} label="Previous" dir="prev" />
          <Link
            href={todayHref}
            className="rounded-full border border-sd-line bg-sd-box px-3 py-1 text-xs font-medium text-sd-ink-dull transition-colors duration-150 hover:bg-sd-hover hover:text-sd-ink"
          >
            Today
          </Link>
          <ArrowLink href={nextHref} label="Next" dir="next" />
        </div>
      </div>
    </div>
  );
}

function ToggleLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150',
        active ? 'bg-sd-selected text-sd-ink' : 'text-sd-ink-dull hover:text-sd-ink',
      )}
    >
      {children}
    </Link>
  );
}

function ArrowLink({
  href,
  label,
  dir,
}: {
  href: string | null;
  label: string;
  dir: 'prev' | 'next';
}) {
  const glyph = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'prev' ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );
  const base =
    'grid size-7 place-items-center rounded-full border border-sd-line bg-sd-box transition-colors duration-150';
  if (!href) {
    return (
      <span aria-disabled className={cn(base, 'cursor-not-allowed text-sd-ink-faint/40')}>
        {glyph}
      </span>
    );
  }
  return (
    <Link href={href} aria-label={label} className={cn(base, 'text-sd-ink-dull hover:bg-sd-hover hover:text-sd-ink')}>
      {glyph}
    </Link>
  );
}
