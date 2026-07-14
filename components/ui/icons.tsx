import type { ReactNode, SVGProps } from "react";
import { cn } from "@/lib/design/cn";

/**
 * Dimensional icons (brief §7): a cool indigo gradient backplate carrying a
 * token-driven drop shadow, with a monochrome line glyph on top. Accent cyan is
 * NEVER an icon body fill; the glyph reads at 24px. Use `size` for the backplate
 * edge (28-32px on stat strips, 24px in nav rows).
 */
export interface DimensionalIconProps {
  children: ReactNode;
  size?: number;
  className?: string;
}

export function DimensionalIcon({
  children,
  size = 30,
  className,
}: DimensionalIconProps) {
  return (
    <span
      className={cn("grid shrink-0 place-items-center rounded-lg", className)}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(160deg, var(--sd-frame), var(--sd-darker-box))",
        border: "1px solid var(--sd-line)",
        boxShadow: "var(--sd-bevel), 0 2px 6px var(--sd-icon-shadow)",
        color: "var(--sd-ink-dull)",
      }}
    >
      {children}
    </span>
  );
}

const glyph: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function DumbbellGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <path d="M6.5 6.5v11M4 8.5v7M17.5 6.5v11M20 8.5v7M6.5 12h11" />
    </svg>
  );
}

export function CalendarGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    </svg>
  );
}

export function FlameGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <path d="M12 3.5c1.8 2.6 4.7 4.4 4.7 8a4.7 4.7 0 1 1-9.4 0c0-1.4.6-2.5 1.4-3.4.4 1 1.1 1.6 2 1.8-.6-2.6.4-5 1.3-6.4Z" />
    </svg>
  );
}

export function TimerGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <circle cx="12" cy="13.5" r="7" />
      <path d="M12 13.5V10M9.5 2.5h5M12 6.5v0" />
    </svg>
  );
}

export function TrophyGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4ZM7 6H4.5v1A3.5 3.5 0 0 0 7 10.3M17 6h2.5v1A3.5 3.5 0 0 1 17 10.3M9.5 13.5 9 18h6l-.5-4.5M8 20.5h8" />
    </svg>
  );
}

export function ChartGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <path d="M4 4v15.5a.5.5 0 0 0 .5.5H20M8 16.5v-4M12 16.5v-8M16 16.5v-5.5" />
    </svg>
  );
}

export function HeartGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <path d="M12 20s-7-4.5-7-9.5A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7 3.5c0 5-7 9.5-7 9.5Z" />
      <path d="M4 12.5h3l1.5-2.5 2 5 1.5-3H16" />
    </svg>
  );
}
