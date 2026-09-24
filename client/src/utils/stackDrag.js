/**
 * Ein Stapel ist **ein** Ding auf dem Tisch (Spec M9.4).
 *
 * Am Tisch gibt es keine getrennte Stapelliste: `tableCards` traegt alle
 * Karten, und ein Stapel ist nichts als ein gemeinsames Feld `inStack`. Die
 * Trennung in `cards` und `stacks[].cards` entsteht erst in `getGameState`
 * beim Speichern. Wer also die Belegung einer Zone zaehlt, zaehlt ohne
 * Zutun **jede Karte einzeln** - ein Aktionsdeck mit fuenfzehn Karten fuellte
 * eine Zone mit `capacity: 1` fuenfzehnfach, und `snapInto` bekam fuenfzehn
 * belegte Plaetze statt einem.
 *
 * Das ist dieselbe Regel wie M9.4 Abnahme 1 ("bewegt ihn samt aller Karten"),
 * einmal weitergedacht: was sich als ein Ding bewegt, zaehlt als ein Ding.
 *
 * Reine Logik, weil der Client keine Testinfrastruktur hat (CLAUDE.md);
 * geprueft aus `server/test/stack-drag.test.js`.
 */

/**
 * Die Karten als Belegungen: je Stapel ein Vertreter, lose Karten wie sie
 * sind, Reihenfolge erhalten.
 *
 * Der Vertreter ist die **erste** Karte des Stapels in der Liste, nicht die
 * oberste. Gesucht ist die Lage, und alle Karten eines Stapels liegen auf
 * demselben Punkt - `zoneContains` bekaeme von jeder dieselbe Antwort.
 */
export function zoneOccupants(cards) {
  const seen = new Set();
  const out = [];
  for (const c of Array.isArray(cards) ? cards : []) {
    if (!c) continue;
    if (!c.inStack) { out.push(c); continue; }
    if (seen.has(c.inStack)) continue;
    seen.add(c.inStack);
    out.push(c);
  }
  return out;
}
