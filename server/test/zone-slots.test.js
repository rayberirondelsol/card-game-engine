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
  stackPoint, zoneCenter, zoneContains,
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

// ── M12.5 (AE1): der Ablagestapel liegt versetzt ─────────────────────────────
//
// Fünfte Solopartie: auf der `Ablage` lagen sechs Bösewicht-Aktionskarten auf
// **exakt derselben Koordinate**. Als eine Karte verlangte, den Ablagestapel
// zu mischen, war die aufliegende Karte, die draußen bleiben muss, nicht mehr
// herauszugreifen.
//
// Übereinanderliegen ist bei `layout: "stack"` der Zweck (M8.9 Regel 2),
// unsichtbar zu werden ist es nicht. Ein Stapel am Tisch ist versetzt genug,
// dass man sieht, wie viele es sind.
//
// Der Deckel ist kein Geschmack: ob eine Karte „in" einer Zone liegt,
// entscheidet `zoneContains` über ihren **Mittelpunkt**. Wandert der aus dem
// Rechteck, findet `clear_zone` sie nicht mehr und `require_zone` sieht sie
// nicht — der Stapel verlöre seine unterste Karte an den Tisch.

// Wie in `sequence-reveal-top.test.js`: die Ablage auf der DISCARD-Buchseite.
const STAPEL = { label: 'Ablage', x: 1000, y: 0, width: 200, height: 280, layout: 'stack', accepts: ['card'] };

test('M12.5: die erste Karte liegt weiterhin auf der Mitte', () => {
  assert.deepEqual(stackPoint(STAPEL, 0), zoneCenter(STAPEL));
  // Unbrauchbare Eingaben sind die Mitte, keine NaN-Koordinate.
  assert.deepEqual(stackPoint(STAPEL), zoneCenter(STAPEL));
  assert.deepEqual(stackPoint(STAPEL, -3), zoneCenter(STAPEL));
  assert.deepEqual(stackPoint(STAPEL, 'zwei'), zoneCenter(STAPEL));
});

test('M12.5 Abnahme 1: sechs Karten liegen auf sechs verschiedenen Stellen', () => {
  const punkte = Array.from({ length: 6 }, (_, i) => stackPoint(STAPEL, i));
  const eindeutig = new Set(punkte.map(p => `${p.x}/${p.y}`));
  assert.equal(eindeutig.size, 6, `nur ${eindeutig.size} unterscheidbare Stellen: ${[...eindeutig].join(' ')}`);
});

test('M12.5 Abnahme 2: der Versatz läuft monoton in eine Richtung', () => {
  // Monoton, damit die zuletzt gelegte Karte am weitesten heraussteht und
  // damit die ist, die man greift — M8.9/D2 gibt ihr ohnehin den höchsten
  // zIndex, der Versatz macht sie zusätzlich sichtbar.
  for (let i = 1; i < 12; i++) {
    const a = stackPoint(STAPEL, i - 1), b = stackPoint(STAPEL, i);
    assert.ok(b.x >= a.x && b.y >= a.y, `Karte ${i} rutscht zurück: ${JSON.stringify(a)} → ${JSON.stringify(b)}`);
  }
});

test('M12.5: auch der hundertste Versatz bleibt in der Zone', () => {
  for (const n of [1, 5, 12, 100, 10000]) {
    const p = stackPoint(STAPEL, n);
    assert.ok(zoneContains(STAPEL, p.x, p.y), `Karte ${n} liegt bei ${JSON.stringify(p)} nicht mehr in ihrer Zone`);
  }
  // Auch bei einer winzigen Zone, wo ein fester Schrittwert sofort hinausliefe.
  const winzig = { label: 'Klein', x: 0, y: 0, width: 12, height: 8, layout: 'stack' };
  for (const n of [1, 2, 50]) {
    const p = stackPoint(winzig, n);
    assert.ok(zoneContains(winzig, p.x, p.y), `winzige Zone, Karte ${n}: ${JSON.stringify(p)}`);
  }
});

test('M12.5 Abnahme 3: eine Zone mit festen Plätzen bleibt unberührt', () => {
  // `stackPoint` ist die Ausnahme für den Ablagestapel. Die Plätze einer Zone
  // rechnet weiterhin `zoneSlots`, und daran ändert sich nichts.
  const leiste = { label: 'Bösewicht-Leiste', x: 100, y: 100, width: 400, height: 80, capacity: 4, layout: 'row' };
  assert.deepEqual(zoneSlots(leiste).map(s => s.x), [150, 250, 350, 450]);
  assert.deepEqual(zoneSlotFor(leiste, 1, 4), { x: 250, y: 140 });
});

test('M12.5: auch von Hand abgelegt staffelt der Ablagestapel', () => {
  // `snapPoint` ist der zweite Weg auf eine Zone – der Zug von Hand. Liefe er
  // weiter auf die Mitte, spraenge eine hingezogene Karte unter den Faecher
  // zurueck, und Tisch und Aufbau saegten Verschiedenes.
  const schnapp = { ...STAPEL, snap: true };
  const liegt = [];
  const punkte = [];
  for (let i = 0; i < 4; i++) {
    const p = snapPoint(schnapp, 1180, 30, liegt);
    punkte.push(`${p.x}/${p.y}`);
    liegt.push(p);
  }
  assert.equal(new Set(punkte).size, 4, `nur ${new Set(punkte).size} Stellen: ${punkte.join(' ')}`);
  assert.deepEqual(punkte[0], `${zoneCenter(STAPEL).x}/${zoneCenter(STAPEL).y}`, 'die erste liegt auf der Mitte');
});
