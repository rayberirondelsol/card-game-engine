/**
 * Stapelgriffe im Raum (docs/tasks-stapel-raum.md): die Rechnung auf `room.boardState`, ohne Netz. Der Handler
 * (`websocket/messageHandler.js`) ruft die Wache, rechnet hier und sendet. Ein Stapel ist im Raumzustand
 * `{ stackId, x, y, cards: [unten … oben] }`; seine Karten tragen **keinen** Ort (der Ort ist der des Stapels), wie
 * `getGameState` sie schreibt, und die Reihenfolge im Feld ist die Stapelreihenfolge (`zIndex` steigt mit ihr).
 */

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
