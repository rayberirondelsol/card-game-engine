/**
 * REST API routes for multiplayer rooms.
 * POST /api/rooms          – Create room (host)
 * GET  /api/rooms/:code    – Get room info + players
 * POST /api/rooms/:code/join   – Join room
 * POST /api/rooms/:code/start  – Start game (host only)
 * DELETE /api/rooms/:code/leave – Leave room
 */

import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../database.js';
import {
  createRoom,
  getRoom,
  addPlayer,
  removePlayer,
  getPlayerCount,
  loadBoardState,
  serializeBoardState,
} from '../roomStore.js';
import { broadcast, sendToPlayer } from '../websocket/broadcast.js';

const VALID_COLORS = ['red', 'blue', 'green', 'purple', 'orange', 'yellow'];

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function getNextSeat(players) {
  const seats = new Set(players.map(p => p.seat));
  for (let i = 1; i <= 6; i++) {
    if (!seats.has(i)) return i;
  }
  return null;
}

export async function roomsRoutes(fastify) {
  // POST /api/rooms – create a new room
  fastify.post('/api/rooms', async (req, reply) => {
    const { game_id, display_name, color, setup_id } = req.body || {};

    if (!game_id || !display_name || !color) {
      return reply.code(400).send({ error: 'game_id, display_name and color are required' });
    }
    if (!VALID_COLORS.includes(color)) {
      return reply.code(400).send({ error: 'Invalid color' });
    }
    if (display_name.length < 2 || display_name.length > 20) {
      return reply.code(400).send({ error: 'display_name must be 2–20 characters' });
    }

    const db = getDb();

    // Verify game exists
    const game = db.prepare('SELECT id FROM games WHERE id = ?').get(game_id);
    if (!game) return reply.code(404).send({ error: 'Game not found' });

    // Generate unique room code
    let roomCode;
    let attempts = 0;
    do {
      roomCode = generateRoomCode();
      attempts++;
      if (attempts > 100) return reply.code(500).send({ error: 'Could not generate unique room code' });
    } while (db.prepare('SELECT 1 FROM game_rooms WHERE room_code = ?').get(roomCode));

    const roomId = uuidv4();
    const playerId = uuidv4();

    // Persist to DB
    db.prepare(`
      INSERT INTO game_rooms (id, game_id, room_code, host_player_id, status, setup_id)
      VALUES (?, ?, ?, ?, 'waiting', ?)
    `).run(roomId, game_id, roomCode, playerId, setup_id || null);

    db.prepare(`
      INSERT INTO room_players (id, room_id, display_name, color, seat, is_host, is_connected)
      VALUES (?, ?, ?, ?, 1, 1, 0)
    `).run(playerId, roomId, display_name, color);

    // Create in-memory room
    createRoom({ roomCode, gameId: game_id, hostPlayerId: playerId, setupId: setup_id || null });
    addPlayer(roomCode, { id: playerId, displayName: display_name, color, seat: 1, isHost: true });

    return reply.code(201).send({
      room_code: roomCode,
      room_id: roomId,
      player_id: playerId,
      seat: 1,
    });
  });

  // GET /api/rooms/:code – get room info
  fastify.get('/api/rooms/:code', async (req, reply) => {
    const { code } = req.params;
    const db = getDb();

    const room = db.prepare('SELECT * FROM game_rooms WHERE room_code = ?').get(code.toUpperCase());
    if (!room) return reply.code(404).send({ error: 'Room not found' });

    const players = db.prepare('SELECT * FROM room_players WHERE room_id = ?').all(room.id);

    // Merge live connection state from in-memory store
    const liveRoom = getRoom(code.toUpperCase());
    const playersWithStatus = players.map(p => {
      const livePlayer = liveRoom?.players.get(p.id);
      return {
        ...p,
        is_connected: livePlayer ? (livePlayer.isConnected ? 1 : 0) : p.is_connected,
        hand_card_count: livePlayer ? livePlayer.handCardCount : p.hand_card_count,
      };
    });

    return {
      room_code: room.room_code,
      room_id: room.id,
      game_id: room.game_id,
      host_player_id: room.host_player_id,
      status: room.status,
      setup_id: room.setup_id,
      players: playersWithStatus,
    };
  });

  // POST /api/rooms/:code/join – join existing room
  fastify.post('/api/rooms/:code/join', async (req, reply) => {
    const { code } = req.params;
    const { display_name, color } = req.body || {};

    if (!display_name || !color) {
      return reply.code(400).send({ error: 'display_name and color are required' });
    }
    if (!VALID_COLORS.includes(color)) {
      return reply.code(400).send({ error: 'Invalid color' });
    }
    if (display_name.length < 2 || display_name.length > 20) {
      return reply.code(400).send({ error: 'display_name must be 2–20 characters' });
    }

    const db = getDb();
    const roomCode = code.toUpperCase();

    const room = db.prepare('SELECT * FROM game_rooms WHERE room_code = ?').get(roomCode);
    if (!room) return reply.code(404).send({ error: 'Room not found' });
    if (room.status !== 'waiting') return reply.code(409).send({ error: 'Room already started' });

    const existingPlayers = db.prepare('SELECT * FROM room_players WHERE room_id = ?').all(room.id);

    if (existingPlayers.length >= 6) {
      return reply.code(409).send({ error: 'Room is full (max 6 players)' });
    }
    if (existingPlayers.some(p => p.color === color)) {
      return reply.code(409).send({ error: 'Color already taken' });
    }

    const seat = getNextSeat(existingPlayers);
    if (!seat) return reply.code(409).send({ error: 'No seats available' });

    const playerId = uuidv4();
    db.prepare(`
      INSERT INTO room_players (id, room_id, display_name, color, seat, is_host, is_connected)
      VALUES (?, ?, ?, ?, ?, 0, 0)
    `).run(playerId, room.id, display_name, color, seat);

    // If room is already in memory, add player there too
    let liveRoom = getRoom(roomCode);
    if (!liveRoom) {
      // Re-hydrate room from DB
      liveRoom = createRoom({
        roomCode,
        gameId: room.game_id,
        hostPlayerId: room.host_player_id,
        setupId: room.setup_id,
      });
      if (room.live_state_data) loadBoardState(liveRoom, room.live_state_data);
      for (const p of existingPlayers) {
        addPlayer(roomCode, { id: p.id, displayName: p.display_name, color: p.color, seat: p.seat, isHost: p.is_host === 1 });
      }
    }
    addPlayer(roomCode, { id: playerId, displayName: display_name, color, seat, isHost: false });

    // Announce to lobby
    broadcast(liveRoom, {
      type: 'player_joined',
      player: { id: playerId, displayName: display_name, color, seat, isHost: false, isConnected: false },
    });

    return reply.code(201).send({
      room_code: roomCode,
      room_id: room.id,
      player_id: playerId,
      seat,
    });
  });

  // POST /api/rooms/:code/start – start the game (host only)
  fastify.post('/api/rooms/:code/start', async (req, reply) => {
    const { code } = req.params;
    const { player_id } = req.body || {};

    if (!player_id) return reply.code(400).send({ error: 'player_id required' });

    const db = getDb();
    const roomCode = code.toUpperCase();
    const room = db.prepare('SELECT * FROM game_rooms WHERE room_code = ?').get(roomCode);

    if (!room) return reply.code(404).send({ error: 'Room not found' });
    if (room.host_player_id !== player_id) return reply.code(403).send({ error: 'Only host can start' });
    if (room.status !== 'waiting') return reply.code(409).send({ error: 'Room already started' });

    db.prepare("UPDATE game_rooms SET status = 'active', updated_at = unixepoch() WHERE room_code = ?").run(roomCode);

    const liveRoom = getRoom(roomCode);
    if (liveRoom) {
      liveRoom.status = 'active';

      // Load setup if configured
      let zones = [];
      if (room.setup_id) {
        const setup = db.prepare('SELECT * FROM setups WHERE id = ?').get(room.setup_id);
        if (setup) {
          // Load board state from setup
          try {
            const setupState = JSON.parse(setup.state_data || '{}');
            loadBoardState(liveRoom, setup.state_data);
          } catch {}
          try {
            zones = JSON.parse(setup.zone_data || '[]');
          } catch {}
          liveRoom.zones = zones;
        }
      }

      // Deal starting hands
      await dealStartingHands(liveRoom, db);

      broadcast(liveRoom, {
        type: 'room_started',
        board_state: liveRoom.boardState,
        zones: liveRoom.zones,
      });
    }

    return { ok: true };
  });

  // DELETE /api/rooms/:code/leave – leave a room
  fastify.delete('/api/rooms/:code/leave', async (req, reply) => {
    const { code } = req.params;
    const { player_id } = req.body || {};

    if (!player_id) return reply.code(400).send({ error: 'player_id required' });

    const db = getDb();
    const roomCode = code.toUpperCase();
    const room = db.prepare('SELECT * FROM game_rooms WHERE room_code = ?').get(roomCode);

    if (!room) return reply.code(404).send({ error: 'Room not found' });

    db.prepare('DELETE FROM room_players WHERE id = ? AND room_id = ?').run(player_id, room.id);

    const liveRoom = getRoom(roomCode);
    if (liveRoom) {
      removePlayer(roomCode, player_id);
      broadcast(liveRoom, { type: 'player_left', player_id });
    }

    // Close room if no players left
    const remaining = db.prepare('SELECT COUNT(*) as cnt FROM room_players WHERE room_id = ?').get(room.id);
    if (remaining.cnt === 0) {
      db.prepare('DELETE FROM game_rooms WHERE room_code = ?').run(roomCode);
    }

    return { ok: true };
  });
}

// ─── Deal system ──────────────────────────────────────────────────────────────

async function dealStartingHands(liveRoom, db) {
  if (!liveRoom.zones || liveRoom.zones.length === 0) return;

  for (const zone of liveRoom.zones) {
    if (zone.type !== 'player') continue;

    // Find player with this color
    const player = Array.from(liveRoom.players.values()).find(p => p.color === zone.color);
    if (!player) continue;

    const cardsForHand = [];

    // Deal from stack
    if (zone.dealStackId && zone.dealCount > 0) {
      const stack = liveRoom.boardState.stacks.find(s => s.id === zone.dealStackId);
      if (stack) {
        const count = Math.min(zone.dealCount, stack.cards.length);
        const dealt = stack.cards.splice(stack.cards.length - count, count);
        cardsForHand.push(...dealt);
      }
    }

    // Add specific starting cards
    if (zone.startingHandCardIds && zone.startingHandCardIds.length > 0) {
      for (const cardId of zone.startingHandCardIds) {
        // Look up card data from DB
        const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(cardId);
        if (card) {
          cardsForHand.push({
            id: card.id,
            name: card.name,
            image_path: card.image_path,
            width: card.width,
            height: card.height,
          });
        }
      }
    }

    if (cardsForHand.length > 0) {
      sendToPlayer(liveRoom, player.id, { type: 'draw_response', cards: cardsForHand });
      player.handCardCount = cardsForHand.length;
    }
  }
}
