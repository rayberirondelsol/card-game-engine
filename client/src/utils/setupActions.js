/**
 * Die Aktionsliste eines Setups – alles daran, was nicht React ist
 * (Spec Abschnitt 11 / M5, M7 T7).
 *
 * Eine Aktion ist `{ id, label, steps[] }` und liegt in `setups.action_data`.
 * Gelesen wurde sie bisher an genau einer Stelle und geschrieben nirgends: die
 * vorhandene Aktion kann nur von Hand über die API entstanden sein. Hier steht
 * das Anlegen, Umbenennen, Löschen und Ersetzen der Schritte, damit es geprüft
 * werden kann, ohne einen DOM zu bauen — dieselbe Halbierung wie zoneDraft.js.
 *
 * Jede Funktion gibt eine **neue** Liste zurück und fasst die übergebene nicht
 * an: sie ist React-State. Und jede verträgt `null`/`undefined`, weil
 * `action_data` eines alten Setups genau das sein kann.
 */

/** Dieselbe Erzeugung wie bei Zonen: kurz, kollisionsfrei genug für eine Liste. */
function generateId() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36).slice(-4);
}

const list = (actions) => (Array.isArray(actions) ? actions : []);

/**
 * Eine neue, leere Aktion. Die vorhandenen gehen nur als Zählstand ein — der
 * Vorgabename soll sich von den anderen Knöpfen unterscheiden, sonst steht am
 * Tisch zweimal dasselbe.
 */
export function createAction(actions = []) {
  return { id: generateId(), label: `Action ${list(actions).length + 1}`, steps: [] };
}

/** Nur der Name ändert sich; die Schritte bleiben, wie sie sind. */
export function renameAction(actions, id, label) {
  return list(actions).map(a => (a.id === id ? { ...a, label } : a));
}

export function deleteAction(actions, id) {
  return list(actions).filter(a => a.id !== id);
}

/** Die Schrittliste einer Aktion ersetzen — was der Sequenz-Editor liefert. */
export function setActionSteps(actions, id, steps) {
  return list(actions).map(a => (a.id === id ? { ...a, steps } : a));
}

/**
 * Die Schritte einer Aktion, immer ein Array: der Editor bekommt nie
 * `undefined`, auch nicht für eine Aktion, die es nicht (mehr) gibt.
 */
export function actionSteps(actions, id) {
  const found = list(actions).find(a => a.id === id);
  return Array.isArray(found?.steps) ? found.steps : [];
}
