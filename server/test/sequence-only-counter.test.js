// Tests für `onlyCounter` (M31.15, Aufgabe FB): ein Schritt läuft nur, wenn am
// Tisch ein Zähler dieses Namens liegt - `"!Name"` heißt: nur wenn keiner liegt.
//
// Die Aktionen kennen die Lage nicht, sie lesen den Tisch, und der Tisch trägt die
// Form des Geldes: solo heißt, es liegt `Münzen (gemeinsam)`. Wie die anderen Gates
// hinterlässt ein Schritt, der nicht zu diesem Tisch gehört, **keine Protokollzeile**;
// Unverstandenes ist laut.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { build, run, LINEUP, counterNamed } from './villager-table.js';
import { validateOptions } from '../../shared/setupOptions.js';

const GEMEINSAM = 'Münzen (gemeinsam)';
const probe = (gate, name = 'Probe') => ({ type: 'place_counter', name, value: 1, x: 0, y: 0, onlyCounter: gate });
const topf = (name = GEMEINSAM) => ({ type: 'place_counter', name, value: 10, x: 5, y: 5 });
const lines = (log) => log.filter(e => e.status !== 'ok');
const solo = () => run(build(), [topf()]).state;

test('es trägt: liegt der Zähler, läuft der Schritt - sonst nicht, und ohne Protokollzeile', () => {
  const mit = run(solo(), [probe(GEMEINSAM)]);
  assert.deepEqual(mit.log.map(e => e.status), ['ok']);
  assert.ok(counterNamed(mit.state, 'Probe'));

  const ohne = run(build(), [probe(GEMEINSAM)]);
  assert.deepEqual(ohne.log, []);
  assert.equal(counterNamed(ohne.state, 'Probe'), undefined);
});

test('verneint: "!Name" läuft nur, wenn keiner liegt', () => {
  const ohne = run(build(), [probe('!' + GEMEINSAM)]);
  assert.deepEqual(ohne.log.map(e => e.status), ['ok']);
  assert.ok(counterNamed(ohne.state, 'Probe'));

  const mit = run(solo(), [probe('!' + GEMEINSAM)]);
  assert.deepEqual(mit.log, []);
  assert.equal(counterNamed(mit.state, 'Probe'), undefined);
});

test('ein Name, der nicht am Tisch liegt, ist kein Fehler - auch nicht auf einem leeren Tisch', () => {
  for (const state of [build(), {}, { counters: [] }]) {
    const r = run(state, [probe('Gibt es nicht')]);
    assert.deepEqual(r.log, []);
    assert.equal((r.state.counters ?? []).some(c => c.name === 'Probe'), false);
    const v = run(state, [probe('!Gibt es nicht')]);
    assert.deepEqual(v.log.map(e => e.status), ['ok']);
  }
});

test('fail-loud: Unverstandenes läuft nicht, meldet failed mit onlyCounter, wirft nicht', () => {
  for (const bad of ['', '!', '!!x', '  ', '! ', 5, 0, true, [], [GEMEINSAM], {}, null]) {
    const r = run(solo(), [probe(bad)]);
    assert.equal(r.log.length, 1, `Wert ${JSON.stringify(bad)}`);
    assert.equal(r.log[0].status, 'failed', `Wert ${JSON.stringify(bad)}`);
    assert.match(r.log[0].reason, /onlyCounter/, `Wert ${JSON.stringify(bad)}`);
    assert.equal(counterNamed(r.state, 'Probe'), undefined, `Wert ${JSON.stringify(bad)}`);
  }
});

test('Groß-/Kleinschreibung und Leerraum: wie überall beim Vergleich von Namen (norm)', () => {
  assert.ok(counterNamed(run(solo(), [probe('MÜNZEN (gemeinsam)')]).state, 'Probe'));
  assert.ok(counterNamed(run(solo(), [probe('  münzen (GEMEINSAM) ')]).state, 'Probe'));
  assert.equal(counterNamed(run(solo(), [probe('!münzen (GEMEINSAM)')]).state, 'Probe'), undefined);
  assert.deepEqual(run(solo(), [probe('!MÜNZEN (gemeinsam)')]).log, []);
  // der Zähler selbst darf anders geschrieben liegen als das Gate
  const r = run(build(), [topf('MÜNZEN (GEMEINSAM)'), probe(GEMEINSAM)]);
  assert.ok(counterNamed(r.state, 'Probe'));
});

test('im selben Lauf neu gebunden: ein Zähler, der mitten im Lauf gelegt wird, wird gesehen', () => {
  for (const start of [build(), {}, { counters: [] }]) {
    const r = run(start, [
      probe('Münzen Dörfler 1', 'davor'),
      { type: 'place_counter', name: 'Münzen Dörfler 1', value: 15, x: 1, y: 1 },
      probe('Münzen Dörfler 1', 'danach'),
      probe('!Münzen Dörfler 1', 'danach-nicht'),
    ]);
    assert.deepEqual(r.log.map(e => e.status), ['ok', 'ok'], 'place_counter und danach, sonst nichts');
    assert.equal(counterNamed(r.state, 'davor'), undefined);
    assert.ok(counterNamed(r.state, 'danach'));
    assert.equal(counterNamed(r.state, 'danach-nicht'), undefined);
  }
});

test('im selben Lauf neu gebunden: swap_villager, das die Zähler eines Platzes entfernt, wird gesehen', () => {
  // Der Tisch der Kurzpartie trägt `Henlo: Leben`; das Tauschen gegen Judy nimmt ihn weg.
  const alt = build();
  assert.ok(counterNamed(alt, 'Henlo: Leben'), 'Vorbedingung: der Zähler liegt');

  const r = run(alt, [
    probe('Henlo: Leben', 'davor-da'),
    { type: 'swap_villager', seat: 1, villager: 'Judy Marks' },
    probe('Henlo: Leben', 'danach-da'),
    probe('!Henlo: Leben', 'danach-weg'),
  ]);
  assert.deepEqual(r.log.map(e => e.status), ['ok', 'ok', 'ok'], 'swap, danach und danach-weg; davor-da läuft auch');
  assert.equal(counterNamed(r.state, 'Henlo: Leben'), undefined, 'das swap hat ihn wirklich entfernt');
  assert.ok(counterNamed(r.state, 'davor-da'));
  assert.equal(counterNamed(r.state, 'danach-da'), undefined);
  assert.ok(counterNamed(r.state, 'danach-weg'));
});

test('zwei Gates an einem Schritt: onlySeated und onlyCounter müssen beide passen', () => {
  const beide = (seated, counter) => ({ ...probe(counter), onlySeated: seated });
  const voll = solo();                    // drei Plätze, gemeinsamer Topf
  const zwei = run({}, LINEUP.slice(0, 2)).state;
  zwei.counters = [{ id: 'm', name: GEMEINSAM, value: 1, x: 0, y: 0, locked: false }];

  assert.ok(counterNamed(run(voll, [beide(3, GEMEINSAM)]).state, 'Probe'));
  assert.equal(counterNamed(run(voll, [beide(3, '!' + GEMEINSAM)]).state, 'Probe'), undefined, 'Zähler passt nicht');
  assert.equal(counterNamed(run(zwei, [beide(3, GEMEINSAM)]).state, 'Probe'), undefined, 'Platz passt nicht');
  assert.deepEqual(run(zwei, [beide(3, GEMEINSAM)]).log, []);
  assert.deepEqual(run(voll, [beide(3, '!' + GEMEINSAM)]).log, []);
  // ein kaputtes onlyCounter wird gemeldet, wenn die Gates davor „ja" sagen
  const kaputt = run(voll, [beide(3, '')]);
  assert.equal(kaputt.log.length, 1);
  assert.match(kaputt.log[0].reason, /onlyCounter/);
});

test('ohne Dörferdaten: onlyCounter liest nur den Tisch und braucht keine', () => {
  const r = run(solo(), [probe(GEMEINSAM)], { scenarioData: {} });
  assert.deepEqual(lines(r.log), []);
  assert.ok(counterNamed(r.state, 'Probe'));
});

test('in einer Aktion erlaubt: validateOptions beanstandet es nicht; der Aufruf ohne Wahl liest den Tisch', () => {
  const options = { a: { label: 'A', default: 'x', choices: { x: { label: 'x', vars: { A: '1' } } } } };
  const action = (step) => [{ id: 'k', steps: [step] }];
  assert.deepEqual(validateOptions(options, [], action(probe(GEMEINSAM))), []);
  assert.deepEqual(validateOptions(options, [], action(probe('!' + GEMEINSAM))), []);

  assert.ok(counterNamed(run(solo(), [probe(GEMEINSAM)], { choices: undefined }).state, 'Probe'));
  assert.deepEqual(run(build(), [probe(GEMEINSAM)], { choices: undefined }).log, []);
});
