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

const { TABLE_OBJECT_TYPES, objectLists, objectDeleters, objectSetters, moveObject } =
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

// ── M11.3: ziehen und sperren ────────────────────────────────────────────────
//
// Der Befund der vierten Solopartie sagt, ein Würfel lasse sich nicht ziehen.
// Der Zug ist verdrahtet (`onMouseDown`/`onTouchStart` an allen drei
// Würfelsorten), aber *wohin* er schreibt, stand in zwei parallelen if/else-
// Ketten in GameTable.jsx – eine fürs Ziehen, eine fürs Sperren. Ein Typ, der
// in einer davon fehlt, ist unbeweglich bzw. unsperrbar und sieht im JSX
// trotzdem fertig verdrahtet aus: genau das Muster aus
// docs/audit-dead-controls.md. Beide Ketten sind jetzt dieselbe Tabelle.

test('objectSetters: jeder Typ hat einen Schreiber, und jeder trifft seinen eigenen', () => {
  const fns = {};
  const called = [];
  for (const name of [
    'setCounters', 'setDice', 'setCustomDice', 'setHitDice',
    'setNotes', 'setTokens', 'setBoards', 'setTextFields',
  ]) {
    fns[name] = (updater) => called.push([name, updater]);
  }
  const setters = objectSetters(fns);
  assert.deepEqual(Object.keys(setters).sort(), [...TABLE_OBJECT_TYPES].sort());

  const seen = new Set();
  for (const t of TABLE_OBJECT_TYPES) {
    assert.equal(typeof setters[t], 'function', `${t} hat keinen Schreiber`);
    setters[t](x => x);
    const [name] = called.at(-1);
    assert.ok(!seen.has(name), `${name} ist zweimal verdrahtet`);
    seen.add(name);
  }
  assert.equal(called.length, TABLE_OBJECT_TYPES.length);
});

test('moveObject schreibt x/y an das gemeinte Objekt und lässt die anderen in Ruhe', () => {
  const before = [{ id: 'a', x: 1, y: 2 }, { id: 'b', x: 3, y: 4 }];
  const after = moveObject(before, 'b', 9, 8);
  assert.deepEqual(after[1], { id: 'b', x: 9, y: 8 });
  assert.equal(after[0], before[0], 'das unbeteiligte Objekt bleibt dasselbe');
  assert.notEqual(after[1], before[1], 'das bewegte ist eine neue Kopie');
});

test('moveObject löst ein Token von seiner Karte – und nur ein Token', () => {
  // M2.9: ein an eine Karte geheftetes Token, das gezogen wird, hängt danach
  // an nichts mehr. Für einen Würfel gibt es `attachedTo` nicht, und ein
  // hinzuerfundenes `attachedTo: null` stünde im gespeicherten Spielstand.
  const token = moveObject([{ id: 't', x: 0, y: 0, attachedTo: 'card-1' }], 't', 5, 6)[0];
  assert.equal(token.attachedTo, null);
  const die = moveObject([{ id: 'd', x: 0, y: 0 }], 'd', 5, 6)[0];
  assert.ok(!('attachedTo' in die), 'ein Würfel bekommt kein attachedTo');
});
