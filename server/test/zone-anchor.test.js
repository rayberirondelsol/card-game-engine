// M3a – anchoring zones to an asset (spec section 4 "Zonen am Brett verankern"
// and milestone M3a).
//
// Run with: npm test  (node --test, no test framework dependency)
//
// The client has no test infrastructure and getting one would mean a new
// dependency, so the checkable part lives in a pure module: resolving a
// relative box on an anchor into an absolute box, and back. That is the same
// function M3b will use for grids, which is why it is not called zoneAnchor.
//
// What is tested here:
//   * the box of a placed object (boards and tokens are centre-anchored)
//   * relative → absolute and the round trip absolute → relative → absolute
//   * a zone saved before M3a passes through untouched
//   * an anchor that is not on the table: the zone stays, visibly flagged
//   * moving and scaling the anchor
//   * a circle and a hexagon are still the same figure after both
//   * the executor resolves against the state it is building, so a board the
//     sequence places itself is a usable anchor for the next step

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  assetBox, anchorBoxes, resolveBox, relativeBox, resolveZones, setAnchor,
} = await import('../../client/src/utils/anchoring.js');
const { zoneContains } = await import('../../client/src/utils/zoneGeometry.js');
const { executeSequenceWithLog } = await import('../../client/src/utils/sequenceExecutor.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** A board as GameTable holds it: x/y is the centre, width/height the size. */
function board(over = {}) {
  return {
    id: 'asset-board', name: 'Main board', imageUrl: '/uploads/board.png',
    x: 500, y: 400, width: 800, height: 600, locked: true, ...over,
  };
}

/** A token as the asset steps build it: x/y is the centre, `size` the edge. */
function token(over = {}) {
  return {
    id: 'tok-1', assetId: 'asset-side', label: 'Sideboard',
    x: 200, y: 200, size: 60, ...over,
  };
}

/** The top-left box of the default board, for readable expectations. */
const BOARD_BOX = { x: 100, y: 100, width: 800, height: 600 };

/** A zone anchored to the board, covering its left quarter. */
function anchored(over = {}) {
  return {
    id: 'z-boss', type: 'shared', shape: 'rect', label: 'Bosseleiste',
    x: 300, y: 400, width: 400, height: 150,
    accepts: [], capacity: 4, layout: 'row', snap: true,
    anchor: { assetId: 'asset-board', relX: 0.25, relY: 0.5, relWidth: 0.5, relHeight: 0.25 },
    ...over,
  };
}

/** A zone exactly as M2.6 saved it – no anchor field anywhere. */
function legacyZone() {
  return {
    id: 'z-old', type: 'player', shape: 'circle', color: 'blue', label: 'Player 1',
    x: 100, y: 300, width: 1000, height: 500,
    accepts: [], capacity: null, layout: null, snap: false, exclusive: true,
    startingHandCardIds: [], dealStackId: null, dealCount: 0,
    cameraX: 600, cameraY: 550, cameraZoom: 1.0,
  };
}

const box = (z) => ({ x: z.x, y: z.y, width: z.width, height: z.height });
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} != ${b}`);
const boxNear = (a, b, msg) => {
  near(a.x, b.x, `${msg} x`); near(a.y, b.y, `${msg} y`);
  near(a.width, b.width, `${msg} width`); near(a.height, b.height, `${msg} height`);
};

// ── The box of a placed object ───────────────────────────────────────────────

test('a board is measured from its centre, and carries the asset id in `id`', () => {
  const b = assetBox(board());
  assert.equal(b.id, 'asset-board');
  boxNear(b, BOARD_BOX, 'board box');
});

test('a token is a square of `size` around its centre, keyed by assetId', () => {
  const b = assetBox(token());
  assert.equal(b.id, 'asset-side');
  boxNear(b, { x: 170, y: 170, width: 60, height: 60 }, 'token box');
});

test('an object without an asset id cannot be an anchor', () => {
  assert.equal(assetBox({ x: 10, y: 10, size: 20 }), null);
  // A token drawn by hand has a fresh uuid on every table – an anchor naming
  // it would be broken the moment the setup is loaded again.
  assert.equal(assetBox({ id: crypto.randomUUID(), shape: 'circle', x: 10, y: 10 }), null);
  assert.equal(anchorBoxes([{ x: 10, y: 10, size: 20 }, board()]).length, 1);
  assert.deepStrictEqual(anchorBoxes([token()], [board()]).map(b => b.id), ['asset-side', 'asset-board']);
});

// ── relative → absolute and back ─────────────────────────────────────────────

test('resolveBox places the relative box on the anchor', () => {
  const abs = resolveBox({ relX: 0.25, relY: 0.5, relWidth: 0.5, relHeight: 0.25 }, BOARD_BOX);
  boxNear(abs, { x: 300, y: 400, width: 400, height: 150 }, 'resolved');
});

test('absolute → relative → absolute is the identity', () => {
  const anchors = [
    BOARD_BOX,
    { x: -240, y: 80, width: 333, height: 91 },
    { x: 0, y: 0, width: 1, height: 1 },
  ];
  const boxes = [
    { x: 300, y: 400, width: 400, height: 150 },
    { x: -1000, y: -1000, width: 20, height: 5000 },
    { x: 0.5, y: 0.25, width: 0.1, height: 0.1 },
  ];
  for (const a of anchors) {
    for (const b of boxes) {
      boxNear(resolveBox(relativeBox(b, a), a), b, `round trip on ${JSON.stringify(a)}`);
    }
  }
});

test('a degenerate anchor does not produce NaN', () => {
  const rel = relativeBox({ x: 10, y: 10, width: 5, height: 5 }, { x: 0, y: 0, width: 0, height: 0 });
  for (const v of Object.values(rel)) assert.ok(Number.isFinite(v), `${v} is not finite`);
});

// ── Zones without an anchor ──────────────────────────────────────────────────

test('a zone saved before M3a passes through resolveZones unchanged', () => {
  const before = legacyZone();
  const [after] = resolveZones([before], anchorBoxes([board(), token()]));
  assert.deepStrictEqual(after, legacyZone(), 'an unanchored zone is absolute, as it always was');
  assert.deepStrictEqual(before, legacyZone(), 'and the input is not mutated');
});

test('no anchors on the table at all leaves unanchored zones alone', () => {
  assert.deepStrictEqual(resolveZones([legacyZone()], []), [legacyZone()]);
  assert.deepStrictEqual(resolveZones([legacyZone()]), [legacyZone()]);
});

// ── A missing anchor ─────────────────────────────────────────────────────────

test('an anchor that is not on the table keeps the zone where it was, flagged', () => {
  const [z] = resolveZones([anchored()], anchorBoxes([token()])); // board deleted
  boxNear(box(z), box(anchored()), 'last known position');
  assert.equal(z.anchorMissing, true, 'the zone must not vanish silently');
  assert.deepStrictEqual(z.anchor, anchored().anchor, 'the anchor itself is kept, not dropped');
});

test('a present anchor never flags anything missing', () => {
  const [z] = resolveZones([anchored()], anchorBoxes([board()]));
  assert.ok(!z.anchorMissing);
});

// ── Moving and scaling the anchor ────────────────────────────────────────────

test('moving the board moves the zone by the same delta', () => {
  const [before] = resolveZones([anchored()], anchorBoxes([board()]));
  const [after] = resolveZones([anchored()], anchorBoxes([board({ x: 500 + 250, y: 400 - 130 })]));
  boxNear(box(after), {
    x: before.x + 250, y: before.y - 130, width: before.width, height: before.height,
  }, 'moved with the board');
});

test('scaling the board scales the zone with it', () => {
  const [before] = resolveZones([anchored()], anchorBoxes([board()]));
  // Same centre, twice as wide, half as high.
  const [after] = resolveZones([anchored()], anchorBoxes([board({ width: 1600, height: 300 })]));
  near(after.width, before.width * 2, 'width');
  near(after.height, before.height * 0.5, 'height');
  // Still on the same printed area: the relative offset inside the board is unchanged.
  const big = { x: 500 - 800, y: 400 - 150, width: 1600, height: 300 };
  const now = relativeBox(box(after), big);
  const was = relativeBox(box(before), BOARD_BOX);
  for (const k of ['relX', 'relY', 'relWidth', 'relHeight']) near(now[k], was[k], k);
});

test('a zone anchored to a board follows it over a move and a scale together', () => {
  const moved = board({ x: 1500, y: 900, width: 400, height: 900 });
  const [z] = resolveZones([anchored()], anchorBoxes([moved]));
  boxNear(box(z), {
    x: 1300 + 0.25 * 400, y: 450 + 0.5 * 900, width: 0.5 * 400, height: 0.25 * 900,
  }, 'follows move and scale');
});

// ── The shape survives ───────────────────────────────────────────────────────

/** Points in box-normalised coordinates, from well inside to well outside. */
const PROBES = [
  [0.5, 0.5], [0.02, 0.5], [0.5, 0.02], [0.02, 0.02], [0.98, 0.98],
  [0.15, 0.15], [0.85, 0.2], [0.3, 0.9], [0.99, 0.5], [0.5, 0.99],
];

for (const shape of ['circle', 'hex', 'hex-flat']) {
  test(`an anchored ${shape} zone is the same figure after the board moved and scaled`, () => {
    const zone = anchored({ shape });
    const [plain] = resolveZones([zone], anchorBoxes([board()]));
    const [scaled] = resolveZones([zone], anchorBoxes([board({ x: 1200, y: -50, width: 240, height: 1400 })]));
    for (const [u, v] of PROBES) {
      const inPlain = zoneContains(plain, plain.x + u * plain.width, plain.y + v * plain.height);
      const inScaled = zoneContains(scaled, scaled.x + u * scaled.width, scaled.y + v * scaled.height);
      assert.equal(inScaled, inPlain, `${shape} at (${u}, ${v}) changed membership`);
    }
  });
}

// ── Setting and clearing the anchor in the editor ────────────────────────────

test('setting an anchor keeps the zone exactly where it is', () => {
  const plain = { ...legacyZone(), anchor: undefined };
  delete plain.anchor;
  const b = assetBox(board());
  const bound = setAnchor(plain, b);
  assert.equal(bound.anchor.assetId, 'asset-board');
  const [resolved] = resolveZones([bound], [b]);
  boxNear(box(resolved), box(plain), 'unchanged on screen');
});

test('a zone corrected while anchored stays anchored to the new box', () => {
  const b = assetBox(board());
  const moved = setAnchor({ ...anchored(), x: 111, y: 222, width: 333, height: 444 }, b);
  const [resolved] = resolveZones([moved], [b]);
  boxNear(box(resolved), { x: 111, y: 222, width: 333, height: 444 }, 'the correction wins');
});

test('clearing the anchor leaves the zone at its last resolved place', () => {
  const [resolved] = resolveZones([anchored()], anchorBoxes([board({ x: 900, y: 900 })]));
  const free = setAnchor(resolved, null);
  assert.ok(!('anchor' in free) || free.anchor == null, 'anchor is gone');
  assert.ok(!free.anchorMissing, 'and so is the flag');
  boxNear(box(free), box(resolved), 'frozen where it stood');
  assert.deepStrictEqual(resolveZones([free], anchorBoxes([board()]))[0], free, 'and it no longer follows');
});

// ── The executor resolves against the state it is building ───────────────────

const ASSETS = [
  { id: 'asset-board', name: 'Main board', category: 'Boards', type: 'board', image_path: '/b.png', width: 800, height: 600 },
  ...['Klaus', 'Bertha', 'Grimm', 'Odd'].map((n, i) => ({
    id: `boss-${i}`, name: n, category: 'Bosse', type: 'token',
    image_path: `/t${i}.png`, back_image_path: '/back.png', width: 40,
  })),
];

test('a zone anchored to a board the sequence places itself gets the new position', () => {
  const state = { cards: [], stacks: [], tokens: [], boards: [] };
  const zones = [anchored()];
  const steps = [
    { type: 'place_asset', assetName: 'Main board', x: 2000, y: 1500 },
    { type: 'draw_assets', pool: 'Bosse', count: 4, targetZoneLabel: 'Bosseleiste', faceDown: true },
  ];
  const { state: built, log } = executeSequenceWithLog(state, steps, zones, { assets: ASSETS, rng: () => 0.5 });
  assert.deepStrictEqual(log.map(e => e.status), ['ok', 'ok'], JSON.stringify(log));
  assert.equal(built.tokens.filter(t => t.assetId !== 'asset-board').length, 4);

  // The board landed at (2000, 1500); the zone must sit on the same printed
  // area of it, not at the absolute coordinates saved in the zone.
  const placed = built.tokens.find(t => t.assetId === 'asset-board');
  const [zone] = resolveZones(zones, anchorBoxes([placed]));
  for (const t of built.tokens) {
    if (t.assetId === 'asset-board') continue;
    assert.ok(zoneContains(zone, t.x, t.y), `boss at ${t.x}/${t.y} is outside the anchored zone`);
  }
  assert.ok(built.tokens.every(t => t.assetId === 'asset-board' || t.x > 1500), 'drawn at the old place');
});

test('without the anchor on the table the executor still fills the zone where it stands', () => {
  const state = { cards: [], stacks: [], tokens: [], boards: [] };
  const steps = [{ type: 'draw_assets', pool: 'Bosse', count: 4, targetZoneLabel: 'Bosseleiste', faceDown: true }];
  const { state: built, log } = executeSequenceWithLog(state, steps, [anchored()], { assets: ASSETS, rng: () => 0.5 });
  assert.equal(log[0].status, 'ok', log[0].reason || '');
  assert.equal(built.tokens.length, 4);
  for (const t of built.tokens) {
    assert.ok(zoneContains(anchored(), t.x, t.y), `token at ${t.x}/${t.y} left the unresolved zone`);
  }
});
