// M2.11 – die Objekttypen, die der Tisch zeichnet, an einer Stelle.
//
// Seit M2.11 ist das Kontextmenü der einzige Weg zum Löschen (das Kreuz auf den
// Objekten ist abgeschafft). Ein Typ, der in der Löscher-Tabelle fehlt, wäre
// damit unlöschbar – genau das Muster aus docs/audit-dead-controls.md, wo
// `customDie` schon einmal nicht in der Liste stand. Deshalb liegen Liste und
// Tabellen hier und nicht als drei parallele if/else-Ketten in GameTable.jsx.
//
// Geprüft in server/test/object-types.test.js (der Client hat keine
// Testinfrastruktur, siehe CLAUDE.md).

/** Typ → Zustandsliste. `state` sind die Arrays aus GameTable. */
export function objectLists(state) {
  return {
    counter: state.counters,
    die: state.dice,
    customDie: state.customDice,
    hitDie: state.hitDice,
    note: state.notes,
    token: state.tokens,
    board: state.boards,
    textField: state.textFields,
  };
}

/** Typ → Löscher `(id) => void`. Jeder Typ braucht hier einen Eintrag. */
export function objectDeleters(fns) {
  return {
    counter: fns.deleteCounter,
    die: fns.deleteDie,
    customDie: fns.deleteCustomDie,
    hitDie: fns.deleteHitDie,
    note: fns.deleteNote,
    token: fns.deleteToken,
    board: fns.deleteBoard,
    textField: fns.deleteTextField,
  };
}

/** Die eine Liste. Abgeleitet, damit sie nicht neben `objectLists` verwelkt. */
export const TABLE_OBJECT_TYPES = Object.keys(objectLists({}));
