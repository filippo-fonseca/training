"use client";

/**
 * The clickable shell every bento widget shares: a full-cell button with the
 * panel chrome, the card-hover lift idiom, and a cyan focus ring. Clicking it
 * expands the matching overlay, passing the widget's on-screen rect so the
 * dialog can morph out of it. Keeps cursor:pointer (inherited from the global
 * button rule) and an accessible label + aria-haspopup for the dialog it opens.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/design/cn";
import type { OverlayKey } from "./data";
import type { OriginRect } from "./overlay-dialog";

export interface WidgetCardProps {
  overlayKey: OverlayKey;
  /** Accessible label, e.g. "countdown to race". */
  label: string;
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
  className?: string;
  /** Extra classes for the inner content wrapper (padding, layout). */
  bodyClassName?: string;
  children: ReactNode;
}

export function WidgetCard({
  overlayKey,
  label,
  onOpen,
  className,
  bodyClassName,
  children,
}: WidgetCardProps) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-label={`Expand ${label}`}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onOpen(overlayKey, {
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        });
      }}
      className={cn(
        "sd-card-hover sd-panel group relative flex h-full w-full flex-col overflow-hidden text-left",
        className,
      )}
    >
      <div className={cn("flex min-h-0 flex-1 flex-col", bodyClassName)}>
        {children}
      </div>
    </button>
  );
}

/** The tiny mono uppercase label every widget wears in its corner. */
export function WidgetLabel({ children }: { children: ReactNode }) {
  return <span className="sd-stat-label">{children}</span>;
}
