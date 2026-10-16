// BH / Spec M18 — „Angelegt" und „weggepackt": fünf Slot-Zonen je Dörfler und
// der Vorrat darunter, für den Aufbau *TFT Kurzpartie*.
//
// Hier stehen die Zahlen **einmal** (M6): derselbe Baustein liefert die Zonen
// für den Trockenlauf, für das Schreiben und für `server/test/
// equipment-zones.test.js`. Begründung der Aufteilung, die Messwerte und die
// fünf verworfenen Varianten stehen in `docs/tasks-ausruestung.md`.
//
// Aufruf (im Backend-Container, wo `better-sqlite3` liegt):
//
//   node scripts/equipment-zones.mjs --json            # die achtzehn Zonen
//   node scripts/equipment-zones.mjs --check <db-pfad> # Trockenlauf
//   node scripts/equipment-zones.mjs --write <db-pfad> # eine Transaktion
//
// Gelesen und geschrieben wird **nur `zone_data`**. Wer die ganze Zeile liest
// und zurückschreibt, überschreibt `scenario_data` und `action_data` fremder
// Aufträge.

export const SETUP_ID = 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b';

/** Die drei Dörfler-Tableaus: Anker der Zonen, 300 × 400 Weltpunkte. */
export const DOERFLER = [
  { n: 1, assetId: '98e26309-d1d5-432c-b2ea-26289f26fb75' }, // Henlo Bulwark
  { n: 2, assetId: 'd4691079-bd86-496a-a49b-c6b7a317c2d9' }, // Fridgette Jones
  { n: 3, assetId: 'bad13f49-c614-4551-9e81-fe8603dbf09a' }, // Granny Melba
];

/**
 * Die Ankerkästen, wie sie am laufenden Tisch stehen (Mitten 300/880/1460 bei
 * y 1600, 300 × 400). Nur für den Test — die Daten selbst sind relativ und
 * wandern mit dem Tableau mit.
 */
export const MEASURED_ANCHORS = DOERFLER.map((d, i) => ({
  id: d.assetId, x: 150 + i * 580, y: 1400, width: 300, height: 400,
}));

/**
 * Die Grenzen des Streifens, gemessen, nicht geschätzt.
 *
 * `pitch` ist der Abstand der drei Tableaus von Mitte zu Mitte — die Breite,
 * ab der eine Zone in das Feld des Nachbarn ragt.
 * `top` liegt 8 Punkte unter der Tableau-Unterkante (so lag die Zone schon).
 * `bottom` ist die Oberkante der Werkzeugleiste in Weltkoordinaten bei der
 * gespeicherten Ansicht „Dörfler" (Mitte 1149,5/1675, Zoom 0,41, Fenster
 * 932 × 738): 1675 + (637 − 369) / 0,41.
 */
export const BAND = {
  pitch: 580,
  top: 1808,
  bottom: 2329,
  card: { width: 100, height: 140 },
};

const ANCHOR_W = 300;
const ANCHOR_H = 400;
const TOP = BAND.top - 1400;        // 408 Punkte unter der Tableau-Oberkante
const ROW_H = BAND.card.height;     // eine Karte hoch, keinen Punkt mehr
// Luft für die Schilder der tieferen Reihen. `ZONE_LABEL_HEIGHT` ist 21;
// ohne diese Lücke läge über Reihe B eine Zone **und** unter ihr eine, und
// `zoneLabelAbove` setzte das Schild auf die Karten der Reihe darüber — der
// Fehler, den M16.1 behoben hat, eine Etage tiefer.
const GAP = 22;

const relW = BAND.pitch / ANCHOR_W;        // 1,9333… — unverändert aus AS2
const third = relW / 3;                    // 193,33 Weltpunkte: 100 Karte + Rand
// Die rechte Spalte endet **auf** `relW` statt auf `3 × third`: ein Drittel
// von 1,9333… rundet nach oben, und drei davon ragten um 1e-13 Weltpunkte in
// das Feld des Nachbarn. Zu wenig, um es zu sehen — genug, um `zoneAt` dort
// die falsche Zone finden zu lassen.
const lastCol = relW - 2 * third;
const relH = ROW_H / ANCHOR_H;             // 0,35
const rowA = TOP / ANCHOR_H;               // 1,02
const rowB = (TOP + ROW_H + GAP) / ANCHOR_H;
const rowV = (TOP + 2 * (ROW_H + GAP)) / ANCHOR_H;

/**
 * Die fünf Slots, in Leserichtung: Kopf, Brust, Beine über Hände,
 * Mitbringsel. `Hände` ist **eine** Zone mit zwei Plätzen — zwei Zonen à
 * einem Platz könnten keine Zweihandwaffe aufnehmen, und Zonen dürfen
 * einander nicht überlappen (M16).
 */
const SLOTS = [
  { key: 'kopf', name: 'Kopf', relX: 0, relY: rowA, relWidth: third, capacity: 1 },
  { key: 'brust', name: 'Brust', relX: third, relY: rowA, relWidth: third, capacity: 1 },
  { key: 'beine', name: 'Beine', relX: 2 * third, relY: rowA, relWidth: lastCol, capacity: 1 },
  { key: 'haende', name: 'Hände', relX: 0, relY: rowB, relWidth: 2 * third, capacity: 2 },
  { key: 'mitbringsel', name: 'Mitbringsel', relX: 2 * third, relY: rowB, relWidth: lastCol, capacity: 1 },
];

/** Die IDs der drei vorhandenen Vorrats-Zonen (aus `zone_data`, AS2). */
export const VORRAT_IDS = { 1: 'zv8uzad70', 2: 'z6glzvxld', 3: 'znbu9aao8' };

const base = (id, label, capacity, layout, color) => ({
  id, label, shape: 'rect', type: 'shared', color,
  accepts: ['card'], capacity, layout, snap: true, exclusive: false,
  startingHandCardIds: [], dealStackId: null, dealCount: 0,
});

/**
 * Die achtzehn Zonen: fünfzehn Slots und die drei Vorräte.
 *
 * **BV / M21.4: der Vorrat ist ein Ablagestapel ohne Obergrenze.** „Es gibt
 * keine Obergrenze, wie viel Ausrüstung ein Dörfler besitzen darf" `[BR S.8]`,
 * und „WAFFEN-WIRRWARR" gibt zwei Dörflern gegenseitig *alle* Waffen — in
 * Partie 12 blieb die sechste Karte beim falschen Besitzer. Mehr Plätze gibt
 * der Kasten nicht her: `zoneSlots` rechnet `cols = round(sqrt(cap·w/h))`, und
 * bei 580 × 140 passen höchstens fünf in **eine** Reihe; jede Kapazität
 * darüber ergibt zwei, und die liegt entweder in der ersten oder hinter der
 * Werkzeugleiste (M18, verworfene Varianten 2 und 3). Jede Zahl wäre also eine
 * erfundene Grenze. `capacity` weg heißt `zoneCapacity === null` heißt
 * `zoneRejects` sagt nie „voll" — die Regel ohne Obergrenze, ohne eine Zahl.
 *
 * Der **Kasten bleibt**, wie M18 ihn gemessen hat; geändert ist nur das
 * Layout. Die fünfzehn Slot-Zonen sind unberührt.
 *
 * Grün für die Slots, grau für den Vorrat: bei Zoom 0,41 ist das Namensschild
 * 4,5 Bildschirmpunkte hoch und damit unlesbar. Was eine angelegte Karte von
 * einer weggepackten unterscheidet, sind Rahmen, Farbe und Abstand.
 */
export function equipmentZones() {
  const out = [];
  for (const d of DOERFLER) {
    const anchor = (rel) => ({ assetId: d.assetId, ...rel });
    for (const s of SLOTS) {
      out.push({
        ...base(`z${s.key}${d.n}`, `Dörfler ${d.n}: ${s.name}`, s.capacity, 'row', 'green'),
        anchor: anchor({ relX: s.relX, relY: s.relY, relWidth: s.relWidth, relHeight: relH }),
      });
    }
    out.push({
      ...base(VORRAT_IDS[d.n], `Ausrüstung Dörfler ${d.n}`, null, 'stack', null),
      anchor: anchor({ relX: 0, relY: rowV, relWidth: relW, relHeight: relH }),
    });
  }
  return out;
}

// ── CLI ──────────────────────────────────────────────────────────────────────

/**
 * Der Stand, den dieser Schalter **vorfindet**: das Ergebnis von BH/M18.
 *
 * Vor M18 stand hier `{ relY: 1.02, relHeight: 0.7, capacity: 10 }` — der
 * Stand davor. Eine Vorprüfung, die gegen einen überholten Stand vergleicht,
 * beanstandet die eigene letzte Änderung; sie zieht darum mit.
 */
const CURRENT_VORRAT = { relY: 1.83, relHeight: 0.35, capacity: 5, layout: 'grid' };

async function main(argv) {
  const [mode, dbPath] = argv;
  const zones = equipmentZones();

  if (mode === '--json') {
    console.log(JSON.stringify(zones, null, 1));
    return 0;
  }
  if (mode !== '--check' && mode !== '--write') {
    console.error('usage: equipment-zones.mjs --json | --check <db> | --write <db>');
    return 2;
  }

  const { default: Database } = await import('better-sqlite3');
  const db = new Database(dbPath, { readonly: mode === '--check' });
  const read = () => JSON.parse(db.prepare('select zone_data from setups where id = ?').get(SETUP_ID).zone_data);
  const current = read();
  const complaints = [];

  // 45 seit BH/M18: die fünfzehn Slot-Zonen kamen zu den dreißig hinzu. Vor
  // M18 stand hier 30 — dieselbe Falle wie bei CURRENT_VORRAT.
  if (current.length !== 45) complaints.push(`erwartet 45 Zonen, gefunden ${current.length}`);
  for (const d of DOERFLER) {
    const z = current.find(q => q.id === VORRAT_IDS[d.n]);
    if (!z) { complaints.push(`Vorrat ${d.n} (${VORRAT_IDS[d.n]}) fehlt`); continue; }
    if (z.anchor?.assetId !== d.assetId) complaints.push(`Vorrat ${d.n}: fremder Anker`);
    if (z.anchor?.relY !== CURRENT_VORRAT.relY) complaints.push(`Vorrat ${d.n}: relY ${z.anchor?.relY}`);
    if (z.anchor?.relHeight !== CURRENT_VORRAT.relHeight) complaints.push(`Vorrat ${d.n}: relHeight ${z.anchor?.relHeight}`);
    if (z.capacity !== CURRENT_VORRAT.capacity) complaints.push(`Vorrat ${d.n}: capacity ${z.capacity}`);
    if (z.layout !== CURRENT_VORRAT.layout) complaints.push(`Vorrat ${d.n}: layout ${z.layout}`);
  }
  // BV: die fünfzehn Slot-Zonen sind seit M18 **vorhanden**, und dieser Lauf
  // schreibt sie unverändert zurück. Vor M18 stand hier die umgekehrte
  // Prüfung („ID ist schon vergeben"); sie träfe jetzt jede der fünfzehn.
  const byId = new Map(current.map(z => [z.id, z]));
  for (const z of zones) {
    if (Object.values(VORRAT_IDS).includes(z.id)) continue;
    const have = byId.get(z.id);
    if (!have) { complaints.push(`Slot-Zone ${z.id} ("${z.label}") fehlt`); continue; }
    if (have.label !== z.label) complaints.push(`${z.id}: Name "${have.label}" statt "${z.label}"`);
    if (JSON.stringify(have) !== JSON.stringify(z)) complaints.push(`${z.id} ("${z.label}") weicht ab`);
  }
  if (new Set(current.map(z => z.label)).size !== current.length) {
    complaints.push('zwei Zonen tragen denselben Namen');
  }

  console.log(`${mode === '--check' ? 'Trockenlauf' : 'Vorprüfung'}: ${complaints.length} Beanstandungen`);
  for (const c of complaints) console.log('  - ' + c);
  if (complaints.length) return 1;
  if (mode === '--check') return 0;

  const replace = new Map(zones.map(z => [z.id, z]));
  const next = current.map(z => replace.get(z.id) || z);
  for (const z of zones) if (!current.some(c => c.id === z.id)) next.push(z);

  db.transaction(() => {
    db.prepare('update setups set zone_data = ? where id = ?').run(JSON.stringify(next), SETUP_ID);
  })();

  const after = read();
  console.log(`geschrieben: ${after.length} Zonen`);
  for (const d of DOERFLER) {
    const z = after.find(q => q.id === VORRAT_IDS[d.n]);
    console.log(`  Vorrat ${d.n}: relY ${z.anchor.relY} relHeight ${z.anchor.relHeight} layout ${z.layout} capacity ${JSON.stringify(z.capacity)}`);
  }
  const slots = after.filter(z => /: (Kopf|Brust|Beine|Hände|Mitbringsel)$/.test(z.label));
  console.log(`  Slot-Zonen: ${slots.length}, davon layout row: ${slots.filter(z => z.layout === 'row').length}`);
  const untouched = current.filter(c => !replace.has(c.id));
  const same = untouched.every(c => JSON.stringify(c) === JSON.stringify(after.find(a => a.id === c.id)));
  console.log(`  unberührt: ${untouched.length} Zonen, unverändert: ${same}`);
  return 0;
}

if (process.argv[1] && process.argv[1].endsWith('equipment-zones.mjs')) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; });
}
