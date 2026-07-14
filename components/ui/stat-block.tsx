import type { ReactNode } from "react";
import { cn } from "@/lib/design/cn";

/**
 * StatBlock — the selective-mono signature. A tiny uppercase tracked mono label
 * over a big bold numeral, with an optional dull caption (brief §7 stat strip).
 * No card chrome by default: stat strips sit directly on canvas over the glow.
 */
export interface StatBlockProps {
  label: string;
  /** The numeral. Renders "--" for empty values, per the brief. */
  value?: ReactNode;
  caption?: string;
  /** Optional leading dimensional icon (28-32px). */
  icon?: ReactNode;
  className?: string;
}

export function StatBlock({
  label,
  value,
  caption,
  icon,
  className,
}: StatBlockProps) {
  const empty = value === undefined || value === null || value === "";

  return (
    <div className={cn("flex items-start gap-3", className)}>
      {icon ? <div className="mt-0.5 shrink-0">{icon}</div> : null}
      <div className="flex flex-col gap-1">
        <span className="sd-stat-label">{label}</span>
        <span
          className={cn(
            "sd-numeral text-3xl font-bold leading-none tracking-tight",
            empty ? "text-sd-ink-faint" : "text-sd-ink",
          )}
        >
          {empty ? "--" : value}
        </span>
        {caption ? (
          <span className="text-xs text-sd-ink-dull">{caption}</span>
        ) : null}
      </div>
    </div>
  );
}
