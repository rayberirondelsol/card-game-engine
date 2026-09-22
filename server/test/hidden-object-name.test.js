// Spec section 6, "Verdeckt heißt überall verdeckt": a face-down object must
// not give its name away anywhere - not in lists, legends, tooltips, previews.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// The client has no test setup and pulling one in would mean a new dependency.
// So the decision "what may be shown about this object" lives in a pure module
// that the display only calls. That decision is what is tested here; the JSX
// call sites are a one-liner each.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { tableObjectView, HIDDEN_CAPTION } = await import('../../client/src/utils/tableObjectView.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** A boss token as draw_assets builds it (see sequenceExecutor.assetToken). */
function bossToken(faceDown) {
  return {
    id: 't1',
    assetId: 7,
    shape: 'image',
    label: 'Tartar Fishboy',
    imageUrl: faceDown ? '/uploads/g/back.png' : '/uploads/g/front.png',
    frontImageUrl: '/uploads/g/front.png',
    backImageUrl: '/uploads/g/back.png',
    faceDown,
  };
}

/** A card on the table. Cards carry `name`, tokens carry `label`. */
function card(faceDown, extra = {}) {
  return { tableId: 'c1', name: 'Samuel Strawman', image_path: '/uploads/g/c.png', faceDown, ...extra };
}

// ── Face down hides the name ─────────────────────────────────────────────────

test('a face-up token shows its name', () => {
  const view = tableObjectView(bossToken(false));
  assert.equal(view.hidden, false);
  assert.equal(view.name, 'Tartar Fishboy');
  assert.equal(view.caption, 'Tartar Fishboy');
});

test('a face-down token gives away neither name nor caption', () => {
  const view = tableObjectView(bossToken(true));
  assert.equal(view.hidden, true);
  assert.equal(view.name, '');
  assert.equal(view.caption, HIDDEN_CAPTION);
  // The point of the whole exercise: the name is nowhere in the result.
  assert.ok(!JSON.stringify(view).includes('Tartar'));
});

test('flipping a token face up brings its name back', () => {
  const token = bossToken(true);
  assert.equal(tableObjectView(token).name, '');
  token.faceDown = false;
  assert.equal(tableObjectView(token).name, 'Tartar Fishboy');
  assert.equal(tableObjectView(token).caption, 'Tartar Fishboy');
});

// ── With and without a back side ─────────────────────────────────────────────

test('face down without a back side still hides the name', () => {
  // Spec section 6 says such an object is not placed at all, so this is an
  // inconsistent state - out of an old savegame or a manual flip. The rest of
  // the UI renders the generic back for it, so it *looks* hidden; showing the
  // name then would be the one visible thing that gives it away.
  const token = { ...bossToken(true), backImageUrl: null, imageUrl: null };
  const view = tableObjectView(token);
  assert.equal(view.hidden, true);
  assert.equal(view.name, '');
});

test('a face-up object without a back side is not hidden', () => {
  const token = { ...bossToken(false), backImageUrl: null };
  assert.equal(tableObjectView(token).hidden, false);
  assert.equal(tableObjectView(token).name, 'Tartar Fishboy');
});

// ── Card, die, board: the same rule, different field names ───────────────────

test('a face-down card hides its name, a face-up one shows it', () => {
  assert.equal(tableObjectView(card(true)).name, '');
  assert.equal(tableObjectView(card(true)).caption, HIDDEN_CAPTION);
  assert.equal(tableObjectView(card(false)).name, 'Samuel Strawman');
});

test('a card without an assigned back is hidden all the same', () => {
  // The table draws a generic blue back for it, so it reads as face down.
  assert.equal(tableObjectView(card(true, { card_back_id: null })).name, '');
});

test('a die has no face-down state and keeps its name', () => {
  const die = { id: 'd1', name: 'Damage d6', numFaces: 6, currentFace: 3 };
  const view = tableObjectView(die);
  assert.equal(view.hidden, false);
  assert.equal(view.name, 'Damage d6');
  assert.equal(view.caption, 'Damage d6');
});

test('a board follows the same rule as a token', () => {
  const board = { id: 'b1', name: 'Main Board', imageUrl: '/uploads/g/b.png', faceDown: false };
  assert.equal(tableObjectView(board).name, 'Main Board');
  assert.equal(tableObjectView({ ...board, faceDown: true }).name, '');
});

// ── Nothing to show ──────────────────────────────────────────────────────────

test('an unnamed face-up object falls back to what the caller offers', () => {
  const view = tableObjectView({ id: 'x', shape: 'circle', faceDown: false }, 'Token');
  assert.equal(view.name, '');      // there is no name to paint on it
  assert.equal(view.caption, 'Token');
});

test('an unnamed face-down object still reads as face down, not as the fallback', () => {
  const view = tableObjectView({ id: 'x', shape: 'circle', faceDown: true }, 'Token');
  assert.equal(view.caption, HIDDEN_CAPTION);
});

test('a missing object does not throw', () => {
  for (const nothing of [null, undefined]) {
    const view = tableObjectView(nothing);
    assert.equal(view.hidden, false);
    assert.equal(view.name, '');
  }
});

test('faceDown is read as a flag, not as truthiness of a name', () => {
  // Values that reach the client from JSON: missing, false, 0, "false".
  assert.equal(tableObjectView({ name: 'A' }).hidden, false);
  assert.equal(tableObjectView({ name: 'A', faceDown: false }).hidden, false);
  assert.equal(tableObjectView({ name: 'A', faceDown: true }).hidden, true);
});
