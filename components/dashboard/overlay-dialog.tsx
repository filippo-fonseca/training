"use client";

/**
 * The accessible expand overlay: role=dialog + aria-modal, a focus trap, Esc
 * and backdrop-click close, and scrolling allowed INSIDE the panel only. The
 * panel morphs open from the clicked widget's on-screen rect (a transform-origin
 * approximation per the design constitution), with a backdrop fade; every bit of
 * motion is gated behind prefers-reduced-motion, which swaps instantly.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";

export interface OriginRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface OverlayDialogProps {
  open: boolean;
  onClose: () => void;
  /** id of the element that labels the dialog (an <h2> inside `children`). */
  labelledById: string;
  /** The on-screen rect of the widget the overlay grew from, for the morph. */
  origin?: OriginRect | null;
  children: ReactNode;
}

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function OverlayDialog({
  open,
  onClose,
  labelledById,
  origin,
  children,
}: OverlayDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<Element | null>(null);

  // Remember what had focus so we can restore it on close (the widget button).
  useEffect(() => {
    if (open) restoreFocusRef.current = document.activeElement;
  }, [open]);

  // Set the transform-origin to the widget's on-screen centre before paint so
  // the panel appears to grow out of it.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    if (origin) {
      const ox = origin.x + origin.width / 2;
      const oy = origin.y + origin.height / 2;
      panel.style.transformOrigin = `${ox}px ${oy}px`;
    } else {
      panel.style.transformOrigin = "center center";
    }
  }, [open, origin]);

  // Move focus into the panel on open.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const first = panel.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel).focus();
  }, [open]);

  // Restore focus to the opener when the dialog closes.
  useEffect(() => {
    if (open) return;
    const el = restoreFocusRef.current;
    if (el instanceof HTMLElement) el.focus();
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const items = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (items.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }
      const firstEl = items[0];
      const lastEl = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      className="sd-overlay-root fixed inset-0 z-50 flex items-center justify-center p-4 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] sm:p-6 sm:pt-[max(1.5rem,env(safe-area-inset-top,0px))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))]"
      onKeyDown={onKeyDown}
    >
      {/* Backdrop: click to close. */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="sd-overlay-backdrop absolute inset-0 cursor-default border-0"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledById}
        tabIndex={-1}
        className="sd-overlay-panel sd-panel relative flex max-h-[min(84dvh,84vh)] w-[min(920px,92vw)] flex-col overflow-hidden outline-none"
      >
        {/* Close chrome in normal flow (not absolute) so iOS hit-testing stays
            reliable: absolute + backdrop-filter buttons near the status bar /
            Dynamic Island often swallow taps on Safari. 44px target per HIG. */}
        <div className="flex shrink-0 items-center justify-end px-3 pt-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close overlay"
            className="sd-press grid size-11 touch-manipulation place-items-center rounded-full border border-sd-line bg-sd-box text-sd-ink-dull hover:border-sd-selected hover:text-sd-ink"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Internal scroll only. */}
        <div className="sd-overlay-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-2 sm:px-7 sm:pb-7 sm:pt-3">
          {children}
        </div>
      </div>
    </div>
  );
}
