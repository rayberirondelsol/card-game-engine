/**
 * M27.3/CW: die Wahl des Spielers in der Adresse.
 *
 *   /games/:id/play?setupId=…&opt=partie:lang&opt=troedel:ohne
 *
 * Die Wahl reist in der Adresse, damit ein Neuladen derselben Adresse denselben
 * Aufbau baut. **Ohne** `opt` gilt der Default: alte Lesezeichen und alle, die den
 * Aufbau ohne Dialog starten, bauen genau die Kurzpartie von vor M27.
 *
 * Das hier ist nur Text ↔ Wahl, reine Funktionen ohne DOM (der Client hat keine
 * Testinfrastruktur; `server/test/setup-choices.test.js` prüft sie). **Was** eine
 * Wahl bedeutet - Defaults, unbekannte Option oder Wahl -, rechnet
 * `resolveChoices` in `shared/setupOptions.js`; eine zweite Rechnung daneben gibt
 * es nicht (M6).
 */

/** Der Name des Adressparameters. Es dürfen mehrere stehen, einer je Option. */
export const CHOICE_PARAM = 'opt';

/**
 * Aus den `opt`-Einträgen einer Adresse eine Wahl: `{ choices, problems }`.
 * Ein Eintrag ist `<Option>:<Wahl>`. Ein Eintrag ohne `:`, mit leerem Teil, ein
 * Wert, der kein Text ist, und dieselbe Option zweimal sind **Probleme** und
 * werden nicht stillschweigend zum Default - mit einem Problem gibt es keine
 * Wahl, und der Aufrufer baut nichts.
 *
 * @param {Array<string>|null|undefined} entries
 */
export function parseChoices(entries) {
  const choices = {};
  const problems = [];
  for (const entry of Array.isArray(entries) ? entries : []) {
    const text = typeof entry === 'string' ? entry.trim() : '';
    const at = text.indexOf(':');
    const option = at < 0 ? '' : text.slice(0, at).trim();
    const choice = at < 0 ? '' : text.slice(at + 1).trim();
    if (!option || !choice) {
      problems.push(`"${typeof entry === 'string' ? entry : String(entry)}" is not <option>:<choice>`);
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(choices, option)) {
      problems.push(`option "${option}" is given twice`);
      continue;
    }
    choices[option] = choice;
  }
  return problems.length ? { choices: {}, problems } : { choices, problems };
}

/** Die Wahl als Teil einer Adresse: `opt=partie:lang&opt=troedel:ohne`, oder `''`. */
export function formatChoices(choices) {
  const entries = Object.entries(choices && typeof choices === 'object' ? choices : {});
  return entries.map(([k, v]) => `${CHOICE_PARAM}=${encodeURIComponent(k)}:${encodeURIComponent(v)}`).join('&');
}

/** Dasselbe in die andere Richtung, aus `location.search` (oder einem `URLSearchParams`). */
export function choicesFromSearch(search) {
  const params = search instanceof URLSearchParams ? search : new URLSearchParams(search || '');
  return parseChoices(params.getAll(CHOICE_PARAM));
}

/**
 * Die Optionen eines Setups (`scenario_data.options`), aus der Zeile, wie
 * `GET /api/games/:id/setups` sie liefert - oder `null`, wo es nichts zu wählen
 * gibt (die beiden anderen Aufbauten). `null` heißt: kein Dialog, keine
 * Auswahlfelder, Verhalten wie vorher.
 */
export function optionsOfSetup(setup) {
  let data = setup?.scenario_data;
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch { return null; }
  }
  const options = data && typeof data === 'object' ? data.options : null;
  return options && typeof options === 'object' && !Array.isArray(options) && Object.keys(options).length ? options : null;
}
