// Befund der Sichtprobe von M32 (2026-11-11) — Kontextmenü „Flip“ / „Rotate CW“ / „Rotate CCW“ änderten im Raum nur
// den eigenen Tisch (`setTableCards`), nie `room.sendAction`: der Eigentümer deckte seine Karte auf, der Mitspieler
// und der Server behielten die Rückseite, die Tische liefen still auseinander. Die Tastenkürzel (F/E/Q) sendeten.
//
// Wurzel: derselbe Handgriff stand fünfmal im Quelltext (Taste, Menü, MobileActionBar, Zwei-Finger-Drehen), und nur
// die Taste kannte den Raum. Jetzt gibt es **eine** Stelle je Handgriff (`flipCards`, `rotateCards` in
// `GameTable.jsx`); dieser Test hält die Aufrufer dort fest. Der Client hat keine Testinfrastruktur (`CLAUDE.md`):
// Quelltext lesen, und die beiden Funktionen werden herausgeschnitten und mit einem Raum-Attrappe ausgeführt.
//
// Run with: npm test  (node --test, keine Test-Dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const source = readFileSync(
  fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');

/** Der Text von `function name(` bis zur passenden schließenden Klammer. */
function functionText(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `function ${name} fehlt in GameTable.jsx`);
  let i = source.indexOf('{', start);
  let depth = 0;
  for (; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`function ${name}: Klammern passen nicht`);
}

/** Der `onClick`-Block des Knopfes mit diesem `data-testid`. */
function menuHandler(testid) {
  const at = source.indexOf(`data-testid="${testid}"`);
  assert.ok(at >= 0, `${testid} fehlt`);
  const from = source.lastIndexOf('onClick={', at);
  return source.slice(from, at);
}

// ── die gemeinsame Stelle ───────────────────────────────────────────────────

/** Läuft `flipCards`/`rotateCards` gegen einen Tisch aus Karten und eine Raum-Attrappe. */
function laufen(room) {
  const sent = [];
  let cards = [
    { tableId: 'a', faceDown: true, rotation: 0, inStack: null },
    { tableId: 'b', faceDown: false, rotation: 90, inStack: 's' },
    { tableId: 'c', faceDown: false, rotation: 0, inStack: 's' },
  ];
  const setTableCards = (fn) => { cards = fn(cards); };
  const roomObj = room ? { sendAction: (m) => sent.push(m) } : null;
  const fns = new Function('room', 'setTableCards',
    `${functionText('flipCards')}\n${functionText('rotateCards')}\nreturn { flipCards, rotateCards };`)(roomObj, setTableCards);
  return { fns, sent, cards: () => cards };
}

test('flipCards: im Raum geht je Karte ein `card_flip` mit dem neuen Wert hinaus, der Tisch ändert sich gleich', () => {
  const { fns, sent, cards } = laufen(true);
  fns.flipCards(c => c.tableId === 'a');
  assert.deepEqual(sent, [{ type: 'card_flip', table_id: 'a', face_down: false }]);
  assert.equal(cards().find(c => c.tableId === 'a').faceDown, false);
  assert.equal(cards().find(c => c.tableId === 'b').faceDown, false); // nicht gewählt: unberührt
});

test('rotateCards: im Raum geht je Karte ein `card_rotate` mit dem absoluten Winkel hinaus (CW und CCW)', () => {
  const { fns, sent, cards } = laufen(true);
  fns.rotateCards(c => c.tableId === 'b', 90);
  fns.rotateCards(c => c.tableId === 'a', -90);
  assert.deepEqual(sent, [
    { type: 'card_rotate', table_id: 'b', rotation: 180 },
    { type: 'card_rotate', table_id: 'a', rotation: -90 },
  ]);
  assert.equal(cards().find(c => c.tableId === 'b').rotation, 180);
});

test('flipCards/rotateCards: das Prädikat sieht den ganzen Tisch (Zwei-Finger-Drehen nimmt den Stapel mit)', () => {
  const { fns, sent } = laufen(true);
  fns.rotateCards((c, all) => c.inStack === all.find(x => x.tableId === 'b').inStack, 90);
  assert.deepEqual(sent.map(m => m.table_id), ['b', 'c']);
});

test('flipCards/rotateCards: ohne Raum bleibt es beim lokalen Tisch und nichts wirft', () => {
  const { fns, sent, cards } = laufen(false);
  fns.flipCards(c => c.tableId === 'a');
  fns.rotateCards(c => c.tableId === 'a', 90);
  assert.deepEqual(sent, []);
  assert.equal(cards()[0].faceDown, false);
  assert.equal(cards()[0].rotation, 90);
});

// ── die Aufrufer ────────────────────────────────────────────────────────────

test('Kontextmenü: Flip, Rotate CW und Rotate CCW laufen über die gemeinsame Stelle, nicht über `setTableCards`', () => {
  for (const [id, call] of [
    ['context-flip', /flipCards\(/],
    ['context-rotate-cw', /rotateCards\(.*, 90\)/],
    ['context-rotate-ccw', /rotateCards\(.*, -90\)/],
  ]) {
    const h = menuHandler(id);
    assert.match(h, call, `${id} ruft die gemeinsame Funktion`);
    assert.doesNotMatch(h, /setTableCards/, `${id} ändert den Tisch nicht selbst`);
  }
});

test('Tastenkürzel F/E/Q, MobileActionBar und Zwei-Finger-Drehen laufen über dieselbe Stelle', () => {
  for (const name of ['handleMobileFlip', 'handleMobileRotateCW', 'handleMobileRotateCCW']) {
    const h = functionText(name);
    assert.match(h, /flipCards\(|rotateCards\(/, `${name} ruft die gemeinsame Funktion`);
    assert.doesNotMatch(h, /setTableCards/, `${name} ändert den Tisch nicht selbst`);
  }
  const touch = functionText('handleGlobalTouchStart');
  assert.equal((touch.match(/rotateCards\(/g) || []).length, 2, 'beide Drehrichtungen der zwei Finger');
  assert.doesNotMatch(touch, /rotation:/, 'kein eigenes Setzen des Winkels');
});

test('Wurzel: `card_flip`/`card_rotate` werden an genau einer Stelle gesendet, `faceDown`/`rotation` einzelner Karten an genau einer gesetzt', () => {
  assert.equal((source.match(/type: 'card_flip'/g) || []).length, 1);
  assert.equal((source.match(/type: 'card_rotate'/g) || []).length, 1);
  // kein Setzen des Winkels `(c.rotation || 0) ± 90` mehr außerhalb von `rotateCards` (dort: `{ ...c, rotation }`)
  assert.equal((source.match(/\.\.\.c, rotation: \(c\.rotation \|\| 0\) [+-] 90/g) || []).length, 0);
  assert.equal((source.match(/\.\.\.c, rotation \}/g) || []).length, 1);
  // `faceDown: !c.faceDown` bleibt nur im Solo-Zweig von `flipStack` (Stapelaktion; Menü und MobileActionBar rufen sie,
  // im Raum sendet sie `stack_flip`, docs/tasks-stapel-raum.md GA), sonst `{ ...c, faceDown }` in `flipCards`
  assert.equal((source.match(/\.\.\.c, faceDown: !c\.faceDown/g) || []).length, 1);
  assert.equal((source.match(/\.\.\.c, faceDown \}/g) || []).length, 1);
  assert.match(menuHandler('context-flip-stack'), /flipStack\(contextMenu\.stackId\)/);
});
