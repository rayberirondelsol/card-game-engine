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

/**
 * Was ein Spieler von einem fehlgeschlagenen Schritt zu lesen bekommt (K2).
 *
 * Der Befund der sechsten Solopartie:
 *
 *     #1 require_zone „Bösewicht-Tableau" — skipped: Erst die Dorfphase
 *     beginnen — der vorige Kampf steht noch. [in zone: Tableau: Deputy
 *     Waggums] (16 further steps skipped)
 *
 * Der deutsche Satz in der Mitte ist genau richtig — er steht als
 * `step.message` im Aufbau und ist für den Spieler geschrieben. Alles andere
 * ist Diagnose: Schrittnummer, Typ, Ziel, Status, der Halbsatz aus M12.3 und
 * die Zahl aus M9.3. Die bleibt im Protokoll (`entry.reason`), sie ist das
 * Werkzeug, mit dem jeder dieser Berichte entsteht. Sie gehört nur nicht vor
 * einen Spieler.
 *
 * @param {{index?: number, type?: string, target?: string|null, status?: string,
 *          reason?: string|null, message?: string|null}|null} entry
 * @returns {string}
 */
export function issueLine(entry) {
  const message = typeof entry?.message === 'string' ? entry.message.trim() : '';
  if (message) return message;
  const nr = Number.isFinite(Number(entry?.index)) ? `#${Number(entry.index) + 1} ` : '';
  const ziel = entry?.target ? ` "${entry.target}"` : '';
  return `${nr}${entry?.type || '(step)'}${ziel} — ${entry?.status || 'failed'}: ${entry?.reason || ''}`;
}
