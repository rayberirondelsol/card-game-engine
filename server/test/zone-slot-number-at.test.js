// DV – die Umkehrung: Punkt → Platznummer (docs/tasks-m30-setupwahl.md, Spec M30.7).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// `zoneSlotNumbered(zone, n)` gibt den Punkt zu einer Nummer, `zoneSlotNumberAt`
// die Gegenrichtung: die Nummer des Platzes, den ein Punkt trifft. Gebraucht wird
// sie, um den **Wert** eines Markers auf einer Leiste zu lesen (`require_marker`).
//
// Drei Dinge werden festgenagelt: `0` ist eine Nummer (Praezision laeuft von -4
// bis 5, ein Aufrufer mit `if (nr)` laese Platz 0 als „nichts"); die Toleranz ist
// `onSlot` und keine „naechster Platz"-Regel (M8.10); und die Nummer kommt aus
// derselben Rechnung wie in `zoneSlotNumbered`.
//
// Die echten Zonen sind die der Produktion (`fixtures/auslagen-kurzpartie.json`,
// Stand vor M27 - die Leisten haben sich seitdem nicht geaendert). Die Tableaus
// der Doerfler hat der Aufbau gelegt (`villager-table.js`), die Zonen haengen an
// ihnen; darum werden sie gegen **diesen** Tisch aufgeloest.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { zoneSlots, zoneSlotNumbered, zoneSlotNumberAt, freeSlots } from '../../shared/zoneGeometry.js';
import { resolveZones, anchorBoxes } from '../../shared/anchoring.js';
import { build } from './villager-table.js';

const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/auslagen-kurzpartie.json', import.meta.url), 'utf8'));
const table = build();
const REAL = resolveZones(fx.zones, anchorBoxes([...fx.state.boards, ...table.boards], [...fx.state.tokens, ...table.tokens]));
const real = (label) => REAL.find(z => z.label === label);
const BARS = REAL.filter(z => z.layout === 'slots' && /^(Dörfler \d: |Bösewicht: )/.test(z.label));
const numbersOf = (z) => z.slots.map((s, k) => (Number.isFinite(s?.n) ? s.n : k + 1));

// Ein kleines Rechteck ohne Anker (x 100..300, y 100..140).
const rect = (over) => ({ id: 'z', label: 'Z', shape: 'rect', type: 'shared', accepts: ['asset'], x: 100, y: 100, width: 200, height: 40, ...over });

// ── 1. Rundreise ─────────────────────────────────────────────────────────────

test('DV: es gibt 14 Leisten mit Plaetzen: 3 Doerfler x 4 Werte, Boesewicht Bewegung (12) und Leben (24)', () => {
  assert.equal(BARS.length, 14);
  assert.equal(real('Bösewicht: Bewegung').slots.length, 12);
  assert.equal(real('Bösewicht: Leben').slots.length, 24);
  assert.equal(BARS.filter(z => z.label.startsWith('Dörfler')).length, 12);
});

test('DV: Rundreise – jede Nummer jeder echten Leiste kommt als dieselbe Nummer zurueck', () => {
  let gepruft = 0;
  for (const z of BARS) {
    for (const n of numbersOf(z)) {
      const p = zoneSlotNumbered(z, n);
      assert.ok(p, `${z.label}: Nummer ${n} hat einen Punkt`);
      assert.strictEqual(zoneSlotNumberAt(z, p.x, p.y), n, `${z.label}: Nummer ${n}`);
      gepruft++;
    }
  }
  assert.equal(gepruft, 12 * 10 + 12 + 24);
});

// ── 2. Null ist eine Zahl ────────────────────────────────────────────────────

test('DV: Praezision hat Platz 0 – die Funktion gibt 0 zurueck, nicht null (und -4, nicht null)', () => {
  const z = real('Dörfler 1: Präzision');
  assert.deepEqual(numbersOf(z), [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5]);
  const p0 = zoneSlotNumbered(z, 0);
  const at0 = zoneSlotNumberAt(z, p0.x, p0.y);
  assert.strictEqual(at0, 0);
  assert.notStrictEqual(at0, null);
  const p4 = zoneSlotNumbered(z, -4);
  assert.strictEqual(zoneSlotNumberAt(z, p4.x, p4.y), -4);
});

test('DV: ein Punkt, der keinem Platz gleicht, ist null', () => {
  const z = real('Dörfler 1: Leben');
  assert.strictEqual(zoneSlotNumberAt(z, z.x - 500, z.y - 500), null);
  // Die Leiste hat keinen Platz 0 (Leben 1..10): ein Punkt auf ihr, der keinen trifft, ist null, nicht 0.
  const [a, b] = zoneSlots(z);
  assert.strictEqual(zoneSlotNumberAt(z, (a.x + b.x) / 2 + 3, (a.y + b.y) / 2), null);
});

// ── 3. Toleranz: onSlot, nichts anderes ──────────────────────────────────────

test('DV: 0,4 Punkt neben dem Platz trifft, 0,6 nicht – in beide Richtungen und an beiden Achsen', () => {
  const z = real('Dörfler 2: Mumm');
  for (const n of [1, 5, 10]) {
    const p = zoneSlotNumbered(z, n);
    for (const [dx, dy] of [[0.4, 0], [-0.4, 0], [0, 0.4], [0, -0.4], [0.4, -0.4]]) {
      assert.strictEqual(zoneSlotNumberAt(z, p.x + dx, p.y + dy), n, `Nr. ${n} ${dx}/${dy}`);
    }
    for (const [dx, dy] of [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6], [0.6, 0.6]]) {
      assert.strictEqual(zoneSlotNumberAt(z, p.x + dx, p.y + dy), null, `Nr. ${n} ${dx}/${dy}`);
    }
  }
});

test('DV: mitten zwischen zwei Plaetzen ist null – kein „naechster Platz"', () => {
  const z = real('Bösewicht: Leben');
  const [a, b] = zoneSlots(z);
  assert.strictEqual(zoneSlotNumberAt(z, (a.x + b.x) / 2, (a.y + b.y) / 2), null);
});

test('DV: dieselbe Schwelle wie `freeSlots` – was dort „liegt auf dem Platz" ist, hat die Nummer, und umgekehrt', () => {
  const z = real('Dörfler 3: Bewegung');
  const slots = zoneSlots(z);
  for (const d of [0, 0.2, 0.49, 0.51, 0.6, 2]) {
    slots.forEach((s, k) => {
      const o = { x: s.x + d, y: s.y };
      const besetzt = freeSlots(z, [o]).length < slots.length;
      const nr = zoneSlotNumberAt(z, o.x, o.y);
      assert.equal(nr !== null, besetzt, `d=${d} Platz ${k + 1}`);
      if (besetzt) assert.strictEqual(nr, k + 1);
    });
  }
});

// ── 4. Zonen ohne feste Plaetze, abgeleitete Plaetze ─────────────────────────

test('DV: `free`, ohne Layout, und `row` ohne `capacity` haben keine Plaetze – null', () => {
  for (const z of [rect({ layout: 'free' }), rect({}), rect({ layout: 'row' }), rect({ layout: 'slots', slots: [] }), null, undefined]) {
    assert.strictEqual(zoneSlotNumberAt(z, 200, 120), null, JSON.stringify(z));
  }
});

test('DV: abgeleitete Plaetze (`row` mit `capacity`) zaehlen ab 1, nach Position', () => {
  const z = rect({ layout: 'row', capacity: 4 });
  const pts = zoneSlots(z);
  assert.equal(pts.length, 4);
  pts.forEach((p, k) => {
    assert.strictEqual(zoneSlotNumberAt(z, p.x, p.y), k + 1);
    assert.deepEqual(zoneSlotNumbered(z, k + 1), p);
  });
});

test('DV: ein `stack` hat einen Platz – die Nummer 1', () => {
  const z = rect({ layout: 'stack', width: 100, height: 140 });
  const p = zoneSlotNumbered(z, 1);
  assert.ok(p);
  assert.strictEqual(zoneSlotNumberAt(z, p.x, p.y), 1);
});

// ── 5. Unsinn wirft nie ──────────────────────────────────────────────────────

test('DV: x/y `undefined`, null, leer, NaN oder Text – null, kein Wurf (leer ist keine 0)', () => {
  // Ein Platz bei x = 0, y = 0: `Number('')` waere 0 und traefe ihn.
  const z = { id: 'n', label: 'N', shape: 'rect', type: 'shared', layout: 'slots', x: -10, y: -10, width: 20, height: 20, slots: [{ n: 7, relX: 0.5, relY: 0.5 }] };
  assert.strictEqual(zoneSlotNumberAt(z, 0, 0), 7, 'der Platz liegt wirklich bei 0/0');
  const schlecht = [undefined, null, '', NaN, 'abc', '0', Infinity, {}, []];
  for (const v of schlecht) {
    assert.doesNotThrow(() => zoneSlotNumberAt(z, v, 0), `x=${String(v)}`);
    assert.strictEqual(zoneSlotNumberAt(z, v, 0), null, `x=${String(v)}`);
    assert.strictEqual(zoneSlotNumberAt(z, 0, v), null, `y=${String(v)}`);
  }
  assert.strictEqual(zoneSlotNumberAt(z), null);
});

// ── 6. Eine Regel fuer die Nummer ────────────────────────────────────────────

test('DV: Plaetze, die nur zum Teil `n` tragen (1, ohne, 5): beide Richtungen sagen dasselbe', () => {
  const z = rect({
    layout: 'slots', width: 100, height: 20,
    slots: [{ n: 1, relX: 0.1, relY: 0.5 }, { relX: 0.4, relY: 0.5 }, { n: 5, relX: 0.8, relY: 0.5 }],
  });
  // Nr. 1 – dann eine Stelle ohne `n` (= ihre Position, 2) – dann die geschriebene 5.
  assert.deepEqual(numbersOf(z), [1, 2, 5]);
  zoneSlots(z).forEach((p, k) => {
    const n = [1, 2, 5][k];
    assert.deepEqual(zoneSlotNumbered(z, n), p, `Nr. ${n} hin`);
    assert.strictEqual(zoneSlotNumberAt(z, p.x, p.y), n, `Nr. ${n} zurueck`);
  });
  // Die Position 3 ist **nicht** vergeben: die dritte Stelle heisst 5.
  assert.strictEqual(zoneSlotNumbered(z, 3), null);
  assert.strictEqual(zoneSlotNumbered(z, 4), null);
});
