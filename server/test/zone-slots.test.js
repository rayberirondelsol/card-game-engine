// `layout: "slots"` – Zonen mit ausdrücklichen Plätzen (spec section 4,
// "Nachtrag zu Abschnitt 4: Zonen mit ausdrücklichen Plätzen").
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Die Plätze stehen als Bruchteil der ZONENBOX in `zone.slots`. Sie werden
// nicht aus dem Layout abgeleitet, und ihre Anzahl ist die Kapazität.
//
// Die Erwartungen sind hier von Hand ausgerechnet – nicht aus der Formel der
// Implementierung nachgebaut –, damit der Test auch dann fehlschlägt, wenn die
// Formel selbst falsch ist.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  zoneSlots, zoneSlotFor, zoneCapacity, zoneRejects, snapPoint,
} = await import('../../shared/zoneGeometry.js');
const { resolveZones } = await import('../../shared/anchoring.js');
const { executeSequence } = await import('../../shared/sequenceExecutor.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** Sechs Plätze, absichtlich im Zickzack – kein Gitter kann das erzeugen. */
const SIX = [
  { relX: 0.5, relY: 0.1 },
  { relX: 0.25, relY: 0.3 },
  { relX: 0.75, relY: 0.5 },
  { relX: 0.1, relY: 0.7 },
  { relX: 0.9, relY: 0.85 },
  { relX: 0.5, relY: 0.95 },
];

/** Zonenbox 200 × 400 bei (100, 200). */
function bar(over = {}) {
  return { label: 'Bosseleiste', x: 100, y: 200, width: 200, height: 400, layout: 'slots', slots: SIX, ...over };
}

// x = 100 + relX*200, y = 200 + relY*400 – von Hand ausgerechnet.
const SIX_ABS = [
  { x: 200, y: 240 },
  { x: 150, y: 320 },
  { x: 250, y: 400 },
  { x: 120, y: 480 },
  { x: 280, y: 540 },
  { x: 200, y: 580 },
];

function emptyState() {
  return { cards: [], stacks: [], tokens: [], boards: [] };
}

// ── Die Plätze selbst ────────────────────────────────────────────────────────

test('sechs ausdrückliche Plätze ergeben sechs Punkte in Reihenfolge der Liste', () => {
  assert.deepEqual(zoneSlots(bar()), SIX_ABS);
});

test('die Platzliste ist die Kapazität – ein siebtes Objekt wird abgelehnt', () => {
  assert.equal(zoneRejects(bar(), 'asset', 5), null, 'sechs Plätze nehmen ein sechstes Objekt');
  assert.match(zoneRejects(bar(), 'asset', 6), /full \(6\)/);
});

test('zoneCapacity meldet die Platzanzahl, auch wenn capacity etwas anderes sagt', () => {
  assert.equal(zoneCapacity(bar({ capacity: 99 })), 6);
  assert.equal(zoneCapacity(bar({ capacity: 2 })), 6);
  assert.equal(zoneRejects(bar({ capacity: 2 }), 'asset', 3), null, 'capacity 2 darf sechs Plätze nicht kürzen');
});

test('slots leer oder fehlend heißt keine Plätze – wie free, nicht wie column', () => {
  assert.equal(zoneSlots(bar({ slots: [] })), null);
  assert.equal(zoneSlots(bar({ slots: undefined })), null);
  assert.equal(zoneCapacity(bar({ slots: [] })), null, 'ohne Plätze auch keine Kapazität daraus');
  // Kein stilles Ausweichen auf eine Spalte: zoneSlotFor fällt auf die alte
  // Verteilung entlang der längeren Achse zurück, aber zoneSlots bleibt leer.
  assert.equal(zoneSlots(bar({ slots: [], capacity: 4 })), null, 'auch ein capacity rettet keine Plätze');
});

test('zoneSlotFor gibt Platz i heraus', () => {
  assert.deepEqual(zoneSlotFor(bar(), 0, 6), SIX_ABS[0]);
  assert.deepEqual(zoneSlotFor(bar(), 3, 6), SIX_ABS[3]);
  assert.deepEqual(zoneSlotFor(bar(), 5, 6), SIX_ABS[5]);
});

// ── M3a: die Plätze hängen an der Zonenbox, die Box am Anker ─────────────────

test('verschobener und skalierter Anker nimmt die Plätze mit', () => {
  const zone = {
    ...bar(),
    anchor: { assetId: 'board', relX: 0.1, relY: 0.2, relWidth: 0.25, relHeight: 0.5 },
  };
  const small = { id: 'board', x: 0, y: 0, width: 800, height: 800 };
  const moved = { id: 'board', x: 1000, y: 500, width: 1600, height: 1600 };

  // Kleiner Anker: Box = (80, 160, 200, 400) – gleiche Größe wie oben, nur versetzt.
  const a = zoneSlots(resolveZones([zone], [small])[0]);
  assert.deepEqual(a, SIX_ABS.map(p => ({ x: p.x - 20, y: p.y - 40 })));

  // Doppelt so groß und verschoben: Box = (1160, 820, 400, 800).
  const b = zoneSlots(resolveZones([zone], [moved])[0]);
  assert.deepEqual(b, [
    { x: 1360, y: 900 },
    { x: 1260, y: 1060 },
    { x: 1460, y: 1220 },
    { x: 1200, y: 1380 },
    { x: 1520, y: 1500 },
    { x: 1360, y: 1580 },
  ]);
});

// ── Einrasten und Austeilen gehen durch denselben Pfad ───────────────────────

test('snapPoint rastet auf den nächsten ausdrücklichen Platz ein und meidet belegte', () => {
  const z = bar({ snap: true });
  assert.deepEqual(snapPoint(z, 245, 410), SIX_ABS[2], 'der nächste Platz gewinnt');
  assert.deepEqual(snapPoint(z, 245, 410, [SIX_ABS[2]]), SIX_ABS[1], 'der belegte zählt nicht mit');
  assert.deepEqual(snapPoint(bar(), 245, 410), { x: 245, y: 410 }, 'ohne snap bleibt der Fallpunkt');
});

test('deal_to_zone legt die erste Karte auf Platz 0, die zweite auf Platz 1', () => {
  const state = emptyState();
  state.stacks.push({
    stackId: 's1', label: 'Nachschub', x: 0, y: 0,
    cards: [0, 1, 2].map(i => ({ tableId: `t${i}`, cardId: `c${i}`, name: `Karte ${i}`, zIndex: i + 1, faceDown: false })),
  });

  const out = executeSequence(
    state,
    [{ type: 'deal_to_zone', stackLabel: 'Nachschub', count: 2, targetZoneLabel: 'Bosseleiste' }],
    [bar()]
  );

  assert.equal(out.cards.length, 2);
  assert.deepEqual({ x: out.cards[0].x, y: out.cards[0].y }, SIX_ABS[0]);
  assert.deepEqual({ x: out.cards[1].x, y: out.cards[1].y }, SIX_ABS[1]);
});

// ── Abnahme: die gemessene Beatin'-Leiste aus Townsfolk Tussle ───────────────

test("Abnahme: die sechs gemessenen Kreise der Beatin'-Leiste liegen im Kreis", () => {
  // Gemessen im Brettbild 3000 × 2500 (spec, Tabelle im Nachtrag zu Abschnitt 4).
  const PRINTED = [
    { name: 'Bösewicht', cx: 225, cy: 285 },
    { name: '1', cx: 302, cy: 443 },
    { name: '2', cx: 228, cy: 570 },
    { name: '3', cx: 200, cy: 727 },
    { name: '4', cx: 282, cy: 860 },
    { name: '5', cx: 220, cy: 1005 },
  ];

  // Die Zone deckt im Brettbild den Streifen x 150…350, y 200…1100 ab.
  const ZX = 150, ZY = 200, ZW = 200, ZH = 900;

  const zone = {
    label: "Beatin'", layout: 'slots', shape: 'rect',
    // letzte aufgelöste Box – wird vom Anker überschrieben
    x: 0, y: 0, width: 1, height: 1,
    anchor: { assetId: 'board', relX: ZX / 3000, relY: ZY / 2500, relWidth: ZW / 3000, relHeight: ZH / 2500 },
    slots: PRINTED.map(p => ({ relX: (p.cx - ZX) / ZW, relY: (p.cy - ZY) / ZH })),
  };

  // Das Brett liegt als 1200 × 1000 auf dem Tisch, Mittelpunkt (2000, 1500).
  const board = { id: 'board', x: 1400, y: 1000, width: 1200, height: 1000 };
  const slots = zoneSlots(resolveZones([zone], [board])[0]);

  assert.equal(slots.length, 6);
  // Erwartung unabhängig gerechnet: Brettpixel → Tischpixel, Maßstab 1200/3000
  // bzw. 1000/2500, Ursprung linke obere Ecke des Bretts.
  PRINTED.forEach((p, i) => {
    const want = { x: 1400 + (p.cx * 1200) / 3000, y: 1000 + (p.cy * 1000) / 2500 };
    assert.ok(
      Math.hypot(slots[i].x - want.x, slots[i].y - want.y) <= 8,
      `Platz ${p.name}: ${JSON.stringify(slots[i])} statt ${JSON.stringify(want)}`
    );
  });
});
