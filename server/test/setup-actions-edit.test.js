// M5/M7 T7 – Aktionen im Setup-Modus anlegen, umbenennen, löschen.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// `setup-action-data.test.js` zeigt, dass eine Aktionsliste Speichern und Laden
// übersteht. Hier geht es um die Stufe davor: dass sie überhaupt entstehen
// kann, ohne JSON von Hand zu schreiben. Die Bedienung ist React und hat hier
// keine Testinfrastruktur, also lebt alles, was sich ohne DOM entscheiden
// lässt, in setupActions.js und wird von hier geprüft — dieselbe Halbierung
// wie bei zoneDraft.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  createAction, renameAction, deleteAction, setActionSteps, actionSteps,
} = await import('../../client/src/utils/setupActions.js');

/** Eine Aktion, wie sie der Referenzfall aus Abschnitt 11 hat. */
function fight() {
  return {
    id: 'a-fight',
    label: 'Kampf beginnen',
    steps: [
      { type: 'reveal_next', zoneLabel: 'Bösewicht-Leiste', targetZoneLabel: 'Bösewicht-Platz' },
      { type: 'set_asset_face', assetName: 'Sideboard', faceDown: false },
    ],
  };
}

// ── anlegen ──────────────────────────────────────────────────────────────────

test('a new action has an id, a name and an empty step list', () => {
  const a = createAction([]);
  assert.ok(a.id, 'without an id the run button has no key and rename/delete no handle');
  assert.equal(typeof a.label, 'string');
  assert.notEqual(a.label.trim(), '');
  assert.deepStrictEqual(a.steps, []);
});

test('two actions created in a row are two actions, not one', () => {
  const first = createAction([]);
  const second = createAction([first]);
  assert.notEqual(first.id, second.id, 'equal ids would make React and deleteAction confuse them');
  assert.notEqual(first.label, second.label, 'two buttons reading the same is not a list');
});

test('a new action is only appended – the ones that exist keep their steps', () => {
  const before = [fight()];
  const after = [...before, createAction(before)];
  assert.equal(after.length, 2);
  assert.deepStrictEqual(after[0], fight());
});

// ── umbenennen ───────────────────────────────────────────────────────────────

test('renaming touches the name and nothing else', () => {
  const actions = [fight()];
  const next = renameAction(actions, 'a-fight', 'Kampf starten');
  assert.equal(next[0].label, 'Kampf starten');
  assert.deepStrictEqual(next[0].steps, fight().steps, 'the steps must survive a rename untouched');
  assert.equal(next[0].id, 'a-fight');
});

test('renaming an id that is not there changes nothing', () => {
  const actions = [fight()];
  assert.deepStrictEqual(renameAction(actions, 'nope', 'x'), actions);
});

test('renaming does not mutate the list it was given', () => {
  const actions = [fight()];
  renameAction(actions, 'a-fight', 'Anders');
  assert.equal(actions[0].label, 'Kampf beginnen', 'React state that is mutated in place does not re-render');
});

// ── löschen ──────────────────────────────────────────────────────────────────

test('deleting hits exactly one action', () => {
  const other = { id: 'a-rest', label: 'Rasten', steps: [{ type: 'shuffle', stackLabel: 'Nachschub' }] };
  const next = deleteAction([fight(), other], 'a-fight');
  assert.deepStrictEqual(next, [other]);
});

test('deleting an id that is not there changes nothing', () => {
  const actions = [fight()];
  assert.deepStrictEqual(deleteAction(actions, 'nope'), actions);
});

// ── Schritte ersetzen ────────────────────────────────────────────────────────

test('replacing the steps of one action leaves the others alone', () => {
  const other = { id: 'a-rest', label: 'Rasten', steps: [{ type: 'shuffle', stackLabel: 'Nachschub' }] };
  const steps = [{ type: 'clear_grid', gridLabel: 'Kampffeld' }];
  const next = setActionSteps([fight(), other], 'a-fight', steps);
  assert.deepStrictEqual(next[0].steps, steps);
  assert.equal(next[0].label, 'Kampf beginnen', 'the name must survive a step edit');
  assert.deepStrictEqual(next[1], other);
});

test('the steps of an action are readable back, and an unknown one reads as empty', () => {
  const actions = [fight()];
  assert.deepStrictEqual(actionSteps(actions, 'a-fight'), fight().steps);
  assert.deepStrictEqual(actionSteps(actions, 'nope'), [], 'the editor must never be handed undefined');
  assert.deepStrictEqual(actionSteps(actions, null), []);
});

// ── die Rundreise durch die Spalte ───────────────────────────────────────────

test('an edited list survives JSON.stringify/parse unchanged', () => {
  // Genau der Weg, den `action_data` nimmt: Editor → Body → Spalte → Editor.
  let actions = [createAction([])];
  actions = renameAction(actions, actions[0].id, 'Kampf beginnen');
  actions = setActionSteps(actions, actions[0].id, fight().steps);
  const roundTripped = JSON.parse(JSON.stringify(actions));
  assert.deepStrictEqual(roundTripped, actions);
});

// ── ein Setup ohne Aktionen ──────────────────────────────────────────────────

test('a setup without actions behaves exactly as before', () => {
  assert.deepStrictEqual(renameAction([], 'x', 'y'), []);
  assert.deepStrictEqual(deleteAction([], 'x'), []);
  assert.deepStrictEqual(setActionSteps([], 'x', [{ type: 'shuffle' }]), []);
  assert.deepStrictEqual(actionSteps([], 'x'), []);
  // Und auch dann, wenn gar keine Liste da ist: `action_data` kann null sein.
  assert.deepStrictEqual(renameAction(undefined, 'x', 'y'), []);
  assert.deepStrictEqual(deleteAction(null, 'x'), []);
  assert.deepStrictEqual(actionSteps(undefined, 'x'), []);
});
