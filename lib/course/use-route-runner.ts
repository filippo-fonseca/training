"use client";

/**
 * Drive a marker along a polyline at CONSTANT SPEED BY DISTANCE, looping forever.
 *
 * Given a list of 2D points (in whatever coordinate space the caller draws in:
 * SVG viewBox units for the self-hosted trace, nominal static-map pixels for the
 * Google render) and a lap duration, this calls `apply(x, y)` every animation
 * frame with the interpolated position. Positioning is the caller's job and must
 * be transform-only (no layout thrash): the hook never touches the DOM itself.
 *
 * Guarantees the brief requires:
 *  - constant speed BY DISTANCE (cumulative segment lengths), not by point index;
 *  - one requestAnimationFrame loop, canceled on unmount;
 *  - paused while the tab is hidden (visibilitychange), resumed without a jump;
 *  - prefers-reduced-motion: no rAF at all, the marker is parked at points[0].
 */
import { useEffect, useRef } from "react";

export interface Vec2 {
  x: number;
  y: number;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useRouteRunner(
  points: readonly Vec2[],
  lapMs: number,
  apply: (x: number, y: number) => void,
): void {
  // Keep the latest apply callback without re-running the effect every render.
  const applyRef = useRef(apply);
  applyRef.current = apply;

  useEffect(() => {
    if (points.length === 0) return;
    const start = points[0];

    // Cumulative distance along the polyline, in the caller's own units.
    const cum: number[] = [0];
    for (let i = 1; i < points.length; i++) {
      cum.push(cum[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
    }
    const total = cum[cum.length - 1];

    const pointAt = (dist: number): Vec2 => {
      if (total === 0) return start;
      let d = dist % total;
      if (d < 0) d += total;
      for (let i = 1; i < cum.length; i++) {
        if (cum[i] >= d) {
          const seg = cum[i] - cum[i - 1] || 1;
          const t = (d - cum[i - 1]) / seg;
          return {
            x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
            y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
          };
        }
      }
      return points[points.length - 1];
    };

    // Always paint the resting position once, so SSR / first paint / reduced
    // motion all show the avatar parked at the START / FINISH point.
    applyRef.current(start.x, start.y);

    if (prefersReducedMotion() || total === 0 || lapMs <= 0) return;

    let raf = 0;
    let lastTs = 0;
    let elapsed = 0; // pause-aware animation time in ms

    const frame = (ts: number) => {
      if (lastTs === 0) lastTs = ts;
      elapsed += ts - lastTs;
      lastTs = ts;
      const p = pointAt((elapsed / lapMs) * total);
      applyRef.current(p.x, p.y);
      raf = requestAnimationFrame(frame);
    };

    const startLoop = () => {
      lastTs = 0; // reset so a resume never fast-forwards
      raf = requestAnimationFrame(frame);
    };
    const stopLoop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const onVisibility = () => {
      if (document.hidden) stopLoop();
      else if (raf === 0) startLoop();
    };

    startLoop();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stopLoop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [points, lapMs]);
}

/** One lap of the loop, in milliseconds. 40s sits mid-range of the 35-45s spec. */
export const LAP_MS = 40_000;
