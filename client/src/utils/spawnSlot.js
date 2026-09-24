/**
 * Wo ein neu angelegtes Ding erscheint (Spec M10.5).
 *
 * Der Befund aus der dritten Solopartie: drei Wuerfel lagen am Ende auf dem
 * Tisch, **zwei davon deckungsgleich** – ein Wurf war nicht auswertbar, weil
 * nicht zu erkennen war, welcher gerollt hatte. Drei Proben mussten wiederholt
 * werden.
 *
 * `createDie`, `placeCustomDie` und `createHitDie` rechneten
 * `canvas.width / 2 + (Math.random() − 0.5) * 100`: eine **Bildschirm**breite
 * als **Welt**koordinate, plus Zufall. Wer weit gepannt hatte, legte den
 * Wuerfel ausser Sicht; und der Zufall verhindert kein Uebereinanderliegen, er
 * macht es nur unvorhersagbar (notiert in `docs/tasks-ebenen.md` Z7).
 *
 * **Warum nicht `shelfSlot` (M8.1, M8.6).** Die Ablagereihe liegt an einer
 * festen Weltstelle (250,300)…(700,1200). M10.5 Abnahme 2 verlangt den
 * sichtbaren Bildausschnitt – die Reihe kommt also mit, die Stelle nicht.
 *
 * **Warum kein gemeinsamer Zaehler.** Z7 vermutet einen Zaehler ueber Wuerfel,
 * eigene Wuerfel, Trefferwuerfel und Zaehler. Ueber die drei Wuerfelsorten
 * stimmt das, ueber die Zaehler nicht: die liegen auf der **absoluten** Reihe,
 * Wuerfel **relativ zur Blickmitte** – ein gemeinsamer Zaehler verschoebe die
 * Zaehler, sobald Wuerfel im Spiel sind, und das bricht Abnahme 3. Und ein
 * Zaehler ist ohnehin das schwaechere Mittel: wer zwei anlegt und einen
 * loescht, bekommt vom Zaehler Platz 2, und der dritte Wuerfel laege auf dem
 * zweiten. Gefragt wird deshalb die **Liste**, nicht ein Zaehler.
 *
 * Reine Logik, weil der Client keine Testinfrastruktur hat; geprueft aus
 * `server/test/spawn-slot.test.js`.
 */

/** Abstand der Plaetze. Der groesste Wuerfelkasten ist 80 x 96 (`WIDGET_BOX`). */
export const SPAWN_STEP = 80;
export const SPAWN_COLS = 5;
export const SPAWN_ROWS = 5;

/**
 * Die Versatzstuecke, nach Abstand zur Mitte geordnet: der erste Platz ist die
 * Mitte selbst, danach wird nach aussen gefuellt. Einmal gerechnet.
 */
const OFFSETS = (() => {
  const list = [];
  for (let row = 0; row < SPAWN_ROWS; row++) {
    for (let col = 0; col < SPAWN_COLS; col++) {
      list.push({
        dx: (col - (SPAWN_COLS - 1) / 2) * SPAWN_STEP,
        dy: (row - (SPAWN_ROWS - 1) / 2) * SPAWN_STEP,
      });
    }
  }
  return list
    .map((o, index) => ({ ...o, index }))
    .sort((a, b) => a.dx * a.dx + a.dy * a.dy - (b.dx * b.dx + b.dy * b.dy) || a.index - b.index);
})();

/**
 * Der erste freie Platz um `center`.
 *
 * @param {{x: number, y: number}} center Die Blickmitte in Weltkoordinaten.
 * @param {Array<{x: number, y: number}>} taken Was dort schon liegt – bei
 *   Wuerfeln **alle drei Sorten**, sonst faengt jede Sorte bei der Mitte an.
 * @returns {{x: number, y: number}}
 */
export function spawnSlot(center, taken) {
  const cx = Number(center?.x) || 0;
  const cy = Number(center?.y) || 0;
  const busy = (Array.isArray(taken) ? taken : []).filter(
    t => Number.isFinite(Number(t?.x)) && Number.isFinite(Number(t?.y)),
  );

  const free = OFFSETS.find(({ dx, dy }) =>
    !busy.some(t => Math.abs(Number(t.x) - (cx + dx)) < SPAWN_STEP / 2
      && Math.abs(Number(t.y) - (cy + dy)) < SPAWN_STEP / 2),
  );

  // Ist alles belegt, bricht es um statt ins Unendliche zu wandern – dieselbe
  // Entscheidung wie M8.1 und M8.6: sichtbar zu bleiben ist mehr wert als
  // ueberschneidungsfrei zu liegen.
  // ponytail: lineare Suche ueber 25 Plaetze x Wuerfel. Bei Hunderten von
  // Wuerfeln ein Index, aber so viele passen ohnehin nicht ins Bild.
  const slot = free || OFFSETS[busy.length % OFFSETS.length];
  return { x: cx + slot.dx, y: cy + slot.dy };
}
