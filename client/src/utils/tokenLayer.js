/**
 * Die Zeichenreihenfolge der Tisch-Token (Spec M8.2).
 *
 * Der Befund aus der Solopartie: der Boesewicht stand mitten im Geländeteil
 * "Ueberwuchertes Maisfeld", war unsichtbar, und jeder Zug an seiner Position
 * bewegte das Gelaendeteil. Beide Sorten tragen `z-20`, und bei gleichem Wert
 * gewinnt, was spaeter im DOM steht.
 *
 * Regel: **je groesser die belegte Flaeche, desto weiter hinten.** Ueber die
 * Flaeche und nicht ueber eine Kategorie, weil "Gelaende" keine Eigenschaft
 * ist, die ein Token traegt – die Flaeche steht ohnehin schon da. Bei gleicher
 * Flaeche entscheidet weiter das DOM.
 *
 * **Nach oben, nicht nach unten.** Die groesste Flaeche behaelt die bisherige
 * `20`, kleinere Stuecke steigen auf 21, 22, … Nach unten waere der Hauptplan
 * (1200x1000, das groesste Stueck am Tisch) unter die Raster- und
 * Widget-Ebenen gerutscht; so kann nichts darunterfallen, weil der bisherige
 * Wert der Fussboden ist. Die Token liegen in einem eigenen Stapelkontext
 * (`world-transform-wrapper` traegt ein `transform`), die Bedienleisten bei
 * `z-30`/`z-40` sind von dort nicht erreichbar.
 *
 * Trefferflaeche und Zeichenreihenfolge sind derselbe Wert: was oben liegt,
 * bekommt den Zeiger. Deshalb braucht Abnahme 2 ("ein Zug auf der Figur bewegt
 * die Figur") keine zweite Aenderung, und M2.13 (Pannen ueber gesperrten
 * Objekten) bleibt unberuehrt – `canStartPan` fragt `[data-locked="true"]` am
 * Ereignisziel, nicht den z-index.
 *
 * Reine Logik hier, weil der Client keine Testinfrastruktur hat; geprueft aus
 * `server/test/token-layer.test.js`.
 */

/** Der bisherige Wert. Kein Token faellt darunter. */
export const TOKEN_Z_FLOOR = 20;

/**
 * Die belegte Flaeche eines Tokens – mit **denselben** Rueckfaellen, die
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
 * Baut die Zuordnung Flaeche → z-index fuer eine Tokenliste und gibt sie als
 * Funktion zurueck. Einmal je Aenderung der Liste rechnen, nicht je Token.
 */
export function tokenLayers(tokens) {
  const areas = [...new Set((Array.isArray(tokens) ? tokens : []).map(tokenArea))]
    .sort((a, b) => b - a);
  const byArea = new Map(areas.map((area, rank) => [area, TOKEN_Z_FLOOR + rank]));
  return (token) => byArea.get(tokenArea(token)) ?? TOKEN_Z_FLOOR;
}
