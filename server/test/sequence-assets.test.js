// Tests for the asset-aware setup sequence steps (place_asset, draw_assets,
// set_asset_face, lock_asset / unlock_asset).
//
// Run with: npm test  (node --test, no test framework dependency)
//
// executeSequence is a pure function in the client bundle, so this file imports
// it directly - no app, no DB, no CGE_DB_PATH needed.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

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

test('an asset without back_image_path is not placed face down - it is not placed at all', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(),
    [{ type: 'draw_assets', pool: 'Figuren', count: 2, targetZoneLabel: 'Start A', faceDown: true }],
    ZONES,
    { assets: assetFixture(), rng: seededRng(5) }
  );

  assert.equal(state.tokens.length, 0, 'an asset without a back side must not land on the table');
  assert.equal(log[0].status, 'failed');
  assert.match(log[0].reason, /Held A/);
  assert.match(log[0].reason, /Held B/);
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

// ── Face down without a back side (spec section 6, "Verdeckte Objekte") ──────
//
// Placing such an object face up would leak exactly the information that was
// meant to stay hidden, so it is not placed at all and the step reports it.

/** A pool where one of four assets has no back side. */
const MIXED_POOL = [
  { id: 'm-0', name: 'Mit Ruecken 1', type: 'token', category: 'Mix', image_path: '/uploads/m0.png', back_image_path: BOSS_BACK, width: 60 },
  { id: 'm-1', name: 'Ohne Ruecken', type: 'token', category: 'Mix', image_path: '/uploads/m1.png', back_image_path: null, width: 60 },
  { id: 'm-2', name: 'Mit Ruecken 2', type: 'token', category: 'Mix', image_path: '/uploads/m2.png', back_image_path: BOSS_BACK, width: 60 },
  { id: 'm-3', name: 'Mit Ruecken 3', type: 'token', category: 'Mix', image_path: '/uploads/m3.png', back_image_path: BOSS_BACK, width: 60 },
];

test('draw_assets drops only the back-less asset, keeps the rest, and reports the step as failed', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(),
    [{ type: 'draw_assets', pool: 'Mix', count: 4, targetZoneLabel: 'Bossleiste', faceDown: true }],
    ZONES,
    { assets: MIXED_POOL, rng: seededRng(4) }
  );

  assert.equal(state.tokens.length, 3, 'the three assets with a back side still land in the zone');
  assert.ok(!state.tokens.some(t => t.label === 'Ohne Ruecken'), 'the back-less asset must not be on the table');
  for (const t of state.tokens) {
    assert.equal(t.faceDown, true);
    assert.equal(t.imageUrl, BOSS_BACK);
  }
  // the three that made it are still spread over the bar, not stacked on one spot
  assert.equal(new Set(state.tokens.map(t => t.y)).size, 3);

  assert.equal(log[0].status, 'failed');
  assert.match(log[0].reason, /Ohne Ruecken/);
});

test('place_asset with faceDown and no back side places nothing and reports it', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(),
    [{ type: 'place_asset', assetName: 'Held A', x: 10, y: 20, faceDown: true }],
    ZONES,
    { assets: assetFixture() }
  );

  assert.equal(state.tokens.length, 0);
  assert.equal(log[0].status, 'failed');
  assert.match(log[0].reason, /Held A/);
});

test('set_asset_face faceDown on an asset without a back side takes it off the table', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(),
    [
      { type: 'place_asset', assetName: 'Held A', x: 10, y: 20 },
      { type: 'set_asset_face', assetName: 'Held A', faceDown: true },
    ],
    ZONES,
    { assets: assetFixture() }
  );

  assert.equal(state.tokens.length, 0, 'leaving it face up would leak what should stay hidden');
  assert.equal(log[0].status, 'ok');
  assert.equal(log[1].status, 'failed');
  assert.match(log[1].reason, /Held A/);
});

// ── Protocol (spec section 6, "Fehler sind sichtbar") ────────────────────────

test('executeSequenceWithLog reports ok / skipped / failed per step with enough context', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(),
    [
      { type: 'place_asset', assetName: 'Held A', x: 1, y: 2 },
      { type: 'place_asset', assetName: 'Niemand', x: 1, y: 2 },
      { type: 'draw_assets', pool: 'Figuren', count: 1, targetZoneLabel: 'Start A', faceDown: true },
      { type: 'pflanzt_einen_baum' },
    ],
    ZONES,
    { assets: assetFixture(), rng: seededRng(1) }
  );

  assert.deepEqual(log.map(e => e.status), ['ok', 'skipped', 'failed', 'skipped']);
  assert.deepEqual(log.map(e => e.index), [0, 1, 2, 3]);
  assert.deepEqual(log.map(e => e.type), ['place_asset', 'place_asset', 'draw_assets', 'pflanzt_einen_baum']);
  assert.equal(log[0].reason, null, 'a step that worked needs no reason');
  assert.equal(log[1].target, 'Niemand', 'the entry must name what the step pointed at');
  assert.match(log[1].reason, /Niemand/);
  assert.equal(log[2].target, 'Figuren');
  assert.ok(log[2].reason.length > 0);
  assert.equal(state.tokens.length, 1, 'only the first step placed anything');
});

test('a broken step does not stop the steps behind it', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(),
    [
      { type: 'shuffle', stackLabel: 'Nicht Da' },
      { type: 'place_asset', assetName: 'Held A', x: 1, y: 2 },
    ],
    ZONES,
    { assets: assetFixture() }
  );

  assert.equal(log[0].status, 'skipped');
  assert.equal(log[0].target, 'Nicht Da');
  assert.equal(log[1].status, 'ok', 'a failed step must not stop the rest of the setup');
  assert.equal(state.tokens.length, 1);
});

// ── Backwards compatibility of the protocol ─────────────────────────────────

test('executeSequence still returns the plain state, executeSequenceWithLog wraps it', () => {
  const step = [{ type: 'place_asset', assetName: 'Held A', x: 5, y: 6 }];
  const opts = { assets: assetFixture() };

  const plain = executeSequence(emptyState(), step, ZONES, opts);
  const { state, log } = executeSequenceWithLog(emptyState(), step, ZONES, opts);

  assert.equal(plain.tokens.length, 1);
  assert.equal(plain.tokens[0].x, 5);
  assert.ok(!('log' in plain), 'the protocol must not be smuggled into the state');
  assert.deepEqual(Object.keys(plain).sort(), Object.keys(state).sort());
  assert.equal(log.length, 1);
  assert.equal(log[0].status, 'ok');
});
