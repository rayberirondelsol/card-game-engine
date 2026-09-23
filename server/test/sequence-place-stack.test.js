// Tests for `place_stack` / `remove_stack` (M7, T3): eine Kartenkategorie als
// Nachziehstapel und wieder weg. Damit entsteht das Verhaltensdeck des
// Bösewichts im Aufbau statt von Hand - die Kategorie steht erst nach dem
// Aufdecken fest, der Stapelname bleibt derselbe, und nur deshalb findet ihn
// der nächste Kampf zum Abräumen wieder.
//
// Der Kern ist die *Form* des Stapels: er muss so entstehen, wie
// `loadGameState` ihn erwartet, samt `width`/`height` je Karte. Eine feste
// Feldliste hat dieses Repo hier schon zweimal Felder gekostet (Nachtrag zu
// M2.12, M4a) - quadratische Karten lagen danach im Hochformat.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');
const { STEP_TYPES, stepFields, defaultStep, describeStep, validateStep, stackLabelsFor } =
  await import('../../client/src/utils/sequenceSteps.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const VERHALTEN = 'Verhalten: Patches';
const UEBERFALL = 'Überfall: Patches';

/**
 * Zwölf Karten in zwei Kategorien. Die Verhaltenskarten sind *quadratisch*
 * (400x400), die Überfallkarten hochkant - eine verlorene `height` fällt damit
 * sofort auf.
 */
function cardFixture() {
  return [
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `v${i}`,
      game_id: 'g1',
      category_id: 'cat-v',
      category: VERHALTEN,
      card_back_id: 'back-v',
      name: `Verhalten ${i + 1}`,
      image_path: `/uploads/cards/v${i}.png`,
      width: 400,
      height: 400,
    })),
    ...Array.from({ length: 6 }, (_, i) => ({
      id: `u${i}`,
      game_id: 'g1',
      category_id: 'cat-u',
      category: UEBERFALL,
      card_back_id: 'back-u',
      name: `Überfall ${i + 1}`,
      image_path: `/uploads/cards/u${i}.png`,
      width: 300,
      height: 420,
    })),
  ];
}

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [] });
const opts = (over = {}) => ({ cards: cardFixture(), ...over });

const place = (over = {}) => ({
  type: 'place_stack', category: VERHALTEN, label: 'Verhaltensdeck', x: 300, y: 400, faceDown: true, ...over,
});
const remove = (stackLabel = 'Verhaltensdeck') => ({ type: 'remove_stack', stackLabel });

const stackNamed = (state, label) => (state.stacks || []).find(s => s.label === label);

// ── place_stack ──────────────────────────────────────────────────────────────

test('place_stack legt genau die Karten der genannten Kategorie als benannten Stapel', () => {
  const { state, log } = executeSequenceWithLog(emptyState(), [place()], [], opts());

  assert.equal(log[0].status, 'ok', log[0].reason || '');
  assert.equal(state.stacks.length, 1, 'genau ein Stapel');

  const stack = state.stacks[0];
  assert.equal(stack.label, 'Verhaltensdeck');
  assert.ok(stack.stackId, 'der Stapel braucht eine Id');
  assert.equal(stack.x, 300);
  assert.equal(stack.y, 400);
  assert.equal(stack.cards.length, 6, 'nur die sechs der genannten Kategorie');
  assert.deepEqual(
    stack.cards.map(c => c.name).sort(),
    ['Verhalten 1', 'Verhalten 2', 'Verhalten 3', 'Verhalten 4', 'Verhalten 5', 'Verhalten 6']
  );
  assert.equal(state.cards.length, 0, 'die Karten liegen im Stapel, nicht lose daneben');
});

test('place_stack zählt die Karten von unten nach oben durch: zIndex 1..6', () => {
  const state = executeSequence(emptyState(), [place()], [], opts());
  assert.deepEqual(stackNamed(state, 'Verhaltensdeck').cards.map(c => c.zIndex), [1, 2, 3, 4, 5, 6]);
});

test('place_stack behält width/height je Karte – sonst liegt die quadratische Karte im Hochformat', () => {
  const state = executeSequence(emptyState(), [place(), place({ category: UEBERFALL, label: 'Überfall', faceDown: false })], [], opts());

  for (const c of stackNamed(state, 'Verhaltensdeck').cards) {
    assert.equal(c.width, 400, `${c.name} hat die Breite verloren`);
    assert.equal(c.height, 400, `${c.name} hat die Höhe verloren`);
  }
  for (const c of stackNamed(state, 'Überfall').cards) {
    assert.equal(c.width, 300);
    assert.equal(c.height, 420);
  }
});

test('place_stack baut die Form, die loadGameState erwartet', () => {
  const state = executeSequence(emptyState(), [place()], [], opts());
  const stack = stackNamed(state, 'Verhaltensdeck');

  // Dieselben Felder, die `split` schreibt und `getGameState` wieder ausgibt.
  assert.deepEqual(
    Object.keys(stack).sort(),
    ['card_ids', 'cards', 'label', 'stackId', 'table_ids', 'x', 'y']
  );
  assert.deepEqual(stack.card_ids, stack.cards.map(c => c.cardId));
  assert.deepEqual(stack.table_ids, stack.cards.map(c => c.tableId));

  const card = stack.cards[0];
  assert.equal(card.cardId, 'v0', 'die Bibliotheks-Id gehört auf cardId');
  assert.ok(card.tableId, 'jede Karte am Tisch braucht eine eigene tableId');
  assert.notEqual(card.tableId, stack.cards[1].tableId, 'zwei Karten, zwei tableIds');
  assert.equal(card.image_path, '/uploads/cards/v0.png');
  assert.equal(card.card_back_id, 'back-v');
  assert.equal(card.rotation, 0);
});

test('place_stack legt den Stapel verdeckt oder offen, wie der Schritt es sagt', () => {
  const down = executeSequence(emptyState(), [place()], [], opts());
  assert.ok(stackNamed(down, 'Verhaltensdeck').cards.every(c => c.faceDown === true));

  const up = executeSequence(emptyState(), [place({ faceDown: false })], [], opts());
  assert.ok(stackNamed(up, 'Verhaltensdeck').cards.every(c => c.faceDown === false));
});

test('shuffle greift auf den neu gelegten Stapel – gemischt wird weiterhin damit', () => {
  const state = executeSequence(
    emptyState(),
    [place(), { type: 'shuffle', stackLabel: 'Verhaltensdeck' }],
    [],
    { ...opts(), rng: () => 0.42 }
  );

  const stack = stackNamed(state, 'Verhaltensdeck');
  assert.equal(stack.cards.length, 6, 'mischen verliert keine Karte');
  assert.deepEqual(stack.cards.map(c => c.zIndex), [1, 2, 3, 4, 5, 6], 'zIndex bleibt 1..6');
  assert.notDeepEqual(
    stack.cards.map(c => c.name),
    ['Verhalten 1', 'Verhalten 2', 'Verhalten 3', 'Verhalten 4', 'Verhalten 5', 'Verhalten 6'],
    'mit diesem rng liegt die Reihenfolge danach anders'
  );
});

test('place_stack überspringt eine unbekannte oder leere Kategorie', () => {
  const { state, log } = executeSequenceWithLog(emptyState(), [place({ category: 'Verhalten: Gibt es nicht' })], [], opts());

  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Verhalten: Gibt es nicht/);
  assert.equal(state.stacks.length, 0, 'kein leerer Stapel');
});

test('place_stack überspringt einen Namen, den es schon gibt – und lässt den vorhandenen unangetastet', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(),
    [place(), place({ category: UEBERFALL })],
    [],
    opts()
  );

  assert.equal(log[0].status, 'ok');
  assert.equal(log[1].status, 'skipped');
  assert.match(log[1].reason, /Verhaltensdeck/);
  assert.equal(state.stacks.length, 1, 'kein zweiter Stapel desselben Namens');
  assert.equal(stackNamed(state, 'Verhaltensdeck').cards[0].name, 'Verhalten 1', 'der erste Stapel bleibt, wie er war');
});

test('place_stack ohne Namen und ohne Stelle wird übersprungen, nicht geraten', () => {
  const noName = executeSequenceWithLog(emptyState(), [place({ label: '  ' })], [], opts());
  assert.equal(noName.log[0].status, 'skipped');
  assert.equal(noName.state.stacks.length, 0);

  const noPos = executeSequenceWithLog(emptyState(), [place({ x: '', y: '' })], [], opts());
  assert.equal(noPos.log[0].status, 'skipped');
  assert.match(noPos.log[0].reason, /position/i);
  assert.equal(noPos.state.stacks.length, 0);
});

test('ohne options.cards kann place_stack nichts bauen und sagt es', () => {
  const { state, log } = executeSequenceWithLog(emptyState(), [place()], [], {});
  assert.equal(log[0].status, 'skipped');
  assert.equal(state.stacks.length, 0);
});

test('place_stack nennt sich im Protokoll bei seiner Kategorie', () => {
  const { log } = executeSequenceWithLog(emptyState(), [place()], [], opts());
  assert.equal(log[0].type, 'place_stack');
  assert.equal(log[0].target, VERHALTEN);
});

// ── remove_stack ─────────────────────────────────────────────────────────────

test('remove_stack nimmt den Stapel samt Karten vom Tisch', () => {
  const before = executeSequence(emptyState(), [place(), place({ category: UEBERFALL, label: 'Überfall' })], [], opts());
  assert.equal(before.stacks.length, 2);

  const { state, log } = executeSequenceWithLog(before, [remove()], [], opts());

  assert.equal(log[0].status, 'ok', log[0].reason || '');
  assert.equal(state.stacks.length, 1, 'nur der genannte Stapel geht');
  assert.equal(state.stacks[0].label, 'Überfall');
  assert.equal(state.cards.length, 0, 'die Karten fallen nicht als lose Karten auf den Tisch');
});

test('remove_stack auf einen Stapel, den es nicht gibt, ist gelungen – der gewünschte Zustand liegt vor', () => {
  // Entscheidung wie beim leeren `clear_zone`: der erste Kampf einer Partie
  // räumt immer ein Deck weg, das es noch nicht gibt. Anders als bei Zonen gibt
  // es für Stapel keine Liste im Setup, gegen die sich ein Tippfehler von einem
  // „schon weg" unterscheiden ließe – und ein Fehlalarm je Partiebeginn
  // erzieht dazu, das Protokoll gar nicht mehr zu lesen.
  const before = executeSequence(emptyState(), [place()], [], opts());
  const { state, log } = executeSequenceWithLog(before, [remove('Gibt es nicht')], [], opts());

  assert.equal(log[0].status, 'ok');
  assert.match(log[0].reason, /Gibt es nicht/, 'im Protokoll steht trotzdem, dass nichts da war');
  assert.equal(state.stacks.length, 1, 'nichts anderes wird angefasst');
});

test('nach remove_stack baut place_stack denselben Namen neu – der zweite Kampf beginnt sauber', () => {
  const state = executeSequence(
    emptyState(),
    [place(), remove(), place({ category: UEBERFALL })],
    [],
    opts()
  );

  assert.equal(state.stacks.length, 1);
  const stack = stackNamed(state, 'Verhaltensdeck');
  assert.equal(stack.cards.length, 6);
  assert.equal(stack.cards[0].name, 'Überfall 1', 'jetzt steckt der zweite Bösewicht darin');
});

// ── Schrittvokabular ─────────────────────────────────────────────────────────

test('das Vokabular kennt beide Schritte mit genau den Feldern, die der Executor liest', () => {
  const placeSpec = STEP_TYPES.find(t => t.value === 'place_stack');
  const removeSpec = STEP_TYPES.find(t => t.value === 'remove_stack');

  assert.ok(placeSpec, 'place_stack fehlt im Editor-Vokabular');
  assert.ok(removeSpec, 'remove_stack fehlt im Editor-Vokabular');
  assert.deepEqual(placeSpec.fields, ['category', 'label', 'x', 'y', 'faceDown']);
  assert.deepEqual(removeSpec.fields, ['stackLabel']);
  assert.deepEqual(stepFields({ type: 'place_stack' }), ['category', 'label', 'x', 'y', 'faceDown']);
});

test('defaultStep füllt place_stack aus den Kartenkategorien vor, den Namen schreibt der Autor', () => {
  const step = defaultStep('place_stack', { cardCategories: [UEBERFALL, VERHALTEN] });
  assert.equal(step.type, 'place_stack');
  assert.equal(step.category, UEBERFALL, 'die erste angebotene Kategorie');
  assert.equal(step.label, '', 'der Stapelname ist eine Entscheidung, keine Vorgabe');
  assert.equal(step.x, 0);
  assert.equal(step.y, 0);
  assert.equal(step.faceDown, false);

  assert.equal(defaultStep('remove_stack', { stackLabels: ['Verhaltensdeck'] }).stackLabel, 'Verhaltensdeck');
});

test('describeStep nennt Kategorie, Stapelnamen und Seite', () => {
  const line = describeStep(place());
  assert.match(line, /Verhalten: Patches/);
  assert.match(line, /Verhaltensdeck/);
  assert.match(line, /face down/);
  assert.match(describeStep(remove()), /Verhaltensdeck/);
});

test('validateStep meldet fehlenden Namen und unbekannte Kategorie', () => {
  const ctx = { cardCategories: [VERHALTEN, UEBERFALL], stackLabels: ['Nachschub'] };

  assert.deepEqual(validateStep(place(), { ...ctx, stackLabels: [] }), []);
  assert.deepEqual(validateStep(place({ label: '' }), ctx).length, 1);
  assert.ok(validateStep(place({ category: 'Verhalten: Gibt es nicht' }), ctx).some(p => /Gibt es nicht/.test(p)));
  assert.ok(validateStep(place({ x: '' }), ctx).some(p => /position/i.test(p)));
  // Eine Liste, die der Editor noch nicht geladen hat, erfindet keine Probleme.
  assert.deepEqual(validateStep(place(), {}), []);
  assert.ok(validateStep(remove('Gibt es nicht'), ctx).some(p => /Gibt es nicht/.test(p)));
});

test('stackLabelsFor bietet auch die Stapel an, die diese Folge erst herstellt', () => {
  // Ohne das wäre `place_stack` ein Schritt, dessen Ergebnis weder `shuffle`
  // noch `remove_stack` im Editor benennen könnte: der Stapel liegt beim
  // Bearbeiten nicht am Tisch.
  const steps = [place(), { type: 'shuffle', stackLabel: 'Verhaltensdeck' }];
  assert.deepEqual(stackLabelsFor(steps, ['Nachschub']), ['Nachschub', 'Verhaltensdeck']);
  assert.deepEqual(stackLabelsFor([], ['Nachschub']), ['Nachschub']);
  assert.deepEqual(stackLabelsFor(steps, []), ['Verhaltensdeck']);
  assert.deepEqual(stackLabelsFor(null, null), []);
});
