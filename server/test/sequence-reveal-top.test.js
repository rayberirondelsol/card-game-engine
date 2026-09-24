// M8.9 — Die oberste Karte eines Stapels offen aufdecken.
//
// Vertrag: docs/spec-setup-system.md, Abschnitt M8.9; Aufgaben D1/D2 in
// docs/tasks-aufdecken.md.
//
// Der Schritt dazu ist **kein neuer**: `deal_to_zone` mit `count: 1` und
// `faceDown: false` nimmt genau die oberste Karte, legt sie offen in eine Zone
// und laesst den Rest im Stapel. Diese Datei haelt das fest, damit niemand ihn
// ein zweites Mal baut — und prueft die eine Stelle, an der er es bisher
// **nicht** tat: die Reihenfolge auf dem Ablagestapel.
//
// Run with: npm test  (node --test)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');
const { stepFields } = await import('../../client/src/utils/sequenceSteps.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

// Die `Ablage` liegt auf der DISCARD-Buchseite des Zusatz-Bretts: `layout:
// "stack"`, nimmt nur Karten, **keine** Kapazitaet.
const ABLAGE = { label: 'Ablage', x: 1000, y: 0, width: 200, height: 280, layout: 'stack', accepts: ['card'] };

/**
 * Ein verdecktes Verhaltensdeck aus n Karten. `cards` ist von unten nach oben
 * sortiert: die **oberste** Karte steht am Ende und traegt den hoechsten
 * zIndex.
 */
function deck(n) {
  return {
    stackId: 's1',
    label: 'Verhaltensdeck',
    x: 0,
    y: 0,
    cards: Array.from({ length: n }, (_, i) => ({
      tableId: `t${i + 1}`,
      cardId: `c${i + 1}`,
      name: `K${i + 1}`,
      image_path: `/uploads/cards/k${i + 1}.png`,
      width: 200,
      height: 280,
      faceDown: true,
      rotation: 0,
      zIndex: i + 1,
    })),
  };
}

const table = (stack) => ({ cards: [], stacks: stack ? [stack] : [], tokens: [], boards: [] });

const revealStep = {
  type: 'deal_to_zone', stackLabel: 'Verhaltensdeck', count: 1, targetZoneLabel: 'Ablage', faceDown: false,
};

/** Einen Griff ausfuehren. */
const reveal = (state) => executeSequenceWithLog(state, [revealStep], [ABLAGE]);

// ── Abnahme 1: ein Griff, offen, auf der Ablage ──────────────────────────────

test('M8.9/1: ein Griff legt die oberste Karte offen auf die Ablage, nicht auf eine Hand', () => {
  const { state, log } = reveal(table(deck(3)));

  assert.equal(log[0].status, 'ok');
  assert.equal(state.cards.length, 1, 'genau eine Karte liegt am Tisch');
  assert.equal(state.cards[0].name, 'K3', 'die **oberste** Karte, nicht die unterste');
  assert.equal(state.cards[0].faceDown, false, 'offen');
  assert.equal(state.cards[0].face_up, true);
  assert.equal(state.cards[0].x, 1100, 'auf der Mitte der Ablage');
  assert.equal(state.cards[0].y, 140);
  assert.equal(state.cards[0].inStack, undefined, 'sie hat den Stapel verlassen');
  assert.deepEqual(state.stacks[0].cards.map(c => c.name), ['K1', 'K2'], 'der Rest bleibt im Stapel');
  assert.equal(state.hand, undefined, 'nichts landet auf einer Hand');
});

// ── Abnahme 2: die vorige bleibt darunter liegen ─────────────────────────────

test('M8.9/2: der naechste Griff legt die folgende Karte **darueber**, nicht darunter', () => {
  const first = reveal(table(deck(3))).state;
  const { state } = reveal(first);

  assert.deepEqual(state.cards.map(c => c.name), ['K3', 'K2'], 'beide liegen da, keine ist verschwunden');
  const [k3, k2] = state.cards;
  assert.equal(k3.x, k2.x, 'sie liegen uebereinander — das ist ein Ablagestapel');
  assert.equal(k3.y, k2.y);
  assert.ok(k2.zIndex > k3.zIndex,
    `die zuletzt aufgedeckte Karte liegt obenauf (K2 ${k2.zIndex} > K3 ${k3.zIndex})`);
});

test('M8.9/2: auch die dritte Karte liegt ueber der zweiten', () => {
  let state = table(deck(3));
  for (let i = 0; i < 3; i++) state = reveal(state).state;

  assert.deepEqual(state.cards.map(c => c.name), ['K3', 'K2', 'K1']);
  const z = state.cards.map(c => c.zIndex);
  assert.ok(z[0] < z[1] && z[1] < z[2], `aufsteigend in der Reihenfolge des Aufdeckens, war ${z.join(',')}`);
});

test('M8.9/2: die aufgedeckte Karte liegt auch ueber dem, was schon am Tisch lag', () => {
  const state = table(deck(2));
  state.cards.push({ tableId: 'alt', cardId: 'alt', name: 'Alt', x: 1100, y: 140, zIndex: 99, faceDown: false });

  const out = reveal(state).state;
  const dealt = out.cards.find(c => c.name === 'K2');
  assert.ok(dealt.zIndex > 99, `ueber der schon liegenden Karte, war ${dealt.zIndex}`);
});

// ── Abnahme 3: leerer Stapel ─────────────────────────────────────────────────

test('M8.9/3: bei leerem Stapel geschieht nichts, und es steht im Protokoll', () => {
  const { state, log } = reveal(table(null));

  assert.equal(state.cards.length, 0, 'nichts gelegt');
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Verhaltensdeck/);
});

test('M8.9/3: der letzte Griff raeumt den leeren Stapel ab, der naechste meldet ihn', () => {
  const { state } = reveal(table(deck(1)));
  assert.equal(state.stacks.length, 0, 'ein leerer Stapel bleibt nicht liegen');

  const { log } = reveal(state);
  assert.equal(log[0].status, 'skipped');
});

// ── Abnahme 4: der Schritt steht im Editor ───────────────────────────────────

test('M8.9/4: der Schritt steht im Editor — es ist `deal_to_zone`, kein zweiter daneben', () => {
  // `fill` seit M11.2 dazu: die zweite Lesart von `count` (auf n auffüllen
  // statt n austeilen). Für das Aufdecken selbst ändert sich nichts — es
  // bleibt derselbe eine Schritt, kein zweiter daneben.
  assert.deepEqual(stepFields('deal_to_zone'), ['stackLabel', 'count', 'fill', 'targetZoneLabel', 'faceDown'],
    'Stapel, Anzahl, Zielzone und Seite — mehr braucht das Aufdecken nicht');
});
