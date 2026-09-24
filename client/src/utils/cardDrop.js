/**
 * Wem eine abgelegte Karte beitritt (Spec M10.4).
 *
 * Der Befund aus der dritten Solopartie: eine abgelegte Karte wurde mit einer
 * darunterliegenden still zu einem Stapel zusammengefasst – dreimal in einer
 * Partie, einmal mit Folge. Die aufgedeckte Aktionskarte rutschte vom
 * Ablagestapel in den Verhaltensstapel zurueck, 11 wieder auf 12. Wer die Zahl
 * am Stapel nicht im Auge behaelt, merkt es nicht.
 *
 * **Die Ursache ist nicht die Geste, sondern ihre Frage.** Beide Zweige in
 * `handleCardDragEnd` fragten einen Mittelpunktsabstand:
 *
 *     dist = |Karte − anderes Ding| < 80
 *
 * Eine Karte ist am Tisch 100 x 140 (`getCardDims`), das Raster ist 80 breit
 * (`GRID_SIZE`). 80 Pixel Abstand in der Breite heissen **20 Pixel
 * Ueberlappung** – die Karten liegen sichtbar nebeneinander und verschmelzen
 * trotzdem; das Nachbarfeld des Rasters liegt genau auf der Schwelle. Und
 * gefragt wurde die *ungerasterte* Loslassstelle, obwohl der Zonenplatz zwei
 * Zeilen darueber schon ausgerechnet war und danach verworfen wurde. So faellt
 * eine Karte, die auf die `Ablage` gelegt wurde, in den Nachziehstapel daneben.
 *
 * Die Frage lautet jetzt: **liegt die Karte am Ende auf dem Stapel?** Gefragt
 * wird mit der Stelle, die die Karte wirklich einnimmt (Zonenplatz, sonst
 * Rasterfeld), gegen die **Flaeche** des Stapels. Wer wirklich darauf legt,
 * rastet auf dessen Stelle ein und tritt bei; wer aufs Nachbarfeld legt, liegt
 * 80 Pixel daneben und bleibt eine eigene Karte. Eine Regel statt zweier, und
 * ohne dass irgendwo "Zone" stehen muss.
 *
 * Karte auf Karte gruendet gar keinen Stapel mehr – dafuer gibt es `G`
 * (`groupSelectedCards`). Deshalb kennt diese Funktion nur Stapel.
 *
 * Reine Logik, weil der Client keine Testinfrastruktur hat; geprueft aus
 * `server/test/card-drop.test.js`.
 */

import { CARD_WIDTH, CARD_HEIGHT, getCardDims } from './cardDims.js';

/**
 * Der Stapel, auf dem `point` liegt.
 *
 * @param {{x: number, y: number}} point Weltkoordinaten der **endgueltigen**
 *   Stelle der Karte, nicht der Loslassstelle.
 * @param {Array<{id: string, x: number, y: number, w?: number, h?: number}>} stacks
 *   Je Stapel ein Eintrag mit seiner Stelle und den Anzeigemassen seiner
 *   obersten Karte. Ohne Masse gelten die Tischmasse 100 x 140.
 * @returns {string|null} Die `id` des getroffenen Stapels, sonst `null`.
 */
export function stackAt(point, stacks) {
  const px = Number(point?.x);
  const py = Number(point?.y);
  if (!Number.isFinite(px) || !Number.isFinite(py)) return null;

  let best = null;
  for (const s of Array.isArray(stacks) ? stacks : []) {
    if (s?.id == null) continue;
    const x = Number(s.x);
    const y = Number(s.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    const w = Number(s.w) || CARD_WIDTH;
    const h = Number(s.h) || CARD_HEIGHT;
    const dx = px - x;
    const dy = py - y;
    if (Math.abs(dx) > w / 2 || Math.abs(dy) > h / 2) continue;

    // Der naehere Mittelpunkt gewinnt – derselbe Tie-Break wie `pickTopmost`
    // (M10.1). Bisher gewann der erste in Listenreihenfolge, also die
    // Einfuegereihenfolge.
    const dist = dx * dx + dy * dy;
    if (best === null || dist < best.dist) best = { id: s.id, dist };
  }

  return best && best.id;
}

/**
 * Die Kandidatenlisten fuer `stackAt` (Spec M10.9, Aufgabe U6).
 *
 * `stackCandidates` stand als `dropCandidates` in `GameTable.jsx` und war
 * damit ungeprueft. `looseCandidates` ist die Schwester fuer lose Karten: seit
 * M10.4 gruendet ein Ablegen keinen Stapel mehr, und der **absichtliche** Weg –
 * beim Ablegen halten, oder der Eintrag im Kartenmenue – fragt dieselbe Frage
 * wie das Beitreten zu einem Stapel. Eine zweite Geometrie waere eine zweite
 * Antwort; beide Listen gehen darum in dasselbe `stackAt`.
 */

/** Die Menge der ausgeschlossenen Karten, aus Set, Array oder nichts. */
function excluded(ids) {
  if (ids instanceof Set) return ids;
  return new Set(Array.isArray(ids) ? ids : []);
}

/**
 * Je Stapel ein Eintrag, mit Stelle und Anzeigemassen seiner Karten. Der
 * eigene Stapel ist nie dabei.
 */
export function stackCandidates(cards, ownStackId) {
  const seen = new Map();
  for (const c of Array.isArray(cards) ? cards : []) {
    if (!c?.inStack || c.inStack === ownStackId || seen.has(c.inStack)) continue;
    const { w, h } = getCardDims(c);
    seen.set(c.inStack, { id: c.inStack, x: c.x, y: c.y, w, h });
  }
  return [...seen.values()];
}

/**
 * Je lose Karte ein Eintrag. Karten in einem Stapel gehoeren in
 * `stackCandidates`, die gezogene und ihre Mitgezogenen stehen in `excludeIds`.
 */
export function looseCandidates(cards, excludeIds) {
  const skip = excluded(excludeIds);
  const out = [];
  for (const c of Array.isArray(cards) ? cards : []) {
    if (!c || c.inStack || skip.has(c.tableId)) continue;
    const { w, h } = getCardDims(c);
    out.push({ id: c.tableId, x: c.x, y: c.y, w, h });
  }
  return out;
}
