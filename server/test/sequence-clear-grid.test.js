// Tests for `clear_grid` (M7, T2): das Gegenstück zu `clear_zone` für die
// Fläche, auf der gekämpft wird. Ohne das beginnt der zweite Kampf auf dem
// Schlachtfeld des ersten.
//
// Der Kern ist die *Positionsregel*: was auf dem Raster steht, gehört weg -
// auch ein von Hand dorthin gezogenes Objekt, das kein `gridId` trägt. Gerechnet
// wird deshalb mit `cellAt`, nicht mit dem, was das Objekt über sich behauptet.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');
const { STEP_TYPES, stepFields, defaultStep, describeStep, validateStep } =
  await import('../../client/src/utils/sequenceSteps.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TERRAIN = ['Fetid Furball', 'Wheat Field', 'Giant Milk Jug'];

function assetFixture() {
  return [
    {
      id: 'board-0', name: 'Hauptbrett', type: 'board', category: 'Bretter',
      image_path: '/uploads/boards/0.png', back_image_path: null, width: 600, height: 600,
    },
    ...TERRAIN.map((name, i) => ({
      id: `tile-${i}`, name, type: 'token', category: 'Gelände',
      image_path: `/uploads/tokens/${i}.png`, back_image_path: null, width: 60, height: 60,
    })),
    {
      id: 'granny', name: 'Figur: Granny', type: 'token', category: 'Dörfler',
      image_path: '/uploads/tokens/granny.png', back_image_path: null, width: 40, height: 40,
    },
  ];
}

/** 10x10 at the origin, letters across, numbers down – C7 is col 2, row 6. */
function gridFixture(over = {}) {
  return [{
    id: 'g1',
    label: 'Kampffeld',
    type: 'square',
    origin: { x: 0, y: 0 },
    cell: 60,
    cols: 10,
    rows: 10,
    labels: { cols: 'alpha', rows: 'numeric' },
    ...over,
  }];
}

const ZONES = [
  { id: 'z1', label: 'Ablage', x: 2000, y: 2000, width: 200, height: 200, shape: 'rect', accepts: ['asset'] },
];

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [] });
const opts = (grids = gridFixture()) => ({ assets: assetFixture(), grids });
const byLabel = (state, label) => [...state.tokens, ...state.boards].find(o => o.label === label || o.name === label);
const clear = (gridLabel = 'Kampffeld') => ({ type: 'clear_grid', gridLabel });

/**
 * Drei Geländeplättchen auf dem Raster (eines davon gesperrt) und eine Figur
 * daneben – der Tisch nach einem Kampf.
 */
function battlefield() {
  return executeSequence(
    emptyState(),
    [
      { type: 'place_asset', assetName: 'Fetid Furball', gridLabel: 'Kampffeld', cell: 'C7' },
      { type: 'place_asset', assetName: 'Wheat Field', gridLabel: 'Kampffeld', cell: 'D2' },
      { type: 'place_asset', assetName: 'Giant Milk Jug', gridLabel: 'Kampffeld', cell: 'A1' },
      { type: 'lock_asset', assetName: 'Giant Milk Jug' },
      { type: 'place_asset', assetName: 'Figur: Granny', x: 2000, y: 2000 },
    ],
    ZONES,
    opts()
  );
}

// ── Abräumen ─────────────────────────────────────────────────────────────────

test('clear_grid nimmt alles vom Raster, lässt das Danebenliegende und das Gesperrte', () => {
  const before = battlefield();
  assert.equal(before.tokens.length, 4, 'Vorbedingung: drei auf dem Raster, eines daneben');

  const { state, log } = executeSequenceWithLog(before, [clear()], ZONES, opts());

  assert.equal(log[0].status, 'failed', 'nur zum Teil abgeräumt ist nicht ok');
  assert.match(log[0].reason, /locked/);
  assert.match(log[0].reason, /Giant Milk Jug/, 'das Gesperrte steht mit Namen im Protokoll');

  assert.equal(state.tokens.length, 2);
  assert.ok(!byLabel(state, 'Fetid Furball'), 'vom Raster genommen');
  assert.ok(!byLabel(state, 'Wheat Field'), 'vom Raster genommen');
  assert.deepEqual(
    [byLabel(state, 'Giant Milk Jug')].map(t => [t.x, t.y]),
    [[30, 30]],
    'gesperrt heißt gesperrt – auch gegen das Löschen'
  );
  assert.deepEqual(
    [byLabel(state, 'Figur: Granny')].map(t => [t.x, t.y]),
    [[2000, 2000]],
    'was neben dem Raster steht, bleibt unangetastet'
  );
});

test('ohne Gesperrtes ist das Abräumen schlicht gelungen', () => {
  const before = executeSequence(
    emptyState(),
    [
      { type: 'place_asset', assetName: 'Fetid Furball', gridLabel: 'Kampffeld', cell: 'C7' },
      { type: 'place_asset', assetName: 'Figur: Granny', x: 2000, y: 2000 },
    ],
    ZONES,
    opts()
  );

  const { state, log } = executeSequenceWithLog(before, [clear()], ZONES, opts());

  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.equal(log[0].reason, null);
  assert.equal(state.tokens.length, 1);
  assert.ok(byLabel(state, 'Figur: Granny'));
});

// ── Die Positionsregel ───────────────────────────────────────────────────────

test('ein von Hand dorthin gezogenes Objekt ohne gridId gehört genauso weg', () => {
  // Das ist der Kern: entschieden wird über die Position (`cellAt`), nicht über
  // das, was das Objekt über sich behauptet. Ein Objekt, das jemand mit der Maus
  // aufs Kampffeld geschoben hat, trägt kein `gridId`.
  const before = emptyState();
  before.tokens.push({ assetId: 'granny', label: 'Figur: Granny', x: 150, y: 390, width: 40, height: 40 });

  const { state, log } = executeSequenceWithLog(before, [clear()], ZONES, opts());

  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.deepEqual(state.tokens, [], 'auf dem Raster ist auf dem Raster');
});

test('Karten auf dem Raster werden genauso abgeräumt wie Token', () => {
  const before = emptyState();
  before.cards.push({ tableId: 't1', cardId: 'c1', name: 'Verhalten 1', x: 90, y: 90, zIndex: 1 });
  before.cards.push({ tableId: 't2', cardId: 'c2', name: 'Verhalten 2', x: 1500, y: 1500, zIndex: 1 });
  before.tokens.push({ assetId: 'tile-0', label: 'Fetid Furball', x: 150, y: 390, width: 60, height: 60 });

  const { state, log } = executeSequenceWithLog(before, [clear()], ZONES, opts());

  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.deepEqual(state.cards.map(c => c.tableId), ['t2'], 'die Karte auf dem Raster ist weg, die daneben nicht');
  assert.deepEqual(state.tokens, []);
});

test('das Brett, auf dem das Raster hängt, bleibt liegen', () => {
  // Dieselbe Ausnahme, die `objectsInZone` schon kennt: ein Brett, auf dem ein
  // Raster hängt, steht nicht *auf* ihm. Ohne sie löscht der erste `clear_grid`
  // den Hauptplan – und damit auch die Verankerung selbst.
  const grids = gridFixture({ anchor: { assetId: 'board-0', relX: 0, relY: 0, relWidth: 1, relHeight: 1 } });

  const before = executeSequence(
    emptyState(),
    [
      { type: 'place_asset', assetName: 'Hauptbrett', x: 300, y: 300 },
      { type: 'place_asset', assetName: 'Fetid Furball', gridLabel: 'Kampffeld', cell: 'C7' },
    ],
    ZONES,
    opts(grids)
  );
  assert.ok(byLabel(before, 'Fetid Furball'), 'Vorbedingung: das Plättchen liegt auf dem Raster');

  const { state, log } = executeSequenceWithLog(before, [clear()], ZONES, opts(grids));

  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.ok(byLabel(state, 'Hauptbrett'), 'der Anker bleibt');
  assert.ok(!byLabel(state, 'Fetid Furball'));
});

// ── Sinnvoll scheitern ───────────────────────────────────────────────────────

test('ein leeres Raster zu leeren ist gelungen, nicht gescheitert', () => {
  // Dieselbe Entscheidung wie bei `clear_zone`: der gewünschte Zustand liegt
  // schon vor. Sonst meldet der erste Kampf einer frischen Partie einen
  // Fehlalarm.
  const before = executeSequence(
    emptyState(), [{ type: 'place_asset', assetName: 'Figur: Granny', x: 2000, y: 2000 }], ZONES, opts()
  );

  const { state, log } = executeSequenceWithLog(before, [clear()], ZONES, opts());

  assert.equal(log[0].status, 'ok');
  assert.equal(log[0].reason, null, 'kein Grund, es ist ja nichts schiefgegangen');
  assert.deepStrictEqual(state.tokens, before.tokens, 'nichts verändert');
});

test('ein Raster, das es nicht gibt, wird übersprungen – das ist ein Autorenfehler', () => {
  const before = battlefield();
  const { state, log } = executeSequenceWithLog(before, [clear('Gibt es nicht')], ZONES, opts());

  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Gibt es nicht/, 'der Grund steht im Protokoll');
  assert.deepStrictEqual(state.tokens, before.tokens, 'nichts verändert');
});

test('ohne Raster im Aufruf wird übersprungen, nicht der halbe Tisch geleert', () => {
  const before = battlefield();
  const { state, log } = executeSequenceWithLog(before, [clear()], ZONES, { assets: assetFixture() });

  assert.equal(log[0].status, 'skipped');
  assert.deepStrictEqual(state.tokens, before.tokens);
});

test('das Raster steht im Protokoll, damit man den Schritt wiedererkennt', () => {
  const { log } = executeSequenceWithLog(battlefield(), [clear()], ZONES, opts());
  assert.equal(log[0].target, 'Kampffeld');
});

// ── Zweimal „Kampf beginnen" ─────────────────────────────────────────────────

test('der zweite Kampf beginnt auf leerem Feld', () => {
  const first = battlefield();
  const unlocked = executeSequence(first, [{ type: 'unlock_asset', assetName: 'Giant Milk Jug' }], ZONES, opts());

  const { state, log } = executeSequenceWithLog(
    unlocked,
    [
      clear(),
      { type: 'place_asset', assetName: 'Wheat Field', gridLabel: 'Kampffeld', cell: 'J5' },
    ],
    ZONES,
    opts()
  );

  assert.deepEqual(log.map(e => e.status), ['ok', 'ok'], log.map(e => e.reason).join(' | '));
  assert.ok(!byLabel(state, 'Fetid Furball'), 'kein Objekt des ersten Szenarios ist übrig');
  assert.ok(!byLabel(state, 'Giant Milk Jug'));
  assert.deepEqual([byLabel(state, 'Wheat Field').x, byLabel(state, 'Wheat Field').y], [570, 270]);
});

// ── Vokabular des Editors ────────────────────────────────────────────────────

test('clear_grid is offered with the fields its handler reads', () => {
  const ctx = { grids: gridFixture() };

  assert.ok(STEP_TYPES.some(t => t.value === 'clear_grid'), 'clear_grid missing from STEP_TYPES');
  assert.deepEqual(stepFields('clear_grid'), ['gridLabel']);

  const fresh = defaultStep('clear_grid', ctx);
  assert.deepEqual(fresh, { type: 'clear_grid', gridLabel: 'Kampffeld' }, 'prefilled with the first grid');
  assert.deepEqual(defaultStep('clear_grid', {}), { type: 'clear_grid', gridLabel: '' }, 'ohne Raster bleibt es leer');

  const line = describeStep({ type: 'clear_grid', gridLabel: 'Kampffeld' });
  assert.ok(!line.includes('_'), `shows the raw type: ${line}`);
  assert.match(line, /Kampffeld/);
  assert.ok(!describeStep({ type: 'clear_grid' }).includes('undefined'));

  assert.deepEqual(validateStep({ type: 'clear_grid', gridLabel: 'Kampffeld' }, ctx), []);
  assert.equal(validateStep({ type: 'clear_grid', gridLabel: '' }, ctx).length, 1, 'ohne Raster kann der Schritt nicht laufen');
  assert.match(validateStep({ type: 'clear_grid', gridLabel: 'Gelöscht' }, ctx)[0], /Gelöscht/);
  assert.deepEqual(validateStep({ type: 'clear_grid', gridLabel: 'Kampffeld' }, {}), [],
    'ohne geladene Raster wird nichts erfunden');
});
