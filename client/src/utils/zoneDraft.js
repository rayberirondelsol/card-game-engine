/**
 * Drawing a zone – everything about it that is not React (spec section 8, M2.5).
 *
 * The editor used to keep this inline, where nothing could reach it: the
 * conversion was wrong (it assumed a top-left transform origin, the table uses
 * the container centre) and nobody noticed, because the handlers it lived in
 * were never bound to an element. Pure functions here, DOM there.
 */

import { zoneCenter } from './zoneGeometry.js';

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
