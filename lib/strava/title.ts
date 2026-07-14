/**
 * Deterministic English display filter for Strava activity titles.
 *
 * Strava auto-generates a default title for every activity in the athlete's
 * locale, e.g. "Corrida ao entardecer" (pt) or "Lauf am Morgen" (de). This
 * module translates ONLY those known auto-generated defaults back to Strava's
 * English defaults ("Evening Run", "Morning Run", ...) so every surface reads
 * in English regardless of the account locale.
 *
 * It is display-only and never touches stored data, sync, or the DB. Matching
 * is EXACT-STRING and case-sensitive against the known default set (never
 * fuzzy): a custom title, an already-English default, or any unrecognized
 * string passes through verbatim. When in doubt, pass through.
 *
 * The lookup table below is generated from a small, auditable set of per-locale
 * nouns and time-of-day forms; each locale block is commented with its locale.
 */

/** Activity families Strava emits localized defaults for. */
type Activity = 'Run' | 'Ride' | 'Walk' | 'Swim' | 'Hike' | 'Workout' | 'WeightTraining';

/** Strava's five time-of-day buckets (morning, lunch, afternoon, evening/dusk, night). */
type Tod = 'morning' | 'lunch' | 'afternoon' | 'evening' | 'night';

/** English default noun per activity family (the canonical target text). */
const EN_ACTIVITY: Record<Activity, string> = {
  Run: 'Run',
  Ride: 'Ride',
  Walk: 'Walk',
  Swim: 'Swim',
  Hike: 'Hike',
  Workout: 'Workout',
  WeightTraining: 'Weight Training',
};

/** English default time-of-day prefix per bucket. */
const EN_TOD: Record<Tod, string> = {
  morning: 'Morning',
  lunch: 'Lunch',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

/** The English default title for one (activity, time-of-day) pair. */
function englishDefault(activity: Activity, tod: Tod): string {
  return `${EN_TOD[tod]} ${EN_ACTIVITY[activity]}`;
}

/**
 * The exact-match translation table: foreign default title -> English default.
 * Built once at module load. Keys are the precise strings Strava emits (accents,
 * apostrophes, and casing preserved).
 */
const TRANSLATIONS: Record<string, string> = {};

/** Register `source -> englishDefault(activity, tod)`. First writer wins so a
 *  string shared across locales keeps its (identical) English target. */
function add(source: string, activity: Activity, tod: Tod): void {
  if (!(source in TRANSLATIONS)) TRANSLATIONS[source] = englishDefault(activity, tod);
}

// ---------------------------------------------------------------------------
// Portuguese (pt-PT / pt-BR). Adjectival forms agreeing with the noun's gender.
// Nouns are feminine except "Treino" (m). "matinal" and the "na hora do almoço"
// / "à tarde" / "ao entardecer" phrases are gender-invariant; only "noturno/a"
// inflects. Required examples: "Corrida matinal", "Corrida na hora do almoço",
// "Corrida à tarde", "Corrida ao entardecer", "Corrida noturna".
// ---------------------------------------------------------------------------
{
  const feminine: Array<[string, Activity]> = [
    ['Corrida', 'Run'],
    ['Pedalada', 'Ride'],
    ['Caminhada', 'Walk'],
    ['Natação', 'Swim'],
    ['Trilha', 'Hike'],
  ];
  for (const [noun, activity] of feminine) {
    add(`${noun} matinal`, activity, 'morning');
    add(`${noun} na hora do almoço`, activity, 'lunch');
    add(`${noun} à tarde`, activity, 'afternoon');
    add(`${noun} ao entardecer`, activity, 'evening');
    add(`${noun} noturna`, activity, 'night');
  }
  // "Treino" (Workout) is masculine: night form is "noturno".
  add('Treino matinal', 'Workout', 'morning');
  add('Treino na hora do almoço', 'Workout', 'lunch');
  add('Treino à tarde', 'Workout', 'afternoon');
  add('Treino ao entardecer', 'Workout', 'evening');
  add('Treino noturno', 'Workout', 'night');
}

// ---------------------------------------------------------------------------
// Spanish (es). Pattern: "<Noun> <daypart>" with invariant daypart phrases.
// Required example: "Carrera por la mañana" -> "Morning Run".
// ---------------------------------------------------------------------------
{
  const nouns: Array<[string, Activity]> = [
    ['Carrera', 'Run'],
    ['Ciclismo', 'Ride'],
    ['Caminata', 'Walk'],
    ['Natación', 'Swim'],
    ['Senderismo', 'Hike'],
    ['Entrenamiento', 'Workout'],
  ];
  const dayparts: Array<[string, Tod]> = [
    ['por la mañana', 'morning'],
    ['a mediodía', 'lunch'],
    ['por la tarde', 'afternoon'],
    ['al atardecer', 'evening'],
    ['por la noche', 'night'],
  ];
  for (const [noun, activity] of nouns) {
    for (const [phrase, tod] of dayparts) add(`${noun} ${phrase}`, activity, tod);
  }
}

// ---------------------------------------------------------------------------
// French (fr). Pattern: "<Noun> <daypart>". Ride is "Vélo".
// Required example: "Course à pied dans l'après-midi" -> "Afternoon Run".
// ---------------------------------------------------------------------------
{
  const nouns: Array<[string, Activity]> = [
    ['Course à pied', 'Run'],
    ['Vélo', 'Ride'],
    ['Marche', 'Walk'],
    ['Natation', 'Swim'],
    ['Randonnée', 'Hike'],
    ['Entraînement', 'Workout'],
    ['Musculation', 'WeightTraining'],
  ];
  const dayparts: Array<[string, Tod]> = [
    ['le matin', 'morning'],
    ['le midi', 'lunch'],
    ["dans l'après-midi", 'afternoon'],
    ['dans la soirée', 'evening'],
    ['dans la nuit', 'night'],
  ];
  for (const [noun, activity] of nouns) {
    for (const [phrase, tod] of dayparts) add(`${noun} ${phrase}`, activity, tod);
  }
}

// ---------------------------------------------------------------------------
// German (de). Pattern: "<Noun> <daypart>". Ride is "Radfahrt"; Weight Training
// is "Krafttraining". Required example: "Lauf am Morgen" -> "Morning Run".
// ---------------------------------------------------------------------------
{
  const nouns: Array<[string, Activity]> = [
    ['Lauf', 'Run'],
    ['Radfahrt', 'Ride'],
    ['Spaziergang', 'Walk'],
    ['Schwimmen', 'Swim'],
    ['Wanderung', 'Hike'],
    ['Training', 'Workout'],
    ['Krafttraining', 'WeightTraining'],
  ];
  const dayparts: Array<[string, Tod]> = [
    ['am Morgen', 'morning'],
    ['am Mittag', 'lunch'],
    ['am Nachmittag', 'afternoon'],
    ['am Abend', 'evening'],
    ['in der Nacht', 'night'],
  ];
  for (const [noun, activity] of nouns) {
    for (const [phrase, tod] of dayparts) add(`${noun} ${phrase}`, activity, tod);
  }
}

// ---------------------------------------------------------------------------
// Italian (it). Adjectival forms agreeing with the noun's gender. Nouns are
// feminine except "Allenamento" (m). "serale" is gender-invariant; the others
// inflect (mattutino/a, pomeridiano/a, notturno/a). Lunch is the phrase
// "all'ora di pranzo". Required example: "Corsa serale" -> "Evening Run".
// ---------------------------------------------------------------------------
{
  const feminine: Array<[string, Activity]> = [
    ['Corsa', 'Run'],
    ['Pedalata', 'Ride'],
    ['Camminata', 'Walk'],
    ['Nuotata', 'Swim'],
    ['Escursione', 'Hike'],
  ];
  for (const [noun, activity] of feminine) {
    add(`${noun} mattutina`, activity, 'morning');
    add(`${noun} all'ora di pranzo`, activity, 'lunch');
    add(`${noun} pomeridiana`, activity, 'afternoon');
    add(`${noun} serale`, activity, 'evening');
    add(`${noun} notturna`, activity, 'night');
  }
  // "Allenamento" (Workout) is masculine.
  add('Allenamento mattutino', 'Workout', 'morning');
  add("Allenamento all'ora di pranzo", 'Workout', 'lunch');
  add('Allenamento pomeridiano', 'Workout', 'afternoon');
  add('Allenamento serale', 'Workout', 'evening');
  add('Allenamento notturno', 'Workout', 'night');
}

/**
 * Translate a Strava auto-generated default title from a non-English locale to
 * Strava's English default. Everything else (custom titles, already-English
 * defaults, unknown patterns) passes through verbatim. Null/undefined in yields
 * null out.
 */
export function englishTitle(name: string | null | undefined): string | null {
  if (name == null) return null;
  return TRANSLATIONS[name] ?? name;
}
