import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import GridOverlay from './GridOverlay';
import { createGrid, setGridAnchor, gridBox, GRID_TYPES } from '../utils/gridGeometry';

/**
 * GridEditor – laying out and configuring grids in setup mode (spec section 5,
 * M3b). Same division of labour as ZoneEditor: every formula is in
 * gridGeometry, this file is the panel around it.
 *
 * A grid is picked from the toolbar, not by clicking it on the table. Zones are
 * bodies you point at; a grid is line art spread over a whole board, and making
 * it clickable would mean it swallows clicks meant for the cards lying on it.
 * Numbers are what a grid is edited by anyway — 19 columns, 14 rows, anchored
 * to the scenario card — not dragging.
 *
 * Props:
 *   grids         already resolved (GameTable does that once)
 *   onGridsChange (grids) => void
 *   anchors       the boxes of the assets on the table a grid can be bound to
 *   camera        { x, y, zoom } – the same transform GameTable puts on the world
 */
export default function GridEditor({ grids = [], anchors = [], onGridsChange, camera = { x: 0, y: 0, zoom: 1 } }) {
  const [selectedId, setSelectedId] = useState(null);
  const selected = grids.find(g => g.id === selectedId) || null;

  // Die Werkzeugleiste wohnt im gemeinsamen Stapel, den GameTable im
  // Setup-Modus aufspannt - dort stapelt sie sich im Fluss über der
  // Zonenleiste statt über einen geratenen Abstand. Fehlt der Anker (Editor
  // ausserhalb des Setup-Modus benutzt), wird die Leiste eben nicht gezeigt.
  const [toolbarAnchor, setToolbarAnchor] = useState(null);
  useEffect(() => { setToolbarAnchor(document.getElementById('setup-toolbar-stack')); }, []);

  function updateGrid(id, updates) {
    onGridsChange(grids.map(g => {
      if (g.id !== id) return g;
      const next = { ...g, ...updates };
      // Changing the numbers of an anchored grid means "this is how the board
      // is divided", so the relative box is recomputed from what the author
      // now sees – otherwise the next render would undo the edit.
      const anchor = next.anchor && anchors.find(a => a.id === next.anchor.assetId);
      return anchor ? setGridAnchor(next, anchor) : next;
    }));
  }

  function addGrid() {
    // A new grid starts on the biggest asset on the table and bound to it –
    // that is what a grid is for, and it saves lining it up by hand first.
    const biggest = anchors.reduce((best, a) => (!best || a.width * a.height > best.width * best.height ? a : best), null);
    let grid = createGrid({ grids, origin: biggest ? { x: biggest.x, y: biggest.y } : { x: 0, y: 0 } });
    if (biggest) {
      grid = { ...grid, cell: Math.round(Math.min(biggest.width, biggest.height) / 10) || 60 };
      grid = setGridAnchor({ ...grid, cols: 10, rows: 10 }, biggest);
    }
    onGridsChange([...grids, grid]);
    setSelectedId(grid.id);
  }

  function bindGrid(grid, assetId) {
    const anchor = anchors.find(a => a.id === assetId) || null;
    onGridsChange(grids.map(g => (g.id === grid.id ? setGridAnchor(g, anchor) : g)));
  }

  function deleteGrid(id) {
    onGridsChange(grids.filter(g => g.id !== id));
    setSelectedId(null);
  }

  const numberField = (label, key, min = 1) => (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type="number"
        min={min}
        value={selected[key] ?? ''}
        onChange={e => updateGrid(selected.id, { [key]: Math.max(min, Number(e.target.value) || min) })}
        className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-white"
      />
    </div>
  );

  return (
    <div>
      {/* World space: while a setup is being edited every grid is drawn, with
          its field names – that is how the author checks it covers the printed
          raster. Outside setup mode GameTable draws only the grids that ask
          for it; see GridOverlay. */}
      <div
        className="absolute inset-0 pointer-events-none z-20"
        style={{ transformOrigin: '50% 50%', transform: `scale(${camera.zoom}) translate(${camera.x}px, ${camera.y}px)` }}
      >
        <GridOverlay grids={grids} selectedId={selectedId} labels />
      </div>

      {/* Screen space: the panel for the selected grid. Top-aligned, so it
          cannot land on the vertically centred zone panel. */}
      {selected && (
        <div
          data-ui-element
          data-testid="grid-properties-panel"
          className="absolute right-4 top-4 w-64 bg-slate-900/95 border border-slate-700 rounded-xl p-4 z-40 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Grid Properties</h3>
            <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Label</label>
            <input
              type="text"
              value={selected.label || ''}
              onChange={e => updateGrid(selected.id, { label: e.target.value })}
              className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {numberField('Columns', 'cols')}
            {numberField('Rows', 'rows')}
          </div>

          {/* An anchored grid takes its cell size from the board it covers, so
              editing a number that has no effect would be a lie. */}
          {selected.anchor && !selected.anchorMissing ? (
            <p className="text-[10px] text-gray-500">
              Cell size comes from the asset: {Math.round(gridBox(selected).width / Math.max(1, selected.cols))} ×{' '}
              {Math.round(gridBox(selected).height / Math.max(1, selected.rows))} px.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {numberField('Cell size', 'cell')}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Origin X / Y</label>
                <div className="flex gap-1">
                  {['x', 'y'].map(axis => (
                    <input
                      key={axis}
                      type="number"
                      value={selected.origin?.[axis] ?? 0}
                      onChange={e => updateGrid(selected.id, {
                        origin: { ...selected.origin, [axis]: Number(e.target.value) || 0 },
                      })}
                      className="w-full px-1 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-white"
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={selected.type || 'square'}
              onChange={e => updateGrid(selected.id, { type: e.target.value })}
              className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-white"
            >
              {GRID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <p className="text-[10px] text-gray-500 mt-1">Hex grids are not built yet.</p>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Field names</label>
            <div className="flex gap-1">
              {['cols', 'rows'].map(axis => (
                <select
                  key={axis}
                  value={selected.labels?.[axis] || (axis === 'cols' ? 'alpha' : 'numeric')}
                  onChange={e => updateGrid(selected.id, { labels: { ...selected.labels, [axis]: e.target.value } })}
                  className="w-full px-1 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
                  title={axis === 'cols' ? 'Columns' : 'Rows'}
                >
                  <option value="alpha">{axis === 'cols' ? 'Cols A…' : 'Rows A…'}</option>
                  <option value="numeric">{axis === 'cols' ? 'Cols 1…' : 'Rows 1…'}</option>
                </select>
              ))}
            </div>
          </div>

          {/* Anchoring (M3a, shared with zones): a grid over a printed raster
              follows the board instead of standing in table coordinates. */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Anchored to</label>
            <select
              data-testid="grid-anchor-select"
              value={selected.anchor?.assetId || ''}
              onChange={e => bindGrid(selected, e.target.value)}
              className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-white"
            >
              <option value="">Table (absolute)</option>
              {anchors.map(a => <option key={a.id} value={a.id}>{a.label || 'Unnamed asset'}</option>)}
              {selected.anchorMissing && <option value={selected.anchor.assetId}>(missing asset)</option>}
            </select>
            {selected.anchorMissing ? (
              <p className="text-[10px] text-amber-400 mt-1">
                Its asset is not on the table. The grid stays where it last sat until the asset is back.
              </p>
            ) : (
              <p className="text-[10px] text-gray-500 mt-1">
                {selected.anchor
                  ? 'Follows the asset when it is moved or scaled.'
                  : 'Anchoring keeps the grid where it is now.'}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Draw while playing</label>
            <button
              type="button"
              onClick={() => updateGrid(selected.id, { showInPlay: !selected.showInPlay })}
              className="relative inline-flex h-5 w-9 rounded-full transition-colors"
              style={{ backgroundColor: selected.showInPlay ? '#22c55e' : '#475569' }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: `translateX(${selected.showInPlay ? '18px' : '2px'})` }}
              />
            </button>
          </div>
          <p className="text-[10px] text-gray-500 -mt-1">
            Off for a board with a printed grid – objects still snap to the fields.
          </p>

          <button
            type="button"
            onClick={() => deleteGrid(selected.id)}
            className="w-full px-2 py-1 text-xs bg-red-800 hover:bg-red-700 text-white rounded"
          >
            Delete Grid
          </button>
        </div>
      )}

      {/* Toolbar, above the zone toolbar. */}
      {toolbarAnchor && createPortal(
      <div
        data-ui-element
        data-testid="grid-toolbar"
        className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-3 py-2 rounded-full shadow-lg"
      >
        <select
          data-testid="grid-select"
          value={selectedId || ''}
          onChange={e => setSelectedId(e.target.value || null)}
          className="px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
        >
          <option value="">{grids.length ? 'Pick a grid…' : 'No grids yet'}</option>
          {grids.map(g => (
            <option key={g.id} value={g.id}>
              {g.label || 'Grid'}{g.anchorMissing ? ' ⚠' : ''}
            </option>
          ))}
        </select>
        <button
          type="button"
          data-testid="grid-add-button"
          onClick={addGrid}
          className="px-3 py-1 text-xs font-medium rounded-full bg-sky-600 hover:bg-sky-500 text-white transition-colors"
        >
          + Add Grid
        </button>
        {selected && (
          <span className="text-xs text-white/60">
            {selected.cols} × {selected.rows} fields
          </span>
        )}
      </div>,
      toolbarAnchor)}
    </div>
  );
}
