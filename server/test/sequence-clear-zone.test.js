// Tests for `clear_zone` – das Gegenstück zu `deal_to_zone` (Spec Abschnitt 11,
// „Nachtrag: clear_zone").
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Wie sequence-reveal.test.js: executeSequence ist eine reine Funktion im
// Client-Bundle und wird direkt importiert – keine App, keine DB.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../client/src/utils/sequenceExecutor.js');
const { STEP_TYPES, stepFields, defaultStep, describeStep, validateStep } =
  await import('../../client/src/utils/sequenceSteps.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BOSS_BACK = '/uploads/tokens/boss-back.png';
const BOSSES = ['Klaus', 'Bertha', 'Grimm', 'Odd'];

function assetFixture() {
  return [
    ...BOSSES.map((n, i) => ({
      id: `boss-${i}`, name: `Bösewicht: ${n}`, type: 'token', category: 'Bösewichte',
      image_path: `/uploads/tokens/boss-${i}.png`, back_image_path: BOSS_BACK, width: 60, height: 60,
    })),
    ...BOSSES.map((n, i) => ({
      id: `tableau-${i}`, name: `Tableau: ${n}`, type: 'board', category: 'Tableaus',
      image_path: `/uploads/boards/tableau-${i}.png`, back_image_path: null, width: 400, height: 300,
    })),
    { id: 'board-main', name: 'Hauptbrett', type: 'board', category: 'Bretter', image_path: '/uploads/boards/main.png', back_image_path: null, width: 400, height: 400 },
    { id: 'side', name: 'Sideboard', type: 'board', category: 'Bretter', image_path: '/uploads/boards/side.png', back_image_path: '/uploads/boards/side-back.png', width: 300, height: 200 },
  ];
}

/**
 * Bösewicht-Leiste (4 Plätze x = 150/250/350/450, y = 140), Bösewicht-Platz
 * (ein Platz, 640/140), Besiegte Bösewichte (4 Plätze y = 640), Bösewicht-
 * Tableau (ein Platz, 1100/450), Eng (2 Plätze), Nur Karten (nimmt keine
 * Assets), Leer, und eine Zone, die auf dem Hauptbrett hängt.
 */
const ZONES = [
  { id: 'z1', label: 'Bösewicht-Leiste', x: 100, y: 100, width: 400, height: 80, accepts: ['asset'], capacity: 4, layout: 'row' },
  { id: 'z2', label: 'Bösewicht-Platz', x: 600, y: 100, width: 80, height: 80, accepts: ['asset'], capacity: 1, layout: 'stack' },
  { id: 'z3', label: 'Besiegte Bösewichte', x: 100, y: 600, width: 400, height: 80, accepts: ['asset'], capacity: 4, layout: 'row' },
  { id: 'z4', label: 'Bösewicht-Tableau', x: 900, y: 300, width: 400, height: 300, accepts: ['asset'], capacity: 1, layout: 'stack' },
  { id: 'z5', label: 'Eng', x: 1500, y: 100, width: 160, height: 80, accepts: ['asset'], capacity: 2, layout: 'row' },
  { id: 'z6', label: 'Nur Karten', x: 1500, y: 600, width: 160, height: 80, accepts: ['card'], capacity: 4, layout: 'row' },
  { id: 'z7', label: 'Leer', x: 2000, y: 100, width: 160, height: 80, accepts: ['asset'], capacity: 2, layout: 'row' },
  {
    id: 'z8', label: 'Auf dem Brett', x: 400, y: 400, width: 200, height: 200,
    accepts: ['asset'], capacity: 2, layout: 'row',
    anchor: { assetId: 'board-main', relX: 0.25, relY: 0.25, relWidth: 0.5, relHeight: 0.5 },
  },
  // M5.1: die Ladenauslage aus dem Abnahmefall und eine gleich grosse Zone
  // daneben, fuer den Fall "Zone und Stapel zugleich".
  { id: 'z9', label: 'Ladenauslage', x: 2000, y: 600, width: 1000, height: 140, accepts: ['card'], capacity: 10, layout: 'row' },
  { id: 'z10', label: 'Abwurf', x: 2000, y: 900, width: 1000, height: 140, accepts: ['card'], capacity: 10, layout: 'row' },
];

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [] });
const opts = () => ({ assets: assetFixture() });
const byLabel = (state, label) => [...state.tokens, ...state.boards].find(o => o.label === label || o.name === label);

/** Vier verdeckte Bösewichte in der Leiste, Platz 0..3 von links nach rechts. */
function barState() {
  return executeSequence(
    emptyState(),
    BOSSES.map(n => ({ type: 'place_asset', assetName: `Bösewicht: ${n}`, targetZoneLabel: 'Bösewicht-Leiste', faceDown: true })),
    ZONES,
    opts()
  );
}

// ── clear_zone mit Ziel ──────────────────────────────────────────────────────

test('clear_zone moves every object of the zone into the target zone and leaves the source empty', () => {
  const { state, log } = executeSequenceWithLog(
    barState(),
    [{ type: 'clear_zone', zoneLabel: 'Bösewicht-Leiste', targetZoneLabel: 'Besiegte Bösewichte' }],
    ZONES,
    opts()
  );

  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.equal(state.tokens.length, 4, 'abräumen heißt verschieben, nicht löschen');
  assert.equal(state.tokens.filter(t => t.y === 140).length, 0, 'die Quellzone ist leer');
  assert.deepEqual(state.tokens.map(t => t.x).sort((a, b) => a - b), [150, 250, 350, 450]);
  assert.ok(state.tokens.every(t => t.y === 640), 'alle liegen auf den Plätzen der Trophäenreihe');
});

test('clear_zone fills the free slots of a target that already holds something', () => {
  const state = executeSequence(
    barState(),
    [{ type: 'place_asset', assetName: 'Bösewicht: Klaus', targetZoneLabel: 'Besiegte Bösewichte' }],
    ZONES,
    opts()
  );

  const { state: out, log } = executeSequenceWithLog(
    state,
    [{ type: 'clear_zone', zoneLabel: 'Bösewicht-Leiste', targetZoneLabel: 'Besiegte Bösewichte' }],
    ZONES,
    opts()
  );

  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.deepEqual(out.tokens.map(t => t.x).sort((a, b) => a - b), [150, 250, 350, 450]);
  assert.ok(out.tokens.every(t => t.y === 640));
});

// ── clear_zone ohne Ziel ─────────────────────────────────────────────────────

test('clear_zone without a target takes the objects off the table entirely', () => {
  const { state, log } = executeSequenceWithLog(
    barState(),
    [{ type: 'clear_zone', zoneLabel: 'Bösewicht-Leiste' }],
    ZONES,
    opts()
  );

  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.deepEqual(state.tokens, [], 'nicht nur verschoben – weg vom Tisch');
  assert.ok(!BOSSES.some(n => byLabel(state, `Bösewicht: ${n}`)));
});

test('clear_zone without a target also removes cards, not only tokens', () => {
  const withStack = {
    ...emptyState(),
    stacks: [{
      stackId: 's1', label: 'Nachziehstapel', x: 0, y: 0,
      cards: [1, 2].map(i => ({ tableId: `t${i}`, cardId: `c${i}`, name: `Karte ${i}`, image_path: `/uploads/cards/${i}.png`, zIndex: i })),
    }],
  };

  const dealt = executeSequence(
    withStack,
    [{ type: 'deal_to_zone', stackLabel: 'Nachziehstapel', count: 2, targetZoneLabel: 'Nur Karten' }],
    ZONES,
    opts()
  );
  assert.equal(dealt.cards.length, 2, 'Vorbedingung: zwei Karten liegen in der Zone');

  const { state, log } = executeSequenceWithLog(dealt, [{ type: 'clear_zone', zoneLabel: 'Nur Karten' }], ZONES, opts());
  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.deepEqual(state.cards, [], 'Karten werden genauso abgeräumt wie Tokens');
});

// ── Übersprungen ─────────────────────────────────────────────────────────────

test('eine leere Zone zu leeren ist gelungen, nicht gescheitert', () => {
  // Sonst meldet der erste Kampf einer frischen Partie zwei Fehlalarme: dort
  // ist noch kein Vorgänger abzuräumen. Der gewünschte Zustand liegt vor, also
  // ist der Schritt in Ordnung - anders als bei `reveal_next`, wo "nichts da"
  // heißt, dass die Absicht nicht erfüllt wurde.
  const before = barState();
  const { state, log } = executeSequenceWithLog(before, [{ type: 'clear_zone', zoneLabel: 'Leer' }], ZONES, opts());

  assert.equal(log[0].status, 'ok');
  assert.equal(log[0].reason, null, 'kein Grund, es ist ja nichts schiefgegangen');
  assert.deepStrictEqual(state.tokens, before.tokens, 'nichts verändert');
});

test('eine Zone, die es nicht gibt, wird uebersprungen - das ist ein Autorenfehler', () => {
  const before = barState();
  const { state, log } = executeSequenceWithLog(
    before, [{ type: 'clear_zone', zoneLabel: 'Gibt Es Nicht' }], ZONES, opts()
  );

  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Gibt Es Nicht/, 'der Grund steht im Protokoll');
  assert.deepStrictEqual(state.tokens, before.tokens, 'nichts verändert');
});

test('an unknown target zone is skipped and nothing leaves the source', () => {
  const before = barState();
  const { state, log } = executeSequenceWithLog(
    before,
    [{ type: 'clear_zone', zoneLabel: 'Bösewicht-Leiste', targetZoneLabel: 'Gibt Es Nicht' }],
    ZONES,
    opts()
  );

  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Gibt Es Nicht/);
  assert.deepStrictEqual(state.tokens, before.tokens, 'ohne Ziel wird hier nichts gelöscht');
});

test('a target zone that does not accept the kind is skipped, nothing moves', () => {
  const before = barState();
  const { state, log } = executeSequenceWithLog(
    before,
    [{ type: 'clear_zone', zoneLabel: 'Bösewicht-Leiste', targetZoneLabel: 'Nur Karten' }],
    ZONES,
    opts()
  );

  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /does not accept/);
  assert.deepStrictEqual(state.tokens, before.tokens);
});

// ── Teilweise ────────────────────────────────────────────────────────────────

test('a target with room for only some: those that fit move, the rest are reported', () => {
  const { state, log } = executeSequenceWithLog(
    barState(),
    [{ type: 'clear_zone', zoneLabel: 'Bösewicht-Leiste', targetZoneLabel: 'Eng' }],
    ZONES,
    opts()
  );

  assert.equal(log[0].status, 'failed', 'halb abgeräumt ist nicht ok');
  assert.match(log[0].reason, /2 of 4/);
  assert.match(log[0].reason, /full/);
  assert.match(log[0].reason, /Grimm/, 'die Liegengebliebenen stehen mit Namen im Protokoll');
  assert.match(log[0].reason, /Odd/);

  assert.deepEqual(
    [byLabel(state, 'Bösewicht: Klaus'), byLabel(state, 'Bösewicht: Bertha')].map(t => [t.x, t.y]),
    [[1540, 140], [1620, 140]],
    'die beiden vorderen sind umgezogen'
  );
  assert.deepEqual(
    [byLabel(state, 'Bösewicht: Grimm'), byLabel(state, 'Bösewicht: Odd')].map(t => [t.x, t.y]),
    [[350, 140], [450, 140]],
    'die anderen liegen unverändert weiter, keiner ist verschwunden'
  );
  assert.equal(state.tokens.length, 4);
});

// ── Anker ────────────────────────────────────────────────────────────────────

test('clear_zone never takes the board its zone hangs on', () => {
  const placed = executeSequence(
    emptyState(),
    [
      { type: 'place_asset', assetName: 'Hauptbrett', x: 500, y: 500 },
      { type: 'place_asset', assetName: 'Bösewicht: Klaus', targetZoneLabel: 'Auf dem Brett' },
    ],
    ZONES,
    opts()
  );
  const brett = byLabel(placed, 'Hauptbrett');
  assert.deepEqual([brett.x, brett.y], [500, 500], 'Vorbedingung: das Brett liegt mitten in seiner eigenen Zone');

  const { state, log } = executeSequenceWithLog(placed, [{ type: 'clear_zone', zoneLabel: 'Auf dem Brett' }], ZONES, opts());

  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.ok(byLabel(state, 'Hauptbrett'), 'das Brett bleibt liegen – es liegt nicht *in* der Zone, die darauf hängt');
  assert.ok(!byLabel(state, 'Bösewicht: Klaus'), 'der Token darin ist weg');
  assert.equal(state.tokens.length, 1);
});

// ── Gesperrte Objekte ────────────────────────────────────────────────────────

test('a locked object is not cleared away, it stays and is reported', () => {
  const locked = executeSequence(barState(), [{ type: 'lock_asset', assetName: 'Bösewicht: Klaus' }], ZONES, opts());

  const moved = executeSequenceWithLog(
    locked,
    [{ type: 'clear_zone', zoneLabel: 'Bösewicht-Leiste', targetZoneLabel: 'Besiegte Bösewichte' }],
    ZONES,
    opts()
  );
  assert.equal(moved.log[0].status, 'failed');
  assert.match(moved.log[0].reason, /locked/);
  assert.match(moved.log[0].reason, /Klaus/);
  assert.deepEqual([byLabel(moved.state, 'Bösewicht: Klaus').x, byLabel(moved.state, 'Bösewicht: Klaus').y], [150, 140]);
  assert.equal(moved.state.tokens.filter(t => t.y === 640).length, 3, 'die drei anderen sind abgeräumt');

  const deleted = executeSequenceWithLog(locked, [{ type: 'clear_zone', zoneLabel: 'Bösewicht-Leiste' }], ZONES, opts());
  assert.equal(deleted.log[0].status, 'failed');
  assert.match(deleted.log[0].reason, /locked/);
  assert.equal(deleted.state.tokens.length, 1, 'gesperrt heißt gesperrt – auch gegen das Löschen');
  assert.ok(byLabel(deleted.state, 'Bösewicht: Klaus'));
});

// ── Abnahme: „Kampf beginnen" mit Abräumen, fünfmal gedrückt ─────────────────

test('four runs of "Kampf beginnen" reveal four different bosses, each clearing the previous', () => {
  const action = [
    { type: 'clear_zone', zoneLabel: 'Bösewicht-Platz', targetZoneLabel: 'Besiegte Bösewichte' },
    { type: 'clear_zone', zoneLabel: 'Bösewicht-Tableau' },
    { type: 'reveal_next', zoneLabel: 'Bösewicht-Leiste', targetZoneLabel: 'Bösewicht-Platz' },
    { type: 'set_asset_face', assetName: 'Sideboard', faceDown: false },
    { type: 'place_asset', assetName: 'Tableau: $revealedBase', targetZoneLabel: 'Bösewicht-Tableau' },
  ];

  let state = executeSequence(
    barState(),
    [{ type: 'place_asset', assetName: 'Sideboard', x: 1800, y: 900, faceDown: true }],
    ZONES,
    opts()
  );

  const fighters = [];
  for (let run = 0; run < 4; run++) {
    const res = executeSequenceWithLog(state, action, ZONES, opts());
    state = res.state;

    // Jeder Druck meldet fünfmal ok - auch der erste, der noch nichts
    // abzuräumen findet: eine leere Zone zu leeren ist gelungen. Sonst sähe
    // der Beginn einer frischen Partie nach zwei Fehlern aus.
    const expected = ['ok', 'ok', 'ok', 'ok', 'ok'];
    assert.deepEqual(res.log.map(e => e.status), expected, `Durchlauf ${run + 1}: ${res.log.map(e => e.reason).join(' | ')}`);

    const onPlatz = state.tokens.filter(t => t.x === 640 && t.y === 140);
    assert.equal(onPlatz.length, 1, `Durchlauf ${run + 1}: genau ein Bösewicht auf dem Platz`);
    assert.equal(onPlatz[0].faceDown, false);
    fighters.push(onPlatz[0].label);

    const tableaus = state.tokens.filter(t => t.label.startsWith('Tableau: '));
    assert.equal(tableaus.length, 1, `Durchlauf ${run + 1}: das vorige Tableau ist abgeräumt`);
    assert.equal(tableaus[0].label, `Tableau: ${onPlatz[0].label.replace('Bösewicht: ', '')}`, 'und es ist das passende');
    assert.deepEqual([tableaus[0].x, tableaus[0].y], [1100, 450]);
  }

  assert.equal(new Set(fighters).size, 4, 'vier verschiedene Bösewichte');
  assert.deepEqual([...fighters].sort(), BOSSES.map(n => `Bösewicht: ${n}`).sort());
  assert.equal(state.tokens.filter(t => t.y === 640).length, 3, 'die drei Besiegten liegen in der Trophäenreihe');
  assert.equal(byLabel(state, 'Sideboard').faceDown, false);

  // Fünfter Druck: es ist nichts mehr aufzudecken, und es kommt nichts dazu.
  const fifth = executeSequenceWithLog(state, action, ZONES, opts());
  assert.equal(fifth.log[2].status, 'skipped');
  assert.match(fifth.log[2].reason, /Bösewicht-Leiste/);
  assert.equal(fifth.log[4].status, 'skipped', 'ohne neue Bindung bleibt der Platzhalter unaufgelöst');
  assert.equal(fifth.state.tokens.filter(t => t.label.startsWith('Tableau: ')).length, 0);
  assert.equal(fifth.state.tokens.filter(t => t.y === 640).length, 4, 'der letzte Kampf wird noch aufgeräumt');

  // Und ein sechster Druck ändert wirklich gar nichts mehr.
  const sixth = executeSequenceWithLog(fifth.state, action, ZONES, opts());
  assert.deepEqual(sixth.log.map(e => e.status), ['ok', 'ok', 'skipped', 'ok', 'skipped']);
  assert.deepStrictEqual(sixth.state, fifth.state);
});

// ── M5.1: zurück unter einen Stapel ────────────────────────────────────

const SUPPLY = 'Nachschub (Tante Emma)';

/** Ein Nachschubstapel aus n verdeckten Karten, zIndex 1..n von unten nach oben. */
function supplyStack(n = 133) {
  return {
    stackId: 's-nachschub', label: SUPPLY, x: 3000, y: 2000,
    cards: Array.from({ length: n }, (_, i) => ({
      tableId: `t${i + 1}`, cardId: `c${i + 1}`, name: `Ware ${i + 1}`,
      image_path: `/uploads/cards/ware-${i + 1}.png`,
      width: 100, height: 140, faceDown: true, rotation: 0, zIndex: i + 1,
    })),
  };
}

/** Der Abnahmefall: zehn Karten offen in der Ladenauslage, 123 im Stapel. */
function shopState() {
  const out = executeSequence(
    { ...emptyState(), stacks: [supplyStack()] },
    [{ type: 'deal_to_zone', stackLabel: SUPPLY, count: 10, targetZoneLabel: 'Ladenauslage', faceDown: false }],
    ZONES,
    opts()
  );
  assert.equal(out.cards.length, 10, 'Vorbedingung: zehn Karten in der Auslage');
  assert.equal(out.stacks[0].cards.length, 123, 'Vorbedingung: 123 im Stapel');
  return out;
}

const supplyOf = (state) => state.stacks.find(s => s.label === SUPPLY);
const bottomUp = (stack) => [...stack.cards].sort((a, b) => a.zIndex - b.zIndex);
/** Die Auslage ist eine Reihe – ihre Reihenfolge ist die von links nach rechts. */
const zoneOrder = (state) => [...state.cards].sort((a, b) => a.x - b.x).map(c => c.tableId);
const backStep = (extra = {}) => ({ type: 'clear_zone', zoneLabel: 'Ladenauslage', targetStackLabel: SUPPLY, ...extra });

test('zehn Karten wandern unter den Stapel zurück – die Zone ist leer, der Stapel hat 133', () => {
  const before = shopState();
  const order = zoneOrder(before);

  const { state, log } = executeSequenceWithLog(before, [backStep({ faceDown: true })], ZONES, opts());

  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.deepEqual(state.cards, [], 'die Auslage ist leer');

  const stack = supplyOf(state);
  assert.equal(stack.cards.length, 133);
  assert.equal(new Set(stack.cards.map(c => c.tableId)).size, 133, 'keine Karte doppelt, keine verschwunden');

  const sorted = bottomUp(stack);
  assert.deepEqual(sorted.slice(0, 10).map(c => c.tableId), order, 'unten, in der Reihenfolge der Auslage');
  assert.deepEqual(sorted.map(c => c.zIndex), Array.from({ length: 133 }, (_, i) => i + 1), 'jede Karte hat ihren eigenen Platz');
  assert.ok(sorted.slice(0, 10).every(c => c.faceDown === true), 'faceDown: true dreht sie um');
  assert.ok(
    sorted.slice(0, 10).every(c => c.x === stack.x && c.y === stack.y),
    'sie liegen wieder auf dem Stapel, nicht auf ihrem Platz in der Auslage'
  );
});

test('ohne faceDown behält jede zurückgelegte Karte ihre Seite – geraten wird nicht', () => {
  const before = shopState();
  before.cards[3].faceDown = true;
  before.cards[3].face_up = false;
  const sides = new Map(before.cards.map(c => [c.tableId, c.faceDown]));

  const { state, log } = executeSequenceWithLog(before, [backStep()], ZONES, opts());
  assert.equal(log[0].status, 'ok', log[0].reason);

  const stack = supplyOf(state);
  for (const [tableId, faceDown] of sides) {
    assert.equal(stack.cards.find(c => c.tableId === tableId).faceDown, faceDown, `Karte ${tableId}`);
  }
  assert.equal([...sides.values()].filter(Boolean).length, 1, 'genau eine lag verdeckt in der Auslage');

  // Und faceDown: false ist eine Ansage, keine Abwesenheit.
  const open = executeSequenceWithLog(before, [backStep({ faceDown: false })], ZONES, opts());
  assert.equal(open.log[0].status, 'ok', open.log[0].reason);
  assert.ok(bottomUp(supplyOf(open.state)).slice(0, 10).every(c => c.faceDown === false));
});

test('ein Token in der Zone bleibt liegen und steht mit Namen im Protokoll', () => {
  const before = shopState();
  before.tokens.push({ assetId: 'boss-0', label: 'Bösewicht: Klaus', x: 2500, y: 670, width: 60, height: 60, faceDown: false });

  const { state, log } = executeSequenceWithLog(before, [backStep()], ZONES, opts());

  assert.equal(log[0].status, 'failed', 'nur zum Teil abgeräumt ist nicht ok');
  assert.match(log[0].reason, /Klaus/, 'der Liegengebliebene steht mit Namen im Protokoll');
  assert.equal(state.tokens.length, 1);
  assert.deepEqual([state.tokens[0].x, state.tokens[0].y], [2500, 670], 'unverändert liegen geblieben');
  assert.deepEqual(state.cards, [], 'die Karten sind trotzdem zurück im Stapel');
  assert.equal(supplyOf(state).cards.length, 133);
});

test('eine gesperrte Karte bleibt in der Auslage liegen', () => {
  const before = shopState();
  const locked = [...before.cards].sort((a, b) => a.x - b.x)[0];
  locked.locked = true;
  const where = [locked.x, locked.y];

  const { state, log } = executeSequenceWithLog(before, [backStep()], ZONES, opts());

  assert.equal(log[0].status, 'failed');
  assert.match(log[0].reason, /locked/);
  assert.equal(state.cards.length, 1, 'die gesperrte Karte liegt noch da');
  assert.deepEqual([state.cards[0].x, state.cards[0].y], where, 'und zwar an ihrem Platz');
  assert.equal(supplyOf(state).cards.length, 132, 'die neun anderen sind zurück');
});

test('ein Stapel, den es nicht gibt, überspringt den Schritt – nichts wird gelöscht', () => {
  const before = shopState();
  const { state, log } = executeSequenceWithLog(
    before, [backStep({ targetStackLabel: 'Gibt Es Nicht' })], ZONES, opts()
  );

  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Gibt Es Nicht/, 'der Grund steht im Protokoll');
  assert.equal(state.cards.length, 10, 'die Auslage liegt unverändert da');
  assert.equal(supplyOf(state).cards.length, 123);
});

test('Zone und Stapel zusammen: die Zone gewinnt, der ignorierte Stapel steht im Protokoll', () => {
  const before = shopState();
  const { state, log } = executeSequenceWithLog(
    before, [backStep({ targetZoneLabel: 'Abwurf' })], ZONES, opts()
  );

  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.match(String(log[0].reason), /Nachschub/, 'der ignorierte Stapel ist vermerkt');
  assert.equal(supplyOf(state).cards.length, 123, 'der Stapel ist unberührt');
  assert.equal(state.cards.length, 10);
  assert.ok(state.cards.every(c => c.y === 970), 'die zehn liegen in der Abwurfzone');
});

test('eine leere Zone in einen Stapel zu räumen ist gelungen, nicht gescheitert', () => {
  const before = shopState();
  const { state, log } = executeSequenceWithLog(
    before, [backStep({ zoneLabel: 'Abwurf' })], ZONES, opts()
  );

  assert.equal(log[0].status, 'ok');
  assert.equal(log[0].reason, null, 'kein Grund, es ist ja nichts schiefgegangen');
  assert.deepStrictEqual(state.stacks, before.stacks, 'der Stapel bleibt, wie er war');
  assert.equal(state.cards.length, 10);
});

// ── Vokabular des Editors ────────────────────────────────────────────────────

test('clear_zone is offered with the fields its handler reads', () => {
  const ctx = { zoneLabels: ZONES.map(z => z.label) };

  assert.ok(STEP_TYPES.some(t => t.value === 'clear_zone'), 'clear_zone missing from STEP_TYPES');
  assert.deepEqual(stepFields('clear_zone'), ['zoneLabel', 'targetZoneLabel', 'targetStackLabel', 'faceDown']);

  const fresh = defaultStep('clear_zone', ctx);
  assert.equal(fresh.type, 'clear_zone');
  assert.equal(fresh.zoneLabel, 'Bösewicht-Leiste', 'prefilled with the first zone, like every other zone step');
  assert.deepEqual(Object.keys(fresh).sort(), ['targetStackLabel', 'targetZoneLabel', 'type', 'zoneLabel'],
    'ohne faceDown: eine frische Vorgabe soll keine Seite raten');

  const line = describeStep({ type: 'clear_zone', zoneLabel: 'Bösewicht-Platz', targetZoneLabel: 'Besiegte Bösewichte' });
  assert.ok(!line.includes('_'), `shows the raw type: ${line}`);
  assert.match(line, /Bösewicht-Platz/);
  assert.match(line, /Besiegte Bösewichte/);
  assert.ok(!describeStep({ type: 'clear_zone', zoneLabel: 'Bösewicht-Tableau' }).includes('undefined'));

  assert.deepEqual(validateStep({ type: 'clear_zone', zoneLabel: 'Bösewicht-Platz', targetZoneLabel: '' }, ctx), [], 'ohne Ziel ist gültig');
  assert.equal(validateStep({ type: 'clear_zone', zoneLabel: '' }, ctx).length, 1, 'ohne Zone kann der Schritt nicht laufen');
  assert.match(validateStep({ type: 'clear_zone', zoneLabel: 'Gelöscht' }, ctx)[0], /Gelöscht/);
});

test('das Stapelziel ist im Editor wählbar, lesbar und geprüft (M5.1)', () => {
  const ctx = { zoneLabels: ZONES.map(z => z.label), stackLabels: [SUPPLY] };

  // Die Seite nur dort anbieten, wo sie etwas bewirkt: in einen Stapel zurück.
  assert.ok(!stepFields({ type: 'clear_zone', zoneLabel: 'Ladenauslage' }).includes('faceDown'));
  assert.ok(stepFields({ type: 'clear_zone', zoneLabel: 'Ladenauslage', targetStackLabel: SUPPLY }).includes('faceDown'));

  const line = describeStep({ type: 'clear_zone', zoneLabel: 'Ladenauslage', targetStackLabel: SUPPLY, faceDown: true });
  assert.match(line, /Ladenauslage/);
  assert.match(line, /Nachschub \(Tante Emma\)/, 'der Stapel steht in der Zusammenfassung');
  assert.match(line, /face down/);
  assert.ok(!line.includes('undefined'));
  assert.ok(!describeStep({ type: 'clear_zone', zoneLabel: 'Ladenauslage', targetStackLabel: SUPPLY }).includes('undefined'));

  assert.deepEqual(validateStep({ type: 'clear_zone', zoneLabel: 'Ladenauslage', targetStackLabel: SUPPLY }, ctx), []);
  assert.match(
    validateStep({ type: 'clear_zone', zoneLabel: 'Ladenauslage', targetStackLabel: 'Gibt Es Nicht' }, ctx)[0],
    /Gibt Es Nicht/
  );
  assert.equal(
    validateStep({ type: 'clear_zone', zoneLabel: 'Ladenauslage', targetZoneLabel: 'Abwurf', targetStackLabel: SUPPLY }, ctx).length,
    1,
    'beide Ziele zugleich sind ein Autorenfehler, auch wenn die Zone gewinnt'
  );
});
