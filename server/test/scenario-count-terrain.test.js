// Tests für die Endkampf-Plättchen je Dörflerzahl (M31.7, Aufgabe EN): ein Eintrag in
// `terrain` darf `fromCount` tragen - er liegt, wenn **mindestens** so viele Dörfler
// sitzen. Ohne `fromCount` liegt er immer; ist die Zahl unbekannt, liegen alle.
//
// Drei Dinge sind hier die teuren Fehler:
//
// 1. **Die Karten folgen der gelegten Liste**, nicht der ungefilterten: ein Plättchen, das
//    nicht liegt, bekommt keine Karte (sonst liegt eine Geländekarte ohne ihr Plättchen).
// 2. **Die Vorprüfung prüft alle Einträge**, auch die, die diese Zahl nicht legt: ein
//    Tippfehler bei `FF5` fiele sonst erst mit fünf Dörflern auf.
// 3. **Unbekannte Zahl heißt: alle** - die bestehenden Fixtures haben keine Dörferdaten.
//
// Der Tisch kommt aus `villager-table.js` (drei Dörfler, die echten Plätze); Tische für
// zwei, vier und fünf entstehen wie in `scenario-count-stats.test.js` aus Kopien.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { executeSequenceWithLog } from '../../shared/sequenceExecutor.js';
import { terrainFor, validateScenarioData } from '../../shared/scenarioData.js';
import { build, fx, scenarioData as table, copy } from './villager-table.js';

const GRIDS = [{
  id: 'g1', label: 'Kampffeld', type: 'square',
  origin: { x: 0, y: 0 }, cell: 60, cols: 10, rows: 10,
  labels: { cols: 'alpha', rows: 'numeric' },
}];
const ZONES = [
  { id: 'z1', label: 'Bösewicht-Leiste', x: 1000, y: 100, width: 400, height: 80, accepts: ['asset'], capacity: 3, layout: 'row' },
  { id: 'z2', label: 'Geländekarten', x: 1000, y: 300, width: 800, height: 140, accepts: ['card'], capacity: 8, layout: 'row' },
];
const TILES = ['Süßes 1', 'Süßes 2', 'Süßes 3', 'Süßes 4', 'Süßes 5', 'Eigenes Teil'];
const ASSETS = [
  ...fx.assets,
  { id: 'b0', name: 'Bösewicht: Deputy Waggums', type: 'token', category: 'Bösewichte', image_path: '/b0.png', back_image_path: '/b.png', width: 60, height: 60 },
  ...TILES.map((name, i) => ({ id: `t${i}`, name, type: 'token', category: 'Gelände', image_path: `/t${i}.png`, back_image_path: null, width: 60, height: 60 })),
];
/** Je Plättchen eine gleichnamige Karte (die Zuordnung ist der erste Versuch, M8.3). */
const CARDS = TILES.map((name, i) => ({
  id: `c${i}`, game_id: 'g1', category_id: 'cat-t', category: 'Gelände', card_back_id: 'back-t',
  name, image_path: `/c${i}.png`, width: 300, height: 420,
}));
const assetId = (name) => fx.assets.find(a => a.name === name).id;

const FIELDS = ['B2', 'C2', 'D2', 'E2', 'F2'];
const finalTerrain = () => [
  { assetName: 'Süßes 1', cells: [FIELDS[0]] },
  { assetName: 'Süßes 2', cells: [FIELDS[1]] },
  { assetName: 'Süßes 3', cells: [FIELDS[2]], fromCount: 3 },
  { assetName: 'Süßes 4', cells: [FIELDS[3]], fromCount: 4 },
  { assetName: 'Süßes 5', cells: [FIELDS[4]], fromCount: 5 },
];
const bosses = () => ({
  'Deputy Waggums': {
    scenario: 'Dog Days',
    terrain: [{ assetName: 'Eigenes Teil', cells: ['H8'] }],
    fields: { B: 'J5' },
    final: { terrain: finalTerrain(), fields: { EG: FIELDS } },
  },
});
const villagersOf = (baseCount) => {
  const v = copy(table.villagers);
  v.seats.push({ ...copy(v.seats[0]), anchor: 'Tableau: Blopsy Twins' }, { ...copy(v.seats[1]), anchor: 'Tableau: Yancy Plover' });
  if (baseCount === undefined) delete v.baseCount; else v.baseCount = baseCount;
  return v;
};
const dataOf = (over = {}) => ({
  gridLabel: 'Kampffeld', cardZoneLabel: 'Geländekarten', bosses: bosses(), ...over,
  villagers: over.villagers === undefined ? villagersOf(undefined) : over.villagers,
});

const NAMES = ['Henlo Bulwark', 'Fridgette Jones', 'Granny Melba', 'Blopsy Twins', 'Yancy Plover'];
/** Ein Tisch, an dem genau diese Tableaus liegen (Plätze 1 … 5 nach `NAMES`), und der Bösewicht in der Leiste. */
function tableOf(sitting) {
  const state = build();
  const keep = sitting.map(i => `Tableau: ${NAMES[i]}`);
  state.tokens = state.tokens.filter(t => !t.label?.startsWith('Tableau: ') || keep.includes(t.label));
  for (const label of keep) {
    if (!state.tokens.some(t => t.label === label)) {
      state.tokens.push({ id: `t-${label}`, label, assetId: assetId(label), x: 10, y: 10, shape: 'image', size: 300 });
    }
  }
  return executeSequenceWithLog(state, [
    { type: 'place_asset', assetName: 'Bösewicht: Deputy Waggums', targetZoneLabel: 'Bösewicht-Leiste', faceDown: true },
  ], ZONES, { assets: ASSETS }).state;
}
const tableFor = (n) => tableOf([...Array(n).keys()]);

const STEPS = [{ type: 'reveal_next', zoneLabel: 'Bösewicht-Leiste' }, { type: 'build_scenario', final: true }];
const go = (state, data = dataOf(), steps = STEPS) =>
  executeSequenceWithLog(copy(state), steps, ZONES, { assets: ASSETS, cards: CARDS, grids: GRIDS, scenarioData: data });
const laid = (state) => state.tokens.filter(t => TILES.includes(t.label)).map(t => `${t.label}@${t.cell}`);
const cardsOf = (state) => state.cards.map(c => c.name).filter(n => TILES.includes(n));
const statuses = (r) => r.log.map(e => e.status);

// ── 1 ── terrainFor, rein ──────────────────────────────────────────────────

test('terrainFor: ohne fromCount immer, mit fromCount ab dieser Zahl aufwärts', () => {
  const part = { terrain: finalTerrain() };
  const names = (n) => terrainFor(part, n).map(t => t.assetName);
  assert.deepEqual(names(2), ['Süßes 1', 'Süßes 2']);
  assert.deepEqual(names(3), ['Süßes 1', 'Süßes 2', 'Süßes 3']);
  assert.deepEqual(names(4), ['Süßes 1', 'Süßes 2', 'Süßes 3', 'Süßes 4']);
  assert.deepEqual(names(5), TILES.slice(0, 5));
  assert.deepEqual(names(1), ['Süßes 1', 'Süßes 2']);
});

test('terrainFor: Zahl unbekannt (0, undefined, null) heißt alle Einträge', () => {
  const part = { terrain: finalTerrain() };
  for (const n of [0, undefined, null]) assert.equal(terrainFor(part, n).length, 5, String(n));
});

test('terrainFor: kein Abschnitt, keine Liste - eine leere Liste, kein Wurf', () => {
  for (const part of [undefined, null, {}, { terrain: 'nein' }, { terrain: null }]) assert.deepEqual(terrainFor(part, 3), []);
});

test('terrainFor: gibt die Einträge selbst zurück, in der Reihenfolge der Daten', () => {
  const part = { terrain: finalTerrain() };
  const got = terrainFor(part, 4);
  got.forEach((t, i) => assert.equal(t, part.terrain[i]));
});

// ── 2 ── der Tisch ─────────────────────────────────────────────────────────

test('zwei, drei, vier und fünf Dörfler: zwei, drei, vier und fünf Plättchen, auf den Feldern ihrer Einträge', () => {
  for (const n of [2, 3, 4, 5]) {
    const r = go(tableFor(n));
    assert.deepEqual(statuses(r), ['ok', 'ok'], `${n}: ${r.log.map(e => e.reason).join(' | ')}`);
    const want = TILES.slice(0, n).map((name, i) => `${name}@${FIELDS[i]}`);
    assert.deepEqual(laid(r.state).filter(s => !s.startsWith('Eigenes')), want, `Zahl ${n}`);
  }
});

test('auch mit baseCount: n gleich baseCount und n verschieden davon legen dieselbe Zahl', () => {
  const stats = { 'Deputy Waggums': { stats: { BEW: 6, LEB: 14 }, statsByCount: { 2: { BEW: 6, LEB: 12 }, 4: { BEW: 7, LEB: 17 }, 5: { BEW: 7, LEB: 20 } } } };
  for (const n of [2, 3, 4, 5]) {
    const d = dataOf({ villagers: villagersOf(3) });
    Object.assign(d.bosses['Deputy Waggums'], stats['Deputy Waggums']);
    const r = go(tableFor(n), d);
    assert.deepEqual(statuses(r), ['ok', 'ok'], `${n}: ${r.log.map(e => e.reason).join(' | ')}`);
    assert.equal(laid(r.state).filter(s => !s.startsWith('Eigenes')).length, n, `Zahl ${n}`);
  }
});

test('ohne Endkampf (final false) legt der Hauptabschnitt und nichts aus final', () => {
  const r = go(tableFor(2), dataOf(), [STEPS[0], { type: 'build_scenario', final: false }]);
  assert.deepEqual(laid(r.state), ['Eigenes Teil@H8']);
});

test('fromCount im Hauptabschnitt wirkt genauso', () => {
  const d = dataOf();
  d.bosses['Deputy Waggums'].terrain[0].fromCount = 3;
  assert.deepEqual(laid(go(tableFor(2), d, [STEPS[0], { type: 'build_scenario', final: false }]).state), []);
  assert.deepEqual(laid(go(tableFor(3), d, [STEPS[0], { type: 'build_scenario', final: false }]).state), ['Eigenes Teil@H8']);
});

// ── 3 ── die Karten folgen der gelegten Liste ─────────────────────────────

test('Plättchen und Karte gehören zusammen: fromCount 3 bei zwei Dörflern legt weder das eine noch das andere', () => {
  const d = dataOf();
  d.bosses['Deputy Waggums'].final.terrain.push({ assetName: 'Eigenes Teil', cells: ['A9'], fromCount: 3 });
  d.bosses['Deputy Waggums'].terrain = [];
  const two = go(tableFor(2), d);
  assert.deepEqual(statuses(two), ['ok', 'ok']);
  assert.deepEqual(laid(two.state).filter(s => s.startsWith('Eigenes')), [], 'kein Plättchen');
  assert.ok(!cardsOf(two.state).includes('Eigenes Teil'), 'keine Karte');
  assert.deepEqual(cardsOf(two.state), ['Süßes 1', 'Süßes 2'], 'die Karten sind genau die der gelegten Plättchen');
  const three = go(tableFor(3), d);
  assert.deepEqual(laid(three.state).filter(s => s.startsWith('Eigenes')), ['Eigenes Teil@A9']);
  assert.deepEqual(cardsOf(three.state).sort(), ['Eigenes Teil', 'Süßes 1', 'Süßes 2', 'Süßes 3']);
});

test('die Karten folgen bei jeder Zahl der gelegten Liste', () => {
  for (const n of [2, 3, 4, 5]) {
    const d = dataOf();
    d.bosses['Deputy Waggums'].terrain = [];
    const r = go(tableFor(n), d);
    assert.deepEqual(cardsOf(r.state), TILES.slice(0, n), `Zahl ${n}`);
  }
});

test('ein Name, den ein gelegter Eintrag teilt, behält seine Karte, wenn ein anderer Eintrag wegfällt', () => {
  const d = dataOf();
  d.bosses['Deputy Waggums'].terrain = [];
  d.bosses['Deputy Waggums'].final.terrain.push({ assetName: 'Süßes 1', cells: ['A9'], fromCount: 5 });
  const r = go(tableFor(2), d);
  assert.deepEqual(cardsOf(r.state), ['Süßes 1', 'Süßes 2']);
});

// ── 4 ── die Vorprüfung prüft alle ─────────────────────────────────────────

test('ein Eintrag fromCount 5 mit einem Feld, das es nicht gibt: failed schon bei zwei Dörflern, nichts liegt', () => {
  const d = dataOf();
  d.bosses['Deputy Waggums'].final.terrain[4].cells = ['Z99'];
  const prep = tableFor(2);
  const before = go(prep, d, [STEPS[0]]).state;
  const r = go(prep, d);
  assert.equal(r.log[1].status, 'failed', r.log.map(e => e.reason).join(' | '));
  assert.match(r.log[1].reason, /Z99/);
  assert.deepEqual(r.state.tokens, before.tokens, 'kein Plättchen');
  assert.deepEqual(r.state.cards, before.cards, 'keine Karte');
});

test('ein Eintrag fromCount 5 mit unbekanntem Asset: failed schon bei zwei Dörflern, nichts liegt', () => {
  const d = dataOf();
  d.bosses['Deputy Waggums'].final.terrain[4].assetName = 'Gibtsnicht';
  const prep = tableFor(2);
  const before = go(prep, d, [STEPS[0]]).state;
  const r = go(prep, d);
  assert.equal(r.log[1].status, 'failed');
  assert.match(r.log[1].reason, /Gibtsnicht/);
  assert.deepEqual(r.state.tokens, before.tokens);
  assert.deepEqual(r.state.cards, before.cards);
});

test('ein kaputtes fromCount hält ebenfalls vor dem Legen, auch bei einer Zahl, die den Eintrag legen würde', () => {
  for (const bad of ['3', 1, 6, 0, 2.5, null, true]) {
    const d = dataOf();
    d.bosses['Deputy Waggums'].final.terrain[2].fromCount = bad;
    const prep = tableFor(5);
    const before = go(prep, d, [STEPS[0]]).state;
    const r = go(prep, d);
    assert.equal(r.log[1].status, 'failed', `fromCount ${JSON.stringify(bad)}`);
    assert.match(r.log[1].reason, /fromCount/);
    assert.deepEqual(r.state.tokens, before.tokens, `fromCount ${JSON.stringify(bad)}`);
  }
});

// ── 5 ── validateScenarioData ──────────────────────────────────────────────

test('validateScenarioData: fromCount ist eine ganze Zahl 2 … 5', () => {
  const check = (fromCount, where = 'final') => {
    const d = dataOf();
    const entry = d.bosses['Deputy Waggums'];
    (where === 'final' ? entry.final.terrain : entry.terrain)[0].fromCount = fromCount;
    return validateScenarioData(d, { assets: ASSETS, grids: GRIDS });
  };
  for (const ok of [2, 3, 4, 5]) for (const where of ['final', 'main']) assert.deepEqual(check(ok, where), [], `${ok} ${where}`);
  for (const bad of [1, 6, '3', 0, 2.5, -2, null, true, [3], {}, NaN]) {
    for (const where of ['final', 'main']) {
      const p = check(bad, where);
      assert.equal(p.length, 1, `${JSON.stringify(bad)} ${where}: ${p.join(' | ')}`);
      assert.match(p[0], /"Deputy Waggums"/);
      assert.match(p[0], /fromCount/);
      assert.match(p[0], where === 'final' ? /\(final\)/ : /^"Deputy Waggums": /);
    }
  }
});

test('validateScenarioData: fromCount ist kein „unknown key" mehr, ein anderer Schlüssel bleibt es', () => {
  const d = dataOf();
  d.bosses['Deputy Waggums'].final.terrain[2].fromcount = 3;
  const p = validateScenarioData(d, { assets: ASSETS, grids: GRIDS });
  assert.equal(p.length, 1);
  assert.match(p[0], /unknown key "fromcount"/);
  assert.deepEqual(validateScenarioData(dataOf(), { assets: ASSETS, grids: GRIDS }), []);
});

// ── 6 ── ohne Dörferdaten ──────────────────────────────────────────────────

test('ohne Dörferdaten: fromCount wird nicht gefragt, alle Einträge liegen', () => {
  for (const villagers of [null, { ...villagersOf(undefined), seats: [] }, undefined]) {
    const d = dataOf({ villagers });
    if (villagers === undefined) delete d.villagers;
    const r = go(tableFor(2), d);
    assert.deepEqual(statuses(r), ['ok', 'ok'], r.log.map(e => e.reason).join(' | '));
    assert.equal(laid(r.state).filter(s => !s.startsWith('Eigenes')).length, 5);
    assert.equal(cardsOf(r.state).length, 6);
  }
});

test('Dörferdaten da, aber niemand sitzt und kein baseCount: Zahl unbekannt, alle Einträge liegen', () => {
  const r = go(tableOf([]), dataOf());
  assert.deepEqual(statuses(r), ['ok', 'ok'], r.log.map(e => e.reason).join(' | '));
  assert.equal(laid(r.state).filter(s => !s.startsWith('Eigenes')).length, 5);
});

// ── 7 ── die Zahl kommt aus villagerCount ──────────────────────────────────

test('Plätze 1 und 3 besetzt, zwei sitzen: zwei Plättchen (gezählt wird, wer sitzt, nicht der höchste Platz)', () => {
  const r = go(tableOf([0, 2]), dataOf());
  assert.deepEqual(statuses(r), ['ok', 'ok'], r.log.map(e => e.reason).join(' | '));
  assert.deepEqual(laid(r.state).filter(s => !s.startsWith('Eigenes')), ['Süßes 1@B2', 'Süßes 2@C2']);
});

test('nur Platz 5 besetzt: eine Zahl 1 legt, was ohne fromCount steht', () => {
  const r = go(tableOf([4]), dataOf());
  assert.deepEqual(laid(r.state).filter(s => !s.startsWith('Eigenes')), ['Süßes 1@B2', 'Süßes 2@C2']);
});
