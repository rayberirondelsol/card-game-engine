/**
 * M6-Nachtrag 2: Der Raum schickt den aufgebauten Brettzustand, der Tisch zeigt
 * ihn an. Hier steckt nur die Entscheidung, *ob* ein eintreffender Zustand
 * angewandt wird — das Anwenden selbst ist `loadGameState` am Tisch.
 *
 * Bewusst ein Referenzvergleich, kein Tiefvergleich: `useGameRoom` legt bei
 * jedem `welcome`/`room_started`/`board_sync` ein neues Objekt in den State und
 * sonst nie. Ein neuer Verweis heißt also genau "eine neue Nachricht vom
 * Server", und das bei jedem Render zu prüfen kostet nichts.
 */
export function shouldApplyBoardState(incoming, lastApplied) {
  if (!incoming) return false;
  return incoming !== lastApplied;
}
