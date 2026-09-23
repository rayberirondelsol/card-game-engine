// M2.6 – usability of the zone editor (spec section 8).
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Same split as M2.5: the editor is React and has no test infrastructure, so
// the arithmetic lives in zoneDraft.js and is tested here. Three things:
//
//   * worldToScreen — the forward transform. M2.5 only had the inverse, and the
//     test file carried a private copy of the forward one to check it against.
//     The property panel now needs the real thing (to know which side of the
//     screen the selected zone is on), so it stops being a test fixture.
//   * panelSide — which edge the property panel docks to. The panel is in
//     screen space, the zone in world space; without the transform the panel
//     dodges the wrong way as soon as the table is panned or zoomed.
//   * moveZone / resizeZone — correcting a zone after the fact. The edge that
//     is not being dragged must not move, and nothing may shrink below the
//     minimum a zone can be drawn at in the first place.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  MIN_ZONE_SIZE, screenToWorld, worldToScreen, panelSide, moveZone, resizeZone, createZone,
} = await import('../../client/src/utils/zoneDraft.js');
const { zoneContains, zoneCenter } = await import('../../shared/zoneGeometry.js');

const RECT = { left: 20, top: 10, width: 800, height: 600 };
const CAMERAS = [
  { x: 0, y: 0, zoom: 1 },
  { x: 140, y: -60, zoom: 1 },
  { x: 0, y: 0, zoom: 2.5 },
  { x: -230, y: 310, zoom: 0.4 },
];

// ── the forward transform ────────────────────────────────────────────────────

test('worldToScreen is the exact inverse of screenToWorld', () => {
  for (const camera of CAMERAS) {
    for (const world of [{ x: 0, y: 0 }, { x: 640, y: 480 }, { x: -120, y: 75 }]) {
      const back = screenToWorld(worldToScreen(world, camera, RECT), camera, RECT);
      assert.ok(Math.abs(back.x - world.x) < 1e-6 && Math.abs(back.y - world.y) < 1e-6,
        `round trip failed for ${JSON.stringify({ camera, world, back })}`);
    }
  }
});

test('worldToScreen without a container rect does not throw', () => {
  const p = worldToScreen({ x: 5, y: 7 }, { x: 0, y: 0, zoom: 1 }, null);
  assert.equal(typeof p.x, 'number');
  assert.equal(typeof p.y, 'number');
});

// ── which side the property panel docks to ───────────────────────────────────

const neutral = { x: 0, y: 0, zoom: 1 };

test('panelSide keeps the panel off the zone being edited', () => {
  // A zone at the left edge of the table – the Townsfolk Tussle boss bar.
  assert.equal(panelSide({ x: 0, y: 100, width: 120, height: 400 }, neutral, RECT), 'right');
  // …and one at the right edge.
  assert.equal(panelSide({ x: 660, y: 100, width: 120, height: 400 }, neutral, RECT), 'left');
});

test('panelSide follows the camera, not the world coordinates', () => {
  const zone = { x: 0, y: 100, width: 120, height: 400 };
  // The camera translates the world: a positive x pushes the same zone over to
  // the right of the screen, where the panel has to get out of the way leftwards.
  const panned = { x: 700, y: 0, zoom: 1 };
  assert.equal(panelSide(zone, neutral, RECT), 'right');
  assert.equal(panelSide(zone, panned, RECT), 'left');
});

test('panelSide picks the roomier side when the zone covers the table', () => {
  // Wider than the container and off to the right: more space is left of it.
  assert.equal(panelSide({ x: 300, y: 0, width: 2000, height: 100 }, neutral, RECT), 'left');
});

test('panelSide survives a missing container rect', () => {
  assert.ok(['left', 'right'].includes(panelSide({ x: 0, y: 0, width: 10, height: 10 }, neutral, null)));
});

// ── moving ───────────────────────────────────────────────────────────────────

test('moveZone shifts the box and nothing else', () => {
  const zone = createZone({ x: 100, y: 200, width: 300, height: 150 }, { id: 'z1' });
  const moved = { ...zone, ...moveZone(zone, -40, 25) };
  assert.equal(moved.x, 60);
  assert.equal(moved.y, 225);
  assert.equal(moved.width, 300);
  assert.equal(moved.height, 150);
});

test('moveZone rounds, so a zone never drifts onto fractional coordinates', () => {
  const zone = createZone({ x: 100, y: 200, width: 300, height: 150 }, { id: 'z1' });
  const moved = moveZone(zone, 0.4, -0.6);
  assert.equal(moved.x, 100);
  assert.equal(moved.y, 199);
});

test('moveZone takes the focus camera along', () => {
  const zone = createZone({ x: 100, y: 200, width: 300, height: 150 }, { id: 'z1' });
  const moved = { ...zone, ...moveZone(zone, 500, 0) };
  const c = zoneCenter(moved);
  assert.equal(moved.cameraX, Math.round(c.x));
  assert.equal(moved.cameraY, Math.round(c.y));
});

// ── resizing ─────────────────────────────────────────────────────────────────

test('resizeZone moves only the dragged corner, the opposite one stays put', () => {
  const zone = createZone({ x: 100, y: 100, width: 200, height: 200 }, { id: 'z1' });

  const se = { ...zone, ...resizeZone(zone, 'se', 50, 30) };
  assert.deepEqual([se.x, se.y, se.width, se.height], [100, 100, 250, 230]);

  const nw = { ...zone, ...resizeZone(zone, 'nw', 50, 30) };
  assert.deepEqual([nw.x, nw.y, nw.width, nw.height], [150, 130, 150, 170]);
  assert.equal(nw.x + nw.width, 300, 'the east edge must not move');
  assert.equal(nw.y + nw.height, 300, 'the south edge must not move');

  const ne = { ...zone, ...resizeZone(zone, 'ne', -20, 40) };
  assert.deepEqual([ne.x, ne.y, ne.width, ne.height], [100, 140, 180, 160]);

  const sw = { ...zone, ...resizeZone(zone, 'sw', -20, 40) };
  assert.deepEqual([sw.x, sw.y, sw.width, sw.height], [80, 100, 220, 240]);
});

test('resizeZone stops at the minimum instead of collapsing or flipping', () => {
  const zone = createZone({ x: 100, y: 100, width: 200, height: 200 }, { id: 'z1' });

  const se = { ...zone, ...resizeZone(zone, 'se', -1000, -1000) };
  assert.deepEqual([se.width, se.height], [MIN_ZONE_SIZE, MIN_ZONE_SIZE]);
  assert.deepEqual([se.x, se.y], [100, 100], 'the anchored corner stays where it was');

  const nw = { ...zone, ...resizeZone(zone, 'nw', 1000, 1000) };
  assert.deepEqual([nw.width, nw.height], [MIN_ZONE_SIZE, MIN_ZONE_SIZE]);
  assert.equal(nw.x + nw.width, 300, 'shrinking from the west pins against the east edge');
  assert.equal(nw.y + nw.height, 300, 'shrinking from the north pins against the south edge');
});

test('resizeZone leaves the zone alone for an unknown handle', () => {
  const zone = createZone({ x: 100, y: 100, width: 200, height: 200 }, { id: 'z1' });
  const same = { ...zone, ...resizeZone(zone, '', 50, 50) };
  assert.deepEqual([same.x, same.y, same.width, same.height], [100, 100, 200, 200]);
});

test('resizeZone takes the focus camera along', () => {
  const zone = createZone({ x: 100, y: 100, width: 200, height: 200 }, { id: 'z1' });
  const bigger = { ...zone, ...resizeZone(zone, 'se', 200, 200) };
  const c = zoneCenter(bigger);
  assert.equal(bigger.cameraX, Math.round(c.x));
  assert.equal(bigger.cameraY, Math.round(c.y));
});

// ── the loop back to zoneGeometry ────────────────────────────────────────────

test('a moved circle is still the ellipse zoneGeometry tests against', () => {
  const zone = createZone({ x: 0, y: 0, width: 200, height: 100 }, { shape: 'circle', id: 'z1' });
  const moved = { ...zone, ...moveZone(zone, 500, 500) };
  assert.ok(zoneContains(moved, 600, 550), 'centre after the move');
  assert.ok(!zoneContains(moved, 505, 505), 'box corner is still outside the ellipse');
});

test('a resized hex stays a hex, not a rectangle that used to be one', () => {
  const zone = createZone({ x: 100, y: 100, width: 200, height: 200 }, { shape: 'hex-pointy', id: 'z1' });
  const wide = { ...zone, ...resizeZone(zone, 'e', 200, 0) };
  assert.equal(wide.width, 400);
  assert.ok(zoneContains(wide, 300, 200), 'centre of the widened hex');
  assert.ok(!zoneContains(wide, 101, 101), 'the box corner the handle sits on is outside the figure');
});
