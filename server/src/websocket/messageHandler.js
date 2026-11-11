/**
 * WebSocket Message Handler
 * Processes incoming client actions, mutates board state, and broadcasts.
 */

import { broadcast, sendToPlayer } from './broadcast.js';
import { getDb } from '../database.js';
// Der Server rechnet die Adresse nicht nach - er kennt weder Raster noch
// Bretter. Was gilt, entscheidet der Tisch, der gezogen hat (wie bei x/y auch).
import { gridAddress } from '../../../shared/gridGeometry.js';
// Ein Winkel wird genau einmal ausgelegt (M7.1/M13.1) - der Server liest ihn
// mit derselben Funktion wie Tisch, Editor und Executor.
import { rotationOf } from '../../../shared/assetToken.js';
// M15.4/AP1: es gibt genau eine Mischung, und sie liegt in shared/ - Tisch,
// Raum und Executor benutzen dieselbe.
import { shuffleStack } from '../../../shared/sequenceExecutor.js';
// M32.4: die Wache – wer eine Karte in oder aus der Hand-Zone eines anderen anfasst. Eine Rechnung in shared/.
import { mayTouch, mayTouchCard, ownZoneAt, resolveServerZones } from '../../../shared/ownership.js';
// M32.6: die Hand-Zone rastet eine Karte auf den nächsten freien Platz, wie am Tisch.
import { snapPoint, objectsInZone } from '../../../shared/zoneGeometry.js';
// M32.6: die private Hand hält der Server.
import { handOf, addToHand, announceHandCount, takeFromStack } from '../roomHand.js';
// Stapelgriffe im Raum (docs/tasks-stapel-raum.md): die Rechnung auf dem Raumzustand.
import { stackIdOf, findCard, flipStack } from '../roomStacks.js';

export { stackIdOf };

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
    case 'stack_flip':
      return handleStackFlip(room, playerId, payload, timestamp);
    case 'card_play_from_hand':
      return handleCardPlayFromHand(room, playerId, payload, timestamp);
    case 'card_draw_to_hand':
      return handleCardDrawToHand(room, playerId, payload);
    case 'card_pickup_to_hand':
      return handleCardPickupToHand(room, playerId, payload, timestamp);
    case 'dice_roll':
      return handleDiceRoll(room, playerId, payload, timestamp);
    case 'counter_update':
      return handleCounterUpdate(room, playerId, payload, timestamp);
    case 'note_edit':
      return handleNoteEdit(room, playerId, payload, timestamp);
    case 'token_move':
      return handleTokenMove(room, playerId, payload, timestamp);
    case 'token_create':
      return handleTokenCreate(room, playerId, payload, timestamp);
    case 'token_delete':
      return handleTokenDelete(room, playerId, payload, timestamp);
    case 'token_flip':
      return handleTokenFlip(room, playerId, payload, timestamp);
    case 'token_rotate':
      return handleTokenRotate(room, playerId, payload, timestamp);
    case 'counter_move':
      return handleCounterMove(room, playerId, payload, timestamp);
    case 'die_move':
      return handleDieMove(room, playerId, payload, timestamp);
    case 'note_move':
      return handleNoteMove(room, playerId, payload, timestamp);
    case 'custom_die_place':
      return handleCustomDiePlace(room, playerId, payload, timestamp);
    case 'custom_die_move':
      return handleCustomDieMove(room, playerId, payload, timestamp);
    case 'custom_die_roll':
      return handleCustomDieRoll(room, playerId, payload, timestamp);
    case 'custom_die_delete':
      return handleCustomDieDelete(room, playerId, payload, timestamp);
    case 'cursor_move':
      // Cursor is not persisted in boardState, just broadcast
      broadcast(room, { type: 'cursor', player_id: playerId, x: payload.x, y: payload.y }, playerId);
      return;
    // `hand_count_update` des Clients wird ignoriert (M32.6): der Zähler wird aus der Hand abgeleitet, sonst
    // überschriebe das erste `welcome` nach dem Neuladen die Zahl mit 0, solange `handCards` noch leer ist.
    default:
      // Unknown message type, ignore
  }
}

// ─── Zone ownership guard (M32.4) ─────────────────────────────────────────────

/**
 * Darf dieser Spieler `card` anfassen und/oder nach `dest` legen? Weder der Ort jetzt noch das Ziel darf in der
 * Hand-Zone eines anderen liegen (Regel 1); ohne `card` zählt nur das Ziel. Gerechnet wird mit den **aufgelösten**
 * Zonen des aktuellen Raumzustands - eine verankerte Hand hat sonst keine Fläche. Ohne Eigentümer: immer `true`.
 */
function allowed(room, playerId, card, dest) {
  const color = room.players.get(playerId)?.color;
  return mayTouchCard(resolveServerZones(room.boardState, room.zones), room.players, color, card, dest);
}

/**
 * Eine Ablehnung, die man sieht: `error` und - wo es dafür eine Nachricht gibt - der **wahre Stand**, beides nur an
 * den Absender, damit sein Tisch zurückspringt. An alle anderen geht nichts. `truth` ist die Nachricht
 * (`card_move`, `card_flip`, `card_rotate`, `stack_move`) oder `null`; der Text ist der bestehende.
 */
function rejectTo(room, playerId, truth = null, message = 'Das ist die Hand eines anderen Spielers.') {
  sendToPlayer(room, playerId, { type: 'error', message });
  if (truth) sendToPlayer(room, playerId, truth);
}

// ─── Card actions ─────────────────────────────────────────────────────────────

function handleCardMove(room, playerId, payload, timestamp) {
  const { table_id, x, y } = payload;
  const card = room.boardState.cards.find(c => c.tableId === table_id);
  if (!allowed(room, playerId, card, { x, y })) {
    return rejectTo(room, playerId, card && { type: 'card_move', table_id, x: card.x, y: card.y, ...gridAddress(card) });
  }
  const address = gridAddress(payload);
  if (card) Object.assign(card, { x, y }, address);
  broadcast(room, { type: 'card_move', table_id, x, y, ...address, from_player_id: playerId, timestamp }, playerId);
}

function handleCardFlip(room, playerId, { table_id, face_down }, timestamp) {
  // Auch eine Karte im Stapel (sie liegt dort, wo ihr Stapel liegt).
  const hit = findCard(room.boardState, table_id);
  if (hit) {
    const { card, stack } = hit;
    if (!allowed(room, playerId, stack || card)) {
      return rejectTo(room, playerId, { type: 'card_flip', table_id, face_down: !!card.faceDown });
    }
    card.faceDown = face_down;
  }
  broadcast(room, { type: 'card_flip', table_id, face_down, from_player_id: playerId, timestamp }, playerId);
}

function handleCardRotate(room, playerId, { table_id, rotation }, timestamp) {
  const hit = findCard(room.boardState, table_id);
  if (hit) {
    const { card, stack } = hit;
    if (!allowed(room, playerId, stack || card)) {
      return rejectTo(room, playerId, { type: 'card_rotate', table_id, rotation: card.rotation ?? 0 });
    }
    card.rotation = rotation;
  }
  broadcast(room, { type: 'card_rotate', table_id, rotation, from_player_id: playerId, timestamp }, playerId);
}

/** Der höchste `zIndex` am Tisch, Karten in Stapeln mitgezählt. */
function topZIndex(room) {
  let top = 0;
  const see = (c) => { top = Math.max(top, Number(c?.zIndex) || 0); };
  room.boardState.cards.forEach(see);
  room.boardState.stacks.forEach(s => (s.cards || []).forEach(see));
  return top;
}

/**
 * M32.6: Ausspielen aus der privaten Hand. Der Server nimmt die Karte **aus der Hand des Absenders** (`hand_id`), nicht
 * aus der Nachricht – eine mitgeschickte `card` wird nicht gelesen, eine fremde oder unbekannte `hand_id` findet nichts.
 *
 * Das Ziel entscheidet die Seite, **der Server setzt sie**: in der **eigenen** Hand-Zone liegt die Karte verdeckt (und
 * rastet, wenn die Zone `snap` hat, auf den nächsten freien Platz); sonst liegt sie offen; in einer **fremden** Hand-Zone
 * wird sie abgewiesen und bleibt in der Hand. Allen (auch dem Absender) geht `card_play_from_hand` – der Client ändert
 * lokal nichts, bis diese Antwort kommt.
 */
function handleCardPlayFromHand(room, playerId, { hand_id, x, y }, timestamp) {
  const hand = handOf(room, playerId);
  const i = hand.findIndex(c => c.handId === hand_id);
  if (i === -1) return rejectTo(room, playerId, null, 'Diese Karte ist nicht in deiner Hand.');
  if (!Number.isFinite(x) || !Number.isFinite(y)) return rejectTo(room, playerId, null, 'Ungültiger Ort für die Karte.');

  const color = room.players.get(playerId)?.color;
  const zones = resolveServerZones(room.boardState, room.zones);
  if (!mayTouch(zones, room.players, color, x, y)) return rejectTo(room, playerId);

  const own = ownZoneAt(zones, color, x, y);
  const { cards, stacks, tokens } = room.boardState;
  const spot = own ? snapPoint(own, x, y, objectsInZone(own, cards, stacks, tokens)) : { x, y };
  // Eine Karte, die vom Tisch kam, trägt ihr Rasterfeld und ihre Drehung noch: beides gilt am neuen Ort nicht.
  const { handId, gridId, cell, ...rest } = hand[i];
  const tableCard = {
    ...rest, tableId: rest.tableId || generateId(), x: spot.x, y: spot.y,
    zIndex: topZIndex(room) + 1, faceDown: !!own, rotation: 0, inStack: null,
  };
  hand.splice(i, 1);
  cards.push(tableCard);
  broadcast(room, { type: 'card_play_from_hand', card: tableCard, hand_id, x: spot.x, y: spot.y, from_player_id: playerId, timestamp });
  announceHandCount(room, playerId);
}

/**
 * M32.6: eine lose Karte vom Tisch in die private Hand. Sie muss lose am Tisch liegen (eine Karte im Stapel oder eine
 * unbekannte Id → `error`) und die Wache bestehen (aus fremder Hand-Zone ✗). Der Aufnehmende bekommt `draw_response`,
 * alle `card_removed` – sonst bliebe die Karte bei allen anderen liegen, ein Geist.
 */
function handleCardPickupToHand(room, playerId, { table_id }, timestamp) {
  const i = room.boardState.cards.findIndex(c => c.tableId === table_id);
  if (i === -1) return rejectTo(room, playerId, null, 'Diese Karte liegt nicht lose auf dem Tisch.');
  if (!allowed(room, playerId, room.boardState.cards[i])) return rejectTo(room, playerId);

  const [card] = room.boardState.cards.splice(i, 1);
  const [handCard] = addToHand(room, playerId, [card]);
  sendToPlayer(room, playerId, { type: 'draw_response', cards: [handCard] });
  broadcast(room, { type: 'card_removed', table_id, from_player_id: playerId, timestamp });
  announceHandCount(room, playerId);
}

// ─── Stack actions ────────────────────────────────────────────────────────────

/**
 * Der Stapel, den eine Nachricht meint.
 *
 * Jeder Stapel im System heisst `stackId`: so legt ihn `sequenceExecutor.js`
 * an (`place_stack`, `clear_zone`), so serialisiert ihn `getGameState`, so
 * liest ihn `loadGameState`. Die Stapel-Empfaenger hier suchten aber `s.id`
 * und fanden deshalb nie etwas - der Rundruf ging raus, der Raumzustand blieb
 * stehen, und ein spaeter hinzukommender Spieler sah den alten Stand
 * (docs/audit-dead-controls.md, Fund 9). `id` bleibt als Rueckfall stehen,
 * damit ein alter Raumzustand weiter gefunden wird.
 */
function findStack(room, stackId) {
  return room.boardState.stacks.find(s => stackIdOf(s) === stackId);
}

function handleStackMove(room, playerId, { stack_id, x, y }, timestamp) {
  const stack = findStack(room, stack_id);
  if (!allowed(room, playerId, stack, { x, y })) {
    return rejectTo(room, playerId, stack && { type: 'stack_move', stack_id, x: stack.x, y: stack.y });
  }
  if (stack) {
    stack.x = x;
    stack.y = y;
  }
  broadcast(room, { type: 'stack_move', stack_id, x, y, from_player_id: playerId, timestamp }, playerId);
}

function handleStackCreate(room, playerId, { stack_id, card_table_ids, x, y }, timestamp) {
  // Remove cards from table, put them in a new stack
  const cards = room.boardState.cards.filter(c => card_table_ids.includes(c.tableId));
  // Keine Karte aus der Hand-Zone eines anderen heraus und kein Stapel hinein (M32.4); es gibt keine Nachricht, die
  // den Tisch des Absenders zurückstellt, also bleibt es beim `error`.
  if (!allowed(room, playerId, null, { x, y }) || cards.some(c => !allowed(room, playerId, c))) return rejectTo(room, playerId);
  room.boardState.cards = room.boardState.cards.filter(c => !card_table_ids.includes(c.tableId));
  // `stackId`, nicht `id` – derselbe Name wie im Executor und im Spielstand.
  room.boardState.stacks.push({ stackId: stack_id, cards, x, y });
  broadcast(room, { type: 'stack_create', stack_id, card_table_ids, x, y, from_player_id: playerId, timestamp }, playerId);
}

function handleStackMerge(room, playerId, { from_stack_id, to_stack_id }, timestamp) {
  const fromIdx = room.boardState.stacks.findIndex(s => stackIdOf(s) === from_stack_id);
  const toStack = findStack(room, to_stack_id);
  if (fromIdx !== -1 && toStack) {
    const fromStack = room.boardState.stacks[fromIdx];
    // Weder ein Stapel aus einer fremden Hand-Zone heraus noch einer hinein (M32.4, Nachtrag); es gibt keine Nachricht,
    // die den Tisch des Absenders zurückstellt, also bleibt es beim `error`.
    if (!allowed(room, playerId, fromStack, toStack)) return rejectTo(room, playerId);
    toStack.cards = [...toStack.cards, ...fromStack.cards];
    room.boardState.stacks.splice(fromIdx, 1);
  }
  broadcast(room, { type: 'stack_merge', from_stack_id, to_stack_id, from_player_id: playerId, timestamp }, playerId);
}

function handleStackTakeTop(room, playerId, { stack_id, new_x, new_y }, timestamp) {
  const stack = findStack(room, stack_id);
  if (!stack || stack.cards.length === 0) return;
  if (!allowed(room, playerId, stack, { x: new_x, y: new_y })) return rejectTo(room, playerId);
  const topCard = stack.cards.pop();
  const tableCard = { ...topCard, x: new_x, y: new_y, tableId: topCard.tableId || generateId() };
  room.boardState.cards.push(tableCard);
  // Remove empty stack
  if (stack.cards.length === 0) {
    room.boardState.stacks = room.boardState.stacks.filter(s => stackIdOf(s) !== stack_id);
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

/**
 * Stapel umdrehen: der **Server** kehrt jede Karte um, die Rückmeldung geht an **alle** (auch den Absender) und trägt die
 * absoluten Seiten je `tableId`. Der Tisch des Absenders ändert sich erst damit (docs/tasks-stapel-raum.md, Entscheidung 1).
 */
function handleStackFlip(room, playerId, { stack_id }, timestamp) {
  const stack = findStack(room, stack_id);
  if (!stack || !Array.isArray(stack.cards)) return rejectTo(room, playerId, null, 'Diesen Stapel gibt es nicht.');
  if (!allowed(room, playerId, stack)) return rejectTo(room, playerId);
  broadcast(room, { type: 'stack_flip', stack_id, face_down: flipStack(stack), from_player_id: playerId, timestamp });
}

/**
 * M15.4/AP1+AP2: Mischen im Raum.
 *
 * Bisher permutierte das nur die Array-Reihenfolge von `stack.cards` und liess
 * `zIndex` stehen - und die Reihenfolge eines Stapels ist ueberall `zIndex`.
 * Der Raum mischte also wirkungslos. Gemischt wird jetzt mit `shuffleStack` aus
 * shared/, derselben Funktion, die Tisch und Executor benutzen.
 *
 * `order` ist die Reihenfolge, die der mischende Tisch schon gewuerfelt hat
 * (`tableId` von unten nach oben) - sonst mischte jeder Tisch fuer sich und die
 * Stapel liefen auseinander. Passt sie nicht genau auf den Stapel, mischt der
 * Server selbst; weitergerufen wird in beiden Faellen die **tatsaechlich
 * angewandte** Reihenfolge, damit alle dasselbe uebernehmen.
 */
function handleStackShuffle(room, playerId, { stack_id, order }, timestamp) {
  const stack = findStack(room, stack_id);
  // Ein Stapel in fremder Hand-Zone wird nicht gemischt (M32.4, Nachtrag); der Absender bekommt die Reihenfolge, die der Server hält.
  if (stack && !allowed(room, playerId, stack)) {
    return rejectTo(room, playerId, { type: 'stack_shuffle', stack_id, order: Array.isArray(stack.cards) ? stack.cards.map(c => c.tableId) : null });
  }
  let applied = null;
  if (stack && Array.isArray(stack.cards)) {
    const byId = new Map(stack.cards.map(c => [c.tableId, c]));
    const wanted = Array.isArray(order) && order.length === stack.cards.length
      ? order.map(id => byId.get(id))
      : null;
    if (wanted && wanted.every(Boolean) && new Set(order).size === order.length) {
      stack.cards = wanted;
      stack.cards.forEach((c, i) => { c.zIndex = i + 1; });
    } else {
      shuffleStack(stack.cards);
    }
    stack.card_ids = stack.cards.map(c => c.cardId);
    stack.table_ids = stack.cards.map(c => c.tableId);
    applied = stack.cards.map(c => c.tableId);
  }
  broadcast(room, { type: 'stack_shuffle', stack_id, order: applied, from_player_id: playerId, timestamp }, playerId);
}

// ─── Private hand draw ────────────────────────────────────────────────────────

/**
 * M32.6: Ziehen geht in die **private Hand des Servers**. Der Ziehende bekommt `draw_response` (Karten mit `handId`),
 * **alle** (auch er) `stack_size_update { stack_id, size, removed }` bzw. `stack_removed` – nur Ids, kein Name, kein
 * Bild – und `player_hand_count`. Ein Stapel in fremder Hand-Zone wird abgewiesen (Ort jetzt, wie `stack_take_top`).
 */
function handleCardDrawToHand(room, playerId, { stack_id, count }) {
  const stack = findStack(room, stack_id);
  if (!stack) return sendToPlayer(room, playerId, { type: 'draw_response', cards: [] });
  if (!allowed(room, playerId, stack)) return rejectTo(room, playerId);

  const wanted = Math.floor(Number(count));
  const drawCount = Math.min(wanted >= 1 ? wanted : 1, stack.cards.length);
  const drawn = takeFromStack(room, stack, drawCount);
  const cards = addToHand(room, playerId, drawn);

  // Karten, die dem Ziehenden allein gehören: nur an ihn.
  sendToPlayer(room, playerId, { type: 'draw_response', cards });
  const stamp = { from_player_id: playerId, timestamp: Date.now() };
  if (stack.cards.length === 0) {
    broadcast(room, { type: 'stack_removed', stack_id, ...stamp });
  } else {
    broadcast(room, { type: 'stack_size_update', stack_id, size: stack.cards.length, removed: drawn.map(c => c.tableId), ...stamp });
  }
  announceHandCount(room, playerId);
}

// ─── Game objects ─────────────────────────────────────────────────────────────

function handleDiceRoll(room, playerId, { dice_id, value }, timestamp) {
  const die = room.boardState.dice.find(d => d.id === dice_id);
  if (die) die.value = value;
  broadcast(room, { type: 'dice_roll', dice_id, value, from_player_id: playerId, timestamp }, playerId);
}

function handleCounterUpdate(room, playerId, { counter_id, value }, timestamp) {
  // Vertrauensgrenze: nur eine endliche Zahl wird gespeichert und verteilt.
  if (!Number.isFinite(value)) return;
  const counter = room.boardState.counters.find(c => c.id === counter_id);
  if (counter) counter.value = value;
  broadcast(room, { type: 'counter_update', counter_id, value, from_player_id: playerId, timestamp }, playerId);
}

function handleNoteEdit(room, playerId, { note_id, text }, timestamp) {
  const note = room.boardState.notes.find(n => n.id === note_id);
  if (note) note.text = text;
  broadcast(room, { type: 'note_edit', note_id, text, from_player_id: playerId, timestamp }, playerId);
}

function handleTokenMove(room, playerId, payload, timestamp) {
  const { token_id, x, y } = payload;
  const address = gridAddress(payload);
  const token = room.boardState.tokens.find(t => t.id === token_id);
  if (token) Object.assign(token, { x, y }, address);
  broadcast(room, { type: 'token_move', token_id, x, y, ...address, from_player_id: playerId, timestamp }, playerId);
}

// ─── Token create/delete ──────────────────────────────────────────────────────

function handleTokenCreate(room, playerId, { token }, timestamp) {
  if (token) room.boardState.tokens.push(token);
  broadcast(room, { type: 'token_create', token, from_player_id: playerId, timestamp });
}

/**
 * Umdrehen nach dem Vorbild von handleCardFlip (Spec M3d). Die Nachricht traegt
 * nur die Zielseite; welches Bild dazugehoert, steht im Token selbst – deshalb
 * setzt der Server beide Felder aus `frontImageUrl`/`backImageUrl`, statt sich
 * URLs schicken zu lassen. Der Broadcast traegt weder Name noch Bild
 * ("Verdeckt heisst ueberall verdeckt").
 */
function handleTokenFlip(room, playerId, { token_id, face_down }, timestamp) {
  const token = room.boardState.tokens.find(t => t.id === token_id);
  // Verdeckt ohne Rueckseite gibt es nicht - sonst stuende hier undefined und
  // alle saehen ein kaputtes Bild. Der Client bietet es nicht an, aber darauf
  // verlaesst sich der Server nicht.
  if (!token || (face_down && !token.backImageUrl)) return;
  token.faceDown = face_down;
  token.imageUrl = face_down ? token.backImageUrl : (token.frontImageUrl || token.imageUrl);
  broadcast(room, { type: 'token_flip', token_id, face_down, from_player_id: playerId, timestamp }, playerId);
}

/**
 * Drehen nach dem Vorbild von handleTokenFlip (Spec M13.1). Die Nachricht
 * traegt den fertigen Zielwinkel, nicht den Schritt – der Tisch, der gedreht
 * hat, hat ihn schon ueber `nextRotation` ausgerechnet, und zwei Rechnungen
 * waeren zwei Antworten.
 *
 * Ein Winkel, den `rotationOf` nicht passiert, wird verworfen statt
 * gespeichert. Der Client bietet nichts anderes an, aber darauf verlaesst sich
 * der Server nicht – sonst stuende im Raumzustand ein Wert, den der Renderer
 * nicht kennt (`swap` prueft auf genau 90/270).
 */
function handleTokenRotate(room, playerId, payload, timestamp) {
  const { token_id, rotation, x, y } = payload;
  const angle = rotationOf(rotation);
  if (angle === null) return;
  const token = room.boardState.tokens.find(t => t.id === token_id);
  if (!token) return;
  // M13.4: die Drehung dreht den Kasten mit, also bringt sie eine Platzierung
  // mit - Ort, Feldbereich und dessen Masse. Gerechnet hat das der Tisch
  // (`rotatePlacement`), wie bei `token_move` auch; der Server kennt weder
  // Raster noch Bretter. Dieselbe Feldliste, nicht eine zweite daneben.
  //
  // Fehlen `x`/`y`, bleiben sie stehen: ein aelterer Client schickt nur den
  // Winkel, und sein Zug darf den Ort nicht loeschen.
  const moved = typeof x === 'number' && typeof y === 'number' ? { x, y } : {};
  const address = gridAddress(payload);
  Object.assign(token, { rotation: angle }, moved, address);
  broadcast(room, { type: 'token_rotate', token_id, rotation: angle, ...moved, ...address, from_player_id: playerId, timestamp }, playerId);
}

function handleTokenDelete(room, playerId, { token_id }, timestamp) {
  room.boardState.tokens = room.boardState.tokens.filter(t => t.id !== token_id);
  broadcast(room, { type: 'token_delete', token_id, from_player_id: playerId, timestamp }, playerId);
}

// ─── Object move actions ──────────────────────────────────────────────────────

function handleCounterMove(room, playerId, { counter_id, x, y }, timestamp) {
  const counter = room.boardState.counters.find(c => c.id === counter_id);
  if (counter) { counter.x = x; counter.y = y; }
  broadcast(room, { type: 'counter_move', counter_id, x, y, from_player_id: playerId, timestamp }, playerId);
}

function handleDieMove(room, playerId, { die_id, x, y }, timestamp) {
  const die = room.boardState.dice.find(d => d.id === die_id);
  if (die) { die.x = x; die.y = y; }
  broadcast(room, { type: 'die_move', die_id, x, y, from_player_id: playerId, timestamp }, playerId);
}

function handleNoteMove(room, playerId, { note_id, x, y }, timestamp) {
  const note = room.boardState.notes.find(n => n.id === note_id);
  if (note) { note.x = x; note.y = y; }
  broadcast(room, { type: 'note_move', note_id, x, y, from_player_id: playerId, timestamp }, playerId);
}

// ─── Custom dice ──────────────────────────────────────────────────────────────

function handleCustomDiePlace(room, playerId, { die }, timestamp) {
  if (die) room.boardState.customDice.push(die);
  broadcast(room, { type: 'custom_die_place', die, from_player_id: playerId, timestamp });
}

function handleCustomDieMove(room, playerId, { die_id, x, y }, timestamp) {
  const die = room.boardState.customDice.find(d => d.id === die_id);
  if (die) { die.x = x; die.y = y; }
  broadcast(room, { type: 'custom_die_move', die_id, x, y, from_player_id: playerId, timestamp }, playerId);
}

function handleCustomDieRoll(room, playerId, { die_id, currentFace }, timestamp) {
  const die = room.boardState.customDice.find(d => d.id === die_id);
  if (die) die.currentFace = currentFace;
  broadcast(room, { type: 'custom_die_roll', die_id, currentFace, from_player_id: playerId, timestamp }, playerId);
}

function handleCustomDieDelete(room, playerId, { die_id }, timestamp) {
  room.boardState.customDice = room.boardState.customDice.filter(d => d.id !== die_id);
  broadcast(room, { type: 'custom_die_delete', die_id, from_player_id: playerId, timestamp }, playerId);
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}
