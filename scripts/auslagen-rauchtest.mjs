// CZ / Spec M27 — der Rauchtest, **nur lesend**, mit dem Executor, der im Container liegt,
// gegen die echten Produktionsdaten.
//
// Er schreibt nichts: die Datenbank wird schreibgeschützt geöffnet, alles läuft im
// Speicher. Was er prüft, ist das, was die Sichtprüfung am Tisch nicht ersetzen kann und
// auch nicht ersetzt - sie bleibt offen, wenn niemand angemeldet am Tisch gesessen hat.
//
//   1. Die vier Kombinationen (kurz/lang × mit/ohne Toller Trödel) bauen mit **leerem**
//      Protokoll, und *Kampf beginnen* → *Dorfphase beginnen* → *Laden nachfüllen*
//      laufen in jeder durch (Abnahme 7 aus M27.2).
//   2. Alle zwanzig Bösewichte, im Vor- **und** im Endkampf, mit der echten Aktion
//      *Kampf beginnen* (Abnahme 6 aus M27.5): Handsy legt die TRILLERPFEIFE, jeder
//      andere seine Karte; Tilda Fields hat keine (ihr Sheriff bekommt die oberste Karte
//      des Gartendecks, `docs/szenariodaten-erweiterung.md` §8) - dort ist `$SHERIFF is
//      not bound` **gewollt**.
//   3. Die Spielstände, die auf den Aufbau zeigen: laden heißt hier, dass ihre Stapel
//      da sind und die Aktionen auf ihnen laufen. Das Laden **im Browser** ist damit
//      nicht geprüft (`loadGameState`, `applySetupScaffold`), nur das, was der Executor
//      daran sieht.
//
//   5. (M31, FI) Die Lagen - **am Ende**, hinter 0 bis 4, damit deren Ausgabe Zeichen für Zeichen bleibt (nur hinzugefügte Zeilen) -
//      und nur, wenn die Daten `villagers.lage` tragen (Welle 2); auf dem Stand von Welle 1 stumm übersprungen. `lageOf` gegen die
//      geschriebenen Daten für jede Kombination `spieler` × `doerfler3–5`; je Lage × Zahl Aufbau → `dorfereignis` → `kampf-beginnen` →
//      `dorfphase-beginnen`; und „Gleiche Auskunft, zwei Zeitpunkte“ (M31.15): Lage, Form des Geldes am Tisch und die Schritte, die die
//      `onlyCounter`-Gates der Aktionen laufen lassen, stimmen überein.
//
//   0. (M29) Die Zuordnung Plättchen → Geländekarte: die Tabelle `terrainCards` steht in den Szenariodaten
//      (genau die drei Paare aus `gelaendekarten-zuordnung.mjs`), und `validateScenarioData` mit der Bibliothek
//      meldet nichts. Dazu die **Sperre** in `bekannt()`: fiele die Tabelle aus, bliebe der Rauchtest sonst grün.
//
// Aufruf (im Backend-Container, Dateien in `/app`, siehe `docs/datenzugriff.md`; seit M29 gehören
// `gelaendekarten-zuordnung.mjs`, `szenariodaten-berichtigung.mjs` und `szenariodaten-grundspiel.mjs` dazu — die Tabelle
// steht **einmal** im ersten):
//
//   node scripts/auslagen-rauchtest.mjs /app/data/card-game-engine.db

import { SETUP_ID, GAME_ID, COMBINATIONS, SHERIFF_CATEGORIES, bauen, ohneIds } from './auslagen-daten.mjs';
import { executeSequenceWithLog } from '../shared/sequenceExecutor.js';
import { seatVars, seatedVillagers, lageOf } from '../shared/villagers.js';
import { resolveChoices, optionalOf, lageValuesOf } from '../shared/setupOptions.js';
import { findCardByName } from '../shared/cardSearch.js';
import { validateScenarioData } from '../shared/scenarioData.js';
import { resolveZones, anchorBoxes } from '../shared/anchoring.js';
import { objectsInZone, zoneSlotNumberAt } from '../shared/zoneGeometry.js';
import { ZUORDNUNG } from './gelaendekarten-zuordnung.mjs';
import { SPALTEN, MESSUNG, zahlBei, MUENZEN_NACH_KAMPF } from './doerflerzahl-daten.mjs';

const ACTIONS = ['kampf-beginnen', 'dorfphase-beginnen', 'laden-nachfuellen'];
const LEISTE = 'Bösewicht-Leiste';
/** M31 (EY): die Dörfler 3 bis 5 gewählt, wo der Abschnitt 1 und 2 sie braucht — so, wie es vor M31 der Tisch war. */
const GRANNY = { doerfler3: 'Granny' };
/** Granny, wo der Aufbau die Wahl kennt (M30 und später); der M27-Aufbau hat keine und Granny fest. */
const grannyWenn = (env) => (env.scenarioData?.options?.doerfler3 ? GRANNY : {});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const text = (x) => JSON.stringify(x);

/** Was nicht „ok" ist - ein `note` ist ein Hinweis, aber im Protokoll, und zählt hier mit. */
const schlecht = (log) => log.filter(e => e.status !== 'ok');

/**
 * M29: welche der Plättchen, die die Tabelle `terrainCards` abdeckt, ein Hinweis **namentlich** nennt (`"<Name>"` im
 * `reason`). Der allgemeine Ausdruck in `bekannt()` lässt jedes Plättchen ohne Karte durch; für diese drei ist „ohne Karte“
 * kein bekannter Normalfall mehr, sondern ein Zeichen, dass die Zuordnung nicht greift.
 */
export const wiederOhneKarte = (e) => [...(e.reason ?? '').matchAll(/"([^"]+)"/g)].map(m => m[1]).filter(n => Object.hasOwn(ZUORDNUNG, n));

/**
 * M30.5 Nr. 7/DX: ein Schritt, der die Folge **angehalten** hat (`… further steps skipped`) und eine Wache ist: über
 * einen Zähler (`require_counter`), eine Zone (`require_zone`) oder die Marker auf den Leisten (`require_marker`). Eine
 * Wache, die der Spielstand nicht erfüllt, ist eine Auskunft über den Stand, kein Fehler des Aufbaus. Die **eine** Stelle,
 * die die Typen kennt: kommt ein vierter Wächter dazu, steht er hier.
 */
export const istWache = (e) => ['require_counter', 'require_marker', 'require_zone'].includes(e.type) && /further steps? skipped/.test(e.reason ?? '');

const zeile = (e) => {
  const ohne = wiederOhneKarte(e);
  return `${e.index} ${e.type} ${e.status}: ${e.reason}${ohne.length ? ` — Plättchen ${ohne.map(n => `"${n}"`).join(', ')} steht wieder ohne Karte da, obwohl die Zuordnung es abdeckt` : ''}`;
};

/**
 * Was im Protokoll eines **Kampfes** steht und **bekannt** ist - kein Fehler des Aufbaus,
 * und der Grund, warum ein Kampf-Protokoll nicht wörtlich leer ist:
 *
 * - `build_scenario` meldet als `note`, dass Geländeplättchen auf dem Tisch liegen, zu denen
 *   die Bibliothek keine Karte führt (34 von 62 Geländeassets, M20.2/M25.2; für die neun
 *   Grundspiel-Bösewichte `docs/szenariodaten-grundspiel.md` §9.10). Die Plättchen liegen.
 * - Barry Bluffs Werte stehen als Formel auf dem Tableau („Equal to the highest MVMT …"), und
 *   eine geratene Zahl wäre schlimmer als keine (R1): Marker und Zähler werden übersprungen.
 * - Tilda Fields' Sheriff bekommt kein benanntes Teil (`$SHERIFF is not bound`, gewollt).
 */
export function bekannt(boss, e) {
  // Die Sperre (M29): ein Hinweis, der eines der drei Plättchen der Tabelle nennt, ist keiner mehr.
  if (e.type === 'build_scenario' && e.status === 'note' && /no terrain cards? in this library \(nothing to do\)/.test(e.reason ?? '')) return wiederOhneKarte(e).length === 0;
  if (boss === 'Barry Bluff' && e.status === 'skipped' && /Equal to /.test(e.reason ?? '') && ['place_asset', 'set_counter'].includes(e.type)) return true;
  if (boss === 'Tilda Fields' && e.type === 'place_card' && e.status === 'skipped' && /\$SHERIFF is not bound/.test(e.reason ?? '')) return true;
  return false;
}

/** Die Plättchen ohne Geländekarte, die ein bekannter `note` nennt - sichtbar, nicht nur gezählt (M28.4: Virginia Fitz). */
const plaettchen = (notes) => {
  const namen = notes.flatMap(e => [...(e.reason ?? '').split('): ').slice(1).join('): ').matchAll(/"([^"]+)"/g)].map(m => m[1]));
  return namen.length ? `: ${namen.join(', ')}` : '';
};

/** Ein Lauf einer Aktion mit den Daten des Aufbaus - ohne Wahl, wie am Tisch. */
function aktion(env, id, state, seed = 7) {
  const a = env.actions.find(x => x.id === id);
  return executeSequenceWithLog(state, a.steps, env.zones, { assets: env.assets, cards: env.cards, grids: env.grids, scenarioData: env.scenarioData, rng: seededRng(seed) });
}

function seededRng(seed) {
  let a = seed;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Die Daten des Aufbaus aus der Datenbank. */
export function laden(db) {
  const row = db.prepare('select * from setups where id = ?').get(SETUP_ID);
  const assets = db.prepare('select t.id, t.name, t.type, t.width, t.height, t.image_path, t.back_image_path, (select name from categories where id = t.category_id) as category from table_assets t where t.game_id = ?').all(GAME_ID);
  const cards = db.prepare('select c.*, (select name from categories where id = c.category_id) as category from cards c where c.game_id = ?').all(GAME_ID);
  return {
    row, assets, cards,
    zones: JSON.parse(row.zone_data), grids: JSON.parse(row.grid_data), actions: JSON.parse(row.action_data),
    sequence: JSON.parse(row.sequence_data), scenarioData: JSON.parse(row.scenario_data),
  };
}

/**
 * Den Tisch für einen Kampf gegen `boss` herrichten: die Leiste wird leergeräumt, und `boss`
 * liegt dort **allein** auf dem **letzten** Platz (Endkampf) oder dem **ersten** (Vorkampf).
 * So sieht die Leiste im Spiel aus, wenn er an der Reihe ist: die früheren Gegner sind
 * aufgedeckt und weggeräumt, und `reveal_next` nimmt den ersten Platz mit einem Rückseitenbild
 * - es **ignoriert die Seite** (M25.3/CC), darum dürfen keine offenen Gegner davor liegen.
 * Beim letzten Platz wird `final: auto` wahr.
 */
function fuerKampf(env, built, boss, endkampf) {
  const steps = [
    { type: 'clear_zone', zoneLabel: LEISTE },
    { type: 'place_asset', assetName: `Bösewicht: ${boss}`, targetZoneLabel: LEISTE, slot: endkampf ? 4 : 1, faceDown: true },
  ];
  const r = executeSequenceWithLog(built, steps, env.zones, { assets: env.assets, cards: env.cards, grids: env.grids, scenarioData: env.scenarioData });
  return { state: r.state, log: schlecht(r.log) };
}

// ── M31 (Aufgabe EY): Abschnitt 4 — die Dörflerzahl ──────────────────────────────────────────────────────────
//
// Vier Fragen an den Zielstand, je mit der Erwartung der Spec: Münzen je Zahl (kurz 15 · n, lang 10 · n), die Zeilen
// der Dorfphase (18 + 5·n, ohne Ausfall), die Münzen +6·n, das Ereignis (1 + n), die Figuren (n); alle Bösewichte mit
// 2 bis 5 (BEW und LEB aus `SPALTEN`, Barry Bluff ohne Zahl); der Endkampf der acht gemessenen (`MESSUNG`); die Wache
// mit zwei Dörflern; die Doppelwahl (die **erwarteten** Zeilen sind keine Beanstandung, jede andere ist eine); die
// Leiste („Wer ist dran?") — n Steine auf den Plätzen 1 … n, nach der Dorfphase eine Stelle weiter.
// Die Erwartungen stehen **hier**, nicht in den Daten: wer die Zahlen ändert, ändert sie an dieser Stelle und im Test.

const WAHL_NACH_ZAHL = {
  2: {},
  3: { doerfler3: 'Granny' },
  4: { doerfler3: 'Granny', doerfler4: 'Blopsy' },
  5: { doerfler3: 'Granny', doerfler4: 'Blopsy', doerfler5: 'Yancy' },
};
const ZAHLEN = [2, 3, 4, 5];
const MUENZEN = { kurz: { 2: 30, 3: 45, 4: 60, 5: 75 }, lang: { 2: 20, 3: 30, 4: 40, 5: 50 } };
const DORF_ZEILEN = (n) => 18 + 5 * n;
const DORF_PLUS = (n) => 6 * n;
const EREIGNIS_ZEILEN = (n) => 1 + n;
const LEISTE_RAIL = "Buyin'/Beatin'-Leiste";
/** Die Doppelwahl: genau diese Zeilen (Index, Typ, Status) sind **erwartet** (M31.3, EX Befund 2–3).
 *  Die Indizes der `place_asset`-Zeilen der Dorfphase gelten für den **Stand von Welle 1** (43 Schritte). Seit `FG`
 *  (M31.16/M31.17) fügt `aktionen-spieler` davor zehn Schritte ein (fünf Töpfe, fünf Hand-Austeilungen); dann sind es
 *  37–40. **Fest verdrahtet passte nur einer der beiden Stände** — `dorfSoll` rechnet die Verschiebung aus der Zahl der
 *  Schritte (gemessen am 2026-11-10: nur diese Nummern verschieben sich, `clear_table` bei 12, die Kampf- und
 *  Aufbauzeilen und die Münzen 21/42 bleiben). **Der `aufbau`-Index steht hier als `null`:** `dorfSoll` setzt den Index des zweiten `seat_villager` der Folge ein (`FH`). */
const DORFPHASE_SCHRITTE_W1 = 43;
/** Die erwartete Doppelwahl-Zeile mit den Indizes, die die Daten verschieben — beide **aus dem Inhalt** abgeleitet, nicht aus einer festen Zahl:
 *  die `place_asset`-Indizes der Dorfphase, verschoben um die Schritte, die `aktionen-spieler` davor einfügt (`FG`), und der `seat_villager`-Index des **Aufbaus**
 *  (`null` in `DOPPEL_ERWARTET`): das ist der **zweite** `seat_villager` der Folge (Platz 2, der zweite Judy bleibt draußen) — 26 im Stand von Welle 1, 27 seit
 *  `aufbau-spieler` (`FH`), das einen zweiten `place_stack` hinter Schritt 1 einfügt. **Eine Längendifferenz taugt hier nicht:** die angehängten Hände und Töpfe
 *  verschieben nichts, nur der eine eingefügte Schritt. Fehlt der zweite `seat_villager`, steht `undefined` da — und die Beanstandung folgt. */
const dorfSoll = (soll, env) => {
  const schritte = env.actions.find(a => a.id === 'dorfphase-beginnen')?.steps?.length ?? DORFPHASE_SCHRITTE_W1;
  const dazu = schritte - DORFPHASE_SCHRITTE_W1;
  const sitze = env.sequence.flatMap((st, i) => (st?.type === 'seat_villager' ? [i] : []));
  return {
    ...soll,
    aufbau: soll.aufbau.map(([i, typ, status]) => [typ === 'seat_villager' ? sitze[1] : i, typ, status]),
    dorf: soll.dorf.map(([i, typ, status]) => [typ === 'place_asset' ? i + dazu : i, typ, status]),
  };
};
const DOPPEL_ERWARTET = {
  keiner: {
    aufbau: [[null, 'seat_villager', 'skipped']],
    kampf: [[5, 'build_scenario', 'failed'], [6, 'place_asset', 'skipped'], [7, 'place_asset', 'skipped'], [8, 'place_asset', 'skipped'], [9, 'place_asset', 'skipped'], [10, 'place_asset', 'skipped']],
    dorf: [[12, 'clear_table', 'skipped'], [27, 'place_asset', 'skipped'], [28, 'place_asset', 'skipped'], [29, 'place_asset', 'skipped'], [30, 'place_asset', 'skipped']],
    muenzen: 21,
  },
  granny: {
    aufbau: [[null, 'seat_villager', 'skipped']],
    kampf: [[10, 'place_asset', 'skipped']],
    dorf: [[12, 'clear_table', 'skipped'], [27, 'place_asset', 'skipped'], [28, 'place_asset', 'skipped'], [29, 'place_asset', 'skipped'], [30, 'place_asset', 'skipped']],
    muenzen: 42,
  },
};

const nichtOk = (log) => log.filter(e => e.status !== 'ok').map(e => [e.index, e.type, e.status]);
const muenzenVon = (st) => st.counters.find(c => c.name === 'Münzen (gemeinsam)')?.value;
const sitzende = (env, st) => seatedVillagers(st, env.assets, env.scenarioData.villagers);
const bauenVon = (env, choices, seed = 3) => bauen({ state: env.row.state_data, sequence: env.sequence, zones: env.zones, grids: env.grids, assets: env.assets, cards: env.cards, scenarioData: env.scenarioData }, choices, seed);
/** Die Plätze der Steine auf der Leiste: Vorname → Platz. Die Steine tragen den Vornamen, die Sitze den vollen Namen. */
function platzVon(env, st) {
  const zone = resolveZones(env.zones, anchorBoxes(st.boards, st.tokens)).find(z => z.label === LEISTE_RAIL);
  if (!zone) return null;
  const vornamen = new Map(sitzende(env, st).map(s => [s.name.split(' ')[0], s.name]));
  const steine = objectsInZone(zone, st.cards, st.tokens).filter(o => vornamen.has(o.label));
  return new Map(steine.map(o => [o.label, zoneSlotNumberAt(zone, o.x, o.y)]));
}
/** Ein Zahlenwert auf dem Tisch (BEW/LEB des Bösewichts): der Platz des Markers auf seiner Leiste, oder `null`. */
function wertAm(env, st, label, zoneLabel) {
  const t = st.tokens.find(x => x.label === label);
  if (!t) return null;
  const z = resolveZones(env.zones, anchorBoxes(st.boards, st.tokens)).find(x => x.label === zoneLabel);
  return z ? zoneSlotNumberAt(z, t.x, t.y) : null;
}
/** Ein Tisch mit `choices`: Aufbau, Kampf, Dorfphase, Ereignis – mit allem, was die Zahlen brauchen. */
function zeitlinie(env, choices) {
  const r = bauenVon(env, choices, 3);
  const k = aktion(env, 'kampf-beginnen', r.state);
  const d = aktion(env, 'dorfphase-beginnen', k.state);
  const e = aktion(env, 'dorfereignis', d.state);
  const figuren = k.state.tokens.filter(t => t.gridId && sitzende(env, k.state).some(s => s.name === t.label)).length;
  return {
    aufbauNichtOk: nichtOk(r.log), muenzen0: muenzenVon(r.state),
    kampfNichtOk: nichtOk(k.log), figuren,
    dorfZeilen: d.log.length, dorfNichtOk: nichtOk(d.log), dorfPlus: muenzenVon(d.state) - muenzenVon(k.state), muenzenNach: muenzenVon(d.state),
    ereignisZeilen: e.log.length, ereignisNichtOk: nichtOk(e.log),
    leisteVor: platzVon(env, k.state), leisteNach: platzVon(env, d.state),
  };
}
/** Die Wache mit zwei Dörflern: den Lebensmarker der genannten Plätze nehmen, dann die Dorfphase. */
function wacheLauf(env, weg) {
  const k = aktion(env, 'kampf-beginnen', bauenVon(env, { partie: 'kurz', troedel: 'mit' }, 3).state).state;
  const st = structuredClone(k);
  st.tokens = st.tokens.filter(t => !weg.includes(t.label));
  const w = aktion(env, 'dorfphase-beginnen', st).log.find(e => e.type === 'require_marker');
  return { gehalten: Boolean(w) && w.status !== 'ok', rueckfrage: Boolean(w?.confirm), ohneDrei: Boolean(w) && !/drei/.test(w.message ?? w.reason ?? '') };
}

/**
 * Abschnitt 4 des Rauchtests (M31, EY). Liefert die Zeilen (`out`), die Beanstandungen (`problems`) und die
 * gemessenen Werte selbst (`zahlen`, `bosse`, `endkampf`, `wache`, `doppel`, `leiste`), damit der Test sie noch einmal
 * gegen eigene Zahlen prüft.
 */
export function dorflerFaelle(env) {
  const out = ['\n4. Dörflerzahl (M31): Vorgabe, zwei bis fünf Dörfler, alle Bösewichte, Endkampf, Doppelwahl, Wache, Leiste'];
  const problems = [];
  const bad = (s) => { problems.push(s); out.push(`  !! ${s}`); };
  // Der Schalter (EX) ist `villagers.baseCount`; davor gibt es nur drei Dörfler, und dieser Abschnitt gilt nicht.
  // Ist er da, muss alles da sein – ein halber Schalter ist eine Beanstandung, kein Stillschweigen.
  if (env.scenarioData?.villagers?.baseCount === undefined) {
    out.push('  nicht anwendbar: der Schalter (villagers.baseCount, M31 EX) fehlt – die Daten kennen nur drei Dörfler');
    return { out, problems, zahlen: null, bosse: null, endkampf: null, wache: null, doppel: null, leiste: null };
  }
  const opts = env.scenarioData?.options ?? {};
  const fehlt = ['doerfler3', 'doerfler4', 'doerfler5'].filter(k => !opts[k]);
  if (fehlt.length) {
    bad(`Schalter halb da: options fehlen (${fehlt.join(', ')})`);
    return { out, problems, zahlen: null, bosse: null, endkampf: null, wache: null, doppel: null, leiste: null };
  }

  // a–c, f, i: je Zahl ein Tisch mit der Wahl, dazu die Münzen des langen Aufbaus.
  const zahlen = { n: {}, vorgabe: null };
  const vorgabe = zeitlinie(env, { partie: 'kurz', troedel: 'mit' });
  zahlen.vorgabe = { muenzen0: vorgabe.muenzen0, dorfZeilen: vorgabe.dorfZeilen };
  if (vorgabe.muenzen0 !== MUENZEN.kurz[2]) bad(`Vorgabe: Münzen ${vorgabe.muenzen0}, erwartet ${MUENZEN.kurz[2]} (zwei Dörfler)`);
  if (vorgabe.dorfZeilen !== DORF_ZEILEN(2)) bad(`Vorgabe: Dorfphase ${vorgabe.dorfZeilen} Zeilen, erwartet ${DORF_ZEILEN(2)}`);
  for (const n of ZAHLEN) {
    const z = zeitlinie(env, { partie: 'kurz', troedel: 'mit', ...WAHL_NACH_ZAHL[n] });
    const lang = muenzenVon(bauenVon(env, { partie: 'lang', troedel: 'ohne', ...WAHL_NACH_ZAHL[n] }, 3).state);
    zahlen.n[n] = { kurz: { muenzen0: z.muenzen0, dorfZeilen: z.dorfZeilen, dorfNichtOk: z.dorfNichtOk.length, dorfPlus: z.dorfPlus, ereignisZeilen: z.ereignisZeilen }, lang: { muenzen0: lang }, figuren: z.figuren };
    const leisteVor = z.leisteVor ? [...z.leisteVor.values()].sort((a, b) => a - b) : [];
    const leisteNach = z.leisteNach ? [...z.leisteNach.values()].sort((a, b) => a - b) : [];
    zahlen.n[n].leiste = { vor: z.leisteVor, nach: z.leisteNach };
    const alle = Array.from({ length: n }, (_, i) => i + 1);
    if (z.aufbauNichtOk.length) bad(`${n} Dörfler, Aufbau: Zeilen ohne ok ${JSON.stringify(z.aufbauNichtOk)}`);
    if (z.muenzen0 !== MUENZEN.kurz[n]) bad(`${n} Dörfler: Münzen im Aufbau ${z.muenzen0}, erwartet ${MUENZEN.kurz[n]}`);
    if (lang !== MUENZEN.lang[n]) bad(`${n} Dörfler (lang): Münzen im Aufbau ${lang}, erwartet ${MUENZEN.lang[n]}`);
    if (z.kampfNichtOk.length) bad(`${n} Dörfler, Kampf beginnen: Zeilen ohne ok ${JSON.stringify(z.kampfNichtOk)}`);
    if (z.figuren !== n) bad(`${n} Dörfler: ${z.figuren} Figuren auf dem Feld, erwartet ${n}`);
    if (z.dorfZeilen !== DORF_ZEILEN(n)) bad(`${n} Dörfler: Dorfphase ${z.dorfZeilen} Zeilen, erwartet ${DORF_ZEILEN(n)}`);
    if (z.dorfNichtOk.length) bad(`${n} Dörfler, Dorfphase: Zeilen ohne ok ${JSON.stringify(z.dorfNichtOk)}`);
    if (z.dorfPlus !== DORF_PLUS(n)) bad(`${n} Dörfler: Münzen +${z.dorfPlus} in der Dorfphase, erwartet +${DORF_PLUS(n)}`);
    if (z.ereignisZeilen !== EREIGNIS_ZEILEN(n)) bad(`${n} Dörfler: Ereignis ${z.ereignisZeilen} Zeilen, erwartet ${EREIGNIS_ZEILEN(n)}`);
    if (z.ereignisNichtOk.length) bad(`${n} Dörfler, Ereignis: Zeilen ohne ok ${JSON.stringify(z.ereignisNichtOk)}`);
    // i: die Steine auf den Plätzen 1 … n, nach der Dorfphase eine Stelle weiter (zyklisch).
    if (!z.leisteVor || !z.leisteNach) bad(`${n} Dörfler: die Leiste „${LEISTE_RAIL}“ ist nicht zu lesen`);
    else {
      if (JSON.stringify(leisteVor) !== JSON.stringify(alle)) bad(`${n} Dörfler: Steine vor der Dorfphase auf ${leisteVor}, erwartet ${alle}`);
      if (JSON.stringify(leisteNach) !== JSON.stringify(alle)) bad(`${n} Dörfler: Steine nach der Dorfphase auf ${leisteNach}, erwartet ${alle}`);
      for (const [name, p] of z.leisteVor) {
        if (z.leisteNach.get(name) !== ((p - 2 + n) % n) + 1) bad(`${n} Dörfler: ${name} nicht eine Stelle weiter (${p} → ${z.leisteNach.get(name)})`);
      }
    }
    out.push(`  ${n} Dörfler: Münzen ${z.muenzen0} (kurz) / ${lang} (lang); Dorfphase ${z.dorfZeilen} Zeilen, +${z.dorfPlus} → ${z.muenzenNach}; Ereignis ${z.ereignisZeilen} Zeilen; Figuren ${z.figuren}; Leiste ${leisteVor.join(',')} → ${leisteNach.join(',')}`);
  }
  out.push(`  Vorgabe (keine Wahl): ${vorgabe.muenzen0} Münzen, Dorfphase ${vorgabe.dorfZeilen} Zeilen`);

  // d, e: alle Bösewichte mit 2 bis 5 (BEW/LEB), dazu der Endkampf der acht gemessenen.
  const bosse = {}, endkampf = {};
  let bossePruef = 0;
  for (const n of ZAHLEN) {
    const built = bauenVon(env, { partie: 'lang', troedel: 'ohne', ...WAHL_NACH_ZAHL[n] }, 5).state;
    for (const boss of Object.keys(env.scenarioData.bosses)) {
      bosse[boss] ??= {};
      endkampf[boss] ??= {};
      const t = fuerKampf(env, built, boss, false);
      const a = aktion(env, 'kampf-beginnen', t.state);
      for (const e of schlecht(a.log)) if (!bekannt(boss, e)) bad(`${boss}, ${n} Dörfler: ${zeile(e)}`);
      const bew = wertAm(env, a.state, 'Marker: Bösewicht BEW', 'Bösewicht: Bewegung');
      const leb = wertAm(env, a.state, 'Marker: Bösewicht LEB', 'Bösewicht: Leben');
      if (boss === 'Barry Bluff') {
        bosse[boss][n] = null;
        if (bew !== null || leb !== null) bad(`${boss}, ${n} Dörfler: ein Marker liegt, obwohl der Wert eine Formel ist (BEW ${bew}, LEB ${leb})`);
      } else if (!SPALTEN[boss]) {
        bosse[boss][n] = { BEW: bew, LEB: leb };
        bad(`${boss}: keine Messung in SPALTEN (scripts/doerflerzahl-daten.mjs)`);
      } else {
        bosse[boss][n] = { BEW: bew, LEB: leb };
        bossePruef++;
        if (bew !== SPALTEN[boss].BEW[n - 2] || leb !== SPALTEN[boss].LEB[n - 2]) {
          bad(`${boss}, ${n} Dörfler: BEW ${bew} / LEB ${leb}, erwartet ${SPALTEN[boss].BEW[n - 2]} / ${SPALTEN[boss].LEB[n - 2]} (§5.5)`);
        }
      }
    }
  }
  // e: die acht gemessenen – neue Plättchen mit dem Endkampf gegenüber ohne ihn.
  let endPruef = 0;
  for (const n of ZAHLEN) {
    const built = bauenVon(env, { partie: 'lang', troedel: 'ohne', ...WAHL_NACH_ZAHL[n] }, 5).state;
    const vorher = new Set(built.tokens.map(t => t.id));
    const neue = (boss, end) => aktion(env, 'kampf-beginnen', fuerKampf(env, built, boss, end).state).state.tokens.filter(t => t.gridId && !vorher.has(t.id)).length;
    for (const name of Object.keys(MESSUNG)) {
      const plaettchen = neue(name, true) - neue(name, false);
      endkampf[name][n] = plaettchen;
      endPruef++;
      if (plaettchen !== zahlBei(name, n)) bad(`${name}, Endkampf bei ${n} Dörflern: ${plaettchen} Plättchen, erwartet ${zahlBei(name, n)} (MESSUNG)`);
    }
  }
  out.push(`  Bösewichte mit 2 / 3 / 4 / 5 Dörflern: ${bossePruef} Zahlenwerte gleich §5.5 (BEW und LEB); Barry Bluff: Formel, kein Marker`);
  out.push(`  Endkampf der acht gemessenen: ${endPruef} Zahlen geprüft (Deputy, Pepin, Samuel 2 / 3 / 4 / 5; Virginia, Handsy 5; Bundits, Tilda, Umbrello 1)`);

  // g: die Wache mit zwei Dörflern.
  const wache = { zweiWeg: wacheLauf(env, ['Marker 1: Leben', 'Marker 2: Leben']), einerWeg: wacheLauf(env, ['Marker 1: Leben']) };
  if (!(wache.zweiWeg.gehalten && wache.zweiWeg.rueckfrage && wache.zweiWeg.ohneDrei)) bad(`Wache, zwei Dörfler ohne Lebensmarker: ${JSON.stringify(wache.zweiWeg)} (erwartet: gehalten, Rückfrage, ohne „drei“)`);
  if (wache.einerWeg.gehalten) bad('Wache, zwei Dörfler mit einem Lebensmarker: sie hält, obwohl ein Marker liegt');
  out.push(`  Wache, zwei Dörfler: beide Lebensmarker weg → gehalten ${wache.zweiWeg.gehalten ? 'ja' : 'nein'}, Rückfrage ${wache.zweiWeg.rueckfrage ? 'ja' : 'nein'}, ohne „drei“ ${wache.zweiWeg.ohneDrei ? 'ja' : 'nein'}; einer liegt noch → gehalten ${wache.einerWeg.gehalten ? 'ja' : 'nein'}`);

  // h: die Doppelwahl – genau die erwarteten Zeilen.
  const doppel = {};
  for (const [name, wahl] of [['keiner', { doerfler3: 'keiner' }], ['granny', { doerfler3: 'Granny' }]]) {
    const r = bauenVon(env, { partie: 'kurz', troedel: 'mit', doerfler1: 'Judy', doerfler2: 'Judy', ...wahl }, 3);
    const k = aktion(env, 'kampf-beginnen', r.state);
    const d = aktion(env, 'dorfphase-beginnen', k.state);
    doppel[name] = { aufbau: nichtOk(r.log), kampf: nichtOk(k.log), dorf: nichtOk(d.log), muenzen: muenzenVon(d.state) };
    const soll = dorfSoll(DOPPEL_ERWARTET[name], env);
    const gleich = JSON.stringify(doppel[name]) === JSON.stringify(soll);
    if (!gleich) bad(`Doppelwahl Judy/Judy/${name}: andere Zeilen als erwartet – ${JSON.stringify(doppel[name])}`);
    out.push(`  Doppelwahl Judy/Judy/${name}: Aufbau ${doppel[name].aufbau.length}, Kampf ${doppel[name].kampf.length}, Dorfphase ${doppel[name].dorf.length} Zeilen ohne ok, Münzen ${doppel[name].muenzen}${gleich ? ' – erwartet, keine Beanstandung' : ''}`);
  }

  return { out, problems, zahlen, bosse, endkampf, wache, doppel, leiste: Object.fromEntries(ZAHLEN.map(n => [n, zahlen.n[n].leiste])) };
}

// ── M31.15/M31.21 (Aufgabe FI): Abschnitt 5 — die Lagen ──────────────────────────────────────────────────────
//
// Die Lage (solo / mehrfach / normal) wird zu **zwei Zeitpunkten** ausgesprochen (M31.15): der Aufbau schreibt den Tisch aus der **Wahl** (`onlyLage`),
// die Aktionen lesen den Tisch (`onlyCounter`, die Form des Geldes). Dieser Abschnitt lässt jede Kombination durch beide laufen und prüft, dass sie dasselbe
// sagen - **er fängt, wenn jemand eines der beiden Gates ändert, ohne das andere zu ändern.**
//
// **Was aus den Daten abgeleitet wird, nicht im Skript steht:** die Wahlen der Spielerzahl (`options.<lage.players>.choices`, in der Reihenfolge der Daten: die i-te Wahl
// heißt i Spieler), die Plätze (`lage.seats`, die `optional`en sind die wählbaren), die Töpfe und Zonen **je Lage** (aus den Zielen der Aufbau-Schritte mit `onlyLage`),
// die Zahlen der Austeilungen (`count`), die Kategorien der Stapel (aus der Folge) und deren Größe (aus der Bibliothek). **Was als Literal steht:** der
// Ereignis-Stapel 80 / 105 (die Messung aus M31.17, `FH` Teil 1: 75 + 5, im Normalmodus + 25 geheime - dieselbe Quelle wie `MESSUNG`/`zahlBei` für die Dörflerzahl,
// nämlich die Bibliothek *gezählt*) und die Münzen je Zahl (`MUENZEN`, oben; M31.4, 15 / 10 je Dörfler).
const EREIGNIS_STAPEL = { solo: 80, mehrfach: 80, normal: 105 };

const zahlAm = (s) => { const m = /(\d+)\s*$/.exec(s ?? ''); return m ? Number(m[1]) : null; };
/** Ein Gate `onlySeated` gegen die Zahl der Dörfler (Plätze 1 … D besetzt); ohne Gate läuft der Schritt. */
const platzOk = (gate, D) => gate === undefined || [].concat(gate).some(n => n <= D);
/** Das Ziel eines Zähler- oder Austeil-Schritts: der Zähler (`place_counter`, `set_counter`) oder die Zone (`deal_to_zone`). */
const zielVon = (s) => (s?.type === 'place_counter' || s?.type === 'set_counter' ? s.name : s?.type === 'deal_to_zone' ? s.targetZoneLabel : null);

/**
 * Was der **Aufbau** zu welcher Lage rechnet: die Ziele (Zähler, Zonen) seiner Schritte mit `onlyLage` - nur `solo` oder keines von `solo`. Die Aktionen werden daran
 * gemessen (nach **Inhalt**, nicht nach ihrem Gate): ein Schritt, der in den gemeinsamen Topf oder die Auslage schreibt, gehört zu `solo`; einer, der in einen Topf
 * je Dörfler oder eine Hand schreibt, zu `mehrfach`/`normal`. `platz` merkt, an welchem Platz der Aufbau das Ziel anlegt (`onlySeated`): **ein Topf der Dorfphase
 * trägt kein eigenes Platz-Gate** - sein `onlyCounter` ist die Auskunft „diese Lage und dieser Platz sitzt“ (M31.16), und die Plätze kennt der Aufbau.
 */
function lagenZuordnung(sequence) {
  const z = { soloTopf: new Set(), mehrTopf: new Set(), soloZone: new Map(), mehrZone: new Map(), platz: new Map() };
  for (const s of sequence) {
    const ziel = zielVon(s);
    const w = s?.onlyLage === undefined ? null : lageValuesOf(s.onlyLage);
    if (!ziel || !w || s.type === 'set_counter') continue;
    const solo = w.length === 1 && w[0] === 'solo';
    if (!solo && w.includes('solo')) continue;
    if (s.onlySeated !== undefined) z.platz.set(ziel, s.onlySeated);
    if (s.type === 'place_counter') (solo ? z.soloTopf : z.mehrTopf).add(ziel);
    else (solo ? z.soloZone : z.mehrZone).set(ziel, s.count);
  }
  return z;
}

/**
 * Abschnitt 5 des Rauchtests (M31, FI). Liefert die Zeilen (`out`), die Beanstandungen (`problems`) und die gemessenen Werte (`lage`, `faelle`), damit der Test sie
 * gegen eigene Zahlen prüft. **Ohne `villagers.lage`** (Stand von Welle 1) ist `lageOf(…, {})` `null`: stumm, keine Zeile, keine Beanstandung.
 */
export function lagenFaelle(env) {
  const out = [];
  const problems = [];
  if (lageOf(env.scenarioData, {}) === null) return { out, problems, lage: null, faelle: null };
  out.push('\n5. Die Lagen (M31.15): lageOf gegen die Daten; je Lage × Zahl Aufbau → Ereignis → Kampf → Dorfphase; gleiche Auskunft zu beiden Zeitpunkten');
  const bad = (s) => { problems.push(s); out.push(`  !! ${s}`); };

  const optionen = env.scenarioData.options ?? {};
  const lage = env.scenarioData.villagers?.lage;
  const spieler = lage && typeof lage === 'object' ? lage.players : undefined;
  const wahlen = Object.keys(optionen[spieler]?.choices ?? {});
  const sitze = (Array.isArray(lage?.seats) ? lage.seats : []).map(name => ({ name, opt: optionalOf(optionen[name], undefined) }));
  const variabel = sitze.filter(s => s.opt);
  const fest = sitze.length - variabel.length;
  const leer = { out, problems, lage: null, faelle: null };
  if (!wahlen.length || !sitze.length) { bad(`villagers.lage nennt keine Wahlen der Spielerzahl oder keine Plätze (${text(lage)})`); return leer; }
  /** Die Wahl der Plätze: die ersten `D − fest` wählbaren an (mit ihrer `on`-Wahl), die übrigen aus. */
  const sitzWahl = (D) => Object.fromEntries(variabel.map((v, i) => [v.name, i < D - fest ? v.opt.on : v.opt.off]));
  const sollLage = (S, D) => (S > D ? null : S === 1 ? 'solo' : S === D ? 'normal' : 'mehrfach');
  const alleD = Array.from({ length: variabel.length + 1 }, (_, i) => fest + i);

  // ── A. lageOf gegen die Daten: jede Kombination Spielerzahl × Platzbelegung (die Wahlen aus den Daten) ──
  const nach = { solo: 0, mehrfach: 0, normal: 0, zuViele: 0 };
  const kaputt = new Set();
  let kombinationen = 0;
  wahlen.forEach((key, si) => {
    const S = si + 1;
    for (let m = 0; m < 2 ** variabel.length && !kaputt.has(key); m++) {
      const an = variabel.filter((_, i) => m & (1 << i));
      const choices = { [spieler]: key, ...Object.fromEntries(variabel.map(v => [v.name, an.includes(v) ? v.opt.on : v.opt.off])) };
      const D = fest + an.length;
      const wo = `Wahl „${key}“ (${S} Spieler), Plätze ${an.map(v => v.name).join(', ') || 'nur die festen'}`;
      kombinationen++;
      const r = resolveChoices(optionen, choices);
      if (r.problems.length) { bad(`lageOf: ${wo}: die Wahl gilt nicht (${r.problems.join('; ')})`); kaputt.add(key); continue; }
      const l = lageOf(env.scenarioData, r.choices);
      const soll = sollLage(S, D);
      nach[soll === null ? 'zuViele' : soll]++;
      if (l === null) bad(`lageOf: ${wo}: liefert null, obwohl die Daten villagers.lage tragen`);
      else if (l.players !== S || l.villagers !== D) { bad(`lageOf: ${wo}: ${l.players} Spieler und ${l.villagers} Dörfler, erwartet ${S} und ${D}${l.problems.length ? ` (${l.problems.join('; ')})` : ''}`); kaputt.add(key); }
      else if (soll === null ? (l.kind !== null || l.problems.length !== 1) : (l.kind !== soll || l.problems.length)) bad(`lageOf: ${wo}: Lage ${l.kind}, erwartet ${soll ?? 'ein Problem (mehr Spieler als Dörfler)'}${l.problems.length ? ` (${l.problems.join('; ')})` : ''}`);
      if (soll === null && l?.kind === null && l.problems.length !== 1) kaputt.add(key);
    }
  });
  out.push(`  lageOf: ${kombinationen} Kombinationen (${wahlen.length} Wahlen × ${2 ** variabel.length} Platzbelegungen): solo ${nach.solo}, mehrfach ${nach.mehrfach}, normal ${nach.normal}, mehr Spieler als Dörfler ${nach.zuViele}`);
  const lageErgebnis = { kombinationen, nach };

  // Mehr Spieler als Dörfler: der Aufbau baut **nichts** (FC) - eine Zeile `failed`, der Tisch bleibt.
  let zuViele = 0;
  wahlen.forEach((key, si) => {
    if (kaputt.has(key)) return;
    for (const D of alleD.filter(d => d < si + 1)) {
      const r = bauenVon(env, { partie: 'kurz', troedel: 'mit', [spieler]: key, ...sitzWahl(D) }, 3);
      zuViele++;
      if (r.log.length !== 1 || r.log[0].status !== 'failed' || !/nothing was built/.test(r.log[0].reason ?? '') || !same(r.state, JSON.parse(env.row.state_data))) {
        bad(`${si + 1} Spieler bei ${D} Dörflern: der Aufbau baut nicht nichts (${r.log.length} Zeilen, erste ${r.log[0] ? `${r.log[0].status}: ${r.log[0].reason}` : '-'})`);
      }
    }
  });
  out.push(`  mehr Spieler als Dörfler: ${zuViele} Kombinationen, der Aufbau baut nichts (eine Zeile failed, der Tisch bleibt)`);

  // ── B, C. Die Fälle ──
  const zu = lagenZuordnung(env.sequence);
  const auslageLabel = [...zu.soloZone.keys()][0];
  const handLabel = (i) => [...zu.mehrZone.keys()].find(l => zahlAm(l) === i);
  const heldenLabel = env.sequence.find(s => s?.type === 'deal_to_zone' && zu.soloZone.has(s.targetZoneLabel))?.stackLabel;
  const heldenKat = [].concat(env.sequence.find(s => s?.type === 'place_stack' && s.label === heldenLabel && s.onlyLage === undefined)?.category ?? []);
  const stapelSchritte = env.sequence.filter(s => s?.type === 'place_stack' && s.onlyLage !== undefined && lageValuesOf(s.onlyLage));
  const ereignisLabel = stapelSchritte[0]?.label;
  const ereignisKats = [...new Set(stapelSchritte.flatMap(s => [].concat(s.category ?? [])))];
  const katsFuer = (kind) => stapelSchritte.filter(s => lageValuesOf(s.onlyLage).includes(kind));
  const geheimKats = (() => {
    const n = katsFuer('normal')[0], s = katsFuer('solo')[0];
    return n && s ? [].concat(n.category ?? []).filter(k => ![].concat(s.category ?? []).includes(k)) : [];
  })();
  const bib = (kats) => env.cards.filter(c => kats.includes(c.category)).length;
  if (!auslageLabel || !heldenLabel || !heldenKat.length || !ereignisLabel || !stapelSchritte.length || ![1, 2, 3, 4, 5].some(handLabel) || !zu.soloTopf.size || !zu.mehrTopf.size) {
    bad(`die Folge ordnet die Ziele der Lagen nicht eindeutig zu (onlyLage nur solo / nur mehrfach und normal): gemeinsamer Topf ${[...zu.soloTopf]}, Töpfe je Dörfler ${[...zu.mehrTopf]}, Auslage ${auslageLabel}, Hände ${[...zu.mehrZone.keys()]}, Heldentaten ${heldenLabel} (${heldenKat}), Ereignis-Stapel ${ereignisLabel}`);
    return { out, problems, lage: lageErgebnis, faelle: null };
  }

  const zoneVon = (st, label) => resolveZones(env.zones, anchorBoxes(st.boards, st.tokens)).find(z => z.label === label);
  /** Karten in einer Zone (die Zone nicht da: 0); `f` wählt aus. */
  const imBereich = (st, label, f = () => true) => { const z = label ? zoneVon(st, label) : null; return z ? objectsInZone(z, st.cards).filter(f).length : 0; };
  const istHeld = (c) => heldenKat.includes(c.category);
  const istEreignis = (c) => ereignisKats.includes(c.category);
  const stapelVon = (st, label) => st.stacks.find(x => x.label === label)?.cards ?? [];
  const topfText = (kind, zaehler) => (kind === 'solo' ? `Topf ${zaehler.map(c => c[1]).join('/')} (gemeinsam)` : `Töpfe ${zaehler.map(c => c[1]).join('/')}`);
  const klassen = (steps, einteilung) => steps.flatMap((s, i) => { const k = einteilung(s); return k ? [[i, k]] : []; });
  const schritteNachInhalt = (s) => {
    const z = zielVon(s);
    if (!z || s.type === 'place_counter') return null;
    return zu.soloTopf.has(z) || zu.soloZone.has(z) ? 'solo' : zu.mehrTopf.has(z) || zu.mehrZone.has(z) ? 'mehr' : null;
  };
  // Das Ereignis teilt in dieselben Hände aus; offen (solo) oder verdeckt (mehrfach/normal) trennt die Schritte (M31.17).
  const ereignisNachInhalt = (s) => (s?.type === 'deal_to_zone' && typeof s.faceDown === 'boolean' ? (s.faceDown ? 'mehr' : 'solo') : null);
  /** Welche Schritte laufen sollten (nach Inhalt, `D` Dörfler, Lage `kind`) und welche laufen: gleich oder je Abweichung eine Beanstandung. */
  const gelaufenPruefen = (tag, steps, log, einteilung, kind, D) => {
    const lief = new Set(log.map(e => e.index));
    const eingeteilt = klassen(steps, einteilung);
    const soll = eingeteilt.filter(([i, k]) => (k === 'solo') === (kind === 'solo') && platzOk(steps[i].onlySeated ?? zu.platz.get(zielVon(steps[i])), D)).map(([i]) => i);
    const ist = eingeteilt.filter(([i]) => lief.has(i)).map(([i]) => i);
    for (const [i] of eingeteilt) {
      const sollte = soll.includes(i);
      if (sollte !== lief.has(i)) bad(`${tag}: Schritt ${i} (${steps[i].type} ${zielVon(steps[i])}) ${lief.has(i) ? 'läuft' : 'läuft nicht'}, obwohl die Lage ${kind} ${sollte ? 'ihn verlangt' : 'ihn nicht verlangt'} - Aufbau und Aktion sagen nicht dasselbe`);
    }
    return ist;
  };

  const faelle = [];
  wahlen.forEach((key, si) => {
    const S = si + 1;
    if (kaputt.has(key)) return;
    for (const D of alleD.filter(d => d >= S)) {
      const soll = sollLage(S, D);
      const tag = `${soll} (${S} Spieler, ${D} Dörfler)`;
      const wahl = { partie: 'kurz', troedel: 'mit', [spieler]: key, ...sitzWahl(D) };
      const sagt = lageOf(env.scenarioData, resolveChoices(optionen, wahl).choices)?.kind ?? null;
      if (sagt !== soll) { bad(`${tag}: lageOf sagt ${sagt}`); continue; }
      const kind = sagt;
      const f = { kind, spieler: S, doerfler: D, lageSagt: sagt };

      // Aufbau: die Form des Geldes, die Zonen, die Stapel.
      const r = bauenVon(env, wahl, 3);
      for (const e of schlecht(r.log)) bad(`${tag}, Aufbau: ${zeile(e)}`);
      const st0 = r.state;
      const start = MUENZEN.kurz[D];
      const zaehlerSoll = kind === 'solo'
        ? [...zu.soloTopf].map(n => [n, start])
        : [...zu.mehrTopf].filter(n => (zahlAm(n) ?? 99) <= D).map(n => [n, start / D]);
      const zaehler = (st) => st.counters.map(c => [c.name, c.value]);
      f.aufbau = { zaehler: zaehler(st0) };
      if (!same(f.aufbau.zaehler, zaehlerSoll)) bad(`${tag}, Aufbau: Zähler ${text(f.aufbau.zaehler)}, erwartet ${text(zaehlerSoll)} (solo ⇔ gemeinsamer Topf, sonst ein Topf je Dörfler)`);
      const haendeSoll = [1, 2, 3, 4, 5].map(i => (kind !== 'solo' && i <= D && handLabel(i) ? zu.mehrZone.get(handLabel(i)) : 0));
      const auslageSoll = kind === 'solo' ? zu.soloZone.get(auslageLabel) : 0;
      f.aufbau.auslage = imBereich(st0, auslageLabel);
      f.aufbau.haende = [1, 2, 3, 4, 5].map(i => imBereich(st0, handLabel(i)));
      if (f.aufbau.auslage !== auslageSoll) bad(`${tag}, Aufbau: ${f.aufbau.auslage} Karten in der Auslage, erwartet ${auslageSoll}`);
      if (!same(f.aufbau.haende, haendeSoll)) bad(`${tag}, Aufbau: Hände ${f.aufbau.haende}, erwartet ${haendeSoll}`);
      const ereignis0 = stapelVon(st0, ereignisLabel);
      f.aufbau.ereignisStapel = ereignis0.length;
      f.aufbau.heldenStapel = stapelVon(st0, heldenLabel).length;
      f.aufbau.geheimImStapel = ereignis0.filter(c => geheimKats.includes(c.category)).length;
      const gilt = katsFuer(kind);
      if (gilt.length !== 1) bad(`${tag}, Aufbau: ${gilt.length} Stapel-Schritte „${ereignisLabel}“ gelten in dieser Lage, erwartet genau einer`);
      const ausDaten = gilt.length === 1 ? bib([].concat(gilt[0].category ?? [])) : null;
      if (ausDaten !== null && f.aufbau.ereignisStapel !== ausDaten) bad(`${tag}, Aufbau: Ereignis-Stapel ${f.aufbau.ereignisStapel}, aus den Karten der Kategorien gerechnet ${ausDaten}`);
      if (f.aufbau.ereignisStapel !== EREIGNIS_STAPEL[kind]) bad(`${tag}, Aufbau: Ereignis-Stapel ${f.aufbau.ereignisStapel}, erwartet ${EREIGNIS_STAPEL[kind]} (M31.17)`);
      const geheimSoll = kind === 'normal' ? bib(geheimKats) : 0;
      if (f.aufbau.geheimImStapel !== geheimSoll) bad(`${tag}, Aufbau: ${f.aufbau.geheimImStapel} geheime Ereignisse im Stapel, erwartet ${geheimSoll}`);
      const heldenSoll = bib(heldenKat) - auslageSoll - haendeSoll.reduce((a, b) => a + b, 0);
      if (f.aufbau.heldenStapel !== heldenSoll) bad(`${tag}, Aufbau: Heldentaten-Stapel ${f.aufbau.heldenStapel}, erwartet ${heldenSoll}`);

      // Dorfereignis: eine Karte je Dörfler in die Hand, offen in solo, sonst verdeckt.
      const e = aktion(env, 'dorfereignis', st0);
      for (const x of schlecht(e.log)) bad(`${tag}, dorfereignis: ${zeile(x)}`);
      const ereignisSchritte = env.actions.find(a => a.id === 'dorfereignis').steps;
      const inHand = (st, i, f2) => imBereich(st, handLabel(i), f2);
      const verdeckte = [1, 2, 3, 4, 5].flatMap(i => { const z = handLabel(i) ? zoneVon(e.state, handLabel(i)) : null; return z ? objectsInZone(z, e.state.cards).filter(istEreignis).map(c => c.faceDown === true) : []; });
      f.ereignis = {
        zeilen: e.log.length,
        haende: [1, 2, 3, 4, 5].map(i => inHand(e.state, i, istEreignis)),
        verdeckt: verdeckte.length && verdeckte.every(v => v) ? true : verdeckte.length && verdeckte.every(v => !v) ? false : null,
        gelaufen: gelaufenPruefen(`${tag}, dorfereignis`, ereignisSchritte, e.log, ereignisNachInhalt, kind, D),
      };
      if (f.ereignis.zeilen !== EREIGNIS_ZEILEN(D)) bad(`${tag}, dorfereignis: ${f.ereignis.zeilen} Zeilen, erwartet ${EREIGNIS_ZEILEN(D)}`);
      const ereignisHaende = [1, 2, 3, 4, 5].map(i => (i <= D ? 1 : 0));
      if (!same(f.ereignis.haende, ereignisHaende)) bad(`${tag}, dorfereignis: Ereignisse je Hand ${f.ereignis.haende}, erwartet ${ereignisHaende}`);
      if (f.ereignis.verdeckt !== (kind !== 'solo')) bad(`${tag}, dorfereignis: ${f.ereignis.verdeckt === null ? 'offene und verdeckte gemischt' : f.ereignis.verdeckt ? 'verdeckt' : 'offen'}, erwartet ${kind !== 'solo' ? 'verdeckt' : 'offen'}`);
      const heldenInHand = [1, 2, 3, 4, 5].map(i => inHand(e.state, i, istHeld));
      if (!same(heldenInHand, haendeSoll)) bad(`${tag}, dorfereignis: Heldentaten in den Händen ${heldenInHand}, erwartet ${haendeSoll}`);

      // Kampf beginnen, dann die Dorfphase - **nachdem ein Heldentat verbraucht wurde**, sonst füllte sie nichts auf und der Hand-/Auslage-Schritt bliebe unbewiesen.
      const k = aktion(env, 'kampf-beginnen', e.state);
      for (const x of schlecht(k.log)) bad(`${tag}, kampf-beginnen: ${zeile(x)}`);
      const vor = structuredClone(k.state);
      const ziel = kind === 'solo' ? auslageLabel : handLabel(1);
      const zz = zoneVon(vor, ziel);
      const weg = zz ? objectsInZone(zz, vor.cards).find(istHeld) : null;
      if (weg) vor.cards = vor.cards.filter(c => c !== weg);
      else bad(`${tag}: in „${ziel}“ liegt keine Heldentat, die für die Dorfphase wegzunehmen wäre`);
      const heldenVor = stapelVon(vor, heldenLabel).length;
      const p = aktion(env, 'dorfphase-beginnen', vor);
      for (const x of schlecht(p.log)) bad(`${tag}, dorfphase-beginnen: ${zeile(x)}`);
      const dorfSchritte = env.actions.find(a => a.id === 'dorfphase-beginnen').steps;
      f.dorf = {
        zeilen: p.log.length, zaehler: zaehler(p.state), auslage: imBereich(p.state, auslageLabel),
        haende: [1, 2, 3, 4, 5].map(i => imBereich(p.state, handLabel(i))),
        gelaufen: gelaufenPruefen(`${tag}, dorfphase-beginnen`, dorfSchritte, p.log, schritteNachInhalt, kind, D),
      };
      const zaehlerNach = kind === 'solo' ? [[zaehlerSoll[0][0], start + MUENZEN_NACH_KAMPF * D]] : zaehlerSoll.map(([n, v]) => [n, v + MUENZEN_NACH_KAMPF]);
      if (!same(f.dorf.zaehler, zaehlerNach)) bad(`${tag}, Dorfphase: Zähler ${text(f.dorf.zaehler)}, erwartet ${text(zaehlerNach)}`);
      if (f.dorf.auslage !== auslageSoll) bad(`${tag}, Dorfphase: ${f.dorf.auslage} Karten in der Auslage, erwartet ${auslageSoll}`);
      if (!same(f.dorf.haende, haendeSoll)) bad(`${tag}, Dorfphase: Hände ${f.dorf.haende}, erwartet ${haendeSoll}`);
      const uebrig = p.state.cards.filter(istEreignis).length;
      if (uebrig) bad(`${tag}, Dorfphase: ${uebrig} Ereigniskarten liegen noch am Tisch (das Aufräumen kennt eine Kategorie nicht)`);
      const heldenNach = stapelVon(p.state, heldenLabel).length;
      if (heldenNach !== heldenVor - 1) bad(`${tag}, Dorfphase: der Heldentaten-Stapel ${heldenVor} → ${heldenNach}, erwartet eine Karte weniger (die verbrauchte wird aufgefüllt)`);

      faelle.push(f);
      const hand = (a) => a.slice(0, D).join('/');
      out.push(`  ${kind} ${S} Spieler, ${D} Dörfler: Aufbau ${topfText(kind, f.aufbau.zaehler)}, Auslage ${f.aufbau.auslage}, Hände ${hand(f.aufbau.haende)}; Ereignis-Stapel ${f.aufbau.ereignisStapel}; Ereignis ${f.ereignis.zeilen} Zeilen ${f.ereignis.verdeckt ? 'verdeckt' : 'offen'}; Dorfphase ${f.dorf.zeilen} Zeilen, ${topfText(kind, f.dorf.zaehler)}, Auslage ${f.dorf.auslage}, Hände ${hand(f.dorf.haende)}`);
    }
  });
  out.push(`  ${faelle.length} Fälle (solo ${faelle.filter(x => x.kind === 'solo').length}, mehrfach ${faelle.filter(x => x.kind === 'mehrfach').length}, normal ${faelle.filter(x => x.kind === 'normal').length}): Lage, Form des Geldes und die Schritte der Aktionen geprüft`);
  return { out, problems, lage: lageErgebnis, faelle };
}

/**
 * Die Dörfler eines Spielstands für die Zeile des Abschnitts 3: V1/V2/V3 wie bisher (mit `?`), `/V4/V5` nur, wenn ein Platz gebunden ist - bis zum
 * letzten gebundenen, eine Lücke bleibt als `?` sichtbar. (Vor FI stand dort nur `V1/V2/V3`: ein Fünfer-Tisch sah aus wie ein Dreier.)
 */
export const doerflerNamen = (seats) => {
  const da = (k) => seats[k] !== undefined && seats[k] !== null;
  const bis = da('V5') ? 5 : da('V4') ? 4 : 3;
  return Array.from({ length: bis }, (_, i) => seats[`V${i + 1}`] ?? '?').join('/');
};

export function rauchtest(db) {
  const out = [];
  const problems = [];
  const say = (s) => out.push(s);
  const bad = (s) => { problems.push(s); out.push(`  !! ${s}`); };
  const env = laden(db);
  say(`Aufbau: ${env.sequence.length} Schritte, ${env.actions.length} Aktionen (${env.actions.map(a => `${a.id} ${a.steps.length}`).join(', ')}), ${env.assets.length} Assets, ${env.cards.length} Karten, ${env.zones.length} Zonen`);
  say(`  seat_villager: ${env.sequence.filter(s => s.type === 'seat_villager').length}, onlyChoice: ${env.sequence.filter(s => s.onlyChoice).length}, options: ${Object.keys(env.scenarioData.options ?? {}).join(', ')}`);

  // ── 0. Die Zuordnung Plättchen → Geländekarte (M29) ──
  say('\n0. Zuordnung Plättchen → Geländekarte: Tabelle terrainCards da, Prüfer ohne Probleme');
  const tabelle = env.scenarioData.terrainCards;
  const tabelleDa = same(tabelle, ZUORDNUNG);
  const zuordnungProbleme = validateScenarioData(env.scenarioData, { assets: env.assets, grids: env.grids, cards: env.cards });
  say(`  terrainCards: ${tabelleDa ? 'da, genau die drei Paare' : tabelle === undefined ? 'FEHLT' : 'ANDERS'}; validateScenarioData: ${zuordnungProbleme.length} Probleme`);
  if (!tabelleDa) bad(`terrainCards ${tabelle === undefined ? 'fehlt' : `lautet anders (${JSON.stringify(tabelle)})`}, erwartet ${JSON.stringify(ZUORDNUNG)}`);
  for (const p of zuordnungProbleme) bad(`validateScenarioData: ${p}`);

  // ── 1. Vier Kombinationen und die drei Aktionen ──
  say('\n1. Vier Kombinationen: Aufbau, dann Kampf beginnen → Dorfphase beginnen → Laden nachfüllen');
  const stack = (s, l) => s.stacks.find(x => x.label === l);
  for (const choices of COMBINATIONS) {
    const key = `${choices.partie}/${choices.troedel}`;
    const r = bauen({ state: env.row.state_data, sequence: env.sequence, zones: env.zones, grids: env.grids, assets: env.assets, cards: env.cards, scenarioData: env.scenarioData }, { ...choices, ...grannyWenn(env) }, 3);
    let s = r.state;
    const nachschub = stack(s, 'Nachschub (Tante Emma)')?.cards.length;
    const auslage = s.cards.filter(c => /^Nachschub|^Toller Trödel: Nachschub/.test(c.category ?? '')).length;
    const rollen = stack(s, 'Rollen');
    say(`  ${key.padEnd(10)} Aufbau: ${r.log.length} Zeilen, ohne ok: ${schlecht(r.log).length}; Nachschub ${nachschub} + ${auslage} offen, Rollen ${rollen ? rollen.cards.length : '-'}, Münzen ${s.counters.find(c => c.name === 'Münzen (gemeinsam)')?.value}, Leiste ${s.tokens.filter(t => /^Bösewicht: |^Kurzpartie/.test(t.label ?? '')).length} Objekte`);
    for (const e of schlecht(r.log)) bad(`${key} Aufbau: ${zeile(e)}`);
    const kette = [];
    for (const id of ACTIONS) {
      const a = aktion(env, id, s);
      const sl = schlecht(a.log);
      kette.push(`${id} ${a.log.length} Zeilen/${sl.length} ohne ok`);
      for (const e of sl) bad(`${key} ${id}: ${zeile(e)}`);
      s = a.state;
    }
    say(`             ${kette.join(' → ')}`);
    // Was die Wahl hinterlässt, überlebt die Aktionen: der Stapel heißt gleich, der Rollenstapel liegt noch da.
    if (!stack(s, 'Nachschub (Tante Emma)')) bad(`${key}: nach den Aktionen gibt es den Stapel „Nachschub (Tante Emma)" nicht mehr`);
    if (Boolean(stack(s, 'Rollen')) !== (choices.troedel === 'mit')) bad(`${key}: der Rollenstapel ist nach den Aktionen ${stack(s, 'Rollen') ? 'da' : 'weg'}, obwohl ${choices.troedel} Toller Trödel`);
    if (rollen && !same(ohneIds(stack(s, 'Rollen')), ohneIds(rollen))) bad(`${key}: der Rollenstapel hat sich durch die Aktionen verändert`);
    // Zweiter Kampf auf demselben Tisch: die Kette trägt (Etikett, Stapel, Leiste).
    const k2 = aktion(env, 'kampf-beginnen', s);
    // Welcher Bösewicht an der Reihe ist, entscheidet der Mischer; der bekannte Hinweis zu Plättchen ohne Geländekarte
    // gilt für jeden (Virginia Fitz, Red, Barry … - `bekannt`), er wird genannt, nicht verschwiegen.
    const k2s = schlecht(k2.log);
    const k2u = k2s.filter(e => !bekannt('', e));
    for (const e of k2u) bad(`${key} zweiter Kampf: ${zeile(e)}`);
    if (!k2u.length) say(`             zweiter Kampf beginnen: ${k2.log.length} Zeilen/${k2s.length} ohne ok${k2s.length ? ` (bekannte Hinweise${plaettchen(k2s)})` : ''}`);
  }

  // ── 2. Alle zwanzig Bösewichte, Vor- und Endkampf ──
  say('\n2. Alle Bösewichte: Kampf beginnen im Vorkampf und im Endkampf (Aufbau lang/ohne, 20 aus dem Pool)');
  const built = bauen({ state: env.row.state_data, sequence: env.sequence, zones: env.zones, grids: env.grids, assets: env.assets, cards: env.cards, scenarioData: env.scenarioData }, { partie: 'lang', troedel: 'ohne', ...grannyWenn(env) }, 5).state;
  let legen = 0, ohneKarte = [], sauber = 0, kaempfe = 0;
  for (const boss of Object.keys(env.scenarioData.bosses)) {
    const sheriff = env.scenarioData.bosses[boss].final?.stats?.SHERIFF;
    for (const endkampf of [false, true]) {
      const t = fuerKampf(env, built, boss, endkampf);
      for (const e of t.log) bad(`${boss}: Leiste herrichten: ${zeile(e)}`);
      const a = aktion(env, 'kampf-beginnen', t.state);
      const sl = schlecht(a.log);
      // Die Karte wird über die Bibliothek gefunden, nicht über den Namen: die Namen aus dem
      // OCR-Textlayer sind zerlegt (`findCardByName` weiß das), und eine Karte am Tisch trägt
      // die `cardId` ihrer Bibliothekszeile.
      const lib = sheriff ? findCardByName(env.cards.filter(c => SHERIFF_CATEGORIES.includes(c.category)), sheriff).card : null;
      const karte = lib ? a.state.cards.find(c => c.cardId === lib.id) : null;
      const tag = `${boss.padEnd(17)} ${endkampf ? 'Endkampf' : 'Vorkampf'}`;
      // Danach *Dorfphase beginnen*: räumt sie das Verhaltensdeck dieses Bösewichts ab? Die Aktion nennt die
      // `Aktionen: …`-Kategorien nur der drei Startbösewichte (`docs/szenariodaten-grundspiel.md` §13.1); das
      // Deck selbst ist ein Stapel namens „Verhaltensdeck" und die Zone „Aktionen" wird geleert - beides
      // gilt für jeden. Geprüft wird, dass nach der Dorfphase nichts von ihm am Tisch liegt.
      const d = aktion(env, 'dorfphase-beginnen', a.state);
      kaempfe++;
      const rest = [
        ...(d.state.cards ?? []).filter(c => /^Aktionen: /.test(c.category ?? '')).map(c => `Karte ${c.name}`),
        ...(d.state.stacks ?? []).filter(x => x.label === 'Verhaltensdeck').map(() => 'Stapel Verhaltensdeck'),
      ];
      if (!schlecht(d.log).length && !rest.length) sauber++;
      else bad(`${boss} ${endkampf ? 'Endkampf' : 'Vorkampf'}: nach Dorfphase beginnen ${rest.length ? `liegt noch: ${rest.join(', ')}` : schlecht(d.log).map(zeile).join('; ')}`);
      const unerwartet = sl.filter(e => !bekannt(boss, e));
      const hinweise = sl.length - unerwartet.length;
      say(`  ${tag}: ${a.log.length} Zeilen, ohne ok: ${sl.length}${hinweise ? ` (davon ${hinweise} bekannte Hinweise${plaettchen(sl.filter(e => bekannt(boss, e)))})` : ''}${endkampf && sheriff ? `; Karte ${karte ? `„${karte.name}" (${karte.category})` : 'FEHLT'}` : ''}`);
      for (const e of unerwartet) bad(`${tag}: ${zeile(e)}`);
      if (endkampf && !sheriff) ohneKarte.push(boss);
      else if (endkampf) {
        if (!karte) bad(`${tag}: die Sheriff-Karte „${sheriff}" liegt nicht am Tisch`);
        else legen++;
      } else if (karte) {
        bad(`${tag}: im Vorkampf liegt die Sheriff-Karte schon da`);
      }
    }
  }
  say(`  Dorfphase beginnen nach jedem dieser Kämpfe: Verhaltensdeck und \`Aktionen: …\`-Karten weg, Protokoll ohne Beanstandung: ${sauber} von ${kaempfe}`);
  say(`  Endkämpfe, in denen die Sheriff-Karte liegt: ${legen} von ${Object.keys(env.scenarioData.bosses).length}; ohne Karte (gewollt): ${ohneKarte.join(', ') || '-'}`);
  const handsy = fuerKampf(env, built, 'Handsy', true);
  const h = aktion(env, 'kampf-beginnen', handsy.state);
  const hu = schlecht(h.log).filter(e => !bekannt('Handsy', e));
  say(`  Handsy-Endkampf: ${h.log.length} Zeilen, ohne ok und unbekannt: ${hu.length}, bekannte Hinweise: ${schlecht(h.log).length - hu.length}; Karten in der Terrain-Auslage: ${h.state.cards.filter(c => c.name === 'TRILLERPFEIFE').map(c => c.category).join(', ') || 'keine'}`);
  if (hu.length) for (const e of hu) bad(`Handsy-Endkampf: ${zeile(e)}`);

  // ── 3. Die Spielstände ──
  say('\n3. Spielstände, die auf den Aufbau zeigen: Stapel da, Aktionen laufen (im Speicher, nichts wird gespeichert)');
  const saves = db.prepare('select id, name, state_data, updated_at from save_states where setup_id = ? order by rowid').all(SETUP_ID);
  for (const sv of saves) {
    let state;
    try { state = JSON.parse(sv.state_data); } catch (e) { bad(`${sv.name}: state_data ist kein JSON`); continue; }
    const labels = (state.stacks ?? []).map(x => x.label);
    const fehlt = ['Nachschub (Tante Emma)', 'Heldentaten', 'Dorf-Ereignisse'].filter(l => !labels.includes(l));
    const seats = seatVars(state, env.assets, env.scenarioData.villagers);
    const imKampf = (state.tokens ?? []).some(t => /^Tableau: /.test(t.label ?? '') && !/Henlo|Fridgette|Granny|Judy|Norman|Blopsy|Georgie|Quintus|Yancy/.test(t.label));
    // Die Reihenfolge, in der der Spielstand die Aktionen **zulässt**: in der Dorfphase füllt der Laden
    // nach, dann beginnt der Kampf; im Kampf endet er zuerst (der Laden liegt auf der Rückseite des
    // Sideboards - „Kampf beginnen" dreht es, und die Auslage ist dann gesperrt, das ist gewollt).
    const folge = imKampf ? ['dorfphase-beginnen', 'laden-nachfuellen'] : ['laden-nachfuellen', 'kampf-beginnen'];
    let s = state;
    const teile = [];
    let gehalten = false;
    for (const id of folge) {
      if (gehalten) break;
      const a = aktion(env, id, s);
      const sl = schlecht(a.log);
      teile.push(`${id}: ${a.log.length} Zeilen/${sl.length} ohne ok`);
      // Eine Wache, die der Spielstand nicht erfüllt (alle Dörfler besiegt, der Kampf läuft noch), ist eine
      // Auskunft über den Stand, kein Fehler des Aufbaus - und danach geht die Folge nicht weiter.
      for (const e of sl) {
        if (istWache(e)) { say(`      Wache bei „${id}": ${e.reason}`); gehalten = true; }
        else bad(`${sv.name} ${id}: ${zeile(e)}`);
      }
      s = a.state;
    }
    say(`  ${sv.name.slice(0, 48).padEnd(50)} Stapel ${labels.length}${fehlt.length ? ` (FEHLT ${fehlt.join(', ')})` : ''}; Dörfler ${doerflerNamen(seats)}; ${teile.join(' → ')}`);
    if (fehlt.length) bad(`${sv.name}: Stapel fehlen: ${fehlt.join(', ')}`);
  }

  // ── 4. (M31) Die Dörflerzahl ──
  const vier = dorflerFaelle(env);
  out.push(...vier.out);
  problems.push(...vier.problems);

  // ── 5. (M31, FI) Die Lagen - am Ende; ohne `villagers.lage` (Stand von Welle 1) stumm ──
  const fuenf = lagenFaelle(env);
  out.push(...fuenf.out);
  problems.push(...fuenf.problems);

  say(`\nRauchtest: ${problems.length} Beanstandungen`);
  return { out, problems };
}

async function main(argv) {
  const [dbPath] = argv;
  if (!dbPath) { console.error('usage: auslagen-rauchtest.mjs <db>'); return 2; }
  const { default: Database } = await import('better-sqlite3');
  const db = new Database(dbPath, { readonly: true });
  try {
    const { out, problems } = rauchtest(db);
    console.log(out.join('\n'));
    return problems.length ? 1 : 0;
  } finally {
    db.close();
  }
}

if (process.argv[1] && process.argv[1].endsWith('auslagen-rauchtest.mjs')) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, err => { console.error(err); process.exitCode = 1; });
}
