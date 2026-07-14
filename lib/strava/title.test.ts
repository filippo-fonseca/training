import { test } from 'node:test';
import assert from 'node:assert/strict';
import { englishTitle } from './title';
import { toActivityEvidence } from '@/lib/derive/session-evidence';
import type { StravaActivity } from '@/lib/types/database';

// --- Required Portuguese Run examples (pt/pt-BR) --------------------------------
test('pt: Corrida time-of-day defaults translate to English Run defaults', () => {
  assert.equal(englishTitle('Corrida ao entardecer'), 'Evening Run');
  assert.equal(englishTitle('Corrida matinal'), 'Morning Run');
  assert.equal(englishTitle('Corrida na hora do almoço'), 'Lunch Run');
  assert.equal(englishTitle('Corrida à tarde'), 'Afternoon Run');
  assert.equal(englishTitle('Corrida noturna'), 'Night Run');
});

// --- pt-BR prepositional daypart variants (DEF-TITLE-1) ------------------------
test('pt-BR: "da <daypart>" / "à noite" defaults translate to English', () => {
  assert.equal(englishTitle('Corrida da tarde'), 'Afternoon Run');
  assert.equal(englishTitle('Pedalada da tarde'), 'Afternoon Ride');
  assert.equal(englishTitle('Corrida da manhã'), 'Morning Run');
  assert.equal(englishTitle('Treino da noite'), 'Night Workout');
  // "da madrugada" (pre-dawn) is not a Strava default: pass through verbatim.
  assert.equal(englishTitle('Corrida da madrugada'), 'Corrida da madrugada');
});

// --- Other required locale Run examples ----------------------------------------
test('es: Carrera por la mañana -> Morning Run', () => {
  assert.equal(englishTitle('Carrera por la mañana'), 'Morning Run');
});

test('fr: Course à pied dans l\'après-midi -> Afternoon Run', () => {
  assert.equal(englishTitle("Course à pied dans l'après-midi"), 'Afternoon Run');
});

test('de: Lauf am Morgen -> Morning Run', () => {
  assert.equal(englishTitle('Lauf am Morgen'), 'Morning Run');
});

test('it: Corsa serale -> Evening Run', () => {
  assert.equal(englishTitle('Corsa serale'), 'Evening Run');
});

// --- Ride family across locales -------------------------------------------------
test('Ride defaults translate across locales', () => {
  assert.equal(englishTitle('Pedalada noturna'), 'Night Ride'); // pt
  assert.equal(englishTitle('Ciclismo por la tarde'), 'Afternoon Ride'); // es
  assert.equal(englishTitle('Vélo dans la soirée'), 'Evening Ride'); // fr
  assert.equal(englishTitle('Radfahrt am Morgen'), 'Morning Ride'); // de
  assert.equal(englishTitle('Pedalata mattutina'), 'Morning Ride'); // it
});

// --- Walk / Weight Training families -------------------------------------------
test('Walk and Weight Training defaults translate', () => {
  assert.equal(englishTitle('Caminhada matinal'), 'Morning Walk'); // pt
  assert.equal(englishTitle('Caminata por la noche'), 'Night Walk'); // es
  assert.equal(englishTitle('Krafttraining am Abend'), 'Evening Weight Training'); // de
  assert.equal(englishTitle('Musculation le matin'), 'Morning Weight Training'); // fr
});

// --- Passthrough: custom titles -------------------------------------------------
test('custom titles pass through verbatim', () => {
  assert.equal(englishTitle('Baystate tune-up 5k'), 'Baystate tune-up 5k');
  assert.equal(englishTitle('Long run with the crew'), 'Long run with the crew');
});

// --- Passthrough: already-English defaults -------------------------------------
test('already-English defaults are unchanged', () => {
  assert.equal(englishTitle('Evening Run'), 'Evening Run');
  assert.equal(englishTitle('Morning Ride'), 'Morning Ride');
  assert.equal(englishTitle('Lunch Walk'), 'Lunch Walk');
});

// --- Passthrough: unknown patterns / case sensitivity --------------------------
test('unknown or wrong-case strings pass through (no fuzzy matching)', () => {
  assert.equal(englishTitle('corrida noturna'), 'corrida noturna'); // wrong case
  assert.equal(englishTitle('Corrida'), 'Corrida'); // no time-of-day
  assert.equal(englishTitle('Recovery jog'), 'Recovery jog');
});

// --- Null safety ----------------------------------------------------------------
test('null and undefined yield null', () => {
  assert.equal(englishTitle(null), null);
  assert.equal(englishTitle(undefined), null);
  assert.equal(englishTitle(''), '');
});

// --- Integration: toActivityEvidence emits the translated title -----------------
test('toActivityEvidence projects the English-translated title', () => {
  const row = {
    id: 'a1',
    strava_id: 555,
    name: 'Corrida ao entardecer',
    photo_url: null,
    distance_m: 5000,
    moving_time_s: 1500,
    elapsed_time_s: 1600,
    start_date: '2026-07-14T22:00:00Z',
    sport_type: 'Run',
  } as unknown as StravaActivity;
  const ev = toActivityEvidence(row);
  assert.equal(ev.name, 'Evening Run');
  // A custom title still passes through the projection verbatim.
  const custom = toActivityEvidence({ ...row, name: 'Baystate tune-up 5k' } as StravaActivity);
  assert.equal(custom.name, 'Baystate tune-up 5k');
});
