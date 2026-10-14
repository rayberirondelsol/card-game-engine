// BF / Spec M17.4 + M17.5 — `clear_table`: räum das vom Tisch, egal wo es liegt.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Zwei Befunde der neunten Solopartie, ein Loch im Vokabular:
//
// L3: *Welpenblick* und *Fährte aufnehmen* lagen regelgemäß offen vor ihren
// Zielen. „Dorfphase beginnen" räumt Verhaltensdeck und Ablage ab, lässt diese
// beiden aber liegen — §7.6 verlangt, dass das Bösewichtmaterial verschwindet.
// Nachgemessen: die vier Karten liegen bei y 1440–1760, die Ausrüstungszonen
// beginnen erst bei y 1808, die Handzonen enden bei 1310. **Keine Zone deckt
// sie**, `clear_zone` erreicht sie also nicht.
//
// L2: die drei ausgeschalteten Dörflerfiguren standen beiseite (`offGrid:
// true`, nicht auf dem Raster). `clear_grid` fragt `cellAt` und nimmt nur, was
// auf dem Raster steht — die beiseitegestellten überleben die Dorfphase als
// einzige. Ein `pool: "Dörfler"` schiede aus: die Asset-Kategorie enthält auch
// die Leistenplättchen (`Henlo` neben `Henlo Bulwark`).
//
// Begründung in `docs/tasks-partie9.md`, Aufgaben BF und BG.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');
const { STEP_TYPES, stepFields, describeStep, validateStep, defaultStep } =
  await import('../../client/src/utils/sequenceSteps.js');

const AKTION = 'Aktionen: Deputy Waggums';
const HELDENTAT = 'Heldentaten';

const CARDS = [
  { id: 'a1', name: 'WELPENBLICK', category: AKTION, image_path: '/u/a1.png' },
  { id: 'a2', name: 'FÄHRTE AUFNEHMEN', category: AKTION, image_path: '/u/a2.png' },
  { id: 'h1', name: 'FURCHTLOS', category: HELDENTAT, image_path: '/u/h1.png' },
];

const ASSETS = [
  { id: 'as1', name: 'Henlo Bulwark', category: 'Dörfler', image_path: '/u/f1.png' },
  { id: 'as2', name: 'Henlo', category: 'Dörfler', image_path: '/u/p1.png' },
];

// Eine Zone, die mit keiner der Karten etwas zu tun hat: sie liegt woanders.
const ZONES = [
  { id: 'zh', label: 'Hand Dörfler 1', x: 150, y: 1140, width: 360, height: 170, accepts: ['card'], capacity: 3, layout: 'row' },
];

const opts = () => ({ cards: CARDS, assets: ASSETS });

/** Der Tisch, wie ihn die neunte Partie hinterlassen hat: nichts in einer Zone. */
function tableState() {
  return {
    cards: [
      { tableId: 't1', cardId: 'a1', name: 'WELPENBLICK', x: 1040, y: 1440, zIndex: 1, faceDown: false },
      { tableId: 't2', cardId: 'a2', name: 'FÄHRTE AUFNEHMEN', x: 0, y: 1760, zIndex: 2, faceDown: false },
      { tableId: 't3', cardId: 'h1', name: 'FURCHTLOS', x: 0, y: 1520, zIndex: 3, faceDown: false },
    ],
    stacks: [{ stackId: 's1', label: 'Verhaltensdeck', x: 1800, y: 200, cards: [
      { tableId: 'd1', cardId: 'a1', name: 'WELPENBLICK', zIndex: 1, faceDown: true },
    ] }],
    tokens: [
      { id: 'k1', assetId: 'as1', label: 'Henlo Bulwark', x: 1915, y: 1232, width: 50, height: 50, offGrid: true },
      { id: 'k2', assetId: 'as2', label: 'Henlo', x: 180, y: 350, width: 46, height: 46 },
    ],
    boards: [],
  };
}

const ids = (state) => state.cards.map(c => c.cardId);
const toks = (state) => state.tokens.map(t => t.label);

// ── Was der Schritt tut ─────────────────────────────────────────────────────

test('BF Abnahme 1: die Kategorie räumt lose Karten ab, die in keiner Zone liegen', () => {
  const state = executeSequence(tableState(), [{ type: 'clear_table', category: [AKTION] }], ZONES, opts());
  assert.deepEqual(ids(state), ['h1'], 'die erfüllte Heldentat gehört dem Dörfler und bleibt');
});

test('BF: Karten in einem Stapel sind nicht gemeint', () => {
  const state = executeSequence(tableState(), [{ type: 'clear_table', category: [AKTION] }], ZONES, opts());
  assert.equal(state.stacks[0].cards.length, 1, 'der Stapel bleibt, wie er ist');
});

test('BF Abnahme 2: der Name räumt genau dieses Token ab, egal wo es liegt', () => {
  const state = executeSequence(tableState(), [{ type: 'clear_table', assetName: 'Henlo Bulwark' }], ZONES, opts());
  assert.deepEqual(toks(state), ['Henlo'], 'das Leistenplättchen heißt anders und bleibt stehen');
});

test('BF: Kategorie und Name zusammen sind eine Vereinigung', () => {
  const state = executeSequence(
    tableState(),
    [{ type: 'clear_table', category: [AKTION], assetName: 'Henlo Bulwark' }],
    ZONES, opts(),
  );
  assert.deepEqual(ids(state), ['h1']);
  assert.deepEqual(toks(state), ['Henlo']);
});

test('BF Abnahme 3: gesperrt heißt gesperrt – mit Namen im Protokoll', () => {
  const start = tableState();
  start.cards[0].locked = true;
  const { state, log } = executeSequenceWithLog(start, [{ type: 'clear_table', category: [AKTION] }], ZONES, opts());
  assert.deepEqual(ids(state), ['a1', 'h1']);
  assert.notEqual(log[0].status, 'ok');
  assert.match(log[0].reason, /WELPENBLICK/);
});

test('BF Abnahme 4: ohne Kategorie und ohne Namen wird nichts geräumt', () => {
  const { state, log } = executeSequenceWithLog(tableState(), [{ type: 'clear_table' }], ZONES, opts());
  assert.deepEqual(ids(state), ['a1', 'a2', 'h1']);
  assert.deepEqual(toks(state), ['Henlo Bulwark', 'Henlo']);
  assert.equal(log[0].status, 'skipped');
});

test('BF: nichts zu räumen ist gelungen, nicht gescheitert', () => {
  const { log } = executeSequenceWithLog(
    tableState(), [{ type: 'clear_table', category: ['Aktionen: Virginia Fitz'] }], ZONES, opts(),
  );
  assert.equal(log[0].status, 'ok');
});

test('BF: ein unbekannter Name räumt nichts und sagt es', () => {
  const { state, log } = executeSequenceWithLog(
    tableState(), [{ type: 'clear_table', assetName: 'Gibts Nicht' }], ZONES, opts(),
  );
  assert.deepEqual(toks(state), ['Henlo Bulwark', 'Henlo']);
  assert.equal(log[0].status, 'ok');
});

// ── Das Vokabular im Editor ─────────────────────────────────────────────────

test('BF Abnahme 5: der Schritt steht im Vokabular, mit beiden Feldern', () => {
  const spec = STEP_TYPES.find(t => t.value === 'clear_table');
  assert.ok(spec, 'clear_table fehlt in STEP_TYPES');
  // BI/M19.3 hat zwei Felder ergaenzt; `faceDown` zeigt sich erst mit Zielstapel.
  assert.deepEqual(stepFields({ type: 'clear_table' }), ['category', 'assetName', 'targetStackLabel']);
  assert.deepEqual(defaultStep('clear_table'), { type: 'clear_table', category: [], assetName: '', targetStackLabel: '' });
});

test('BF Abnahme 5: validateStep meldet den fehlenden Filter', () => {
  const ctx = { cardCategories: [AKTION, HELDENTAT], assetNames: ['Henlo Bulwark', 'Henlo'] };
  assert.deepEqual(validateStep({ type: 'clear_table', category: [AKTION] }, ctx), []);
  assert.deepEqual(validateStep({ type: 'clear_table', assetName: 'Henlo Bulwark' }, ctx), []);
  assert.match(validateStep({ type: 'clear_table' }, ctx).join(' '), /nothing named/i);
  // Ein Tippfehler wird weiterhin gemeldet – an derselben Stelle wie überall.
  assert.match(validateStep({ type: 'clear_table', category: ['Aktionen: Tippfehler'] }, ctx).join(' '), /empty or unknown/);
  assert.match(validateStep({ type: 'clear_table', assetName: 'Gibts Nicht' }, ctx).join(' '), /not found/);
});

test('BF Abnahme 5: die Zeile nennt, was geräumt wird', () => {
  assert.match(describeStep({ type: 'clear_table', category: [AKTION] }), /"Aktionen: Deputy Waggums"/);
  assert.match(describeStep({ type: 'clear_table', assetName: 'Henlo Bulwark' }), /"Henlo Bulwark"/);
  assert.match(describeStep({ type: 'clear_table' }), /\(nothing\)/);
});

// ── Die Verloren-Marke ──────────────────────────────────────────────────────

test('BF Abnahme 6: place_asset löscht die Verloren-Marke eines beiseitegestellten Stücks', () => {
  // M10.10: der gestrichelte Rand sagt „hat seinen Platz verloren". Wer wieder
  // auf einem Feld steht, hat ihn nicht mehr – `handleObjDragEnd` macht das
  // beim Ziehen seit jeher richtig, `place_asset` ließ ihn stehen.
  const grids = [{ id: 'g1', label: 'Spielfeld', type: 'square', x: 0, y: 0, cols: 4, rows: 4, cellWidth: 80, cellHeight: 80 }];
  const state = executeSequence(
    tableState(),
    [{ type: 'place_asset', assetName: 'Henlo Bulwark', gridLabel: 'Spielfeld', cell: 'B2' }],
    ZONES,
    { ...opts(), grids },
  );
  const fig = state.tokens.find(t => t.label === 'Henlo Bulwark');
  assert.equal(fig.offGrid, false);
  assert.equal(fig.cell, 'B2');
});

// ── BI / Spec M19.3: `clear_table` darf zurücklegen, nicht nur löschen ───────
//
// Partie 10: eine Dorf-Ereigniskarte, die während des Kampfes ihre Handzone
// verlassen hatte, lag nach „Dorfphase beginnen" quer über der neuen
// Ladenauslage, und der Ereignisstapel stand auf 79 statt 80. Kein Schritt hat
// sie erfasst: die drei Schritte, die Ereigniskarten zurücklegen, sehen nur die
// drei Handzonen (`clear_zone`), und der Schritt, der überall sucht, konnte nur
// löschen. Begründung in `docs/tasks-partie10.md`, Aufgabe BI.

const EREIGNIS = 'Dorf-Ereignisse';

const CARDS_BI = [
  ...CARDS,
  { id: 'e1', name: 'SCHWITZIGE HÄNDE', category: EREIGNIS, image_path: '/u/e1.png' },
];

/** Die Karte liegt lose irgendwo, der Stapel, in den sie gehört, steht daneben. */
function looseEvent() {
  return {
    cards: [{ tableId: 'tx', cardId: 'e1', name: 'SCHWITZIGE HÄNDE', x: 999, y: 42, zIndex: 7, faceDown: false }],
    stacks: [{ stackId: 's2', label: EREIGNIS, x: 100, y: 100, cards: [
      { tableId: 'q1', cardId: 'e1', name: 'A', zIndex: 1, faceDown: true },
      { tableId: 'q2', cardId: 'e1', name: 'B', zIndex: 2, faceDown: true },
    ] }],
    tokens: [],
    boards: [],
  };
}

const biOpts = () => ({ cards: CARDS_BI, assets: ASSETS });

test('BI Abnahme 1: die lose Ereigniskarte geht verdeckt unter ihren Stapel', () => {
  const state = executeSequence(
    looseEvent(),
    [{ type: 'clear_table', category: [EREIGNIS], targetStackLabel: EREIGNIS, faceDown: true }],
    [],
    biOpts(),
  );
  assert.deepEqual(state.cards, [], 'nichts bleibt lose liegen');
  const stack = state.stacks.find(s => s.label === EREIGNIS);
  assert.equal(stack.cards.length, 3, '2 + 1');
  // Unten heißt unten: die Zurückgelegte trägt zIndex 1, die vorhandenen rücken auf.
  assert.equal(stack.cards[0].tableId, 'tx');
  assert.deepEqual(stack.cards.map(c => c.zIndex), [1, 2, 3]);
  assert.equal(stack.cards[0].faceDown, true);
  assert.equal(stack.cards[0].inStack, 's2');
  assert.equal(stack.cards[0].x, 100);
});

test('BI Abnahme 1: ohne Ziel löscht clear_table wie bisher', () => {
  const state = executeSequence(
    looseEvent(),
    [{ type: 'clear_table', category: [EREIGNIS] }],
    [],
    biOpts(),
  );
  assert.deepEqual(state.cards, []);
  assert.equal(state.stacks.find(s => s.label === EREIGNIS).cards.length, 2, 'nichts kommt zurück');
});

test('BI Abnahme 1: ohne faceDown behält die Karte ihre Seite', () => {
  const state = executeSequence(
    looseEvent(),
    [{ type: 'clear_table', category: [EREIGNIS], targetStackLabel: EREIGNIS }],
    [],
    biOpts(),
  );
  assert.equal(state.stacks[0].cards[0].faceDown, false);
});

test('BI Abnahme 1: ein Asset kommt nicht in einen Kartenstapel und steht im Protokoll', () => {
  const start = looseEvent();
  start.tokens = [{ id: 'k1', assetId: 'as1', label: 'Henlo Bulwark', x: 10, y: 10, width: 50, height: 50 }];
  const { state, log } = executeSequenceWithLog(
    start,
    [{ type: 'clear_table', assetName: 'Henlo Bulwark', targetStackLabel: EREIGNIS }],
    [],
    biOpts(),
  );
  assert.equal(state.tokens.length, 1, 'die Figur bleibt liegen');
  assert.match(log[0].reason || '', /only cards go back into a stack/);
  assert.match(log[0].reason || '', /Henlo Bulwark/);
});

test('BI Abnahme 1: ein unbekannter Zielstapel wird übersprungen, nichts geht verloren', () => {
  const { state, log } = executeSequenceWithLog(
    looseEvent(),
    [{ type: 'clear_table', category: [EREIGNIS], targetStackLabel: 'Gibts Nicht' }],
    [],
    biOpts(),
  );
  assert.equal(state.cards.length, 1, 'die Karte liegt noch da');
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason || '', /stack "Gibts Nicht" not found/);
});

test('BI Abnahme 3: der Schritt trägt die beiden neuen Felder im Vokabular', () => {
  // Ohne Zielstapel waere die Seite eine Einstellung ohne Wirkung - dieselbe
  // Regel wie bei `clear_zone`.
  assert.deepEqual(stepFields({ type: 'clear_table' }), ['category', 'assetName', 'targetStackLabel']);
  assert.deepEqual(
    stepFields({ type: 'clear_table', targetStackLabel: EREIGNIS }),
    ['category', 'assetName', 'targetStackLabel', 'faceDown'],
  );
  assert.match(
    describeStep({ type: 'clear_table', category: [EREIGNIS] }),
    /off the table, wherever it lies/,
  );
  assert.match(
    describeStep({ type: 'clear_table', category: [EREIGNIS], targetStackLabel: EREIGNIS, faceDown: true }),
    /back under stack "Dorf-Ereignisse", face down/,
  );
});
