/**
 * Grids – a named, snappable raster over a board (spec section 5, M3b).
 *
 * A setup can hold several. A grid is `origin` + `cell` + `cols`/`rows` plus a
 * labelling scheme, and it may hang on an asset with the same `anchor` a zone
 * uses. The scenario cards of Townsfolk Tussle carry a printed A–S × 1–14
 * raster; a grid over such a card has to sit on the printed fields and stay
 * there when the card is moved or resized, which is the whole reason M3a came
 * first.
 *
 * ANCHORING IS NOT REBUILT HERE. `resolveBox` from anchoring.js takes a
 * relative box and the box it hangs on – a grid is a box too, namely
 * `cols × cell` by `rows × cell` from the origin. Resolving hands back a box,
 * and a box divided by cols and rows gives the cell size. That is why an
 * anchored grid has a `cellW` and a `cellH` rather than one `cell`: a board
 * scaled unevenly has cells that are no longer square, and pretending
 * otherwise would put every figure on the wrong field. `cell` stays as
 * authored – it is what an unanchored grid uses and what the editor edits.
 *
 * SQUARE ONLY. `type` accepts what the spec names, but only `square` is
 * implemented; see GRID_TYPES below.
 */

import { resolveBox, relativeBox } from './anchoring.js';
import { zoneSlots, snapPoint } from './zoneGeometry.js';

/**
 * The grid types this module can actually compute.
 *
 * Hex is not just square with a different outline: neighbourhood, the offset
 * of every other row and the labelling of the axes all follow different rules,
 * and half of that is worse than none – a figure snapped to a hex field that
 * is not the one under the cursor is a bug you only see when it matters. So a
 * grid of any other type answers `null` everywhere instead of quietly handing
 * out square cells, and the editor offers only what is in this list.
 */
export const GRID_TYPES = ['square'];

const num = (v, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const count = (v, fallback) => {
  const n = Math.floor(num(v, fallback));
  return n > 0 ? n : fallback;
};

/** Is this a grid this module can compute at all? */
function usable(grid) {
  return !!grid && GRID_TYPES.includes(String(grid.type || 'square'));
}

/**
 * Origin, extent and cell size, with every default filled in.
 *
 * `cellW`/`cellH` are what a resolution against an anchor left behind; without
 * one they are the authored, square `cell`.
 */
function dims(grid) {
  const cols = count(grid?.cols, 1);
  const rows = count(grid?.rows, 1);
  const cell = num(grid?.cell, 60) || 60;
  return {
    x: num(grid?.origin?.x),
    y: num(grid?.origin?.y),
    cols,
    rows,
    cellW: num(grid?.cellW, cell),
    cellH: num(grid?.cellH, cell),
  };
}

/** The box a grid covers – the box the anchor resolution works on. */
export function gridBox(grid) {
  const d = dims(grid);
  return { x: d.x, y: d.y, width: d.cols * d.cellW, height: d.rows * d.cellH };
}

// ── Anchoring ────────────────────────────────────────────────────────────────

/**
 * Grids with their anchors resolved into absolute geometry – the counterpart
 * of `resolveZones`, and deliberately the same shape: an unanchored grid comes
 * back untouched, an anchor whose asset is missing leaves the grid at its last
 * position and marks it `anchorMissing` rather than moving or dropping it.
 */
export function resolveGrids(grids, anchors = []) {
  if (!Array.isArray(grids)) return [];
  return grids.map(grid => {
    const id = grid?.anchor?.assetId;
    if (!id) return grid;
    const anchor = anchors.find(a => a.id === id);
    if (!anchor) return { ...grid, anchorMissing: true };
    const { anchorMissing: _stale, ...rest } = grid;
    const box = resolveBox(grid.anchor, anchor);
    const cols = count(grid?.cols, 1);
    const rows = count(grid?.rows, 1);
    return {
      ...rest,
      origin: { x: box.x, y: box.y },
      cellW: box.width / cols,
      cellH: box.height / rows,
    };
  });
}

/**
 * Bind a grid to an anchor box, or cut it loose with `null`. Binding keeps the
 * grid exactly where it is – the author lined it up with the printed raster,
 * and that is what "anchor this" means.
 */
export function setGridAnchor(grid, anchor) {
  const { anchor: _old, anchorMissing: _flag, ...rest } = grid;
  if (!anchor) return rest;
  return { ...rest, anchor: { assetId: anchor.id, ...relativeBox(gridBox(grid), anchor) } };
}

// ── Labels ───────────────────────────────────────────────────────────────────

/** 0 → A, 25 → Z, 26 → AA. Bijective base 26, the spreadsheet convention. */
function toAlpha(i) {
  let n = i;
  let s = '';
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** 'AA' → 26, or null for anything that is not letters. */
function fromAlpha(s) {
  if (!/^[A-Z]+$/.test(s)) return null;
  let n = 0;
  for (const ch of s) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

const scheme = (grid, axis) => (grid?.labels?.[axis] === 'alpha' ? 'alpha' : grid?.labels?.[axis] === 'numeric' ? 'numeric' : axis === 'cols' ? 'alpha' : 'numeric');

/**
 * The name of a field, `A1` … `S14`, or null when it is outside the grid.
 *
 * With letters on one axis the two parts cannot run into each other. With
 * numbers on both they can – column 3, row 7 and column 37, row nothing would
 * both read `37` – so that one case gets a separator.
 */
export function cellLabel(grid, col, row) {
  if (!inside(grid, col, row)) return null;
  const cs = colLabel(grid, col);
  const rs = rowLabel(grid, row);
  return scheme(grid, 'cols') === 'numeric' && scheme(grid, 'rows') === 'numeric'
    ? `${cs}-${rs}`
    : cs + rs;
}

/** The name of a column on its own – for the ruler along the edge of a grid. */
export function colLabel(grid, col) {
  return scheme(grid, 'cols') === 'alpha' ? toAlpha(col) : String(col + 1);
}

/** The name of a row on its own. */
export function rowLabel(grid, row) {
  return scheme(grid, 'rows') === 'alpha' ? toAlpha(row) : String(row + 1);
}

/** A field name back to indices, or null if the grid has no such field. */
export function cellFromLabel(grid, label) {
  if (typeof label !== 'string') return null;
  const s = label.trim().toUpperCase();
  if (!s) return null;
  const c = scheme(grid, 'cols');
  const r = scheme(grid, 'rows');

  let cs;
  let rs;
  if (c === 'numeric' && r === 'numeric') {
    const parts = s.split('-');
    if (parts.length !== 2) return null;
    [cs, rs] = parts;
  } else if (c === 'alpha') {
    const m = /^([A-Z]+)(.+)$/.exec(s);
    if (!m) return null;
    [, cs, rs] = m;
  } else {
    const m = /^([0-9]+)(.+)$/.exec(s);
    if (!m) return null;
    [, cs, rs] = m;
  }

  const col = c === 'alpha' ? fromAlpha(cs) : /^[0-9]+$/.test(cs) ? Number(cs) - 1 : null;
  const row = r === 'alpha' ? fromAlpha(rs) : /^[0-9]+$/.test(rs) ? Number(rs) - 1 : null;
  if (col === null || row === null) return null;
  return inside(grid, col, row) ? { col, row } : null;
}

// ── World ↔ cell ─────────────────────────────────────────────────────────────

function inside(grid, col, row) {
  if (!usable(grid)) return false;
  const d = dims(grid);
  return Number.isInteger(col) && Number.isInteger(row)
    && col >= 0 && col < d.cols && row >= 0 && row < d.rows;
}

/** The field under a table point, or null when the point is off the grid. */
export function cellAt(grid, x, y) {
  if (!usable(grid)) return null;
  const d = dims(grid);
  if (d.cellW <= 0 || d.cellH <= 0) return null;
  const col = Math.floor((num(x, NaN) - d.x) / d.cellW);
  const row = Math.floor((num(y, NaN) - d.y) / d.cellH);
  return inside(grid, col, row) ? { col, row } : null;
}

/** The centre of a field, or null when the grid has no such field. */
export function cellCenter(grid, col, row) {
  if (!inside(grid, col, row)) return null;
  const d = dims(grid);
  return { x: d.x + (col + 0.5) * d.cellW, y: d.y + (row + 0.5) * d.cellH };
}

/** The centre of a named field, or null. */
export function cellPoint(grid, label) {
  const c = cellFromLabel(grid, label);
  return c && cellCenter(grid, c.col, c.row);
}

/** The grid under a point, or null. Later grids are drawn on top, so they win. */
export function gridAt(grids, x, y) {
  if (!Array.isArray(grids)) return null;
  for (let i = grids.length - 1; i >= 0; i--) {
    if (cellAt(grids[i], x, y)) return grids[i];
  }
  return null;
}

// ── Snapping ─────────────────────────────────────────────────────────────────

/**
 * Where a drop at (x, y) lands on this grid, and on which field – or null when
 * the point is not on the grid. The field name travels with the object; that
 * is what makes "the figure is on C7" survive a reload rather than "the figure
 * is at 340/380", which stops being C7 the moment the board moves.
 */
export function snapToGrid(grid, x, y) {
  const c = cellAt(grid, x, y);
  if (!c) return null;
  const p = cellCenter(grid, c.col, c.row);
  return { x: p.x, y: p.y, gridId: grid.id, cell: cellLabel(grid, c.col, c.row) };
}

/**
 * Where an object dropped by hand comes to rest, given the zone it fell into
 * and the grids under it.
 *
 * ZONE PLACES BEAT THE GRID. A zone with a capacity and a layout says
 * something more specific than the raster below it: a boss bar has four places
 * because the bar holds four bosses, and it keeps those four even when it is
 * drawn across a board whose fields happen to be 40px wide. The grid is the
 * background rule, the zone's places are the exception drawn on top of it — so
 * the exception wins, and the object is then a member of that zone, not of a
 * field: `cell` stays null, because saying it sits on C7 would be a second,
 * contradicting answer to where it is.
 *
 * A zone without places (no snap, `free`, or no capacity to make places from)
 * says nothing about position, so the grid decides. That is what lets a zone
 * be drawn over a play area purely to restrict what may be dropped there
 * while the figures still snap to the printed fields.
 */
export function snapInto(x, y, { zone = null, grids = [], taken = [] } = {}) {
  if (zone?.snap && zoneSlots(zone)?.length) {
    const p = snapPoint(zone, x, y, taken);
    return { x: p.x, y: p.y, gridId: null, cell: null, snapped: true };
  }
  const grid = gridAt(grids, x, y);
  if (grid) return { ...snapToGrid(grid, x, y), snapped: true };
  // `snapped` is not the same question as "did the point move": the caller has
  // its own fallback (the table's 80px lattice) and must be able to tell
  // "nothing claimed this drop" from "a place happens to be where it fell".
  return { x, y, gridId: null, cell: null, snapped: false };
}

/**
 * Put objects that remember a field back on it – the load-time counterpart of
 * `snapInto`, and the reason the acceptance case works at all.
 *
 * An object whose grid or field is gone keeps its last coordinates and its
 * `cell`, the same call as a missing anchor: it is a correctable mistake, and
 * moving it somewhere plausible instead would hide it.
 */
export function placeOnGrids(objects, grids = []) {
  if (!Array.isArray(objects)) return [];
  return objects.map(o => {
    if (!o?.gridId || !o?.cell) return o;
    const grid = Array.isArray(grids) ? grids.find(g => g?.id === o.gridId) : null;
    const p = grid && cellPoint(grid, o.cell);
    return p ? { ...o, x: p.x, y: p.y } : o;
  });
}

// ── Creating one ─────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-4);
}

/**
 * A fresh grid for the editor. The defaults are a readable starting point, not
 * a guess at the board: the author sets cols, rows and the cell size, and the
 * point of anchoring it is that the numbers, not the pixels, are what he has
 * to get right.
 */
export function createGrid({ grids = [], origin = { x: 0, y: 0 }, ...over } = {}) {
  return {
    id: generateId(),
    label: `Grid ${grids.length + 1}`,
    type: 'square',
    origin: { x: Math.round(num(origin.x)), y: Math.round(num(origin.y)) },
    cell: 60,
    cols: 10,
    rows: 10,
    labels: { cols: 'alpha', rows: 'numeric' },
    showInPlay: false,
    ...over,
  };
}
