import React from 'react';

const COLOR_HEX = {
  red:    '#ef4444',
  blue:   '#3b82f6',
  green:  '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
  yellow: '#eab308',
};

export default function PlayerHUD({ players = [], myPlayerId }) {
  if (!players.length) return null;

  return (
    <div className="absolute top-16 right-4 flex flex-col gap-2 z-40 pointer-events-none">
      {players.map(player => {
        const isMe = player.id === myPlayerId;
        const hex = COLOR_HEX[player.color] || '#888';
        return (
          <div
            key={player.id}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
            style={{
              backgroundColor: `${hex}22`,
              border: `1px solid ${hex}55`,
              opacity: player.isConnected ? 1 : 0.45,
            }}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: hex }}
            />
            <span className="font-medium text-white" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
              {player.displayName || player.display_name}
              {isMe && ' (you)'}
              {player.isHost ? ' ★' : ''}
            </span>
            {!player.isConnected && (
              <span className="text-xs text-gray-400">(offline)</span>
            )}
            {player.handCardCount > 0 && (
              <span
                className="ml-1 px-1.5 py-0.5 rounded text-xs font-mono"
                style={{ backgroundColor: `${hex}44`, color: '#fff' }}
              >
                ✋{player.handCardCount}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
