import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ZoneShape from './ZoneShape';
import { zoneSlots } from '../../../shared/zoneGeometry.js';
import {
  screenToWorld, rectFromPoints, isDrawable, createZone,
  panelSide, moveZone, resizeZone, RESIZE_HANDLES, handleAnchor,
  parseSlotLabels, slotLabelsText,
} from '../utils/zoneDraft';
import { setAnchor } from '../../../shared/anchoring.js';

const SHAPES = [
  { value: 'rect',       label: 'Rectangle' },
  { value: 'circle',     label: 'Circle' },
  { value: 'hex-pointy', label: 'Hex (pointy top)' },
  { value: 'hex-flat',   label: 'Hex (flat top)' },
];

const LAYOUTS = [
  { value: '',       label: 'Default (spread)' },
  { value: 'row',    label: 'Row' },
  { value: 'column', label: 'Column' },
  { value: 'grid',   label: 'Grid' },
  { value: 'stack',  label: 'Stack' },
  { value: 'free',   label: 'Free' },
];

const KINDS = ['card', 'asset', 'die'];

const HANDLE_CURSORS = {
  nw: 'nwse-resize', se: 'nwse-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  n: 'ns-resize', s: 'ns-resize',
  e: 'ew-resize', w: 'ew-resize',
};


const PLAYER_COLORS = [
  { value: 'red',    hex: '#ef4444', label: 'Red' },
  { value: 'blue',   hex: '#3b82f6', label: 'Blue' },
  { value: 'green',  hex: '#22c55e', label: 'Green' },
  { value: 'purple', hex: '#a855f7', label: 'Purple' },
  { value: 'orange', hex: '#f97316', label: 'Orange' },
  { value: 'yellow', hex: '#eab308', label: 'Yellow' },
];

const PRESET_LAYOUTS = {
  '1p-solo': {
    label: '1 Player – Solo',
    zones: [
      { color: 'blue', label: 'Player 1', x: 100, y: 300, width: 1000, height: 500 },
    ],
  },
  '2p-vertical': {
    label: '2 Players – Top/Bottom',
    zones: [
      { color: 'blue',   label: 'Player 1', x: 100, y: 600, width: 1000, height: 400 },
      { color: 'red',    label: 'Player 2', x: 100, y: 100, width: 1000, height: 400 },
    ],
  },
  '3p-triangle': {
    label: '3 Players – Triangle',
    zones: [
      { color: 'blue',   label: 'Player 1', x: 400, y: 700, width: 800, height: 350 },
      { color: 'red',    label: 'Player 2', x: 50,  y: 100, width: 700, height: 350 },
      { color: 'green',  label: 'Player 3', x: 850, y: 100, width: 700, height: 350 },
    ],
  },
  '4p-sides': {
    label: '4 Players – All Sides',
    zones: [
      { color: 'blue',   label: 'Player 1', x: 300, y: 800, width: 900, height: 300 },
      { color: 'red',    label: 'Player 2', x: 300, y: 50,  width: 900, height: 300 },
      { color: 'green',  label: 'Player 3', x: 50,  y: 300, width: 300, height: 600 },
      { color: 'purple', label: 'Player 4', x: 1150,y: 300, width: 300, height: 600 },
    ],
  },
};

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

/** The places a snapping zone offers, so the author sees what he configured. */
function zoneSlotPreview(zone) {
  return zoneSlots(zone) || [];
}

/**
 * ZoneEditor – used in setup mode to draw and configure zones.
 *
 * Zones are positioned in world coordinates inside a wrapper carrying the same
 * camera transform GameTable puts on its world wrapper, rather than each zone
 * computing its own screen position. The editor's panels stay outside it, in
 * screen space, where a zoomed-out table must not shrink them.
 *
 * Props:
 *   zones: array of zone objects
 *   onZonesChange: (zones) => void
 *   camera: { x, y, zoom } – current camera transform
 *   containerRef: ref to the canvas container element
 *   anchors: the boxes of the assets on the table a zone can be bound to
 *
 * The zones handed in are already resolved (GameTable does that once); the
 * editor works on plain absolute boxes like before and only has to keep the
 * relative box in step when one is corrected by hand.
 */
export default function ZoneEditor({ zones = [], anchors = [], onZonesChange, camera = { x: 0, y: 0, zoom: 1 }, containerRef }) {
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [drawShape, setDrawShape] = useState('rect');
  const [armed, setArmed] = useState(false);
  const drawStart = useRef(null);
  const [drawRect, setDrawRect] = useState(null);
  const [showPresetModal, setShowPresetModal] = useState(false);
  // An in-flight move or resize: the zone as it was when the drag started, so
  // every frame is computed from the original and small errors cannot add up.
  const [drag, setDrag] = useState(null);

  // Die Werkzeugleiste wohnt im gemeinsamen Stapel, den GameTable im
  // Setup-Modus aufspannt - dort stapelt sie sich im Fluss unter der
  // Rasterleiste statt über einen geratenen Abstand. Fehlt der Anker (Editor
  // ausserhalb des Setup-Modus benutzt), wird die Leiste eben nicht gezeigt.
  const [toolbarAnchor, setToolbarAnchor] = useState(null);
  useEffect(() => { setToolbarAnchor(document.getElementById('setup-toolbar-stack')); }, []);

  const selectedZone = zones.find(z => z.id === selectedZoneId) || null;

  function containerRect() {
    return containerRef?.current?.getBoundingClientRect() || null;
  }

  // The panel is in screen space over a table that pans and zooms, so it docks
  // to whichever side of the selected zone has more room. Drawing and correcting
  // a zone at the left table edge is what M2.6 is about; a fixed left panel made
  // both impossible without closing it first.
  const side = selectedZone ? panelSide(selectedZone, camera, containerRect()) : 'right';

  // Escape gets out of drawing – the only way out otherwise is finishing a drag.
  useEffect(() => {
    if (!armed) return;
    function onKey(e) {
      if (e.key === 'Escape') cancelDraw();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [armed]);

  function toWorld(e) {
    return screenToWorld({ x: e.clientX, y: e.clientY }, camera, containerRect());
  }

  /**
   * Moving and resizing run on window listeners, not on the grip: the pointer
   * leaves a 10px handle on the first fast frame, and a drag that stops when it
   * does is worse than no drag at all.
   */
  useEffect(() => {
    if (!drag) return;
    function onMove(e) {
      // Released outside the window: the mouseup never arrived, so the zone
      // would otherwise stick to the pointer on the way back in.
      if (e.buttons === 0) { setDrag(null); return; }
      const p = toWorld(e);
      const dx = p.x - drag.start.x;
      const dy = p.y - drag.start.y;
      updateZone(drag.zone.id, drag.handle
        ? resizeZone(drag.zone, drag.handle, dx, dy)
        : moveZone(drag.zone, dx, dy));
    }
    function onUp() { setDrag(null); }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, zones]);

  function startDrag(e, zone, handle) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    setSelectedZoneId(zone.id);
    setDrag({ zone, handle, start: toWorld(e) });
  }

  function cancelDraw() {
    setArmed(false);
    setDrawRect(null);
    drawStart.current = null;
  }

  function handleDrawMouseDown(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    drawStart.current = toWorld(e);
    setDrawRect({ ...drawStart.current, width: 0, height: 0 });
  }

  function handleDrawMouseMove(e) {
    if (!drawStart.current) return;
    e.stopPropagation();
    setDrawRect(rectFromPoints(drawStart.current, toWorld(e)));
  }

  function handleDrawMouseUp(e) {
    if (!drawStart.current) return;
    e.stopPropagation();
    const rect = rectFromPoints(drawStart.current, toWorld(e));
    drawStart.current = null;
    setDrawRect(null);
    if (!isDrawable(rect)) return; // a click or a twitch, not a zone
    const zone = createZone(rect, { shape: drawShape, zones });
    onZonesChange([...zones, zone]);
    setSelectedZoneId(zone.id);
    setArmed(false);
  }

  function updateZone(id, updates) {
    onZonesChange(zones.map(z => {
      if (z.id !== id) return z;
      const next = { ...z, ...updates };
      // Moving or resizing an anchored zone means "it belongs here on the
      // board", so the correction becomes the new relative box. Without this
      // the zone would snap back on the next render, which looks like the drag
      // was simply ignored.
      const anchor = next.anchor && anchors.find(a => a.id === next.anchor.assetId);
      return anchor ? setAnchor(next, anchor) : next;
    }));
  }

  /** Bind the zone to an asset (keeping it where it is), or cut it loose. */
  function bindZone(zone, assetId) {
    const anchor = anchors.find(a => a.id === assetId) || null;
    onZonesChange(zones.map(z => (z.id === zone.id ? setAnchor(z, anchor) : z)));
  }

  function deleteZone(id) {
    onZonesChange(zones.filter(z => z.id !== id));
    setSelectedZoneId(null);
  }

  function applyPreset(key) {
    const preset = PRESET_LAYOUTS[key];
    if (!preset) return;
    const newZones = preset.zones.map(z => ({
      id: generateId(),
      type: 'player',
      exclusive: true,
      startingHandCardIds: [],
      dealStackId: null,
      dealCount: 0,
      cameraZoom: 1.0,
      ...z,
      cameraX: z.x,
      cameraY: z.y,
    }));
    onZonesChange(newZones);
    setShowPresetModal(false);
  }

  // Handles live inside the scaled world layer, so they are drawn at 1/zoom to
  // stay the same size on screen – a 10px grip at zoom 0.3 is not grabbable.
  const zoom = camera.zoom || 1;
  const handleSize = 10 / zoom;

  const worldTransform = {
    transformOrigin: '50% 50%',
    transform: `scale(${camera.zoom}) translate(${camera.x}px, ${camera.y}px)`,
  };

  return (
    <div>
      {/* World space: zones and the drag preview, in table coordinates. */}
      <div className="absolute inset-0 pointer-events-none z-30" style={worldTransform}>
        {drawRect && (
          <div
            data-testid="zone-draw-preview"
            className="absolute pointer-events-none"
            style={{ left: drawRect.x, top: drawRect.y, width: drawRect.width, height: drawRect.height }}
          >
            <ZoneShape shape={drawShape} width={drawRect.width} height={drawRect.height} hex="#ffffff" fill="1A" dashed />
          </div>
        )}

        {zones.map(zone => {
          const colorObj = PLAYER_COLORS.find(c => c.value === zone.color);
          const hex = colorObj?.hex || '#94a3b8';
          const isSelected = zone.id === selectedZoneId;
          return (
            <div
              key={zone.id}
              data-testid={`zone-${zone.id}`}
              className={`absolute ${armed ? '' : 'cursor-pointer pointer-events-auto'}`}
              style={{
                left: zone.x,
                top: zone.y,
                width: zone.width,
                height: zone.height,
                boxSizing: 'border-box',
              }}
              onClick={() => setSelectedZoneId(isSelected ? null : zone.id)}
            >
              <ZoneShape
                shape={zone.shape}
                width={zone.width}
                height={zone.height}
                hex={hex}
                fill={isSelected ? '30' : '18'}
                dashed={!isSelected}
              />
              {(zone.snap ? zoneSlotPreview(zone) : []).map((s, i) => (
                <div
                  key={i}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: s.x - zone.x - 3,
                    top: s.y - zone.y - 3,
                    width: 6,
                    height: 6,
                    backgroundColor: hex,
                  }}
                />
              ))}
              {/* The label badge doubles as the move grip: a small, deliberate
                  target, so the zone body does not become a drag surface over
                  the cards it covers – and no modifier key is needed, with Alt
                  already booked twice on this table. */}
              <div
                data-testid={`zone-move-${zone.id}`}
                className="absolute top-1 left-2 font-semibold px-1 py-0.5 rounded select-none"
                style={{ backgroundColor: `${hex}CC`, color: '#fff', fontSize: '10px', cursor: 'move' }}
                onMouseDown={e => startDrag(e, zone, null)}
                onClick={e => e.stopPropagation()}
                title="Drag to move this zone"
              >
                {zone.label}
              </div>

              {isSelected && !armed && (
                <>
                  {/* For a circle or a hex the handles sit on the bounding box,
                      away from the figure. The outline says which box they belong to. */}
                  {zone.shape && zone.shape !== 'rect' && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{ border: `${1 / zoom}px dashed ${hex}80` }}
                    />
                  )}
                  {RESIZE_HANDLES.map(h => {
                    const { fx, fy } = handleAnchor(h);
                    return (
                      <div
                        key={h}
                        data-testid={`zone-resize-${zone.id}-${h}`}
                        className="absolute rounded-sm"
                        style={{
                          left: zone.width * fx - handleSize / 2,
                          top: zone.height * fy - handleSize / 2,
                          width: handleSize,
                          height: handleSize,
                          backgroundColor: '#fff',
                          border: `${1 / zoom}px solid ${hex}`,
                          cursor: HANDLE_CURSORS[h],
                        }}
                        onMouseDown={e => startDrag(e, zone, h)}
                        onClick={e => e.stopPropagation()}
                      />
                    );
                  })}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Screen space: the surface that catches the drag while drawing is armed. */}
      {armed && (
        <div
          data-testid="zone-draw-surface"
          data-ui-element
          className="absolute inset-0 z-40"
          style={{ cursor: 'crosshair' }}
          onMouseDown={handleDrawMouseDown}
          onMouseMove={handleDrawMouseMove}
          onMouseUp={handleDrawMouseUp}
          onMouseLeave={handleDrawMouseUp}
          onContextMenu={e => { e.preventDefault(); cancelDraw(); }}
        />
      )}

      {/* Zone property panel. Docks away from the zone it edits, steps aside
          entirely while a zone is being drawn, and stays below the modals
          (z-50) it used to cover the confirm button of. */}
      {selectedZone && !armed && (
        <div
          data-ui-element
          data-testid="zone-properties-panel"
          data-side={side}
          className={`absolute ${side === 'left' ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-64 bg-slate-900/95 border border-slate-700 rounded-xl p-4 z-40 space-y-3`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Zone Properties</h3>
            <button onClick={() => setSelectedZoneId(null)} className="text-gray-400 hover:text-white text-lg leading-none">&times;</button>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Label</label>
            <input
              type="text"
              value={selectedZone.label || ''}
              onChange={e => updateZone(selectedZone.id, { label: e.target.value })}
              className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Type</label>
            <select
              value={selectedZone.type}
              onChange={e => updateZone(selectedZone.id, { type: e.target.value })}
              className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-white"
            >
              <option value="player">Player Zone</option>
              <option value="shared">Shared Zone</option>
            </select>
          </div>
          {selectedZone.type === 'player' && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Color</label>
              <div className="flex gap-1.5 flex-wrap">
                {PLAYER_COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => updateZone(selectedZone.id, { color: c.value })}
                    title={c.label}
                    className="w-6 h-6 rounded-full border transition-all"
                    style={{
                      backgroundColor: c.hex,
                      borderColor: selectedZone.color === c.value ? '#fff' : 'transparent',
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Shape</label>
            <select
              value={selectedZone.shape || 'rect'}
              onChange={e => updateZone(selectedZone.id, { shape: e.target.value })}
              className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-white"
            >
              {SHAPES.map(sh => <option key={sh.value} value={sh.value}>{sh.label}</option>)}
            </select>
          </div>
          {/* Anchoring (M3a): a zone that maps a printed area of a board follows
              it instead of standing in table coordinates. Only assets that are
              on the table can be chosen - an anchor to something absent is the
              situation this is meant to prevent, not to create. */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Anchored to</label>
            <select
              data-testid="zone-anchor-select"
              value={selectedZone.anchor?.assetId || ''}
              onChange={e => bindZone(selectedZone, e.target.value)}
              className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-white"
            >
              <option value="">Table (absolute)</option>
              {anchors.map(a => (
                <option key={a.id} value={a.id}>{a.label || 'Unnamed asset'}</option>
              ))}
              {selectedZone.anchorMissing && (
                <option value={selectedZone.anchor.assetId}>(missing asset)</option>
              )}
            </select>
            {selectedZone.anchorMissing ? (
              <p className="text-[10px] text-amber-400 mt-1">
                Its asset is not on the table. The zone stays where it last sat until the asset is back.
              </p>
            ) : (
              <p className="text-[10px] text-gray-500 mt-1">
                {selectedZone.anchor
                  ? 'Follows the asset when it is moved or scaled.'
                  : 'Anchoring keeps the zone where it is now.'}
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Accepts (none checked = everything)</label>
            <div className="flex gap-3">
              {KINDS.map(kind => {
                const list = Array.isArray(selectedZone.accepts) ? selectedZone.accepts : [];
                const on = list.includes(kind);
                return (
                  <label key={kind} className="flex items-center gap-1 text-xs text-gray-300 capitalize">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => updateZone(selectedZone.id, {
                        accepts: on ? list.filter(k => k !== kind) : [...list, kind],
                      })}
                    />
                    {kind}
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Capacity (empty = unlimited)</label>
            <input
              type="number"
              min="1"
              value={selectedZone.capacity ?? ''}
              onChange={e => updateZone(selectedZone.id, {
                capacity: e.target.value === '' ? null : Math.max(1, Number(e.target.value)),
              })}
              className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Layout</label>
            <select
              value={selectedZone.layout || ''}
              onChange={e => updateZone(selectedZone.id, { layout: e.target.value || null })}
              className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-white"
            >
              {LAYOUTS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
            {['row', 'column', 'grid'].includes(selectedZone.layout) && !selectedZone.capacity && (
              <p className="text-[10px] text-amber-400 mt-1">Set a capacity to get fixed places.</p>
            )}
          </div>
          {/*
            M7: die Plaetze einer Leiste koennen Namen tragen - fuer die
            Bosseleiste sind das die Schwierigkeitsstufen. `reveal_next` bindet
            den Namen des Platzes als $revealedTier. Ohne dieses Feld waere das
            eine Faehigkeit, die nur ueber handgeschriebenes JSON erreichbar ist.
          */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Place names (comma separated, optional)</label>
            <input
              type="text"
              value={slotLabelsText(selectedZone)}
              placeholder="CHUMP, HOOLIGAN, TROUBLEMAKER, FINAL FIGHT"
              onChange={e => updateZone(selectedZone.id, { slotLabels: parseSlotLabels(e.target.value) })}
              className="w-full px-2 py-1 text-sm bg-slate-800 border border-slate-600 rounded text-white"
            />
            {(() => {
              const names = Array.isArray(selectedZone.slotLabels) ? selectedZone.slotLabels : null;
              const places = zoneSlots(selectedZone)?.length ?? null;
              if (!names) {
                return <p className="text-[10px] text-gray-500 mt-1">A step can read the name of the place it revealed from ($revealedTier).</p>;
              }
              // Die eine Verwechslung, die still falsch waere: zu wenige Namen
              // heisst, dass der letzte Platz keinen hat - und der letzte Platz
              // ist der Endkampf.
              if (places !== null && names.length !== places) {
                return <p className="text-[10px] text-amber-400 mt-1">{names.length} name{names.length === 1 ? '' : 's'} for {places} place{places === 1 ? '' : 's'} - they are matched by position.</p>;
              }
              return <p className="text-[10px] text-gray-500 mt-1">Read as $revealedTier, matched by position.</p>;
            })()}
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Snap to places</label>
            <button
              type="button"
              onClick={() => updateZone(selectedZone.id, { snap: !selectedZone.snap })}
              className="relative inline-flex h-5 w-9 rounded-full transition-colors"
              style={{ backgroundColor: selectedZone.snap ? '#22c55e' : '#475569' }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: `translateX(${selectedZone.snap ? '18px' : '2px'})` }}
              />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-400">Exclusive (only owner may act)</label>
            <button
              type="button"
              onClick={() => updateZone(selectedZone.id, { exclusive: !selectedZone.exclusive })}
              className="relative inline-flex h-5 w-9 rounded-full transition-colors"
              style={{ backgroundColor: selectedZone.exclusive ? '#22c55e' : '#475569' }}
            >
              <span
                className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                style={{ transform: `translateX(${selectedZone.exclusive ? '18px' : '2px'})` }}
              />
            </button>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Camera Start Position</label>
            <button
              type="button"
              className="w-full px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded"
            >
              Save Current View
            </button>
          </div>
          <button
            type="button"
            onClick={() => deleteZone(selectedZone.id)}
            className="w-full px-2 py-1 text-xs bg-red-800 hover:bg-red-700 text-white rounded"
          >
            Delete Zone
          </button>
        </div>
      )}

      {/* Player layout presets – one way to start, never the only one. */}
      {showPresetModal && (
        <div data-ui-element className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 w-80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-white font-semibold text-sm">Player Layouts</h3>
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="text-slate-400 hover:text-white text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <p className="text-slate-400 text-xs">
              A shortcut for the common case: player zones, evenly placed, ready to adjust.
              {zones.length > 0 && <span className="text-amber-400"> Replaces the {zones.length} zone{zones.length === 1 ? '' : 's'} you have now.</span>}
            </p>
            <div className="flex flex-col gap-2">
              {Object.entries(PRESET_LAYOUTS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-white rounded-lg text-left transition-colors"
                >
                  {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowPresetModal(false)}
                className="w-full px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar: drawing a zone is a button with a shape, not a shortcut to guess. */}
      {toolbarAnchor && createPortal(
      <div
        data-ui-element
        data-testid="zone-toolbar"
        className="pointer-events-auto flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-3 py-2 rounded-full shadow-lg"
      >
        <select
          value={drawShape}
          onChange={e => setDrawShape(e.target.value)}
          title="Shape of the next zone"
          className="px-2 py-1 text-xs bg-slate-800 border border-slate-600 rounded text-white"
        >
          {SHAPES.map(sh => <option key={sh.value} value={sh.value}>{sh.label}</option>)}
        </select>
        <button
          type="button"
          data-testid="zone-add-button"
          onClick={() => (armed ? cancelDraw() : setArmed(true))}
          className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
            armed ? 'bg-slate-700 hover:bg-slate-600 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {armed ? 'Cancel' : '+ Add Zone'}
        </button>
        <span className="text-xs text-white/60">
          {armed
            ? 'Drag on the table to size it · Esc to cancel'
            : zones.length === 0
              ? 'No zones yet'
              : 'Click a zone to edit · drag its label to move, its corners to resize'}
        </span>
        <button
          type="button"
          onClick={() => setShowPresetModal(true)}
          className="text-xs text-slate-300 hover:text-white underline underline-offset-2 transition-colors"
        >
          Player layouts
        </button>
      </div>,
      toolbarAnchor)}
    </div>
  );
}
