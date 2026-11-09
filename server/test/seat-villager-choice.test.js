// DU / Spec M30.3, M30.4 — die Dörferwahl im Setup: `villager` ist ein Namensfeld,
// und die Doppelwahl ist beschlossen (Platz bleibt leer, eine Zeile im Protokoll).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die Optionen baut der Test aus dem Roster, wie M30.3 sie beschreibt: je
// `doerfler<n>` neun Wahlen, Schlüssel = Kurzname, Variable `Doerfler<n>`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { seatedVillagers } from '../../shared/villagers.js';
import { validateOptions } from '../../shared/setupOptions.js';
import { VILLAGERS, ROSTER } from '../../scripts/doerfler-daten.mjs';
import { patchActions, ohneIds } from '../../scripts/auslagen-daten.mjs';
import { fx, run, build, scenarioData } from './villager-table.js';

// Die vier Aktionen von heute: Stand der Produktion nach M27 (`auslagen-kurzpartie.json`, gepatcht).
const auslagen = JSON.parse(fs.readFileSync(new URL('./fixtures/auslagen-kurzpartie.json', import.meta.url), 'utf8'));
const aktionen = patchActions(auslagen.actionsBefore).next;

const DEFAULTS = ['Henlo', 'Fridgette', 'Granny'];
const doerfler = (n) => ({
  label: `Dörfler ${n}`, default: DEFAULTS[n - 1],
  choices: Object.fromEntries(Object.entries(ROSTER).map(([name, v]) => [v.short, { label: name, vars: { [`Doerfler${n}`]: name } }])),
});
const options = { doerfler1: doerfler(1), doerfler2: doerfler(2), doerfler3: doerfler(3) };
const mitWahl = { ...scenarioData, options };

const FOLGE = [1, 2, 3].map(n => ({ type: 'seat_villager', seat: n, villager: `$optDoerfler${n}` }));
const bauen = (choices, steps = FOLGE) => run({}, steps, { scenarioData: mitWahl, choices });
const sitzen = (state) => seatedVillagers(state, fx.assets, VILLAGERS).map(s => s.name);
const unguenstig = (log) => log.filter(e => e.status === 'failed' || e.status === 'skipped');

test('DU: die Wahl greift – Judy, Norman und Quintus sitzen, nichts wird beanstandet', () => {
  const { state, log } = bauen({ doerfler1: 'Judy', doerfler2: 'Norman', doerfler3: 'Quintus' });
  assert.deepEqual(unguenstig(log), [], log.map(e => e.reason).join('\n'));
  assert.deepEqual(sitzen(state), ['Judy Marks', 'Norman Fishboy', 'Quintus Binch']);
});

test('DU: die Vorgabe baut den Tisch von heute', () => {
  const { state, log } = bauen({});
  assert.deepEqual(unguenstig(log), []);
  const heute = build();
  for (const feld of ['tokens', 'counters', 'cards']) assert.deepEqual(ohneIds(state[feld]), ohneIds(heute[feld]), feld);
});

test('DU: ohne `choices` (wie von einer Aktion) – drei Zeilen skipped, kein Dörfler, nichts wirft', () => {
  const { state, log } = run({}, FOLGE, { scenarioData: mitWahl });
  assert.deepEqual(log.map(e => e.status), ['skipped', 'skipped', 'skipped']);
  log.forEach((e, i) => assert.ok(e.reason.includes(`$optDoerfler${i + 1} is not bound`), e.reason));
  assert.deepEqual(sitzen(state), []);
});

test('DU/M30.4: zweimal derselbe – Platz 2 bleibt leer, eine Zeile, der Rest des Aufbaus läuft', () => {
  const folge = [...FOLGE, { type: 'place_counter', name: 'Münzen (gemeinsam)', value: 0, x: 2080, y: 1430 }];
  const { state, log } = bauen({ doerfler1: 'Judy', doerfler2: 'Judy', doerfler3: 'Quintus' }, folge);
  assert.deepEqual(sitzen(state), ['Judy Marks', 'Quintus Binch']);
  assert.deepEqual(state.tokens.filter(t => t.label === 'Tableau: Judy Marks').length, 1);
  const uebersprungen = log.filter(e => e.status === 'skipped');
  assert.equal(uebersprungen.length, 1);
  assert.equal(uebersprungen[0].index, 1);
  assert.match(uebersprungen[0].reason, /"Judy Marks" already sits at seat 1/);
  assert.equal(log.filter(e => e.status === 'failed').length, 0);
  assert.ok(state.counters.some(c => c.name.startsWith('Quintus')), 'die Zähler von Platz 3 liegen');
  assert.ok(state.counters.some(c => c.name === 'Münzen (gemeinsam)'), 'der folgende place_counter lief');
});

test('DU/M30.4: dreimal derselbe – zwei leere Plätze, zwei Zeilen', () => {
  const { state, log } = bauen({ doerfler1: 'Judy', doerfler2: 'Judy', doerfler3: 'Judy' });
  assert.deepEqual(sitzen(state), ['Judy Marks']);
  assert.deepEqual(log.filter(e => e.status === 'skipped').map(e => e.index), [1, 2]);
});

test('DU: swap_villager bekommt den Platzhalter mit – "already sits", nicht "is not in the roster"', () => {
  const s = build();
  const { log } = run(s, [{ type: 'swap_villager', seat: 1, villager: '$F1' }]);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /already sits at seat 1/);
  assert.doesNotMatch(log[0].reason, /not in the roster/);
});

test('DU: validateOptions – drei Optionen, Folge mit $optDoerfler<n> und die vier Aktionen von heute bestehen', () => {
  assert.equal(aktionen.length, 4);
  assert.deepEqual(validateOptions(options, FOLGE, aktionen), []);
  const kurz = Object.values(ROSTER).map(v => v.short);
  assert.equal(kurz.length, 9);
  assert.deepEqual(Object.keys(options.doerfler1.choices), kurz);
});

test('DU: der Kommentar am Namensfeld nennt `villager` – der einzige Quelltext-Test dieser Datei', () => {
  const quelle = fs.readFileSync(new URL('../../shared/sequenceExecutor.js', import.meta.url), 'utf8');
  const zeile = quelle.split('\n').find(l => l.startsWith('const NAME_FIELDS'));
  assert.match(zeile, /'villager'/);
});
