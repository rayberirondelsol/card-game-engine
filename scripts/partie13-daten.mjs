// BX–CB / Spec M23 — die Datenänderungen der dreizehnten Partie für den Aufbau
// *TFT Kurzpartie*.
//
// Drei verschiedene Spalten, ein Schalter: `zone_data` (CB, sechs neue Zonen),
// `sequence_data` (BY, die sechs Startausrüstungs-Ziele; CA, die drei
// Lebenszähler) und `action_data` (BZ, „Laden nachfüllen"). Hier stehen die
// Zahlen **einmal** (M6): derselbe Baustein liefert sie für den Trockenlauf,
// für das Schreiben und für `server/test/partie13-daten.test.js`. Begründung,
// Messwerte und die verworfenen Varianten stehen in `docs/tasks-partie13.md`.
//
// Aufruf (im Backend-Container, wo `better-sqlite3` liegt):
//
//   node scripts/partie13-daten.mjs --json            # was geschrieben würde
//   node scripts/partie13-daten.mjs --check <db-pfad> # Trockenlauf
//   node scripts/partie13-daten.mjs --write <db-pfad> # eine Transaktion
//
// Gelesen und geschrieben werden **nur die drei Spalten**, und jede einzeln.
// Wer die ganze Zeile zurückschreibt, überschreibt `state_data`, `grid_data`
// und `scenario_data` fremder Aufträge.

import { SETUP_ID, DOERFLER, BAND } from './equipment-zones.mjs';

export { SETUP_ID };

// ── CB: sechs neue Zonen ─────────────────────────────────────────────────────

/**
 * **Eine vierte Reihe unter dem M18-Streifen**, nicht neben dem Tableau.
 *
 * Der erste Versuch zielte auf den Streifen zwischen Tableau (x 150…450) und
 * Zählerspalte (`place_counter` x 580). Er ist nicht 130 Punkte breit, sondern
 * **60**: ein Zähler wird mit `left: x − 70` gezeichnet (am laufenden Tisch
 * nachgemessen), die Spalte liegt also auf 510…681 und nicht auf 580…749.
 * In das Feld eines Dörflers passt damit neben Tableau, Zählern und den drei
 * Ausrüstungsreihen **keine** kartengroße Zone mehr — M18 hat es wirklich voll
 * gemacht.
 *
 * Die Reihen aus M18 enden bei y 2272 (`BAND.top` + dreimal Reihe + Lücke).
 * Eine vierte Reihe darunter ist 580 Punkte breit und nimmt **zwei** Zonen
 * nebeneinander, jede 280 breit — bequem für eine 100 Punkte breite Karte und
 * breit genug für ihr Namensschild (`ZONE_LABEL_WIDTH` ist 120).
 */
const ANCHOR_W = 300;
const ANCHOR_H = 400;
export const STRIP = { cardHeight: 140, gap: 22, width: 280, column: 300 };

// Dieselbe Reihenhöhe und dieselbe Lücke wie in M18: ohne die Lücke setzt
// `zoneLabelAbove` das Schild der neuen Reihe auf die Karten des Vorrats
// darüber (der Fehler aus M16.1).
const ROW_TOP = BAND.top - 1400 + 3 * (STRIP.cardHeight + STRIP.gap);
const rowY = ROW_TOP / ANCHOR_H;
const relH = STRIP.cardHeight / ANCHOR_H;
const relW = STRIP.width / ANCHOR_W;

/**
 * Zwei Zonen je Dörfler, beide Ablagestapel ohne Obergrenze.
 *
 * `Erfüllte Heldentaten` (gelb) gehören **einem** Dörfler und überdauern jede
 * Dorfphase (§5.1, §8.2 — Sheriffwahl); eine gemeinsame Zone verlöre die
 * Zuordnung. `Ausliegend` (violett) nimmt geheime Dorf-Ereignisse (§5.2), die
 * beim Ziehenden bleiben, bis ihre Bedingung eintritt.
 *
 * `layout: "stack"` statt fester Plätze: Partie 13 hat bis zu drei erfüllte
 * Heldentaten je Dörfler erzeugt, und `[BR]` nennt keine Obergrenze — dieselbe
 * Begründung wie beim Vorrat (BV/M21.4). Gelesen wird über `Browse`.
 *
 * Warum **keine** Zone für ausliegende Bösewicht-Aktionen und für „seltsame"
 * Ausrüstung: `docs/tasks-partie13.md`, Aufgabe CB.
 */
const ROWS = [
  { key: 'heldentaten', name: 'Erfüllte Heldentaten', relX: 0, color: 'yellow' },
  { key: 'ausliegend', name: 'Ausliegend', relX: STRIP.column / ANCHOR_W, color: 'purple' },
];

export function extraZones() {
  const out = [];
  for (const d of DOERFLER) {
    for (const r of ROWS) {
      out.push({
        id: `z${r.key}${d.n}`,
        label: `Dörfler ${d.n}: ${r.name}`,
        shape: 'rect', type: 'shared', color: r.color,
        accepts: ['card'], capacity: null, layout: 'stack',
        snap: true, exclusive: false,
        startingHandCardIds: [], dealStackId: null, dealCount: 0,
        anchor: { assetId: d.assetId, relX: r.relX, relY: rowY, relWidth: relW, relHeight: relH },
      });
    }
  }
  return out;
}

/**
 * Die Nachbarkästen, wie sie in `zone_data` stehen — nur für den Test, damit
 * „überlappt nichts" gegen die echte Nachbarschaft läuft und nicht gegen sich
 * selbst. Die drei nächsten in y-Richtung plus die Auslage rechts oben.
 */
export const MEASURED_NEIGHBOURS = [
  { label: 'Hand Dörfler 1', x: 150, y: 1140, width: 360, height: 170 },
  { label: 'Hand Dörfler 2', x: 560, y: 1140, width: 360, height: 170 },
  { label: 'Hand Dörfler 3', x: 970, y: 1140, width: 360, height: 170 },
  { label: 'Heldentaten-Auslage', x: 1360, y: 1100, width: 360, height: 240 },
];

// ── BY: wohin die Startausrüstung gehört ─────────────────────────────────────

/**
 * Kartenname → Slot-Zone, abgelesen von der Zeile unter dem Namen auf den sechs
 * Kartenbildern (`/uploads/072123c0-…/`), nicht geraten:
 *
 *   BAUERNLATZHOSE  „Beine"                        ROSTIGE SICHEL  „1-Hand, Waffe …"
 *   KÜHL-PACK       „Brust"                        GEFRIERFACHTÜR  „2-Hand, Waffe …"
 *   OMMAS GEHSTOCK  „1-Hand, Waffe …"              DAS ALTE EISEN  „1-Hand, Waffe …"
 *
 * Keine der sechs trägt eine schwarz markierte Wertveränderung `[DE S.35]`, die
 * Zähler bleiben deshalb unberührt (docs/tasks-partie13.md, „Wo die Spec nicht
 * stimmt", 2).
 */
export const CARD_SLOTS = {
  'BAUERNLATZHOSE': 'Dörfler 1: Beine',
  'ROSTIGE SICHEL': 'Dörfler 1: Hände',
  'GEFRIERFACHTÜR': 'Dörfler 2: Hände',
  'KÜHL-PACK': 'Dörfler 2: Brust',
  'OMMAS GEHSTOCK': 'Dörfler 3: Hände',
  'DAS ALTE EISEN': 'Dörfler 3: Hände',
};

// ── CA: wohin die Lebenszähler gehören ───────────────────────────────────────

/**
 * Die beiden Bretter, wie die Sequenz sie auslegt (`place_asset`, Mitte/Größe):
 * `Hauptplan` 700/560 à 1200 × 1000, `Sideboard` 1470/560 à 300 × 999.
 */
export const HAUPTPLAN = { x: 100, y: 60, width: 1200, height: 1000 };
export const SIDEBOARD = { x: 1320, y: 60.5, width: 300, height: 999 };
/**
 * Der Kasten eines Zählers in Weltpunkten, am laufenden Tisch nachgemessen:
 * gezeichnet wird mit `left: x − 70`, `top: y − 40`, und der breiteste Zähler
 * (ein zweizeiliger Lebenszähler) ist 185 × 102 groß. **`x`/`y` sind nicht die
 * obere linke Ecke** — der erste Entwurf hat das angenommen und die Zonen
 * neben dem Tableau 70 Punkte zu weit links gerechnet.
 */
export const COUNTER_SIZE = { width: 185, height: 102, offsetX: -70, offsetY: -40 };
export const counterBox = (c) => ({
  x: c.x + COUNTER_SIZE.offsetX, y: c.y + COUNTER_SIZE.offsetY,
  width: COUNTER_SIZE.width, height: COUNTER_SIZE.height,
});

/**
 * Eine Reihe **über** dem Schlachtfeld, außerhalb beider Bretter.
 *
 * Die Stelle, die der Spieler in Partie 13 selbst gewählt hat (die linke Spalte
 * des Zusatz-Bretts), ist am frischen Aufbau **nicht** frei: dort liegen in der
 * Dorfphase die zehn Karten der `Nachschub-Auslage`, und zwei der drei Zähler
 * verschwanden darunter (am laufenden Tisch mit `elementFromPoint` nachgesehen).
 * Sie war frei, weil er sie **im Kampf** gewählt hat, wo das Brett die andere
 * Seite zeigt.
 *
 * Über dem Hauptplan liegt nichts und kann nichts liegen: es gibt keine
 * Weltgrenze und keinen oberen Brettrand (`zoneLabelAbove` in
 * `shared/zoneGeometry.js` begründet dasselbe für Zonenschilder). Die Reihe ist
 * damit in **beiden** Phasen sichtbar — und 903 Weltpunkte vom oberen
 * Zählerrand bis zur Rasterunterkante passen sogar bei Spielzoom 0,62 noch ins
 * Band (560 von 567 Bildpunkten).
 */
export const LIFE_COUNTERS = {
  'Henlo: Leben': { x: 360, y: -110 },
  'Fridgette: Leben': { x: 700, y: -110 },
  'Granny: Leben': { x: 1040, y: -110 },
};

/** Das Raster `gmain`, gegen das „gleichzeitig im Bild" gerechnet wird. */
export const GRID_BOX = { x: 321, y: 93, width: 950, height: 700 };
/**
 * Das nutzbare Band zwischen Kopf- und Werkzeugleiste bei 932 × 742, gemessen
 * wie in `equipment-zones.mjs` (`BAND.bottom`): Fensterhöhe minus Kopfleiste
 * und Werkzeugleiste.
 */
export const VIEWPORT = { width: 932, height: 567 };

// ── BZ: der Laden füllt sich in einem Griff nach ─────────────────────────────

/**
 * Buchstabengleich mit Schritt 32 von „Dorfphase beginnen" — dort läuft er
 * **einmal** zu Beginn der Phase, §4 Schritt 3 verlangt ihn nach **jedem** Kauf.
 * `fill: true` zieht ab, was schon liegt (M11.2): eine volle Auslage bleibt
 * unberührt und meldet nichts. Zeigt das Zusatz-Brett die Kampfseite, ist die
 * Zone abgewandt und der Schritt meldet sich als übersprungen.
 */
export const SHOP_ACTION = {
  id: 'laden-nachfuellen',
  label: 'Laden nachfüllen',
  steps: [{
    type: 'deal_to_zone',
    stackLabel: 'Nachschub (Tante Emma)',
    count: 10,
    targetZoneLabel: 'Nachschub-Auslage',
    faceDown: false,
    fill: true,
  }],
};

// ── Die drei Umschreibungen, als reine Funktionen ────────────────────────────

/** BY + CA: dieselbe Sequenz mit neuen Zielen und neuen Zählerstellen. */
export function patchSequence(steps) {
  return (Array.isArray(steps) ? steps : []).map(s => {
    if (s?.type === 'place_card' && CARD_SLOTS[s.cardName]) {
      return { ...s, targetZoneLabel: CARD_SLOTS[s.cardName] };
    }
    if (s?.type === 'place_counter' && LIFE_COUNTERS[s.name]) {
      return { ...s, ...LIFE_COUNTERS[s.name] };
    }
    return s;
  });
}

/** BZ: die Aktion hinter „Dorfereignis ziehen", und nur einmal. */
export function patchActions(actions) {
  const list = Array.isArray(actions) ? actions : [];
  if (list.some(a => a?.id === SHOP_ACTION.id)) return list;
  const after = list.findIndex(a => a?.id === 'dorfereignis');
  const at = after < 0 ? list.length : after + 1;
  return [...list.slice(0, at), SHOP_ACTION, ...list.slice(at)];
}

/**
 * CB: die sechs Zonen hinten dran, und jede nur einmal — eine schon vorhandene
 * wird **ersetzt**, nicht ein zweites Mal angehängt. Zwei Zonen mit derselben
 * Id wären zwei Antworten auf „wo liegt das", und ein zweiter Lauf mit
 * geänderten Zahlen fände sonst nichts zu tun.
 */
export function patchZones(zones) {
  const list = Array.isArray(zones) ? zones : [];
  const neu = new Map(extraZones().map(z => [z.id, z]));
  const ersetzt = list.map(z => neu.get(z?.id) || z);
  const vorhanden = new Set(list.map(z => z?.id));
  return [...ersetzt, ...[...neu.values()].filter(z => !vorhanden.has(z.id))];
}

// ── CLI ──────────────────────────────────────────────────────────────────────

const COLUMNS = [
  ['sequence_data', patchSequence, 'Schritte'],
  ['action_data', patchActions, 'Aktionen'],
  ['zone_data', patchZones, 'Zonen'],
];

async function main(argv) {
  const [mode, dbPath] = argv;

  if (mode === '--json') {
    console.log(JSON.stringify({
      zones: extraZones(), cardSlots: CARD_SLOTS,
      lifeCounters: LIFE_COUNTERS, action: SHOP_ACTION,
    }, null, 1));
    return 0;
  }
  if (mode !== '--check' && mode !== '--write') {
    console.error('usage: partie13-daten.mjs --json | --check <db> | --write <db>');
    return 2;
  }

  const { default: Database } = await import('better-sqlite3');
  const db = new Database(dbPath, { readonly: mode === '--check' });
  const read = (col) => JSON.parse(db.prepare(`select ${col} from setups where id = ?`).get(SETUP_ID)[col]);
  const complaints = [];
  const plan = [];

  // Gezählt wird als **Menge**, nicht nach Position: eine eingefügte Aktion
  // verschiebt alle Nachbarn, und ein Vergleich `after[i]` gegen `before[i]`
  // meldete sie alle als geändert. Gefragt ist: welcher Eintrag von vorher
  // steht nachher nicht mehr Zeichen für Zeichen da (`weg`), und welcher ist
  // dazugekommen (`neu`).
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
  const kurz = (s) => (s.length > 200 ? s.slice(0, 200) + ' …' : s);

  for (const [col, patch, unit] of COLUMNS) {
    const before = read(col);
    const after = patch(before);
    const { weg, neu } = diff(before, after);
    plan.push({ col, unit, before: before.length, after: after.length, weg: weg.length, neu: neu.length, wegRoh: weg, next: after });
    console.log(`${col}: ${before.length} → ${after.length} ${unit}, ${weg.length} ersetzt, ${neu.length} neu/geändert`);
    for (const n of neu) console.log('    + ' + kurz(n));
  }

  // Die Schranken sind Obergrenzen, keine Sollwerte: ein zweiter Lauf findet
  // alles schon vor und darf nichts mehr melden. Eine Vorprüfung, die gegen
  // den Stand **vor** der eigenen Änderung vergleicht, beanstandet beim
  // zweiten Mal sich selbst (dieselbe Falle wie `CURRENT_VORRAT` in
  // equipment-zones.mjs).
  const seq = plan.find(p => p.col === 'sequence_data');
  if (seq.after !== seq.before) complaints.push('sequence_data: es darf kein Schritt dazukommen');
  if (seq.weg > 9 || seq.neu !== seq.weg) complaints.push(`sequence_data: höchstens 9 ersetzte Schritte, gefunden ${seq.weg}/${seq.neu}`);
  const act = plan.find(p => p.col === 'action_data');
  if (act.weg !== 0 || act.neu > 1) complaints.push(`action_data: höchstens eine neue Aktion, gefunden ${act.neu} neu / ${act.weg} ersetzt`);
  const zon = plan.find(p => p.col === 'zone_data');
  if (zon.neu > 6) complaints.push(`zone_data: höchstens sechs neue Zonen, gefunden ${zon.neu}`);
  // Verschwinden darf nur eine, die diesem Lauf gehört (ein zweiter Lauf mit
  // geänderten Zahlen ersetzt seine eigenen sechs).
  const unsere = new Set(extraZones().map(z => z.id));
  for (const j of zon.wegRoh) {
    const id = JSON.parse(j)?.id;
    if (!unsere.has(id)) complaints.push(`zone_data: fremde Zone "${id}" würde verschwinden`);
  }
  if (new Set(zon.next.map(z => z.label)).size !== zon.next.length) complaints.push('zwei Zonen tragen denselben Namen');
  const labels = new Set(zon.next.map(z => z.label));
  for (const [card, zone] of Object.entries(CARD_SLOTS)) {
    if (!labels.has(zone)) complaints.push(`${card}: Zone "${zone}" gibt es nicht`);
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

  // Kontrollausgabe
  const zones = read('zone_data');
  const steps = read('sequence_data');
  const actions = read('action_data');
  console.log(`geschrieben: ${zones.length} Zonen, ${steps.length} Schritte, ${actions.length} Aktionen`);
  for (const z of zones.filter(q => /: (Erfüllte Heldentaten|Ausliegend)$/.test(q.label))) {
    console.log(`  ${z.label}: relY ${z.anchor.relY} relWidth ${z.anchor.relWidth} layout ${z.layout}`);
  }
  for (const s of steps.filter(q => q.type === 'place_card')) {
    console.log(`  ${s.cardName} → ${s.targetZoneLabel}`);
  }
  for (const s of steps.filter(q => q.type === 'place_counter' && LIFE_COUNTERS[q.name])) {
    console.log(`  ${s.name} @ ${s.x},${s.y}`);
  }
  console.log('  Aktionen: ' + actions.map(a => a.label).join(' | '));
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('partie13-daten.mjs')) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; });
}
