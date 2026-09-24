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

/**
 * An address as a *region* of fields – `E3:G4`, the spreadsheet spelling
 * (M7.1). A piece of terrain covers several fields, and a piece with an even
 * edge length has its centre on a field border: there is no single field that
 * places the haystack over E3–G4 correctly.
 *
 * `{ col, row, cols, rows, ranged }` from the top left corner, or null when
 * either end is not a field of this grid. The corners normalise, so `G4:E3` is
 * the same region as `E3:G4`. `ranged` remembers whether a colon was written:
 * a lone field stays a lone field in every respect that follows – same centre,
 * and its size still comes from its asset.
 *
 * A field name without a colon is the 1×1 case of this one calculation, not a
 * second one beside it. The colon is free: two numeric axes separate with `-`.
 *
 * `size` ist freiwillig und die Antwort auf M7.3: wer sie mitgibt, bekommt die
 * Flaeche, die ein Stueck dieser Groesse an dieser Adresse belegt. Ein
 * *Einzelfeld* heisst dann die **Mitte** des Stuecks – `K11` bei einer Figur
 * von zwei mal zwei Feldern deckt die vier Felder um den Rasterpunkt bei K11.
 * Ein *Bereichsname* schlaegt die Rechnung, wie ueberall (M7.1): was
 * ausdruecklich dasteht, ist die genauere Aussage.
 *
 * Ohne `size` ist das Verhalten Zeichen fuer Zeichen das bisherige. Die drei
 * pruefenden Aufrufer (`validateStep`, `validateScenarioData`, `placeOnGrids`)
 * geben keine mit und sollen keine mitgeben: die ersten beiden pruefen den
 * *getippten* Namen, und in `placeOnGrids` versetzte die Rechnung jedes
 * vorhandene uebergrosse Stueck beim naechsten Laden (M7.2-Befund 4).
 */
export function cellRange(grid, label, size = null) {
  if (typeof label !== 'string') return null;
  const ends = label.split(':');
  if (ends.length > 2) return null;
  const a = cellFromLabel(grid, ends[0]);
  const b = ends.length === 2 ? cellFromLabel(grid, ends[1]) : a;
  if (!a || !b) return null;
  const written = {
    col: Math.min(a.col, b.col),
    row: Math.min(a.row, b.row),
    cols: Math.abs(a.col - b.col) + 1,
    rows: Math.abs(a.row - b.row) + 1,
    ranged: ends.length === 2,
  };
  if (written.ranged) return written;

  const foot = footprint(grid, size);
  if (!foot || (foot.cols === 1 && foot.rows === 1)) return written;
  // Dieselbe Lesart wie beim Ziehen von Hand: `rangeAt` zentriert die Flaeche
  // um den Punkt, statt sie mit der Ecke anzulegen – und antwortet `null`,
  // wenn sie ueber den Rand liefe. Das ist kein Ziel, und der Aufrufer macht
  // daraus den Protokolleintrag (M7.3, Abnahme 5).
  const p = cellCenter(grid, written.col, written.row);
  const r = rangeAt(grid, p.x, p.y, foot.cols, foot.rows);
  return r && { ...r, ranged: true };
}

/** A region back to its name – `E3:G4`, or `C7` when it is a lone field. */
export function rangeLabel(grid, r) {
  if (!r) return null;
  const from = cellLabel(grid, r.col, r.row);
  if (!r.ranged) return from;
  const to = cellLabel(grid, r.col + r.cols - 1, r.row + r.rows - 1);
  return from && to ? `${from}:${to}` : null;
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

/** The box a region covers, or null when the grid cannot be computed. */
export function rangeBox(grid, r) {
  if (!r || !usable(grid)) return null;
  const d = dims(grid);
  return { x: d.x + r.col * d.cellW, y: d.y + r.row * d.cellH, width: r.cols * d.cellW, height: r.rows * d.cellH };
}

const boxCenter = b => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 });

/**
 * Die Mitte eines Bereichs, oder null – das, worauf ein Stueck zentriert wird.
 *
 * Steht neben `cellPoint`, weil der Executor die Mitte der **abgeleiteten**
 * Flaeche braucht (M7.3) und `cellPoint` die des *geschriebenen* Feldes gibt.
 * Eine zweite Mittelpunktrechnung waere eine zweite Antwort.
 */
export function rangeCenter(grid, r) {
  const b = rangeBox(grid, r);
  return b && boxCenter(b);
}

/**
 * The centre of a named field *or region*, or null. For a lone field this is
 * `cellCenter` to the digit; for `E3:G4` it is the middle of the six fields,
 * which is what puts the piece on its fields instead of half a field beside
 * them.
 */
export function cellPoint(grid, label) {
  return rangeCenter(grid, cellRange(grid, label));
}

/**
 * The region of `cols × rows` fields that sits under a point – used when an
 * object is dragged by hand and has to keep its edge length (M7.1). Null when
 * it would run over the rim: that is not a target.
 *
 * With 1×1 this is `cellAt` to the field, which is why dragging an ordinary
 * figure is unchanged. It is a different question all the same – `cellAt` asks
 * which field *contains* the point, this one which equally sized region is
 * *centred* nearest to it – so both stay.
 */
function rangeAt(grid, x, y, cols = 1, rows = 1) {
  if (!usable(grid)) return null;
  const d = dims(grid);
  if (d.cellW <= 0 || d.cellH <= 0) return null;
  const col = Math.round((num(x, NaN) - d.x) / d.cellW - cols / 2);
  const row = Math.round((num(y, NaN) - d.y) / d.cellH - rows / 2);
  if (!Number.isInteger(col) || !Number.isInteger(row)) return null;
  if (col < 0 || row < 0 || col + cols > d.cols || row + rows > d.rows) return null;
  return { col, row, cols, rows };
}

/**
 * Wie viele Felder ein Stueck dieser Groesse bedeckt (M7.2) – oder `null`,
 * wenn keine brauchbare Groesse dasteht.
 *
 * Ein Feldname sagt nur, *wo* ein Stueck liegt, nicht wie gross es ist; vor
 * M7.2 galt ohne Bereichsnamen stillschweigend 1x1, und eine Figur, die
 * optisch ueber vier Felder ragte, hing an einem. Die Groesse sagt es aber
 * bereits: die Boesewichte stehen auf 100x100, weil sie 2x2 belegen.
 *
 * `round`, nicht `ceil` oder `floor`: die Groesse ist eine *verrauschte Angabe
 * einer gemeinten Feldzahl*, kein Huellrechteck. Ein importiertes Plaettchen,
 * das zwei Felder breit sein soll, misst 101 statt 100 – `ceil` machte drei
 * daraus, `floor` bei 99 eines.
 */
function footprint(grid, size) {
  const d = dims(grid);
  const w = num(size?.width, 0);
  const h = num(size?.height, 0);
  if (w <= 0 || h <= 0 || d.cellW <= 0 || d.cellH <= 0) return null;
  return { cols: Math.max(1, Math.round(w / d.cellW)), rows: Math.max(1, Math.round(h / d.cellH)) };
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
export function snapToGrid(grid, x, y, cell = null, size = null) {
  // What the object currently says it covers. A piece on `E3:G4` keeps its
  // three by two fields when it is moved; without this it would be written
  // back as a lone field and jump half a field on the next load (M7.1).
  const held = cell ? cellRange(grid, cell) : null;
  // Sonst folgt die Grundflaeche der Groesse des Stuecks (M7.2) – aber nur,
  // wenn der Aufrufer eine mitgibt. Ein *Bereichsname* schlaegt die Rechnung:
  // was `build_scenario` ausdruecklich setzt, ist die genauere Aussage. Ein
  // *Einzelfeld* schlaegt sie nicht, sonst bekaeme ein Boesewicht, der einmal
  // auf einem Feld stand, seine vier Felder nie.
  const foot = (held?.ranged ? held : footprint(grid, size)) || held;
  const r = rangeAt(grid, x, y, foot?.cols, foot?.rows);
  if (!r) return null;
  const ranged = !!held?.ranged || r.cols > 1 || r.rows > 1;
  const box = rangeBox(grid, r);
  const p = boxCenter(box);
  const hit = { x: p.x, y: p.y, gridId: grid.id, cell: rangeLabel(grid, { ...r, ranged }) };
  // Die Masse eines Bereichs kommen mit – dieselbe Rechnung wie in
  // `placeOnGrids`, damit Ziehen und Laden nicht zwei Antworten geben. Auf
  // demselben Raster ist das die Kantenlaenge, die das Stueck ohnehin hatte;
  // ueber einem Raster mit anderer Feldgroesse ist es die des neuen Bereichs,
  // und ohne sie saehe der Tisch bis zum naechsten Laden etwas anderes als der
  // Raum (M7.1). Ein Einzelfeld behaelt die Groesse seines Assets.
  if (ranged) { hit.width = box.width; hit.height = box.height; }
  return hit;
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
export function snapInto(x, y, { zone = null, grids = [], taken = [], cell = null, size = null } = {}) {
  if (zone?.snap && zoneSlots(zone)?.length) {
    const p = snapPoint(zone, x, y, taken);
    return { x: p.x, y: p.y, gridId: null, cell: null, snapped: true };
  }
  const grid = gridAt(grids, x, y);
  // `cell` is the address the dragged object holds now – a region keeps its
  // size, and a region that would run over the rim is no target at all.
  // `size` ist freiwillig: wer sie mitgibt, bekommt die Grundflaeche aus ihr
  // gerechnet (M7.2), wer nicht, das Verhalten von vorher. Die beiden
  // Karten-Aufrufer geben keine – eine Karte auf Feldmasse zu ziehen, verloere
  // ihr Seitenverhaeltnis (M2.12), und `card_move` schickt keine Masse mit.
  const hit = grid && snapToGrid(grid, x, y, cell, size);
  if (hit) return { ...hit, snapped: true };
  // `snapped` is not the same question as "did the point move": the caller has
  // its own fallback (the table's 80px lattice) and must be able to tell
  // "nothing claimed this drop" from "a place happens to be where it fell".
  return { x, y, gridId: null, cell: null, snapped: false };
}

/**
 * Hat dieses Stueck seinen Rasterplatz verloren? (M10.10)
 *
 * Der Befund der dritten Partie: eine Figur wurde ueber die unterste
 * Rasterzeile hinaus auf den aufgedruckten TERRAIN-Streifen gezogen, blieb
 * dort frei stehen und **sah aus wie gesetzt**. Beiseitelegen muss moeglich
 * bleiben – am Tisch legt man auch etwas an den Rand. Falsch war nur, dass es
 * still geschah.
 *
 * Gerechnet wird hier nichts. `snapInto` beantwortet die Frage bereits, und
 * zwar ausdruecklich: `snapped` sagt "ein Platz oder ein Feld hat diesen Wurf
 * beansprucht", nicht "der Punkt hat sich bewegt". Fehlt die Antwort ganz, ist
 * das dieselbe Aussage wie `snapped: false` – niemand hat ihn beansprucht.
 *
 * Steht neben `snapInto`, weil sie deren Antwort liest: eine zweite Stelle,
 * die `snapped` auswertet, waere eine zweite Lesart derselben Auskunft.
 */
export function offGrid(obj, hit) {
  return !!(obj?.gridId || obj?.cell) && !hit?.snapped;
}

/**
 * Die Adressfelder, die eine Bewegungsnachricht mitbringt – und nur die, die
 * wirklich drinstehen (M7.1/G5).
 *
 * Ein Objekt merkt sich seit M3b nicht nur, *wo* es liegt, sondern auf *welchem
 * Feld*, und seit M7.1 kann das ein Bereich mit nachgerechneten Massen sein.
 * Wanderte die Adresse bei `token_move`/`card_move` nicht mit, behielte der Raum
 * die alte, und `placeOnGrids` zoege das Stueck beim naechsten Laden dorthin
 * zurueck – genau den halben Feldversatz weit, den der Bereich beseitigt.
 *
 * Ein *fehlendes* Feld ist nicht dasselbe wie ein Feld auf `null`: ein aelterer
 * Client schickt keins davon, und sein Zug darf die vorhandene Adresse nicht
 * loeschen. Ein ausdrueckliches `null` dagegen ist eine Aussage – "von Hand vom
 * Raster gezogen" – und loescht.
 *
 * Steht hier, weil Server (Raumzustand) und Client (Tisch) dieselbe Antwort
 * brauchen; zwei Listen waeren zwei Antworten.
 */
// `offGrid` ist die Aussage *ueber* die Adresse (M10.10): "hat keine mehr, und
// das ist gemeint". Sie gehoert damit in dieselbe Liste - eine zweite daneben
// liesse Tisch und Raum Verschiedenes sagen, und das Weglassen bleibt auch hier
// das Weglassen: ein aelterer Client loescht keine vorhandene Marke.
const ADDRESS_FIELDS = ['gridId', 'cell', 'width', 'height', 'offGrid'];

export function gridAddress(payload) {
  const out = {};
  if (!payload || typeof payload !== 'object') return out;
  for (const key of ADDRESS_FIELDS) {
    if (key in payload) out[key] = payload[key];
  }
  return out;
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
    const r = grid && cellRange(grid, o.cell);
    if (!r) return o;
    const box = rangeBox(grid, r);
    const p = boxCenter(box);
    // The size is recomputed here, not only when the piece was laid down: the
    // grid hangs on a board, and a board dragged larger has larger fields. A
    // frozen size would sit beside them – the same reason `cell` travels at
    // all (M3b). Only for a region, though: a lone field keeps the size of its
    // asset, or every existing terrain object would change size on this load.
    return r.ranged
      ? { ...o, x: p.x, y: p.y, width: box.width, height: box.height }
      : { ...o, x: p.x, y: p.y };
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
