import Link from "next/link";
import type { ReactNode } from "react";
import type { OverlayKey } from "../data";

/** Stable dialog-title id per overlay key; the dialog's aria-labelledby uses it. */
export function overlayTitleId(key: OverlayKey): string {
  return `overlay-title-${key}`;
}

/** The header every overlay wears: mono eyebrow + a Grotesk title (the label). */
export function OverlayHeader({
  eyebrow,
  title,
  titleId,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  titleId: string;
  subtitle?: string;
}) {
  return (
    <header className="flex flex-col gap-1 pr-10">
      <span className="sd-stat-label">{eyebrow}</span>
      <h2
        id={titleId}
        className="font-sans text-2xl font-bold tracking-tight text-sd-ink"
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="max-w-prose text-sm text-sd-ink-dull">{subtitle}</p>
      ) : null}
    </header>
  );
}

const FOOTER_LINKS: Array<[string, string]> = [
  ["/calendar", "Calendar"],
  ["/progress", "Progress"],
  ["/stats", "Stats"],
  ["/milestones", "Milestones"],
];

/** Footer links keeping the underlying routes reachable from every overlay. */
export function OverlayFooter({ extra }: { extra?: ReactNode }) {
  return (
    <footer className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-sd-line pt-4">
      {extra}
      <nav className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {FOOTER_LINKS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="text-xs text-sd-ink-faint transition-colors hover:text-sd-ink-dull"
          >
            {label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}

/** A titled block inside an overlay. */
export function OverlaySection({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      {title ? <span className="sd-stat-label">{title}</span> : null}
      {children}
    </section>
  );
}
