// BH / Spec M18, umgebaut von CI / Spec M26.1 — die Ausrüstungsplätze je
// Dörfler und der Vorrat darunter, für den Aufbau *TFT Kurzpartie*.
//
// Hier stehen die Zahlen **einmal** (M6): derselbe Baustein liefert die Zonen
// für den Trockenlauf (`scripts/doerfler-daten.mjs`), für das Schreiben und für
// `server/test/equipment-zones.test.js`. Begründung der Aufteilung, die
// Messwerte und die verworfenen Varianten stehen in `docs/tasks-doerfler.md`
// (CI) und, für den Vorrat, in `docs/tasks-ausruestung.md` (BH).
//
// **Seit M26 liegen die sechs Plätze an den Längsseiten des Tableaus**, auf den
// Höhen der aufgedruckten Pfeile — nicht mehr als Streifen darunter. Der Vorrat
// bleibt unter dem Tableau, die Zonen aus M23.2 ebenso.
//
// Aufruf:
//
//   node scripts/equipment-zones.mjs --json   # die einundzwanzig Zonen
//
// Geschrieben wird über `scripts/doerfler-daten.mjs`: die Zonen und die
// Schritte, die sie beim Namen nennen, ändern sich in **einer** Transaktion.

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
 * Die Grenzen des Streifens unter den Tableaus, gemessen, nicht geschätzt.
 *
 * `pitch` ist der Abstand der drei Tableaus von Mitte zu Mitte — die Breite,
 * ab der eine Zone in das Feld des Nachbarn ragt.
 * `top` liegt 8 Punkte unter der Tableau-Unterkante (so lag die Zone schon).
 * `bottom` ist die Oberkante der Werkzeugleiste in Weltkoordinaten bei der
 * gespeicherten Ansicht „Dörfler" (Mitte 1149,5/1675, Zoom 0,41, Fenster
 * 932 × 738): 1675 + (637 − 369) / 0,41.
 *
 * Seit M26 steht darin nur noch der **Vorrat** (und, aus M23.2, die Reihe der
 * Ablagen darunter); die beiden Reihen darüber (y 1808 … 2110) sind frei und
 * tragen die Zähler (`COUNTER_ROW` in `doerfler-daten.mjs`).
 */
export const BAND = {
  pitch: 580,
  top: 1808,
  bottom: 2329,
  card: { width: 100, height: 140 },
};

/**
 * Die Höhen der sechs aufgedruckten Pfeile, **gemessen** (docs/doerflerdaten.md
 * 6.2): 0 = Oberkante, 1 = Unterkante des Tableaus, bei allen neun Tableaus
 * gleich (acht auf drei Nachkommastellen identisch, Georgies Foto ±0,007).
 *
 * Das dritte Paar liegt links und rechts **nicht** gleich hoch (0,844 gegen
 * 0,826, sieben Weltpunkte). Das ist gemessen und wird nicht geglättet: ein
 * Platz je Pfeil, mit der Höhe seines Pfeils.
 */
export const ARROWS = {
  kopf: 0.154, brust: 0.491, beine: 0.844,
  linkeHand: 0.154, rechteHand: 0.491, mitbringsel: 0.826,
};

/**
 * Der Fangkasten eines Platzes, in Weltpunkten.
 *
 * **Höhe 112:** die Pfeile stehen 134,0 … 141,2 Punkte auseinander (rechts
 * Rechte Hand → Mitbringsel: 0,335 · 400), eine Karte ist 140 hoch. Ein Schild
 * braucht 21 Punkte über der Zone (`ZONE_LABEL_HEIGHT`); sonst setzt
 * `zoneLabelAbove` es auf die Nachbarzone (M16.1). 134 − 21 = 113, also 112 mit
 * einem Punkt Reserve. Die Karte (140) ragt oben und unten je 14 Punkte über die
 * Zone hinaus — das ist die Geometrie des Tableaus: Karten und Pfeile haben
 * dasselbe Raster nicht. Die Zone ist der Fangkasten, die Karte wird auf ihre
 * Mitte gesetzt (`snap`).
 *
 * **Breite 120** (`ZONE_LABEL_WIDTH`), am Rand des Tableaus: das Schild darf
 * nicht breiter sein als sein Fangkasten, sonst hinge es über der Lücke zum
 * Nachbarn. Zwischen den Zonen zweier Tableaus bleiben 40 Punkte.
 */
export const ZONE_BOX = { width: 120, height: 112 };

const ANCHOR_W = 300;
const ANCHOR_H = 400;
const relW = ZONE_BOX.width / ANCHOR_W;     // 0,4
const relH = ZONE_BOX.height / ANCHOR_H;    // 0,28
const halfH = relH / 2;

// Der Vorrat: unverändert aus BH/BV (Zeile `rowV`). `TOP` ist der Abstand der
// Streifenoberkante zur Tableau-Oberkante, `ROW_H` die Kartenhöhe, `GAP` die
// Luft für das Schild der tieferen Reihe (`ZONE_LABEL_HEIGHT` ist 21; ohne die
// Lücke läge über dem Vorrat eine Zone **und** unter ihr eine, und
// `zoneLabelAbove` setzte das Schild auf die Karten der Reihe darüber — der
// Fehler, den M16.1 behoben hat, eine Etage tiefer).
const TOP = BAND.top - 1400;                // 408 Punkte unter der Tableau-Oberkante
const ROW_H = BAND.card.height;
const GAP = 22;
const relVW = BAND.pitch / ANCHOR_W;        // 1,9333… — unverändert aus AS2
const relVH = ROW_H / ANCHOR_H;             // 0,35
const rowV = (TOP + 2 * (ROW_H + GAP)) / ANCHOR_H;

/**
 * Die sechs Plätze, wie das Tableau sie führt: links Head / Chest / Leg Gear,
 * rechts Left Hand / Right Hand / Accessory, Pfeile nach außen.
 *
 * `relY` setzt die **Mitte** der Zone auf die Höhe des Pfeils. Die linke Zone
 * endet auf der Tableau-Kante (`relX = −relW`), die rechte beginnt auf ihr
 * (`relX = 1`) — die Karte liegt neben ihrem Aufdruck, nicht auf ihm.
 *
 * `Hände` ist seit M26 **zwei** Zonen. M18 hatte eine daraus gemacht („eine
 * Zweihandwaffe belegt beide") — das war die Vereinfachung des Entwurfs, nicht
 * die des Spiels: das Tableau führt Left Hand und Right Hand getrennt, auf
 * verschiedenen Höhen. Dass eine Zweihandwaffe beide belegt, bleibt eine Regel
 * über zwei Plätze `[DE S.9]`.
 */
const SLOTS = [
  { key: 'kopf', name: 'Kopf', relX: -relW, arrow: ARROWS.kopf },
  { key: 'brust', name: 'Brust', relX: -relW, arrow: ARROWS.brust },
  { key: 'beine', name: 'Beine', relX: -relW, arrow: ARROWS.beine },
  { key: 'linke', name: 'Linke Hand', relX: 1, arrow: ARROWS.linkeHand },
  { key: 'rechte', name: 'Rechte Hand', relX: 1, arrow: ARROWS.rechteHand },
  { key: 'mitbringsel', name: 'Mitbringsel', relX: 1, arrow: ARROWS.mitbringsel },
];

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

/** Die IDs der drei vorhandenen Vorrats-Zonen (aus `zone_data`, AS2). */
export const VORRAT_IDS = { 1: 'zv8uzad70', 2: 'z6glzvxld', 3: 'znbu9aao8' };

const base = (id, label, capacity, layout, color) => ({
  id, label, shape: 'rect', type: 'shared', color,
  accepts: ['card'], capacity, layout, snap: true, exclusive: false,
  startingHandCardIds: [], dealStackId: null, dealCount: 0,
});

/**
 * Die einundzwanzig Zonen: achtzehn Plätze (sechs je Dörfler) und die drei
 * Vorräte.
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
 * Der **Vorrat bleibt**, wo M18 ihn gemessen hat — M26 hat ihn nicht
 * angefasst: er ist Besitz, der nicht getragen wird (und nimmt Judys drei
 * Gemälde auf), und er hat am Rand des Tableaus keinen Aufdruck.
 *
 * Grün für die Plätze, grau für den Vorrat: bei Zoom 0,41 ist das Namensschild
 * 4,5 Bildschirmpunkte hoch und damit unlesbar. Was eine angelegte Karte von
 * einer weggepackten unterscheidet, sind Rahmen, Farbe und Abstand.
 */
/**
 * Die sieben Zonen je Platz (sechs Ausrüstungsplätze und der Vorrat), für **die übergebenen** Plätze.
 * `seats` ist `[{ n, assetId, vorratId }]`: die Nummer des Dörflers, die Asset-Id seines Tableaus und die Id
 * seines Vorrats (M31.8 Punkt 3). Die übrigen sieben je Platz (Hand, Wertleisten, Heldentaten, Ausliegend)
 * baut dieser Generator nicht; `scripts/doerflerzahl-daten.mjs` kopiert sie aus den Vorlagen.
 */
export function equipmentZonesFor(seats) {
  const out = [];
  for (const d of seats) {
    const anchor = (rel) => ({ assetId: d.assetId, ...rel });
    for (const s of SLOTS) {
      out.push({
        ...base(`z${s.key}${d.n}`, `Dörfler ${d.n}: ${s.name}`, 1, 'row', 'green'),
        anchor: anchor({ relX: s.relX, relY: s.arrow - halfH, relWidth: relW, relHeight: relH }),
      });
    }
    out.push({
      ...base(d.vorratId, `Ausrüstung Dörfler ${d.n}`, null, 'stack', null),
      anchor: anchor({ relX: 0, relY: rowV, relWidth: relVW, relHeight: relVH }),
    });
  }
  return out;
}

/** Die einundzwanzig Zonen der drei Plätze von heute — `equipmentZonesFor` mit den drei Literalen. */
export function equipmentZones() {
  return equipmentZonesFor(DOERFLER.map(d => ({ n: d.n, assetId: d.assetId, vorratId: VORRAT_IDS[d.n] })));
}

/**
 * Die Ids, die **dieser** Baustein früher geschrieben hat und heute nicht mehr:
 * die Zone `Hände` mit zwei Plätzen (M18), je Dörfler eine. Beim Schreiben
 * verschwinden sie — und nur sie; fremde Zonen bleiben.
 */
export const RETIRED_IDS = DOERFLER.map(d => `zhaende${d.n}`);

/**
 * Die Zonenliste nach der Änderung: die einundzwanzig ersetzen ihre Vorgänger
 * gleicher Id (an ihrer Stelle), neue kommen hinten dran, `Hände` verschwindet.
 * Alles andere bleibt Zeichen für Zeichen, wie es war.
 */
export function patchZones(zones) {
  const list = Array.isArray(zones) ? zones : [];
  const neu = new Map(equipmentZones().map(z => [z.id, z]));
  const kept = list.filter(z => !RETIRED_IDS.includes(z?.id)).map(z => neu.get(z?.id) || z);
  const present = new Set(list.map(z => z?.id));
  return [...kept, ...[...neu.values()].filter(z => !present.has(z.id))];
}

if (process.argv[1] && process.argv[1].endsWith('equipment-zones.mjs')) {
  if (process.argv[2] === '--json') console.log(JSON.stringify(equipmentZones(), null, 1));
  else { console.error('usage: equipment-zones.mjs --json  (geschrieben wird über doerfler-daten.mjs)'); process.exitCode = 2; }
}
