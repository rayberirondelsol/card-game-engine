// BH / Spec M18 — die fünf Slot-Zonen je Dörfler und der Vorrat daneben.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die Zahlen stehen in `scripts/equipment-zones.mjs` und werden hier gegen die
// Maschinerie geprüft, die sie am Tisch auslegt (`shared/zoneGeometry.js`,
// `shared/anchoring.js`) — nicht gegen sich selbst. Begründung, Messwerte und
// die verworfenen Aufteilungen stehen in `docs/tasks-ausruestung.md`.
//
// Warum ein Test für Daten: die Spaltenzahl einer `grid`-Zone rechnet
// `zoneSlots` aus Kapazität und Seitenverhältnis aus (`round(sqrt(cap*w/h))`).
// Sie steht nirgends in den Daten, und jede Änderung an Breite, Höhe oder
// Kapazität verschiebt sie still mit.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { equipmentZones, MEASURED_ANCHORS, BAND } from '../../scripts/equipment-zones.mjs';
import { resolveBox } from '../../shared/anchoring.js';
import {
  zoneSlots, zoneCapacity, zoneRejects, zoneLabelAbove,
  ZONE_LABEL_HEIGHT, ZONE_LABEL_WIDTH,
} from '../../shared/zoneGeometry.js';

// Das breiteste neue Schild, mit der echten Schrift am laufenden Tisch
// gemessen (`600 11px Inter`, Polster 2/6): „Dörfler 1: Mitbringsel".
const WIDEST_LABEL = 117.6;
// Das Schild beginnt `left-2` innerhalb der Zone.
const LABEL_INSET = 8;

const anchors = new Map(MEASURED_ANCHORS.map(a => [a.id, a]));
const resolved = equipmentZones().map(z => ({ ...z, ...resolveBox(z.anchor, anchors.get(z.anchor.assetId)) }));

const overlaps = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('BH: achtzehn Zonen mit eindeutigen Namen – fünfzehn neue, drei Vorräte', () => {
  assert.equal(resolved.length, 18);
  assert.equal(resolved.filter(z => z.label.startsWith('Ausrüstung Dörfler ')).length, 3);
  assert.equal(new Set(resolved.map(z => z.label)).size, 18);
  assert.equal(new Set(resolved.map(z => z.id)).size, 18);
  // Ein Name adressiert eine Zone (`targetZoneLabel`, `clear_zone`), darum
  // drei getrennte Sätze statt dreimal „Kopf".
  for (const n of [1, 2, 3]) {
    for (const slot of ['Kopf', 'Brust', 'Beine', 'Hände', 'Mitbringsel']) {
      assert.ok(resolved.some(z => z.label === `Dörfler ${n}: ${slot}`), `${slot} fehlt bei Dörfler ${n}`);
    }
  }
});

test('BH: keine Zone überlappt eine andere', () => {
  for (let i = 0; i < resolved.length; i++) {
    for (let k = i + 1; k < resolved.length; k++) {
      assert.ok(!overlaps(resolved[i], resolved[k]),
        `${resolved[i].label} überlappt ${resolved[k].label}`);
    }
  }
});

test('BH: alles bleibt im Streifen – 580 breit, y 1808 bis 2329', () => {
  for (const z of resolved) {
    const a = anchors.get(z.anchor.assetId);
    assert.ok(z.x >= a.x - 1e-6, `${z.label} beginnt links vom Tableau`);
    assert.ok(z.x + z.width <= a.x + BAND.pitch + 1e-6, `${z.label} ragt zum Nachbarn`);
    assert.ok(z.y >= BAND.top - 1e-6, `${z.label} liegt über dem Streifen`);
    // Unterkante der Werkzeugleiste in Weltkoordinaten bei der Ansicht
    // „Dörfler" (Mitte 1149,5/1675, Zoom 0,41, Fenster 932×738).
    assert.ok(z.y + z.height <= BAND.bottom + 1e-6, `${z.label} liegt unter der Werkzeugleiste`);
  }
});

test('BH: ein Slot hat genau einen Platz, und der liegt mittig', () => {
  for (const z of resolved.filter(q => q.capacity === 1)) {
    const slots = zoneSlots(z);
    assert.equal(slots.length, 1, z.label);
    assert.equal(zoneCapacity(z), 1, z.label);
    assert.ok(Math.abs(slots[0].x - (z.x + z.width / 2)) < 1e-6, z.label);
    assert.ok(Math.abs(slots[0].y - (z.y + z.height / 2)) < 1e-6, z.label);
  }
});

test('BH: `Hände` hat zwei Plätze, weit genug für zwei Karten', () => {
  for (const z of resolved.filter(q => q.label.endsWith(': Hände'))) {
    const slots = zoneSlots(z);
    assert.equal(slots.length, 2, z.label);
    assert.ok(Math.abs(slots[1].x - slots[0].x) >= BAND.card.width, z.label);
    assert.equal(slots[0].y, slots[1].y, z.label);
  }
});

// BV / M21.4: der Vorrat ist ein Ablagestapel ohne Obergrenze.
//
// „Es gibt keine Obergrenze, wie viel Ausrüstung ein Dörfler besitzen darf"
// `[BR S.8]` — und in 580 × 140 Weltpunkten gibt es keine zweite Kartenreihe
// (`cols = round(sqrt(cap·w/h))` liefert bei 580/140 höchstens fünf in einer
// Reihe, jede Kapazität darüber zwei Reihen). Jede Zahl wäre eine erfundene
// Grenze; `capacity` weg heißt `zoneCapacity === null` heißt `zoneRejects`
// sagt nie „voll". Begründung in docs/tasks-partie12.md, BV.
test('BV: der Vorrat hat einen Platz und keine Obergrenze', () => {
  for (const z of resolved.filter(q => q.label.startsWith('Ausrüstung Dörfler '))) {
    assert.equal(z.layout, 'stack', z.label);
    assert.equal(zoneCapacity(z), null, `${z.label}: trägt noch eine Obergrenze`);
    const slots = zoneSlots(z);
    assert.equal(slots.length, 1, z.label);
    assert.ok(Math.abs(slots[0].x - (z.x + z.width / 2)) < 1e-6, z.label);
    assert.ok(Math.abs(slots[0].y - (z.y + z.height / 2)) < 1e-6, z.label);
  }
});

test('BV: die fünfzehn Slot-Zonen bleiben, wie M18 sie gemessen hat', () => {
  const slots = resolved.filter(q => /: (Kopf|Brust|Beine|Hände|Mitbringsel)$/.test(q.label));
  assert.equal(slots.length, 15);
  for (const z of slots) {
    assert.equal(z.layout, 'row', z.label);
    assert.equal(z.height, BAND.card.height, z.label);
  }
});

test('BH: in keine Zone passt mehr, als die Regel erlaubt', () => {
  const kopf = resolved.find(z => z.label === 'Dörfler 1: Kopf');
  const haende = resolved.find(z => z.label === 'Dörfler 1: Hände');
  const vorrat = resolved.find(z => z.label === 'Ausrüstung Dörfler 1');

  assert.equal(zoneRejects(kopf, 'card', 0), null);
  assert.equal(zoneRejects(kopf, 'card', 1), 'zone "Dörfler 1: Kopf" is full (1)');
  assert.equal(zoneRejects(haende, 'card', 1), null);
  assert.equal(zoneRejects(haende, 'card', 2), 'zone "Dörfler 1: Hände" is full (2)');
  // BV / M21.4: der Vorrat weist nie ab — „WAFFEN-WIRRWARR" gibt zwei
  // Dörflern gegenseitig **alle** Waffen, und die sechste Karte blieb beim
  // falschen Besitzer.
  assert.equal(zoneRejects(vorrat, 'card', 5), null);
  assert.equal(zoneRejects(vorrat, 'card', 42), null);
  // Nur Karten, kein Marker und kein Würfel.
  assert.ok(zoneRejects(kopf, 'asset', 0));
});

test('BH: jedes Schild hängt über seiner Zone und auf keiner anderen', () => {
  for (const z of resolved) {
    assert.equal(zoneLabelAbove(z, resolved), true, `${z.label} wird nach unten gedrängt`);
    const strip = {
      x: z.x,
      y: z.y - ZONE_LABEL_HEIGHT,
      width: Math.max(z.width, ZONE_LABEL_WIDTH),
      height: ZONE_LABEL_HEIGHT,
    };
    for (const other of resolved) {
      if (other.id === z.id) continue;
      assert.ok(!overlaps(strip, other), `Schild von ${z.label} liegt auf ${other.label}`);
    }
  }
});

test('BH: kein Schild ragt über seine eigene Zone hinaus zum Nachbarn', () => {
  for (const z of resolved) {
    assert.ok(LABEL_INSET + WIDEST_LABEL <= z.width,
      `${z.label} ist schmaler als sein Schild`);
  }
});
