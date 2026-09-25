// M2.10 – Escape schließt die oberste Schicht (Spec-Abschnitt "M2.10").
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Same reason as menu-placement.test.js: the client has no test setup, so the
// decidable part – welche von dreizehn Schichten Escape trifft – lives in a pure
// module and is tested from here. Was in GameTable.jsx bleibt, ist nur
// "Zustand einsammeln, das hier fragen, die eine Schicht schließen".

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { ESCAPE_LAYERS, escapeTarget } = await import('../../client/src/utils/escapeLayers.js');

test('nothing open: Escape hits nothing', () => {
  assert.equal(escapeTarget({}), null);
  assert.equal(escapeTarget({ contextMenu: null, saveModal: false }), null);
});

test('exactly one open layer is the target, whichever it is', () => {
  for (const name of ESCAPE_LAYERS) {
    assert.equal(escapeTarget({ [name]: true }), name, `${name} alone`);
  }
});

test('several open: the first in ESCAPE_LAYERS order wins, not the first key', () => {
  // Keys deliberately in the wrong order – if the picker iterated the object,
  // it would answer 'cardDrawer' here.
  const open = { cardDrawer: true, bgPicker: true, saveModal: true, contextMenu: true };
  assert.equal(escapeTarget(open), 'contextMenu');

  // Same trick one rung lower: context menu closed, drawer listed first.
  assert.equal(escapeTarget({ cardDrawer: true, shortcuts: true, diceModal: true }), 'diceModal');

  // And the editor beats the flat surfaces below it.
  assert.equal(escapeTarget({ bgPicker: true, shortcuts: true, editingTextField: true }), 'editingTextField');
});

test('an unknown key in `open` is ignored', () => {
  assert.equal(escapeTarget({ legend: true, toolbar: true, sequenceEditor: true, setupMode: true }), null);
  assert.equal(escapeTarget({ legend: true, bgPicker: true }), 'bgPicker');
});

test('a known layer that is falsy is not picked', () => {
  assert.equal(escapeTarget({ contextMenu: null, splitModal: undefined, saveModal: false, noteModal: true }), 'noteModal');
  assert.equal(escapeTarget({ contextMenu: 0, cardDrawer: '' }), null);
});

test('the list itself is sane: no duplicates, all non-empty strings', () => {
  assert.equal(new Set(ESCAPE_LAYERS).size, ESCAPE_LAYERS.length, 'duplicate layer name');
  for (const name of ESCAPE_LAYERS) {
    assert.equal(typeof name, 'string');
    assert.ok(name.length > 0, 'empty layer name');
  }
});

test('the exact order from the spec', () => {
  assert.deepEqual(ESCAPE_LAYERS, [
    'cardPreview',
    'contextMenu',
    'splitModal',
    'saveModal',
    'setupSaveModal',
    'viewSaveModal',
    'counterModal',
    'diceModal',
    'noteModal',
    'tokenModal',
    'textFieldModal',
    'editingTextField',
    'shortcuts',
    'bgPicker',
    'cardDrawer',
    'viewsMenu',
  ]);
});

// Regression guard für die "nicht angefasst"-Entscheidung der Spec: diese vier
// sind Flächen, auf denen man arbeitet, keine Schichten. Wer sie hinzufügt,
// bricht diesen Test und muss erst die Spec ändern.
test('legend, toolbar, sequence editor and setup mode stay out of the list', () => {
  for (const name of ['legend', 'toolbar', 'sequenceEditor', 'setupMode']) {
    assert.ok(!ESCAPE_LAYERS.includes(name), `${name} must not be an Escape layer`);
  }
});

// ── M11.7: zwei Schichten, die Escape nicht kannte ───────────────────────────

test('die Vergrößerung und das Views-Menü stehen in der Liste', () => {
  assert.ok(ESCAPE_LAYERS.includes('cardPreview'), 'Escape schließt die Vergrößerung nicht');
  assert.ok(ESCAPE_LAYERS.includes('viewsMenu'), 'Escape schließt das Views-Menü nicht');
});

test('die Reihenfolge der vorhandenen dreizehn bleibt unverändert (Abnahme 3)', () => {
  const before = [
    'contextMenu', 'splitModal', 'saveModal', 'setupSaveModal', 'counterModal',
    'diceModal', 'noteModal', 'tokenModal', 'textFieldModal', 'editingTextField',
    'shortcuts', 'bgPicker', 'cardDrawer',
  ];
  assert.deepEqual(ESCAPE_LAYERS.filter(n => before.includes(n)), before);
});

test('die Vergrößerung liegt über dem Kontextmenü – sie deckt den ganzen Bildschirm', () => {
  assert.equal(escapeTarget({ cardPreview: true, contextMenu: true }), 'cardPreview');
  // Das Views-Menü ist eine Klappliste an der Werkzeugleiste, also unter allem,
  // was eine Entscheidung verlangt.
  assert.equal(escapeTarget({ viewsMenu: true, cardDrawer: true }), 'cardDrawer');
  assert.equal(escapeTarget({ viewsMenu: true }), 'viewsMenu');
});
