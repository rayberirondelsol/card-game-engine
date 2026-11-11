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
