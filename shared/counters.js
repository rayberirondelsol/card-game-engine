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
  // M11.4: der Ausgangswert steht neben der Obergrenze und wird mit derselben
  // Funktion gelesen – beide sind „eine Zahl oder gar nichts", und zwei
  // Prüfungen wären zwei Antworten auf dieselbe Frage. Fehlt er, fehlt das
  // Feld: ein Zähler ohne Ausgangswert verhält sich unverändert (Abnahme 3),
  // und ein erfundener 0-Startwert setzte die Dorfphase auf null zurück.
  const base = counterMax(c.base);
  if (base !== undefined) counter.base = base;
  return counter;
}

/**
 * Eine brauchbare Obergrenze **oder** ein brauchbarer Ausgangswert als Zahl,
 * sonst `undefined` (M4a, M11.4). Eine Funktion für beide Felder: sie stellen
 * dieselbe Frage, und `''`/`null`/„vier" ist bei beiden dasselbe Nichts.
 */
export function counterMax(value) {
  if (value === null || value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Womit ein von Hand angelegter Zähler startet (M8.6, Regel 2): auf seinem
 * Maximum, sonst auf 0. Ein Maximum ist die Obergrenze eines Vorrats, und ein
 * Vorrat ist beim Anlegen voll – Lebenspunkte, Munition, Bewegung. „Waggums:
 * Leben" mit Maximum 14 stand nach dem Anlegen auf `0 / 14`, und für
 * Lebenspunkte folgten vierzehn Klicks auf `+`.
 *
 * **Hier und nicht in `normalizeCounter`.** Beide Wege, ein Zähler zu
 * entstehen, laufen durch `normalizeCounter`: der Knopf am Tisch und
 * `place_counter` aus einer Sequenz. Dort gesetzt, bekäme ein
 * `place_counter`-Schritt ohne `value`, aber mit `max` klammheimlich einen
 * anderen Startwert – und Abnahme 6 fiele, die dem Aufbau genau den Wert
 * zusichert, der im Schritt steht. Die Regel gilt für den Zähler, den ein
 * Mensch über die Oberfläche anlegt, also entscheidet der Aufrufer.
 */
export function newCounterValue(max, base) {
  // M11.4: ohne Obergrenze zaehlt der Ausgangswert. „Ein Vorrat ist beim
  // Anlegen voll" und „ein Zaehler faengt bei seinem Ausgangswert an" sind
  // derselbe Satz; wo beides dasteht, ist das Maximum der vollere Vorrat.
  return counterMax(max) ?? counterMax(base) ?? 0;
}

/** Was am Tisch im Zählerfeld steht: `2 / 3` mit Obergrenze, sonst `2`. */
export function counterDisplay(counter) {
  const max = counterMax(counter?.max);
  return max === undefined ? `${counter?.value}` : `${counter?.value} / ${max}`;
}

/**
 * Was ein `set_counter`-Wert *ist*, ohne den Zähler zu kennen (R1):
 * `'set'` (auf diese Zahl), `'add'` (um diese Zahl), `'max'` (auf die
 * Obergrenze) – oder `null`, wenn der geschriebene Wert keine davon trifft.
 *
 * Getrennt von `counterValue`, weil der Editor beim Tippen noch keinen Zähler
 * hat: „max" ist dort eine gültige Eingabe, auch wenn niemand weiß, ob der
 * gemeinte Zähler eine Obergrenze trägt. Eine zweite Lesart wäre es nicht –
 * `counterValue` fragt genau diese Funktion.
 *
 * Das Vorzeichen muss **geschrieben** stehen, damit es zählt: `"+6"` heißt „um
 * sechs", die Zahl `6` heißt „auf sechs". Eine JSON-Zahl trägt kein Vorzeichen,
 * also kann `-2` als Zahl nur „auf minus zwei" heißen.
 */
export function counterValueForm(raw) {
  if (typeof raw === 'number') return Number.isFinite(raw) ? 'set' : null;
  const s = String(raw ?? '').trim();
  if (!s) return null;
  if (s.toLowerCase() === 'max') return 'max';
  // M11.4: die fuenfte Lesart. Sie steht hier und nicht als eigener Schritt,
  // weil `set_counter` schon der Schritt ist, der einen Wert setzt - ein
  // zweiter daneben waere eine zweite Rechnung fuer dieselbe Tat.
  if (s.toLowerCase() === 'base') return 'base';
  if (!Number.isFinite(Number(s))) return null;
  return s[0] === '+' || s[0] === '-' ? 'add' : 'set';
}

/**
 * Der neue Wert eines Zählers nach `set_counter`, oder `null`, wenn der Schritt
 * nichts tun kann – unlesbarer Wert, oder `"max"` an einem Zähler ohne
 * Obergrenze. Der Aufrufer macht daraus den Protokolleintrag.
 */
export function counterValue(counter, raw) {
  const form = counterValueForm(raw);
  if (form === null) return null;
  if (form === 'max' || form === 'base') {
    const n = counterMax(form === 'max' ? counter?.max : counter?.base);
    return n === undefined ? null : n;
  }
  const n = Number(typeof raw === 'number' ? raw : String(raw).trim());
  return form === 'add' ? Number(counter?.value ?? 0) + n : n;
}

/**
 * Was aus dem Getippten am Zählerfeld wird: `{ value }` oder `{ reason }`
 * (M9.5 Regel 2).
 *
 * Vorher verschwand eine unlesbare Eingabe stillschweigend – `counterValue`
 * gab `null`, das Feld schloss sich, der Wert blieb stehen. Am Tisch sah das
 * aus wie „Enter tut nichts", und zusammen mit der klemmenden Löschtaste war
 * es eine Falle: aus `-2` wurde `-2-3`, und `Number("-2-3")` ist `NaN`.
 *
 * **Hier wird nichts nachgerechnet.** Die vier Lesarten stehen in
 * `counterValueForm`/`counterValue` und werden gefragt, nicht kopiert – eine
 * zweite Rechnung wäre eine zweite Antwort. Neu ist allein die Übersetzung
 * von `null` in einen Satz für den Meldekasten, in derselben Form wie
 * `zoneRejects` sie für eine abgewiesene Zone liefert.
 */
export function counterEdit(counter, raw) {
  const value = counterValue(counter, raw);
  if (value !== null) return { value };
  const written = String(raw ?? '').trim();
  const form = counterValueForm(raw);
  if (form === 'max') return { reason: `counter has no maximum` };
  if (form === 'base') return { reason: `counter has no starting value` };
  return { reason: `cannot read "${written}" – type 21, +21, -21, max or base` };
}
