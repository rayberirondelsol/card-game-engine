// M8.1 – eine Karte aus der Bibliothek landet ausserhalb des Tisches.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Derselbe Grund wie bei pan-target.test.js: der Client hat keine
// Testinfrastruktur, also liegt der entscheidbare Teil – wie viele Dinge
// liegen auf dem Tisch, und wo liegt das naechste – in einem reinen Modul und
// wird von hier geprueft.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { shelfCount, shelfSlot, SHELF_COLS } = await import('../../client/src/utils/libraryShelf.js');

/** `n` Karten im Stapel `stackId`. */
function stack(stackId, n) {
  return Array.from({ length: n }, (_, i) => ({ tableId: `${stackId}-${i}`, inStack: stackId }));
}

/** `n` frei liegende Karten. */
function free(n) {
  return Array.from({ length: n }, (_, i) => ({ tableId: `free-${i}`, inStack: null }));
}

test('eine Karte im Stapel belegt keinen Platz in der Ablagereihe', () => {
  assert.equal(shelfCount(stack('s1', 300)), 1);
  assert.equal(shelfCount([]), 0);
});

test('Abnahme 1: 300 Karten in einem Stapel, keine freie – die erste Zeile', () => {
  const slot = shelfSlot(shelfCount(stack('s1', 300)));
  assert.equal(slot.y, 300, 'erste Zeile, nicht Zeile 74');
});

test('Abnahme 1, andersherum: zwanzig Stapel liegen auch auf dem Tisch', () => {
  const cards = Array.from({ length: 20 }, (_, i) => stack(`s${i}`, 15)).flat();
  assert.equal(cards.length, 300);
  assert.equal(shelfCount(cards), 20);
  assert.equal(shelfSlot(20).y, 300 + 5 * 180, 'Zeile 5');
});

test('Abnahme 2: vier freie Karten fuellen die erste Zeile, die fuenfte beginnt die zweite', () => {
  // Die Spec sagt "sechzehn", der Code rechnet mit vier – und "unveraendert"
  // schlaegt die Zahl. Siehe docs/tasks-blockaden.md.
  assert.equal(SHELF_COLS, 4);
  assert.equal(shelfSlot(0).x, 250);
  assert.equal(shelfSlot(0).y, 300);
  assert.equal(shelfSlot(3).x, 250 + 3 * 150);
  assert.equal(shelfSlot(3).y, 300);
  assert.equal(shelfSlot(4).x, 250);
  assert.equal(shelfSlot(4).y, 300 + 180);
  assert.equal(shelfCount(free(4)), 4);
});

test('Abnahme 3: kein Platz verlaesst den sichtbaren Tisch', () => {
  for (let n = 0; n <= 10000; n++) {
    const { x, y } = shelfSlot(n);
    assert.ok(y >= 60 && y <= 1500, `y=${y} bei n=${n}`);
    assert.ok(x >= 60 && x <= 1500, `x=${x} bei n=${n}`);
  }
});

test('freie Karten und Stapel zaehlen zusammen', () => {
  const cards = [...free(3), ...stack('a', 50), ...stack('b', 7)];
  assert.equal(shelfCount(cards), 5);
});

test('drei nacheinander ausgelegte Kategorien liegen auf drei Plaetzen', () => {
  let cards = [];
  const seen = new Set();
  for (const [name, size] of [['a', 20], ['b', 13], ['c', 41]]) {
    const slot = shelfSlot(shelfCount(cards));
    seen.add(`${slot.x}/${slot.y}`);
    cards = [...cards, ...stack(name, size)];
  }
  assert.equal(seen.size, 3);
});

test('Muell zaehlt nicht mit und wirft nicht', () => {
  assert.equal(shelfCount(null), 0);
  assert.equal(shelfCount(undefined), 0);
  assert.deepEqual(shelfSlot(-1), shelfSlot(0));
  assert.deepEqual(shelfSlot(NaN), shelfSlot(0));
});
