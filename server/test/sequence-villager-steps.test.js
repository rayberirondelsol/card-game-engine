// CM/CN / Spec M26.2 — das Schrittwort `swap_villager` und die Lesart `atStart`
// in allen Schichten, die ein Schrittwort braucht (CLAUDE.md: Ausführung,
// Vokabular, Editor).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die Ausführung steht in `villagers.test.js`; hier das Vokabular, das der
// Sequenz-Editor liest (`client/src/utils/sequenceSteps.js`) – und dass der
// Editor für jedes neue Feld einen Renderer hat (derselbe Befund wie
// `sequence-steps.test.js`: ein Feld ohne Renderer wird still nicht gezeichnet).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const { STEP_TYPES, stepFields, describeStep, validateStep, defaultStep, stepTypeLabel } =
  await import('../../client/src/utils/sequenceSteps.js');

const ctx = { stackLabels: [], zoneLabels: [], pools: [], assetNames: [] };

test('swap_villager steht im Vokabular, mit Platz und Dörfler', () => {
  const t = STEP_TYPES.find(x => x.value === 'swap_villager');
  assert.ok(t, 'swap_villager fehlt in STEP_TYPES');
  assert.deepEqual(stepFields('swap_villager'), ['seat', 'villager']);
  assert.equal(stepTypeLabel({ type: 'swap_villager' }), 'Swap Villager');
});

test('ein frischer swap_villager-Schritt nimmt keinen Dörfler vorweg', () => {
  // §1: der Tisch entscheidet nicht, wer getauscht wird.
  assert.deepEqual(defaultStep('swap_villager', {}), { type: 'swap_villager', seat: 1, villager: '' });
});

test('swap_villager liest sich in einer Zeile', () => {
  assert.equal(describeStep({ type: 'swap_villager', seat: 2, villager: 'Judy Marks' }),
    'Swap the villager at seat 2 for "Judy Marks"');
  assert.match(describeStep({ type: 'swap_villager', seat: '', villager: '' }), /seat \(none\) for \(none\)/);
});

test('swap_villager: Platz ab 1, und ohne Dörfler gibt es nichts zu tauschen', () => {
  assert.deepEqual(validateStep({ type: 'swap_villager', seat: 1, villager: 'Judy Marks' }, ctx), []);
  assert.ok(validateStep({ type: 'swap_villager', seat: 0, villager: 'Judy Marks' }, ctx).some(p => /seat/.test(p)));
  assert.ok(validateStep({ type: 'swap_villager', seat: 'x', villager: 'Judy Marks' }, ctx).some(p => /seat/.test(p)));
  assert.ok(validateStep({ type: 'swap_villager', seat: '', villager: 'Judy Marks' }, ctx).some(p => /seat/.test(p)));
  assert.ok(validateStep({ type: 'swap_villager', seat: 1, villager: '  ' }, ctx).some(p => /no villager/.test(p)));
});

test('require_counter bietet atStart an; mit atStart entfällt `above`', () => {
  assert.ok(stepFields('require_counter').includes('atStart'));
  assert.ok(stepFields({ type: 'require_counter', atStart: false }).includes('above'));
  assert.ok(!stepFields({ type: 'require_counter', atStart: true }).includes('above'),
    '`above` hat bei atStart keine Wirkung und wird nicht angeboten');
  assert.ok(stepFields({ type: 'require_counter', atStart: true }).includes('atStart'));
});

test('require_counter mit atStart liest sich anders als mit above', () => {
  const base = { type: 'require_counter', name: ['Henlo: Leben', 'Henlo: Mumm'], confirm: true, message: 'Schon gespielt.' };
  assert.equal(describeStep({ ...base, above: 0 }),
    'Require one of "Henlo: Leben", "Henlo: Mumm" to be above 0, else ask before going on: "Schon gespielt."');
  assert.equal(describeStep({ ...base, atStart: true }),
    'Require every one of "Henlo: Leben", "Henlo: Mumm" to stand at its starting value, else ask before going on: "Schon gespielt."');
});

test('ein frischer require_counter-Schritt trägt kein atStart (die bisherige Lesart bleibt die Vorgabe)', () => {
  assert.equal('atStart' in defaultStep('require_counter', {}), false);
});

test('der Editor hat für seat, villager und atStart je einen Renderer', async () => {
  const src = await readFile(new URL('../../client/src/components/SetupSequenceEditor.jsx', import.meta.url), 'utf8');
  const body = src.slice(src.indexOf('const render = {'));
  for (const f of ['seat', 'villager', 'atStart']) {
    assert.ok(body.includes(`\n    ${f}: () =>`), `"${f}" hat keinen Renderer in SetupSequenceEditor.jsx`);
  }
});
