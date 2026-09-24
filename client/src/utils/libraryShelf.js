/**
 * Wo das naechste Ding aus der Bibliothek auf dem Tisch landet (Spec M8.1).
 *
 * Der Befund aus der Solopartie: eine Karte lag auf `y = 14 289`, weit unter
 * dem Tisch. `placeCardOnTable` rechnete die Ablage aus `tableCards.length` –
 * und diese Liste enthaelt **auch jede Karte, die in einem Stapel steckt**.
 * Bei 296 Stapelkarten ist das Zeile 74.
 *
 * Gezaehlt wird, was auf dem Tisch *liegt*: jede freie Karte einzeln, **jeder
 * Stapel einmal**. Die Spec sagt nur "nur frei liegende Karten"; buchstaeblich
 * genommen bekaeme `placeCategoryAsStack` immer denselben Platz, weil ein
 * Stapel die Zahl der freien Karten nicht erhoeht – zwei ausgelegte Kategorien
 * laegen uebereinander. Ein Stapel liegt auf dem Tisch, also belegt er einen
 * Platz.
 *
 * Hier und nicht in `GameTable.jsx`, weil es die einzige entscheidbare Stelle
 * an M8.1 ist und der Client keine Testinfrastruktur hat – dasselbe Muster wie
 * `panTarget.js` und `roomSocketUrl.js`, geprueft aus
 * `server/test/library-shelf.test.js`.
 */

export const SHELF_COLS = 4;
/** Nach sechs Zeilen von vorn: sichtbar zu bleiben ist mehr wert als
 *  ueberschneidungsfrei zu liegen. Ab dem 25. Ding ueberlappt die Reihe. */
export const SHELF_ROWS = 6;
export const SHELF_X = 250;
export const SHELF_Y = 300;
export const SHELF_DX = 150;
export const SHELF_DY = 180;

/** Wie viele Dinge liegen auf dem Tisch: freie Karten plus Stapel. */
export function shelfCount(tableCards) {
  if (!Array.isArray(tableCards)) return 0;
  const stacks = new Set();
  let free = 0;
  for (const card of tableCards) {
    if (card?.inStack) stacks.add(card.inStack);
    else free++;
  }
  return free + stacks.size;
}

/** Der Platz des n-ten Dings in der Ablagereihe. */
export function shelfSlot(index) {
  const n = Number.isFinite(index) && index > 0 ? Math.floor(index) : 0;
  const slot = n % (SHELF_COLS * SHELF_ROWS);
  return {
    x: SHELF_X + (slot % SHELF_COLS) * SHELF_DX,
    y: SHELF_Y + Math.floor(slot / SHELF_COLS) * SHELF_DY,
  };
}
