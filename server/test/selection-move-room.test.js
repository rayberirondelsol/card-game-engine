// Ziehen einer Auswahl im Raum (docs/audit-dead-controls.md Fund 9): ein Stapel von >= 2 Karten gilt beim Greifen immer als
// Mehrfachauswahl (`startDraggingCard` markiert alle seine Karten), also lief jeder Stapelzug durch den Zweig `isMultiSelected`
// von `handleCardDragEnd` – und der sendete nichts. Reine Rechnung in `client/src/utils/stackOps.js`, Verdrahtung am Quelltext
// (Muster: `stack-menu-room-sync.test.js`; der Client hat keine Testinfrastruktur, `CLAUDE.md`).
//
// Run with: npm test  (node --test, keine Test-Dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ops = await import('../../client/src/utils/stackOps.js');

const karte = (tableId, extra = {}) => ({ tableId, cardId: `c-${tableId}`, x: 100, y: 200, zIndex: 1, faceDown: false, inStack: null, gridId: 'g', cell: 'C7', ...extra });

test('Fund 9: ein Stapel von drei Karten – genau ein stack_move mit der neuen Stelle, kein card_move', () => {
  const tisch = [karte('a', { inStack: 's' }), karte('b', { inStack: 's' }), karte('c', { inStack: 's' }), karte('z', { x: 5, y: 5 })];
  const msgs = ops.selectionMoveMessages(tisch, new Set(['a', 'b', 'c']), 30, -20);
  assert.deepEqual(msgs, [{ type: 'stack_move', stack_id: 's', x: 130, y: 180 }]);
});

test('Fund 9: zwei lose Karten – zwei card_move ohne Rasterfeld', () => {
  const tisch = [karte('a', { x: 10, y: 10 }), karte('b', { x: 50, y: 60 }), karte('z')];
  const msgs = ops.selectionMoveMessages(tisch, new Set(['a', 'b']), 5, 7);
  assert.deepEqual(msgs, [
    { type: 'card_move', table_id: 'a', x: 15, y: 17, gridId: null, cell: null },
    { type: 'card_move', table_id: 'b', x: 55, y: 67, gridId: null, cell: null },
  ]);
});

test('Fund 9: ein Stapel und eine lose Karte – je eine Nachricht', () => {
  const tisch = [karte('a', { inStack: 's' }), karte('b', { inStack: 's' }), karte('l', { x: 1, y: 2 })];
  const msgs = ops.selectionMoveMessages(tisch, new Set(['a', 'b', 'l']), 10, 10);
  assert.equal(msgs.length, 2);
  assert.deepEqual(msgs.find(m => m.type === 'stack_move'), { type: 'stack_move', stack_id: 's', x: 110, y: 210 });
  assert.deepEqual(msgs.find(m => m.type === 'card_move'), { type: 'card_move', table_id: 'l', x: 11, y: 12, gridId: null, cell: null });
});

test('Fund 9: ist nur eine Karte eines Stapels gewaehlt, bewegt sich der ganze Stapel – eine Nachricht', () => {
  const tisch = [karte('a', { inStack: 's' }), karte('b', { inStack: 's' })];
  assert.deepEqual(ops.selectionMoveMessages(tisch, new Set(['b']), 1, 1), [{ type: 'stack_move', stack_id: 's', x: 101, y: 201 }]);
});

test('Fund 9: moveSelected bewegt Auswahl samt Stapelgenossen, loest das Rasterfeld, laesst den Rest dasselbe Objekt', () => {
  const rest = karte('z');
  const tisch = [karte('a', { inStack: 's' }), karte('b', { inStack: 's' }), rest];
  const neu = ops.moveSelected(tisch, new Set(['a']), 3, 4);
  assert.deepEqual(neu.slice(0, 2).map(c => [c.x, c.y, c.gridId, c.cell]), [[103, 204, null, null], [103, 204, null, null]]);
  assert.equal(neu[2], rest);
});

test('Fund 9 (Verdrahtung): der Zweig isMultiSelected sendet im Raum die Nachrichten, vor pileInRoom; Solo bleibt stumm', () => {
  const source = readFileSync(fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');
  const start = source.indexOf('function handleCardDragEnd(');
  assert.ok(start >= 0, 'handleCardDragEnd fehlt');
  const from = source.indexOf('if (isMultiSelected) {', start);
  const to = source.indexOf('} else if (card.inStack) {', from);
  assert.ok(from > 0 && to > from, 'Zweig isMultiSelected nicht gefunden');
  const branch = source.slice(from, to);
  assert.match(branch, /if \(room\)[^\n]*selectionMoveMessages\(tableCards, selectedCards, snapDx, snapDy\)[^\n]*sendAction/, 'sendet nicht im Raum');
  assert.ok(branch.indexOf('selectionMoveMessages') < branch.indexOf('pileInRoom('), 'die Zuege muessen vor dem Haufen gehen');
  assert.match(branch, /moveSelected\(prev, selectedCards, snapDx, snapDy\)/, 'die lokale Bewegung nutzt die geteilte Regel nicht');
});
