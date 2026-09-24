// R1 – `set_counter`: ein vorhandener Zähler bekommt einen Wert
// (docs/tasks-rundenwende.md R1; Spec M8.4 Schritt 2/3, M7.5 Regel 2).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Warum ein eigener Schritt: `place_counter` (M4a) legt bedingungslos einen
// **neuen** Zähler an – ein zweiter Lauf einen zweiten. Für den Rundenwechsel
// wird derselbe Zähler viermal überschrieben, nicht viermal angelegt.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

const stateWith = (...counters) => ({ cards: [], stacks: [], tokens: [], boards: [], counters });
const counter = (name, value, extra = {}) => ({ id: name, name, value, x: 0, y: 0, locked: false, ...extra });

const run = (state, step, options = {}) => executeSequence(state, [step], [], options);
const logOf = (state, step, options = {}) => executeSequenceWithLog(state, [step], [], options).log[0];
const byName = (out, name) => out.counters.find(c => c.name === name);

// ── Die vier Lesarten von `value` ────────────────────────────────────────────

test('eine Zahl setzt den Zähler auf genau diesen Wert', () => {
  const out = run(stateWith(counter('Henlo: Angriff', 7)), { type: 'set_counter', name: 'Henlo: Angriff', value: 4 });
  assert.equal(byName(out, 'Henlo: Angriff').value, 4);
  assert.equal(out.counters.length, 1, 'set_counter legt keinen zweiten Zähler an');
});

test('eine Zahl als Zeichenkette gilt genauso', () => {
  const out = run(stateWith(counter('Henlo: Angriff', 7)), { type: 'set_counter', name: 'Henlo: Angriff', value: '4' });
  assert.equal(byName(out, 'Henlo: Angriff').value, 4);
});

test('"max" setzt auf die Obergrenze, auch auf eine im Spiel gestiegene', () => {
  const out = run(stateWith(counter('Henlo: Leben', 0, { max: 5 })), { type: 'set_counter', name: 'Henlo: Leben', value: 'max' });
  assert.equal(byName(out, 'Henlo: Leben').value, 5);
});

test('"+18" erhöht den Zähler, ohne seinen Stand zu kennen', () => {
  const out = run(stateWith(counter('Münzvorrat', 30)), { type: 'set_counter', name: 'Münzvorrat', value: '+18' });
  assert.equal(byName(out, 'Münzvorrat').value, 48);
});

test('"-2" senkt ihn, eine blanke -2 setzt ihn auf minus zwei', () => {
  const minus = run(stateWith(counter('Münzvorrat', 30)), { type: 'set_counter', name: 'Münzvorrat', value: '-2' });
  assert.equal(byName(minus, 'Münzvorrat').value, 28, '"-2" als Zeichenkette trägt ein Vorzeichen');
  const absolut = run(stateWith(counter('Münzvorrat', 30)), { type: 'set_counter', name: 'Münzvorrat', value: -2 });
  assert.equal(byName(absolut, 'Münzvorrat').value, -2, 'eine Zahl -2 ist ein Wert, keine Änderung');
});

test('ein Platzhalter wird erst ersetzt und dann gelesen', () => {
  const steps = [
    { type: 'build_scenario', final: false },
    { type: 'set_counter', name: 'Bösewicht: Leben', value: '$LEB' },
  ];
  const state = { ...stateWith(counter('Bösewicht: Leben', 0, { max: 24 })), tokens: [] };
  // $revealedBase kommt sonst von reveal_next; hier reicht der direkte Weg über
  // die Szenariodaten, den sequence-build-scenario-stats.test.js ausführlich prüft.
  const out = executeSequence(state, steps, [], {
    scenarioData: { gridLabel: 'Kampffeld', bosses: {} },
  });
  // Ohne Bindung bleibt der Zähler, wie er war – das ist die Regel aus M7.
  assert.equal(byName(out, 'Bösewicht: Leben').value, 0);
});

// ── Was nicht geht, steht im Protokoll ───────────────────────────────────────

test('ein Zähler, den es nicht gibt, wird übersprungen', () => {
  const entry = logOf(stateWith(counter('Münzvorrat', 30)), { type: 'set_counter', name: 'Gibts nicht', value: 1 });
  assert.equal(entry.status, 'skipped');
  assert.match(entry.reason, /Gibts nicht/);
});

test('"max" an einem Zähler ohne Obergrenze wird übersprungen', () => {
  const state = stateWith(counter('Henlo: Angriff', 3));
  const entry = logOf(state, { type: 'set_counter', name: 'Henlo: Angriff', value: 'max' });
  assert.equal(entry.status, 'skipped');
  assert.match(entry.reason, /max/i);
  assert.equal(run(state, { type: 'set_counter', name: 'Henlo: Angriff', value: 'max' }).counters[0].value, 3);
});

test('eine Formel statt einer Zahl lässt den Zähler in Ruhe (Barry Bluff)', () => {
  const step = { type: 'set_counter', name: 'Bösewicht: Leben', value: 'Summe aller Dörfler-LEB +3' };
  const entry = logOf(stateWith(counter('Bösewicht: Leben', 0, { max: 24 })), step);
  assert.equal(entry.status, 'skipped');
  assert.match(entry.reason, /Summe aller/);
  assert.equal(run(stateWith(counter('Bösewicht: Leben', 0, { max: 24 })), step).counters[0].value, 0);
});

test('ohne Namen ist der Schritt keine Adresse', () => {
  const entry = logOf(stateWith(counter('Münzvorrat', 30)), { type: 'set_counter', value: 1 });
  assert.equal(entry.status, 'skipped');
});

test('ein gesperrter Zähler wird nicht verändert', () => {
  const state = stateWith(counter('Münzvorrat', 30, { locked: true }));
  const entry = logOf(state, { type: 'set_counter', name: 'Münzvorrat', value: '+18' });
  assert.equal(entry.status, 'skipped');
  assert.match(entry.reason, /locked/i);
  assert.equal(run(state, { type: 'set_counter', name: 'Münzvorrat', value: '+18' }).counters[0].value, 30);
});

test('der Name wird wie überall ohne Rücksicht auf Groß- und Kleinschreibung verglichen', () => {
  const out = run(stateWith(counter('Münzvorrat', 30)), { type: 'set_counter', name: '  münzvorrat ', value: 5 });
  assert.equal(byName(out, 'Münzvorrat').value, 5);
});

// ── Die Rundenwende als Ganzes ───────────────────────────────────────────────

test('zwölf Rückstellungen und der Münztopf in einem Durchlauf', () => {
  const state = stateWith(
    counter('Henlo: Leben', 1, { max: 4 }),
    counter('Henlo: Bewegung', 1),
    counter('Münzvorrat', 12),
  );
  const out = executeSequence(state, [
    { type: 'set_counter', name: 'Henlo: Leben', value: 'max' },
    { type: 'set_counter', name: 'Henlo: Bewegung', value: 3 },
    { type: 'set_counter', name: 'Münzvorrat', value: '+18' },
  ], []);
  assert.equal(byName(out, 'Henlo: Leben').value, 4);
  assert.equal(byName(out, 'Henlo: Bewegung').value, 3);
  assert.equal(byName(out, 'Münzvorrat').value, 30);
  assert.equal(out.counters.length, 3);
});
