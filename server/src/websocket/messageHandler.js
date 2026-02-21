/**
 * WebSocket Message Handler
 * Processes incoming client actions, mutates board state, and broadcasts.
 */

import { broadcast, sendToPlayer } from './broadcast.js';
import { getDb } from '../database.js';

const PLAYER_COLORS = new Set(['red', 'blue', 'green', 'purple', 'orange', 'yellow']);

export function handleMessage(room, playerId, rawData) {
  let msg;
  try {
    msg = JSON.parse(rawData);
  } catch {
    return;
  }

  const player = room.players.get(playerId);
  if (!player) return;

  const { type, ...payload } = msg;
  const timestamp = Date.now();

  switch (type) {
    case 'card_move':
      return handleCardMove(room, playerId, payload, timestamp);
    case 'card_flip':
      return handleCardFlip(room, playerId, payload, timestamp);
    case 'card_rotate':
      return handleCardRotate(room, playerId, payload, timestamp);
    case 'stack_move':
      return handleStackMove(room, playerId, payload, timestamp);
    case 'stack_create':
      return handleStackCreate(room, playerId, payload, timestamp);
    case 'stack_merge':
      return handleStackMerge(room, playerId, payload, timestamp);
    case 'stack_take_top':
      return handleStackTakeTop(room, playerId, payload, timestamp);
    case 'stack_shuffle':
      return handleStackShuffle(room, playerId, payload, timestamp);
    case 'card_play_from_hand':
      return handleCardPlayFromHand(room, playerId, payload, timestamp);
    case 'card_draw_to_hand':
      return handleCardDrawToHand(room, playerId, payload);
    case 'dice_roll':
      return handleDiceRoll(room, playerId, payload, timestamp);
    case 'counter_update':
      return handleCounterUpdate(room, playerId, payload, timestamp);
    case 'note_edit':
      return handleNoteEdit(room, playerId, payload, timestamp);
    case 'token_move':
      return handleTokenMove(room, playerId, payload, timestamp);
    case 'cursor_move':
      // Cursor is not persisted in boardState, just broadcast
      broadcast(room, { type: 'cursor', player_id: playerId, x: payload.x, y: payload.y }, playerId);
      return;
    case 'hand_count_update':
      return handleHandCountUpdate(room, playerId, payload);
    default:
      // Unknown message type, ignore
  }
}

// ─── Zone exclusivity check ───────────────────────────────────────────────────

function isActionAllowed(room, playerId, x, y) {
  if (!room.zones || room.zones.length === 0) return true;
  const player = room.players.get(playerId);
  if (!player) return false;

  for (const zone of room.zones) {
    if (!zone.exclusive) continue;
    if (zone.type !== 'player') continue;
    if (x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height) {
      // In an exclusive player zone – only owner may act
      return zone.color === player.color;
    }
  }
  return true;
}

// ─── Card actions ─────────────────────────────────────────────────────────────

function handleCardMove(room, playerId, { table_id, x, y }, timestamp) {
  if (!isActionAllowed(room, playerId, x, y)) {
    return sendToPlayer(room, playerId, { type: 'error', message: 'Not allowed in this zone' });
  }
  const card = room.boardState.cards.find(c => c.tableId === table_id);
  if (card) {
    card.x = x;
    card.y = y;
  }
  broadcast(room, { type: 'card_move', table_id, x, y, from_player_id: playerId, timestamp }, playerId);
}

function handleCardFlip(room, playerId, { table_id, face_down }, timestamp) {
  const card = room.boardState.cards.find(c => c.tableId === table_id);
  if (card) {
    if (!isActionAllowed(room, playerId, card.x, card.y)) {
      return sendToPlayer(room, playerId, { type: 'error', message: 'Not allowed in this zone' });
    }
    card.faceDown = face_down;
  }
  broadcast(room, { type: 'card_flip', table_id, face_down, from_player_id: playerId, timestamp }, playerId);
}

function handleCardRotate(room, playerId, { table_id, rotation }, timestamp) {
  const card = room.boardState.cards.find(c => c.tableId === table_id);
  if (card) {
    if (!isActionAllowed(room, playerId, card.x, card.y)) {
      return sendToPlayer(room, playerId, { type: 'error', message: 'Not allowed in this zone' });
    }
    card.rotation = rotation;
  }
  broadcast(room, { type: 'card_rotate', table_id, rotation, from_player_id: playerId, timestamp }, playerId);
}

function handleCardPlayFromHand(room, playerId, { card, x, y }, timestamp) {
  if (!isActionAllowed(room, playerId, x, y)) {
    return sendToPlayer(room, playerId, { type: 'error', message: 'Not allowed in this zone' });
  }
  const tableCard = { ...card, x, y, tableId: card.tableId || generateId() };
  room.boardState.cards.push(tableCard);
  broadcast(room, {
    type: 'card_play_from_hand',
    card: tableCard,
    x,
    y,
    from_player_id: playerId,
    timestamp,
  });
}

// ─── Stack actions ────────────────────────────────────────────────────────────

function handleStackMove(room, playerId, { stack_id, x, y }, timestamp) {
  const stack = room.boardState.stacks.find(s => s.id === stack_id);
  if (stack) {
    stack.x = x;
    stack.y = y;
  }
  broadcast(room, { type: 'stack_move', stack_id, x, y, from_player_id: playerId, timestamp }, playerId);
}

function handleStackCreate(room, playerId, { stack_id, card_table_ids, x, y }, timestamp) {
  // Remove cards from table, put them in a new stack
  const cards = room.boardState.cards.filter(c => card_table_ids.includes(c.tableId));
  room.boardState.cards = room.boardState.cards.filter(c => !card_table_ids.includes(c.tableId));
  room.boardState.stacks.push({ id: stack_id, cards, x, y });
  broadcast(room, { type: 'stack_create', stack_id, card_table_ids, x, y, from_player_id: playerId, timestamp }, playerId);
}

function handleStackMerge(room, playerId, { from_stack_id, to_stack_id }, timestamp) {
  const fromIdx = room.boardState.stacks.findIndex(s => s.id === from_stack_id);
  const toStack = room.boardState.stacks.find(s => s.id === to_stack_id);
  if (fromIdx !== -1 && toStack) {
    const fromStack = room.boardState.stacks[fromIdx];
    toStack.cards = [...toStack.cards, ...fromStack.cards];
    room.boardState.stacks.splice(fromIdx, 1);
  }
  broadcast(room, { type: 'stack_merge', from_stack_id, to_stack_id, from_player_id: playerId, timestamp }, playerId);
}

function handleStackTakeTop(room, playerId, { stack_id, new_x, new_y }, timestamp) {
  const stack = room.boardState.stacks.find(s => s.id === stack_id);
  if (!stack || stack.cards.length === 0) return;
  const topCard = stack.cards.pop();
  const tableCard = { ...topCard, x: new_x, y: new_y, tableId: topCard.tableId || generateId() };
  room.boardState.cards.push(tableCard);
  // Remove empty stack
  if (stack.cards.length === 0) {
    room.boardState.stacks = room.boardState.stacks.filter(s => s.id !== stack_id);
  }
  broadcast(room, {
    type: 'stack_take_top',
    stack_id,
    new_x,
    new_y,
    card: tableCard,
    from_player_id: playerId,
    timestamp,
  }, playerId);
}

function handleStackShuffle(room, playerId, { stack_id }, timestamp) {
  const stack = room.boardState.stacks.find(s => s.id === stack_id);
  if (stack) {
    for (let i = stack.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [stack.cards[i], stack.cards[j]] = [stack.cards[j], stack.cards[i]];
    }
  }
  broadcast(room, { type: 'stack_shuffle', stack_id, from_player_id: playerId, timestamp }, playerId);
}

// ─── Private hand draw ────────────────────────────────────────────────────────

function handleCardDrawToHand(room, playerId, { stack_id, count }) {
  const stack = room.boardState.stacks.find(s => s.id === stack_id);
  if (!stack) return sendToPlayer(room, playerId, { type: 'draw_response', cards: [] });

  const drawCount = Math.min(count || 1, stack.cards.length);
  const drawn = stack.cards.splice(stack.cards.length - drawCount, drawCount);

  // Remove empty stack
  if (stack.cards.length === 0) {
    room.boardState.stacks = room.boardState.stacks.filter(s => s.id !== stack_id);
    broadcast(room, { type: 'stack_removed', stack_id, from_player_id: playerId, timestamp: Date.now() });
  } else {
    broadcast(room, {
      type: 'stack_size_update',
      stack_id,
      size: stack.cards.length,
      from_player_id: playerId,
      timestamp: Date.now(),
    });
  }

  // Send card data privately to the drawing player only
  sendToPlayer(room, playerId, { type: 'draw_response', cards: drawn });
}

// ─── Game objects ─────────────────────────────────────────────────────────────

function handleDiceRoll(room, playerId, { dice_id, value }, timestamp) {
  const die = room.boardState.dice.find(d => d.id === dice_id);
  if (die) die.value = value;
  broadcast(room, { type: 'dice_roll', dice_id, value, from_player_id: playerId, timestamp }, playerId);
}

function handleCounterUpdate(room, playerId, { counter_id, value }, timestamp) {
  const counter = room.boardState.counters.find(c => c.id === counter_id);
  if (counter) counter.value = value;
  broadcast(room, { type: 'counter_update', counter_id, value, from_player_id: playerId, timestamp }, playerId);
}

function handleNoteEdit(room, playerId, { note_id, text }, timestamp) {
  const note = room.boardState.notes.find(n => n.id === note_id);
  if (note) note.text = text;
  broadcast(room, { type: 'note_edit', note_id, text, from_player_id: playerId, timestamp }, playerId);
}

function handleTokenMove(room, playerId, { token_id, x, y }, timestamp) {
  const token = room.boardState.tokens.find(t => t.id === token_id);
  if (token) { token.x = x; token.y = y; }
  broadcast(room, { type: 'token_move', token_id, x, y, from_player_id: playerId, timestamp }, playerId);
}

// ─── Hand count sync ──────────────────────────────────────────────────────────

function handleHandCountUpdate(room, playerId, { count }) {
  const player = room.players.get(playerId);
  if (player) player.handCardCount = count;
  broadcast(room, { type: 'player_hand_count', player_id: playerId, count }, playerId);
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}
