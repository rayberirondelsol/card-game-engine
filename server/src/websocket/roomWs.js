/**
 * WebSocket handler for multiplayer rooms.
 * Uses the raw `ws` package attached to Fastify's underlying HTTP server.
 *
 * Connection URL: GET /ws/rooms/:code?player_id=<id>
 *
 * Authentication: the upgrade happens on the raw HTTP server, outside Fastify's
 * hook chain, so the /api guard in src/index.js does not cover it — the check
 * below is the only one. The session token travels in Sec-WebSocket-Protocol
 * (`new WebSocket(url, [WS_SUBPROTOCOL, token])`) because browsers cannot set
 * headers on a WebSocket, and a ?token= query parameter would leak the session
 * into URLs, access logs and referrers.
 */

import { WebSocketServer, WebSocket } from 'ws';
import { getRoom, setConnection, getAllRooms, serializeBoardState } from '../roomStore.js';
import { handleMessage } from './messageHandler.js';
import { broadcast, sendToPlayer } from './broadcast.js';
import { getDb } from '../database.js';
import { getSessionUser } from '../routes/auth.js';

/** Marker subprotocol; the client offers [WS_SUBPROTOCOL, <session token>]. */
export const WS_SUBPROTOCOL = 'cge.v1';

let wss = null;

/** Reject an upgrade with a real HTTP response, so the client can tell why. */
function reject(socket, status, reason) {
  socket.end(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
}

// Periodic DB snapshot every 30 seconds
let snapshotInterval = null;

export function setupWebSocketServer(httpServer) {
  wss = new WebSocketServer({
    noServer: true,
    // Echo the marker back (never the token): the browser closes the connection
    // unless the server selects one of the offered protocols.
    handleProtocols: (protocols) => (protocols.has(WS_SUBPROTOCOL) ? WS_SUBPROTOCOL : false),
  });

  // Attach upgrade handler to the underlying Node.js HTTP server
  httpServer.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://localhost`);
    const pathname = url.pathname;

    // Match /ws/rooms/:code
    const match = pathname.match(/^\/ws\/rooms\/([A-Z0-9]{6})$/i);
    if (!match) {
      reject(socket, 404, 'Not Found');
      return;
    }

    // Sec-WebSocket-Protocol: "cge.v1, <session token>"
    const offered = (request.headers['sec-websocket-protocol'] || '').split(',').map((p) => p.trim());
    const token = offered.find((p) => p && p !== WS_SUBPROTOCOL);
    if (!offered.includes(WS_SUBPROTOCOL) || !getSessionUser(token)) {
      reject(socket, 401, 'Unauthorized');
      return;
    }

    const roomCode = match[1].toUpperCase();
    const playerId = url.searchParams.get('player_id');

    if (!playerId) {
      reject(socket, 400, 'Bad Request');
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, { roomCode, playerId });
    });
  });

  wss.on('connection', (ws, { roomCode, playerId }) => {
    const room = getRoom(roomCode);

    if (!room) {
      ws.close(4004, 'Room not found');
      return;
    }

    const player = room.players.get(playerId);
    if (!player) {
      ws.close(4003, 'Player not in room');
      return;
    }

    // Register connection
    setConnection(roomCode, playerId, ws);

    // Announce to others
    broadcast(room, { type: 'player_connected', player_id: playerId }, playerId);

    // Send welcome package
    const welcomeMsg = {
      type: 'welcome',
      board_state: room.boardState,
      players: Array.from(room.players.values()),
      zones: room.zones,
      grids: room.grids,
      room_code: roomCode,
      game_id: room.gameId,
    };
    ws.send(JSON.stringify(welcomeMsg));

    // Setup ping/pong keepalive (30s)
    ws.isAlive = true;
    ws.on('pong', () => { ws.isAlive = true; });

    // Handle incoming messages
    ws.on('message', (data) => {
      handleMessage(room, playerId, data.toString());
    });

    // Handle disconnect
    ws.on('close', () => {
      setConnection(roomCode, playerId, null);
      broadcast(room, { type: 'player_disconnected', player_id: playerId });

      // If host disconnects, start grace period
      if (room.hostPlayerId === playerId) {
        room.hostDisconnectTimer = setTimeout(() => {
          // After 60s: promote next player as host or close room
          const connectedPlayers = Array.from(room.players.values()).filter(p => p.isConnected);
          if (connectedPlayers.length > 0) {
            const newHost = connectedPlayers[0];
            room.hostPlayerId = newHost.id;
            newHost.isHost = true;
            broadcast(room, { type: 'host_changed', new_host_id: newHost.id });
          }
        }, 60000).unref();
      }
    });

    ws.on('error', (err) => {
      console.error(`[WS] Error for player ${playerId} in room ${roomCode}:`, err.message);
    });
  });

  // Ping/pong heartbeat to detect stale connections
  const pingInterval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  // Periodic DB snapshot
  snapshotInterval = setInterval(() => {
    snapshotAllRooms();
  }, 30000);

  // No background timer should hold the event loop open on its own (the listening
  // HTTP server does that in production), otherwise tests hang after app.close().
  pingInterval.unref();
  snapshotInterval.unref();

  wss.on('close', () => {
    clearInterval(pingInterval);
    clearInterval(snapshotInterval);
  });

  console.log('[WS] WebSocket server attached to HTTP server');
}

/** Tear down the server and its timers (tests; production exits the process). */
export function closeWebSocketServer() {
  if (wss) wss.close();
  wss = null;
}

function snapshotAllRooms() {
  const db = getDb();
  const update = db.prepare(
    'UPDATE game_rooms SET live_state_data = ?, updated_at = unixepoch() WHERE room_code = ?'
  );
  for (const [code, room] of getAllRooms().entries()) {
    if (room.status === 'active') {
      try {
        update.run(serializeBoardState(room), code);
      } catch (e) {
        console.error('[WS] Snapshot error for room', code, e.message);
      }
    }
  }
}
