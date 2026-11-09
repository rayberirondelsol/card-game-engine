// Die Dörflerzahl als Daten: Endkampf-Plättchen, Werte, Zonen, Assets, Aktionen, die Option (Spec M31.6, M31.7, M31.8, M31.12).
//
// **Sechs Schritte, ein Skript** (`--schritt gelaende|werte|zonen|assets|aktionen|optionen`, M31.12): jeder ändert ein **eigenes Stück**,
// jeder ist einzeln widerrufbar, die Vorbedingung gilt **je Stück** und nicht je Gesamthash. Gebaut sind **`gelaende`** (Aufgabe ES, Teil 1)
// und **`werte`** (Aufgabe ET, Teil 1); die vier anderen stehen in `SCHRITTE` als `null` und melden „noch nicht gebaut“, **ohne die Datenbank
// zu öffnen**. Wer einen baut, trägt seine Zahlen in `SCHRITTE` ein und seine Stücke in `DEFS` — am Gerüst (Lesen, Einordnen, Tausch,
// Kontrolle, Weg zurück) ändert sich nichts.
//
// **`werte`:** in `scenario_data.bosses[…]` bekommen die **19** Bösewichte mit Zahlenwerten einen neuen Schlüssel `statsByCount` mit genau den
// Schlüsseln `"2"`, `"4"`, `"5"`, je `{ BEW, LEB }` (die Namen, die `stats` im Datensatz trägt). **Kein** Schlüssel `"3"`: die Spalte für drei
// steht in `stats` und bleibt dort (zwei Quellen für dieselbe Zahl wären M6). **Barry Bluff** trägt Formeln statt Zahlen und bekommt nichts;
// `stats` aller 20 bleibt byteweise gleich. Die Zahlen stehen **einmal im Dokument** (`docs/tft-regeln.md` §5.5, vom Auftrag `EQ` gegen die Bilder
// gelesen); `SPALTEN` ist ihre Abschrift im Baustein, der Test liest das Dokument selbst und beweist die Gleichheit. Der Baustein prüft sie
// außerdem gegen die Daten, die er vorfindet: weicht `stats` eines Bösewichts von der 3P-Spalte ab, ist der Ausgang nicht der erwartete, und
// es wird nichts geschrieben. **`villagers.baseCount` schreibt dieser Schritt nicht** — das ist der Schalter (Aufgabe EX); ohne ihn liest der
// Aufbau `statsByCount` nicht, und das Schreiben ist folgenlos. Er ändert nur `scenario_data`, und darin nur dieses eine Stück: er ist zu
// `gelaende` (`final.terrain`) disjunkt, beide Reihenfolgen ergeben denselben Text.
//
// **`gelaende`:** in `scenario_data.bosses[…].final.terrain` bekommen **drei** Bösewichte die Plättchen für vier und fünf Dörfler: Deputy
// Waggums, Pepin Milkfrog, Samuel Strawman („1 je Dörfler“, auf dem Plan `FF1`–`FF5` nummeriert). Ihr dritter Eintrag (`FF3`) bekommt
// `fromCount: 3`, dahinter kommen zwei neue Einträge (`FF4` mit `fromCount: 4`, `FF5` mit `5`): **drei Schlüssel und sechs neue Einträge**,
// sonst nichts. Die **fünf festen** (Virginia Fitz, Handsy, The Bundits, Tilda Fields, Umbrello) skalieren nicht und bleiben **byteweise
// gleich**; ein Patch, der sie anfasste, wäre falsch. `fields.EG` (die fünf gedruckten Felder) steht bei den dreien schon da und wird
// nicht berührt — es fehlten nur die Plättchen. Gelesen und geschrieben wird **nur** `scenario_data`; `sequence_data`, `action_data`,
// `zone_data`, `grid_data`, `state_data`, `table_assets` und die Spielstände rührt dieser Schritt nicht an (sie gehen nur als Hash in den
// Fingerabdruck ein). Er setzt den **deployten Code** von Welle 1 voraus (`terrainFor`, der Prüfer, der `fromCount` kennt): ein alter
// Executor meldete `fromCount` als unbekannten Schlüssel und legte für diesen Bösewicht **nichts** — darum gehört das Schreiben (Teil 2) hinter den Deploy.
//
// **Die Messung steht einmal hier** (`MESSUNG`, Quelle `docs/endkampf-gelaende-doerflerzahl.md` Abschnitt 2); der Test trägt eine
// **unabhängige** Abschrift derselben Zellen aus dem Dokument und vergleicht. Der Baustein prüft sie außerdem gegen die Daten, die er
// vorfindet: stimmen die heutigen Plättchen bei drei Dörflern (und `fields.EG`, und die festen Bösewichte) nicht mit der Messung überein,
// ist der Ausgang nicht der erwartete, und es wird nichts geschrieben. **Nicht gemessen** ist die Zuordnung der Bürger-Assets bei Pepin
// (siehe `GELAENDE`) — sie ist erschlossen und steht im Bauprotokoll (`--check`) als Hinweis.
//
// Was von M28/M29/M30 (`szenariodaten-berichtigung.mjs`, `gelaendekarten-zuordnung.mjs`, `setupwahl-daten.mjs`) gilt, gilt unverändert:
// Vorbedingung je Stück, Rückwärtsbeweis, Sicherung vorher mit Hash als Argument, Vergleich-und-Tausch in einer `IMMEDIATE`-Transaktion,
// Fingerabdruck je Tabelle und je Zeile von `save_states` vorher und nachher, Kontrollausgabe **neu gelesen**, Weg zurück — und **kein
// `--force`**: ein Argument dieses Namens (oder eines anderen, das nicht aufgeführt ist) wird nicht erkannt, jede Abweichung vom
// erwarteten Ausgangsstand ist ein Abbruch mit Pfad. Dieser Teil ist **rein**; `better-sqlite3` kommt erst in `main` (auf dem Server
// liegt es neben der Datei, im Repo unter `server/`, der Test reicht es herein). Das Skript braucht nur `../shared/scenarioData.js`,
// keine andere Skriptdatei — auf dem Server also **eine** Datei nach `/app/` (`docs/datenzugriff.md`).
//
// Aufruf (im Backend-Container, wo `better-sqlite3` liegt; die Datei liegt dort als `/app/doerflerzahl-daten.mjs`, `../shared` ist dann `/shared`):
//
//   node doerflerzahl-daten.mjs --check <db> --schritt gelaende                                # Trockenlauf, schreibgeschützt
//   node doerflerzahl-daten.mjs --write <db> --schritt gelaende --sicherung-sha <hex>          # eine IMMEDIATE-Transaktion
//   node doerflerzahl-daten.mjs --zurueck <sicherungsdatei> <db> --schritt gelaende            # der Weg zurück
//
// **Die Sicherung** legt dieses Skript nicht an. Sie ist eine JSON-Datei `{ scenario_data, sha256, updated_at }` mit der gelesenen Spalte als
// Text; `sha256` ist `sicherungsHash(<Text>)`. `--check` nennt diesen Hash für den gelesenen Stand, `--write` verlangt ihn (`--sicherung-sha`,
// mindestens zwölf Hex-Stellen) und schreibt nur, wenn er zum **gelesenen** Text passt.
//
// **Die Absicherung beim Schreiben, in der Reihenfolge, in der sie läuft:**
//
//   1. Lesen, Einordnen: die Stücke des Schritts sind genau der Ausgang → zu schreiben; genau das Ziel → schon geschrieben (Exit 0, ohne
//      Sicherung); alles andere → Abbruch mit Pfad. Ein halber Stand ist „alles andere“.
//   2. Rückwärtsbeweis und `validateScenarioData` (ohne Bibliothek und Raster: der Schritt liest sie nicht): vor dem Schreiben, auf dem Zielstand.
//   3. Die Sicherung: ohne gültigen Hash kein Schreiben.
//   4. Eine `IMMEDIATE`-Transaktion (die Schreibsperre ist da, **bevor** gehasht wird), darin Fingerabdruck vorher und nachher und
//      `UPDATE … WHERE id = ? AND scenario_data = <gelesen>`. Trifft er keine Zeile, hat jemand die Spalte zwischen Lesen und Schreiben
//      geändert: Abbruch. Jede Abweichung im Fingerabdruck: Rollback.
//   5. Kontrollausgabe, **neu gelesen**, nicht aus dem Plan.
//
// Der Weg zurück ist derselbe Vergleich-und-Tausch in die andere Richtung: die Datenbank muss **genau** der Zielstand sein, der aus der
// Sicherung folgt, sonst hat jemand danach weitergearbeitet, und nichts wird überschrieben.

import fs from 'node:fs';
import crypto from 'node:crypto';

import { validateScenarioData } from '../shared/scenarioData.js';

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
 * Je Schritt: der Stand vor und nach ihm, Länge und Hash des Textes **jeder Spalte, die er ändert** (die Spalten tragen die Namen `scenario`,
 * `sequence`, `action`, …). Ein `null` heißt: noch nicht gebaut — `main` meldet es, ohne die Datenbank zu öffnen. Der Ausgang von `gelaende` ist
 * der Stand nach M30 (`scenario_data` nach `zaehler`); wo ein späterer Schritt dieselbe Spalte ändert, ist sein Ausgang der Zielstand dieses
 * Schrittes — **dieselbe** Zahl, nicht eine zweite.
 */
const gelaende = {
  ausgang: { scenario: { laenge: 20858, sha: '82592d1ac883' } },
  ziel: { scenario: { laenge: 21473, sha: '69dbe9e2b8cb' } },
};
export const SCHRITTE = {
  gelaende,
  // `werte` läuft nach `gelaende` (Reihenfolge ES, ET): sein Ausgang ist dessen Ziel — **dieselbe** Zahl. Der Text ist in beiden Reihenfolgen derselbe.
  werte: { ausgang: gelaende.ziel, ziel: { scenario: { laenge: 23104, sha: '5613ccf1cd29' } } },
  zonen: null,
  assets: null,
  aktionen: null,
  optionen: null,
};

// ── Die Messung ─────────────────────────────────────────────────────────────

/**
 * **Die** Messung (M6: eine Stelle): die Endkampf-Gelände der acht Bösewichte, an den Tableau-Rückseiten gelesen
 * (`docs/endkampf-gelaende-doerflerzahl.md`, Abschnitt 2, alle Zellen „sicher“).
 *
 * - `art`: `je-doerfler` (der SETUP-Kasten sagt „1 je Dörfler, in numerischer Reihenfolge“, der Plan nummeriert `FF1`–`FF5`) oder `fest`
 *   (die Zahl steht im Kasten ausgeschrieben, der Plan trägt nur `FF`);
 * - `zahl`: bei `fest` die Zahl der Plättchen bei **jeder** Dörflerzahl, bei `je-doerfler` `null` (= die Dörflerzahl);
 * - `felder`: die Felder in der Reihenfolge des Plans (`FF1` … `FF5`; bei den festen die Reihenfolge der Daten, die der Messung entspricht).
 */
export const MESSUNG = {
  'Deputy Waggums':  { art: 'je-doerfler', zahl: null, felder: ['O13', 'N4', 'C5', 'D12', 'R8'], quelle: 'Abschnitt 2, Deputy Waggums' },
  'Virginia Fitz':   { art: 'fest', zahl: 5, felder: ['B1', 'L3', 'S5', 'A8', 'R14'], quelle: 'Abschnitt 2, Virginia Fitz' },
  'The Bundits':     { art: 'fest', zahl: 1, felder: ['E10'], quelle: 'Abschnitt 2, The Bundits' },
  'Tilda Fields':    { art: 'fest', zahl: 1, felder: ['F1:G2'], quelle: 'Abschnitt 2, Tilda Fields' },
  'Handsy':          { art: 'fest', zahl: 5, felder: ['P5', 'E7', 'M9', 'H10', 'M12'], quelle: 'Abschnitt 2, Handsy' },
  'Pepin Milkfrog':  { art: 'je-doerfler', zahl: null, felder: ['N14', 'A1', 'S9', 'M1', 'A9'], quelle: 'Abschnitt 2, Pepin Milkfrog' },
  'Samuel Strawman': { art: 'je-doerfler', zahl: null, felder: ['R1:S2', 'C13:D14', 'A1:B2', 'R12:S13', 'M1:N2'], quelle: 'Abschnitt 2, Samuel Strawman' },
  'Umbrello':        { art: 'fest', zahl: 1, felder: ['A5:B6'], quelle: 'Abschnitt 2, Umbrello' },
};

/** Wie viele Plättchen bei `n` Dörflern liegen: bei `fest` die ausgeschriebene Zahl, sonst `n` (die ersten `n` Felder). */
export const zahlBei = (name, n) => (MESSUNG[name].art === 'fest' ? MESSUNG[name].zahl : n);

/** Die drei, die skalieren — in der Reihenfolge der Daten. Alle anderen (die fünf festen und die zwölf ohne Endkampf-Plättchen) bleiben unberührt. */
const DREI = Object.keys(MESSUNG).filter(n => MESSUNG[n].art === 'je-doerfler');
const FESTE = Object.keys(MESSUNG).filter(n => MESSUNG[n].art === 'fest');

/**
 * Was die Einträge `FF1` … `FF5` der drei tragen: das Asset je Eintrag, und ob das Plättchen verdeckt liegt. **Die ersten drei stehen heute in den
 * Daten** (Vorbedingung, Zeichen für Zeichen); die Einträge vier und fünf sind **neu** und nehmen die Form ihrer Nachbarn:
 *
 * - **Deputy Waggums:** dasselbe Plättchen wie `FF1`–`FF3`, offen, ohne Drehung.
 * - **Samuel Strawman:** `Ritualzeichen / Weizenfeld`, verdeckt, 2 × 2 (die Felder tragen die Messung).
 * - **Pepin Milkfrog:** die drei vorhandenen Plättchen sind drei **verschiedene** Assets (`Katze`, `Dörflerin`, `Soßenflasche` — `… / Große Milchkanne`,
 *   verdeckt). Für `FF4` und `FF5` nimmt der Baustein `(Dörfler)` und `(blond)`, **in der Reihenfolge der fünf Plättchen, die Handsy trägt** —
 *   **erschlossen, nicht gelesen**: verdeckt liegt überall die Milchkanne, die Messung nennt keine Zuordnung von Bürger und Feld. Ein Fehler hier
 *   wäre unsichtbar (das Plättchen liegt verdeckt) und träfe nur den, der es aufdeckt; das Bauprotokoll sagt es, der Rest ist Sichtprüfung.
 */
const GELAENDE = {
  'Deputy Waggums': { faceDown: false, assets: Array(5).fill('Die Bundo-Königin / Beruhigungs-Leckerli') },
  'Pepin Milkfrog': {
    faceDown: true,
    assets: [
      'Versteckter Bürger (Katze) / Große Milchkanne', 'Versteckter Bürger (Dörflerin) / Große Milchkanne',
      'Versteckter Bürger (Soßenflasche) / Große Milchkanne', 'Versteckter Bürger (Dörfler) / Große Milchkanne',
      'Versteckter Bürger (blond) / Große Milchkanne',
    ],
  },
  'Samuel Strawman': { faceDown: true, assets: Array(5).fill('Ritualzeichen / Weizenfeld') },
};
/** Ab wie vielen Dörflern der Eintrag `FF<i+1>` liegt: `FF1` und `FF2` immer (kein `fromCount`), `FF3` ab drei, `FF4` ab vier, `FF5` ab fünf. */
const VON = [undefined, undefined, 3, 4, 5];
const ERSCHLOSSEN = 'Pepin Milkfrog';

/** Der Eintrag `FF<i+1>` im Wortlaut — Schlüsselreihenfolge `assetName`, `cells`, `faceDown`, `fromCount` (sie ist Teil des Hashes). */
const eintrag = (name, i, mitZahl) => ({
  assetName: GELAENDE[name].assets[i],
  cells: [MESSUNG[name].felder[i]],
  ...(GELAENDE[name].faceDown ? { faceDown: true } : {}),
  ...(mitZahl && VON[i] ? { fromCount: VON[i] } : {}),
});

// ── Einordnen und ändern ────────────────────────────────────────────────────

const zellen = (list) => (Array.isArray(list) ? list.flatMap(t => (Array.isArray(t?.cells) ? t.cells : [])) : []);
const wo = (name) => `scenario_data.bosses[${text(name)}].final`;

/**
 * Das Gelände **eines** der drei einordnen: `alt` (genau `FF1`–`FF3`, ohne `fromCount`), `neu` (genau `FF1`–`FF5`, `FF3` mit `fromCount 3`,
 * die zwei neuen mit 4 und 5) oder `null` (dann steht in `probleme`, was nicht stimmt, mit Pfad und Index; ein halber Stand ist ein Problem).
 */
function einordnenDrei(name, scenario, probleme) {
  const final = scenario?.bosses?.[name]?.final;
  const terrain = final?.terrain;
  if (!isObject(scenario?.bosses?.[name])) { probleme.push(`scenario_data.bosses[${text(name)}] fehlt`); return null; }
  if (!isObject(final)) { probleme.push(`${wo(name)} fehlt`); return null; }
  if (!Array.isArray(terrain)) { probleme.push(`${wo(name)}.terrain ist kein Feld von Plättchen`); return null; }
  const vorher = probleme.length;
  const stand = [];                       // je Eintrag: 'beide' (FF1, FF2) | 'alt' | 'neu'
  for (let i = 0; i < 5; i++) {
    const ist = text(terrain[i]), alt = i < 3 ? text(eintrag(name, i, false)) : undefined, neu = text(eintrag(name, i, true));
    if (ist === neu && ist === alt) stand.push('beide');
    else if (ist === neu) stand.push('neu');
    else if (ist === alt) stand.push('alt');
    else {
      probleme.push(`${wo(name)}.terrain[${i}]: ist ${ist ?? 'kein Eintrag'}, erwartet ${alt ?? 'kein Eintrag'} (oder schon ${neu})`);
      stand.push(null);
    }
  }
  for (let i = 5; i < terrain.length; i++) probleme.push(`${wo(name)}.terrain[${i}]: ist ${text(terrain[i])}, erwartet kein Eintrag (der Zielstand hat fünf)`);
  if (probleme.length > vorher) return null;
  const echt = stand.filter(s => s !== 'beide');
  if (echt.every(s => s === 'alt')) return 'alt';
  if (echt.every(s => s === 'neu')) return 'neu';
  probleme.push(`${wo(name)}.terrain: halber Stand (${stand.map((s, i) => `FF${i + 1} ${s === 'beide' ? 'wie im Ziel' : s === 'alt' ? 'noch alt' : 'schon geschrieben'}`).join(', ')})`);
  return null;
}

/**
 * Die Stücke des Schrittes einordnen — **eine** Frage mit drei Antworten:
 *
 * - `zu-schreiben`: jeder der drei hat genau `FF1`–`FF3` (ohne `fromCount`), jedes `fields.EG` die fünf Felder der Messung, jeder der fünf festen
 *   genau die Felder der Messung ohne `fromCount`, und die Assets für `FF4`/`FF5` kommen in den Daten schon vor.
 * - `schon-da`: jeder der drei hat genau `FF1`–`FF5` mit `fromCount` 3, 4, 5 im Wortlaut des Ziels.
 * - `abweichend`: alles andere, auch jeder halbe Stand (ein Bösewicht fertig, die anderen nicht; ein Bösewicht halb). `probleme` nennt jede
 *   Abweichung mit Pfad; Zielstand gibt es keinen.
 *
 * Verändert die Eingabe nicht; überschreibt nie.
 *
 * @param {object} scenario  – `scenario_data` (gelesen)
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', scenario?: object, probleme?: string[] }}
 */
export function patchGelaende(scenario) {
  const probleme = [];
  if (!isObject(scenario?.bosses)) return { art: 'abweichend', probleme: ['scenario_data.bosses fehlt oder ist kein Objekt'] };

  const stand = Object.fromEntries(DREI.map(name => [name, einordnenDrei(name, scenario, probleme)]));

  // ── `fields.EG` der drei: die fünf gedruckten Felder stehen schon da, und sie sind die der Messung ──
  for (const name of DREI) {
    const eg = scenario.bosses[name]?.final?.fields?.EG;
    if (text(eg) !== text(MESSUNG[name].felder)) probleme.push(`${wo(name)}.fields.EG: ist ${text(eg) ?? 'nicht da'}, die Messung nennt ${text(MESSUNG[name].felder)}`);
  }

  // ── die fünf festen: die Felder der Messung, kein `fromCount` — sie werden nie angefasst ──
  for (const name of FESTE) {
    const terrain = scenario.bosses[name]?.final?.terrain;
    if (!Array.isArray(terrain)) { probleme.push(`${wo(name)}.terrain fehlt (die Messung nennt ${MESSUNG[name].zahl} Plättchen)`); continue; }
    if (text(zellen(terrain)) !== text(MESSUNG[name].felder)) probleme.push(`${wo(name)}.terrain: die Felder sind ${text(zellen(terrain))}, die Messung nennt ${text(MESSUNG[name].felder)}`);
    terrain.forEach((t, i) => { if (isObject(t) && hat(t, 'fromCount')) probleme.push(`${wo(name)}.terrain[${i}]: ein fester Bösewicht trägt kein fromCount (ist ${text(t.fromCount)})`); });
  }

  // ── die Assets der neuen Einträge müssen in den Daten schon vorkommen: der Baustein liest die Bibliothek nicht ──
  const bekannt = new Set();
  for (const b of Object.values(scenario.bosses)) for (const list of [b?.terrain, b?.final?.terrain]) for (const t of Array.isArray(list) ? list : []) bekannt.add(t?.assetName);
  for (const name of DREI) {
    GELAENDE[name].assets.forEach((a, i) => {
      if (!bekannt.has(a)) probleme.push(`${wo(name)}.terrain[${i}]: das Asset ${text(a)} kommt in den Daten sonst nirgends vor — der Baustein liest die Bibliothek nicht und kann nicht wissen, ob es das Asset gibt`);
    });
  }

  // ── zusammen: alle drei alt, oder alle drei neu ──
  if (!probleme.length && !DREI.every(n => stand[n] === 'alt') && !DREI.every(n => stand[n] === 'neu')) {
    probleme.push(`halber Stand: ${DREI.map(n => `${n} ${stand[n] === 'alt' ? 'noch alt' : 'schon geschrieben'}`).join(', ')}`);
  }
  if (probleme.length) return { art: 'abweichend', probleme };
  if (DREI.every(n => stand[n] === 'neu')) return { art: 'schon-da', scenario: copy(scenario) };

  const next = copy(scenario);
  for (const name of DREI) {
    const terrain = next.bosses[name].final.terrain;
    terrain[2].fromCount = VON[2];
    terrain.push(eintrag(name, 3, true), eintrag(name, 4, true));
  }
  return { art: 'zu-schreiben', scenario: next };
}

const abwTeil = (t, ist) => {
  let k = 0;
  while (k < t.length && t[k] === ist[k]) k++;
  return `weicht ab Zeichen ${k} ab („…${t.slice(Math.max(0, k - 30), k + 30)}…“ gegen „…${ist.slice(Math.max(0, k - 30), k + 30)}…“)`;
};

/**
 * Der Rückwärtsbeweis, auf dem Zielstand und **vor** dem Schreiben: bei den dreien die zwei neuen Einträge und das `fromCount` an `FF3` entfernen —
 * das muss den gelesenen Text ergeben, Zeichen für Zeichen. Er zeigt zugleich, dass jeder andere Schlüssel, jeder andere Bösewicht (auch die fünf
 * festen und alle `stats`) und jede Reihenfolge unberührt sind. Ein Zielstand, der **nicht** fünf Einträge oder kein `fromCount` an `FF3` hat, ist keiner.
 * Verändert nichts.
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweise(before, after) {
  const meldungen = [];
  const sc = copy(after?.scenario ?? {});
  for (const name of DREI) {
    const terrain = sc?.bosses?.[name]?.final?.terrain;
    if (!Array.isArray(terrain)) { meldungen.push(`Rückwärtsbeweis scenario_data: ${wo(name)}.terrain fehlt im Zielstand`); continue; }
    if (terrain.length !== 5) meldungen.push(`Rückwärtsbeweis scenario_data: ${wo(name)}.terrain hat ${terrain.length} Einträge, der Zielstand hat fünf`);
    if (!isObject(terrain[2]) || !hat(terrain[2], 'fromCount')) meldungen.push(`Rückwärtsbeweis scenario_data: ${wo(name)}.terrain[2] trägt im Zielstand kein fromCount`);
    else delete terrain[2].fromCount;
    terrain.splice(3);
  }
  const alt = text(before?.scenario);
  if (text(sc) !== alt) meldungen.push(`Rückwärtsbeweis scenario_data: ohne die sechs Einträge und die drei Schlüssel ist der Text nicht der gelesene — ${abwTeil(text(sc), alt)}`);
  return meldungen;
}

/** Der Hash, den `--sicherung-sha` nennt: über die gelesenen Texte der Spalten des Schrittes, in der Reihenfolge von `SCHRITTE`. */
export const sicherungsHash = (...texte) => sha256(text(texte));

// ── Die Werte (ET) ──────────────────────────────────────────────────────────

/**
 * **Die** Zahlen (M6: eine Stelle im Baustein): BEW und LEB je Bösewicht, `[2P, 3P, 4P, 5P]`, **abgeschrieben aus `docs/tft-regeln.md` §5.5**
 * (englische Namen, Reihenfolge der beiden Tabellen). Die 3P-Spalte steht hier nur zur Gegenprobe gegen `stats`; **geschrieben** werden 2P, 4P, 5P.
 * Barry Bluff fehlt absichtlich (Formeln statt Zahlen). Der Test liest das Dokument und beweist: gleich.
 */
export const SPALTEN = {
  'Bort Dovis':        { BEW: [7, 7, 8, 8], LEB: [11, 15, 18, 21] },
  'The Bundits':       { BEW: [6, 6, 7, 7], LEB: [11, 15, 18, 21] },
  'Deputy Waggums':    { BEW: [6, 6, 7, 7], LEB: [12, 14, 17, 20] },
  'Handsy':            { BEW: [7, 7, 8, 8], LEB: [11, 14, 18, 21] },
  'Lawman Dozy':       { BEW: [5, 6, 6, 6], LEB: [12, 14, 18, 21] },
  'Penny Pinchetti':   { BEW: [7, 7, 8, 8], LEB: [12, 15, 18, 21] },
  'Virginia Fitz':     { BEW: [5, 6, 6, 7], LEB: [12, 15, 18, 21] },
  'Will Barlow':       { BEW: [7, 7, 7, 7], LEB: [11, 14, 17, 20] },   // der Druckfehler (FAQ S.2) betrifft die Beschriftung der Spalte 3P, nicht diese Zahlen
  'Qing & Kween':      { BEW: [6, 6, 7, 7], LEB: [11, 14, 17, 20] },
  'Umbrello':          { BEW: [6, 6, 7, 7], LEB: [11, 14, 17, 20] },
  'Samuel Strawman':   { BEW: [6, 7, 7, 8], LEB: [11, 15, 18, 21] },
  'Pepin Milkfrog':    { BEW: [6, 6, 7, 7], LEB: [11, 14, 17, 20] },
  'Ernie Offal':       { BEW: [5, 5, 5, 5], LEB: [12, 18, 21, 24] },
  'Red Atrocious':     { BEW: [5, 6, 8, 8], LEB: [13, 17, 20, 24] },
  'Tilda Fields':      { BEW: [2, 3, 3, 4], LEB: [10, 15, 20, 24] },
  'Tartar Fishboy':    { BEW: [9, 9, 9, 9], LEB: [13, 17, 20, 23] },
  'The Door Knockers': { BEW: [5, 5, 6, 7], LEB: [10, 15, 18, 21] },
  'Ms. Falls & Co.':   { BEW: [4, 4, 5, 5], LEB: [13, 17, 20, 23] },
  'Patches':           { BEW: [7, 8, 8, 9], LEB: [1, 2, 2, 3] },
};
/** Der Bösewicht, dessen Werte Formeln sind: er bekommt nichts, und er darf auch nichts tragen. */
const BARRY = 'Barry Bluff';
/** Die geschriebenen Zahlen und ihr Index in `[2P, 3P, 4P, 5P]`; 3P (Index 1) steht in `stats`. */
const ZAHLEN = { 2: 0, 4: 2, 5: 3 };
const DREI_P = 1;
const ZIEL_SCHLUESSEL = Object.keys(ZAHLEN).join();

/** Das `statsByCount` eines Bösewichts im Zielstand — Schlüssel `"2"`, `"4"`, `"5"` (aufsteigend, ganze Zahlen), je `{ BEW, LEB }`. */
const zielTabelle = (name) => Object.fromEntries(Object.entries(ZAHLEN).map(([n, i]) => [n, { BEW: SPALTEN[name].BEW[i], LEB: SPALTEN[name].LEB[i] }]));
const wob = (name) => `scenario_data.bosses[${text(name)}]`;

/**
 * Das Stück **eines** Bösewichts einordnen: `alt` (`stats` mit zwei Zahlen, gleich der 3P-Spalte aus §5.5, kein `statsByCount`), `neu` (`statsByCount`
 * genau das Ziel) oder `null` mit Pfad in `probleme` — auch ein **teilweise** vorhandenes `statsByCount` und ein Schlüssel `"3"` sind ein Problem.
 */
function einordnenWert(name, boss, probleme) {
  const at = wob(name), vorher = probleme.length;
  const s = boss.stats;
  if (!isObject(s)) probleme.push(`${at}.stats fehlt oder ist kein Objekt`);
  else if (Object.keys(s).join() !== 'BEW,LEB' || typeof s.BEW !== 'number' || typeof s.LEB !== 'number') {
    probleme.push(`${at}.stats: ist ${text(s)}, erwartet { BEW, LEB } als zwei Zahlen`);
  } else if (s.BEW !== SPALTEN[name].BEW[DREI_P] || s.LEB !== SPALTEN[name].LEB[DREI_P]) {
    probleme.push(`${at}.stats: ist ${text(s)}, die Spalte 3P in §5.5 nennt ${text({ BEW: SPALTEN[name].BEW[DREI_P], LEB: SPALTEN[name].LEB[DREI_P] })} (Gegenprobe 3P)`);
  }
  if (probleme.length > vorher) return null;
  if (!hat(boss, 'statsByCount')) return 'alt';
  const ist = boss.statsByCount, soll = zielTabelle(name);
  if (text(ist) === text(soll)) return 'neu';
  if (!isObject(ist)) { probleme.push(`${at}.statsByCount: ist ${text(ist)}, erwartet ein Objekt mit den Schlüsseln ${ZIEL_SCHLUESSEL}`); return null; }
  const fehlt = [], falsch = [];
  for (const k of new Set([...Object.keys(ist), ...Object.keys(soll)])) {
    if (!hat(ist, k)) fehlt.push(k);
    else if (!hat(soll, k)) falsch.push(`${at}.statsByCount["${k}"]: ist ${text(ist[k])}, der Zielstand hat keinen Schlüssel "${k}" (3P steht in stats)`);
    else if (text(ist[k]) !== text(soll[k])) falsch.push(`${at}.statsByCount["${k}"]: ist ${text(ist[k])}, erwartet ${text(soll[k])}`);
  }
  if (falsch.length) probleme.push(...falsch);
  else if (fehlt.length) probleme.push(`${at}.statsByCount: teilweise geschrieben (da: ${Object.keys(ist).join(', ') || 'nichts'}; es fehlen ${fehlt.join(', ')})`);
  else probleme.push(`${at}.statsByCount: ist ${text(ist)}, erwartet ${text(soll)} (andere Schlüsselfolge)`);
  return null;
}

/**
 * Die Stücke des Schrittes `werte` einordnen — **eine** Frage mit drei Antworten:
 *
 * - `zu-schreiben`: jeder der 19 hat `stats` mit zwei Zahlen (gleich der Spalte 3P aus §5.5) und kein `statsByCount`; Barry Bluff trägt Text und
 *   kein `statsByCount`; es gibt keinen Bösewicht, den `SPALTEN` nicht kennt.
 * - `schon-da`: jeder der 19 hat genau das Ziel-`statsByCount` (nichts zu schreiben).
 * - `abweichend`: alles andere, auch jeder halbe Stand (ein Bösewicht fertig, die anderen nicht; ein Bösewicht mit nur einem Teil der Schlüssel).
 *   `probleme` nennt jede Abweichung mit Pfad; Zielstand gibt es keinen.
 *
 * Verändert die Eingabe nicht; überschreibt nie.
 *
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', scenario?: object, probleme?: string[] }}
 */
export function patchWerte(scenario) {
  const probleme = [];
  const bosses = scenario?.bosses;
  if (!isObject(bosses)) return { art: 'abweichend', probleme: ['scenario_data.bosses fehlt oder ist kein Objekt'] };

  const stand = {};
  for (const name of Object.keys(SPALTEN)) {
    if (!isObject(bosses[name])) probleme.push(`${wob(name)} fehlt`);
    else stand[name] = einordnenWert(name, bosses[name], probleme);
  }
  // Barry Bluff: Formeln (Text), nichts darüber — er bekommt keinen Eintrag und darf keinen tragen.
  if (!isObject(bosses[BARRY])) probleme.push(`${wob(BARRY)} fehlt`);
  else {
    const s = bosses[BARRY].stats;
    if (!isObject(s) || typeof s.BEW !== 'string' || typeof s.LEB !== 'string') probleme.push(`${wob(BARRY)}.stats: ist ${text(s)}, erwartet zwei Formeln (Text) — Barry Bluff trägt keine Zahlen`);
    if (hat(bosses[BARRY], 'statsByCount')) probleme.push(`${wob(BARRY)}.statsByCount: ist ${text(bosses[BARRY].statsByCount)}, Barry Bluff trägt Formeln und bekommt keinen Eintrag`);
  }
  for (const name of Object.keys(bosses)) {
    if (name !== BARRY && !hat(SPALTEN, name)) probleme.push(`${wob(name)}: kommt in SPALTEN nicht vor — der Baustein weiß nicht, welche Zahlen er schreiben soll`);
  }
  // Zusammen: alle 19 alt, oder alle 19 neu.
  const namen = Object.keys(stand);
  if (!probleme.length && !namen.every(n => stand[n] === 'alt') && !namen.every(n => stand[n] === 'neu')) {
    probleme.push(`halber Stand: schon geschrieben ${namen.filter(n => stand[n] === 'neu').join(', ')}; noch alt ${namen.filter(n => stand[n] === 'alt').join(', ')}`);
  }
  if (probleme.length) return { art: 'abweichend', probleme };
  if (namen.every(n => stand[n] === 'neu')) return { art: 'schon-da', scenario: copy(scenario) };

  const next = copy(scenario);
  for (const name of namen) next.bosses[name].statsByCount = zielTabelle(name);
  return { art: 'zu-schreiben', scenario: next };
}

/**
 * Der Rückwärtsbeweis für `werte`, auf dem Zielstand und **vor** dem Schreiben: `statsByCount` aus den 19 entfernen — das muss den gelesenen Text
 * ergeben, Zeichen für Zeichen. Er fängt zugleich ein `statsByCount` an Barry, einen Schlüssel `"3"`, fehlende Schlüssel, ein verändertes `stats`
 * und jeden fremden Schlüssel. Verändert nichts.
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweiseWerte(before, after) {
  const meldungen = [];
  const sc = copy(after?.scenario ?? {});
  for (const [name, boss] of Object.entries(sc.bosses ?? {})) {
    if (!isObject(boss) || !hat(boss, 'statsByCount')) {
      if (hat(SPALTEN, name)) meldungen.push(`Rückwärtsbeweis scenario_data: ${wob(name)}.statsByCount fehlt im Zielstand`);
      continue;
    }
    if (!hat(SPALTEN, name)) meldungen.push(`Rückwärtsbeweis scenario_data: ${wob(name)} darf im Zielstand kein statsByCount tragen`);
    else if (!isObject(boss.statsByCount) || Object.keys(boss.statsByCount).join() !== ZIEL_SCHLUESSEL) {
      meldungen.push(`Rückwärtsbeweis scenario_data: ${wob(name)}.statsByCount hat die Schlüssel ${isObject(boss.statsByCount) ? Object.keys(boss.statsByCount).join(', ') : text(boss.statsByCount)}, der Zielstand hat ${ZIEL_SCHLUESSEL.replace(/,/g, ', ')}`);
    }
    delete boss.statsByCount;
  }
  const alt = text(before?.scenario);
  if (text(sc) !== alt) meldungen.push(`Rückwärtsbeweis scenario_data: ohne statsByCount ist der Text nicht der gelesene — ${abwTeil(text(sc), alt)}`);
  return meldungen;
}

// ── Fingerabdruck ───────────────────────────────────────────────────────────

/** SHA-256 je Tabelle; bei `setups` ohne die Spalten, die der Schritt ändern darf (`spalten`, z. B. `['scenario']`). */
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

/** Ein Hash je Spalte der Zeile des Aufbaus, **ohne** die geschriebenen — `updated_at` gehört dazu. */
function spaltenHashes(db, spalten) {
  const row = db.prepare('select * from setups where id = ?').get(SETUP_ID);
  return Object.fromEntries(Object.entries(row).filter(([k]) => !spalten.map(s => `${s}_data`).includes(k)).map(([k, v]) => [k, sha(String(v))]));
}

/**
 * Die Transaktion: Sperre, Fingerabdruck vorher, (Haken), Vergleich-und-Tausch der Spalten, Fingerabdruck nachher.
 * Wirft bei jeder Abweichung — und `better-sqlite3` rollt zurück. `von`/`nach`: je Spalte (`scenario`, …) der Text.
 */
function tausche(db, { spalten, von, nach, haken }) {
  const namen = spalten.map(s => `${s}_data`);
  const tx = db.transaction(() => {
    const vorher = fingerabdruck(db, spalten);
    const saves = saveStateHashes(db);
    const hashes = spaltenHashes(db, spalten);
    haken?.('in-transaktion', db);
    // Nur diese Spalten, nur auf den exakt gelesenen Texten.
    const r = db.prepare(`update setups set ${namen.map(n => `${n} = ?`).join(', ')} where id = ? and ${namen.map(n => `${n} = ?`).join(' and ')}`)
      .run(...spalten.map(s => nach[s]), SETUP_ID, ...spalten.map(s => von[s]));
    if (r.changes !== 1) throw new Error(`${namen.join(' oder ')} hat sich seit dem Lesen geändert — nichts geschrieben`);
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
  console.log('  Fingerabdruck aller Tabellen (setups ohne die geschriebenen Spalten, save_states, zone_data, grid_data, state_data …), in der Transaktion vorher/nachher, unverändert: true');
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
 * Je Schritt, was das gemeinsame Gerüst (Lesen, Einordnen, Tausch, Kontrolle) nicht wissen kann. Die Schlüssel sind die Namen aus `SCHRITTE`;
 * ein Schritt, der dort `null` ist, hat hier keinen Eintrag.
 *
 * - `spalten`: die Spalten, die der Schritt ändert (Name ohne `_data`) — nur diese werden gelesen und geschrieben;
 * - `patch(before)`: das Einordnen (`patchGelaende`); `before` trägt die gelesenen Spalten als Wert;
 * - `beweise(before, after)`: der Rückwärtsbeweis; `gelesen(before)`, `schonDa(before)`, `plan(before, next)`, `kontrolle(before, after)`: Ausgaben;
 * - `pruefer(scenario)`: die Prüfer des Schrittes auf dem Zielstand, `[{ titel, probleme }]`.
 */
const DEFS = {
  gelaende: {
    spalten: ['scenario'],
    patch: (b) => patchGelaende(b.scenario),
    beweise,
    gelesen: (b) => `Endkampf-Plättchen: ${DREI.map(n => `${n} ${b.scenario?.bosses?.[n]?.final?.terrain?.length ?? '?'}`).join(', ')}`,
    schonDa: () => `schon geschrieben: ${DREI.join(', ')} tragen fünf Endkampf-Plättchen mit fromCount 3, 4, 5 — nichts zu schreiben`,
    plan: (b, n) => {
      for (const name of DREI) {
        const t = n.scenario.bosses[name].final.terrain;
        console.log(`  ${name}: terrain[2] bekommt fromCount ${VON[2]} (${text(b.scenario.bosses[name].final.terrain[2]).length} → ${text(t[2]).length} Zeichen), dazu zwei neue Einträge: ${t.slice(3).map(e => `${e.cells[0]} (fromCount ${e.fromCount})`).join(', ')}`);
      }
      console.log(`  Hinweis: ${ERSCHLOSSEN} FF4/FF5 tragen ${GELAENDE[ERSCHLOSSEN].assets.slice(3).map(a => text(a)).join(' und ')} — die Zuordnung der Bürger-Assets ist erschlossen (Reihenfolge von Handsys fünf Plättchen), nicht gelesen`);
      console.log(`  unberührt: ${FESTE.join(', ')} (fest) und die zwölf Bösewichte ohne Endkampf-Plättchen`);
    },
    pruefer: (sc) => [{ titel: 'validateScenarioData', probleme: validateScenarioData(sc) }],
    kontrolle: (before, after) => {
      for (const k of Object.keys(after.scenario).filter(x => x !== 'bosses')) {
        console.log(`  Schlüssel ${k.padEnd(18)} sha ${sha(text(before.scenario[k]))} → ${sha(text(after.scenario[k]))} ${text(before.scenario[k]) === text(after.scenario[k]) ? 'gleich' : 'GEÄNDERT'}`);
      }
      for (const name of DREI) {
        const t = after.scenario.bosses[name].final.terrain;
        console.log(`  ${name}: ${t.length} Plättchen (fromCount ${t.map(e => e.fromCount ?? '-').join(', ')}), Felder ${t.flatMap(e => e.cells).join(' ')}`);
      }
      const gleich = (name) => text(before.scenario.bosses[name]) === text(after.scenario.bosses[name]);
      for (const name of FESTE) console.log(`  ${name}: sha ${sha(text(before.scenario.bosses[name]))} → ${sha(text(after.scenario.bosses[name]))} ${gleich(name) ? 'gleich' : 'GEÄNDERT'}`);
      const andere = Object.keys(before.scenario.bosses).filter(n => !DREI.includes(n) && !FESTE.includes(n));
      console.log(`  die ${andere.length} anderen Bösewichte: ${andere.every(gleich) ? 'alle gleich' : 'GEÄNDERT'}`);
      const alle = Object.keys(before.scenario.bosses);
      console.log(`  stats aller ${alle.length}: ${alle.every(n => text(before.scenario.bosses[n].stats) === text(after.scenario.bosses[n].stats)) ? 'alle gleich' : 'GEÄNDERT'}`);
    },
  },
  werte: {
    spalten: ['scenario'],
    patch: (b) => patchWerte(b.scenario),
    beweise: beweiseWerte,
    gelesen: (b) => `statsByCount: ${Object.values(b.scenario?.bosses ?? {}).filter(x => isObject(x) && hat(x, 'statsByCount')).length} Bösewichte tragen schon eins`,
    schonDa: () => `schon geschrieben: die ${Object.keys(SPALTEN).length} Bösewichte mit Zahlenwerten tragen statsByCount mit den Schlüsseln ${ZIEL_SCHLUESSEL.replace(/,/g, ', ')} — nichts zu schreiben`,
    plan: (b, n) => {
      for (const name of Object.keys(SPALTEN)) {
        const t = n.scenario.bosses[name].statsByCount;
        console.log(`  ${name}: stats ${text(b.scenario.bosses[name].stats)} bleibt, statsByCount ${Object.entries(t).map(([k, v]) => `${k}P ${v.BEW}/${v.LEB}`).join(', ')}`);
      }
      console.log(`  unberührt: ${BARRY} (Formeln statt Zahlen), stats aller ${Object.keys(b.scenario.bosses).length}, villagers.baseCount (der Schalter ist ein eigener Schritt)`);
    },
    pruefer: (sc) => [{ titel: 'validateScenarioData', probleme: validateScenarioData(sc) }],
    kontrolle: (before, after) => {
      for (const k of Object.keys(after.scenario).filter(x => x !== 'bosses')) {
        console.log(`  Schlüssel ${k.padEnd(18)} sha ${sha(text(before.scenario[k]))} → ${sha(text(after.scenario[k]))} ${text(before.scenario[k]) === text(after.scenario[k]) ? 'gleich' : 'GEÄNDERT'}`);
      }
      const namen = Object.keys(SPALTEN), alle = Object.keys(before.scenario.bosses);
      const mitEintrag = alle.filter(n => hat(after.scenario.bosses[n], 'statsByCount'));
      console.log(`  statsByCount an ${mitEintrag.length} Bösewichten (Schlüssel ${[...new Set(mitEintrag.map(n => Object.keys(after.scenario.bosses[n].statsByCount).join()))].join(' | ')}; kein "3": ${mitEintrag.every(n => !hat(after.scenario.bosses[n].statsByCount, '3')) ? 'ja' : 'NEIN'})`);
      const ohne = (b) => { const { statsByCount, ...rest } = b; return rest; };
      console.log(`  die ${namen.length} Bösewichte ohne statsByCount: ${namen.every(n => text(ohne(after.scenario.bosses[n])) === text(before.scenario.bosses[n])) ? 'alles andere gleich' : 'GEÄNDERT'}`);
      console.log(`  ${BARRY}: sha ${sha(text(before.scenario.bosses[BARRY]))} → ${sha(text(after.scenario.bosses[BARRY]))} ${text(before.scenario.bosses[BARRY]) === text(after.scenario.bosses[BARRY]) ? 'unverändert' : 'GEÄNDERT'}`);
      console.log(`  stats aller ${alle.length}: ${alle.every(n => text(before.scenario.bosses[n].stats) === text(after.scenario.bosses[n].stats)) ? 'alle gleich' : 'GEÄNDERT'}`);
    },
  },
};

// ── CLI ─────────────────────────────────────────────────────────────────────

const USAGE = `usage: doerflerzahl-daten.mjs --check <db> --schritt <${Object.keys(SCHRITTE).join('|')}> | --write <db> --schritt <…> --sicherung-sha <hex> | --zurueck <sicherungsdatei> <db> --schritt <…>`;
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
  if (SCHRITTE[schritt] === null) { console.error(`Schritt „${schritt}“ ist noch nicht gebaut — nichts gelesen, nichts geschrieben`); return 1; }
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

/** Die Spalten des Schrittes (und `game_id`) — nur diese. */
function lese(db, def) {
  const cols = ['game_id', ...def.spalten.map(s => `${s}_data`)];
  return db.prepare(`select ${cols.join(', ')} from setups where id = ?`).get(SETUP_ID) ?? null;
}

/** Die gelesenen Texte der Spalten, je unter dem Namen aus `SCHRITTE`. */
const rohVon = (row, def) => Object.fromEntries(def.spalten.map(s => [s, row[`${s}_data`]]));
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
  console.log(`gelesen: ${def.spalten.map(s => `${s}_data ${kennzeichen(raw[s])}`).join(', ')}, ${def.gelesen(before)}`);

  const aus = () => {
    console.log(`${titel}: ${complaints.length} Beanstandungen`);
    for (const c of complaints) console.log('  - ' + c);
    return null;
  };

  // ── Einordnung ──
  const p = def.patch(before);
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

  // ── die Prüfer: ohne Bibliothek und Raster — dieser Schritt liest sie nicht (`table_assets`, `cards`, `grid_data`) ──
  for (const { titel: t, probleme: pr } of def.pruefer(next.scenario)) {
    console.log(`${t}: ${pr.length} Probleme (ohne Bibliothek und Raster — der Schritt liest sie nicht)`);
    for (const m of pr) complaints.push(`${t}: ${m}`);
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
  return { art: 'zu-schreiben', raw, before, next, neuRaw, istAusgang, titel };
}

function trockenlauf(db, opts) {
  const v = vorpruefung(db, { ...opts, titel: 'Trockenlauf' });
  if (!v) return 1;
  if (v.art === 'schon-da') return 0;
  const spalten = opts.def.spalten;
  console.log(`Hash für --sicherung-sha (über die gelesenen Spalten): ${sicherungsHash(...spalten.map(s => v.raw[s]))}`);
  console.log(`würde schreiben: ${spalten.map(s => `${s}_data ${v.raw[s].length} → ${v.neuRaw[s].length} Zeichen`).join(', ')} (nichts geschrieben)`);
  return 0;
}

function schreiben(db, { sicherungSha, haken, ...opts }) {
  const { def, schritt } = opts;
  const v = vorpruefung(db, { ...opts, titel: 'Vorprüfung' });
  if (!v) return 1;
  if (v.art === 'schon-da') { console.log('nichts zu schreiben'); return 0; }
  const { raw, before, neuRaw, istAusgang } = v;

  // ── Die Sicherung: ohne sie kein Schreiben ──
  if (!sicherungSha) { console.error('ohne Sicherung kein Schreiben: --sicherung-sha <Hash der gesicherten Spalten> fehlt'); return 1; }
  if (!/^[0-9a-f]{12,64}$/i.test(sicherungSha)) { console.error('--sicherung-sha braucht mindestens 12 Hex-Stellen'); return 1; }
  const gelesenHash = sicherungsHash(...def.spalten.map(s => raw[s]));
  if (!gelesenHash.startsWith(sicherungSha.toLowerCase())) {
    console.error(`der Hash der Sicherung (${sicherungSha}) passt nicht zum gelesenen Text (der Hash über die gelesenen Spalten beginnt mit ${gelesenHash.slice(0, 12)}) — die Sicherung ist nicht der Stand, der überschrieben würde`);
    return 1;
  }

  haken?.('nach-lesen', db);
  const t = tausche(db, { spalten: def.spalten, von: raw, nach: neuRaw, haken });

  // ── Kontrollausgabe: neu gelesen, nicht aus dem Plan ──
  const jetzt = lese(db, def);
  const gelesen = rohVon(jetzt, def);
  const after = Object.fromEntries(def.spalten.map(s => [s, JSON.parse(gelesen[s])]));
  const abw = (k) => (gelesen[k] === neuRaw[k] ? '' : ' — WEICHT VOM ZIELSTAND AB');
  console.log(`geschrieben: ${def.spalten.map((k, i) => `${i ? '  ' : ''}${k}_data ${raw[k].length} → ${gelesen[k].length} Zeichen, sha ${sha(raw[k])} → ${sha(gelesen[k])}${abw(k)}`).join('\n')}`);
  def.kontrolle(before, after);
  const bw = def.beweise(before, after);
  for (const k of spaltenNamen(def)) {
    console.log(`  Rückwärtsbeweis ${k} auf der gelesenen Spalte: ${bw.some(m => m.startsWith(`Rückwärtsbeweis ${k}`)) ? 'NEIN' : 'ja'}`);
  }
  const weitere = def.pruefer(after.scenario);
  for (const { titel: tt, probleme: pr } of weitere) console.log(`  ${tt} auf der gelesenen Spalte: ${pr.length} Probleme`);
  const { ziel } = SCHRITTE[schritt];
  const gleichZiel = def.spalten.every(k => gelesen[k].length === ziel[k].laenge && sha(gelesen[k]) === ziel[k].sha);
  console.log(istAusgang
    ? `  Zielstand aus den Konstanten (${def.spalten.map(k => `${k}_data ${ziel[k].laenge}/${ziel[k].sha}`).join(', ')}): ${gleichZiel ? 'erreicht' : 'NICHT erreicht'}`
    : '  Zielstand: nicht mit den Konstanten vergleichbar (der Ausgang war ein anderer) — erreicht heißt hier: der gerechnete Text');
  fingerabdruckZeilen(db, t);
  const ok = def.spalten.every(k => gelesen[k] === neuRaw[k]) && (!istAusgang || gleichZiel) && !bw.length && weitere.every(w => !w.probleme.length);
  return ok ? 0 : 1;
}

/** Der Weg zurück: die Datenbank muss **genau der Zielstand** sein, der aus der Sicherung folgt, dann kommt der gesicherte Text wieder. */
function zurueck(db, sicherungsdatei, { haken, def }) {
  // ── die Sicherung prüfen: Form, Hash zum Text, kompakt, und sie ist der Ausgang dieses Schrittes ──
  const s = JSON.parse(fs.readFileSync(sicherungsdatei, 'utf8'));
  if (def.spalten.some(k => typeof s?.[`${k}_data`] !== 'string') || typeof s.sha256 !== 'string') {
    throw new Error(`die Sicherung hat nicht die Form { ${spaltenNamen(def).join(', ')}, sha256, updated_at }`);
  }
  const gesichert = Object.fromEntries(def.spalten.map(k => [k, s[`${k}_data`]]));
  const hashGesichert = sicherungsHash(...def.spalten.map(k => gesichert[k]));
  if (hashGesichert !== s.sha256) {
    console.error(`Hash der Sicherung passt nicht zu ihren Texten (${hashGesichert.slice(0, 12)} gegen ${s.sha256.slice(0, 12)}) — die Datei ist beschädigt`);
    return 1;
  }
  const alt = Object.fromEntries(def.spalten.map(k => [k, JSON.parse(gesichert[k])]));
  if (def.spalten.some(k => text(alt[k]) !== gesichert[k])) { console.error('der gesicherte Text ist nicht kompaktes JSON.stringify'); return 1; }

  const row = lese(db, def);
  if (!row) { console.error(`Aufbau ${SETUP_ID} nicht gefunden`); return 1; }
  if (row.game_id !== GAME_ID) { console.error(`Aufbau gehört zu Spiel ${row.game_id}, erwartet ${GAME_ID}`); return 1; }
  const plan = def.patch(alt);
  if (plan.art !== 'zu-schreiben') {
    console.error(`die Sicherung ist nicht der Ausgangsstand dieses Schrittes (${plan.art === 'schon-da' ? 'sie ist schon der Zielstand' : plan.probleme.join('; ')}) — dorthin gibt es keinen Weg zurück`);
    return 1;
  }
  const ziel = Object.fromEntries(def.spalten.map(k => [k, text(plan[k])]));

  const raw = rohVon(row, def);
  console.log(`gelesen: ${def.spalten.map(k => `${k}_data ${kennzeichen(raw[k])}`).join(', ')}; Sicherung ${def.spalten.map(k => kennzeichen(gesichert[k])).join(' / ')}; Zielstand ${def.spalten.map(k => kennzeichen(ziel[k])).join(' / ')}`);
  if (def.spalten.every(k => raw[k] === gesichert[k])) { console.log('schon der Ausgangsstand — nichts zu tun'); return 0; }
  if (def.spalten.some(k => raw[k] !== ziel[k])) {
    console.error('der gelesene Text ist nicht der Zielstand und nicht der Ausgangsstand — jemand hat danach weitergearbeitet; es wird nichts überschrieben');
    return 1;
  }

  haken?.('nach-lesen', db);
  const t = tausche(db, { spalten: def.spalten, von: raw, nach: gesichert, haken });

  const jetzt = rohVon(lese(db, def), def);
  const ok = def.spalten.every(k => jetzt[k] === gesichert[k]);
  console.log(`zurückgeschrieben: ${def.spalten.map(k => `${k}_data ${raw[k].length} → ${jetzt[k].length} Zeichen, sha ${sha(raw[k])} → ${sha(jetzt[k])}`).join('; ')}${ok ? ' (= die Sicherung, Zeichen für Zeichen)' : ' — WEICHT VON DER SICHERUNG AB'}`);
  fingerabdruckZeilen(db, t);
  return ok ? 0 : 1;
}

if (process.argv[1] && process.argv[1].endsWith('doerflerzahl-daten.mjs')) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, err => { console.error(err); process.exitCode = 1; });
}
