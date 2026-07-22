import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/design/cn';
import { ArrowLeftGlyph, ChevronRightGlyph } from '@/components/admin/icons';

export interface Crumb {
  label: string;
  href?: string;
}

/** Admin page header: optional breadcrumbs, title, description, and right-aligned actions. */
export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, crumbs, actions, className }: PageHeaderProps) {
  return (
    <header className={cn('mb-6 flex flex-col gap-3', className)}>
      {crumbs && crumbs.length > 0 ? (
        <nav className="flex items-center gap-1.5 text-tiny text-sd-ink-faint">
          {crumbs.map((c, i) => (
            <span key={`${c.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 ? <ChevronRightGlyph width={12} height={12} className="opacity-60" /> : null}
              {c.href ? (
                <Link href={c.href} className="transition-colors hover:text-sd-ink-dull">
                  {c.label}
                </Link>
              ) : (
                <span className="text-sd-ink-dull">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-sd-ink">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-sd-ink-dull">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/** A quiet back-link row, e.g. "Back to weeks". */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-xs text-sd-ink-faint transition-colors hover:text-sd-ink-dull"
    >
      <ArrowLeftGlyph width={14} height={14} />
      {children}
    </Link>
  );
}
