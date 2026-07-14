import { cn } from "@/lib/design/cn";

/**
 * BoldAmbient — the spacedrive.com ambient technique (brief §6), not a plain
 * radial gradient:
 *   1. Giant blurred cyan glow pill (opacity .20, blur 150px) + a tighter hot
 *      core (opacity .15, blur 80px), slowly drifting on transform-only loops
 *      of >=20s.
 *   2. feTurbulence fractal-noise overlay to de-band the glow (mix-blend
 *      overlay, ~35% opacity).
 *   3. At most ONE glossy focal orb per page (opt in with `focal`); everything
 *      else stays matte.
 *
 * Pure CSS/SVG so it needs no client JS. All motion is transform/opacity/filter
 * only and is killed under prefers-reduced-motion (see globals.css).
 */
export interface BoldAmbientProps {
  /** Render the single glossy focal orb behind the page's focal element. */
  focal?: boolean;
  /** Whisper variant: dimmer, static, for the app shell behind non-hero pages. */
  whisper?: boolean;
  /** Fix the layer to the viewport instead of the nearest positioned parent. */
  fixed?: boolean;
  className?: string;
}

export function BoldAmbient({
  focal = false,
  whisper = false,
  fixed = false,
  className,
}: BoldAmbientProps) {
  const glowOpacity = whisper ? 0.1 : 0.2;
  const coreOpacity = whisper ? 0.08 : 0.15;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none inset-0 overflow-hidden",
        fixed ? "fixed" : "absolute",
        className,
      )}
    >
      {/* Wide glow pill */}
      <div
        className={cn(
          "absolute left-1/2 top-1/3 h-[52vh] w-[80vw] -translate-x-1/2 rounded-full",
          !whisper && "sd-drift",
        )}
        style={{
          background: "var(--sd-accent)",
          opacity: glowOpacity,
          filter: "blur(150px)",
        }}
      />
      {/* Tighter hot core */}
      <div
        className={cn(
          "absolute left-1/2 top-[38%] h-[26vh] w-[40vw] -translate-x-1/2 rounded-full",
          !whisper && "sd-drift-alt",
        )}
        style={{
          background: "var(--sd-accent-faint)",
          opacity: coreOpacity,
          filter: "blur(80px)",
        }}
      />

      {/* One glossy focal orb per page */}
      {focal && (
        <div
          className="absolute left-1/2 top-[30%] h-64 w-64 -translate-x-1/2 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--sd-accent-faint) 85%, white) 0%, var(--sd-accent) 35%, var(--sd-accent-deep) 70%, transparent 74%)",
            boxShadow:
              "inset 0 2px 12px rgba(255,255,255,0.35), 0 0 60px color-mix(in srgb, var(--sd-accent) 40%, transparent)",
            opacity: 0.55,
            filter: "blur(2px)",
          }}
        />
      )}

      {/* feTurbulence grain, overlay-blended, to de-band the glow */}
      <svg
        className="absolute inset-0 h-full w-full"
        style={{ opacity: 0.35, mixBlendMode: "overlay" }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id="sd-ambient-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="1.8"
            numOctaves="5"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#sd-ambient-grain)" />
      </svg>
    </div>
  );
}
