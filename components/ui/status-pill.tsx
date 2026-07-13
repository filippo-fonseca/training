import { cn } from "@/lib/design/cn";
import { STATUS_TONES, type StatusTone } from "@/lib/design/tokens";

/**
 * StatusPill — rounded-full, --sd-box fill, 1px hairline, 3x8 padding, a 6px
 * colored dot + 10.4px dull label (brief §7). The functional hue lives ONLY in
 * the dot; the chrome stays monochrome. Idle uses the faint ink, no glow.
 */
export interface StatusPillProps {
  tone: StatusTone;
  /** Override the default tone label (e.g. "3 days left"). */
  label?: string;
  className?: string;
}

export function StatusPill({ tone, label, className }: StatusPillProps) {
  const meta = STATUS_TONES[tone];
  const isAccent = tone === "progress" || tone === "synced";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-sd-line bg-sd-box px-2 py-[3px]",
        className,
      )}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{
          background: `var(${meta.var})`,
          boxShadow: isAccent
            ? "0 0 6px color-mix(in srgb, var(--sd-accent) 60%, transparent)"
            : undefined,
        }}
      />
      <span
        className="text-sd-ink-dull"
        style={{ fontSize: "10.4px", lineHeight: 1.2 }}
      >
        {label ?? meta.label}
      </span>
    </span>
  );
}
