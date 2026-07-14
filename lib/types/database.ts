// Database types for the training tracker.
//
// Hand-authored to match supabase/migrations/*.sql. The app runtime cannot reach
// the hosted database from this build lane, so these are kept in lockstep with
// the migrations by review (and can be regenerated later with
// `supabase gen types typescript` once the project is linked). Shaped like the
// Supabase CLI output so a future regeneration is a drop-in replacement.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SessionSlot = 'primary' | 'secondary';
export type SessionCategory =
  | 'easy_run'
  | 'long_run'
  | 'quality_run'
  | 'bike'
  | 'strength_only'
  | 'rest'
  | 'race';
export type AlternativeGate = 'green' | 'yellow' | 'red';
export type TrafficLight = 'green' | 'yellow' | 'red';
export type MilestoneType =
  | 'decision_checkpoint'
  | 'gated_long_run'
  | 'key_workout'
  | 'taper_start'
  | 'race'
  | 'cutback_week'
  | 'post_race';

export interface Database {
  public: {
    Tables: {
      app_settings: {
        Row: { key: string; value: string | null; updated_at: string };
        Insert: { key: string; value?: string | null; updated_at?: string };
        Update: { key?: string; value?: string | null; updated_at?: string };
        Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          slug: string;
          title: string;
          version: number;
          prepared_on: string | null;
          status: string;
          athlete_name: string | null;
          athlete_age: number | null;
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
          goal_a: string | null;
          goal_b: string | null;
          goal_c: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          version?: number;
          prepared_on?: string | null;
          status?: string;
          athlete_name?: string | null;
          athlete_age?: number | null;
          race_name?: string | null;
          race_distance_km?: number | null;
          race_date?: string | null;
          race_start_time?: string | null;
          race_location?: string | null;
          race_course_notes?: string | null;
          start_date?: string | null;
          end_date?: string | null;
          total_planned_km?: number | null;
          north_star?: string | null;
          plan_logic?: string | null;
          goal_a?: string | null;
          goal_b?: string | null;
          goal_c?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['plans']['Insert']>;
        Relationships: [];
      };
      // PRIVATE (owner-only, including SELECT): clinical/injury narrative moved
      // off the public plans table (sealed decision D1). Never anon-readable.
      plan_private_notes: {
        Row: {
          plan_id: string;
          medical_notes: string | null;
          athlete_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          plan_id: string;
          medical_notes?: string | null;
          athlete_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['plan_private_notes']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'plan_private_notes_plan_id_fkey';
            columns: ['plan_id'];
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_phases: {
        Row: {
          id: string;
          plan_id: string;
          phase_index: number;
          name: string;
          start_week: number | null;
          end_week: number | null;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          phase_index: number;
          name: string;
          start_week?: number | null;
          end_week?: number | null;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['plan_phases']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'plan_phases_plan_id_fkey';
            columns: ['plan_id'];
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_weeks: {
        Row: {
          id: string;
          plan_id: string;
          phase_id: string | null;
          week_index: number;
          start_date: string | null;
          end_date: string | null;
          phase_label: string | null;
          planned_km: number | null;
          range_min_km: number | null;
          range_max_km: number | null;
          previous_text: string | null;
          pct_change_text: string | null;
          run_days: number | null;
          long_run_km: number | null;
          coaching_note: string | null;
          performance_target: string | null;
          injury_target: string | null;
          bike_note: string | null;
          strength_note: string | null;
          is_cutback: boolean;
          is_taper: boolean;
          is_race_week: boolean;
          is_peak: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          phase_id?: string | null;
          week_index: number;
          start_date?: string | null;
          end_date?: string | null;
          phase_label?: string | null;
          planned_km?: number | null;
          range_min_km?: number | null;
          range_max_km?: number | null;
          previous_text?: string | null;
          pct_change_text?: string | null;
          run_days?: number | null;
          long_run_km?: number | null;
          coaching_note?: string | null;
          performance_target?: string | null;
          injury_target?: string | null;
          bike_note?: string | null;
          strength_note?: string | null;
          is_cutback?: boolean;
          is_taper?: boolean;
          is_race_week?: boolean;
          is_peak?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['plan_weeks']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'plan_weeks_plan_id_fkey';
            columns: ['plan_id'];
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_weeks_phase_id_fkey';
            columns: ['phase_id'];
            referencedRelation: 'plan_phases';
            referencedColumns: ['id'];
          },
        ];
      };
      plan_days: {
        Row: {
          id: string;
          plan_id: string;
          week_id: string;
          date: string;
          weekday: string | null;
          day_index: number;
          days_to_race: number | null;
          week_number: number | null;
          phase_label: string | null;
          planned_run_km: number;
          cumulative_km: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          week_id: string;
          date: string;
          weekday?: string | null;
          day_index: number;
          days_to_race?: number | null;
          week_number?: number | null;
          phase_label?: string | null;
          planned_run_km?: number;
          cumulative_km?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['plan_days']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'plan_days_plan_id_fkey';
            columns: ['plan_id'];
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'plan_days_week_id_fkey';
            columns: ['week_id'];
            referencedRelation: 'plan_weeks';
            referencedColumns: ['id'];
          },
        ];
      };
      day_sessions: {
        Row: {
          id: string;
          plan_day_id: string;
          slot: SessionSlot;
          title: string;
          category: SessionCategory | null;
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_day_id: string;
          slot: SessionSlot;
          title: string;
          category?: SessionCategory | null;
          is_quality?: boolean;
          role?: string | null;
          prescription_text?: string | null;
          distance_km?: number | null;
          duration_text?: string | null;
          duration_min_minutes?: number | null;
          duration_max_minutes?: number | null;
          pace_text?: string | null;
          pace_min_s_per_km?: number | null;
          pace_max_s_per_km?: number | null;
          rpe_text?: string | null;
          hr_text?: string | null;
          terrain?: string | null;
          cue?: string | null;
          fuel?: string | null;
          shoes?: string | null;
          completion_planned?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['day_sessions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'day_sessions_plan_day_id_fkey';
            columns: ['plan_day_id'];
            referencedRelation: 'plan_days';
            referencedColumns: ['id'];
          },
        ];
      };
      day_alternatives: {
        Row: {
          id: string;
          plan_day_id: string;
          gate: AlternativeGate;
          prescription: string;
          distance_km: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          plan_day_id: string;
          gate: AlternativeGate;
          prescription: string;
          distance_km?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['day_alternatives']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'day_alternatives_plan_day_id_fkey';
            columns: ['plan_day_id'];
            referencedRelation: 'plan_days';
            referencedColumns: ['id'];
          },
        ];
      };
      milestones: {
        Row: {
          id: string;
          plan_id: string;
          milestone_index: number;
          type: MilestoneType;
          title: string;
          date: string | null;
          week_number: number | null;
          description: string | null;
          green_criteria: string | null;
          yellow_criteria: string | null;
          red_criteria: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          milestone_index: number;
          type: MilestoneType;
          title: string;
          date?: string | null;
          week_number?: number | null;
          description?: string | null;
          green_criteria?: string | null;
          yellow_criteria?: string | null;
          red_criteria?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['milestones']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'milestones_plan_id_fkey';
            columns: ['plan_id'];
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      checkpoints: {
        Row: {
          id: string;
          plan_id: string;
          checkpoint_index: number;
          title: string;
          after_week: number | null;
          green_action: string | null;
          yellow_action: string | null;
          red_action: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          checkpoint_index: number;
          title: string;
          after_week?: number | null;
          green_action?: string | null;
          yellow_action?: string | null;
          red_action?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['checkpoints']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'checkpoints_plan_id_fkey';
            columns: ['plan_id'];
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
        ];
      };
      session_logs: {
        Row: {
          id: string;
          plan_id: string;
          plan_day_id: string;
          logged_at: string;
          actual_distance_km: number | null;
          actual_duration_min: number | null;
          actual_pace_text: string | null;
          actual_rpe: number | null;
          completed: boolean;
          modified: boolean;
          why_modified: string | null;
          tomorrow_change: string | null;
          traffic_light: TrafficLight | null;
          shoe_used: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id: string;
          plan_day_id: string;
          logged_at?: string;
          actual_distance_km?: number | null;
          actual_duration_min?: number | null;
          actual_pace_text?: string | null;
          actual_rpe?: number | null;
          completed?: boolean;
          modified?: boolean;
          why_modified?: string | null;
          tomorrow_change?: string | null;
          traffic_light?: TrafficLight | null;
          shoe_used?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['session_logs']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'session_logs_plan_id_fkey';
            columns: ['plan_id'];
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'session_logs_plan_day_id_fkey';
            columns: ['plan_day_id'];
            referencedRelation: 'plan_days';
            referencedColumns: ['id'];
          },
        ];
      };
      health_entries: {
        Row: {
          id: string;
          plan_id: string | null;
          plan_day_id: string | null;
          entry_date: string;
          knee_before: number | null;
          knee_during: number | null;
          knee_after: number | null;
          knee_next_morning: number | null;
          foot_status: string | null;
          calf_score: number | null;
          gait_normal: boolean | null;
          stairs_normal: boolean | null;
          pain_quality: string | null;
          modification: string | null;
          traffic_light: TrafficLight | null;
          sleep_hours: number | null;
          sleep_quality: string | null;
          resting_hr: number | null;
          hrv: number | null;
          garmin_readiness: string | null;
          energy: string | null;
          stress: string | null;
          body_mass: number | null;
          soreness: number | null;
          hydration_appetite: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id?: string | null;
          plan_day_id?: string | null;
          entry_date: string;
          knee_before?: number | null;
          knee_during?: number | null;
          knee_after?: number | null;
          knee_next_morning?: number | null;
          foot_status?: string | null;
          calf_score?: number | null;
          gait_normal?: boolean | null;
          stairs_normal?: boolean | null;
          pain_quality?: string | null;
          modification?: string | null;
          traffic_light?: TrafficLight | null;
          sleep_hours?: number | null;
          sleep_quality?: string | null;
          resting_hr?: number | null;
          hrv?: number | null;
          garmin_readiness?: string | null;
          energy?: string | null;
          stress?: string | null;
          body_mass?: number | null;
          soreness?: number | null;
          hydration_appetite?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['health_entries']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'health_entries_plan_id_fkey';
            columns: ['plan_id'];
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'health_entries_plan_day_id_fkey';
            columns: ['plan_day_id'];
            referencedRelation: 'plan_days';
            referencedColumns: ['id'];
          },
        ];
      };
      strava_connections: {
        Row: {
          id: string;
          strava_athlete_id: number | null;
          access_token: string | null;
          refresh_token: string | null;
          expires_at: string | null;
          scope: string | null;
          athlete_summary: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          strava_athlete_id?: number | null;
          access_token?: string | null;
          refresh_token?: string | null;
          expires_at?: string | null;
          scope?: string | null;
          athlete_summary?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['strava_connections']['Insert']>;
        Relationships: [];
      };
      strava_activities: {
        Row: {
          id: string;
          plan_id: string | null;
          plan_day_id: string | null;
          strava_id: number;
          name: string | null;
          sport_type: string | null;
          start_date: string | null;
          distance_m: number | null;
          moving_time_s: number | null;
          elapsed_time_s: number | null;
          average_speed: number | null;
          average_heartrate: number | null;
          max_heartrate: number | null;
          total_elevation_gain: number | null;
          map_polyline: string | null;
          raw: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_id?: string | null;
          plan_day_id?: string | null;
          strava_id: number;
          name?: string | null;
          sport_type?: string | null;
          start_date?: string | null;
          distance_m?: number | null;
          moving_time_s?: number | null;
          elapsed_time_s?: number | null;
          average_speed?: number | null;
          average_heartrate?: number | null;
          max_heartrate?: number | null;
          total_elevation_gain?: number | null;
          map_polyline?: string | null;
          raw?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['strava_activities']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'strava_activities_plan_id_fkey';
            columns: ['plan_id'];
            referencedRelation: 'plans';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'strava_activities_plan_day_id_fkey';
            columns: ['plan_day_id'];
            referencedRelation: 'plan_days';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_owner: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      bootstrap_admin_email: {
        Args: { claimed_email: string };
        Returns: undefined;
      };
    };
    Enums: {
      session_slot: SessionSlot;
      session_category: SessionCategory;
      alternative_gate: AlternativeGate;
      traffic_light: TrafficLight;
      milestone_type: MilestoneType;
    };
    CompositeTypes: Record<string, never>;
  };
}

// Convenience row aliases used across the app.
type PublicTables = Database['public']['Tables'];
export type Plan = PublicTables['plans']['Row'];
export type PlanPrivateNotes = PublicTables['plan_private_notes']['Row'];
export type PlanPrivateNotesInsert = PublicTables['plan_private_notes']['Insert'];
export type PlanPhase = PublicTables['plan_phases']['Row'];
export type PlanWeek = PublicTables['plan_weeks']['Row'];
export type PlanDay = PublicTables['plan_days']['Row'];
export type DaySession = PublicTables['day_sessions']['Row'];
export type DayAlternative = PublicTables['day_alternatives']['Row'];
export type Milestone = PublicTables['milestones']['Row'];
export type Checkpoint = PublicTables['checkpoints']['Row'];
export type SessionLog = PublicTables['session_logs']['Row'];
export type SessionLogInsert = PublicTables['session_logs']['Insert'];
export type HealthEntry = PublicTables['health_entries']['Row'];
export type HealthEntryInsert = PublicTables['health_entries']['Insert'];
export type StravaConnection = PublicTables['strava_connections']['Row'];
export type StravaActivity = PublicTables['strava_activities']['Row'];
export type AppSetting = PublicTables['app_settings']['Row'];
