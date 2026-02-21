import React from 'react';

const COLOR_HEX = {
  red:    '#ef4444',
  blue:   '#3b82f6',
  green:  '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
  yellow: '#eab308',
  null:   '#94a3b8',
};

/**
 * Renders zone overlays in world space using absolute positioning.
 * Requires camera transform (translate + scale) to be applied by the parent.
 * Parent container must use: transform: `translate(${camX}px, ${camY}px) scale(${zoom})`
 */
export default function ZoneOverlay({ zones = [], myColor = null }) {
  if (!zones.length) return null;

  return (
    <>
      {zones.map(zone => {
        const hex = COLOR_HEX[zone.color] || COLOR_HEX.null;
        const isMyZone = zone.color === myColor;
        return (
          <div
            key={zone.id}
            className="absolute pointer-events-none rounded"
            style={{
              left: zone.x,
              top: zone.y,
              width: zone.width,
              height: zone.height,
              border: `2px solid ${hex}`,
              backgroundColor: `${hex}${isMyZone ? '18' : '0C'}`,
              boxSizing: 'border-box',
            }}
          >
            <div
              className="absolute top-1 left-2 text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${hex}CC`,
                color: '#fff',
                fontSize: '11px',
              }}
            >
              {zone.label || (zone.type === 'shared' ? 'Shared' : zone.color)}
            </div>
          </div>
        );
      })}
    </>
  );
}
