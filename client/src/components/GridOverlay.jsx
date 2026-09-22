import React from 'react';
import { gridBox, colLabel, rowLabel, GRID_TYPES } from '../utils/gridGeometry';

/**
 * Draws grids in world space (spec section 5, M3b). The parent applies the
 * camera transform, exactly as for ZoneOverlay.
 *
 * WHEN A GRID IS VISIBLE. A grid usually lies on a board that already has one
 * printed on it, and a second set of lines over the printed one makes the card
 * harder to read than no grid at all. So: while editing it has to be visible —
 * that is how the author checks it covers the printed fields — and while
 * playing it is not, unless the grid says `showInPlay`, which is for a board
 * with no printed raster. Snapping does not depend on any of this; it is
 * geometry, not decoration.
 *
 * Props:
 *   grids      already resolved (GameTable does that once)
 *   selectedId the grid being edited, drawn stronger than the rest
 *   labels     draw the column and row names along the top and left edge
 */
export default function GridOverlay({ grids = [], selectedId = null, labels = false }) {
  if (!grids.length) return null;

  return (
    <>
      {grids.map(grid => {
        if (!GRID_TYPES.includes(String(grid.type || 'square'))) return null;
        const b = gridBox(grid);
        if (!(b.width > 0 && b.height > 0)) return null;
        const cols = Math.max(1, Math.floor(grid.cols) || 1);
        const rows = Math.max(1, Math.floor(grid.rows) || 1);
        const cw = b.width / cols;
        const ch = b.height / rows;
        const on = grid.id === selectedId;
        const stroke = grid.anchorMissing ? '#f59e0b' : on ? '#38bdf8' : '#94a3b8';

        return (
          <div
            key={grid.id}
            data-testid={`grid-${grid.id}`}
            className="absolute pointer-events-none"
            style={{ left: b.x, top: b.y, width: b.width, height: b.height }}
          >
            <svg width={b.width} height={b.height} className="absolute inset-0 overflow-visible">
              {Array.from({ length: cols + 1 }, (_, i) => (
                <line key={`v${i}`} x1={i * cw} y1={0} x2={i * cw} y2={b.height}
                  stroke={stroke} strokeWidth={i === 0 || i === cols ? 1.5 : 0.75} opacity={on ? 0.85 : 0.45} />
              ))}
              {Array.from({ length: rows + 1 }, (_, i) => (
                <line key={`h${i}`} x1={0} y1={i * ch} x2={b.width} y2={i * ch}
                  stroke={stroke} strokeWidth={i === 0 || i === rows ? 1.5 : 0.75} opacity={on ? 0.85 : 0.45} />
              ))}
              {labels && (
                <g fill={stroke} fontSize={Math.max(8, Math.min(cw, ch) * 0.3)} textAnchor="middle" opacity="0.9">
                  {Array.from({ length: cols }, (_, c) => (
                    <text key={`c${c}`} x={(c + 0.5) * cw} y={-4}>{colLabel(grid, c)}</text>
                  ))}
                  {Array.from({ length: rows }, (_, r) => (
                    <text key={`r${r}`} x={-8} y={(r + 0.5) * ch + 4} textAnchor="end">{rowLabel(grid, r)}</text>
                  ))}
                </g>
              )}
            </svg>
          </div>
        );
      })}
    </>
  );
}
