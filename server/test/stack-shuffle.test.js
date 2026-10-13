// M15.4 / AP1+AP2: mischt „Shuffle" ueberhaupt zuverlaessig?
//
// Partie 7, N4: von vier Versuchen blieb die Kartenreihenfolge dreimal
// unveraendert, einmal war sie vollstaendig permutiert. Die Antwort steht in
// `docs/tasks-partie7.md`: am Tisch mischt es richtig (der Spieler las den
// Spielstand, und der wird nur alle 60 s geschrieben) - **im Raum** mischte es
// nicht. `handleStackShuffle` permutierte die Array-Reihenfolge von
// `stack.cards` und liess `zIndex` stehen; die Reihenfolge eines Stapels ist
// aber ueberall `zIndex` (`loadGameState`, die Darstellung, `getGameState`).
// Der Raum mischte also eine Reihenfolge, die niemand liest.
//
// Darum gibt es jetzt genau **eine** Mischung (`shuffleStack` in
// `shared/sequenceExecutor.js`), die Tisch, Raum und Executor benutzen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shuffleStack, executeSequence } from '../../shared/sequenceExecutor.js';
import { handleMessage } from '../src/websocket/messageHandler.js';

const deck = (n) => Array.from({ length: n }, (_, i) => ({ tableId: `t${i}`, zIndex: i + 1 }));
const order = (cards) => [...cards].sort((a, b) => a.zIndex - b.zIndex).map(c => c.tableId).join(',');

test('shuffleStack aendert die Reihenfolge und erhaelt die zIndex-Menge', () => {
  const start = order(deck(14));
  let unchanged = 0;
  for (let run = 0; run < 1000; run++) {
    const cards = deck(14);
    shuffleStack(cards);
    if (order(cards) === start) unchanged++;
    assert.deepEqual(
      cards.map(c => c.zIndex).sort((a, b) => a - b),
      Array.from({ length: 14 }, (_, i) => i + 1),
      'zIndex bleibt 1..N',
    );
  }
  // Eine von 14! Reihenfolgen ist die alte. Haeufen sich die, mischt es nicht.
  assert.ok(unchanged <= 1, `Reihenfolge blieb ${unchanged} von 1000 Mal gleich`);
});

test('shuffleStack permutiert mit festem rng vorhersagbar', () => {
  // rng = 0 heisst in Fisher-Yates: jedes i tauscht mit 0.
  const cards = deck(4);
  shuffleStack(cards, () => 0);
  assert.equal(order(cards), 't1,t2,t3,t0');
});

test('shuffleStack vertraegt einen leeren und einen einkartigen Stapel', () => {
  assert.doesNotThrow(() => shuffleStack([]));
  const one = deck(1);
  shuffleStack(one);
  assert.deepEqual(one.map(c => c.zIndex), [1]);
});

test('der shuffle-Schritt mischt weiterhin und zieht zIndex nach', () => {
  const state = { cards: [], tokens: [], boards: [], stacks: [{ stackId: 's1', label: 'Deck', x: 0, y: 0, cards: deck(10) }] };
  const next = executeSequence(state, [{ type: 'shuffle', stackLabel: 'Deck' }], [], { rng: () => 0 });
  const cards = next.stacks[0].cards;
  assert.deepEqual(cards.map(c => c.zIndex), Array.from({ length: 10 }, (_, i) => i + 1));
  assert.notEqual(order(cards), order(deck(10)));
});

// ── Der Raum ────────────────────────────────────────────────────────────────

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

test('stack_shuffle aendert im Raum die zIndex-Reihenfolge', () => {
  const start = order(deck(14));
  let unchanged = 0;
  for (let run = 0; run < 200; run++) {
    const { room } = makeRoom([{ stackId: 's1', x: 0, y: 0, cards: deck(14) }]);
    handleMessage(room, 'p1', JSON.stringify({ type: 'stack_shuffle', stack_id: 's1' }));
    if (order(room.boardState.stacks[0].cards) === start) unchanged++;
  }
  assert.ok(unchanged <= 1, `Reihenfolge im Raum blieb ${unchanged} von 200 Mal gleich`);
});

test('stack_shuffle uebernimmt eine mitgeschickte Reihenfolge und ruft sie weiter', () => {
  const { room, sent } = makeRoom([{ stackId: 's1', x: 0, y: 0, cards: deck(4) }]);
  handleMessage(room, 'p1', JSON.stringify({
    type: 'stack_shuffle', stack_id: 's1', order: ['t2', 't0', 't3', 't1'],
  }));

  assert.equal(order(room.boardState.stacks[0].cards), 't2,t0,t3,t1');
  assert.deepEqual(room.boardState.stacks[0].cards.map(c => c.zIndex).sort((a, b) => a - b), [1, 2, 3, 4]);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].type, 'stack_shuffle');
  assert.deepEqual(sent[0].order, ['t2', 't0', 't3', 't1']);
});

test('eine Reihenfolge, die nicht zum Stapel passt, wird verworfen', () => {
  for (const bad of [['t0', 't1'], ['t0', 't1', 't2', 'fremd'], 'keinArray']) {
    const { room, sent } = makeRoom([{ stackId: 's1', x: 0, y: 0, cards: deck(4) }]);
    handleMessage(room, 'p1', JSON.stringify({ type: 'stack_shuffle', stack_id: 's1', order: bad }));
    const cards = room.boardState.stacks[0].cards;
    assert.equal(cards.length, 4, 'keine Karte geht verloren');
    assert.deepEqual(cards.map(c => c.zIndex).sort((a, b) => a - b), [1, 2, 3, 4]);
    // Der Server mischt dann selbst und sagt, was gilt.
    assert.deepEqual(sent[0].order, order(cards).split(','));
  }
});

test('ein unbekannter Stapel aendert nichts und wirft nicht', () => {
  const { room, sent } = makeRoom([{ stackId: 's1', x: 0, y: 0, cards: deck(3) }]);
  assert.doesNotThrow(() => handleMessage(room, 'p1', JSON.stringify({ type: 'stack_shuffle', stack_id: 'weg' })));
  assert.equal(order(room.boardState.stacks[0].cards), 't0,t1,t2');
  assert.equal(sent.length, 1);
});

// ── Der Tisch: was nur in der Auszeichnung steht ────────────────────────────
//
// Der Client hat keine Testinfrastruktur (CLAUDE.md). Die Rechnung steckt in
// `shuffleStack` und ist oben geprueft; was hier bleibt, sind zwei Tatsachen
// in `GameTable.jsx`, die man beim Lesen sieht - und die ohne diesen Test
// niemand haelt. Muster: `server/test/table-bars.test.js`.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const SRC = fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url));
const source = readFileSync(SRC, 'utf8');

test('AP1: der Tisch mischt nur noch mit shuffleStack', () => {
  assert.match(source, /import \{ executeSequenceWithLog, shuffleStack \}/);
  assert.equal((source.match(/shuffleStack\(/g) || []).length, 1,
    'genau ein Aufruf - die zweite Mischstelle ruft shuffleStackOnTable');
  // Die alte Handmischung ueber zIndex gibt es nicht mehr, an keiner der
  // beiden Stellen.
  assert.doesNotMatch(source, /const tempZ = stackCards\[i\]\.zIndex/);
});

test('AP3: der Mischzaehler steht am Stapel und uebersteht das Speichern', () => {
  assert.match(source, /data-testid=\{`stack-shuffles-\$\{stackId\}`\}/);
  // Nur wenn gemischt wurde - ein nie gemischter Stapel traegt kein Abzeichen.
  assert.match(source, /isStack && stackShuffles\[stackId\] > 0 &&/);
  // In beide Feldlisten: getGameState schreibt, loadGameState liest. Genau
  // diese Haelfte fehlte dem Wurfzaehler (N7), und er fiel auf 0.
  assert.match(source, /^\s*stackShuffles,$/m);
  assert.match(source, /setStackShuffles\(state\.stackShuffles/);
});
