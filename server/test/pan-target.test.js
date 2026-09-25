// M2.13 – a locked object does not swallow the drag (spec section "M2.13").
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Same reason as menu-placement.test.js and card-dims.test.js: the client has
// no test setup, so the decidable part – may a press on this target pan the
// table? – lives in a pure module and is tested from here. The DOM targets are
// plain objects with a `closest` method, which is all the rule looks at.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { canStartPan } = await import('../../client/src/utils/panTarget.js');

/** A DOM-ish target: `closest` answers for the selectors it was built with. */
function target(...matches) {
  const node = { closest: (sel) => (matches.includes(sel) ? node : null) };
  return node;
}

const LOCKED = '[data-locked="true"]';
const UI = '[data-ui-element]';
const CARD = '[data-table-card]';

const canvas = target();
const container = target();

test('a press on the canvas pans', () => {
  assert.equal(canStartPan(canvas, canvas, container), true);
});

test('a press on the container pans', () => {
  assert.equal(canStartPan(container, canvas, container), true);
});

test('a press on a locked object pans, even though it is a UI element', () => {
  const board = target(LOCKED, UI);
  assert.equal(canStartPan(board, canvas, container), true);
});

test('a press on an unlocked board does not pan – it drags the board', () => {
  const board = target(UI);
  assert.equal(canStartPan(board, canvas, container), false);
});

test('a press on the toolbar does not pan', () => {
  const button = target(UI);
  assert.equal(canStartPan(button, canvas, container), false);
});

test('a press on a table card does not pan', () => {
  const card = target(UI, CARD);
  assert.equal(canStartPan(card, canvas, container), false);
});

test('a press on a locked table card pans', () => {
  const card = target(LOCKED, UI, CARD);
  assert.equal(canStartPan(card, canvas, container), true);
});

test('a locked object deep in the tree pans – the lock is looked up, not read off', () => {
  // The press lands on the <img> inside the board; only the wrapper is locked.
  const img = { closest: (sel) => (sel === LOCKED || sel === UI ? target(LOCKED, UI) : null) };
  assert.equal(canStartPan(img, canvas, container), true);
});

test('no target does not pan', () => {
  assert.equal(canStartPan(null, canvas, container), false);
  assert.equal(canStartPan(undefined, canvas, container), false);
});

test('a target without closest does not pan', () => {
  assert.equal(canStartPan({}, canvas, container), false);
});

test('missing canvas and container do not turn every press into a pan', () => {
  assert.equal(canStartPan(target(), null, null), false);
  assert.equal(canStartPan(target(UI), undefined, undefined), false);
});

// ─── M10.7 / U1: eine Antwort auf "darf das schwenken?" ──────────────────────
//
// `e.button === 1` stand bisher zweimal *neben* dem Aufruf (nativer Horcher
// und `handleGlobalStart`), der Schwenkmodus waere die dritte Antwort auf
// dieselbe Frage gewesen. Beide stehen jetzt drin.
//
// Aufgaben: docs/tasks-ergonomie.md, U1.

test('U1: die mittlere Maustaste schwenkt ueber einem Objekt', () => {
  const board = target(UI);
  assert.equal(canStartPan(board, canvas, container, { button: 1 }), true);
});

test('U1: die mittlere Maustaste schwenkt auch ueber einer Tischkarte', () => {
  assert.equal(canStartPan(target(UI, CARD), canvas, container, { button: 1 }), true);
});

test('U1: die rechte Maustaste schwenkt nie – auch nicht auf leerer Flaeche', () => {
  assert.equal(canStartPan(canvas, canvas, container, { button: 2 }), false);
  assert.equal(canStartPan(target(UI), canvas, container, { button: 2 }), false);
});

test('U1: der Schwenkmodus schwenkt ueber einem beliebigen Objekt', () => {
  assert.equal(canStartPan(target(UI), canvas, container, { panMode: true }), true);
  assert.equal(canStartPan(target(UI, CARD), canvas, container, { panMode: true }), true);
});

test('U1: der Schwenkmodus faengt auch den Zug an, der nirgends beginnt', () => {
  // Kein Ziel, kein Container – im Modus schwenkt trotzdem alles. Ein Klick
  // auf die Werkzeugleiste bleibt dabei ein Klick: der Schwenk ohne Weg
  // bewegt die Kamera um null.
  assert.equal(canStartPan(target(), null, null, { panMode: true }), true);
});

test('U1 Abnahme 4: ohne Optionen antwortet die Funktion wie vorher', () => {
  assert.equal(canStartPan(canvas, canvas, container, {}), true);
  assert.equal(canStartPan(target(UI), canvas, container, {}), false);
  assert.equal(canStartPan(target(LOCKED, UI), canvas, container, {}), true);
});

// ── M14.8 / AK – der Schwenkmodus ist am Zeiger zu sehen ─────────────────────
//
// Der Befund der sechsten Solopartie: nach einem Schwenk blieb „Pan" aktiv.
// Drei aufeinanderfolgende Figurenzüge taten nichts, ohne Meldung; nur der
// blau markierte Knopf in der Werkzeugleiste verriet den Grund.
//
// Der Zeiger wechselte bisher nur **während** eines laufenden Schwenks auf
// `grabbing` – an vier Stellen, jede mit ihrer eigenen Zeichenkette. Der Modus
// selbst war unsichtbar.

const { panCursor } = await import('../../client/src/utils/panTarget.js');

test('AK1: im Schwenkmodus ist der Zeiger eine Hand', () => {
  assert.equal(panCursor(true, false), 'grab');
});

test('AK1: während des Schwenks greift die Hand zu', () => {
  assert.equal(panCursor(true, true), 'grabbing');
  // Auch ohne Modus: die mittlere Maustaste und der Zug auf dem Hintergrund
  // schwenken weiterhin (M2.13/M10.7).
  assert.equal(panCursor(false, true), 'grabbing');
});

test('AK1: sonst bleibt der Zeiger, was er war', () => {
  assert.equal(panCursor(false, false), 'default');
});

test('AK1: der Zeiger des Tisches kommt nur noch aus `panCursor`', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const src = readFileSync(
    fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');
  const zeilen = src.split('\n').filter(l => l.includes('style.cursor ='));
  assert.ok(zeilen.length >= 4, `nur ${zeilen.length} Stellen setzen den Zeiger`);
  for (const l of zeilen) {
    assert.match(l, /panCursor\(/, `eine ausgeschriebene Zeichenkette ist zurueck:\n${l.trim()}`);
  }
});
