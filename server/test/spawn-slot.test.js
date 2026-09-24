// M10.5 – neue Wuerfel erscheinen uebereinander an einer festen Stelle.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Aufgaben: docs/tasks-ablegen.md, J4 und J5.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { spawnSlot, SPAWN_STEP, SPAWN_COLS, SPAWN_ROWS } = await import(
  '../../client/src/utils/spawnSlot.js'
);

const CENTER = { x: 1000, y: 700 };

/** Legt `n` Dinge nacheinander an, jedes auf dem ersten freien Platz. */
function place(n, center = CENTER) {
  const taken = [];
  for (let i = 0; i < n; i++) taken.push(spawnSlot(center, taken));
  return taken;
}

test('J4 Abnahme 1: das erste Ding liegt in der Blickmitte', () => {
  assert.deepEqual(spawnSlot(CENTER, []), { x: 1000, y: 700 });
  assert.deepEqual(spawnSlot(CENTER), { x: 1000, y: 700 });
});

test('J4 Abnahme 2 / M10.5 Abnahme 1: zwei Wuerfel liegen nicht uebereinander', () => {
  const [a, b] = place(2);
  assert.notDeepEqual(a, b);
  assert.ok(Math.abs(a.x - b.x) >= SPAWN_STEP || Math.abs(a.y - b.y) >= SPAWN_STEP);
});

test('J4: auch das ganze Gitter bleibt paarweise verschieden', () => {
  const all = place(SPAWN_COLS * SPAWN_ROWS);
  const seen = new Set(all.map(p => `${p.x},${p.y}`));
  assert.equal(seen.size, SPAWN_COLS * SPAWN_ROWS);
});

test('M10.5 Abnahme 2: alle Plaetze liegen um die Blickmitte, nicht bei canvas.width/2', () => {
  const reach = { x: ((SPAWN_COLS - 1) / 2) * SPAWN_STEP, y: ((SPAWN_ROWS - 1) / 2) * SPAWN_STEP };
  for (const p of place(SPAWN_COLS * SPAWN_ROWS)) {
    assert.ok(Math.abs(p.x - CENTER.x) <= reach.x, `x ${p.x}`);
    assert.ok(Math.abs(p.y - CENTER.y) <= reach.y, `y ${p.y}`);
  }
});

test('J4 Abnahme 3: ein geloeschtes Ding gibt seinen Platz wieder frei', () => {
  const taken = place(3);
  const freed = taken[1];
  const rest = taken.filter((_, i) => i !== 1);
  assert.deepEqual(spawnSlot(CENTER, rest), freed);
});

test('J4: die Belegung geht ueber alle drei Wuerfelsorten (Z7, als Liste)', () => {
  const dice = [{ x: 1000, y: 700 }];
  const hitDice = [spawnSlot(CENTER, dice)];
  const customDice = [spawnSlot(CENTER, [...dice, ...hitDice])];
  const keys = new Set([...dice, ...hitDice, ...customDice].map(p => `${p.x},${p.y}`));
  assert.equal(keys.size, 3, 'drei Sorten, drei Plaetze');
});

test('J4 Abnahme 4: unbrauchbare Eingaben werfen nicht', () => {
  assert.deepEqual(spawnSlot(CENTER, null), { x: 1000, y: 700 });
  assert.deepEqual(spawnSlot(CENTER, [null, undefined, { x: 'x' }]), { x: 1000, y: 700 });
  const p = spawnSlot(undefined, []);
  assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
});

test('J4: ist alles belegt, bricht es um, statt ins Unendliche zu wandern', () => {
  const full = place(SPAWN_COLS * SPAWN_ROWS);
  const next = spawnSlot(CENTER, full);
  assert.deepEqual(next, full[0], 'wieder von vorn, wie shelfSlot');
});
