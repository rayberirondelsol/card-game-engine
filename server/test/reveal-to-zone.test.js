// M8.9/D3 — das Bedienelement am Stapel: welche Zonen es anbietet und welchen
// Sequenzschritt es dahinter ausloest.
//
// Der Tisch fuehrt denselben Executor aus wie der Aufbau (`runSetupAction`),
// also besteht das Bedienelement aus genau zwei Entscheidungen, und die stehen
// hier: **welche Zonen** zur Auswahl stehen und **wie der Stapel adressiert**
// wird. Beides ist reine Logik und liegt darum in client/src/utils, geprueft
// von hier aus — der Client hat keine Testinfrastruktur.
//
// Run with: npm test  (node --test)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { revealZones, revealPlan } = await import('../../client/src/utils/revealToZone.js');
const { executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const ABLAGE = { label: 'Ablage', x: 1000, y: 0, width: 200, height: 280, layout: 'stack', accepts: ['card'] };
const HAND = { label: 'Hand Doerfler 1', x: 0, y: 900, width: 600, height: 200, layout: 'row', capacity: 3, accepts: ['card'] };
const BOSSELEISTE = { label: 'Bosseleiste', x: 0, y: 0, width: 600, height: 150, layout: 'row', capacity: 4, accepts: ['asset'] };
const GELAENDE = { label: 'Gelaendekarten', x: 0, y: 500, width: 900, height: 200, layout: 'row', capacity: 8, accepts: ['card'] };

const stack = (label) => ({
  stackId: 's1',
  label,
  x: 0,
  y: 0,
  cards: [
    { tableId: 't1', cardId: 'c1', name: 'K1', width: 200, height: 280, faceDown: true, zIndex: 1 },
    { tableId: 't2', cardId: 'c2', name: 'K2', width: 200, height: 280, faceDown: true, zIndex: 2 },
  ],
});

const table = (label) => ({ cards: [], stacks: [stack(label)], tokens: [], boards: [] });

// ── Welche Zonen das Menue anbietet ──────────────────────────────────────────

test('nur Zonen, die Karten nehmen — eine Assetzone steht nicht zur Wahl', () => {
  const offered = revealZones([ABLAGE, BOSSELEISTE, HAND]).map(z => z.label);
  assert.ok(!offered.includes('Bosseleiste'));
});

test('ein Ablagestapel schlaegt alle anderen: genau ein Eintrag, kein zweiter Klick', () => {
  // `layout: "stack"` heisst, dass jede neue Karte die vorige zudeckt — das
  // **ist** ein Ablagestapel (M8.9 Regel 2). Liegt einer im Setup, ist die
  // Frage „wohin?" beantwortet, und das Menue zeigt einen einzigen Eintrag.
  assert.deepEqual(revealZones([HAND, GELAENDE, ABLAGE, BOSSELEISTE]).map(z => z.label), ['Ablage']);
});

test('ohne Ablagestapel stehen alle Kartenzonen zur Wahl, statt gar keine', () => {
  assert.deepEqual(revealZones([HAND, GELAENDE, BOSSELEISTE]).map(z => z.label),
    ['Hand Doerfler 1', 'Gelaendekarten']);
});

test('mehrere Ablagestapel stehen beide da — geraten wird nicht', () => {
  const zweite = { ...ABLAGE, label: 'Ablage Doerfler' };
  assert.deepEqual(revealZones([ABLAGE, zweite, HAND]).map(z => z.label), ['Ablage', 'Ablage Doerfler']);
});

test('eine Zone ohne Namen kann kein Schritt adressieren und wird nicht angeboten', () => {
  assert.deepEqual(revealZones([{ ...ABLAGE, label: '' }]), []);
});

test('keine Zonen, keine Liste — und kein Absturz', () => {
  assert.deepEqual(revealZones([]), []);
  assert.deepEqual(revealZones(undefined), []);
});

// ── Welchen Schritt das Bedienelement ausloest ───────────────────────────────

test('der Griff ist ein `deal_to_zone` mit count 1, offen — kein eigener Schritt', () => {
  const plan = revealPlan(table('Verhaltensdeck'), 's1', 'Ablage');
  assert.deepEqual(plan.steps, [{
    type: 'deal_to_zone', stackLabel: 'Verhaltensdeck', count: 1, targetZoneLabel: 'Ablage', faceDown: false,
  }]);
  assert.equal(plan.tempLabel, null, 'ein benannter Stapel braucht keinen Hilfsnamen');
  assert.equal(plan.state.stacks[0].label, 'Verhaltensdeck');
});

test('ein namenloser Stapel bekommt einen Hilfsnamen, sonst gibt es keine Adresse', () => {
  const plan = revealPlan(table(null), 's1', 'Ablage');
  assert.ok(plan.tempLabel, 'der Hilfsname wird gemeldet, damit der Tisch ihn danach wieder loeschen kann');
  assert.equal(plan.steps[0].stackLabel, plan.tempLabel);
  assert.equal(plan.state.stacks[0].label, plan.tempLabel);
  assert.match(plan.tempLabel, /s1/, 'aus der Stapel-Id gebildet, damit er keinen echten Namen verdeckt');
});

test('der Plan laesst den uebergebenen Zustand in Ruhe', () => {
  const state = table(null);
  revealPlan(state, 's1', 'Ablage');
  assert.equal(state.stacks[0].label, null, 'der Hilfsname steht nur im Plan');
});

test('ein Stapel, den es nicht gibt, ergibt trotzdem einen Schritt — fuers Protokoll', () => {
  const plan = revealPlan(table('Verhaltensdeck'), 'weg', 'Ablage');
  const { state, log } = executeSequenceWithLog(plan.state, plan.steps, [ABLAGE]);
  assert.equal(log[0].status, 'skipped');
  assert.equal(state.cards.length, 0);
});

// ── Plan und Executor zusammen: das ist der ganze Griff ──────────────────────

test('Plan + Executor legen die oberste Karte offen auf die Ablage', () => {
  const plan = revealPlan(table('Verhaltensdeck'), 's1', 'Ablage');
  const { state, log } = executeSequenceWithLog(plan.state, plan.steps, [ABLAGE]);

  assert.equal(log[0].status, 'ok');
  assert.equal(state.cards.length, 1);
  assert.equal(state.cards[0].name, 'K2', 'die oberste');
  assert.equal(state.cards[0].faceDown, false);
  assert.equal(state.stacks[0].cards.length, 1, 'der Rest bleibt liegen');
});

// ── M11.5: das Menü fragt die Seite ──────────────────────────────────────────

test('Zonen der abgewandten Brettseite stehen nicht im Aufdeck-Menü', () => {
  // Der Befund: waehrend das Zusatz-Brett die Dorfphase zeigte, bot der
  // Rechtsklick „Reveal Top Card to Aktionen" und „… Ablage" an - beide auf der
  // Kampfseite - und nicht die Ladenauslage. Das Ablegen respektiert die Seite
  // seit M10.13 (`zoneRejects`), nur die Menueliste fragte nicht.
  const shop = { label: 'Nachschub-Auslage', layout: 'slots', slots: [{ relX: 0.5, relY: 0.5 }] };
  const actions = { label: 'Aktionen', layout: 'stack', facingAway: true };
  const discard = { label: 'Ablage', layout: 'stack', facingAway: true };

  const offered = revealZones([shop, actions, discard]).map(z => z.label);
  assert.deepEqual(offered, ['Nachschub-Auslage']);
});

test('zeigt der Anker die andere Seite, ist es umgekehrt', () => {
  const shop = { label: 'Nachschub-Auslage', layout: 'slots', slots: [{ relX: 0.5, relY: 0.5 }], facingAway: true };
  const actions = { label: 'Aktionen', layout: 'stack' };
  const discard = { label: 'Ablage', layout: 'stack' };

  assert.deepEqual(revealZones([shop, actions, discard]).map(z => z.label), ['Aktionen', 'Ablage']);
});

test('eine Zone ohne Seitenangabe steht immer drin', () => {
  const plain = { label: 'Ablage', layout: 'stack' };
  assert.deepEqual(revealZones([plain]).map(z => z.label), ['Ablage']);
});
