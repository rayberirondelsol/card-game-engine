// BH → CI / Spec M26.1 — die sechs Ausrüstungsplätze je Dörfler am Tableaurand
// und der Vorrat darunter.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die Zahlen stehen in `scripts/equipment-zones.mjs` und werden hier gegen die
// Maschinerie geprüft, die sie am Tisch auslegt (`shared/zoneGeometry.js`,
// `shared/anchoring.js`) — nicht gegen sich selbst. Die Pfeilhöhen sind **hier
// noch einmal ausgeschrieben**, als Messwerte aus `docs/doerflerdaten.md` 6.2:
// ein Test, der sie aus dem Baustein liest, fände keinen Tippfehler darin.
// Begründung, Messwerte und die verworfenen Aufteilungen: `docs/tasks-doerfler.md`
// (CI) und, für den Vorrat, `docs/tasks-ausruestung.md` (BH).
//
// Bis M26 lagen fünf Zonen **unter** dem Tableau (`Hände` mit zwei Plätzen).
// Das Tableau trägt die Plätze aber an den Längsseiten, mit Pfeilen nach außen.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { equipmentZones, MEASURED_ANCHORS, BAND, ZONE_BOX } from '../../scripts/equipment-zones.mjs';
import { MEASURED_NEIGHBOURS } from '../../scripts/partie13-daten.mjs';
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

// Gemessen (docs/doerflerdaten.md 6.2): 0 = Oberkante, 1 = Unterkante des
// Tableaus, bei allen neun gleich. Links und rechts liegt das **dritte** Paar
// nicht gleich hoch (0,844 / 0,826).
const ARROW = {
  'Kopf': 0.154, 'Brust': 0.491, 'Beine': 0.844,
  'Linke Hand': 0.154, 'Rechte Hand': 0.491, 'Mitbringsel': 0.826,
};
const LEFT = ['Kopf', 'Brust', 'Beine'];
const RIGHT = ['Linke Hand', 'Rechte Hand', 'Mitbringsel'];
const SLOT_NAMES = [...LEFT, ...RIGHT];
const SLOT_LABEL = /: (Kopf|Brust|Beine|Linke Hand|Rechte Hand|Mitbringsel)$/;

const anchors = new Map(MEASURED_ANCHORS.map(a => [a.id, a]));
const resolved = equipmentZones().map(z => ({ ...z, ...resolveBox(z.anchor, anchors.get(z.anchor.assetId)) }));
const slotsOf = (n) => resolved.filter(z => z.label.startsWith(`Dörfler ${n}: `) && SLOT_LABEL.test(z.label));
const tableau = (z) => anchors.get(z.anchor.assetId);
const slotName = (z) => z.label.replace(/^Dörfler \d: /, '');

const overlaps = (a, b) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('CI: einundzwanzig Zonen mit eindeutigen Namen – achtzehn Plätze, drei Vorräte', () => {
  assert.equal(resolved.length, 21);
  assert.equal(resolved.filter(z => z.label.startsWith('Ausrüstung Dörfler ')).length, 3);
  assert.equal(resolved.filter(z => SLOT_LABEL.test(z.label)).length, 18);
  assert.equal(new Set(resolved.map(z => z.label)).size, 21);
  assert.equal(new Set(resolved.map(z => z.id)).size, 21);
  // Ein Name adressiert eine Zone (`targetZoneLabel`, `clear_zone`), darum
  // drei getrennte Sätze statt dreimal „Kopf".
  for (const n of [1, 2, 3]) {
    for (const slot of SLOT_NAMES) {
      assert.ok(resolved.some(z => z.label === `Dörfler ${n}: ${slot}`), `${slot} fehlt bei Dörfler ${n}`);
    }
  }
});

test('CI: `Hände` gibt es nicht mehr – Linke und Rechte Hand sind getrennt, je ein Platz', () => {
  assert.ok(!resolved.some(z => z.label.endsWith(': Hände')), 'die Zone mit zwei Plätzen steht noch da');
  for (const n of [1, 2, 3]) {
    const links = resolved.find(z => z.label === `Dörfler ${n}: Linke Hand`);
    const rechts = resolved.find(z => z.label === `Dörfler ${n}: Rechte Hand`);
    assert.ok(links && rechts, `Dörfler ${n}: Hände nicht getrennt`);
    assert.equal(zoneCapacity(links), 1);
    assert.equal(zoneCapacity(rechts), 1);
    assert.equal(zoneSlots(links).length, 1);
    assert.equal(zoneSlots(rechts).length, 1);
    assert.notEqual(links.y, rechts.y, 'beide Hände liegen auf derselben Höhe');
  }
});

test('CI: jede Zone sitzt auf der Höhe ihres Pfeils – auch das dritte Paar, ungeglättet', () => {
  for (const z of resolved.filter(q => SLOT_LABEL.test(q.label))) {
    const a = tableau(z);
    const mitte = z.y + z.height / 2;
    const soll = a.y + ARROW[slotName(z)] * a.height;
    assert.ok(Math.abs(mitte - soll) < 1e-6, `${z.label}: Mitte ${mitte}, Pfeil ${soll}`);
  }
  // Links 0,844 und rechts 0,826: 7,2 Weltpunkte Unterschied, gemessen.
  const beine = resolved.find(z => z.label === 'Dörfler 1: Beine');
  const mitbringsel = resolved.find(z => z.label === 'Dörfler 1: Mitbringsel');
  assert.ok(Math.abs((beine.y - mitbringsel.y) - 0.018 * 400) < 1e-6);
});

test('CI: links stehen Kopf/Brust/Beine, rechts Linke Hand/Rechte Hand/Mitbringsel – außerhalb des Tableaus', () => {
  for (const z of resolved.filter(q => SLOT_LABEL.test(q.label))) {
    const a = tableau(z);
    if (LEFT.includes(slotName(z))) {
      assert.ok(z.x + z.width <= a.x + 1e-6, `${z.label} ragt über den linken Rand`);
      assert.ok(Math.abs(z.x + z.width - a.x) < 1e-6, `${z.label} sitzt nicht am Rand`);
    } else {
      assert.ok(z.x >= a.x + a.width - 1e-6, `${z.label} ragt über den rechten Rand`);
      assert.ok(Math.abs(z.x - (a.x + a.width)) < 1e-6, `${z.label} sitzt nicht am Rand`);
    }
  }
});

test('CI: die Zonen der Nachbarn halten Abstand – 580 Mitte zu Mitte, 280 Lücke', () => {
  const feld = (n) => slotsOf(n).reduce((m, z) => ({
    min: Math.min(m.min, z.x), max: Math.max(m.max, z.x + z.width),
  }), { min: Infinity, max: -Infinity });
  assert.equal(BAND.pitch, 580);
  for (const n of [1, 2]) {
    // rechte Zonen von n und linke Zonen von n+1 treffen sich in der Lücke.
    const rechts = Math.max(...slotsOf(n).filter(z => RIGHT.includes(slotName(z))).map(z => z.x + z.width));
    const links = Math.min(...slotsOf(n + 1).filter(z => LEFT.includes(slotName(z))).map(z => z.x));
    assert.ok(links - rechts >= 40 - 1e-6, `zwischen Dörfler ${n} und ${n + 1} bleiben nur ${links - rechts}`);
  }
  // Nichts ragt weiter als die eigene Zonenbreite über das Tableau hinaus.
  for (const n of [1, 2, 3]) {
    const a = anchors.get(MEASURED_ANCHORS[n - 1].id);
    const f = feld(n);
    assert.ok(f.min >= a.x - ZONE_BOX.width - 1e-6);
    assert.ok(f.max <= a.x + a.width + ZONE_BOX.width + 1e-6);
  }
});

test('CI: keine Zone überlappt eine andere, ein Tableau oder eine Nachbarzone des Tisches', () => {
  for (let i = 0; i < resolved.length; i++) {
    for (let k = i + 1; k < resolved.length; k++) {
      assert.ok(!overlaps(resolved[i], resolved[k]), `${resolved[i].label} überlappt ${resolved[k].label}`);
    }
    for (const a of MEASURED_ANCHORS) {
      assert.ok(!overlaps(resolved[i], a), `${resolved[i].label} liegt auf einem Tableau`);
    }
    for (const n of MEASURED_NEIGHBOURS) {
      assert.ok(!overlaps(resolved[i], n), `${resolved[i].label} überlappt ${n.label}`);
    }
  }
});

test('CI: die Zonen sind niedriger als die Pfeilabstände abzüglich eines Schildes', () => {
  // Der engste Abstand ist rechts Rechte Hand → Mitbringsel: 0,335 · 400 = 134.
  // Ein Schild braucht 21 Punkte darüber (M16.1), sonst setzt `zoneLabelAbove`
  // es auf die Nachbarzone.
  assert.equal(ZONE_BOX.height, 112);
  assert.ok(ZONE_BOX.height + ZONE_LABEL_HEIGHT <= 0.335 * 400 + 1e-6);
  for (const z of resolved.filter(q => SLOT_LABEL.test(q.label))) {
    // Relativwerte mal Ankermaß: 0,28 · 400 ist 112,00000000000001.
    assert.ok(Math.abs(z.height - ZONE_BOX.height) < 1e-6, z.label);
    assert.ok(Math.abs(z.width - ZONE_BOX.width) < 1e-6, z.label);
  }
});

test('CI: ein Platz hat genau einen Platz, und der liegt mittig', () => {
  for (const z of resolved.filter(q => SLOT_LABEL.test(q.label))) {
    const slots = zoneSlots(z);
    assert.equal(z.layout, 'row', z.label);
    assert.equal(slots.length, 1, z.label);
    assert.equal(zoneCapacity(z), 1, z.label);
    assert.ok(Math.abs(slots[0].x - (z.x + z.width / 2)) < 1e-6, z.label);
    assert.ok(Math.abs(slots[0].y - (z.y + z.height / 2)) < 1e-6, z.label);
  }
});

test('CI: die Karte ragt über ihre Zone, aber nicht in die Karte des Nachbarn hinein, mehr als 6 Punkte', () => {
  // Kartenhöhe 140, engster Pfeilabstand 134: fünf bis sechs Punkte Überlapp
  // der Karten sind die Geometrie des Tableaus, nicht ein Fehler der Zone.
  const card = BAND.card;
  for (const n of [1, 2, 3]) {
    for (const seite of [LEFT, RIGHT]) {
      const zs = seite.map(s => resolved.find(z => z.label === `Dörfler ${n}: ${s}`)).sort((a, b) => a.y - b.y);
      for (let i = 1; i < zs.length; i++) {
        const abstand = (zs[i].y + zs[i].height / 2) - (zs[i - 1].y + zs[i - 1].height / 2);
        assert.ok(card.height - abstand <= 6.1, `${zs[i].label}: Karten überlappen um ${card.height - abstand}`);
      }
    }
  }
});

// BV / M21.4: der Vorrat ist ein Ablagestapel ohne Obergrenze.
//
// „Es gibt keine Obergrenze, wie viel Ausrüstung ein Dörfler besitzen darf"
// `[BR S.8]` — und in 580 × 140 Weltpunkten gibt es keine zweite Kartenreihe
// (`cols = round(sqrt(cap·w/h))` liefert bei 580/140 höchstens fünf in einer
// Reihe, jede Kapazität darüber zwei Reihen). Jede Zahl wäre eine erfundene
// Grenze; `capacity` weg heißt `zoneCapacity === null` heißt `zoneRejects`
// sagt nie „voll". Begründung in docs/tasks-partie12.md, BV. M26 lässt ihn, wo er
// ist (docs/tasks-doerfler.md, Entscheidung 1).
test('BV: der Vorrat hat einen Platz und keine Obergrenze – und bleibt unter dem Tableau', () => {
  for (const z of resolved.filter(q => q.label.startsWith('Ausrüstung Dörfler '))) {
    assert.equal(z.layout, 'stack', z.label);
    assert.equal(zoneCapacity(z), null, `${z.label}: trägt noch eine Obergrenze`);
    const slots = zoneSlots(z);
    assert.equal(slots.length, 1, z.label);
    assert.ok(Math.abs(slots[0].x - (z.x + z.width / 2)) < 1e-6, z.label);
    assert.ok(Math.abs(slots[0].y - (z.y + z.height / 2)) < 1e-6, z.label);
    const a = tableau(z);
    assert.ok(z.y >= a.y + a.height, `${z.label} liegt nicht unter dem Tableau`);
    assert.ok(z.x >= a.x - 1e-6 && z.x + z.width <= a.x + BAND.pitch + 1e-6, `${z.label} ragt zum Nachbarn`);
    assert.ok(z.y + z.height <= BAND.bottom + 1e-6, `${z.label} liegt unter der Werkzeugleiste`);
  }
});

test('CI: in keinen Platz passt mehr, als die Regel erlaubt; der Vorrat nimmt alles', () => {
  const kopf = resolved.find(z => z.label === 'Dörfler 1: Kopf');
  const links = resolved.find(z => z.label === 'Dörfler 1: Linke Hand');
  const vorrat = resolved.find(z => z.label === 'Ausrüstung Dörfler 1');

  assert.equal(zoneRejects(kopf, 'card', 0), null);
  assert.equal(zoneRejects(kopf, 'card', 1), 'zone "Dörfler 1: Kopf" is full (1)');
  assert.equal(zoneRejects(links, 'card', 1), 'zone "Dörfler 1: Linke Hand" is full (1)');
  // BV / M21.4: der Vorrat weist nie ab — „WAFFEN-WIRRWARR" gibt zwei
  // Dörflern gegenseitig **alle** Waffen, und die sechste Karte blieb beim
  // falschen Besitzer.
  assert.equal(zoneRejects(vorrat, 'card', 5), null);
  assert.equal(zoneRejects(vorrat, 'card', 42), null);
  // Nur Karten, kein Marker und kein Würfel.
  assert.ok(zoneRejects(kopf, 'asset', 0));
});

test('CI: jedes Schild hängt über seiner Zone und auf keiner anderen', () => {
  const alle = [...resolved, ...MEASURED_NEIGHBOURS];
  for (const z of resolved) {
    assert.equal(zoneLabelAbove(z, alle), true, `${z.label} wird nach unten gedrängt`);
    const strip = {
      x: z.x,
      y: z.y - ZONE_LABEL_HEIGHT,
      width: Math.max(z.width, ZONE_LABEL_WIDTH),
      height: ZONE_LABEL_HEIGHT,
    };
    for (const other of alle) {
      if (other.id && other.id === z.id) continue;
      assert.ok(!overlaps(strip, other), `Schild von ${z.label} liegt auf ${other.label || other.id}`);
    }
  }
});

test('CI: ein Schild ragt höchstens in die Lücke, nie in die Nachbarzone', () => {
  // Zonenbreite 120, breitestes Schild 125,6 (mit Einzug): es steht 5,6 Punkte
  // über. Die Lücke zwischen zwei Zonen ist 40 — das Überstehen trifft nie eine.
  for (const z of resolved.filter(q => SLOT_LABEL.test(q.label))) {
    const schild = { x: z.x, y: z.y - ZONE_LABEL_HEIGHT, width: LABEL_INSET + WIDEST_LABEL, height: ZONE_LABEL_HEIGHT };
    for (const other of resolved) {
      if (other.id === z.id) continue;
      assert.ok(!overlaps(schild, other), `Schild von ${z.label} liegt auf ${other.label}`);
    }
  }
});
