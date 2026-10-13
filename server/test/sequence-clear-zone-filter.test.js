// M15.1 / AQ1: `clear_zone` mit Kategorienfilter.
//
// Partie 7, N1: „Dorfphase beginnen" hat Grannys *Clown-Kostüm* — einzigartige
// Ausrüstung, mangels sichtbarer Ablagefläche in einer Handzone geparkt — mit
// unter den Dorf-Ereignis-Stapel geschoben. Der zählt seither 81 statt 80, und
// eine Ausrüstungskarte taucht irgendwann als Dorf-Ereignis auf. Still.
//
// Liegenlassen ist richtiger als Wegräumen: wohin eine fremde Karte gehört,
// weiß der Aufbau nicht, und still in einen Nachziehstapel schieben ist von
// drei Möglichkeiten die schlechteste.
//
// **Die Kategorie steht nicht an der Karte.** `getGameState`/`loadGameState`
// führen eine aufgezählte Feldliste ohne `category` — nach dem ersten
// Speichern ist sie weg. Sie wird über `cardId` in `options.cards`
// nachgeschlagen, derselben Bibliothek, die `place_stack` liest; Tisch und Raum
// geben sie gleich mit.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');
const { STEP_TYPES, stepFields, describeStep, validateStep } =
  await import('../../client/src/utils/sequenceSteps.js');

const EREIGNIS = 'Dorf-Ereignisse';
const NACHBARN = 'Dorf-Ereignisse (Üble Nachbarn)';

/** Die Kartenbibliothek: drei Ereignisse, zwei Nachbarn, eine Ausrüstung. */
const CARDS = [
  { id: 'e1', name: 'Ernte', category: EREIGNIS, image_path: '/u/e1.png' },
  { id: 'e2', name: 'Markttag', category: EREIGNIS, image_path: '/u/e2.png' },
  { id: 'e3', name: 'Regen', category: EREIGNIS, image_path: '/u/e3.png' },
  { id: 'n1', name: 'Üble Nachbarn A', category: NACHBARN, image_path: '/u/n1.png' },
  { id: 'n2', name: 'Üble Nachbarn B', category: NACHBARN, image_path: '/u/n2.png' },
  { id: 'k1', name: 'Clown-Kostüm', category: 'Einzigartige Ausrüstung', image_path: '/u/k1.png' },
];

const ZONES = [
  { id: 'zh', label: 'Hand Dörfler 3', x: 100, y: 1000, width: 360, height: 170, accepts: ['card'], capacity: 3, layout: 'row' },
  { id: 'zt', label: 'Ablage', x: 1000, y: 1000, width: 360, height: 170, accepts: ['card'], capacity: 4, layout: 'row' },
];

const FILTER = [EREIGNIS, NACHBARN];
const opts = () => ({ cards: CARDS });

/**
 * Eine Handzone mit einer Ereigniskarte, einer Nachbarnkarte und dem
 * Clown-Kostüm — der Fall aus der Partie. **Ohne** `category` an den
 * Tischkarten: so sehen sie nach dem ersten Speichern aus.
 */
function handState(extra = []) {
  return {
    cards: [
      { tableId: 't1', cardId: 'e1', name: 'Ernte', x: 160, y: 1085, zIndex: 1, faceDown: false },
      { tableId: 't2', cardId: 'n1', name: 'Üble Nachbarn A', x: 280, y: 1085, zIndex: 2, faceDown: false },
      { tableId: 't3', cardId: 'k1', name: 'Clown-Kostüm', x: 400, y: 1085, zIndex: 3, faceDown: false },
      ...extra,
    ],
    stacks: [{ stackId: 's1', label: 'Dorf-Ereignisse', x: 1800, y: 200, cards: [
      { tableId: 'd1', cardId: 'e2', name: 'Markttag', zIndex: 1, faceDown: true },
      { tableId: 'd2', cardId: 'e3', name: 'Regen', zIndex: 2, faceDown: true },
    ] }],
    tokens: [],
    boards: [],
  };
}

const inZone = (state, label) => {
  const z = ZONES.find(x => x.label === label);
  return state.cards.filter(c => c.x >= z.x && c.x <= z.x + z.width && c.y >= z.y && c.y <= z.y + z.height);
};

// ── Der Fall aus der Partie ─────────────────────────────────────────────────

test('AQ1/1+3: mit Filter wandern nur die Ereignisse unter den Stapel, die Ausrüstung bleibt liegen', () => {
  const { state, log } = executeSequenceWithLog(
    handState(),
    [{ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3', targetStackLabel: 'Dorf-Ereignisse', faceDown: true, category: FILTER }],
    ZONES,
    opts(),
  );

  const stack = state.stacks[0].cards;
  assert.equal(stack.length, 4, 'zwei Ereignisse kommen dazu, die Ausrüstung nicht');
  assert.deepEqual(stack.map(c => c.cardId), ['e1', 'n1', 'e2', 'e3'], 'unten heißt unten');
  assert.ok(stack.every(c => c.faceDown));

  const left = inZone(state, 'Hand Dörfler 3');
  assert.deepEqual(left.map(c => c.cardId), ['k1'], 'das Clown-Kostüm liegt noch in der Handzone');
  assert.equal(left[0].inStack, undefined);

  // Abnahme 2: das Protokoll nennt sie, und der Eintrag ist nicht `ok` — die
  // Oberfläche zeigt nur `status !== 'ok'`.
  assert.notEqual(log[0].status, 'ok');
  assert.match(log[0].reason, /Clown-Kostüm/);
});

test('AQ1/1: derselbe Filter mit Zielzone statt Zielstapel', () => {
  const { state, log } = executeSequenceWithLog(
    handState(),
    [{ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3', targetZoneLabel: 'Ablage', category: FILTER }],
    ZONES,
    opts(),
  );
  assert.deepEqual(inZone(state, 'Ablage').map(c => c.cardId), ['e1', 'n1']);
  assert.deepEqual(inZone(state, 'Hand Dörfler 3').map(c => c.cardId), ['k1']);
  assert.match(log[0].reason, /Clown-Kostüm/);
});

test('AQ1/1: derselbe Filter beim Löschen vom Tisch', () => {
  const { state, log } = executeSequenceWithLog(
    handState(),
    [{ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3', category: FILTER }],
    ZONES,
    opts(),
  );
  assert.deepEqual(state.cards.map(c => c.cardId), ['k1']);
  assert.match(log[0].reason, /Clown-Kostüm/);
});

// ── Die Ränder ──────────────────────────────────────────────────────────────

test('AQ1/4: ohne Filter räumt clear_zone wie bisher alles ab', () => {
  const state = executeSequence(
    handState(),
    [{ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3', targetStackLabel: 'Dorf-Ereignisse', faceDown: true }],
    ZONES,
    opts(),
  );
  assert.equal(state.stacks[0].cards.length, 5);
  assert.equal(inZone(state, 'Hand Dörfler 3').length, 0);
});

test('AQ1/4: eine leere Filterliste ist kein Filter', () => {
  for (const category of [[], '', null, undefined]) {
    const state = executeSequence(
      handState(),
      [{ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3', targetStackLabel: 'Dorf-Ereignisse', category }],
      ZONES,
      opts(),
    );
    assert.equal(state.stacks[0].cards.length, 5, `category ${JSON.stringify(category)}`);
  }
});

test('AQ1/5: eine Karte, die in der Bibliothek nicht vorkommt, bleibt mit Filter liegen', () => {
  const { state, log } = executeSequenceWithLog(
    { ...handState(), cards: [{ tableId: 'tx', cardId: 'gibtsnicht', name: 'Fremdling', x: 160, y: 1085, zIndex: 1 }] },
    [{ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3', targetStackLabel: 'Dorf-Ereignisse', category: FILTER }],
    ZONES,
    opts(),
  );
  assert.equal(state.cards.length, 1, 'geraten wird nicht');
  assert.match(log[0].reason, /Fremdling/);
});

test('AQ1/5: ohne Kartenbibliothek räumt der Filter nichts ab und sagt es', () => {
  const { state, log } = executeSequenceWithLog(
    handState(),
    [{ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3', targetStackLabel: 'Dorf-Ereignisse', category: FILTER }],
    ZONES,
    {},
  );
  assert.equal(state.stacks[0].cards.length, 2);
  assert.equal(inZone(state, 'Hand Dörfler 3').length, 3);
  assert.notEqual(log[0].status, 'ok');
});

test('AQ1/6: ein Token in einer gefilterten Zone bleibt liegen und steht im Protokoll', () => {
  const base = handState();
  const start = {
    ...base,
    tokens: [{ id: 'tok1', assetId: 'a1', label: 'Münze', x: 160, y: 1085, width: 40, height: 40 }],
  };
  const { state, log } = executeSequenceWithLog(
    start,
    [{ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3', category: FILTER }],
    ZONES,
    opts(),
  );
  assert.equal(state.tokens.length, 1, 'das Token bleibt');
  assert.match(log[0].reason, /Münze/);
});

test('AQ1: der Filter ist unempfindlich gegen Groß/Klein und Rand-Leerzeichen', () => {
  const state = executeSequence(
    handState(),
    [{ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3', category: ['  dorf-ereignisse  '] }],
    ZONES,
    opts(),
  );
  assert.deepEqual(state.cards.map(c => c.cardId), ['n1', 'k1']);
});

// ── Das Schrittvokabular des Editors ────────────────────────────────────────

test('AQ1/7: sequenceSteps führt `category` an clear_zone', () => {
  const spec = STEP_TYPES.find(t => t.value === 'clear_zone');
  assert.ok(spec.fields.includes('category'), 'sonst kann es niemand einstellen');
  assert.ok(stepFields({ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3' }).includes('category'));
});

test('AQ1/7: die Zeile im Editor nennt den Filter — und nur, wenn es einen gibt', () => {
  const plain = describeStep({ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3', targetStackLabel: 'Dorf-Ereignisse' });
  assert.doesNotMatch(plain, /categor/i);
  const filtered = describeStep({ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3', targetStackLabel: 'Dorf-Ereignisse', category: FILTER });
  assert.match(filtered, /"Dorf-Ereignisse" \+ "Dorf-Ereignisse \(Üble Nachbarn\)"/);
});

test('AQ1/7: eine unbekannte Kategorie wird beim Bearbeiten gemeldet, leer nicht', () => {
  const ctx = { zoneLabels: ['Hand Dörfler 3'], stackLabels: ['Dorf-Ereignisse'], cardCategories: FILTER };
  assert.deepEqual(validateStep({ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3' }, ctx), []);
  assert.deepEqual(validateStep({ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3', category: FILTER }, ctx), []);
  assert.deepEqual(
    validateStep({ type: 'clear_zone', zoneLabel: 'Hand Dörfler 3', category: ['Dorf-Ereignisse', 'Tippfehler'] }, ctx),
    ['card category "Tippfehler" is empty or unknown'],
  );
});
