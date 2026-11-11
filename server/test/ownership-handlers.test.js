// FO / Spec M32.4 – die Handler rufen die Wache (`mayTouchCard` / `mayTouch` aus shared/ownership.js) an allen Stellen,
// und eine Ablehnung springt zurück: `error` plus der wahre Stand, nur an den Absender.
//
// Aufruf wie in `stack-move-room.test.js`: `handleMessage(room, playerId, JSON)` mit gefälschten Verbindungen, die die
// Nachrichten je Spieler sammeln. Die Hand-Zonen kommen aus der echten Fixture (`auslagen-kurzpartie.json`, EU + FF,
// `platz` 1 … 5 vom Test gesetzt, gebunden mit `bindZones`): Hand 1 gehört rot (absolute Box), Hand 3 gehört blau
// und ist **verankert** (nur ein Tableau-Token am Tisch gibt ihr eine Fläche – die Auflösung, FL 2).
//
// Die Nachrichten der Hand (`card_draw_to_hand`, `card_pickup_to_hand`, `hand_count_update`) gehören FU (`room-hand.test.js`); hier steht nur,
// dass `card_play_from_hand` die neue Wache benutzt statt der alten (seit FU aus der Hand des Absenders).
//
// Run with: npm test  (node --test, keine Test-Dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { handleMessage } from '../src/websocket/messageHandler.js';
import { ownersOfPlayers, bindZones, resolveServerZones } from '../../shared/ownership.js';
import * as dz from '../../scripts/doerflerzahl-daten.mjs';

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const FF = dz.patchHaende(dz.patchZonen(lies('auslagen-kurzpartie.json').zones).zone).zone;
const MIT_PLATZ = FF.map(z => (/^zhand(\d)$/.test(z.id) ? { ...z, platz: Number(z.id.slice(5)) } : z));
const SPIELER = [{ id: 'p1', color: 'red', seat: 1 }, { id: 'p2', color: 'blue', seat: 2 }];
const OWNERS = ownersOfPlayers({ players: 2, villagers: 4, kind: 'mehrfach' }, SPIELER);
const GEBUNDEN = bindZones(MIT_PLATZ, OWNERS).zones;
const TABLEAU3 = { id: 't3', assetId: 'bad13f49-c614-4551-9e81-fe8603dbf09a', x: 1460, y: 1600, width: 300, height: 400 };

const mitte = (zones, state, id) => {
  const z = resolveServerZones(state, zones).find(x => x.id === id);
  return { x: z.x + z.width / 2, y: z.y + z.height / 2 };
};
const STATE0 = { tokens: [TABLEAU3], boards: [] };
const IN_ROT = mitte(GEBUNDEN, STATE0, 'zhand1');     // Zone von rot (p1)
const IN_BLAU = mitte(GEBUNDEN, STATE0, 'zhand3');    // Zone von blau (p2), verankert
const FREI = { x: 5, y: 5 };                          // in keiner Zone

/**
 * Ein Raum mit zwei Spielern und je einer Verbindung, die mitschreibt (`inbox.p1`, `inbox.p2`).
 * Karten: `rot` liegt in der Zone von rot, `blau` in der von blau, `lose` auf freier Fläche.
 */
function makeRoom({ zones = GEBUNDEN, players = SPIELER } = {}) {
  const inbox = { p1: [], p2: [] };
  const room = {
    players: new Map(players.map(p => [p.id, { ...p, isConnected: true }])),
    connections: new Map(['p1', 'p2'].map(id => [id, { readyState: 1, send: (d) => inbox[id].push(JSON.parse(d)) }])),
    zones,
    boardState: {
      cards: [
        { tableId: 'rot', ...IN_ROT, faceDown: true, rotation: 0, gridId: 'g1', cell: 'C7' },
        { tableId: 'blau', ...IN_BLAU, faceDown: true, rotation: 90 },
        { tableId: 'lose', ...FREI, faceDown: false, rotation: 0 },
        { tableId: 'lose2', x: 6, y: 6, faceDown: false, rotation: 0 },
      ],
      stacks: [
        { stackId: 'sblau', x: IN_BLAU.x, y: IN_BLAU.y, cards: [{ tableId: 'k1' }, { tableId: 'k2' }] },
        { stackId: 'sfrei', x: 300, y: 300, cards: [{ tableId: 'k3' }, { tableId: 'k4' }, { tableId: 'k5' }] },
      ],
      tokens: [{ ...TABLEAU3 }, { id: 'tok', x: 50, y: 50 }],
      boards: [],
      counters: [{ id: 'c1', value: 1, x: 0, y: 0 }],
      dice: [{ id: 'd1', value: 1, x: 0, y: 0 }],
      notes: [{ id: 'n1', text: '', x: 0, y: 0 }],
      customDice: [],
    },
  };
  return { room, inbox };
}

const send = (room, from, msg) => handleMessage(room, from, JSON.stringify(msg));
const card = (room, id) => room.boardState.cards.find(c => c.tableId === id);
const types = (list) => list.map(m => m.type);
const FREMD = 'error';

// ── 1–3. card_move ───────────────────────────────────────────────────────────

test('FO 1: card_move in eine fremde Zone – der Absender bekommt error und card_move mit dem Stand des Servers, sonst niemand etwas', () => {
  const { room, inbox } = makeRoom();
  const vorher = JSON.stringify(room.boardState);
  send(room, 'p1', { type: 'card_move', table_id: 'rot', x: IN_BLAU.x, y: IN_BLAU.y, gridId: 'g9', cell: 'A1' });

  assert.equal(JSON.stringify(room.boardState), vorher, 'der Server ändert nichts');
  assert.deepEqual(types(inbox.p1), [FREMD, 'card_move']);
  assert.deepEqual(inbox.p1[1], { type: 'card_move', table_id: 'rot', x: IN_ROT.x, y: IN_ROT.y, gridId: 'g1', cell: 'C7' }, 'wahrer Stand: Ort, gridId, cell');
  assert.deepEqual(inbox.p2, [], 'kein anderer bekommt etwas');
});

test('FO 2: card_move aus einer fremden Zone heraus (Ziel neutral) – abgelehnt und zurückgeschickt', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'card_move', table_id: 'blau', x: FREI.x, y: FREI.y });

  assert.deepEqual([card(room, 'blau').x, card(room, 'blau').y], [IN_BLAU.x, IN_BLAU.y]);
  assert.deepEqual(types(inbox.p1), [FREMD, 'card_move']);
  assert.deepEqual([inbox.p1[1].x, inbox.p1[1].y], [IN_BLAU.x, IN_BLAU.y]);
  assert.deepEqual(inbox.p2, []);
});

test('FO 3: die eigene Zone – innerhalb, hinein, heraus; verdeckt wie aufgedeckt – wird angewandt und an die anderen gesendet', () => {
  const { room, inbox } = makeRoom();
  const eigen = { x: IN_ROT.x + 5, y: IN_ROT.y + 5 };

  send(room, 'p1', { type: 'card_move', table_id: 'rot', ...eigen });               // innerhalb, verdeckt
  assert.deepEqual([card(room, 'rot').x, card(room, 'rot').y], [eigen.x, eigen.y]);
  send(room, 'p1', { type: 'card_move', table_id: 'lose', ...eigen });              // hinein, aufgedeckt
  assert.deepEqual([card(room, 'lose').x, card(room, 'lose').y], [eigen.x, eigen.y]);
  send(room, 'p1', { type: 'card_move', table_id: 'rot', x: 700, y: 700 });         // heraus, verdeckt
  assert.deepEqual([card(room, 'rot').x, card(room, 'rot').y], [700, 700]);
  send(room, 'p1', { type: 'card_move', table_id: 'lose', x: 800, y: 800 });        // heraus, aufgedeckt
  assert.deepEqual([card(room, 'lose').x, card(room, 'lose').y], [800, 800]);

  assert.deepEqual(types(inbox.p2), ['card_move', 'card_move', 'card_move', 'card_move']);
  assert.deepEqual(inbox.p2.map(m => m.table_id), ['rot', 'lose', 'rot', 'lose']);
  assert.ok(inbox.p2.every(m => m.from_player_id === 'p1'));
  assert.deepEqual(inbox.p1, [], 'der Absender bekommt nichts zurück');

  // und der Eigentümer blau darf seine Zone ebenso benutzen (die verankerte Hand 3)
  send(room, 'p2', { type: 'card_move', table_id: 'blau', x: IN_BLAU.x + 3, y: IN_BLAU.y });
  assert.equal(card(room, 'blau').x, IN_BLAU.x + 3);
  assert.deepEqual(types(inbox.p1), ['card_move']);
});

// ── 4. flip / rotate ─────────────────────────────────────────────────────────

test('FO 4: card_flip / card_rotate an einer Karte in fremder Zone – abgelehnt, der wahre Stand geht an den Absender', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'card_flip', table_id: 'blau', face_down: false });
  send(room, 'p1', { type: 'card_rotate', table_id: 'blau', rotation: 180 });

  assert.equal(card(room, 'blau').faceDown, true);
  assert.equal(card(room, 'blau').rotation, 90);
  assert.deepEqual(types(inbox.p1), [FREMD, 'card_flip', FREMD, 'card_rotate']);
  assert.deepEqual(inbox.p1[1], { type: 'card_flip', table_id: 'blau', face_down: true });
  assert.deepEqual(inbox.p1[3], { type: 'card_rotate', table_id: 'blau', rotation: 90 });
  assert.deepEqual(inbox.p2, []);
});

test('FO 4: in der eigenen Zone angewandt und wie heute an die anderen gesendet (card_flip trägt nur face_down)', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'card_flip', table_id: 'rot', face_down: false });
  send(room, 'p1', { type: 'card_rotate', table_id: 'rot', rotation: 270 });

  assert.equal(card(room, 'rot').faceDown, false);
  assert.equal(card(room, 'rot').rotation, 270);
  assert.deepEqual(types(inbox.p2), ['card_flip', 'card_rotate']);
  const flip = inbox.p2[0];
  assert.deepEqual(Object.keys(flip).sort(), ['face_down', 'from_player_id', 'table_id', 'timestamp', 'type'], 'nichts Neues im card_flip: kein Name, kein Bild');
  assert.equal(flip.face_down, false);
  assert.deepEqual(inbox.p1, []);
});

// ── 5. Stapel ────────────────────────────────────────────────────────────────

test('FO 5: stack_take_top und stack_move mit Ziel in fremder Zone – abgelehnt, der Stapel ist unverändert', () => {
  const { room, inbox } = makeRoom();
  const stapel = () => room.boardState.stacks.find(s => s.stackId === 'sfrei');
  const vorher = JSON.stringify(room.boardState);

  send(room, 'p1', { type: 'stack_take_top', stack_id: 'sfrei', new_x: IN_BLAU.x, new_y: IN_BLAU.y });
  assert.equal(JSON.stringify(room.boardState), vorher, 'weder Stapel noch Tisch ändern sich');
  assert.deepEqual(types(inbox.p1), [FREMD]);

  send(room, 'p1', { type: 'stack_move', stack_id: 'sfrei', x: IN_BLAU.x, y: IN_BLAU.y });
  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.deepEqual(types(inbox.p1), [FREMD, FREMD, 'stack_move']);
  assert.deepEqual(inbox.p1[2], { type: 'stack_move', stack_id: 'sfrei', x: 300, y: 300 }, 'der wahre Stand des Stapels');
  assert.equal(stapel().cards.length, 3);
  assert.deepEqual(inbox.p2, []);
});

test('FO 5: stack_create mit einer Karte aus fremder Zone – abgelehnt; mit Ziel in fremder Zone ebenso', () => {
  const { room, inbox } = makeRoom();
  const vorher = JSON.stringify(room.boardState);

  send(room, 'p1', { type: 'stack_create', stack_id: 'neu', card_table_ids: ['lose', 'blau'], x: 400, y: 400 });
  assert.equal(JSON.stringify(room.boardState), vorher, 'die Karten bleiben liegen, kein Stapel entsteht');
  send(room, 'p1', { type: 'stack_create', stack_id: 'neu', card_table_ids: ['lose', 'lose2'], x: IN_BLAU.x, y: IN_BLAU.y });
  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.deepEqual(types(inbox.p1), [FREMD, FREMD]);
  assert.deepEqual(inbox.p2, []);
});

test('FO 5: mit Ziel in neutraler oder eigener Zone verhalten sich alle drei wie heute', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'stack_move', stack_id: 'sfrei', x: IN_ROT.x, y: IN_ROT.y });
  const s = room.boardState.stacks.find(x => x.stackId === 'sfrei');
  assert.deepEqual([s.x, s.y], [IN_ROT.x, IN_ROT.y], 'in die eigene Zone');
  send(room, 'p1', { type: 'stack_move', stack_id: 'sfrei', x: 900, y: 900 });
  assert.deepEqual([s.x, s.y], [900, 900], 'aus der eigenen heraus, neutral');

  send(room, 'p1', { type: 'stack_take_top', stack_id: 'sfrei', new_x: IN_ROT.x, new_y: IN_ROT.y });
  assert.equal(s.cards.length, 2);
  assert.deepEqual([room.boardState.cards.at(-1).x, room.boardState.cards.at(-1).y], [IN_ROT.x, IN_ROT.y]);

  send(room, 'p1', { type: 'stack_create', stack_id: 'neu', card_table_ids: ['lose', 'lose2'], x: 500, y: 500 });
  assert.deepEqual(room.boardState.stacks.find(x => x.stackId === 'neu').cards.map(c => c.tableId), ['lose', 'lose2']);
  assert.equal(card(room, 'lose'), undefined);

  assert.deepEqual(types(inbox.p2), ['stack_move', 'stack_move', 'stack_take_top', 'stack_create']);
  // Stapelbau und Abheben sind Wünsche an den Server: die Rückmeldung geht auch an den Absender (docs/tasks-stapel-raum.md,
  // Entscheidung 1); `stack_move` geht wie heute nicht zurück
  assert.deepEqual(types(inbox.p1), ['stack_take_top', 'stack_create']);
});

// ── 6. Eigentümer weg ────────────────────────────────────────────────────────

test('FO 6: ist der Eigentümer aus room.players entfernt, ist die Zone offen – dieselben Handlungen werden angewandt', () => {
  const { room, inbox } = makeRoom();
  room.players.delete('p2');
  room.connections.delete('p2');

  send(room, 'p1', { type: 'card_move', table_id: 'blau', x: FREI.x, y: FREI.y });
  assert.deepEqual([card(room, 'blau').x, card(room, 'blau').y], [FREI.x, FREI.y], 'aus der früheren Zone heraus');
  send(room, 'p1', { type: 'card_move', table_id: 'lose', x: IN_BLAU.x, y: IN_BLAU.y });
  assert.equal(card(room, 'lose').x, IN_BLAU.x, 'in die frühere Zone hinein');
  send(room, 'p1', { type: 'card_flip', table_id: 'lose', face_down: true });
  assert.equal(card(room, 'lose').faceDown, true);
  send(room, 'p1', { type: 'stack_move', stack_id: 'sfrei', x: IN_BLAU.x, y: IN_BLAU.y });
  assert.equal(room.boardState.stacks.find(s => s.stackId === 'sfrei').x, IN_BLAU.x);
  assert.deepEqual(inbox.p1, [], 'kein error');
});

test('FO 6: ein nur getrennter Eigentümer (isConnected: false, noch in room.players) lässt die Zone gesperrt', () => {
  const { room, inbox } = makeRoom();
  room.players.get('p2').isConnected = false;
  room.connections.delete('p2');

  send(room, 'p1', { type: 'card_move', table_id: 'blau', x: FREI.x, y: FREI.y });
  assert.deepEqual([card(room, 'blau').x, card(room, 'blau').y], [IN_BLAU.x, IN_BLAU.y]);
  assert.deepEqual(types(inbox.p1), [FREMD, 'card_move']);
});

// ── 7. Nichts anderes ändert sich ────────────────────────────────────────────

test('FO 7: Zähler, Token, Würfel, Notizen – auch **in** der fremden Zone – verhalten sich wie vor FO (gemeinsam, nicht eingeschränkt)', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'counter_update', counter_id: 'c1', value: 7 });
  send(room, 'p1', { type: 'counter_move', counter_id: 'c1', x: IN_BLAU.x, y: IN_BLAU.y });
  send(room, 'p1', { type: 'token_move', token_id: 'tok', x: IN_BLAU.x, y: IN_BLAU.y });
  send(room, 'p1', { type: 'dice_roll', dice_id: 'd1', value: 4 });
  send(room, 'p1', { type: 'die_move', die_id: 'd1', x: IN_BLAU.x, y: IN_BLAU.y });
  send(room, 'p1', { type: 'note_edit', note_id: 'n1', text: 'hallo' });
  send(room, 'p1', { type: 'note_move', note_id: 'n1', x: IN_BLAU.x, y: IN_BLAU.y });

  const b = room.boardState;
  assert.equal(b.counters[0].value, 7);
  assert.deepEqual([b.counters[0].x, b.tokens[1].x, b.dice[0].x, b.notes[0].x], Array(4).fill(IN_BLAU.x));
  assert.equal(b.dice[0].value, 4);
  assert.equal(b.notes[0].text, 'hallo');
  assert.deepEqual(types(inbox.p2), ['counter_update', 'counter_move', 'token_move', 'dice_roll', 'die_move', 'note_edit', 'note_move']);
  assert.deepEqual(inbox.p1, []);
});

test('FO 7: ein Solo-Raum (Zonen ohne Farbe) bleibt für alle diese Nachrichten wie vorher – auch mit `exclusive` ohne Farbe', () => {
  const OHNE_FARBE = MIT_PLATZ.map(z => (z.type === 'player' ? { ...z, exclusive: true, color: null } : z));
  for (const [zones, ZIEL] of [[MIT_PLATZ, IN_BLAU], [MIT_PLATZ, IN_ROT], [OHNE_FARBE, IN_BLAU], [OHNE_FARBE, IN_ROT], [[], IN_ROT], [null, IN_ROT]]) {
    const { room, inbox } = makeRoom({ zones });
    send(room, 'p1', { type: 'card_move', table_id: 'blau', x: ZIEL.x + 1, y: ZIEL.y });
    send(room, 'p1', { type: 'card_move', table_id: 'lose', x: ZIEL.x, y: ZIEL.y });
    send(room, 'p1', { type: 'card_flip', table_id: 'blau', face_down: false });
    send(room, 'p1', { type: 'card_rotate', table_id: 'blau', rotation: 180 });
    send(room, 'p1', { type: 'stack_move', stack_id: 'sfrei', x: ZIEL.x, y: ZIEL.y });
    send(room, 'p1', { type: 'stack_take_top', stack_id: 'sfrei', new_x: ZIEL.x, new_y: ZIEL.y });
    send(room, 'p1', { type: 'stack_create', stack_id: 'neu', card_table_ids: ['blau', 'lose'], x: ZIEL.x, y: ZIEL.y });

    assert.deepEqual(types(inbox.p2), ['card_move', 'card_move', 'card_flip', 'card_rotate', 'stack_move', 'stack_take_top', 'stack_create']);
    assert.deepEqual(types(inbox.p1), ['stack_take_top', 'stack_create'], 'kein error; nur die Rückmeldungen von Abheben und Stapelbau an den Absender (docs/tasks-stapel-raum.md)');
    assert.equal(room.boardState.stacks.find(s => s.stackId === 'neu').cards.length, 2);
    assert.equal(room.boardState.stacks.find(s => s.stackId === 'sfrei').cards.length, 2);
  }
});

// ── card_play_from_hand: die alte Wache ist ersetzt (der Handler selbst gehört FU, `room-hand.test.js`) ──

test('FO: card_play_from_hand benutzt die neue Wache – fremde Zone abgewiesen (error, sonst nichts), sonst angewandt', () => {
  const { room, inbox } = makeRoom();
  room.hands = new Map([['p1', [{ handId: 'h1', tableId: 'x1', name: 'X' }, { handId: 'h2', tableId: 'x2', name: 'X' }]]]);
  const n = room.boardState.cards.length;
  send(room, 'p1', { type: 'card_play_from_hand', hand_id: 'h1', x: IN_BLAU.x, y: IN_BLAU.y });
  assert.equal(room.boardState.cards.length, n);
  assert.deepEqual(types(inbox.p1), [FREMD]);
  assert.deepEqual(inbox.p2, []);

  send(room, 'p1', { type: 'card_play_from_hand', hand_id: 'h2', x: IN_ROT.x, y: IN_ROT.y });
  assert.equal(room.boardState.cards.length, n + 1);
  assert.deepEqual(types(inbox.p2), ['card_play_from_hand', 'player_hand_count']);
});

// ── Nachtrag zu FO: stack_merge / stack_shuffle sind bewacht, die Ablehnung ist deutsch ─────────────────────────

test('FU-Nachtrag: stack_merge – ein Stapel in fremder Hand-Zone lässt sich weder hinein- noch herauslegen; error, nichts ändert sich', () => {
  const { room, inbox } = makeRoom();
  const vorher = JSON.stringify(room.boardState);

  send(room, 'p1', { type: 'stack_merge', from_stack_id: 'sblau', to_stack_id: 'sfrei' });   // der Quellstapel liegt fremd
  send(room, 'p1', { type: 'stack_merge', from_stack_id: 'sfrei', to_stack_id: 'sblau' });   // der Zielstapel liegt fremd
  assert.equal(JSON.stringify(room.boardState), vorher, 'beide Stapel bleiben, wie sie sind');
  assert.deepEqual(types(inbox.p1), [FREMD, FREMD]);
  assert.deepEqual(inbox.p2, [], 'kein anderer bekommt etwas');
});

test('FU-Nachtrag: stack_merge – der Eigentümer darf in seiner Zone, auf neutraler Fläche gilt es wie heute', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p2', { type: 'stack_merge', from_stack_id: 'sblau', to_stack_id: 'sfrei' });   // blau holt seinen Stapel heraus
  assert.deepEqual(room.boardState.stacks.map(s => s.stackId), ['sfrei']);
  assert.equal(room.boardState.stacks[0].cards.length, 5);
  assert.deepEqual(types(inbox.p1), ['stack_merge']);
  assert.deepEqual(types(inbox.p2), ['stack_merge'], 'auch der Absender bekommt die Rückmeldung (docs/tasks-stapel-raum.md, Entscheidung 1)');

  const neutral = makeRoom();
  neutral.room.boardState.stacks.push({ stackId: 'sneben', x: 320, y: 320, cards: [{ tableId: 'k9' }] });
  send(neutral.room, 'p1', { type: 'stack_merge', from_stack_id: 'sneben', to_stack_id: 'sfrei' });
  assert.equal(neutral.room.boardState.stacks.find(s => s.stackId === 'sfrei').cards.length, 4);
  assert.deepEqual(types(neutral.inbox.p1), ['stack_merge']);
});

test('FU-Nachtrag: stack_shuffle – ein Stapel in fremder Hand-Zone wird nicht gemischt; der wahre Stand geht an den Absender', () => {
  const { room, inbox } = makeRoom();
  const vorher = JSON.stringify(room.boardState);
  send(room, 'p1', { type: 'stack_shuffle', stack_id: 'sblau', order: ['k2', 'k1'] });
  assert.equal(JSON.stringify(room.boardState), vorher);
  assert.deepEqual(types(inbox.p1), [FREMD, 'stack_shuffle']);
  assert.deepEqual(inbox.p1[1], { type: 'stack_shuffle', stack_id: 'sblau', order: ['k1', 'k2'] }, 'die Reihenfolge, die der Server hält');
  assert.deepEqual(inbox.p2, []);

  // der Eigentümer mischt seinen Stapel, und auf neutraler Fläche ist es wie heute
  send(room, 'p2', { type: 'stack_shuffle', stack_id: 'sblau', order: ['k2', 'k1'] });
  assert.deepEqual(room.boardState.stacks.find(s => s.stackId === 'sblau').cards.map(c => c.tableId), ['k2', 'k1']);
  send(room, 'p1', { type: 'stack_shuffle', stack_id: 'sfrei', order: ['k5', 'k4', 'k3'] });
  assert.deepEqual(room.boardState.stacks.find(s => s.stackId === 'sfrei').cards.map(c => c.tableId), ['k5', 'k4', 'k3']);
  assert.deepEqual(types(inbox.p2), ['stack_shuffle']);
});

test('FU-Nachtrag: ein Solo-Raum (Zonen ohne Farbe) und ein Raum ohne Zonen mischen und legen zusammen wie vorher', () => {
  for (const zones of [MIT_PLATZ, [], null]) {
    const { room, inbox } = makeRoom({ zones });
    send(room, 'p1', { type: 'stack_shuffle', stack_id: 'sblau', order: ['k2', 'k1'] });
    send(room, 'p1', { type: 'stack_merge', from_stack_id: 'sblau', to_stack_id: 'sfrei' });
    assert.deepEqual(room.boardState.stacks.map(s => s.stackId), ['sfrei']);
    assert.deepEqual(types(inbox.p2), ['stack_shuffle', 'stack_merge']);
    assert.deepEqual(types(inbox.p1), ['stack_merge'], 'nur die Rückmeldung des Merge an den Absender');
  }
});

test('FU-Nachtrag: die Ablehnung ist deutsch – „Das ist die Hand eines anderen Spielers."', () => {
  const { room, inbox } = makeRoom();
  send(room, 'p1', { type: 'card_move', table_id: 'lose', x: IN_BLAU.x, y: IN_BLAU.y });
  send(room, 'p1', { type: 'stack_merge', from_stack_id: 'sblau', to_stack_id: 'sfrei' });
  const fehler = inbox.p1.filter(m => m.type === 'error');
  assert.equal(fehler.length, 2);
  for (const m of fehler) assert.equal(m.message, 'Das ist die Hand eines anderen Spielers.');
});
