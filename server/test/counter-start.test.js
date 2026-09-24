// M8.6 – Zähler sind nur in Einerschritten bedienbar (Aufgaben N5, N6, N7).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Tisch selbst ist nicht prüfbar (der Client hat keine Testinfrastruktur),
// also liegen die drei entscheidbaren Teile in reinen Modulen:
//   Regel 1 – was eine Eingabe aus einem Wert macht: `counterValue` (schon da)
//   Regel 2 – womit ein von Hand angelegter Zähler startet: `newCounterValue`
//   Regel 3 – wo er landet: `shelfSlot` aus M8.1, keine zweite Rechnung

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { newCounterValue, normalizeCounter, counterValue } = await import('../../shared/counters.js');
const { shelfSlot } = await import('../../client/src/utils/libraryShelf.js');
const { executeSequence } = await import('../../shared/sequenceExecutor.js');

// ── Regel 2: ein Vorrat ist beim Anlegen voll ────────────────────────────────

test('Abnahme 3: ein Zähler mit Maximum 14 startet auf 14', () => {
  assert.equal(newCounterValue(14), 14);
  assert.equal(newCounterValue('14'), 14);
  assert.equal(newCounterValue(0), 0);
});

test('Abnahme 4: ohne Maximum startet er bei 0 wie bisher', () => {
  assert.equal(newCounterValue(undefined), 0);
  assert.equal(newCounterValue(null), 0);
  assert.equal(newCounterValue(''), 0);
});

test('ein unbrauchbares Maximum startet bei 0, nicht bei NaN', () => {
  // counterMax wirft es weg, der Startwert darf sich nicht anders entscheiden.
  assert.equal(newCounterValue('abc'), 0);
  assert.equal(normalizeCounter({ name: 'x', value: newCounterValue('abc'), max: 'abc' }).value, 0);
});

test('so legt der Tisch an: Name, Startwert aus max, max', () => {
  const c = normalizeCounter({ name: 'Waggums: Leben', value: newCounterValue(14), max: 14, x: 0, y: 0 });
  assert.equal(c.value, 14);
  assert.equal(c.max, 14);
});

// ── Abnahme 6: der Aufbau bleibt, wie er ist ─────────────────────────────────

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [] });

test('Abnahme 6: place_counter setzt weiterhin genau den Wert aus dem Schritt', () => {
  const out = executeSequence(emptyState(), [
    { type: 'place_counter', name: 'Waggums: Leben', value: 0, max: 14, x: 10, y: 20 },
    { type: 'place_counter', name: 'Waggums: Verteidigung', value: 3, max: 6, x: 10, y: 80 },
  ], []);
  assert.equal(out.counters[0].value, 0, 'Regel 2 darf den Aufbau nicht anfassen');
  assert.equal(out.counters[0].max, 14);
  assert.equal(out.counters[1].value, 3);
});

test('place_counter ohne value bleibt bei 0, auch mit max', () => {
  // Die Probe darauf, dass die Regel im Aufrufer sitzt und nicht in
  // normalizeCounter: dort gesetzt, stünde hier plötzlich 14.
  const out = executeSequence(emptyState(), [
    { type: 'place_counter', name: 'Leben', max: 14, x: 0, y: 0 },
  ], []);
  assert.equal(out.counters[0].value, 0);
});

// ── Regel 1: was das Eingabefeld am Wert tut ─────────────────────────────────

test('Abnahme 1: eine Eingabe setzt den Wert – und kann auch rechnen', () => {
  // Der Befund war "21 Klicks für einen Einkauf über 21 Münzen"; `+21` ist
  // eine der vier Lesarten, die shared/counters.js seit M8.4 kennt.
  assert.equal(counterValue({ value: 3 }, '21'), 21);
  assert.equal(counterValue({ value: 45 }, '-21'), 24);
  assert.equal(counterValue({ value: 3 }, '+21'), 24);
  assert.equal(counterValue({ value: 3, max: 14 }, 'max'), 14);
});

test('Abnahme 2: was sich nicht lesen lässt, lässt den Wert unverändert', () => {
  // `null` ist dieselbe Antwort wie Abbrechen – der Tisch braucht dafür keinen
  // zweiten Zweig.
  assert.equal(counterValue({ value: 3 }, 'Unsinn'), null);
  assert.equal(counterValue({ value: 3 }, ''), null);
  assert.equal(counterValue({ value: 3 }, 'max'), null, 'ohne Obergrenze gibt es kein max');
});

// ── Regel 3: die Ablage bricht um ────────────────────────────────────────────

test('Abnahme 5: der zwölfte angelegte Zähler liegt im sichtbaren Bereich', () => {
  const { x, y } = shelfSlot(11);
  assert.ok(x <= 700, `x = ${x}`);
  assert.ok(y <= 1500, `y = ${y}`);
});

test('die ersten zwölf Zähler liegen auf zwölf verschiedenen Plätzen', () => {
  const seen = new Set();
  for (let i = 0; i < 12; i++) {
    const { x, y } = shelfSlot(i);
    seen.add(`${x}|${y}`);
    assert.ok(y <= 1500, `Zähler ${i + 1} liegt bei y = ${y}`);
  }
  assert.equal(seen.size, 12);
});
