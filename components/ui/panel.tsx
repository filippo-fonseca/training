import type { HTMLAttributes } from "react";
import { cn } from "@/lib/design/cn";

/**
 * Panel — the workhorse surface. The elevation recipe from the brief §4:
 * --sd-box fill, 1px --sd-line hairline, 12px radius, white inset top bevel.
 * Elevation comes from the ladder + hairline + bevel, never heavy shadows.
 */
export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds soft-landing hover (shadow/border only, never scale). */
  interactive?: boolean;
  /** Standard entity-card padding (16-20px). Off for bare/custom layouts. */
  padded?: boolean;
}

export function Panel({
  className,
  interactive = false,
  padded = true,
  children,
  ...props
}: PanelProps) {
  return (
    <div
      className={cn(
        "sd-panel",
        padded && "p-4 sm:p-5",
        interactive && "sd-card-hover",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
