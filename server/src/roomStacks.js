/**
 * Stapelgriffe im Raum (docs/tasks-stapel-raum.md): die Rechnung auf `room.boardState`, ohne Netz. Der Handler
 * (`websocket/messageHandler.js`) ruft die Wache, rechnet hier und sendet. Ein Stapel ist im Raumzustand
 * `{ stackId, x, y, cards: [unten … oben] }`; seine Karten tragen **keinen** Ort (der Ort ist der des Stapels), wie
 * `getGameState` sie schreibt, und die Reihenfolge im Feld ist die Stapelreihenfolge (`zIndex` steigt mit ihr).
 */

const finite = Number.isFinite;

/** Jeder Stapel im System heißt `stackId` (Executor, `getGameState`, `loadGameState`); `id` ist der Rückfall alter Räume. */
export function stackIdOf(stack) {
  return stack?.stackId ?? stack?.id;
}

/** Die Karte mit dieser `tableId`: lose am Tisch (`stack: null`) oder in einem Stapel. `null`, wenn es sie nicht gibt. */
export function findCard(boardState, tableId) {
  const card = boardState.cards.find(c => c.tableId === tableId);
  if (card) return { card, stack: null };
  for (const stack of boardState.stacks) {
    const inside = (stack.cards || []).find(c => c.tableId === tableId);
    if (inside) return { card: inside, stack };
  }
  return null;
}

/** Der höchste `zIndex` am Tisch, Karten in Stapeln mitgezählt. */
export function topZIndex(boardState) {
  let top = 0;
  const see = (c) => { top = Math.max(top, Number(c?.zIndex) || 0); };
  boardState.cards.forEach(see);
  boardState.stacks.forEach(s => (s.cards || []).forEach(see));
  return top;
}

/** `card_ids`/`table_ids` des Stapels aus seinen Karten ableiten (sie stehen im Spielstand daneben). */
export function syncStackIds(stack) {
  stack.card_ids = stack.cards.map(c => c.cardId);
  stack.table_ids = stack.cards.map(c => c.tableId);
}

/**
 * Ein Stapel mit **einer** Karte ist keiner (dieselbe Regel wie `performSplit` am Tisch): ein leerer Stapel verschwindet,
 * bei einer Restkarte liegt sie lose an der Stelle des Stapels. Gibt es mehr, bleibt er, nur die Ids werden abgeleitet.
 */
export function tidyStack(boardState, stack) {
  syncStackIds(stack);
  if (stack.cards.length > 1) return;
  boardState.stacks = boardState.stacks.filter(s => s !== stack);
  if (stack.cards.length === 1) boardState.cards.push({ ...stack.cards[0], x: stack.x, y: stack.y });
}

/** Eine Karte als Stapelkarte: ohne Ort, Rasterfeld und Stapelfeld (wie `getGameState` sie schreibt), mit diesem `zIndex`. */
function asStackCard(card, z) {
  const { x, y, gridId, cell, inStack, face_up, ...rest } = card;
  return finite(z) ? { ...rest, zIndex: z } : rest;
}

/** Die `zIndex` einer Nachricht, wenn sie genau auf `n` Karten passt und lesbar ist; sonst `base, base+1, …`. */
function zOrder(z, n, base) {
  return Array.isArray(z) && z.length === n && z.every(finite) ? [...z] : Array.from({ length: n }, (_, i) => base + i);
}

const NO_STACK = 'Diesen Stapel gibt es nicht.';

// ─── Umdrehen ─────────────────────────────────────────────────────────────────

/**
 * Jede Karte des Stapels umkehren (nicht „alle auf dieselbe Seite": ein gemischter Stapel bleibt gemischt, nur
 * andersherum – wie am Tisch). Gibt die **absoluten** Seiten je `tableId` zurück, die die Rückmeldung trägt.
 */
export function flipStack(stack) {
  const faces = {};
  for (const c of stack.cards) {
    c.faceDown = !c.faceDown;
    if (c.tableId != null) faces[c.tableId] = c.faceDown;
  }
  return faces;
}

// ─── Abheben und Teilen ───────────────────────────────────────────────────────

/**
 * `stack_take_top { stack_id, new_x, new_y, face_down?, z_index? }` / `stack_split { stack_id, count, new_stack_id, new_x, new_y }`
 * prüfen. `count` ist bei `stack_take_top` 1 (die oberste Karte, lose); bei `stack_split` eine ganze Zahl von 1 bis
 * Stapelgröße − 1, und ab 2 braucht der neue Stapel eine Id, die es noch nicht gibt.
 * Gibt `{ error }` oder `{ stack, count, moved }` zurück (`moved` unten → oben).
 */
export function planSplit(boardState, msg, count = 1) {
  const stack = boardState.stacks.find(s => stackIdOf(s) === msg.stack_id);
  if (!stack || !Array.isArray(stack.cards) || stack.cards.length === 0) return { error: NO_STACK };
  if (!finite(msg.new_x) || !finite(msg.new_y)) return { error: 'Ungültiger Ort für die Karte.' };
  if (!Number.isInteger(count) || count < 1 || count > stack.cards.length - (count >= 2 ? 1 : 0)) return { error: 'So viele Karten lassen sich nicht abteilen.' };
  if (count >= 2 && (typeof msg.new_stack_id !== 'string' || !msg.new_stack_id
      || boardState.stacks.some(s => stackIdOf(s) === msg.new_stack_id))) return { error: 'Ungültiger Stapel.' };
  return { stack, count, moved: stack.cards.slice(stack.cards.length - count) };
}

/**
 * Die obersten Karten abnehmen und wohin legen: bei `count` 1 liegt die Karte **lose** an der Stelle (Seite und `zIndex`
 * aus der Nachricht, wenn sie lesbar sind – so deckt „Reveal“ auf –, sonst bleibt sie, wie sie war), sonst bilden sie einen
 * neuen Stapel. Ein Rest von einer Karte löst sich auf. Gibt die lose Karte zurück (oder `null`).
 */
export function applySplit(boardState, msg, { stack, count, moved }, newId) {
  stack.cards = stack.cards.slice(0, stack.cards.length - count);
  tidyStack(boardState, stack);
  if (count === 1) {
    const card = { ...moved[0], x: msg.new_x, y: msg.new_y, tableId: moved[0].tableId || newId };
    if (typeof msg.face_down === 'boolean') card.faceDown = msg.face_down;
    if (finite(msg.z_index)) card.zIndex = msg.z_index;
    boardState.cards.push(card);
    return card;
  }
  const fresh = { stackId: msg.new_stack_id, cards: moved, x: msg.new_x, y: msg.new_y };
  syncStackIds(fresh);
  boardState.stacks.push(fresh);
  return null;
}

// ─── Bilden und Mergen ────────────────────────────────────────────────────────

/**
 * `stack_create { stack_id, card_table_ids, z_index, x, y }` prüfen (ändert nichts): ein neuer Stapel aus **mindestens
 * zwei** vorhandenen Karten, lose **oder** in anderen Stapeln, Reihenfolge unten → oben. Eine vorhandene `stack_id` darf
 * neu gefasst werden, wenn **alle** ihre Karten in der Liste stehen (so bildet ein Ablagestapel seinen Haufen).
 * Gibt `{ error }` (deutscher Text) oder `{ members, z }` zurück; `members` sind `{ card, stack|null }`.
 */
export function planCreate(boardState, msg) {
  const { stack_id: stackId, card_table_ids: ids, x, y } = msg;
  if (typeof stackId !== 'string' || !stackId || !finite(x) || !finite(y)
      || !Array.isArray(ids) || ids.length < 2 || ids.some(id => typeof id !== 'string') || new Set(ids).size !== ids.length) {
    return { error: 'Ungültiger Stapel.' };
  }
  const members = ids.map(id => findCard(boardState, id));
  if (members.some(m => !m)) return { error: 'Diese Karten liegen nicht mehr auf dem Tisch.' };
  const existing = boardState.stacks.find(s => stackIdOf(s) === stackId);
  if (existing && !existing.cards.every(c => ids.includes(c.tableId))) return { error: 'Diese Stapel-Id gehört einem anderen Stapel.' };
  return { members, z: zOrder(msg.z_index, ids.length, topZIndex(boardState) + 1) };
}

/** Den geprüften Stapel anlegen: die Karten verlassen Tisch und Quellstapel, ein Rest von einer Karte löst sich auf. */
export function applyCreate(boardState, msg, { members, z }) {
  const taken = new Set(members.map(m => m.card));
  const sources = new Set(members.map(m => m.stack).filter(Boolean));
  boardState.cards = boardState.cards.filter(c => !taken.has(c));
  sources.forEach(s => { s.cards = s.cards.filter(c => !taken.has(c)); });
  const cards = members.map(({ card }, i) => asStackCard(card, z[i]));
  sources.forEach(s => tidyStack(boardState, s));
  const stack = { stackId: msg.stack_id, cards, x: msg.x, y: msg.y };
  syncStackIds(stack);
  boardState.stacks.push(stack);
}

/**
 * `stack_merge { from_stack_id | from_table_id, to_stack_id, order, z_index }` prüfen: ein ganzer Stapel **oder eine lose
 * Karte** kommt oben auf den Zielstapel. `order` (`tableId` unten → oben) gilt nur, wenn es genau auf den Quellstapel passt,
 * sonst seine eigene Reihenfolge; `z_index` nur, wenn es genau auf die Karten passt, sonst über dem höchsten des Ziels.
 * Gibt `{ error }` oder `{ to, from, card, moved, z }` zurück (`from` der Quellstapel oder `null`, `card` die lose Karte oder `null`).
 */
export function planMerge(boardState, msg) {
  const to = boardState.stacks.find(s => stackIdOf(s) === msg.to_stack_id);
  if (!to) return { error: NO_STACK };
  let from = null;
  let card = null;
  let moved;
  if (msg.from_stack_id !== undefined) {
    from = boardState.stacks.find(s => stackIdOf(s) === msg.from_stack_id);
    if (!from || from === to) return { error: NO_STACK };
    const byId = new Map(from.cards.map(c => [c.tableId, c]));
    const o = msg.order;
    const fits = Array.isArray(o) && o.length === from.cards.length && new Set(o).size === o.length && o.every(id => byId.has(id));
    moved = fits ? o.map(id => byId.get(id)) : [...from.cards];
  } else if (msg.from_table_id !== undefined) {
    card = boardState.cards.find(c => c.tableId === msg.from_table_id);
    if (!card) return { error: 'Diese Karte liegt nicht lose auf dem Tisch.' };
    moved = [card];
  } else {
    return { error: NO_STACK };
  }
  const base = to.cards.reduce((m, c) => Math.max(m, Number(c?.zIndex) || 0), 0) + 1;
  return { to, from, card, moved, z: zOrder(msg.z_index, moved.length, base) };
}

/** Den geprüften Merge anwenden: die Karten liegen oben auf dem Ziel, die Quelle (Stapel oder lose Karte) ist weg. */
export function applyMerge(boardState, { to, from, card, moved, z }) {
  to.cards = [...to.cards, ...moved.map((c, i) => asStackCard(c, z[i]))];
  syncStackIds(to);
  if (from) boardState.stacks = boardState.stacks.filter(s => s !== from);
  else boardState.cards = boardState.cards.filter(c => c !== card);
}
