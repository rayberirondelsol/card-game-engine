/**
 * Where a layer of known size fits in a viewport of known size (spec M2.9).
 *
 * The context menu used to be pinned to the click point and always opened down
 * and to the right, so near the bottom edge its last entries were off screen —
 * the same mistake as M2.8: a layer is placed without measuring whether it fits
 * there. `maxHeight` does not help, it caps the height, not the distance to the
 * edge. Pure here, measuring and applying in GameTable.
 */

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * One axis: open away from the click point as before, flip to the other side
 * only when the flipped position really fits, otherwise keep the click point
 * and push the whole thing into view. Flipping a layer that does not fit on
 * either side would move it away from the click for nothing.
 */
function place(point, size, min, max) {
  const flipped = point - size;
  const keep = point + size <= max || flipped < min;
  return clamp(keep ? point : flipped, min, max - size);
}

/**
 * @param {object} p
 * @param {number} p.x  click point, viewport coordinates (clientX/clientY)
 * @param {number} p.y
 * @param {number} p.width  the menu's natural size, measured unconstrained
 * @param {number} p.height
 * @param {number} p.viewportWidth
 * @param {number} p.viewportHeight
 * @param {number} [p.margin=8]  stays free at every edge
 * @param {{top?:number,right?:number,bottom?:number,left?:number}} [p.insets]
 *   safe-area insets; they belong to the edge, not to the usable area
 * @returns {{left:number, top:number, maxHeight:number|null}}
 *   `maxHeight` is null while the menu fits — only a menu taller than the
 *   usable area gets capped, and then its own `overflow: auto` takes over.
 */
export function menuPlacement({
  x, y, width, height, viewportWidth, viewportHeight, margin = 8, insets = {},
}) {
  const minLeft = margin + (insets.left || 0);
  const minTop = margin + (insets.top || 0);
  const maxRight = viewportWidth - (insets.right || 0) - margin;
  const maxBottom = viewportHeight - (insets.bottom || 0) - margin;

  const left = place(x, width, minLeft, maxRight);
  const top = place(y, height, minTop, maxBottom);

  const usableHeight = Math.max(0, maxBottom - minTop);
  return { left, top, maxHeight: height > usableHeight ? usableHeight : null };
}
