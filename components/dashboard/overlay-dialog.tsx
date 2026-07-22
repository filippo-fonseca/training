"use client";

/**
 * The accessible expand overlay: role=dialog + aria-modal, a focus trap, Esc
 * and backdrop-click close, and scrolling allowed INSIDE the panel only. On
 * phones it presents as a bottom sheet (grabber + swipe-down dismiss); from
 * sm up it stays a centered Raycast-style dialog that morphs from the clicked
 * widget rect. Every bit of motion is gated behind prefers-reduced-motion.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type PointerEvent as ReactPointerEvent,
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

/** Dismiss when the sheet has been dragged this far (px). */
const SHEET_DISMISS_PX = 96;

function isPhoneSheet(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 639px)").matches;
}

export function OverlayDialog({
  open,
  onClose,
  labelledById,
  origin,
  children,
}: OverlayDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<Element | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragY = useRef(0);

  // Remember what had focus so we can restore it on close (the widget button).
  useEffect(() => {
    if (open) restoreFocusRef.current = document.activeElement;
  }, [open]);

  // Set the transform-origin to the widget's on-screen centre before paint so
  // the panel appears to grow out of it (desktop morph only).
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    if (isPhoneSheet()) {
      panel.style.transformOrigin = "center bottom";
      return;
    }
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

  // Reset any in-progress sheet drag when the dialog opens/closes.
  useEffect(() => {
    dragStartY.current = null;
    dragY.current = 0;
    const panel = panelRef.current;
    if (panel) {
      panel.style.transform = "";
      panel.style.transition = "";
    }
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

  const onSheetPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPhoneSheet()) return;
    // Only primary touch/mouse; ignore right-click etc.
    if (e.button !== 0) return;
    dragStartY.current = e.clientY;
    dragY.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
    const panel = panelRef.current;
    if (panel) panel.style.transition = "none";
  }, []);

  const onSheetPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStartY.current == null) return;
    const dy = Math.max(0, e.clientY - dragStartY.current);
    dragY.current = dy;
    const panel = panelRef.current;
    if (panel) panel.style.transform = `translateY(${dy}px)`;
  }, []);

  const onSheetPointerUp = useCallback(() => {
    if (dragStartY.current == null) return;
    const dy = dragY.current;
    dragStartY.current = null;
    const panel = panelRef.current;
    if (!panel) {
      dragY.current = 0;
      return;
    }
    if (dy >= SHEET_DISMISS_PX) {
      panel.style.transition = "transform 160ms var(--ease-out-quart, ease-out)";
      panel.style.transform = "translateY(110%)";
      window.setTimeout(() => onClose(), 150);
      return;
    }
    panel.style.transition = "transform 200ms var(--ease-out-quart, ease-out)";
    panel.style.transform = "translateY(0)";
    dragY.current = 0;
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="sd-overlay-root fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6 sm:pt-[max(1.5rem,env(safe-area-inset-top,0px))] sm:pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pl-[max(1.5rem,env(safe-area-inset-left,0px))] sm:pr-[max(1.5rem,env(safe-area-inset-right,0px))]"
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
        className="sd-overlay-panel sd-overlay-panel-sheet sd-panel relative flex max-h-[min(92dvh,92vh)] w-full flex-col overflow-hidden rounded-b-none rounded-t-sd-card outline-none sm:max-h-[min(84dvh,84vh)] sm:w-[min(920px,92vw)] sm:rounded-sd-card"
      >
        {/* Sheet chrome: grabber (phone) + close. Drag-to-dismiss binds here so
            it never fights the internal scroll region. */}
        <div
          className="flex shrink-0 touch-none flex-col"
          onPointerDown={onSheetPointerDown}
          onPointerMove={onSheetPointerMove}
          onPointerUp={onSheetPointerUp}
          onPointerCancel={onSheetPointerUp}
        >
          <div className="flex justify-center pt-2 sm:hidden" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-sd-line" />
          </div>
          <div className="flex items-center justify-end px-3 pb-1 pt-2 sm:pt-3">
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
        </div>
        {/* Internal scroll only. */}
        <div className="sd-overlay-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-1 sm:px-7 sm:pb-7 sm:pt-3">
          {children}
        </div>
      </div>
    </div>
  );
}
