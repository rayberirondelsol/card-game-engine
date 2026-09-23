/**
 * Zone geometry – shape, accepts, capacity, layout and snap (spec section 4).
 *
 * Pure functions, no React, no DOM: the setup sequence and the drag-and-drop
 * handler must agree on "is this object in that zone" down to the pixel, so
 * both ask the same function instead of each carrying its own rectangle test.
 *
 * A zone keeps its old geometry fields – `x`, `y`, `width`, `height` are the
 * bounding box, top-left anchored – for every shape. A circle is the inscribed
 * ellipse, a hexagon the inscribed hexagon. That way a zone drawn before M2
 * needs no migration and the editor keeps drawing one rectangle.
 *
 * Every new field is optional and every default reproduces the old behaviour:
 *   shape    absent → rect
 *   accepts  absent or empty → takes everything
 *   capacity absent → unlimited
 *   layout   absent → no fixed slots, spread along the longer axis (as before)
 *   snap     absent → a dropped object keeps its drop point
 */

const num = (v, fallback) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/** Bounding box of a zone, with the defaults the executor has always used. */
function box(zone) {
  const w = num(zone?.width, 100);
  const h = num(zone?.height, 140);
  return { x: num(zone?.x, 0), y: num(zone?.y, 0), w, h, cx: num(zone?.x, 0) + w / 2, cy: num(zone?.y, 0) + h / 2 };
}

/** Centre of a zone – where objects go when nothing finer is configured. */
export function zoneCenter(zone) {
  const b = box(zone);
  return { x: b.cx, y: b.cy };
}

/**
 * Is (x, y) inside the zone's shape? Real point-in-shape, not the bounding box:
 * for a circle or a hexagon the box corners stick out well beyond the figure,
 * and a token "in" a hex board space that visibly is not would be worse than no
 * shapes at all.
 *
 * Both tests run on the box-normalised offset u, v ∈ [0, 1] from the centre, so
 * a squashed circle is an ellipse and a squashed hexagon stays a hexagon.
 */
export function zoneContains(zone, x, y) {
  const b = box(zone);
  if (b.w <= 0 || b.h <= 0) return false;
  const u = Math.abs(x - b.cx) / (b.w / 2);
  const v = Math.abs(y - b.cy) / (b.h / 2);

  switch (String(zone?.shape || 'rect')) {
    case 'circle':
      return u * u + v * v <= 1;
    // Pointy-top: vertices top and bottom, full width at the waist.
    case 'hex':
    case 'hex-pointy':
      return u <= 1 && v <= 1 - u / 2;
    // Flat-top: the same hexagon turned by 90°, so u and v swap roles.
    case 'hex-flat':
      return v <= 1 && u <= 1 - v / 2;
    default:
      return u <= 1 && v <= 1;
  }
}

/** The zone under a point, or null. Later zones are drawn on top, so they win. */
export function zoneAt(zones, x, y) {
  if (!Array.isArray(zones)) return null;
  for (let i = zones.length - 1; i >= 0; i--) {
    if (zoneContains(zones[i], x, y)) return zones[i];
  }
  return null;
}

/** `card` | `asset` | `die`. No list (or an empty one) is no restriction. */
export function zoneAccepts(zone, kind) {
  const list = zone?.accepts;
  if (!Array.isArray(list) || list.length === 0) return true;
  return list.includes(kind);
}

/** Fixed number of places, or null for unlimited. */
export function zoneCapacity(zone) {
  const c = zone?.capacity;
  return typeof c === 'number' && Number.isFinite(c) && c > 0 ? Math.floor(c) : null;
}

/**
 * Why this zone refuses one more object of `kind`, or null if it does not.
 * One sentence, because it ends up verbatim in the step protocol and in the
 * hint the player sees after a rejected drag.
 */
export function zoneRejects(zone, kind, occupied = 0) {
  const name = zone?.label ? `"${zone.label}"` : 'zone';
  if (!zoneAccepts(zone, kind)) return `zone ${name} does not accept ${kind}s`;
  const cap = zoneCapacity(zone);
  if (cap !== null && occupied >= cap) return `zone ${name} is full (${cap})`;
  return null;
}

/**
 * How many of `objects` (anything with x/y) currently sit in the zone.
 *
 * The object a zone is anchored to is not one of them: a zone printed on the
 * board is not a place where the board lies. Counting it would make a boss bar
 * with four places hold three as soon as the board's centre happens to fall
 * inside it – and the step protocol would blame a full zone.
 */
export function countInZone(zone, ...lists) {
  return objectsInZone(zone, ...lists).length;
}

/** The objects themselves, same rule – for steps that need one, not a number. */
export function objectsInZone(zone, ...lists) {
  const anchorId = zone?.anchor?.assetId || null;
  const found = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const o of list) {
      if (anchorId && (o?.assetId || o?.id) === anchorId) continue;
      if (zoneContains(zone, o?.x, o?.y)) found.push(o);
    }
  }
  return found;
}

// ── Slots ────────────────────────────────────────────────────────────────────

/** Position of the i-th of n places for a given arrangement. */
function spread(zone, layout, i, n) {
  const b = box(zone);
  const frac = (i + 0.5) / Math.max(1, n);
  if (layout === 'row') return { x: b.x + b.w * frac, y: b.cy };
  return { x: b.cx, y: b.y + b.h * frac }; // column
}

/** Pull a point towards the centre until it is inside the shape (grid corners). */
function intoShape(zone, p) {
  if (zoneContains(zone, p.x, p.y)) return p;
  const c = zoneCenter(zone);
  let t = 0.5;
  for (let k = 0; k < 8; k++) {
    const q = { x: c.x + (p.x - c.x) * t, y: c.y + (p.y - c.y) * t };
    if (zoneContains(zone, q.x, q.y)) return q;
    t /= 2;
  }
  return c;
}

/**
 * The fixed places of a zone, or null when it has none.
 *
 * `capacity` is what turns a layout into places: four boss slots are four slots
 * because the bar holds four, not because of how wide it is. So `row`, `column`
 * and `grid` need a capacity; without one they only say how loose contents line
 * up and nothing snaps. `grid` without capacity in particular has no cell count
 * to derive a cell size from – guessing one from the object size would be a
 * rule the zone cannot know. `stack` is the exception: one place, the centre,
 * capacity or not. `free` never snaps, by definition.
 */
export function zoneSlots(zone) {
  const layout = zone?.layout;
  if (layout === 'stack') return [zoneCenter(zone)];
  if (layout === 'free' || !layout) return null;

  const cap = zoneCapacity(zone);
  if (cap === null) return null;

  if (layout === 'row' || layout === 'column') {
    return Array.from({ length: cap }, (_, i) => spread(zone, layout, i, cap));
  }

  if (layout === 'grid') {
    const b = box(zone);
    // Columns follow the zone's own proportions, so a wide zone gets a wide grid.
    const cols = Math.min(cap, Math.max(1, Math.round(Math.sqrt((cap * b.w) / Math.max(1, b.h)))));
    const rows = Math.ceil(cap / cols);
    return Array.from({ length: cap }, (_, i) => intoShape(zone, {
      x: b.x + (b.w * ((i % cols) + 0.5)) / cols,
      y: b.y + (b.h * (Math.floor(i / cols) + 0.5)) / rows,
    }));
  }

  return null; // unknown layout: treated like none
}

/**
 * Where the i-th of n objects a setup step puts into this zone belongs.
 * With fixed places it is place i; without, it is the old spread along the
 * longer axis, unchanged – that is what keeps zones saved before M2 identical.
 */
export function zoneSlotFor(zone, i = 0, n = 1) {
  const slots = zoneSlots(zone);
  if (slots && slots.length) return slots[Math.min(Math.max(0, i), slots.length - 1)];
  const b = box(zone);
  return spread(zone, b.h >= b.w ? 'column' : 'row', i, n);
}

/**
 * Where an object dropped by hand at (x, y) comes to rest: the nearest free
 * place if the zone snaps, otherwise the drop point itself.
 * `taken` are the points already occupied (a stack has one place and ignores
 * them – that is the point of stacking).
 */
export function snapPoint(zone, x, y, taken = []) {
  if (!zone?.snap) return { x, y };
  const slots = zoneSlots(zone);
  if (!slots || !slots.length) return { x, y };

  const isTaken = (s) => taken.some(t => Math.abs(t.x - s.x) < 0.5 && Math.abs(t.y - s.y) < 0.5);
  const free = slots.filter(s => !isTaken(s));
  const pool = free.length ? free : slots;
  const dist = (s) => (s.x - x) ** 2 + (s.y - y) ** 2;
  return pool.reduce((best, s) => (dist(s) < dist(best) ? s : best), pool[0]);
}
