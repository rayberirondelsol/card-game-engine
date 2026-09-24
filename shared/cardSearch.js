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
 *
 * Liegt seit M8.8 in `shared/` und nicht mehr unter `client/src/utils/`: der
 * Schritt `place_card` im Executor sucht mit derselben Normalisierung, und
 * `client/` gibt es im Server-Image nicht (`CLAUDE.md`, Abschnitt `shared/`).
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

/**
 * Die **eine** Karte, die `query` benennt (M8.8). Eine Suche darf grosszuegig
 * sein, ein Aufbauschritt nicht: `place_card` legt eine Karte bei Namen, und
 * wenn der Name auf drei Karten passt, ist ein Zufallsgriff schlimmer als
 * keine Karte.
 *
 * **Zwei Stufen, exakt vor grosszuegig.** Gleichheit auf `squashName` trifft
 * jeden von Hand bereinigten Namen (wie die 33 Gelaendekarten aus M8.3) – und
 * trifft ihn auch dann eindeutig, wenn eine andere Karte ihn als Teilwort
 * enthaelt (`Zaun` neben `Holzzaun`). Erst wenn das leer bleibt, greift
 * `matchesCardSearch`, damit die kaputten OCR-Namen erreichbar bleiben; genau
 * daran ist „The Rooty Tooter" in der Partie gescheitert.
 *
 * **Mehrere Treffer sind nicht automatisch ein Fehler.** In einem Deck aus drei
 * Erweiterungen sind Dubletten der Normalfall, und jedes Exemplar derselben
 * Karte ist richtig. Dieselbe Karte erkennt man an ihrem `image_path` – kein
 * Aehnlichkeitsrechner, ein Vergleich. Verschiedene Bilder heissen: die
 * Anfrage ist mehrdeutig, und dann wird gemeldet statt gegriffen.
 *
 * @returns {{card: object|null, reason: ?string, ambiguous?: boolean}}
 */
export function findCardByName(cards, query) {
  const wanted = String(query ?? '').trim();
  // Ohne Anfrage passt bei `matchesCardSearch` jeder Name (M8.5, Abnahme 5).
  // Hier darf daraus nicht "die erste Karte der Bibliothek" werden.
  if (!wanted) return { card: null, reason: 'no card name given' };

  const list = Array.isArray(cards) ? cards : [];
  const squashed = squashName(wanted);
  const exact = list.filter(c => squashName(c?.name) === squashed);
  const hits = exact.length ? exact : list.filter(c => matchesCardSearch(c?.name, wanted));

  if (!hits.length) return { card: null, reason: `no card named "${wanted}"` };
  if (hits.length === 1) return { card: hits[0], reason: null };

  if (new Set(hits.map(c => c?.image_path)).size > 1) {
    const names = [...new Set(hits.map(c => String(c?.name ?? '').trim()))];
    return { card: null, ambiguous: true, reason: `"${wanted}" matches ${hits.length} cards: ${names.join(', ')}` };
  }
  return { card: hits[0], reason: `"${wanted}" has ${hits.length} copies, took the first` };
}
