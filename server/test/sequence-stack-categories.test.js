// M8.11 / E1+E2 – `place_stack` baut aus **mehreren** Kategorien einen Stapel.
//
// Der Anlass: die drei Dauerstapel lagen von Hand am Tisch, die Sequenz mischte
// sie nur. Ein gespeicherter leerer Tisch hat sie gelöscht, und neun Schritte
// scheiterten an „stack not found". Das Ereignisdeck besteht aus zwei
// Kategorien (100 + 5), mit Erweiterungen aus mehr – ein Deck aus mehreren
// Sätzen ist in diesem Spiel der Normalfall.
//
// Die Liste ist ein **Array**, kein Text mit Kommas: ein Kategoriename ist frei
// getippte Prosa und darf ein Komma enthalten (docs/tasks-dauerstapel.md,
// Vorab 1). Ein String bleibt die Kurzform für die einelementige Liste, damit
// jeder vorhandene Schritt unverändert weiterläuft.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');
const { describeStep, validateStep, defaultStep } =
  await import('../../client/src/utils/sequenceSteps.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const HAUPT = 'Dorf-Ereignisse';
const NACHBARN = 'Dorf-Ereignisse (Üble Nachbarn)';
const GEHEIM = 'Dorf-Ereignisse (geheim)';

/** Drei Kategorien mit 3 / 2 / 1 Karten – klein genug, um sie einzeln zu nennen. */
function cardFixture() {
  const make = (cat, prefix, n) => Array.from({ length: n }, (_, i) => ({
    id: `${prefix}${i}`,
    game_id: 'g1',
    category: cat,
    name: `${prefix}${i + 1}`,
    image_path: `/uploads/cards/${prefix}${i}.png`,
    width: 300,
    height: 420,
  }));
  return [...make(HAUPT, 'h', 3), ...make(NACHBARN, 'n', 2), ...make(GEHEIM, 'g', 1)];
}

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [] });
const opts = (over = {}) => ({ cards: cardFixture(), ...over });

const place = (category, over = {}) => ({
  type: 'place_stack', category, label: 'Dorf-Ereignisse', x: 100, y: 200, faceDown: true, ...over,
});

const stackNamed = (state, label) => (state.stacks || []).find(s => s.label === label);
const names = (state, label) => stackNamed(state, label).cards.map(c => c.name);

// ── Abnahme 1: zwei Kategorien, ein Stapel ───────────────────────────────────

test('place_stack mit zwei Kategorien legt einen Stapel aus allen Karten beider', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(), [place([HAUPT, NACHBARN])], [], opts());

  assert.equal(log[0].status, 'ok', log[0].reason || '');
  assert.equal(state.stacks.length, 1, 'ein Stapel, nicht zwei');
  assert.deepEqual(names(state, 'Dorf-Ereignisse'), ['h1', 'h2', 'h3', 'n1', 'n2']);
  assert.equal(state.cards.length, 0, 'die Karten liegen im Stapel, nicht lose daneben');
});

test('die Reihenfolge der Angabe ist die Reihenfolge im Stapel', () => {
  const state = executeSequence(emptyState(), [place([NACHBARN, HAUPT])], [], opts());
  assert.deepEqual(names(state, 'Dorf-Ereignisse'), ['n1', 'n2', 'h1', 'h2', 'h3']);
});

test('der zIndex zählt über den ganzen Stapel durch, nicht je Kategorie', () => {
  // Zweimal 1,2,3 hieße: zwei Karten liegen auf demselben Platz, und welche
  // oben liegt, entscheidet die Sortierung zufällig.
  const state = executeSequence(emptyState(), [place([HAUPT, NACHBARN])], [], opts());
  assert.deepEqual(stackNamed(state, 'Dorf-Ereignisse').cards.map(c => c.zIndex), [1, 2, 3, 4, 5]);
});

test('drei Kategorien gehen genauso – die Solo-Regel ist eine Zeile mehr oder weniger', () => {
  const solo = executeSequence(emptyState(), [place([HAUPT, NACHBARN])], [], opts());
  const voll = executeSequence(emptyState(), [place([HAUPT, NACHBARN, GEHEIM])], [], opts());
  assert.equal(stackNamed(solo, 'Dorf-Ereignisse').cards.length, 5);
  assert.equal(stackNamed(voll, 'Dorf-Ereignisse').cards.length, 6);
});

// ── Abnahme 2: eine leere Kategorie ist kein Abbruch ─────────────────────────

test('eine unbekannte neben einer gefüllten Kategorie: der Stapel entsteht, die unbekannte steht im Protokoll', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(), [place([HAUPT, 'Dorf-Ereignise (Üble Nachbarn)'])], [], opts());

  assert.equal(log[0].status, 'ok', 'eine Erweiterung wegzulassen ist kein Fehler');
  assert.match(log[0].reason, /Dorf-Ereignise \(Üble Nachbarn\)/,
    'der Grund nennt genau die Kategorie, die nichts geliefert hat');
  assert.deepEqual(names(state, 'Dorf-Ereignisse'), ['h1', 'h2', 'h3']);
});

test('mehrere leere Kategorien stehen alle im Protokoll, nicht nur die erste', () => {
  const { log } = executeSequenceWithLog(
    emptyState(), [place([HAUPT, 'Fehlt A', 'Fehlt B'])], [], opts());
  assert.equal(log[0].status, 'ok');
  assert.match(log[0].reason, /Fehlt A/);
  assert.match(log[0].reason, /Fehlt B/);
});

// ── Abnahme 3: alle leer ─────────────────────────────────────────────────────

test('sind alle genannten Kategorien leer, entsteht kein Stapel – übersprungen, mit Grund', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(), [place(['Fehlt A', 'Fehlt B'])], [], opts());

  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Fehlt A/);
  assert.match(log[0].reason, /Fehlt B/);
  assert.equal(state.stacks.length, 0, 'kein leerer Stapel');
});

test('eine leere Liste nennt keine Kategorie und wird übersprungen', () => {
  const leer = executeSequenceWithLog(emptyState(), [place([])], [], opts());
  assert.equal(leer.log[0].status, 'skipped');
  assert.match(leer.log[0].reason, /categor/i);
  assert.equal(leer.state.stacks.length, 0);

  const gar = executeSequenceWithLog(emptyState(), [place(undefined)], [], opts());
  assert.equal(gar.log[0].status, 'skipped');
  assert.equal(gar.state.stacks.length, 0);
});

// ── Abnahme 4: eine einzelne Kategorie verhält sich unverändert ──────────────

test('die einelementige Liste und der String tun dasselbe', () => {
  const alsString = executeSequenceWithLog(emptyState(), [place(HAUPT)], [], opts());
  const alsListe = executeSequenceWithLog(emptyState(), [place([HAUPT])], [], opts());

  assert.equal(alsString.log[0].status, 'ok');
  assert.equal(alsListe.log[0].status, 'ok');
  assert.deepEqual(names(alsListe.state, 'Dorf-Ereignisse'), names(alsString.state, 'Dorf-Ereignisse'));
  assert.equal(alsListe.log[0].reason, null, 'eine volle Kategorie hat nichts zu melden');
});

test('dieselbe Kategorie zweimal genannt legt ihre Karten nur einmal', () => {
  // Ein Autorenschnitzer, der sonst 100 Ereigniskarten verdoppelt - und zwar
  // lautlos, weil der Stapel verdeckt liegt.
  const state = executeSequence(emptyState(), [place([HAUPT, ' dorf-ereignisse '])], [], opts());
  assert.deepEqual(names(state, 'Dorf-Ereignisse'), ['h1', 'h2', 'h3']);
});

// ── Platzhalter gelten je Eintrag ────────────────────────────────────────────

test('ein Platzhalter in einem Listeneintrag wird ersetzt wie im String', () => {
  const cards = [
    ...cardFixture(),
    { id: 'a0', game_id: 'g1', category: 'Aktionen: Patches', name: 'a1', width: 300, height: 420 },
  ];
  const steps = [
    { type: 'place_asset', assetName: 'Bösewicht: Patches', targetZoneLabel: 'Bosseleiste', faceDown: true },
    { type: 'reveal_next', zoneLabel: 'Bosseleiste' },
    place(['Aktionen: $revealedBase'], { label: 'Aktionsdeck' }),
  ];
  const zones = [{ id: 'z', label: 'Bosseleiste', x: 0, y: 0, width: 200, height: 200, layout: 'row' }];
  const assets = [{ id: 'ass-p', name: 'Bösewicht: Patches', image_path: '/uploads/p.png', back_image_path: '/uploads/back.png', width: 60, height: 60 }];

  const { state, log } = executeSequenceWithLog(emptyState(), steps, zones, { cards, assets });
  assert.equal(log[2].status, 'ok', log[2].reason || '');
  assert.deepEqual(names(state, 'Aktionsdeck'), ['a1']);
});

test('ein nicht gebundener Platzhalter in der Liste überspringt den Schritt mit Grund', () => {
  const { state, log } = executeSequenceWithLog(
    emptyState(), [place([HAUPT, 'Aktionen: $revealedBase'])], [], opts());

  assert.equal(log[0].status, 'skipped', 'lieber kein Stapel als ein halber');
  assert.match(log[0].reason, /\$revealedBase/);
  assert.equal(state.stacks.length, 0);
});

// ── Protokoll ────────────────────────────────────────────────────────────────

test('im Protokoll steht der Schritt mit allen Kategorien, nicht mit einer Zeichenkette aus Kommas', () => {
  const { log } = executeSequenceWithLog(emptyState(), [place([HAUPT, NACHBARN])], [], opts());
  assert.equal(log[0].type, 'place_stack');
  assert.match(log[0].target, /Dorf-Ereignisse/);
  assert.match(log[0].target, /Üble Nachbarn/);
});

// ── E2: Schrittvokabular ─────────────────────────────────────────────────────

test('describeStep zählt die Kategorien auf', () => {
  const line = describeStep(place([HAUPT, NACHBARN]));
  assert.match(line, /Dorf-Ereignisse/);
  assert.match(line, /Üble Nachbarn/);
  // Die einzelne Kategorie liest sich unverändert.
  assert.match(describeStep(place(HAUPT)), /"Dorf-Ereignisse"/);
});

test('validateStep meldet jeden unbekannten Eintrag einzeln – hier fällt der Tippfehler auf', () => {
  const ctx = { cardCategories: [HAUPT, NACHBARN, GEHEIM] };

  assert.deepEqual(validateStep(place([HAUPT, NACHBARN]), ctx), []);

  const problems = validateStep(place([HAUPT, 'Dorf-Ereignise (Üble Nachbarn)']), ctx);
  assert.equal(problems.length, 1, 'genau ein Befund, nicht einer je Eintrag');
  assert.match(problems[0], /Dorf-Ereignise \(Üble Nachbarn\)/);

  const zwei = validateStep(place(['Fehlt A', 'Fehlt B']), ctx);
  assert.equal(zwei.length, 2, 'zwei Tippfehler sind zwei Befunde');
});

test('validateStep: leere Liste ist keine Kategorie, Platzhalter bleiben ungeprüft', () => {
  const ctx = { cardCategories: [HAUPT, NACHBARN] };
  assert.equal(validateStep(place([]), ctx).filter(p => /category/i.test(p)).length, 1);
  assert.equal(validateStep(place(['   ']), ctx).filter(p => /category/i.test(p)).length, 1);
  assert.deepEqual(validateStep(place([HAUPT, 'Aktionen: $revealedBase']), ctx), []);
  // Ohne geladene Kategorien wird nichts erfunden – dieselbe Regel wie bisher.
  assert.deepEqual(validateStep(place([HAUPT, 'Fehlt A']), {}), []);
});

test('defaultStep bleibt beim String – die Liste entsteht erst, wenn jemand eine zweite Zeile tippt', () => {
  const step = defaultStep('place_stack', { cardCategories: [HAUPT, NACHBARN] });
  assert.equal(step.category, HAUPT);
});
