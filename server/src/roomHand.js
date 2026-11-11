/**
 * Die private Hand im Raum (Spec M32.6): der Server hält sie und ist ihre einzige Quelle.
 *
 * `room.hands: Map<playerId, Karte[]>` – im Speicher, wie der Raum selbst, nicht in `live_state_data`. Jede Karte
 * trägt eine `handId` (die nennt der Client, wenn er sie ausspielt) und sonst die Felder, die sie im Stapel oder am Tisch
 * hatte. Der Zähler `handCardCount` des Spielers wird **aus der Hand abgeleitet**, nie vom Client übernommen.
 */

import { randomUUID } from 'node:crypto';
import { broadcast } from './websocket/broadcast.js';
import { tidyStack } from './roomStacks.js';

/** Die Hand eines Spielers. Ein Raum alter Form (ohne `hands`) bekommt die Map hier. */
export function handOf(room, playerId) {
  room.hands ??= new Map();
  let hand = room.hands.get(playerId);
  if (!hand) room.hands.set(playerId, (hand = []));
  return hand;
}

/** Karten in die Hand legen; jede bekommt eine `handId`. Gibt die Handkarten zurück (dieselben Objekte wie in der Hand). */
export function addToHand(room, playerId, cards) {
  const added = cards.map(card => ({ ...card, handId: randomUUID() }));
  handOf(room, playerId).push(...added);
  syncHandCount(room, playerId);
  return added;
}

/** `handCardCount` des Spielers aus seiner Hand ableiten. */
export function syncHandCount(room, playerId) {
  const player = room.players.get(playerId);
  const count = handOf(room, playerId).length;
  if (player) player.handCardCount = count;
  return count;
}

/** Allen (auch dem Spieler selbst) die Zahl der Karten in seiner Hand sagen – nur die Zahl. */
export function announceHandCount(room, playerId) {
  broadcast(room, { type: 'player_hand_count', player_id: playerId, count: syncHandCount(room, playerId) });
}

/**
 * Die obersten `n` Karten vom Stapel nehmen (das Ende von `stack.cards` ist oben); gibt sie zurück.
 * Hält `card_ids`/`table_ids` aktuell. Ein leerer Stapel verschwindet; bleibt **eine** Karte, ist es kein Stapel mehr –
 * sie liegt lose an der Stelle des Stapels (dieselbe Regel wie `performSplit` am Tisch, damit Server und Tische
 * dasselbe halten).
 */
export function takeFromStack(room, stack, n) {
  const drawn = stack.cards.splice(stack.cards.length - n, n);
  tidyStack(room.boardState, stack);
  return drawn;
}
