/**
 * May a pointer press on this target pan the table? (spec M2.13)
 *
 * A locked board that fills the screen used to pin the table down: the pan only
 * started on the canvas or the container and not on `[data-ui-element]` – but
 * boards and tokens carry that attribute themselves – while the object drag
 * bailed out on `obj.locked`. The press fell through both nets and nothing
 * happened at all.
 *
 * The rule: a press on something that cannot be dragged pans the table. The
 * lock is checked *before* the UI-element rejection, so the locked object wins.
 * Locked objects deliberately keep their pointer events – the context menu is
 * the only way to unlock them again.
 *
 * Pure here, so the three callers in GameTable (native mouse, pointer, touch)
 * ask the same place instead of spelling the condition out three times.
 *
 * ── M10.7 / U1 ──────────────────────────────────────────────────────────────
 * Auf dem gefuellten Tisch reicht "nur ueber Leerem und ueber Gesperrtem"
 * nicht: der Spieler musste erst einen garantiert leeren Punkt *suchen*.
 * M10.7 verlangt einen Weg von jeder Stelle aus. Es sind zwei, und beide
 * stehen jetzt **hier** statt daneben:
 *
 * - `button` – die mittlere Maustaste, die gewohnte Geste. Sie war laengst
 *   verdrahtet, aber als `e.button === 1 || …` zweimal *neben* diesem Aufruf.
 *   Zwei Antworten auf dieselbe Frage; ein dritter Weg daneben waere die
 *   dritte gewesen.
 * - `panMode` – der Schwenkmodus aus der Werkzeugleiste, der Weg fuer Tastfeld
 *   und Trackpad. Zwei Finger schieden aus: `handleGlobalTouchStart` belegt
 *   sie bereits doppelt (Kneifzoom, und mit gezogener Karte Drehen um 90°),
 *   und wenn der zweite Finger ankommt, laeuft der Zug des ersten schon. Ein
 *   Langdruck auf leerer Flaeche schied aus, weil leere Flaeche genau das ist,
 *   was der Befund nicht findet.
 */
export function canStartPan(target, canvas, container, { button = 0, panMode = false } = {}) {
  // Der Modus gilt ueberall; ein Schwenk ohne Weg bewegt die Kamera um null,
  // ein Klick auf die Werkzeugleiste bleibt also ein Klick.
  if (panMode) return true;
  if (button === 1) return true;
  // Rechts oeffnet das Kontextmenue, die vierte und fuenfte Taste tun nichts.
  if (button !== 0) return false;
  if (!target || typeof target.closest !== 'function') return false;
  if (target.closest('[data-locked="true"]')) return true;
  if (target !== canvas && target !== container) return false;
  return !target.closest('[data-ui-element]') && !target.closest('[data-table-card]');
}
