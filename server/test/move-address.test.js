// M7.1/G5 – eine Bewegungsnachricht traegt die Rasteradresse mit.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Befund (aus G1): `token_move` schickte nur `{ token_id, x, y }`. Der neue
// `cell` kam nie an; `room.boardState` und die uebrigen Clients behielten die
// alte Adresse, und `placeOnGrids` zog das Stueck beim naechsten Laden auf den
// alten Bereich zurueck – genau den halben Feldversatz weit, den G1 beseitigt
// hat. `card_move` hat dieselbe Luecke: Karten tragen `gridId`/`cell` seit M3b.
//
// Geprueft wird hier:
//   * ein Zug mit Adresse schreibt sie in `room.boardState` UND in den Broadcast
//   * ein Bereich bringt seine nachgerechneten Masse mit
//   * ein Zug OHNE Adresse (aelterer Client) laesst die vorhandene stehen –
//     ein fehlendes Feld ist nicht dasselbe wie ein Feld auf `null`
//   * ein ausdrueckliches `null` loescht sehr wohl (vom Raster gezogen)
//   * ein unbekanntes Objekt aendert nichts
//   * dasselbe fuer `card_move`

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { handleMessage } = await import('../src/websocket/messageHandler.js');

/** Kleinstmoeglicher Raum: was messageHandler und broadcast tatsaechlich lesen. */
function fakeRoom(over = {}) {
  const sent = [];
  const ws = { readyState: 1, send: data => sent.push(JSON.parse(data)) };
  return {
    sent,
    players: new Map([['p1', { color: 'red' }], ['p2', { color: 'blue' }]]),
    connections: new Map([['p2', ws]]), // p1 ist der Absender, bekommt nichts
    zones: [],
    boardState: {
      cards: [], stacks: [], tokens: [], counters: [], notes: [], dice: [], customDice: [],
      ...over,
    },
  };
}

/** Ein Zaun auf E3:G4, wie ihn `build_scenario` hinlegt. */
function zaun(over = {}) {
  return { id: 'tok-zaun', x: 220, y: 170, gridId: 'g1', cell: 'E3:G4', width: 180, height: 120, ...over };
}

const send = (room, msg) => handleMessage(room, 'p1', JSON.stringify(msg));

// ── token_move ───────────────────────────────────────────────────────────────

test('token_move mit cell schreibt die neue Adresse in den Raumzustand', () => {
  const room = fakeRoom({ tokens: [zaun()] });

  send(room, { type: 'token_move', token_id: 'tok-zaun', x: 420, y: 330, gridId: 'g1', cell: 'H6:J7' });

  const t = room.boardState.tokens[0];
  assert.equal(t.cell, 'H6:J7', 'sonst zieht placeOnGrids das Stueck beim Laden zurueck');
  assert.equal(t.gridId, 'g1');
  assert.deepStrictEqual({ x: t.x, y: t.y }, { x: 420, y: 330 });
});

test('token_move mit cell sagt die neue Adresse auch den uebrigen Clients', () => {
  const room = fakeRoom({ tokens: [zaun()] });

  send(room, { type: 'token_move', token_id: 'tok-zaun', x: 420, y: 330, gridId: 'g1', cell: 'H6:J7' });

  assert.equal(room.sent.length, 1);
  assert.equal(room.sent[0].cell, 'H6:J7');
  assert.equal(room.sent[0].gridId, 'g1');
});

test('token_move mit Bereichsmassen schreibt cell und Masse', () => {
  const room = fakeRoom({ tokens: [zaun()] });

  send(room, {
    type: 'token_move', token_id: 'tok-zaun', x: 420, y: 330,
    gridId: 'g2', cell: 'H6:J7', width: 270, height: 180,
  });

  const t = room.boardState.tokens[0];
  assert.deepStrictEqual(
    { gridId: t.gridId, cell: t.cell, width: t.width, height: t.height },
    { gridId: 'g2', cell: 'H6:J7', width: 270, height: 180 },
  );
  assert.deepStrictEqual(
    { width: room.sent[0].width, height: room.sent[0].height },
    { width: 270, height: 180 },
  );
});

test('ein aus der Groesse abgeleiteter Bereich kommt genauso im Raum an (M7.2)', () => {
  // Ein Boesewicht auf 100x100 wird von Hand ueber ein 50er-Raster gezogen und
  // bekommt dabei zum ersten Mal einen Bereichsnamen. Faende `gridAddress` die
  // Masse nicht, behielte der Raum die alten 100x100 an der neuen Adresse.
  const room = fakeRoom({ tokens: [{ id: 'tok-boss', x: 0, y: 0, gridId: 'g1', cell: 'A1', width: 100, height: 100 }] });

  send(room, {
    type: 'token_move', token_id: 'tok-boss', x: 150, y: 150,
    gridId: 'g1', cell: 'C3:D4', width: 100, height: 100,
  });

  const t = room.boardState.tokens[0];
  assert.equal(t.cell, 'C3:D4');
  assert.equal(room.sent[0].cell, 'C3:D4');
  assert.deepStrictEqual({ width: t.width, height: t.height }, { width: 100, height: 100 });
});

test('token_move ohne cell laesst die vorhandene Adresse stehen', () => {
  // Ein aelterer Client schickt nur x/y. Ein fehlendes Feld ist nicht dasselbe
  // wie ein Feld auf null – sonst verloere der Zaun seinen Bereich und spraenge
  // beim naechsten Laden einen halben Feldversatz weit.
  const room = fakeRoom({ tokens: [zaun()] });

  send(room, { type: 'token_move', token_id: 'tok-zaun', x: 500, y: 500 });

  const t = room.boardState.tokens[0];
  assert.deepStrictEqual(
    { gridId: t.gridId, cell: t.cell, width: t.width, height: t.height },
    { gridId: 'g1', cell: 'E3:G4', width: 180, height: 120 },
  );
  assert.deepStrictEqual({ x: t.x, y: t.y }, { x: 500, y: 500 }, 'bewegt hat er sich trotzdem');
  assert.ok(!('cell' in room.sent[0]), 'und der Broadcast erfindet keine Adresse');
});

test('token_move mit cell: null loescht die Adresse', () => {
  // Vom Raster heruntergezogen: der Feldname ist nicht mehr da, wo das Stueck
  // ist. Ausdrueckliches null ist eine Aussage, ein fehlendes Feld keine.
  const room = fakeRoom({ tokens: [zaun()] });

  send(room, { type: 'token_move', token_id: 'tok-zaun', x: 900, y: 900, gridId: null, cell: null });

  const t = room.boardState.tokens[0];
  assert.equal(t.cell, null);
  assert.equal(t.gridId, null);
  assert.equal(room.sent[0].cell, null);
});

test('ein unbekanntes token_id aendert nichts am Raumzustand', () => {
  const room = fakeRoom({ tokens: [zaun()] });

  send(room, { type: 'token_move', token_id: 'gibt-es-nicht', x: 1, y: 2, gridId: 'g9', cell: 'A1' });

  assert.deepStrictEqual(room.boardState.tokens, [zaun()]);
  assert.equal(room.boardState.tokens.length, 1, 'und legt schon gar nichts an');
});

// ── card_move: dieselbe Luecke ───────────────────────────────────────────────

test('card_move traegt die Rasteradresse genauso mit', () => {
  const room = fakeRoom({ cards: [{ tableId: 'c1', x: 10, y: 10, gridId: 'g1', cell: 'C7' }] });

  send(room, { type: 'card_move', table_id: 'c1', x: 180, y: 260, gridId: 'g1', cell: 'D9' });

  const c = room.boardState.cards[0];
  assert.equal(c.cell, 'D9');
  assert.equal(c.gridId, 'g1');
  assert.equal(room.sent[0].cell, 'D9');
});

test('card_move ohne Adresse laesst die vorhandene stehen', () => {
  const room = fakeRoom({ cards: [{ tableId: 'c1', x: 10, y: 10, gridId: 'g1', cell: 'C7' }] });

  send(room, { type: 'card_move', table_id: 'c1', x: 180, y: 260 });

  const c = room.boardState.cards[0];
  assert.deepStrictEqual({ gridId: c.gridId, cell: c.cell }, { gridId: 'g1', cell: 'C7' });
});
