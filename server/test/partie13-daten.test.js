// BY–CB / Spec M23 — die Datenänderungen der dreizehnten Partie.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Dieselbe Bauart wie `equipment-zones.test.js`: die Zahlen stehen in
// `scripts/partie13-daten.mjs` und werden hier gegen die Maschinerie geprüft,
// die sie am Tisch ausführt (`shared/zoneGeometry.js`, `shared/anchoring.js`,
// `shared/sequenceExecutor.js`) — nicht gegen sich selbst. Begründung,
// Messwerte und die verworfenen Varianten stehen in `docs/tasks-partie13.md`.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  extraZones, patchSequence, patchActions, patchZones,
  CARD_SLOTS, LIFE_COUNTERS, SHOP_ACTION, MEASURED_NEIGHBOURS,
  HAUPTPLAN, SIDEBOARD, counterBox, GRID_BOX, VIEWPORT, STRIP,
} from '../../scripts/partie13-daten.mjs';
import { equipmentZones, MEASURED_ANCHORS, BAND } from '../../scripts/equipment-zones.mjs';
import { resolveBox } from '../../shared/anchoring.js';
import { zoneCapacity, zoneRejects, zoneLabelAbove, zoneSlots } from '../../shared/zoneGeometry.js';
import { executeSequenceWithLog } from '../../shared/sequenceExecutor.js';

const anchors = new Map(MEASURED_ANCHORS.map(a => [a.id, a]));
const resolve = (list) => list.map(z => ({ ...z, ...resolveBox(z.anchor, anchors.get(z.anchor.assetId)) }));
const neu = resolve(extraZones());
const alt = resolve(equipmentZones());

const overlaps = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// ── CB: sechs Zonen im Streifen neben dem Tableau ───────────────────────────

test('CB: sechs Zonen, zwei je Dörfler, mit eindeutigen Namen', () => {
  assert.equal(neu.length, 6);
  assert.equal(neu.filter(z => z.label.endsWith(': Erfüllte Heldentaten')).length, 3);
  assert.equal(neu.filter(z => z.label.endsWith(': Ausliegend')).length, 3);
  assert.equal(new Set(neu.map(z => z.label)).size, 6);
  assert.equal(new Set(neu.map(z => z.id)).size, 6);
  // Kein Name kollidiert mit einer Zone, die es schon gibt.
  const vorhanden = new Set([...alt, ...MEASURED_NEIGHBOURS].map(z => z.label));
  for (const z of neu) assert.ok(!vorhanden.has(z.label), `Name doppelt: ${z.label}`);
});

test('CB: keine neue Zone überlappt eine andere oder eine vorhandene', () => {
  const nachbarn = [...alt, ...MEASURED_NEIGHBOURS];
  for (let i = 0; i < neu.length; i++) {
    for (let j = i + 1; j < neu.length; j++) {
      assert.ok(!overlaps(neu[i], neu[j]), `${neu[i].label} überlappt ${neu[j].label}`);
    }
    for (const n of nachbarn) {
      assert.ok(!overlaps(neu[i], n), `${neu[i].label} überlappt ${n.label}`);
    }
  }
});

test('CB: die vierte Reihe bleibt im Feld ihres Dörflers und unter dem M18-Band', () => {
  const unterkante = BAND.top + 3 * (STRIP.cardHeight + STRIP.gap) - STRIP.gap; // 2272
  for (const z of neu) {
    const d = MEASURED_ANCHORS.find(a => a.id === z.anchor.assetId);
    assert.equal(z.width, STRIP.width, `${z.label} ist nicht ${STRIP.width} breit`);
    assert.equal(z.height, STRIP.cardHeight, `${z.label} ist keine Kartenhöhe hoch`);
    assert.ok(z.x >= d.x, `${z.label} steht links von seinem Dörfler`);
    assert.ok(z.x + z.width <= d.x + BAND.pitch,
      `${z.label} ragt in das Feld des Nachbarn (${z.x + z.width} > ${d.x + BAND.pitch})`);
    // Unter den drei Reihen aus M18, mit der Lücke, die das Schild braucht.
    assert.ok(z.y >= unterkante + STRIP.gap,
      `${z.label} ragt in das Ausrüstungsband (${z.y} < ${unterkante + STRIP.gap})`);
  }
});

test('CB: keine neue Zone liegt unter einer Zählerspalte', () => {
  // Der Befund hinter dieser Stelle: ein Zähler wird mit `left: x − 70`
  // gezeichnet, die Spalte liegt also 70 Punkte weiter links als ihr `x`.
  const spalten = [580, 1160, 1740].flatMap(x => [1430, 1520, 1610, 1700].map(y => counterBox({ x, y })));
  for (const z of neu) {
    for (const c of spalten) {
      assert.ok(!overlaps({ ...z, width: z.width, height: z.height }, c),
        `${z.label} liegt unter einem Zähler (${c.x},${c.y})`);
    }
  }
});

test('CB: jedes Schild hat oberhalb Platz, keines liegt auf einer Karte', () => {
  const alle = [...alt, ...neu, ...MEASURED_NEIGHBOURS];
  for (const z of neu) {
    assert.equal(zoneLabelAbove(z, alle), true, `${z.label} muss sein Schild nach unten hängen`);
  }
});

test('CB: beide Zonen nehmen Karten und werden nie voll', () => {
  for (const z of neu) {
    assert.equal(zoneCapacity(z), null, `${z.label} hat eine erfundene Obergrenze`);
    assert.equal(zoneRejects(z, 'card', 99), null, `${z.label} weist die hundertste Karte ab`);
    assert.match(zoneRejects(z, 'asset', 0) || '', /does not accept assets/);
    assert.equal(z.layout, 'stack');
  }
});

// ── BY: die Startausrüstung findet ihren Slot ───────────────────────────────

test('BY: jedes der sechs Ziele ist eine echte Slot-Zone mit genug Platz', () => {
  const byLabel = new Map(alt.map(z => [z.label, z]));
  const gezielt = new Map();
  for (const [card, label] of Object.entries(CARD_SLOTS)) {
    const zone = byLabel.get(label);
    assert.ok(zone, `${card}: Zone "${label}" gibt es nicht`);
    gezielt.set(label, (gezielt.get(label) || 0) + 1);
  }
  for (const [label, n] of gezielt) {
    const cap = zoneCapacity(byLabel.get(label));
    assert.ok(cap === null || cap >= n, `${label} fasst ${cap}, soll aber ${n} Karten nehmen`);
  }
  // Keine zielt mehr auf den Vorrat - genau das war der Befund (L3).
  for (const label of Object.values(CARD_SLOTS)) {
    assert.ok(!label.startsWith('Ausrüstung Dörfler '), `${label} ist weiterhin der Vorrat`);
  }
});

test('BY/CA: die Umschreibung fasst genau neun Schritte an', () => {
  const vorher = [
    { type: 'place_card', cardName: 'BAUERNLATZHOSE', targetZoneLabel: 'Ausrüstung Dörfler 1' },
    { type: 'place_card', cardName: 'ROSTIGE SICHEL', targetZoneLabel: 'Ausrüstung Dörfler 1' },
    { type: 'place_card', cardName: 'GEFRIERFACHTÜR', targetZoneLabel: 'Ausrüstung Dörfler 2' },
    { type: 'place_card', cardName: 'KÜHL-PACK', targetZoneLabel: 'Ausrüstung Dörfler 2' },
    { type: 'place_card', cardName: 'OMMAS GEHSTOCK', targetZoneLabel: 'Ausrüstung Dörfler 3' },
    { type: 'place_card', cardName: 'DAS ALTE EISEN', targetZoneLabel: 'Ausrüstung Dörfler 3' },
    { type: 'place_counter', name: 'Henlo: Leben', value: 3, max: 3, x: 580, y: 1430 },
    { type: 'place_counter', name: 'Henlo: Mumm', value: 2, x: 580, y: 1610, base: 2 },
    { type: 'place_counter', name: 'Fridgette: Leben', value: 4, max: 4, x: 1160, y: 1430 },
    { type: 'place_counter', name: 'Granny: Leben', value: 4, max: 4, x: 1740, y: 1430 },
    { type: 'place_counter', name: 'Münzen (gemeinsam)', value: 45, x: 2080, y: 1430 },
    { type: 'shuffle', stackLabel: 'Heldentaten' },
  ];
  const nachher = patchSequence(vorher);
  assert.equal(nachher.length, vorher.length, 'es darf kein Schritt dazukommen');
  const geaendert = nachher.filter((s, i) => JSON.stringify(s) !== JSON.stringify(vorher[i]));
  assert.equal(geaendert.length, 9, 'nur die sechs Karten und die drei Lebenszähler');
  // Was nicht benannt ist, bleibt Zeichen für Zeichen gleich.
  assert.deepEqual(nachher[7], vorher[7], 'Mumm wurde angefasst');
  assert.deepEqual(nachher[10], vorher[10], 'die Münzen wurden angefasst');
  assert.deepEqual(nachher[11], vorher[11]);
  // Werte, Maxima und Grundwerte bleiben: keine der sechs Karten trägt eine
  // schwarz markierte Wertveränderung (docs/tasks-partie13.md, 2).
  assert.equal(nachher[6].value, 3);
  assert.equal(nachher[6].max, 3);
  assert.equal(nachher[8].max, 4);
});

// ── CA: Raster und Lebenszähler gleichzeitig im Bild ────────────────────────

test('CA: die drei Stellen liegen auf keinem Brett und überlappen einander nicht', () => {
  const boxes = Object.values(LIFE_COUNTERS).map(counterBox);
  for (const b of boxes) {
    // Der Befund hinter dieser Stelle: auf einem Brett kann etwas darüberliegen
    // (die zehn Karten der Ladenauslage taten es), über dem Brett nicht.
    assert.ok(!overlaps(b, HAUPTPLAN), `${b.x},${b.y} liegt auf dem Hauptplan`);
    assert.ok(!overlaps(b, SIDEBOARD), `${b.x},${b.y} liegt auf dem Zusatz-Brett`);
    // Trotzdem über dem Schlachtfeld und nicht irgendwo: über dem Hauptplan.
    assert.ok(b.x >= HAUPTPLAN.x && b.x + b.width <= HAUPTPLAN.x + HAUPTPLAN.width,
      `${b.x}..${b.x + b.width} steht nicht über dem Hauptplan`);
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      assert.ok(!overlaps(boxes[i], boxes[j]), `Zähler ${i} und ${j} liegen übereinander`);
    }
  }
});

test('CA: auch deutlich über dem geforderten Spielzoom bleibt beides im Bild', () => {
  const boxes = [GRID_BOX, ...Object.values(LIFE_COUNTERS).map(counterBox)];
  const hoch = Math.max(...boxes.map(b => b.y + b.height)) - Math.min(...boxes.map(b => b.y));
  assert.ok(hoch * 0.55 <= VIEWPORT.height, `zu hoch bei 55 %: ${Math.round(hoch * 0.55)}`);
});

test('CA: bei Spielzoom 0,4 sind Raster und alle drei Zähler zusammen im Bild', () => {
  const boxes = [GRID_BOX, ...Object.values(LIFE_COUNTERS).map(counterBox)];
  const left = Math.min(...boxes.map(b => b.x));
  const right = Math.max(...boxes.map(b => b.x + b.width));
  const top = Math.min(...boxes.map(b => b.y));
  const bottom = Math.max(...boxes.map(b => b.y + b.height));
  const zoom = 0.4;
  assert.ok((right - left) * zoom <= VIEWPORT.width,
    `zu breit: ${Math.round((right - left) * zoom)} > ${VIEWPORT.width}`);
  assert.ok((bottom - top) * zoom <= VIEWPORT.height,
    `zu hoch: ${Math.round((bottom - top) * zoom)} > ${VIEWPORT.height}`);
});

test('CA: der Befund — bei Spielzoom geht an der alten Stelle genau das nicht', () => {
  // Die Gegenprobe zum Messergebnis aus docs/tasks-partie13.md, 3. Gerechnet
  // bei Zoom 0,5 — ein Rasterfeld ist dort 25 Bildpunkte breit, also noch
  // bequem zu treffen; gespielt wurde Partie 13 bei 0,62.
  const hoch = (boxes) => Math.max(...boxes.map(b => b.y + b.height)) - Math.min(...boxes.map(b => b.y));
  const alt = hoch([GRID_BOX, ...[580, 1160, 1740].map(x => counterBox({ x, y: 1430 }))]);
  const neuStellen = hoch([GRID_BOX, ...Object.values(LIFE_COUNTERS).map(counterBox)]);
  assert.ok(alt * 0.5 > VIEWPORT.height,
    `der Befund wäre damit kein Befund mehr: ${Math.round(alt * 0.5)} ≤ ${VIEWPORT.height}`);
  assert.ok(neuStellen * 0.5 <= VIEWPORT.height,
    `die neue Stelle hilft nicht: ${Math.round(neuStellen * 0.5)} > ${VIEWPORT.height}`);
});

// ── BZ: ein Griff füllt den Laden nach ──────────────────────────────────────

const AUSLAGE = {
  label: 'Nachschub-Auslage', x: 1363, y: 206, width: 221, height: 639,
  layout: 'grid', capacity: 10, accepts: ['card'],
};

// Die ausliegenden Karten sitzen auf den Plaetzen der Zone, nicht irgendwo in
// ihrem Rechteck: seit M11.8 zaehlt `countInZone` die **belegten Plaetze**, und
// genau dort landet auch jede von Hand hineingezogene Karte (`snapInto`).
const SLOTS = zoneSlots(AUSLAGE);

const shopTable = (inZone, inStack = 20) => ({
  cards: Array.from({ length: inZone }, (_, i) => ({
    tableId: `z${i}`, cardId: `z${i}`, name: `Laden ${i}`, width: 100, height: 140,
    x: SLOTS[i].x, y: SLOTS[i].y, faceDown: false, zIndex: i + 1,
  })),
  stacks: [{
    stackId: 's1', label: 'Nachschub (Tante Emma)', x: 1780, y: 640,
    cards: Array.from({ length: inStack }, (_, i) => ({
      tableId: `n${i}`, cardId: `n${i}`, name: `Nachschub ${i}`,
      width: 100, height: 140, faceDown: true, zIndex: i + 1,
    })),
  }],
  tokens: [], boards: [],
});

test('BZ: die Aktion heißt so, hat einen Schritt und steht hinter dem Dorfereignis', () => {
  assert.equal(SHOP_ACTION.steps.length, 1);
  assert.equal(SHOP_ACTION.steps[0].fill, true, 'ohne fill würde die Aktion zehn neue austeilen');
  const vorher = [{ id: 'kampf-beginnen' }, { id: 'dorfereignis' }, { label: 'Dorfphase beginnen' }];
  const nachher = patchActions(vorher);
  assert.equal(nachher.length, 4);
  assert.equal(nachher[2].id, SHOP_ACTION.id);
  assert.deepEqual(nachher.filter(a => a !== SHOP_ACTION), vorher, 'die drei vorhandenen sind unverändert');
  // Zweimal laufen lassen legt die Aktion nicht zweimal an.
  assert.equal(patchActions(nachher).length, 4);
});

test('BZ: eine halbleere Auslage füllt sich auf zehn offene Karten', () => {
  const { state, log } = executeSequenceWithLog(shopTable(6), SHOP_ACTION.steps, [AUSLAGE]);
  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.equal(state.cards.length, 10);
  assert.equal(state.cards.filter(c => c.faceDown).length, 0, 'Karten kommen offen nach');
  assert.equal(state.stacks[0].cards.length, 16, 'vier Karten vom Nachschub');
});

test('BZ: eine volle Auslage bleibt unberührt und macht keinen Lärm', () => {
  const { state, log } = executeSequenceWithLog(shopTable(10), SHOP_ACTION.steps, [AUSLAGE]);
  assert.equal(state.cards.length, 10);
  assert.equal(state.stacks[0].cards.length, 20);
  assert.notEqual(log[0].status, 'failed');
});

test('BZ: zeigt das Zusatz-Brett die Kampfseite, meldet der Schritt sich ab', () => {
  const abgewandt = { ...AUSLAGE, facingAway: true };
  const { state, log } = executeSequenceWithLog(shopTable(6), SHOP_ACTION.steps, [abgewandt]);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /not showing/);
  assert.equal(state.cards.length, 6, 'nichts wurde gelegt');
});

// ── Die drei Umschreibungen fassen nur ihre eigene Spalte an ────────────────

test('M23: patchZones hängt sechs an und ändert keine vorhandene', () => {
  const vorher = equipmentZones();
  const nachher = patchZones(vorher);
  assert.equal(nachher.length, vorher.length + 6);
  assert.deepEqual(nachher.slice(0, vorher.length), vorher);
  assert.equal(patchZones(nachher).length, nachher.length, 'zweimal laufen lassen verdoppelt nichts');
  // Eine schon liegende Zone wird ersetzt, nicht danebengelegt.
  const alt = nachher.map(z => (z.id === 'zheldentaten1' ? { ...z, anchor: { ...z.anchor, relY: 9 } } : z));
  const wieder = patchZones(alt);
  assert.equal(wieder.length, nachher.length);
  assert.equal(wieder.find(z => z.id === 'zheldentaten1').anchor.relY, extraZones()[0].anchor.relY);
});
