// DA / Spec M27.5 — `place_card { category }`, damit dem Sheriff die Karte nicht fehlt.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Befund aus der Erhebung der neun Bösewichte: `TRILLERPFEIFE` gibt es in der
// Bibliothek **zweimal**, mit verschiedenen Bildern und in verschiedenen
// Kategorien (`Einzigartige Ausrüstung` und `Toller Trödel: Nachschub (gesperrt,
// Nr. 31-162)`). `findCardByName` entscheidet richtig - verschiedene Bilder
// heißen „mehrdeutig", und es wird gemeldet statt gegriffen. Nur legt dann der
// Schritt `place_card "$SHERIFF"` im Endkampf gegen Handsy **nichts**, und
// `executeSequence` wirft nie: am Tisch fehlt die Karte stumm.
//
// Die Lösung ist ein **optionales Feld** und eine Einschränkung der Kartenliste
// **vor** der Suche. `findCardByName` bleibt, wie es ist; es wird auch kein
// Vorrang gebaut („nimm die aus der Einzigartigen Ausrüstung"), denn der wäre
// beim nächsten Namensgleichstand in der anderen Richtung falsch.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequenceWithLog, cardsInCategories } = await import('../../shared/sequenceExecutor.js');
const { stepFields, describeStep, validateStep, defaultStep } = await import('../../client/src/utils/sequenceSteps.js');

const UNIQUE = 'Einzigartige Ausrüstung';
const UNIQUE_NN = 'Einzigartige Ausrüstung (Neue Nachbarn)';
const LOCKED = 'Toller Trödel: Nachschub (gesperrt, Nr. 31-162)';

const card = (id, name, category, image = `/uploads/${id}.png`) => ({ id, name, category, image_path: image, width: 744, height: 744 });
const CARDS = [
  card('tp-unique', 'TRILLERPFEIFE', UNIQUE),
  card('tp-locked', 'TRILLERPFEIFE', LOCKED),
  card('nn-1', 'ANGELHAKENANZUG', UNIQUE_NN),
  card('nur-gesperrt', 'ALTER HUT', LOCKED),
];

const ZONES = [{ id: 'z', label: 'Terrain-Auslage', x: 100, y: 100, width: 600, height: 100, accepts: ['card'], capacity: null, layout: 'row' }];
const run = (steps, over = {}) => executeSequenceWithLog({}, steps, ZONES, { cards: CARDS, ...over });
const place = (cardName, category) => ({ type: 'place_card', cardName, targetZoneLabel: 'Terrain-Auslage', ...(category === undefined ? {} : { category }) });

// ── 1. Ohne `category` bleibt alles, wie es ist ─────────────────────────────

test('DA 1: ohne `category` – zwei Bilder unter einem Namen sind weiter mehrdeutig, es liegt nichts', () => {
  const { state, log } = run([place('TRILLERPFEIFE')]);
  assert.equal(log[0].status, 'failed');
  assert.match(log[0].reason, /matches 2 cards/);
  assert.equal(state.cards.length, 0);
});

test('DA 1: ohne `category` – zwei Exemplare **desselben** Bildes legen eins und vermerken es', () => {
  const cards = [card('a', 'MÜNZE', UNIQUE, '/uploads/m.png'), card('b', 'MÜNZE', LOCKED, '/uploads/m.png')];
  const { state, log } = run([place('MÜNZE')], { cards });
  assert.equal(log[0].status, 'ok');
  assert.match(log[0].reason, /has 2 copies, took the first/);
  assert.equal(state.cards.length, 1);
});

test('DA 1: leer ist wie nicht gesetzt – `""`, `[]`, `[""]` suchen in der ganzen Bibliothek', () => {
  for (const empty of ['', [], [''], '   ', null]) {
    const { log } = run([place('TRILLERPFEIFE', empty)]);
    assert.equal(log[0].status, 'failed', JSON.stringify(empty));
    assert.match(log[0].reason, /matches 2 cards/);
  }
  // Und eine Karte, die nur in einer Kategorie liegt, wird ohne Angabe gefunden.
  assert.equal(run([place('ALTER HUT', '')]).state.cards[0].cardId, 'nur-gesperrt');
});

// ── 2. Mit `category` greift die richtige ───────────────────────────────────

test('DA 2: mit `category` legt `place_card` die Karte aus der genannten Kategorie – auch bei gleichnamiger anderswo', () => {
  const { state, log } = run([place('TRILLERPFEIFE', UNIQUE)]);
  assert.deepEqual(log.map(e => e.status), ['ok'], log[0].reason);
  assert.equal(state.cards.length, 1);
  assert.equal(state.cards[0].cardId, 'tp-unique');
  assert.equal(state.cards[0].image_path, '/uploads/tp-unique.png');
  // Die andere Richtung: die gesperrte Karte lässt sich ebenso wählen - es gibt keinen Vorrang.
  assert.equal(run([place('TRILLERPFEIFE', LOCKED)]).state.cards[0].cardId, 'tp-locked');
});

test('DA 3: `category` ist Text **oder Liste**, je Eintrag verglichen – die Einzigartige Ausrüstung liegt in zwei Kategorien', () => {
  const both = [UNIQUE, UNIQUE_NN];
  const a = run([place('TRILLERPFEIFE', both), place('ANGELHAKENANZUG', both)]);
  assert.deepEqual(a.log.map(e => e.status), ['ok', 'ok'], a.log.map(e => e.reason).join('\n'));
  assert.deepEqual(a.state.cards.map(c => c.cardId).sort(), ['nn-1', 'tp-unique']);
  // Eine Kurzform: ein Text ist die einelementige Liste.
  assert.equal(run([place('ANGELHAKENANZUG', UNIQUE_NN)]).state.cards.length, 1);
});

test('DA 3: Kategorien werden exakt verglichen, ohne Groß-/Kleinschreibung und Rand-Leerzeichen – wie bei `place_stack`', () => {
  assert.equal(run([place('TRILLERPFEIFE', '  einzigartige ausrüstung ')]).state.cards[0].cardId, 'tp-unique');
  // Kein Teilnamen-Treffer: `Einzigartige Ausrüstung` zieht die `(Neue Nachbarn)` **nicht** mit.
  const { state, log } = run([place('ANGELHAKENANZUG', UNIQUE)]);
  assert.equal(log[0].status, 'skipped');
  assert.equal(state.cards.length, 0);
});

// ── 4. Platzhalter in der Kategorie ─────────────────────────────────────────

test('DA 4: ein Platzhalter in der Kategorie wird ersetzt, je Listeneintrag', () => {
  const options = { karte: { default: 'a', choices: { a: { label: 'A', vars: { Kat: UNIQUE } } } } };
  const { state, log } = run([place('TRILLERPFEIFE', ['$optKat', UNIQUE_NN])],
    { scenarioData: { options }, choices: {} });
  assert.deepEqual(log.map(e => e.status), ['ok'], log[0].reason);
  assert.equal(state.cards[0].cardId, 'tp-unique');
});

test('DA 4: ein ungebundener Platzhalter in der Kategorie – übersprungen, laut, nichts ersatzweise gegriffen', () => {
  const { state, log } = run([place('TRILLERPFEIFE', ['$gibtEsNicht'])]);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /\$gibtEsNicht is not bound/);
  assert.equal(state.cards.length, 0);
});

// ── 5. Außerhalb der Kategorien: kein Ersatzgriff ───────────────────────────

test('DA 5: kommt der Name nur außerhalb der genannten Kategorien vor, meldet der Schritt „no card named" – es greift nichts daneben', () => {
  const { state, log } = run([place('ALTER HUT', [UNIQUE, UNIQUE_NN])]);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /no card named "ALTER HUT"/);
  assert.equal(state.cards.length, 0);
});

test('DA 5: eine Kategorie, die es nicht gibt, liefert keine Karte – und der Grund sagt es', () => {
  const { state, log } = run([place('TRILLERPFEIFE', 'Gibt es nicht')]);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /no card named "TRILLERPFEIFE"/);
  assert.equal(state.cards.length, 0);
});

// ── Die Einschränkung ist eine Funktion – der Editor fragt sie auch ────────

test('DA: `cardsInCategories` schränkt die Liste ein; ohne Angabe bleibt sie, wie sie ist', () => {
  assert.equal(cardsInCategories(CARDS, undefined), CARDS, 'dieselbe Liste, keine Kopie, kein Filter');
  assert.equal(cardsInCategories(CARDS, ''), CARDS);
  assert.equal(cardsInCategories(CARDS, []), CARDS);
  assert.deepEqual(cardsInCategories(CARDS, UNIQUE).map(c => c.id), ['tp-unique']);
  assert.deepEqual(cardsInCategories(CARDS, [UNIQUE, UNIQUE_NN]).map(c => c.id), ['tp-unique', 'nn-1']);
  assert.deepEqual(cardsInCategories(CARDS, 'Gibt es nicht'), []);
});

// ── 6. Der Editor ───────────────────────────────────────────────────────────

test('DA 6: `place_card` bietet `category` an – und ein frischer Schritt trägt keines', () => {
  assert.deepEqual(stepFields('place_card'), ['cardName', 'category', 'targetZoneLabel']);
  // Eine frische Karte sucht in der ganzen Bibliothek - wie bisher; keine geratene Kategorie.
  assert.equal('category' in defaultStep('place_card', {}), false);
});

test('DA 6: die Zeile nennt die Kategorien, und nur wenn es welche gibt', () => {
  const base = { type: 'place_card', cardName: 'TRILLERPFEIFE', targetZoneLabel: 'Terrain-Auslage' };
  assert.equal(describeStep(base), 'Place the card named "TRILLERPFEIFE" in zone "Terrain-Auslage"');
  assert.equal(describeStep({ ...base, category: [UNIQUE, UNIQUE_NN] }),
    `Place the card named "TRILLERPFEIFE" (only from "${UNIQUE}" + "${UNIQUE_NN}") in zone "Terrain-Auslage"`);
  assert.equal(describeStep({ ...base, category: UNIQUE }),
    `Place the card named "TRILLERPFEIFE" (only from "${UNIQUE}") in zone "Terrain-Auslage"`);
  assert.equal(describeStep({ ...base, category: [] }), describeStep(base));
});

test('DA 6: die Prüfung kennt die Kategorie – unbekannt wird gemeldet, ein Platzhalter nicht', () => {
  const ctx = { zoneLabels: ['Terrain-Auslage'], cardCategories: [UNIQUE, UNIQUE_NN, LOCKED], cards: CARDS };
  const ok = { type: 'place_card', cardName: 'TRILLERPFEIFE', targetZoneLabel: 'Terrain-Auslage', category: [UNIQUE, UNIQUE_NN] };
  assert.deepEqual(validateStep(ok, ctx), []);
  assert.ok(validateStep({ ...ok, category: ['Tippfehler'] }, ctx).some(p => /card category "Tippfehler" is empty or unknown/.test(p)));
  assert.deepEqual(validateStep({ ...ok, category: ['$optKat'] }, ctx), []);
});

test('DA 6: die Prüfung sucht den Namen **in** den genannten Kategorien – wie der Tisch', () => {
  const ctx = { zoneLabels: ['Terrain-Auslage'], cardCategories: [UNIQUE, UNIQUE_NN, LOCKED], cards: CARDS };
  const step = { type: 'place_card', cardName: 'TRILLERPFEIFE', targetZoneLabel: 'Terrain-Auslage' };
  // Ohne Kategorie: mehrdeutig, und der Editor sagt es.
  assert.ok(validateStep(step, ctx).some(p => /matches 2 cards/.test(p)));
  // Mit: eindeutig.
  assert.deepEqual(validateStep({ ...step, category: UNIQUE }, ctx), []);
  // Ein Name außerhalb der Kategorien: der Editor meldet, was der Tisch melden würde.
  assert.ok(validateStep({ ...step, cardName: 'ALTER HUT', category: UNIQUE }, ctx).some(p => /no card named "ALTER HUT"/.test(p)));
});
