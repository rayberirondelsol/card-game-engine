// M2.12 – Karten behalten ihr Seitenverhältnis (spec section "M2.12").
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Same reason as menu-placement.test.js and escape-layers.test.js: the client
// has no test setup, so the decidable part – which display size a card of known
// pixel size gets – lives in a pure module and is tested from here.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { getCardDims, CARD_WIDTH, CARD_HEIGHT } = await import('../../client/src/utils/cardDims.js');

/** Every returned size is a whole number of pixels and actually visible. */
function assertUsable(d) {
  assert.ok(Number.isInteger(d.w), `w ${d.w} is not a whole number`);
  assert.ok(Number.isInteger(d.h), `h ${d.h} is not a whole number`);
  assert.ok(d.w > 0 && d.h > 0, `${d.w}x${d.h} is not visible`);
}

/** The slot has the card's ratio, up to the one pixel that rounding costs. */
function assertRatio(card, d) {
  const want = card.width / card.height;
  const lo = (d.w - 0.5) / (d.h + 0.5);
  const hi = (d.w + 0.5) / (d.h - 0.5);
  assert.ok(want >= lo && want <= hi, `ratio ${want} not in [${lo}, ${hi}] for ${d.w}x${d.h}`);
}

test('the reference box is 100x140', () => {
  assert.equal(CARD_WIDTH, 100);
  assert.equal(CARD_HEIGHT, 140);
});

test('a standard portrait card 744x1039 stays exactly 100x140', () => {
  const card = { width: 744, height: 1039 };
  const d = getCardDims(card);
  assert.deepEqual(d, { w: 100, h: 140 });
  assertUsable(d);
  assertRatio(card, d);
});

test('a square card 744x744 gets a square slot 100x100 – the reported bug', () => {
  const card = { width: 744, height: 744 };
  const d = getCardDims(card);
  assert.deepEqual(d, { w: 100, h: 100 });
  assertUsable(d);
  assertRatio(card, d);
});

test('a landscape card 1039x744 stays exactly 140x100', () => {
  const card = { width: 1039, height: 744 };
  const d = getCardDims(card);
  assert.deepEqual(d, { w: 140, h: 100 });
  assertUsable(d);
  assertRatio(card, d);
});

// Pins the spec's "Bewusst nicht gemacht": the oversized Odd-Jobs role cards are
// fitted into the same box as everyone else, not scaled up to their real size.
test('an oversized portrait card 825x1425 is fitted to 81x140, not scaled up', () => {
  const card = { width: 825, height: 1425 };
  const d = getCardDims(card);
  assert.deepEqual(d, { w: 81, h: 140 });
  assertUsable(d);
  assertRatio(card, d);
});

test('a card that is square within rounding does not flip to landscape', () => {
  assert.deepEqual(getCardDims({ width: 744, height: 745 }), { w: 100, h: 100 });
  assert.deepEqual(getCardDims({ width: 745, height: 744 }), { w: 100, h: 100 });
});

test('a card without usable dimensions keeps 100x140', () => {
  const cases = [
    undefined,
    null,
    {},
    { width: 744 },
    { height: 1039 },
    { width: 0, height: 0 },
    { width: 0, height: 1039 },
    { width: 744, height: 0 },
    { width: -744, height: -1039 },
    { width: 744, height: -1039 },
    { width: NaN, height: NaN },
    { width: 744, height: NaN },
    { width: Infinity, height: 1039 },
    { width: '744', height: '1039' },
    { width: null, height: null },
    { width: {}, height: [] },
  ];
  for (const card of cases) {
    const d = getCardDims(card);
    assert.deepEqual(d, { w: 100, h: 140 }, `for ${JSON.stringify(card)}`);
    assertUsable(d);
  }
});

// Hand fan (80x112 desktop) and hand preview (200x280) draw cards against their
// own reference box. Same rule, different box.
test('a square card fits its own box: 744x744 in 80x112 is 80x80', () => {
  const card = { width: 744, height: 744 };
  const d = getCardDims(card, 80, 112);
  assert.deepEqual(d, { w: 80, h: 80 });
  assertUsable(d);
  assertRatio(card, d);
});

test('a portrait card fills its own box: 744x1039 in 80x112 is 80x112', () => {
  assert.deepEqual(getCardDims({ width: 744, height: 1039 }, 80, 112), { w: 80, h: 112 });
});

test('a landscape card swaps its own box: 1039x744 in 80x112 is 112x80', () => {
  assert.deepEqual(getCardDims({ width: 1039, height: 744 }, 80, 112), { w: 112, h: 80 });
});

test('the hand preview box works the same: 744x744 in 200x280 is 200x200', () => {
  assert.deepEqual(getCardDims({ width: 744, height: 744 }, 200, 280), { w: 200, h: 200 });
});

test('a card without usable dimensions keeps its own box, not 100x140', () => {
  assert.deepEqual(getCardDims(null, 80, 112), { w: 80, h: 112 });
  assert.deepEqual(getCardDims({ width: 0, height: 0 }, 200, 280), { w: 200, h: 280 });
});

// Regression guard: omitting the box must reproduce the old answers exactly.
test('without a box argument every existing case is unchanged', () => {
  const cases = [
    [{ width: 744, height: 1039 }, { w: 100, h: 140 }],
    [{ width: 744, height: 744 }, { w: 100, h: 100 }],
    [{ width: 1039, height: 744 }, { w: 140, h: 100 }],
    [{ width: 825, height: 1425 }, { w: 81, h: 140 }],
    [undefined, { w: 100, h: 140 }],
  ];
  for (const [card, want] of cases) {
    assert.deepEqual(getCardDims(card), want, `for ${JSON.stringify(card)}`);
    assert.deepEqual(getCardDims(card, CARD_WIDTH, CARD_HEIGHT), want, `explicit, for ${JSON.stringify(card)}`);
  }
});

test('an extreme ratio still yields a visible whole-pixel slot', () => {
  assertUsable(getCardDims({ width: 1, height: 10000 }));
  assertUsable(getCardDims({ width: 10000, height: 1 }));
});
