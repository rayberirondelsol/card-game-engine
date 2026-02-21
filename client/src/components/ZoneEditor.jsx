import React, { useState, useRef, useCallback } from 'react';

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

/**
 * ZoneEditor – used in setup mode to draw and configure player zones.
 * Props:
 *   zones: array of zone objects
 *   onZonesChange: (zones) => void
 *   camera: { x, y, zoom } – current camera transform to convert screen→world coords
 *   containerRef: ref to the canvas container element
 */
export default function ZoneEditor({ zones = [], onZonesChange, camera, containerRef }) {
  const [selectedZoneId, setSelectedZoneId] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const drawStart = useRef(null);
  const [drawRect, setDrawRect] = useState(null);

  const selectedZone = zones.find(z => z.id === selectedZoneId) || null;

  // Convert screen coords to world coords
  function screenToWorld(sx, sy) {
    const rect = containerRef?.current?.getBoundingClientRect() || { left: 0, top: 0 };
    return {
      x: (sx - rect.left - camera.x) / camera.zoom,
      y: (sy - rect.top - camera.y) / camera.zoom,
    };
  }

  function handleMouseDown(e) {
    if (e.button !== 0 || !e.altKey) return; // Alt+drag to draw zone
    e.preventDefault();
    const world = screenToWorld(e.clientX, e.clientY);
    drawStart.current = world;
    setIsDrawing(true);
    setDrawRect({ x: world.x, y: world.y, width: 0, height: 0 });
  }

  function handleMouseMove(e) {
    if (!isDrawing || !drawStart.current) return;
    const world = screenToWorld(e.clientX, e.clientY);
    setDrawRect({
      x: Math.min(drawStart.current.x, world.x),
      y: Math.min(drawStart.current.y, world.y),
      width: Math.abs(world.x - drawStart.current.x),
      height: Math.abs(world.y - drawStart.current.y),
    });
  }

  function handleMouseUp(e) {
    if (!isDrawing || !drawRect) return;
    setIsDrawing(false);
    if (drawRect.width < 50 || drawRect.height < 50) {
      setDrawRect(null);
      return;
    }
    // Pick next available color
    const usedColors = new Set(zones.filter(z => z.type === 'player').map(z => z.color));
    const nextColor = PLAYER_COLORS.find(c => !usedColors.has(c.value))?.value || 'red';
    const newZone = {
      id: generateId(),
      type: 'player',
      color: nextColor,
      label: `Player ${zones.filter(z => z.type === 'player').length + 1}`,
      x: Math.round(drawRect.x),
      y: Math.round(drawRect.y),
      width: Math.round(drawRect.width),
      height: Math.round(drawRect.height),
      cameraX: Math.round(drawRect.x),
      cameraY: Math.round(drawRect.y),
      cameraZoom: 1.0,
      exclusive: true,
      startingHandCardIds: [],
      dealStackId: null,
      dealCount: 0,
    };
    onZonesChange([...zones, newZone]);
    setSelectedZoneId(newZone.id);
    setDrawRect(null);
    drawStart.current = null;
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
  }

  return (
    <div>
      {/* Transparent draw overlay attached via onMouseDown/Move/Up in parent */}
      {drawRect && (
        <div
          className="absolute pointer-events-none border-2 border-dashed border-white/60 bg-white/10 rounded"
          style={{
            left: drawRect.x * camera.zoom + camera.x,
            top: drawRect.y * camera.zoom + camera.y,
            width: drawRect.width * camera.zoom,
            height: drawRect.height * camera.zoom,
          }}
        />
      )}

      {/* Zone property panel */}
      {selectedZone && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 w-64 bg-slate-900/95 border border-slate-700 rounded-xl p-4 z-50 space-y-3">
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

      {/* Layout presets toolbar */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2 z-40">
        {Object.entries(PRESET_LAYOUTS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => applyPreset(key)}
            className="px-3 py-1.5 text-xs bg-slate-800/90 hover:bg-slate-700 border border-slate-600 text-white rounded-lg"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Zone overlays for editing */}
      {zones.map(zone => {
        const colorObj = PLAYER_COLORS.find(c => c.value === zone.color);
        const hex = colorObj?.hex || '#94a3b8';
        const isSelected = zone.id === selectedZoneId;
        return (
          <div
            key={zone.id}
            className="absolute rounded cursor-pointer"
            style={{
              left: zone.x * camera.zoom + camera.x,
              top: zone.y * camera.zoom + camera.y,
              width: zone.width * camera.zoom,
              height: zone.height * camera.zoom,
              border: `2px ${isSelected ? 'solid' : 'dashed'} ${hex}`,
              backgroundColor: `${hex}${isSelected ? '30' : '18'}`,
              boxSizing: 'border-box',
            }}
            onClick={() => setSelectedZoneId(isSelected ? null : zone.id)}
          >
            <div
              className="absolute top-1 left-2 text-xs font-semibold px-1 py-0.5 rounded"
              style={{ backgroundColor: `${hex}CC`, color: '#fff', fontSize: '10px' }}
            >
              {zone.label}
            </div>
          </div>
        );
      })}

      {/* Instructions hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/50 bg-black/40 px-3 py-1 rounded-full pointer-events-none">
        Alt + drag to draw a zone · Click zone to edit · Use presets above
      </div>
    </div>
  );
}
