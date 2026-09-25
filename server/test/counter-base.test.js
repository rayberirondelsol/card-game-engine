// M11.4 – ein Zähler kennt einen Ausgangswert und ein änderbares Maximum.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Befund aus der vierten Solopartie: Grannys Bewegung stand durch die
// Sheriff-Puppe auf 5, nach „Dorfphase beginnen" wieder auf 4 – weil die neun
// Zahlen im `set_counter`-Schritt abgetippt stehen. Der Ausgangswert gehört an
// den Zähler, und weil er sich im Spiel dauerhaft ändern kann, muss er
// änderbar sein (M8.4 hat genau das vorausgesehen).
//
// Geprüft wird hier die entscheidbare Hälfte: das Zählermodell in
// shared/counters.js und die beiden Schritte, die darauf zugreifen. Was in
// GameTable.jsx bleibt, ist der Dialog (CLAUDE.md: der Client hat keine
// Testinfrastruktur).

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  normalizeCounter, counterValue, counterValueForm, counterEdit, newCounterValue,
} = await import('../../shared/counters.js');
const { executeSequence } = await import('../../shared/sequenceExecutor.js');

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [], counters: [], dice: [], hand: [] });

// ── Das Modell ───────────────────────────────────────────────────────────────

test('ein Ausgangswert überlebt normalizeCounter wie das Maximum', () => {
  const c = normalizeCounter({ name: 'Granny: BEW', value: 5, base: 4, max: 6, x: 1, y: 2 });
  assert.equal(c.base, 4);
  assert.equal(c.max, 6);
  assert.equal(c.value, 5);
});

test('ein unbrauchbarer Ausgangswert fällt weg, statt als NaN mitzureisen', () => {
  for (const base of [null, undefined, '', 'vier', NaN]) {
    assert.equal('base' in normalizeCounter({ name: 'x', value: 1, base }), false, String(base));
  }
});

test('ein Zähler ohne Ausgangswert trägt das Feld nicht (Abnahme 3)', () => {
  assert.equal('base' in normalizeCounter({ name: 'Münzen', value: 12 }), false);
});

test('0 ist ein Ausgangswert, nicht „keiner"', () => {
  assert.equal(normalizeCounter({ name: 'Münzen', value: 3, base: 0 }).base, 0);
});

// ── Die fünfte Lesart ────────────────────────────────────────────────────────

test('"base" ist eine eigene Lesart, die vier vorhandenen bleiben (Abnahme 2)', () => {
  assert.equal(counterValueForm('base'), 'base');
  assert.equal(counterValueForm('BASE'), 'base');
  assert.equal(counterValueForm('max'), 'max');
  assert.equal(counterValueForm('+6'), 'add');
  assert.equal(counterValueForm('-6'), 'add');
  assert.equal(counterValueForm(6), 'set');
  assert.equal(counterValueForm('6'), 'set');
  assert.equal(counterValueForm('Quatsch'), null);
});

test('value "base" setzt auf den Ausgangswert, "max" weiterhin auf das Maximum', () => {
  const c = { value: 5, base: 4, max: 6 };
  assert.equal(counterValue(c, 'base'), 4);
  assert.equal(counterValue(c, 'max'), 6);
});

test('value "base" an einem Zähler ohne Ausgangswert tut nichts (Abnahme 3)', () => {
  assert.equal(counterValue({ value: 5, max: 6 }, 'base'), null);
});

test('das Eingabefeld am Tisch kennt "base" und sagt, wenn es keinen gibt', () => {
  assert.deepEqual(counterEdit({ value: 5, base: 4 }, 'base'), { value: 4 });
  const bad = counterEdit({ value: 5 }, 'base');
  assert.equal(bad.value, undefined);
  assert.match(bad.reason, /starting value/i);
  // Der Hinweis auf die unlesbare Eingabe nennt die fünfte Lesart mit.
  assert.match(counterEdit({ value: 5 }, '-2-3').reason, /base/);
});

test('ein von Hand angelegter Zähler startet auf Maximum, sonst Ausgangswert, sonst 0', () => {
  assert.equal(newCounterValue(14), 14);          // M8.6 Regel 2, unverändert
  assert.equal(newCounterValue('', 4), 4);
  assert.equal(newCounterValue(14, 4), 14);       // das Maximum gewinnt
  assert.equal(newCounterValue(), 0);
});

// ── Die beiden Schritte ──────────────────────────────────────────────────────

test('place_counter legt den Ausgangswert mit an (Abnahme 4)', () => {
  const s = executeSequence(emptyState(), [
    { type: 'place_counter', name: 'Granny: BEW', value: 4, base: 4, max: 6, x: 10, y: 20 },
  ], []);
  assert.equal(s.counters.length, 1);
  assert.equal(s.counters[0].base, 4);
  assert.equal(s.counters[0].max, 6);
});

test('place_counter ohne base legt keinen an – der Zähler bleibt wie bisher', () => {
  const s = executeSequence(emptyState(), [
    { type: 'place_counter', name: 'Münzen', value: 0, x: 10, y: 20 },
  ], []);
  assert.equal('base' in s.counters[0], false);
});

test('die Dorfphase setzt auf den Ausgangswert zurück, nicht auf eine abgetippte Zahl', () => {
  // Grannys Bewegung: Ausgangswert 4, durch die Sheriff-Puppe dauerhaft auf 5
  // gehoben – also wird der Ausgangswert gehoben, nicht der Wert.
  const start = executeSequence(emptyState(), [
    { type: 'place_counter', name: 'Granny: BEW', value: 4, base: 4, x: 0, y: 0 },
  ], []);
  start.counters[0].base = 5;
  start.counters[0].value = 2; // im Kampf verbraucht

  const after = executeSequence(start, [{ type: 'set_counter', name: 'Granny: BEW', value: 'base' }], []);
  assert.equal(after.counters[0].value, 5);
});

test('ein gesperrter Zähler bleibt auch vor "base" gesperrt', () => {
  const s = emptyState();
  s.counters.push(normalizeCounter({ name: 'x', value: 1, base: 9, locked: true }));
  const after = executeSequence(s, [{ type: 'set_counter', name: 'x', value: 'base' }], []);
  assert.equal(after.counters[0].value, 1);
});
