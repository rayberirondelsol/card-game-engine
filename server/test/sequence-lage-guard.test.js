// Der Executor hält vor dem Aufbau, wenn die Lage keine ist (M31.15, Aufgabe FC).
//
// `S ≤ D` gilt vor dem Aufbau, an den Stellen, die `resolveChoices` schon rufen. Der Executor
// ist die letzte Wache: bei `S > D` baut er **nichts** und schreibt **eine** Zeile `failed`
// (`index: -1`), wie bei einer unbekannten Wahl. Ohne `villagers.lage` ändert sich nichts.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { copy, run, build, counterNamed, scenarioData } from './villager-table.js';

const NAMES = ['keiner', 'Henlo', 'Granny', 'Judy', 'Blopsy', 'Yancy'];
const choicesOf = (names) => Object.fromEntries(names.map(n => [n, { label: n }]));
const seat = (def, on) => ({
  label: 'Dörfler', default: def, choices: choicesOf(NAMES),
  ...(on ? { optional: { off: 'keiner', on, addLabel: 'Dörfler dazu' } } : {}),
});
const OPTIONS = {
  spieler: { label: 'Spieler', default: 's1', choices: Object.fromEntries([1, 2, 3, 4, 5].map(n => [`s${n}`, { label: String(n) }])) },
  doerfler1: seat('Henlo'),
  doerfler2: seat('Granny'),
  doerfler3: seat('keiner', 'Granny'),
  doerfler4: seat('keiner', 'Blopsy'),
  doerfler5: seat('keiner', 'Yancy'),
};
const LAGE = { players: 'spieler', seats: ['doerfler1', 'doerfler2', 'doerfler3', 'doerfler4', 'doerfler5'] };

// Die Dörferdaten von heute, nur Optionen (und je nach Test `lage`) kommen dazu.
const daten = (mitLage = true) => ({
  ...copy(scenarioData),
  options: copy(OPTIONS),
  villagers: { ...copy(scenarioData.villagers), ...(mitLage ? { lage: copy(LAGE) } : {}) },
});

const PROBE = [{ type: 'place_counter', name: 'Probe', value: 1, x: 0, y: 0 }];
const go = (choices, sd = daten()) => run(build(), PROBE, { scenarioData: sd, choices });

test('drei Spieler, zwei Dörfler: nichts wird gebaut, eine Zeile failed, der Zustand bleibt', () => {
  const vorher = build();
  const r = run(vorher, PROBE, { scenarioData: daten(), choices: { spieler: 's3', doerfler3: 'keiner' } });

  assert.equal(r.log.length, 1);
  assert.equal(r.log[0].index, -1);
  assert.equal(r.log[0].type, '(sequence)');
  assert.equal(r.log[0].status, 'failed');
  assert.match(r.log[0].reason, /\b3\b/);
  assert.match(r.log[0].reason, /\b2\b/);
  assert.match(r.log[0].reason, /spieler/);
  assert.match(r.log[0].reason, /^choices: lage: /);
  assert.match(r.log[0].reason, /nothing was built/);
  assert.deepEqual(r.state, vorher, 'der Zustand kam so zurück, wie er hineinging');
  assert.equal(counterNamed(r.state, 'Probe'), undefined);
});

test('die Zeile hat dieselbe Form wie die für `resolved.problems`', () => {
  const lage = run(build(), PROBE, { scenarioData: daten(), choices: { spieler: 's3', doerfler3: 'keiner' } }).log[0];
  const wahl = run(build(), PROBE, { scenarioData: daten(), choices: { spieler: 's9' } }).log[0];
  assert.equal(wahl.status, 'failed', 'die Vergleichszeile ist die der unbekannten Wahl');
  assert.deepEqual(Object.keys(lage), Object.keys(wahl));
  assert.equal(lage.index, wahl.index);
  assert.equal(lage.type, wahl.type);
  assert.equal(lage.target, wahl.target);
  assert.equal(lage.status, wahl.status);
});

test('mit zwei Spielern baut er wie heute', () => {
  const r = go({ spieler: 's2', doerfler3: 'keiner' });
  assert.deepEqual(r.log.map(e => e.status), ['ok']);
  assert.ok(counterNamed(r.state, 'Probe'));
});

test('auch die Vorgabe (ohne Wahl der Spielerzahl) ist eine Lage: solo baut', () => {
  assert.deepEqual(go({}).log.map(e => e.status), ['ok']);
});

test('ohne villagers.lage: kein Halt, keine Zeile, alles wie heute', () => {
  // dieselbe Wahl, die mit `lage` hielte
  const r = go({ spieler: 's3', doerfler3: 'keiner' }, daten(false));
  assert.deepEqual(r.log.map(e => e.status), ['ok']);
  assert.ok(counterNamed(r.state, 'Probe'));
  // und die Daten von heute, ohne eine Option `spieler`
  assert.deepEqual(run(build(), PROBE, { scenarioData, choices: {} }).log.map(e => e.status), ['ok']);
});

test('eine Aktion (ohne Wahl) hält nie: ein Spielstand kennt die Wahl nicht', () => {
  const r = run(build(), PROBE, { scenarioData: daten() });
  assert.deepEqual(r.log.map(e => e.status), ['ok']);
});

test('kaputte lage-Daten halten ebenfalls, laut und mit dem Problem im Text', () => {
  const sd = daten();
  sd.villagers.lage.players = 'mitspieler';
  const r = run(build(), PROBE, { scenarioData: sd, choices: {} });
  assert.equal(r.log.length, 1);
  assert.equal(r.log[0].index, -1);
  assert.match(r.log[0].reason, /mitspieler/);
  assert.equal(counterNamed(r.state, 'Probe'), undefined);
});

test('der Halt gilt auch bei leerer Folge', () => {
  const r = run(build(), [], { scenarioData: daten(), choices: { spieler: 's3', doerfler3: 'keiner' } });
  assert.equal(r.log.length, 1);
  assert.equal(r.log[0].status, 'failed');
});

test('lageOf wird im Executor genau einmal gerufen (M6): der Halt und ctx.lage teilen den Wert', () => {
  const src = fs.readFileSync(new URL('../../shared/sequenceExecutor.js', import.meta.url), 'utf8');
  const calls = src.split('\n').filter(l => /\blageOf\(/.test(l) && !/^\s*(\/\/|\*)/.test(l));
  assert.equal(calls.length, 1, calls.join('\n'));
});
