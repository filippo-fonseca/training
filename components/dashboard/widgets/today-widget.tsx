"use client";

import type { SessionCategory } from "@/lib/types/database";
import { categoryMeta } from "@/components/calendar/status";
import type { TodayData, OverlayKey } from "../data";
import type { OriginRect } from "../overlay-dialog";
import { WidgetCard, WidgetLabel } from "../widget-card";
import { VerifiedBadge } from "../verified-badge";

interface Props {
  data: TodayData;
  onOpen: (key: OverlayKey, origin: OriginRect) => void;
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-sd-line bg-sd-darker-box px-2 py-0.5 font-mono text-[10px] tracking-wide text-sd-ink-dull sd-numeral">
      {children}
    </span>
  );
}

/**
 * Today's session: date label, title, a category hue chip, target chips
 * (distance / pace / RPE), and a VERIFIED badge when >= 1 activity is linked.
 * A no-plan day with an off-plan run reads "Nothing planned" + the off-plan
 * run's verified evidence chip. Expands to the day-detail overlay.
 */
export function TodayWidget({ data, onOpen }: Props) {
  const {
    dateShort,
    weekday,
    sessionTitle,
    category,
    isRest,
    nothingPlanned,
    distanceKm,
    paceText,
    rpeText,
    evidence,
    offPlanRun,
  } = data;

  const cat = categoryMeta((category as SessionCategory | null) ?? null);
  const verified = evidence.length > 0;
  const firstRun = evidence[0];

  return (
    <WidgetCard
      overlayKey="today"
      label="today's session"
      onOpen={onOpen}
      bodyClassName="p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <WidgetLabel>
          Today{weekday ? ` · ${weekday}` : ""}
          {dateShort ? ` · ${dateShort}` : ""}
        </WidgetLabel>
        {verified ? (
          <VerifiedBadge label={offPlanRun ? "Off-plan · verified" : "Verified"} />
        ) : null}
      </div>

      <div className="mt-1 flex min-h-0 flex-1 flex-col justify-center gap-2">
        <h2 className="line-clamp-2 font-sans text-xl font-semibold leading-tight tracking-tight text-sd-ink sm:text-2xl">
          {sessionTitle}
        </h2>

        <div className="flex flex-wrap items-center gap-1.5">
          {!nothingPlanned && category ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-tiny text-sd-ink-dull"
              style={{
                borderColor: cat.hueVar ? `var(${cat.hueVar})` : "var(--sd-line)",
                background: cat.hueVar
                  ? `color-mix(in srgb, var(${cat.hueVar}) 15%, transparent)`
                  : "var(--sd-darker-box)",
              }}
            >
              <span
                aria-hidden
                className="size-1.5 rounded-full"
                style={{ background: cat.hueVar ? `var(${cat.hueVar})` : "var(--sd-ink-faint)" }}
              />
              {cat.label}
            </span>
          ) : (
            <span className="text-tiny text-sd-ink-faint">
              {isRest ? "Recovery / rest" : "No session prescribed"}
            </span>
          )}
        </div>

        {/* Target chips (planned) or the off-plan run's logged evidence. */}
        <div className="flex flex-wrap items-center gap-1.5">
          {offPlanRun && firstRun ? (
            <Chip>
              {firstRun.distanceM != null
                ? `${(firstRun.distanceM / 1000).toFixed(1)} km logged`
                : "Run logged"}
            </Chip>
          ) : (
            <>
              {distanceKm != null && distanceKm > 0 ? <Chip>{distanceKm} km</Chip> : null}
              {paceText ? <Chip>{paceText}</Chip> : null}
              {rpeText ? <Chip>RPE {rpeText.replace(/\/10$/, "")}</Chip> : null}
            </>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}
