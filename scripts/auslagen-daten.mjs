// CY / Spec M27.1–M27.2, M27.5 — die Daten zu „Die Auslage steht einmal im Setup,
// und ein Aufbau hat Schalter".
//
// Drei Spalten des Aufbaus *TFT Kurzpartie*, **eine Transaktion**:
//
//   sequence_data  65 → 31 Schritte: die 39 hartverdrahteten Dörfler-Schritte
//                  werden drei `seat_villager`; die Nachschub-Kategorie und die
//                  Münzen tragen einen Platzhalter; vier Schritte ein Gate, zwei
//                  neue (`draw_assets` lang, der Rollenstapel) ebenfalls.
//   scenario_data  nur Schlüssel **dazu**: `options`, `villagers.barZone`,
//                  `villagers.seats[].tableau` und `.counters`.
//   action_data    **genau ein** Schritt: *Kampf beginnen* 17 (`place_card
//                  "$SHERIFF"`) bekommt `category` (M27.5), damit dem Sheriff im
//                  Endkampf gegen Handsy die Karte nicht fehlt.
//
// Nie angefasst: `zone_data`, `grid_data`, `state_data` und `save_states`.
// `scenario_data.bosses` und `villagers.roster` bleiben **byteweise** unverändert -
// das Skript beweist es vor dem Schreiben und liest es danach neu.
//
// Aufruf (im Backend-Container, wo `better-sqlite3` liegt; die Dateien liegen dort
// in `/app`, `../shared` ist dann `/shared` - siehe `docs/datenzugriff.md`):
//
//   node scripts/auslagen-daten.mjs --json            # was geschrieben würde
//   node scripts/auslagen-daten.mjs --check <db-pfad> # Trockenlauf
//   node scripts/auslagen-daten.mjs --write <db-pfad> # eine Transaktion
//
// **Warum ein zweiter Lauf nichts überschreiben kann** (wie
// `szenariodaten-grundspiel.mjs`; der alte `doerfler-daten.mjs --write` hat still
// fremde Arbeit ersetzt, weil er seinen Abschnitt bedingungslos auf die Konstante
// setzte):
//
//   1. Das Skript **ergänzt und ersetzt nur, was es selbst gebaut hat.** Die 39
//      Dörfler-Schritte werden nur entfernt, wenn **jeder einzelne** genau dem
//      entspricht, was die Dörferdaten daraus machen (die Spec-Abnahme „der Tisch
//      ist gleichwertig" wird damit auch an der Datenbank geprüft, nicht nur an
//      einer Fixture). Steht an einer Stelle etwas **anderes**, bricht der Lauf ab
//      - es gibt keinen Schalter, der das umgeht.
//   2. Ein Schlüssel, der schon da ist und **gleich**, passiert nichts; ist er da
//      und **anders**, Abbruch.
//   3. `UPDATE … WHERE id = ? AND <jede Spalte> = <exakt der gelesene Text>`: hat
//      jemand zwischen Lesen und Schreiben etwas geändert, trifft er keine Zeile,
//      und die Transaktion bricht ab. Sie läuft `IMMEDIATE`: der Schreibsperre wegen
//      kann der Server (Auto-Save) nicht dazwischenschreiben.
//   4. Vorher und nachher werden alle Tabellen gehasht - bei `setups` ohne die drei
//      Spalten, bei diesen drei nur die **übrigen** Zeilen. Sind sie nicht gleich,
//      Abbruch und Rollback.
//
// Die Zahlen stehen hier **einmal** (M6): derselbe Baustein liefert sie für den
// Trockenlauf, für das Schreiben und für `server/test/auslagen-daten.test.js`.

import crypto from 'node:crypto';

import { VILLAGERS, INITIAL } from './doerfler-daten.mjs';
import { STATS, TABLEAU_PREFIX, counterName, validateVillagers } from '../shared/villagers.js';
import { validateOptions } from '../shared/setupOptions.js';
import { validateScenarioData } from '../shared/scenarioData.js';
import { executeSequenceWithLog } from '../shared/sequenceExecutor.js';
import { findCardByName } from '../shared/cardSearch.js';

export const GAME_ID = '072123c0-cd97-4ffb-a330-369630fab93f';
export const SETUP_ID = 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b';

// ── Die Zahlen ───────────────────────────────────────────────────────────────

/** Die zwei Schalter (Spec M27.2). Neue Nachbarn ist **keiner**: es ist fester Bestandteil. */
export const OPTIONS = {
  partie: {
    label: 'Spiellänge', default: 'kurz',
    choices: {
      kurz: { label: 'Kurz (3-Runden-Modus)', vars: { Muenzen: '45' } },
      lang: { label: 'Lang (4 Runden)', vars: { Muenzen: '30' } },
    },
  },
  troedel: {
    label: 'Toller Trödel', default: 'mit',
    choices: {
      mit: { label: 'mit Toller Trödel', vars: { Nachschub: 'Toller Trödel: Nachschub (Nr. 1-30)' } },
      ohne: { label: 'ohne Toller Trödel', vars: { Nachschub: 'Nachschub' } },
    },
  },
};

/**
 * **Wohin der Rollenstapel kommt - gemessen, nicht geraten** (am gebauten Tisch der
 * Kurzpartie, 2026-11-07). Der Nachschubstapel liegt bei (1780, 640), 100 × 100 auf
 * dem Tisch (744 × 744 in den Rahmen 100 × 140). Eine Rollenkarte ist 825 × 1424,
 * also **81 × 140**. Rechts neben dem Nachschub liegt nach 70 Punkten die Zone
 * *Bösewicht-Tableau* (x ≥ 1900), links die Auslage mit dem Sideboard (x ≤ 1620):
 * dort ist für 81 Punkte kein Platz. **Darunter** ist die Spalte der Dauerstapel
 * (x 1730–1830) bis zur Heldentaten-Auslage (y ≥ 1100) frei.
 *
 *   Stapel (1780, 790) → Kasten 1739,5–1820,5 × 720–860
 *   Abstand: Nachschub 30 · Bösewicht-Tableau 79,5 · Besiegte Bösewichte 79,5 ·
 *            Sideboard 119,5 · Ablage 142,9 · Heldentaten-Auslage 240
 *   Überlappungen mit Zonen, Brettern, Zählern, Karten, Marken: **keine**
 *
 * `server/test/auslagen-daten.test.js` rechnet das gegen den echten Tisch nach.
 */
export const ROLLEN = { category: 'Toller Trödel: Rollen', label: 'Rollen', x: 1780, y: 790 };

/** Der Filter, den *Kampf beginnen* 17 bekommt: die Einzigartige Ausrüstung liegt in zwei Kategorien (28 + 33). */
export const SHERIFF_CATEGORIES = ['Einzigartige Ausrüstung', 'Einzigartige Ausrüstung (Neue Nachbarn)'];

const LEISTE = 'Bösewicht-Leiste';
const KURZ = { partie: 'kurz' };
const LANG = { partie: 'lang' };

// ── Hilfen ───────────────────────────────────────────────────────────────────

const sortKeys = (v) => {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map(k => [k, sortKeys(v[k])]));
  return v;
};
/** Gleichheit unabhängig von der Schlüsselreihenfolge. */
const canon = (v) => JSON.stringify(sortKeys(v));
/** Gleichheit **mit** Reihenfolge: das, was „Zeichen für Zeichen" meint. */
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const isObject = (x) => Boolean(x) && typeof x === 'object' && !Array.isArray(x);

// ── Die 39 Schritte, die seat_villager ersetzt ───────────────────────────────

/**
 * Was die hartverdrahtete Folge bis M26 trug, **aus den Dörferdaten abgeleitet** -
 * nicht noch einmal abgetippt. Jeder dieser Schritte muss in der Datenbank genau
 * so stehen, bevor er entfernt wird.
 *
 * Drei Spielsteine, drei Tableaus mit Sperre, zwölf Zähler, sechs Karten, zwölf
 * Marker (`docs/tasks-auslagen.md`, Befund 1).
 */
export function hardwiredSteps(villagers = VILLAGERS, lineup = INITIAL) {
  const out = [];
  lineup.forEach((name, i) => {
    const v = villagers.roster[name];
    const seat = villagers.seats[i];
    out.push({ type: 'place_asset', assetName: v.short, targetZoneLabel: villagers.barZone, faceDown: false });
    out.push({ type: 'place_asset', assetName: `${TABLEAU_PREFIX}${name}`, targetZoneLabel: '', faceDown: false, x: seat.tableau.x, y: seat.tableau.y });
    out.push({ type: 'lock_asset', assetName: `${TABLEAU_PREFIX}${name}` });
    for (const st of STATS) {
      const spot = seat.counters[st.key];
      out.push(st.life
        ? { type: 'place_counter', name: counterName(v, st.key), value: v.start[st.key], max: v.start[st.key], x: spot.x, y: spot.y }
        : { type: 'place_counter', name: counterName(v, st.key), value: v.start[st.key], x: spot.x, y: spot.y, base: v.start[st.key] });
    }
    for (const g of v.gear) {
      out.push({ type: 'place_card', cardName: g.card, targetZoneLabel: g.slot ? `${seat.zones}: ${g.slot}` : seat.vorrat });
    }
    for (const st of STATS) {
      out.push({ type: 'place_asset', assetName: `${seat.markers}: ${st.key}`, targetZoneLabel: `${seat.zones}: ${st.key}`, slot: v.start[st.key] });
    }
  });
  return out;
}

/** Die drei Schritte, die an ihre Stelle treten. */
export const seatSteps = (lineup = INITIAL) => lineup.map((villager, i) => ({ type: 'seat_villager', seat: i + 1, villager }));

// ── Die reine Umschreibung: sequence_data ────────────────────────────────────

const OLD_NACHSCHUB = ['Toller Trödel: Nachschub (Nr. 1-30)'];
const NEW_NACHSCHUB = ['$optNachschub'];
const NAMED_BOSSES = ['Bösewicht: Deputy Waggums', 'Bösewicht: Virginia Fitz', 'Bösewicht: The Bundits'];
const MARKER_KURZ = 'Kurzpartie: erste Runde überspringen';

/**
 * `sequence_data` → `sequence_data`. Gibt `{ next, changes, complaints }` zurück;
 * mit Beanstandungen ist `next` **nicht** zu schreiben. Ein zweiter Lauf auf dem
 * Ergebnis findet nichts mehr zu tun (`changes` ist leer).
 */
export function patchSequence(steps) {
  const complaints = [];
  const changes = [];
  let seq = Array.isArray(steps) ? steps.map(s => s) : [];

  // ── 1. Die Dörfler: 39 hartverdrahtete Schritte → drei seat_villager ──
  const want = hardwiredSteps();
  const wantSeats = seatSteps();
  const hasSeat = seq.some(s => s?.type === 'seat_villager');
  if (!hasSeat) {
    const used = new Set();
    for (const w of want) {
      const hits = seq.map((s, i) => [s, i]).filter(([s, i]) => !used.has(i) && canon(s) === canon(w));
      if (hits.length === 0) complaints.push(`Dörfler-Schritt fehlt oder weicht ab: ${JSON.stringify(w)}`);
      else used.add(hits[0][1]);
    }
    if (!complaints.length) {
      // Die drei treten an die Stelle des ersten entfernten Schritts. Davor liegt nur,
      // was bleibt - darum ist `first` auch die Stelle in der verkürzten Folge.
      const first = Math.min(...used);
      const kept = seq.filter((_, i) => !used.has(i));
      seq = [...kept.slice(0, first), ...wantSeats, ...kept.slice(first)];
      changes.push(`${used.size} Dörfler-Schritte → ${wantSeats.length} seat_villager (an Stelle ${first})`);
    }
  } else {
    // Schon umgestellt: genau die drei erwarteten, und kein hartverdrahteter Rest.
    const present = seq.filter(s => s?.type === 'seat_villager');
    if (!same(present, wantSeats)) complaints.push(`seat_villager-Schritte weichen ab: ${JSON.stringify(present)}`);
    for (const w of want) {
      if (seq.some(s => canon(s) === canon(w))) complaints.push(`hartverdrahteter Schritt neben seat_villager: ${JSON.stringify(w)}`);
    }
  }

  /** Der eine Schritt, der `pred` erfüllt - mehrere oder keiner ist eine Beanstandung. */
  const one = (pred, what) => {
    const hits = seq.map((s, i) => [s, i]).filter(([s]) => pred(s));
    if (hits.length !== 1) { complaints.push(`${what}: ${hits.length} Treffer statt einem`); return null; }
    return hits[0][1];
  };

  // ── 2. Nachschub: die Kategorie wird der Platzhalter ──
  const nachschub = one(s => s?.type === 'place_stack' && s?.label === 'Nachschub (Tante Emma)', 'place_stack „Nachschub (Tante Emma)"');
  if (nachschub !== null) {
    const cat = seq[nachschub].category;
    if (same(cat, OLD_NACHSCHUB)) {
      seq[nachschub] = { ...seq[nachschub], category: NEW_NACHSCHUB };
      changes.push('Nachschub: category → ["$optNachschub"]');
    } else if (!same(cat, NEW_NACHSCHUB)) {
      complaints.push(`Nachschub: category ist ${JSON.stringify(cat)}, erwartet ${JSON.stringify(OLD_NACHSCHUB)} oder ${JSON.stringify(NEW_NACHSCHUB)}`);
    }
  }

  // ── 3. Der Rollenstapel: neu, direkt hinter dem Nachschub, mit Gate ──
  const rollen = { type: 'place_stack', category: [ROLLEN.category], label: ROLLEN.label, x: ROLLEN.x, y: ROLLEN.y, faceDown: false, onlyChoice: { troedel: 'mit' } };
  const have = seq.map((s, i) => [s, i]).filter(([s]) => s?.type === 'place_stack' && s?.label === ROLLEN.label);
  if (have.length === 0) {
    const at = seq.findIndex(s => s?.type === 'place_stack' && s?.label === 'Nachschub (Tante Emma)');
    if (at >= 0) { seq.splice(at + 1, 0, rollen); changes.push('Rollenstapel neu (nur mit Toller Trödel)'); }
  } else if (have.length > 1 || !same(have[0][0], rollen)) {
    complaints.push(`Rollenstapel steht schon da und weicht ab: ${JSON.stringify(have.map(h => h[0]))}`);
  }

  // ── 4. Kurz: der Marker und die drei benannten Bösewichte tragen das Gate ──
  const gate = (name, pred, onlyChoice) => {
    const i = one(pred, name);
    if (i === null) return;
    const s = seq[i];
    if (s.onlyChoice === undefined) { seq[i] = { ...s, onlyChoice }; changes.push(`${name}: onlyChoice ${JSON.stringify(onlyChoice)}`); }
    else if (!same(s.onlyChoice, onlyChoice)) complaints.push(`${name}: onlyChoice ist ${JSON.stringify(s.onlyChoice)}, erwartet ${JSON.stringify(onlyChoice)}`);
  };
  gate(`Marker „${MARKER_KURZ}"`, s => s?.type === 'place_asset' && s?.assetName === MARKER_KURZ, KURZ);
  for (const b of NAMED_BOSSES) gate(b, s => s?.type === 'place_asset' && s?.assetName === b, KURZ);

  // ── 5. Lang: vier zufällige Bösewichte, direkt hinter den drei benannten ──
  const draw = { type: 'draw_assets', pool: 'Bösewichte', count: 4, targetZoneLabel: LEISTE, faceDown: true, onlyChoice: LANG };
  const haveDraw = seq.map((s, i) => [s, i]).filter(([s]) => s?.type === 'draw_assets' && s?.pool === 'Bösewichte');
  if (haveDraw.length === 0) {
    const at = seq.findIndex(s => s?.type === 'place_asset' && s?.assetName === NAMED_BOSSES[NAMED_BOSSES.length - 1]);
    if (at >= 0) { seq.splice(at + 1, 0, draw); changes.push('draw_assets „Bösewichte" ×4 neu (nur lang)'); }
  } else if (haveDraw.length > 1 || !same(haveDraw[0][0], draw)) {
    complaints.push(`draw_assets steht schon da und weicht ab: ${JSON.stringify(haveDraw.map(h => h[0]))}`);
  }

  // ── 6. Münzen: der Wert wird der Platzhalter ──
  const muenzen = one(s => s?.type === 'place_counter' && s?.name === 'Münzen (gemeinsam)', 'place_counter „Münzen (gemeinsam)"');
  if (muenzen !== null) {
    const v = seq[muenzen].value;
    if (v === 45) { seq[muenzen] = { ...seq[muenzen], value: '$optMuenzen' }; changes.push('Münzen: value → "$optMuenzen"'); }
    else if (v !== '$optMuenzen') complaints.push(`Münzen: value ist ${JSON.stringify(v)}, erwartet 45 oder "$optMuenzen"`);
  }

  return { next: seq, changes, complaints };
}

// ── Die reine Umschreibung: scenario_data ────────────────────────────────────

/**
 * `scenario_data` → `scenario_data`. **Ergänzt nur**: `options`, `villagers.barZone`,
 * `villagers.seats[].tableau` und `.counters`. Ein vorhandener, abweichender Wert
 * ist eine Beanstandung und wird nicht überschrieben.
 *
 * Neue Schlüssel stehen dort, wo sie in `VILLAGERS` stehen (`barZone` hinter
 * `fightZone`, `tableau`/`counters` am Ende des Platzes) - dann ist das Ergebnis
 * Zeichen für Zeichen das, was `doerfler-daten.mjs` schreiben würde, und dessen
 * zweiter Lauf ändert nichts (Befund 10).
 *
 * @returns {{ next: object, changes: string[], complaints: string[] }}
 */
export function patchScenario(scenario) {
  const complaints = [];
  const changes = [];
  const base = isObject(scenario) ? scenario : {};
  const next = { ...base };

  if (!('options' in base)) { next.options = OPTIONS; changes.push('options'); }
  else if (!same(base.options, OPTIONS)) complaints.push('scenario_data.options steht schon da und weicht ab');

  const v = base.villagers;
  if (!isObject(v) || !Array.isArray(v.seats)) {
    complaints.push('scenario_data.villagers fehlt - erst doerfler-daten.mjs');
    return { next, changes, complaints };
  }
  const villagers = {};
  for (const [k, val] of Object.entries(v)) {
    villagers[k] = val;
    if (k === 'fightZone' && !('barZone' in v)) { villagers.barZone = VILLAGERS.barZone; changes.push('villagers.barZone'); }
  }
  if (!('fightZone' in v) && !('barZone' in v)) { villagers.barZone = VILLAGERS.barZone; changes.push('villagers.barZone'); }
  if ('barZone' in v && v.barZone !== VILLAGERS.barZone) complaints.push(`villagers.barZone ist ${JSON.stringify(v.barZone)}, erwartet ${JSON.stringify(VILLAGERS.barZone)}`);

  villagers.seats = v.seats.map((seat, i) => {
    const want = VILLAGERS.seats[i];
    if (!want) { complaints.push(`Platz ${i + 1} gibt es in den Bausteinen nicht`); return seat; }
    const out = { ...seat };
    for (const key of ['tableau', 'counters']) {
      if (!(key in seat)) { out[key] = want[key]; changes.push(`villagers.seats[${i}].${key}`); }
      else if (!same(seat[key], want[key])) complaints.push(`villagers.seats[${i}].${key} steht schon da und weicht ab`);
    }
    // Was dem Platz schon gehörte, bleibt: derselbe Anker, dieselben Namen.
    for (const key of ['anchor', 'zones', 'markers', 'vorrat']) {
      if (seat[key] !== want[key]) complaints.push(`villagers.seats[${i}].${key} ist ${JSON.stringify(seat[key])}, erwartet ${JSON.stringify(want[key])}`);
    }
    return out;
  });
  next.villagers = villagers;
  return { next, changes, complaints };
}

/**
 * Was vorher da war, muss nachher **byteweise** da sein - `bosses`, `roster` und
 * jeder andere Schlüssel (`gridLabel`, `cardZoneLabel`). Neu dürfen nur die
 * Schlüssel sein, die `patchScenario` nennt.
 *
 * @returns {string[]} Beanstandungen
 */
export function beweiseScenarioUnveraendert(before, after) {
  const complaints = [];
  for (const k of Object.keys(before)) {
    if (k === 'villagers') continue;
    if (!same(before[k], after[k])) complaints.push(`Schlüssel „${k}" hat sich geändert`);
  }
  for (const k of Object.keys(after)) {
    if (!(k in before) && k !== 'options') complaints.push(`Schlüssel „${k}" ist dazugekommen`);
  }
  if (!same(before.bosses, after.bosses)) complaints.push('bosses ist nicht byteweise gleich');
  if (JSON.stringify(before.bosses ?? {}) !== JSON.stringify(after.bosses ?? {})) complaints.push('bosses: der Text hat sich geändert');
  const bv = before.villagers ?? {}, av = after.villagers ?? {};
  if (!same(bv.roster, av.roster)) complaints.push('villagers.roster ist nicht byteweise gleich');
  if (!same(bv.fightZone, av.fightZone)) complaints.push('villagers.fightZone hat sich geändert');
  (bv.seats ?? []).forEach((seat, i) => {
    for (const k of Object.keys(seat)) if (!same(seat[k], av.seats?.[i]?.[k])) complaints.push(`villagers.seats[${i}].${k} hat sich geändert`);
  });
  return complaints;
}

// ── Die reine Umschreibung: action_data (M27.5) ──────────────────────────────

/**
 * *Kampf beginnen* 17: `place_card "$SHERIFF"` bekommt `category`. Das ist die
 * **einzige** Stelle in M27, die `action_data` ändert. Angefasst wird nur ein
 * Schritt, der **genau** dem erwarteten gleicht.
 *
 * @returns {{ next: Array, changes: string[], complaints: string[] }}
 */
export function patchActions(actions) {
  const complaints = [];
  const changes = [];
  const list = Array.isArray(actions) ? actions : [];
  const aktion = list.find(a => a?.id === 'kampf-beginnen');
  const steps = Array.isArray(aktion?.steps) ? aktion.steps : [];
  const hits = steps.map((s, i) => [s, i]).filter(([s]) => s?.type === 'place_card' && s?.cardName === '$SHERIFF');
  if (hits.length !== 1) {
    complaints.push(`Kampf beginnen: ${hits.length} Schritte place_card "$SHERIFF" statt einem`);
    return { next: list, changes, complaints };
  }
  const [step, index] = hits[0];
  const old = { type: 'place_card', cardName: '$SHERIFF', targetZoneLabel: 'Terrain-Auslage', onlyFinal: true };
  let patched = step;
  if (step.category === undefined) {
    if (!same(step, old)) complaints.push(`Kampf beginnen ${index}: der Schritt weicht ab: ${JSON.stringify(step)}`);
    else { patched = { ...step, category: SHERIFF_CATEGORIES }; changes.push(`Kampf beginnen ${index}: category ${JSON.stringify(SHERIFF_CATEGORIES)}`); }
  } else if (!same(step, { ...old, category: SHERIFF_CATEGORIES })) {
    complaints.push(`Kampf beginnen ${index}: category steht schon da und weicht ab: ${JSON.stringify(step)}`);
  }
  const next = list.map(a => (a === aktion ? { ...a, steps: steps.map((s, i) => (i === index ? patched : s)) } : a));
  return { next, changes, complaints };
}

/** Was in `action_data` anders ist: die Aktionen und Schritte, die sich geändert haben. */
export function actionDiff(before, after) {
  const out = [];
  (Array.isArray(before) ? before : []).forEach((a, i) => {
    (a?.steps ?? []).forEach((s, k) => {
      if (!same(s, after?.[i]?.steps?.[k])) out.push(`${a.id} ${k}`);
    });
  });
  return out;
}

// ── Fingerabdruck der Datenbank ──────────────────────────────────────────────

const OUR_COLUMNS = ['sequence_data', 'scenario_data', 'action_data'];

/**
 * SHA-256 je Tabelle. Bei `setups` ohne die drei Spalten, die sich ändern dürfen,
 * und für diese drei nur die **übrigen** Zeilen (*Grundaufbau*, *Basis-Aufbau*).
 * Dazu je Zeile von `save_states` ein Hash - wer abweicht, wird beim Namen genannt.
 */
export function fingerprint(db) {
  const out = {};
  const tables = db.prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name").all();
  for (const { name } of tables) {
    let cols = db.prepare(`pragma table_info("${name}")`).all().map(c => c.name);
    if (name === 'setups') cols = cols.filter(c => !OUR_COLUMNS.includes(c));
    const h = crypto.createHash('sha256');
    for (const row of db.prepare(`select ${cols.map(c => `"${c}"`).join(', ')} from "${name}" order by rowid`).iterate()) {
      h.update(JSON.stringify(row)).update('\n');
    }
    out[name] = h.digest('hex').slice(0, 16);
  }
  const h = crypto.createHash('sha256');
  for (const row of db.prepare(`select ${OUR_COLUMNS.join(', ')} from setups where id <> ? order by rowid`).iterate(SETUP_ID)) {
    h.update(JSON.stringify(row)).update('\n');
  }
  out['setups(andere Zeilen, die drei Spalten)'] = h.digest('hex').slice(0, 16);
  return out;
}

/** Ein Hash je Zeile von `save_states` - Name und Stand, damit eine Abweichung kenntlich ist. */
export function saveStateHashes(db) {
  return Object.fromEntries(db.prepare('select * from save_states order by rowid').all().map(r => [
    r.id, { name: r.name, updated_at: r.updated_at, sha: crypto.createHash('sha256').update(JSON.stringify(r)).digest('hex').slice(0, 12) },
  ]));
}

// ── Durchrechnen: die vier Kombinationen mit der echten Maschinerie ──────────

/** Ein kleiner, wiederholbarer Zufall: gleiche Zahl → gleicher Lauf. */
export function seededRng(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const COMBINATIONS = [
  { partie: 'kurz', troedel: 'mit' }, { partie: 'kurz', troedel: 'ohne' },
  { partie: 'lang', troedel: 'mit' }, { partie: 'lang', troedel: 'ohne' },
];

/** Der Tisch ohne das, was bei jedem Lauf anders ist: Ids und ihre Listen. */
export function ohneIds(v) {
  if (Array.isArray(v)) return v.map(ohneIds);
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v)
      .filter(([k]) => !['id', 'tableId', 'stackId', 'table_ids'].includes(k))
      .map(([k, x]) => [k, ohneIds(x)]));
  }
  return v;
}

/** Den Aufbau mit der Wahl laufen lassen: `{ state, log }`. */
export function bauen({ state, sequence, zones, grids, assets, cards, scenarioData }, choices, seed = 1) {
  return executeSequenceWithLog(state, sequence, zones, { assets, cards, grids, scenarioData, rng: seededRng(seed), choices });
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

async function main(argv) {
  const [mode, dbPath] = argv;

  if (mode === '--json') {
    console.log(JSON.stringify({ options: OPTIONS, rollen: ROLLEN, sheriffCategories: SHERIFF_CATEGORIES, lineup: seatSteps(), hardwired: hardwiredSteps().length }, null, 1));
    return 0;
  }
  if (mode !== '--check' && mode !== '--write') {
    console.error('usage: auslagen-daten.mjs --json | --check <db> | --write <db>');
    return 2;
  }

  const { default: Database } = await import('better-sqlite3');
  const db = new Database(dbPath, { readonly: mode === '--check' });
  const complaints = [];

  // ── lesen: genau diese drei Spalten, als Text ──
  const row = db.prepare('select game_id, sequence_data, scenario_data, action_data, zone_data, grid_data, state_data from setups where id = ?').get(SETUP_ID);
  if (!row) { console.error(`Aufbau ${SETUP_ID} nicht gefunden`); return 1; }
  if (row.game_id !== GAME_ID) complaints.push(`Aufbau gehört zu Spiel ${row.game_id}, erwartet ${GAME_ID}`);
  const raw = Object.fromEntries(OUR_COLUMNS.map(c => [c, row[c]]));
  const before = Object.fromEntries(OUR_COLUMNS.map(c => [c, JSON.parse(raw[c])]));
  for (const c of OUR_COLUMNS) {
    // Byteweise Zusicherung braucht kompaktes JSON.stringify-Format.
    if (JSON.stringify(before[c]) !== raw[c]) complaints.push(`${c}: der gespeicherte Text ist nicht kompaktes JSON.stringify - byteweiser Vergleich nicht möglich`);
  }
  console.log(`gelesen: sequence_data ${before.sequence_data.length} Schritte (${raw.sequence_data.length} Zeichen, sha ${sha(raw.sequence_data)}), scenario_data ${raw.scenario_data.length} Zeichen (sha ${sha(raw.scenario_data)}), action_data ${before.action_data.length} Aktionen (${raw.action_data.length} Zeichen, sha ${sha(raw.action_data)})`);

  // ── Plan ──
  const seq = patchSequence(before.sequence_data);
  const sce = patchScenario(before.scenario_data);
  const act = patchActions(before.action_data);
  for (const [name, p] of [['sequence_data', seq], ['scenario_data', sce], ['action_data', act]]) {
    console.log(`${name}: ${p.changes.length} Änderungen${p.changes.length ? '' : ' (nichts zu tun)'}`);
    for (const c of p.changes) console.log('    + ' + c);
    for (const c of p.complaints) complaints.push(`${name}: ${c}`);
  }
  console.log(`  sequence_data: ${before.sequence_data.length} → ${seq.next.length} Schritte; action_data: Schritte geändert: ${actionDiff(before.action_data, act.next).join(', ') || '—'}`);

  // ── Beweise: was bleibt, bleibt ──
  for (const c of beweiseScenarioUnveraendert(before.scenario_data, sce.next)) complaints.push(`Unverändert-Beweis: ${c}`);
  if (!same(sce.next.villagers, VILLAGERS)) complaints.push('villagers ist nicht Zeichen für Zeichen die Konstante von doerfler-daten.mjs - deren zweiter Lauf würde etwas ändern');
  const geaendert = actionDiff(before.action_data, act.next);
  if (geaendert.length > 1 || (geaendert.length === 1 && geaendert[0] !== 'kampf-beginnen 17')) complaints.push(`action_data: ${geaendert.join(', ')} - erlaubt ist nur kampf-beginnen 17`);
  // Ein zweiter Lauf auf dem Ergebnis findet nichts mehr zu tun.
  const again = [patchSequence(seq.next), patchScenario(sce.next), patchActions(act.next)];
  if (again.some(p => p.changes.length || p.complaints.length)) complaints.push('ein zweiter Lauf fände noch etwas zu tun - das Skript ist nicht idempotent');

  // ── Gegen die echte Bibliothek ──
  const gameId = row.game_id;
  const assets = db.prepare('select t.id, t.name, t.type, t.width, t.height, t.image_path, t.back_image_path, (select name from categories where id = t.category_id) as category from table_assets t where t.game_id = ?').all(gameId);
  const cards = db.prepare('select c.id, c.name, c.image_path, c.width, c.height, c.card_back_id, (select name from categories where id = c.category_id) as category from cards c where c.game_id = ?').all(gameId);
  const zones = JSON.parse(row.zone_data), grids = JSON.parse(row.grid_data);
  for (const p of validateOptions(sce.next.options, seq.next, act.next)) complaints.push(`validateOptions: ${p}`);
  for (const p of validateVillagers(sce.next.villagers, { assets, cards, zones })) complaints.push(`validateVillagers: ${p}`);
  const sd = validateScenarioData(sce.next, { assets, grids });
  for (const p of sd) complaints.push(`validateScenarioData: ${p}`);
  console.log(`validateOptions / validateVillagers / validateScenarioData: ${complaints.filter(c => /^validate/.test(c)).length} Probleme (${assets.length} Assets, ${cards.length} Karten, ${zones.length} Zonen)`);

  // Der Pool, aus dem „lang" zieht, hat Szenariodaten für **jeden**: zwanzig von zwanzig.
  const pool = assets.filter(a => a.category === 'Bösewichte').map(a => a.name.replace(/^Bösewicht: /, ''));
  const ohneDaten = pool.filter(n => !(n in (sce.next.bosses ?? {})));
  console.log(`Pool „Bösewichte": ${pool.length} Assets, ohne Szenariodaten: ${ohneDaten.length}`);
  if (ohneDaten.length) complaints.push(`Pool „Bösewichte": ohne Szenariodaten: ${ohneDaten.join(', ')}`);

  // ── Durchrechnen: vier Kombinationen, Protokoll leer; kurz/mit = heute + Rollenstapel ──
  const env = { state: row.state_data, zones, grids, assets, cards };
  const alt = bauen({ ...env, sequence: before.sequence_data, scenarioData: before.scenario_data }, undefined, 1);
  console.log(`alter Aufbau (heutige Daten): ${alt.log.filter(e => e.status !== 'ok').length} Zeilen ohne ok`);
  for (const choices of COMBINATIONS) {
    const r = bauen({ ...env, sequence: seq.next, scenarioData: sce.next }, choices, 1);
    const schlecht = r.log.filter(e => e.status !== 'ok');
    const n = (r.state.stacks.find(s => s.label === 'Nachschub (Tante Emma)') || { cards: [] }).cards.length;
    const rollen = r.state.stacks.filter(s => s.label === ROLLEN.label).length;
    const muenzen = r.state.counters.find(c => c.name === 'Münzen (gemeinsam)')?.value;
    const stones = r.state.tokens.filter(t => /^Bösewicht: |^Kurzpartie/.test(t.label ?? '')).length;
    console.log(`  ${choices.partie}/${choices.troedel}: ${r.log.length} Zeilen, ohne ok: ${schlecht.length}; Nachschub ${n} Karten, Rollen ${rollen}, Münzen ${muenzen}, Leiste ${stones} Objekte`);
    for (const e of schlecht) complaints.push(`${choices.partie}/${choices.troedel}: Schritt ${e.index} ${e.type} ${e.status}: ${e.reason}`);
    if (choices.partie === 'kurz' && choices.troedel === 'mit') {
      // Gleichwertigkeit: derselbe Tisch wie vor M27 - bis auf den Rollenstapel, der neu ist.
      const ohneRollen = { ...r.state, stacks: r.state.stacks.filter(s => s.label !== ROLLEN.label) };
      const key = (o) => `${o.assetId ?? o.cardId ?? o.name ?? o.label ?? ''}|${o.x}|${o.y}`;
      const fl = (s) => Object.fromEntries(Object.keys(s).sort().map(k => [k, Array.isArray(s[k]) ? ohneIds(s[k]).sort((a, b) => key(a).localeCompare(key(b))) : ohneIds(s[k])]));
      if (!same(fl(alt.state), fl(ohneRollen))) complaints.push('kurz/mit baut nicht denselben Tisch wie der Aufbau vor M27 (ohne den neuen Rollenstapel)');
      else console.log('    kurz/mit = der Tisch von vor M27, ohne den neuen Rollenstapel: gleich (Objekte, Zähler, Stapelinhalt)');
    }
  }

  // ── Sheriff-Karte gegen die Bibliothek (M27.5) ──
  const sheriffPool = cards.filter(c => SHERIFF_CATEGORIES.includes(c.category));
  const tp = findCardByName(sheriffPool, 'TRILLERPFEIFE');
  console.log(`TRILLERPFEIFE in ${SHERIFF_CATEGORIES.length} Kategorien: ${tp.card ? `eindeutig (${tp.card.category})` : tp.reason}`);
  if (!tp.card) complaints.push(`TRILLERPFEIFE bleibt mehrdeutig: ${tp.reason}`);

  console.log(`${mode === '--check' ? 'Trockenlauf' : 'Vorprüfung'}: ${complaints.length} Beanstandungen`);
  for (const c of complaints) console.log('  - ' + c);
  if (complaints.length) return 1;
  const nichts = !seq.changes.length && !sce.changes.length && !act.changes.length;
  if (nichts) { console.log('nichts zu schreiben (alles schon da und gleich)'); return 0; }
  if (mode === '--check') return 0;

  // ── Schreiben: eine Transaktion, IMMEDIATE, Vergleich-und-Tausch je Spalte ──
  const neu = { sequence_data: JSON.stringify(seq.next), scenario_data: JSON.stringify(sce.next), action_data: JSON.stringify(act.next) };
  const write = db.transaction(() => {
    const vorher = fingerprint(db);
    const r = db.prepare(`update setups set sequence_data = ?, scenario_data = ?, action_data = ?
      where id = ? and sequence_data = ? and scenario_data = ? and action_data = ?`)
      .run(neu.sequence_data, neu.scenario_data, neu.action_data, SETUP_ID, raw.sequence_data, raw.scenario_data, raw.action_data);
    if (r.changes !== 1) throw new Error('eine der Spalten hat sich seit dem Lesen geändert - nichts geschrieben');
    const nachher = fingerprint(db);
    if (!same(vorher, nachher)) {
      const diff = Object.keys(vorher).filter(t => vorher[t] !== nachher[t]);
      throw new Error(`unerwartet geändert: ${diff.join(', ')} - Rollback`);
    }
    return { vorher, nachher };
  });
  const saveVorher = saveStateHashes(db);
  const { vorher } = write.immediate();

  // ── Kontrollausgabe: neu gelesen, nicht aus dem Plan ──
  const gelesen = db.prepare('select sequence_data, scenario_data, action_data from setups where id = ?').get(SETUP_ID);
  const after = Object.fromEntries(OUR_COLUMNS.map(c => [c, JSON.parse(gelesen[c])]));
  for (const c of OUR_COLUMNS) console.log(`geschrieben: ${c} ${raw[c].length} → ${gelesen[c].length} Zeichen, sha ${sha(raw[c])} → ${sha(gelesen[c])}`);
  console.log(`  sequence_data: ${after.sequence_data.length} Schritte, seat_villager: ${after.sequence_data.filter(s => s.type === 'seat_villager').length}, mit onlyChoice: ${after.sequence_data.filter(s => s.onlyChoice).length}`);
  console.log(`  scenario_data: Schlüssel ${Object.keys(after.scenario_data).join(', ')}`);
  console.log(`    bosses byteweise gleich: ${JSON.stringify(after.scenario_data.bosses) === JSON.stringify(before.scenario_data.bosses)} (${Object.keys(after.scenario_data.bosses).length} Einträge, sha ${sha(JSON.stringify(before.scenario_data.bosses))} → ${sha(JSON.stringify(after.scenario_data.bosses))})`);
  console.log(`    villagers.roster byteweise gleich: ${JSON.stringify(after.scenario_data.villagers.roster) === JSON.stringify(before.scenario_data.villagers.roster)} (sha ${sha(JSON.stringify(before.scenario_data.villagers.roster))} → ${sha(JSON.stringify(after.scenario_data.villagers.roster))})`);
  for (const k of Object.keys(before.scenario_data).filter(x => !['bosses', 'villagers'].includes(x))) {
    console.log(`    Schlüssel ${k.padEnd(14)} gleich: ${same(before.scenario_data[k], after.scenario_data[k])}`);
  }
  console.log(`  action_data: Schritte geändert: ${actionDiff(before.action_data, after.action_data).join(', ') || '—'}`);
  const fp = fingerprint(db);
  console.log(`  Fingerabdruck aller Tabellen (setups ohne die drei Spalten, save_states, zone_data, grid_data, state_data) unverändert: ${same(vorher, fp)}`);
  const saveNachher = saveStateHashes(db);
  const abweichend = Object.keys(saveVorher).filter(id => saveVorher[id].sha !== saveNachher[id]?.sha);
  console.log(`  save_states: ${Object.keys(saveNachher).length} Zeilen (vorher ${Object.keys(saveVorher).length}), abweichend zwischen Lesen und Schreiben: ${abweichend.length ? abweichend.map(id => `${saveVorher[id].name} (${saveVorher[id].updated_at} → ${saveNachher[id]?.updated_at})`).join('; ') : 'keine'}`);
  console.log(`  Spalten der Zeile, die nicht geschrieben wurden: zone_data ${sha(row.zone_data)}, grid_data ${sha(row.grid_data)}, state_data ${sha(row.state_data)}`);
  const check = db.prepare('select zone_data, grid_data, state_data from setups where id = ?').get(SETUP_ID);
  console.log(`    jetzt: zone_data ${sha(check.zone_data)}, grid_data ${sha(check.grid_data)}, state_data ${sha(check.state_data)}`);
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('auslagen-daten.mjs')) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, err => { console.error(err); process.exitCode = 1; });
}
