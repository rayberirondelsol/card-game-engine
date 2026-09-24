// M10.4 – Karten verschmelzen beim Ablegen still zu Stapeln.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Derselbe Grund wie bei library-shelf.test.js und pick-topmost.test.js: der
// Client hat keine Testinfrastruktur, also liegt der entscheidbare Teil – wem
// eine losgelassene Karte beitritt – in einem reinen Modul.
//
// Aufgaben: docs/tasks-ablegen.md, J1 und J3.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { stackAt } = await import('../../client/src/utils/cardDrop.js');

/** Ein Stapel an (x,y) mit den Tischmaßen einer Karte (getCardDims: 100x140). */
function stack(id, x, y, w = 100, h = 140) {
  return { id, x, y, w, h };
}

test('J1 Abnahme 1: auf dem Stapel abgelegt tritt man ihm bei', () => {
  assert.equal(stackAt({ x: 400, y: 300 }, [stack('s1', 400, 300)]), 's1');
});

test('J1 Abnahme 2: das Nachbarfeld (80 px Raster) ist kein Beitritt', () => {
  const stacks = [stack('s1', 400, 300)];
  assert.equal(stackAt({ x: 480, y: 300 }, stacks), null, 'in der Breite: 80 > 50');
  assert.equal(stackAt({ x: 400, y: 380 }, stacks), null, 'in der Hoehe: 80 > 70');
  assert.equal(stackAt({ x: 480, y: 380 }, stacks), null, 'diagonal');
});

test('J1: der Rand der Kartenflaeche gehoert noch dazu', () => {
  const stacks = [stack('s1', 400, 300)];
  assert.equal(stackAt({ x: 450, y: 370 }, stacks), 's1', 'genau die Ecke');
  assert.equal(stackAt({ x: 451, y: 300 }, stacks), null);
  assert.equal(stackAt({ x: 400, y: 371 }, stacks), null);
});

test('J1 Abnahme 3: von zwei ueberlappenden Stapeln gewinnt der naehere', () => {
  const stacks = [stack('s1', 400, 300), stack('s2', 430, 300)];
  assert.equal(stackAt({ x: 425, y: 300 }, stacks), 's2');
  // Und andersherum, damit nicht die Listenreihenfolge gewinnt.
  assert.equal(stackAt({ x: 405, y: 300 }, stacks), 's1');
  assert.equal(stackAt({ x: 405, y: 300 }, [stacks[1], stacks[0]]), 's1');
});

test('J1 Abnahme 4: leere und unbrauchbare Eingaben werfen nicht', () => {
  assert.equal(stackAt({ x: 0, y: 0 }, []), null);
  assert.equal(stackAt({ x: 0, y: 0 }, undefined), null);
  assert.equal(stackAt(undefined, [stack('s1', 0, 0)]), null);
  assert.equal(stackAt({ x: NaN, y: 0 }, [stack('s1', 0, 0)]), null);
  assert.equal(stackAt({ x: 0, y: 0 }, [{ id: 's1' }, stack('s2', 0, 0)]), 's2');
  assert.equal(stackAt({ x: 0, y: 0 }, [{ x: 0, y: 0, w: 100, h: 140 }]), null, 'ohne id kein Ziel');
});

test('J1: ohne Masse gelten die Tischmasse einer Karte', () => {
  assert.equal(stackAt({ x: 40, y: 60 }, [{ id: 's1', x: 0, y: 0 }]), 's1');
  assert.equal(stackAt({ x: 60, y: 0 }, [{ id: 's1', x: 0, y: 0 }]), null);
});

// Der belegte Schadensfall der dritten Solopartie: die aufgedeckte Karte liegt
// auf der `Ablage`, der Verhaltensstapel liegt ein Rasterfeld daneben. Mit der
// alten 80-Pixel-Umkreisfrage wurde sie verschluckt (Abstand 70 < 80), mit der
// Flaechenfrage bleibt sie liegen.
test('J3: die Karte auf der Ablage faellt nicht in den Nachziehstapel daneben', () => {
  const deck = stack('verhalten', 400, 300);
  assert.equal(stackAt({ x: 470, y: 300 }, [deck]), null);
  // Wer wirklich auf den Stapel legt, rastet auf dessen Stelle ein.
  assert.equal(stackAt({ x: 400, y: 300 }, [deck]), 'verhalten');
});
