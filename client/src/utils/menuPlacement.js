/**
 * Where a layer of known size fits in a viewport of known size (spec M2.9).
 *
 * The context menu used to be pinned to the click point and always opened down
 * and to the right, so near the bottom edge its last entries were off screen —
 * the same mistake as M2.8: a layer is placed without measuring whether it fits
 * there. `maxHeight` does not help, it caps the height, not the distance to the
 * edge. Pure here, measuring and applying in GameTable.
 */

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * One axis: open away from the click point as before, flip to the other side
 * only when the flipped position really fits, otherwise keep the click point
 * and push the whole thing into view. Flipping a layer that does not fit on
 * either side would move it away from the click for nothing.
 */
function place(point, size, min, max) {
  const flipped = point - size;
  const keep = point + size <= max || flipped < min;
  return clamp(keep ? point : flipped, min, max - size);
}

/**
 * @param {object} p
 * @param {number} p.x  click point, viewport coordinates (clientX/clientY)
 * @param {number} p.y
 * @param {number} p.width  the menu's natural size, measured unconstrained
 * @param {number} p.height
 * @param {number} p.viewportWidth
 * @param {number} p.viewportHeight
 * @param {number} [p.margin=8]  stays free at every edge
 * @param {{top?:number,right?:number,bottom?:number,left?:number}} [p.insets]
 *   safe-area insets; they belong to the edge, not to the usable area
 * @returns {{left:number, top:number, maxHeight:number|null}}
 *   `maxHeight` is null while the menu fits — only a menu taller than the
 *   usable area gets capped, and then its own `overflow: auto` takes over.
 */
export function menuPlacement({
  x, y, width, height, viewportWidth, viewportHeight, margin = 8, insets = {},
}) {
  const minLeft = margin + (insets.left || 0);
  const minTop = margin + (insets.top || 0);
  const maxRight = viewportWidth - (insets.right || 0) - margin;
  const maxBottom = viewportHeight - (insets.bottom || 0) - margin;

  const left = place(x, width, minLeft, maxRight);
  const top = place(y, height, minTop, maxBottom);

  const usableHeight = Math.max(0, maxBottom - minTop);
  return { left, top, maxHeight: height > usableHeight ? usableHeight : null };
}

/**
 * Schliesst dieser Zeigerdruck das offene Kontextmenue? (Spec M10.12)
 *
 * Bis hierher tat das ein Klickfaenger: ein `fixed inset-0 z-40` unter dem
 * Menue, seit dem allerersten Wurf des Spieltisches. Er lag ueber **allem**,
 * also auch ueber jedem Tischobjekt. Bei offenem Menue traf jeder Zeiger ihn
 * und nichts sonst: der Rechtsklick auf ein anderes Objekt kam dort nie an
 * (das native Browsermenue erschien statt unserem), und auf Berührung startete
 * `handleObjDragStart` nicht, also auch der Langdruck-Zeitgeber aus M2.11
 * nicht. Aus Spielersicht schaltete das Menue um: erster Rechtsklick schliesst,
 * zweiter oeffnet.
 *
 * Die Regel der Spec – "ein Rechtsklick oeffnet das Menue, auch wenn schon
 * eines offen ist" – braucht deshalb keine neue Faehigkeit, sondern den Weg
 * zurueck zum Objekt. Geschlossen wird am `document` statt mit einer Flaeche
 * davor, und `pointerdown` deckt Maus und Finger in einem ab: es laeuft vor
 * `contextmenu`, `mousedown` und `touchstart`, das alte Menue ist also weg,
 * bevor der Handler des Objekts das neue setzt.
 *
 * Die eine Ausnahme ist der Druck **im** Menue. Den erledigt der Eintrag
 * selbst; wer hier schloesse, nähme ihm den Knopf unter dem Finger weg, bevor
 * sein `click` kommt, und die Tat fiele aus.
 *
 * @param {EventTarget|null} target  das Ziel des Zeigerereignisses
 * @param {Node|null} menuEl  das gerenderte Menue, oder null
 */
export function closesMenu(target, menuEl) {
  if (!target || !menuEl) return true;
  return !(target === menuEl || (typeof menuEl.contains === 'function' && menuEl.contains(target)));
}
