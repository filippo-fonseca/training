import type { SVGProps } from 'react';

// Monochrome line glyphs for the admin sidebar + actions, matching the 24-grid
// stroke style of components/ui/icons.tsx. Color comes from currentColor.
const glyph: SVGProps<SVGSVGElement> = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export function PlanGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M4 9h16M9 9v11M9 13h4M9 16.5h6" />
    </svg>
  );
}

export function LogGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <path d="M5 4h14v16H5zM8.5 8h7M8.5 12h7M8.5 16h4" />
    </svg>
  );
}

export function HeartPulseGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <path d="M12 20s-7-4.5-7-9.5A3.7 3.7 0 0 1 12 7a3.7 3.7 0 0 1 7 3.5c0 5-7 9.5-7 9.5Z" />
      <path d="M4.5 12.5h3l1.5-2.5 2 5 1.5-3H16" />
    </svg>
  );
}

export function ActivityGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <path d="M3 12h4l2.5-7 5 14 2.5-7H21" />
    </svg>
  );
}

export function ImportGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <path d="M12 3v11M8 10l4 4 4-4M5 20h14" />
    </svg>
  );
}

export function GearGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v2.6M12 18.9v2.6M21.5 12h-2.6M5.1 12H2.5M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8M18.7 18.7l-1.8-1.8M7.1 7.1 5.3 5.3" />
    </svg>
  );
}

export function PlusGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function TrashGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </svg>
  );
}

export function ChevronRightGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ArrowLeftGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...glyph} {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}
