// Tests für `onlyFinal` (M20.1, Aufgabe BN): ein Schritt läuft nur im
// Endgegner-Kampf - oder nur außerhalb davon.
//
// Der ganze Befund aus Partie 11 ist eine **Protokollzeile**: der Schritt
// `place_card "$SHERIFF"` meldete in Kampf 1 und 2 `skipped: $SHERIFF is not
// bound` und schwieg genau dort, wo es darauf ankam. Deshalb prüfen diese
// Tests nicht nur den Zustand, sondern die Länge des Protokolls und welche
// Schrittnummern darin stehen.
//
// Zwei Dinge sind die teuren Fehler:
//
// 1. **Keine Zeile, nicht „skipped".** Ein Schritt, der nicht zu diesem Aufbau
//    gehört, ist nicht gescheitert. Eine Zeile dafür wäre genau der Lärm, gegen
//    den M20.1 steht.
// 2. **Eine Antwort auf „ist das der Endkampf?"** Wer `build_scenario` mit
//    `final: true` zum Endkampf zwingt, zieht das Gate mit - sonst stünden zwei
//    Regeln nebeneinander (M6).
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequenceWithLog, onlyFinalOf } = await import('../../shared/sequenceExecutor.js');
const { STEP_TYPES, stepFields, defaultStep, describeStep, validateStep } =
  await import('../../client/src/utils/sequenceSteps.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BOSS_BACK = '/uploads/tokens/boss-back.png';
const BOSSES = ['Klaus', 'Bertha', 'Grimm'];
const TIERS = ['CHUMP', 'HOOLIGAN', 'TROUBLEMAKER', 'FINAL FIGHT'];

const ASSETS = [
  ...BOSSES.map((n, i) => ({
    id: `boss-${i}`, name: `Bösewicht: ${n}`, type: 'token', category: 'Bösewichte',
    image_path: `/uploads/tokens/boss-${i}.png`, back_image_path: BOSS_BACK, width: 60, height: 60,
  })),
  {
    id: 'tile-0', name: 'Milchkanne', type: 'token', category: 'Gelände',
    image_path: '/uploads/tokens/tile-0.png', back_image_path: null, width: 60, height: 60,
  },
  {
    id: 'tableau', name: 'Tableau: Klaus', type: 'token', category: 'Tableaus',
    image_path: '/uploads/tokens/tableau.png', back_image_path: '/uploads/tokens/tableau-back.png',
    width: 300, height: 200,
  },
  {
    id: 'marker', name: 'Kurzpartie', type: 'token', category: 'Sonder',
    image_path: '/uploads/tokens/marker.png', back_image_path: BOSS_BACK, width: 60, height: 60,
  },
];

const CARDS = [
  { id: 'c1', name: 'BETÄUBUNGSWUMME', category: 'Besondere Ausrüstung', image_path: '/uploads/cards/c1.png' },
];

const GRIDS = [{
  id: 'g1', label: 'Kampffeld', type: 'square',
  origin: { x: 0, y: 0 }, cell: 60, cols: 10, rows: 10,
  labels: { cols: 'alpha', rows: 'numeric' },
}];

const ZONES = [
  {
    id: 'z1', label: 'Stufenleiste', x: 1000, y: 100, width: 400, height: 80,
    accepts: ['asset'], capacity: 4, layout: 'row', slotLabels: TIERS,
  },
  { id: 'z2', label: 'Terrain-Auslage', x: 100, y: 700, width: 600, height: 100, accepts: ['card'], capacity: null },
  { id: 'z3', label: 'Ablagefeld', x: 800, y: 700, width: 200, height: 100, accepts: ['asset'], capacity: null },
];

const SCENARIO = {
  gridLabel: 'Kampffeld',
  bosses: {
    Klaus: {
      scenario: "Meal Time's Over",
      terrain: [{ assetName: 'Milchkanne', cells: ['E4'] }],
      fields: { B: 'J5' },
      final: { fields: { EG: ['I2'] }, stats: { SHERIFF: 'BETÄUBUNGSWUMME' } },
    },
  },
};

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [], counters: [] });
const opts = () => ({ assets: ASSETS, cards: CARDS, grids: GRIDS, scenarioData: SCENARIO });

/**
 * Die Kurzpartie-Leiste: der Marker offen auf Platz 1, dahinter drei verdeckte
 * Bösewichte. `reveal_next` nimmt den vordersten verdeckten.
 *
 * `skip` ist, wie viele Kämpfe schon gelaufen sind: davor werden so viele
 * Bösewichte aufgedeckt, und **Klaus wird so einsortiert, dass er genau dann
 * dran ist**. `bar(2)` legt ihn damit auf Platz 4 - den letzten, und das ist
 * die Tatsache, an der der Endkampf hängt (M7). Platz 4 bleibt der letzte,
 * auch wenn nur drei Bösewichte liegen.
 */
function bar(skip = 0) {
  const order = BOSSES.filter(n => n !== 'Klaus');
  order.splice(skip, 0, 'Klaus');
  const steps = [
    { type: 'place_asset', assetName: 'Kurzpartie', targetZoneLabel: 'Stufenleiste', faceDown: false },
    ...order.map(n => ({ type: 'place_asset', assetName: `Bösewicht: ${n}`, targetZoneLabel: 'Stufenleiste', faceDown: true })),
    ...Array.from({ length: skip }, () => ({ type: 'reveal_next', zoneLabel: 'Stufenleiste' })),
  ];
  return executeSequenceWithLog(emptyState(), steps, ZONES, opts()).state;
}

const REVEAL = { type: 'reveal_next', zoneLabel: 'Stufenleiste' };
const BUILD = { type: 'build_scenario', final: 'auto' };
const SHERIFF = { type: 'place_card', cardName: '$SHERIFF', targetZoneLabel: 'Terrain-Auslage', onlyFinal: true };
const FLIP = { type: 'set_asset_face', assetName: 'Tableau: Klaus', faceDown: true, onlyFinal: true };
const ONLY_BEFORE = { type: 'place_asset', assetName: 'Milchkanne', targetZoneLabel: 'Ablagefeld', onlyFinal: false };

const indices = (log) => log.map(e => e.index);
const reasons = (log) => log.map(e => `#${e.index} ${e.type} ${e.status} ${e.reason ?? ''}`).join(' | ');

// ── Der Befund aus Partie 11 ─────────────────────────────────────────────────

test('vor dem Endkampf steht keine $SHERIFF-Zeile im Protokoll', () => {
  // Klaus sitzt auf Platz 2 von vier - kein Endkampf.
  const { state, log } = executeSequenceWithLog(bar(), [REVEAL, BUILD, SHERIFF], ZONES, opts());

  assert.deepEqual(indices(log), [0, 1], `der dritte Schritt gehört nicht dazu: ${reasons(log)}`);
  assert.deepEqual(log.map(e => e.status), ['ok', 'ok'], reasons(log));
  assert.equal(state.cards.length, 0, 'und die Karte liegt nicht');
  // Der ganze Punkt: nicht „skipped", sondern gar nichts. Eine Zeile wäre
  // derselbe Lärm, nur mit anderem Grund.
  assert.equal(log.some(e => String(e.reason ?? '').includes('SHERIFF')), false);
});

test('im Endkampf läuft der Schritt und die Karte liegt', () => {
  const { state, log } = executeSequenceWithLog(bar(2), [REVEAL, BUILD, SHERIFF], ZONES, opts());

  assert.deepEqual(indices(log), [0, 1, 2], reasons(log));
  assert.deepEqual(log.map(e => e.status), ['ok', 'ok', 'ok'], reasons(log));
  assert.deepEqual(state.cards.map(c => c.name), ['BETÄUBUNGSWUMME']);
});

test('bleibt die Karte im Endkampf aus, sagt es das Protokoll (Tilda-Fields-Fall)', () => {
  // Derselbe Aufbau, nur ohne `final.stats` - genau Tilda Fields: ihr Sheriff
  // zieht aus dem Gartendeck, es gibt keinen Kartennamen.
  const tilda = JSON.parse(JSON.stringify(SCENARIO));
  delete tilda.bosses.Klaus.final.stats;
  const { state, log } = executeSequenceWithLog(
    bar(2), [REVEAL, BUILD, SHERIFF], ZONES, { ...opts(), scenarioData: tilda });

  assert.deepEqual(indices(log), [0, 1, 2], reasons(log));
  assert.equal(log[2].status, 'skipped');
  assert.match(log[2].reason, /\$SHERIFF is not bound/);
  assert.equal(state.cards.length, 0);
});

// ── Die andere Richtung: nur außerhalb des Endkampfs ─────────────────────────

test('onlyFinal: false läuft vor dem Endkampf und nicht in ihm', () => {
  // `build_scenario` legt die Milchkanne auf E4; der dritte Schritt zieht
  // dasselbe Plättchen ins Ablagefeld und nimmt ihm damit sein Rasterfeld.
  const can = (s) => s.tokens.find(t => t.label === 'Milchkanne');

  const before = executeSequenceWithLog(bar(), [REVEAL, BUILD, ONLY_BEFORE], ZONES, opts());
  assert.deepEqual(indices(before.log), [0, 1, 2], reasons(before.log));
  assert.equal(can(before.state).cell, null, 'vor dem Endkampf liegt sie im Ablagefeld');

  const final = executeSequenceWithLog(bar(2), [REVEAL, BUILD, ONLY_BEFORE], ZONES, opts());
  assert.deepEqual(indices(final.log), [0, 1], reasons(final.log));
  assert.equal(can(final.state).cell, 'E4', 'im Endkampf bleibt sie auf ihrem Feld');
});

test('das Tableau wird nur im Endkampf auf die Rückseite gedreht (M20.4)', () => {
  const place = { type: 'place_asset', assetName: 'Tableau: Klaus', x: 0, y: 0, faceDown: true };
  const up = { type: 'set_asset_face', assetName: 'Tableau: Klaus', faceDown: false };
  const tableau = (s) => s.tokens.find(t => t.label === 'Tableau: Klaus');

  const before = executeSequenceWithLog(bar(), [REVEAL, BUILD, place, up, FLIP], ZONES, opts());
  assert.deepEqual(indices(before.log), [0, 1, 2, 3], reasons(before.log));
  assert.equal(tableau(before.state).faceDown, false, 'Kämpfe 1-3: Vorderseite');

  const final = executeSequenceWithLog(bar(2), [REVEAL, BUILD, place, up, FLIP], ZONES, opts());
  assert.deepEqual(indices(final.log), [0, 1, 2, 3, 4], reasons(final.log));
  assert.equal(tableau(final.state).faceDown, true, 'Endkampf: Rückseite');
});

// ── Eine Antwort auf „ist das der Endkampf?" ─────────────────────────────────

test('erzwungenes final: true zieht das Gate mit', () => {
  // Klaus auf Platz 2, aber `build_scenario` ist zum Endkampf gezwungen. Zwei
  // Regeln nebeneinander hieße: der Endkampf wird gebaut und der Sheriff nicht
  // gelegt - still und ohne Zeile.
  const { state, log } = executeSequenceWithLog(
    bar(), [REVEAL, { type: 'build_scenario', final: true }, SHERIFF], ZONES, opts());

  assert.deepEqual(indices(log), [0, 1, 2], reasons(log));
  assert.deepEqual(state.cards.map(c => c.name), ['BETÄUBUNGSWUMME']);
});

test('erzwungenes final: false nimmt den Endkampf auch dem Gate', () => {
  const { state, log } = executeSequenceWithLog(
    bar(2), [REVEAL, { type: 'build_scenario', final: false }, SHERIFF], ZONES, opts());

  assert.deepEqual(indices(log), [0, 1], reasons(log));
  assert.equal(state.cards.length, 0);
});

test('ohne build_scenario entscheidet der Platz der Leiste allein', () => {
  const before = executeSequenceWithLog(bar(), [REVEAL, SHERIFF], ZONES, opts());
  assert.deepEqual(indices(before.log), [0], reasons(before.log));

  const final = executeSequenceWithLog(bar(2), [REVEAL, SHERIFF], ZONES, opts());
  assert.deepEqual(indices(final.log), [0, 1], reasons(final.log));
  // Ohne `build_scenario` ist $SHERIFF nicht gebunden - der Schritt läuft und
  // sagt das. Genau die Zeile, die im Endkampf hingehört.
  assert.equal(final.log[1].status, 'skipped');
});

// ── Der unverstandene Wert ───────────────────────────────────────────────────

test('onlyFinalOf liest die drei Antworten und sonst nichts', () => {
  assert.equal(onlyFinalOf(true), true);
  assert.equal(onlyFinalOf('true'), true);
  assert.equal(onlyFinalOf(false), false);
  assert.equal(onlyFinalOf('false'), false);
  for (const v of [undefined, null, '', 'auto', 'vielleicht', 0, 1, {}]) {
    assert.equal(onlyFinalOf(v), null, `${JSON.stringify(v)} ist keine der drei Antworten`);
  }
});

test('ein unverstandener Wert verschluckt den Schritt nicht', () => {
  // Ein Schritt, der lautlos ausfällt, weil jemand „vielleicht" hingeschrieben
  // hat, ist genau der Fehler, gegen den M20.1 steht.
  const odd = { ...SHERIFF, onlyFinal: 'vielleicht' };
  const { log } = executeSequenceWithLog(bar(), [REVEAL, BUILD, odd], ZONES, opts());
  assert.deepEqual(indices(log), [0, 1, 2], reasons(log));

  assert.deepEqual(validateStep(odd, {}),
    ['"vielleicht" is not an answer: every fight, only the final fight, or only before it']);
});

// ── Schrittvokabular und Editor ──────────────────────────────────────────────

test('das Gate ist kein Feld eines Typs, sondern eine Zeile an jedem Schritt', async () => {
  // Es steht bewusst **nicht** in `stepFields`: diese Liste sind die Felder,
  // die `applyStep` liest (eines je Handler), und das Gate liest die Schleife
  // darüber. Es fünfundzwanzigmal in `STEP_TYPES.fields` einzutragen hieße,
  // es zur Eigenschaft von `place_card` zu erklären, die es nicht ist.
  for (const spec of STEP_TYPES) {
    assert.equal(stepFields(spec.value).includes('onlyFinal'), false, spec.value);
  }

  // Einstellbar muss es trotzdem sein - sonst wäre es ein Feld, das niemand
  // setzen kann (`docs/audit-dead-controls.md`). Gelesen wird die Quelle als
  // Text, wie beim Renderer-Test in `sequence-steps.test.js`: für den Client
  // gibt es keine Testinfrastruktur.
  const { readFile } = await import('node:fs/promises');
  const src = await readFile(new URL('../../client/src/components/SetupSequenceEditor.jsx', import.meta.url), 'utf8');
  assert.match(src, /\n {4}onlyFinal: \(\) =>/, 'kein Renderer fuer onlyFinal');
  // Und er wird aufgerufen, einmal, ausserhalb von `fields.map`.
  assert.match(src, /\{render\.onlyFinal\(\)\}/, 'der Renderer wird nicht gezeichnet');
  assert.equal(src.includes('step-${index}-only-final'), true, 'kein testid am Feld');
});

test('ein frischer Schritt trägt kein Gate und läuft damit immer', () => {
  for (const spec of STEP_TYPES) {
    assert.equal('onlyFinal' in defaultStep(spec.value, {}), false, spec.value);
  }
});

test('describeStep nennt das Gate nur, wenn es eines gibt', () => {
  assert.match(describeStep(SHERIFF), /· only in the final fight$/);
  assert.match(describeStep(ONLY_BEFORE), /· not in the final fight$/);
  assert.doesNotMatch(describeStep({ type: 'place_card', cardName: 'X', targetZoneLabel: 'Y' }), /final fight/);
  // `build_scenario` hat sein eigenes `final` - die beiden dürfen sich nicht
  // in die Zeile reden.
  assert.doesNotMatch(describeStep(BUILD), /· (only|not) in the final fight/);
});

test('validateStep schweigt zu den drei gültigen Antworten', () => {
  const ctx = { zoneLabels: ['Terrain-Auslage'], cards: CARDS };
  for (const v of [undefined, true, 'true', false, 'false']) {
    const step = { type: 'place_card', cardName: 'BETÄUBUNGSWUMME', targetZoneLabel: 'Terrain-Auslage', onlyFinal: v };
    assert.deepEqual(validateStep(step, ctx), [], JSON.stringify(v));
  }
});
