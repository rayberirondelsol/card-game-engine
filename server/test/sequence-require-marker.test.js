// DW / Spec M30.7 — `require_marker`: dieselbe Wache wie `require_counter`, nur liest sie
// Marker auf einer Leiste statt Zähler.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Tisch ist der der Dörfler-Tests (`villager-table.js`): `build()` stellt Henlo,
// Fridgette und Granny mit ihren zwölf Markern auf die Startwerte. Ein Marker ist
// das Plättchen mit dem Etikett `Marker <n>: <Wert>`; sein Wert ist die Nummer des
// Platzes, auf dem er liegt (`zoneSlotNumberAt`, DV). Die Wache ist **eine** (M6):
// `require_marker` teilt sich den Handler mit `require_counter`, darum prüft der
// letzte Test den Quelltext - ein zweiter Handler wäre eine zweite Haltelogik.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { zoneSlotNumbered } from '../../shared/zoneGeometry.js';
import { ZONES, run, build, copy, resolved } from './villager-table.js';

const LEBEN = ['Dörfler 1: Leben', 'Dörfler 2: Leben', 'Dörfler 3: Leben'];
const SATZ = 'Auf keiner Lebensleiste liegt noch ein Marker. Nach [DE S.22] ist die Partie damit zu Ende.';
const VIER = ['Leben', 'Bewegung', 'Mumm', 'Präzision'].map(w => `Dörfler 1: ${w}`);

const guard = (over = {}) => ({ type: 'require_marker', zoneLabel: LEBEN, above: 0, confirm: true, message: SATZ, ...over });
/** Ein harmloser Schritt dahinter, an dem sich ablesen lässt, ob er lief (`skipped`, aber als eigener Eintrag). */
const after = { type: 'clear_zone', zoneLabel: 'Gibts Nicht' };
const ran = (log) => log.length === 2 && /not found/.test(log[1].reason);

const without = (state, ...labels) => {
  const s = copy(state);
  s.tokens = s.tokens.filter(t => !labels.includes(t.label));
  return s;
};
const marker = (state, label) => state.tokens.find(t => t.label === label);
/** Den Marker auf Platz `n` seiner Leiste legen (derselbe Punkt wie der Aufbau). */
const putOn = (state, label, zoneLabel, n) => {
  const s = copy(state);
  const p = zoneSlotNumbered(resolved(s).find(z => z.label === zoneLabel), n);
  Object.assign(marker(s, label), { x: p.x, y: p.y });
  return s;
};
const guardOn = (state, step, over) => run(state, [step, after], over);

// ── Lesart `above` ──────────────────────────────────────────────────────────

test('DW 1: alle drei Marker liegen – die Wache besteht und der Schritt dahinter läuft', () => {
  const { log } = guardOn(build(), guard());
  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.ok(ran(log), 'der Schritt dahinter muss laufen');
});

test('DW 2: alle drei Marker von der Leiste genommen – Halt mit Satz, Rückfrage und Stand', () => {
  const s = without(build(), 'Marker 1: Leben', 'Marker 2: Leben', 'Marker 3: Leben');
  const { log } = guardOn(s, guard());
  assert.equal(log.length, 1);
  assert.equal(log[0].status, 'skipped');
  assert.equal(log[0].message, SATZ);
  assert.equal(log[0].confirm, true);
  assert.match(log[0].reason, /\(1 further step skipped\)$/);
  assert.match(log[0].reason, /Dörfler 1: Leben: no marker/);
});

test('DW 3: einer genügt – auch einer auf Platz 1 (1 > 0)', () => {
  let s = without(build(), 'Marker 2: Leben', 'Marker 3: Leben');
  assert.ok(ran(guardOn(s, guard()).log));
  s = putOn(s, 'Marker 1: Leben', 'Dörfler 1: Leben', 1);
  assert.ok(ran(guardOn(s, guard()).log), 'Platz 1 ist ein Wert über 0');
});

test('DW 4: unlesbar und keiner besteht – Halt mit Diagnose, **ohne** Satz und Rückfrage', () => {
  const base = without(build(), 'Marker 2: Leben', 'Marker 3: Leben');

  const zwei = copy(base);
  const m = marker(zwei, 'Marker 1: Leben');
  zwei.tokens.push({ id: 'max', label: 'Max', shape: 'image', size: 22, x: m.x + 2, y: m.y + 2 });
  const a = guardOn(zwei, guard()).log;
  assert.equal(a.length, 1);
  assert.equal(a[0].status, 'skipped');
  assert.equal(a[0].message, undefined, 'der Satz „alle besiegt“ stimmte nicht - die Wache weiß es nicht');
  assert.equal(a[0].confirm, undefined);
  assert.match(a[0].reason, /Dörfler 1: Leben/);
  assert.match(a[0].reason, /2 objects/);

  const daneben = copy(base);
  marker(daneben, 'Marker 1: Leben').x += 3;
  const b = guardOn(daneben, guard()).log;
  assert.equal(b[0].status, 'skipped');
  assert.equal(b[0].message, undefined);
  assert.equal(b[0].confirm, undefined);
  assert.match(b[0].reason, /has no place/);
});

test('DW 5: eine unlesbare Zone neben einer bestandenen schadet nicht (mindestens eine genügt)', () => {
  const s = without(build(), 'Marker 3: Leben');
  marker(s, 'Marker 1: Leben').x += 3;
  assert.ok(ran(guardOn(s, guard()).log));
});

test('DW 6: Zone fehlt, kein Name, keine festen Plätze – Halt mit Diagnose, der Rest läuft nicht', () => {
  const free = { id: 'zfree', label: 'Freie Zone', shape: 'rect', type: 'shared', accepts: ['asset'], layout: 'free', x: 0, y: 0, width: 100, height: 100 };
  const zones = [...ZONES, free];
  const hold = (step, text) => {
    const { log } = run(build(), [step, after], { zones });
    assert.equal(log.length, 1);
    assert.equal(log[0].status, 'skipped');
    assert.match(log[0].reason, text);
    assert.equal(log[0].message, undefined, 'eine Diagnose, kein Satz für den Spieler');
  };
  hold(guard({ zoneLabel: 'Dörfler 9: Leben' }), /zone "Dörfler 9: Leben" not found/);
  hold(guard({ zoneLabel: [] }), /no zone given/);
  hold(guard({ zoneLabel: '' }), /no zone given/);
  hold(guard({ zoneLabel: undefined }), /no zone given/);
  hold(guard({ zoneLabel: 'Freie Zone' }), /has no places/);
});

test('DW 7: `above` ist frei – 3 auf Platz 3 besteht nicht, 4 besteht; Unsinn hält', () => {
  const s = without(build(), 'Marker 2: Leben', 'Marker 3: Leben');   // Marker 1: Leben liegt auf 3
  const one = { zoneLabel: 'Dörfler 1: Leben' };
  const drei = guardOn(s, guard({ ...one, above: 3 })).log;
  assert.equal(drei.length, 1, '3 ist nicht über 3');
  assert.equal(drei[0].message, SATZ);
  assert.ok(ran(guardOn(putOn(s, 'Marker 1: Leben', 'Dörfler 1: Leben', 4), guard({ ...one, above: 3 })).log));

  const x = guardOn(s, guard({ ...one, above: 'x' })).log;
  assert.equal(x[0].status, 'skipped');
  assert.match(x[0].reason, /"x" is not a number/);
});

// ── Lesart `atStart` ────────────────────────────────────────────────────────

const atStart = (over = {}) => ({ type: 'require_marker', zoneLabel: VIER, atStart: true, villager: 'Henlo Bulwark', confirm: true, message: 'Hat schon gespielt.', ...over });

test('DW 8: am Start – besteht; `above` bleibt unbeachtet', () => {
  assert.ok(ran(guardOn(build(), atStart()).log));
  assert.ok(ran(guardOn(build(), atStart({ above: 99 })).log));
});

test('DW 9: abgewichen oder fehlend – Halt mit Satz und Rückfrage, der Stand nennt den Startwert', () => {
  const abgewichen = putOn(build(), 'Marker 1: Leben', 'Dörfler 1: Leben', 2);
  const a = guardOn(abgewichen, atStart()).log;
  assert.equal(a.length, 1);
  assert.equal(a[0].message, 'Hat schon gespielt.');
  assert.equal(a[0].confirm, true);
  assert.match(a[0].reason, /Dörfler 1: Leben: 2, started at 3/);

  const fehlt = guardOn(without(build(), 'Marker 1: Leben'), atStart()).log;
  assert.equal(fehlt.length, 1, 'ein fehlender Marker ist nicht am Start');
  assert.equal(fehlt[0].confirm, true);
  assert.match(fehlt[0].reason, /Dörfler 1: Leben: no marker, started at 3/);
});

test('DW 10: Startwert 0 – die 0 ist ein Platz und eine Zahl, ein fehlender Marker ist nicht 0', () => {
  const { state } = run({}, [{ type: 'seat_villager', seat: 1, villager: 'Quintus Binch' }]);
  const step = atStart({ zoneLabel: 'Dörfler 1: Präzision', villager: 'Quintus Binch' });
  const m = marker(state, 'Marker 1: Präzision');
  assert.ok(m, 'Quintus bekommt seinen Präzisionsmarker');
  assert.ok(ran(guardOn(state, step).log), 'Marker auf 0 liegt am Start');

  const fehlt = guardOn(without(state, 'Marker 1: Präzision'), step).log;
  assert.equal(fehlt.length, 1);
  assert.equal(fehlt[0].confirm, true);
  assert.match(fehlt[0].reason, /Dörfler 1: Präzision: no marker, started at 0/);
});

test('DW 11: kein Startwert oder unlesbar – Halt mit Diagnose, ohne Satz', () => {
  const foo = { ...ZONES.find(z => z.label === 'Dörfler 1: Mumm'), id: 'zfoo', label: 'Dörfler 1: Foo' };
  const zones = [...ZONES, foo];
  const hold = (step, text, s = build()) => {
    const { log } = run(s, [step, after], { zones });
    assert.equal(log.length, 1);
    assert.equal(log[0].status, 'skipped');
    assert.match(log[0].reason, text);
    assert.equal(log[0].message, undefined);
    assert.equal(log[0].confirm, undefined);
  };
  const leben = { zoneLabel: 'Dörfler 1: Leben' };
  hold(atStart({ ...leben, villager: undefined }), /no starting value: "Dörfler 1: Leben"/);
  hold(atStart({ ...leben, villager: '' }), /no starting value: "Dörfler 1: Leben"/);
  hold(atStart({ ...leben, villager: 'Nobody Nowhere' }), /no starting value: "Dörfler 1: Leben"/);
  hold(atStart({ zoneLabel: 'Dörfler 1: Foo' }), /no starting value: "Dörfler 1: Foo"/);

  const zwei = build();
  const m = marker(zwei, 'Marker 1: Leben');
  zwei.tokens.push({ id: 'max', label: 'Max', shape: 'image', size: 22, x: m.x + 2, y: m.y + 2 });
  hold(atStart(leben), /Dörfler 1: Leben: 2 objects/, zwei);
});

test('DW 12: `villager` nimmt einen Platzhalter – `$F1` ist der volle Name an Platz 1', () => {
  assert.ok(ran(guardOn(build(), atStart({ villager: '$F1' })).log));
  const abgewichen = putOn(build(), 'Marker 1: Leben', 'Dörfler 1: Leben', 2);
  assert.equal(guardOn(abgewichen, atStart({ villager: '$F1' })).log[0].message, 'Hat schon gespielt.');
});

test('DW 13: Unsinn in den Feldern wirft nie', () => {
  for (const over of [{ zoneLabel: 5 }, { above: {} }, { atStart: true, villager: [] }, { atStart: true, villager: {}, above: {} }]) {
    const { log } = guardOn(build(), guard(over));
    assert.ok(['skipped', 'failed'].includes(log[0].status), JSON.stringify(over));
  }
});

// ── Der Handler ist einer ───────────────────────────────────────────────────

test('DW 15: `require_marker` teilt sich den Handler mit `require_counter` (M6: keine zweite Haltelogik)', () => {
  const src = readFileSync(fileURLToPath(new URL('../../shared/sequenceExecutor.js', import.meta.url)), 'utf8');
  assert.match(src, /case 'require_counter':\s*\n\s*case 'require_marker':\s*\{/);
});
