// M2.11 – "jeder Objekttyp lässt sich löschen" als geprüfte Tatsache.
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Wie escape-layers.test.js: der Client hat keine Testinfrastruktur, also lebt
// der entscheidbare Teil – welche Typen es gibt und ob jeder einen Löscher hat –
// in einem reinen Modul und wird von hier geprüft. Mit dem Kreuz ist das
// Kontextmenü der einzige Löschweg; ein Typ ohne Eintrag wäre unlöschbar.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { TABLE_OBJECT_TYPES, objectLists, objectDeleters } =
  await import('../../client/src/utils/objectTypes.js');

test('TABLE_OBJECT_TYPES hat keine Duplikate und nur nicht-leere Strings', () => {
  for (const t of TABLE_OBJECT_TYPES) {
    assert.equal(typeof t, 'string', `${String(t)} ist kein String`);
    assert.ok(t.length > 0, 'leerer Typname');
  }
  assert.equal(new Set(TABLE_OBJECT_TYPES).size, TABLE_OBJECT_TYPES.length);
});

test('TABLE_OBJECT_TYPES ist genau das, was der Tisch zeichnet', () => {
  // Absichtlich als Literal: wer einen Renderer in GameTable.jsx ergänzt, ohne
  // den Typ hier einzutragen, lässt diesen Test scheitern statt ein
  // unlöschbares Objekt auszuliefern.
  assert.deepEqual([...TABLE_OBJECT_TYPES].sort(), [
    'board', 'counter', 'customDie', 'die', 'hitDie', 'note', 'textField', 'token',
  ]);
});

test('objectLists deckt jeden Typ ab und reicht die passende Liste durch', () => {
  const state = {
    counters: ['c'], dice: ['d'], customDice: ['cd'], hitDice: ['hd'],
    notes: ['n'], tokens: ['t'], boards: ['b'], textFields: ['tf'],
  };
  const lists = objectLists(state);
  assert.deepEqual(Object.keys(lists).sort(), [...TABLE_OBJECT_TYPES].sort());
  for (const t of TABLE_OBJECT_TYPES) {
    assert.ok(Array.isArray(lists[t]), `${t} hat keine Liste`);
  }
  assert.equal(lists.customDie, state.customDice, 'customDie zeigt auf customDice');
  assert.equal(lists.textField, state.textFields, 'textField zeigt auf textFields');
});

test('objectDeleters: kein Typ ohne Löscher, und jeder trifft seinen eigenen', () => {
  const called = [];
  const fns = {};
  for (const name of [
    'deleteCounter', 'deleteDie', 'deleteCustomDie', 'deleteHitDie',
    'deleteNote', 'deleteToken', 'deleteBoard', 'deleteTextField',
  ]) {
    fns[name] = (id) => called.push([name, id]);
  }
  const deleters = objectDeleters(fns);
  assert.deepEqual(Object.keys(deleters).sort(), [...TABLE_OBJECT_TYPES].sort());

  const seen = new Set();
  for (const t of TABLE_OBJECT_TYPES) {
    assert.equal(typeof deleters[t], 'function', `${t} hat keinen Löscher`);
    deleters[t](`${t}-1`);
    const [name, id] = called.at(-1);
    assert.equal(id, `${t}-1`, `${t} bekommt seine id`);
    assert.ok(!seen.has(name), `${name} ist zweimal verdrahtet`);
    seen.add(name);
  }
  assert.equal(called.length, TABLE_OBJECT_TYPES.length);
});
