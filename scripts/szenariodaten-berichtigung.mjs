// Die elf ersten Szenarien nach dem Tableau berichtigen (Spec M28).
//
// Sieben der elf Einträge in `setups.scenario_data.bosses` stimmen an mehreren Stellen nicht mit
// dem Tableau überein: Ernie Offal, Virginia Fitz, The Bundits, Red Atrocious, Barry Bluff,
// Ms. Falls & Co., The Door Knockers. Wie gemessen wurde und was jede Zeile belegt:
// `docs/spec-setup-system.md` M28.1 (die Spalte `beleg` unten ist die Nummer der Tabelle dort),
// die Änderung als Text mit Hashes: M28.2.
//
// **Dieser Baustein ändert vorhandene Werte.** Die beiden Vorgänger (`szenariodaten-grundspiel.mjs`,
// `auslagen-daten.mjs`) haben nur ergänzt; ihr Beweis „der alte Text von `bosses` ist Präfix des
// neuen“ gilt hier nicht. Was an seine Stelle tritt, ist schärfer (M28.6):
//
//   1. Jeder der sieben Einträge muss **genau** der erwartete Text sein (`altSha`) — oder schon das
//      Ergebnis (`neuSha`). Alles andere bricht ab, und die Meldung nennt Eintrag und **Pfad**.
//      Einen Schalter, der das umgeht, gibt es nicht und kommt nicht dazu.
//   2. Jede Einzeländerung trägt ihren eigenen erwarteten `alt`-Wert (Entscheidung 11).
//   3. Der **Rückwärtsbeweis**: im neuen Text die sieben durch ihren alten Text ersetzen — das
//      Ergebnis muss dem gelesenen Text Zeichen für Zeichen gleichen.
//
// Der Zielstand wird aus `AENDERUNGEN` **gerechnet**, nicht aus einer Datei gelesen. Die Hashes
// (`altSha`, `neuSha`) sind die Abnahme: sie stehen hier einmal (M6) und sind die aus M28.2, nicht
// aus dem Ergebnis dieses Skripts abgeleitet.
//
// Dieser Teil ist **rein** — kein `better-sqlite3`, kein Dateizugriff.

import crypto from 'node:crypto';
import path from 'node:path';

import { validateScenarioData } from '../shared/scenarioData.js';
import { checkScenarioAspect } from '../shared/scenarioGeometry.js';
import { durchrechnen, erwartetAufRaster, pngSize } from './szenariodaten-grundspiel.mjs';

export const GAME_ID = '072123c0-cd97-4ffb-a330-369630fab93f';
export const SETUP_ID = 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const copy = (x) => JSON.parse(JSON.stringify(x));

// ── Die Hashes je Eintrag (M28.2) ────────────────────────────────────────────

/**
 * sha256 des kompakten Textes jedes Eintrags, erste 12 Stellen: so, wie er heute in der
 * Produktion steht (`altSha`), und so, wie er nach der Berichtigung aussieht (`neuSha`).
 * `neuShaOhneZ1` gilt nur, wenn die Wäscheleine (Z1) abgewählt ist.
 */
export const EINTRAEGE = {
  'Ernie Offal': { altSha: 'f70452263c32', neuSha: '26f455032580' },
  'Virginia Fitz': { altSha: '3856872a71ea', neuSha: '0e8f97427d33' },
  'The Bundits': { altSha: '0bd09089d250', neuSha: '909beab802e5' },
  'Red Atrocious': { altSha: '50839293ad24', neuSha: 'dfc3c087210f' },
  'Barry Bluff': { altSha: 'f2a12ec7c71b', neuSha: 'ebeedd302fda' },
  'Ms. Falls & Co.': { altSha: '84e18b1486e2', neuSha: '80a78f3a8e4d', neuShaOhneZ1: '78204866a9de' },
  'The Door Knockers': { altSha: '163ddc7225d6', neuSha: 'e7ea86b2cdb1' },
};

// ── Die Änderungsliste (M28.2) ───────────────────────────────────────────────
//
// `{ eintrag, pfad, alt, neu, beleg }` — `alt` ist der Wert, der heute dasteht (`undefined`:
// der Schlüssel fehlt), `neu` der, der danach dasteht. `beleg` ist die Zeile aus M28.1.
//
// Zwei Arten: ein Wert wird **gesetzt** (Vorgabe), oder ein Element wird in eine Liste
// **eingefügt** (`art: 'einfuegen'`, `pfad` ist die Stelle, an der es danach steht). Alle Werte
// werden gesetzt, **bevor** eingefügt wird — die Pfade der Setzungen sind darum die **alten**
// Indizes, wie in der Tabelle M28.2. Neue Einträge hinten an `terrain`, nichts umsortiert
// (Entscheidung 10); der Zaun bei Ernie wird an seiner Stelle geteilt.
//
// `gruppe: 'Z1'` ist die Wäscheleine, die der Auftraggeber abwählen kann (Entscheidung 4).

const setze = (eintrag, pfad, alt, neu, beleg, gruppe) => ({ eintrag, pfad, alt, neu, beleg, ...(gruppe ? { gruppe } : {}) });
const fuege = (eintrag, pfad, neu, beleg) => ({ eintrag, pfad, art: 'einfuegen', alt: undefined, neu, beleg });

export const AENDERUNGEN = [
  // ── Ernie Offal ──
  setze('Ernie Offal', 'fields.B', 'J5:K6', 'K5:L6', '1'),
  setze('Ernie Offal', 'fields.D[1]', 'N6', 'O6', '2'),
  setze('Ernie Offal', 'fields.D[3]', 'M7', 'N7', '2'),
  setze('Ernie Offal', 'fields.D[4]', 'K10', 'L10', '2'),
  setze('Ernie Offal', 'terrain[1].cells[0]', 'I1:L3', 'I1:M3', '3'),          // Foodtruck
  setze('Ernie Offal', 'terrain[2].cells[0]', 'M3:M3', 'N3:N3', '4'),          // Altes Fass
  // Der Zaun wird geteilt: zwei Ausrichtungen sind zwei Geländeeinträge (M7.1 Regel 2).
  setze('Ernie Offal', 'terrain[4].cells', ['G7:G10', 'N7:N10'], ['G7:G10'], '6, 9'),
  setze('Ernie Offal', 'terrain[4].rotation', 90, 270, '9'),
  setze('Ernie Offal', 'terrain[5].cells[0]', 'J7:K8', 'K7:L8', '5'),          // Kochtopf, faceDown bleibt
  setze('Ernie Offal', 'terrain[6].cells[0]', 'J11:N13', 'K11:O13', '7'),      // Maisfeld
  fuege('Ernie Offal', 'terrain[5]', { assetName: 'Holzzaun', cells: ['O7:O10'], rotation: 90 }, '6'),

  // ── Virginia Fitz ──
  setze('Virginia Fitz', 'terrain[0].assetName', 'Dichter Wald', 'Dichter Wald 2', '12'),
  setze('Virginia Fitz', 'terrain[1].cells[0]', 'M10:S13', 'M9:S12', '10'),
  setze('Virginia Fitz', 'terrain[5].rotation', 90, 270, '13'),                // Werkzeugschuppen
  // `EG5` steht in den Daten **zweimal**: das Grabhügel-Plättchen und das Feld. Beide ändern.
  setze('Virginia Fitz', 'final.terrain[4].cells[0]', 'Q14', 'R14', '11'),
  setze('Virginia Fitz', 'final.fields.EG[4]', 'Q14', 'R14', '11'),
  // **Nach dem Bild, nicht nach dem Namen** (M28.4): das Asset `Auslöser` zeigt das Dynamitbündel,
  // das Asset `Sprengstoff` den TNT-Kasten mit weißem Plunger — der Name sagt das Gegenteil dessen,
  // was ein Leser erwartet. Auf H7 liegt das Dynamit, auf Q5 der Kasten. Beide Namen sind gültig,
  // beide Felder auch: vertauscht, merkt es kein Prüfer. Die Bärenfalle: Vorderseite, keine
  // Drehung, wie Pepin K12 und Qing L5 (Entscheidung 3). Als Bereich `H7:H7` (Entscheidung 7).
  fuege('Virginia Fitz', 'terrain[6]', { assetName: 'Auslöser', cells: ['H7:H7'] }, '14'),
  fuege('Virginia Fitz', 'terrain[7]', { assetName: 'Sprengstoff', cells: ['Q5:Q5'] }, '14'),
  fuege('Virginia Fitz', 'terrain[8]', { assetName: 'Bärenfalle / Bärenfalle (zugeschnappt)', cells: ['E11:E11'] }, '14'),

  // ── The Bundits ──
  setze('The Bundits', 'terrain[3].rotation', 90, 270, '15'),                  // Farmhaus
  setze('The Bundits', 'terrain[5].cells[0]', 'L10:L13', 'L9:L12', '16'),      // L-Zaun, eine Zeile höher …
  setze('The Bundits', 'terrain[5].rotation', 90, 270, '16'),                  // … und er braucht 270
  setze('The Bundits', 'terrain[6].cells[0]', 'P10:P13', 'P9:P12', '16'),      // P-Zaun: eine Zeile höher, bleibt 90
  fuege('The Bundits', 'terrain[7]', { assetName: 'Miefiges Plumpsklo', cells: ['I11:J12'] }, '17'),

  // ── Red Atrocious: die Wälder sind vertauscht ──
  setze('Red Atrocious', 'terrain[3].assetName', 'Dichter Wald', 'Dichter Wald 2', '18'),   // P4:S10, 90 stimmt
  setze('Red Atrocious', 'terrain[5].assetName', 'Dichter Wald 2', 'Dichter Wald', '18'),   // A7:D13 …
  setze('Red Atrocious', 'terrain[5].rotation', 90, 270, '18'),                              // … mit 270

  // ── Barry Bluff ──
  setze('Barry Bluff', 'terrain[0].rotation', 90, 270, '19'),                  // Trüber Fluss

  // ── Ms. Falls & Co. ──
  setze('Ms. Falls & Co.', 'terrain[0].rotation', undefined, 180, '20'),       // Farmhaus
  setze('Ms. Falls & Co.', 'terrain[2].rotation', 90, 270, 'Z1', 'Z1'),        // Wäscheleine, abwählbar

  // ── The Door Knockers ──
  // Der rechte Wald (`terrain[1]`, `Dichter Wald 2` an `M1:S4`) ist **richtig** (Zeile 22, §11
  // irrte) und steht darum hier nicht.
  setze('The Door Knockers', 'terrain[3].rotation', undefined, 180, '21'),     // Farmhaus
];

// ── Pfade lesen und setzen ───────────────────────────────────────────────────

/** `terrain[1].cells[0]` → `['terrain', 1, 'cells', 0]`. */
const teile = (pfad) => [...pfad.matchAll(/([^.[\]]+)|\[(\d+)\]/g)].map(m => (m[2] !== undefined ? Number(m[2]) : m[1]));

const lies = (obj, pfad) => teile(pfad).reduce((o, k) => (o == null ? undefined : o[k]), obj);

function schreibe(obj, pfad, wert) {
  const t = teile(pfad);
  const vorletztes = t.slice(0, -1).reduce((o, k) => o?.[k], obj);
  if (vorletztes == null) throw new Error(`Pfad ${pfad}: der Elternknoten fehlt`);
  // Eine fehlende Schlüssel kommt **hinten** an: Drehung steht hinter `cells`.
  vorletztes[t.at(-1)] = wert;
}

const zeige = (v) => (v === undefined ? '(fehlt)' : JSON.stringify(v));

// ── Ein Eintrag ──────────────────────────────────────────────────────────────

/** Die Änderungen eines Eintrags, ohne die abgewählten Gruppen. */
export function aenderungenVon(name, { ohne = [] } = {}) {
  return AENDERUNGEN.filter(a => a.eintrag === name && !(a.gruppe && ohne.includes(a.gruppe)));
}

/** Der Hash, den der Eintrag **nach** der Berichtigung haben muss. */
function neuShaVon(name, ohne) {
  const e = EINTRAEGE[name];
  return ohne.includes('Z1') && e.neuShaOhneZ1 ? e.neuShaOhneZ1 : e.neuSha;
}

/**
 * Den Eintrag berichtigen: Setzungen, dann Einfügungen. Jede Setzung prüft ihren `alt`-Wert —
 * stimmt er nicht, hat der Baustein einen Fehler (der Hash des ganzen Eintrags hat vorher gesagt,
 * dass der Eintrag der erwartete ist).
 */
function wende(name, eintrag, ohne) {
  const next = copy(eintrag);
  const liste = aenderungenVon(name, { ohne });
  for (const a of liste.filter(x => x.art !== 'einfuegen')) {
    const ist = lies(next, a.pfad);
    if (!same(ist, a.alt)) throw new Error(`${name} ${a.pfad}: ist ${zeige(ist)}, erwartet ${zeige(a.alt)} (Baustein und ALT_SHA widersprechen sich)`);
    schreibe(next, a.pfad, copy(a.neu));
  }
  for (const a of liste.filter(x => x.art === 'einfuegen')) {
    const liste2 = lies(next, a.pfad.replace(/\[\d+\]$/, ''));
    if (!Array.isArray(liste2)) throw new Error(`${name} ${a.pfad}: keine Liste`);
    liste2.splice(teile(a.pfad).at(-1), 0, copy(a.neu));
  }
  return next;
}

/**
 * Warum weicht der Eintrag ab? Für jede Setzung: ist der Wert `alt`, schon `neu`, oder etwas
 * Drittes — und das Dritte wird beim Pfad genannt. (Einfügungen: ist das Element da oder nicht.)
 */
function diagnose(name, eintrag, ohne) {
  const zeilen = [];
  const stand = [];
  for (const a of aenderungenVon(name, { ohne })) {
    if (a.art === 'einfuegen') {
      const liste = lies(eintrag, a.pfad.replace(/\[\d+\]$/, ''));
      const da = Array.isArray(liste) && liste.some(x => same(x, a.neu));
      stand.push(da ? 'neu' : 'alt');
      continue;
    }
    const ist = lies(eintrag, a.pfad);
    if (same(ist, a.alt)) stand.push('alt');
    else if (same(ist, a.neu)) stand.push('neu');
    else {
      stand.push('anders');
      zeilen.push(`${a.pfad} ist ${zeige(ist)}, erwartet ${zeige(a.alt)} oder schon ${zeige(a.neu)}`);
    }
  }
  if (!zeilen.length) {
    zeilen.push(stand.includes('alt') && stand.includes('neu')
      ? 'ein Teil der Änderungen ist schon da, ein Teil nicht (halb berichtigt)'
      : 'keine Stelle der Änderungsliste erklärt die Abweichung (etwas anderes im Eintrag wurde geändert)');
  }
  return zeilen;
}

// ── Die Berichtigung ─────────────────────────────────────────────────────────

/**
 * Jeden der sieben Einträge einordnen: **zu berichtigen** (genau der erwartete alte Text),
 * **schon berichtigt** (schon das Ergebnis) oder **abweichend** (alles andere — mit dem Grund,
 * beim Pfad genannt). `next` trägt die Berichtigung der ersten Art; was abweicht, bleibt, wie es ist.
 *
 * @returns {{ next: object, berichtigt: string[], schonNeu: string[], abweichend: Array<{ name: string, grund: string }> }}
 */
export function plane(scenario, { ohne = [] } = {}) {
  const bosses = scenario?.bosses;
  if (!bosses || typeof bosses !== 'object' || Array.isArray(bosses)) throw new Error('scenario_data hat kein „bosses“');
  const berichtigt = [], schonNeu = [], abweichend = [];
  const neueEintraege = {};
  for (const name of Object.keys(EINTRAEGE)) {
    const eintrag = bosses[name];
    if (eintrag === undefined) { abweichend.push({ name, grund: 'fehlt in scenario_data' }); continue; }
    const h = sha(JSON.stringify(eintrag));
    const alt = EINTRAEGE[name].altSha, neu = neuShaVon(name, ohne);
    if (h === neu) { schonNeu.push(name); continue; }
    if (h !== alt) {
      abweichend.push({ name, grund: `sha ${h}, erwartet ${alt} oder schon ${neu}: ${diagnose(name, eintrag, ohne).join('; ')}` });
      continue;
    }
    const next = wende(name, eintrag, ohne);
    const hn = sha(JSON.stringify(next));
    if (hn !== neu) { abweichend.push({ name, grund: `das Ergebnis hat sha ${hn}, erwartet ${neu} — Fehler im Baustein, nicht im Eintrag` }); continue; }
    neueEintraege[name] = next;
    berichtigt.push(name);
  }
  // Die Einträge **an ihrer Stelle** ersetzen: Reihenfolge und alle Schlüssel bleiben.
  const nextBosses = Object.fromEntries(Object.entries(bosses).map(([k, v]) => [k, k in neueEintraege ? neueEintraege[k] : v]));
  return { next: { ...scenario, bosses: nextBosses }, berichtigt, schonNeu, abweichend };
}

/**
 * `scenario_data` → `scenario_data` mit den sieben berichtigten Einträgen. **Wirft**, wenn einer
 * der sieben weder der erwartete alte Text noch das Ergebnis ist; die Meldung nennt Eintrag und
 * Pfad. Es gibt keinen Schalter, der das umgeht.
 *
 * @param {object} scenario
 * @param {{ ohne?: string[] }} [opts] `ohne: ['Z1']` wählt die Wäscheleine ab (Entscheidung 4)
 * @returns {{ next: object, berichtigt: string[], schonNeu: string[] }}
 */
export function berichtige(scenario, opts) {
  const { next, berichtigt, schonNeu, abweichend } = plane(scenario, opts);
  if (abweichend.length) {
    throw new Error(`Berichtigung abgebrochen, nichts geändert: ${abweichend.map(a => `„${a.name}“ weicht ab (${a.grund})`).join(' | ')}`);
  }
  return { next, berichtigt, schonNeu };
}

// ── Der Rückwärtsbeweis (statt des Präfixbeweises) ───────────────────────────

/**
 * Im Text von `after` jeden der `namen` durch seinen alten Text (aus `before`) ersetzen: das
 * Ergebnis muss dem Text von `before` **Zeichen für Zeichen** gleichen. Damit sind die übrigen
 * Einträge, jeder andere Schlüssel, die Schlüsselreihenfolge und die Reihenfolge der Einträge
 * unberührt. (Setzt kompaktes `JSON.stringify` voraus — der Aufrufer prüft es beim Lesen.)
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function rueckwaertsbeweis(before, after, namen) {
  let t = JSON.stringify(after);
  for (const name of namen) {
    const neu = JSON.stringify(after.bosses?.[name]);
    const alt = JSON.stringify(before.bosses?.[name]);
    if (neu === undefined || alt === undefined) return [`Eintrag „${name}“ fehlt`];
    const marke = `${JSON.stringify(name)}:${neu}`;
    const i = t.indexOf(marke);
    if (i < 0) return [`Eintrag „${name}“ steht nicht als „${name}“:<Text> im neuen Text`];
    if (t.indexOf(marke, i + 1) >= 0) return [`Eintrag „${name}“ steht mehrfach im neuen Text`];
    // Mit Schnitt statt `replace`: `$` im Ersatztext ist dort ein Sonderzeichen.
    t = t.slice(0, i) + `${JSON.stringify(name)}:${alt}` + t.slice(i + marke.length);
  }
  const ist = JSON.stringify(before);
  if (t === ist) return [];
  let k = 0;
  while (k < t.length && t[k] === ist[k]) k++;
  return [`der Rückwärtsbeweis scheitert: der Text weicht ab Zeichen ${k} ab („…${t.slice(Math.max(0, k - 30), k + 30)}…“ gegen „…${ist.slice(Math.max(0, k - 30), k + 30)}…“)`];
}

/** Die elf Einträge, die berichtigt oder bestätigt sind — die neun vom 2026-11-07 gehören nicht dazu. */
export const EINTRAEGE_ELF = Object.fromEntries([
  'Deputy Waggums', 'Virginia Fitz', 'The Bundits', 'Red Atrocious', 'Tilda Fields', 'Ernie Offal',
  'Barry Bluff', 'Tartar Fishboy', 'Ms. Falls & Co.', 'Patches', 'The Door Knockers',
].map(n => [n, true]));

// ── Die Prüfer, gegen die echte Assetliste und das echte Raster ──────────────

/** Die eine Meldung von `checkScenarioAspect`, die nach M28 bleibt und bekannt ist (Z5). */
export const BEKANNTE_ASPEKTMELDUNGEN = ['Flut / Matschpfuetze'];

/**
 * `validateScenarioData`, `checkScenarioAspect` und die 22 Läufe (elf Bösewichte × Kampf und
 * Endkampf) mit der echten Maschinerie (`durchrechnen` aus `szenariodaten-grundspiel.mjs`).
 *
 * @param {object} next    das Ergebnis von `berichtige`
 * @param {{ assets: any[], cards: any[], grids: any[], imageSizes?: object }} env
 * @returns {{ probleme: string[], aspekt: any[], laeufe: any[], beanstandungen: string[] }}
 */
export function pruefeZiel(next, { assets, cards, grids, imageSizes = {} }) {
  const beanstandungen = [];

  const probleme = validateScenarioData(next, { assets, grids });
  for (const p of probleme) beanstandungen.push(`validateScenarioData: ${p}`);

  // Eine Meldung zum Seitenverhältnis ist ein Verdacht; die eine bekannte bleibt, jede neue ist eine Beanstandung.
  const aspekt = checkScenarioAspect(next, { imageSizes, grids });
  for (const m of aspekt) {
    if (!BEKANNTE_ASPEKTMELDUNGEN.includes(m.assetName)) beanstandungen.push(`Seitenverhältnis: ${m.message}`);
  }

  const laeufe = [];
  for (const boss of Object.keys(EINTRAEGE_ELF)) {
    for (const final of [false, true]) {
      const r = durchrechnen(boss, { assets, cards, grids, scenarioData: next }, final);
      const erwartet = erwartetAufRaster(next.bosses[boss], final);
      const build = r.log.find(l => l.type === 'build_scenario');
      laeufe.push({ boss, final, tokens: r.tokensAufRaster, erwartet, karten: r.karten, log: r.log });
      const wo = `${boss} (${final ? 'Endkampf' : 'Kampf'})`;
      if (!build || build.status === 'skipped' || build.status === 'failed') beanstandungen.push(`${wo}: build_scenario ${build?.status ?? 'fehlt'}: ${build?.reason ?? ''}`);
      else if (build.status === 'note' && !/no terrain cards? in this library \(nothing to do\)/.test(build.reason ?? '')) beanstandungen.push(`${wo}: build_scenario note, unbekannt: ${build.reason}`);
      for (const l of r.log) {
        if (l.type === 'build_scenario' || (l.status !== 'failed' && l.status !== 'skipped')) continue;
        // Tildas Sheriff bekommt kein benanntes Teil (`$SHERIFF is not bound`) — gewollt.
        if (boss === 'Tilda Fields' && l.type === 'place_card' && /\$SHERIFF is not bound/.test(l.reason ?? '')) continue;
        beanstandungen.push(`${wo}: Schritt ${l.index} ${l.type} ${l.status}: ${l.reason}`);
      }
      if (r.tokensAufRaster !== erwartet) beanstandungen.push(`${wo}: ${r.tokensAufRaster} Objekte auf dem Raster, erwartet ${erwartet}`);
    }
  }
  return { probleme, aspekt, laeufe, beanstandungen };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
//
// Aufruf (im Backend-Container, wo `better-sqlite3` liegt; die Datei liegt dort als
// `/app/szenariodaten-berichtigung.mjs` neben `/app/szenariodaten-grundspiel.mjs`, `../shared`
// ist dann `/shared`; `docs/datenzugriff.md`):
//
//   node szenariodaten-berichtigung.mjs --json                 # die Änderungsliste, ohne Datenbank
//   node szenariodaten-berichtigung.mjs --check <db>           # Trockenlauf, schreibgeschützt

const USAGE = 'usage: szenariodaten-berichtigung.mjs --json | --check <db> [--ohne-z1]';

const zeigeKurz = (v) => (v === undefined ? '(fehlt)' : JSON.stringify(v));

function argumente(argv) {
  const ohne = [];
  const pos = [];
  for (const a of argv) {
    if (a === '--ohne-z1') ohne.push('Z1');
    else pos.push(a);
  }
  return { ohne, pos };
}

/** Der Plan als JSON — `alt` fehlt, wo der Schlüssel heute fehlt, und sagt es mit `altFehlt`. */
function planAlsJson() {
  return {
    eintraege: EINTRAEGE,
    aenderungen: AENDERUNGEN.map(({ alt, ...a }) => ({ ...a, ...(alt === undefined ? { altFehlt: true } : { alt }) })),
  };
}

/**
 * `deps.Database` ist der SQLite-Treiber (auf dem Server liegt `better-sqlite3` neben der Datei, im
 * Repo unter `server/` — der Test reicht ihn herein). `deps.uploadsDir`: wo die Bilddateien liegen
 * (Vorgabe `CGE_UPLOADS_DIR`, sonst `/app/uploads`).
 */
export async function main(argv, deps = {}) {
  const { ohne, pos } = argumente(argv);
  const [mode, dbPath] = pos;

  if (mode === '--json') {
    console.log(JSON.stringify(planAlsJson(), null, 1));
    return 0;
  }
  if (mode !== '--check' || !dbPath) {
    console.error(USAGE);
    return 2;
  }

  const Database = deps.Database ?? (await import('better-sqlite3')).default;
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  // Geschlossen wird immer: ein Lauf, der abbricht, lässt die Datei nicht gesperrt liegen.
  try {
    return await pruefen(db, { ohne, uploadsDir: deps.uploadsDir });
  } finally {
    db.close();
  }
}

/** Lesen, planen, prüfen, ausgeben — ohne zu schreiben. */
async function pruefen(db, { ohne, uploadsDir }) {
  const complaints = [];

  // ── lesen: nur diese eine Spalte (und das game_id des Aufbaus), als Text ──
  const row = db.prepare('select game_id, scenario_data, grid_data from setups where id = ?').get(SETUP_ID);
  if (!row) { console.error(`Aufbau ${SETUP_ID} nicht gefunden`); return 1; }
  if (row.game_id !== GAME_ID) complaints.push(`Aufbau gehört zu Spiel ${row.game_id}, erwartet ${GAME_ID}`);
  const raw = row.scenario_data;
  const before = JSON.parse(raw);
  // Der Rückwärtsbeweis ist ein Vergleich von Text und braucht das kompakte JSON.stringify-Format.
  if (JSON.stringify(before) !== raw) complaints.push('der gespeicherte Text ist nicht kompaktes JSON.stringify — byteweiser Vergleich nicht möglich');
  console.log(`gelesen: scenario_data ${raw.length} Zeichen (sha ${sha(raw)}), ${Object.keys(before.bosses ?? {}).length} Einträge, Schlüssel ${Object.keys(before).join(', ')}`);

  // ── Plan ──
  const { next, berichtigt, schonNeu, abweichend } = plane(before, { ohne });
  console.log(`${berichtigt.length} zu berichtigen, ${schonNeu.length} schon berichtigt, ${abweichend.length} abweichend${ohne.length ? ` (ohne ${ohne.join(', ')})` : ''}`);
  for (const name of Object.keys(EINTRAEGE)) {
    const art = berichtigt.includes(name) ? 'zu berichtigen' : schonNeu.includes(name) ? 'schon berichtigt' : 'ABWEICHEND';
    console.log(`  ${name}: ${art}${berichtigt.includes(name) ? ` (sha ${EINTRAEGE[name].altSha} → ${neuShaVon(name, ohne)})` : ''}`);
    if (!berichtigt.includes(name)) continue;
    for (const a of aenderungenVon(name, { ohne })) {
      const pfad = a.art === 'einfuegen' ? `${a.pfad} (einfügen)` : a.pfad;
      console.log(`      ${pfad.padEnd(34)} ${zeigeKurz(a.alt)} → ${zeigeKurz(a.neu)}   [Zeile ${a.beleg}]`);
    }
  }
  for (const a of abweichend) complaints.push(`„${a.name}“ weicht ab: ${a.grund} — es wird nichts überschrieben`);
  if (abweichend.length) {
    console.log(`Trockenlauf: ${complaints.length} Beanstandungen`);
    for (const c of complaints) console.log('  - ' + c);
    return 1;
  }

  // ── Rückwärtsbeweis ──
  const beweis = rueckwaertsbeweis(before, next, berichtigt);
  console.log(`Rückwärtsbeweis: ${beweis.length ? 'NEIN' : 'ja'} (${berichtigt.length} berichtigte Einträge durch ihren alten Text ersetzt = der gelesene Text, Zeichen für Zeichen)`);
  for (const c of beweis) complaints.push(`Rückwärtsbeweis: ${c}`);

  // ── gegen die echte Assetliste, das echte Raster, die echte Bibliothek ──
  const assets = db.prepare('select id, name, type, image_path, back_image_path, width, height from table_assets where game_id = ?').all(row.game_id);
  const cards = db.prepare('select c.id, c.name, c.image_path, k.name as category from cards c left join categories k on k.id = c.category_id where c.game_id = ?').all(row.game_id);
  const grids = JSON.parse(row.grid_data);
  const uploads = uploadsDir || process.env.CGE_UPLOADS_DIR || '/app/uploads';
  const imageSizes = {};
  for (const a of assets) {
    const s = pngSize(path.join(uploads, String(a.image_path ?? '').replace(/^\/uploads\//, '')));
    if (s) imageSizes[a.name] = s;
  }
  const p = pruefeZiel(next, { assets, cards, grids, imageSizes });
  console.log(`validateScenarioData: ${p.probleme.length} Probleme (${assets.length} Assets, ${cards.length} Karten, Raster „${grids[0]?.label}“)`);
  console.log(`checkScenarioAspect: ${p.aspekt.length} Meldung${p.aspekt.length === 1 ? '' : 'en'} (${Object.keys(imageSizes).length} Bildmaße gelesen)${p.aspekt.length ? ':' : ''}`);
  for (const m of p.aspekt) console.log(`    ${BEKANNTE_ASPEKTMELDUNGEN.includes(m.assetName) ? 'bekannt (Z5)' : 'NEU'}: ${m.message}`);
  console.log('durchgerechnet (Bösewicht aufdecken, build_scenario, Dörfler, $SHERIFF), elf Bösewichte × Kampf und Endkampf:');
  for (const l of p.laeufe) {
    const build = l.log.find(e => e.type === 'build_scenario');
    console.log(`  ${l.boss.padEnd(18)} ${l.final ? 'Endkampf' : 'Kampf   '}: build_scenario ${build?.status}; Raster ${l.tokens}/${l.erwartet}; Karten ${l.karten.length}${build?.status === 'note' ? ` — ${build.reason}` : ''}`);
  }
  console.log(p.beanstandungen.length ? `${p.laeufe.length} Läufe, ${p.beanstandungen.length} Beanstandungen` : `${p.laeufe.length} Läufe sauber`);
  complaints.push(...p.beanstandungen);

  console.log(`Zielstand: scenario_data ${JSON.stringify(next).length} Zeichen, sha ${sha(JSON.stringify(next))}`);
  console.log(`Trockenlauf: ${complaints.length} Beanstandungen`);
  for (const c of complaints) console.log('  - ' + c);
  if (complaints.length) return 1;
  if (!berichtigt.length) { console.log('nichts zu schreiben (alle sieben schon berichtigt)'); return 0; }
  console.log(`würde schreiben: ${berichtigt.length} Einträge, scenario_data ${raw.length} → ${JSON.stringify(next).length} Zeichen (nichts geschrieben)`);
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('szenariodaten-berichtigung.mjs')) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, err => { console.error(err); process.exitCode = 1; });
}
