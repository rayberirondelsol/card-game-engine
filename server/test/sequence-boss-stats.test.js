// R4 – `build_scenario` bindet die Werte des Bösewichts
// (docs/tasks-rundenwende.md R4; Spec „Nachtrag zu M7.5").
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die BEW-/LEB-Werte stehen in §5.5 des Regelwerks, nicht im Code: der Executor
// weiß nichts über Townsfolk Tussle. Sie gehören zu den Szenariodaten und
// binden wie die einwertigen `fields` – `BEW` → `$BEW`. Kein zweiter
// Bindemechanismus, kein Sonderfall nach Schlüsselnamen.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');
const { validateScenarioData } = await import('../../shared/scenarioData.js');

const GRIDS = [{
  id: 'g1', label: 'Kampffeld', type: 'square',
  origin: { x: 0, y: 0 }, cell: 60, cols: 10, rows: 10,
  labels: { cols: 'alpha', rows: 'numeric' },
}];

const ZONES = [{
  id: 'z1', label: 'Bösewicht-Leiste', x: 1000, y: 100, width: 400, height: 80,
  accepts: ['asset'], capacity: 3, layout: 'row',
}];

const assets = () => [
  { id: 'b0', name: 'Bösewicht: Deputy Waggums', type: 'token', category: 'Bösewichte', image_path: '/a.png', back_image_path: '/b.png', width: 60, height: 60 },
  { id: 'b1', name: 'Bösewicht: Barry Bluff', type: 'token', category: 'Bösewichte', image_path: '/c.png', back_image_path: '/b.png', width: 60, height: 60 },
  { id: 'b2', name: 'Bösewicht: Namenlos', type: 'token', category: 'Bösewichte', image_path: '/d.png', back_image_path: '/b.png', width: 60, height: 60 },
  { id: 't0', name: 'Holzzaun', type: 'token', category: 'Gelände', image_path: '/t.png', back_image_path: null, width: 60, height: 60 },
];

const scenarioData = () => ({
  gridLabel: 'Kampffeld',
  bosses: {
    'Deputy Waggums': {
      scenario: 'Dog Days',
      stats: { BEW: 6, LEB: 14 },
      terrain: [{ assetName: 'Holzzaun', cells: ['C7'] }],
      fields: { B: 'J5' },
    },
    'Barry Bluff': {
      scenario: 'Masks Off',
      stats: { BEW: 'höchste Dörfler-BEW +1', LEB: 'Summe aller Dörfler-LEB +3' },
      terrain: [{ assetName: 'Holzzaun', cells: ['D7'] }],
      fields: { B: 'J5' },
    },
    Namenlos: {
      scenario: 'No Numbers',
      terrain: [{ assetName: 'Holzzaun', cells: ['E7'] }],
      fields: { B: 'J5' },
    },
  },
});

const counter = (name, extra = {}) => ({ id: name, name, value: 0, x: 0, y: 0, locked: false, ...extra });

function tableWith(...bossNames) {
  const state = { cards: [], stacks: [], tokens: [], boards: [], counters: [
    counter('Bösewicht: Bewegung', { max: 12 }),
    counter('Bösewicht: Leben', { max: 24 }),
  ] };
  return executeSequence(
    state,
    bossNames.map(n => ({ type: 'place_asset', assetName: `Bösewicht: ${n}`, targetZoneLabel: 'Bösewicht-Leiste', faceDown: true })),
    ZONES,
    { assets: assets() }
  );
}

const opts = (data = scenarioData()) => ({ assets: assets(), grids: GRIDS, scenarioData: data });
const REVEAL = { type: 'reveal_next', zoneLabel: 'Bösewicht-Leiste' };
const BUILD = { type: 'build_scenario', final: false };
const SET_BEW = { type: 'set_counter', name: 'Bösewicht: Bewegung', value: '$BEW' };
const SET_LEB = { type: 'set_counter', name: 'Bösewicht: Leben', value: '$LEB' };
const valueOf = (state, name) => state.counters.find(c => c.name === name).value;

test('$BEW und $LEB tragen die Werte des aufgedeckten Bösewichts in die Zähler', () => {
  const { state, log } = executeSequenceWithLog(
    tableWith('Deputy Waggums'), [REVEAL, BUILD, SET_BEW, SET_LEB], ZONES, opts());
  assert.deepEqual(log.map(e => e.status), ['ok', 'ok', 'ok', 'ok'], log.map(e => e.reason).join(' | '));
  assert.equal(valueOf(state, 'Bösewicht: Bewegung'), 6);
  assert.equal(valueOf(state, 'Bösewicht: Leben'), 14);
  assert.equal(state.counters.length, 2, 'die Zähler werden überschrieben, nicht vermehrt');
});

test('ein Bösewicht ohne stats bindet nichts, das Gelände liegt trotzdem', () => {
  const { state, log } = executeSequenceWithLog(
    tableWith('Namenlos'), [REVEAL, BUILD, SET_LEB], ZONES, opts());
  assert.equal(log[1].status, 'ok', log[1].reason || '');
  assert.equal(state.tokens.filter(t => t.label === 'Holzzaun').length, 1);
  assert.equal(log[2].status, 'skipped', 'ohne Bindung wird der Schritt übersprungen');
  assert.match(log[2].reason, /\$LEB/);
  assert.equal(valueOf(state, 'Bösewicht: Leben'), 0);
});

test('Barry Bluffs Formel wird gebunden und bricht den Aufbau nicht', () => {
  const { state, log } = executeSequenceWithLog(
    tableWith('Barry Bluff'), [REVEAL, BUILD, SET_LEB], ZONES, opts());
  assert.equal(log[1].status, 'ok', log[1].reason || '');
  assert.equal(state.tokens.filter(t => t.label === 'Holzzaun').length, 1, 'das Kampffeld steht');
  assert.equal(log[2].status, 'skipped');
  assert.match(log[2].reason, /Summe aller Dörfler-LEB \+3/);
  assert.equal(valueOf(state, 'Bösewicht: Leben'), 0);
});

test('ein anderer Bösewicht ergibt andere Werte – nichts ist fest verdrahtet', () => {
  const data = scenarioData();
  data.bosses['Deputy Waggums'].stats = { BEW: 2, LEB: 9 };
  const { state } = executeSequenceWithLog(
    tableWith('Deputy Waggums'), [REVEAL, BUILD, SET_BEW, SET_LEB], ZONES, opts(data));
  assert.equal(valueOf(state, 'Bösewicht: Bewegung'), 2);
  assert.equal(valueOf(state, 'Bösewicht: Leben'), 9);
});

test('stats im Endkampf-Abschnitt gewinnt, wie fields', () => {
  const data = scenarioData();
  data.bosses['Deputy Waggums'].final = { stats: { LEB: 30 }, terrain: [{ assetName: 'Holzzaun', cells: ['F7'] }] };
  const { state } = executeSequenceWithLog(
    tableWith('Deputy Waggums'), [REVEAL, { type: 'build_scenario', final: true }, SET_BEW, SET_LEB], ZONES, opts(data));
  assert.equal(valueOf(state, 'Bösewicht: Leben'), 30, 'der Endkampf ändert den Aufbau');
  assert.equal(valueOf(state, 'Bösewicht: Bewegung'), 6, 'was er nicht nennt, bleibt');
});

test('validateScenarioData hält stats nicht für Rasterfelder', () => {
  assert.deepEqual(validateScenarioData(scenarioData(), { assets: assets(), grids: GRIDS }), []);
});
