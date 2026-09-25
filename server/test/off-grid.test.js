// M10.10 / C1 – ein Stueck, das seinen Rasterplatz verliert, sagt es.
//
// Der Befund: eine Figur wurde beim Zurueckziehen ueber die unterste
// Rasterzeile hinaus auf den aufgedruckten TERRAIN-Streifen gezogen. Dort
// rastet nichts ein, die Figur steht frei – und es faellt erst auf, wenn man
// Feldabstaende nachrechnet.
//
// Gerechnet wird dafuer nichts Neues: `snapInto` antwortet bereits
// `snapped: false`, wenn weder Zonenplatz noch Rasterfeld den Wurf
// beansprucht. `offGrid` liest genau diese Antwort zusammen mit der Adresse,
// die das Stueck bisher trug. Beiseitelegen bleibt moeglich – nur still
// bleibt es nicht.
//
// Reine Logik, weil der Client keine Testinfrastruktur hat (CLAUDE.md).

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { createGrid, snapInto, offGrid, cellPoint } = await import('../../shared/gridGeometry.js');

/** Ein Raster wie die Szenariokarte: A–S x 1–14, Feldkante 40. */
function grid() {
  return createGrid({
    id: 'g-scenario', origin: { x: 100, y: 100 }, cell: 40, cols: 19, rows: 14,
  });
}

/** Die Doerfler sind seit heute 1x1 (Nachtrag zu M7.2/M7.3): 50 x 50. */
const DOERFLER = { width: 50, height: 50 };

/** Knapp unter der untersten Zeile – der TERRAIN-Streifen des Befunds. */
function unterDemRand(g) {
  const k11 = cellPoint(g, 'K11');
  return { x: k11.x, y: 100 + 14 * 40 + 25 };
}

// ── Abnahme 1 ────────────────────────────────────────────────────────────────

test('Abnahme 1: eine Figur knapp ueber den Rasterrand gezogen ist als "nicht auf dem Raster" erkennbar', () => {
  const g = grid();
  const figur = { gridId: g.id, cell: 'K11', ...DOERFLER };
  const p = unterDemRand(g);

  const hit = snapInto(p.x, p.y, { grids: [g], cell: figur.cell, size: DOERFLER });
  assert.equal(hit.snapped, false, 'ausserhalb beansprucht niemand den Wurf');
  assert.equal(offGrid(figur, hit), true);
});

test('Abnahme 1: auch ein Stueck, das nur noch `gridId` traegt, wird erkannt', () => {
  const g = grid();
  const p = unterDemRand(g);
  const hit = snapInto(p.x, p.y, { grids: [g], size: DOERFLER });
  assert.equal(offGrid({ gridId: g.id, cell: null }, hit), true);
  assert.equal(offGrid({ gridId: null, cell: 'K11' }, hit), true);
});

// ── Abnahme 2 ────────────────────────────────────────────────────────────────

test('Abnahme 2: eine Figur auf ein Rasterfeld gezogen verhaelt sich unveraendert', () => {
  const g = grid();
  const figur = { gridId: g.id, cell: 'K11', ...DOERFLER };
  const ziel = cellPoint(g, 'M11');

  const hit = snapInto(ziel.x + 6, ziel.y - 4, { grids: [g], cell: figur.cell, size: DOERFLER });
  assert.equal(hit.snapped, true);
  assert.equal(hit.cell, 'M11');
  assert.equal(offGrid(figur, hit), false, 'eingerastet ist nicht vom Raster gezogen');
});

test('Abnahme 2: auch ein Zonenplatz ist ein Platz – kein Rasterfeld, aber kein Verlust', () => {
  const g = grid();
  const zone = {
    id: 'z', label: 'Bosseleiste', x: 900, y: 40, width: 400, height: 90,
    layout: 'row', capacity: 4, snap: true,
  };
  const hit = snapInto(1000, 80, { zone, grids: [g] });
  assert.equal(hit.snapped, true);
  assert.equal(hit.cell, null, 'ein Zonenplatz ist kein Rasterfeld');
  assert.equal(offGrid({ gridId: g.id, cell: 'K11' }, hit), false);
});

// ── Abnahme 3 ────────────────────────────────────────────────────────────────

test('Abnahme 3: ein Stueck, das nie auf dem Raster war, verhaelt sich unveraendert', () => {
  const g = grid();
  const p = unterDemRand(g);
  const hit = snapInto(p.x, p.y, { grids: [g], size: DOERFLER });
  assert.equal(hit.snapped, false);
  assert.equal(offGrid({ gridId: null, cell: null }, hit), false);
  assert.equal(offGrid({}, hit), false);
  assert.equal(offGrid(undefined, hit), false);
});

test('ohne Antwort keine Marke – ein fehlendes `hit` ist keine Aussage ueber das Raster', () => {
  assert.equal(offGrid({ gridId: 'g', cell: 'K11' }, null), true,
    'kein Platz beansprucht den Wurf: dasselbe wie snapped: false');
  assert.equal(offGrid(null, null), false);
});

// ── Die Marke geht in den Raum ───────────────────────────────────────────────
//
// Der Tisch und der Raum duerfen nicht Verschiedenes sagen - dieselbe Regel wie
// bei `cell` selbst (M7.1/G5). `offGrid` gehoert deshalb in `ADDRESS_FIELDS`
// und nicht in eine zweite Liste daneben: es ist eine Aussage **ueber** die
// Adresse ("hat keine mehr, und das ist gemeint"), und ein aelterer Client, der
// das Feld nicht schickt, darf die vorhandene Marke nicht loeschen.

const { gridAddress } = await import('../../shared/gridGeometry.js');
const { handleMessage } = await import('../src/websocket/messageHandler.js');

function fakeRoom(tokens) {
  const sent = [];
  const ws = { readyState: 1, send: data => sent.push(JSON.parse(data)) };
  return {
    sent,
    players: new Map([['p1', { color: 'red' }], ['p2', { color: 'blue' }]]),
    connections: new Map([['p2', ws]]),
    zones: [],
    boardState: { cards: [], stacks: [], tokens, counters: [], notes: [], dice: [], customDice: [] },
  };
}

test('gridAddress traegt die Marke mit - und nur, wenn sie wirklich drinsteht', () => {
  assert.deepStrictEqual(gridAddress({ gridId: null, cell: null, offGrid: true }),
    { gridId: null, cell: null, offGrid: true });
  assert.deepStrictEqual(gridAddress({ x: 1, y: 2 }), {}, 'ein aelterer Client sagt nichts dazu');
});

test('token_move meldet dem Raum, dass die Figur vom Raster gezogen wurde', () => {
  const doerfler = { id: 'tok-granny', x: 540, y: 620, gridId: 'g1', cell: 'K11' };
  const room = fakeRoom([doerfler]);

  handleMessage(room, 'p1', JSON.stringify({
    type: 'token_move', token_id: 'tok-granny', x: 540, y: 800,
    gridId: null, cell: null, offGrid: true,
  }));

  assert.equal(room.boardState.tokens[0].offGrid, true);
  assert.equal(room.boardState.tokens[0].cell, null);
  assert.equal(room.sent[0].offGrid, true);
});

test('ein Zug zurueck aufs Feld nimmt die Marke im Raum wieder weg', () => {
  const room = fakeRoom([{ id: 'tok-granny', x: 540, y: 800, gridId: null, cell: null, offGrid: true }]);

  handleMessage(room, 'p1', JSON.stringify({
    type: 'token_move', token_id: 'tok-granny', x: 540, y: 620,
    gridId: 'g1', cell: 'K11', offGrid: false,
  }));

  assert.equal(room.boardState.tokens[0].offGrid, false);
  assert.equal(room.boardState.tokens[0].cell, 'K11');
});

// ── M11.9, zweite Hälfte: der gestrichelte Rand in einer Zone ────────────────
//
// „Der gestrichelte Rand aus M10.10 erscheint nicht, wenn das Stück in einer
// Zone landet. Vermutung des Spielers, ungeprüft." Hier steht die Prüfung.
// Ergebnis: die Vermutung trifft **nicht** zu, und der eine Fall, in dem der
// Rand ausbleibt, ist der, in dem er ausbleiben soll.

test('eine Zone ohne Plätze nimmt dem Stück den Rasterplatz und der Rand erscheint', () => {
  // `snapInto` fragt `zone.snap && zoneSlots(zone)`. Eine Zone ohne Anordnung
  // (oder ohne `snap`) beansprucht den Wurf nicht, das Raster darunter
  // entscheidet - und wo keins liegt, ist das Stück vom Raster.
  const zone = { label: 'Beiseite', x: 0, y: 0, width: 400, height: 400, snap: true, layout: 'free' };
  const hit = snapInto(600, 600, { zone, grids: [] });
  assert.equal(hit.snapped, false);
  assert.equal(offGrid({ gridId: 'g1', cell: 'C7' }, hit), true, 'in einer Zone bliebe der Rand aus');
});

test('eine Zone mit Plätzen gibt dem Stück einen Platz – dann ist kein Rand richtig', () => {
  // Das ist der einzige Fall, in dem der Rand in einer Zone ausbleibt, und er
  // ist kein Fehler: das Stück hat einen Platz bekommen, nur keinen des
  // Rasters. `offGrid` heißt „hat seinen Platz verloren", nicht „steht nicht
  // auf einem Rasterfeld" - sonst trüge jedes Boss-Tableau auf seiner Leiste
  // dauerhaft einen Warnrand.
  const zone = { label: 'Bosseleiste', x: 0, y: 0, width: 400, height: 100, snap: true, layout: 'row', capacity: 4 };
  const hit = snapInto(210, 60, { zone, grids: [] });
  assert.equal(hit.snapped, true);
  assert.equal(offGrid({ gridId: 'g1', cell: 'C7' }, hit), false);
});

test('ein Stück ohne vorherigen Rasterplatz bekommt in einer Zone keinen Rand', () => {
  const zone = { label: 'Beiseite', x: 0, y: 0, width: 400, height: 400, snap: true, layout: 'free' };
  const hit = snapInto(600, 600, { zone, grids: [] });
  assert.equal(offGrid({}, hit), false);
});
