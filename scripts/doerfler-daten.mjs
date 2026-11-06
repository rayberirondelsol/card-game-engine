// CI–CL / Spec M26 — die Datenänderungen für den Aufbau *TFT Kurzpartie*:
// sechs Ausrüstungsplätze am Tableaurand, die Zähler aus der Lücke, die Daten
// der neun Dörfler und Aktionen, die keinen Dörfler mehr beim Namen nennen.
//
// Vier Spalten, ein Schalter, **eine Transaktion**: `zone_data` (die Plätze),
// `sequence_data` (die Ziele der Startausrüstung, die Zählerstellen),
// `action_data` (Platzhalter statt Namen) und `scenario_data` (der Abschnitt
// `villagers`). Sie hängen aneinander — die Zonen heißen anders, die Schritte
// nennen sie beim Namen — und eine Hälfte allein ließe jede Karte der
// Startausrüstung ins Leere zielen. Hier stehen die Zahlen **einmal** (M6):
// derselbe Baustein liefert sie für den Trockenlauf, für das Schreiben und für
// `server/test/doerfler-daten.test.js`. Begründung, Messwerte und die
// verworfenen Varianten stehen in `docs/tasks-doerfler.md`.
//
// Aufruf (im Backend-Container, wo `better-sqlite3` liegt):
//
//   node scripts/doerfler-daten.mjs --json            # was geschrieben würde
//   node scripts/doerfler-daten.mjs --check <db-pfad> # Trockenlauf
//   node scripts/doerfler-daten.mjs --write <db-pfad> # eine Transaktion
//
// Gelesen und geschrieben werden **nur die vier Spalten**, und jede einzeln. Wer
// die ganze Zeile zurückschreibt, überschreibt `state_data` und `grid_data`
// fremder Aufträge.

import { SETUP_ID, DOERFLER, MEASURED_ANCHORS, counterBox, equipmentZones, patchZones, RETIRED_IDS } from './equipment-zones.mjs';
import { STATS, validateVillagers } from '../shared/villagers.js';

export { SETUP_ID, patchZones };

// ── CK: die Daten der neun Dörfler ───────────────────────────────────────────

/**
 * Die drei Plätze der Kurzpartie. `anchor` ist das Asset, an dem die Zonen
 * dieses Platzes hängen (`zone.anchor.assetId`) — ein getauschtes Tableau trägt
 * seine Id weiter (`anchorId`). `zones`, `markers`, `vorrat` sind die Namen, die
 * der Aufbau schon führt.
 */
const SEATS = [
  { anchor: 'Tableau: Henlo Bulwark', zones: 'Dörfler 1', markers: 'Marker 1', vorrat: 'Ausrüstung Dörfler 1' },
  { anchor: 'Tableau: Fridgette Jones', zones: 'Dörfler 2', markers: 'Marker 2', vorrat: 'Ausrüstung Dörfler 2' },
  { anchor: 'Tableau: Granny Melba', zones: 'Dörfler 3', markers: 'Marker 3', vorrat: 'Ausrüstung Dörfler 3' },
];

/** Wer in der Kurzpartie sitzt, in der Reihenfolge der Plätze. */
export const INITIAL = ['Henlo Bulwark', 'Fridgette Jones', 'Granny Melba'];

const L = 'Linke Hand', R = 'Rechte Hand';
const start = (leben, bewegung, mumm, praezision) => ({ Leben: leben, Bewegung: bewegung, Mumm: mumm, Präzision: praezision });

/**
 * Die neun Dörfler, abgelesen am Tableau und an den Kartenbildern
 * (`docs/doerflerdaten.md`, dort mit Sicherheitsstufe je Wert).
 *
 * **Die Hände:** `1-Hand` heißt *eine* der beiden, frei wählbar; `2-Hand` belegt
 * **beide** `[DE S.9]`. Gewählt ist **eine Reihenfolge, keine Regel**: die erste
 * Einhandwaffe in `Rechte Hand`, die zweite in `Linke Hand`, eine Zweihandwaffe
 * in `Rechte Hand` (dass sie die linke mitbelegt, steht auf der Karte, nicht am
 * Tisch — siehe CI). Der Spieler zieht sie von Hand um.
 *
 * **Ohne `slot`** liegt eine Karte im Vorrat (Judys drei Gemälde: „You do not own
 * this gear, but they can be given to teammates").
 *
 * **Georgie Irongut ist der einzige unsichere Datensatz:** sein Tableau ist ein
 * Foto, nicht das Artwork der anderen acht, und es gibt keine Gegenprobe. Die
 * Werte sind übernommen und als `unverified` markiert.
 */
export const ROSTER = {
  'Henlo Bulwark': {
    short: 'Henlo', start: start(3, 5, 2, -1),
    gear: [{ card: 'BAUERNLATZHOSE', slot: 'Beine' }, { card: 'ROSTIGE SICHEL', slot: R }],
  },
  'Fridgette Jones': {
    short: 'Fridgette', start: start(4, 5, 2, -1),
    gear: [{ card: 'GEFRIERFACHTÜR', slot: R }, { card: 'KÜHL-PACK', slot: 'Brust' }],
  },
  'Granny Melba': {
    short: 'Granny', start: start(4, 4, 2, -2),
    gear: [{ card: 'OMMAS GEHSTOCK', slot: R }, { card: 'DAS ALTE EISEN', slot: L }],
  },
  'Blopsy Twins': {
    short: 'Blopsy', start: start(4, 4, 3, -1),
    gear: [{ card: 'BLECHERNE TRÖTE', slot: R }, { card: 'MIESES MESSER', slot: L }, { card: 'KRISTALLKUGEL', slot: 'Mitbringsel' }],
  },
  'Georgie Irongut': {
    short: 'Georgie', start: start(3, 4, 4, -1),
    gear: [{ card: 'PAPAS KNALLKOPF', slot: R }, { card: 'MUFFIGER KUCHEN', slot: 'Mitbringsel' }],
    unverified: 'Die Werte sind von einem Foto abgelesen, nicht vom Artwork der anderen Tableaus, und es gibt keine Gegenprobe – einmal am gedruckten Tableau prüfen.',
  },
  'Judy Marks': {
    short: 'Judy', start: start(3, 4, 3, 1),
    gear: [
      { card: 'RIESENPINSEL', slot: R }, { card: 'KÜNSTLERSCHÄRPE', slot: 'Brust' },
      { card: '„ACH, WIE SCHÖN!“' }, { card: '„KLARER HIMMEL“' }, { card: '„DIE GROSSE REISE“' },
    ],
  },
  'Norman Fishboy': {
    short: 'Norman', start: start(4, 4, 2, 2),
    gear: [{ card: 'BEWÄHRTE ANGEL', slot: R }, { card: 'FISCHMÜTZE', slot: 'Kopf' }],
  },
  'Quintus Binch': {
    short: 'Quintus', start: start(4, 5, 2, 0),
    gear: [{ card: 'GUMMIKNÜPPEL', slot: R }, { card: 'GEKLAUTE BONBONS', slot: 'Mitbringsel' }],
  },
  'Yancy Plover': {
    short: 'Yancy', start: start(4, 3, 3, 0),
    gear: [{ card: 'SCHMIEDESCHÜRZE', slot: 'Brust' }, { card: 'ALTER WÄMSER', slot: R }],
  },
};

/** Der Abschnitt `scenario_data.villagers`, wie er in die Datenbank geht. */
export const VILLAGERS = { fightZone: 'Bösewicht-Tableau', seats: SEATS, roster: ROSTER };

/** Kartenname → Zone der Kurzpartie-Dörfler, abgeleitet (BY): keine zweite Liste. */
export const CARD_SLOTS = Object.fromEntries(INITIAL.flatMap((name, i) =>
  ROSTER[name].gear.map(g => [g.card, `${SEATS[i].zones}: ${g.slot ?? 'Vorrat'}`])));

// ── CJ: die Zähler aus der Lücke ─────────────────────────────────────────────

/**
 * Eine Reihe **unter** dem Tableau, nebeneinander: die zwei Reihen, die die
 * Plätze am Rand freigegeben haben (y 1808 … 2110).
 *
 * Der breiteste Zählerkasten ist 185 (`COUNTER_SIZE`); Abstand 195 lässt 10
 * Punkte Luft, und drei Kästen (575) passen in das 580 breite Feld eines
 * Dörflers. `x` ist **nicht** die linke Kante: gezeichnet wird mit `left: x − 70`.
 * Oberkante 1830 = 30 Punkte unter dem Tableau.
 */
export const COUNTER_ROW = { y: 1870, from: -80, step: 195, order: ['Bewegung', 'Mumm', 'Präzision'] };

/** Die neun Zählerstellen: `{ 'Henlo: Bewegung': { x, y }, … }`. */
export function counterSpots() {
  const out = {};
  INITIAL.forEach((name, i) => {
    const a = MEASURED_ANCHORS[i];
    const cx = a.x + a.width / 2;
    COUNTER_ROW.order.forEach((stat, k) => {
      out[`${ROSTER[name].short}: ${stat}`] = { x: cx + COUNTER_ROW.from + COUNTER_ROW.step * k, y: COUNTER_ROW.y };
    });
  });
  return out;
}

/** Der Kasten eines Zählers der neuen Reihe, in Weltpunkten. */
export const rowBox = (spot) => counterBox(spot);

// ── Die vier Umschreibungen, als reine Funktionen ────────────────────────────

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * BY + CJ: die Ziele der sechs Karten und die neun Zählerstellen. Mehr fasst die
 * Umschreibung nicht an: jeder andere Schritt bleibt Zeichen für Zeichen.
 */
export function patchSequence(steps) {
  const spots = counterSpots();
  return (Array.isArray(steps) ? steps : []).map(s => {
    if (s?.type === 'place_card' && CARD_SLOTS[s.cardName]) {
      return { ...s, targetZoneLabel: CARD_SLOTS[s.cardName] };
    }
    if (s?.type === 'place_counter' && spots[s.name]) {
      return { ...s, ...spots[s.name] };
    }
    return s;
  });
}

/**
 * CL: die Dörflernamen der Aktionen werden zu Platzhaltern (`$F1`, `$V1: Leben`,
 * `slot: "$V1LEB"`). Angefasst wird **nur**, was genau dem Eintrag eines der drei
 * Startdörfler gleicht; ein zweiter Lauf findet nichts mehr und ändert nichts.
 */
export function patchActions(actions) {
  const swap = (step) => {
    let out = step;
    INITIAL.forEach((name, i) => {
      const n = i + 1, v = ROSTER[name];
      const rename = (value) => {
        if (value === name) return `$F${n}`;
        for (const st of STATS) if (value === `${v.short}: ${st.key}`) return `$V${n}: ${st.key}`;
        return value;
      };
      if (typeof out.assetName === 'string' && rename(out.assetName) !== out.assetName) {
        out = { ...out, assetName: rename(out.assetName) };
      }
      if (typeof out.name === 'string' && rename(out.name) !== out.name) out = { ...out, name: rename(out.name) };
      if (Array.isArray(out.name) && out.name.some(x => rename(x) !== x)) out = { ...out, name: out.name.map(rename) };
      // Der Marker eines Platzes trägt den Startwert des Dörflers als `slot`.
      if (out.type === 'place_asset' && typeof out.assetName === 'string') {
        const st = STATS.find(x => out.assetName === `${SEATS[i].markers}: ${x.key}`);
        if (st && out.slot === v.start[st.key]) out = { ...out, slot: `$V${n}${st.tag}` };
      }
    });
    return out;
  };
  return (Array.isArray(actions) ? actions : []).map(a => ({
    ...a, steps: Array.isArray(a?.steps) ? a.steps.map(swap) : a?.steps,
  }));
}

/** CK: der Abschnitt `villagers` neben `bosses`; alles andere bleibt. */
export function patchScenario(scenario) {
  const base = scenario && typeof scenario === 'object' && !Array.isArray(scenario) ? scenario : {};
  return { ...base, villagers: VILLAGERS };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const COLUMNS = [
  ['zone_data', patchZones, 'Zonen'],
  ['sequence_data', patchSequence, 'Schritte'],
  ['action_data', patchActions, 'Aktionen'],
  ['scenario_data', patchScenario, 'Abschnitte'],
];

async function main(argv) {
  const [mode, dbPath] = argv;

  if (mode === '--json') {
    console.log(JSON.stringify({
      villagers: VILLAGERS, cardSlots: CARD_SLOTS, counterSpots: counterSpots(),
      zones: equipmentZones(),
    }, null, 1));
    return 0;
  }
  if (mode !== '--check' && mode !== '--write') {
    console.error('usage: doerfler-daten.mjs --json | --check <db> | --write <db>');
    return 2;
  }

  const { default: Database } = await import('better-sqlite3');
  const db = new Database(dbPath, { readonly: mode === '--check' });
  const read = (col) => JSON.parse(db.prepare(`select ${col} from setups where id = ?`).get(SETUP_ID)[col]);
  const complaints = [];
  const plan = [];

  // Gezählt wird als **Menge**, nicht nach Position: eine entfernte Zone
  // verschiebt alle Nachbarn, und ein Vergleich `after[i]` gegen `before[i]`
  // meldete sie alle als geändert.
  const diff = (before, after) => {
    const count = (list) => list.reduce((m, x) => {
      const k = JSON.stringify(x);
      return m.set(k, (m.get(k) || 0) + 1), m;
    }, new Map());
    const a = count(before), b = count(after);
    const weg = [...a].filter(([k, n]) => n > (b.get(k) || 0)).flatMap(([k, n]) => Array(n - (b.get(k) || 0)).fill(k));
    const neu = [...b].filter(([k, n]) => n > (a.get(k) || 0)).flatMap(([k, n]) => Array(n - (a.get(k) || 0)).fill(k));
    return { weg, neu };
  };
  const kurz = (s) => (s.length > 170 ? s.slice(0, 170) + ' …' : s);

  for (const [col, patch, unit] of COLUMNS) {
    const before = read(col);
    const after = patch(before);
    // `scenario_data` ist ein Objekt: gezählt wird je Schlüssel.
    const [b, a] = Array.isArray(before) ? [before, after] : [Object.entries(before), Object.entries(after)];
    const { weg, neu } = diff(b, a);
    plan.push({ col, unit, before: b.length, after: a.length, weg: weg.length, neu: neu.length, wegRoh: weg, before0: before, next: after });
    console.log(`${col}: ${b.length} → ${a.length} ${unit}, ${weg.length} weg/geändert, ${neu.length} neu/geändert`);
    for (const n of neu) console.log('    + ' + kurz(n));
  }

  // Die Schranken sind Obergrenzen, keine Sollwerte: ein zweiter Lauf findet
  // alles schon vor und darf nichts mehr melden (dieselbe Falle wie
  // `CURRENT_VORRAT` in der alten `equipment-zones.mjs`).
  const col = (name) => plan.find(p => p.col === name);
  const seq = col('sequence_data');
  if (seq.after !== seq.before) complaints.push('sequence_data: es darf kein Schritt dazukommen');
  if (seq.weg > 13 || seq.neu !== seq.weg) complaints.push(`sequence_data: höchstens 13 ersetzte Schritte, gefunden ${seq.weg}/${seq.neu}`);
  const act = col('action_data');
  if (act.after !== act.before) complaints.push('action_data: es darf keine Aktion dazukommen');
  const steps = (l) => l.flatMap(a => a.steps || []).length;
  if (steps(act.before0) !== steps(act.next)) complaints.push('action_data: die Zahl der Schritte hat sich geändert');
  const changedActionSteps = act.before0.flatMap((a, i) => (a.steps || []).filter((s, k) => !same(s, act.next[i].steps[k]))).length;
  if (changedActionSteps > 31) complaints.push(`action_data: höchstens 31 Schritte, gefunden ${changedActionSteps}`);
  console.log(`  action_data: ${changedActionSteps} Schritte geändert`);

  const zon = col('zone_data');
  const unsere = new Set([...equipmentZones().map(z => z.id), ...RETIRED_IDS]);
  for (const j of zon.wegRoh) {
    const id = JSON.parse(j)?.id;
    if (!unsere.has(id)) complaints.push(`zone_data: fremde Zone "${id}" würde sich ändern`);
  }
  if (new Set(zon.next.map(z => z.label)).size !== zon.next.length) complaints.push('zwei Zonen tragen denselben Namen');

  const scen = col('scenario_data');
  const fremd = Object.keys(scen.before0).filter(k => k !== 'villagers' && !same(scen.before0[k], scen.next[k]));
  if (fremd.length) complaints.push(`scenario_data: fremde Schlüssel würden sich ändern: ${fremd.join(', ')}`);

  // Gegen die echte Bibliothek: dieselbe Prüfung, die der Test fährt.
  const assets = db.prepare('select id, name from table_assets where game_id = (select game_id from setups where id = ?)').all(SETUP_ID);
  const cards = db.prepare(
    `select c.id, c.name, c.image_path from cards c where c.game_id = (select game_id from setups where id = ?)`).all(SETUP_ID);
  for (const p of validateVillagers(VILLAGERS, { assets, cards, zones: zon.next })) complaints.push(`villagers: ${p}`);
  for (const [card, zone] of Object.entries(CARD_SLOTS)) {
    if (!zon.next.some(z => z.label === zone)) complaints.push(`${card}: Zone "${zone}" gibt es nicht`);
  }

  console.log(`${mode === '--check' ? 'Trockenlauf' : 'Vorprüfung'}: ${complaints.length} Beanstandungen`);
  for (const c of complaints) console.log('  - ' + c);
  if (complaints.length) return 1;
  if (mode === '--check') return 0;

  db.transaction(() => {
    for (const p of plan) {
      db.prepare(`update setups set ${p.col} = ? where id = ?`).run(JSON.stringify(p.next), SETUP_ID);
    }
  })();

  // Kontrollausgabe: neu gelesen, nicht aus dem Plan.
  const z = read('zone_data');
  const slots = z.filter(q => /^Dörfler \d: (Kopf|Brust|Beine|Linke Hand|Rechte Hand|Mitbringsel)$/.test(q.label));
  console.log(`geschrieben: ${z.length} Zonen, davon ${slots.length} Plätze, Hände-Zonen: ${z.filter(q => /Hände/.test(q.label)).length}`);
  const s = read('sequence_data');
  console.log(`  place_card-Ziele: ${s.filter(x => x.type === 'place_card').map(x => x.targetZoneLabel).join(' | ')}`);
  console.log(`  Zähler: ${s.filter(x => x.type === 'place_counter' && /: (Bewegung|Mumm|Präzision)$/.test(x.name) && !/^Bösewicht/.test(x.name)).map(x => `${x.name}@${x.x},${x.y}`).join(' ')}`);
  const ac = read('action_data');
  console.log(`  Aktionen mit Dörflernamen im Text: ${ac.flatMap(a => a.steps).filter(x => /Henlo|Fridgette|Granny/.test(JSON.stringify(x))).length}`);
  const sc = read('scenario_data');
  console.log(`  villagers: ${Object.keys(sc.villagers.roster).length} Dörfler, ${sc.villagers.seats.length} Plätze; bosses unberührt: ${same(sc.bosses, scen.before0.bosses)}`);
  const untouched = zon.before0.filter(c => !unsere.has(c.id));
  console.log(`  unberührte Zonen: ${untouched.length}, unverändert: ${untouched.every(c => same(c, z.find(a => a.id === c.id)))}`);
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('doerfler-daten.mjs')) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; });
}
