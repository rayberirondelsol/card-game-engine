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
