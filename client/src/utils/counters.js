// M4a – das Zähler-Modell an einer Stelle.
//
// Ein Zähler wird an vier Stellen neu gebaut: beim Anlegen von Hand, beim
// Anlegen durch `place_counter`, beim Speichern (getGameState) und beim Laden
// (loadGameState). Vier Feldlisten heißt: ein neues Feld überlebt den Weg durch
// die Datenbank nur, wenn alle vier nachgezogen werden – genau der Fehler, den
// docs/audit-dead-controls.md sammelt und den `deal_to_zone` mit width/height
// schon einmal gemacht hat. Darum gibt es hier genau eine Liste.
//
// Geprüft in server/test/sequence-counter.test.js (der Client hat keine
// Testinfrastruktur, siehe CLAUDE.md).

/**
 * Ein Zähler in seiner vollständigen Form: `{ id, name, value, x, y, locked }`
 * plus `max`, *wenn* es eines gibt. `max` ist die angezeigte Obergrenze (am
 * Tisch steht dann „2 / 3"); sie wird nicht erzwungen – Regeln durchsetzen ist
 * nicht Aufgabe des Tisches (Spec M4a).
 *
 * Ein unbrauchbares `max` (leer, null, kein Zahlwert) fällt weg, statt später
 * als „2 / NaN" am Tisch zu stehen.
 */
export function normalizeCounter(c = {}) {
  const counter = {
    id: c.id || crypto.randomUUID(),
    name: c.name,
    value: Number.isFinite(Number(c.value)) ? Number(c.value) : 0,
    x: c.x,
    y: c.y,
    locked: c.locked || false,
  };
  const max = counterMax(c.max);
  if (max !== undefined) counter.max = max;
  return counter;
}

/** Eine brauchbare Obergrenze als Zahl, sonst `undefined`. */
export function counterMax(value) {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Was am Tisch im Zählerfeld steht: `2 / 3` mit Obergrenze, sonst `2`. */
export function counterDisplay(counter) {
  const max = counterMax(counter?.max);
  return max === undefined ? `${counter?.value}` : `${counter?.value} / ${max}`;
}
