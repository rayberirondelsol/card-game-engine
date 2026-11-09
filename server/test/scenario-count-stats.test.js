// Tests für BEW und LEB je Dörflerzahl (M31.6, Aufgabe EM): `build_scenario` liest
// `stats` für die Zahl, für die es gedruckt ist (`villagers.baseCount`), und
// `statsByCount[<Zahl>]` für jede andere - und **hält vor dem ersten Plättchen**,
// wenn für die Zahl am Tisch ein Wert fehlt. Kein stiller Rückfall auf die Spalte
// für drei: sonst spielte der Tisch mit zwei Dörflern gegen die Werte für drei.
//
// Der Tisch kommt aus `villager-table.js` (drei Dörfler, die echten Plätze); die
// Tische für zwei, vier und fünf entstehen aus Kopien davon (ein Tableau weniger,
// bzw. die Tableaus von Blopsy und Yancy auf zwei zusätzlichen Plätzen).
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { executeSequenceWithLog } from '../../shared/sequenceExecutor.js';
import { validateScenarioData } from '../../shared/scenarioData.js';
import { villagerCount } from '../../shared/villagers.js';
import { build, fx, scenarioData as table, copy } from './villager-table.js';

const GRIDS = [{
  id: 'g1', label: 'Kampffeld', type: 'square',
  origin: { x: 0, y: 0 }, cell: 60, cols: 10, rows: 10,
  labels: { cols: 'alpha', rows: 'numeric' },
}];
const ZONES = [{
  id: 'z1', label: 'Bösewicht-Leiste', x: 1000, y: 100, width: 400, height: 80,
  accepts: ['asset'], capacity: 3, layout: 'row',
}];
const boss = (id, name) => ({ id, name: `Bösewicht: ${name}`, type: 'token', category: 'Bösewichte', image_path: `/${id}.png`, back_image_path: '/b.png', width: 60, height: 60 });
const ASSETS = [
  ...fx.assets,
  boss('b0', 'Deputy Waggums'), boss('b1', 'Barry Bluff'), boss('b2', 'Namenlos'),
  { id: 't0', name: 'Holzzaun', type: 'token', category: 'Gelände', image_path: '/t.png', back_image_path: null, width: 60, height: 60 },
];
const assetId = (name) => fx.assets.find(a => a.name === name).id;

const BY_COUNT = { 2: { BEW: 6, LEB: 12 }, 4: { BEW: 7, LEB: 17 }, 5: { BEW: 7, LEB: 20 } };
const bosses = () => ({
  'Deputy Waggums': {
    scenario: 'Dog Days',
    stats: { BEW: 6, LEB: 14 },
    statsByCount: copy(BY_COUNT),
    terrain: [{ assetName: 'Holzzaun', cells: ['C7'] }],
    fields: { B: 'J5' },
  },
  'Barry Bluff': {
    scenario: 'Masks Off',
    stats: { BEW: 'höchste Dörfler-BEW +1', LEB: 'Summe aller Dörfler-LEB +3' },
    terrain: [{ assetName: 'Holzzaun', cells: ['D7'] }],
    fields: { B: 'J5' },
  },
  Namenlos: { scenario: 'No Numbers', terrain: [{ assetName: 'Holzzaun', cells: ['E7'] }], fields: { B: 'J5' } },
});

/** Die Dörferdaten: die echten drei Plätze, dazu Platz 4 und 5 (Blopsy, Yancy) als Kopie von Platz 1 und 2. */
const villagersOf = (baseCount) => {
  const v = copy(table.villagers);
  v.seats.push({ ...copy(v.seats[0]), anchor: 'Tableau: Blopsy Twins' }, { ...copy(v.seats[1]), anchor: 'Tableau: Yancy Plover' });
  if (baseCount === undefined) delete v.baseCount; else v.baseCount = baseCount;
  return v;
};
const dataOf = (over = {}) => ({
  gridLabel: 'Kampffeld', bosses: bosses(), ...over,
  villagers: over.villagers === undefined ? villagersOf(3) : over.villagers,
});

/** Ein Tisch mit `n` Dörflern (Tableaus auf den Plätzen 1 … n) und dem Bösewicht in der Leiste. */
function tableFor(n, bossName = 'Deputy Waggums') {
  const state = build();
  const names = ['Henlo Bulwark', 'Fridgette Jones', 'Granny Melba', 'Blopsy Twins', 'Yancy Plover'];
  // Die ersten drei Tableaus hat `build()` gelegt; Platz 4 und 5 kommen dazu, überzählige gehen weg.
  state.tokens = state.tokens.filter(t => !t.label?.startsWith('Tableau: ') || names.slice(0, n).some(x => t.label === `Tableau: ${x}`));
  for (const name of names.slice(3, n)) {
    state.tokens.push({ id: `t-${name}`, label: `Tableau: ${name}`, assetId: assetId(`Tableau: ${name}`), x: 10, y: 10, shape: 'image', size: 300 });
  }
  return executeSequenceWithLog(state, [
    { type: 'place_asset', assetName: `Bösewicht: ${bossName}`, targetZoneLabel: 'Bösewicht-Leiste', faceDown: true },
  ], ZONES, { assets: ASSETS }).state;
}

const REVEAL = { type: 'reveal_next', zoneLabel: 'Bösewicht-Leiste' };
const BUILD = { type: 'build_scenario', final: false };
const BUILD_FINAL = { type: 'build_scenario', final: true };
const SET_BEW = { type: 'set_counter', name: 'Bösewicht: Bewegung', value: '$BEW' };
const SET_LEB = { type: 'set_counter', name: 'Bösewicht: Leben', value: '$LEB' };
const withCounters = (state) => {
  state.counters = [
    { id: 'cb', name: 'Bösewicht: Bewegung', value: 0, x: 0, y: 0, locked: false, max: 12 },
    { id: 'cl', name: 'Bösewicht: Leben', value: 0, x: 0, y: 0, locked: false, max: 24 },
  ];
  return state;
};
const go = (state, steps, data = dataOf()) =>
  executeSequenceWithLog(copy(state), steps, ZONES, { assets: ASSETS, grids: GRIDS, scenarioData: data });
const valueOf = (state, name) => state.counters.find(c => c.name === name).value;
/** Die Werte nach Aufbau und beiden Zählerschritten. */
const stats = (n, data, bossName = 'Deputy Waggums', buildStep = BUILD) => {
  const r = go(withCounters(tableFor(n, bossName)), [REVEAL, buildStep, SET_BEW, SET_LEB], data);
  return { ...r, bew: valueOf(r.state, 'Bösewicht: Bewegung'), leb: valueOf(r.state, 'Bösewicht: Leben') };
};
/** Der Halt: Schritt 2 (der Aufbau) ist `failed`, der Tisch bleibt, wie die Enthüllung ihn ließ, `$BEW` ist nicht gebunden. */
function assertHalt(n, data, pattern, bossName = 'Deputy Waggums', buildStep = BUILD) {
  const prep = withCounters(tableFor(n, bossName));
  const before = go(prep, [REVEAL], data).state;
  const r = go(prep, [REVEAL, buildStep, SET_BEW, SET_LEB], data);
  assert.equal(r.log[1].status, 'failed', r.log.map(e => e.reason).join(' | '));
  assert.match(r.log[1].reason, pattern);
  assert.deepEqual(r.state.tokens, before.tokens, 'kein Plättchen liegt');
  assert.deepEqual(r.state.cards, before.cards, 'keine Karte liegt');
  assert.equal(r.log[2].status, 'skipped', '$BEW ist nicht gebunden');
  assert.match(r.log[2].reason, /\$BEW/);
  assert.equal(valueOf(r.state, 'Bösewicht: Bewegung'), 0);
  return r;
}

// ── 1 ── ohne baseCount wie heute ──────────────────────────────────────────

test('ohne villagers.baseCount: zwei Dörfler, stats wie heute, statsByCount wird nicht gelesen', () => {
  for (const villagers of [villagersOf(undefined), null, { ...villagersOf(3), seats: [] }]) {
    const r = stats(2, dataOf({ villagers }));
    assert.deepEqual(r.log.map(e => e.status), ['ok', 'ok', 'ok', 'ok'], r.log.map(e => e.reason).join(' | '));
    assert.deepEqual([r.bew, r.leb], [6, 14]);
  }
  // Auch wenn gar nichts am Tisch sitzt: ohne baseCount keine Frage nach der Zahl.
  const r = stats(0, dataOf({ villagers: villagersOf(undefined) }));
  assert.equal(r.log[1].status, 'ok');
  assert.equal(r.leb, 14);
});

// ── 2 ── baseCount 3, drei sitzen ──────────────────────────────────────────

test('baseCount 3, drei sitzen: stats gilt', () => {
  const r = stats(3);
  assert.deepEqual(r.log.map(e => e.status), ['ok', 'ok', 'ok', 'ok']);
  assert.deepEqual([r.bew, r.leb], [6, 14]);
});

test('baseCount 3, drei sitzen: statsByCount wird nicht gelesen - fehlende Einträge halten nicht', () => {
  const d = dataOf();
  delete d.bosses['Deputy Waggums'].statsByCount;
  let r = stats(3, d);
  assert.deepEqual([r.log[1].status, r.bew, r.leb], ['ok', 6, 14]);
  d.bosses['Deputy Waggums'].statsByCount = { 2: { BEW: 1, LEB: 1 } };
  r = stats(3, d);
  assert.deepEqual([r.log[1].status, r.bew, r.leb], ['ok', 6, 14]);
});

// ── 3 ── zwei, vier, fünf ──────────────────────────────────────────────────

test('zwei, vier und fünf Dörfler: $BEW und $LEB aus dem Eintrag der Zahl', () => {
  for (const n of [2, 4, 5]) {
    const r = stats(n);
    assert.deepEqual(r.log.map(e => e.status), ['ok', 'ok', 'ok', 'ok'], `${n}: ${r.log.map(e => e.reason).join(' | ')}`);
    assert.deepEqual([r.bew, r.leb], [BY_COUNT[n].BEW, BY_COUNT[n].LEB], `Zahl ${n}`);
    assert.equal(r.state.tokens.filter(t => t.label === 'Holzzaun').length, 1, 'das Kampffeld steht');
  }
});

test('der Tisch für zwei bis fünf ist wirklich einer: villagerCount sieht sie', () => {
  for (const n of [0, 1, 2, 3, 4, 5]) assert.equal(villagerCount(tableFor(n), ASSETS, villagersOf(3)), n);
});

// ── 4 ── fehlender Eintrag: Halt vor dem Legen ─────────────────────────────

test('fehlt der Eintrag der Zahl: Halt vor dem Legen, der Tisch ist byteweise derselbe', () => {
  for (const [n, strip] of [
    [2, (e) => { delete e.statsByCount['2']; }],
    [4, (e) => { delete e.statsByCount['4']; }],
    [5, (e) => { delete e.statsByCount['5']; }],
    [2, (e) => { delete e.statsByCount; }],
  ]) {
    const d = dataOf();
    strip(d.bosses['Deputy Waggums']);
    const r = assertHalt(n, d, new RegExp(`no values for ${n} villagers`));
    assert.match(r.log[1].reason, /Deputy Waggums/);
    assert.match(r.log[1].reason, /BEW/);
    assert.match(r.log[1].reason, /LEB/);
  }
});

// ── 5 ── teilweise ─────────────────────────────────────────────────────────

test('ein Eintrag mit nur einem Namen hält ebenso', () => {
  const d = dataOf();
  d.bosses['Deputy Waggums'].statsByCount['2'] = { BEW: 6 };
  // Der Prüfer kennt den Fall schon (andere Namen als `stats`) und hält zuerst; der Halt ist derselbe.
  assertHalt(2, d, /LEB/);
});

// ── 6 ── Barry Bluff und Bösewichte ohne Werte ─────────────────────────────

test('Barry Bluff (Text) und ein Bösewicht ohne stats: kein Halt, bei jeder Zahl', () => {
  for (const n of [2, 3, 4, 5]) {
    const r = stats(n, undefined, 'Barry Bluff');
    assert.equal(r.log[1].status, 'ok', `${n}: ${r.log[1].reason || ''}`);
    assert.equal(r.log[2].status, 'skipped');
    assert.match(r.log[2].reason, /höchste Dörfler-BEW \+1/, 'die Formel bindet');
    assert.equal(r.state.tokens.filter(t => t.label === 'Holzzaun').length, 1);
    const s = stats(n, undefined, 'Namenlos');
    assert.equal(s.log[1].status, 'ok', `${n}: ${s.log[1].reason || ''}`);
  }
});

// ── 7 ── Abschnitte ────────────────────────────────────────────────────────

const withFinal = (final) => {
  const d = dataOf();
  d.bosses['Deputy Waggums'].final = { terrain: [{ assetName: 'Holzzaun', cells: ['F7'] }], ...final };
  return d;
};

test('Abschnitte: final.stats gewinnt über stats (bei der Zahl der Daten)', () => {
  const r = stats(3, withFinal({ stats: { LEB: 30 } }), 'Deputy Waggums', BUILD_FINAL);
  assert.equal(r.log[1].status, 'ok', r.log[1].reason || '');
  assert.deepEqual([r.bew, r.leb], [6, 30]);
});

test('Abschnitte: final.statsByCount gewinnt über final.stats', () => {
  const d = withFinal({ stats: { LEB: 30 }, statsByCount: { 2: { LEB: 25 } } });
  const r = stats(2, d, 'Deputy Waggums', BUILD_FINAL);
  assert.equal(r.log[1].status, 'ok', r.log[1].reason || '');
  // LEB aus dem Endkampf-Eintrag der Zahl, BEW bleibt der des Hauptabschnitts für zwei.
  assert.deepEqual([r.bew, r.leb], [6, 25]);
  // Ohne Endkampf gilt der Hauptabschnitt: LEB 12.
  assert.equal(stats(2, d).leb, 12);
});

test('Abschnitte: statsByCount des Hauptabschnitts wirkt auch im Endkampf', () => {
  for (const n of [2, 4, 5]) {
    const r = stats(n, withFinal({}), 'Deputy Waggums', BUILD_FINAL);
    assert.equal(r.log[1].status, 'ok', r.log[1].reason || '');
    assert.deepEqual([r.bew, r.leb], [BY_COUNT[n].BEW, BY_COUNT[n].LEB], `Zahl ${n}`);
    assert.equal(r.state.tokens.filter(t => t.label === 'Holzzaun').length, 2, 'Haupt- und Endkampf-Plättchen');
  }
});

test('Abschnitte: eine Zahl in final.stats ohne Eintrag der Zahl hält - kein Rückfall auf den Wert für drei', () => {
  assertHalt(2, withFinal({ stats: { LEB: 30 } }), /LEB/, 'Deputy Waggums', BUILD_FINAL);
  // Der Halt gilt dem Endkampf: ohne ihn läuft derselbe Eintrag.
  assert.equal(stats(2, withFinal({ stats: { LEB: 30 } })).log[1].status, 'ok');
});

// ── 8 ── Zahl 1, Zahl 0, keine Dörferdaten ─────────────────────────────────

test('Zahl 1: Halt, "no values for 1 villager"', () => {
  assertHalt(1, dataOf(), /no values for 1 villager\b(?!s)/);
});

test('Zahl 0 (niemand sitzt, Dörferdaten und baseCount da): Halt, nichts gelegt', () => {
  assertHalt(0, dataOf(), /nobody sits at the table/);
  // Auch für einen Bösewicht ohne Werte: ein leerer Tisch ist kein Kampf.
  assertHalt(0, dataOf(), /nobody sits at the table/, 'Barry Bluff');
});

test('keine Dörferdaten: wie heute, die Zahl wird nicht gefragt', () => {
  const r = stats(2, dataOf({ villagers: null }));
  assert.equal(r.log[1].status, 'ok');
  assert.deepEqual([r.bew, r.leb], [6, 14]);
});

// ── 9 ── validateScenarioData ──────────────────────────────────────────────

test('validateScenarioData: statsByCount und baseCount', () => {
  const check = (mutate) => {
    const d = dataOf();
    mutate(d.bosses['Deputy Waggums']);
    return validateScenarioData(d, { assets: ASSETS, grids: GRIDS });
  };
  assert.deepEqual(check(() => {}), [], 'gültige Daten');

  const only = (problems, ...parts) => {
    assert.equal(problems.length, 1, problems.join(' | '));
    for (const p of parts) assert.match(problems[0], p);
  };
  const Waggums = /Deputy Waggums/;
  only(check((e) => { e.statsByCount = [1]; }), Waggums, /statsByCount/);
  only(check((e) => { e.statsByCount = 'zwei'; }), Waggums, /statsByCount/);
  only(check((e) => { e.statsByCount = null; }), Waggums, /statsByCount/);
  for (const key of ['0', '6', 'zwei', '2.5', '-1', '']) {
    only(check((e) => { e.statsByCount = { [key]: { BEW: 1, LEB: 1 } }; }), Waggums, /statsByCount/, /key/);
  }
  only(check((e) => { e.statsByCount['2'] = { BEW: 6, MUM: 1 }; }), Waggums, /statsByCount\["2"\]/);
  only(check((e) => { e.statsByCount['2'] = { BEW: 6 }; }), Waggums, /statsByCount\["2"\]/);
  only(check((e) => { e.statsByCount['2'] = { BEW: '6', LEB: 12 }; }), Waggums, /statsByCount\["2"\]\.BEW/);
  only(check((e) => { e.statsByCount['2'] = { BEW: 6, LEB: 'zwölf' }; }), Waggums, /statsByCount\["2"\]\.LEB/);
  only(check((e) => { e.statsByCount['2'] = 'x'; }), Waggums, /statsByCount\["2"\]/);
  only(check((e) => { e.statsByCount['2'] = { BEW: Infinity, LEB: 12 }; }), Waggums, /statsByCount\["2"\]\.BEW/, /finite/);
  // Text bleibt Text, Zahl bleibt Zahl: `stats` ist hier Text, der Eintrag Zahlen - zwei Namen, zwei Probleme.
  assert.equal(check((e) => { e.stats = { BEW: 'viel', LEB: 'mehr' }; }).length >= 2, true);
  only(check((e) => { e.statsByCount['3'] = { BEW: 6, LEB: 14 }; }), Waggums, /statsByCount\["3"\]/, /baseCount/);
  // Der Endkampf-Abschnitt trägt denselben Prüfer, und der Pfad nennt ihn.
  only(check((e) => { e.final = { terrain: e.terrain, stats: { LEB: 30 }, statsByCount: { 2: { LEB: 'x' } } }; }), Waggums, /final/, /statsByCount\["2"\]\.LEB/);

  // baseCount: eine ganze Zahl 1 … 5.
  for (const bad of [0, 6, 2.5, '3', null, true, {}]) {
    const p = validateScenarioData(dataOf({ villagers: { ...villagersOf(3), baseCount: bad } }), { assets: ASSETS, grids: GRIDS });
    assert.equal(p.length, 1, `baseCount ${JSON.stringify(bad)}: ${p.join(' | ')}`);
    assert.match(p[0], /baseCount/);
  }
  assert.deepEqual(validateScenarioData(dataOf({ villagers: villagersOf(undefined) }), { assets: ASSETS, grids: GRIDS }), []);
  assert.deepEqual(validateScenarioData(dataOf({ villagers: villagersOf(1) }), { assets: ASSETS, grids: GRIDS }), []);
});

test('ein kaputter Eintrag hält auch am Tisch: derselbe Prüfer, derselbe Halt vor dem Legen', () => {
  const d = dataOf();
  d.bosses['Deputy Waggums'].statsByCount['2'] = { BEW: '6', LEB: 12 };
  assertHalt(2, d, /statsByCount/);
  assertHalt(2, dataOf({ villagers: { ...villagersOf(3), baseCount: 9 } }), /baseCount/);
});
