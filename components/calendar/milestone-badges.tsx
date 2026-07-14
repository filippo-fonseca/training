import { Panel } from '@/components/ui/panel';
import { TrophyGlyph } from '@/components/ui/icons';
import type { Milestone, MilestoneType } from '@/lib/types/database';
import { accentChip, gateHue, chip } from './status';

const TYPE_LABEL: Record<MilestoneType, string> = {
  decision_checkpoint: 'Decision checkpoint',
  gated_long_run: 'Gated long run',
  key_workout: 'Key workout',
  taper_start: 'Taper start',
  race: 'Race day',
  cutback_week: 'Cutback week',
  post_race: 'Post-race',
};

/**
 * Milestone / checkpoint badges for a day. Gated long runs surface their
 * green / yellow / red criteria so the conditionality is unmistakable; the race
 * gets the accent-chrome treatment with the trophy.
 */
export function MilestoneBadges({ milestones }: { milestones: Milestone[] }) {
  if (milestones.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      {milestones.map((m) => {
        const isRace = m.type === 'race';
        const criteria = [
          { gate: 'green' as const, text: m.green_criteria },
          { gate: 'yellow' as const, text: m.yellow_criteria },
          { gate: 'red' as const, text: m.red_criteria },
        ].filter((c) => c.text);

        return (
          <Panel
            key={m.id}
            padded
            className="flex flex-col gap-3"
            style={
              isRace
                ? { boxShadow: 'var(--sd-bevel), 0 0 28px var(--hud-cyan-glow)' }
                : undefined
            }
          >
            <div className="flex items-center gap-2.5">
              <span
                className="inline-flex items-center gap-1.5 rounded-sd-chrome border px-2 py-0.5 text-tiny font-semibold uppercase tracking-[0.1em]"
                style={accentChip}
              >
                {isRace ? <TrophyGlyph width={12} height={12} /> : null}
                {TYPE_LABEL[m.type]}
              </span>
              <span className="text-sm font-medium text-sd-ink">{m.title}</span>
            </div>

            {m.description ? (
              <p className="text-sm leading-relaxed text-sd-ink-dull">{m.description}</p>
            ) : null}

            {criteria.length > 0 ? (
              <div className="grid gap-2 sm:grid-cols-3">
                {criteria.map((c) => {
                  const hue = gateHue(c.gate);
                  return (
                    <div key={c.gate} className="flex flex-col gap-1 rounded-sd-tile border p-2.5" style={chip(hue)}>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold capitalize text-sd-ink">
                        <span aria-hidden className="size-2 rounded-full" style={{ background: `var(${hue})` }} />
                        {c.gate}
                      </span>
                      <p className="text-xs leading-relaxed text-sd-ink-dull">{c.text}</p>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </Panel>
        );
      })}
    </div>
  );
}
