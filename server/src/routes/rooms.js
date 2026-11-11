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
// M6: derselbe Executor wie am Tisch – shared/ liegt neben server/ und client/.
import { executeSequenceWithLog } from '../../../shared/sequenceExecutor.js';
import { resolveGrids, placeOnGrids } from '../../../shared/gridGeometry.js';
import { anchorBoxes } from '../../../shared/anchoring.js';
import { resolveChoices, describeChoices } from '../../../shared/setupOptions.js';
import { lageOf } from '../../../shared/villagers.js';
import { ownersOf, ownersOfPlayers, bindZones } from '../../../shared/ownership.js';

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

/** `scenario_data` einer Setup-Zeile als Objekt - kaputtes JSON ist `{}`, wie beim Start. */
function scenarioOf(setup) {
  try {
    const parsed = JSON.parse(setup?.scenario_data || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Die gespeicherte Wahl eines Raums: ein Objekt, oder `null`. */
function storedChoices(room) {
  try {
    const parsed = JSON.parse(room?.setup_choices || 'null');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function roomsRoutes(fastify) {
  // POST /api/rooms – create a new room
  fastify.post('/api/rooms', async (req, reply) => {
    const { game_id, display_name, color, setup_id, setup_choices } = req.body || {};

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

    // M27.3/CX: die Wahl des Aufbaus, **vor** dem Anlegen. Dieselbe Funktion wie
    // im Dialog und im Executor (`resolveChoices`): mit einem Problem wird gar
    // kein Raum angelegt, statt dass er still die Standardvariante baut. Gespeichert
    // wird die **aufgelöste** Wahl (mit den Vorgaben für den Rest) - die Lobby zeigt
    // sie, und eine spätere Änderung der Vorgaben ändert einen angelegten Raum nicht.
    let choices = null;
    if (setup_choices !== undefined && setup_choices !== null && (typeof setup_choices !== 'object' || Array.isArray(setup_choices))) {
      return reply.code(400).send({ error: 'Ungültige Wahl für diesen Aufbau: setup_choices muss ein Objekt sein' });
    }
    if (setup_id) {
      const setup = db.prepare('SELECT * FROM setups WHERE id = ?').get(setup_id);
      if (!setup && setup_choices && Object.keys(setup_choices).length) {
        return reply.code(400).send({ error: 'Ungültige Wahl für diesen Aufbau: den Aufbau gibt es nicht' });
      }
      if (setup) {
        const scenario = scenarioOf(setup);
        const resolved = resolveChoices(scenario.options, setup_choices);
        if (resolved.problems.length) {
          return reply.code(400).send({ error: `Ungültige Wahl für diesen Aufbau: ${resolved.problems.join('; ')}` });
        }
        // M31.15/FC: die Nebenbedingung `S ≤ D`, gleich daneben und in derselben Form (`lageOf` ist
        // `null`, wo die Daten keine Lage nennen: dann keine Prüfung). Der Raum startet sonst
        // und der Executor hält - ohne dass der Host es erfährt.
        const lage = lageOf(scenario, resolved.choices);
        if (lage?.problems.length) {
          return reply.code(400).send({ error: `Ungültige Wahl für diesen Aufbau: ${lage.problems.join('; ')}` });
        }
        if (Object.keys(resolved.choices).length) choices = resolved.choices;
      }
    } else if (setup_choices && Object.keys(setup_choices).length) {
      return reply.code(400).send({ error: 'Ungültige Wahl für diesen Aufbau: es ist kein Aufbau gewählt' });
    }

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
      INSERT INTO game_rooms (id, game_id, room_code, host_player_id, status, setup_id, setup_choices)
      VALUES (?, ?, ?, ?, 'waiting', ?, ?)
    `).run(roomId, game_id, roomCode, playerId, setup_id || null, choices ? JSON.stringify(choices) : null);

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

    // M27.3/CX: die Wahl mit ihren Bezeichnungen - die Lobby zeigt sie, und die
    // Rechnung ist dieselbe wie bei der Meldung am Tisch.
    const choices = storedChoices(room);
    const setupRow = room.setup_id ? db.prepare('SELECT scenario_data FROM setups WHERE id = ?').get(room.setup_id) : null;
    // M32/FN: die Lage und wer welchen Platz führt - die Lobby zeigt es (`null`, wo es nicht gilt).
    const resolved = setupRow ? resolveChoices(scenarioOf(setupRow).options, choices ?? {}) : null;
    const lage = resolved && !resolved.problems.length ? lageOf(scenarioOf(setupRow), resolved.choices) : null;
    const raenge = lage ? ownersOf(lage.players, lage.villagers) : null;

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
      // M27.3/CX: die Lobby zeigt, womit gespielt wird (aufgelöst, oder null).
      setup_choices: choices,
      setup_choices_label: choices ? describeChoices(scenarioOf(setupRow).options, choices) : '',
      players: playersWithStatus,
      lage: lage ? { players: lage.players, villagers: lage.villagers, kind: lage.kind } : null,
      plaetze: raenge ? raenge.map((rang, i) => ({ platz: i + 1, rang })) : null,
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

    // M27.3/CX: die Wahl, mit der der Raum angelegt wurde, gilt noch? Hat sich das
    // Setup seither geändert (eine Wahl umbenannt), baut der Executor nichts auf
    // (`resolveChoices`, letzte Wache) - dann startet der Raum lieber gar nicht,
    // als mit einem leeren Tisch zu laufen.
    const choices = storedChoices(room) ?? {};
    let owners = null;
    if (room.setup_id) {
      const setupRow = db.prepare('SELECT scenario_data FROM setups WHERE id = ?').get(room.setup_id);
      const scenario = scenarioOf(setupRow);
      const resolved = resolveChoices(scenario.options, choices);
      if (resolved.problems.length) {
        return reply.code(409).send({ error: `Die Wahl für diesen Aufbau gilt nicht mehr: ${resolved.problems.join('; ')}` });
      }
      // M31.15/FC: dasselbe für die Lage (`S ≤ D`): kippt sie nach dem Anlegen (die Daten haben sich
      // geändert), hielte der Executor erst **nach** dem `active` unten - der Raum liefe mit leerem Tisch.
      const lage = lageOf(scenario, resolved.choices);
      if (lage?.problems.length) {
        return reply.code(409).send({ error: `Die Wahl für diesen Aufbau gilt nicht mehr: ${lage.problems.join('; ')}` });
      }
      // M32.3/FN: bei mehreren Spielern (Lage `mehrfach`/`normal`) verlangt der Start **genau `S`** Spieler - sonst
      // gäbe es Plätze ohne Eigentümer. Wie die Wachen oben **vor** dem `active`; `owners` ist `null`, wo kein
      // Eigentum gilt (solo, keine Lage): dann geschieht unten nichts.
      owners = ownersOfPlayers(lage, db.prepare('SELECT id, seat, color FROM room_players WHERE room_id = ?').all(room.id));
      if (owners?.problems) return reply.code(409).send({ error: owners.problems.join('; ') });
    }

    db.prepare("UPDATE game_rooms SET status = 'active', updated_at = unixepoch() WHERE room_code = ?").run(roomCode);

    const liveRoom = getRoom(roomCode);
    if (liveRoom) {
      liveRoom.status = 'active';

      // Load setup if configured
      let zones = [];
      let grids = [];
      if (room.setup_id) {
        const setup = db.prepare('SELECT * FROM setups WHERE id = ?').get(room.setup_id);
        if (setup) {
          try {
            zones = JSON.parse(setup.zone_data || '[]');
          } catch {}
          // M3b: without the grids a room table would snap differently from a
          // hotseat one on the same setup.
          try {
            grids = JSON.parse(setup.grid_data || '[]');
          } catch {}

          // M7/T6: dieselben Szenariodaten wie am Tisch - sonst baut
          // `build_scenario` im Raum nichts auf.
          let scenarioData = {};
          try {
            const parsed = JSON.parse(setup.scenario_data || '{}');
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) scenarioData = parsed;
          } catch {}

          // M6: der Raum baut auf wie der Tisch – derselbe Executor aus
          // shared/ und dieselben Eingaben wie in GameTable.jsx. Ohne das
          // startet ein Raum ohne alles, was die Sequenz herstellt.
          let sequence = [];
          try {
            sequence = JSON.parse(setup.sequence_data || '[]');
          } catch {}

          let stateJson = setup.state_data;
          if (Array.isArray(sequence) && sequence.length) {
            const assets = db.prepare(
              `SELECT t.*, (SELECT name FROM categories WHERE id = t.category_id) AS category
               FROM table_assets t WHERE t.game_id = ? ORDER BY t.created_at DESC`
            ).all(room.game_id);
            // Die Kartenbibliothek mit dem *Namen* ihrer Kategorie, genau wie
            // die Assets sie schon führen: `place_stack` adressiert die
            // Kategorie über diesen Namen (M7/T3).
            const cards = db.prepare(
              `SELECT c.*, (SELECT name FROM categories WHERE id = c.category_id) AS category
               FROM cards c WHERE c.game_id = ? ORDER BY c.created_at DESC`
            ).all(room.game_id);
            // Raster wie Zonen in die `options`: `place_asset` darf auf ein
            // Rasterfeld zielen, und der Raum baut auf wie der Tisch (M7/T1).
            const { state, log } = executeSequenceWithLog(stateJson || '{}', sequence, zones, { assets, cards, grids, scenarioData, choices });
            // Fehlgeschlagene Schritte brechen den Start nicht ab – sie werden
            // protokolliert, so wie der Tisch sie in `setupIssues` anzeigt.
            for (const e of log) {
              if (e.status === 'ok') continue;
              fastify.log.warn(
                { room: roomCode, step: e.index, type: e.type, target: e.target, status: e.status, reason: e.reason },
                'setup step did not run'
              );
            }
            stateJson = JSON.stringify(state);
          }
          loadBoardState(liveRoom, stateJson);

          // M3b: was sich ein Rasterfeld merkt, gehört wieder darauf – derselbe
          // Schritt, den `loadGameState` am Tisch macht (placeOnGrids), sonst
          // steht die Figur im Raum auf veralteten Koordinaten.
          const state = liveRoom.boardState;
          const resolved = resolveGrids(grids, anchorBoxes(state.boards, state.tokens));
          if (resolved.length) {
            state.tokens = placeOnGrids(state.tokens, resolved);
            state.cards = placeOnGrids(state.cards, resolved);
          }

          // M32.3/FN: die **Kopie** des Raums bindet seine Hand-Zonen an die Eigentümer (Farbe, `exclusive`);
          // `zone_data` bleibt unberührt. Ohne Eigentum ist `bound.zones === zones`. Ein Platz ohne Hand-Zone
          // (Daten vor `FS`) bricht den Start nicht ab, er wird gemeldet wie ein Aufbauschritt, der nicht lief.
          const bound = bindZones(zones, owners);
          for (const w of bound.warnings) fastify.log.warn({ room: roomCode }, w);
          liveRoom.zones = bound.zones;
          liveRoom.grids = grids;
        }
      }

      // Deal starting hands
      await dealStartingHands(liveRoom, db);

      broadcast(liveRoom, {
        type: 'room_started',
        board_state: liveRoom.boardState,
        zones: liveRoom.zones,
        grids: liveRoom.grids,
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
