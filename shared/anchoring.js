/**
 * Anchoring – a box given relative to another object's box (spec section 4,
 * "Zonen am Brett verankern", milestone M3a).
 *
 * A zone that maps a printed area of the board – the boss bar in Townsfolk
 * Tussle – is not at table coordinates, it is at "a quarter in from the left
 * edge of that board". Moving or re-importing the board leaves an absolute
 * zone behind, and a zone that quietly stopped covering what it names is only
 * noticed mid-game.
 *
 * Nothing here knows about zones: `resolveBox` takes a relative box and the
 * box it hangs on. M3b needs exactly that for grids, which is why it is one
 * general function and not a zone method.
 *
 * WHERE THIS IS CALLED. Zones are stored with both: `anchor` (the truth) and
 * `x/y/width/height` (the last resolved position, and the fallback). They are
 * resolved at the two points where the table is known:
 *
 *   * GameTable, once per render, against the boards and tokens on the table.
 *     Everything downstream – the overlay, the editor, the drop test – gets
 *     the resolved zones and keeps working on plain absolute coordinates.
 *   * sequenceExecutor, before each step, against the state it is building.
 *     A setup that lays the board out itself ("Hauptbrett auslegen") must have
 *     that board as an anchor for the next step; resolving once up front would
 *     use the position from before the sequence ran.
 *
 * Both call this function with "whatever is on the table right now", so they
 * cannot disagree – the input differs only because the moments differ.
 */

const num = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

/**
 * The bounding box of a placed object, or null if it cannot be an anchor.
 *
 * Boards and tokens are centre-anchored on the table while zones are top-left
 * anchored; this is the one place that difference is converted. A board keeps
 * its own width/height, a token is a square of `size` – that is all a token
 * has.
 *
 * `id` is the table_assets id: tokens carry it in `assetId` (set by the asset
 * steps), imported boards use it as their own id. A token drawn by hand has
 * neither – only a uuid that is new on every table – so it cannot be named by
 * a saved anchor and is not offered as one. Boards are told apart by having a
 * width and a height; a hand-drawn token has neither.
 */
export function assetBox(obj) {
  if (typeof obj?.x !== 'number' || typeof obj?.y !== 'number') return null;
  const sized = Number.isFinite(obj.width) && Number.isFinite(obj.height);
  const id = obj.assetId || (sized ? obj.id : null);
  if (!id) return null;
  const width = num(obj.width, num(obj.size, 60));
  const height = num(obj.height, num(obj.size, 60));
  return {
    id,
    label: obj.name || obj.label || '',
    x: obj.x - width / 2,
    y: obj.y - height / 2,
    width,
    height,
  };
}

/** The anchor boxes of everything on the table, in the order given. */
export function anchorBoxes(...lists) {
  const out = [];
  for (const list of lists) {
    if (!Array.isArray(list)) continue;
    for (const obj of list) {
      const box = assetBox(obj);
      if (box) out.push(box);
    }
  }
  return out;
}

/** Relative box on an anchor box → absolute box. The M3b-shared function. */
export function resolveBox(rel, anchor) {
  return {
    x: anchor.x + num(rel?.relX) * anchor.width,
    y: anchor.y + num(rel?.relY) * anchor.height,
    width: num(rel?.relWidth, 1) * anchor.width,
    height: num(rel?.relHeight, 1) * anchor.height,
  };
}

/**
 * Absolute box on an anchor box → relative box. The inverse of `resolveBox`,
 * used when an anchor is set and whenever an anchored box is corrected by
 * hand: the correction is what the author sees, so it becomes the new truth.
 *
 * A zero-sized anchor has no proportions to express anything in; it yields
 * zeros rather than NaN, which would otherwise spread into every coordinate.
 */
export function relativeBox(abs, anchor) {
  const w = anchor?.width || 0;
  const h = anchor?.height || 0;
  return {
    relX: w ? (num(abs?.x) - anchor.x) / w : 0,
    relY: h ? (num(abs?.y) - anchor.y) / h : 0,
    relWidth: w ? num(abs?.width) / w : 0,
    relHeight: h ? num(abs?.height) / h : 0,
  };
}

/**
 * Zones with their anchors resolved into absolute geometry.
 *
 * A zone without an anchor is returned as it is – identical object, no added
 * fields – so everything saved before M3a behaves exactly as before.
 *
 * An anchor whose asset is not on the table (deleted, or a setup loaded
 * without it) leaves the zone at its last resolved position and marks it
 * `anchorMissing`. Dropping the zone would hide a mistake that is easy to
 * correct, and moving it to some default would be a second, invisible error.
 */
export function resolveZones(zones, anchors = []) {
  if (!Array.isArray(zones)) return [];
  return zones.map(zone => {
    const id = zone?.anchor?.assetId;
    if (!id) return zone;
    const anchor = anchors.find(a => a.id === id);
    if (!anchor) return { ...zone, anchorMissing: true };
    // The flag is dropped rather than set to false: it is a finding of this
    // resolution, not a property of the zone, and must not end up in the saved
    // setup as a stale `true`.
    const { anchorMissing: _stale, ...rest } = zone;
    return { ...rest, ...resolveBox(zone.anchor, anchor) };
  });
}

/**
 * Bind a zone to an anchor box, or cut it loose with `null`.
 *
 * Binding keeps the zone exactly where it is and expresses that position in
 * the anchor's proportions – the author drew it over the right part of the
 * board, so that is what "anchor this" means. Cutting it loose keeps the last
 * resolved position too, so nothing jumps either way.
 */
export function setAnchor(zone, anchor) {
  const { anchor: _old, anchorMissing: _flag, ...rest } = zone;
  if (!anchor) return rest;
  return { ...rest, anchor: { assetId: anchor.id, ...relativeBox(zone, anchor) } };
}
