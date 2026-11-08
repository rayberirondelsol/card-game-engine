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

import crypto from 'node:crypto';

import { validateScenarioData } from '../shared/scenarioData.js';
import { checkScenarioAspect } from '../shared/scenarioGeometry.js';
import { durchrechnen, erwartetAufRaster } from './szenariodaten-grundspiel.mjs';
import { GAME_ID, SETUP_ID, saveStateHashes, bekannteMeldung } from './szenariodaten-berichtigung.mjs';

export { GAME_ID, SETUP_ID, saveStateHashes };

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
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
