// M9.4 / H4: der Zug am Stapel kommt im Raum an.
//
// `docs/audit-dead-controls.md` Fund 9 haelt fest, dass es einen Empfaenger
// fuer `stack_move` gibt, den der Client nie bedient. Der Empfaenger taugte
// aber auch nicht: er suchte `stacks.find(s => s.id === stack_id)`, waehrend
// jeder Stapel im System `stackId` heisst - so legt ihn `sequenceExecutor`
// an, so serialisiert ihn `getGameState`, so liest ihn `loadGameState`. Der
// Rundruf waere angekommen, der gespeicherte Raumzustand nicht: ein spaeter
// hinzukommender Spieler saehe den Stapel an der alten Stelle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleMessage } from '../src/websocket/messageHandler.js';

function makeRoom(stacks) {
  const sent = [];
  return {
    room: {
      players: new Map([['p1', { id: 'p1' }], ['p2', { id: 'p2' }]]),
      connections: new Map([['p2', { readyState: 1, send: (d) => sent.push(JSON.parse(d)) }]]),
      boardState: { cards: [], stacks, tokens: [] },
    },
    sent,
  };
}

const move = (stackId, x, y) => JSON.stringify({ type: 'stack_move', stack_id: stackId, x, y });

test('stack_move verschiebt den Stapel im Raumzustand', () => {
  const { room, sent } = makeRoom([{ stackId: 's1', x: 10, y: 20, cards: [{ cardId: 1 }] }]);
  handleMessage(room, 'p1', move('s1', 300, 400));

  assert.equal(room.boardState.stacks[0].x, 300);
  assert.equal(room.boardState.stacks[0].y, 400);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'stack_move');
  assert.equal(sent[0].stack_id, 's1');
  assert.equal(sent[0].x, 300);
  assert.equal(sent[0].from_player_id, 'p1');
});

test('ein alter Stand mit `id` statt `stackId` wird weiterhin gefunden', () => {
  const { room } = makeRoom([{ id: 's1', x: 10, y: 20, cards: [] }]);
  handleMessage(room, 'p1', move('s1', 5, 6));
  assert.equal(room.boardState.stacks[0].x, 5);
});

test('ein unbekannter Stapel aendert nichts und wirft nicht', () => {
  const { room, sent } = makeRoom([{ stackId: 's1', x: 10, y: 20, cards: [] }]);
  assert.doesNotThrow(() => handleMessage(room, 'p1', move('gibtsnicht', 1, 2)));
  assert.equal(room.boardState.stacks[0].x, 10);
  assert.equal(sent.length, 1); // der Rundruf geht trotzdem raus, wie bisher
});

test('stack_shuffle und stack_take_top finden denselben Stapel', () => {
  const cards = [{ cardId: 1 }, { cardId: 2 }, { cardId: 3 }];
  const { room } = makeRoom([{ stackId: 's1', x: 0, y: 0, cards }]);

  handleMessage(room, 'p1', JSON.stringify({ type: 'stack_shuffle', stack_id: 's1' }));
  assert.equal(room.boardState.stacks[0].cards.length, 3);

  handleMessage(room, 'p1', JSON.stringify({ type: 'stack_take_top', stack_id: 's1', new_x: 9, new_y: 9 }));
  assert.equal(room.boardState.stacks[0].cards.length, 2);
  assert.equal(room.boardState.cards.length, 1);
  assert.equal(room.boardState.cards[0].x, 9);
});

test('stack_merge legt einen Stapel in den anderen', () => {
  const { room } = makeRoom([
    { stackId: 'a', x: 0, y: 0, cards: [{ cardId: 1 }] },
    { stackId: 'b', x: 0, y: 0, cards: [{ cardId: 2 }] },
  ]);
  handleMessage(room, 'p1', JSON.stringify({ type: 'stack_merge', from_stack_id: 'a', to_stack_id: 'b' }));
  assert.equal(room.boardState.stacks.length, 1);
  assert.equal(room.boardState.stacks[0].cards.length, 2);
});
