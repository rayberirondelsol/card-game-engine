// Tests for grid targets in the setup sequence (M7, T1): the executor knows
// grids, and `place_asset` can address a field of one ("C7") instead of a zone
// or raw coordinates.
//
// The point of the anchored case is the *resolution moment*: grids are
// resolved per step against the table as that step finds it, exactly like
// zones - step 1 lays the board out, step 2 aims at a field printed on it.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** A board 600x600 and a terrain tile, both addressable by name. */
function assetFixture() {
  return [
    {
      id: 'board-0', name: 'Hauptbrett', type: 'board', category: 'Bretter',
      image_path: '/uploads/boards/0.png', back_image_path: null, width: 600, height: 600,
    },
    {
      id: 'tile-0', name: 'Fetid Furball', type: 'token', category: 'Gelände',
      image_path: '/uploads/tokens/furball.png', back_image_path: null, width: 60, height: 60,
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

const placeOnCell = (cell, gridLabel = 'Kampffeld') =>
  ({ type: 'place_asset', assetName: 'Fetid Furball', gridLabel, cell });

// ── Placing on a field ───────────────────────────────────────────────────────

test('place_asset puts the asset on the centre of the named field', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(), [placeOnCell('C7')], ZONES,
    { assets: assetFixture(), grids: gridFixture() }
  );

  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.equal(state.tokens.length, 1);
  const [tile] = state.tokens;
  // col 2, row 6 of a 60px raster at the origin
  assert.equal(tile.x, 150);
  assert.equal(tile.y, 390);
});

test('the placed object remembers grid and field, so a reload finds it again', () => {
  const state = executeSequence(
    emptyState(), [placeOnCell('C7')], ZONES,
    { assets: assetFixture(), grids: gridFixture() }
  );

  assert.equal(state.tokens[0].gridId, 'g1');
  assert.equal(state.tokens[0].cell, 'C7');
});

test('a field spelled in lower case is stored the way the grid names it', () => {
  const state = executeSequence(
    emptyState(), [placeOnCell('c7')], ZONES,
    { assets: assetFixture(), grids: gridFixture() }
  );

  assert.equal(state.tokens[0].cell, 'C7');
});

// ── Sinnvoll scheitern ───────────────────────────────────────────────────────

test('a field the grid does not have is skipped and says so', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(), [placeOnCell('Z99')], ZONES,
    { assets: assetFixture(), grids: gridFixture() }
  );

  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Z99/);
  assert.equal(state.tokens.length, 0, 'nothing may be placed off the grid');
});

test('an unknown grid is skipped and names the grid', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(), [placeOnCell('C7', 'Gibt es nicht')], ZONES,
    { assets: assetFixture(), grids: gridFixture() }
  );

  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Gibt es nicht/);
  assert.equal(state.tokens.length, 0);
});

test('a grid step without any grids passed in is skipped, not placed at 0,0', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(), [placeOnCell('C7')], ZONES, { assets: assetFixture() }
  );

  assert.equal(log[0].status, 'skipped');
  assert.equal(state.tokens.length, 0);
});

// ── Anchored grids: resolved per step, against the table as it is ────────────

test('an anchored grid follows the board the same sequence has just moved', () => {
  const grids = gridFixture({
    anchor: { assetId: 'board-0', relX: 0, relY: 0, relWidth: 1, relHeight: 1 },
  });

  const { state, log } = executeSequenceWithLog(
    emptyState(),
    [
      // the board is centre-anchored: its box starts at 1000-300 = 700
      { type: 'place_asset', assetName: 'Hauptbrett', x: 1000, y: 1000 },
      placeOnCell('C7'),
    ],
    ZONES,
    { assets: assetFixture(), grids }
  );

  assert.equal(log[1].status, 'ok', log[1].reason);
  const tile = state.tokens.find(t => t.assetId === 'tile-0');
  // 700 + 150 / 700 + 390 – the moved board, not the grid's saved origin
  assert.equal(tile.x, 850);
  assert.equal(tile.y, 1090);
});

// ── The three ways are exclusive ─────────────────────────────────────────────

test('moving an object to a zone drops the field it used to remember', () => {
  // Otherwise placeOnGrids drags it back onto the old cell on the next load (M3b).
  const state = executeSequence(
    emptyState(),
    [
      placeOnCell('C7'),
      { type: 'place_asset', assetName: 'Fetid Furball', targetZoneLabel: 'Ablage' },
    ],
    ZONES,
    { assets: assetFixture(), grids: gridFixture() }
  );

  assert.equal(state.tokens.length, 1, 'place_asset moves the existing object');
  assert.equal(state.tokens[0].x, 2100);
  assert.ok(!state.tokens[0].cell, 'the object is in a zone now, not on a field');
});

test('an existing object is moved onto the field, not duplicated', () => {
  const state = executeSequence(
    emptyState(),
    [placeOnCell('A1'), placeOnCell('C7')],
    ZONES,
    { assets: assetFixture(), grids: gridFixture() }
  );

  assert.equal(state.tokens.length, 1);
  assert.equal(state.tokens[0].x, 150);
  assert.equal(state.tokens[0].cell, 'C7');
});

// ── Ein Bereich als Adresse (M7.1/G1) ────────────────────────────────────────

test('place_asset auf einen Bereich zentriert auf dessen Mitte und nimmt dessen Maße', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(), [placeOnCell('E3:G4')], ZONES,
    { assets: assetFixture(), grids: gridFixture() }
  );

  assert.equal(log[0].status, 'ok', log[0].reason);
  const [tile] = state.tokens;
  // Drei Spalten E–G: waagerecht die Mitte von F. Zwei Zeilen 3–4: senkrecht
  // auf die Grenze, wo kein Feldmittelpunkt liegt – genau der halbe Versatz,
  // um den es geht.
  assert.equal(tile.x, 330);
  assert.equal(tile.y, 180);
  assert.equal(tile.width, 180, '3 Spalten à 60');
  assert.equal(tile.height, 120, '2 Zeilen à 60');
});

test('die Ecken eines Bereichs werden normalisiert gemerkt', () => {
  const state = executeSequence(
    emptyState(), [placeOnCell('g4:E3')], ZONES,
    { assets: assetFixture(), grids: gridFixture() }
  );

  assert.equal(state.tokens[0].cell, 'E3:G4');
  assert.equal(state.tokens[0].gridId, 'g1');
});

test('ein Einzelfeld behält die Maße aus dem Asset – Zeichen für Zeichen wie bisher', () => {
  const state = executeSequence(
    emptyState(), [placeOnCell('C7')], ZONES,
    { assets: assetFixture(), grids: gridFixture() }
  );

  const [tile] = state.tokens;
  assert.equal(tile.width, 60, 'aus dem Asset, nicht aus dem Feld');
  assert.equal(tile.height, 60);
  // E3:E3 ist die ausgesprochene Ausnahme: ein Bereich über einem Feld.
  const ranged = executeSequence(
    emptyState(), [placeOnCell('E3:E3')], ZONES,
    { assets: assetFixture(), grids: gridFixture() }
  );
  assert.equal(ranged.tokens[0].width, 60);
  assert.equal(ranged.tokens[0].cell, 'E3:E3');
});

test('ein Bereich mit einer Ecke außerhalb wird übersprungen, nichts liegt', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(), [placeOnCell('E3:Z99')], ZONES,
    { assets: assetFixture(), grids: gridFixture() }
  );

  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /E3:Z99/);
  assert.equal(state.tokens.length, 0);
});

test('ein vorhandenes Objekt auf einen Bereich zu schieben zieht die Maße nach', () => {
  const state = executeSequence(
    emptyState(), [placeOnCell('A1'), placeOnCell('E3:G4')], ZONES,
    { assets: assetFixture(), grids: gridFixture() }
  );

  assert.equal(state.tokens.length, 1);
  assert.deepEqual(
    { x: state.tokens[0].x, width: state.tokens[0].width, height: state.tokens[0].height },
    { x: 330, width: 180, height: 120 }
  );
});
