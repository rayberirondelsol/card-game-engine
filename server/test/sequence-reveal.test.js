// Tests for `reveal_next` and the two placeholders it binds (spec section 11).
//
// Run with: npm test  (node --test, no test framework dependency)
//
// executeSequence is a pure function in the client bundle, so this file imports
// it directly - no app, no DB, no CGE_DB_PATH needed, same as
// sequence-assets.test.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BOSS_BACK = '/uploads/tokens/boss-back.png';

const BOSSES = ['Klaus', 'Bertha', 'Grimm', 'Odd'];

/**
 * Every boss exists twice under different names: the token in the bar
 * ("Bösewicht: X") and its tableau ("Tableau: X") - that is the split
 * `$revealedBase` exists for.
 */
function assetFixture() {
  const tokens = BOSSES.map((n, i) => ({
    id: `boss-${i}`, name: `Bösewicht: ${n}`, type: 'token', category: 'Bösewichte',
    image_path: `/uploads/tokens/boss-${i}.png`, back_image_path: BOSS_BACK, width: 60, height: 60,
  }));
  const tableaus = BOSSES.map((n, i) => ({
    id: `tableau-${i}`, name: `Tableau: ${n}`, type: 'board', category: 'Tableaus',
    image_path: `/uploads/boards/tableau-${i}.png`, back_image_path: null, width: 400, height: 300,
  }));
  return [
    ...tokens,
    ...tableaus,
    { id: 'side', name: 'Sideboard', type: 'board', category: 'Bretter', image_path: '/uploads/boards/side.png', back_image_path: '/uploads/boards/side-back.png', width: 300, height: 200 },
    // Namen ohne bzw. mit zwei Doppelpunkten - beide Sonderfälle von $revealedBase.
    { id: 'solo', name: 'Einzelgänger', type: 'token', category: 'Sonder', image_path: '/uploads/tokens/solo.png', back_image_path: BOSS_BACK, width: 60, height: 60 },
    { id: 'chef', name: 'Bösewicht: Chef: Klaus', type: 'token', category: 'Sonder', image_path: '/uploads/tokens/chef.png', back_image_path: BOSS_BACK, width: 60, height: 60 },
    { id: 'tab-chef', name: 'Tableau: Chef: Klaus', type: 'board', category: 'Tableaus', image_path: '/uploads/boards/chef.png', back_image_path: null, width: 400, height: 300 },
    { id: 'tab-solo', name: 'Tableau: Einzelgänger', type: 'board', category: 'Tableaus', image_path: '/uploads/boards/solo.png', back_image_path: null, width: 400, height: 300 },
    // Die Falle: ein Asset, das wirklich so heißt wie der Platzhalter.
    { id: 'trap', name: '$revealed', type: 'token', category: 'Sonder', image_path: '/uploads/tokens/trap.png', back_image_path: null, width: 60, height: 60 },
  ];
}

/**
 * Bosseleiste (waagerecht, 4 Plätze bei x = 150/250/350/450, y = 140),
 * Reihenfolge (senkrecht, 4 Plätze bei x = 840, y = 150/250/350/450),
 * Eng (ein Platz), Leer (leer, nimmt Assets).
 */
const ZONES = [
  { id: 'z1', label: 'Bosseleiste', x: 100, y: 100, width: 400, height: 80, accepts: ['asset'], capacity: 4, layout: 'row' },
  { id: 'z2', label: 'Reihenfolge', x: 800, y: 100, width: 80, height: 400, accepts: ['asset'], capacity: 4, layout: 'column' },
  { id: 'z3', label: 'Eng', x: 800, y: 600, width: 80, height: 80, accepts: ['asset'], capacity: 1, layout: 'column' },
  { id: 'z4', label: 'Leer', x: 1200, y: 100, width: 160, height: 80, accepts: ['asset'], capacity: 2, layout: 'row' },
];

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [] });

const opts = () => ({ assets: assetFixture() });

/** Vier verdeckte Bösewichte in der Leiste, Platz 0..3 von links nach rechts. */
function barState(names = BOSSES) {
  return executeSequence(
    emptyState(),
    names.map(n => ({ type: 'place_asset', assetName: `Bösewicht: ${n}`, targetZoneLabel: 'Bosseleiste', faceDown: true })),
    ZONES,
    opts()
  );
}

const byLabel = (state, label) => [...state.tokens, ...state.boards].find(o => o.label === label || o.name === label);

// ── reveal_next ──────────────────────────────────────────────────────────────

test('reveal_next turns the first face-down object in the zone face up and leaves the others alone', () => {
  const { state, log } = executeSequenceWithLog(
    barState(),
    [{ type: 'reveal_next', zoneLabel: 'Bosseleiste' }],
    ZONES,
    opts()
  );

  assert.equal(log[0].status, 'ok', log[0].reason);
  const up = state.tokens.filter(t => !t.faceDown);
  assert.equal(up.length, 1, 'genau ein Token liegt offen');
  assert.equal(up[0].label, 'Bösewicht: Klaus', 'der linke Platz kommt zuerst');
  assert.equal(up[0].imageUrl, '/uploads/tokens/boss-0.png', 'die Vorderseite muss auch sichtbar werden');
  assert.equal(up[0].x, 150, 'ohne Zielzone bleibt er liegen, wo er lag');
  assert.ok(state.tokens.filter(t => t.faceDown).every(t => t.imageUrl === BOSS_BACK), 'die anderen bleiben verdeckt');
});

test('reveal_next follows the slot order, not the order the objects sit in the state', () => {
  const state = barState();
  state.tokens.reverse(); // Array-Reihenfolge ist jetzt genau umgekehrt zur Slot-Reihenfolge

  const out = executeSequence(state, [{ type: 'reveal_next', zoneLabel: 'Bosseleiste' }], ZONES, opts());
  const up = out.tokens.filter(t => !t.faceDown);
  assert.equal(up.length, 1);
  assert.equal(up[0].label, 'Bösewicht: Klaus');
  assert.equal(up[0].x, 150);
});

test('reveal_next with a target zone moves the revealed object onto that zone\'s next free slot', () => {
  const out = executeSequence(
    barState(),
    [{ type: 'reveal_next', zoneLabel: 'Bosseleiste', targetZoneLabel: 'Reihenfolge' }],
    ZONES,
    opts()
  );

  const klaus = byLabel(out, 'Bösewicht: Klaus');
  assert.equal(klaus.faceDown, false);
  assert.deepEqual([klaus.x, klaus.y], [840, 150], 'erster freier Platz der Reihenfolge-Leiste');

  // Ein zweiter Durchlauf nimmt den nächsten Platz, nicht denselben.
  const again = executeSequence(out, [{ type: 'reveal_next', zoneLabel: 'Bosseleiste', targetZoneLabel: 'Reihenfolge' }], ZONES, opts());
  assert.deepEqual([byLabel(again, 'Bösewicht: Bertha').x, byLabel(again, 'Bösewicht: Bertha').y], [840, 250]);
});

test('an empty zone, a zone with nothing face down and an unknown zone are skipped', () => {
  const faceUp = executeSequence(
    emptyState(),
    BOSSES.map(n => ({ type: 'place_asset', assetName: `Bösewicht: ${n}`, targetZoneLabel: 'Bosseleiste' })),
    ZONES,
    opts()
  );

  const cases = [
    ['leere Zone', emptyState(), 'Leer'],
    ['nichts verdeckt', faceUp, 'Bosseleiste'],
    ['Zone gibt es nicht', barState(), 'Gibt Es Nicht'],
  ];

  for (const [name, before, zoneLabel] of cases) {
    const { state, log } = executeSequenceWithLog(before, [{ type: 'reveal_next', zoneLabel }], ZONES, opts());
    assert.equal(log[0].status, 'skipped', name);
    assert.ok(log[0].reason && log[0].reason.length > 0, `${name}: der Grund muss im Protokoll stehen`);
    assert.match(log[0].reason, new RegExp(zoneLabel === 'Gibt Es Nicht' ? 'Gibt Es Nicht' : zoneLabel), name);
    assert.deepStrictEqual(state.tokens, before.tokens, `${name}: der Zustand bleibt unangetastet`);
  }
});

test('a full target zone skips the step: nothing moved and nothing turned over', () => {
  const state = executeSequence(
    barState(),
    [{ type: 'place_asset', assetName: 'Einzelgänger', targetZoneLabel: 'Eng' }],
    ZONES,
    opts()
  );

  const { state: out, log } = executeSequenceWithLog(
    state,
    [{ type: 'reveal_next', zoneLabel: 'Bosseleiste', targetZoneLabel: 'Eng' }],
    ZONES,
    opts()
  );

  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Eng/);
  assert.match(log[0].reason, /full/);
  const klaus = byLabel(out, 'Bösewicht: Klaus');
  assert.equal(klaus.faceDown, true, 'ein übersprungener Schritt dreht auch nichts um');
  assert.deepEqual([klaus.x, klaus.y], [150, 140], 'und verschiebt nichts');
});

// ── Platzhalter ──────────────────────────────────────────────────────────────

test('$revealed resolves to the full name of the revealed object', () => {
  const { state, log } = executeSequenceWithLog(
    barState(),
    [
      { type: 'reveal_next', zoneLabel: 'Bosseleiste' },
      { type: 'place_asset', assetName: '$revealed', targetZoneLabel: 'Leer' },
    ],
    ZONES,
    opts()
  );

  assert.deepEqual(log.map(e => e.status), ['ok', 'ok'], log.map(e => e.reason).join(' | '));
  const klaus = byLabel(state, 'Bösewicht: Klaus');
  assert.deepEqual([klaus.x, klaus.y], [1240, 140], 'der aufgedeckte Bösewicht selbst ist in die Zone gewandert');
  assert.equal(state.tokens.length, 4, 'place_asset auf ein vorhandenes Objekt legt kein zweites an');
});

test('$revealedBase is the part after the first ": ", also with none and with two', () => {
  const run = (name) => {
    const state = executeSequence(
      emptyState(),
      [{ type: 'place_asset', assetName: name, targetZoneLabel: 'Bosseleiste', faceDown: true }],
      ZONES,
      opts()
    );
    return executeSequenceWithLog(
      state,
      [
        { type: 'reveal_next', zoneLabel: 'Bosseleiste' },
        { type: 'place_asset', assetName: 'Tableau: $revealedBase', x: 1800, y: 400 },
      ],
      ZONES,
      opts()
    );
  };

  const normal = run('Bösewicht: Klaus');
  assert.deepEqual(normal.log.map(e => e.status), ['ok', 'ok'], normal.log.map(e => e.reason).join(' | '));
  assert.ok(byLabel(normal.state, 'Tableau: Klaus'), 'das Tableau des aufgedeckten Bösewichts liegt auf dem Tisch');

  // Kein ": " im Namen → $revealedBase ist der ganze Name.
  const solo = run('Einzelgänger');
  assert.deepEqual(solo.log.map(e => e.status), ['ok', 'ok'], solo.log.map(e => e.reason).join(' | '));
  assert.ok(byLabel(solo.state, 'Tableau: Einzelgänger'));

  // Zwei ": " → nur das erste wird abgeschnitten.
  const chef = run('Bösewicht: Chef: Klaus');
  assert.deepEqual(chef.log.map(e => e.status), ['ok', 'ok'], chef.log.map(e => e.reason).join(' | '));
  assert.ok(byLabel(chef.state, 'Tableau: Chef: Klaus'));
  assert.ok(!byLabel(chef.state, 'Tableau: Klaus'), 'nicht am zweiten Doppelpunkt geschnitten');
});

test('a placeholder without a preceding reveal_next is skipped, never taken literally', () => {
  const { state, log } = executeSequenceWithLog(
    barState(),
    [
      { type: 'place_asset', assetName: '$revealed', x: 10, y: 20 },
      { type: 'place_asset', assetName: 'Tableau: $revealedBase', x: 30, y: 40 },
      { type: 'set_asset_face', assetName: '$revealed', faceDown: false },
      { type: 'lock_asset', assetName: '$revealed' },
    ],
    ZONES,
    opts()
  );

  assert.deepEqual(log.map(e => e.status), ['skipped', 'skipped', 'skipped', 'skipped']);
  assert.equal(state.tokens.length, 4, 'nichts dazugelegt');
  assert.ok(!state.tokens.some(t => t.assetId === 'trap'), 'das Asset namens "$revealed" darf nicht gelegt werden');
  assert.ok(state.tokens.every(t => t.faceDown === true), 'und nichts umgedreht');
});

test('a skipped reveal_next binds nothing, so the placeholder behind it stays unresolved', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(),
    [
      { type: 'reveal_next', zoneLabel: 'Leer' },
      { type: 'place_asset', assetName: '$revealed', x: 10, y: 20 },
    ],
    ZONES,
    opts()
  );

  assert.deepEqual(log.map(e => e.status), ['skipped', 'skipped']);
  assert.equal(state.tokens.length, 0);
});

test('a second reveal_next rebinds: later steps see the second object', () => {
  const { state, log } = executeSequenceWithLog(
    barState(),
    [
      { type: 'reveal_next', zoneLabel: 'Bosseleiste' },
      { type: 'reveal_next', zoneLabel: 'Bosseleiste' },
      { type: 'place_asset', assetName: 'Tableau: $revealedBase', x: 1800, y: 400 },
    ],
    ZONES,
    opts()
  );

  assert.deepEqual(log.map(e => e.status), ['ok', 'ok', 'ok'], log.map(e => e.reason).join(' | '));
  assert.ok(byLabel(state, 'Tableau: Bertha'), 'die zweite Bindung gilt');
  assert.ok(!byLabel(state, 'Tableau: Klaus'), 'die erste ist überschrieben');
});

// ── Abnahme: „Kampf beginnen", viermal gedrückt ──────────────────────────────

test('four runs of "Kampf beginnen" reveal a different boss each time, the fifth is skipped', () => {
  const action = [
    { type: 'reveal_next', zoneLabel: 'Bosseleiste', targetZoneLabel: 'Reihenfolge' },
    { type: 'set_asset_face', assetName: 'Sideboard', faceDown: false },
    { type: 'place_asset', assetName: 'Tableau: $revealedBase', x: 1800, y: 400 },
  ];

  let state = executeSequence(
    barState(),
    [{ type: 'place_asset', assetName: 'Sideboard', x: 1800, y: 900, faceDown: true }],
    ZONES,
    opts()
  );

  const revealed = [];
  for (let run = 0; run < 4; run++) {
    const res = executeSequenceWithLog(state, action, ZONES, opts());
    state = res.state;
    assert.deepEqual(res.log.map(e => e.status), ['ok', 'ok', 'ok'], `Durchlauf ${run + 1}: ${res.log.map(e => e.reason).join(' | ')}`);
    revealed.push(state.tokens.filter(t => t.label.startsWith('Bösewicht: ') && !t.faceDown).map(t => t.label));
  }

  assert.deepEqual(
    revealed.map(list => list.length),
    [1, 2, 3, 4],
    'jeder Druck deckt genau einen weiteren auf'
  );
  assert.deepEqual(revealed[3].sort(), BOSSES.map(n => `Bösewicht: ${n}`).sort());

  // Die vier liegen auf der Reihenfolge-Leiste, jeder auf seinem eigenen Platz.
  const inBar = state.tokens.filter(t => t.x === 840);
  assert.equal(inBar.length, 4);
  assert.deepEqual(inBar.map(t => t.y).sort((a, b) => a - b), [150, 250, 350, 450]);

  // Vier Tableaus, das Sideboard offen.
  assert.equal(state.tokens.filter(t => t.label.startsWith('Tableau: ')).length, 4);
  assert.equal(byLabel(state, 'Sideboard').faceDown, false);

  // Der fünfte Druck findet nichts mehr - und sagt das.
  const fifth = executeSequenceWithLog(state, action, ZONES, opts());
  assert.equal(fifth.log[0].status, 'skipped');
  assert.match(fifth.log[0].reason, /Bosseleiste/);
  assert.equal(fifth.log[2].status, 'skipped', 'ohne neue Bindung bleibt der Platzhalter unaufgelöst');
  assert.equal(fifth.state.tokens.length, state.tokens.length, 'und es kommt nichts mehr dazu');
});

// ── Regression ───────────────────────────────────────────────────────────────

test('a sequence without reveal_next behaves exactly as before', () => {
  const sequence = [
    { type: 'place_asset', assetName: 'Sideboard', x: 1800, y: 900, faceDown: true },
    { type: 'place_asset', assetName: 'Bösewicht: Klaus', targetZoneLabel: 'Bosseleiste', faceDown: true },
    { type: 'set_asset_face', assetName: 'Sideboard', faceDown: false },
    { type: 'lock_asset', assetName: 'Sideboard' },
    { type: 'place_asset', assetName: 'Tableau: Klaus', x: 1800, y: 400 },
  ];

  const { state, log } = executeSequenceWithLog(emptyState(), sequence, ZONES, opts());

  assert.deepEqual(log.map(e => e.status), ['ok', 'ok', 'ok', 'ok', 'ok'], log.map(e => e.reason).join(' | '));
  assert.equal(state.tokens.length, 3);
  assert.deepEqual([byLabel(state, 'Bösewicht: Klaus').x, byLabel(state, 'Bösewicht: Klaus').y], [150, 140]);
  const side = byLabel(state, 'Sideboard');
  assert.equal(side.faceDown, false);
  assert.equal(side.imageUrl, '/uploads/boards/side.png');
  assert.equal(side.locked, true);
});
