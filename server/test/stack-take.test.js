// BD / Spec M17.2 — eine einzelne Karte aus einem Stapel nehmen.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Befund F2 der neunten Solopartie: „Browse" zeigte 25 Rückseiten, und ein
// Klick auf eine Karte tat nichts. Der Umweg „Take Top Card" scheiterte, weil
// er nur die oberste nimmt und die Reihenfolge dabei zerlegt — der
// Karteneffekt (*Ausbuddeln!*) ist verfallen.
//
// Reine Rechnung, weil der Client keine Testinfrastruktur hat (CLAUDE.md).
// Begründung in `docs/tasks-partie9.md`, Aufgabe BD.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { takeFromStack } from '../../client/src/utils/stackTake.js';

const stack = () => ([
  { tableId: 'a', inStack: 's1', x: 10, y: 20, zIndex: 1, faceDown: true },
  { tableId: 'b', inStack: 's1', x: 10, y: 20, zIndex: 2, faceDown: true },
  { tableId: 'c', inStack: 's1', x: 10, y: 20, zIndex: 3, faceDown: true },
  { tableId: 'loose', inStack: null, x: 400, y: 400, zIndex: 9, faceDown: false },
]);

test('BD: die genommene Karte liegt offen an der neuen Stelle, ausserhalb des Stapels', () => {
  const out = takeFromStack(stack(), 'b', { x: 150, y: 20 });
  const b = out.find(c => c.tableId === 'b');
  assert.equal(b.inStack, null);
  assert.equal(b.faceDown, false);
  assert.deepEqual({ x: b.x, y: b.y }, { x: 150, y: 20 });
  // Oben auf allem, was sonst liegt – sonst verschwindet sie unter dem Stapel.
  assert.ok(out.every(c => c.tableId === 'b' || c.zIndex < b.zIndex));
});

test('BD: der Rest behält Stapel und Reihenfolge', () => {
  const out = takeFromStack(stack(), 'b', { x: 150, y: 20 });
  const rest = out.filter(c => c.inStack === 's1');
  assert.deepEqual(rest.map(c => c.tableId), ['a', 'c']);
  assert.deepEqual(rest.map(c => c.zIndex), [1, 3]);
  assert.deepEqual(rest.map(c => [c.x, c.y]), [[10, 20], [10, 20]]);
});

test('BD: ein Stapel aus einer Karte ist keiner mehr', () => {
  const two = stack().filter(c => c.tableId !== 'c');
  const out = takeFromStack(two, 'b', { x: 150, y: 20 });
  assert.equal(out.find(c => c.tableId === 'a').inStack, null);
});

test('BD: das Rasterfeld der genommenen Karte gilt nicht mehr', () => {
  const cards = stack().map(c => (c.tableId === 'b' ? { ...c, gridId: 'g1', cell: 'C7' } : c));
  const out = takeFromStack(cards, 'b', { x: 150, y: 20 });
  const b = out.find(c => c.tableId === 'b');
  assert.equal(b.gridId, null);
  assert.equal(b.cell, null);
});

test('BD: eine lose oder unbekannte Karte lässt den Tisch, wie er ist', () => {
  const cards = stack();
  assert.equal(takeFromStack(cards, 'loose', { x: 1, y: 1 }), cards);
  assert.equal(takeFromStack(cards, 'gibtsnicht', { x: 1, y: 1 }), cards);
  assert.equal(takeFromStack(null, 'a', { x: 1, y: 1 }), null);
});
