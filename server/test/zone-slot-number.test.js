// L1/L2 – einen Platz bei seiner Nummer nennen (docs/tasks-marker.md; Spec M8.10).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// `place_asset` fuellt eine Zone bisher der Reihe nach: der erste Marker landet
// auf Platz 0. Fuer „Marker auf Feld 15" braucht es einen Platz **nach Nummer**.
// Die Nummer steht am Platz (`slots[i].n`) und sonst ist es seine Position, von
// 1 an – damit kennt der Executor weder die Accuracy-Null noch die Kehre der
// Lebensleiste, beides steht in den Daten.
//
// Die Messdaten unten stammen unveraendert aus `leisten.json` und
// `varianten.json` (Kratzverzeichnis, gemessen und geprueft). `*_MESSUNG` sind
// die Feldmitten in Brett- bzw. Tableau-Einheiten, `*_SLOTS` dieselben Punkte
// als Bruchteil der Zonenbox, `*_ANCHOR` der Kasten als Bruchteil der Assetbox.
// Die Erwartung ist die **Messung**, nicht die Formel: das Brett liegt im Test
// so, dass Tischkoordinate und Bretteinheit zusammenfallen.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { zoneSlots, zoneSlotNumbered } = await import('../../shared/zoneGeometry.js');
const { resolveZones } = await import('../../shared/anchoring.js');
const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

// ── Messdaten ────────────────────────────────────────────────────────────────

const BEW_ANCHOR = { relX: 0.126633, relY: 0.827337, relWidth: 0.7397, relHeight: 0.028378 };
const BEW_SLOTS = [
  { n: 1, relX: 0.0504, relY: 0.6053 },
  { n: 2, relX: 0.135, relY: 0.4716 },
  { n: 3, relX: 0.2195, relY: 0.5781 },
  { n: 4, relX: 0.2953, relY: 0.4 },
  { n: 5, relX: 0.3783, relY: 0.5802 },
  { n: 6, relX: 0.4644, relY: 0.4021 },
  { n: 7, relX: 0.5422, relY: 0.6053 },
  { n: 8, relX: 0.6225, relY: 0.4155 },
  { n: 9, relX: 0.7028, relY: 0.5944 },
  { n: 10, relX: 0.7838, relY: 0.4152 },
  { n: 11, relX: 0.8675, relY: 0.5993 },
  { n: 12, relX: 0.9496, relY: 0.3944 },
];
const BEW_MESSUNG = [
  { n: 1, x: 49.17, y: 843.67 },
  { n: 2, x: 67.95, y: 839.88 },
  { n: 3, x: 86.69, y: 842.9 },
  { n: 4, x: 103.51, y: 837.85 },
  { n: 5, x: 121.93, y: 842.96 },
  { n: 6, x: 141.04, y: 837.91 },
  { n: 7, x: 158.3, y: 843.67 },
  { n: 8, x: 176.12, y: 838.29 },
  { n: 9, x: 193.95, y: 843.36 },
  { n: 10, x: 211.93, y: 838.28 },
  { n: 11, x: 230.5, y: 843.5 },
  { n: 12, x: 248.71, y: 837.69 },
];
const LEB_ANCHOR = { relX: 0.134167, relY: 0.89983, relWidth: 0.7586, relHeight: 0.061622 };
const LEB_SLOTS = [
  { n: 1, relX: 0.0492, relY: 0.2736 },
  { n: 2, relX: 0.1337, relY: 0.2122 },
  { n: 3, relX: 0.2136, relY: 0.2672 },
  { n: 4, relX: 0.2865, relY: 0.1831 },
  { n: 5, relX: 0.3708, relY: 0.2545 },
  { n: 6, relX: 0.4524, relY: 0.1816 },
  { n: 7, relX: 0.5296, relY: 0.271 },
  { n: 8, relX: 0.6069, relY: 0.1834 },
  { n: 9, relX: 0.6831, relY: 0.2862 },
  { n: 10, relX: 0.7694, relY: 0.1855 },
  { n: 11, relX: 0.8451, relY: 0.2766 },
  { n: 12, relX: 0.9508, relY: 0.3426 },
  { n: 13, relX: 0.9421, relY: 0.7416 },
  { n: 14, relX: 0.859, relY: 0.8129 },
  { n: 15, relX: 0.7701, relY: 0.7409 },
  { n: 16, relX: 0.6904, relY: 0.8182 },
  { n: 17, relX: 0.6033, relY: 0.7216 },
  { n: 18, relX: 0.5314, relY: 0.8069 },
  { n: 19, relX: 0.4548, relY: 0.7186 },
  { n: 20, relX: 0.3703, relY: 0.7994 },
  { n: 21, relX: 0.2874, relY: 0.7211 },
  { n: 22, relX: 0.2155, relY: 0.802 },
  { n: 23, relX: 0.1374, relY: 0.7474 },
  { n: 24, relX: 0.0513, relY: 0.8093 },
];
const LEB_MESSUNG = [
  { n: 1, x: 51.44, y: 915.77 },
  { n: 2, x: 70.68, y: 911.99 },
  { n: 3, x: 88.86, y: 915.38 },
  { n: 4, x: 105.45, y: 910.2 },
  { n: 5, x: 124.63, y: 914.6 },
  { n: 6, x: 143.2, y: 910.11 },
  { n: 7, x: 160.77, y: 915.61 },
  { n: 8, x: 178.37, y: 910.22 },
  { n: 9, x: 195.7, y: 916.55 },
  { n: 10, x: 215.34, y: 910.35 },
  { n: 11, x: 232.57, y: 915.96 },
  { n: 12, x: 256.64, y: 920.02 },
  { n: 13, x: 254.66, y: 944.58 },
  { n: 14, x: 235.75, y: 948.97 },
  { n: 15, x: 215.51, y: 944.54 },
  { n: 16, x: 197.37, y: 949.3 },
  { n: 17, x: 177.55, y: 943.35 },
  { n: 18, x: 161.19, y: 948.6 },
  { n: 19, x: 143.76, y: 943.17 },
  { n: 20, x: 124.52, y: 948.14 },
  { n: 21, x: 105.65, y: 943.32 },
  { n: 22, x: 89.29, y: 948.3 },
  { n: 23, x: 71.52, y: 944.94 },
  { n: 24, x: 51.93, y: 948.75 },
];
const A_HEALTH_ANCHOR = { relX: 0.546867, relY: 0.059275, relWidth: 0.095033, relHeight: 0.516275 };
const A_HEALTH_SLOTS = [
  { n: 1, relX: 0.5875, relY: 0.943 },
  { n: 2, relX: 0.4128, relY: 0.8449 },
  { n: 3, relX: 0.5844, relY: 0.7467 },
  { n: 4, relX: 0.416, relY: 0.6489 },
  { n: 5, relX: 0.5875, relY: 0.55 },
  { n: 6, relX: 0.416, relY: 0.452 },
  { n: 7, relX: 0.5875, relY: 0.3538 },
  { n: 8, relX: 0.416, relY: 0.256 },
  { n: 9, relX: 0.5875, relY: 0.1567 },
  { n: 10, relX: 0.4128, relY: 0.0571 },
];
const A_HEALTH_MESSUNG = [
  { n: 1, x: 180.81, y: 218.44 },
  { n: 2, x: 175.83, y: 198.2 },
  { n: 3, x: 180.72, y: 177.91 },
  { n: 4, x: 175.92, y: 157.71 },
  { n: 5, x: 180.81, y: 137.3 },
  { n: 6, x: 175.92, y: 117.06 },
  { n: 7, x: 180.81, y: 96.78 },
  { n: 8, x: 175.92, y: 76.58 },
  { n: 9, x: 180.81, y: 56.08 },
  { n: 10, x: 175.83, y: 35.5 },
];
const A_ACC_ANCHOR = { relX: 0.813733, relY: 0.060575, relWidth: 0.095333, relHeight: 0.5151 };
const A_ACC_SLOTS = [
  { n: -4, relX: 0.5888, relY: 0.9428 },
  { n: -3, relX: 0.4147, relY: 0.8444 },
  { n: -2, relX: 0.5888, relY: 0.7455 },
  { n: -1, relX: 0.4147, relY: 0.6474 },
  { n: 0, relX: 0.5857, relY: 0.549 },
  { n: 1, relX: 0.4147, relY: 0.4501 },
  { n: 2, relX: 0.5888, relY: 0.3521 },
  { n: 3, relX: 0.4147, relY: 0.2533 },
  { n: 4, relX: 0.5888, relY: 0.1552 },
  { n: 5, relX: 0.4115, relY: 0.0572 },
];
const A_ACC_MESSUNG = [
  { n: -4, x: 260.96, y: 218.48 },
  { n: -3, x: 255.98, y: 198.2 },
  { n: -2, x: 260.96, y: 177.83 },
  { n: -1, x: 255.98, y: 157.63 },
  { n: 0, x: 260.87, y: 137.34 },
  { n: 1, x: 255.98, y: 116.97 },
  { n: 2, x: 260.96, y: 96.78 },
  { n: 3, x: 255.98, y: 76.41 },
  { n: 4, x: 260.96, y: 56.21 },
  { n: 5, x: 255.89, y: 36.01 },
];

// ── Tisch ────────────────────────────────────────────────────────────────────

// Beide Bretter liegen so, dass ihre linke obere Ecke auf (0, 0) faellt: die
// Assetbox ist dann 0…300 x 0…999 bzw. 0…300 x 0…400, und eine Tischkoordinate
// *ist* eine Bretteinheit. Damit steht in den Erwartungen die Messung selbst.
const SIDEBOARD = { id: 'sb', assetId: 'sb', x: 150, y: 499.5, width: 300, height: 999 };
const TABLEAU = { id: 'tb', assetId: 'tb', x: 150, y: 200, width: 300, height: 400 };

const bar = (label, assetId, anchor, slots) => ({
  id: label, label, accepts: ['asset'], layout: 'slots', snap: true,
  x: 0, y: 0, width: 1, height: 1, // letzte aufgeloeste Box, wird ueberschrieben
  anchor: { assetId, ...anchor },
  slots,
});

const ZONES = [
  bar('Bösewicht: Bewegung', 'sb', BEW_ANCHOR, BEW_SLOTS),
  bar('Bösewicht: Leben', 'sb', LEB_ANCHOR, LEB_SLOTS),
  bar('Dörfler 1: Leben', 'tb', A_HEALTH_ANCHOR, A_HEALTH_SLOTS),
  bar('Dörfler 1: Treffer', 'tb', A_ACC_ANCHOR, A_ACC_SLOTS),
];

const MARKER = (name) => ({
  id: name, name, type: 'token', category: 'Marker',
  image_path: `/${name}.png`, back_image_path: null, width: 17, height: 17,
});

const assets = () => [
  MARKER('Marker: Bösewicht BEW'),
  MARKER('Marker: Bösewicht LEB'),
  MARKER('Marker 1: Leben'),
  MARKER('Marker 1: Treffer'),
  { id: 'boss', name: 'Bösewicht: Deputy Waggums', type: 'token', category: 'Bösewichte',
    image_path: '/w.png', back_image_path: '/b.png', width: 60, height: 60 },
];

const table = () => ({ cards: [], stacks: [], tokens: [], boards: [SIDEBOARD, TABLEAU], counters: [] });

const resolved = (label) => resolveZones(ZONES, [
  { id: 'sb', x: 0, y: 0, width: 300, height: 999 },
  { id: 'tb', x: 0, y: 0, width: 300, height: 400 },
]).find(z => z.label === label);

const tokenNamed = (state, name) => state.tokens.find(t => t.label === name);
const near = (got, want, tol, what) => assert.ok(
  got && Math.hypot(got.x - want.x, got.y - want.y) <= tol,
  `${what}: ${JSON.stringify(got && { x: got.x, y: got.y })} statt ${JSON.stringify({ x: want.x, y: want.y })}`
);

// ── L1: die Nummer eines Platzes ─────────────────────────────────────────────

test('ohne eigene Nummer ist die Nummer eines Platzes seine Position, von 1 an', () => {
  const zone = { x: 0, y: 0, width: 100, height: 400, layout: 'slots', snap: true,
    slots: [{ relX: 0.5, relY: 0.1 }, { relX: 0.5, relY: 0.5 }, { relX: 0.5, relY: 0.9 }] };
  assert.deepEqual(zoneSlotNumbered(zone, 1), { x: 50, y: 40 });
  assert.deepEqual(zoneSlotNumbered(zone, 3), { x: 50, y: 360 });
  assert.equal(zoneSlotNumbered(zone, 0), null, 'von 1 an, nicht von 0');
  assert.equal(zoneSlotNumbered(zone, 4), null, 'eine Nummer, die es nicht gibt, ist null');
});

test('auch eine abgeleitete Leiste (column) laesst sich bei der Nummer nennen', () => {
  const zone = { x: 0, y: 0, width: 100, height: 400, layout: 'column', capacity: 4, snap: true };
  assert.deepEqual(zoneSlotNumbered(zone, 1), { x: 50, y: 50 });
  assert.deepEqual(zoneSlotNumbered(zone, 4), { x: 50, y: 350 });
  assert.equal(zoneSlotNumbered(zone, 5), null);
});

test('eine Zone ohne Plaetze hat keine Nummern', () => {
  assert.equal(zoneSlotNumbered({ x: 0, y: 0, width: 10, height: 10, layout: 'free' }, 1), null);
  assert.equal(zoneSlotNumbered({ x: 0, y: 0, width: 10, height: 10, layout: 'slots', slots: [] }, 1), null);
});

test('was keine Zahl ist, ist keine Nummer', () => {
  const zone = { x: 0, y: 0, width: 100, height: 400, layout: 'column', capacity: 4 };
  for (const bad of ['', null, undefined, 'Feld 3', NaN]) {
    assert.equal(zoneSlotNumbered(zone, bad), null, String(bad));
  }
});

test('die Accuracy-Leiste zaehlt von -4 – der Code rechnet das nicht, die Daten sagen es', () => {
  const zone = resolved('Dörfler 1: Treffer');
  const points = zoneSlots(zone);
  // Abnahme 6 der Spec sagt "vier Felder ueber dem untersten"; gezaehlt wird
  // -4, -3, -2, -1 – das ist das **vierte** Feld, also drei ueber dem untersten.
  assert.deepEqual(zoneSlotNumbered(zone, -1), points[3]);
  assert.deepEqual(zoneSlotNumbered(zone, -4), points[0], 'das unterste Feld traegt -4');
  assert.deepEqual(zoneSlotNumbered(zone, 5), points[9]);
  assert.equal(zoneSlotNumbered(zone, 6), null, 'eine 6 gibt es auf dieser Leiste nicht');
  assert.notEqual(zoneSlotNumbered(zone, 0), null, 'die Null ist ein Feld, kein fehlender Wert');
});

// ── Die Messdaten kommen an ──────────────────────────────────────────────────

test('die gemessenen Feldmitten des Zusatz-Bretts liegen unter ihren Nummern', () => {
  for (const [label, messung] of [['Bösewicht: Bewegung', BEW_MESSUNG], ['Bösewicht: Leben', LEB_MESSUNG]]) {
    const zone = resolved(label);
    for (const f of messung) near(zoneSlotNumbered(zone, f.n), f, 0.05, `${label} Feld ${f.n}`);
  }
});

test('die gemessenen Feldmitten des Tableaus (Variante A) liegen unter ihren Nummern', () => {
  for (const [label, messung] of [['Dörfler 1: Leben', A_HEALTH_MESSUNG], ['Dörfler 1: Treffer', A_ACC_MESSUNG]]) {
    const zone = resolved(label);
    for (const f of messung) near(zoneSlotNumbered(zone, f.n), f, 0.05, `${label} Feld ${f.n}`);
  }
});

// ── L2: place_asset legt auf einen genannten Platz ───────────────────────────

const place = (steps) => executeSequenceWithLog(table(), steps, ZONES, { assets: assets() });

test('Abnahme 1/3: der Marker liegt auf dem Feld seines Startwerts, nicht auf dem ersten', () => {
  const { state, log } = place([
    { type: 'place_asset', assetName: 'Marker: Bösewicht LEB', targetZoneLabel: 'Bösewicht: Leben', slot: 15 },
    { type: 'place_asset', assetName: 'Marker: Bösewicht BEW', targetZoneLabel: 'Bösewicht: Bewegung', slot: 4 },
  ]);
  assert.deepEqual(log.map(e => e.status), ['ok', 'ok'], log.map(e => e.reason).join(' | '));
  near(tokenNamed(state, 'Marker: Bösewicht LEB'), LEB_MESSUNG[14], 0.05, 'Leben 15');
  near(tokenNamed(state, 'Marker: Bösewicht BEW'), BEW_MESSUNG[3], 0.05, 'Bewegung 4');
});

test('Abnahme 4: Feld 13 der Lebensleiste liegt in der unteren Reihe', () => {
  const { state } = place([
    { type: 'place_asset', assetName: 'Marker: Bösewicht LEB', targetZoneLabel: 'Bösewicht: Leben', slot: 13 },
  ]);
  const at13 = tokenNamed(state, 'Marker: Bösewicht LEB');
  const at12 = zoneSlotNumbered(resolved('Bösewicht: Leben'), 12);
  assert.ok(at13.y > at12.y + 15, `Feld 13 (y=${at13.y}) liegt unter Feld 12 (y=${at12.y})`);
  assert.ok(at13.x < at12.x, 'Feld 13 sitzt leicht links unter Feld 12');
});

test('Abnahme 2: auf Variante A sitzt ein ungerades Feld sichtbar versetzt zum geraden', () => {
  const zone = resolved('Dörfler 1: Leben');
  const neun = zoneSlotNumbered(zone, 9);
  const zehn = zoneSlotNumbered(zone, 10);
  assert.ok(neun.x - zehn.x > 4, `Zickzack: 9 bei x=${neun.x}, 10 bei x=${zehn.x}`);
});

test('Abnahme 6: Wert -1 trifft das vierte Feld von unten', () => {
  const { state, log } = place([
    { type: 'place_asset', assetName: 'Marker 1: Treffer', targetZoneLabel: 'Dörfler 1: Treffer', slot: -1 },
  ]);
  assert.deepEqual(log.map(e => e.status), ['ok'], log.map(e => e.reason).join(' | '));
  near(tokenNamed(state, 'Marker 1: Treffer'), A_ACC_MESSUNG[3], 0.05, 'Accuracy -1');
});

test('eine Nummer, die es nicht gibt, wird uebersprungen und gemeldet', () => {
  const { state, log } = place([
    { type: 'place_asset', assetName: 'Marker: Bösewicht BEW', targetZoneLabel: 'Bösewicht: Bewegung', slot: 13 },
  ]);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /no place/i);
  assert.equal(state.tokens.length, 0, 'lieber kein Marker als einer auf Feld 12');
});

test('ohne slot bleibt die Reihenfolge, wie sie war', () => {
  const zone = { id: 'z', label: 'Bosseleiste', x: 100, y: 200, width: 200, height: 400,
    accepts: ['asset'], layout: 'slots', snap: true,
    slots: [{ relX: 0.5, relY: 0.1 }, { relX: 0.25, relY: 0.3 }, { relX: 0.75, relY: 0.5 }] };
  const state = executeSequence({ cards: [], stacks: [], tokens: [], boards: [], counters: [] }, [
    { type: 'place_asset', assetName: 'Marker 1: Leben', targetZoneLabel: 'Bosseleiste' },
    { type: 'place_asset', assetName: 'Marker 1: Treffer', targetZoneLabel: 'Bosseleiste' },
  ], [zone], { assets: assets() });
  assert.deepEqual(
    state.tokens.map(t => ({ x: t.x, y: t.y })),
    [{ x: 200, y: 240 }, { x: 150, y: 320 }]
  );
});

test('ein leeres slot ist kein slot – der Platz kommt weiter aus der Belegung', () => {
  const { state, log } = place([
    { type: 'place_asset', assetName: 'Marker: Bösewicht BEW', targetZoneLabel: 'Bösewicht: Bewegung', slot: '' },
  ]);
  assert.equal(log[0].status, 'ok', log[0].reason);
  near(tokenNamed(state, 'Marker: Bösewicht BEW'), BEW_MESSUNG[0], 0.05, 'erster freier Platz');
});

// ── $LEB / $BEW ──────────────────────────────────────────────────────────────

const GRIDS = [{ id: 'g1', label: 'Kampffeld', type: 'square', origin: { x: 0, y: 0 }, cell: 60, cols: 10, rows: 10,
  labels: { cols: 'alpha', rows: 'numeric' } }];

const SCENARIO = (stats) => ({
  gridLabel: 'Kampffeld',
  bosses: { 'Deputy Waggums': { scenario: 'Dog Days', stats, terrain: [], fields: { B: 'J5' } } },
});

const BOSSBAR = { id: 'bb', label: 'Bosseleiste', x: 1000, y: 100, width: 400, height: 80,
  accepts: ['asset'], capacity: 3, layout: 'row' };

function afterReveal(stats, steps) {
  const start = executeSequence(table(), [
    { type: 'place_asset', assetName: 'Bösewicht: Deputy Waggums', targetZoneLabel: 'Bosseleiste', faceDown: true },
  ], [...ZONES, BOSSBAR], { assets: assets() });
  return executeSequenceWithLog(start, [
    { type: 'reveal_next', zoneLabel: 'Bosseleiste' },
    { type: 'build_scenario', final: false },
    ...steps,
  ], [...ZONES, BOSSBAR], { assets: assets(), grids: GRIDS, scenarioData: SCENARIO(stats) });
}

test('$LEB und $BEW setzen die Marker auf die Werte des aufgedeckten Boesewichts', () => {
  const { state, log } = afterReveal({ BEW: 6, LEB: 14 }, [
    { type: 'place_asset', assetName: 'Marker: Bösewicht BEW', targetZoneLabel: 'Bösewicht: Bewegung', slot: '$BEW' },
    { type: 'place_asset', assetName: 'Marker: Bösewicht LEB', targetZoneLabel: 'Bösewicht: Leben', slot: '$LEB' },
  ]);
  assert.deepEqual(log.map(e => e.status), ['ok', 'ok', 'ok', 'ok'], log.map(e => e.reason).join(' | '));
  near(tokenNamed(state, 'Marker: Bösewicht BEW'), BEW_MESSUNG[5], 0.05, 'BEW 6');
  near(tokenNamed(state, 'Marker: Bösewicht LEB'), LEB_MESSUNG[13], 0.05, 'LEB 14');
});

test('Barry Bluffs Formel ist keine Feldnummer – der Schritt sagt das, statt zu raten', () => {
  const { state, log } = afterReveal({ BEW: 'höchste Dörfler-BEW +1', LEB: 'Summe aller Dörfler-LEB +3' }, [
    { type: 'place_asset', assetName: 'Marker: Bösewicht LEB', targetZoneLabel: 'Bösewicht: Leben', slot: '$LEB' },
  ]);
  assert.equal(log[2].status, 'skipped');
  assert.match(log[2].reason, /no place/i);
  assert.equal(tokenNamed(state, 'Marker: Bösewicht LEB'), undefined);
});

test('ein nicht gebundener Platzhalter legt keinen Marker', () => {
  const { state, log } = place([
    { type: 'place_asset', assetName: 'Marker: Bösewicht LEB', targetZoneLabel: 'Bösewicht: Leben', slot: '$LEB' },
  ]);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /\$LEB/);
  assert.equal(state.tokens.length, 0);
});

// ── Ein zweiter Lauf verschiebt denselben Marker ─────────────────────────────

test('derselbe Marker zieht um, statt sich zu vermehren – das ist das Zuruecksetzen', () => {
  const { state } = place([
    { type: 'place_asset', assetName: 'Marker: Bösewicht LEB', targetZoneLabel: 'Bösewicht: Leben', slot: 9 },
    { type: 'place_asset', assetName: 'Marker: Bösewicht LEB', targetZoneLabel: 'Bösewicht: Leben', slot: 24 },
  ]);
  assert.equal(state.tokens.length, 1);
  near(state.tokens[0], LEB_MESSUNG[23], 0.05, 'Leben 24');
});

// ── L3: das Schrittvokabular ─────────────────────────────────────────────────

const { stepFields, defaultStep, describeStep, validateStep } =
  await import('../../client/src/utils/sequenceSteps.js');

test('slot gehoert zu place_asset – aber nur mit Zone', () => {
  const withZone = { type: 'place_asset', assetName: 'Marker 1: Leben', targetZoneLabel: 'Dörfler 1: Leben', slot: 7 };
  assert.ok(stepFields(withZone).includes('slot'), 'mit Zone sichtbar');

  // Ohne Zone gibt es keine Plaetze. Ein Feld ohne Wirkung waere ein
  // Versprechen, das der Aufbau nicht haelt.
  assert.equal(stepFields({ type: 'place_asset', assetName: 'X', x: 0, y: 0 }).includes('slot'), false);
  assert.equal(stepFields({ type: 'place_asset', assetName: 'X', gridLabel: 'g', cell: 'C7' }).includes('slot'), false);
});

test('ein frischer place_asset-Schritt hat kein slot gesetzt', () => {
  // Leer heisst "der Reihe nach" - das Verhalten der vorhandenen Aufbauten.
  assert.equal(defaultStep('place_asset', { assetNames: ['A'] }).slot, '');
});

test('die Zusammenfassung nennt den Platz', () => {
  assert.match(
    describeStep({ type: 'place_asset', assetName: 'Marker 1: Leben', targetZoneLabel: 'Leben', slot: 7 }),
    /place 7/
  );
  assert.equal(
    /place/.test(describeStep({ type: 'place_asset', assetName: 'Marker 1: Leben', targetZoneLabel: 'Leben' })),
    false,
    'ohne slot steht nichts da'
  );
});

test('validateStep meldet einen Platz, der keine Zahl ist – und laesst Platzhalter durch', () => {
  const ctx = { zoneLabels: ['Leben'], assetNames: ['Marker 1: Leben'] };
  const step = (slot) => ({ type: 'place_asset', assetName: 'Marker 1: Leben', targetZoneLabel: 'Leben', slot });
  assert.deepEqual(validateStep(step(15), ctx), []);
  assert.deepEqual(validateStep(step('-1'), ctx), []);
  assert.deepEqual(validateStep(step(''), ctx), [], 'leer ist gueltig: der Reihe nach');
  assert.deepEqual(validateStep(step('$LEB'), ctx), [], 'was der Platzhalter meint, weiss erst der Tisch');
  assert.equal(validateStep(step('Feld 15'), ctx).length, 1);
  assert.match(validateStep(step('Feld 15'), ctx)[0], /place/i);
  assert.equal(validateStep(step(2.5), ctx).length, 1, 'ein halbes Feld gibt es nicht');
});

// ── L6: Abnahme 5 braucht keinen Code, aber eine Pruefung ────────────────────

const { snapInto } = await import('../../shared/gridGeometry.js');

test('Abnahme 5: ein von Hand gezogener Marker rastet auf das naechste Feld ein', () => {
  const zone = resolved('Bösewicht: Leben');
  const feld = LEB_MESSUNG[16]; // Feld 17, untere Reihe
  // Daneben fallengelassen, naeher an 17 als an 16 oder 18.
  const hit = snapInto(feld.x + 4, feld.y + 6, { zone, grids: [], taken: [] });
  assert.equal(hit.snapped, true);
  near(hit, feld, 0.05, 'eingerastet auf Feld 17');
  assert.equal(hit.cell, null, 'ein Zonenplatz ist kein Rasterfeld');
});
