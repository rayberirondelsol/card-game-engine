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
 */
export function canStartPan(target, canvas, container) {
  if (!target || typeof target.closest !== 'function') return false;
  if (target.closest('[data-locked="true"]')) return true;
  if (target !== canvas && target !== container) return false;
  return !target.closest('[data-ui-element]') && !target.closest('[data-table-card]');
}
