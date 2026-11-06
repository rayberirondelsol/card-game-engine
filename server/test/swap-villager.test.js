// CN / Spec M26.2 — der Griff am Tisch: wer zur Wahl steht, und die Aktion, die
// das Kontextmenü am Tableau auslöst.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Das Menü rechnet nichts. Es schreibt eine Aktion aus drei Schritten – Wache
// über den Kampf, Wache über erspielte Werte, Tausch – und `runSetupAction`
// führt sie aus, mit derselben Rückfrage wie jede Aktion des Aufbaus (M19.5).
// Hier steht, was das Menü entscheidet (`client/src/utils/swapVillager.js`);
// was der Executor daraus macht, prüft `villagers.test.js`. Begründung:
// `docs/tasks-doerfler.md`, Entscheidung 2 und 3.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { swapChoices, swapAction } from '../../client/src/utils/swapVillager.js';
import { VILLAGERS } from '../../scripts/doerfler-daten.mjs';
import {
  fx, run, build, imKampf, tokenNamed, counterNamed, cardNamed, inZone, copy,
} from './villager-table.js';

const tableau = (s, label) => tokenNamed(s, label)[0];

test('CN: am Tableau von Henlo stehen die sechs zur Wahl, die nicht sitzen', () => {
  const s = build();
  const c = swapChoices(VILLAGERS, s.tokens, fx.assets, tableau(s, 'Tableau: Henlo Bulwark').id);
  assert.equal(c.seat, 1);
  assert.equal(c.current, 'Henlo Bulwark');
  assert.deepEqual(c.choices, ['Blopsy Twins', 'Georgie Irongut', 'Judy Marks', 'Norman Fishboy', 'Quintus Binch', 'Yancy Plover']);
});

test('CN: an einem anderen Stück gibt es kein Tausch-Menü', () => {
  const s = build();
  for (const label of ['Henlo', 'Marker 1: Leben']) {
    assert.equal(swapChoices(VILLAGERS, s.tokens, fx.assets, tokenNamed(s, label)[0].id), null, label);
  }
  assert.equal(swapChoices(VILLAGERS, s.tokens, fx.assets, 'gibt-es-nicht'), null);
  // Ohne Dörferdaten (der Grundaufbau) auch nicht.
  assert.equal(swapChoices(undefined, s.tokens, fx.assets, tableau(s, 'Tableau: Henlo Bulwark').id), null);
  assert.equal(swapChoices({}, s.tokens, fx.assets, tableau(s, 'Tableau: Henlo Bulwark').id), null);
});

test('CN: nach einem Tausch steht der Alte wieder zur Wahl, der Neue nicht mehr', () => {
  const s = build();
  const a = swapAction(VILLAGERS, 1, 'Henlo Bulwark', 'Judy Marks');
  const { state } = run(s, a.steps);
  const c = swapChoices(VILLAGERS, state.tokens, fx.assets, tableau(state, 'Tableau: Judy Marks').id);
  assert.equal(c.seat, 1);
  assert.equal(c.current, 'Judy Marks');
  assert.ok(c.choices.includes('Henlo Bulwark'));
  assert.ok(!c.choices.includes('Judy Marks'));
  assert.equal(c.choices.length, 6);
});

test('CN: die Aktion hat drei Schritte – Kampf, erspielte Werte, Tausch – und einen sprechenden Namen', () => {
  const a = swapAction(VILLAGERS, 1, 'Henlo Bulwark', 'Judy Marks');
  assert.deepEqual(a.steps.map(s => s.type), ['require_zone', 'require_counter', 'swap_villager']);
  assert.match(a.label, /Henlo Bulwark.*Judy Marks/);
  assert.ok(a.id);
  // Die Wache über den Kampf liest die Zone aus den Daten – der Client kennt sie nicht.
  assert.equal(a.steps[0].zoneLabel, VILLAGERS.fightZone);
  assert.equal(a.steps[0].expect, 'empty');
  // Die zweite fragt nur, sie sperrt nicht: „Trotzdem" (M19.5).
  assert.equal(a.steps[1].atStart, true);
  assert.equal(a.steps[1].confirm, true);
  assert.deepEqual(a.steps[1].name, ['Henlo: Leben', 'Henlo: Bewegung', 'Henlo: Mumm', 'Henlo: Präzision']);
  assert.deepEqual(a.steps[2], { type: 'swap_villager', seat: 1, villager: 'Judy Marks' });
  // Beide Wachen tragen einen Satz für den Spieler (`issueLine` zeigt ihn statt der Diagnose).
  assert.ok(a.steps[0].message && a.steps[1].message);
  assert.match(a.steps[1].message, /Henlo Bulwark/);
});

test('CN: am frischen Tisch tauscht die Aktion ohne Rückfrage', () => {
  const s = build();
  const { state, log } = run(s, swapAction(VILLAGERS, 3, 'Granny Melba', 'Blopsy Twins').steps);
  assert.deepEqual(log.map(e => e.status), ['ok', 'ok', 'ok']);
  assert.ok(tableau(state, 'Tableau: Blopsy Twins'));
  assert.ok(inZone(state, cardNamed(state, 'KRISTALLKUGEL'), 'Dörfler 3: Mitbringsel'));
});

test('CN: läuft ein Kampf, ist der Tausch gesperrt – ohne Rückfrage', () => {
  const s = imKampf(build());
  const { state, log } = run(s, swapAction(VILLAGERS, 1, 'Henlo Bulwark', 'Judy Marks').steps);
  assert.equal(log.length, 1);
  assert.equal(log[0].status, 'skipped');
  assert.equal(log[0].confirm, undefined, 'hier gibt es kein „Trotzdem"');
  assert.match(log[0].message, /Kampf/);
  assert.equal(JSON.stringify(state), JSON.stringify(s));
});

test('CN: hat der Dörfler gespielt, fragt die Aktion – und „Trotzdem" tauscht', () => {
  const s = run(build(), [{ type: 'set_counter', name: 'Henlo: Leben', value: '-1' }]).state;
  const action = swapAction(VILLAGERS, 1, 'Henlo Bulwark', 'Judy Marks');
  const first = run(s, action.steps);
  const ask = first.log.find(e => e.confirm && e.status !== 'ok');
  assert.ok(ask, 'die Rückfrage fehlt');
  assert.equal(ask.index, 1, 'es ist die zweite Wache');
  assert.match(ask.message, /Henlo Bulwark/);
  assert.equal(JSON.stringify(first.state), JSON.stringify(s), 'bis zur Antwort ist nichts getauscht');
  // Was der Tisch bei „Trotzdem" tut: dieselbe Aktion ohne diesen Schritt.
  const again = run(s, action.steps.filter((_, i) => i !== ask.index));
  assert.deepEqual(again.log.map(e => e.status), ['ok', 'ok']);
  assert.equal(counterNamed(again.state, 'Judy: Leben').value, 3, 'erspielte Werte sind weg');
});

test('CN: die Aktion macht nichts am Tisch, was nicht im Schritt steht', () => {
  const s = build();
  const before = copy(s);
  swapAction(VILLAGERS, 1, 'Henlo Bulwark', 'Judy Marks');
  assert.deepEqual(s, before);
});
