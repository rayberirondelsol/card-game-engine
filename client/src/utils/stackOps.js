/**
 * Stapelgriffe im Raum – was ein Tisch aus den Rückmeldungen des Servers macht (docs/tasks-stapel-raum.md).
 *
 * Im Raum ist jeder Stapelgriff ein **Wunsch an den Server**; der Tisch ändert sich erst mit der Rückmeldung, die an
 * **alle** geht, auch an den Absender (Entscheidung 1). Darum gibt es hier genau **eine** Anwendung je Nachricht, und
 * sie ist für den Absender dieselbe wie für jeden anderen. Der Tisch führt keine getrennte Stapelliste: `tableCards`
 * trägt alle Karten, ein Stapel ist ein gemeinsames Feld `inStack`, seine Reihenfolge ist `zIndex`.
 *
 * Reine Rechnung (der Client hat keine Testinfrastruktur, `CLAUDE.md`); geprüft aus `server/test/room-stacks-client.test.js`.
 * Jede Funktion gibt **dieselbe Liste** zurück, wenn sie nichts ändert (ein Echo, das nichts zu tun hat, rendert nichts neu).
 */

/** `stack_flip { stack_id, face_down: { tableId: bool } }`: die absoluten Seiten, die der Server gesetzt hat. */
export function applyStackFlip(cards, msg) {
  const faces = msg?.face_down;
  if (!Array.isArray(cards) || !faces || typeof faces !== 'object') return cards;
  const hit = (c) => c?.inStack === msg.stack_id && Object.hasOwn(faces, c.tableId);
  if (!cards.some(hit)) return cards;
  return cards.map(c => (hit(c) ? { ...c, faceDown: faces[c.tableId] === true } : c));
}

const isNum = Number.isFinite;

/** Gibt es zu jeder `tableId` der Nachricht eine Karte am Tisch? Sonst weiß dieser Tisch nicht, was gemeint ist. */
function known(cards, ids) {
  return Array.isArray(ids) && ids.length > 0 && ids.every(id => cards.some(c => c?.tableId === id));
}

/** Die Karte an Platz `i` von `ids` bekommt dieses Feld aus `z`, sonst behält sie ihren `zIndex`. */
const zAt = (z, i, c) => (Array.isArray(z) && isNum(z[i]) ? z[i] : c.zIndex);

/**
 * `stack_create { stack_id, card_table_ids, z_index, x, y }`: die Karten (unten → oben) bilden einen Stapel an dieser Stelle.
 * Sie kommen lose **oder** aus anderen Stapeln; ein Quellstapel mit einer Restkarte löst sich auf (ein Stapel mit einer
 * Karte ist keiner). Eine vorhandene `stack_id` wird neu gefasst. Das Rasterfeld gilt an der neuen Stelle nicht.
 */
export function applyStackCreate(cards, msg) {
  const ids = msg?.card_table_ids;
  if (!Array.isArray(cards) || typeof msg?.stack_id !== 'string' || !isNum(msg.x) || !isNum(msg.y)
      || !Array.isArray(ids) || ids.length < 2 || !known(cards, ids)) return cards;
  const place = new Map(ids.map((id, i) => [id, i]));
  const sources = new Set(cards.filter(c => place.has(c?.tableId) && c.inStack && c.inStack !== msg.stack_id).map(c => c.inStack));
  const next = cards.map(c => (place.has(c?.tableId)
    ? { ...c, inStack: msg.stack_id, x: msg.x, y: msg.y, zIndex: zAt(msg.z_index, place.get(c.tableId), c), gridId: null, cell: null }
    : c));
  return dissolveLeftovers(next, sources);
}

/** Jeder dieser Stapel mit genau **einer** Karte ist keiner mehr: die Karte liegt lose an seiner Stelle. */
function dissolveLeftovers(cards, stackIds) {
  let out = cards;
  for (const sid of stackIds) {
    const left = out.filter(c => c?.inStack === sid);
    if (left.length === 1) out = out.map(c => (c === left[0] ? { ...c, inStack: null } : c));
  }
  return out;
}

/**
 * `stack_merge { from_stack_id | from_table_id, to_stack_id, card_table_ids, z_index, x, y }`: ein Stapel **oder eine lose
 * Karte** liegt jetzt oben auf dem Zielstapel, an dessen Ort (`x`/`y` nennt der Server), mit den `zIndex` der Nachricht.
 */
export function applyStackMerge(cards, msg) {
  const ids = msg?.card_table_ids;
  if (!Array.isArray(cards) || typeof msg?.to_stack_id !== 'string' || !isNum(msg.x) || !isNum(msg.y) || !known(cards, ids)) return cards;
  const place = new Map(ids.map((id, i) => [id, i]));
  return cards.map(c => (place.has(c?.tableId)
    ? { ...c, inStack: msg.to_stack_id, x: msg.x, y: msg.y, zIndex: zAt(msg.z_index, place.get(c.tableId), c), gridId: null, cell: null }
    : c));
}

/**
 * `stack_take_top { stack_id, new_x, new_y, card }`: die oberste Karte des Stapels liegt lose an der Stelle, mit der Seite
 * und dem `zIndex`, die der Server gesetzt hat (`card` ist die Karte des Servers; „Reveal“ deckt sie auf). Ein Stapel mit
 * einer Restkarte ist keiner mehr. Eine Karte, die dieser Tisch nicht kennt, wird aus der Nachricht gelegt.
 */
export function applyTakeTop(cards, msg) {
  const card = msg?.card;
  if (!Array.isArray(cards) || !card?.tableId) return cards;
  const old = cards.find(c => c?.tableId === card.tableId);
  const next = [...cards.filter(c => c?.tableId !== card.tableId), { ...old, ...card, x: card.x ?? msg.new_x, y: card.y ?? msg.new_y, inStack: null }];
  return dissolveLeftovers(next, [msg.stack_id]);
}

/**
 * `stack_split { stack_id, new_stack_id, card_table_ids, new_x, new_y }`: die genannten obersten Karten (unten → oben)
 * bilden den neuen Stapel an der neuen Stelle, ihr `zIndex` bleibt; ein Rest von einer Karte ist lose.
 */
export function applyStackSplit(cards, msg) {
  const ids = msg?.card_table_ids;
  if (!Array.isArray(cards) || typeof msg?.new_stack_id !== 'string' || !isNum(msg.new_x) || !isNum(msg.new_y) || !known(cards, ids)) return cards;
  const moving = new Set(ids);
  const next = cards.map(c => (moving.has(c?.tableId) ? { ...c, inStack: msg.new_stack_id, x: msg.new_x, y: msg.new_y } : c));
  return dissolveLeftovers(next, [msg.stack_id]);
}

/**
 * Eine Auswahl um `dx`/`dy` verschieben (Zug einer Mehrfachauswahl, `handleCardDragEnd`): die gewählten Karten **und**
 * alle Karten eines Stapels, von dem eine gewählt ist. Sie bewegen sich als Teil von etwas anderem und haben danach kein
 * Rasterfeld. Andere Karten bleiben dasselbe Objekt.
 */
export function moveSelected(cards, selected, dx, dy) {
  const stacks = new Set(cards.filter(c => c.inStack && selected.has(c.tableId)).map(c => c.inStack));
  return cards.map(c => (selected.has(c.tableId) || (c.inStack && stacks.has(c.inStack))
    ? { ...c, x: c.x + dx, y: c.y + dy, gridId: null, cell: null }
    : c));
}

/**
 * Die Nachrichten für denselben Zug im Raum: ein `stack_move` je bewegtem Stapel (nicht je Karte), ein `card_move` je
 * bewegter loser Karte. Ohne sie bliebe der Zug lokal – ein ganzer Stapel gilt beim Greifen als Mehrfachauswahl
 * (docs/audit-dead-controls.md Fund 9).
 */
export function selectionMoveMessages(cards, selected, dx, dy) {
  const seen = new Set();
  const msgs = [];
  moveSelected(cards, selected, dx, dy).forEach((c, i) => {
    if (c === cards[i]) return;
    if (!c.inStack) return msgs.push({ type: 'card_move', table_id: c.tableId, x: c.x, y: c.y, gridId: null, cell: null });
    if (!seen.has(c.inStack)) msgs.push({ type: 'stack_move', stack_id: c.inStack, x: c.x, y: c.y });
    seen.add(c.inStack);
  });
  return msgs;
}
