/**
 * In-Memory Room Store
 * Single source of truth for active multiplayer rooms.
 * DB gets periodic snapshots every 30s.
 */

// Map<roomCode, RoomState>
const rooms = new Map();

export function createRoom({ roomCode, gameId, hostPlayerId, setupId = null }) {
  const room = {
    roomCode,
    gameId,
    hostPlayerId,
    setupId,
    status: 'waiting', // waiting | active | finished
    players: new Map(),    // Map<playerId, PlayerState>
    connections: new Map(), // Map<playerId, WebSocket>
    boardState: {
      cards: [],
      stacks: [],
      counters: [],
      dice: [],
      tokens: [],
      notes: [],
      stackNames: {},
    },
    zones: [],
    lastSnapshot: new Date(),
  };
  rooms.set(roomCode, room);
  return room;
}

export function getRoom(roomCode) {
  return rooms.get(roomCode) || null;
}

export function deleteRoom(roomCode) {
  rooms.delete(roomCode);
}

export function getAllRooms() {
  return rooms;
}

export function addPlayer(roomCode, player) {
  const room = rooms.get(roomCode);
  if (!room) return false;
  room.players.set(player.id, {
    id: player.id,
    displayName: player.displayName,
    color: player.color,
    seat: player.seat,
    isHost: player.isHost || false,
    isConnected: false,
    handCardCount: 0,
  });
  return true;
}

export function removePlayer(roomCode, playerId) {
  const room = rooms.get(roomCode);
  if (!room) return;
  room.players.delete(playerId);
  room.connections.delete(playerId);
}

export function setConnection(roomCode, playerId, ws) {
  const room = rooms.get(roomCode);
  if (!room) return;
  if (ws) {
    room.connections.set(playerId, ws);
    const p = room.players.get(playerId);
    if (p) p.isConnected = true;
  } else {
    room.connections.delete(playerId);
    const p = room.players.get(playerId);
    if (p) p.isConnected = false;
  }
}

export function getPlayerCount(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return 0;
  return room.players.size;
}

export function getConnectedCount(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return 0;
  let count = 0;
  for (const p of room.players.values()) {
    if (p.isConnected) count++;
  }
  return count;
}

/** Serialize room state for DB snapshot */
export function serializeBoardState(room) {
  return JSON.stringify(room.boardState);
}

/** Load board state from saved JSON string */
export function loadBoardState(room, stateJson) {
  try {
    room.boardState = JSON.parse(stateJson) || room.boardState;
  } catch (e) {
    // keep existing state
  }
}
