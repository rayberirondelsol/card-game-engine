/**
 * Broadcast utilities for WebSocket rooms
 */

import { WebSocket } from 'ws';

/**
 * Broadcast a message to all connected players in a room,
 * optionally excluding one player.
 */
export function broadcast(room, msg, excludePlayerId = null) {
  const data = JSON.stringify(msg);
  for (const [playerId, ws] of room.connections.entries()) {
    if (excludePlayerId && playerId === excludePlayerId) continue;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

/**
 * Send a message to a specific player only.
 */
export function sendToPlayer(room, playerId, msg) {
  const ws = room.connections.get(playerId);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

/**
 * Broadcast board state sync to all players.
 */
export function broadcastBoardSync(room) {
  broadcast(room, {
    type: 'board_sync',
    board_state: room.boardState,
  });
}
