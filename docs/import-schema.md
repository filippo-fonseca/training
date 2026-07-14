# Plan import schema (version 1)

The admin importer (`/admin/import`) accepts a single JSON object describing one
training plan and everything under it: phases, weeks, days, both session slots
per day, symptom-gated alternatives, milestones, and traffic-light checkpoints.

The file is validated with readable, path-qualified errors, previewed as a
dry-run (row counts, and whether it creates a new plan or replaces an existing
one), and only written when you confirm. A working example lives at
`data/samples/sample-plan.json`.

## How parents are referenced

The JSON never contains database UUIDs. Instead:

- `weeks[].phase_index` points at a `phases[].phase_index`.
- `days[].week_index` points at a `weeks[].week_index`.

On apply, those indices are resolved to the real foreign keys. Every index used
by a child must exist among its parents, or validation fails.

## Create vs replace

The plan is keyed by `plan.slug`. If no plan has that slug, the import creates a
new one. If a plan with that slug already exists, applying deletes it and
everything under it (a cascade), then imports the JSON fresh. The preview tells
you which of the two will happen before you commit.

## Conventions

- `version` must be exactly `1`.
- Dates are calendar dates in `YYYY-MM-DD` form (no timezone). Times are `HH:MM`.
- Distances are kilometers; paces are seconds per kilometer where numeric.
- Every field marked optional may be omitted or set to `null`. Omitted text
  becomes `null` (not an empty string). Omitted booleans default to `false`.
- Targets are ranges or free text in the source material, so each session keeps
  both the raw text (`pace_text`, `duration_text`, `rpe_text`, `hr_text`) and the
  parsed numeric bounds. Provide whichever you have; the raw text is authoritative.

## Top-level object

| Field         | Type              | Required | Notes                                   |
| ------------- | ----------------- | -------- | --------------------------------------- |
| `version`     | number            | yes      | Must be `1`.                            |
| `plan`        | object            | yes      | See "plan" below.                       |
| `phases`      | array of objects  | no       | Defaults to empty.                      |
| `weeks`       | array of objects  | no       | Defaults to empty.                      |
| `days`        | array of objects  | no       | Defaults to empty.                      |
| `milestones`  | array of objects  | no       | Defaults to empty.                      |
| `checkpoints` | array of objects  | no       | Defaults to empty.                      |

## plan

The root record. `slug` and `title` are required; everything else is optional.

| Field               | Type    | Required | Notes                                                |
| ------------------- | ------- | -------- | ---------------------------------------------------- |
| `slug`              | string  | yes      | Lowercase letters, numbers, and hyphens. The key.    |
| `title`             | string  | yes      | Display title.                                       |
| `version`           | integer | no       | Defaults to `1`.                                     |
| `status`            | string  | no       | `active`, `draft`, or `archived`. Defaults `active`. |
| `prepared_on`       | date    | no       |                                                      |
| `athlete_name`      | string  | no       |                                                      |
| `athlete_age`       | integer | no       |                                                      |
| `athlete_notes`     | string  | no       |                                                      |
| `race_name`         | string  | no       |                                                      |
| `race_distance_km`  | number  | no       | Keep race distance a field; never assume "marathon". |
| `race_date`         | date    | no       |                                                      |
| `race_start_time`   | string  | no       | `HH:MM`.                                              |
| `race_location`     | string  | no       |                                                      |
| `race_course_notes` | string  | no       |                                                      |
| `start_date`        | date    | no       | Plan span start.                                     |
| `end_date`          | date    | no       | Plan span end (often race day).                      |
| `total_planned_km`  | number  | no       |                                                      |
| `north_star`        | string  | no       | One-line goal.                                       |
| `plan_logic`        | string  | no       | Rationale prose.                                     |
| `medical_notes`     | string  | no       |                                                      |
| `goal_a`            | string  | no       | A goal (free text).                                  |
| `goal_b`            | string  | no       | B goal.                                              |
| `goal_c`            | string  | no       | C goal.                                              |

## phases[]

Training blocks spanning one or more weeks.

| Field         | Type    | Required | Notes                          |
| ------------- | ------- | -------- | ------------------------------ |
| `phase_index` | integer | yes      | Unique within the file.        |
| `name`        | string  | yes      |                                |
| `start_week`  | integer | no       |                                |
| `end_week`    | integer | no       |                                |
| `description` | string  | no       |                                |

## weeks[]

One row per plan week.

| Field                | Type    | Required | Notes                                          |
| -------------------- | ------- | -------- | ---------------------------------------------- |
| `week_index`         | integer | yes      | Unique within the file.                        |
| `phase_index`        | integer | no       | Must match a `phases[].phase_index` if present.|
| `phase_label`        | string  | no       | Per-week phase label.                          |
| `planned_km`         | number  | no       | Ceiling, not a floor to chase.                 |
| `range_min_km`       | number  | no       | Acceptable range lower bound.                  |
| `range_max_km`       | number  | no       | Acceptable range upper bound.                  |
| `run_days`           | integer | no       |                                                |
| `long_run_km`        | number  | no       |                                                |
| `previous_text`      | string  | no       | Free text, e.g. "rehab" or "16.0 km".          |
| `pct_change_text`    | string  | no       | Free text, e.g. "+25%" or "baseline".          |
| `coaching_note`      | string  | no       |                                                |
| `performance_target` | string  | no       |                                                |
| `injury_target`      | string  | no       |                                                |
| `bike_note`          | string  | no       |                                                |
| `strength_note`      | string  | no       |                                                |
| `is_cutback`         | boolean | no       | Defaults `false`.                              |
| `is_taper`           | boolean | no       | Defaults `false`.                              |
| `is_race_week`       | boolean | no       | Defaults `false`.                              |
| `is_peak`            | boolean | no       | Defaults `false`.                              |

## days[]

One row per day. Each day has a `sessions` array (up to one `primary` and one
`secondary` slot) and an `alternatives` array (up to one per gate).

| Field            | Type    | Required | Notes                                       |
| ---------------- | ------- | -------- | ------------------------------------------- |
| `week_index`     | integer | yes      | Must match a `weeks[].week_index`.          |
| `date`           | date    | yes      | Unique within the file.                     |
| `day_index`      | integer | yes      | Unique within the file, e.g. 1..98.         |
| `weekday`        | string  | no       | e.g. "Mon".                                 |
| `days_to_race`   | integer | no       | Countdown (derivable; stored as authored).  |
| `week_number`    | integer | no       |                                             |
| `phase_label`    | string  | no       |                                             |
| `planned_run_km` | number  | no       | Today's run km. Defaults `0` on non-run days.|
| `cumulative_km`  | number  | no       |                                             |
| `sessions`       | array   | no       | See "sessions" below.                       |
| `alternatives`   | array   | no       | See "alternatives" below.                   |

### days[].sessions[]

Two slots per day. The `primary` slot is the main session and carries the full
attribute set; the `secondary` slot names a strength/mobility/logistics item and
typically uses only `title`, `role`, and `prescription_text`.

| Field                  | Type    | Required | Notes                                                      |
| ---------------------- | ------- | -------- | ---------------------------------------------------------- |
| `slot`                 | string  | yes      | `primary` or `secondary`. At most one of each per day.     |
| `title`                | string  | yes      | Session name (primary) or template name (secondary).       |
| `category`             | string  | no       | One of `easy_run`, `long_run`, `quality_run`, `bike`, `strength_only`, `rest`, `race`. |
| `is_quality`           | boolean | no       | Defaults `false`.                                          |
| `role`                 | string  | no       | "Today's role" rationale.                                  |
| `prescription_text`    | string  | no       | Exact prescription. May reference green/yellow/red text.   |
| `distance_km`          | number  | no       | Runs only; null for bike/rest.                             |
| `duration_text`        | string  | no       | e.g. "55-60 min".                                          |
| `duration_min_minutes` | integer | no       | Parsed lower bound.                                        |
| `duration_max_minutes` | integer | no       | Parsed upper bound.                                        |
| `pace_text`            | string  | no       | e.g. "5:05-5:40/km", "Bike by RPE", "n/a".                 |
| `pace_min_s_per_km`    | integer | no       | Parsed lower bound, seconds per km.                        |
| `pace_max_s_per_km`    | integer | no       | Parsed upper bound, seconds per km.                        |
| `rpe_text`             | string  | no       | e.g. "2/10", "7-8/10 on reps".                             |
| `hr_text`              | string  | no       | e.g. "135-158 bpm", "n/a", "secondary".                    |
| `terrain`              | string  | no       |                                                            |
| `cue`                  | string  | no       | Form cue.                                                  |
| `fuel`                 | string  | no       |                                                            |
| `shoes`                | string  | no       |                                                            |
| `completion_planned`   | string  | no       | Restated planned distance/pace/RPE.                        |

### days[].alternatives[]

Symptom-gated alternative prescriptions, for example "green: full run, yellow:
shorten, red: no run". At most one per gate per day.

| Field          | Type    | Required | Notes                                  |
| -------------- | ------- | -------- | -------------------------------------- |
| `gate`         | string  | yes      | `green`, `yellow`, or `red`. Unique per day. |
| `prescription` | string  | yes      | What to do at this gate.               |
| `distance_km`  | number  | no       | Resulting distance, if a run.          |

## milestones[]

Key events across the plan.

| Field             | Type    | Required | Notes                                            |
| ----------------- | ------- | -------- | ------------------------------------------------ |
| `milestone_index` | integer | yes      | Unique within the file.                          |
| `type`            | string  | yes      | One of `decision_checkpoint`, `gated_long_run`, `key_workout`, `taper_start`, `race`, `cutback_week`, `post_race`. |
| `title`           | string  | yes      |                                                  |
| `date`            | date    | no       |                                                  |
| `week_number`     | integer | no       |                                                  |
| `description`     | string  | no       |                                                  |
| `green_criteria`  | string  | no       |                                                  |
| `yellow_criteria` | string  | no       |                                                  |
| `red_criteria`    | string  | no       |                                                  |

## checkpoints[]

The formal traffic-light decision points (for example after weeks 3, 7, 9, 12).

| Field              | Type    | Required | Notes                        |
| ------------------ | ------- | -------- | ---------------------------- |
| `checkpoint_index` | integer | yes      | Unique within the file.      |
| `title`            | string  | yes      |                              |
| `after_week`       | integer | no       | The week this follows.       |
| `green_action`     | string  | no       |                              |
| `yellow_action`    | string  | no       |                              |
| `red_action`       | string  | no       |                              |

## Validation rules, at a glance

- `version` must equal `1`; `plan.slug` must be lowercase-hyphenated; `plan.title`
  is required.
- `phase_index`, `week_index`, `day_index`, `date`, `milestone_index`, and
  `checkpoint_index` must each be unique within their array.
- Every `weeks[].phase_index` must match a phase; every `days[].week_index` must
  match a week.
- A day may have at most one `primary` and one `secondary` session, and at most
  one alternative per gate.
- Enum fields (`slot`, `category`, `gate`, milestone `type`) must be one of the
  listed values.

All problems are reported together with a JSON path (for example
`days[3].sessions[0].pace_min_s_per_km: must be an integer`) so you can fix the
file in one pass.
