// Die Setup-Wahl als Daten: Dörfler wählen, Zähler der Dörfler weg, Zähler des Bösewichts weg (Spec M30.3, M30.5, M30.8, M30.9).
//
// **Drei Schritte, ein Skript** (`--schritt optionen|zaehler|boss`, Entscheidung 13). Jeder ändert ein **eigenes Stück** der
// Kurzpartie; die Vorbedingung gilt **je Stück**, nicht je Gesamthash, darum dürfen die drei in jeder Reihenfolge laufen (die Zahlen
// in `SCHRITTE` sind die der empfohlenen Reihenfolge `optionen`, `zaehler`, `boss`). Gebaut sind **`optionen`** (Aufgabe EC) und
// **`zaehler`** (ED); `boss` (EE) trägt seine `ausgang`/`ziel` selbst ein und meldet bis dahin „noch nicht gebaut“.
//
// **`optionen`:** `scenario_data.options` bekommt hinten drei Schlüssel (`doerfler1`–`doerfler3`, M30.3), und die drei `seat_villager`
// der Folge (`sequence_data`, Schritt 25–27, 0-basiert) nennen statt eines Namens den Platzhalter `$optDoerfler<n>`. Der Rest beider
// Spalten bleibt byteweise gleich; `action_data` wird weder gelesen noch geschrieben. Die Wahlen baut der Baustein **aus dem Roster**
// (`scenario_data.villagers.roster`: Schlüssel = Kurzname, Label = voller Name), nicht aus einer abgetippten Liste — und er prüft sie
// auch dagegen (`rosterProbleme`): `validateOptions` kennt das Roster nicht und soll es nicht kennen (M30, „Wo die Spec nicht stimmt“
// Nr. 7). Doppelt gewählte Dörfler verhindert der Baustein **nicht** (M30.4: Platz bleibt leer, eine Zeile im Protokoll).
//
// **`zaehler`:** `scenario_data.villagers.seats[].counters` fallen weg; in `action_data` wird Schritt 1 von `dorfphase-beginnen` zur
// Wache `require_marker` (M30.7, die Leiste hat keinen Platz 0: die Wache fragt, ob noch ein Marker liegt, nicht nach einer Zahl), und die
// zwölf `set_counter` an 16–27 entfallen (M30.5). Die Spalten dieses Schrittes sind `scenario_data` und `action_data`; `sequence_data`
// wird weder gelesen noch geschrieben, `zone_data` **nur gelesen** (die drei Zonen der Wache müssen es geben). Die drei Stücke gehören
// zusammen: bliebe eines stehen, hielte die Dorfphase an der Wache oder legte Zähler, die niemand mehr führt — ein halber Stand ist
// darum ein Abbruch, nicht ein „schon geschrieben“. Vorbedingung je Stück: der Hash des Textes jedes `counters` (`ZAEHLER_ALT`),
// der alte Schritt 1 und die zwölf Schritte im Wortlaut. Das Skript setzt voraus, dass der **Code** deployt ist (`require_marker`,
// optionale Zähler am Platz: `DW`, `DY`, `DZ` in `EA`) — ohne ihn bliebe die Dorfphase an der Wache stehen.
//
// Was von M28/M29 (`szenariodaten-berichtigung.mjs`, `gelaendekarten-zuordnung.mjs`) gilt, gilt unverändert: Vorbedingung, Rückwärtsbeweis,
// Sicherung vorher mit Hash als Argument, Vergleich-und-Tausch in einer `IMMEDIATE`-Transaktion, Fingerabdruck je Tabelle und je Zeile von
// `save_states` vorher und nachher, Kontrollausgabe **neu gelesen**, Weg zurück — und **kein `--force`**: ein Argument dieses Namens (oder
// eines anderen, das nicht aufgeführt ist) wird nicht erkannt, jede Abweichung vom erwarteten Ausgangsstand ist ein Abbruch mit Pfad.
// Zwei Spalten je Schritt (`DEFS[…].spalten`): darum steht der Tausch hier selbst (`tausche`), er hängt die zweite Spalte an dieselbe Bedingung.
//
// Die Zahlen stehen **einmal** hier (`SCHRITTE`); der Test importiert sie (M6). Gelesen wird nur, was der Schritt und die Prüfer
// brauchen (die zwei Spalten, `grid_data`, Assets und Karten der Bibliothek, bei `zaehler` dazu `zone_data`), geschrieben **nur** die zwei Spalten.
// Dieser Teil ist **rein** — `better-sqlite3` kommt erst in `main` (auf dem Server liegt es neben der Datei, im Repo unter `server/`,
// der Test reicht es herein). Das Skript braucht nur `../shared/scenarioData.js` und `../shared/setupOptions.js`, keine andere Skriptdatei.
//
// Aufruf (im Backend-Container, wo `better-sqlite3` liegt; die Datei liegt dort als `/app/setupwahl-daten.mjs`, `../shared` ist dann
// `/shared`; `docs/datenzugriff.md`):
//
//   node setupwahl-daten.mjs --check <db> --schritt optionen                                  # Trockenlauf, schreibgeschützt
//   node setupwahl-daten.mjs --write <db> --schritt optionen --sicherung-sha <hex>            # eine IMMEDIATE-Transaktion
//   node setupwahl-daten.mjs --zurueck <sicherungsdatei> <db> --schritt optionen              # der Weg zurück
//
// Dasselbe mit `--schritt zaehler`; seine Sicherung trägt `action_data` statt `sequence_data`.
//
// **Die Sicherung** legt dieses Skript nicht an. Sie ist eine JSON-Datei `{ scenario_data, sequence_data, sha256, updated_at }` mit den beiden
// gelesenen Spalten als Text (bei `zaehler`: `scenario_data`, `action_data`); `sha256` ist `sicherungsHash(<erste Spalte>, <zweite Spalte>)`. `--check` nennt diesen Hash für den gelesenen
// Stand, `--write` verlangt ihn (`--sicherung-sha`, mindestens zwölf Hex-Stellen) und schreibt nur, wenn er zu den **gelesenen** Texten passt.
//
// **Die Absicherung beim Schreiben, in der Reihenfolge, in der sie läuft:**
//
//   1. Lesen, Einordnen: die Stücke des Schritts sind genau der Ausgang → zu schreiben; genau das Ziel → schon geschrieben (Exit 0, ohne
//      Sicherung); alles andere → Abbruch mit Pfad. Ein halber Stand (Optionen da, Schritte nicht, oder umgekehrt) ist „alles andere“.
//   2. Rückwärtsbeweis je Spalte, `validateScenarioData` (gegen die echte Bibliothek und das echte Raster) und die Prüfer des Schrittes
//      (`optionen`: `validateOptions`, die Wahlen gegen das Roster; `zaehler`: `validateVillagers`): vor dem Schreiben, auf dem Zielstand.
//   3. Die Sicherung: ohne gültigen Hash kein Schreiben.
//   4. Eine `IMMEDIATE`-Transaktion (die Schreibsperre ist da, **bevor** gehasht wird), darin Fingerabdruck vorher und nachher und
//      `UPDATE … WHERE id = ? AND scenario_data = <gelesen> AND sequence_data = <gelesen>`. Trifft er keine Zeile, hat jemand eine der beiden
//      Spalten zwischen Lesen und Schreiben geändert: Abbruch. Jede Abweichung im Fingerabdruck: Rollback.
//   5. Kontrollausgabe, **neu gelesen**, nicht aus dem Plan.
//
// Der Weg zurück ist derselbe Vergleich-und-Tausch in die andere Richtung: die Datenbank muss **genau** der Zielstand sein, der aus der
// Sicherung folgt, sonst hat jemand danach weitergearbeitet, und nichts wird überschrieben. **Rückweg umgekehrt: zuerst `boss`, dann
// `zaehler`, dann `optionen`.**

import fs from 'node:fs';
import crypto from 'node:crypto';

import { validateScenarioData } from '../shared/scenarioData.js';
import { validateOptions } from '../shared/setupOptions.js';
import { validateVillagers } from '../shared/villagers.js';

export const GAME_ID = '072123c0-cd97-4ffb-a330-369630fab93f';
export const SETUP_ID = 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b';

const copy = (x) => JSON.parse(JSON.stringify(x));
const text = (x) => JSON.stringify(x);
const isObject = (x) => x !== null && typeof x === 'object' && !Array.isArray(x);
const hat = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const sha = (s) => sha256(s).slice(0, 12);
const kennzeichen = (t) => `${t.length} Zeichen (sha ${sha(t)})`;

// ── Die Zahlen ──────────────────────────────────────────────────────────────

/**
 * Je Schritt: der Stand vor und nach ihm, Länge und Hash des Textes **jeder Spalte, die er ändert**, in der Reihenfolge der empfohlenen
 * Läufe (M30.9) — die Spalten tragen die Namen `scenario`, `sequence`, `action`. `optionen` ändert `scenario` und `sequence`, `zaehler`
 * `scenario` und `action`. `null` heißt: noch nicht gebaut (EE trägt ein). Der Ausgang von `zaehler` ist in `scenario` der Zielstand
 * von `optionen`: **dieselbe** Zahl, nicht eine zweite (`SCENARIO_NACH_EC`); `action` ist von EC unberührt.
 */
const SCENARIO_NACH_EC = { laenge: 21244, sha: '7e654774e019' };
export const SCHRITTE = {
  optionen: {
    ausgang: { scenario: { laenge: 19106, sha: '914461d63f77' }, sequence: { laenge: 2781, sha: '33a42ffe0f71' } },
    ziel: { scenario: SCENARIO_NACH_EC, sequence: { laenge: 2780, sha: 'a63d57d7ea86' } },
  },
  zaehler: {
    ausgang: { scenario: SCENARIO_NACH_EC, action: { laenge: 6611, sha: '63abf4174038' } },
    ziel: { scenario: { laenge: 20858, sha: '82592d1ac883' }, action: { laenge: 5937, sha: '526c17f0fdf6' } },
  },
  boss: { ausgang: null, ziel: null },
};

/** Die drei Plätze, die der Aufbau besetzt: der Index des Schritts in der Folge (0-basiert) und wer dort heute hartverdrahtet sitzt. */
export const SITZE = [25, 26, 27];
export const ALT = ['Henlo Bulwark', 'Fridgette Jones', 'Granny Melba'];
/** Die Vorgabe der drei Wahlen = der Tisch von heute (M30.3 Nr. 1): Kurznamen, Schlüssel der Wahl. */
export const VORGABE = ['Henlo', 'Fridgette', 'Granny'];

const NEUE_OPTIONEN = [1, 2, 3].map(n => `doerfler${n}`);
const KEY = /^[A-Za-z][A-Za-z0-9_-]*$/;   // wie in `validateOptions`: ein Schlüssel reist in der Adresse
const platzhalter = (n) => `$optDoerfler${n}`;
const seatText = (n, villager) => text({ type: 'seat_villager', seat: n, villager });

// ── Die Optionen aus dem Roster ─────────────────────────────────────────────

/** Was am Roster nicht trägt, damit der Baustein Wahlen daraus bauen kann (leer = in Ordnung). */
function rosterFehler(roster) {
  if (!isObject(roster) || !Object.keys(roster).length) return ['scenario_data.villagers.roster fehlt oder ist leer'];
  const p = [], gesehen = new Map();
  for (const [name, v] of Object.entries(roster)) {
    if (typeof v?.short !== 'string' || !KEY.test(v.short)) { p.push(`villagers.roster.${name}.short ist kein Schlüssel (Buchstaben, Ziffern, „_“, „-“): ${text(v?.short)}`); continue; }
    if (gesehen.has(v.short)) p.push(`villagers.roster: der Kurzname „${v.short}“ kommt zweimal vor (${gesehen.get(v.short)}, ${name}) — er ist der Schlüssel der Wahl`);
    else gesehen.set(v.short, name);
  }
  for (const k of VORGABE) if (!gesehen.has(k)) p.push(`villagers.roster: kein Dörfler mit dem Kurznamen „${k}“ — die Vorgabe der Wahl wäre keine Wahl`);
  return p;
}

/** `{ doerfler1, doerfler2, doerfler3 }`, in dieser Reihenfolge, je neun Wahlen in der Reihenfolge des Rosters. */
function zielOptionen(roster) {
  return Object.fromEntries([1, 2, 3].map(n => [`doerfler${n}`, {
    label: `Dörfler ${n}`,
    default: VORGABE[n - 1],
    choices: Object.fromEntries(Object.entries(roster).map(([name, v]) => [v.short, { label: name, vars: { [`Doerfler${n}`]: name } }])),
  }]));
}

/**
 * Stimmen die drei Optionen mit dem Roster? Eine Meldung je Fehler, leer = in Ordnung. **Das prüft der Baustein, nicht
 * `validateOptions`**: das Roster ist TFT-Wissen, und `validateOptions` soll keines haben.
 * Geprüft wird: jede Option da; `default` eine ihrer Wahlen; die Schlüssel die Kurznamen des Rosters **in dessen Reihenfolge**;
 * jede Wahl nennt in `vars.Doerfler<n>` einen Schlüssel des Rosters, dessen `short` ihr Schlüssel ist.
 */
export function rosterProbleme(scenario) {
  const roster = scenario?.villagers?.roster;
  if (!isObject(roster)) return ['scenario_data.villagers.roster fehlt'];
  const kurz = Object.values(roster).map(v => v?.short);
  const p = [];
  for (const n of [1, 2, 3]) {
    const wo = `options.doerfler${n}`;
    const o = scenario?.options?.[`doerfler${n}`];
    if (!isObject(o)) { p.push(`${wo} fehlt`); continue; }
    const choices = isObject(o.choices) ? o.choices : {};
    if (!hat(choices, o.default)) p.push(`${wo}: default „${o.default}“ ist keine ihrer Wahlen`);
    if (text(Object.keys(choices)) !== text(kurz)) p.push(`${wo}.choices: die Schlüssel (${Object.keys(choices).join(', ')}) sind nicht die Kurznamen des Rosters in dessen Reihenfolge (${kurz.join(', ')})`);
    for (const [key, c] of Object.entries(choices)) {
      const name = c?.vars?.[`Doerfler${n}`];
      if (typeof name !== 'string' || !hat(roster, name)) p.push(`${wo}.choices.${key}.vars.Doerfler${n}: „${name}“ ist kein Schlüssel von villagers.roster`);
      else if (roster[name].short !== key) p.push(`${wo}.choices.${key}: der Schlüssel ist nicht der Kurzname von „${name}“ (${roster[name].short})`);
      else if (c.label !== name) p.push(`${wo}.choices.${key}.label ist „${c.label}“, erwartet der volle Name „${name}“`);
    }
  }
  return p;
}

// ── Einordnen und ändern ────────────────────────────────────────────────────

/**
 * Die beiden Stücke dieses Schrittes einordnen — **eine** Frage mit drei Antworten:
 *
 * - `zu-schreiben`: `options` trägt genau `partie` und `troedel`, und die drei Plätze nennen genau ihre alten Namen (`ALT`);
 *   `scenario` und `sequence` sind der Zielstand.
 * - `schon-da`: `options` ist genau das Ziel (die drei Schlüssel, in dieser Reihenfolge, Zeichen für Zeichen), und die drei Plätze
 *   nennen `$optDoerfler<n>`; `scenario` und `sequence` sind die Eingabe.
 * - `abweichend`: alles andere, auch jeder halbe Stand. `probleme` nennt jede Abweichung mit Pfad; Zielstand gibt es keinen.
 *
 * Verändert die Eingabe nicht; überschreibt nie.
 *
 * @param {object} scenario  – `scenario_data` (gelesen)
 * @param {Array}  sequence  – `sequence_data` (gelesen)
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', scenario?: object, sequence?: Array, probleme?: string[] }}
 */
export function patchOptionen(scenario, sequence) {
  const probleme = [];
  const roster = scenario?.villagers?.roster;
  const rf = rosterFehler(roster);
  probleme.push(...rf);

  // ── options ──
  const opts = scenario?.options;
  let optionen = null;                    // 'alt' | 'neu'
  if (!isObject(opts)) probleme.push('options fehlt (erwartet ein Objekt mit partie und troedel)');
  else {
    const fehlen = ['partie', 'troedel'].filter(k => !hat(opts, k));
    const fremd = Object.keys(opts).filter(k => !['partie', 'troedel', ...NEUE_OPTIONEN].includes(k));
    const da = NEUE_OPTIONEN.filter(k => hat(opts, k));
    for (const k of fehlen) probleme.push(`options.${k} fehlt`);
    for (const k of fremd) probleme.push(`options.${k} ist ein Schlüssel, den der Ausgang nicht kennt (erwartet genau partie und troedel, dazu nach dem Schritt doerfler1–doerfler3)`);
    if (!fehlen.length && !fremd.length && !da.length) optionen = 'alt';
    else if (!fehlen.length && !fremd.length && !rf.length) {
      const soll = zielOptionen(roster);
      const unterschied = da.filter(k => text(opts[k]) !== text(soll[k]));
      for (const k of unterschied) probleme.push(`options.${k} ist da und anders als das Ziel: ist ${text(opts[k])}, erwartet ${text(soll[k])}`);
      if (da.length < NEUE_OPTIONEN.length && !unterschied.length) {
        probleme.push(`options.${da.join(', options.')} ${da.length === 1 ? 'ist' : 'sind'} da, ${NEUE_OPTIONEN.filter(k => !da.includes(k)).join(', ')} fehl${da.length === 2 ? 't' : 'en'} (halber Stand)`);
      }
      if (!unterschied.length && da.length === NEUE_OPTIONEN.length) {
        if (text(Object.keys(opts)) === text(['partie', 'troedel', ...NEUE_OPTIONEN])) optionen = 'neu';
        else probleme.push(`options: die Reihenfolge der Schlüssel ist ${Object.keys(opts).join(', ')}, erwartet partie, troedel, ${NEUE_OPTIONEN.join(', ')}`);
      }
    }
  }

  // ── die drei Schritte ──
  const stand = [];                       // je Platz: 'alt' | 'neu' | null
  if (!Array.isArray(sequence)) probleme.push('sequence_data ist kein Feld von Schritten');
  else {
    SITZE.forEach((i, k) => {
      const n = k + 1, s = sequence[i];
      if (s === undefined) { probleme.push(`sequence[${i}] fehlt (erwartet ${seatText(n, ALT[k])})`); stand.push(null); return; }
      const t = text(s);
      if (t === seatText(n, ALT[k])) stand.push('alt');
      else if (t === seatText(n, platzhalter(n))) stand.push('neu');
      else {
        probleme.push(`sequence[${i}]: ist ${t}, erwartet ${seatText(n, ALT[k])} (oder schon ${seatText(n, platzhalter(n))})`);
        stand.push(null);
      }
    });
  }
  const schritte = stand.length === SITZE.length && stand.every(s => s === 'alt') ? 'alt'
    : stand.length === SITZE.length && stand.every(s => s === 'neu') ? 'neu' : null;
  if (!schritte && stand.every(s => s !== null) && stand.length === SITZE.length) {
    probleme.push(`Schritte halb geschrieben: ${SITZE.map((i, k) => `sequence[${i}] ${stand[k]}`).join(', ')}`);
  }

  // ── zusammen ──
  if (!probleme.length && optionen && schritte && optionen !== schritte) {
    const sitze = SITZE.map(i => `sequence[${i}]`).join(', ');
    probleme.push(optionen === 'neu'
      ? `halber Stand: options sind schon geschrieben, die Schritte nicht (${sitze})`
      : `halber Stand: die Schritte sind schon geschrieben (${sitze}), options nicht`);
  }
  if (probleme.length) return { art: 'abweichend', probleme };
  if (optionen === 'neu') return { art: 'schon-da', scenario: copy(scenario), sequence: copy(sequence) };

  const nextScenario = { ...copy(scenario), options: { ...copy(opts), ...zielOptionen(roster) } };
  const nextSequence = copy(sequence);
  SITZE.forEach((i, k) => { nextSequence[i].villager = platzhalter(k + 1); });
  const rp = rosterProbleme(nextScenario);
  if (rp.length) return { art: 'abweichend', probleme: rp };
  return { art: 'zu-schreiben', scenario: nextScenario, sequence: nextSequence };
}

const abwTeil = (t, ist) => {
  let k = 0;
  while (k < t.length && t[k] === ist[k]) k++;
  return `weicht ab Zeichen ${k} ab („…${t.slice(Math.max(0, k - 30), k + 30)}…“ gegen „…${ist.slice(Math.max(0, k - 30), k + 30)}…“)`;
};

/**
 * Der Rückwärtsbeweis, auf dem Zielstand und **vor** dem Schreiben — je Spalte: im neuen Text die drei neuen Schlüssel von `options`
 * entfernen und die drei `villager` zurücksetzen, das muss den gelesenen Text ergeben, Zeichen für Zeichen. Er zeigt zugleich, dass jeder
 * andere Schlüssel, jeder andere Schritt und beide Reihenfolgen unberührt sind.
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweise(before, after) {
  const meldungen = [];
  const sc = copy(after.scenario ?? {});
  if (isObject(sc.options)) for (const k of NEUE_OPTIONEN) delete sc.options[k];
  const altSc = text(before.scenario);
  if (text(sc) !== altSc) meldungen.push(`Rückwärtsbeweis scenario_data: ohne doerfler1–doerfler3 ist der Text nicht der gelesene — ${abwTeil(text(sc), altSc)}`);
  const sq = copy(after.sequence ?? []);
  SITZE.forEach((i, k) => { if (isObject(sq[i])) sq[i].villager = ALT[k]; });
  const altSq = text(before.sequence);
  if (text(sq) !== altSq) meldungen.push(`Rückwärtsbeweis sequence_data: mit den alten Namen ist der Text nicht der gelesene — ${abwTeil(text(sq), altSq)}`);
  return meldungen;
}

/** Der Hash, den `--sicherung-sha` nennt: über **beide** gelesenen Texte, in dieser Reihenfolge. */
export const sicherungsHash = (scenarioText, sequenceText) => sha256(text([scenarioText, sequenceText]));

// ── Der Schritt `zaehler` ───────────────────────────────────────────────────

const DORFPHASE = 'dorfphase-beginnen';
const WERTE = ['Leben', 'Bewegung', 'Mumm', 'Präzision'];
/** Der Hash des Textes von `counters` je Platz — der erwartete **alte** Text (Regel 5 in `docs/datenzugriff.md`), gemessen an der Sicherung. */
export const ZAEHLER_ALT = ['d3933ae778f6', 'af4a129e51ea', 'fbaf6935d5c2'];
/** Die Lage der zwölf `set_counter` in `dorfphase-beginnen` (0-basiert, `bis` ausgeschlossen) und die Länge der Aktion vor und nach dem Schritt. */
const SAETZE = { von: 16, bis: 28 };
const LAENGE = { alt: 45, neu: 33 };
const WO = `action_data[${DORFPHASE}].steps`;
const satzSchritt = (n, wert) => ({ type: 'set_counter', name: `$V${n}: ${wert}`, value: wert === 'Leben' ? 'max' : 'base' });
const ZWOELF = [1, 2, 3].flatMap(n => WERTE.map(w => satzSchritt(n, w)));
/** Die drei Lebensleisten: die Zonen, die die neue Wache liest — und die der Baustein in `zone_data` finden muss. */
export const WACHE_ZONEN = [1, 2, 3].map(n => `Dörfler ${n}: Leben`);
const WACHE_ALT = {
  type: 'require_counter', name: [1, 2, 3].map(n => `$V${n}: Leben`), above: 0, confirm: true,
  message: 'Alle drei Lebenszähler stehen auf 0 — alle Dörfler sind besiegt. Nach [DE S.22] ist die Partie damit zu Ende.',
};
/** Schlüsselreihenfolge wie in M30.9 (sie ist Teil des Hashes). */
const WACHE_NEU = {
  type: 'require_marker', zoneLabel: WACHE_ZONEN, above: 0, confirm: true,
  message: 'Auf keiner Lebensleiste liegt noch ein Marker — alle drei Dörfler sind besiegt. Nach [DE S.22] ist die Partie damit zu Ende.',
};

/**
 * Die drei Stücke des Schrittes einordnen — **eine** Frage mit drei Antworten, wie bei `patchOptionen`:
 *
 * - `zu-schreiben`: jedes `counters` ist der Text mit dem erwarteten Hash, Schritt 1 ist genau die alte Wache, 16–27 sind genau die
 *   zwölf alten `set_counter`; die Aktion hat 45 Schritte.
 * - `schon-da`: kein Platz nennt `counters`, Schritt 1 ist genau die neue Wache, die zwölf sind weg (33 Schritte, kein `set_counter $V<n>`).
 * - `abweichend`: alles andere, auch jeder halbe Stand. `probleme` nennt jede Abweichung mit Pfad; Zielstand gibt es keinen.
 *
 * `zones` ist `zone_data`: die drei Lebensleisten müssen darin stehen, sonst hätte die Wache nichts zu lesen (gilt auch für `schon-da`).
 * Verändert die Eingabe nicht. Der Zielstand trägt die zweite Spalte unter `action`.
 *
 * @param {object} scenario  – `scenario_data` (gelesen)
 * @param {Array}  actions   – `action_data` (gelesen)
 * @param {Array}  zones     – `zone_data` (gelesen, nur gelesen)
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', scenario?: object, action?: Array, probleme?: string[] }}
 */
export function patchZaehler(scenario, actions, zones) {
  const probleme = [];
  const stuecke = [];                       // [Pfad, 'alt' | 'neu'], solange das Stück eindeutig ist

  // ── scenario_data: der Text von `counters` je Platz ──
  const seats = scenario?.villagers?.seats;
  if (!Array.isArray(seats) || seats.length !== ZAEHLER_ALT.length) probleme.push(`scenario_data.villagers.seats fehlt oder hat nicht ${ZAEHLER_ALT.length} Plätze`);
  else {
    seats.forEach((s, i) => {
      const wo = `scenario_data.villagers.seats[${i}]`;
      if (!isObject(s)) probleme.push(`${wo} ist kein Objekt`);
      else if (!hat(s, 'counters')) stuecke.push([`${wo}.counters`, 'neu']);
      else if (sha(text(s.counters)) === ZAEHLER_ALT[i]) stuecke.push([`${wo}.counters`, 'alt']);
      else probleme.push(`${wo}.counters: ist ${text(s.counters)}, erwartet den Text mit sha ${ZAEHLER_ALT[i]} (oder schon ohne counters)`);
    });
  }

  // ── action_data: die Wache und die zwölf Schritte ──
  const dorfphase = Array.isArray(actions) ? actions.filter(a => a?.id === DORFPHASE) : [];
  if (!Array.isArray(actions)) probleme.push('action_data ist kein Feld von Aktionen');
  else if (dorfphase.length !== 1) probleme.push(`action_data: ${dorfphase.length} Aktionen mit der id „${DORFPHASE}“, erwartet genau eine`);
  else if (!Array.isArray(dorfphase[0].steps)) probleme.push(`${WO} ist kein Feld von Schritten`);
  else {
    const steps = dorfphase[0].steps;
    const eins = text(steps[1]);
    if (eins === text(WACHE_ALT)) stuecke.push([`${WO}[1]`, 'alt']);
    else if (eins === text(WACHE_NEU)) stuecke.push([`${WO}[1]`, 'neu']);
    else probleme.push(`${WO}[1]: ist ${eins}, erwartet ${text(WACHE_ALT)} (oder schon ${text(WACHE_NEU)})`);

    const wo = `${WO}[${SAETZE.von}–${SAETZE.bis - 1}]`;
    const uebrig = steps.some(s => s?.type === 'set_counter' && /^\$V\d: /.test(String(s.name)));
    if (steps.length === LAENGE.neu && !uebrig) stuecke.push([wo, 'neu']);
    else if (steps.length === LAENGE.alt && ZWOELF.every((z, k) => text(steps[SAETZE.von + k]) === text(z))) stuecke.push([wo, 'alt']);
    else {
      if (steps.length !== LAENGE.alt && steps.length !== LAENGE.neu) probleme.push(`${WO}: ${steps.length} Schritte, erwartet ${LAENGE.alt} (oder schon ${LAENGE.neu})`);
      ZWOELF.forEach((z, k) => {
        const i = SAETZE.von + k;
        if (text(steps[i]) !== text(z)) probleme.push(`${WO}[${i}]: ist ${text(steps[i])}, erwartet ${text(z)}`);
      });
      if (uebrig && steps.length === LAENGE.neu) probleme.push(`${WO}: ein set_counter auf $V<n> steht noch da, obwohl die Aktion nur noch ${LAENGE.neu} Schritte hat`);
    }
  }

  // ── zone_data: die Zonen, die die neue Wache liest ──
  if (!Array.isArray(zones)) probleme.push('zone_data ist kein Feld von Zonen — die Wache hätte nichts zu lesen');
  else for (const z of WACHE_ZONEN) if (!zones.some(x => x?.label === z)) probleme.push(`zone_data: keine Zone „${z}“ — die Wache (require_marker) hätte nichts zu lesen`);

  // ── zusammen: alle alt, oder alle neu ──
  if (!probleme.length && !stuecke.every(([, s]) => s === 'alt') && !stuecke.every(([, s]) => s === 'neu')) {
    probleme.push(`halber Stand: ${stuecke.map(([wo, s]) => `${wo} ${s === 'alt' ? 'noch alt' : 'schon geschrieben'}`).join(', ')}`);
  }
  if (probleme.length) return { art: 'abweichend', probleme };
  if (stuecke.every(([, s]) => s === 'neu')) return { art: 'schon-da', scenario: copy(scenario), action: copy(actions) };

  const nextScenario = copy(scenario);
  for (const s of nextScenario.villagers.seats) delete s.counters;
  const nextAction = copy(actions);
  const steps = nextAction.find(a => a.id === DORFPHASE).steps;
  steps[1] = copy(WACHE_NEU);
  steps.splice(SAETZE.von, SAETZE.bis - SAETZE.von);
  return { art: 'zu-schreiben', scenario: nextScenario, action: nextAction };
}

/**
 * Der Rückwärtsbeweis des Schrittes, auf dem Zielstand und **vor** dem Schreiben: die drei `counters` aus dem Gelesenen wieder einsetzen,
 * Schritt 1 und die zwölf Schritte zurück — das muss beide gelesenen Texte ergeben, Zeichen für Zeichen. Ein `counters`, das im Zielstand
 * noch da ist, ist kein Zielstand. Verändert nichts.
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweiseZaehler(before, after) {
  const meldungen = [];
  const sc = copy(after.scenario ?? {});
  const alt = before.scenario?.villagers?.seats;
  const seats = sc?.villagers?.seats;
  if (Array.isArray(seats)) {
    seats.forEach((s, i) => {
      if (!isObject(s)) return;
      if (hat(s, 'counters')) meldungen.push(`Rückwärtsbeweis scenario_data: villagers.seats[${i}].counters ist im Zielstand noch da`);
      else if (isObject(alt?.[i]) && hat(alt[i], 'counters')) s.counters = copy(alt[i].counters);
    });
  }
  const altSc = text(before.scenario);
  if (text(sc) !== altSc) meldungen.push(`Rückwärtsbeweis scenario_data: mit den alten counters ist der Text nicht der gelesene — ${abwTeil(text(sc), altSc)}`);

  const ac = copy(after.action ?? []);
  const neu = Array.isArray(ac) ? ac.find(a => a?.id === DORFPHASE) : null;
  const vorher = Array.isArray(before.action) ? before.action.find(a => a?.id === DORFPHASE) : null;
  if (Array.isArray(neu?.steps) && Array.isArray(vorher?.steps)) {
    neu.steps[1] = copy(vorher.steps[1]);
    neu.steps.splice(SAETZE.von, 0, ...copy(vorher.steps.slice(SAETZE.von, SAETZE.bis)));
  }
  const altAc = text(before.action);
  if (text(ac) !== altAc) meldungen.push(`Rückwärtsbeweis action_data: mit der alten Wache und den zwölf set_counter ist der Text nicht der gelesene — ${abwTeil(text(ac), altAc)}`);
  return meldungen;
}

// ── Fingerabdruck ───────────────────────────────────────────────────────────

/** SHA-256 je Tabelle; bei `setups` ohne die zwei Spalten, die sich ändern dürfen (`spalten`, z. B. `['scenario', 'sequence']`). */
function fingerabdruck(db, spalten) {
  const out = {};
  for (const { name } of db.prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name").all()) {
    let cols = db.prepare(`pragma table_info("${name}")`).all().map(c => c.name);
    if (name === 'setups') cols = cols.filter(c => !spalten.map(s => `${s}_data`).includes(c));
    const h = crypto.createHash('sha256');
    for (const row of db.prepare(`select ${cols.map(c => `"${c}"`).join(', ')} from "${name}" order by rowid`).iterate()) h.update(text(row)).update('\n');
    out[name] = h.digest('hex').slice(0, 16);
  }
  return out;
}

/** Ein Hash je Zeile von `save_states` — Name und Stand dabei, damit eine Abweichung beim Namen genannt werden kann. */
function saveStateHashes(db) {
  return Object.fromEntries(db.prepare('select * from save_states order by rowid').all().map(r => [r.id, { name: r.name, updated_at: r.updated_at, sha: sha(text(r)) }]));
}

/** Ein Hash je Spalte der Zeile des Aufbaus, **ohne** die zwei geschriebenen — `updated_at` gehört dazu. */
function spaltenHashes(db, spalten) {
  const row = db.prepare('select * from setups where id = ?').get(SETUP_ID);
  return Object.fromEntries(Object.entries(row).filter(([k]) => !spalten.map(s => `${s}_data`).includes(k)).map(([k, v]) => [k, sha(String(v))]));
}

/**
 * Die Transaktion: Sperre, Fingerabdruck vorher, (Haken), Vergleich-und-Tausch beider Spalten, Fingerabdruck nachher.
 * Wirft bei jeder Abweichung — und `better-sqlite3` rollt zurück. `von`/`nach`: je Spalte (`scenario`, `sequence`, `action`) der Text.
 */
function tausche(db, { spalten, von, nach, haken }) {
  const [a, b] = spalten.map(s => `${s}_data`);
  const [sa, sb] = spalten;
  const tx = db.transaction(() => {
    const vorher = fingerabdruck(db, spalten);
    const saves = saveStateHashes(db);
    const hashes = spaltenHashes(db, spalten);
    haken?.('in-transaktion', db);
    // Nur diese zwei Spalten, nur auf den exakt gelesenen Texten.
    const r = db.prepare(`update setups set ${a} = ?, ${b} = ? where id = ? and ${a} = ? and ${b} = ?`)
      .run(nach[sa], nach[sb], SETUP_ID, von[sa], von[sb]);
    if (r.changes !== 1) throw new Error(`${a} oder ${b} hat sich seit dem Lesen geändert — nichts geschrieben`);
    const nachher = fingerabdruck(db, spalten);
    const savesNachher = saveStateHashes(db);
    const zeilen = Object.keys({ ...saves, ...savesNachher }).filter(id => saves[id]?.sha !== savesNachher[id]?.sha)
      .map(id => `save_states-Zeile „${(saves[id] ?? savesNachher[id]).name}“ (updated_at ${saves[id]?.updated_at} → ${savesNachher[id]?.updated_at})`);
    const tabellen = Object.keys({ ...vorher, ...nachher }).filter(t => vorher[t] !== nachher[t]);
    if (zeilen.length || tabellen.length) throw new Error(`unerwartet geändert: ${[...zeilen, ...tabellen].join(', ')} — Rollback`);
    return { spalten, vorher, saves, hashes, hashesNachher: spaltenHashes(db, spalten) };
  });
  // IMMEDIATE: die Schreibsperre wird genommen, bevor der erste Hash berechnet wird.
  return tx.immediate();
}

/** Die Kontrollausgabe zum Fingerabdruck — gelesen nach dem Schreiben. */
function fingerabdruckZeilen(db, t) {
  // In der Transaktion exakt: wäre etwas abgewichen, hätte `tausche` geworfen und zurückgerollt.
  console.log('  Fingerabdruck aller Tabellen (setups ohne die zwei geschriebenen Spalten, save_states, zone_data, grid_data, state_data …), in der Transaktion vorher/nachher, unverändert: true');
  console.log(`  Fingerabdruck nach dem Commit neu gelesen: ${text(t.vorher) === text(fingerabdruck(db, t.spalten)) ? 'gleich' : 'ABWEICHEND (ein offener Tisch kann die Zeile Auto Save schreiben — docs/datenzugriff.md)'}`);
  console.log(`  Spalten der Zeile, die nicht geschrieben wurden: ${Object.keys(t.hashes).map(k => `${k} ${t.hashes[k]}${t.hashes[k] === t.hashesNachher[k] ? '' : ` → ${t.hashesNachher[k]} GEÄNDERT`}`).join(', ')}`);
  const jetzt = saveStateHashes(db);
  for (const [id, s] of Object.entries(t.saves)) {
    console.log(`  save_states ${s.name}: sha ${s.sha} → ${jetzt[id]?.sha ?? 'GELÖSCHT'} ${s.sha === jetzt[id]?.sha ? 'gleich' : 'ABWEICHEND (nach dem Commit geschrieben, z. B. Auto Save)'}`);
  }
  console.log(`  save_states: ${Object.keys(jetzt).length} Zeilen (in der Transaktion ${Object.keys(t.saves).length})`);
}

// ── Die Schritte: was je Schritt anders ist ─────────────────────────────────

/**
 * Je Schritt, was das gemeinsame Gerüst (Lesen, Einordnen, Tausch, Kontrolle) nicht wissen kann. Die Schlüssel sind die Namen aus `SCHRITTE`.
 *
 * - `spalten`: die zwei Spalten, die der Schritt ändert (Name ohne `_data`) — nur diese werden gelesen und geschrieben;
 * - `extra`: Spalten, die der Schritt **nur liest** (`zone_data` bei `zaehler`);
 * - `patch(before, ctx)`: das Einordnen (`patchOptionen`, `patchZaehler`); `before` trägt die gelesenen Spalten als Wert, `ctx.zones` die Zonen;
 * - `beweise(before, after)`: der Rückwärtsbeweis; `gelesen(before)`, `schonDa(before)`, `plan(before, next)`, `kontrolle(before, after)`: Ausgaben;
 * - `pruefer(scenario, ctx)`: die Prüfer des Schrittes auf dem Zielstand, `[{ titel, probleme }]` (`validateScenarioData` kommt für jeden dazu).
 */
const DEFS = {
  optionen: {
    spalten: ['scenario', 'sequence'],
    extra: [],
    patch: (b) => patchOptionen(b.scenario, b.sequence),
    beweise,
    gelesen: (b) => `options: ${Object.keys(b.scenario?.options ?? {}).join(', ')}`,
    schonDa: (b) => `schon geschrieben: options ${Object.keys(b.scenario.options).join(', ')}, die Plätze nennen $optDoerfler1–3 — nichts zu schreiben`,
    plan: (b, n) => {
      for (const k of NEUE_OPTIONEN) {
        const o = n.scenario.options[k];
        console.log(`  + options.${k}   (${text(o).length} Zeichen, hinten angehängt: ${o.label}, Vorgabe ${o.default}, ${Object.keys(o.choices).length} Wahlen)`);
      }
      SITZE.forEach((i, k) => console.log(`  sequence[${i}]: villager ${text(ALT[k])} → ${text(platzhalter(k + 1))}`));
    },
    pruefer: (sc, ctx) => [
      { titel: 'validateOptions', probleme: validateOptions(sc.options, ctx.sequence) },
      { titel: 'Wahlen gegen das Roster', probleme: rosterProbleme(sc) },
    ],
    kontrolle: (before, after) => {
      for (const k of Object.keys(after.scenario).filter(x => x !== 'options')) {
        console.log(`  Schlüssel ${k.padEnd(18)} sha ${sha(text(before.scenario[k]))} → ${sha(text(after.scenario[k]))} ${text(before.scenario[k]) === text(after.scenario[k]) ? 'gleich' : 'GEÄNDERT'}`);
      }
      for (const k of Object.keys(after.scenario.options)) {
        const alt = before.scenario.options[k];
        console.log(`  options.${k.padEnd(10)} sha ${alt === undefined ? '(fehlt)' : sha(text(alt))} → ${sha(text(after.scenario.options[k]))} ${alt === undefined ? 'neu' : text(alt) === text(after.scenario.options[k]) ? 'gleich' : 'GEÄNDERT'}`);
      }
      SITZE.forEach((i) => console.log(`  sequence[${i}] ${text(after.sequence[i])}`));
      const ungleich = before.sequence.map((_, i) => i).filter(i => text(before.sequence[i]) !== text(after.sequence[i]));
      console.log(`  Schritte der Folge, die sich geändert haben: ${ungleich.join(', ')} (von ${after.sequence.length})`);
    },
  },
  zaehler: {
    spalten: ['scenario', 'action'],
    extra: ['zone_data'],
    patch: (b, ctx) => patchZaehler(b.scenario, b.action, ctx.zones),
    beweise: beweiseZaehler,
    gelesen: (b) => `${DORFPHASE}: ${dorfphaseSchritte(b.action)} Schritte`,
    schonDa: () => `schon geschrieben: kein Platz nennt counters, ${DORFPHASE}[1] ist require_marker, die zwölf set_counter sind weg — nichts zu schreiben`,
    plan: (b, n) => {
      b.scenario.villagers.seats.forEach((s, i) => console.log(`  - villagers.seats[${i}].counters entfällt (${text(s.counters).length} Zeichen, sha ${sha(text(s.counters))})`));
      console.log(`  ${DORFPHASE}[1]: require_counter → require_marker (${WACHE_ZONEN.join(', ')})`);
      console.log(`  ${DORFPHASE}[${SAETZE.von}–${SAETZE.bis - 1}]: zwölf set_counter entfallen (${dorfphaseSchritte(b.action)} → ${dorfphaseSchritte(n.action)} Schritte)`);
    },
    pruefer: (sc, ctx) => [{ titel: 'validateVillagers', probleme: validateVillagers(sc.villagers, { assets: ctx.assets, cards: ctx.cards, zones: ctx.zones }) }],
    kontrolle: (before, after) => {
      for (const k of Object.keys(after.scenario)) {
        console.log(`  Schlüssel ${k.padEnd(18)} sha ${sha(text(before.scenario[k]))} → ${sha(text(after.scenario[k]))} ${text(before.scenario[k]) === text(after.scenario[k]) ? 'gleich' : 'GEÄNDERT (counters weg)'}`);
      }
      after.scenario.villagers.seats.forEach((s, i) => console.log(`  villagers.seats[${i}] Schlüssel: ${Object.keys(s).join(', ')}`));
      const d = after.action.find(a => a.id === DORFPHASE);
      console.log(`  ${DORFPHASE} hat ${d.steps.length} Schritte, Schritt 1 ist ${d.steps[1].type}`);
      for (const a of before.action.filter(x => x.id !== DORFPHASE)) {
        console.log(`  Aktion ${a.id.padEnd(18)} sha ${sha(text(a))} → ${sha(text(after.action.find(x => x.id === a.id)))} ${text(a) === text(after.action.find(x => x.id === a.id)) ? 'gleich' : 'GEÄNDERT'}`);
      }
    },
  },
  boss: null,
};

const dorfphaseSchritte = (actions) => (Array.isArray(actions) ? actions.find(a => a?.id === DORFPHASE)?.steps?.length : undefined);

// ── CLI ─────────────────────────────────────────────────────────────────────

const USAGE = 'usage: setupwahl-daten.mjs --check <db> --schritt <optionen|zaehler|boss> | --write <db> --schritt <…> --sicherung-sha <hex> | --zurueck <sicherungsdatei> <db> --schritt <…>';
const MODI = ['--check', '--write', '--zurueck'];
const MIT_WERT = ['--schritt', '--sicherung-sha'];

/** Was nicht in `MODI` oder `MIT_WERT` steht und mit `--` beginnt, ist **unbekannt** — auch `--force`. Ein Wert, der mit `--` beginnt, ist keiner. */
function argumente(argv) {
  const o = { modi: [], pos: [], unbekannt: [], wert: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (MIT_WERT.includes(a)) {
      const n = argv[i + 1];
      if (n === undefined || n.startsWith('--')) o.wert[a] = '';
      else { o.wert[a] = n; i++; }
    } else if (MODI.includes(a)) o.modi.push(a);
    else if (a.startsWith('--')) o.unbekannt.push(a);
    else o.pos.push(a);
  }
  return o;
}

/**
 * `deps.Database` ist der SQLite-Treiber. `deps.haken(stelle, db)`: **die eine** Stelle, an der ein Test einhängen kann — `'nach-lesen'`
 * (zwischen Lesen und Schreiben, außerhalb der Transaktion) und `'in-transaktion'` (nach dem Fingerabdruck vorher, vor dem UPDATE).
 */
export async function main(argv, deps = {}) {
  const { modi, pos, unbekannt, wert } = argumente(argv);
  const [mode] = modi;
  if (unbekannt.length) { console.error(`unbekanntes Argument: ${unbekannt.join(' ')}\n${USAGE}`); return 2; }
  if (modi.length !== 1 || pos.length !== (mode === '--zurueck' ? 2 : 1)) { console.error(USAGE); return 2; }
  const schritt = wert['--schritt'];
  if (!schritt || !hat(SCHRITTE, schritt)) { console.error(USAGE); return 2; }
  if (SCHRITTE[schritt].ziel === null) { console.error(`Schritt „${schritt}“ ist noch nicht gebaut — nichts gelesen, nichts geschrieben`); return 1; }
  const dbPath = mode === '--zurueck' ? pos[1] : pos[0];

  const Database = deps.Database ?? (await import('better-sqlite3')).default;
  let db;
  try { db = new Database(dbPath, { readonly: mode === '--check', fileMustExist: true }); } catch (e) { console.error(`Abbruch: ${e.message}`); return 1; }
  // Geschlossen wird immer: ein Lauf, der abbricht, lässt die Datei nicht gesperrt liegen.
  try {
    const opts = { haken: deps.haken, sicherungSha: wert['--sicherung-sha'], schritt, def: DEFS[schritt] };
    if (mode === '--check') return trockenlauf(db, opts);
    if (mode === '--write') return schreiben(db, opts);
    return zurueck(db, pos[0], opts);
  } catch (e) {
    console.error(`Abbruch: ${e.message}`);
    return 1;
  } finally {
    db.close();
  }
}

/** Die zwei Spalten des Schrittes (und was er sonst liest, und `grid_data` für den Prüfer) — nur diese. */
function lese(db, def) {
  const cols = ['game_id', 'grid_data', ...def.spalten.map(s => `${s}_data`), ...def.extra];
  return db.prepare(`select ${cols.join(', ')} from setups where id = ?`).get(SETUP_ID) ?? null;
}

/** Die gelesenen Texte der beiden Spalten, je unter dem Namen aus `SCHRITTE`. */
const rohVon = (row, def) => Object.fromEntries(def.spalten.map(s => [s, row[`${s}_data`]]));
/** Die Zonen aus `zone_data`, wenn der Schritt sie liest; sonst `undefined`. Kein JSON → `null` (der Schritt meldet es). */
const zonenVon = (row, def) => {
  if (!def.extra.includes('zone_data')) return undefined;
  try { return JSON.parse(row.zone_data); } catch { return null; }
};
const spaltenNamen = (def) => def.spalten.map(s => `${s}_data`);

/**
 * Lesen, einordnen, prüfen, ausgeben — ohne zu schreiben. `null` heißt: beanstandet (schon ausgegeben).
 * Sonst `{ art, … }`; bei `schon-da` ist nichts weiter zu tun.
 */
function vorpruefung(db, { titel, schritt, def }) {
  const complaints = [];
  const row = lese(db, def);
  if (!row) { console.error(`Aufbau ${SETUP_ID} nicht gefunden`); return null; }
  if (row.game_id !== GAME_ID) complaints.push(`Aufbau gehört zu Spiel ${row.game_id}, erwartet ${GAME_ID}`);
  const raw = rohVon(row, def);
  const before = {};
  // Beweise und Vergleich sind Vergleiche von Text und brauchen das kompakte JSON.stringify-Format.
  for (const [k, t] of Object.entries(raw)) {
    before[k] = JSON.parse(t);
    if (text(before[k]) !== t) complaints.push(`${k}_data: der gespeicherte Text ist nicht kompaktes JSON.stringify — byteweiser Vergleich nicht möglich`);
  }
  const zones = zonenVon(row, def);
  console.log(`gelesen: ${def.spalten.map(s => `${s}_data ${kennzeichen(raw[s])}`).join(', ')}, ${def.gelesen(before)}`);

  const aus = () => {
    console.log(`${titel}: ${complaints.length} Beanstandungen`);
    for (const c of complaints) console.log('  - ' + c);
    return null;
  };

  // ── Einordnung ──
  const p = def.patch(before, { zones });
  console.log(`Einordnung: ${p.art === 'zu-schreiben' ? 'zu schreiben' : p.art === 'schon-da' ? 'schon geschrieben' : 'ABWEICHEND'}`);
  if (p.art === 'abweichend') for (const m of p.probleme) complaints.push(`${m} — es wird nichts überschrieben`);
  if (complaints.length) return aus();
  if (p.art === 'schon-da') {
    console.log(def.schonDa(before));
    return { art: 'schon-da', raw, before, titel };
  }
  const next = Object.fromEntries(def.spalten.map(s => [s, p[s]]));
  const neuRaw = Object.fromEntries(def.spalten.map(s => [s, text(next[s])]));

  // ── Plan als Diff ──
  def.plan(before, next);

  // ── Beweise ──
  const b = def.beweise(before, next);
  for (const k of spaltenNamen(def)) {
    console.log(`Rückwärtsbeweis ${k}: ${b.some(m => m.startsWith(`Rückwärtsbeweis ${k}`)) ? 'NEIN' : 'ja'}`);
  }
  complaints.push(...b);

  // ── gegen die echte Assetliste, das echte Raster, die echte Bibliothek ──
  const assets = db.prepare('select id, name, type, image_path, back_image_path, width, height from table_assets where game_id = ?').all(row.game_id);
  const cards = db.prepare('select c.id, c.name, c.image_path, k.name as category from cards c left join categories k on k.id = c.category_id where c.game_id = ?').all(row.game_id);
  const grids = JSON.parse(row.grid_data);
  const probleme = validateScenarioData(next.scenario ?? before.scenario, { assets, grids, cards });
  console.log(`validateScenarioData: ${probleme.length} Probleme (${assets.length} Assets, ${cards.length} Karten, Raster „${grids[0]?.label}“)`);
  for (const m of probleme) complaints.push(`validateScenarioData: ${m}`);
  // `action_data` liest `optionen` nicht; ein `$opt…` in einer Aktion prüft der Test gegen die Fixture (M30.3, „Was nicht gilt“).
  const ctx = { assets, cards, grids, zones, sequence: next.sequence ?? before.sequence };
  for (const { titel: t, probleme: pr } of def.pruefer(next.scenario ?? before.scenario, ctx)) {
    console.log(`${t}: ${pr.length} Probleme`);
    for (const m of pr) complaints.push(t === 'Wahlen gegen das Roster' ? m : `${t}: ${m}`);
  }

  // ── Zielstand ──
  const { ausgang, ziel } = SCHRITTE[schritt];
  const istAusgang = def.spalten.every(k => raw[k].length === ausgang[k].laenge && sha(raw[k]) === ausgang[k].sha);
  console.log(`Ausgang laut Schritt: ${istAusgang ? 'gleich' : 'anders (andere Reihenfolge der Schritte? dann ist der Zielhash nicht vergleichbar)'}`);
  console.log(`Zielstand: ${def.spalten.map(k => `${k}_data ${kennzeichen(neuRaw[k])}`).join(', ')}`);
  if (istAusgang) {
    for (const k of def.spalten) {
      if (neuRaw[k].length !== ziel[k].laenge || sha(neuRaw[k]) !== ziel[k].sha) {
        complaints.push(`${k}_data: der gerechnete Zielstand hat ${kennzeichen(neuRaw[k])}, die Konstante nennt ${ziel[k].laenge} Zeichen (sha ${ziel[k].sha})`);
      }
    }
  }
  if (complaints.length) return aus();
  console.log(`${titel}: 0 Beanstandungen`);
  return { art: 'zu-schreiben', raw, before, next, neuRaw, assets, cards, grids, zones, istAusgang, titel };
}

function trockenlauf(db, opts) {
  const v = vorpruefung(db, { ...opts, titel: 'Trockenlauf' });
  if (!v) return 1;
  if (v.art === 'schon-da') return 0;
  const [a, b] = opts.def.spalten;
  console.log(`Hash für --sicherung-sha (über beide gelesene Spalten): ${sicherungsHash(v.raw[a], v.raw[b])}`);
  console.log(`würde schreiben: ${a}_data ${v.raw[a].length} → ${v.neuRaw[a].length} Zeichen, ${b}_data ${v.raw[b].length} → ${v.neuRaw[b].length} Zeichen (nichts geschrieben)`);
  return 0;
}

function schreiben(db, { sicherungSha, haken, ...opts }) {
  const { def, schritt } = opts;
  const v = vorpruefung(db, { ...opts, titel: 'Vorprüfung' });
  if (!v) return 1;
  if (v.art === 'schon-da') { console.log('nichts zu schreiben'); return 0; }
  const { raw, before, next, neuRaw, assets, cards, grids, zones, istAusgang } = v;
  const [a, b] = def.spalten;

  // ── Die Sicherung: ohne sie kein Schreiben ──
  if (!sicherungSha) { console.error('ohne Sicherung kein Schreiben: --sicherung-sha <Hash der gesicherten Spalten> fehlt'); return 1; }
  if (!/^[0-9a-f]{12,64}$/i.test(sicherungSha)) { console.error('--sicherung-sha braucht mindestens 12 Hex-Stellen'); return 1; }
  const gelesenHash = sicherungsHash(raw[a], raw[b]);
  if (!gelesenHash.startsWith(sicherungSha.toLowerCase())) {
    console.error(`der Hash der Sicherung (${sicherungSha}) passt nicht zum gelesenen Text (der Hash über beide Spalten beginnt mit ${gelesenHash.slice(0, 12)}) — die Sicherung ist nicht der Stand, der überschrieben würde`);
    return 1;
  }

  haken?.('nach-lesen', db);
  const t = tausche(db, { spalten: def.spalten, von: raw, nach: neuRaw, haken });

  // ── Kontrollausgabe: neu gelesen, nicht aus dem Plan ──
  const jetzt = lese(db, def);
  const gelesen = rohVon(jetzt, def);
  const after = Object.fromEntries(def.spalten.map(s => [s, JSON.parse(gelesen[s])]));
  const abw = (k) => (gelesen[k] === neuRaw[k] ? '' : ' — WEICHT VOM ZIELSTAND AB');
  console.log(`geschrieben: ${a}_data ${raw[a].length} → ${gelesen[a].length} Zeichen, sha ${sha(raw[a])} → ${sha(gelesen[a])}${abw(a)}`);
  console.log(`  ${b}_data ${raw[b].length} → ${gelesen[b].length} Zeichen, sha ${sha(raw[b])} → ${sha(gelesen[b])}${abw(b)}`);
  def.kontrolle(before, after);
  const bw = def.beweise(before, after);
  for (const k of spaltenNamen(def)) {
    console.log(`  Rückwärtsbeweis ${k} auf der gelesenen Spalte: ${bw.some(m => m.startsWith(`Rückwärtsbeweis ${k}`)) ? 'NEIN' : 'ja'}`);
  }
  const scenarioNachher = after.scenario ?? before.scenario;
  const probleme = validateScenarioData(scenarioNachher, { assets, grids, cards });
  console.log(`  validateScenarioData auf der gelesenen Spalte: ${probleme.length} Probleme`);
  const ctx = { assets, cards, grids, zones, sequence: after.sequence ?? before.sequence };
  const weitere = def.pruefer(scenarioNachher, ctx);
  for (const { titel: tt, probleme: pr } of weitere) console.log(`  ${tt} auf der gelesenen Spalte: ${pr.length} Probleme`);
  const { ziel } = SCHRITTE[schritt];
  const gleichZiel = def.spalten.every(k => gelesen[k].length === ziel[k].laenge && sha(gelesen[k]) === ziel[k].sha);
  console.log(istAusgang
    ? `  Zielstand aus den Konstanten (${def.spalten.map(k => `${k}_data ${ziel[k].laenge}/${ziel[k].sha}`).join(', ')}): ${gleichZiel ? 'erreicht' : 'NICHT erreicht'}`
    : '  Zielstand: nicht mit den Konstanten vergleichbar (der Ausgang war ein anderer) — erreicht heißt hier: der gerechnete Text');
  fingerabdruckZeilen(db, t);
  const ok = def.spalten.every(k => gelesen[k] === neuRaw[k]) && (!istAusgang || gleichZiel) && !bw.length && !probleme.length && weitere.every(w => !w.probleme.length);
  return ok ? 0 : 1;
}

/** Der Weg zurück: die Datenbank muss **genau der Zielstand** sein, der aus der Sicherung folgt, dann kommt der gesicherte Text wieder. */
function zurueck(db, sicherungsdatei, { haken, def }) {
  const [a, b] = def.spalten;
  // ── die Sicherung prüfen: Form, Hash zum Text, kompakt, und sie ist der Ausgang dieses Schrittes ──
  const s = JSON.parse(fs.readFileSync(sicherungsdatei, 'utf8'));
  if (typeof s?.[`${a}_data`] !== 'string' || typeof s[`${b}_data`] !== 'string' || typeof s.sha256 !== 'string') {
    throw new Error(`die Sicherung hat nicht die Form { ${a}_data, ${b}_data, sha256, updated_at }`);
  }
  const gesichert = { [a]: s[`${a}_data`], [b]: s[`${b}_data`] };
  if (sicherungsHash(gesichert[a], gesichert[b]) !== s.sha256) {
    console.error(`Hash der Sicherung passt nicht zu ihren Texten (${sicherungsHash(gesichert[a], gesichert[b]).slice(0, 12)} gegen ${s.sha256.slice(0, 12)}) — die Datei ist beschädigt`);
    return 1;
  }
  const alt = { [a]: JSON.parse(gesichert[a]), [b]: JSON.parse(gesichert[b]) };
  if (text(alt[a]) !== gesichert[a] || text(alt[b]) !== gesichert[b]) { console.error('der gesicherte Text ist nicht kompaktes JSON.stringify'); return 1; }

  const row = lese(db, def);
  if (!row) { console.error(`Aufbau ${SETUP_ID} nicht gefunden`); return 1; }
  if (row.game_id !== GAME_ID) { console.error(`Aufbau gehört zu Spiel ${row.game_id}, erwartet ${GAME_ID}`); return 1; }
  const plan = def.patch(alt, { zones: zonenVon(row, def) });
  if (plan.art !== 'zu-schreiben') {
    console.error(`die Sicherung ist nicht der Ausgangsstand dieses Schrittes (${plan.art === 'schon-da' ? 'sie ist schon der Zielstand' : plan.probleme.join('; ')}) — dorthin gibt es keinen Weg zurück`);
    return 1;
  }
  const ziel = { [a]: text(plan[a]), [b]: text(plan[b]) };

  const raw = rohVon(row, def);
  console.log(`gelesen: ${a}_data ${kennzeichen(raw[a])}, ${b}_data ${kennzeichen(raw[b])}; Sicherung ${kennzeichen(gesichert[a])} / ${kennzeichen(gesichert[b])}; Zielstand ${kennzeichen(ziel[a])} / ${kennzeichen(ziel[b])}`);
  if (raw[a] === gesichert[a] && raw[b] === gesichert[b]) { console.log('schon der Ausgangsstand — nichts zu tun'); return 0; }
  if (raw[a] !== ziel[a] || raw[b] !== ziel[b]) {
    console.error('der gelesene Text ist nicht der Zielstand und nicht der Ausgangsstand — jemand hat danach weitergearbeitet; es wird nichts überschrieben');
    return 1;
  }

  haken?.('nach-lesen', db);
  const t = tausche(db, { spalten: def.spalten, von: raw, nach: gesichert, haken });

  const jetzt = rohVon(lese(db, def), def);
  const ok = jetzt[a] === gesichert[a] && jetzt[b] === gesichert[b];
  console.log(`zurückgeschrieben: ${a}_data ${raw[a].length} → ${jetzt[a].length} Zeichen, sha ${sha(raw[a])} → ${sha(jetzt[a])}; ${b}_data ${raw[b].length} → ${jetzt[b].length} Zeichen, sha ${sha(raw[b])} → ${sha(jetzt[b])}${ok ? ' (= die Sicherung, Zeichen für Zeichen)' : ' — WEICHT VON DER SICHERUNG AB'}`);
  fingerabdruckZeilen(db, t);
  return ok ? 0 : 1;
}

if (process.argv[1] && process.argv[1].endsWith('setupwahl-daten.mjs')) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, err => { console.error(err); process.exitCode = 1; });
}
