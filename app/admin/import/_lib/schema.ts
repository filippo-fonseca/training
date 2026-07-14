// Structured plan-import schema (version 1) + a hand-rolled validator with
// readable, path-qualified errors. Pure: no DB access, safe to run anywhere. The
// import JSON mirrors the DB shape but references parents by index (phase_index,
// week_index) instead of UUIDs, so files are human-authorable. The apply step
// resolves those indices to foreign keys.

export const IMPORT_VERSION = 1;

const SESSION_SLOTS = ['primary', 'secondary'] as const;
const SESSION_CATEGORIES = [
  'easy_run', 'long_run', 'quality_run', 'bike', 'strength_only', 'rest', 'race',
] as const;
const GATES = ['green', 'yellow', 'red'] as const;
const MILESTONE_TYPES = [
  'decision_checkpoint', 'gated_long_run', 'key_workout',
  'taper_start', 'race', 'cutback_week', 'post_race',
] as const;

// ---- Parsed value shapes (loosely typed; the DB layer takes it from here) ----
export interface ImportSession {
  slot: (typeof SESSION_SLOTS)[number];
  title: string;
  category: (typeof SESSION_CATEGORIES)[number] | null;
  is_quality: boolean;
  role: string | null;
  prescription_text: string | null;
  distance_km: number | null;
  duration_text: string | null;
  duration_min_minutes: number | null;
  duration_max_minutes: number | null;
  pace_text: string | null;
  pace_min_s_per_km: number | null;
  pace_max_s_per_km: number | null;
  rpe_text: string | null;
  hr_text: string | null;
  terrain: string | null;
  cue: string | null;
  fuel: string | null;
  shoes: string | null;
  completion_planned: string | null;
}

export interface ImportAlternative {
  gate: (typeof GATES)[number];
  prescription: string;
  distance_km: number | null;
}

export interface ImportDay {
  week_index: number;
  date: string;
  day_index: number;
  weekday: string | null;
  days_to_race: number | null;
  week_number: number | null;
  phase_label: string | null;
  planned_run_km: number;
  cumulative_km: number | null;
  sessions: ImportSession[];
  alternatives: ImportAlternative[];
}

export interface ImportPhase {
  phase_index: number;
  name: string;
  // Date window that defines the phase (migration 0008). Weeks match in by date
  // containment. start_week/end_week are accepted for back-compat but no longer
  // drive membership.
  start_date: string | null;
  end_date: string | null;
  start_week: number | null;
  end_week: number | null;
  description: string | null;
}

export interface ImportWeek {
  week_index: number;
  phase_index: number | null;
  phase_label: string | null;
  planned_km: number | null;
  range_min_km: number | null;
  range_max_km: number | null;
  run_days: number | null;
  long_run_km: number | null;
  previous_text: string | null;
  pct_change_text: string | null;
  coaching_note: string | null;
  performance_target: string | null;
  injury_target: string | null;
  bike_note: string | null;
  strength_note: string | null;
  is_cutback: boolean;
  is_taper: boolean;
  is_race_week: boolean;
  is_peak: boolean;
}

export interface ImportMilestone {
  milestone_index: number;
  type: (typeof MILESTONE_TYPES)[number];
  title: string;
  date: string | null;
  week_number: number | null;
  description: string | null;
  green_criteria: string | null;
  yellow_criteria: string | null;
  red_criteria: string | null;
}

export interface ImportCheckpoint {
  checkpoint_index: number;
  title: string;
  after_week: number | null;
  green_action: string | null;
  yellow_action: string | null;
  red_action: string | null;
}

export interface ImportPlan {
  slug: string;
  title: string;
  version: number;
  status: string;
  prepared_on: string | null;
  athlete_name: string | null;
  athlete_age: number | null;
  athlete_notes: string | null;
  race_name: string | null;
  race_distance_km: number | null;
  race_date: string | null;
  race_start_time: string | null;
  race_location: string | null;
  race_course_notes: string | null;
  start_date: string | null;
  end_date: string | null;
  total_planned_km: number | null;
  north_star: string | null;
  plan_logic: string | null;
  medical_notes: string | null;
  goal_a: string | null;
  goal_b: string | null;
  goal_c: string | null;
}

export interface ImportDocument {
  version: number;
  plan: ImportPlan;
  phases: ImportPhase[];
  weeks: ImportWeek[];
  days: ImportDay[];
  milestones: ImportMilestone[];
  checkpoints: ImportCheckpoint[];
}

export interface ImportCounts {
  phases: number;
  weeks: number;
  days: number;
  sessions: number;
  alternatives: number;
  milestones: number;
  checkpoints: number;
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
  /** Non-blocking notices: accepted-but-ignored legacy fields, etc. */
  warnings: string[];
  value?: ImportDocument;
  slug?: string;
  title?: string;
  counts?: ImportCounts;
}

// ---- small typed field readers that accumulate errors ---------------------
type Rec = Record<string, unknown>;
const isObj = (v: unknown): v is Rec => typeof v === 'object' && v !== null && !Array.isArray(v);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SLUG_RE = /^[a-z0-9-]+$/;

class Ctx {
  errors: string[] = [];
  warnings: string[] = [];
  err(path: string, msg: string) {
    this.errors.push(`${path}: ${msg}`);
  }
  warn(msg: string) {
    this.warnings.push(msg);
  }
  reqStr(o: Rec, key: string, path: string): string {
    const v = o[key];
    if (typeof v !== 'string' || v.trim() === '') {
      this.err(`${path}.${key}`, 'is required and must be a non-empty string');
      return '';
    }
    return v;
  }
  optStr(o: Rec, key: string, path: string): string | null {
    const v = o[key];
    if (v === undefined || v === null) return null;
    if (typeof v !== 'string') {
      this.err(`${path}.${key}`, 'must be a string');
      return null;
    }
    return v.trim() === '' ? null : v;
  }
  reqInt(o: Rec, key: string, path: string): number {
    const v = o[key];
    if (typeof v !== 'number' || !Number.isInteger(v)) {
      this.err(`${path}.${key}`, 'is required and must be an integer');
      return 0;
    }
    return v;
  }
  optNum(o: Rec, key: string, path: string): number | null {
    const v = o[key];
    if (v === undefined || v === null) return null;
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      this.err(`${path}.${key}`, 'must be a number');
      return null;
    }
    return v;
  }
  optInt(o: Rec, key: string, path: string): number | null {
    const v = o[key];
    if (v === undefined || v === null) return null;
    if (typeof v !== 'number' || !Number.isInteger(v)) {
      this.err(`${path}.${key}`, 'must be an integer');
      return null;
    }
    return v;
  }
  bool(o: Rec, key: string): boolean {
    return o[key] === true;
  }
  optDate(o: Rec, key: string, path: string): string | null {
    const v = this.optStr(o, key, path);
    if (v !== null && !DATE_RE.test(v)) {
      this.err(`${path}.${key}`, 'must be a date in YYYY-MM-DD form');
    }
    return v;
  }
  enumVal<T extends readonly string[]>(
    o: Rec,
    key: string,
    path: string,
    allowed: T,
    required: boolean,
  ): T[number] | null {
    const v = o[key];
    if (v === undefined || v === null) {
      if (required) this.err(`${path}.${key}`, `is required (one of ${allowed.join(', ')})`);
      return null;
    }
    if (typeof v !== 'string' || !allowed.includes(v)) {
      this.err(`${path}.${key}`, `must be one of ${allowed.join(', ')}`);
      return null;
    }
    return v as T[number];
  }
  array(o: Rec, key: string, path: string): unknown[] {
    const v = o[key];
    if (v === undefined || v === null) return [];
    if (!Array.isArray(v)) {
      this.err(`${path}.${key}`, 'must be an array');
      return [];
    }
    return v;
  }
}

/** Parse + validate a raw JSON string. Never throws. */
export function validateImport(raw: string): ValidationResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      errors: [`Invalid JSON: ${e instanceof Error ? e.message : 'parse error'}`],
      warnings: [],
    };
  }
  if (!isObj(parsed)) {
    return { ok: false, errors: ['Top level must be a JSON object.'], warnings: [] };
  }

  const c = new Ctx();
  const version = parsed.version;
  if (version !== IMPORT_VERSION) {
    c.err('version', `must be ${IMPORT_VERSION}`);
  }

  // ---- plan ----
  let plan: ImportPlan | undefined;
  if (!isObj(parsed.plan)) {
    c.err('plan', 'is required and must be an object');
  } else {
    const p = parsed.plan;
    const slug = c.reqStr(p, 'slug', 'plan');
    if (slug && !SLUG_RE.test(slug)) c.err('plan.slug', 'must be lowercase letters, numbers, and hyphens');
    plan = {
      slug,
      title: c.reqStr(p, 'title', 'plan'),
      version: c.optInt(p, 'version', 'plan') ?? 1,
      status: c.optStr(p, 'status', 'plan') ?? 'active',
      prepared_on: c.optDate(p, 'prepared_on', 'plan'),
      athlete_name: c.optStr(p, 'athlete_name', 'plan'),
      athlete_age: c.optInt(p, 'athlete_age', 'plan'),
      athlete_notes: c.optStr(p, 'athlete_notes', 'plan'),
      race_name: c.optStr(p, 'race_name', 'plan'),
      race_distance_km: c.optNum(p, 'race_distance_km', 'plan'),
      race_date: c.optDate(p, 'race_date', 'plan'),
      race_start_time: c.optStr(p, 'race_start_time', 'plan'),
      race_location: c.optStr(p, 'race_location', 'plan'),
      race_course_notes: c.optStr(p, 'race_course_notes', 'plan'),
      start_date: c.optDate(p, 'start_date', 'plan'),
      end_date: c.optDate(p, 'end_date', 'plan'),
      total_planned_km: c.optNum(p, 'total_planned_km', 'plan'),
      north_star: c.optStr(p, 'north_star', 'plan'),
      plan_logic: c.optStr(p, 'plan_logic', 'plan'),
      medical_notes: c.optStr(p, 'medical_notes', 'plan'),
      goal_a: c.optStr(p, 'goal_a', 'plan'),
      goal_b: c.optStr(p, 'goal_b', 'plan'),
      goal_c: c.optStr(p, 'goal_c', 'plan'),
    };
  }

  // ---- phases ----
  const phaseIndices = new Set<number>();
  const phases: ImportPhase[] = c.array(parsed, 'phases', 'root').map((raw, i) => {
    const path = `phases[${i}]`;
    if (!isObj(raw)) {
      c.err(path, 'must be an object');
      return {
        phase_index: -1,
        name: '',
        start_date: null,
        end_date: null,
        start_week: null,
        end_week: null,
        description: null,
      };
    }
    const phase_index = c.reqInt(raw, 'phase_index', path);
    if (phaseIndices.has(phase_index)) c.err(`${path}.phase_index`, `duplicate phase_index ${phase_index}`);
    phaseIndices.add(phase_index);
    const start_date = c.optDate(raw, 'start_date', path);
    const end_date = c.optDate(raw, 'end_date', path);
    if (start_date && end_date && end_date < start_date) {
      c.err(`${path}.end_date`, 'must be on or after start_date');
    }
    return {
      phase_index,
      name: c.reqStr(raw, 'name', path),
      start_date,
      end_date,
      start_week: c.optInt(raw, 'start_week', path),
      end_week: c.optInt(raw, 'end_week', path),
      description: c.optStr(raw, 'description', path),
    };
  });

  // ---- weeks ----
  const weekIndices = new Set<number>();
  let legacyPhaseRefs = 0;
  const weeks: ImportWeek[] = c.array(parsed, 'weeks', 'root').map((raw, i) => {
    const path = `weeks[${i}]`;
    if (!isObj(raw)) {
      c.err(path, 'must be an object');
      raw = {} as Rec;
    }
    const o = raw as Rec;
    const week_index = c.reqInt(o, 'week_index', path);
    if (weekIndices.has(week_index)) c.err(`${path}.week_index`, `duplicate week_index ${week_index}`);
    weekIndices.add(week_index);
    // A per-week phase reference is accepted but IGNORED: phase membership is
    // derived from phase date ranges now (migration 0008), never a stored link.
    const phase_index = c.optInt(o, 'phase_index', path);
    if (phase_index !== null) legacyPhaseRefs += 1;
    return {
      week_index,
      phase_index,
      phase_label: c.optStr(o, 'phase_label', path),
      planned_km: c.optNum(o, 'planned_km', path),
      range_min_km: c.optNum(o, 'range_min_km', path),
      range_max_km: c.optNum(o, 'range_max_km', path),
      run_days: c.optInt(o, 'run_days', path),
      long_run_km: c.optNum(o, 'long_run_km', path),
      previous_text: c.optStr(o, 'previous_text', path),
      pct_change_text: c.optStr(o, 'pct_change_text', path),
      coaching_note: c.optStr(o, 'coaching_note', path),
      performance_target: c.optStr(o, 'performance_target', path),
      injury_target: c.optStr(o, 'injury_target', path),
      bike_note: c.optStr(o, 'bike_note', path),
      strength_note: c.optStr(o, 'strength_note', path),
      is_cutback: c.bool(o, 'is_cutback'),
      is_taper: c.bool(o, 'is_taper'),
      is_race_week: c.bool(o, 'is_race_week'),
      is_peak: c.bool(o, 'is_peak'),
    };
  });

  if (legacyPhaseRefs > 0) {
    c.warn(
      `weeks[].phase_index is set on ${legacyPhaseRefs} week(s) but ignored: phase assignment is now derived from phase date ranges (start_date/end_date).`,
    );
  }

  // ---- days (+ sessions, alternatives) ----
  const dayIndices = new Set<number>();
  const dayDates = new Set<string>();
  let sessionCount = 0;
  let altCount = 0;
  const days: ImportDay[] = c.array(parsed, 'days', 'root').map((raw, i) => {
    const path = `days[${i}]`;
    if (!isObj(raw)) {
      c.err(path, 'must be an object');
      raw = {} as Rec;
    }
    const o = raw as Rec;
    const day_index = c.reqInt(o, 'day_index', path);
    if (dayIndices.has(day_index)) c.err(`${path}.day_index`, `duplicate day_index ${day_index}`);
    dayIndices.add(day_index);
    const date = c.optDate(o, 'date', path);
    if (!date) c.err(`${path}.date`, 'is required (YYYY-MM-DD)');
    else if (dayDates.has(date)) c.err(`${path}.date`, `duplicate date ${date}`);
    else dayDates.add(date);
    const week_index = c.reqInt(o, 'week_index', path);
    if (!weekIndices.has(week_index)) c.err(`${path}.week_index`, `references unknown week_index ${week_index}`);

    const seenSlots = new Set<string>();
    const sessions: ImportSession[] = c.array(o, 'sessions', path).map((sraw, si) => {
      const spath = `${path}.sessions[${si}]`;
      if (!isObj(sraw)) {
        c.err(spath, 'must be an object');
        sraw = {} as Rec;
      }
      const s = sraw as Rec;
      const slot = c.enumVal(s, 'slot', spath, SESSION_SLOTS, true);
      if (slot && seenSlots.has(slot)) c.err(`${spath}.slot`, `duplicate ${slot} slot on this day`);
      if (slot) seenSlots.add(slot);
      sessionCount += 1;
      return {
        slot: (slot ?? 'primary') as ImportSession['slot'],
        title: c.reqStr(s, 'title', spath),
        category: c.enumVal(s, 'category', spath, SESSION_CATEGORIES, false),
        is_quality: c.bool(s, 'is_quality'),
        role: c.optStr(s, 'role', spath),
        prescription_text: c.optStr(s, 'prescription_text', spath),
        distance_km: c.optNum(s, 'distance_km', spath),
        duration_text: c.optStr(s, 'duration_text', spath),
        duration_min_minutes: c.optInt(s, 'duration_min_minutes', spath),
        duration_max_minutes: c.optInt(s, 'duration_max_minutes', spath),
        pace_text: c.optStr(s, 'pace_text', spath),
        pace_min_s_per_km: c.optInt(s, 'pace_min_s_per_km', spath),
        pace_max_s_per_km: c.optInt(s, 'pace_max_s_per_km', spath),
        rpe_text: c.optStr(s, 'rpe_text', spath),
        hr_text: c.optStr(s, 'hr_text', spath),
        terrain: c.optStr(s, 'terrain', spath),
        cue: c.optStr(s, 'cue', spath),
        fuel: c.optStr(s, 'fuel', spath),
        shoes: c.optStr(s, 'shoes', spath),
        completion_planned: c.optStr(s, 'completion_planned', spath),
      };
    });

    const seenGates = new Set<string>();
    const alternatives: ImportAlternative[] = c.array(o, 'alternatives', path).map((araw, ai) => {
      const apath = `${path}.alternatives[${ai}]`;
      if (!isObj(araw)) {
        c.err(apath, 'must be an object');
        araw = {} as Rec;
      }
      const a = araw as Rec;
      const gate = c.enumVal(a, 'gate', apath, GATES, true);
      if (gate && seenGates.has(gate)) c.err(`${apath}.gate`, `duplicate ${gate} gate on this day`);
      if (gate) seenGates.add(gate);
      altCount += 1;
      return {
        gate: (gate ?? 'green') as ImportAlternative['gate'],
        prescription: c.reqStr(a, 'prescription', apath),
        distance_km: c.optNum(a, 'distance_km', apath),
      };
    });

    return {
      week_index,
      date: date ?? '',
      day_index,
      weekday: c.optStr(o, 'weekday', path),
      days_to_race: c.optInt(o, 'days_to_race', path),
      week_number: c.optInt(o, 'week_number', path),
      phase_label: c.optStr(o, 'phase_label', path),
      planned_run_km: c.optNum(o, 'planned_run_km', path) ?? 0,
      cumulative_km: c.optNum(o, 'cumulative_km', path),
      sessions,
      alternatives,
    };
  });

  // ---- milestones ----
  const milestoneIdx = new Set<number>();
  const milestones: ImportMilestone[] = c.array(parsed, 'milestones', 'root').map((raw, i) => {
    const path = `milestones[${i}]`;
    if (!isObj(raw)) {
      c.err(path, 'must be an object');
      raw = {} as Rec;
    }
    const o = raw as Rec;
    const milestone_index = c.reqInt(o, 'milestone_index', path);
    if (milestoneIdx.has(milestone_index)) c.err(`${path}.milestone_index`, `duplicate ${milestone_index}`);
    milestoneIdx.add(milestone_index);
    return {
      milestone_index,
      type: (c.enumVal(o, 'type', path, MILESTONE_TYPES, true) ?? 'key_workout') as ImportMilestone['type'],
      title: c.reqStr(o, 'title', path),
      date: c.optDate(o, 'date', path),
      week_number: c.optInt(o, 'week_number', path),
      description: c.optStr(o, 'description', path),
      green_criteria: c.optStr(o, 'green_criteria', path),
      yellow_criteria: c.optStr(o, 'yellow_criteria', path),
      red_criteria: c.optStr(o, 'red_criteria', path),
    };
  });

  // ---- checkpoints ----
  const checkpointIdx = new Set<number>();
  const checkpoints: ImportCheckpoint[] = c.array(parsed, 'checkpoints', 'root').map((raw, i) => {
    const path = `checkpoints[${i}]`;
    if (!isObj(raw)) {
      c.err(path, 'must be an object');
      raw = {} as Rec;
    }
    const o = raw as Rec;
    const checkpoint_index = c.reqInt(o, 'checkpoint_index', path);
    if (checkpointIdx.has(checkpoint_index)) c.err(`${path}.checkpoint_index`, `duplicate ${checkpoint_index}`);
    checkpointIdx.add(checkpoint_index);
    return {
      checkpoint_index,
      title: c.reqStr(o, 'title', path),
      after_week: c.optInt(o, 'after_week', path),
      green_action: c.optStr(o, 'green_action', path),
      yellow_action: c.optStr(o, 'yellow_action', path),
      red_action: c.optStr(o, 'red_action', path),
    };
  });

  if (c.errors.length > 0 || !plan) {
    return {
      ok: false,
      errors: c.errors.length ? c.errors : ['plan is required'],
      warnings: c.warnings,
    };
  }

  const value: ImportDocument = {
    version: IMPORT_VERSION,
    plan,
    phases,
    weeks,
    days,
    milestones,
    checkpoints,
  };
  const counts: ImportCounts = {
    phases: phases.length,
    weeks: weeks.length,
    days: days.length,
    sessions: sessionCount,
    alternatives: altCount,
    milestones: milestones.length,
    checkpoints: checkpoints.length,
  };
  return { ok: true, errors: [], warnings: c.warnings, value, slug: plan.slug, title: plan.title, counts };
}
