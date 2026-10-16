/**
 * M22: woraus wird dieser Tisch gefuellt?
 *
 * Vorher war das keine Regel, sondern ein Zeitverhalten: zwei `useEffect` in
 * GameTable.jsx lasen dieselben Parameter und riefen beide `loadGameState` -
 * wer zuletzt aufrief, gewann. Gemessen gewann der Aufbau, weil sein Zweig drei
 * Umlaeufe mehr braucht; eine laufende Partie ueberlebte damit kein Neuladen.
 *
 * Hier wird die Entscheidung einmal getroffen, vor dem ersten Netzzugriff, als
 * reine Rechnung - geprueft in `server/test/table-source.test.js`.
 */

/** Ein Parameter gilt als gesetzt, wenn er Text mit Inhalt ist. `?saveId=` ohne Wert ist kein Spielstand. */
function param(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/**
 * @param {{mode?: string|null, setupId?: string|null, editSetupId?: string|null, saveId?: string|null}} [params]
 *   die vier URL-Parameter als einfache Werte (kein `searchParams`-Objekt,
 *   damit die Rechnung ohne DOM pruefbar ist).
 * @returns {{kind: 'save'|'setup'|'setup-edit'|'setup-new'|'blank', saveId: string|null, setupId: string|null, setupMode: boolean}}
 */
export function resolveTableSource(params) {
  const p = params || {};
  const saveId = param(p.saveId);
  const setupId = param(p.setupId);
  const editSetupId = param(p.editSetupId);
  // Der Editor-Schalter haengt allein an `mode`, unabhaengig von der
  // Rangfolge darunter - so war es vorher auch.
  const setupMode = param(p.mode) === 'setup';

  // Der Spielstand schlaegt alles: er ist das Spaetere. Die `setupId` aus der
  // URL wird dabei **nicht** uebernommen - die Herkunft eines Standes steht in
  // seiner Zeile (`save_states.setup_id`), und sie aus der URL zu erraten ist
  // genau die Automatik, die M22 verbietet.
  if (saveId) return { kind: 'save', saveId, setupId: null, setupMode };
  if (setupMode && editSetupId) return { kind: 'setup-edit', saveId: null, setupId: editSetupId, setupMode };
  if (setupId) return { kind: 'setup', saveId: null, setupId, setupMode };
  if (setupMode) return { kind: 'setup-new', saveId: null, setupId: null, setupMode };
  return { kind: 'blank', saveId: null, setupId: null, setupMode };
}

/**
 * M22/CB: welchen Hinweis ein geladener Spielstand verdient. Stillschweigend
 * die Haelfte zu laden ist der Fehler, den M22 behebt - also sagt der Tisch es.
 *
 * @param {string|null|undefined} setupId `save_states.setup_id` der geladenen Zeile
 * @param {boolean} setupLoaded ob der Aufbau dazu abrufbar war
 * @returns {'none'|'missing'|'gone'}
 */
export function scaffoldNotice(setupId, setupLoaded) {
  if (!param(setupId)) return 'missing';
  return setupLoaded ? 'none' : 'gone';
}
