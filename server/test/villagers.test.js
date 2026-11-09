// CL/CM / Spec M26.2 — einen Dörfler tauschen: `swap_villager`, die Platzhalter
// `$V1`/`$F1`, `anchorId` und die Wache `require_counter … atStart`.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Gebaut wird der Tisch **wie ihn die Kurzpartie baut**: dieselben Schritte
// (Auszug aus der Datenbank, mit den Umschreibungen aus
// `scripts/doerfler-daten.mjs`), dieselben Zonen (die einundzwanzig des
// Bausteins und die zwölf Leisten), dieselben Dörferdaten. Nichts wird von Hand
// in einen Zustand geschrieben, der den Aufbau nie hergestellt hätte.
// Begründung: `docs/tasks-doerfler.md`, CL und CM.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { resolveZones, anchorBoxes, assetBox } from '../../shared/anchoring.js';
import { zoneSlotNumbered, zoneCenter } from '../../shared/zoneGeometry.js';
import { seatedVillagers, seatVars, findVillager, markerStart } from '../../shared/villagers.js';
import { patchActions, VILLAGERS, ROSTER } from '../../scripts/doerfler-daten.mjs';
import {
  fx, ZONES, scenarioData, run, swap, copy, build, imKampf,
  tokenNamed, counterNamed, cardNamed, resolved, inZone,
} from './villager-table.js';

const asset = (name) => fx.assets.find(a => a.name === name);
const zone = (label) => ZONES.find(z => z.label === label);

// ── Der Ausgangstisch ───────────────────────────────────────────────────────

test('CL: der Aufbau legt Henlo, Fridgette und Granny an die drei Plätze', () => {
  const s = build();
  const seated = seatedVillagers(s, fx.assets, VILLAGERS);
  assert.deepEqual(seated.map(x => [x.n, x.name]), [[1, 'Henlo Bulwark'], [2, 'Fridgette Jones'], [3, 'Granny Melba']]);
  assert.ok(seated.every(x => x.data), 'jeder sitzende Dörfler ist in den Daten bekannt');
  // Die sechs Karten liegen in ihren Plätzen (BY, M26.1).
  assert.ok(inZone(s, cardNamed(s, 'ROSTIGE SICHEL'), 'Dörfler 1: Rechte Hand'));
  assert.ok(inZone(s, cardNamed(s, 'DAS ALTE EISEN'), 'Dörfler 3: Linke Hand'));
  assert.ok(inZone(s, cardNamed(s, 'OMMAS GEHSTOCK'), 'Dörfler 3: Rechte Hand'));
});

// ── CL: die Platzhalter ─────────────────────────────────────────────────────

test('CL: `seatVars` bindet Kurzname, Namen und Startwerte je Platz – aus dem Tisch', () => {
  const v = seatVars(build(), fx.assets, VILLAGERS);
  assert.equal(v.V1, 'Henlo');
  assert.equal(v.F1, 'Henlo Bulwark');
  assert.equal(v.V3, 'Granny');
  assert.equal(v.V1LEB, '3');
  assert.equal(v.V1PRZ, '-1');
  assert.equal(v.V3PRZ, '-2');
  assert.equal(v.V4, undefined, 'es gibt keinen vierten Platz');
});

test('CL: ein Schritt mit `$V1` trifft den Dörfler an Platz 1', () => {
  const s = build();
  const { state, log } = run(s, [{ type: 'set_counter', name: '$V1: Bewegung', value: '+2' }]);
  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.equal(counterNamed(state, 'Henlo: Bewegung').value, 7);
});

test('CL: ein Platz ohne Dörfler bindet nichts – der Schritt sagt es, statt zu raten', () => {
  const s = build();
  const { state, log } = run(s, [{ type: 'set_counter', name: '$V4: Bewegung', value: 1 }]);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /\$V4 is not bound/);
  assert.deepEqual(state.counters, s.counters);
});

test('CL: `reveal_next` löscht die Dörfler-Platzhalter nicht', () => {
  // `reveal_next` setzt `ctx.vars = {}` zurück; die Dörfler dürfen mitten in
  // „Kampf beginnen" nicht verschwinden (Zeile 1286 des Executors).
  const s = build();
  const leiste = { id: 'zl', label: 'Leiste', x: 1000, y: 100, width: 400, height: 80, accepts: ['asset'], capacity: 3, layout: 'row' };
  const boss = { id: 'bx', name: 'Bösewicht: Testmann', type: 'token', image_path: '/a.png', back_image_path: '/b.png', width: 60, height: 60 };
  const base = run(s, [{ type: 'place_asset', assetName: 'Bösewicht: Testmann', targetZoneLabel: 'Leiste', faceDown: true }],
    { zones: [...ZONES, leiste], assets: [...fx.assets, boss] }).state;
  const { state, log } = run(base, [
    { type: 'reveal_next', zoneLabel: 'Leiste' },
    { type: 'set_counter', name: '$V1: Bewegung', value: '+1' },
  ], { zones: [...ZONES, leiste], assets: [...fx.assets, boss] });
  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.equal(log[1].status, 'ok', log[1].reason);
  assert.equal(counterNamed(state, 'Henlo: Bewegung').value, 6);
});

// ── CM: der Tausch ──────────────────────────────────────────────────────────

test('CM: Henlo → Judy: Tableau, Spielstein und Zähler stehen an den Stellen der alten', () => {
  const s = build();
  const oldTableau = tokenNamed(s, 'Tableau: Henlo Bulwark')[0];
  const oldStone = tokenNamed(s, 'Henlo')[0];
  const oldCounters = Object.fromEntries(['Leben', 'Bewegung', 'Mumm', 'Präzision']
    .map(k => [k, counterNamed(s, `Henlo: ${k}`)]));

  const { state, log } = swap(s, 1, 'Judy Marks');
  assert.equal(log[0].status, 'ok', log[0].reason);

  const tableau = tokenNamed(state, 'Tableau: Judy Marks');
  assert.equal(tableau.length, 1);
  assert.deepEqual([tableau[0].x, tableau[0].y], [oldTableau.x, oldTableau.y]);
  assert.equal(tableau[0].locked, oldTableau.locked, 'das Schloss geht mit');
  assert.equal(tableau[0].anchorId, oldTableau.assetId, 'der Platz wird weitergereicht');
  assert.notEqual(tableau[0].assetId, oldTableau.assetId);

  const stone = tokenNamed(state, 'Judy');
  assert.equal(stone.length, 1);
  assert.deepEqual([stone[0].x, stone[0].y], [oldStone.x, oldStone.y]);

  // Die vier Zähler heißen nach Judy und stehen, wo Henlos standen.
  for (const [k, old] of Object.entries(oldCounters)) {
    const c = counterNamed(state, `Judy: ${k}`);
    assert.ok(c, `Judy: ${k} fehlt`);
    assert.deepEqual([c.x, c.y], [old.x, old.y], k);
    assert.equal(c.locked, old.locked);
  }
});

test('CM: Judys Zähler tragen ihre Startwerte; `max` hat nur Leben', () => {
  const { state } = swap(build(), 1, 'Judy Marks');
  const leben = counterNamed(state, 'Judy: Leben');
  assert.equal(leben.value, 3);
  assert.equal(leben.max, 3, 'das Maximum ist der Startwert, nicht das Spaltenende 10');
  assert.equal(leben.base, undefined);
  for (const [k, n] of [['Bewegung', 4], ['Mumm', 3], ['Präzision', 1]]) {
    const c = counterNamed(state, `Judy: ${k}`);
    assert.equal(c.value, n, k);
    assert.equal(c.base, n, k);
    assert.equal(c.max, undefined, `${k} trägt kein max`);
  }
});

test('CM: die Marker stehen auf den Startwerten des Neuen', () => {
  const { state } = swap(build(), 1, 'Judy Marks');
  const zonen = resolved(state);
  for (const [k, n] of [['Leben', 3], ['Bewegung', 4], ['Mumm', 3], ['Präzision', 1]]) {
    const marker = tokenNamed(state, `Marker 1: ${k}`);
    assert.equal(marker.length, 1, `Marker 1: ${k} ist ${marker.length}-mal da`);
    const soll = zoneSlotNumbered(zonen.find(z => z.label === `Dörfler 1: ${k}`), n);
    assert.ok(Math.abs(marker[0].x - soll.x) < 1e-6 && Math.abs(marker[0].y - soll.y) < 1e-6, `${k}: ${n}`);
  }
});

test('CM: Judys Startausrüstung – zwei Karten in ihren Plätzen, drei Gemälde im Vorrat', () => {
  const { state } = swap(build(), 1, 'Judy Marks');
  assert.ok(inZone(state, cardNamed(state, 'RIESENPINSEL'), 'Dörfler 1: Rechte Hand'));
  assert.ok(inZone(state, cardNamed(state, 'KÜNSTLERSCHÄRPE'), 'Dörfler 1: Brust'));
  for (const name of ['„ACH, WIE SCHÖN!“', '„KLARER HIMMEL“', '„DIE GROSSE REISE“']) {
    assert.ok(inZone(state, cardNamed(state, name), 'Ausrüstung Dörfler 1'), `${name} liegt nicht im Vorrat`);
  }
});

test('CM: Granny → Blopsy: drei Stücke in drei Plätzen', () => {
  const { state, log } = swap(build(), 3, 'Blopsy Twins');
  assert.equal(log[0].status, 'ok', log[0].reason);
  assert.ok(inZone(state, cardNamed(state, 'BLECHERNE TRÖTE'), 'Dörfler 3: Rechte Hand'));
  assert.ok(inZone(state, cardNamed(state, 'MIESES MESSER'), 'Dörfler 3: Linke Hand'));
  assert.ok(inZone(state, cardNamed(state, 'KRISTALLKUGEL'), 'Dörfler 3: Mitbringsel'));
});

test('CM: vom alten Dörfler ist nichts übrig – kein Zähler, keine Karte, keine Figur, kein Tableau', () => {
  const s = build();
  // Eine Figur, die jemand von Hand auf den Tisch gelegt hat und liegen ließ.
  const figur = run(s, [{ type: 'place_asset', assetName: 'Henlo Bulwark', x: 900, y: 400 }]).state;
  assert.equal(tokenNamed(figur, 'Henlo Bulwark').length, 1);

  const { state } = swap(figur, 1, 'Judy Marks');
  assert.equal(tokenNamed(state, 'Tableau: Henlo Bulwark').length, 0);
  assert.equal(tokenNamed(state, 'Henlo').length, 0, 'der Spielstein');
  assert.equal(tokenNamed(state, 'Henlo Bulwark').length, 0, 'die Figur');
  assert.deepEqual(state.counters.filter(c => /^Henlo/.test(c.name)), []);
  for (const name of ['BAUERNLATZHOSE', 'ROSTIGE SICHEL']) assert.equal(cardNamed(state, name), undefined, name);
  assert.equal(JSON.stringify(state).includes('Henlo'), false, 'irgendwo steht noch Henlo');
});

test('CM: die anderen Plätze bleiben Zeichen für Zeichen, wie sie waren', () => {
  const s = build();
  const { state } = swap(s, 1, 'Judy Marks');
  const keep = (st) => JSON.stringify({
    tokens: st.tokens.filter(t => /Fridgette|Granny|Marker [23]|Hauptplan/.test(t.label)),
    counters: st.counters.filter(c => /^(Fridgette|Granny)/.test(c.name)),
    cards: st.cards.filter(c => ['GEFRIERFACHTÜR', 'KÜHL-PACK', 'OMMAS GEHSTOCK', 'DAS ALTE EISEN'].includes(c.name)),
  });
  assert.equal(keep(state), keep(s));
});

test('CM: die Zonen des Platzes lösen sich gegen das neue Tableau auf – auch nach dem Speichern', () => {
  const { state } = swap(build(), 1, 'Judy Marks');
  const stand = JSON.parse(JSON.stringify(state));               // getGameState → Datenbank → loadGameState
  for (const st of [state, stand]) {
    const zonen = resolved(st).filter(z => /^(Dörfler 1: |Ausrüstung Dörfler 1)/.test(z.label));
    assert.ok(zonen.length >= 11, 'die Zonen des ersten Platzes');
    assert.deepEqual(zonen.filter(z => z.anchorMissing).map(z => z.label), []);
  }
  // Ohne `anchorId` wären sie `anchorMissing` – das ist der Befund (Spec 4).
  const ohne = copy(state);
  for (const t of ohne.tokens) delete t.anchorId;
  assert.ok(resolved(ohne).some(z => /^Dörfler 1: /.test(z.label) && z.anchorMissing));
  // Und der Tisch weiß danach weiter, wer wo sitzt.
  assert.deepEqual(seatedVillagers(stand, fx.assets, VILLAGERS).map(x => x.name), ['Judy Marks', 'Fridgette Jones', 'Granny Melba']);
});

test('CM: ein zweiter Tausch am selben Platz reicht den Platz weiter', () => {
  const eins = swap(build(), 1, 'Judy Marks').state;
  const { state, log } = swap(eins, 1, 'Norman Fishboy');
  assert.equal(log[0].status, 'ok', log[0].reason);
  const t = tokenNamed(state, 'Tableau: Norman Fishboy')[0];
  assert.equal(t.anchorId, asset('Tableau: Henlo Bulwark').id);
  assert.equal(tokenNamed(state, 'Tableau: Judy Marks').length, 0);
  assert.ok(inZone(state, cardNamed(state, 'FISCHMÜTZE'), 'Dörfler 1: Kopf'));
  assert.equal(cardNamed(state, 'RIESENPINSEL'), undefined);
  assert.equal(cardNamed(state, '„KLARER HIMMEL“'), undefined, 'Judys Gemälde gehen mit');
});

test('CM: gekaufte Ausrüstung bleibt liegen, die Startausrüstung geht', () => {
  const s = build();
  // Ein Stück aus dem Laden, im Vorrat von Platz 1.
  const mitKauf = run(s, [{ type: 'place_card', cardName: 'ALTE MASKE', targetZoneLabel: 'Ausrüstung Dörfler 1' }]).state;
  assert.ok(cardNamed(mitKauf, 'ALTE MASKE'));
  const { state } = swap(mitKauf, 1, 'Quintus Binch');
  assert.ok(cardNamed(state, 'ALTE MASKE'), 'das gekaufte Stück wurde mitgenommen');
  assert.equal(cardNamed(state, 'ROSTIGE SICHEL'), undefined);
  assert.ok(cardNamed(state, 'GUMMIKNÜPPEL'));
});

test('CM: ist der Platz einer neuen Karte belegt, geht sie in den Vorrat – und der Tausch sagt es', () => {
  const s = build();
  // Etwas Gekauftes liegt in `Kopf` (Henlo trägt dort nichts); Norman bringt die
  // Fischmütze mit, und die gehört genau dorthin.
  const mitKauf = run(s, [{ type: 'place_card', cardName: 'ALTE MASKE', targetZoneLabel: 'Dörfler 1: Kopf' }]).state;
  assert.ok(inZone(mitKauf, cardNamed(mitKauf, 'ALTE MASKE'), 'Dörfler 1: Kopf'));
  const { state, log } = swap(mitKauf, 1, 'Norman Fishboy');
  assert.equal(log[0].status, 'note', log[0].reason);
  assert.match(log[0].reason, /FISCHMÜTZE/);
  assert.match(log[0].reason, /Ausrüstung Dörfler 1/);
  assert.ok(inZone(state, cardNamed(state, 'FISCHMÜTZE'), 'Ausrüstung Dörfler 1'));
  assert.ok(inZone(state, cardNamed(state, 'ALTE MASKE'), 'Dörfler 1: Kopf'), 'der Kauf bleibt, wo er liegt');
  assert.ok(inZone(state, cardNamed(state, 'BEWÄHRTE ANGEL'), 'Dörfler 1: Rechte Hand'), 'der Rest kommt an seinen Platz');
});

test('CM: Georgie Irongut tauscht – und meldet, dass seine Werte ungeprüft sind', () => {
  const { state, log } = swap(build(), 2, 'Georgie Irongut');
  assert.equal(log[0].status, 'note');
  assert.match(log[0].reason, /Foto/);
  assert.equal(tokenNamed(state, 'Tableau: Georgie Irongut').length, 1);
  assert.equal(counterNamed(state, 'Georgie: Mumm').value, 4);
  assert.ok(inZone(state, cardNamed(state, 'PAPAS KNALLKOPF'), 'Dörfler 2: Rechte Hand'));
  assert.ok(inZone(state, cardNamed(state, 'MUFFIGER KUCHEN'), 'Dörfler 2: Mitbringsel'));
});

// ── Alles oder nichts ───────────────────────────────────────────────────────

const unveraendert = (vorher, nachher) => assert.equal(JSON.stringify(nachher), JSON.stringify(vorher));

test('CM: ein unbekannter Dörfler lässt den Tisch unverändert', () => {
  const s = build();
  const { state, log } = swap(s, 1, 'Niemand Namenlos');
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Niemand Namenlos/);
  unveraendert(s, state);
});

test('CM: ein unbekannter Platz lässt den Tisch unverändert', () => {
  const s = build();
  for (const seat of [0, 4, 'x', undefined]) {
    const { state, log } = swap(s, seat, 'Judy Marks');
    assert.equal(log[0].status, 'skipped', String(seat));
    unveraendert(s, state);
  }
});

test('CM: ein Dörfler, der schon sitzt, wird nicht zweimal gesetzt', () => {
  const s = build();
  const same = swap(s, 1, 'Henlo Bulwark');
  assert.equal(same.log[0].status, 'skipped');
  unveraendert(s, same.state);
  const other = swap(s, 1, 'Fridgette Jones');
  assert.equal(other.log[0].status, 'skipped');
  assert.match(other.log[0].reason, /seat 2/);
  unveraendert(s, other.state);
});

test('CM: fehlt ein Asset des Neuen, passiert nichts – kein halber Dörfler', () => {
  const s = build();
  const ohne = fx.assets.filter(a => a.name !== 'Marker 1: Mumm');
  const { state, log } = swap(s, 1, 'Judy Marks', { assets: ohne });
  assert.notEqual(log[0].status, 'ok');
  assert.match(log[0].reason, /Marker 1: Mumm/);
  unveraendert(s, state);
  const ohneTableau = fx.assets.filter(a => a.name !== 'Tableau: Judy Marks');
  const r = swap(s, 1, 'Judy Marks', { assets: ohneTableau });
  assert.notEqual(r.log[0].status, 'ok');
  unveraendert(s, r.state);
});

test('CM: fehlt eine Karte der Bibliothek, passiert nichts', () => {
  const s = build();
  const ohne = fx.cards.filter(c => c.name !== 'FISCHMÜTZE');
  const { state, log } = swap(s, 1, 'Norman Fishboy', { cards: ohne });
  assert.notEqual(log[0].status, 'ok');
  assert.match(log[0].reason, /FISCHMÜTZE/);
  unveraendert(s, state);
});

test('CM: ohne Dörferdaten tut der Schritt nichts und sagt es', () => {
  const s = build();
  const { state, log } = swap(s, 1, 'Judy Marks', { scenarioData: {} });
  assert.equal(log[0].status, 'skipped');
  unveraendert(s, state);
});

test('CM: ein Platz, an dem niemand sitzt, wird nicht erfunden', () => {
  const s = build();
  const leer = copy(s);
  leer.tokens = leer.tokens.filter(t => t.label !== 'Tableau: Granny Melba');
  const { state, log } = swap(leer, 3, 'Judy Marks');
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /nobody sits at seat 3/);
  unveraendert(leer, state);
});

// ── Die Wache: `require_counter … atStart` ──────────────────────────────────

const HENLO = ['Henlo: Leben', 'Henlo: Bewegung', 'Henlo: Mumm', 'Henlo: Präzision'];
const guard = (over = {}) => ({ type: 'require_counter', name: HENLO, atStart: true, confirm: true, message: 'Henlo hat schon gespielt.', ...over });
const marker = { type: 'set_counter', name: 'Münzen', value: 1 };

test('CM: am Start läuft die Wache durch', () => {
  const { log } = run(build(), [guard(), swap_step()]);
  assert.deepEqual(log.map(e => e.status), ['ok', 'ok']);
});
function swap_step() { return { type: 'swap_villager', seat: 1, villager: 'Judy Marks' }; }

test('CM: steht ein Zähler nicht mehr auf dem Startwert, fragt sie – und tauscht nicht', () => {
  for (const [name, wert] of [['Henlo: Bewegung', '+1'], ['Henlo: Leben', '-1'], ['Henlo: Präzision', 0]]) {
    const s = run(build(), [{ type: 'set_counter', name, value: wert }]).state;
    const { state, log } = run(s, [guard(), swap_step()]);
    assert.equal(log.length, 1, 'die Schritte dahinter bekommen keine eigene Zeile');
    assert.equal(log[0].status, 'skipped', name);
    assert.equal(log[0].confirm, true, name);
    assert.equal(log[0].message, 'Henlo hat schon gespielt.');
    assert.match(log[0].reason, /1 further step skipped/);
    unveraendert(s, state);
  }
});

test('CM: ohne `confirm` hält die Wache hart an', () => {
  const s = run(build(), [{ type: 'set_counter', name: 'Henlo: Mumm', value: '+1' }]).state;
  const { log } = run(s, [guard({ confirm: false }), swap_step()]);
  assert.equal(log[0].status, 'skipped');
  assert.equal(log[0].confirm, undefined);
});

test('CM: „Trotzdem" – dieselbe Folge ohne die Wache tauscht', () => {
  const s = run(build(), [{ type: 'set_counter', name: 'Henlo: Bewegung', value: '+3' }]).state;
  const { state, log } = run(s, [swap_step()]);
  assert.equal(log[0].status, 'ok');
  assert.equal(counterNamed(state, 'Judy: Bewegung').value, 4, 'erspielte Werte sind weg, der Startwert gilt');
});

test('CM: ein Zähler, den es nicht gibt, ist keine erfüllte Bedingung', () => {
  const { log } = run(build(), [guard({ name: ['Henlo: Leben', 'Gibt: Es nicht'] })]);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Gibt: Es nicht/);
});

test('CM: `atStart` liest Ausgangswert vor Maximum, und ohne beides lässt es sich nicht prüfen', () => {
  const s = build();
  const frei = copy(s);
  frei.counters.push({ id: 'k', name: 'Münzen', value: 5, x: 0, y: 0, locked: false });
  const { log } = run(frei, [guard({ name: ['Münzen'] })]);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /no starting value/);
});

test('CM: die Wache über den Kampf – `require_zone` hält an, wenn ein Kampf läuft', () => {
  const s = build();
  const imKampf = copy(s);
  imKampf.tokens.push({ id: 'b', label: 'Tableau: Waggums', assetId: 'x', x: 2050, y: 500, shape: 'image', size: 300 });
  const wache = { type: 'require_zone', zoneLabel: 'Bösewicht-Tableau', expect: 'empty', message: 'Erst den Kampf beenden.' };
  const gesperrt = run(imKampf, [wache, swap_step()]);
  assert.equal(gesperrt.log.length, 1);
  assert.equal(gesperrt.log[0].message, 'Erst den Kampf beenden.');
  unveraendert(imKampf, gesperrt.state);
  const frei = run(s, [wache, swap_step()]);
  assert.deepEqual(frei.log.map(e => e.status), ['ok', 'ok']);
});

// ── CL: die Aktionen nach einem Tausch ──────────────────────────────────────

const dorfphase = (actions) => actions.find(a => a.id === 'dorfphase-beginnen').steps;
test('CL: ohne Tausch läuft „Dorfphase beginnen" nach der Umschreibung wie vorher', () => {
  // Ein Spielstand mit verbrauchten Werten und verschobenen Markern.
  const verbraucht = run(imKampf(build()), [
    { type: 'set_counter', name: 'Henlo: Leben', value: '-2' },
    { type: 'set_counter', name: 'Granny: Mumm', value: '+4' },
    { type: 'set_counter', name: 'Fridgette: Präzision', value: '-1' },
    { type: 'move', assetName: 'Marker 1: Leben', x: 10, y: 10 },
    { type: 'move', assetName: 'Marker 2: Bewegung', x: 20, y: 20 },
  ]).state;
  const vorher = run(verbraucht, dorfphase(fx.actionsBefore));
  const nachher = run(verbraucht, dorfphase(patchActions(fx.actionsBefore)));
  assert.equal(JSON.stringify(nachher.state), JSON.stringify(vorher.state));
  assert.deepEqual(nachher.log.map(e => [e.type, e.status]), vorher.log.map(e => [e.type, e.status]));
  // …und es hat tatsächlich etwas getan: Henlo ist zurückgesetzt.
  assert.equal(counterNamed(nachher.state, 'Henlo: Leben').value, 3);
  assert.equal(counterNamed(nachher.state, 'Granny: Mumm').value, 2);
});

test('CL: nach dem Tausch setzt „Dorfphase beginnen" **Judy** zurück, nicht Henlo', () => {
  const getauscht = swap(build(), 1, 'Judy Marks').state;
  const verbraucht = run(imKampf(getauscht), [
    { type: 'set_counter', name: 'Judy: Leben', value: '-2' },
    { type: 'set_counter', name: 'Judy: Bewegung', value: '+5' },
    { type: 'move', assetName: 'Marker 1: Bewegung', x: 10, y: 10 },
  ]).state;
  const { state, log } = run(verbraucht, dorfphase(patchActions(fx.actionsBefore)));
  assert.equal(log.find(e => e.status === 'failed'), undefined);
  assert.equal(counterNamed(state, 'Judy: Leben').value, 3);
  assert.equal(counterNamed(state, 'Judy: Bewegung').value, 4);
  // Der Marker steht auf Judys Startwert 4, nicht auf Henlos 5.
  const zonen = resolved(state);
  const soll = zoneSlotNumbered(zonen.find(z => z.label === 'Dörfler 1: Bewegung'), 4);
  const m = tokenNamed(state, 'Marker 1: Bewegung')[0];
  assert.ok(Math.abs(m.x - soll.x) < 1e-6 && Math.abs(m.y - soll.y) < 1e-6);
  // Und nichts von Henlo ist wieder aufgetaucht.
  assert.equal(JSON.stringify(state).includes('Henlo'), false);
  // Die Wache über die Lebenszähler fragt nach Judy, nicht nach Henlo.
  assert.deepEqual(log.filter(e => e.status !== 'ok' && /Judy|Henlo/.test(String(e.reason))), []);
});

test('CL: ohne die Umschreibung bräche „Dorfphase beginnen" nach dem Tausch – der Beleg für CL', () => {
  const getauscht = swap(build(), 1, 'Judy Marks').state;
  const verbraucht = run(imKampf(getauscht), [{ type: 'move', assetName: 'Marker 1: Bewegung', x: 10, y: 10 }]).state;

  // 1. Die Wache über die Lebenszähler (Schritt 2) fragt nach „Henlo: Leben" –
  //    den es nicht mehr gibt. Sie hält die ganze Aktion an: nichts wird
  //    abgeräumt, keine Dorfphase beginnt.
  const alt = run(verbraucht, dorfphase(fx.actionsBefore));
  assert.equal(alt.log.length, 2, 'die Aktion hält an der Wache');
  assert.match(alt.log[1].reason, /no counter named "Henlo: Leben"/);
  assert.equal(JSON.stringify(alt.state), JSON.stringify(verbraucht), 'nichts wurde angefasst');

  // 2. Selbst ohne die Wache wäre es falsch, aber leise: Henlos Zähler gibt es
  //    nicht, die Schritte werden übersprungen, und der Marker springt auf
  //    **Henlos** Startwert 5 statt auf Judys 4.
  const ohneWache = dorfphase(fx.actionsBefore).filter(s => s.type !== 'require_counter');
  const { state, log } = run(verbraucht, ohneWache);
  assert.ok(log.some(e => e.status === 'skipped' && /no counter named "Henlo: /.test(e.reason)));
  const zonen = resolved(state);
  const m = tokenNamed(state, 'Marker 1: Bewegung')[0];
  const henlo = zoneSlotNumbered(zonen.find(z => z.label === 'Dörfler 1: Bewegung'), 5);
  assert.ok(Math.abs(m.x - henlo.x) < 1e-6 && Math.abs(m.y - henlo.y) < 1e-6);
  assert.equal(counterNamed(state, 'Judy: Bewegung').value, 4, 'Judys Zähler blieben unangetastet stehen');
});

// ── anchorId ────────────────────────────────────────────────────────────────

test('M26: `assetBox` nennt als Id den Platz, wenn das Tableau einen trägt', () => {
  const box = assetBox({ assetId: 'judy', anchorId: 'henlo', x: 300, y: 1600, width: 300, height: 400 });
  assert.equal(box.id, 'henlo');
  assert.equal(assetBox({ assetId: 'henlo', x: 300, y: 1600, width: 300, height: 400 }).id, 'henlo');
  // Ein Token ohne `assetId`, aber mit `anchorId`, ist trotzdem ein Anker.
  assert.equal(assetBox({ anchorId: 'a', x: 0, y: 0, size: 40 }).id, 'a');
});

test('CK: `findVillager` findet nach vollem Namen, egal wie geschrieben', () => {
  assert.equal(findVillager(VILLAGERS, 'judy marks').name, 'Judy Marks');
  assert.equal(findVillager(VILLAGERS, ' Judy Marks ').short, 'Judy');
  assert.equal(findVillager(VILLAGERS, 'Judy'), null, 'der Kurzname ist kein Name');
  assert.equal(findVillager({}, 'Judy Marks'), null);
  assert.equal(Object.keys(ROSTER).length, 9);
  assert.equal(zoneCenter(zone('Dörfler 1: Kopf')).x > 0, true);
});

// ── markerStart (DW, M30.7) ─────────────────────────────────────────────────

test('DW: `markerStart` nennt den Startwert aus dem Roster, nach Zonenname', () => {
  assert.equal(markerStart(VILLAGERS, 'Henlo Bulwark', 'Dörfler 1: Mumm'), 2);
  assert.equal(markerStart(VILLAGERS, 'Granny Melba', 'Dörfler 3: Präzision'), -2);
  assert.equal(markerStart(VILLAGERS, 'henlo bulwark', 'Dörfler 1: Mumm'), 2, 'Groß-/Kleinschreibung egal (findVillager)');
});

test('DW: `markerStart` rät nicht - was fehlt, ist `undefined`', () => {
  assert.equal(markerStart(VILLAGERS, 'Nobody Nowhere', 'Dörfler 1: Mumm'), undefined, 'unbekannter Dörfler');
  assert.equal(markerStart(VILLAGERS, 'Henlo Bulwark', 'Mumm'), undefined, 'Zonenname ohne ": "');
  assert.equal(markerStart(VILLAGERS, 'Henlo Bulwark', 'Dörfler 1: Foo'), undefined, 'kein Wert aus STATS');
  assert.equal(markerStart({}, 'Henlo Bulwark', 'Dörfler 1: Mumm'), undefined, 'leere villagers');
  assert.equal(markerStart(VILLAGERS, '', 'Dörfler 1: Mumm'), undefined);
  assert.equal(markerStart(VILLAGERS, undefined, undefined), undefined);
});
