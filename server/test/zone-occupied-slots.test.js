// M11.8 – fremde Karten in einer Zone zählen nicht als Belegung.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Befund aus der vierten Solopartie: beim Auffüllen der Heldentaten landete
// eine Karte deckungsgleich auf einer liegenden. Ursache war eine
// beiseitegelegte Bösewicht-Aktionskarte, die nur im **Rechteck** der Zone lag,
// auf keinem ihrer sechs Plätze – und trotzdem als Belegung zählte.
//
// M8.1 („in einem Stapel liegt nichts frei") und M9.4 („ein Stapel ist ein
// Ding") haben dieselbe Familie zweimal behandelt. Beide Male lautete die
// Antwort: gezählt wird, was wirklich einen Platz einnimmt.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { countInZone, zoneSlots, freeSlots, zoneRejects } = await import('../../shared/zoneGeometry.js');
const { executeSequence } = await import('../../shared/sequenceExecutor.js');

/** Die Heldentaten-Auslage: sechs Plätze in einer Reihe, 600 breit. */
const shelf = { label: 'Heldentaten-Auslage', x: 0, y: 0, width: 600, height: 140, layout: 'row', capacity: 6 };
const at = (i) => zoneSlots(shelf)[i];

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [], counters: [], dice: [], hand: [] });

// ── Zählen ───────────────────────────────────────────────────────────────────

test('eine Karte im Rechteck, aber auf keinem Platz, zählt nicht (Abnahme 1)', () => {
  const onSlot = { ...at(0) };
  const stray = { x: 305, y: 20 }; // zwischen Platz 3 und 4, oben in der Zone
  assert.equal(countInZone(shelf, [onSlot]), 1);
  assert.equal(countInZone(shelf, [onSlot, stray]), 1, 'die fremde Karte zählt mit');
});

test('eine Zone ohne feste Plätze zählt unverändert (Abnahme 3)', () => {
  const free = { label: 'Tisch', x: 0, y: 0, width: 600, height: 140 };
  assert.equal(countInZone(free, [{ x: 10, y: 10 }, { x: 305, y: 20 }, { x: 590, y: 130 }]), 3);
});

test('ein Ablagestapel zählt weiter jede Karte – dort deckt eine die andere zu', () => {
  const pile = { label: 'Ablage', x: 0, y: 0, width: 100, height: 140, layout: 'stack' };
  const c = { x: 50, y: 70 };
  assert.equal(countInZone(pile, [c, { ...c }, { ...c }]), 3);
});

test('freeSlots nennt die Plätze, auf denen nichts liegt', () => {
  const free = freeSlots(shelf, [{ ...at(0) }, { ...at(3) }, { x: 305, y: 20 }]);
  assert.equal(free.length, 4);
  assert.deepEqual(free.map(p => p.x), [at(1), at(2), at(4), at(5)].map(p => p.x));
  assert.equal(freeSlots({ label: 'x', width: 10, height: 10 }, []), null, 'ohne Plätze keine Antwort');
});

// ── Austeilen ────────────────────────────────────────────────────────────────

function stackOf(n) {
  return {
    stackId: 's1', label: 'Heldentaten', x: 0, y: 0,
    cards: Array.from({ length: n }, (_, i) => ({ tableId: `c${i}`, id: i, name: `H${i}`, zIndex: n - i })),
  };
}

test('zwei ausgeteilte Karten landen nie deckungsgleich (Abnahme 2)', () => {
  const state = emptyState();
  state.stacks.push(stackOf(6));
  // Die fremde Karte: im Rechteck, auf keinem Platz.
  state.cards.push({ tableId: 'fremd', x: 305, y: 20 });

  const after = executeSequence(state, [
    { type: 'deal_to_zone', stackLabel: 'Heldentaten', count: 6, fill: true, targetZoneLabel: 'Heldentaten-Auslage' },
  ], [shelf]);

  const dealt = after.cards.filter(c => c.tableId !== 'fremd');
  assert.equal(dealt.length, 6, 'alle sechs Plätze werden belegt');
  const seen = new Set(dealt.map(c => `${c.x}/${c.y}`));
  assert.equal(seen.size, 6, 'zwei Karten liegen deckungsgleich');
});

test('das Auffüllen rechnet gegen die belegten Plätze, nicht gegen das Rechteck', () => {
  const state = emptyState();
  state.stacks.push(stackOf(6));
  state.cards.push({ tableId: 'alt0', ...at(0) });
  state.cards.push({ tableId: 'alt1', ...at(1) });
  state.cards.push({ tableId: 'fremd', x: 305, y: 20 });

  const after = executeSequence(state, [
    { type: 'deal_to_zone', stackLabel: 'Heldentaten', count: 6, fill: true, targetZoneLabel: 'Heldentaten-Auslage' },
  ], [shelf]);

  // Liegen zwei, teilt sie vier aus (M11.2 Abnahme 2) - die fremde Karte
  // aendert daran nichts, und die vier landen auf den vier freien Plaetzen.
  const dealt = after.cards.filter(c => String(c.tableId).startsWith('c'));
  assert.equal(dealt.length, 4);
  assert.deepEqual(
    dealt.map(c => c.x).sort((a, b) => a - b),
    [at(2), at(3), at(4), at(5)].map(p => p.x).sort((a, b) => a - b),
  );
});

test('eine volle Zone bleibt voll – die Abweisung rechnet mit denselben Plätzen', () => {
  const full = [0, 1, 2, 3, 4, 5].map(i => ({ ...at(i) }));
  assert.match(zoneRejects(shelf, 'card', countInZone(shelf, full)), /is full \(6\)/);
});
