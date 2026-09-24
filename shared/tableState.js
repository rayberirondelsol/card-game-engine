/**
 * Liegt auf diesem Tisch ueberhaupt etwas? (Spec M9.2)
 *
 * Der Befund: `/play/<gameId>` oeffnete einen leeren Tisch mit "Auto-save: ON",
 * und binnen Sekunden war der einzige Speicherstand leer – zweimal in einer
 * Sitzung, einmal samt der drei Dauerstapel.
 *
 * **Leer heisst keine Objekte**, nicht "keine Aenderung". `camera`,
 * `background`, `stackNames` und `maxZIndex` stehen in jedem Spielstand, auch
 * im leeren; sie zaehlen nicht mit. Ein Tisch, auf dem nur gepannt wurde, ist
 * nicht leer – er hat Objekte.
 *
 * Hier in `shared/`, weil beide Seiten dieselbe Frage stellen: die Route
 * `POST /api/games/:id/saves/auto` (die die Regel durchsetzt – nur sie kennt
 * den *gespeicherten* Stand) und `GameTable.jsx` (das sich die sinnlose
 * Anfrage spart). Zwei Listen der Objektarten waeren zwei Antworten, und die
 * bisherige im Client hatte vier Luecken: `customDice`, `hitDice`,
 * `textFields`, `boards`.
 */

/**
 * Die Objektlisten eines Spielstands, so wie `getGameState()` ihn schreibt.
 * Wer eine neue Objektart am Tisch einfuehrt, traegt sie hier ein – sonst gilt
 * ein Tisch, auf dem nur sie liegt, als leer.
 */
export const TABLE_OBJECT_KEYS = [
  'cards',
  'stacks',
  'hand',
  'counters',
  'dice',
  'hitDice',
  'customDice',
  'notes',
  'tokens',
  'boards',
  'textFields',
];

/**
 * Wie viele Objekte liegen auf dem Tisch?
 *
 * @param {object|string|null} state Spielstand als Objekt oder als JSON-Text
 *   (der Server speichert ihn als Text).
 * @returns {number} 0, wenn nichts da ist oder sich nichts lesen laesst.
 */
export function tableObjectCount(state) {
  let data = state;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      return 0;
    }
  }
  if (!data || typeof data !== 'object') return 0;

  let count = 0;
  for (const key of TABLE_OBJECT_KEYS) {
    const list = data[key];
    if (Array.isArray(list)) count += list.length;
  }
  return count;
}

/** Liegt nichts auf dem Tisch? Unlesbares gilt als leer und darf nichts ueberschreiben. */
export function isEmptyTableState(state) {
  return tableObjectCount(state) === 0;
}
