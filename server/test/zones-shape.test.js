// M2 – zones with shape, accepts, capacity, layout and snap (spec section 8).
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Both modules under test are pure client-side functions, so this file imports
// them directly – no app, no DB.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  zoneContains, zoneAccepts, zoneSlots, zoneSlotFor, zoneAt, zoneRejects, snapPoint,
} = await import('../../client/src/utils/zoneGeometry.js');
const { executeSequence, executeSequenceWithLog } = await import('../../client/src/utils/sequenceExecutor.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** Deterministic PRNG (mulberry32) so draws are reproducible across runs. */
function seededRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BOX = { x: 0, y: 0, width: 100, height: 100 };

const TOKENS = ['Klaus', 'Bertha', 'Grimm', 'Odd'].map((n, i) => ({
  id: `tok-${i}`, name: n, type: 'token', category: 'Bosse',
  image_path: `/uploads/tok-${i}.png`, back_image_path: '/uploads/back.png', width: 40,
}));

function emptyState() {
  return { cards: [], stacks: [], tokens: [], boards: [] };
}

/** A face-up deck of n cards under the given label. */
function deck(label, n, x = 0, y = 0) {
  return {
    stackId: 's1', label, x, y,
    cards: Array.from({ length: n }, (_, i) => ({
      tableId: `t${i}`, cardId: `c${i}`, name: `Karte ${i}`,
      image_path: `/uploads/c${i}.png`, zIndex: i + 1, faceDown: false,
    })),
  };
}

// ── Point in shape ───────────────────────────────────────────────────────────

test('a zone without shape is a rectangle – exactly as before', () => {
  const z = { ...BOX };
  assert.equal(zoneContains(z, 50, 50), true);
  assert.equal(zoneContains(z, 5, 5), true, 'the corner of a rectangle is inside it');
  assert.equal(zoneContains(z, 101, 50), false);
  assert.equal(zoneContains(z, 50, -1), false);
});

test('a circle zone is a real circle, not its bounding box', () => {
  const z = { ...BOX, shape: 'circle' };
  assert.equal(zoneContains(z, 50, 50), true, 'centre');
  assert.equal(zoneContains(z, 95, 50), true, 'on the horizontal axis');
  assert.equal(zoneContains(z, 5, 5), false, 'the bounding box corner is outside the circle');
  assert.equal(zoneContains(z, 95, 95), false);
});

test('a hex zone is a real hexagon and its orientation matters', () => {
  const pointy = { ...BOX, shape: 'hex-pointy' };
  const flat = { ...BOX, shape: 'hex-flat' };

  for (const z of [pointy, flat]) {
    assert.equal(zoneContains(z, 50, 50), true, 'centre is inside either orientation');
    assert.equal(zoneContains(z, 2, 2), false, 'the bounding box corner is outside either hexagon');
  }

  // A point near the right edge, above the waist: inside the pointy-top hexagon,
  // outside the flat-top one. If orientation were ignored these would agree.
  assert.equal(zoneContains(pointy, 95, 30), true);
  assert.equal(zoneContains(flat, 95, 30), false);
  assert.equal(zoneContains(pointy, 30, 95), false);
  assert.equal(zoneContains(flat, 30, 95), true);
});

test('shape "hex" means pointy-top, the same orientation the raster calls hex-pointy', () => {
  assert.equal(zoneContains({ ...BOX, shape: 'hex' }, 95, 30), true);
  assert.equal(zoneContains({ ...BOX, shape: 'hex' }, 30, 95), false);
});

test('zoneAt finds the zone under a point and returns null outside every zone', () => {
  const zones = [
    { label: 'Rechteck', x: 0, y: 0, width: 100, height: 100 },
    { label: 'Kreis', x: 200, y: 0, width: 100, height: 100, shape: 'circle' },
  ];
  assert.equal(zoneAt(zones, 50, 50)?.label, 'Rechteck');
  assert.equal(zoneAt(zones, 250, 50)?.label, 'Kreis');
  assert.equal(zoneAt(zones, 205, 5), null, 'the circle does not reach into its box corner');
  assert.equal(zoneAt(zones, 150, 50), null);
});

// ── accepts ──────────────────────────────────────────────────────────────────

test('a zone without accepts takes everything – exactly as before', () => {
  const z = { ...BOX };
  for (const kind of ['card', 'asset', 'die']) {
    assert.equal(zoneAccepts(z, kind), true);
  }
  assert.equal(zoneAccepts({ ...BOX, accepts: [] }, 'card'), true, 'an empty list is no restriction');
});

test('accepts restricts the zone to the named kinds', () => {
  const z = { ...BOX, accepts: ['asset'] };
  assert.equal(zoneAccepts(z, 'asset'), true);
  assert.equal(zoneAccepts(z, 'card'), false);
  assert.equal(zoneAccepts(z, 'die'), false);
});

test('zoneRejects names why a drop is refused and stays quiet when it is fine', () => {
  const tokensOnly = { ...BOX, label: 'Bossleiste', accepts: ['asset'], capacity: 4 };
  assert.equal(zoneRejects(tokensOnly, 'asset', 0), null);
  assert.match(zoneRejects(tokensOnly, 'card', 0), /Bossleiste/);
  assert.match(zoneRejects(tokensOnly, 'asset', 4), /full/i);
  assert.equal(zoneRejects({ ...BOX, label: 'Frei' }, 'card', 999), null, 'no capacity means no limit');
});

// ── layout and capacity → slots ──────────────────────────────────────────────

test('layout row with capacity gives that many slots side by side', () => {
  const slots = zoneSlots({ x: 0, y: 0, width: 400, height: 100, layout: 'row', capacity: 4 });
  assert.equal(slots.length, 4);
  assert.deepEqual(slots.map(s => s.x), [50, 150, 250, 350]);
  assert.deepEqual(slots.map(s => s.y), [50, 50, 50, 50]);
});

test('layout column with capacity gives that many slots below each other', () => {
  const slots = zoneSlots({ x: 20, y: 100, width: 80, height: 400, layout: 'column', capacity: 4 });
  assert.deepEqual(slots.map(s => s.x), [60, 60, 60, 60]);
  assert.deepEqual(slots.map(s => s.y), [150, 250, 350, 450]);
});

test('layout stack puts everything on one spot, with or without capacity', () => {
  const slots = zoneSlots({ x: 0, y: 0, width: 100, height: 140, layout: 'stack' });
  assert.deepEqual(slots, [{ x: 50, y: 70 }]);
  assert.deepEqual(zoneSlotFor({ x: 0, y: 0, width: 100, height: 140, layout: 'stack' }, 3, 5), { x: 50, y: 70 });
});

test('layout grid with capacity gives that many distinct slots, all inside the shape', () => {
  const zone = { x: 0, y: 0, width: 300, height: 200, layout: 'grid', capacity: 6, shape: 'circle' };
  const slots = zoneSlots(zone);
  assert.equal(slots.length, 6);
  assert.equal(new Set(slots.map(s => `${s.x},${s.y}`)).size, 6, 'slots must not coincide');
  for (const s of slots) {
    assert.ok(zoneContains(zone, s.x, s.y), `slot outside the circle: ${s.x},${s.y}`);
  }
});

test('layout grid without capacity has no fixed slots – there is no cell count to derive', () => {
  assert.equal(zoneSlots({ ...BOX, layout: 'grid' }), null);
});

test('layout free never has slots, even with a capacity', () => {
  assert.equal(zoneSlots({ ...BOX, layout: 'free', capacity: 4 }), null);
});

test('a zone without layout has no fixed slots and spreads along its longer axis as before', () => {
  const bar = { label: 'Bossleiste', x: 20, y: 100, width: 80, height: 400 };
  assert.equal(zoneSlots(bar), null);
  assert.deepEqual(
    [0, 1, 2, 3].map(i => zoneSlotFor(bar, i, 4)),
    [{ x: 60, y: 150 }, { x: 60, y: 250 }, { x: 60, y: 350 }, { x: 60, y: 450 }]
  );
});

// ── snap (drag and drop) ─────────────────────────────────────────────────────

test('an object dropped into a zone with snap sits on a slot', () => {
  const zone = { label: 'Auslage', x: 0, y: 0, width: 400, height: 100, layout: 'row', capacity: 4, snap: true };
  assert.deepEqual(snapPoint(zone, 170, 12), { x: 150, y: 50 }, 'nearest slot wins');
  assert.deepEqual(snapPoint(zone, 399, 99), { x: 350, y: 50 });
});

test('snap skips slots that are already taken', () => {
  const zone = { label: 'Auslage', x: 0, y: 0, width: 400, height: 100, layout: 'row', capacity: 4, snap: true };
  assert.deepEqual(snapPoint(zone, 170, 12, [{ x: 150, y: 50 }]), { x: 250, y: 50 }, "the next nearest free slot, not the taken one");
});

test('a zone without snap, and layout free, leaves the drop point alone', () => {
  const noSnap = { x: 0, y: 0, width: 400, height: 100, layout: 'row', capacity: 4 };
  assert.deepEqual(snapPoint(noSnap, 170, 12), { x: 170, y: 12 });
  const free = { x: 0, y: 0, width: 400, height: 100, layout: 'free', snap: true };
  assert.deepEqual(snapPoint(free, 170, 12), { x: 170, y: 12 });
});

// ── The sequence honours the new fields ──────────────────────────────────────

test('deal_to_zone puts cards on the slots of a row zone with capacity', () => {
  const zones = [{ label: 'Auslage', x: 0, y: 0, width: 1000, height: 140, layout: 'row', capacity: 10, snap: true }];
  const state = emptyState();
  state.stacks.push(deck('Nachschub', 10));

  const out = executeSequence(state, [{ type: 'deal_to_zone', stackLabel: 'Nachschub', count: 10, targetZoneLabel: 'Auslage' }], zones);

  assert.equal(out.cards.length, 10);
  assert.deepEqual([...out.cards.map(c => c.x)].sort((a, b) => a - b), [50, 150, 250, 350, 450, 550, 650, 750, 850, 950]);
  assert.ok(out.cards.every(c => c.y === 70), 'a row zone keeps one line');
});

test('a full zone takes nothing more', () => {
  const zones = [{ label: 'Auslage', x: 0, y: 0, width: 400, height: 140, layout: 'row', capacity: 2 }];
  const state = emptyState();
  state.stacks.push(deck('Nachschub', 5));
  // Two cards already sit in the zone.
  state.cards.push({ tableId: 'x1', cardId: 'cx1', x: 100, y: 70, zIndex: 1 });
  state.cards.push({ tableId: 'x2', cardId: 'cx2', x: 300, y: 70, zIndex: 2 });

  const { state: out, log } = executeSequenceWithLog(
    state, [{ type: 'deal_to_zone', stackLabel: 'Nachschub', count: 1, targetZoneLabel: 'Auslage' }], zones
  );

  assert.equal(out.cards.length, 2, 'nothing was added to the full zone');
  assert.equal(out.stacks[0].cards.length, 5, 'the cards stay in the stack');
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /full/i);
});

test('a zone that is partly full takes what fits and reports the rest', () => {
  const zones = [{ label: 'Auslage', x: 0, y: 0, width: 400, height: 140, layout: 'row', capacity: 4 }];
  const state = emptyState();
  state.stacks.push(deck('Nachschub', 10));
  state.cards.push({ tableId: 'x1', cardId: 'cx1', x: 50, y: 70, zIndex: 1 });

  const { state: out, log } = executeSequenceWithLog(
    state, [{ type: 'deal_to_zone', stackLabel: 'Nachschub', count: 10, targetZoneLabel: 'Auslage' }], zones
  );

  assert.equal(out.cards.length, 4, 'one card was there, three more fit');
  assert.equal(out.stacks[0].cards.length, 7, 'the seven that did not fit stay in the stack');
  assert.equal(log[0].status, 'failed');
  assert.match(log[0].reason, /full|4/);
});

test('a zone with accepts: ["asset"] refuses cards and the cards stay in the stack', () => {
  const zones = [{ label: 'Bossleiste', x: 0, y: 0, width: 100, height: 400, accepts: ['asset'], capacity: 4 }];
  const state = emptyState();
  state.stacks.push(deck('Nachschub', 5));

  const { state: out, log } = executeSequenceWithLog(
    state, [{ type: 'deal_to_zone', stackLabel: 'Nachschub', count: 2, targetZoneLabel: 'Bossleiste' }], zones
  );

  assert.equal(out.cards.length, 0, 'no card may land in a token-only zone');
  assert.equal(out.stacks[0].cards.length, 5);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Bossleiste/);
});

test('draw_assets respects accepts and capacity of its target zone', () => {
  const cardsOnly = [{ label: 'Auslage', x: 0, y: 0, width: 400, height: 140, accepts: ['card'] }];
  const { state: refused, log } = executeSequenceWithLog(
    emptyState(), [{ type: 'draw_assets', pool: 'Bosse', count: 4, targetZoneLabel: 'Auslage' }], cardsOnly,
    { assets: TOKENS, rng: seededRng(1) }
  );
  assert.equal(refused.tokens.length, 0);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Auslage/);

  const small = [{ label: 'Bossleiste', x: 0, y: 0, width: 100, height: 400, accepts: ['asset'], capacity: 2, layout: 'column' }];
  const { state: partial, log: log2 } = executeSequenceWithLog(
    emptyState(), [{ type: 'draw_assets', pool: 'Bosse', count: 4, targetZoneLabel: 'Bossleiste' }], small,
    { assets: TOKENS, rng: seededRng(1) }
  );
  assert.equal(partial.tokens.length, 2, 'a capacity of 2 takes two tokens, not four');
  assert.deepEqual(partial.tokens.map(t => t.y).sort((a, b) => a - b), [100, 300], 'and they sit on the two slots');
  assert.equal(log2[0].status, 'failed');
  assert.match(log2[0].reason, /full|2/);
});

test('place_asset lands on the next free slot and bounces off a zone that refuses it', () => {
  const zones = [
    { label: 'Bossleiste', x: 0, y: 0, width: 100, height: 400, accepts: ['asset'], capacity: 4, layout: 'column' },
    { label: 'Kartenauslage', x: 500, y: 0, width: 400, height: 140, accepts: ['card'] },
  ];
  const { state, log } = executeSequenceWithLog(
    emptyState(),
    [
      { type: 'place_asset', assetName: 'Klaus', targetZoneLabel: 'Bossleiste' },
      { type: 'place_asset', assetName: 'Bertha', targetZoneLabel: 'Bossleiste' },
      { type: 'place_asset', assetName: 'Grimm', targetZoneLabel: 'Kartenauslage' },
    ],
    zones,
    { assets: TOKENS }
  );

  assert.deepEqual(state.tokens.map(t => [t.label, t.x, t.y]), [['Klaus', 50, 50], ['Bertha', 50, 150]]);
  assert.equal(log[2].status, 'skipped');
  assert.match(log[2].reason, /Kartenauslage/);
});

// ── Backwards compatibility: zones saved before M2 ───────────────────────────

test('a zone saved before M2 behaves exactly as before', () => {
  // No shape, no accepts, no capacity, no layout, no snap – the shape of every
  // zone already in the database.
  const old = [
    { label: 'Bossleiste', x: 20, y: 100, width: 80, height: 400 },
    { label: 'Auslage', x: 400, y: 600, width: 300, height: 140 },
  ];

  // draw_assets still spreads along the longer axis, at the same coordinates.
  const drawn = executeSequence(
    emptyState(), [{ type: 'draw_assets', pool: 'Bosse', count: 4, targetZoneLabel: 'Bossleiste' }], old,
    { assets: TOKENS, rng: seededRng(1) }
  );
  assert.deepEqual(drawn.tokens.map(t => t.x), [60, 60, 60, 60]);
  assert.deepEqual(drawn.tokens.map(t => t.y), [150, 250, 350, 450]);

  // deal_to_zone still drops every card on the zone centre.
  const state = emptyState();
  state.stacks.push(deck('Nachschub', 3));
  const dealt = executeSequence(state, [{ type: 'deal_to_zone', stackLabel: 'Nachschub', count: 3, targetZoneLabel: 'Auslage' }], old);
  assert.equal(dealt.cards.length, 3);
  assert.ok(dealt.cards.every(c => c.x === 550 && c.y === 670), 'old zones keep the centre drop');

  // place_asset still lands on the zone centre.
  const placed = executeSequence(emptyState(), [{ type: 'place_asset', assetName: 'Klaus', targetZoneLabel: 'Auslage' }], old, { assets: TOKENS });
  assert.deepEqual([placed.tokens[0].x, placed.tokens[0].y], [550, 670]);

  // And an old zone never refuses anything, however full it is.
  assert.equal(zoneRejects(old[0], 'card', 99), null);
  assert.deepEqual(snapPoint(old[0], 33, 44), { x: 33, y: 44 }, 'without snap the drop point is kept');
});
