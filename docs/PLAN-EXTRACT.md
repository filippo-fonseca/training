# Plan extract: Baystate 2026 (Final_Plan_v1_Jul_12)

## Race

- **Event:** Baystate Marathon weekend, Lowell, MA; the athlete races the **Baystate HALF Marathon (21.1 km)**, not the full marathon. Important: do not hardcode "marathon" as the distance.
- **Date:** Sunday, October 18, 2026, 8:00 AM start (shared start with the marathon, no waves).
- **Athlete:** Filippo, age 20, HM PR 1:23:30, recorded HR max ~202 bpm. Returning from probable patellofemoral pain (left knee) plus prior right-foot/plantar and calf issues.
- **Goals (A/B/C, selected Oct 5-11):** A = sub-1:22 (3:53/km); B = PR under 1:23:30 (~3:57-3:58/km); C = healthy controlled race by RPE. Full cumulative split tables for A and B at 5/10/15/20 km and per-km/per-mile.
- **Longer arc:** the half is a bridge toward a spring 2027 marathon (BQ.2, April 11, 2027), with a post-race recovery and winter-base protocol included.

## Plan span

- **Start:** Monday, July 13, 2026. **End:** Sunday, October 18, 2026 (race day).
- **14 weeks, exactly 98 daily pages** (validated: no missing/duplicate dates, 7 days per week).
- **Phases (per-week labels):**
  1. Weeks 1-3: Return to normal running (16, 20, 25 km)
  2. Week 4: Durability and economy (30 km)
  3. Week 5: Durability and threshold foundation (35 km)
  4. Week 6: Durability cutback (31 km)
  5. Weeks 7-8: Threshold development (40, 45 km)
  6. Week 9: Specific-prep cutback (41 km)
  7. Week 10: Half-marathon development (54 km)
  8. Week 11: Half-marathon specificity (57 km)
  9. Week 12: Peak and race specificity (58 km, peak)
  10. Week 13: Taper (43 km)
  11. Week 14: Race week (34.1 km incl. race)
- Weekly planned km: [16, 20, 25, 30, 35, 31, 40, 45, 41, 54, 57, 58, 43, 34.1]; total 529.1 km. Every week also has an acceptable **range** (e.g. 46-54 km); planned distance is a ceiling, never a floor to chase.
- Long-run progression: [5.2, 7, 8, 10, 12, 9, 14, 16, 13, 21.1, 18, 20, 14, 21.1(race)].
- Run frequency progression: 4 -> 5 -> 6 -> (taper) 5 -> 4 days/week.

## Weekly structure

Typical week (Mon-Sun):
- **Mon:** recovery/easy run + Upper A strength
- **Tue:** quality day: early weeks bike threshold/VO2 + Lower A; from week 5 onward run threshold / HM-specific intervals (+ lower strength on adjacent days)
- **Wed:** easy run + Upper B
- **Thu:** easy run or easy bike + Lower B (later weeks: second easy run, strides)
- **Fri:** easy run + Upper C (weeks 11+: short fartlek/strides)
- **Sat:** rest or recovery bike + mobility/rehab
- **Sun:** long run (no lifting)

Each day carries exactly one **primary session** and one **secondary training** item (strength template, mobility, rest instructions, or race logistics), plus fixed fill-in forms: injury checkpoint, recovery tracking, completion tracking, and a traffic-light footer.

## Session-type taxonomy (44 distinct primary session names, 98 pages)

Groupable into categories:

1. **Easy/recovery runs:** Easy return run (3), Recovery run (12), Easy run (11), Easy run + lower (8), Easy run + lower maintenance (2), Easy + strides (6), Easy run + strides (1), Easy + optional strides (1)
2. **Long runs:** Easy long run (7), Cutback long run (2), Long run with steady finish (1), Taper long run (1), **21.1 km easy confidence run** (1, gated), **Conditional second long run** (1, gated 20 km)
3. **Quality runs:** Controlled fartlek (1), Intro threshold (1), Threshold (2), Threshold cruise intervals (1), Easy-to-steady progression (1), Progression (1), HM-specific intervals (1: 3x2 km @ HM), Peak HM-specific session (1: 2x4 km @ HM), 10K-supportive fartlek (1), HM pace reminder (1: 4x1 km @ HM), Race-rhythm tune-up (1: 3x800 m @ HM)
4. **Cross-training (bike):** Bike threshold (1), Bike threshold + lower (1), Bike VO2 + lower (1), Easy bike + lower (1), Easy bike + upper (1), Easy bike (1), Easy bike / rest (3), Recovery bike + mobility (1), Recovery bike / rest (1)
5. **Strength-only days:** No run - strength (1), No run - upper (2), No run - lower (2), No run - upper + easy bike (1)
6. **Rest:** Rest (6), Rest + mobility (2), Rest + logistics (1), Rest / shakeout choice (1), Rest / short recovery bike (1)
7. **Race:** BAYSTATE HALF MARATHON (1)

**Attributes every daily primary session carries** (uniform schema, validated):
- date, weekday, week number, phase, day index (X/98), days-to-race countdown
- week plan km, week range, cumulative km after today, today's run km (0.0 on non-run days)
- "Today's role" rationale paragraph
- exact prescription (free text, may embed green/yellow/red alternatives)
- targets: Pace (range or qualitative), RPE (x/10, may differ for reps vs base), HR guide (bpm range or "n/a"/"secondary"), Time (duration range)
- terrain + form cue; fuel + shoes (with fill-in "shoe used" blank); constant weather rule
- secondary training (references one of 7 named strength/mobility templates or free text)
- completion block restating planned distance/pace/RPE with actual fill-ins

**Secondary-training templates:** Upper A/B/C, Lower A/B, Lower maintenance, Mobility/rehab (fixed exercise prescriptions, sets x reps, RPE caps); race-week variants ("Upper A reduced 2 sets, RPE 6") and logistics items.

**Weekly summary attributes:** planned km, range, previous week km, % change, run days, long run km, coaching note, 7-day overview table, performance target, injury-management target, bike hours cap, strength session count, reflection form.

## Milestones

1. **Decision checkpoint after Week 3** (early Aug): green -> begin controlled fartlek; yellow -> repeat Week 3; red -> clinical review.
2. **Decision checkpoint after Week 7** (late Aug): 40 km / 14 km long / threshold absorbed?
3. **Decision checkpoint after Week 9** (mid-Sep): gates Week 10's 21.1 km run.
4. **Decision checkpoint after Week 12** (early Oct): A/B/C goal selection and taper shape.
5. **Cutback weeks:** Week 6 (31 km) and Week 9 (41 km).
6. **First full-distance run:** Sun Sep 20, 21.1 km easy confidence run - GREEN GATE ONLY (yellow: 16-18 km; red: no run).
7. **Peak HM-specific session:** Tue Sep 29, 2x4 km @ HM effort.
8. **Conditional second long run:** Sun Oct 4, 20 km - green-gated (yellow: 18 km easy; red: no run/bike).
9. **Taper start:** Mon Oct 5 (Week 13); race-rhythm tune-up Tue Oct 13.
10. **Race day:** Sun Oct 18. No tune-up races; the only race is the goal race.
Plus formal per-week traffic-light governance (GREEN/YELLOW/RED definitions + retained return-protocol soreness rules) and post-race protocol (72 h / days 4-7 / week 2 / winter-base entry criteria).

## Pace/zone tables and athlete parameters

- 7 intensity zones (Recovery, Easy/Z2, Long, Steady, Threshold, HM-specific, 10K support), each with RPE range, **evolving pace** (early vs later plan values, e.g. Easy 5:05-5:40 -> 4:45-5:15/km; Threshold 4:18 -> 3:58-4:05/km), HR guide, purpose/cue.
- HR max ~202; HR is explicitly a post-hoc sense check, RPE governs. Cadence guidance (natural 170-180, no forced target).
- A/B goal split tables (cumulative km and mile splits) and race execution segments (km 0-3, 3-10, 10-15, 15-20, final 1.1).
- Fueling matrix by session class (easy <60 min, quality 45-75, long 75-120, race) with carb g/h and fluid mL/h.
- Baystate logistics: bib pickup, expo times, parking, water stops at half-specific miles, course description.

## Validation.txt findings

All programmed checks PASS: 98 days, correct date range (2026-07-13..2026-10-18), no duplicate/missing dates, 7 days per week, every daily record complete (workout, distance/duration, RPE, HR, secondary work, rationale, injury/recovery/completion schemas), weekly mileage equals sum of daily distances, race on Sun Oct 18, one 21.1 km training run (Sep 20) plus explicitly conditional second 20 km run, no back-to-back hard sessions, no heavy lower strength before key runs, logical long-run progression with cutbacks, peak volume below provisional 68 km, taper decreases (58 -> 43 -> 13 pre-race), cycling declines as run quality rises, race-specific work only in final third (from week 11), rest present weekly, paces match session purpose. Document QA: 130 pages = 18 front matter + 14 weekly + 98 daily; 547 tables geometry-checked; 3 charts with alt text. Notes: gated runs intentionally reduce actual distance; the plan is coaching, not medical diagnosis.

## Recommended relational data model (general, not Baystate-specific)

- **athletes**(id, name, birth_year, notes) + **athlete_metrics**(athlete_id, key, value; e.g. hr_max=202, hm_pr=1:23:30)
- **races**(id, name, event_name, distance_km, date, start_time, location, course_notes, logistics_json)
- **plans**(id, athlete_id, race_id, title, version, prepared_on, start_date, end_date, north_star, plan_logic, medical_notes, total_planned_km, status)
- **plan_sections**(id, plan_id, kind [how_to_use|traffic_light|evidence|strength_system|fueling|logistics|race_execution|post_race|references], order, title, body_md) - preserves rich front matter generically
- **intensity_zones**(id, plan_id, name, rpe_min, rpe_max, pace_early, pace_late, hr_guide, purpose)
- **plan_weeks**(id, plan_id, week_index, start_date, end_date, phase, planned_km, range_min_km, range_max_km, run_days, long_run_km, pct_change, coaching_note, performance_target, injury_target, bike_hours_cap, strength_sessions, flags [is_cutback,is_taper,is_race_week,is_peak])
- **session_types**(id, name, category [easy_run|long_run|quality_run|bike|strength_only|rest|race], is_quality bool)
- **workout_templates**(id, plan_id, name [Upper A, Lower B, Mobility...], kind [upper|lower|mobility|other], prescription, rpe_cap) - reusable secondary-training blocks
- **plan_days**(id, week_id, date, day_index, days_to_race, planned_run_km, cumulative_km, session_type_id, session_title, role, prescription, pace_text, pace_min_s_per_km, pace_max_s_per_km, rpe_text, hr_text, duration_text, terrain, cue, fuel, shoes, secondary_template_id nullable, secondary_text, weather_rule_id)
- **day_alternatives**(id, plan_day_id, gate [green|yellow|red], prescription, distance_km) - models "GREEN GATE ONLY / Yellow: 16-18 km / Red: no run"
- **milestones**(id, plan_id, week_id nullable, date nullable, type [decision_checkpoint|gated_long_run|key_workout|taper_start|race|cutback_week], title, green_criteria, yellow_criteria, red_criteria)
- **race_goals**(id, plan_id, label [A|B|C], target_time, target_pace_s_per_km, selection_criteria) + **race_splits**(goal_id, unit [km|mi], point, cumulative_time, avg_pace)
- **daily_logs**(id, plan_day_id, actual_km, actual_pace, actual_rpe, completed bool, modified bool, why_modified, tomorrow_change, traffic_light [G|Y|R], knee_before, knee_during, knee_after, knee_next_morning, foot_status, calf_score, gait_normal, stairs_normal, pain_quality, modification, sleep_h, sleep_quality, resting_hr, hrv, garmin_readiness, energy, stress, body_mass, soreness, hydration_appetite, notes, shoe_used)
- **weekly_logs**(id, week_id, actual_km, green_days, yellow_days, red_days, long_run_response, best_session, knee_trend, foot_trend, calf_trend, readiness_trend, next_week_decision [progress|hold|reduce])

### Modeling wrinkles worth flagging

1. **Two workouts per day, always:** primary session + secondary training (strength/mobility/logistics). Model as a day with slots, not one workout.
2. **Ceilings and ranges everywhere:** weekly plan is a ceiling with an acceptable range; pace/RPE/HR/time are ranges or free text ("Bike by RPE", "n/a"). Keep raw text alongside parsed numeric min/max.
3. **Symptom-gated conditionals:** several sessions have green/yellow/red alternative prescriptions with different distances; "actual lower than planned = success" must be representable (day_alternatives + traffic light in logs).
4. **Cross-training is duration-based** (bike minutes/RPE/cadence), run days are distance-based; race day is a race with its own goal/splits machinery. Category on session_types handles this.
5. **Zones evolve over time** (early vs later paces) rather than being static; store both or version zones by plan segment.
6. **Countdown + cumulative fields** (day X/98, days to race, cumulative km) are derivable; compute, don't store as source of truth (source doc precomputes them).
7. **The "marathon plan" is actually a half-marathon plan** attached to a marathon-branded event and bridging to a future marathon; keep race distance a field, and allow plan -> next-plan linkage (post-race bridge/winter base).
8. **Rich static prose** (evidence with 18 citations, logistics, contingencies, fueling) belongs in ordered plan_sections rather than dedicated columns, to stay general.
