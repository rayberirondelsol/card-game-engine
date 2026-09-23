// M2.5 – drawing a zone at all (spec section 8).
//
// Run with: npm test  (node --test, no test framework dependency)
//
// The editor is React and has no test infrastructure, so everything that can
// be decided without a DOM lives in zoneDraft.js and is tested here: the
// screen→world conversion, the rectangle two drag points describe, the minimum
// size, and the zone object that comes out of it. The last test closes the
// loop: a zone built this way must be one zoneGeometry.js already understands,
// otherwise the editor can draw something the table cannot use.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  MIN_ZONE_SIZE, screenToWorld, rectFromPoints, isDrawable, createZone,
} = await import('../../client/src/utils/zoneDraft.js');
const { zoneContains, zoneSlots } = await import('../../shared/zoneGeometry.js');

// The container the table is drawn in. Only left/top/width/height matter.
const RECT = { left: 20, top: 10, width: 800, height: 600 };

/**
 * The forward transform GameTable actually applies to the world wrapper:
 * `scale(zoom) translate(cam.x, cam.y)` around the container centre.
 * screenToWorld has to be its exact inverse – if it is not, a zone lands
 * somewhere other than where it was drawn, which is how this was broken.
 */
function worldToScreen(camera, wx, wy) {
  const cx = RECT.width / 2;
  const cy = RECT.height / 2;
  return {
    x: RECT.left + cx + (wx + camera.x - cx) * camera.zoom,
    y: RECT.top + cy + (wy + camera.y - cy) * camera.zoom,
  };
}

// ── screen → world ───────────────────────────────────────────────────────────

test('screenToWorld: neutral camera is the container offset', () => {
  const p = screenToWorld({ x: 120, y: 110 }, { x: 0, y: 0, zoom: 1 }, RECT);
  assert.deepEqual(p, { x: 100, y: 100 });
});

test('screenToWorld inverts the camera transform for pan and zoom', () => {
  for (const camera of [
    { x: 0, y: 0, zoom: 1 },
    { x: 140, y: -60, zoom: 1 },
    { x: 0, y: 0, zoom: 2.5 },
    { x: -230, y: 310, zoom: 0.4 },
  ]) {
    for (const world of [{ x: 0, y: 0 }, { x: 640, y: 480 }, { x: -120, y: 75 }]) {
      const s = worldToScreen(camera, world.x, world.y);
      const back = screenToWorld(s, camera, RECT);
      assert.ok(Math.abs(back.x - world.x) < 1e-6 && Math.abs(back.y - world.y) < 1e-6,
        `round trip failed for ${JSON.stringify({ camera, world, back })}`);
    }
  }
});

test('screenToWorld without a container rect does not throw', () => {
  const p = screenToWorld({ x: 5, y: 7 }, { x: 0, y: 0, zoom: 1 }, null);
  assert.equal(typeof p.x, 'number');
  assert.equal(typeof p.y, 'number');
});

// ── the dragged rectangle ────────────────────────────────────────────────────

test('rectFromPoints normalises whatever direction the drag went', () => {
  const expected = { x: 10, y: 20, width: 90, height: 80 };
  assert.deepEqual(rectFromPoints({ x: 10, y: 20 }, { x: 100, y: 100 }), expected);
  assert.deepEqual(rectFromPoints({ x: 100, y: 100 }, { x: 10, y: 20 }), expected);
  assert.deepEqual(rectFromPoints({ x: 100, y: 20 }, { x: 10, y: 100 }), expected);
  assert.deepEqual(rectFromPoints({ x: 10, y: 100 }, { x: 100, y: 20 }), expected);
});

test('isDrawable rejects a stray click and anything below the minimum', () => {
  assert.equal(isDrawable(rectFromPoints({ x: 0, y: 0 }, { x: 0, y: 0 })), false);
  assert.equal(isDrawable({ x: 0, y: 0, width: MIN_ZONE_SIZE - 1, height: 500 }), false);
  assert.equal(isDrawable({ x: 0, y: 0, width: 500, height: MIN_ZONE_SIZE - 1 }), false);
  assert.equal(isDrawable({ x: 0, y: 0, width: MIN_ZONE_SIZE, height: MIN_ZONE_SIZE }), true);
  assert.equal(isDrawable(null), false);
});

// ── the zone that comes out ──────────────────────────────────────────────────

test('createZone keeps the chosen shape and rounds the geometry', () => {
  const zone = createZone({ x: 10.4, y: 20.6, width: 300.5, height: 199.4 }, { shape: 'circle', id: 'z1' });
  assert.equal(zone.id, 'z1');
  assert.equal(zone.shape, 'circle');
  assert.deepEqual(
    { x: zone.x, y: zone.y, width: zone.width, height: zone.height },
    { x: 10, y: 21, width: 301, height: 199 },
  );
});

test('createZone defaults to a shared zone, so "no player zones" needs no detour', () => {
  const zone = createZone({ x: 0, y: 0, width: 200, height: 200 }, { id: 'z1' });
  assert.equal(zone.type, 'shared');
  assert.equal(zone.shape, 'rect');
  assert.equal(zone.capacity, null);
  assert.equal(zone.snap, false);
  assert.ok(zone.label, 'a zone without a label is unaddressable in the sequence');
});

test('createZone numbers labels past the zones already there', () => {
  const zones = [{ id: 'a', label: 'Zone 1' }, { id: 'b', label: 'Player 1' }];
  const zone = createZone({ x: 0, y: 0, width: 200, height: 200 }, { zones, id: 'z1' });
  assert.equal(zone.label, 'Zone 3');
  assert.ok(!zones.some(z => z.id === zone.id));
});

test('createZone gives every zone its own id without one being passed in', () => {
  const rect = { x: 0, y: 0, width: 200, height: 200 };
  const ids = new Set(Array.from({ length: 50 }, () => createZone(rect, {}).id));
  assert.equal(ids.size, 50);
});

// ── the loop back to zoneGeometry ────────────────────────────────────────────

test('a drawn hex zone is a hex to zoneGeometry, not just to the editor', () => {
  const rect = rectFromPoints({ x: 400, y: 300 }, { x: 200, y: 100 });
  const zone = createZone(rect, { shape: 'hex-pointy', id: 'z1' });
  assert.ok(zoneContains(zone, 300, 200), 'centre of the hex');
  assert.ok(!zoneContains(zone, 201, 101), 'top-left box corner is outside a hex');
  assert.ok(zoneContains(zone, 201, 200), 'the waist reaches the full width');
});

test('a drawn circle zone is an ellipse to zoneGeometry', () => {
  const zone = createZone({ x: 0, y: 0, width: 200, height: 100 }, { shape: 'circle', id: 'z1' });
  assert.ok(zoneContains(zone, 100, 50), 'centre');
  assert.ok(zoneContains(zone, 190, 50), 'on the long axis');
  assert.ok(!zoneContains(zone, 5, 5), 'box corner is outside the ellipse');
});

test('a drawn zone configured for places yields exactly that many', () => {
  const zone = { ...createZone({ x: 0, y: 0, width: 400, height: 100 }, { shape: 'rect', id: 'z1' }), layout: 'row', capacity: 4 };
  const slots = zoneSlots(zone);
  assert.equal(slots.length, 4);
  for (const s of slots) assert.ok(zoneContains(zone, s.x, s.y));
});
