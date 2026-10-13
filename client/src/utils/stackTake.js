/**
 * Eine einzelne Karte aus einem Stapel nehmen (Spec M17.2).
 *
 * Der Befund der neunten Solopartie: „Browse" auf dem Nachschubstapel zeigte
 * 25 Rückseiten, und ein Klick auf eine Karte tat nichts. Der einzige Weg
 * hinein war „Take Top Card" — der nimmt nur die oberste, legt sie verdeckt
 * daneben, und dreimal abgehoben war die Stapelreihenfolge zerlegt. Der
 * Karteneffekt (*Ausbuddeln!*, „nimm das erste Mitbringsel vom Nachschub") ist
 * daran verfallen, und vier weitere Karten verlangen dieselbe Suche.
 *
 * **Der Rest bleibt, wie er liegt.** Die übrigen Karten behalten Stapel,
 * Stelle und `zIndex` — die Reihenfolge eines Nachziehstapels ist Spielstand,
 * und ein Durchsehen darf sie nicht anfassen. Nur die genommene Karte ändert
 * sich, und eine letzte verbliebene ist kein Stapel mehr (dieselbe Regel, die
 * `performSplit` schon kennt).
 *
 * **Offen, nicht verdeckt.** Wer sie aus dem Durchsehen herausnimmt, hat sie
 * eben gelesen; sie noch einmal umdrehen zu müssen war genau die Reibung aus
 * F2. Das Durchsehen zeigt die Vorderseiten nur am Hotseat-Tisch (`room ===
 * null`), also nimmt auch nur dort jemand von hier eine Karte heraus.
 *
 * Reine Rechnung, weil der Client keine Testinfrastruktur hat; geprüft aus
 * `server/test/stack-take.test.js`.
 *
 * @param {Array<object>} cards    alle Tischkarten
 * @param {string} tableId         die zu nehmende Karte
 * @param {{x: number, y: number}} spot  wohin sie gelegt wird
 * @returns {Array<object>} die neue Kartenliste – oder `cards` unverändert,
 *   wenn die Karte unbekannt ist oder in keinem Stapel liegt.
 */
export function takeFromStack(cards, tableId, spot) {
  if (!Array.isArray(cards)) return cards;
  const card = cards.find(c => c?.tableId === tableId);
  if (!card?.inStack) return cards;

  const stackId = card.inStack;
  // Ein Stapel aus einer Karte ist keiner mehr.
  const lastOne = cards.filter(c => c?.inStack === stackId).length === 2;
  const top = cards.reduce((max, c) => Math.max(max, Number(c?.zIndex) || 0), 0);

  return cards.map(c => {
    if (c === card) {
      // Das Rasterfeld gehört zur alten Stelle: wer sie verlässt, verliert es,
      // sonst zieht `placeOnGrids` die Karte beim nächsten Laden zurück (M3b).
      return { ...c, inStack: null, x: spot.x, y: spot.y, faceDown: false, zIndex: top + 1, gridId: null, cell: null };
    }
    if (lastOne && c?.inStack === stackId) return { ...c, inStack: null };
    return c;
  });
}
