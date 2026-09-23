// M6-Nachtrag 2: der Tisch warf den Zustand des Raums weg.
//
// Der Server baut den Raum beim Start auf und schickt ihn im `welcome`, aber
// `GameTable` las `room.boardState` nirgends - Zonen, Raster und Mitspieler
// erschienen, kein einziges Objekt. Der Tisch laedt ihn jetzt ueber denselben
// Weg wie Setup und Spielstand (`loadGameState`).
//
// Geprueft wird hier die Entscheidung, *ob* ein eintreffender Zustand angewandt
// wird - der Rest ist React-State-Setzen, fuer das es im Client keine
// Testinfrastruktur gibt (CLAUDE.md).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldApplyBoardState } from '../../client/src/utils/roomBoardState.js';

test('ein erster Zustand vom Server wird angewandt', () => {
  assert.equal(shouldApplyBoardState({ cards: [] }, null), true);
});

test('ohne Zustand passiert nichts (Einzelspieler, oder vor dem welcome)', () => {
  assert.equal(shouldApplyBoardState(null, null), false);
  assert.equal(shouldApplyBoardState(undefined, null), false);
});

test('derselbe Zustand wird nicht bei jedem Render erneut geladen', () => {
  const state = { cards: [{ tableId: 'c1' }] };
  assert.equal(shouldApplyBoardState(state, state), false);
});

test('ein neuer Zustand ersetzt den zuletzt geladenen', () => {
  const first = { cards: [] };
  const second = { cards: [{ tableId: 'c1' }] };
  assert.equal(shouldApplyBoardState(second, first), true);
});

test('gleicher Inhalt, neues Objekt = neue Nachricht, also anwenden', () => {
  // Reihenfolge bewusst: `useGameRoom` legt nur bei welcome/room_started/
  // board_sync ein neues Objekt an. Ein zweites `welcome` nach einem Reconnect
  // traegt denselben Inhalt und muss den Tisch trotzdem neu setzen, weil der
  // Server im Raum die Quelle ist.
  assert.equal(shouldApplyBoardState({ cards: [] }, { cards: [] }), true);
});

test('ein leerer Zustand ist ein Zustand (Raum vor dem Start)', () => {
  // roomStore legt boardState immer als Objekt mit leeren Listen an.
  const empty = { cards: [], stacks: [], counters: [], dice: [], tokens: [], notes: [] };
  assert.equal(shouldApplyBoardState(empty, null), true);
});
