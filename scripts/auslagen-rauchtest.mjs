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
import { seatVars } from '../shared/villagers.js';
import { findCardByName } from '../shared/cardSearch.js';
import { validateScenarioData } from '../shared/scenarioData.js';
import { ZUORDNUNG } from './gelaendekarten-zuordnung.mjs';

const ACTIONS = ['kampf-beginnen', 'dorfphase-beginnen', 'laden-nachfuellen'];
const LEISTE = 'Bösewicht-Leiste';
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Was nicht „ok" ist - ein `note` ist ein Hinweis, aber im Protokoll, und zählt hier mit. */
const schlecht = (log) => log.filter(e => e.status !== 'ok');

/**
 * M29: welche der Plättchen, die die Tabelle `terrainCards` abdeckt, ein Hinweis **namentlich** nennt (`"<Name>"` im
 * `reason`). Der allgemeine Ausdruck in `bekannt()` lässt jedes Plättchen ohne Karte durch; für diese drei ist „ohne Karte“
 * kein bekannter Normalfall mehr, sondern ein Zeichen, dass die Zuordnung nicht greift.
 */
export const wiederOhneKarte = (e) => [...(e.reason ?? '').matchAll(/"([^"]+)"/g)].map(m => m[1]).filter(n => Object.hasOwn(ZUORDNUNG, n));

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
    const r = bauen({ state: env.row.state_data, sequence: env.sequence, zones: env.zones, grids: env.grids, assets: env.assets, cards: env.cards, scenarioData: env.scenarioData }, choices, 3);
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
  const built = bauen({ state: env.row.state_data, sequence: env.sequence, zones: env.zones, grids: env.grids, assets: env.assets, cards: env.cards, scenarioData: env.scenarioData }, { partie: 'lang', troedel: 'ohne' }, 5).state;
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
        if ((e.type === 'require_counter' || e.type === 'require_zone') && /further steps? skipped/.test(e.reason ?? '')) { say(`      Wache bei „${id}": ${e.reason}`); gehalten = true; }
        else bad(`${sv.name} ${id}: ${zeile(e)}`);
      }
      s = a.state;
    }
    say(`  ${sv.name.slice(0, 48).padEnd(50)} Stapel ${labels.length}${fehlt.length ? ` (FEHLT ${fehlt.join(', ')})` : ''}; Dörfler ${seats.V1 ?? '?'}/${seats.V2 ?? '?'}/${seats.V3 ?? '?'}; ${teile.join(' → ')}`);
    if (fehlt.length) bad(`${sv.name}: Stapel fehlen: ${fehlt.join(', ')}`);
  }

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
