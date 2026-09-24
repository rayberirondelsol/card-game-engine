// M7.2/F1–F4 – die Grundflaeche folgt der Groesse des Stuecks.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Befund aus der Spec: `snapToGrid` las die belegten Felder allein aus dem
// Feldnamen, den das Objekt schon trug. Ein einfacher Name ergab 1x1, egal wie
// gross das Bild war – eine Figur auf 100x100 ueber einem 50er-Raster ragte
// optisch ueber vier Felder und hing an einem. Deshalb hat das Vergroessern
// der Boesewichte an der Belegung nichts geaendert.
//
// Geprueft wird hier:
//   * F1: die Rechnung selbst – Bereichsname schlaegt sie, Einzelfeld nicht
//   * F1: ohne `size` bleibt alles Zeichen fuer Zeichen wie bisher (die beiden
//     Karten-Aufrufer reichen keine Groesse hinein, und sollen es nicht)
//   * F1: die Kippschwelle der Rundung
//   * F3: Ziehen und Laden geben dieselbe Antwort (M3c/G5 sind daran zweimal
//     gescheitert) – geprueft, nicht angesehen
//   * F4: die abgeleitete Adresse reist mit Massen in den Raum

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  snapInto, snapToGrid, placeOnGrids, cellPoint, gridAddress,
} = await import('../../shared/gridGeometry.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** 10x10 Felder a 50px im Ursprung – C3:D4 ist damit 100x100 gross. */
function grid(over = {}) {
  return {
    id: 'g1', label: 'Kampffeld', type: 'square',
    origin: { x: 0, y: 0 }, cell: 50, cols: 10, rows: 10,
    labels: { cols: 'alpha', rows: 'numeric' },
    ...over,
  };
}

/** Wo die Mitte eines Bereichs liegt – dorthin wird gezogen. */
const at = (g, label) => cellPoint(g, label);

// ── F1: die Rechnung ─────────────────────────────────────────────────────────

test('eine Figur von zwei Feldern Kantenlaenge rastet auf vier Felder ein', () => {
  const g = grid();
  const p = at(g, 'C3:D4');

  const hit = snapInto(p.x, p.y, { grids: [g], size: { width: 100, height: 100 } });

  assert.equal(hit.cell, 'C3:D4', 'nicht C3 – das waere die alte, stillschweigende 1x1-Annahme');
  assert.deepStrictEqual({ x: hit.x, y: hit.y }, { x: p.x, y: p.y }, 'Mitte des Bereichs, nicht einer Feldmitte');
  assert.deepStrictEqual({ width: hit.width, height: hit.height }, { width: 100, height: 100 });
});

test('ein Stueck von Feldgroesse bleibt ein Einzelfeld, ohne Masse', () => {
  const g = grid();
  const p = at(g, 'C3');

  const hit = snapInto(p.x, p.y, { grids: [g], size: { width: 50, height: 50 } });

  assert.equal(hit.cell, 'C3');
  assert.ok(!('width' in hit), 'ein Einzelfeld behaelt die Groesse seines Assets (M7.1)');
});

test('ein Bereichsname schlaegt die Rechnung', () => {
  // M7.1 bleibt unangetastet: was `build_scenario` ausdruecklich setzt, ist die
  // genauere Aussage – auch wenn das Bild etwas anderes sagt.
  const g = grid();
  const p = at(g, 'C7:D8');

  const hit = snapInto(p.x, p.y, { grids: [g], cell: 'C7:D8', size: { width: 500, height: 500 } });

  assert.equal(hit.cell, 'C7:D8');
  assert.deepStrictEqual({ width: hit.width, height: hit.height }, { width: 100, height: 100 });
});

test('ein Einzelfeld im cell schlaegt die Rechnung nicht', () => {
  // Sonst bekaeme ein Boesewicht, der vor M7.2 einmal auf einem Feld stand,
  // seine vier Felder nie – er traegt ja einen Feldnamen.
  const g = grid();
  const p = at(g, 'C3:D4');

  const hit = snapInto(p.x, p.y, { grids: [g], cell: 'A1', size: { width: 100, height: 100 } });

  assert.equal(hit.cell, 'C3:D4');
});

test('ohne Groesse bleibt alles, wie es war – der Karten-Pfad merkt nichts', () => {
  // Die beiden Karten-Aufrufer reichen keine Groesse hinein. Bekaemen Karten
  // eine Grundflaeche, wuerden sie beim Ziehen nicht, beim naechsten Laden aber
  // sehr wohl auf Feldmasse gezogen – und `card_move` schickt die Masse nicht
  // in den Raum (G5, nur andersherum).
  const g = grid();
  const p = at(g, 'C3:D4');

  const hit = snapInto(p.x, p.y, { grids: [g] });

  assert.equal(hit.cell, 'D4', 'ein Punkt auf dem Rasterkreuz trifft weiter genau ein Feld');
  assert.ok(!('width' in hit));
});

test('eine Groesse, die keine ist, aendert nichts', () => {
  const g = grid();
  const p = at(g, 'C3:D4');
  const ohne = snapInto(p.x, p.y, { grids: [g] });

  for (const size of [null, {}, { width: 0, height: 0 }, { width: NaN, height: 100 }, { width: -100, height: -100 }]) {
    assert.deepStrictEqual(snapInto(p.x, p.y, { grids: [g], size }), ohne, JSON.stringify(size));
  }
});

test('die Rundung kippt bei anderthalb Feldern', () => {
  // Abnahme 2 der Spec ist eine Aussage ueber das 50er-Raster, kein Gesetz:
  // 50/cellW >= 1,5 heisst zwei Felder, also ab cellW = 33,3 abwaerts.
  const size = { width: 50, height: 50 };
  const weit = grid({ cell: 34 });
  const eng = grid({ cell: 33 });

  assert.equal(snapInto(at(weit, 'C3').x, at(weit, 'C3').y, { grids: [weit], size }).cell, 'C3');
  assert.equal(snapInto(at(eng, 'C3:D4').x, at(eng, 'C3:D4').y, { grids: [eng], size }).cell, 'C3:D4');
});

test('ein Stueck, das groesser ist als das Raster, rastet gar nicht ein', () => {
  // Der Hauptplan (1200x1000 ueber 19x14 Feldern a 50) ist das Brett, an dem
  // das Raster haengt, kein Stueck darauf. Die Randregel aus M7.1 faengt ihn.
  const g = grid();

  const hit = snapInto(250, 250, { grids: [g], size: { width: 600, height: 600 } });

  assert.equal(hit.snapped, false);
  assert.equal(hit.cell, null);
});

test('snapToGrid nimmt die Groesse als fuenftes Argument', () => {
  const g = grid();
  const p = at(g, 'C3:D4');

  assert.equal(snapToGrid(g, p.x, p.y, null, { width: 100, height: 100 }).cell, 'C3:D4');
  assert.equal(snapToGrid(g, p.x, p.y).cell, 'D4', 'die alte Signatur bleibt gueltig');
});

// ── F3: Ziehen und Laden ─────────────────────────────────────────────────────

test('placeOnGrids setzt das Stueck genau dorthin zurueck, wo snapInto es hinlegte', () => {
  const g = grid();
  const p = at(g, 'F5:G6');
  const hit = snapInto(p.x + 9, p.y - 7, { grids: [g], size: { width: 100, height: 100 } });

  const [t] = placeOnGrids([{ id: 't', gridId: hit.gridId, cell: hit.cell, x: 0, y: 0, width: 1, height: 1 }], [g]);

  assert.deepStrictEqual(
    { x: t.x, y: t.y, width: t.width, height: t.height },
    { x: hit.x, y: hit.y, width: hit.width, height: hit.height },
    'sonst springt das Stueck beim naechsten Laden – der Fehler aus M3c und G5',
  );
});

test('die Rechnung ist idempotent – das einmal eingerastete Stueck bleibt liegen', () => {
  // Ein Gelaendeteil von 142x142 wird einmal auf 150x150 gezogen. Danach traegt
  // es einen Bereichsnamen, der die Rechnung schlaegt, und die Rechnung selbst
  // gaebe dieselbe Grundflaeche.
  const g = grid();
  const p = at(g, 'C3:E5');
  const erst = snapInto(p.x, p.y, { grids: [g], size: { width: 142, height: 142 } });
  assert.deepStrictEqual(
    { cell: erst.cell, width: erst.width, height: erst.height },
    { cell: 'C3:E5', width: 150, height: 150 },
  );

  const nochmal = snapInto(erst.x, erst.y, {
    grids: [g], cell: erst.cell, size: { width: erst.width, height: erst.height },
  });

  assert.deepStrictEqual(nochmal, erst);
});

test('ein Stueck mit Einzelfeld-Adresse aendert sich beim Laden nicht', () => {
  // Bestehende Staende bleiben, wo sie sind: die Ableitung laeuft beim Ziehen,
  // nicht beim Laden. Sonst spraenge jedes vorhandene uebergrosse Gelaendeteil
  // beim naechsten Oeffnen um mehrere Felder.
  const g = grid();
  const saved = { id: 't', gridId: 'g1', cell: 'F7', x: 0, y: 0, width: 350, height: 200 };

  const [t] = placeOnGrids([saved], [g]);

  assert.deepStrictEqual({ width: t.width, height: t.height }, { width: 350, height: 200 });
  assert.deepStrictEqual({ x: t.x, y: t.y }, at(g, 'F7'));
});

// ── F4: der Raum ─────────────────────────────────────────────────────────────

test('die abgeleitete Adresse reist samt Massen in den Raum', () => {
  const g = grid();
  const p = at(g, 'C3:D4');
  const hit = snapInto(p.x, p.y, { grids: [g], size: { width: 100, height: 100 } });
  const { snapped: _s, ...place } = hit;

  assert.deepStrictEqual(gridAddress({ type: 'token_move', token_id: 't', ...place }), {
    gridId: 'g1', cell: 'C3:D4', width: 100, height: 100,
  });
});
