import type { ReactNode } from "react";
import { cn } from "@/lib/design/cn";

/**
 * ChartFrame — shared chrome for the hand-built SVG charts. A titled header
 * (mono stat label + optional legend) over a responsive SVG that scales to the
 * container width while keeping its viewBox aspect. Charts pass their own
 * <defs>/geometry as children; the frame owns only the outer layout and the
 * y-axis gridline + tick rendering so the two charts stay visually consistent.
 *
 * All colors come from tokens; the SVG carries no chart library. Entrance
 * animation is CSS-only (.sd-enter) and killed under reduced motion.
 */

export interface ChartFrameProps {
  label: string;
  caption?: string;
  legend?: ReactNode;
  /** SVG viewBox width/height in abstract chart units. */
  width: number;
  height: number;
  children: ReactNode;
  className?: string;
  /** Accessible description of the chart for screen readers. */
  desc: string;
  titleId: string;
}

export function ChartFrame({
  label,
  caption,
  legend,
  width,
  height,
  children,
  className,
  desc,
  titleId,
}: ChartFrameProps) {
  const descId = `${titleId}-desc`;
  return (
    <figure className={cn("flex flex-col gap-4", className)}>
      <figcaption className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="sd-stat-label" id={titleId}>
            {label}
          </span>
          {caption ? (
            <span className="text-sm text-sd-ink-dull">{caption}</span>
          ) : null}
        </div>
        {legend ? <div className="flex flex-wrap items-center gap-3">{legend}</div> : null}
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-auto w-full overflow-visible"
      >
        <desc id={descId}>{desc}</desc>
        {children}
      </svg>
    </figure>
  );
}

/** A small legend swatch: a colored token chip + dull label. */
export function LegendSwatch({
  label,
  variant,
}: {
  label: string;
  variant: "actual" | "planned" | "projected";
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden
        className={cn(
          "inline-block h-2.5 w-3.5 rounded-[2px]",
          variant === "projected" && "sd-hatch",
        )}
        style={
          variant === "actual"
            ? { background: "var(--sd-accent)" }
            : variant === "planned"
              ? { background: "var(--sd-input)", border: "1px solid var(--sd-line)" }
              : { border: "1px solid var(--sd-line)" }
        }
      />
      <span className="text-tiny text-sd-ink-dull" style={{ fontSize: "10.4px" }}>
        {label}
      </span>
    </span>
  );
}
