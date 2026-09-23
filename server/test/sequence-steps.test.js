// Tests for the step vocabulary the setup sequence editor renders (M2.7).
//
// The editor itself has no test infrastructure, so everything it decides is
// pulled out into pure functions here: which fields a step type has, how a
// step reads as one line, what a fresh step looks like, and what is wrong with
// a step given the pools and zones that actually exist.
//
// The last test is the acceptance criterion of spec section 7: the complete
// Townsfolk Tussle setup, expressed in the vocabulary, run through the
// executor - every step must report `ok`.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  STEP_TYPES,
  stepFields,
  defaultStep,
  describeStep,
  validateStep,
  assetPools,
  assetNames,
} = await import('../../client/src/utils/sequenceSteps.js');

const { executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BOSS_BACK = '/uploads/tokens/boss-back.png';

/** The game's table assets: two boards, eight bosses, four villagers + tokens. */
function assetFixture() {
  const boards = ['Hauptbrett', 'Sideboard'].map((n, i) => ({
    id: `board-${i}`, name: n, type: 'board', category: 'Bretter',
    image_path: `/uploads/boards/${i}.png`, back_image_path: null, width: 400, height: 400,
  }));
  const bosses = ['Klaus', 'Bertha', 'Grimm', 'Odd', 'Hex', 'Mole', 'Vex', 'Wren'].map((n, i) => ({
    id: `boss-${i}`, name: n, type: 'token', category: 'Bösewichte',
    image_path: `/uploads/tokens/boss-${i}.png`, back_image_path: BOSS_BACK, width: 60, height: 60,
  }));
  const villagers = ['Bäcker', 'Schmied'].map((n, i) => ({
    id: `villager-${i}`, name: n, type: 'figure', category: 'Dörfler',
    image_path: `/uploads/figures/${i}.png`, back_image_path: null, width: 50, height: 50,
  }));
  const order = ['Bäcker-Marke', 'Schmied-Marke'].map((n, i) => ({
    id: `order-${i}`, name: n, type: 'token', category: 'Dörfler-Marken',
    image_path: `/uploads/tokens/order-${i}.png`, back_image_path: null, width: 40, height: 40,
  }));
  return [...boards, ...bosses, ...villagers, ...order];
}

/** The zones of the reference setup. */
function zoneFixture() {
  return [
    { id: 'z1', label: 'Bosseleiste', x: 50, y: 50, width: 400, height: 80, shape: 'rect', accepts: ['asset'], capacity: 4, layout: 'row' },
    { id: 'z2', label: 'Reihenfolge', x: 600, y: 50, width: 80, height: 400, shape: 'rect', accepts: ['asset'], capacity: 4, layout: 'column' },
    { id: 'z3', label: 'Auslage', x: 50, y: 600, width: 900, height: 140, shape: 'rect', accepts: ['card'], capacity: 10, layout: 'row' },
    { id: 'z4', label: 'Hand 1', x: 50, y: 800, width: 400, height: 140, shape: 'rect', accepts: ['card'], capacity: 3, layout: 'row' },
    { id: 'z5', label: 'Hand 2', x: 500, y: 800, width: 400, height: 140, shape: 'rect', accepts: ['card'], capacity: 3, layout: 'row' },
  ];
}

function cards(label, n) {
  return {
    stackId: `stack-${label}`,
    label,
    x: 2000,
    y: 2000,
    cards: Array.from({ length: n }, (_, i) => ({
      tableId: `${label}-t${i}`, cardId: `${label}-c${i}`, name: `${label} ${i}`,
      image_path: `/uploads/cards/${label}-${i}.png`, zIndex: i + 1,
    })),
  };
}

function stateFixture() {
  return {
    cards: [], tokens: [], boards: [],
    stacks: [cards('Nachschub', 20), cards('Dorf-Ereignisse', 12), cards('Heldentaten', 15)],
  };
}

const ctxFixture = () => ({
  stackLabels: ['Nachschub', 'Dorf-Ereignisse', 'Heldentaten'],
  zoneLabels: zoneFixture().map(z => z.label),
  pools: assetPools(assetFixture()),
  assetNames: assetNames(assetFixture()),
});

// ── Step types ───────────────────────────────────────────────────────────────

test('all five asset steps are offered, not just the card steps', () => {
  const values = STEP_TYPES.map(t => t.value);
  for (const t of ['place_asset', 'draw_assets', 'set_asset_face', 'lock_asset', 'unlock_asset']) {
    assert.ok(values.includes(t), `${t} missing from STEP_TYPES`);
  }
  // the seven card steps stay
  for (const t of ['shuffle', 'split', 'deal_to_zone', 'move', 'set_face_up', 'set_face_down', 'flip_top_card']) {
    assert.ok(values.includes(t), `${t} disappeared from STEP_TYPES`);
  }
  assert.ok(STEP_TYPES.every(t => t.label && t.label !== t.value), 'every type needs a readable label');
});

test('pools and asset names come from the table assets, blanks dropped', () => {
  const assets = [...assetFixture(), { id: 'x', name: '', category: '' }, { id: 'y', name: 'Solo', category: null }];
  // sorted the way a German-speaking author reads them: ö sorts with o
  assert.deepEqual(assetPools(assets), ['Bösewichte', 'Bretter', 'Dörfler', 'Dörfler-Marken']);
  const names = assetNames(assets);
  assert.ok(names.includes('Klaus'));
  assert.ok(names.includes('Solo'));
  assert.ok(!names.includes(''), 'an asset without a name is not addressable');
});

// ── Fields per type ──────────────────────────────────────────────────────────

test('a step type only has the fields its handler reads', () => {
  assert.deepEqual(stepFields('draw_assets').sort(), ['count', 'faceDown', 'pool', 'targetZoneLabel']);
  assert.deepEqual(stepFields('set_asset_face').sort(), ['assetName', 'faceDown']);
  assert.deepEqual(stepFields('lock_asset'), ['assetName']);
  assert.deepEqual(stepFields('unlock_asset'), ['assetName']);

  // faceDown is meaningless for locking, count only for drawing
  assert.ok(!stepFields('lock_asset').includes('faceDown'));
  assert.ok(!stepFields('place_asset').includes('count'));
  assert.ok(!stepFields('set_asset_face').includes('targetZoneLabel'));

  // no asset field leaks into a card step
  for (const t of ['shuffle', 'split', 'deal_to_zone', 'move']) {
    assert.ok(!stepFields(t).includes('assetName'), `${t} must not ask for an asset`);
    assert.ok(!stepFields(t).includes('pool'), `${t} must not ask for a pool`);
  }
});

test('place_asset asks for coordinates only while no zone is chosen', () => {
  const free = stepFields({ type: 'place_asset', assetName: 'Hauptbrett' });
  assert.ok(free.includes('x') && free.includes('y'));

  const zoned = stepFields({ type: 'place_asset', assetName: 'Klaus', targetZoneLabel: 'Bosseleiste' });
  assert.ok(!zoned.includes('x') && !zoned.includes('y'), 'the zone decides the position, not x/y');
  assert.ok(zoned.includes('targetZoneLabel'));
});

// ── Defaults ─────────────────────────────────────────────────────────────────

test('a new step is prefilled from what the setup has', () => {
  const ctx = ctxFixture();

  const draw = defaultStep('draw_assets', ctx);
  assert.equal(draw.type, 'draw_assets');
  assert.equal(draw.pool, 'Bösewichte');        // first available pool
  assert.equal(draw.targetZoneLabel, 'Bosseleiste'); // first available zone
  assert.equal(draw.count, 1);
  assert.equal(draw.faceDown, false);

  const lock = defaultStep('lock_asset', ctx);
  assert.deepEqual(Object.keys(lock).sort(), ['assetName', 'type']);
  assert.equal(lock.assetName, 'Bäcker');

  const place = defaultStep('place_asset', ctx);
  assert.equal(place.assetName, 'Bäcker');
  assert.equal(place.targetZoneLabel, '');      // free placement by default
  assert.equal(place.x, 0);
  assert.equal(place.y, 0);

  // the card steps keep working with nothing configured at all
  const shuffle = defaultStep('shuffle', {});
  assert.deepEqual(shuffle, { type: 'shuffle', stackLabel: '' });
});

// ── Summary line ─────────────────────────────────────────────────────────────

test('every step reads as one line, never as its raw type', () => {
  const lines = {
    place_asset: describeStep({ type: 'place_asset', assetName: 'Hauptbrett', x: 400, y: 300 }),
    place_zone: describeStep({ type: 'place_asset', assetName: 'Klaus', targetZoneLabel: 'Bosseleiste' }),
    draw_assets: describeStep({ type: 'draw_assets', pool: 'Bösewichte', count: 4, targetZoneLabel: 'Bosseleiste', faceDown: true }),
    set_asset_face: describeStep({ type: 'set_asset_face', assetName: 'Klaus', faceDown: false }),
    lock_asset: describeStep({ type: 'lock_asset', assetName: 'Hauptbrett' }),
    unlock_asset: describeStep({ type: 'unlock_asset', assetName: 'Hauptbrett' }),
    shuffle: describeStep({ type: 'shuffle', stackLabel: 'Nachschub' }),
  };
  for (const [key, line] of Object.entries(lines)) {
    assert.equal(typeof line, 'string');
    assert.ok(line.length > 0, `${key} has no summary`);
    assert.ok(!line.includes('_'), `${key} shows the raw type: ${line}`);
  }

  assert.match(lines.draw_assets, /4/);
  assert.match(lines.draw_assets, /Bösewichte/);
  assert.match(lines.draw_assets, /Bosseleiste/);
  assert.match(lines.draw_assets, /face down/i);
  assert.match(lines.place_asset, /Hauptbrett/);
  assert.match(lines.place_asset, /400/);
  assert.match(lines.place_zone, /Bosseleiste/);
  assert.ok(!/face down/i.test(lines.set_asset_face), 'faceDown:false must not read as face down');

  // an unfinished step still says something rather than crashing
  assert.equal(typeof describeStep({ type: 'draw_assets' }), 'string');
  assert.equal(typeof describeStep({}), 'string');
  assert.equal(typeof describeStep(null), 'string');
});

// ── Validation ───────────────────────────────────────────────────────────────

test('a step pointing at a pool or zone that is not there is reported', () => {
  const ctx = ctxFixture();

  assert.deepEqual(validateStep({ type: 'draw_assets', pool: 'Bösewichte', count: 4, targetZoneLabel: 'Bosseleiste' }, ctx), []);

  const unknownPool = validateStep({ type: 'draw_assets', pool: 'Monster', count: 1, targetZoneLabel: 'Bosseleiste' }, ctx);
  assert.equal(unknownPool.length, 1);
  assert.match(unknownPool[0], /Monster/);

  const noPool = validateStep({ type: 'draw_assets', pool: '', count: 1, targetZoneLabel: 'Bosseleiste' }, ctx);
  assert.equal(noPool.length, 1);

  const goneZone = validateStep({ type: 'draw_assets', pool: 'Bösewichte', count: 1, targetZoneLabel: 'Gelöscht' }, ctx);
  assert.equal(goneZone.length, 1);
  assert.match(goneZone[0], /Gelöscht/);

  const badCount = validateStep({ type: 'draw_assets', pool: 'Bösewichte', count: 0, targetZoneLabel: 'Bosseleiste' }, ctx);
  assert.ok(badCount.length >= 1);
});

test('an asset step pointing at a name that does not exist is reported', () => {
  const ctx = ctxFixture();
  assert.deepEqual(validateStep({ type: 'lock_asset', assetName: 'Hauptbrett' }, ctx), []);

  const gone = validateStep({ type: 'lock_asset', assetName: 'Nebenbrett' }, ctx);
  assert.equal(gone.length, 1);
  assert.match(gone[0], /Nebenbrett/);

  assert.equal(validateStep({ type: 'set_asset_face', assetName: '' }, ctx).length, 1);

  // a card step is checked against the stacks, not the assets
  assert.deepEqual(validateStep({ type: 'shuffle', stackLabel: 'Nachschub' }, ctx), []);
  assert.equal(validateStep({ type: 'shuffle', stackLabel: 'Fehlt' }, ctx).length, 1);

  // without a context nothing is claimed to be wrong
  assert.deepEqual(validateStep({ type: 'lock_asset', assetName: 'Irgendwas' }, {}), []);
});

// ── Acceptance: the whole of spec section 7 ──────────────────────────────────

test('the complete Townsfolk Tussle setup runs with every step ok', () => {
  const assets = assetFixture();
  const zones = zoneFixture();
  const ctx = {
    stackLabels: ['Nachschub', 'Dorf-Ereignisse', 'Heldentaten'],
    zoneLabels: zones.map(z => z.label),
    pools: assetPools(assets),
    assetNames: assetNames(assets),
  };

  const sequence = [
    // Hauptbrett auslegen, Sideboard rechts - und festnageln
    { type: 'place_asset', assetName: 'Hauptbrett', x: 1200, y: 400 },
    { type: 'lock_asset', assetName: 'Hauptbrett' },
    { type: 'place_asset', assetName: 'Sideboard', x: 1700, y: 400 },
    { type: 'lock_asset', assetName: 'Sideboard' },
    // Alle Bösewicht-Token mischen, vier verdeckt in die Leiste
    { type: 'draw_assets', pool: 'Bösewichte', count: 4, targetZoneLabel: 'Bosseleiste', faceDown: true },
    // Dörfler wählen, Marker auf Startwerte
    { type: 'place_asset', assetName: 'Bäcker', x: 1200, y: 900 },
    { type: 'place_asset', assetName: 'Schmied', x: 1300, y: 900 },
    // Dörfler-Token auf die Buyin'/Beatin' Order Bar
    { type: 'place_asset', assetName: 'Bäcker-Marke', targetZoneLabel: 'Reihenfolge' },
    { type: 'place_asset', assetName: 'Schmied-Marke', targetZoneLabel: 'Reihenfolge' },
    // Nachschub-Auslage: 10 Gear-Karten
    { type: 'shuffle', stackLabel: 'Nachschub' },
    { type: 'deal_to_zone', stackLabel: 'Nachschub', count: 10, targetZoneLabel: 'Auslage', faceDown: false },
    // Dorf-Ereignisse mischen
    { type: 'shuffle', stackLabel: 'Dorf-Ereignisse' },
    // Heldentaten mischen, je 3 auf die Hand
    { type: 'shuffle', stackLabel: 'Heldentaten' },
    { type: 'deal_to_zone', stackLabel: 'Heldentaten', count: 3, targetZoneLabel: 'Hand 1', faceDown: false },
    { type: 'deal_to_zone', stackLabel: 'Heldentaten', count: 3, targetZoneLabel: 'Hand 2', faceDown: false },
  ];

  // Every step is one the editor can build and finds nothing wrong with.
  const offered = new Set(STEP_TYPES.map(t => t.value));
  for (const step of sequence) {
    assert.ok(offered.has(step.type), `${step.type} cannot be added in the editor`);
    assert.deepEqual(validateStep(step, ctx), [], `editor complains about: ${describeStep(step)}`);
    const allowed = new Set([...stepFields(step), 'type']);
    for (const key of Object.keys(step)) {
      assert.ok(allowed.has(key), `${step.type} has no editor field for "${key}"`);
    }
  }

  const { state, log } = executeSequenceWithLog(stateFixture(), sequence, zones, { assets, rng: () => 0.42 });

  const bad = log.filter(e => e.status !== 'ok');
  assert.deepEqual(bad, [], `steps not ok: ${bad.map(e => `${e.index} ${e.type}: ${e.reason}`).join(' | ')}`);
  assert.equal(log.length, sequence.length);

  // and the table really looks like the rulebook says
  const inBar = state.tokens.filter(t => t.x >= 50 && t.x <= 450 && t.y >= 50 && t.y <= 130);
  assert.equal(inBar.length, 4, 'four bosses in the boss bar');
  assert.ok(inBar.every(t => t.faceDown === true), 'the bosses lie face down');
  assert.ok(state.tokens.find(t => t.label === 'Hauptbrett').locked, 'the board is locked');
  assert.equal(state.cards.filter(c => c.x >= 50 && c.x <= 950 && c.y >= 600 && c.y <= 740).length, 10);
});

// ── reveal_next (M5) ─────────────────────────────────────────────────────────

test('reveal_next is offered with the two fields its handler reads', () => {
  const ctx = ctxFixture();

  assert.ok(STEP_TYPES.some(t => t.value === 'reveal_next'), 'reveal_next missing from STEP_TYPES');
  assert.deepEqual(stepFields('reveal_next'), ['zoneLabel', 'targetZoneLabel']);

  const fresh = defaultStep('reveal_next', ctx);
  assert.equal(fresh.type, 'reveal_next');
  assert.equal(fresh.zoneLabel, 'Bosseleiste', 'prefilled with the first zone, like every other zone step');
  assert.deepEqual(Object.keys(fresh).sort(), ['targetZoneLabel', 'type', 'zoneLabel']);

  const line = describeStep({ type: 'reveal_next', zoneLabel: 'Bosseleiste', targetZoneLabel: 'Reihenfolge' });
  assert.ok(!line.includes('_'), `shows the raw type: ${line}`);
  assert.match(line, /Bosseleiste/);
  assert.match(line, /Reihenfolge/);
});

test('validateStep checks zoneLabel too, not only targetZoneLabel', () => {
  const ctx = ctxFixture();

  assert.deepEqual(validateStep({ type: 'reveal_next', zoneLabel: 'Bosseleiste', targetZoneLabel: 'Reihenfolge' }, ctx), []);
  assert.equal(validateStep({ type: 'reveal_next', zoneLabel: '' }, ctx).length, 1, 'a reveal without a zone cannot run');

  const gone = validateStep({ type: 'reveal_next', zoneLabel: 'Gelöscht' }, ctx);
  assert.equal(gone.length, 1);
  assert.match(gone[0], /Gelöscht/);

  // Ein Platzhalter ist kein Assetname - er wird erst am Tisch aufgelöst.
  assert.deepEqual(validateStep({ type: 'place_asset', assetName: 'Tableau: $revealedBase', x: 0, y: 0 }, ctx), []);
});

test('a reveal_next built by the editor runs in the executor', () => {
  const assets = assetFixture();
  const zones = zoneFixture();
  const sequence = [
    { type: 'place_asset', assetName: 'Klaus', targetZoneLabel: 'Bosseleiste', faceDown: true },
    { type: 'reveal_next', zoneLabel: 'Bosseleiste', targetZoneLabel: 'Reihenfolge' },
  ];

  const offered = new Set(STEP_TYPES.map(t => t.value));
  for (const step of sequence) {
    assert.ok(offered.has(step.type), `${step.type} cannot be added in the editor`);
    const allowed = new Set([...stepFields(step), 'type']);
    for (const key of Object.keys(step)) {
      assert.ok(allowed.has(key), `${step.type} has no editor field for "${key}"`);
    }
  }

  const { state, log } = executeSequenceWithLog(stateFixture(), sequence, zones, { assets, rng: () => 0.42 });
  assert.deepEqual(log.map(e => e.status), ['ok', 'ok'], log.map(e => e.reason).join(' | '));
  const klaus = state.tokens.find(t => t.label === 'Klaus');
  assert.equal(klaus.faceDown, false);
  assert.deepEqual([klaus.x, klaus.y], [640, 100], 'auf dem ersten Platz der Reihenfolge-Leiste');
});

// ── Grid targets (M7, T1) ────────────────────────────────────────────────────

/** The grids of the reference setup: one 10x10 battlefield. */
function gridFixture() {
  return [{
    id: 'g1', label: 'Kampffeld', type: 'square',
    origin: { x: 0, y: 0 }, cell: 60, cols: 10, rows: 10,
    labels: { cols: 'alpha', rows: 'numeric' },
  }];
}

const gridCtx = () => ({ ...ctxFixture(), grids: gridFixture() });

test('place_asset offers grid and field, and drops x/y once a field is chosen', () => {
  assert.ok(stepFields('place_asset').includes('gridLabel'));
  assert.ok(stepFields('place_asset').includes('cell'));

  const onCell = stepFields({ type: 'place_asset', assetName: 'Klaus', gridLabel: 'Kampffeld', cell: 'C7' });
  assert.ok(!onCell.includes('x') && !onCell.includes('y'), 'the field decides the position, not x/y');
  assert.ok(onCell.includes('gridLabel') && onCell.includes('cell'));

  // Zone, field and x/y are three exclusive ways of saying where something goes.
  const zoned = stepFields({ type: 'place_asset', assetName: 'Klaus', targetZoneLabel: 'Bosseleiste' });
  assert.ok(!zoned.includes('gridLabel') && !zoned.includes('cell'));

  const fresh = defaultStep('place_asset', gridCtx());
  assert.equal(fresh.gridLabel, '', 'no grid by default, so x/y stay usable');
  assert.equal(fresh.cell, '');
});

test('describeStep names grid and field', () => {
  const line = describeStep({ type: 'place_asset', assetName: 'Klaus', gridLabel: 'Kampffeld', cell: 'C7' });
  assert.ok(!line.includes('_'), `shows the raw type: ${line}`);
  assert.match(line, /Klaus/);
  assert.match(line, /Kampffeld/);
  assert.match(line, /C7/);
});

test('validateStep reports an unknown grid and a field the grid does not have', () => {
  const ctx = gridCtx();

  assert.deepEqual(validateStep({ type: 'place_asset', assetName: 'Klaus', gridLabel: 'Kampffeld', cell: 'C7' }, ctx), []);

  const noGrid = validateStep({ type: 'place_asset', assetName: 'Klaus', gridLabel: 'Gelöscht', cell: 'C7' }, ctx);
  assert.equal(noGrid.length, 1);
  assert.match(noGrid[0], /Gelöscht/);

  const badCell = validateStep({ type: 'place_asset', assetName: 'Klaus', gridLabel: 'Kampffeld', cell: 'Z99' }, ctx);
  assert.equal(badCell.length, 1);
  assert.match(badCell[0], /Z99/);

  // A field without a grid cannot be resolved either.
  assert.equal(validateStep({ type: 'place_asset', assetName: 'Klaus', cell: 'C7' }, ctx).length, 1);

  // Without grids in the context nothing is claimed to be wrong (same rule as
  // for zones and pools: an unloaded list is not an empty one).
  assert.deepEqual(validateStep({ type: 'place_asset', assetName: 'Klaus', gridLabel: 'Kampffeld', cell: 'Z99' }, ctxFixture()), []);
});

test('a grid step built by the editor runs in the executor', () => {
  const built = { type: 'place_asset', assetName: 'Klaus', gridLabel: 'Kampffeld', cell: 'C7', faceDown: false };

  const allowed = new Set([...stepFields(built), 'type']);
  for (const key of Object.keys(built)) {
    assert.ok(allowed.has(key), `place_asset has no editor field for "${key}"`);
  }
  assert.deepEqual(validateStep(built, gridCtx()), []);

  const { state, log } = executeSequenceWithLog(stateFixture(), [built], zoneFixture(), {
    assets: assetFixture(),
    grids: gridFixture(),
  });
  assert.equal(log[0].status, 'ok', log[0].reason);
  const klaus = state.tokens.find(t => t.label === 'Klaus');
  assert.deepEqual([klaus.x, klaus.y, klaus.cell], [150, 390, 'C7']);
});

// ── M7/T4: Platzhalter sind kein Tippfehler ──────────────────────────────────
//
// Ein Platzhalter steht für einen Namen, den erst der Tisch kennt. Wer ihn hier
// anmahnt, produziert einen Fehlalarm je Schritt - und Warnungen, die immer
// dastehen, liest niemand mehr.

test('validateStep leaves placeholders alone in every name field', () => {
  const ctx = { ...gridCtx(), cardCategories: ['Aktionen: Klaus'] };

  // Feld: erst am Tisch bekannt, also kein "das Raster hat kein Feld $B".
  assert.deepEqual(validateStep({ type: 'place_asset', assetName: 'Klaus', gridLabel: 'Kampffeld', cell: '$B' }, ctx), []);
  assert.deepEqual(validateStep({ type: 'place_asset', assetName: '$revealed', gridLabel: 'Kampffeld', cell: '$D1' }, ctx), []);

  // Kartenkategorie: dieselbe Idee wie beim Assetnamen.
  assert.deepEqual(validateStep({ type: 'place_stack', category: 'Aktionen: $revealedBase', label: 'Verhaltensdeck', x: 0, y: 0 }, ctx), []);
  assert.deepEqual(validateStep({ type: 'place_stack', category: 'Aktionen: Klaus', label: 'Deck $revealedTier', x: 0, y: 0 }, ctx), []);
  assert.deepEqual(validateStep({ type: 'place_counter', name: 'Stufe $revealedTier', value: 0, x: 0, y: 0 }, ctx), []);

  // Ohne Platzhalter bleibt die Prüfung scharf.
  assert.equal(validateStep({ type: 'place_asset', assetName: 'Klaus', gridLabel: 'Kampffeld', cell: 'Z99' }, ctx).length, 1);
  assert.equal(validateStep({ type: 'place_stack', category: 'Gibt es nicht', label: 'Deck', x: 0, y: 0 }, ctx).length, 1);

  // Und ein leeres Feld bleibt ein leeres Feld, kein Platzhalter.
  assert.equal(validateStep({ type: 'place_counter', name: '', value: 0, x: 0, y: 0 }, ctx).length, 1);
});

test('a field placeholder hides x/y just like a real field does', () => {
  const fields = stepFields({ type: 'place_asset', assetName: '$revealed', gridLabel: 'Kampffeld', cell: '$B' });
  assert.ok(!fields.includes('x') && !fields.includes('y'), 'ein Feldziel schließt Koordinaten aus');
  assert.ok(fields.includes('cell') && fields.includes('gridLabel'));
});
