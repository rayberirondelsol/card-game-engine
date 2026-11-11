/**
 * Die reinen Teile der privaten Hand im Raum (Spec M32.6): was ein Tisch aus den Nachrichten des Servers
 * macht. Der Server hält die Hand (`room.hands`) und ist ihre einzige Quelle; der Client wendet die
 * Rückmeldung an, **keine optimistische Änderung**. `GameTable.jsx` ruft diese Funktionen nur noch auf
 * (der Client hat keine Testinfrastruktur, geprüft aus `server/test/room-hand-client.test.js`).
 */

/**
 * `card_play_from_hand` bei **allen** Tischen: die ausgespielte Karte kommt an die Stelle, die der Server
 * gesetzt hat – mit der **Seite, die er gesetzt hat** (`faceDown` aus der Nachricht; fehlt es: offen, wie
 * bisher). Der Server legt eine Karte in der Hand-Zone verdeckt ab; die alte Anwendung machte jede
 * empfangene Karte offen und gab damit die Vorderseite frei.
 *
 * Dieselbe `tableId` schon am Tisch → keine Doppelung, die Liste kommt unverändert zurück.
 *
 * @param {object[]} cards  Tischkarten
 * @param {{ card?: object, x?: number, y?: number }} msg
 * @param {number} maxZ     höchster `zIndex` am Tisch
 * @returns {object[]}
 */
export function playedCard(cards, msg, maxZ) {
  const card = msg?.card;
  if (!card || !Array.isArray(cards) || cards.some(c => c?.tableId === card.tableId)) return cards;
  return [...cards, {
    ...card,
    x: card.x ?? msg.x,
    y: card.y ?? msg.y,
    inStack: null,
    faceDown: card.faceDown === true,
    rotation: card.rotation ?? 0,
    zIndex: (Number(maxZ) || 0) + 1,
  }];
}

/** Ist die Nachricht das Echo der eigenen Tat? (Dann gibt die Rückmeldung die Karte aus der Hand frei.) */
export function isOwnEcho(msg, myPlayerId) {
  return msg?.from_player_id != null && msg.from_player_id === myPlayerId;
}

/** Die Hand ohne diese Karte; eine unbekannte Id ändert nichts (dieselbe Liste). */
export function removeHandCard(hand, handId) {
  if (!Array.isArray(hand)) return [];
  return hand.some(c => c.handId === handId) ? hand.filter(c => c.handId !== handId) : hand;
}

/**
 * `stack_size_update { stack_id, size, removed }`: jemand hat gezogen – die Karten mit diesen Ids sind aus
 * dem Stapel (und vom Tisch). Die Nachricht trägt nur Ids, keinen Namen und kein Bild. Bleibt **eine** Karte
 * im Stapel, ist es keiner mehr (`inStack: null`, die Regel von `performSplit`). Unbekannte Ids ändern
 * nichts (dieselbe Liste). `stack_removed` (die letzte Karte) bleibt Sache des bestehenden Falls.
 */
export function removeDrawn(cards, msg) {
  const ids = Array.isArray(msg?.removed) ? new Set(msg.removed) : null;
  if (!ids || !Array.isArray(cards) || !cards.some(c => ids.has(c?.tableId))) return cards;
  const rest = cards.filter(c => !ids.has(c?.tableId));
  const inStack = rest.filter(c => c?.inStack === msg.stack_id);
  return inStack.length === 1 ? rest.map(c => (c === inStack[0] ? { ...c, inStack: null } : c)) : rest;
}

/**
 * Handkarten aus `welcome.hand` und `draw_response`: mit der **`handId` des Servers** (fehlt sie: eine neue),
 * damit ein Neuladen dieselben Karten zeigt und `card_play_from_hand` sie beim Namen nennen kann.
 */
export function handFromServer(cards) {
  if (!Array.isArray(cards)) return [];
  return cards.map(card => ({
    handId: card.handId || crypto.randomUUID(),
    cardId: card.cardId ?? card.id,
    name: card.name,
    image_path: card.image_path,
    card_back_id: card.card_back_id || null,
    width: card.width || 0,
    height: card.height || 0,
  }));
}

/**
 * Die Hand mit neuen Karten vom Server (`draw_response`, `welcome.hand` → `handFromServer`). Die `handId` ist
 * die des Servers: dieselbe Karte, die noch einmal kommt (ein verspätetes Echo), doppelt sich nicht. Gibt es
 * nichts Neues, kommt **dieselbe** Hand zurück.
 */
export function addToHand(hand, cards) {
  const base = Array.isArray(hand) ? hand : [];
  if (!Array.isArray(cards)) return base;
  const have = new Set(base.map(c => c.handId));
  const fresh = cards.filter(c => !have.has(c.handId));
  return fresh.length ? [...base, ...fresh] : base;
}

/**
 * Was „Pick up to hand“ im Raum an den Server schickt: lose Karten einzeln (`card_pickup_to_hand`), Karten **im
 * Stapel** als **ein** Zug je Stapel (`card_draw_to_hand { stack_id, count }`) – der Server nimmt die obersten
 * Karten, und ein Stapel, dessen vorletzte Karte gezogen ist, löst sich auf (zwei Einzelzüge liefen ins Leere).
 * Unbekannte Ids und Doppelte zählen nicht; die Eingabe bleibt unverändert.
 *
 * @param {object[]} cards  Tischkarten
 * @param {Iterable<string>} ids  `tableId`s
 * @returns {{ pickups: string[], draws: { stack_id: string, count: number }[] }}
 */
export function pickupPlan(cards, ids) {
  const plan = { pickups: [], draws: [] };
  if (!Array.isArray(cards)) return plan;
  const seen = new Set();
  for (const id of ids || []) {
    if (seen.has(id)) continue;
    seen.add(id);
    const card = cards.find(c => c?.tableId === id);
    if (!card) continue;
    if (!card.inStack) { plan.pickups.push(id); continue; }
    const draw = plan.draws.find(d => d.stack_id === card.inStack);
    if (draw) draw.count += 1;
    else plan.draws.push({ stack_id: card.inStack, count: 1 });
  }
  return plan;
}
