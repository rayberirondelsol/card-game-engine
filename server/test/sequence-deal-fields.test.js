// Tests für den Nachtrag zu M2.12: `deal_to_zone` verlor die Kartenmaße
// (docs/spec-setup-system.md, „Nachtrag: `deal_to_zone` verlor die Kartenmaße").
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Wie zones-shape.test.js: executeSequence ist eine reine Funktion im
// Client-Bundle und wird direkt importiert – keine App, keine DB.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence } = await import('../../shared/sequenceExecutor.js');
const { getCardDims } = await import('../../client/src/utils/cardDims.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ZONES = [{ label: 'Auslage', x: 0, y: 0, width: 400, height: 140, layout: 'row', capacity: 4 }];

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [] });

/**
 * Ein Stapel mit einer einzigen quadratischen Karte. `extra` hängt weitere
 * Felder an die Quellkarte, bzw. überschreibt die vorhandenen.
 */
function squareStack(extra = {}) {
  return {
    stackId: 's1',
    label: 'Nachschub',
    x: 800,
    y: 800,
    cards: [{
      tableId: 't1',
      cardId: 'c1',
      name: 'Quadrat',
      image_path: '/uploads/cards/quadrat.png',
      card_back_id: null,
      width: 300,
      height: 300,
      faceDown: false,
      rotation: 0,
      zIndex: 1,
      ...extra,
    }],
  };
}

const dealOnce = (stack, step = {}) => {
  const state = emptyState();
  state.stacks.push(stack);
  const out = executeSequence(
    state,
    [{ type: 'deal_to_zone', stackLabel: 'Nachschub', count: 1, targetZoneLabel: 'Auslage', ...step }],
    ZONES
  );
  assert.equal(out.cards.length, 1, 'genau eine Karte wurde ausgeteilt');
  return out.cards[0];
};

// ── Tests ────────────────────────────────────────────────────────────────────

test('eine ausgeteilte Karte behält width und height der Quellkarte', () => {
  const card = dealOnce(squareStack());
  assert.equal(card.width, 300);
  assert.equal(card.height, 300);
  // Und damit liegt sie am Tisch auch wirklich quadratisch, statt 100x140.
  assert.deepEqual(getCardDims(card), { w: 100, h: 100 });
});

test('eine ausgeteilte Karte behält jedes andere Feld, das Austeilen nicht ändert', () => {
  // Felder, die der Executor nirgends beim Namen nennt – eine zurückgefallene
  // Feldliste würde genau hier auffallen.
  const card = dealOnce(squareStack({ back_image_path: '/uploads/cards/rueckseite.png', locked: true, tts_guid: 'abc123' }));
  assert.equal(card.back_image_path, '/uploads/cards/rueckseite.png');
  assert.equal(card.locked, true);
  assert.equal(card.tts_guid, 'abc123');
});

test('eine ausgeteilte Karte trägt kein inStack mehr – sie hat den Stapel gerade verlassen', () => {
  const card = dealOnce(squareStack({ inStack: 's1' }));
  assert.ok(!('inStack' in card), `inStack darf nicht mitkommen, war aber ${JSON.stringify(card.inStack)}`);
});

test('Position und Seite sind die ausgeteilten Werte, nicht die der Quellkarte', () => {
  const card = dealOnce(squareStack({ x: 800, y: 800, faceDown: false }), { faceDown: true });
  assert.equal(card.x, 50, 'Platz 0 der Auslage, nicht die Stapelposition');
  assert.equal(card.y, 70);
  assert.equal(card.faceDown, true);
  assert.equal(card.face_up, false);
});

test('eine Quellkarte ohne width/height wird ohne NaN ausgeteilt und fällt auf den Standardrahmen zurück', () => {
  const stack = squareStack();
  delete stack.cards[0].width;
  delete stack.cards[0].height;
  const card = dealOnce(stack);
  assert.ok(!('width' in card), 'ohne Maß wird auch keines erfunden');
  assert.ok(!('height' in card));
  assert.deepEqual(getCardDims(card), { w: 100, h: 140 });
});
