// Tests für `checkScenarioAspect` (M7.4): passt das Seitenverhältnis eines
// abgetippten Geländebereichs zu dem seines Bildes?
//
// Der Bereich wird von der Tableau-Rückseite abgelesen, das Bild kommt aus dem
// Import. Stimmen beide nicht überein, passt der Client das Bild per
// `object-fit: contain` in den Kasten ein: das Teil schwimmt mittig und sieht
// verrutscht aus, obwohl es auf seinen Feldern sitzt.
//
// Die Prüfung ist ein **Verdachtsmelder, kein Urteil** – ein schräg
// abfotografiertes Teil mit Teppich im Hintergrund erzeugt denselben Ausschlag
// wie ein falsch abgetippter Bereich. Was die Tests hier festhalten, ist das
// Melden, nicht die Schuldfrage.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { checkScenarioAspect, ASPECT_TOLERANCE } = await import('../../shared/scenarioGeometry.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

// A–S × 1–14, das gedruckte Raster der drei erfassten Szenariokarten.
const GRIDS = [{
  id: 'grid-fight',
  label: 'Kampffeld',
  type: 'square',
  origin: { x: 0, y: 0 },
  cell: 50,
  cols: 19,
  rows: 14,
  labels: { cols: 'alpha', rows: 'numeric' },
}];

// Die gemessenen Bildmaße der erfassten Geländeteile.
const SIZES = {
  'Holzzaun': { width: 1200, height: 300 },     // 4,00
  'Dichter Wald': { width: 2100, height: 1200 },// 1,75
  'Trüber Fluss': { width: 3600, height: 600 }, // 6,00
  'Gemüsebeet': { width: 1063, height: 1039 },  // 1,02
  'Rostige Schrottkarre': { width: 1067, height: 692 }, // 1,54
  'Marodes Farmhaus': { width: 2055, height: 1627 },    // 1,26
};

function data(terrain, final = null) {
  const entry = { scenario: 'Test', terrain };
  if (final) entry.final = final;
  return { gridLabel: 'Kampffeld', bosses: { 'Virginia Fitz': entry } };
}

const ctx = (over = {}) => ({ imageSizes: SIZES, grids: GRIDS, ...over });

// ── Was stimmt, wird nicht gemeldet ──────────────────────────────────────────

test('ein Bereich, der zum Bild passt, wird nicht gemeldet', () => {
  const found = checkScenarioAspect(
    data([{ assetName: 'Dichter Wald', cells: ['A4:G7'] }]), ctx());
  assert.deepEqual(found, []);
});

test('zwei Prozent Abweichung bleiben unter der Grenze', () => {
  // Gemüsebeet 1,023 auf 3×3 = 1,000.
  const found = checkScenarioAspect(
    data([{ assetName: 'Gemüsebeet', cells: ['G8:I10'] }]), ctx());
  assert.deepEqual(found, []);
});

// ── Was nicht stimmt, wird gemeldet ──────────────────────────────────────────

test('ein hochkant abgetippter Bereich für ein quer liegendes Bild wird gemeldet', () => {
  const found = checkScenarioAspect(
    data([{ assetName: 'Rostige Schrottkarre', cells: ['L4:M6'] }]), ctx());
  assert.equal(found.length, 1);
  assert.equal(found[0].cell, 'L4:M6');
  assert.equal(found[0].assetName, 'Rostige Schrottkarre');
  // Die Meldung nennt Bösewicht, Asset und Feld – „passt nicht" hilft beim
  // Abtippen von zwanzig Szenarien niemandem.
  assert.match(found[0].message, /Virginia Fitz/);
  assert.match(found[0].message, /Rostige Schrottkarre/);
  assert.match(found[0].message, /L4:M6/);
});

test('jedes Feld eines Eintrags wird einzeln gemeldet', () => {
  const found = checkScenarioAspect(
    data([{ assetName: 'Holzzaun', cells: ['D5:G5', 'L10:L13'] }]), ctx());
  // Ohne Drehung ist der senkrechte Zaun falsch, der waagerechte richtig.
  assert.equal(found.length, 1);
  assert.equal(found[0].cell, 'L10:L13');
});

// ── Drehung ──────────────────────────────────────────────────────────────────

test('bei rotation 90 gilt der Kehrwert', () => {
  const found = checkScenarioAspect(
    data([{ assetName: 'Holzzaun', cells: ['L10:L13'], rotation: 90 }]), ctx());
  assert.deepEqual(found, []);
});

test('bei rotation 270 gilt der Kehrwert ebenfalls', () => {
  const found = checkScenarioAspect(
    data([{ assetName: 'Holzzaun', cells: ['L10:L13'], rotation: 270 }]), ctx());
  assert.deepEqual(found, []);
});

test('rotation 180 lässt das Verhältnis, wie es ist', () => {
  const ok = checkScenarioAspect(
    data([{ assetName: 'Holzzaun', cells: ['D5:G5'], rotation: 180 }]), ctx());
  assert.deepEqual(ok, []);
  const bad = checkScenarioAspect(
    data([{ assetName: 'Holzzaun', cells: ['L10:L13'], rotation: 180 }]), ctx());
  assert.equal(bad.length, 1);
});

// ── Was die Prüfung nicht wissen kann, meldet sie nicht ──────────────────────

test('ein Asset ohne bekannte Bildmaße wird übergangen', () => {
  const found = checkScenarioAspect(
    data([{ assetName: 'Hohler Heuhaufen', cells: ['A1:A1'] }]), ctx());
  assert.deepEqual(found, []);
});

test('ohne Raster wird nichts gemeldet', () => {
  const found = checkScenarioAspect(
    data([{ assetName: 'Rostige Schrottkarre', cells: ['L4:M6'] }]), ctx({ grids: [] }));
  assert.deepEqual(found, []);
});

test('ein Feld, das es auf dem Raster nicht gibt, gehört validateScenarioData', () => {
  const found = checkScenarioAspect(
    data([{ assetName: 'Holzzaun', cells: ['Z1:Z9'] }]), ctx());
  assert.deepEqual(found, []);
});

// ── Der Endkampf-Abschnitt wird mitgeprüft ───────────────────────────────────

test('der final-Abschnitt wird mitgeprüft und als solcher benannt', () => {
  const found = checkScenarioAspect(
    data([], { terrain: [{ assetName: 'Trüber Fluss', cells: ['A7:B8'] }] }), ctx());
  assert.equal(found.length, 1);
  assert.equal(found[0].section, 'final');
  assert.match(found[0].message, /final/);
});

// ── Die Grenze ───────────────────────────────────────────────────────────────

test('die Grenze ist einstellbar und liegt vorgabegemäß bei fünf Prozent', () => {
  assert.equal(ASPECT_TOLERANCE, 0.05);
});

test('knapp unter der Grenze schweigt, knapp darüber meldet', () => {
  // Trüber Fluss 6,00 auf 11×2 = 5,50: 8,3 % daneben.
  const scenario = data([{ assetName: 'Trüber Fluss', cells: ['A7:K8'] }]);
  assert.deepEqual(checkScenarioAspect(scenario, ctx({ tolerance: 0.12 })), []);
  assert.equal(checkScenarioAspect(scenario, ctx({ tolerance: 0.05 })).length, 1);
});

test('die Vorgabe fängt einen Tippfehler von einer Spalte, zwölf Prozent nicht', () => {
  // Der Fall, an dem die Grenze entschieden wurde: ein Bereich, der um **ein**
  // Feld danebenliegt, weicht bei einer langen Kante nur um 1/n ab – beim
  // zwölf Felder breiten Fluss also um 8,3 %. Die frühere Vorgabe von zwölf
  // Prozent ließ ihn durch; das hält dieser Test fest, damit niemand sie
  // stillschweigend zurückdreht.
  const typo = data([{ assetName: 'Trüber Fluss', cells: ['A7:M8'] }]); // 13×2
  assert.equal(checkScenarioAspect(typo, ctx({ tolerance: ASPECT_TOLERANCE })).length, 1);
  assert.deepEqual(checkScenarioAspect(typo, ctx({ tolerance: 0.12 })), []);
});

// ── Form der Meldung ─────────────────────────────────────────────────────────

test('eine Meldung trägt die gemessenen Verhältnisse mit', () => {
  const [f] = checkScenarioAspect(
    data([{ assetName: 'Marodes Farmhaus', cells: ['P4:S8'] }]), ctx());
  assert.equal(f.boss, 'Virginia Fitz');
  assert.equal(f.section, 'main');
  assert.ok(Math.abs(f.area - 0.8) < 1e-9);
  assert.ok(Math.abs(f.image - 2055 / 1627) < 1e-9);
  assert.ok(f.deviation > 0.3);
});

test('leere oder fehlende Szenariodaten sind kein Fehler', () => {
  assert.deepEqual(checkScenarioAspect(null, ctx()), []);
  assert.deepEqual(checkScenarioAspect({}, ctx()), []);
  assert.deepEqual(checkScenarioAspect({ gridLabel: 'Kampffeld', bosses: {} }, ctx()), []);
});
