// Tests fuer die Drehung einer Platzierung (M7.1, "Die Regel 2": G3).
//
// Der eine Satz, an dem hier alles haengt: **die Drehung dreht das Bild, nicht
// die Feldbelegung.** Welche Felder ein Stueck bedeckt, sagt allein der
// Bereich. `width`/`height` und `cell` duerfen sich durch eine Drehung darum
// nicht aendern - sonst waere die Trefferflaeche zum Ziehen eine andere als
// die, auf die `cellAt` zeigt, und der Zaun liesse sich nicht mehr dort
// anfassen, wo er liegt.
//
// Der zweite: **zwei Ausrichtungen sind zwei Gelaendeeintraege.** `terrain`
// ist eine Liste und die Schleife in `build_scenario` fasst nichts zusammen -
// derselbe Holzzaun liegt bei "Deputy Waggums" waagerecht (D5:G5) und bei
// "The Bundits" senkrecht (L10:L13).
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');
const { validateScenarioData } = await import('../../shared/scenarioData.js');
const { defaultStep, describeStep, stepFields, validateStep } =
  await import('../../client/src/utils/sequenceSteps.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ASSETS = [{
  id: 'fence', name: 'Holzzaun', type: 'token', category: 'Gelände',
  image_path: '/uploads/tokens/fence.png', back_image_path: null, width: 60, height: 60,
}, {
  id: 'boss', name: 'Bösewicht: Waggums', type: 'token', category: 'Bösewichte',
  image_path: '/uploads/tokens/boss.png', back_image_path: '/uploads/tokens/boss-back.png',
  width: 60, height: 60,
}];

/** Die Stufenleiste, aus der `reveal_next` den Bösewicht aufdeckt. */
const BAR = [{
  id: 'z-bar', label: 'Stufenleiste', x: 2000, y: 100, width: 400, height: 80,
  accepts: ['asset'], capacity: 4, layout: 'row',
}];

/** 20x20 ab (0,0), Buchstaben quer, Zahlen runter, 60px je Feld. */
const GRIDS = [{
  id: 'g1', label: 'Kampffeld', type: 'square',
  origin: { x: 0, y: 0 }, cell: 60, cols: 20, rows: 20,
  labels: { cols: 'alpha', rows: 'numeric' },
}];

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [] });
const opts = (over = {}) => ({ assets: ASSETS, grids: GRIDS, ...over });

const fence = (over = {}) =>
  ({ type: 'place_asset', assetName: 'Holzzaun', gridLabel: 'Kampffeld', ...over });

// ── Die Ausfuehrung: place_asset ─────────────────────────────────────────────

test('place_asset takes the rotation of the step', () => {
  const state = executeSequence(emptyState(), [fence({ cell: 'D5:G5', rotation: 90 })], [], opts());
  assert.equal(state.tokens[0].rotation, 90);
});

test('the rotation does not touch width, height or cell', () => {
  const plain = executeSequence(emptyState(), [fence({ cell: 'L10:L13' })], [], opts());
  const turned = executeSequence(emptyState(), [fence({ cell: 'L10:L13', rotation: 90 })], [], opts());
  const [a] = plain.tokens;
  const [b] = turned.tokens;
  // Dieselbe Feldbelegung, dieselbe Trefferflaeche, dieselbe Adresse - nur das
  // Bild darin steht anders.
  assert.equal(b.width, a.width);
  assert.equal(b.height, a.height);
  assert.equal(b.cell, a.cell);
  assert.equal(b.x, a.x);
  assert.equal(b.y, a.y);
  assert.equal(a.rotation, 0, 'ohne Angabe: nicht gedreht');
  assert.equal(b.rotation, 90);
  // 1 Spalte x 4 Zeilen, so wie der Bereich es sagt - nicht gedreht dazu.
  assert.equal(b.width, 60);
  assert.equal(b.height, 240);
});

test('a rotation is also legal in the zone and the x/y branch', () => {
  const zones = [{ id: 'z1', label: 'Ablage', x: 2000, y: 2000, width: 200, height: 200, accepts: ['asset'] }];
  const inZone = executeSequence(emptyState(), [fence({ gridLabel: '', targetZoneLabel: 'Ablage', rotation: 180 })], zones, opts());
  assert.equal(inZone.tokens[0].rotation, 180);

  const free = executeSequence(emptyState(), [fence({ gridLabel: '', x: 10, y: 20, rotation: 270 })], [], opts());
  assert.equal(free.tokens[0].rotation, 270);
});

test('an angle that is not one of the four reads as 0 rather than landing on the table', () => {
  const state = executeSequence(emptyState(), [fence({ cell: 'D5', rotation: 45 })], [], opts());
  assert.equal(state.tokens[0].rotation, 0);
});

test('a state without the field reads as 0', () => {
  // Ein Token aus der Zeit vor M7.1: kein `rotation`. Es wird verschoben und
  // hat danach eine - naemlich 0, nicht undefined.
  const state = emptyState();
  state.tokens.push({
    id: 't-old', assetId: 'fence', shape: 'image', label: 'Holzzaun',
    imageUrl: '/uploads/tokens/fence.png', x: 0, y: 0, size: 60, width: 60, height: 60,
  });
  const after = executeSequence(state, [fence({ cell: 'D5' })], [], opts());
  assert.equal(after.tokens.length, 1, 'es bleibt dasselbe Objekt');
  assert.equal(after.tokens[0].rotation, 0);
});

test('moving an existing object writes the rotation of that placement', () => {
  // Wie `gridId`/`cell`: die Drehung gehoert zur Platzierung, nicht zum Objekt
  // (es gibt keinen Schritt, der nur dreht). Eine stehengebliebene Drehung
  // waere still falsch.
  const state = executeSequence(emptyState(), [fence({ cell: 'D5', rotation: 90 })], [], opts());
  const after = executeSequence(state, [fence({ cell: 'D5', rotation: 180 })], [], opts());
  assert.equal(after.tokens.length, 1);
  assert.equal(after.tokens[0].rotation, 180);
});

// ── Die Ausfuehrung: build_scenario ──────────────────────────────────────────

/** Ein Boesewicht mit demselben Zaun zweimal - einmal quer, einmal hochkant. */
const scenarioData = (over = {}) => ({
  gridLabel: 'Kampffeld',
  bosses: {
    Waggums: {
      terrain: [
        { assetName: 'Holzzaun', cells: ['D5:G5'] },
        { assetName: 'Holzzaun', cells: ['L10:L13'], rotation: 90, ...over },
      ],
    },
  },
});

/**
 * `$revealedBase` kann man nicht von aussen setzen - es entsteht beim
 * Aufdecken. Also wird aufgedeckt: derselbe Weg, den der Tisch geht.
 */
const buildFor = (data) => executeSequenceWithLog(
  emptyState(),
  [
    { type: 'place_asset', assetName: 'Bösewicht: Waggums', targetZoneLabel: 'Stufenleiste', faceDown: true },
    { type: 'reveal_next', zoneLabel: 'Stufenleiste' },
    { type: 'build_scenario' },
  ],
  BAR,
  { ...opts(), scenarioData: data }
);

test('two terrain entries of the same asset give two objects with different rotations', () => {
  const { state, log } = buildFor(scenarioData());
  assert.equal(log[2].status, 'ok', log[2].reason);
  // Der Boesewicht aus der Leiste liegt mit auf dem Tisch.
  const terrain = state.tokens.filter(t => t.assetId === 'fence');
  assert.equal(terrain.length, 2, 'die Schleife fasst zwei Eintraege nicht zusammen');
  const [flat, upright] = terrain;
  assert.equal(flat.cell, 'D5:G5');
  assert.equal(flat.rotation, 0, 'kein rotation im Eintrag heisst 0');
  assert.equal(upright.cell, 'L10:L13');
  assert.equal(upright.rotation, 90);
  // Und wieder: die Drehung hat die Kaesten nicht vertauscht.
  assert.equal(flat.width, 240);
  assert.equal(flat.height, 60);
  assert.equal(upright.width, 60);
  assert.equal(upright.height, 240);
});

// ── Die Pruefung der Szenariodaten ───────────────────────────────────────────

test('validateScenarioData accepts the four angles and reports anything else', () => {
  const ctx = { assets: ASSETS, grids: GRIDS };
  for (const angle of [0, 90, 180, 270]) {
    assert.deepStrictEqual(validateScenarioData(scenarioData({ rotation: angle }), ctx), [],
      `${angle}° ist ein erlaubter Winkel`);
  }
  const problems = validateScenarioData(scenarioData({ rotation: 45 }), ctx);
  assert.equal(problems.length, 1, problems.join('; '));
  assert.match(problems[0], /Waggums/);
  assert.match(problems[0], /Holzzaun/);
  assert.match(problems[0], /45/);
});

test('build_scenario fails on a bad angle before a single object is laid down', () => {
  const { state, log } = buildFor(scenarioData({ rotation: 45 }));
  assert.equal(log[2].status, 'failed');
  assert.match(log[2].reason, /45/);
  assert.equal(state.tokens.filter(t => t.assetId === 'fence').length, 0, 'erst pruefen, dann legen');
});

// ── Das Schrittvokabular ─────────────────────────────────────────────────────

test('place_asset offers the rotation in every branch', () => {
  assert.ok(stepFields({ type: 'place_asset' }).includes('rotation'));
  assert.ok(stepFields({ type: 'place_asset', targetZoneLabel: 'Ablage' }).includes('rotation'),
    'ein gedrehtes Token in einer Zone ist genauso legitim');
  assert.ok(stepFields({ type: 'place_asset', cell: 'D5:G5' }).includes('rotation'));
});

test('a fresh place_asset is not rotated', () => {
  assert.equal(defaultStep('place_asset', { assetNames: ['Holzzaun'] }).rotation, 0);
});

test('describeStep names the rotation only when there is one', () => {
  const flat = describeStep(fence({ cell: 'D5:G5', rotation: 0 }));
  assert.ok(!/rotat/i.test(flat), flat);
  assert.match(describeStep(fence({ cell: 'L10:L13', rotation: 90 })), /90/);
});

test('validateStep allows the four angles and reports the rest', () => {
  const ctx = { assetNames: ['Holzzaun'], grids: GRIDS };
  for (const angle of [0, 90, 180, 270]) {
    assert.deepStrictEqual(validateStep(fence({ cell: 'D5', rotation: angle }), ctx), [], `${angle}°`);
  }
  const problems = validateStep(fence({ cell: 'D5', rotation: 45 }), ctx);
  assert.equal(problems.length, 1, problems.join('; '));
  assert.match(problems[0], /45/);
  // Fehlt das Feld ganz (alte Sequenzen), ist das keine Beschwerde wert.
  assert.deepStrictEqual(validateStep(fence({ cell: 'D5' }), ctx), []);
});
