// Domain types for the parsed Baystate plan. These mirror the database schema
// closely but are the parser's own representation (dates as ISO strings).

export type SessionCategory =
  | 'easy_run'
  | 'long_run'
  | 'quality_run'
  | 'bike'
  | 'strength_only'
  | 'rest'
  | 'race';

export type AlternativeGate = 'green' | 'yellow' | 'red';

export type MilestoneType =
  | 'decision_checkpoint'
  | 'gated_long_run'
  | 'key_workout'
  | 'taper_start'
  | 'race'
  | 'cutback_week'
  | 'post_race';

export interface ParsedSession {
  slot: 'primary' | 'secondary';
  title: string;
  category: SessionCategory | null;
  isQuality: boolean;
  role: string | null;
  prescriptionText: string | null;
  distanceKm: number | null;
  durationText: string | null;
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  paceText: string | null;
  paceMinSPerKm: number | null;
  paceMaxSPerKm: number | null;
  rpeText: string | null;
  hrText: string | null;
  terrain: string | null;
  cue: string | null;
  fuel: string | null;
  shoes: string | null;
  completionPlanned: string | null;
}

export interface ParsedAlternative {
  gate: AlternativeGate;
  prescription: string;
  distanceKm: number | null;
}

export interface ParsedDay {
  date: string; // ISO yyyy-mm-dd
  weekday: string;
  dayIndex: number; // 1..98
  daysToRace: number;
  weekNumber: number;
  phaseLabel: string;
  plannedRunKm: number; // today's run km (0 on non-run days)
  cumulativeKm: number | null;
  sessions: ParsedSession[]; // primary + secondary
  alternatives: ParsedAlternative[];
}

export interface ParsedWeek {
  weekIndex: number;
  startDate: string; // ISO
  endDate: string; // ISO
  phaseLabel: string;
  plannedKm: number | null;
  rangeMinKm: number | null;
  rangeMaxKm: number | null;
  previousText: string | null;
  pctChangeText: string | null;
  runDays: number | null;
  longRunKm: number | null;
  coachingNote: string | null;
  performanceTarget: string | null;
  injuryTarget: string | null;
  bikeNote: string | null;
  strengthNote: string | null;
  isCutback: boolean;
  isTaper: boolean;
  isRaceWeek: boolean;
  isPeak: boolean;
  days: ParsedDay[];
}

export interface ParsedPhase {
  phaseIndex: number;
  name: string;
  startWeek: number;
  endWeek: number;
}

export interface ParsedCheckpoint {
  checkpointIndex: number;
  title: string;
  afterWeek: number | null;
  greenAction: string | null;
  yellowAction: string | null;
  redAction: string | null;
}

export interface ParsedMilestone {
  milestoneIndex: number;
  type: MilestoneType;
  title: string;
  date: string | null;
  weekNumber: number | null;
  description: string | null;
  greenCriteria: string | null;
  yellowCriteria: string | null;
  redCriteria: string | null;
}

export interface ParsedPlanMeta {
  slug: string;
  title: string;
  version: number;
  preparedOn: string | null;
  athleteName: string | null;
  athleteAge: number | null;
  athleteNotes: string | null;
  raceName: string | null;
  raceDistanceKm: number | null;
  raceDate: string | null;
  raceStartTime: string | null; // HH:MM:SS
  raceLocation: string | null;
  raceCourseNotes: string | null;
  startDate: string | null;
  endDate: string | null;
  totalPlannedKm: number | null;
  northStar: string | null;
  planLogic: string | null;
  medicalNotes: string | null;
  goalA: string | null;
  goalB: string | null;
  goalC: string | null;
}

export interface ParsedPlan {
  meta: ParsedPlanMeta;
  phases: ParsedPhase[];
  weeks: ParsedWeek[];
  checkpoints: ParsedCheckpoint[];
  milestones: ParsedMilestone[];
}
