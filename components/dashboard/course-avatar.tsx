"use client";

/**
 * The runner: the author's avatar traveling the drawn course loop, forever, in
 * the self-hosted SVG trace. It is an SVG <g> positioned imperatively by
 * useRouteRunner (transform attribute only, no React re-render per frame), so it
 * rides the exact route polyline at constant speed by distance. Under
 * prefers-reduced-motion it simply rests at the START / FINISH point.
 *
 * Rendered inside the parent <svg> (course-svg), in the same viewBox space as
 * the route, so `points` are the already-projected route coordinates.
 */
import { useCallback, useId, useRef } from "react";
import { useRouteRunner, LAP_MS, type Vec2 } from "@/lib/course/use-route-runner";

interface Props {
  points: ReadonlyArray<readonly [number, number]>;
  /** Avatar radius in viewBox units (~9 reads as an 18px dot in the mini card). */
  radius?: number;
}

export function CourseAvatar({ points, radius = 9 }: Props) {
  const gRef = useRef<SVGGElement>(null);
  const clipId = useId().replace(/:/g, "");

  const vecs: Vec2[] = points.map(([x, y]) => ({ x, y }));
  const start = vecs[0] ?? { x: 0, y: 0 };

  const apply = useCallback((x: number, y: number) => {
    gRef.current?.setAttribute("transform", `translate(${x} ${y})`);
  }, []);

  useRouteRunner(vecs, LAP_MS, apply);

  if (vecs.length === 0) return null;

  return (
    <g ref={gRef} transform={`translate(${start.x} ${start.y})`} style={{ pointerEvents: "none" }}>
      <defs>
        <clipPath id={`avatar-${clipId}`}>
          <circle r={radius} />
        </clipPath>
      </defs>
      {/* soft shadow so the runner reads as raised above the map */}
      <circle r={radius + 1.5} fill="#000" opacity={0.28} />
      {/* the photo, clipped to a circle */}
      <image
        href="/filippo-avatar.png"
        x={-radius}
        y={-radius}
        width={radius * 2}
        height={radius * 2}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#avatar-${clipId})`}
      />
      {/* hairline ring */}
      <circle
        r={radius}
        fill="none"
        stroke="var(--sd-app)"
        strokeWidth={1.4}
        opacity={0.95}
      />
      <circle
        r={radius}
        fill="none"
        stroke="var(--sd-accent)"
        strokeWidth={0.8}
        opacity={0.9}
      />
    </g>
  );
}
