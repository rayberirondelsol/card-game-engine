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

test('an empty zone and an unknown zone are skipped, the state is untouched', () => {
  for (const [name, zoneLabel] of [['leere Zone', 'Leer'], ['Zone gibt es nicht', 'Gibt Es Nicht']]) {
    const before = barState();
    const { state, log } = executeSequenceWithLog(before, [{ type: 'clear_zone', zoneLabel }], ZONES, opts());

    assert.equal(log[0].status, 'skipped', name);
    assert.match(log[0].reason, new RegExp(zoneLabel), `${name}: der Grund steht im Protokoll`);
    assert.deepStrictEqual(state.tokens, before.tokens, `${name}: nichts verändert`);
  }
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

    // Der erste Druck findet nichts zum Abräumen, danach immer.
    const expected = run === 0 ? ['skipped', 'skipped', 'ok', 'ok', 'ok'] : ['ok', 'ok', 'ok', 'ok', 'ok'];
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
  assert.deepEqual(sixth.log.map(e => e.status), ['skipped', 'skipped', 'skipped', 'ok', 'skipped']);
  assert.deepStrictEqual(sixth.state, fifth.state);
});

// ── Vokabular des Editors ────────────────────────────────────────────────────

test('clear_zone is offered with the two fields its handler reads', () => {
  const ctx = { zoneLabels: ZONES.map(z => z.label) };

  assert.ok(STEP_TYPES.some(t => t.value === 'clear_zone'), 'clear_zone missing from STEP_TYPES');
  assert.deepEqual(stepFields('clear_zone'), ['zoneLabel', 'targetZoneLabel']);

  const fresh = defaultStep('clear_zone', ctx);
  assert.equal(fresh.type, 'clear_zone');
  assert.equal(fresh.zoneLabel, 'Bösewicht-Leiste', 'prefilled with the first zone, like every other zone step');
  assert.deepEqual(Object.keys(fresh).sort(), ['targetZoneLabel', 'type', 'zoneLabel']);

  const line = describeStep({ type: 'clear_zone', zoneLabel: 'Bösewicht-Platz', targetZoneLabel: 'Besiegte Bösewichte' });
  assert.ok(!line.includes('_'), `shows the raw type: ${line}`);
  assert.match(line, /Bösewicht-Platz/);
  assert.match(line, /Besiegte Bösewichte/);
  assert.ok(!describeStep({ type: 'clear_zone', zoneLabel: 'Bösewicht-Tableau' }).includes('undefined'));

  assert.deepEqual(validateStep({ type: 'clear_zone', zoneLabel: 'Bösewicht-Platz', targetZoneLabel: '' }, ctx), [], 'ohne Ziel ist gültig');
  assert.equal(validateStep({ type: 'clear_zone', zoneLabel: '' }, ctx).length, 1, 'ohne Zone kann der Schritt nicht laufen');
  assert.match(validateStep({ type: 'clear_zone', zoneLabel: 'Gelöscht' }, ctx)[0], /Gelöscht/);
});
