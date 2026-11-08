// Tests für die Prüfung von `scenarioData.terrainCards` in `validateScenarioData`
// (M29.5, Aufgabe DL).
//
// Die Tabelle `{ "<Assetname>": "<Kartenname>" }` ist von Hand geschrieben; der Tisch
// prüft sie nicht (eine gelöschte Karte darf keinen Kampfaufbau abbrechen, M8.3) -
// diese Funktion ist die Wache. Jede Meldung nennt den Schlüssel.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const { validateScenarioData } = await import('../../shared/scenarioData.js');
const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/auslagen-kurzpartie.json', import.meta.url), 'utf8'));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const TWO_SIDED = 'Wunschbrunnen / Wunschbrunnen (leer)';
const ASSETS = ['Dichter Wald 2', 'Sprengstoff', 'Auslöser', 'Holzzaun', 'Hohler Heuhaufen', TWO_SIDED]
  .map((name, i) => ({ id: `a${i}`, name, type: 'token', image_path: `/uploads/tokens/${i}.png` }));

let n = 0; // eigene Id je Zeile: zwei Exemplare sind zwei Zeilen
const card = (name, image_path) => ({ id: `c${++n}`, name, image_path, category: 'Gelände' });
const CARDS = [
  card('Dichter Wald', '/uploads/cards/wald.png'),
  card('Sprengstoff & Auslöser', '/uploads/cards/sprengstoff.png'),
  card('Hohler Heuhaufen', '/uploads/cards/heu.png'),
  // Zwei Exemplare derselben Karte: dasselbe Bild.
  card('Zwilling', '/uploads/cards/zwilling.png'),
  card('Zwilling', '/uploads/cards/zwilling.png'),
  // Zwei verschiedene Karten desselben Namens.
  card('Mehrdeutig', '/uploads/cards/m1.png'),
  card('Mehrdeutig', '/uploads/cards/m2.png'),
];
const CTX = { assets: ASSETS, grids: [], cards: CARDS };

const check = (terrainCards, ctx = CTX) => validateScenarioData({ terrainCards }, ctx);

/** Genau eine Meldung, und sie nennt jedes dieser Stichworte. */
function onlyProblem(terrainCards, mentions, ctx = CTX) {
  const problems = check(terrainCards, ctx);
  assert.equal(problems.length, 1, `expected exactly one problem, got: ${JSON.stringify(problems)}`);
  for (const m of mentions) assert.ok(problems[0].includes(m), `"${problems[0]}" does not mention ${JSON.stringify(m)}`);
  assert.ok(problems[0].startsWith('terrainCards'), problems[0]);
  return problems[0];
}

// ── 1. ohne Schlüssel, leer ──────────────────────────────────────────────────

test('ohne Schlüssel meldet nichts - auch mit Karten', () => {
  assert.deepEqual(validateScenarioData({}, CTX), []);
  assert.deepEqual(validateScenarioData({ gridLabel: 'x', bosses: {} }, CTX), []);
});

test('eine leere Tabelle ist in Ordnung', () => {
  assert.deepEqual(check({}), []);
});

// ── 2. je Zeile der Tabelle in M29.5 eine Meldung ────────────────────────────

test('ein Wert, der kein Objekt ist (Liste, Text, Zahl, null), ist ein Formfehler', () => {
  for (const value of [['Dichter Wald'], 'Dichter Wald 2', 42, null, true]) {
    onlyProblem(value, ['must be an object']);
  }
});

test('ein leerer Schlüssel hat keinen Assetnamen', () => {
  onlyProblem({ '  ': 'Dichter Wald' }, ['has no asset name']);
});

test('ein Schlüssel mit Schrägstrich meldet das zweiseitige Teil', () => {
  onlyProblem({ [TWO_SIDED]: 'Hohler Heuhaufen' }, [TWO_SIDED, 'two-sided']);
});

test('zwei Schlüssel, die unter norm gleich sind, nennen beide', () => {
  onlyProblem({ 'Dichter Wald 2': 'Dichter Wald', 'dichter wald 2 ': 'Dichter Wald' },
    ['Dichter Wald 2', 'dichter wald 2 ', 'same asset']);
});

test('ein Schlüssel, der kein Asset ist', () => {
  onlyProblem({ 'Gibt es nicht': 'Dichter Wald' }, ['Gibt es nicht', 'not an asset']);
});

test('ein Schlüssel, zu dem es eine gleichnamige Karte gibt, wird nie benutzt', () => {
  onlyProblem({ 'Hohler Heuhaufen': 'Dichter Wald' }, ['Hohler Heuhaufen', 'never used']);
});

test('ein Ziel, das kein nichtleerer Text ist', () => {
  for (const target of ['', '   ', 7, null, ['Dichter Wald'], {}]) {
    onlyProblem({ 'Dichter Wald 2': target }, ['Dichter Wald 2', 'names no card']);
  }
});

test('ein Ziel, das die Bibliothek nicht hat', () => {
  onlyProblem({ 'Dichter Wald 2': 'Dichter Wald 3' }, ['Dichter Wald 2', 'Dichter Wald 3', 'no card with that name']);
  // Ein Ziel mit Schrägstrich wird nie zerlegt und trifft deshalb nichts.
  onlyProblem({ 'Dichter Wald 2': 'Dichter Wald / Wald' }, ['Dichter Wald 2', 'no card with that name']);
});

test('ein Ziel, das mehrere verschiedene Karten trifft', () => {
  onlyProblem({ 'Dichter Wald 2': 'Mehrdeutig' }, ['Dichter Wald 2', 'Mehrdeutig', '2 different cards']);
});

// ── 3. Exemplare derselben Karte sind kein Fehler ────────────────────────────

test('mehrere Karten gleichen Namens mit demselben Bild sind Exemplare', () => {
  assert.deepEqual(check({ 'Dichter Wald 2': 'Zwilling' }), []);
});

test('das Ziel wird wie überall mit norm verglichen', () => {
  assert.deepEqual(check({ 'Dichter Wald 2': '  dichter WALD ' }), []);
});

// ── 4. "kann ich nicht wissen" ───────────────────────────────────────────────

test('ohne Karten schweigt sie über Ziele und über den eigenen Namen', () => {
  for (const cards of [undefined, []]) {
    const ctx = { assets: ASSETS, grids: [], ...(cards ? { cards } : {}) };
    assert.deepEqual(check({ 'Dichter Wald 2': 'Gibt es nicht', 'Hohler Heuhaufen': 'Dichter Wald' }, ctx), []);
  }
});

test('ohne Assets schweigt sie über "kein Asset"', () => {
  assert.deepEqual(check({ 'Gibt es nicht': 'Dichter Wald' }, { cards: CARDS }), []);
  assert.deepEqual(check({ 'Gibt es nicht': 'Dichter Wald' }, { assets: [], cards: CARDS }), []);
});

test('mit leerem Wissen bleiben nur die Formfehler', () => {
  const ctx = { assets: [], grids: [], cards: [] };
  assert.deepEqual(check({ 'Gibt es nicht': 'Gibt es auch nicht' }, ctx), []);
  assert.equal(check([], ctx).length, 1, 'kein Objekt');
  assert.equal(check({ '': 'x' }, ctx).length, 1, 'leer');
  assert.equal(check({ 'A/B': 'x' }, ctx).length, 1, 'Schrägstrich');
  assert.equal(check({ a: 'x', A: 'x' }, ctx).length, 1, 'doppelt');
});

// ── 5. unabhängig von den Bösewichten ────────────────────────────────────────

test('die Tabelle wird auch ohne bosses geprüft', () => {
  const problems = validateScenarioData({ terrainCards: { X: 'Y' } }, CTX);
  assert.ok(problems.length > 0, 'heute kehrt die Funktion davor zurück');
  assert.ok(problems.every(p => p.includes('"X"')), JSON.stringify(problems));
});

test('mit Bösewichten kommen beide Prüfungen zu Wort', () => {
  const data = {
    gridLabel: '',
    bosses: { Patches: { terrain: [{ assetName: 'Holzzaun', cells: ['C7'] }] } },
    terrainCards: { 'Gibt es nicht': 'Dichter Wald' },
  };
  const problems = validateScenarioData(data, CTX);
  assert.ok(problems.some(p => p.startsWith('terrainCards')), JSON.stringify(problems));
  assert.ok(problems.some(p => p.includes('no grid named')), JSON.stringify(problems));
});

// ── 6. jeder Fehler seine Zeile ──────────────────────────────────────────────

test('drei Fehler sind drei Meldungen, keine wird verschluckt', () => {
  const problems = check({
    'Gibt es nicht': 'Dichter Wald',         // kein Asset
    'Dichter Wald 2': 'Dichter Wald 3',      // Ziel fehlt
    Sprengstoff: '',                         // Ziel kein Text
  });
  assert.equal(problems.length, 3, JSON.stringify(problems));
});

// ── 7. die drei Paare aus M29.6, gegen die Daten der Produktion ──────────────

test('M29.6: die drei Paare bestehen die Prüfung gegen Assets und Karten der Fixture', () => {
  const table = { 'Dichter Wald 2': 'Dichter Wald', 'Sprengstoff': 'Sprengstoff & Auslöser', 'Auslöser': 'Sprengstoff & Auslöser' };
  assert.deepEqual(validateScenarioData({ terrainCards: table }, { assets: fx.assets, grids: fx.grids, cards: fx.cards }), []);
});

// ── 8. unverändert ───────────────────────────────────────────────────────────

test('ein Aufruf ohne cards verhält sich wie vor M29', () => {
  const data = { gridLabel: 'Kampffeld', bosses: { Patches: { terrain: [{ assetName: 'Holzzaun', cells: ['C7'] }] } } };
  assert.deepEqual(validateScenarioData(data, { assets: ASSETS, grids: [] }), validateScenarioData(data, { assets: ASSETS, grids: [], cards: [] }));
});
