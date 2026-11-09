/**
 * Die Optionen eines Setups (Spec M27.3) - **die eine Stelle** für die Regel, wie
 * aus ihnen und einer Wahl Platzhalter und Gates werden.
 *
 * Die Daten stehen in `setups.scenario_data.options`, neben `bosses` und
 * `villagers`:
 *
 *   { partie:  { label: "Spiellänge", default: "kurz",
 *                choices: { kurz: { label: "Kurz (3-Runden-Modus)", vars: { Muenzen: "45" } },
 *                           lang: { label: "Lang (4 Runden)",       vars: { Muenzen: "30" } } } },
 *     troedel: { … } }
 *
 * Eine Wahl ist `{ partie: "lang", troedel: "ohne" }`. Aus ihr werden zwei Dinge:
 * **Werte** - jede `vars`-Angabe der gewählten Wahlen wird als `$opt<Name>`
 * gebunden (`$optMuenzen`) - und **Anwesenheit**: ein Schritt mit `onlyChoice`
 * läuft nur, wenn die Wahl passt (`checkGate`).
 *
 * Dieselbe Funktion rufen der Dialog (Vorbelegung), der Server (beim Anlegen
 * eines Raums) und der Executor (als letzte Wache): es gibt keine zweite
 * Rechnung. **Mit Problemen wird nichts aufgebaut** - eine unbekannte Option oder
 * Wahl fällt nie still auf das `default` zurück, sonst baute ein Tippfehler in
 * der Adresse die Standardvariante, und niemand merkte es.
 *
 * Rein: keine Imports aus Client oder Server.
 */

/** Das Präfix, das Zusammenstöße mit `$B`, `$D1`, `$V1`, `$F1` und `$revealedBase` verhindert. */
export const OPTION_VAR_PREFIX = 'opt';

/** `Muenzen` → `optMuenzen`: so heißt der Platzhalter, der den Wert trägt (ohne `$`). */
export const optionVarName = (name) => `${OPTION_VAR_PREFIX}${name}`;

const isObject = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const list = (o) => Object.keys(o).join(', ');

/** Die Optionen, mit denen sich etwas anfangen lässt - sonst `{}`. */
const optionsOf = (options) => (isObject(options) ? options : {});

/** Die Wahlen einer Option, oder `{}`. */
const choicesOf = (option) => (isObject(option?.choices) ? option.choices : {});

/**
 * Aus den Optionen und der Wahl des Spielers: `{ choices, vars, problems }`.
 * `given` darf unvollständig sein (der Rest bekommt `default`) oder fehlen.
 *
 * Ein Setup **ohne** Optionen gibt `{ choices: {}, vars: {}, problems: [] }`; wird
 * trotzdem eine Wahl gegeben, ist das ein Problem - ein Tippfehler in der
 * Adresse (`?opt=partie:lang` bei einem Aufbau, der keine kennt) geht nicht
 * stillschweigend durch.
 *
 * @param {object} options  – `scenario_data.options`
 * @param {object} [given]  – `{ <Option>: <Wahl> }`
 */
export function resolveChoices(options, given) {
  const opts = optionsOf(options);
  const wanted = isObject(given) ? given : {};
  const problems = [];

  for (const [name, value] of Object.entries(wanted)) {
    const option = opts[name];
    if (!option) { problems.push(`setup has no option "${name}"`); continue; }
    if (typeof value !== 'string') { problems.push(`option "${name}": the choice must be text`); continue; }
    if (!choicesOf(option)[value]) problems.push(`option "${name}" has no choice "${value}" (${list(choicesOf(option))})`);
  }
  if (problems.length) return { choices: {}, vars: {}, problems };

  const choices = {};
  const vars = {};
  for (const [name, option] of Object.entries(opts)) {
    const key = Object.prototype.hasOwnProperty.call(wanted, name) ? wanted[name] : option.default;
    const choice = choicesOf(option)[key];
    // Ein kaputtes `default` ist ein Fehler der Daten, kein Zustand, in dem man baut.
    if (!choice) { problems.push(`option "${name}": default "${key ?? ''}" is not one of its choices`); continue; }
    choices[name] = key;
    for (const [v, text] of Object.entries(choice.vars || {})) vars[optionVarName(v)] = String(text);
  }
  if (problems.length) return { choices: {}, vars: {}, problems };
  return { choices, vars, problems };
}

/**
 * Die Bezeichnungen der Wahl für die Meldung nach dem Laden („Kurz (3-Runden-
 * Modus), mit Toller Trödel"), in der Reihenfolge der Optionen. Eine Wahl ohne
 * `label` zeigt ihren Schlüssel. Ohne Optionen: `''`.
 */
export function describeChoices(options, choices) {
  const out = [];
  for (const [name, option] of Object.entries(optionsOf(options))) {
    const key = choices?.[name];
    if (key === undefined) continue;
    out.push(choicesOf(option)[key]?.label || key);
  }
  return out.join(', ');
}

/**
 * M31.5: was an `option.optional` nicht stimmt - eine Meldung je Fehler (ohne den
 * Namen der Option, den setzt der Prüfer davor), leer heißt brauchbar. **Die eine
 * Regel**: `optionalOf` fragt sie, `validateOptions` zeigt sie; ein `optional`, das
 * hier durchfällt, macht die Option zu einem gewöhnlichen Feld.
 */
function optionalFaults(option) {
  const o = option.optional;
  if (!isObject(o)) return ['optional must be an object { off, on, addLabel }'];
  const choices = choicesOf(option);
  const out = [];
  for (const k of ['off', 'on']) {
    if (typeof o[k] !== 'string' || !choices[o[k]]) out.push(`optional.${k} "${String(o[k] ?? '')}" is not one of its choices (${list(choices)})`);
  }
  if (!out.length && o.off === o.on) out.push('optional.on and optional.off must differ (the plus would change nothing)');
  if (typeof o.addLabel !== 'string') out.push('optional.addLabel must be text');
  return out;
}

/**
 * M31.5: ist diese Option eine, die man ausschalten kann - und ist sie es? `null`
 * für eine gewöhnliche Option (kein `optional`, oder ein unbrauchbares);
 * sonst `{ isOff, off, on, addLabel }`. `chosen` fehlt → `default`. **Die eine
 * Stelle** für „ist diese Option aus?" (M6): Leiter und Zeichnung fragen hier.
 */
export function optionalOf(option, chosen) {
  if (!isObject(option) || optionalFaults(option).length) return null;
  const { off, on, addLabel } = option.optional;
  return { isOff: (chosen ?? option.default) === off, off, on, addLabel };
}

/**
 * M31.5: die Leiter - **die Beziehung zwischen Optionen**, die der Dialog zum ersten Mal
 * kennt. `{ kinds: { <Option>: 'field' | 'plus' | 'hidden' }, minus: <Option> | null }`,
 * in der Reihenfolge der Schlüssel (dieselbe, die der Dialog zeichnet):
 *   - eine gewöhnliche Option und jede **eingeschaltete** optionale: `'field'`;
 *   - die **erste** ausgeschaltete optionale: `'plus'`; jede weitere: `'hidden'`;
 *   - `minus` ist die **letzte** eingeschaltete optionale, sonst `null`.
 * Ausgeschaltet-dazwischen (3 aus, 5 an) ist eine Lücke und wird gezeigt, wie sie ist
 * (Plus bei 3, nichts bei 4, Feld bei 5) - sie wird nicht verboten und nicht gezählt.
 * Rein; die Zeichnung (`SetupChoiceFields`) rechnet nichts, sie fragt hier.
 */
export function ladderOf(options, choices) {
  const kinds = {};
  let minus = null;
  let plus = false;
  for (const [name, option] of Object.entries(optionsOf(options))) {
    const opt = optionalOf(option, choices?.[name]);
    if (!opt || !opt.isOff) {
      kinds[name] = 'field';
      if (opt) minus = name;
    } else if (!plus) {
      kinds[name] = 'plus';
      plus = true;
    } else {
      kinds[name] = 'hidden';
    }
  }
  return { kinds, minus };
}

/**
 * Trifft das Gate `onlyChoice` auf diese Wahl zu? `{ ok: true, applies }`, oder
 * `{ ok: false, problem }` bei allem Unverstandenen.
 *
 * **Strenger als `onlyFinal`**, das bei Unverstandenem den Schritt *laufen* lässt
 * (M20.1). Für Optionen wäre „laufen lassen" falsch: es liefen der Kurz- **und**
 * der Lang-Aufbau zugleich. Darum scheitert hier laut - der Aufrufer macht aus
 * `problem` eine `failed`-Zeile, und der Schritt läuft nicht.
 *
 * `onlyChoice` ist ein Objekt `{ <Option>: <Wahl> | [<Wahl>, …] }`; **alle**
 * genannten Optionen müssen passen (UND). `"!<Wahl>"` (allein, kein Listenelement)
 * heißt „jede Wahl außer dieser" (M31.3).
 */
export function checkGate(onlyChoice, options, choices) {
  if (!isObject(onlyChoice)) return { ok: false, problem: 'onlyChoice must be an object { <option>: <choice> }' };
  const opts = optionsOf(options);
  const names = Object.keys(onlyChoice);
  if (!names.length) return { ok: false, problem: 'onlyChoice names no option' };

  let applies = true;
  for (const name of names) {
    const option = opts[name];
    if (!option) return { ok: false, problem: `onlyChoice: no option "${name}"` };
    // M31.3: `"!keiner"` heißt „jede Wahl außer `keiner`". Die Verneinung steht **allein**
    // und nur als Text: in einer Liste ist `!keiner` keine Wahl und scheitert wie jede.
    const raw = onlyChoice[name];
    const not = typeof raw === 'string' && raw.startsWith('!');
    const want = not ? [raw.slice(1)] : Array.isArray(raw) ? raw : [raw];
    for (const w of want) {
      if (typeof w !== 'string' || !choicesOf(option)[w]) {
        return { ok: false, problem: `onlyChoice: option "${name}" has no choice "${not ? raw : String(w)}" (${list(choicesOf(option))})` };
      }
    }
    const made = choices?.[name];
    if (typeof made !== 'string') return { ok: false, problem: `onlyChoice: no choice made for option "${name}"` };
    if (want.includes(made) === not) applies = false;
  }
  return { ok: true, applies };
}

// Ein Schlüssel reist in der Adresse (`opt=partie:lang`): kein `:`, kein `&`, keine
// Leerzeichen, kein Umlaut, der kodiert werden müsste.
const KEY = /^[A-Za-z][A-Za-z0-9_-]*$/;
// Ein Platzhalter trägt nur Buchstaben und Ziffern, und `ü` fiele heraus.
const VAR = /^[A-Za-z][A-Za-z0-9]*$/;
// Namen, die der Executor schon vergibt - mit dem Präfix `opt` stoßen sie nicht
// zusammen, aber wer so heißt, meint vermutlich etwas anderes.
const TAKEN = /^(V\d|F\d|revealed)/;
const OPT_PLACEHOLDER = new RegExp(`\\$${OPTION_VAR_PREFIX}[A-Za-z0-9]*`, 'g');

/** Die `$opt…`-Platzhalter, die irgendwo in diesem Schritt stehen (mit `$`). Auch der Editor fragt das. */
export const optPlaceholdersIn = (step) => JSON.stringify(step ?? null).match(OPT_PLACEHOLDER) || [];

/**
 * Was an den Optionen nicht stimmt, **gegen die Folge und die Aktionen** - eine
 * Meldung je Fehler, leer heißt in Ordnung (dieselbe Form wie
 * `validateScenarioData`). Jede Meldung nennt Option oder Wahl und, wo es einen
 * gibt, den Schritt (1-basiert, wie die Zeilen im Editor).
 *
 * @param {object} options   – `scenario_data.options`
 * @param {Array}  sequence  – `sequence_data`
 * @param {Array}  actions   – `action_data`
 */
export function validateOptions(options, sequence = [], actions = []) {
  const problems = [];
  const opts = optionsOf(options);

  // Wer setzt welche Variable? Für „gesetzt von keiner Option" und für Zusammenstöße.
  const setBy = new Map();   // Name → [Option, …]
  for (const [name, option] of Object.entries(opts)) {
    const who = `option "${name}"`;
    if (!KEY.test(name)) problems.push(`${who}: the name may only hold letters, digits, "_" and "-" (it travels in the address)`);
    const choices = choicesOf(option);
    if (!Object.keys(choices).length) { problems.push(`${who} has no choices`); continue; }
    if (option.default === undefined || option.default === null || option.default === '') {
      problems.push(`${who} has no default`);
    } else if (!choices[option.default]) {
      problems.push(`${who}: default "${option.default}" is not one of its choices (${list(choices)})`);
    }

    // M31.5: `optional` (der Plus-Knopf) ist ein Objekt mit zwei Wahlen und einem Text. Ist es das nicht,
    // zeichnet der Dialog ein gewöhnliches Feld - das soll beim Schreiben auffallen, nicht erst am Bildschirm.
    if (option.optional !== undefined) for (const f of optionalFaults(option)) problems.push(`${who}: ${f}`);

    const names = new Set();
    for (const [key, choice] of Object.entries(choices)) {
      if (!KEY.test(key)) problems.push(`${who}: the choice "${key}" may only hold letters, digits, "_" and "-" (it travels in the address)`);
      for (const [v, text] of Object.entries(choice?.vars || {})) {
        const at = `${who}, choice "${key}": variable "${v}"`;
        if (!VAR.test(v)) problems.push(`${at} may only hold letters and digits (a placeholder cannot carry "ü" or a space)`);
        else if (TAKEN.test(v)) problems.push(`${at} starts like a placeholder the table already binds ($V1, $F1, $revealed…)`);
        if (typeof text !== 'string' && typeof text !== 'number') problems.push(`${at} must be text or a number`);
        names.add(v);
      }
    }
    // Eine Variable, die nur eine Wahl setzt, ist in der anderen „is not bound" - in jedem Start.
    for (const [key, choice] of Object.entries(choices)) {
      for (const v of names) {
        if (!Object.prototype.hasOwnProperty.call(choice?.vars || {}, v)) {
          problems.push(`${who}, choice "${key}": does not set "${v}", which another choice of the option sets`);
        }
      }
    }
    for (const v of names) setBy.set(v, [...(setBy.get(v) || []), name]);
  }
  for (const [v, by] of setBy) {
    if (by.length > 1) problems.push(`variable "${v}" is set by more than one option (${by.join(', ')})`);
  }

  // Die Folge: Gates müssen Optionen und Wahlen kennen, Platzhalter eine Variable.
  (Array.isArray(sequence) ? sequence : []).forEach((step, i) => {
    const at = `step ${i + 1}`;
    if (step?.onlyChoice !== undefined) {
      // Hier zählt nur, ob es Option und Wahl gibt - gewählt ist beim Schreiben noch nichts.
      const gate = checkGate(step.onlyChoice, opts, Object.fromEntries(Object.keys(opts).map(k => [k, ''])));
      if (!gate.ok) problems.push(`${at}: ${gate.problem}`);
    }
    for (const ph of new Set(optPlaceholdersIn(step))) {
      if (!setBy.has(ph.slice(1 + OPTION_VAR_PREFIX.length))) problems.push(`${at}: ${ph} is not set by any option`);
    }
  });

  // Die Aktionen: ein Spielstand weiß nicht, mit welcher Wahl er entstand (M22).
  for (const action of Array.isArray(actions) ? actions : []) {
    (Array.isArray(action?.steps) ? action.steps : []).forEach((step, i) => {
      const at = `action "${action?.id ?? action?.label ?? '?'}", step ${i + 1}`;
      if (step?.onlyChoice !== undefined) {
        problems.push(`${at}: onlyChoice is not allowed in an action - a saved game does not know the choice`);
      }
      for (const ph of new Set(optPlaceholdersIn(step))) {
        problems.push(`${at}: ${ph} is not allowed in an action - a saved game does not know the choice`);
      }
    });
  }
  return problems;
}
