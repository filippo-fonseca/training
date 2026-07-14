import { cn } from "@/lib/design/cn";

/**
 * The Strava verification badge: a Strava-orange dot + "VERIFIED" (or a custom
 * label) in mono small-caps. The orange appears here and on outbound-link hover
 * only, per the design constitution.
 */
export function VerifiedBadge({
  label = "Verified",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-sd-line bg-sd-darker-box px-2 py-0.5",
        className,
      )}
    >
      <span
        aria-hidden
        className="size-1.5 rounded-full"
        style={{ background: "var(--strava)" }}
      />
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-sd-ink-dull">
        {label}
      </span>
    </span>
  );
}
