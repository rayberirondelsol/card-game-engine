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

/**
 * Typ → Zustandsschreiber (`setX` aus `useState`). Jeder Typ braucht hier einen
 * Eintrag.
 *
 * M11.3: Ziehen und Sperren standen als zwei parallele if/else-Ketten in
 * GameTable.jsx. Ein Typ, der in einer davon fehlt, ist unbeweglich bzw.
 * unsperrbar — und im JSX sieht er fertig verdrahtet aus, weil `onMouseDown`
 * und `onTouchStart` dranhängen. Dieselbe Klasse wie der fehlende
 * `customDie`-Zweig aus docs/audit-dead-controls.md Fund 3, nur an der
 * Bewegung statt am Löschen.
 */
export function objectSetters(fns) {
  return {
    counter: fns.setCounters,
    die: fns.setDice,
    customDie: fns.setCustomDice,
    hitDie: fns.setHitDice,
    note: fns.setNotes,
    token: fns.setTokens,
    board: fns.setBoards,
    textField: fns.setTextFields,
  };
}

/**
 * Ein Objekt der Liste an eine neue Stelle setzen.
 *
 * `attachedTo` nur, wo es eins gibt: ein an eine Karte geheftetes Token hängt
 * nach dem Ziehen an nichts mehr (M2.9), ein Würfel hat das Feld gar nicht und
 * bekäme es sonst hier erfunden — und stünde damit im gespeicherten Spielstand.
 */
export function moveObject(list, id, x, y) {
  return (Array.isArray(list) ? list : []).map(o => (
    o?.id === id
      ? { ...o, x, y, ...('attachedTo' in o ? { attachedTo: null } : {}) }
      : o
  ));
}

/** Die eine Liste. Abgeleitet, damit sie nicht neben `objectLists` verwelkt. */
export const TABLE_OBJECT_TYPES = Object.keys(objectLists({}));
