import React, { useState, useRef, useEffect } from 'react';
import ZoneShape from './ZoneShape';
import { zoneSlots } from '../utils/zoneGeometry';
import { screenToWorld, rectFromPoints, isDrawable, createZone } from '../utils/zoneDraft';

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
 */
export default function ZoneEditor({ zones = [], onZonesChange, camera = { x: 0, y: 0, zoom: 1 }, containerRef }) {
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [drawShape, setDrawShape] = useState('rect');
  const [armed, setArmed] = useState(false);
  const drawStart = useRef(null);
  const [drawRect, setDrawRect] = useState(null);
  const [showPresetModal, setShowPresetModal] = useState(false);

  const selectedZone = zones.find(z => z.id === selectedZoneId) || null;

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
    return screenToWorld(
      { x: e.clientX, y: e.clientY },
      camera,
      containerRef?.current?.getBoundingClientRect() || null,
    );
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
    onZonesChange(zones.map(z => z.id === id ? { ...z, ...updates } : z));
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
              <div
                className="absolute top-1 left-2 font-semibold px-1 py-0.5 rounded"
                style={{ backgroundColor: `${hex}CC`, color: '#fff', fontSize: '10px' }}
              >
                {zone.label}
              </div>
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

      {/* Zone property panel */}
      {selectedZone && (
        <div data-ui-element className="absolute left-4 top-1/2 -translate-y-1/2 w-64 bg-slate-900/95 border border-slate-700 rounded-xl p-4 z-50 space-y-3">
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
      <div
        data-ui-element
        data-testid="zone-toolbar"
        className="absolute bottom-28 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-slate-900/90 border border-slate-700 px-3 py-2 rounded-full shadow-lg"
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
              : 'Click a zone to edit it'}
        </span>
        <button
          type="button"
          onClick={() => setShowPresetModal(true)}
          className="text-xs text-slate-300 hover:text-white underline underline-offset-2 transition-colors"
        >
          Player layouts
        </button>
      </div>
    </div>
  );
}
