/**
 * Die Zeichenreihenfolge auf dem Tisch (Spec M8.2, M9.1).
 *
 * Der Befund aus der ersten Solopartie (M8.2): der Boesewicht stand mitten im
 * Gelaendeteil "Ueberwuchertes Maisfeld", war unsichtbar, und jeder Zug an
 * seiner Position bewegte das Gelaendeteil. Beide Sorten trugen `z-20`, und
 * bei gleichem Wert gewinnt, was spaeter im DOM steht.
 *
 * Der Befund aus der zweiten (M9.1): Karten, Wuerfel und Zaehler waren davon
 * nicht erfasst. Karten bekamen ihren z-index aus einer eigenen, bei 1
 * beginnenden Reihe, Wuerfel/Zaehler/Notizen trugen `z-20` – denselben Wert
 * wie der groesste Token, und die Token werden *nach* ihnen gezeichnet. Jedes
 * Brett ueberdeckte sie.
 *
 * Regel: **je groesser die belegte Flaeche, desto weiter hinten.** Ueber die
 * Flaeche und nicht ueber eine Kategorie, weil "Gelaende" keine Eigenschaft
 * ist, die ein Token traegt – die Flaeche steht ohnehin schon da.
 *
 * **Objekte, nicht Flaechen.** M8.2 bildete Flaeche → z-index; alle Stuecke
 * gleicher Groesse bekamen dieselbe Zahl und darunter entschied das DOM. Fuer
 * Karten traegt das nicht: Karten eines Decks sind alle gleich gross, und zwei
 * offen abgelegte Aktionskarten liegen in derselben Zone genau uebereinander
 * (M8.9 Nachtrag 2). Wer oben liegt, sagt allein `card.zIndex`. Deshalb
 * nummeriert die Ordnung jetzt **Objekte**: nach Flaeche absteigend, bei
 * Gleichstand in der uebergebenen Reihenfolge. Das ist derselbe Tie-Break, den
 * M8.2 schon hatte ("bei gleicher Flaeche bleibt es beim bisherigen
 * Verhalten") – nur dass "bisheriges Verhalten" je Sorte etwas anderes heisst:
 * bei Token die DOM-Reihenfolge, bei Karten ihre eigene Reihe. Fuer Token
 * aendert sich nichts Sichtbares.
 *
 * **Nach oben, nicht nach unten.** Die groesste Flaeche behaelt die bisherige
 * `20`, kleinere Stuecke steigen auf 21, 22, … Nach unten waere der Hauptplan
 * (1200x1000, das groesste Stueck am Tisch) unter die Raster- und
 * Widget-Ebenen gerutscht; so kann nichts darunterfallen, weil der bisherige
 * Wert der Fussboden ist. Die Objekte liegen in einem eigenen Stapelkontext
 * (`world-transform-wrapper` traegt ein `transform`), die Bedienleisten bei
 * `z-30`/`z-40` sind von dort nicht erreichbar.
 *
 * Trefferflaeche und Zeichenreihenfolge sind derselbe Wert: was oben liegt,
 * bekommt den Zeiger. Deshalb braucht M8.2 Abnahme 2 ("ein Zug auf der Figur
 * bewegt die Figur") keine zweite Aenderung, und M2.13 (Pannen ueber
 * gesperrten Objekten) bleibt unberuehrt – `canStartPan` fragt
 * `[data-locked="true"]` am Ereignisziel, nicht den z-index.
 *
 * Reine Logik hier, weil der Client keine Testinfrastruktur hat; geprueft aus
 * `server/test/token-layer.test.js` und `server/test/table-layer.test.js`.
 */

/** Der bisherige Wert. Kein Tischobjekt faellt darunter. */
export const TOKEN_Z_FLOOR = 20;

/**
 * Die Kaesten der Bedienwidgets. Wuerfel, Zaehler, Notiz und Textfeld tragen
 * keine Masse im Datensatz – ihre Flaeche ist das, was sie zeichnen. Das ist
 * eine **Messung**, keine Sonderregel je Objektart: die Ordnung fragt jedes
 * Ding nach derselben Groesse, sie steht hier nur nicht im Datensatz.
 *
 * Die Zahlen stammen aus den Zeichenstellen in `GameTable.jsx` (`left: x - 35`
 * usw.); das Textfeld hat keinen festen Kasten und bekommt ein Nennmass.
 */
export const WIDGET_BOX = {
  die: { width: 70, height: 70 },
  hitDie: { width: 76, height: 84 },
  customDie: { width: 80, height: 96 },
  counter: { width: 140, height: 80 },
  note: { width: 160, height: 100 },
  textField: { width: 160, height: 40 },
};

/**
 * Die belegte Flaeche eines Dings – mit **denselben** Rueckfaellen, die
 * `GameTable` beim Zeichnen benutzt (`token.width || token.size || 30`).
 * Zwei Rechnungen waeren zwei Antworten: ein Stueck, das anders einsortiert
 * wird, als es aussieht.
 */
export function tokenArea(token) {
  const w = Number(token?.width) || Number(token?.size) || 30;
  const h = Number(token?.height) || Number(token?.size) || w;
  return w * h;
}

/**
 * Baut die Zuordnung Tischobjekt → z-index und gibt sie als Funktion zurueck.
 * Einmal je Aenderung der Liste rechnen, nicht je Objekt.
 *
 * @param {Array<{key: string, width?: number, height?: number, size?: number}>} items
 *   Alle Dinge auf dem Tisch, in der Reihenfolge, die bei **gleicher Flaeche**
 *   gelten soll: Token in DOM-Reihenfolge, Karten nach `card.zIndex`
 *   aufsteigend. `key` traegt ein Praefix je Sorte (`token:`, `card:`, …),
 *   weil zwei Sorten dieselbe `id` tragen koennten.
 * @returns {(key: string) => number}
 */
export function tableLayers(items) {
  const list = Array.isArray(items) ? items : [];
  const ranked = list
    .map((item, index) => ({ item, index }))
    // Die Eingabeposition ausdruecklich als zweites Kriterium, statt sich auf
    // die Stabilitaet von Array#sort zu verlassen.
    .sort((a, b) => tokenArea(b.item) - tokenArea(a.item) || a.index - b.index);

  const byKey = new Map();
  ranked.forEach(({ item }, rank) => {
    if (item?.key != null) byKey.set(item.key, TOKEN_Z_FLOOR + rank);
  });

  return (key) => byKey.get(key) ?? TOKEN_Z_FLOOR;
}
