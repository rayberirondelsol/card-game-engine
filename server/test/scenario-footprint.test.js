// M7.3/S1–S5 – der Aufbau setzt ein Stueck auf die Flaeche, die es belegt.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Befund aus der Spec: in `scenario_data` stehen die Doerfler als Einzelfelder
// (`"D": ["K11", ...]`). Ein Einzelfeld ergab Grundflaeche 1x1, die Figur ist
// aber 100x100 und ragte auf allen vier Seiten eine halbe Feldbreite ueber.
// M7.2 half nicht: die Ableitung wird vom Aufrufer angeboten, und der Executor
// bot sie nicht an.
//
// Wichtig fuer das Lesen: `build_scenario` legt aus `fields` **nichts** hin -
// es bindet nur `$D1`. Auf den Tisch kommt die Figur einen Schritt spaeter
// durch `place_asset`, und **dort** sitzt die Ableitung. Der Geleandezweig von
// `build_scenario` bekommt dieselbe Rechnung, damit Aufbau und Ziehen fuer ein
// Gelaendeteil nicht zwei Antworten geben (Abnahme 4).

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  cellRange, rangeCenter, cellPoint, snapInto, placeOnGrids,
} = await import('../../shared/gridGeometry.js');
const { assetSize, assetToken } = await import('../../shared/assetToken.js');
const { executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** 14x14 Felder a 50px ab (0,0) – A..N quer, 1..14 runter. */
const GRID = {
  id: 'g1', label: 'Kampffeld', type: 'square',
  origin: { x: 0, y: 0 }, cell: 50, cols: 14, rows: 14,
  labels: { cols: 'alpha', rows: 'numeric' },
};
const GRIDS = [GRID];

const BOSS_BACK = '/uploads/tokens/boss-back.png';

function assetFixture() {
  return [
    // Der Boesewicht: 100x100, weil er 2x2 Felder belegt (M7.2).
    {
      id: 'boss', name: 'Bösewicht: Klaus', type: 'token', category: 'Bösewichte',
      image_path: '/uploads/tokens/boss.png', back_image_path: BOSS_BACK, width: 100, height: 100,
    },
    // Eine Doerflerin, genauso gross – Abnahme 1.
    {
      id: 'granny', name: 'Figur: Granny', type: 'token', category: 'Dörfler',
      image_path: '/uploads/tokens/granny.png', back_image_path: null, width: 100, height: 100,
    },
    // Ein Stueck von Feldgroesse – Abnahme 2.
    {
      id: 'fass', name: 'Altes Fass', type: 'token', category: 'Gelände',
      image_path: '/uploads/tokens/fass.png', back_image_path: null, width: 50, height: 50,
    },
    // Ein Grabhuegel: 45px, knapp unter Feldgroesse. Muss 1x1 bleiben.
    {
      id: 'huegel', name: 'Grabhügel', type: 'token', category: 'Gelände',
      image_path: '/uploads/tokens/huegel.png', back_image_path: null, width: 45, height: 45,
    },
    // Ein Gelaendeteil ueber drei mal drei Felder.
    {
      id: 'haus', name: 'Marodes Farmhaus', type: 'token', category: 'Gelände',
      image_path: '/uploads/tokens/haus.png', back_image_path: null, width: 150, height: 150,
    },
  ];
}

const ZONES = [{
  id: 'z1', label: 'Stufenleiste', x: 1000, y: 100, width: 400, height: 80,
  accepts: ['asset'], capacity: 4, layout: 'row',
}];

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [], counters: [] });

const opts = (scenarioData = {}) => ({ assets: assetFixture(), grids: GRIDS, scenarioData });

const statuses = (log) => log.map(e => e.status);
const reasons = (log) => log.map(e => e.reason).filter(Boolean).join(' | ');
const named = (state, name) => state.tokens.filter(t => t.label === name);

const SIZE_2 = { width: 100, height: 100 };

// ── S1: die Rechnung ─────────────────────────────────────────────────────────

test('ein Einzelfeld plus Groesse ergibt die Flaeche um den Rasterpunkt', () => {
  // `K11` bei einer Figur von zwei mal zwei Feldern deckt die vier Felder um
  // den Rasterpunkt bei K11 – dieselbe Lesart, die `rangeAt` beim Ziehen hat.
  assert.deepStrictEqual(cellRange(GRID, 'K11', SIZE_2), {
    col: 10, row: 10, cols: 2, rows: 2, ranged: true,
  });
});

test('ein Stueck von Feldgroesse bleibt ein Einzelfeld', () => {
  for (const size of [{ width: 50, height: 50 }, { width: 45, height: 45 }]) {
    assert.deepStrictEqual(cellRange(GRID, 'K11', size), {
      col: 10, row: 10, cols: 1, rows: 1, ranged: false,
    }, JSON.stringify(size));
  }
});

test('ein ausdruecklicher Bereich schlaegt die Rechnung', () => {
  // M7.1 bleibt unangetastet: was in den Szenariodaten steht, ist die genauere
  // Aussage – auch wenn das Bild etwas anderes sagt.
  assert.deepStrictEqual(cellRange(GRID, 'J8:K9', { width: 500, height: 500 }), {
    col: 9, row: 7, cols: 2, rows: 2, ranged: true,
  });
});

test('ohne brauchbare Groesse bleibt alles, wie es war', () => {
  const ohne = cellRange(GRID, 'K11');
  assert.deepStrictEqual(ohne, { col: 10, row: 10, cols: 1, rows: 1, ranged: false });
  for (const size of [null, undefined, {}, { width: 0, height: 0 }, { width: NaN, height: 100 }]) {
    assert.deepStrictEqual(cellRange(GRID, 'K11', size), ohne, JSON.stringify(size ?? null));
  }
});

test('eine abgeleitete Flaeche ueber dem Rasterrand ist kein Ziel', () => {
  // N14 ist die untere rechte Ecke eines 14x14-Rasters: fuer 2x2 ist dort kein
  // Platz mehr. `null`, wie `rangeAt` es schon haelt.
  assert.equal(cellRange(GRID, 'N14', SIZE_2), null);
  assert.ok(cellRange(GRID, 'N14'), 'das Feld selbst gibt es sehr wohl');
});

test('rangeCenter gibt die Mitte des Bereichs, cellPoint die des Feldes', () => {
  assert.deepStrictEqual(rangeCenter(GRID, cellRange(GRID, 'K11', SIZE_2)), { x: 550, y: 550 });
  assert.deepStrictEqual(cellPoint(GRID, 'K11'), { x: 525, y: 525 });
});

// ── S2: eine Antwort auf die Groesse ─────────────────────────────────────────

test('assetSize faellt auf die Breite zurueck, genau wie assetToken', () => {
  assert.deepStrictEqual(assetSize({ width: 100, height: 100 }), { width: 100, height: 100 });
  assert.deepStrictEqual(assetSize({ width: 100 }), { width: 100, height: 100 });
  assert.deepStrictEqual(assetSize({}), { width: 60, height: 60 });

  const asset = { id: 'a', name: 'x', image_path: '/x.png', width: 100 };
  const token = assetToken(asset, 0, 0, false);
  assert.deepStrictEqual({ width: token.width, height: token.height }, assetSize(asset));
});

// ── S3: place_asset ──────────────────────────────────────────────────────────

const place = (assetName, cell) => ({ type: 'place_asset', assetName, gridLabel: 'Kampffeld', cell });

test('Abnahme 1: eine Doerflerin von 100x100 auf einem Einzelfeld belegt vier Felder', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(), [place('Figur: Granny', 'K11')], ZONES, opts()
  );

  assert.deepEqual(statuses(log), ['ok'], reasons(log));
  const [granny] = named(state, 'Figur: Granny');
  assert.equal(granny.cell, 'K11:L12', 'nicht K11 – das waere die alte, stillschweigende 1x1-Annahme');
  assert.deepStrictEqual({ x: granny.x, y: granny.y }, { x: 550, y: 550 }, 'auf dem Rasterpunkt, nicht auf der Feldmitte');
  assert.deepStrictEqual({ width: granny.width, height: granny.height }, { width: 100, height: 100 });
});

test('Abnahme 2: ein Stueck von 50x50 auf einem Einzelfeld belegt weiterhin eines', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(), [place('Altes Fass', 'M3'), place('Grabhügel', 'K11')], ZONES, opts()
  );

  assert.deepEqual(statuses(log), ['ok', 'ok'], reasons(log));
  const [fass] = named(state, 'Altes Fass');
  assert.equal(fass.cell, 'M3');
  assert.deepStrictEqual({ x: fass.x, y: fass.y }, cellPoint(GRID, 'M3'));
  assert.deepStrictEqual({ width: fass.width, height: fass.height }, { width: 50, height: 50 },
    'ein Einzelfeld behaelt die Groesse seines Assets (M7.1)');

  const [huegel] = named(state, 'Grabhügel');
  assert.equal(huegel.cell, 'K11', '45px auf einem 50er-Raster runden auf ein Feld');
  assert.deepStrictEqual({ width: huegel.width, height: huegel.height }, { width: 45, height: 45 });
});

test('Abnahme 3: ein ausdruecklicher Bereich gilt unveraendert', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(), [place('Bösewicht: Klaus', 'J8:K9')], ZONES, opts()
  );

  assert.deepEqual(statuses(log), ['ok'], reasons(log));
  const [boss] = named(state, 'Bösewicht: Klaus');
  assert.equal(boss.cell, 'J8:K9');
  assert.deepStrictEqual({ x: boss.x, y: boss.y }, { x: 500, y: 400 });
  assert.deepStrictEqual({ width: boss.width, height: boss.height }, { width: 100, height: 100 });
});

test('Abnahme 5: was ueber den Rasterrand ragt, wird nicht gesetzt, sondern protokolliert', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(), [place('Figur: Granny', 'N14')], ZONES, opts()
  );

  assert.deepEqual(statuses(log), ['skipped']);
  assert.match(log[0].reason, /N14/, 'das Protokoll nennt das Feld');
  assert.match(log[0].reason, /Granny/, 'und das Stueck, das nicht passt');
  assert.equal(state.tokens.length, 0, 'nichts liegt – es wird nicht stillschweigend hineingeschoben');
});

test('ein vorhandenes Objekt wird mit seiner eigenen Groesse gerechnet', () => {
  // Massgeblich ist, was auf dem Tisch liegt – dieselbe Quelle, die das
  // Drag-Ende liest. Sonst gaeben Aufbau und Ziehen zwei Antworten.
  const state0 = emptyState();
  state0.tokens.push({
    id: 't1', assetId: 'fass', label: 'Altes Fass', shape: 'image',
    x: 0, y: 0, size: 150, width: 150, height: 150,
  });

  const { state, log } = executeSequenceWithLog(state0, [place('Altes Fass', 'E5')], ZONES, opts());

  assert.deepEqual(statuses(log), ['ok'], reasons(log));
  assert.equal(state.tokens[0].cell, 'D4:F6', 'die 150px des Tischobjekts, nicht die 50 des Assets');
});

// ── S4: build_scenario ───────────────────────────────────────────────────────

const REVEAL = { type: 'reveal_next', zoneLabel: 'Stufenleiste' };
const BUILD = { type: 'build_scenario', final: false };

/** Ein verdeckter Boesewicht in der Leiste, damit `$revealedBase` bindet. */
function barState() {
  return executeSequenceWithLog(
    emptyState(),
    [{ type: 'place_asset', assetName: 'Bösewicht: Klaus', targetZoneLabel: 'Stufenleiste', faceDown: true }],
    ZONES,
    opts()
  ).state;
}

const scenario = (terrain, fields = {}) => ({
  gridLabel: 'Kampffeld',
  bosses: { Klaus: { scenario: 'Test', terrain, fields } },
});

test('build_scenario laesst kleines Gelaende auf seinem Feld', () => {
  // Die drei erfassten Szenarien aendern sich nicht: 45–50px auf 50er-Feldern.
  const { state, log } = executeSequenceWithLog(
    barState(), [REVEAL, BUILD], ZONES,
    opts(scenario([
      { assetName: 'Altes Fass', cells: ['M3'] },
      { assetName: 'Grabhügel', cells: ['C7', 'D7', 'H9'] },
    ]))
  );

  assert.deepEqual(statuses(log), ['ok', 'ok'], reasons(log));
  assert.equal(named(state, 'Altes Fass')[0].cell, 'M3');
  assert.deepEqual(named(state, 'Grabhügel').map(t => t.cell).sort(), ['C7', 'D7', 'H9']);
  assert.equal(named(state, 'Grabhügel').length, 3, 'je Feld ein eigenes Objekt (M7)');
});

test('build_scenario leitet die Flaeche eines grossen Gelaendeteils ab', () => {
  const { state, log } = executeSequenceWithLog(
    barState(), [REVEAL, BUILD], ZONES,
    opts(scenario([{ assetName: 'Marodes Farmhaus', cells: ['E5'] }]))
  );

  assert.deepEqual(statuses(log), ['ok', 'ok'], reasons(log));
  const [haus] = named(state, 'Marodes Farmhaus');
  assert.equal(haus.cell, 'D4:F6');
  assert.deepStrictEqual({ x: haus.x, y: haus.y }, { x: 225, y: 225 });
  assert.deepStrictEqual({ width: haus.width, height: haus.height }, { width: 150, height: 150 });
});

test('build_scenario scheitert ganz, wenn eine abgeleitete Flaeche nicht passt', () => {
  // „Erst pruefen, dann legen": ein halb gestelltes Kampffeld ist schlimmer als
  // ein leeres, weil man das leere sieht.
  const { state, log } = executeSequenceWithLog(
    barState(), [REVEAL, BUILD], ZONES,
    opts(scenario([
      { assetName: 'Altes Fass', cells: ['C7'] },
      { assetName: 'Marodes Farmhaus', cells: ['N14'] },
    ]))
  );

  assert.deepEqual(statuses(log), ['ok', 'failed']);
  assert.match(log[1].reason, /N14/);
  assert.match(log[1].reason, /Farmhaus/);
  assert.equal(named(state, 'Altes Fass').length, 0, 'auch das richtige Plaettchen bleibt liegen');
});

test('Abnahme 1, durch die ganze Kette: aus "D" wird eine Figur auf vier Feldern', () => {
  const { state, log, bindings } = executeSequenceWithLog(
    barState(),
    [REVEAL, BUILD, place('$revealed', '$B'), place('Figur: Granny', '$D1')],
    ZONES,
    opts(scenario(
      [{ assetName: 'Altes Fass', cells: ['M3'] }],
      { B: 'J8:K9', D: ['K11', 'M11'] }
    ))
  );

  assert.deepEqual(statuses(log), ['ok', 'ok', 'ok', 'ok'], reasons(log));
  assert.equal(bindings.D1, 'K11', 'gebunden wird der Text, nicht die Flaeche');

  const [boss] = named(state, 'Bösewicht: Klaus');
  assert.equal(boss.cell, 'J8:K9', 'der Bereich in "B" bleibt unberuehrt');

  const [granny] = named(state, 'Figur: Granny');
  assert.equal(granny.cell, 'K11:L12', 'das Einzelfeld in "D" ist die Mitte der Figur');
});

// ── S5: Aufbau, Ziehen und Laden ─────────────────────────────────────────────

test('Abnahme 4: Aufbau, Ziehen und Laden geben eine Antwort', () => {
  const { state } = executeSequenceWithLog(
    emptyState(), [place('Figur: Granny', 'K11')], ZONES, opts()
  );
  const [granny] = named(state, 'Figur: Granny');

  // Ziehen: dieselbe Stelle noch einmal losgelassen.
  const hit = snapInto(granny.x, granny.y, {
    grids: GRIDS, cell: granny.cell, size: { width: granny.width, height: granny.height },
  });
  assert.deepStrictEqual(
    { cell: hit.cell, x: hit.x, y: hit.y, width: hit.width, height: hit.height },
    { cell: granny.cell, x: granny.x, y: granny.y, width: granny.width, height: granny.height },
    'ein Zug auf dieselbe Stelle darf nichts aendern',
  );

  // Ziehen ohne vorherige Adresse: die Rechnung allein findet dieselbe Flaeche.
  const frisch = snapInto(granny.x, granny.y, { grids: GRIDS, size: { width: 100, height: 100 } });
  assert.equal(frisch.cell, granny.cell);

  // Laden.
  const [geladen] = placeOnGrids([{ ...granny, x: 0, y: 0, width: 1, height: 1 }], GRIDS);
  assert.deepStrictEqual(
    { x: geladen.x, y: geladen.y, width: geladen.width, height: geladen.height },
    { x: granny.x, y: granny.y, width: granny.width, height: granny.height },
    'sonst springt die Figur beim naechsten Laden – der Fehler aus M3c und G5',
  );
});
