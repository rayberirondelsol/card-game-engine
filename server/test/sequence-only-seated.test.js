// Tests für `onlySeated` (M31.3, Aufgabe EH): ein Schritt läuft nur, wenn am
// Platz ein Tableau liegt.
//
// Wie `onlyFinal` und `onlyChoice` bekommt ein Schritt, der nicht zu diesem
// Tisch gehört, **keine Protokollzeile** - er ist nicht gescheitert. Anders als
// `onlyFinal` ist das Gate **fail-loud**: „Laufen lassen" hieße, einen Schritt
// von Platz 4 gegen einen leeren Platz zu fahren.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { build, run, scenarioData, LINEUP, counterNamed, copy } from './villager-table.js';
import { validateOptions } from '../../shared/setupOptions.js';

const probe = (gate, name = 'Probe') => ({ type: 'place_counter', name, value: 1, x: 0, y: 0, onlySeated: gate });
const lines = (log) => log.filter(e => e.status !== 'ok');
const zwei = () => run({}, LINEUP.slice(0, 2)).state;

test('es trägt: besetzter Platz läuft, leerer nicht - und der leere hinterlässt keine Zeile', () => {
  const r = run(build(), [probe(3)]);
  assert.deepEqual(r.log.map(e => e.status), ['ok']);
  assert.ok(counterNamed(r.state, 'Probe'));

  const leer = run(zwei(), [probe(3)]);
  assert.deepEqual(leer.log, []);
  assert.equal(counterNamed(leer.state, 'Probe'), undefined);
});

test('Liste: ODER-verknüpft; [3] wie 3', () => {
  assert.ok(counterNamed(run(zwei(), [probe([2, 3])]).state, 'Probe'));
  assert.equal(counterNamed(run(zwei(), [probe([3])]).state, 'Probe'), undefined);
  assert.deepEqual(run(zwei(), [probe([3])]).log, []);
  assert.ok(counterNamed(run(build(), [probe([3])]).state, 'Probe'));
});

test('fail-loud: Unverstandenes läuft nicht, meldet failed mit onlySeated, wirft nicht', () => {
  for (const bad of ['drei', 0, -1, 4, 1.5, [], {}, true, null, [1, 4], [1, 'x']]) {
    const r = run(build(), [probe(bad)]);
    assert.equal(r.log.length, 1, `Wert ${JSON.stringify(bad)}`);
    assert.equal(r.log[0].status, 'failed', `Wert ${JSON.stringify(bad)}`);
    assert.match(r.log[0].reason, /onlySeated/, `Wert ${JSON.stringify(bad)}`);
    assert.equal(counterNamed(r.state, 'Probe'), undefined, `Wert ${JSON.stringify(bad)}`);
  }
});

test('fail-loud: ohne Dörferdaten', () => {
  const r = run(build(), [probe(1)], { scenarioData: {} });
  assert.equal(r.log.length, 1);
  assert.equal(r.log[0].status, 'failed');
  assert.match(r.log[0].reason, /onlySeated.*no villager data/);
  assert.equal(counterNamed(r.state, 'Probe'), undefined);
});

test('im selben Lauf neu gebunden: seat_villager öffnet den Platz, swap_villager ändert nichts', () => {
  const r = run({}, [
    { type: 'seat_villager', seat: 1, villager: 'Henlo Bulwark' },
    probe(1, 'eins'), probe(2, 'zwei'),
  ]);
  assert.deepEqual(r.log.map(e => [e.type, e.status]), [['seat_villager', 'ok'], ['place_counter', 'ok']]);
  assert.ok(counterNamed(r.state, 'eins'));
  assert.equal(counterNamed(r.state, 'zwei'), undefined);

  const s = run(zwei(), [
    { type: 'swap_villager', seat: 1, villager: 'Judy' },
    probe(2, 'zwei'), probe(3, 'drei'),
  ]);
  assert.equal(s.log.filter(e => e.status === 'failed').length, 0);
  assert.ok(counterNamed(s.state, 'zwei'));
  assert.equal(counterNamed(s.state, 'drei'), undefined);
});

test('zwei Gates: beide müssen passen; ein kaputtes onlyChoice wird zuerst gemeldet', () => {
  const options = { a: { label: 'A', default: 'x', choices: { x: { label: 'x', vars: { A: '1' } }, y: { label: 'y', vars: { A: '2' } } } } };
  const sd = { ...copy(scenarioData), options };
  const gates = (choice, seated) => ({ ...probe(seated), onlyChoice: choice });
  const go = (steps, state = build()) => run(state, steps, { scenarioData: sd, choices: {} });

  assert.ok(counterNamed(go([gates({ a: 'x' }, 3)]).state, 'Probe'));
  assert.equal(counterNamed(go([gates({ a: 'y' }, 3)]).state, 'Probe'), undefined);
  assert.equal(counterNamed(go([gates({ a: 'x' }, 3)], zwei()).state, 'Probe'), undefined);
  assert.deepEqual(go([gates({ a: 'y' }, 3)]).log, []);

  const both = go([gates({ gibtsnicht: 'x' }, 'drei')]);
  assert.equal(both.log.length, 1);
  assert.match(both.log[0].reason, /gibtsnicht/);
  assert.doesNotMatch(both.log[0].reason, /onlySeated/);
});

test('validateOptions: onlySeated ist in einer Aktion erlaubt, onlyChoice weiter nicht', () => {
  const options = { a: { label: 'A', default: 'x', choices: { x: { label: 'x', vars: { A: '1' } } } } };
  const action = (step) => [{ id: 'k', steps: [step] }];
  assert.deepEqual(validateOptions(options, [], action(probe(3))), []);
  const p = validateOptions(options, [], action({ ...probe(3), onlyChoice: { a: 'x' } }));
  assert.equal(p.length, 1);
  assert.match(p[0], /onlyChoice is not allowed in an action/);
});

test('in einer Aktion trägt es: der Aufruf ohne Wahl liest den Tisch', () => {
  assert.ok(counterNamed(run(build(), [probe(3)], { choices: undefined }).state, 'Probe'));
  assert.equal(counterNamed(run(zwei(), [probe(3)]).state, 'Probe'), undefined);
  assert.deepEqual(lines(run(zwei(), [probe(3)]).log), []);
});
