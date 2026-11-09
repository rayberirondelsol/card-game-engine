// CN / Spec M26.2 — der Griff am Tisch: wer zur Wahl steht, und die Aktion, die
// das Kontextmenü am Tableau auslöst.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Das Menü rechnet nichts. Es schreibt eine Aktion aus drei Schritten – Wache
// über den Kampf, Wache über erspielte Werte (seit M30/DZ über die **Marker** der
// vier Leisten des Platzes, nicht über Zähler), Tausch – und `runSetupAction`
// führt sie aus, mit derselben Rückfrage wie jede Aktion des Aufbaus (M19.5).
// Hier steht, was das Menü entscheidet (`client/src/utils/swapVillager.js`);
// was der Executor daraus macht, prüft `villagers.test.js`. Begründung:
// `docs/tasks-doerfler.md`, Entscheidung 2 und 3.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { swapChoices, swapAction } from '../../client/src/utils/swapVillager.js';
import { VILLAGERS } from '../../scripts/doerfler-daten.mjs';
import { zoneSlotNumbered } from '../../shared/zoneGeometry.js';
import {
  fx, run, build, imKampf, tokenNamed, counterNamed, cardNamed, inZone, copy, scenarioData, resolved, LINEUP,
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

test('CN: die Aktion hat drei Schritte – Kampf, erspielte Werte (Marker), Tausch – und einen sprechenden Namen', () => {
  const a = swapAction(VILLAGERS, 1, 'Henlo Bulwark', 'Judy Marks');
  assert.deepEqual(a.steps.map(s => s.type), ['require_zone', 'require_marker', 'swap_villager']);
  assert.match(a.label, /Henlo Bulwark.*Judy Marks/);
  assert.ok(a.id);
  // Die Wache über den Kampf liest die Zone aus den Daten – der Client kennt sie nicht.
  assert.equal(a.steps[0].zoneLabel, VILLAGERS.fightZone);
  assert.equal(a.steps[0].expect, 'empty');
  // Die zweite fragt nur, sie sperrt nicht: „Trotzdem" (M19.5). Sie liest die vier
  // Leisten des **Platzes** (M30.7); der Alte liefert nur den Startwert (`villager`).
  assert.equal(a.steps[1].atStart, true);
  assert.equal(a.steps[1].confirm, true);
  assert.deepEqual(a.steps[1].zoneLabel, ['Dörfler 1: Leben', 'Dörfler 1: Bewegung', 'Dörfler 1: Mumm', 'Dörfler 1: Präzision']);
  assert.equal(a.steps[1].villager, 'Henlo Bulwark');
  assert.equal(a.steps[1].name, undefined, 'keine Zähler mehr');
  assert.deepEqual(a.steps[2], { type: 'swap_villager', seat: 1, villager: 'Judy Marks' });
  // Beide Wachen tragen einen Satz für den Spieler (`issueLine` zeigt ihn statt der Diagnose).
  assert.ok(a.steps[0].message && a.steps[1].message);
  assert.equal(a.steps[1].message, 'Henlo Bulwark hat schon gespielt: seine Zähler stehen nicht mehr auf den Startwerten. '
    + 'Tauschen löscht sie und setzt Judy Marks auf seine Startwerte.');
});

test('CN: Platz 3 – der Platz, nicht der Dörfler, bestimmt die Zonen', () => {
  const a = swapAction(VILLAGERS, 3, 'Granny Melba', 'Blopsy Twins');
  assert.deepEqual(a.steps[1].zoneLabel, ['Dörfler 3: Leben', 'Dörfler 3: Bewegung', 'Dörfler 3: Mumm', 'Dörfler 3: Präzision']);
  assert.equal(a.steps[1].villager, 'Granny Melba');
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

/** Den Lebensmarker von Platz 1 auf Nummer `n` der Leiste legen (derselbe Punkt wie der Aufbau). */
const lebenAuf = (state, n) => {
  const s = copy(state);
  const p = zoneSlotNumbered(resolved(s).find(z => z.label === 'Dörfler 1: Leben'), n);
  Object.assign(tokenNamed(s, 'Marker 1: Leben')[0], { x: p.x, y: p.y });
  return s;
};

test('CN: hat der Dörfler gespielt (Lebensmarker verschoben), fragt die Aktion – Abbrechen lässt den Tisch, „Trotzdem" tauscht', () => {
  const s = lebenAuf(build(), 2); // Henlo startet auf 3
  const action = swapAction(VILLAGERS, 1, 'Henlo Bulwark', 'Judy Marks');
  const first = run(s, action.steps);
  const ask = first.log.find(e => e.confirm && e.status !== 'ok');
  assert.ok(ask, 'die Rückfrage fehlt');
  assert.equal(ask.index, 1, 'es ist die zweite Wache');
  assert.match(ask.message, /Henlo Bulwark/);
  assert.match(ask.reason, /Dörfler 1: Leben: 2, started at 3/);
  // Abbrechen: bis zur Antwort (und danach) ist nichts getauscht.
  assert.equal(JSON.stringify(first.state), JSON.stringify(s), 'bis zur Antwort ist nichts getauscht');
  // Was der Tisch bei „Trotzdem" tut: dieselbe Aktion ohne diesen Schritt.
  const again = run(s, action.steps.filter((_, i) => i !== ask.index));
  assert.deepEqual(again.log.map(e => e.status), ['ok', 'ok']);
  assert.ok(tableau(again.state, 'Tableau: Judy Marks'));
  assert.equal(counterNamed(again.state, 'Judy: Leben').value, 3, 'erspielte Werte sind weg');
});

test('CN: fehlt der Lebensmarker ganz, fragt die Aktion ebenso (kein Marker ist nicht der Startwert)', () => {
  const s = copy(build());
  s.tokens = s.tokens.filter(t => t.label !== 'Marker 1: Leben');
  const { log } = run(s, swapAction(VILLAGERS, 1, 'Henlo Bulwark', 'Judy Marks').steps);
  const ask = log.find(e => e.confirm && e.status !== 'ok');
  assert.ok(ask);
  assert.equal(ask.index, 1);
});

// ── Ohne Zähler am Platz (DY): das Menü darf nicht an einer Rückfrage scheitern,
//    die es nicht stellen kann. Dieser Test muss vor `ED` grün sein. ──────────

const ohneZaehler = (() => {
  const d = copy(scenarioData);
  for (const seat of d.villagers.seats) delete seat.counters;
  return d;
})();

test('CN/DZ: ohne Zähler am Tisch läuft das Menü – am frischen Tisch ohne Rückfrage, nach dem Spielen mit', () => {
  const over = { scenarioData: ohneZaehler };
  const t = run({}, LINEUP, over).state;
  assert.equal(t.counters.length, 0, 'der Tisch hat keine Zähler');
  const action = swapAction(ohneZaehler.villagers, 1, 'Henlo Bulwark', 'Judy Marks');

  const frisch = run(t, action.steps, over);
  assert.deepEqual(frisch.log.map(e => e.status), ['ok', 'ok', 'ok']);
  assert.ok(tableau(frisch.state, 'Tableau: Judy Marks'));

  const gespielt = lebenAuf(t, 2);
  const first = run(gespielt, action.steps, over);
  const ask = first.log.find(e => e.confirm && e.status !== 'ok');
  assert.ok(ask, 'die Rückfrage fehlt');
  assert.match(ask.message, /Henlo Bulwark/);
  assert.doesNotMatch(ask.reason, /no counter named/);
  assert.equal(JSON.stringify(first.state), JSON.stringify(gespielt), 'Abbrechen lässt den Tisch');
  const again = run(gespielt, action.steps.filter((_, i) => i !== ask.index), over);
  assert.deepEqual(again.log.map(e => e.status), ['ok', 'ok']);
  assert.ok(tableau(again.state, 'Tableau: Judy Marks'));
});

test('CN/DZ: mit den heutigen Daten liest das Menü die Marker, nicht die Zähler', () => {
  const action = swapAction(VILLAGERS, 1, 'Henlo Bulwark', 'Judy Marks');
  // Der Zähler weicht ab, der Marker liegt am Start: keine Rückfrage.
  const zaehler = run(build(), [{ type: 'set_counter', name: 'Henlo: Leben', value: '-1' }]).state;
  assert.deepEqual(run(zaehler, action.steps).log.map(e => e.status), ['ok', 'ok', 'ok']);
  // Der Marker weicht ab, der Zähler steht am Start: die Rückfrage kommt.
  const marker = lebenAuf(build(), 2);
  assert.equal(counterNamed(marker, 'Henlo: Leben').value, 3);
  const ask = run(marker, action.steps).log.find(e => e.confirm && e.status !== 'ok');
  assert.ok(ask, 'die Rückfrage fehlt');
});

test('CN: die Aktion macht nichts am Tisch, was nicht im Schritt steht', () => {
  const s = build();
  const before = copy(s);
  swapAction(VILLAGERS, 1, 'Henlo Bulwark', 'Judy Marks');
  assert.deepEqual(s, before);
});
