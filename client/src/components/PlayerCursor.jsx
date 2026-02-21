import React from 'react';

const COLOR_HEX = {
  red:    '#ef4444',
  blue:   '#3b82f6',
  green:  '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
  yellow: '#eab308',
};

/**
 * Renders remote player cursors on the screen.
 * Expects cursor positions already in screen coordinates.
 */
export default function PlayerCursors({ cursors = {}, players = [] }) {
  const playerMap = {};
  for (const p of players) playerMap[p.id] = p;

  return (
    <>
      {Object.entries(cursors).map(([playerId, pos]) => {
        const player = playerMap[playerId];
        if (!player || !pos) return null;
        const hex = COLOR_HEX[player.color] || '#888';
        return (
          <div
            key={playerId}
            className="absolute pointer-events-none z-50"
            style={{ left: pos.screenX, top: pos.screenY, transform: 'translate(-2px, -2px)' }}
          >
            {/* Cursor arrow */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 2L8 18L11 11L18 8L2 2Z" fill={hex} stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            {/* Name tag */}
            <div
              className="absolute top-4 left-3 px-1.5 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap"
              style={{ backgroundColor: hex, textShadow: '0 1px 1px rgba(0,0,0,0.5)' }}
            >
              {player.displayName || player.display_name}
            </div>
          </div>
        );
      })}
    </>
  );
}
