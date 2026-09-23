/**
 * Drawing a zone – everything about it that is not React (spec section 8, M2.5).
 *
 * The editor used to keep this inline, where nothing could reach it: the
 * conversion was wrong (it assumed a top-left transform origin, the table uses
 * the container centre) and nobody noticed, because the handlers it lived in
 * were never bound to an element. Pure functions here, DOM there.
 */

import { zoneCenter } from '../../../shared/zoneGeometry.js';

/** Below this, a drag is a slip of the hand, not a zone. World units. */
export const MIN_ZONE_SIZE = 40;

/**
 * Screen point → world point, the exact inverse of the transform GameTable puts
 * on the world wrapper: `scale(zoom) translate(cam.x, cam.y)` about the
 * container's centre. Get this wrong and the zone lands somewhere other than
 * where it was drawn — silently, because both are plausible-looking rectangles.
 *
 * `rect` is the container's bounding box; without one the point passes through,
 * which only happens before the table is mounted.
 */
export function screenToWorld(point, camera, rect) {
  const zoom = camera?.zoom || 1;
  const camX = camera?.x || 0;
  const camY = camera?.y || 0;
  if (!rect) return { x: point.x, y: point.y };
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  return {
    x: (point.x - rect.left - cx) / zoom - camX + cx,
    y: (point.y - rect.top - cy) / zoom - camY + cy,
  };
}

/**
 * World point → screen point, the forward transform. Needed because the
 * property panel lives in screen space while the zone it edits lives in world
 * space: to dodge the zone, the panel has to know where it currently appears,
 * which depends on pan and zoom.
 */
export function worldToScreen(point, camera, rect) {
  const zoom = camera?.zoom || 1;
  const camX = camera?.x || 0;
  const camY = camera?.y || 0;
  if (!rect) return { x: point.x, y: point.y };
  const cx = rect.width / 2;
  const cy = rect.height / 2;
  return {
    x: rect.left + cx + (point.x + camX - cx) * zoom,
    y: rect.top + cy + (point.y + camY - cy) * zoom,
  };
}

/**
 * Which edge the property panel docks to: the side of the selected zone with
 * more room, so the panel never sits on the zone being edited. A zone at the
 * left edge of the table — the boss bar in Townsfolk Tussle — pushes the panel
 * right, which is what makes drawing and correcting there possible at all.
 *
 * Ties go right, so the panel has one resting place instead of flickering.
 */
export function panelSide(zone, camera, rect) {
  if (!rect) return 'right';
  const a = worldToScreen({ x: zone.x, y: zone.y }, camera, rect);
  const b = worldToScreen({ x: zone.x + zone.width, y: zone.y }, camera, rect);
  const leftGap = a.x - rect.left;
  const rightGap = rect.left + rect.width - b.x;
  return rightGap >= leftGap ? 'right' : 'left';
}

/** The rectangle two drag points span, whichever corner the drag started in. */
export function rectFromPoints(a, b) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

/** Is this drag big enough to mean a zone? */
export function isDrawable(rect) {
  return !!rect && rect.width >= MIN_ZONE_SIZE && rect.height >= MIN_ZONE_SIZE;
}

function generateId() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-4);
}

/**
 * A zone object from a drawn rectangle.
 *
 * Defaults are the neutral ones from zoneGeometry: any shape the caller picked,
 * accepts everything, unlimited, no layout, no snapping. Type is `shared` — a
 * plain drop zone. A player zone is a deliberate choice made in the properties
 * panel, not what you get for drawing a rectangle; "no player zones, only
 * places to put things" has to be the ordinary path, not the exception.
 */
export function createZone(rect, { shape = 'rect', zones = [], id = null } = {}) {
  const x = Math.round(rect.x);
  const y = Math.round(rect.y);
  const zone = {
    id: id || generateId(),
    type: 'shared',
    shape,
    color: null,
    label: `Zone ${zones.length + 1}`,
    x,
    y,
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    accepts: [],
    capacity: null,
    layout: null,
    snap: false,
    exclusive: false,
    startingHandCardIds: [],
    dealStackId: null,
    dealCount: 0,
  };
  const c = zoneCenter(zone);
  // Where the camera jumps when this zone is focused; the centre, not the corner.
  zone.cameraX = Math.round(c.x);
  zone.cameraY = Math.round(c.y);
  zone.cameraZoom = 1.0;
  return zone;
}

// ── correcting a zone after it exists ────────────────────────────────────────

/**
 * The geometry patch for a zone, with the focus camera kept on its centre.
 * Moving a zone and leaving `cameraX`/`cameraY` behind would point "focus this
 * zone" at empty table — a stale value that nothing complains about.
 */
function geometry(x, y, width, height) {
  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
    cameraX: Math.round(x + width / 2),
    cameraY: Math.round(y + height / 2),
  };
}

/** Drag a zone by a world-space delta. */
export function moveZone(zone, dx, dy) {
  return geometry(zone.x + dx, zone.y + dy, zone.width, zone.height);
}

/**
 * Drag one handle of a zone's bounding box by a world-space delta.
 * `handle` names the edges it owns: 'n', 's', 'e', 'w' and the four corners
 * ('nw', 'ne', 'sw', 'se'). The edges it does not own stay exactly where they
 * were — a bar that is one pixel too far right is corrected by pulling its west
 * edge, and that must not drag the east edge along.
 *
 * At MIN_ZONE_SIZE the drag pins instead of flipping: a zone turning inside out
 * mid-drag is disorienting, and the result would be a zone too small to have
 * been drawn in the first place.
 */
export function resizeZone(zone, handle, dx, dy) {
  const h = String(handle || '');
  const right = zone.x + zone.width;
  const bottom = zone.y + zone.height;
  let { x, y, width, height } = zone;

  if (h.includes('w')) {
    x = Math.min(zone.x + dx, right - MIN_ZONE_SIZE);
    width = right - x;
  } else if (h.includes('e')) {
    width = Math.max(MIN_ZONE_SIZE, zone.width + dx);
  }

  if (h.includes('n')) {
    y = Math.min(zone.y + dy, bottom - MIN_ZONE_SIZE);
    height = bottom - y;
  } else if (h.includes('s')) {
    height = Math.max(MIN_ZONE_SIZE, zone.height + dy);
  }

  return geometry(x, y, width, height);
}

/** The handles a selected zone offers, in the order they are drawn. */
export const RESIZE_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Where a handle sits on the bounding box, as a fraction of width/height. */
export function handleAnchor(handle) {
  const h = String(handle || '');
  return {
    fx: h.includes('w') ? 0 : h.includes('e') ? 1 : 0.5,
    fy: h.includes('n') ? 0 : h.includes('s') ? 1 : 0.5,
  };
}
