// Drei Plättchenarten finden ihre Geländekarte (Spec M29).
//
// Ein Geländeplättchen findet seine Karte nur über den Namen (M8.3, M7.6). Für `Dichter Wald 2`,
// `Sprengstoff` und `Auslöser` trifft er nicht, obwohl die Karten da sind (`Dichter Wald`,
// `Sprengstoff & Auslöser`). Entschieden ist eine Tabelle `terrainCards` in `setups.scenario_data`
// (M29.2), die `build_scenario` als dritten, letzten Versuch liest (M29.3). Wie gemessen wurde:
// `docs/spec-setup-system.md` M29.1; der Zielstand mit Hashes: M29.6.
//
// **Dieser Baustein ergänzt nur.** Anders als M28 (`szenariodaten-berichtigung.mjs`) ändert er keinen
// vorhandenen Wert: ein Schlüssel kommt hinten an `scenario_data`, die fünf vorhandenen Schlüssel und alle
// 20 Einträge bleiben byteweise gleich. Darum gilt hier wieder der Präfixbeweis (der neue Text ist der alte
// ohne die letzte `}` plus `,"terrainCards":…}`) und der Rückwärtsbeweis ist das Entfernen **eines**
// Fragments. Was M28 sonst vorgemacht hat, gilt unverändert: Vorbedingung, Vergleich-und-Tausch,
// Fingerabdruck, Sicherung, Weg zurück — und **kein `--force`**.
//
// Die Zuordnung steht **einmal** hier (`ZUORDNUNG`); Prüfer, Skript, Rauchtest und Tests lesen dieselbe (M6).
// Dieser Teil ist **rein** — kein `better-sqlite3`, kein Dateizugriff.

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

import { validateScenarioData } from '../shared/scenarioData.js';
import { checkScenarioAspect } from '../shared/scenarioGeometry.js';
import { durchrechnen, erwartetAufRaster, pngSize } from './szenariodaten-grundspiel.mjs';
import { GAME_ID, SETUP_ID, sha, saveStateHashes, bekannteMeldung, tausche, fingerabdruckZeilen } from './szenariodaten-berichtigung.mjs';

export { GAME_ID, SETUP_ID, saveStateHashes };

const copy = (x) => JSON.parse(JSON.stringify(x));
const text = (x) => JSON.stringify(x);

// ── Die Tabelle (M29.6) ──────────────────────────────────────────────────────

/**
 * `{ "<Assetname des Plättchens>": "<Name der Geländekarte>" }`. Die Reihenfolge ist Teil des Hashes
 * (`aad39d745984`), `ü`/`ö` sind vorzusammengesetzt (NFC) — `norm` im Executor normalisiert nicht.
 * Jedes Paar hat ein Mensch gegen das Bild geprüft (M29.4); `Holzzaun 2` und `Flut (hochkant)` fehlen
 * bewusst (0 Stellen in den Daten, M29.10).
 */
export const ZUORDNUNG = Object.freeze({
  'Dichter Wald 2': 'Dichter Wald',
  'Sprengstoff': 'Sprengstoff & Auslöser',
  'Auslöser': 'Sprengstoff & Auslöser',
});

/** Der Stand der Produktion vor dem Schreiben und der Zielstand danach (M29.6). Gerechnet hat sie die Produktion. */
export const AUSGANG = Object.freeze({ laenge: 18982, sha: '5eec10582ec8' });
export const ZIEL = Object.freeze({ laenge: 19106, sha: '914461d63f77' });

/** `bosses` im Ausgangsstand (= der Zielstand von M28): 15 567 Zeichen, und je Eintrag sein Hash (M29.6). */
export const BOSSES = Object.freeze({ laenge: 15567, sha: 'f6c1d5f585c0' });
export const EINTRAEGE_SHA = Object.freeze({
  'Deputy Waggums': '1fb204d54257', 'Virginia Fitz': '0e8f97427d33', 'The Bundits': '909beab802e5',
  'Red Atrocious': 'dfc3c087210f', 'Tilda Fields': 'e5a9e2eeaa7f', 'Ernie Offal': '26f455032580',
  'Barry Bluff': 'ebeedd302fda', 'Tartar Fishboy': '93902e65bcb8', 'Ms. Falls & Co.': '80a78f3a8e4d',
  'Patches': '931d0547a617', 'The Door Knockers': 'e7ea86b2cdb1', 'Bort Dovis': '5ef877d75e05',
  'Handsy': '4fc6177a6bf6', 'Lawman Dozy': '355edd78fc78', 'Penny Pinchetti': '415789baf76e',
  'Pepin Milkfrog': 'cd7a7c5dcde8', 'Qing & Kween': 'cc8f1f845834', 'Samuel Strawman': '1d15be2b81e4',
  'Umbrello': 'c18f8eb1bc25', 'Will Barlow': 'df21cf20aa52',
});

/** Das eingefügte Fragment: `,"terrainCards":<Text>` (124 Zeichen), vor der letzten `}`. */
const FRAGMENT = `,"terrainCards":${text(ZUORDNUNG)}`;

// ── Ergänzen, einordnen, beweisen ────────────────────────────────────────────

/** `scenario_data` → `scenario_data` mit der Tabelle **hinten**. Verändert die Eingabe nicht; überschreibt nie. */
export function ergaenze(scenario) {
  if (scenario && Object.hasOwn(scenario, 'terrainCards')) {
    throw new Error('terrainCards ist schon da — eine vorhandene Tabelle wird nie überschrieben');
  }
  return { ...copy(scenario), terrainCards: copy(ZUORDNUNG) };
}

/**
 * Die gelesene Spalte einordnen — **eine** Frage mit drei Antworten (M29.7):
 *
 * - `zu-schreiben`: keine Tabelle, und `bosses` ist der Ausgang (der Text und jeder der 20 Einträge); `next` ist der Zielstand.
 * - `schon-da`: die Tabelle ist da und gleicht `ZUORDNUNG` — **gleich was der Rest sagt** (wer nach M29 weiterarbeitet,
 *   ist kein Fehler); `next` ist die Eingabe.
 * - `abweichend`: alles andere — eine andere Tabelle (die Meldung nennt beide Texte) oder ein `bosses`, das nicht der
 *   Ausgang ist (die Meldung nennt die Einträge). `next` fehlt, und nichts wird überschrieben.
 *
 * @returns {{ art: 'zu-schreiben'|'schon-da'|'abweichend', next?: object, meldung?: string }}
 */
export function plane(scenario) {
  if (scenario && Object.hasOwn(scenario, 'terrainCards')) {
    const ist = text(scenario.terrainCards);
    if (ist === text(ZUORDNUNG)) return { art: 'schon-da', next: scenario };
    return { art: 'abweichend', meldung: `terrainCards ist schon da und anders: ${ist}, erwartet ${text(ZUORDNUNG)} — eine vorhandene Tabelle wird nie überschrieben` };
  }
  const bosses = scenario?.bosses;
  if (!bosses || typeof bosses !== 'object' || Array.isArray(bosses)) {
    return { art: 'abweichend', meldung: 'scenario_data hat kein „bosses“' };
  }
  const abweichend = [];
  for (const [name, erwartet] of Object.entries(EINTRAEGE_SHA)) {
    if (!(name in bosses)) abweichend.push(`„${name}“ fehlt`);
    else if (sha(text(bosses[name])) !== erwartet) abweichend.push(`„${name}“ hat sha ${sha(text(bosses[name]))}, erwartet ${erwartet}`);
  }
  for (const name of Object.keys(bosses)) if (!(name in EINTRAEGE_SHA)) abweichend.push(`„${name}“ ist ein Eintrag mehr, als der Ausgangsstand kennt`);
  if (!abweichend.length && sha(text(bosses)) !== BOSSES.sha) abweichend.push(`bosses hat sha ${sha(text(bosses))}, erwartet ${BOSSES.sha} (die Reihenfolge der Einträge?)`);
  if (abweichend.length) return { art: 'abweichend', meldung: `bosses ist nicht der Ausgangsstand: ${abweichend.join('; ')}` };
  return { art: 'zu-schreiben', next: ergaenze(scenario) };
}

const abwTeil = (t, ist) => {
  let k = 0;
  while (k < t.length && t[k] === ist[k]) k++;
  return `weicht ab Zeichen ${k} ab („…${t.slice(Math.max(0, k - 30), k + 30)}…“ gegen „…${ist.slice(Math.max(0, k - 30), k + 30)}…“)`;
};

/**
 * Die beiden Beweise, auf dem Zielstand und **vor** dem Schreiben (M29.7 Nr. 2):
 *
 * - **Präfixbeweis:** der neue Text ist der alte ohne die letzte `}`, plus `,"terrainCards":<Text>}`.
 * - **Rückwärtsbeweis:** das Fragment aus dem neuen Text entfernen ergibt den alten Text, Zeichen für Zeichen.
 *
 * Beide zusammen zeigen, dass jeder andere Schlüssel, jeder Eintrag und die Reihenfolge unberührt sind.
 *
 * @returns {string[]} Beanstandungen, leer = bewiesen
 */
export function beweise(before, after) {
  const alt = text(before), neu = text(after);
  const meldungen = [];
  const erwartet = `${alt.slice(0, -1)}${FRAGMENT}}`;
  if (neu !== erwartet) meldungen.push(`Präfixbeweis: der neue Text ist nicht der alte ohne die letzte „}“ plus das Fragment — ${abwTeil(neu, erwartet)}`);
  if (!neu.endsWith(`${FRAGMENT}}`)) meldungen.push('Rückwärtsbeweis: der neue Text endet nicht auf das Fragment');
  else {
    const zurueck = `${neu.slice(0, -(FRAGMENT.length + 1))}}`;
    if (zurueck !== alt) meldungen.push(`Rückwärtsbeweis: ohne das Fragment ist der Text nicht der gelesene — ${abwTeil(zurueck, alt)}`);
  }
  return meldungen;
}

// ── Die Läufe (40: alle 20 Bösewichte, Kampf und Endkampf) ───────────────────

/** Die Plättchennamen in der Meldung eines `build_scenario` mit Status `note`. */
const namenIn = (build) => (build?.status === 'note' ? [...(build.reason ?? '').matchAll(/"([^"]+)"/g)].map(m => m[1]) : []);

/**
 * Alle Bösewichte des Eintrags `scenario.bosses` × Kampf und Endkampf mit der echten Maschinerie
 * (`durchrechnen`: Bösewicht aufdecken, `build_scenario`, Dörfler, `$SHERIFF`).
 */
export function laeufe(scenario, { assets, cards, grids }) {
  const out = [];
  for (const boss of Object.keys(scenario.bosses)) {
    for (const final of [false, true]) {
      const r = durchrechnen(boss, { assets, cards, grids, scenarioData: scenario }, final);
      out.push({
        boss, final, tokens: r.tokensAufRaster, erwartet: erwartetAufRaster(scenario.bosses[boss], final),
        karten: r.karten, log: r.log,
      });
    }
  }
  return out;
}

/**
 * Die Prüfer, gegen die echte Assetliste, die echte Bibliothek und das echte Raster:
 * `validateScenarioData` mit `cards` (prüft die Tabelle, M29.5), `checkScenarioAspect` (nur die
 * bekannten Meldungen aus M28) und die 40 Läufe (nie `failed`/`skipped` außer Tildas `$SHERIFF is not bound`
 * und Handsys doppelter TRILLERPFEIFE,
 * jede `note` nur der allgemeine Wortlaut „keine Karte in dieser Bibliothek“).
 *
 * @returns {{ probleme: string[], aspekt: any[], laeufe: any[], beanstandungen: string[] }}
 */
export function pruefeZiel(ziel, { assets, cards, grids, imageSizes = {} }) {
  const beanstandungen = [];

  const probleme = validateScenarioData(ziel, { assets, grids, cards });
  for (const p of probleme) beanstandungen.push(`validateScenarioData: ${p}`);

  const aspekt = checkScenarioAspect(ziel, { imageSizes, grids });
  for (const m of aspekt) if (!bekannteMeldung(m)) beanstandungen.push(`Seitenverhältnis: ${m.message}`);

  const l = laeufe(ziel, { assets, cards, grids });
  for (const r of l) {
    const wo = `${r.boss} (${r.final ? 'Endkampf' : 'Kampf'})`;
    const build = r.log.find(e => e.type === 'build_scenario');
    if (!build || build.status === 'skipped' || build.status === 'failed') beanstandungen.push(`${wo}: build_scenario ${build?.status ?? 'fehlt'}: ${build?.reason ?? ''}`);
    else if (build.status === 'note' && !/no terrain cards? in this library \(nothing to do\)/.test(build.reason ?? '')) beanstandungen.push(`${wo}: build_scenario note, unbekannt: ${build.reason}`);
    for (const e of r.log) {
      if (e.type === 'build_scenario' || (e.status !== 'failed' && e.status !== 'skipped')) continue;
      // Tildas Sheriff bekommt kein benanntes Teil (`$SHERIFF is not bound`) — gewollt.
      if (r.boss === 'Tilda Fields' && e.type === 'place_card' && /\$SHERIFF is not bound/.test(e.reason ?? '')) continue;
      // Handsys Sheriff-Karte ist die TRILLERPFEIFE, und die gibt es zweimal (zwei Bilder, zwei Kategorien; docs/datenzugriff.md).
      // `durchrechnen` ruft `place_card` ohne Kategorie auf, die echte Aufbau-Folge mit — der Schritt scheitert hier immer, vorher wie nachher.
      if (r.boss === 'Handsy' && r.final && e.type === 'place_card' && /"TRILLERPFEIFE" matches 2 cards/.test(e.reason ?? '')) continue;
      beanstandungen.push(`${wo}: Schritt ${e.index} ${e.type} ${e.status}: ${e.reason}`);
    }
    if (r.tokens !== r.erwartet) beanstandungen.push(`${wo}: ${r.tokens} Objekte auf dem Raster, erwartet ${r.erwartet}`);
  }
  return { probleme, aspekt, laeufe: l, beanstandungen };
}

/** `kurz` kommt in `lang` vor, in gleicher Reihenfolge (nicht unbedingt nebeneinander). */
const teilfolge = (kurz, lang) => {
  let i = 0;
  for (const k of lang) if (k === kurz[i]) i++;
  return i === kurz.length;
};

/**
 * Die Umfangstabelle (M29.1): dieselben 40 Läufe für `ausgang` und `ziel`, Zeile für Zeile — Namen ohne
 * Karte, `build_scenario`-Status, Karten, Objekte auf dem Raster, die übrigen Protokollzeilen.
 *
 * `unveraendert`: Meldung **und** Kartenreihe Zeichen für Zeichen dieselbe. `restGleich`: alle Protokollzeilen
 * außer `build_scenario` gleich. Die Summen sind die aus M29.1.
 */
export function vergleiche(ausgang, ziel, env) {
  const vor = laeufe(ausgang, env), nach = laeufe(ziel, env);
  const zeilen = vor.map((a, i) => {
    const b = nach[i];
    const bauA = a.log.find(e => e.type === 'build_scenario'), bauB = b.log.find(e => e.type === 'build_scenario');
    const rest = (r) => text(r.log.filter(e => e.type !== 'build_scenario'));
    return {
      boss: a.boss, final: a.final,
      vorher: { status: bauA?.status, namen: namenIn(bauA), karten: a.karten, tokens: a.tokens },
      nachher: { status: bauB?.status, namen: namenIn(bauB), karten: b.karten, tokens: b.tokens },
      unveraendert: text(a.log) === text(b.log) && text(a.karten) === text(b.karten),
      // Jede Karte, die vorher lag, liegt nachher, in gleicher Reihenfolge untereinander (Teilfolge).
      monoton: teilfolge(a.karten, b.karten),
      restGleich: rest(a) === rest(b),
    };
  });
  const zaehle = (f) => ({ vorher: zeilen.filter(z => f(z.vorher, z)).length, nachher: zeilen.filter(z => f(z.nachher, z)).length });
  const verschwunden = {};
  for (const z of zeilen) for (const n of z.vorher.namen) if (!z.nachher.namen.includes(n)) verschwunden[n] = (verschwunden[n] ?? 0) + 1;
  return {
    zeilen,
    summe: {
      ok: zaehle(s => s.status === 'ok'),
      note: zaehle(s => s.status === 'note'),
      vorkampfNote: zaehle((s, z) => !z.final && s.status === 'note'),
      namen: { vorher: zeilen.reduce((n, z) => n + z.vorher.namen.length, 0), nachher: zeilen.reduce((n, z) => n + z.nachher.namen.length, 0) },
      verschwunden,
    },
  };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
//
// Aufruf (im Backend-Container, wo `better-sqlite3` liegt; die Datei liegt dort als `/app/gelaendekarten-zuordnung.mjs`
// neben `/app/szenariodaten-berichtigung.mjs` und `/app/szenariodaten-grundspiel.mjs`, `../shared` ist dann `/shared`;
// `docs/datenzugriff.md`):
//
//   node gelaendekarten-zuordnung.mjs --json                                    # die Tabelle samt Ausgang/Ziel, ohne Datenbank
//   node gelaendekarten-zuordnung.mjs --check <db>                              # Trockenlauf, schreibgeschützt
//   node gelaendekarten-zuordnung.mjs --write <db> --sicherung-sha <hex>        # eine IMMEDIATE-Transaktion
//   node gelaendekarten-zuordnung.mjs --zurueck <sicherungsdatei> <db>          # der Weg zurück
//
// **Es gibt kein `--force`** (M28 hat das entschieden, es gilt weiter): ein Stand, der nicht der Ausgangsstand ist, bricht ab.
//
// **Die Absicherung beim Schreiben, in der Reihenfolge, in der sie läuft** (M29.7):
//
//   1. Die Sicherung legt dieses Skript **nicht** an. `--write` verlangt den **Hash** der Sicherung und schreibt nur,
//      wenn er zum **gelesenen** Text passt: ohne Sicherung kein Schreiben. (Die von M28 ist der Stand *vor* M28 und passt nicht.)
//   2. Einordnung: Ausgangsstand (Länge und Hash der Spalte, `bosses` und jeder der 20 Einträge) → zu schreiben; die Tabelle
//      schon da und gleich → schon geschrieben; alles andere → Abbruch mit Länge, Hash und Text. Eine vorhandene Tabelle
//      wird nie überschrieben.
//   3. Präfix- und Rückwärtsbeweis, `validateScenarioData` (mit der Bibliothek), 40 Läufe: vor dem Schreiben, auf dem Zielstand,
//      der selbst Länge und Hash aus M29.6 haben muss.
//   4. Eine `IMMEDIATE`-Transaktion (die Schreibsperre ist da, **bevor** gehasht wird), darin Fingerabdruck vorher und nachher —
//      je Tabelle und je Zeile von `save_states` — und `UPDATE … WHERE id = ? AND scenario_data = <exakt der gelesene Text>`.
//      Trifft er keine Zeile, hat jemand die Spalte zwischen Lesen und Schreiben geändert: Abbruch. **Nur diese Spalte.**
//      (`tausche` und `fingerabdruckZeilen` kommen aus dem M28-Skript — kopiert wird nichts.)
//   5. Kontrollausgabe, **neu gelesen**, nicht aus dem Plan.
//
// Der Weg zurück ist derselbe Vergleich-und-Tausch in die andere Richtung: der aktuelle Text muss **genau der Zielstand** sein.
// **Beide zurück: zuerst M29, dann M28** — M28s `--zurueck` verlangt *seinen* Zielstand und weigert sich, solange die Tabelle dasteht.

const USAGE = 'usage: gelaendekarten-zuordnung.mjs --json | --check <db> | --write <db> --sicherung-sha <hex> | --zurueck <sicherungsdatei> <db>';
const MODI = ['--json', '--check', '--write', '--zurueck'];
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const gleich = (a, b) => (text(a) === text(b) ? 'gleich' : 'GEÄNDERT');

function argumente(argv) {
  const pos = [], unbekannt = [];
  let sicherungSha;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sicherung-sha') sicherungSha = argv[++i] ?? '';
    // Der erste Parameter ist der Modus; jede weitere Option, die das Skript nicht kennt (auch `--force`), ist ein Benutzungsfehler.
    else if (a.startsWith('--') && (pos.length || !MODI.includes(a))) unbekannt.push(a);
    else pos.push(a);
  }
  return { pos, sicherungSha, unbekannt };
}

/**
 * `deps.Database` ist der SQLite-Treiber (auf dem Server liegt `better-sqlite3` neben der Datei, im Repo unter `server/` — der
 * Test reicht ihn herein). `deps.uploadsDir`: wo die Bilddateien liegen (Vorgabe `CGE_UPLOADS_DIR`, sonst `/app/uploads`).
 * `deps.haken(stelle, db)`: **die eine** Stelle, an der ein Test einhängen kann — `'nach-lesen'` (zwischen Lesen und Schreiben,
 * außerhalb der Transaktion) und `'in-transaktion'` (nach dem Fingerabdruck vorher, vor dem UPDATE).
 *
 * Die Vorbedingung nennt die Produktionswerte (`AUSGANG`) — ohne Naht: die Fixture erreicht sie (Fixture → `patchScenario` → `berichtige`).
 */
export async function main(argv, deps = {}) {
  const { pos, sicherungSha, unbekannt } = argumente(argv);
  const [mode, a1, a2] = pos;

  if (unbekannt.length || !MODI.includes(mode)) { console.error(USAGE); return 2; }
  if (mode === '--json') {
    console.log(JSON.stringify({ terrainCards: ZUORDNUNG, ausgang: AUSGANG, ziel: ZIEL }, null, 1));
    return 0;
  }
  const dbPath = mode === '--zurueck' ? a2 : a1;
  if (!dbPath || (mode === '--zurueck' && !a1)) { console.error(USAGE); return 2; }

  const Database = deps.Database ?? (await import('better-sqlite3')).default;
  const db = new Database(dbPath, { readonly: mode === '--check', fileMustExist: true });
  // Geschlossen wird immer: ein Lauf, der abbricht, lässt die Datei nicht gesperrt liegen.
  try {
    const opts = { uploadsDir: deps.uploadsDir, haken: deps.haken, sicherungSha };
    if (mode === '--check') return trockenlauf(db, opts);
    if (mode === '--write') return schreiben(db, opts);
    return zurueck(db, a1, opts);
  } catch (e) {
    console.error(`Abbruch: ${e.message}`);
    return 1;
  } finally {
    db.close();
  }
}

/** Länge und Hash eines Textes, so wie die Meldungen sie nennen. */
const kennzeichen = (t) => `${t.length} Zeichen (sha ${sha(t)})`;

/**
 * Lesen, einordnen, prüfen, ausgeben — ohne zu schreiben. `null` heißt: beanstandet (schon ausgegeben).
 * Sonst `{ art, raw, before, next, … }`; bei `schon-da` ist nichts weiter zu tun.
 */
function vorpruefung(db, { uploadsDir, titel }) {
  const complaints = [];

  // ── lesen: nur diese eine Spalte (und das game_id des Aufbaus), als Text ──
  const row = db.prepare('select game_id, scenario_data, grid_data from setups where id = ?').get(SETUP_ID);
  if (!row) { console.error(`Aufbau ${SETUP_ID} nicht gefunden`); return null; }
  if (row.game_id !== GAME_ID) complaints.push(`Aufbau gehört zu Spiel ${row.game_id}, erwartet ${GAME_ID}`);
  const raw = row.scenario_data;
  const before = JSON.parse(raw);
  // Beweise und Vergleich sind Vergleiche von Text und brauchen das kompakte JSON.stringify-Format.
  if (text(before) !== raw) complaints.push('der gespeicherte Text ist nicht kompaktes JSON.stringify — byteweiser Vergleich nicht möglich');
  console.log(`gelesen: scenario_data ${kennzeichen(raw)}, ${Object.keys(before.bosses ?? {}).length} Einträge, Schlüssel ${Object.keys(before).join(', ')}`);

  const aus = () => {
    console.log(`${titel}: ${complaints.length} Beanstandungen`);
    for (const c of complaints) console.log('  - ' + c);
    return null;
  };

  // ── Einordnung ──
  const p = plane(before);
  console.log(`Einordnung: ${p.art === 'zu-schreiben' ? 'zu schreiben' : p.art === 'schon-da' ? 'schon geschrieben' : 'ABWEICHEND'}`);
  if (p.art === 'abweichend') complaints.push(`${p.meldung} — es wird nichts überschrieben`);
  if (p.art === 'zu-schreiben' && (raw.length !== AUSGANG.laenge || sha(raw) !== AUSGANG.sha)) {
    complaints.push(`scenario_data hat ${kennzeichen(raw)}, erwartet ${AUSGANG.laenge} Zeichen (sha ${AUSGANG.sha}) — ein anderer Stand als der Ausgangsstand von M29.6; es wird nichts überschrieben`);
  }
  if (complaints.length) return aus();
  if (p.art === 'schon-da') {
    console.log(`schon geschrieben: terrainCards ${kennzeichen(text(before.terrainCards))}, nichts zu schreiben`);
    return { art: 'schon-da', raw, before, titel };
  }
  const next = p.next;
  const neuRaw = text(next);

  // ── Plan als Diff ──
  console.log(`  + ,"terrainCards":${text(ZUORDNUNG)}   (${FRAGMENT.length} Zeichen, hinten angehängt)`);
  for (const [von, nach] of Object.entries(ZUORDNUNG)) console.log(`      ${von.padEnd(16)} → ${nach}`);

  // ── Beweise ──
  const b = beweise(before, next);
  console.log(`Präfixbeweis: ${b.some(m => /^Präfix/.test(m)) ? 'NEIN' : 'ja'} (der neue Text ist der alte ohne die letzte „}“ plus das Fragment)`);
  console.log(`Rückwärtsbeweis: ${b.some(m => /^Rückwärts/.test(m)) ? 'NEIN' : 'ja'} (das Fragment entfernt = der gelesene Text, Zeichen für Zeichen)`);
  complaints.push(...b);

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
  const pr = pruefeZiel(next, { assets, cards, grids, imageSizes });
  console.log(`validateScenarioData: ${pr.probleme.length} Probleme (${assets.length} Assets, ${cards.length} Karten, Raster „${grids[0]?.label}“)`);
  console.log(`checkScenarioAspect: ${pr.aspekt.length} Meldung${pr.aspekt.length === 1 ? '' : 'en'} (${Object.keys(imageSizes).length} Bildmaße gelesen)${pr.aspekt.length ? ':' : ''}`);
  for (const m of pr.aspekt) console.log(`    ${bekannteMeldung(m) ? 'bekannt' : 'NEU'}: ${m.message}`);
  console.log(pr.beanstandungen.length ? `${pr.laeufe.length} Läufe, ${pr.beanstandungen.length} Beanstandungen` : `${pr.laeufe.length} Läufe sauber`);
  complaints.push(...pr.beanstandungen);

  // ── Umfang (M29.1): dieselben 40 Läufe vor und nach der Tabelle ──
  const v = vergleiche(before, next, { assets, cards, grids });
  console.log('Umfang, vorher → nachher (Namen ohne Karte in der Meldung von build_scenario):');
  for (const z of v.zeilen) {
    if (z.unveraendert) continue;
    const namen = (n) => (n.length ? n.map(x => `"${x}"`).join(', ') : '—');
    console.log(`  ${z.boss.padEnd(18)} ${z.final ? 'Endkampf' : 'Kampf   '}  ${z.vorher.status} → ${z.nachher.status}; Karten ${z.vorher.karten.length} → ${z.nachher.karten.length}; ${namen(z.vorher.namen)} → ${namen(z.nachher.namen)}`);
  }
  const s = v.summe;
  console.log(`  ${v.zeilen.filter(z => z.unveraendert).length} von ${v.zeilen.length} Läufen Zeichen für Zeichen dieselben`);
  console.log(`  ok ${s.ok.vorher} → ${s.ok.nachher}, note ${s.note.vorher} → ${s.note.nachher}, Vorkämpfe mit note ${s.vorkampfNote.vorher} → ${s.vorkampfNote.nachher}, Namensnennungen ${s.namen.vorher} → ${s.namen.nachher}`);
  for (const z of v.zeilen) {
    const wo = `${z.boss} (${z.final ? 'Endkampf' : 'Kampf'})`;
    if (!z.monoton) complaints.push(`${wo}: eine Karte, die vorher lag, liegt nachher nicht mehr (oder in anderer Reihenfolge)`);
    if (z.nachher.tokens !== z.vorher.tokens) complaints.push(`${wo}: Objekte auf dem Raster ${z.vorher.tokens} → ${z.nachher.tokens}`);
    if (!z.restGleich) complaints.push(`${wo}: die übrigen Protokollzeilen haben sich geändert`);
  }

  // ── Zielstand ──
  console.log(`Zielstand: scenario_data ${kennzeichen(neuRaw)}`);
  if (complaints.length) return aus();
  console.log(`${titel}: 0 Beanstandungen`);
  return { art: 'zu-schreiben', raw, before, next, neuRaw, assets, cards, grids, titel };
}

function trockenlauf(db, opts) {
  const v = vorpruefung(db, { ...opts, titel: 'Trockenlauf' });
  if (!v) return 1;
  if (v.art === 'schon-da') return 0;
  console.log(`würde schreiben: scenario_data ${v.raw.length} → ${v.neuRaw.length} Zeichen (nichts geschrieben)`);
  return 0;
}

function schreiben(db, { sicherungSha, haken, ...opts }) {
  const v = vorpruefung(db, { ...opts, titel: 'Vorprüfung' });
  if (!v) return 1;
  if (v.art === 'schon-da') { console.log('nichts zu schreiben'); return 0; }
  const { raw, before, next, neuRaw, assets, cards, grids } = v;

  // ── Die Sicherung: ohne sie kein Schreiben ──
  if (!sicherungSha) { console.error('ohne Sicherung kein Schreiben: --sicherung-sha <Hash der gesicherten Spalte> fehlt'); return 1; }
  if (!/^[0-9a-f]{12,64}$/i.test(sicherungSha)) { console.error('--sicherung-sha braucht mindestens 12 Hex-Stellen'); return 1; }
  if (!sha256(raw).startsWith(sicherungSha.toLowerCase())) {
    console.error(`der Hash der Sicherung (${sicherungSha}) passt nicht zum gelesenen Text (sha256 beginnt mit ${sha256(raw).slice(0, 12)}) — die Sicherung ist nicht der Stand, der überschrieben würde`);
    return 1;
  }

  haken?.('nach-lesen', db);
  const t = tausche(db, { von: raw, nach: neuRaw, haken });

  // ── Kontrollausgabe: neu gelesen, nicht aus dem Plan ──
  const gelesen = db.prepare('select scenario_data from setups where id = ?').get(SETUP_ID).scenario_data;
  const after = JSON.parse(gelesen);
  console.log(`geschrieben: scenario_data ${raw.length} → ${gelesen.length} Zeichen, sha ${sha(raw)} → ${sha(gelesen)}${gelesen === neuRaw ? '' : ' — WEICHT VOM ZIELSTAND AB'}`);
  console.log(`  Einträge jetzt: ${Object.keys(after.bosses).length}`);
  for (const k of Object.keys(before.bosses)) {
    console.log(`  ${k.padEnd(18)} sha ${sha(text(before.bosses[k]))} → ${sha(text(after.bosses[k]))} ${gleich(before.bosses[k], after.bosses[k])}`);
  }
  for (const k of Object.keys(after).filter(x => x !== 'bosses')) {
    const alt = before[k] === undefined ? '(fehlt)' : sha(text(before[k]));
    console.log(`  Schlüssel ${k.padEnd(14)} sha ${alt} → ${sha(text(after[k]))} ${before[k] === undefined ? 'neu' : gleich(before[k], after[k])}`);
  }
  console.log(`  Präfixbeweis auf der gelesenen Spalte: ${beweise(before, after).some(m => /^Präfix/.test(m)) ? 'NEIN' : 'ja'}`);
  console.log(`  Rückwärtsbeweis auf der gelesenen Spalte: ${beweise(before, after).some(m => /^Rückwärts/.test(m)) ? 'NEIN' : 'ja'}`);
  console.log(`  validateScenarioData auf der gelesenen Spalte: ${validateScenarioData(after, { assets, grids, cards }).length} Probleme`);
  const erreicht = gelesen.length === ZIEL.laenge && sha(gelesen) === ZIEL.sha;
  console.log(`  Zielstand aus M29.6 (${ZIEL.laenge} Zeichen, sha ${ZIEL.sha}): ${erreicht ? 'erreicht' : 'NICHT erreicht'}`);
  fingerabdruckZeilen(db, t);
  return gelesen === neuRaw && erreicht ? 0 : 1;
}

/** Der Weg zurück: der aktuelle Text muss **genau der Zielstand** sein, dann kommt der gesicherte Text wieder. */
function zurueck(db, sicherungsdatei, { haken }) {
  // ── die Sicherung prüfen: Hash zum Text, kompakt, und der Text ist der Ausgangsstand von M29 ──
  const s = JSON.parse(fs.readFileSync(sicherungsdatei, 'utf8'));
  if (typeof s.scenario_data !== 'string' || typeof s.sha256 !== 'string') throw new Error('die Sicherung hat nicht die Form { scenario_data, sha256, updated_at }');
  if (sha256(s.scenario_data) !== s.sha256) { console.error(`Hash der Sicherung passt nicht zu ihrem Text (${sha256(s.scenario_data).slice(0, 12)} gegen ${s.sha256.slice(0, 12)}) — die Datei ist beschädigt`); return 1; }
  const alt = JSON.parse(s.scenario_data);
  if (text(alt) !== s.scenario_data) { console.error('der gesicherte Text ist nicht kompaktes JSON.stringify'); return 1; }
  const plan = plane(alt);
  if (plan.art !== 'zu-schreiben' || s.scenario_data.length !== AUSGANG.laenge || sha(s.scenario_data) !== AUSGANG.sha) {
    console.error(`die Sicherung ist nicht der Ausgangsstand von M29 (${kennzeichen(s.scenario_data)}, erwartet ${AUSGANG.laenge} Zeichen, sha ${AUSGANG.sha}${plan.meldung ? `; ${plan.meldung}` : ''}) — dorthin gibt es keinen Weg zurück`);
    return 1;
  }
  const ziel = text(plan.next);

  const row = db.prepare('select game_id, scenario_data from setups where id = ?').get(SETUP_ID);
  if (!row) { console.error(`Aufbau ${SETUP_ID} nicht gefunden`); return 1; }
  if (row.game_id !== GAME_ID) { console.error(`Aufbau gehört zu Spiel ${row.game_id}, erwartet ${GAME_ID}`); return 1; }
  const raw = row.scenario_data;
  console.log(`gelesen: scenario_data ${kennzeichen(raw)}; Sicherung ${kennzeichen(s.scenario_data)}; Zielstand von M29 ${kennzeichen(ziel)}`);
  if (raw === s.scenario_data) { console.log('schon der Ausgangsstand — nichts zu tun'); return 0; }
  if (raw !== ziel) {
    console.error('der gelesene Text ist nicht der Zielstand von M29 und nicht der Ausgangsstand — jemand hat nach M29 weitergearbeitet; es wird nichts überschrieben');
    return 1;
  }

  haken?.('nach-lesen', db);
  const t = tausche(db, { von: raw, nach: s.scenario_data, haken });

  const gelesen = db.prepare('select scenario_data from setups where id = ?').get(SETUP_ID).scenario_data;
  console.log(`zurückgeschrieben: scenario_data ${raw.length} → ${gelesen.length} Zeichen, sha ${sha(raw)} → ${sha(gelesen)}${gelesen === s.scenario_data ? ' (= die Sicherung, Zeichen für Zeichen)' : ' — WEICHT VON DER SICHERUNG AB'}`);
  fingerabdruckZeilen(db, t);
  return gelesen === s.scenario_data ? 0 : 1;
}

if (process.argv[1] && process.argv[1].endsWith('gelaendekarten-zuordnung.mjs')) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, err => { console.error(err); process.exitCode = 1; });
}
