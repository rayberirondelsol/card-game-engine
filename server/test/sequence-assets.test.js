// Tests for the asset-aware setup sequence steps (place_asset, draw_assets,
// set_asset_face, lock_asset / unlock_asset).
//
// Run with: npm test  (node --test, no test framework dependency)
//
// executeSequence is a pure function in the client bundle, so this file imports
// it directly - no app, no DB, no CGE_DB_PATH needed.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence } = await import('../../client/src/utils/sequenceExecutor.js');

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

const BOSS_BACK = '/uploads/tokens/boss-back.png';

/** Eight boss tokens (pool "Bosse") + two figures without a back side. */
function assetFixture() {
  const bosses = ['Klaus', 'Bertha', 'Grimm', 'Odd', 'Hex', 'Mole', 'Vex', 'Wren'].map((n, i) => ({
    id: `boss-${i}`,
    name: n,
    type: 'token',
    category: 'Bosse',
    image_path: `/uploads/tokens/boss-${i}.png`,
    back_image_path: BOSS_BACK,
    width: 80,
    height: 80,
  }));
  const figures = ['Held A', 'Held B'].map((n, i) => ({
    id: `fig-${i}`,
    name: n,
    type: 'token',
    category: 'Figuren',
    image_path: `/uploads/tokens/fig-${i}.png`,
    back_image_path: null, // no back side on purpose
    width: 60,
    height: 60,
  }));
  return [...bosses, ...figures];
}

/** A left-edge vertical bar plus two single start squares. */
const ZONES = [
  { label: 'Bossleiste', x: 20, y: 100, width: 80, height: 400 },
  { label: 'Start A', x: 400, y: 600, width: 60, height: 60 },
  { label: 'Start B', x: 500, y: 600, width: 60, height: 60 },
];

function emptyState() {
  return { cards: [], stacks: [], tokens: [], boards: [] };
}

// ── draw_assets ──────────────────────────────────────────────────────────────

test('draw_assets draws exactly N from the named pool, without duplicates', () => {
  const out = executeSequence(
    emptyState(),
    [{ type: 'draw_assets', pool: 'Bosse', count: 4, targetZoneLabel: 'Bossleiste' }],
    ZONES,
    { assets: assetFixture(), rng: seededRng(1) }
  );

  assert.equal(out.tokens.length, 4);
  for (const t of out.tokens) {
    assert.ok(t.assetId.startsWith('boss-'), `drew a non-boss asset: ${t.assetId}`);
  }
  const ids = new Set(out.tokens.map(t => t.assetId));
  assert.equal(ids.size, 4, 'drew the same asset twice');
});

test('draw_assets is reproducible with a fixed rng and differs with another', () => {
  const step = [{ type: 'draw_assets', pool: 'Bosse', count: 4, targetZoneLabel: 'Bossleiste' }];
  const draw = (seed) => executeSequence(emptyState(), step, ZONES, {
    assets: assetFixture(),
    rng: seededRng(seed),
  }).tokens.map(t => t.assetId);

  assert.deepEqual(draw(42), draw(42), 'same rng must produce the same draw');
  assert.notDeepEqual(draw(42), draw(7), 'a different rng must produce a different draw');
});

test('draw_assets with faceDown places assets face down showing back_image_path', () => {
  const out = executeSequence(
    emptyState(),
    [{ type: 'draw_assets', pool: 'Bosse', count: 4, targetZoneLabel: 'Bossleiste', faceDown: true }],
    ZONES,
    { assets: assetFixture(), rng: seededRng(3) }
  );

  assert.equal(out.tokens.length, 4);
  for (const t of out.tokens) {
    assert.equal(t.faceDown, true);
    assert.equal(t.imageUrl, BOSS_BACK);
    assert.equal(t.backImageUrl, BOSS_BACK);
    assert.ok(t.frontImageUrl.startsWith('/uploads/tokens/boss-'));
  }
});

test('an asset without back_image_path cannot be placed face down - it lands face up', () => {
  const out = executeSequence(
    emptyState(),
    [{ type: 'draw_assets', pool: 'Figuren', count: 2, targetZoneLabel: 'Start A', faceDown: true }],
    ZONES,
    { assets: assetFixture(), rng: seededRng(5) }
  );

  assert.equal(out.tokens.length, 2, 'assets are still placed, just not face down');
  for (const t of out.tokens) {
    assert.equal(t.faceDown, false);
    assert.equal(t.imageUrl, t.frontImageUrl);
    assert.equal(t.backImageUrl, null);
  }
});

test('draw_assets with a pool smaller than count draws all of them without crashing', () => {
  const out = executeSequence(
    emptyState(),
    [{ type: 'draw_assets', pool: 'Figuren', count: 10, targetZoneLabel: 'Start A' }],
    ZONES,
    { assets: assetFixture(), rng: seededRng(9) }
  );

  assert.equal(out.tokens.length, 2);
});

test('draw_assets from an unknown pool is a no-op, not a crash', () => {
  const out = executeSequence(
    emptyState(),
    [{ type: 'draw_assets', pool: 'Gibt Es Nicht', count: 4, targetZoneLabel: 'Bossleiste' }],
    ZONES,
    { assets: assetFixture(), rng: seededRng(11) }
  );

  assert.equal(out.tokens.length, 0);
});

// ── place_asset / set_asset_face ─────────────────────────────────────────────

test('place_asset puts a named asset at a position and into a zone', () => {
  const out = executeSequence(
    emptyState(),
    [
      { type: 'place_asset', assetName: 'Held A', x: 123, y: 456 },
      { type: 'place_asset', assetName: 'Held B', targetZoneLabel: 'Start B' },
    ],
    ZONES,
    { assets: assetFixture() }
  );

  const a = out.tokens.find(t => t.label === 'Held A');
  const b = out.tokens.find(t => t.label === 'Held B');
  assert.ok(a && b);
  assert.equal(a.x, 123);
  assert.equal(a.y, 456);
  assert.equal(b.x, 530); // zone centre: 500 + 60/2
  assert.equal(b.y, 630);
  assert.equal(a.shape, 'image');
  assert.equal(a.imageUrl, '/uploads/tokens/fig-0.png');
});

test('place_asset on an unknown asset name is a no-op', () => {
  const out = executeSequence(
    emptyState(),
    [{ type: 'place_asset', assetName: 'Niemand', x: 1, y: 2 }],
    ZONES,
    { assets: assetFixture() }
  );
  assert.equal(out.tokens.length, 0);
});

test('set_asset_face flips a placed asset between front and back', () => {
  const out = executeSequence(
    emptyState(),
    [
      { type: 'place_asset', assetName: 'Klaus', x: 10, y: 10 },
      { type: 'set_asset_face', assetName: 'Klaus', faceDown: true },
    ],
    ZONES,
    { assets: assetFixture() }
  );

  const t = out.tokens[0];
  assert.equal(t.faceDown, true);
  assert.equal(t.imageUrl, BOSS_BACK);

  const back = executeSequence(out, [{ type: 'set_asset_face', assetName: 'Klaus', faceDown: false }], ZONES, {
    assets: assetFixture(),
  });
  assert.equal(back.tokens[0].faceDown, false);
  assert.equal(back.tokens[0].imageUrl, '/uploads/tokens/boss-0.png');
});

// ── lock_asset / unlock_asset ────────────────────────────────────────────────

test('lock_asset sets locked and a locked asset is not moved by place_asset or move', () => {
  const state = emptyState();
  state.boards.push({ id: 'b1', name: 'Spielbrett', imageUrl: '/uploads/board.png', x: 800, y: 450, width: 900, height: 600, locked: false });

  const out = executeSequence(
    state,
    [
      { type: 'place_asset', assetName: 'Held A', x: 100, y: 100 },
      { type: 'lock_asset', assetName: 'Held A' },
      { type: 'lock_asset', assetName: 'Spielbrett' },
      // both of these must bounce off the lock
      { type: 'place_asset', assetName: 'Held A', x: 999, y: 999 },
      { type: 'move', assetName: 'Spielbrett', x: 0, y: 0 },
    ],
    ZONES,
    { assets: assetFixture() }
  );

  const held = out.tokens.find(t => t.label === 'Held A');
  assert.equal(held.locked, true);
  assert.equal(held.x, 100, 'locked token must not be moved by place_asset');
  assert.equal(held.y, 100);
  assert.equal(out.tokens.length, 1, 'place_asset must not duplicate an existing asset');

  const board = out.boards[0];
  assert.equal(board.locked, true);
  assert.equal(board.x, 800, 'locked board must not be moved by move');
  assert.equal(board.y, 450);
});

test('unlock_asset releases the lock again', () => {
  const out = executeSequence(
    emptyState(),
    [
      { type: 'place_asset', assetName: 'Held A', x: 100, y: 100 },
      { type: 'lock_asset', assetName: 'Held A' },
      { type: 'unlock_asset', assetName: 'Held A' },
      { type: 'place_asset', assetName: 'Held A', x: 300, y: 300 },
    ],
    ZONES,
    { assets: assetFixture() }
  );

  const held = out.tokens[0];
  assert.equal(held.locked, false);
  assert.equal(held.x, 300);
});

// ── Integration: Townsfolk Tussle boss bar ───────────────────────────────────

test('Townsfolk Tussle: four random face-down boss tokens in the left bar, figures on start squares, board locked', () => {
  const state = emptyState();
  state.boards.push({ id: 'b1', name: 'Spielbrett', imageUrl: '/uploads/board.png', x: 800, y: 450, width: 900, height: 600, locked: false });

  const sequence = [
    { type: 'lock_asset', assetName: 'Spielbrett' },
    { type: 'draw_assets', pool: 'Bosse', count: 4, targetZoneLabel: 'Bossleiste', faceDown: true },
    { type: 'place_asset', assetName: 'Held A', targetZoneLabel: 'Start A' },
    { type: 'place_asset', assetName: 'Held B', targetZoneLabel: 'Start B' },
  ];

  const run = (seed) => executeSequence(state, sequence, ZONES, {
    assets: assetFixture(),
    rng: seededRng(seed),
  });

  const game1 = run(2024);
  const game2 = run(1999);

  // Board is fixed and still where the author put it.
  assert.equal(game1.boards[0].locked, true);
  assert.equal(game1.boards[0].x, 800);

  // Four distinct, face-down bosses in the bar.
  const bosses1 = game1.tokens.filter(t => t.assetId.startsWith('boss-'));
  assert.equal(bosses1.length, 4);
  assert.equal(new Set(bosses1.map(t => t.assetId)).size, 4);
  for (const t of bosses1) {
    assert.equal(t.faceDown, true);
    assert.equal(t.imageUrl, BOSS_BACK);
    // inside the bar: x in [20, 100], y in [100, 500]
    assert.ok(t.x >= 20 && t.x <= 100, `boss x out of bar: ${t.x}`);
    assert.ok(t.y >= 100 && t.y <= 500, `boss y out of bar: ${t.y}`);
  }
  // spread out along the bar, not stacked on one spot
  assert.equal(new Set(bosses1.map(t => t.y)).size, 4, 'bosses must not overlap');

  // Figures stand on their start squares, face up.
  const heldA = game1.tokens.find(t => t.label === 'Held A');
  assert.deepEqual([heldA.x, heldA.y], [430, 630]);
  assert.equal(heldA.faceDown, false);

  // Every game a different set of bosses.
  const bosses2 = game2.tokens.filter(t => t.assetId.startsWith('boss-'));
  assert.notDeepEqual(bosses1.map(t => t.assetId), bosses2.map(t => t.assetId));

  // The source state was not mutated.
  assert.equal(state.tokens.length, 0);
  assert.equal(state.boards[0].locked, false);
});

// ── Backwards compatibility ──────────────────────────────────────────────────

test('existing three-argument calls keep working (shuffle still uses Math.random)', () => {
  const state = {
    cards: [],
    stacks: [{
      stackId: 's1',
      label: 'Deck',
      x: 0,
      y: 0,
      cards: Array.from({ length: 5 }, (_, i) => ({ tableId: `t${i}`, cardId: `c${i}`, zIndex: i + 1, faceDown: false })),
    }],
  };

  const out = executeSequence(state, [{ type: 'shuffle', stackLabel: 'Deck' }, { type: 'set_face_down', stackLabel: 'Deck' }], []);
  assert.equal(out.stacks[0].cards.length, 5);
  assert.deepEqual(out.stacks[0].cards.map(c => c.zIndex), [1, 2, 3, 4, 5]);
  assert.ok(out.stacks[0].cards.every(c => c.faceDown === true));
});
