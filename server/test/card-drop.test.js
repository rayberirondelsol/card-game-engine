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

// ─── M10.9 / U6: die beiden Kandidatenlisten ────────────────────────────────
//
// `dropCandidates` stand als Funktion in `GameTable.jsx` und war damit
// ungeprueft. Sie zieht hierher um und bekommt eine Schwester fuer die losen
// Karten – beide fuettern dasselbe `stackAt`. "Liegt die Karte auf der
// anderen?" ist dieselbe Frage wie "liegt sie auf dem Stapel?"; eine zweite
// Geometrie waere eine zweite Antwort.
//
// Aufgaben: docs/tasks-ergonomie.md, U6.

const { stackCandidates, looseCandidates } = await import('../../client/src/utils/cardDrop.js');

/** Eine Tischkarte, so wie `tableCards` sie fuehrt. */
function card(tableId, x, y, extra = {}) {
  return { tableId, x, y, inStack: null, ...extra };
}

test('U6 Abnahme 1: zwei Karten desselben Stapels geben einen Kandidaten', () => {
  const cards = [
    card('a', 400, 300, { inStack: 's1' }),
    card('b', 400, 300, { inStack: 's1' }),
  ];
  assert.deepEqual(stackCandidates(cards, null), [{ id: 's1', x: 400, y: 300, w: 100, h: 140 }]);
});

test('U6 Abnahme 2: der eigene Stapel ist nie Kandidat', () => {
  const cards = [
    card('a', 400, 300, { inStack: 's1' }),
    card('b', 800, 300, { inStack: 's2' }),
  ];
  assert.deepEqual(stackCandidates(cards, 's1').map(c => c.id), ['s2']);
});

test('U6: lose Karten sind keine Stapelkandidaten', () => {
  assert.deepEqual(stackCandidates([card('a', 400, 300)], null), []);
});

test('U6 Abnahme 3: eine Karte in einem Stapel ist kein loser Kandidat', () => {
  const cards = [card('a', 400, 300, { inStack: 's1' }), card('b', 500, 300)];
  assert.deepEqual(looseCandidates(cards, new Set()).map(c => c.id), ['b']);
});

test('U6 Abnahme 2: ausgeschlossene Karten sind keine Kandidaten', () => {
  const cards = [card('a', 400, 300), card('b', 500, 300), card('c', 600, 300)];
  assert.deepEqual(looseCandidates(cards, new Set(['a', 'c'])).map(c => c.id), ['b']);
  // Ein Array tut es auch – der Aufrufer haelt die Auswahl mal so, mal so.
  assert.deepEqual(looseCandidates(cards, ['b']).map(c => c.id), ['a', 'c']);
});

test('U6 Abnahme 4: Karten ohne Masse bekommen die Tischmasse 100 x 140', () => {
  assert.deepEqual(looseCandidates([card('a', 10, 20)], new Set()), [
    { id: 'a', x: 10, y: 20, w: 100, h: 140 },
  ]);
});

test('U6 Abnahme 4: eine Querformat-Karte bringt ihre eigenen Masse mit', () => {
  const [hit] = looseCandidates([card('a', 0, 0, { width: 200, height: 100 })], new Set());
  assert.equal(hit.w, 140);
  assert.equal(hit.h, 70);
});

test('U6 Abnahme 5: nichts Lesbares gibt [] und wirft nicht', () => {
  assert.deepEqual(stackCandidates(null, null), []);
  assert.deepEqual(stackCandidates(undefined, 's1'), []);
  assert.deepEqual(looseCandidates(null, null), []);
  assert.deepEqual(looseCandidates([card('a', 1, 2)], null).map(c => c.id), ['a']);
});

test('U6: die Kandidaten passen in stackAt – eine Karte auf der anderen trifft', () => {
  const cards = [card('a', 400, 300), card('b', 480, 300)];
  assert.equal(stackAt({ x: 400, y: 300 }, looseCandidates(cards, new Set(['b']))), 'a');
  // Das Nachbarfeld (80 px) trifft nicht, genau wie bei einem Stapel.
  assert.equal(stackAt({ x: 320, y: 300 }, looseCandidates(cards, new Set(['b']))), null);
});
