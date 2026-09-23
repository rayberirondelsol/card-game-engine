// M3b – the grid layer (spec section 5 "Raster" and milestone M3b).
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Same reason as zone-anchor.test.js: the client has no test setup and pulling
// one in for this would be a dependency for a handful of formulas. So the
// checkable part – all of it, in fact – lives in a pure module and is tested
// from here.
//
// What is tested:
//   * world point → cell, cell → world point, and the round trip both ways
//   * labelling (A1 … S14), columns past Z, the numeric schemes, parsing back
//   * a point outside the grid is outside, not clamped to the edge
//   * anchoring: the *same* resolveBox from M3a, over a move and an uneven
//     scale – C7 must still be C7
//   * the relation between a zone's places and a grid underneath it
//   * a figure restored from `{gridId, cell}` lands on its field again

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  createGrid, gridBox, resolveGrids, setGridAnchor, gridAt,
  cellAt, cellCenter, cellLabel, cellFromLabel, cellPoint,
  snapToGrid, snapInto, placeOnGrids, GRID_TYPES,
} = await import('../../shared/gridGeometry.js');
const { assetBox, anchorBoxes, relativeBox } = await import('../../shared/anchoring.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** The Townsfolk Tussle scenario card: columns A–S, rows 1–14. */
function ttGrid(over = {}) {
  return {
    id: 'g-scenario', label: 'Scenario', type: 'square',
    origin: { x: 100, y: 100 }, cell: 40, cols: 19, rows: 14,
    labels: { cols: 'alpha', rows: 'numeric' },
    ...over,
  };
}

/** A board as GameTable holds it: x/y is the centre, width/height the size. */
function board(over = {}) {
  return {
    id: 'asset-board', name: 'Scenario card', imageUrl: '/uploads/b.png',
    x: 480, y: 380, width: 760, height: 560, locked: true, ...over,
  };
}

/** The same grid, but bound to that board – exactly covering its face. */
function anchoredGrid(over = {}) {
  return ttGrid({
    anchor: { assetId: 'asset-board', relX: 0, relY: 0, relWidth: 1, relHeight: 1 },
    ...over,
  });
}

const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-6, `${msg}: ${a} != ${b}`);
const pointNear = (a, b, msg) => { near(a.x, b.x, `${msg} x`); near(a.y, b.y, `${msg} y`); };

// ── The box a grid covers ────────────────────────────────────────────────────

test('a grid covers cols × rows cells from its origin', () => {
  assert.deepStrictEqual(gridBox(ttGrid()), { x: 100, y: 100, width: 19 * 40, height: 14 * 40 });
});

// ── world ↔ cell ─────────────────────────────────────────────────────────────

test('the top left cell is A1 and sits at the origin', () => {
  const g = ttGrid();
  assert.deepStrictEqual(cellAt(g, 101, 101), { col: 0, row: 0 });
  pointNear(cellCenter(g, 0, 0), { x: 120, y: 120 }, 'A1 centre');
  assert.equal(cellLabel(g, 0, 0), 'A1');
});

test('the bottom right cell is S14', () => {
  const g = ttGrid();
  const last = cellAt(g, 100 + 19 * 40 - 1, 100 + 14 * 40 - 1);
  assert.deepStrictEqual(last, { col: 18, row: 13 });
  assert.equal(cellLabel(g, last.col, last.row), 'S14');
});

test('C7 is the third column and the seventh row', () => {
  const g = ttGrid();
  assert.deepStrictEqual(cellFromLabel(g, 'C7'), { col: 2, row: 6 });
  pointNear(cellPoint(g, 'C7'), { x: 100 + 2.5 * 40, y: 100 + 6.5 * 40 }, 'C7');
});

test('every cell round trips point → cell → point → cell', () => {
  const g = ttGrid();
  for (let col = 0; col < g.cols; col++) {
    for (let row = 0; row < g.rows; row++) {
      const c = cellCenter(g, col, row);
      assert.deepStrictEqual(cellAt(g, c.x, c.y), { col, row }, `centre of ${col}/${row}`);
      const label = cellLabel(g, col, row);
      assert.deepStrictEqual(cellFromLabel(g, label), { col, row }, label);
      pointNear(cellPoint(g, label), c, label);
    }
  }
});

test('a point anywhere inside a cell belongs to that cell', () => {
  const g = ttGrid();
  for (const [dx, dy] of [[1, 1], [39, 1], [1, 39], [39, 39], [20, 20]]) {
    assert.deepStrictEqual(cellAt(g, 100 + 2 * 40 + dx, 100 + 6 * 40 + dy), { col: 2, row: 6 });
  }
});

// ── Outside the grid ─────────────────────────────────────────────────────────

test('a point outside the grid is outside, not clamped to the rim', () => {
  const g = ttGrid();
  for (const [x, y] of [[99, 300], [100 + 19 * 40 + 1, 300], [300, 99], [300, 100 + 14 * 40 + 1], [-5000, -5000]]) {
    assert.equal(cellAt(g, x, y), null, `(${x}, ${y}) must not be a cell`);
    assert.equal(snapToGrid(g, x, y), null, `(${x}, ${y}) must not snap`);
  }
});

test('a cell index outside the grid has no centre and no label', () => {
  const g = ttGrid();
  assert.equal(cellCenter(g, 19, 0), null);
  assert.equal(cellCenter(g, 0, 14), null);
  assert.equal(cellCenter(g, -1, 0), null);
  assert.equal(cellLabel(g, 19, 0), null);
  assert.equal(cellFromLabel(g, 'T1'), null, 'T is past the 19 columns');
  assert.equal(cellFromLabel(g, 'C15'), null, 'row 15 is past the 14 rows');
  assert.equal(cellFromLabel(g, 'C0'), null, 'rows start at 1');
  assert.equal(cellFromLabel(g, ''), null);
  assert.equal(cellFromLabel(g, 'nonsense'), null);
  assert.equal(cellFromLabel(g, null), null);
  assert.equal(cellPoint(g, 'T1'), null);
});

// ── Labelling schemes ────────────────────────────────────────────────────────

test('columns past Z carry on with AA, AB …', () => {
  const g = ttGrid({ cols: 30 });
  assert.equal(cellLabel(g, 25, 0), 'Z1');
  assert.equal(cellLabel(g, 26, 0), 'AA1');
  assert.equal(cellLabel(g, 27, 0), 'AB1');
  assert.deepStrictEqual(cellFromLabel(g, 'AA1'), { col: 26, row: 0 });
  assert.deepStrictEqual(cellFromLabel(g, 'aa1'), { col: 26, row: 0 }, 'case does not matter');
});

test('rows can be the letters and columns the numbers', () => {
  const g = ttGrid({ labels: { cols: 'numeric', rows: 'alpha' } });
  assert.equal(cellLabel(g, 2, 6), '3G');
  assert.deepStrictEqual(cellFromLabel(g, '3G'), { col: 2, row: 6 });
});

test('two numeric axes are separated, so 3 and 7 cannot read as 37', () => {
  const g = ttGrid({ labels: { cols: 'numeric', rows: 'numeric' } });
  assert.equal(cellLabel(g, 2, 6), '3-7');
  assert.deepStrictEqual(cellFromLabel(g, '3-7'), { col: 2, row: 6 });
  assert.equal(cellFromLabel(g, '37'), null);
});

test('no labels field at all still gives A1 – that is the default scheme', () => {
  const g = ttGrid({ labels: undefined });
  assert.equal(cellLabel(g, 0, 0), 'A1');
  assert.equal(cellLabel(g, 2, 6), 'C7');
});

// ── Anchoring: the M3a resolution, reused ────────────────────────────────────

test('an unanchored grid passes through resolveGrids unchanged', () => {
  const before = ttGrid();
  const [after] = resolveGrids([before], anchorBoxes([board()]));
  assert.deepStrictEqual(after, ttGrid());
  assert.deepStrictEqual(before, ttGrid(), 'and the input is not mutated');
  assert.deepStrictEqual(resolveGrids([ttGrid()]), [ttGrid()], 'no anchors at all is fine too');
});

test('an anchored grid covers exactly the part of the board it names', () => {
  const [g] = resolveGrids([anchoredGrid()], anchorBoxes([board()]));
  assert.deepStrictEqual(gridBox(g), { x: 100, y: 100, width: 760, height: 560 });
  near(cellCenter(g, 0, 0).x, 100 + (760 / 19) / 2, 'A1 x');
  near(cellCenter(g, 0, 0).y, 100 + (560 / 14) / 2, 'A1 y');
});

test('an anchor that is not on the table keeps the grid where it was, flagged', () => {
  const [g] = resolveGrids([anchoredGrid()], []);
  assert.deepStrictEqual(gridBox(g), gridBox(ttGrid()), 'last known position');
  assert.equal(g.anchorMissing, true, 'the grid must not vanish silently');
  assert.deepStrictEqual(g.anchor, anchoredGrid().anchor, 'the anchor itself is kept');
});

test('a present anchor never flags anything missing', () => {
  const [g] = resolveGrids([anchoredGrid()], anchorBoxes([board()]));
  assert.ok(!g.anchorMissing);
});

test('C7 stays C7 when the board is moved and unevenly scaled', () => {
  const grid = anchoredGrid();
  const before = resolveGrids([grid], anchorBoxes([board()]))[0];
  // Somewhere else entirely, three times as wide, half as high.
  const moved = board({ x: 3000, y: -400, width: 2280, height: 280 });
  const after = resolveGrids([grid], anchorBoxes([moved]))[0];

  // The label of the cell under a point is a proportion of the board, and a
  // proportion is what survives a move and a scale.
  const rel = (p, b) => relativeBox({ x: p.x, y: p.y, width: 0, height: 0 }, b);
  const relBefore = rel(cellPoint(before, 'C7'), assetBox(board()));
  const relAfter = rel(cellPoint(after, 'C7'), assetBox(moved));
  near(relAfter.relX, relBefore.relX, 'C7 relX');
  near(relAfter.relY, relBefore.relY, 'C7 relY');

  // And the other way round: the point that was C7 is a different cell now
  // only because the board moved – asking at the new place gives C7 again.
  const p = cellPoint(after, 'C7');
  assert.equal(cellLabel(after, ...Object.values(cellAt(after, p.x, p.y))), 'C7');
});

test('every cell of an unevenly scaled grid keeps its label', () => {
  const grid = anchoredGrid();
  const [g] = resolveGrids([grid], anchorBoxes([board({ x: -900, y: 1200, width: 190, height: 1400 })]));
  for (let col = 0; col < g.cols; col++) {
    for (let row = 0; row < g.rows; row++) {
      const c = cellCenter(g, col, row);
      assert.deepStrictEqual(cellAt(g, c.x, c.y), { col, row }, `${cellLabel(g, col, row)} moved`);
    }
  }
});

test('binding a grid to a board keeps it exactly where it is', () => {
  const b = assetBox(board());
  const bound = setGridAnchor(ttGrid(), b);
  assert.equal(bound.anchor.assetId, 'asset-board');
  const [resolved] = resolveGrids([bound], [b]);
  assert.deepStrictEqual(gridBox(resolved), gridBox(ttGrid()), 'unchanged on screen');
});

test('cutting a grid loose freezes it where it stood', () => {
  const [resolved] = resolveGrids([anchoredGrid()], anchorBoxes([board({ x: 2000 })]));
  const free = setGridAnchor(resolved, null);
  assert.ok(!('anchor' in free) || free.anchor == null, 'anchor is gone');
  assert.ok(!free.anchorMissing, 'and so is the flag');
  assert.deepStrictEqual(gridBox(free), gridBox(resolved), 'frozen where it stood');
  assert.deepStrictEqual(resolveGrids([free], anchorBoxes([board()]))[0], free, 'and it no longer follows');
});

// ── Hex is not built yet, and says so ────────────────────────────────────────

test('only the square grid is implemented; a hex grid refuses rather than guess', () => {
  assert.deepStrictEqual(GRID_TYPES, ['square']);
  const hex = ttGrid({ type: 'hex-pointy' });
  assert.equal(cellAt(hex, 120, 120), null, 'a hex grid must not answer with square cells');
  assert.equal(snapToGrid(hex, 120, 120), null);
  assert.equal(gridAt([hex], 120, 120), null);
});

// ── Picking the grid under a point ───────────────────────────────────────────

test('the grid under a point, later ones on top', () => {
  const a = ttGrid({ id: 'a' });
  const b = ttGrid({ id: 'b' });
  assert.equal(gridAt([a, b], 120, 120).id, 'b');
  assert.equal(gridAt([a], 5000, 5000), null);
  assert.equal(gridAt([], 120, 120), null);
  assert.equal(gridAt(null, 120, 120), null);
});

// ── Snapping, and how it relates to a zone's places ──────────────────────────

test('a drop over a grid lands in the middle of a cell and remembers which', () => {
  const g = ttGrid();
  assert.deepStrictEqual(snapToGrid(g, 100 + 2 * 40 + 7, 100 + 6 * 40 + 31), {
    x: 100 + 2.5 * 40, y: 100 + 6.5 * 40, gridId: 'g-scenario', cell: 'C7',
  });
});

// A boss bar with four places, drawn over the scenario card.
function slotZone(over = {}) {
  return {
    id: 'z-boss', label: 'Bosseleiste', shape: 'rect',
    x: 100, y: 100, width: 19 * 40, height: 80,
    capacity: 4, layout: 'row', snap: true, ...over,
  };
}

test('a zone with its own places wins over the grid beneath it', () => {
  const g = ttGrid();
  const z = slotZone();
  const hit = snapInto(150, 130, { zone: z, grids: [g] });
  // The first of four places along the bar, not the centre of cell A1.
  pointNear(hit, { x: 100 + (19 * 40) / 8, y: 140 }, 'zone place');
  assert.equal(hit.cell, null, 'and it is not recorded as a field');
  assert.equal(hit.gridId, null);
  assert.equal(hit.snapped, true);
});

test('a zone without places lets the grid decide', () => {
  const g = ttGrid();
  for (const z of [slotZone({ snap: false }), slotZone({ layout: 'free' }), slotZone({ layout: null, capacity: null }), null]) {
    const hit = snapInto(100 + 2 * 40 + 5, 100 + 6 * 40 + 5, { zone: z, grids: [g] });
    assert.equal(hit.cell, 'C7', `zone ${JSON.stringify(z?.layout)} should not have swallowed the grid`);
    assert.equal(hit.snapped, true);
    pointNear(hit, { x: 100 + 2.5 * 40, y: 100 + 6.5 * 40 }, 'grid cell');
  }
});

test('no grid and no places leaves the drop point alone', () => {
  const hit = snapInto(123, 456, { zone: slotZone({ snap: false }), grids: [] });
  pointNear(hit, { x: 123, y: 456 }, 'untouched');
  assert.equal(hit.cell, null);
  // The caller has its own fallback for an unclaimed drop and must be told.
  assert.equal(hit.snapped, false);
});

// ── The acceptance case: a figure on C7 is on C7 after loading again ─────────

test('a figure on C7 is on C7 again after a reload', () => {
  const grids = [anchoredGrid()];
  const table = anchorBoxes([board()]);
  const [live] = resolveGrids(grids, table);

  // Put the figure down somewhere in C7 and save what a save state holds.
  const c7 = cellPoint(live, 'C7');
  const dropped = snapInto(c7.x + 3, c7.y - 4, { grids: [live] });
  assert.equal(dropped.cell, 'C7');
  const saved = { id: 'fig', gridId: dropped.gridId, cell: dropped.cell, x: dropped.x, y: dropped.y };

  // Load again with the board somewhere else and a different shape – which is
  // the whole reason the grid hangs on the board instead of on the table.
  const other = anchorBoxes([board({ x: 2400, y: 900, width: 380, height: 1120 })]);
  const [reloaded] = resolveGrids(grids, other);
  const [figure] = placeOnGrids([saved], [reloaded]);

  assert.equal(figure.cell, 'C7');
  pointNear(figure, cellPoint(reloaded, 'C7'), 'back on C7');
  assert.deepStrictEqual(cellAt(reloaded, figure.x, figure.y), { col: 2, row: 6 });
});

test('a figure on a grid that is gone stays where it last was', () => {
  const saved = { id: 'fig', gridId: 'nope', cell: 'C7', x: 11, y: 22 };
  const [figure] = placeOnGrids([saved], [ttGrid()]);
  pointNear(figure, { x: 11, y: 22 }, 'last known position');
  assert.equal(figure.cell, 'C7', 'and it still knows which field it wants');
});

test('objects without a field are not touched at all', () => {
  const plain = { id: 'x', x: 5, y: 6 };
  const [after] = placeOnGrids([plain], [ttGrid()]);
  assert.deepStrictEqual(after, plain);
  assert.deepStrictEqual(placeOnGrids([], [ttGrid()]), []);
  assert.deepStrictEqual(placeOnGrids(null, [ttGrid()]), []);
});

test('a field the grid no longer has is dropped, not snapped to the rim', () => {
  // The grid was 19 columns wide and is 4 now: S14 simply does not exist.
  const shrunk = ttGrid({ cols: 4, rows: 4 });
  const [figure] = placeOnGrids([{ id: 'f', gridId: 'g-scenario', cell: 'S14', x: 7, y: 8 }], [shrunk]);
  pointNear(figure, { x: 7, y: 8 }, 'left where it was');
});

// ── Creating a grid in the editor ────────────────────────────────────────────

test('a new grid is a usable square grid with A1 labelling', () => {
  const g = createGrid({ grids: [] });
  assert.equal(g.type, 'square');
  assert.ok(g.cols > 0 && g.rows > 0 && g.cell > 0);
  assert.equal(cellLabel(g, 0, 0), 'A1');
  assert.ok(g.id, 'and it has an id to be referenced by');
  assert.notEqual(createGrid({ grids: [g] }).id, g.id, 'two grids are two grids');
});
