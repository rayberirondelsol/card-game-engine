// M7.1/G1 – eine Adresse darf ein Feldbereich sein: `E3:G4`.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Der Grund steht in der Spec: `place_asset` zentriert auf eine *Feldmitte*,
// und ein Stück mit gerader Kantenlänge hat seinen Mittelpunkt auf einer
// Feldgrenze. Es gibt kein Feld, das den Heuhaufen über E3–G4 richtig legt.
// Ein Bereich löst das, ohne irgendwo eine Ausnahme zu brauchen: ein einzelnes
// Feld *ist* der Bereich 1×1 und behält Mitte und Assetmaße Zeichen für
// Zeichen.
//
// Geprüft wird:
//   * `cellRange`: Ecke-zu-Ecke, Reihenfolge egal, ein Ende außerhalb → null
//   * `rangeLabel`: normalisiert (`G4:E3` → `E3:G4`), Einzelfeld ohne Doppelpunkt
//   * `rangeBox`/`cellPoint`: Mitte des Bereichs, nicht eines Feldes
//   * `placeOnGrids`: Maße **nur** bei einem Bereich, und beim Laden neu gerechnet
//   * `snapInto`: hält beim Ziehen die Kantenlänge, läuft nicht über den Rand

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const {
  cellRange, rangeLabel, rangeBox, cellPoint, cellFromLabel, cellCenter,
  cellAt, snapInto, placeOnGrids, resolveGrids,
} = await import('../../shared/gridGeometry.js');
const { anchorBoxes } = await import('../../shared/anchoring.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** 10×10 Felder à 60px im Ursprung: E3 ist Spalte 4, Zeile 2. */
function grid(over = {}) {
  return {
    id: 'g1', label: 'Kampffeld', type: 'square',
    origin: { x: 0, y: 0 }, cell: 60, cols: 10, rows: 10,
    labels: { cols: 'alpha', rows: 'numeric' },
    ...over,
  };
}

/** Dasselbe Raster, aber an einem Brett aufgehängt – es wächst mit. */
const anchored = (over = {}) => grid({
  anchor: { assetId: 'board', relX: 0, relY: 0, relWidth: 1, relHeight: 1 },
  ...over,
});

const board = (over = {}) => ({
  id: 'board', name: 'Brett', imageUrl: '/uploads/b.png',
  x: 300, y: 300, width: 600, height: 600, ...over,
});

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} != ${b}`);

// ── Der Bereich selbst ───────────────────────────────────────────────────────

test('E3:G4 ist drei Spalten breit und zwei Zeilen hoch', () => {
  assert.deepStrictEqual(cellRange(grid(), 'E3:G4'), { col: 4, row: 2, cols: 3, rows: 2, ranged: true });
});

test('die Reihenfolge der Ecken ist egal – G4:E3 ist derselbe Bereich', () => {
  assert.deepStrictEqual(cellRange(grid(), 'G4:E3'), cellRange(grid(), 'E3:G4'));
  assert.deepStrictEqual(cellRange(grid(), 'g4:e3'), cellRange(grid(), 'E3:G4'));
  // …und gemerkt wird die normalisierte Schreibweise.
  assert.equal(rangeLabel(grid(), cellRange(grid(), 'G4:E3')), 'E3:G4');
});

test('ein Einzelfeld ist der Bereich 1×1 und bleibt ohne Doppelpunkt', () => {
  const r = cellRange(grid(), 'C7');
  assert.deepStrictEqual(r, { ...cellFromLabel(grid(), 'C7'), cols: 1, rows: 1, ranged: false });
  assert.equal(rangeLabel(grid(), r), 'C7');
  // E3:E3 ist der ausgesprochene Bereich über einem Feld – nicht dasselbe.
  assert.equal(cellRange(grid(), 'E3:E3').ranged, true);
  assert.equal(rangeLabel(grid(), cellRange(grid(), 'E3:E3')), 'E3:E3');
});

test('ein Ende außerhalb des Rasters ist kein Bereich', () => {
  assert.equal(cellRange(grid(), 'E3:Z99'), null);
  assert.equal(cellRange(grid(), 'Z99:E3'), null);
  assert.equal(cellRange(grid(), 'E3:'), null);
  assert.equal(cellRange(grid(), 'E3:F4:G5'), null);
  assert.equal(cellRange(grid(), ''), null);
  assert.equal(cellRange(grid(), null), null);
});

// ── Die Mitte und die Maße ───────────────────────────────────────────────────

test('rangeBox deckt genau 3×2 Felder ab', () => {
  assert.deepStrictEqual(rangeBox(grid(), cellRange(grid(), 'E3:G4')),
    { x: 240, y: 120, width: 180, height: 120 });
});

test('die Mitte des Bereichs liegt waagerecht in F und senkrecht auf der Feldgrenze', () => {
  const p = cellPoint(grid(), 'E3:G4');
  // Spalte F (Index 5) geht von 300 bis 360 – die Mitte des Bereichs ist ihre Mitte.
  assert.equal(p.x, 330);
  // Zeile 3 endet bei 180, Zeile 4 beginnt dort: der Mittelpunkt sitzt auf der Grenze.
  assert.equal(p.y, 180);
  assert.equal(p.y, cellCenter(grid(), 0, 2).y + 30);
});

test('ein Einzelfeld hat dieselbe Mitte wie bisher', () => {
  const c = cellFromLabel(grid(), 'C7');
  assert.deepStrictEqual(cellPoint(grid(), 'C7'), cellCenter(grid(), c.col, c.row));
});

// ── Laden: Maße nur bei einem Bereich, und neu gerechnet ─────────────────────

test('placeOnGrids gibt einem Bereich die Maße des Bereichs', () => {
  const saved = { id: 't', gridId: 'g1', cell: 'E3:G4', x: 0, y: 0, width: 60, height: 60 };
  const [t] = placeOnGrids([saved], [grid()]);
  assert.deepStrictEqual({ x: t.x, y: t.y, width: t.width, height: t.height },
    { x: 330, y: 180, width: 180, height: 120 });
});

test('ein Einzelfeld behält die Größe seines Assets', () => {
  const saved = { id: 't', gridId: 'g1', cell: 'C7', x: 0, y: 0, width: 60, height: 90 };
  const [t] = placeOnGrids([saved], [grid()]);
  assert.deepStrictEqual({ x: t.x, y: t.y, width: t.width, height: t.height },
    { x: 150, y: 390, width: 60, height: 90 });
});

test('wird das Brett größer gezogen, wachsen die Maße beim Laden mit', () => {
  const saved = { id: 't', gridId: 'g1', cell: 'E3:G4', x: 0, y: 0, width: 180, height: 120 };
  // Doppelt so breit, halb so hoch – ein eingefrorenes Maß läge danach daneben.
  const [big] = resolveGrids([anchored()], anchorBoxes([board({ width: 1200, height: 300 })]));
  const [t] = placeOnGrids([saved], [big]);
  near(t.width, 360, 'Breite mitgewachsen');
  near(t.height, 60, 'Höhe mitgeschrumpft');
  near(t.x, cellPoint(big, 'E3:G4').x, 'Mitte x');
  near(t.y, cellPoint(big, 'E3:G4').y, 'Mitte y');
});

test('ein Bereich auf einem verschwundenen Raster bleibt, wo er war', () => {
  const saved = { id: 't', gridId: 'weg', cell: 'E3:G4', x: 11, y: 22, width: 60, height: 60 };
  assert.deepStrictEqual(placeOnGrids([saved], [grid()])[0], saved);
});

// ── Ziehen von Hand: die Kantenlänge bleibt ──────────────────────────────────

test('ein 3×2-Stück landet von Hand auf einem 3×2-Bereich', () => {
  // Irgendwo in die Nähe von H6:J7 (Spalten 7–9, Zeilen 5–6) fallen lassen.
  const ziel = cellPoint(grid(), 'H6:J7');
  const hit = snapInto(ziel.x + 12, ziel.y - 9, { grids: [grid()], cell: 'E3:G4' });

  assert.equal(hit.snapped, true);
  assert.equal(hit.cell, 'H6:J7');
  assert.deepStrictEqual({ x: hit.x, y: hit.y }, ziel);
  // Und geladen liegt es genau dort wieder.
  const [t] = placeOnGrids([{ id: 't', gridId: hit.gridId, cell: hit.cell, x: 0, y: 0 }], [grid()]);
  assert.deepStrictEqual({ x: t.x, y: t.y, width: t.width, height: t.height },
    { x: ziel.x, y: ziel.y, width: 180, height: 120 });
});

test('am Rand findet ein 3×2-Stück keinen Platz mehr', () => {
  // Mittelpunkt im letzten Feld J10: ein 3×2-Bereich liefe über zwei Ränder.
  const ecke = cellPoint(grid(), 'J10');
  assert.ok(cellAt(grid(), ecke.x, ecke.y), 'der Punkt liegt sehr wohl auf dem Raster');

  const hit = snapInto(ecke.x, ecke.y, { grids: [grid()], cell: 'E3:G4' });
  assert.equal(hit.snapped, false);
  assert.equal(hit.cell, null);
  assert.deepStrictEqual({ x: hit.x, y: hit.y }, ecke, 'der Punkt bleibt unangetastet');
});

test('ohne Bereichsadresse zieht sich alles wie bisher – ein Feld', () => {
  const p = cellPoint(grid(), 'C7');
  const alt = snapInto(p.x + 5, p.y + 5, { grids: [grid()] });
  assert.deepStrictEqual(alt, snapInto(p.x + 5, p.y + 5, { grids: [grid()], cell: 'C7' }));
  assert.equal(alt.cell, 'C7');
  assert.equal(alt.snapped, true);
});

// ── Persistenz: die beiden Token-Feldlisten (Schicht 4) ──────────────────────
//
// Keine Routenänderung nötig – `scenario_data`/`state_data` gehen untypisiert
// durch, und `rooms.js` ruft `placeOnGrids` schon nach dem Laden auf (dafür
// steht der Fall in room-start-sequence.test.js). Was fehlen *kann*, sind die
// Feldlisten in GameTable.jsx: getGameState und loadGameState zählen die Felder
// eines Tokens einzeln auf, und was in einer der beiden fehlt, überlebt den Weg
// durch die Datenbank nicht. Genau dort verliert dieses Repo am häufigsten
// (docs/audit-dead-controls.md) – und ein Bereich braucht `cell` *und* die
// nachgerechneten `width`/`height`. Für den Client gibt es keine
// Testinfrastruktur, deshalb wird der Quelltext gelesen.

const source = readFileSync(new URL('../../client/src/pages/GameTable.jsx', import.meta.url), 'utf8');

/** Der Objektliteral-Block hinter einem Marker, bis zum schließenden `}))`. */
function fieldList(marker) {
  const start = source.indexOf(marker);
  assert.ok(start >= 0, `Marker nicht gefunden: ${marker}`);
  const end = source.indexOf('}))', start);
  assert.ok(end > start, `Ende des Blocks nicht gefunden: ${marker}`);
  return source.slice(start, end);
}

test('width, height, cell und gridId stehen in beiden Token-Feldlisten', () => {
  const lists = {
    getGameState: fieldList('tokens: tokens.map(t => ({'),
    loadGameState: fieldList('state.tokens.map(t => ({'),
  };

  for (const [where, block] of Object.entries(lists)) {
    for (const field of ['width', 'height', 'cell', 'gridId']) {
      assert.ok(block.includes(`${field}: t.${field}`), `${where} führt "${field}" nicht`);
    }
  }
});
