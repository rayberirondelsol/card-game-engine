// Zaehler im Raum abgleichen (Fund 1 aus docs/audit-dead-controls.md).
//
// Befund (Produktion): Spieler A klickt `+` an einem Zaehler, Spieler B sieht
// den alten Wert - auch nach dem Neuladen. Server (`handleCounterUpdate`) und
// Empfaenger waren fertig, nur der Sender fehlte.
//
// Run with: npm test  (node --test, keine Test-Dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const { handleMessage } = await import('../src/websocket/messageHandler.js');

function fakeRoom(counters) {
  const sent = [];
  const ws = { readyState: 1, send: data => sent.push(JSON.parse(data)) };
  return {
    sent,
    players: new Map([['p1', { color: 'red' }], ['p2', { color: 'blue' }]]),
    connections: new Map([['p2', ws]]),
    zones: [],
    boardState: { cards: [], stacks: [], tokens: [], counters, notes: [], dice: [], customDice: [] },
  };
}

const send = (room, value) => handleMessage(room, 'p1', JSON.stringify({ type: 'counter_update', counter_id: 'c1', value }));

test('counter_update setzt den Wert auf der Serverkopie und geht an die anderen', () => {
  const room = fakeRoom([{ id: 'c1', value: 3 }]);
  send(room, 7);
  assert.equal(room.boardState.counters[0].value, 7);
  assert.equal(room.sent.length, 1);
  assert.deepStrictEqual(
    { type: room.sent[0].type, counter_id: room.sent[0].counter_id, value: room.sent[0].value, from: room.sent[0].from_player_id },
    { type: 'counter_update', counter_id: 'c1', value: 7, from: 'p1' },
  );
});

test('counter_update mit negativem Wert und Null gilt (kein Falsy-Fehler)', () => {
  const room = fakeRoom([{ id: 'c1', value: 3 }]);
  send(room, 0);
  send(room, -2);
  assert.equal(room.boardState.counters[0].value, -2);
  assert.equal(room.sent.length, 2);
});

test('ein nicht endlicher Wert wird verworfen: kein Schreiben, kein Broadcast', () => {
  for (const bad of ['abc', '5', null, undefined, NaN, Infinity, {}, [1]]) {
    const room = fakeRoom([{ id: 'c1', value: 3 }]);
    handleMessage(room, 'p1', JSON.stringify({ type: 'counter_update', counter_id: 'c1', value: bad }));
    assert.equal(room.boardState.counters[0].value, 3, `Wert ${String(bad)} darf nichts schreiben`);
    assert.equal(room.sent.length, 0, `Wert ${String(bad)} darf nicht verteilt werden`);
  }
});

// ── Der Tisch sendet ─────────────────────────────────────────────────────────

const src = readFileSync(fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');
const body = (name) => {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start > 0, `${name} fehlt`);
  return src.slice(start, src.indexOf('\n  }\n', start));
};

test('setCounterValue ist der eine Weg: setzt lokal und sendet den absoluten Wert', () => {
  const fn = body('setCounterValue');
  assert.match(fn, /setCounters\(/);
  assert.match(fn, /if \(room\) room\.sendAction\(\{ type: 'counter_update', counter_id: counterId, value \}\)/);
});

test('Plus, Minus und getipptes Feld laufen durch setCounterValue', () => {
  for (const name of ['incrementCounter', 'decrementCounter', 'commitCounterEdit']) {
    assert.match(body(name), /setCounterValue\(/, `${name} bliebe ohne Abgleich`);
  }
});

test('ausser setCounterValue ändert kein Handler den Wert eines Zählers direkt', () => {
  // Wer `value:` in einem setCounters-Aufruf schreibt, umgeht den Abgleich.
  // Erlaubt: setCounterValue selbst, der Empfaenger (msg.value) und das Anlegen/Laden.
  const treffer = [...src.matchAll(/setCounters\(prev => [\s\S]*?\)\);/g)].map(m => m[0]).filter(t => /\bvalue\b/.test(t));
  assert.equal(treffer.length, 2, `erwartet: setCounterValue + Empfaenger, gefunden: ${treffer.join(' | ')}`);
});
