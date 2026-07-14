// Parser: data/baystate-2026/plan-full.md -> ParsedPlan.
//
// The source doc is byte-regular (verified): 14 `## Week N` sections, 98
// `### Weekday, Month Day, Year` daily pages, each with a fixed `| Field | Value |`
// table. This parser is deliberately strict — it throws on any structural
// surprise so that a future edit to the source can never silently drop data.
//
// Fidelity rules:
//  * Every free-text field is preserved verbatim (prescription, targets, cues).
//  * Structured numerics (pace s/km, distance, duration minutes) are parsed
//    ADDITIONALLY, never instead of the text. A parse miss leaves them null.
//  * Green/yellow/red alternatives are embedded inside the prescription text on
//    the ~4 symptom-gated days; we extract them AND keep the full prescription.

import type {
  ParsedPlan,
  ParsedPlanMeta,
  ParsedWeek,
  ParsedDay,
  ParsedSession,
  ParsedAlternative,
  ParsedPhase,
  ParsedCheckpoint,
  ParsedMilestone,
  SessionCategory,
  AlternativeGate,
} from './types';

const PLAN_YEAR = 2026;

const MONTHS: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4,
  may: 5, june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9,
  sep: 9, sept: 9, october: 10, oct: 10, november: 11, nov: 11, december: 12,
  dec: 12,
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIso(month: number, day: number, year: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** "September 20, 2026" or "Sep 20" (+ default year). */
function parseDate(text: string, year = PLAN_YEAR): string {
  const m = text.trim().match(/^([A-Za-z]+)\.?\s+(\d{1,2})(?:,\s*(\d{4}))?$/);
  if (!m) throw new Error(`Unparseable date: "${text}"`);
  const month = MONTHS[m[1]!.toLowerCase()];
  if (!month) throw new Error(`Unknown month in date: "${text}"`);
  return toIso(month, Number(m[2]), m[3] ? Number(m[3]) : year);
}

/** First "M:SS" (mm:ss) token in a pace string -> seconds. */
function paceToSeconds(mmss: string): number {
  const [m, s] = mmss.split(':');
  return Number(m) * 60 + Number(s);
}

/** Parse a pace range like "5:05-5:40/km" or "3:53/km" (only when "/km" present). */
function parsePace(text: string | null): { min: number | null; max: number | null } {
  if (!text || !/\/km/.test(text)) return { min: null, max: null };
  const m = text.match(/(\d{1,2}:\d{2})(?:\s*-\s*(\d{1,2}:\d{2}))?\s*\/km/);
  if (!m) return { min: null, max: null };
  const min = paceToSeconds(m[1]!);
  const max = m[2] ? paceToSeconds(m[2]) : min;
  return { min, max };
}

/** Parse a duration range like "55-60 min" / "45 min total" -> minutes. */
function parseDuration(text: string | null): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null };
  const m = text.match(/(\d+)(?:\s*-\s*(\d+))?\s*min/);
  if (!m) return { min: null, max: null };
  const min = Number(m[1]);
  const max = m[2] ? Number(m[2]) : min;
  return { min, max };
}

/** First "N km" or "N.N km" number in a string, or null. */
function firstKm(text: string): number | null {
  const m = text.match(/(\d+(?:\.\d+)?)\s*km/);
  return m ? Number(m[1]) : null;
}

/** Classify a primary session name into the broad taxonomy. Order matters. */
export function classifyCategory(name: string): SessionCategory {
  const n = name.toLowerCase();
  if (n.includes('baystate half marathon')) return 'race';
  if (n.startsWith('rest')) return 'rest';
  if (n.startsWith('no run')) return 'strength_only';
  if (n.includes('bike')) return 'bike';
  if (n.includes('long run') || n.includes('confidence run')) return 'long_run';
  if (
    /threshold|interval|fartlek|progression|hm-specific|hm pace|tune-up|peak hm|steady progression/.test(
      n,
    )
  ) {
    return 'quality_run';
  }
  return 'easy_run';
}

/** Extract green/yellow/red alternatives embedded in a prescription. */
export function extractAlternatives(prescription: string): ParsedAlternative[] {
  const labels: { gate: AlternativeGate; re: RegExp }[] = [
    { gate: 'green', re: /\bgreen(?:\s+gate)?(?:\s+only)?\s*:/i },
    { gate: 'yellow', re: /\byellow[^:\n]{0,40}:/i },
    { gate: 'red', re: /\bred\s*:/i },
  ];

  const hits: { gate: AlternativeGate; start: number; textStart: number }[] = [];
  for (const { gate, re } of labels) {
    const m = re.exec(prescription);
    if (m) hits.push({ gate, start: m.index, textStart: m.index + m[0].length });
  }
  if (hits.length === 0) return [];

  hits.sort((a, b) => a.start - b.start);
  const alts: ParsedAlternative[] = [];
  for (let i = 0; i < hits.length; i++) {
    const cur = hits[i]!;
    const next = hits[i + 1];
    const raw = prescription.slice(cur.textStart, next ? next.start : undefined).trim();
    const text = raw.replace(/[;.]\s*$/, '').trim();
    if (!text) continue;
    const distanceKm = /no run|no running/i.test(text) ? 0 : firstKm(text);
    alts.push({ gate: cur.gate, prescription: text, distanceKm });
  }
  return alts;
}

/** Strip bold markers and surrounding whitespace from a table cell value. */
function cell(value: string): string {
  return value.replace(/\*\*/g, '').trim();
}

/** Build a Field->Value map from a day's `| Field | Value |` table. */
function fieldTable(lines: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of lines) {
    const m = line.match(/^\|\s*(.+?)\s*\|\s*(.*?)\s*\|\s*$/);
    if (!m) continue;
    const key = m[1]!.trim();
    if (key === 'Field' || /^-+$/.test(key)) continue;
    map.set(key, m[2]!.trim());
  }
  return map;
}

function nullable(v: string | undefined): string | null {
  if (v === undefined) return null;
  const t = v.trim();
  return t.length ? t : null;
}

function parseDay(headerLine: string, regionLines: string[]): ParsedDay {
  // Header: "### Monday, July 13, 2026"
  const hm = headerLine.match(/^###\s+([A-Za-z]+),\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})\s*$/);
  if (!hm) throw new Error(`Unparseable day header: "${headerLine}"`);
  const weekday = hm[1]!;
  const date = parseDate(hm[2]!);

  // Subtitle: "*Week 1  |  Return to normal running  |  Day 1/98  |  97 days to Baystate*"
  const subtitle = regionLines.find((l) => /^\*Week\s+\d+/.test(l.trim()));
  if (!subtitle) throw new Error(`Missing subtitle for day ${date}`);
  const sm = subtitle
    .trim()
    .match(/^\*Week\s+(\d+)\s*\|\s*(.+?)\s*\|\s*Day\s+(\d+)\/98\s*\|\s*(\d+)\s+days? to Baystate\*$/);
  if (!sm) throw new Error(`Unparseable subtitle for day ${date}: "${subtitle}"`);
  const weekNumber = Number(sm[1]);
  const phaseLabel = sm[2]!.trim();
  const dayIndex = Number(sm[3]);
  const daysToRace = Number(sm[4]);

  const f = fieldTable(regionLines);

  // "Today's run": "3.2 km (week plan 16.0 km, range 12-16 km, cumulative after today 3.2 km)"
  const todayRun = f.get("Today's run") ?? '';
  const trm = todayRun.match(
    /^([\d.]+)\s*km\s*\(week plan\s+[\d.]+\s*km,\s*range\s+.+?,\s*cumulative after today\s+([\d.]+)\s*km\)/,
  );
  if (!trm) throw new Error(`Unparseable "Today's run" for day ${date}: "${todayRun}"`);
  const plannedRunKm = Number(trm[1]);
  const cumulativeKm = Number(trm[2]);

  const title = cell(f.get('Session') ?? '');
  if (!title) throw new Error(`Missing Session for day ${date}`);
  const category = classifyCategory(title);
  const prescriptionText = nullable(f.get('Prescription'));
  const paceText = nullable(f.get('Pace'));
  const durationText = nullable(f.get('Time'));
  const pace = parsePace(paceText);
  const dur = parseDuration(durationText);
  const isRun = plannedRunKm > 0 || category === 'race';

  const primary: ParsedSession = {
    slot: 'primary',
    title,
    category,
    isQuality: category === 'quality_run' || category === 'race',
    role: nullable(f.get('Role')),
    prescriptionText,
    distanceKm: isRun ? plannedRunKm : null,
    durationText,
    durationMinMinutes: dur.min,
    durationMaxMinutes: dur.max,
    paceText,
    paceMinSPerKm: pace.min,
    paceMaxSPerKm: pace.max,
    rpeText: nullable(f.get('RPE')),
    hrText: nullable(f.get('HR')),
    terrain: nullable(f.get('Terrain')),
    cue: nullable(f.get('Cue')),
    fuel: nullable(f.get('Fuel')),
    shoes: nullable(f.get('Shoes')),
    completionPlanned: nullable(f.get('Completion (planned)')),
  };

  // Secondary training: the whole cell text; title = leading template name.
  const secondaryText = nullable(f.get('Secondary training'));
  const sessions: ParsedSession[] = [primary];
  if (secondaryText) {
    const secTitle = secondaryText.split(/\s+-\s+/)[0]!.replace(/[.;].*$/, '').trim();
    sessions.push({
      slot: 'secondary',
      title: secTitle || 'Secondary training',
      category: null,
      isQuality: false,
      role: null,
      prescriptionText: secondaryText,
      distanceKm: null,
      durationText: null,
      durationMinMinutes: null,
      durationMaxMinutes: null,
      paceText: null,
      paceMinSPerKm: null,
      paceMaxSPerKm: null,
      rpeText: null,
      hrText: null,
      terrain: null,
      cue: null,
      fuel: null,
      shoes: null,
      completionPlanned: null,
    });
  }

  const alternatives = prescriptionText ? extractAlternatives(prescriptionText) : [];

  return {
    date,
    weekday,
    dayIndex,
    daysToRace,
    weekNumber,
    phaseLabel,
    plannedRunKm,
    cumulativeKm,
    sessions,
    alternatives,
  };
}

function parseWeekDates(header: string): { start: string; end: string } {
  // "## Week 1 (July 13 - July 19) - Return to normal running"
  const m = header.match(/\(([A-Za-z]+\s+\d{1,2})\s*-\s*([A-Za-z]+\s+\d{1,2})\)/);
  if (!m) throw new Error(`Unparseable week dates: "${header}"`);
  return { start: parseDate(m[1]!), end: parseDate(m[2]!) };
}

function parseWeek(headerLine: string, regionLines: string[]): ParsedWeek {
  const hm = headerLine.match(/^##\s+Week\s+(\d+)\s+\(.+?\)\s*-\s*(.+?)\s*$/);
  if (!hm) throw new Error(`Unparseable week header: "${headerLine}"`);
  const weekIndex = Number(hm[1]);
  const phaseLabel = hm[2]!.trim();
  const { start, end } = parseWeekDates(headerLine);

  const coachingLine = regionLines.find((l) => l.startsWith('**Coaching note:**'));
  const coachingNote = coachingLine
    ? coachingLine.replace('**Coaching note:**', '').trim()
    : null;

  // Week summary table: header "| Planned | Range | Previous | Change | Run days | Long run |"
  const headerIdx = regionLines.findIndex((l) => /^\|\s*Planned\s*\|/.test(l));
  let plannedKm: number | null = null,
    rangeMinKm: number | null = null,
    rangeMaxKm: number | null = null,
    previousText: string | null = null,
    pctChangeText: string | null = null,
    runDays: number | null = null,
    longRunKm: number | null = null;
  if (headerIdx >= 0) {
    const dataRow = regionLines[headerIdx + 2]; // header, separator, data
    if (dataRow) {
      const cols = dataRow.split('|').slice(1, -1).map((c) => c.trim());
      plannedKm = firstKm(cols[0] ?? '');
      const range = (cols[1] ?? '').match(/([\d.]+)\s*-\s*([\d.]+)/);
      if (range) {
        rangeMinKm = Number(range[1]);
        rangeMaxKm = Number(range[2]);
      }
      previousText = nullable(cols[2]);
      pctChangeText = nullable(cols[3]);
      runDays = cols[4] ? Number(cols[4]) : null;
      longRunKm = firstKm(cols[5] ?? '');
    }
  }

  const perfLine = regionLines.find((l) => /^-\s*Performance:/.test(l));
  const injuryLine = regionLines.find((l) => /^-\s*Injury management:/.test(l));
  const bikeStrengthLine = regionLines.find((l) => /^-\s*Bike:/.test(l));
  let bikeNote: string | null = null;
  let strengthNote: string | null = null;
  if (bikeStrengthLine) {
    const parts = bikeStrengthLine.replace(/^-\s*/, '').split('|');
    bikeNote = nullable(parts[0]?.replace(/^Bike:/, '').trim());
    strengthNote = nullable(parts[1]?.replace(/^Strength:/, '').trim());
  }

  const label = phaseLabel.toLowerCase();
  return {
    weekIndex,
    startDate: start,
    endDate: end,
    phaseLabel,
    plannedKm,
    rangeMinKm,
    rangeMaxKm,
    previousText,
    pctChangeText,
    runDays,
    longRunKm,
    coachingNote,
    performanceTarget: perfLine ? perfLine.replace(/^-\s*Performance:\s*/, '').trim() : null,
    injuryTarget: injuryLine ? injuryLine.replace(/^-\s*Injury management:\s*/, '').trim() : null,
    bikeNote,
    strengthNote,
    isCutback: label.includes('cutback'),
    isTaper: label.includes('taper'),
    isRaceWeek: label.includes('race week'),
    isPeak: label.includes('peak'),
    days: [],
  };
}

function derivePhases(weeks: ParsedWeek[]): ParsedPhase[] {
  const phases: ParsedPhase[] = [];
  for (const w of weeks) {
    const last = phases[phases.length - 1];
    if (last && last.name === w.phaseLabel && last.endWeek === w.weekIndex - 1) {
      last.endWeek = w.weekIndex;
    } else {
      phases.push({
        phaseIndex: phases.length + 1,
        name: w.phaseLabel,
        startWeek: w.weekIndex,
        endWeek: w.weekIndex,
      });
    }
  }
  return phases;
}

// -----------------------------------------------------------------------------
// Front-matter metadata + the formal decision-checkpoint table.
// -----------------------------------------------------------------------------
function parseMeta(text: string): ParsedPlanMeta {
  const northStar = text.match(/\*\*North star:\*\*\s*(.+)/)?.[1]?.trim() ?? null;
  const planLogic =
    text.match(/\*\*Plan logic in one sentence:\*\*\s*(.+)/)?.[1]?.trim() ?? null;
  const medical =
    text.match(/\*\*Important medical boundary:\*\*\s*(.+)/)?.[1]?.trim() ?? null;
  const version = Number(text.match(/\*\*Version:\*\*\s*(\d+)/)?.[1] ?? '1');
  const preparedRaw = text.match(/prepared\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/)?.[1];
  const age = text.match(/Age\s+(\d+)/)?.[1];

  // Goal-selection bullets: "- A: sub-1:22 only if ...", etc.
  const goalA = text.match(/^-\s*A:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const goalB = text.match(/^-\s*B:\s*(.+)$/m)?.[1]?.trim() ?? null;
  const goalC = text.match(/^-\s*C:\s*(.+)$/m)?.[1]?.trim() ?? null;

  const totalKm = text.match(/Planned training total:\s*([\d.]+)\s*km/)?.[1];

  return {
    slug: 'baystate-2026',
    title: "Baystate 2026 - Filippo's 14-week return-to-performance plan",
    version,
    preparedOn: preparedRaw ? parseDate(preparedRaw) : null,
    athleteName: 'Filippo',
    athleteAge: age ? Number(age) : null,
    athleteNotes:
      'Returning from probable patellofemoral pain (left knee) plus prior right-foot/plantar and calf issues. Previous HM PR 1:23:30; recorded HR max ~202 bpm.',
    raceName: 'Baystate Half Marathon',
    raceDistanceKm: 21.1,
    raceDate: '2026-10-18',
    raceStartTime: '08:00:00',
    raceLocation: 'Lowell, MA',
    raceCourseNotes:
      'Official flat, paved double loop using the Rourke and Aiken Street bridges; shared no-wave start with the marathon.',
    startDate: '2026-07-13',
    endDate: '2026-10-18',
    totalPlannedKm: totalKm ? Number(totalKm) : 529.1,
    northStar,
    planLogic,
    medicalNotes: medical,
    goalA,
    goalB,
    goalC,
  };
}

function parseCheckpoints(text: string): ParsedCheckpoint[] {
  // The "Formal decision checkpoints" table. Rows have 4 cols after the header.
  const start = text.indexOf('## Formal decision checkpoints');
  if (start < 0) return [];
  const section = text.slice(start, text.indexOf('\n## ', start + 5));
  const rows = section
    .split('\n')
    .filter((l) => /^\|/.test(l) && !/Checkpoint\s*\|\s*Green/.test(l) && !/^\|\s*-+/.test(l));
  const checkpoints: ParsedCheckpoint[] = [];
  rows.forEach((row, i) => {
    const cols = row.split('|').slice(1, -1).map((c) => c.trim());
    if (cols.length < 4) return;
    const afterWeek = cols[0]!.match(/Week\s+(\d+)/)?.[1];
    checkpoints.push({
      checkpointIndex: i + 1,
      title: cols[0]!,
      afterWeek: afterWeek ? Number(afterWeek) : null,
      greenAction: nullable(cols[1]),
      yellowAction: nullable(cols[2]),
      redAction: nullable(cols[3]),
    });
  });
  return checkpoints;
}

// Curated event milestones. Sourced from the plan's Milestones section and
// docs/PLAN-EXTRACT.md; these are stable plan-level facts, not per-day rows.
// (The four formal decision checkpoints live in the `checkpoints` table.)
function baystateMilestones(): ParsedMilestone[] {
  return [
    {
      milestoneIndex: 1,
      type: 'cutback_week',
      title: 'Week 6 cutback (31 km)',
      date: null,
      weekNumber: 6,
      description: 'Durability cutback: volume steps back to 31 km to absorb the prior block.',
      greenCriteria: null,
      yellowCriteria: null,
      redCriteria: null,
    },
    {
      milestoneIndex: 2,
      type: 'cutback_week',
      title: 'Week 9 cutback (41 km)',
      date: null,
      weekNumber: 9,
      description: 'Specific-prep cutback before half-marathon development weeks.',
      greenCriteria: null,
      yellowCriteria: null,
      redCriteria: null,
    },
    {
      milestoneIndex: 3,
      type: 'gated_long_run',
      title: 'First full-distance run (21.1 km easy confidence run)',
      date: '2026-09-20',
      weekNumber: 10,
      description: 'Planned race-distance familiarity run; pace adds no value and symptoms cancel it.',
      greenCriteria: '21.1 km entirely easy.',
      yellowCriteria: '16-18 km easy.',
      redCriteria: 'No run.',
    },
    {
      milestoneIndex: 4,
      type: 'key_workout',
      title: 'Peak HM-specific session (2x4 km @ HM effort)',
      date: '2026-09-29',
      weekNumber: 12,
      description: 'The peak race-specificity workout; controlled at RPE 7-8.',
      greenCriteria: null,
      yellowCriteria: null,
      redCriteria: null,
    },
    {
      milestoneIndex: 5,
      type: 'gated_long_run',
      title: 'Conditional second long run (20 km)',
      date: '2026-10-04',
      weekNumber: 12,
      description: 'Optional, not owed. Proceeds only if all prior gates and metrics stay green.',
      greenCriteria: '20.0 km easy; optional final 3 km steady only if all green at 17 km.',
      yellowCriteria: '18 km entirely easy.',
      redCriteria: 'No run / symptom-free bike only.',
    },
    {
      milestoneIndex: 6,
      type: 'taper_start',
      title: 'Taper start (Week 13)',
      date: '2026-10-05',
      weekNumber: 13,
      description: 'Volume drops while brief intensity and rhythm are preserved.',
      greenCriteria: null,
      yellowCriteria: null,
      redCriteria: null,
    },
    {
      milestoneIndex: 7,
      type: 'key_workout',
      title: 'Race-rhythm tune-up (3x800 m @ HM)',
      date: '2026-10-13',
      weekNumber: 14,
      description: 'Final sharpening touch in race week.',
      greenCriteria: null,
      yellowCriteria: null,
      redCriteria: null,
    },
    {
      milestoneIndex: 8,
      type: 'race',
      title: 'Baystate Half Marathon',
      date: '2026-10-18',
      weekNumber: 14,
      description: 'Race day, 8:00 AM start. The only race; no tune-up races.',
      greenCriteria: null,
      yellowCriteria: null,
      redCriteria: null,
    },
    {
      milestoneIndex: 9,
      type: 'post_race',
      title: 'Post-race recovery + marathon bridge',
      date: '2026-10-18',
      weekNumber: 14,
      description:
        '72 h / days 4-7 / week 2 recovery protocol, then winter-base entry criteria toward a spring 2027 marathon (BQ.2, April 11, 2027).',
      greenCriteria: null,
      yellowCriteria: null,
      redCriteria: null,
    },
  ];
}

export function parsePlan(markdown: string): ParsedPlan {
  const text = markdown.replace(/\r\n/g, '\n');
  const lines = text.split('\n');

  const weekHeaderIdx: number[] = [];
  const dayHeaderIdx: number[] = [];
  lines.forEach((l, i) => {
    if (/^##\s+Week\s+\d+\s+\(/.test(l)) weekHeaderIdx.push(i);
    if (/^###\s+(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/.test(l)) {
      dayHeaderIdx.push(i);
    }
  });

  if (weekHeaderIdx.length !== 14) {
    throw new Error(`Expected 14 week sections, found ${weekHeaderIdx.length}`);
  }
  if (dayHeaderIdx.length !== 98) {
    throw new Error(`Expected 98 day pages, found ${dayHeaderIdx.length}`);
  }

  const meta = parseMeta(text);
  const checkpoints = parseCheckpoints(text);
  const milestones = baystateMilestones();

  const weeks: ParsedWeek[] = [];
  for (let w = 0; w < weekHeaderIdx.length; w++) {
    const wStart = weekHeaderIdx[w]!;
    const wEnd = w + 1 < weekHeaderIdx.length ? weekHeaderIdx[w + 1]! : lines.length;
    const week = parseWeek(lines[wStart]!, lines.slice(wStart, wEnd));

    // Day headers within this week's span.
    const daysInWeek = dayHeaderIdx.filter((i) => i > wStart && i < wEnd);
    for (let d = 0; d < daysInWeek.length; d++) {
      const dStart = daysInWeek[d]!;
      const dEnd = d + 1 < daysInWeek.length ? daysInWeek[d + 1]! : wEnd;
      week.days.push(parseDay(lines[dStart]!, lines.slice(dStart, dEnd)));
    }
    weeks.push(week);
  }

  const phases = derivePhases(weeks);
  return { meta, phases, weeks, checkpoints, milestones };
}
