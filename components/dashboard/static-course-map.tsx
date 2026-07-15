"use client";

/**
 * The keyed mini render: a Google Static Maps image of the real course with the
 * author's avatar running the loop on top of it, forever.
 *
 * Because the static image is requested at an EXPLICIT center + zoom
 * (course-map-config), every route point has a known pixel in the nominal
 * 640x360 image (projectedRoutePoints). We draw the image with object-contain so
 * the whole loop stays visible, compute the letterbox rect of the displayed
 * image, and map the projected points into it. The avatar is a single absolutely
 * positioned <img> moved by transform only (no layout thrash), driven by the
 * shared rAF runner (constant speed by distance, ~40s lap, paused when hidden,
 * parked at START / FINISH under prefers-reduced-motion).
 *
 * No extra network request beyond the one static image: the avatar PNG is the
 * same self-hosted asset the SVG mode uses.
 */
import { useCallback, useEffect, useRef } from "react";
import {
  STATIC_MAP_HEIGHT,
  STATIC_MAP_WIDTH,
  type Point,
} from "@/lib/course/mercator";
import { LAP_MS, useRouteRunner, type Vec2 } from "@/lib/course/use-route-runner";

const AVATAR_PX = 22; // rendered avatar diameter

interface Props {
  src: string;
  points: Point[];
  alt: string;
  className?: string;
}

export function StaticCourseMap({ src, points, alt, className }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLImageElement>(null);
  // Current letterbox transform from nominal 640x360 space to displayed pixels.
  const fit = useRef({ scale: 1, offX: 0, offY: 0 });

  const vecs: Vec2[] = points.map((p) => ({ x: p.x, y: p.y }));

  const measure = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    // object-contain: the image scales to the smaller axis, centered.
    const scale = Math.min(w / STATIC_MAP_WIDTH, h / STATIC_MAP_HEIGHT);
    fit.current = {
      scale,
      offX: (w - STATIC_MAP_WIDTH * scale) / 2,
      offY: (h - STATIC_MAP_HEIGHT * scale) / 2,
    };
  }, []);

  useEffect(() => {
    measure();
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure]);

  const apply = useCallback((x: number, y: number) => {
    const el = avatarRef.current;
    if (!el) return;
    const { scale, offX, offY } = fit.current;
    const px = offX + x * scale;
    const py = offY + y * scale;
    // translate to the point, then center the avatar on it (transform only).
    el.style.transform = `translate(${px}px, ${py}px) translate(-50%, -50%)`;
  }, []);

  useRouteRunner(vecs, LAP_MS, apply);

  return (
    <div ref={boxRef} className={`relative ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-full w-full rounded-sd-tile object-contain"
        loading="lazy"
        decoding="async"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={avatarRef}
        src="/filippo-avatar.png"
        alt=""
        aria-hidden="true"
        width={AVATAR_PX}
        height={AVATAR_PX}
        className="pointer-events-none absolute left-0 top-0 rounded-full object-cover shadow-md ring-2 ring-[var(--sd-app)] will-change-transform"
        style={{ width: AVATAR_PX, height: AVATAR_PX, transform: "translate(-9999px,-9999px)" }}
      />
    </div>
  );
}
