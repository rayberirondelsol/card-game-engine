// M9.4 / H2: ein Stapel ist **ein** Ding in einer Zone.
//
// `handleCardDragEnd` fragt die Zone, ob sie den Zug annimmt, und zaehlt dafuer
// die Karten, die schon darin liegen. Ein anderer Stapel mit fuenfzehn Karten
// zaehlte fuenfzehnmal - eine Zone mit `capacity: 1` wies den Zug ab, obwohl
// nur ein Ding darin lag. Dasselbe galt fuer die belegten Plaetze, aus denen
// `snapInto` den freien sucht.
//
// Reine Logik im Client (CLAUDE.md: dort gibt es keine Testinfrastruktur),
// darum von hier geprueft - wie `tokenLayer`, `libraryShelf` und `panTarget`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zoneOccupants } from '../../client/src/utils/stackDrag.js';
import { countInZone, zoneRejects } from '../../shared/zoneGeometry.js';

const zone = { x: 0, y: 0, width: 200, height: 200, accepts: ['card'], capacity: 1 };

function stack(id, n, x, y) {
  return Array.from({ length: n }, (_, i) => ({
    tableId: `${id}-${i}`, inStack: id, x, y, zIndex: i + 1,
  }));
}

test('lose Karten gehen unveraendert durch', () => {
  const loose = [{ tableId: 'a', x: 10, y: 10 }, { tableId: 'b', x: 20, y: 20 }];
  assert.deepEqual(zoneOccupants(loose), loose);
});

test('ein Stapel mit fuenfzehn Karten ist eine Belegung', () => {
  const cards = stack('s1', 15, 50, 50);
  const occ = zoneOccupants(cards);
  assert.equal(occ.length, 1);
  assert.equal(occ[0].inStack, 's1');
  // Der Vertreter traegt die Lage des Stapels, sonst faende ihn `zoneContains` nicht.
  assert.equal(occ[0].x, 50);
  assert.equal(occ[0].y, 50);
});

test('zwei Stapel sind zwei Belegungen, lose Karten kommen dazu', () => {
  const cards = [...stack('s1', 3, 50, 50), { tableId: 'x', x: 60, y: 60 }, ...stack('s2', 4, 70, 70)];
  assert.deepEqual(zoneOccupants(cards).map(c => c.tableId), ['s1-0', 'x', 's2-0']);
});

test('die Reihenfolge bleibt, auch wenn die Karten eines Stapels verstreut liegen', () => {
  const cards = [
    { tableId: 's1-0', inStack: 's1', x: 50, y: 50 },
    { tableId: 'x', x: 60, y: 60 },
    { tableId: 's1-1', inStack: 's1', x: 50, y: 50 },
  ];
  assert.deepEqual(zoneOccupants(cards).map(c => c.tableId), ['s1-0', 'x']);
});

test('leere und unbrauchbare Eingaben geben eine leere Liste', () => {
  assert.deepEqual(zoneOccupants([]), []);
  assert.deepEqual(zoneOccupants(), []);
  assert.deepEqual(zoneOccupants([null, undefined]), []);
});

test('eine Zone mit capacity 1 weist den zweiten Stapel ab, nicht den ersten', () => {
  const liegend = stack('s1', 15, 50, 50);
  // ohne die Zusammenfassung: fuenfzehn Belegungen, also voll
  assert.equal(countInZone(zone, liegend), 15);
  // mit: eine
  assert.equal(countInZone(zone, zoneOccupants(liegend)), 1);
  // capacity 1 und ein Stapel drin: der zweite ist zu viel - das ist richtig.
  assert.equal(zoneRejects(zone, 'card', countInZone(zone, zoneOccupants(liegend))), 'zone zone is full (1)');
  // capacity 2 nimmt ihn. Ohne die Zusammenfassung waere auch das "voll (2)".
  assert.equal(zoneRejects({ ...zone, capacity: 2 }, 'card', countInZone(zone, zoneOccupants(liegend))), null);
  assert.equal(zoneRejects({ ...zone, capacity: 2 }, 'card', countInZone(zone, liegend)), 'zone zone is full (2)');
});
