/**
 * Die Suche in der Kartenbibliothek (Spec M8.5).
 *
 * Der Befund aus der Solopartie: 1087 Karten in 38 Kategorien und kein einziges
 * Eingabefeld. Gesucht werden muss gegen die Namen aus dem OCR-Textlayer, und
 * die sind auf zwei Arten kaputt: die Leerzeichen sitzen mitten in den Woertern
 * (`HO H LE R`), und **jedes Wort steht doppelt** (`HOHLER HOHLER HEUHAUFEN
 * HEUHAUFEN`).
 *
 * Darum wird der Name zusammengeschoben – aber die **Anfrage wortweise**
 * gestellt. Reines Zusammenschieben findet `heuhaufen` (Abnahme 1) und auch
 * einen zweiteiligen Namen am Stoss der Doppelung, scheitert aber ab drei
 * Woertern: `thetherootyrootytootertooter` enthaelt `therootytooter` nicht.
 * Genau diese Karte ("The Rooty Tooter") blieb in der Partie unauffindbar.
 *
 * Kein Aehnlichkeitsrechner, sondern `every` ueber `includes`. Dass die
 * Reihenfolge dabei egal wird, ist Beifang und stoert nicht.
 *
 * **Nicht** dasselbe wie `norm` in `shared/sequenceExecutor.js`. Dort werden
 * Schritte zugeordnet (Asset, Zone, Raster, Zaehler); waeren dort Leerzeichen
 * egal, waeren "Hand 1" und "Hand1" dieselbe Zone. Die Spec beruft sich auf
 * eine vorhandene Normalisierung "wie bei den 33 Gelaendekarten" – die gibt es
 * nicht, `norm` ist nur `trim().toLowerCase()`.
 *
 * Reine Logik hier, weil der Client keine Testinfrastruktur hat; geprueft aus
 * `server/test/card-search.test.js`.
 */

/** Klein und ohne Leerzeichen – so viel vom OCR-Schaden faellt weg. */
export function squashName(s) {
  return String(s ?? '').toLowerCase().replace(/\s+/g, '');
}

/**
 * Passt `name` zu `query`? Jedes Wort der Anfrage muss im zusammengeschobenen
 * Namen vorkommen. Eine leere Anfrage passt zu allem – ohne Eingabe verhaelt
 * sich die Bibliothek unveraendert (Abnahme 5).
 */
export function matchesCardSearch(name, query) {
  const words = String(query ?? '').trim().split(/\s+/).map(squashName).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = squashName(name);
  return words.every(w => haystack.includes(w));
}
