// EC / Spec M30.3, M30.4, M30.9 — die Dörferwahl als Daten: `scripts/setupwahl-daten.mjs`, Schritt `optionen`.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Zwei Teile. Der erste prüft die **reinen** Funktionen des Bausteins (`patchOptionen`, `beweise`,
// `rosterProbleme`) gegen die Fixture `fixtures/setupwahl-kurzpartie.json` (die drei Spalten der
// Kurzpartie **vor** EC, als Text, so wie die Datenbank sie hält) und gegen die Maschinerie, die den Aufbau
// ausführt; Bibliothek, Assets, Raster, Zonen und Ausgangszustand kommen aus `auslagen-kurzpartie.json`
// (dort liegen die 54 Zonen der Produktion). Der zweite lässt `main` gegen eine Wegwerf-Datenbank laufen
// (`--check`, `--write`, der zweite Lauf, `--zurueck`). Die Produktion berührt kein Test.
//
// Die Zahlen (Längen, Hashes) stehen **einmal** im Skript (`SCHRITTE`); hier werden sie importiert.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto, { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

import { seatedVillagers } from '../../shared/villagers.js';
import { validateOptions, resolveChoices } from '../../shared/setupOptions.js';
import { validateScenarioData } from '../../shared/scenarioData.js';
import { resolveZones, anchorBoxes } from '../../shared/anchoring.js';
import { zoneSlotNumberAt, zoneSlotNumbered, zoneContains } from '../../shared/zoneGeometry.js';
import { executeSequenceWithLog } from '../../shared/sequenceExecutor.js';
import { swapAction } from '../../client/src/utils/swapVillager.js';
import { bauen, ohneIds, seededRng } from '../../scripts/auslagen-daten.mjs';

const {
  SCHRITTE, GAME_ID, SETUP_ID, patchOptionen, beweise, rosterProbleme, sicherungsHash, main,
  patchZaehler, beweiseZaehler, patchBoss, beweiseBoss,
} = await import('../../scripts/setupwahl-daten.mjs');
const { default: Database } = await import('better-sqlite3');

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const sw = lies('setupwahl-kurzpartie.json');
const { assets, cards, zones, grids, state } = lies('auslagen-kurzpartie.json');

const copy = (x) => JSON.parse(JSON.stringify(x));
const text = (x) => JSON.stringify(x);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

const scenario = JSON.parse(sw.scenario);
const sequence = JSON.parse(sw.sequence);
const actions = JSON.parse(sw.actions);
const ziel = patchOptionen(scenario, sequence);
const AUSGANG = SCHRITTE.optionen.ausgang, ZIEL = SCHRITTE.optionen.ziel;

/** Die neun Dörfler in der Reihenfolge des Rosters: voller Name, Kurzname. */
const NEUN = [
  ['Henlo Bulwark', 'Henlo'], ['Fridgette Jones', 'Fridgette'], ['Granny Melba', 'Granny'],
  ['Blopsy Twins', 'Blopsy'], ['Georgie Irongut', 'Georgie'], ['Judy Marks', 'Judy'],
  ['Norman Fishboy', 'Norman'], ['Quintus Binch', 'Quintus'], ['Yancy Plover', 'Yancy'],
];
const VORGABE = ['Henlo', 'Fridgette', 'Granny'];

// ── Die Fixture ─────────────────────────────────────────────────────────────

test('EC: die Fixture ist der Ausgangsstand – drei Spalten als Text, Länge und Hash, `scenario` und `sequence` gleich den Konstanten', () => {
  for (const [spalte, t] of [['sequence', sw.sequence], ['scenario', sw.scenario], ['actions', sw.actions]]) {
    assert.equal(typeof t, 'string', `${spalte} steht als Text da`);
    assert.equal(sha(t), sw.sha[spalte], `${spalte}: der Hash der Fixture`);
    assert.equal(text(JSON.parse(t)), t, `${spalte} ist kompaktes JSON.stringify, wie die Datenbank es hält`);
  }
  assert.equal(sw.sha.actions, '63abf4174038', 'action_data: Ausgang und Ziel sind gleich (EC ändert die Spalte nicht)');
  assert.deepEqual([sw.scenario.length, sha(sw.scenario)], [AUSGANG.scenario.laenge, AUSGANG.scenario.sha]);
  assert.deepEqual([sw.sequence.length, sha(sw.sequence)], [AUSGANG.sequence.laenge, AUSGANG.sequence.sha]);
  assert.deepEqual(Object.keys(scenario.options), ['partie', 'troedel']);
  assert.equal(sequence.length, 31);
  assert.equal(sw.setupId, SETUP_ID);
});

// ── 1. Der Zielstand ────────────────────────────────────────────────────────

test('EC 1: Zielstand – Länge und Hash beider Spalten, so wie sie das Skript als Konstanten trägt', () => {
  assert.equal(ziel.art, 'zu-schreiben', (ziel.probleme ?? []).join('\n'));
  const sc = text(ziel.scenario), sq = text(ziel.sequence);
  assert.deepEqual([sc.length, sha(sc)], [ZIEL.scenario.laenge, ZIEL.scenario.sha]);
  assert.deepEqual([sq.length, sha(sq)], [ZIEL.sequence.laenge, ZIEL.sequence.sha]);
});

test('EC 1: alles andere bleibt byteweise gleich – `partie`, `troedel`, jeder übrige Schlüssel, die Reihenfolge, 28 der 31 Schritte', () => {
  const a = scenario, b = ziel.scenario;
  for (const k of ['partie', 'troedel']) assert.equal(text(b.options[k]), text(a.options[k]), k);
  for (const k of Object.keys(a).filter(x => x !== 'options')) assert.equal(text(b[k]), text(a[k]), `scenario_data.${k}`);
  // Dieselbe Reihenfolge der obersten Schlüssel (der Text ist Teil des Hashes) – `options` bleibt an seinem Platz.
  assert.deepEqual(Object.keys(b), Object.keys(a));
  assert.deepEqual(Object.keys(b.options), ['partie', 'troedel', 'doerfler1', 'doerfler2', 'doerfler3']);
  const ungleich = sequence.map((s, i) => i).filter(i => text(sequence[i]) !== text(ziel.sequence[i]));
  assert.deepEqual(ungleich, [25, 26, 27]);
  assert.equal(ziel.sequence.length, 31);
  // Von den drei Schritten ändert sich nur `villager`.
  for (const i of ungleich) {
    const { villager: alt, ...restAlt } = sequence[i], { villager: neu, ...restNeu } = ziel.sequence[i];
    assert.deepEqual(restNeu, restAlt);
    assert.notEqual(neu, alt);
  }
});

test('EC 1: Rückwärtsbeweis – im neuen Text die drei Schlüssel weg, die drei `villager` zurück: der gelesene Text, Zeichen für Zeichen', () => {
  const sc = copy(ziel.scenario);
  for (const k of ['doerfler1', 'doerfler2', 'doerfler3']) delete sc.options[k];
  assert.equal(text(sc), sw.scenario);
  const sq = copy(ziel.sequence);
  ['Henlo Bulwark', 'Fridgette Jones', 'Granny Melba'].forEach((n, i) => { sq[25 + i].villager = n; });
  assert.equal(text(sq), sw.sequence);
  // Und der Baustein sagt dasselbe, auf dem echten Paar.
  assert.deepEqual(beweise({ scenario, sequence }, ziel), []);
});

test('EC 1: der Beweis fängt, was nicht stimmt – ein veränderter Schlüssel, ein veränderter Schritt, ein verschobener Eintrag', () => {
  const vor = { scenario, sequence };
  const a = copy(ziel); a.scenario.options.partie.label += '!';
  assert.ok(beweise(vor, a).some(m => /scenario_data/.test(m)), 'ein fremder Eintrag in options');
  const b = copy(ziel); b.scenario.terrainCards['Auslöser'] = 'Anderes';
  assert.ok(beweise(vor, b).some(m => /scenario_data/.test(m)), 'ein anderer Schlüssel');
  const c = copy(ziel); c.sequence[24].count = 7;
  assert.ok(beweise(vor, c).some(m => /sequence_data/.test(m)), 'ein Schritt neben den dreien');
  const d = copy(ziel); d.sequence[26].seat = 9;
  assert.ok(beweise(vor, d).some(m => /sequence_data/.test(m)), 'ein Feld neben `villager`');
  const e = copy(ziel); e.scenario = { options: e.scenario.options, ...Object.fromEntries(Object.entries(e.scenario).filter(([k]) => k !== 'options')) };
  assert.ok(beweise(vor, e).some(m => /scenario_data/.test(m)), 'die Reihenfolge der Schlüssel');
});

// ── 2. Die Optionen im Wortlaut ─────────────────────────────────────────────

test('EC 2: `doerfler1`–`doerfler3` – Label, Vorgabe, neun Wahlen in der Reihenfolge des Rosters, Variable `Doerfler<n>`', () => {
  assert.deepEqual(Object.keys(scenario.villagers.roster), NEUN.map(([name]) => name));
  for (const n of [1, 2, 3]) {
    const o = ziel.scenario.options[`doerfler${n}`];
    assert.deepEqual(Object.keys(o), ['label', 'default', 'choices']);
    assert.equal(o.label, `Dörfler ${n}`);
    assert.equal(o.default, VORGABE[n - 1]);
    assert.deepEqual(Object.keys(o.choices), NEUN.map(([, kurz]) => kurz), 'Schlüssel = Kurzname, in Roster-Reihenfolge');
    for (const [name, kurz] of NEUN) {
      assert.equal(scenario.villagers.roster[name].short, kurz);
      assert.equal(text(o.choices[kurz]), text({ label: name, vars: { [`Doerfler${n}`]: name } }), `${n}: ${kurz}`);
    }
  }
});

test('EC 2: die drei Schritte nennen `$optDoerfler<n>`, in Reihenfolge der Plätze – sonst nichts', () => {
  [1, 2, 3].forEach((n, i) => assert.equal(text(ziel.sequence[25 + i]), text({ type: 'seat_villager', seat: n, villager: `$optDoerfler${n}` })));
  assert.ok(!ziel.sequence.some((s, i) => ![25, 26, 27].includes(i) && /Doerfler/.test(text(s))));
});

// ── 3. Die Prüfer ───────────────────────────────────────────────────────────

test('EC 3: `validateOptions`, `validateScenarioData` und die Wahlen gegen das Roster – keine Beanstandung', () => {
  assert.deepEqual(validateOptions(ziel.scenario.options, ziel.sequence, actions), []);
  assert.deepEqual(validateScenarioData(ziel.scenario, { assets, grids, cards }), []);
  assert.deepEqual(rosterProbleme(ziel.scenario), []);
  // Die Vorgabe löst auf: jede Option hat eine Wahl, drei Variablen.
  const r = resolveChoices(ziel.scenario.options, {});
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.choices, { partie: 'kurz', troedel: 'mit', doerfler1: 'Henlo', doerfler2: 'Fridgette', doerfler3: 'Granny' });
});

test('EC 3: jede Wahl nennt einen Dörfler, den es gibt – Namen im Roster umbenannt, ohne die Option mitzuziehen, ist ein Problem (das prüft der Baustein, nicht `validateOptions`)', () => {
  const kaputt = copy(ziel.scenario);
  // „Judy Marks“ im Roster umbenennen, an derselben Stelle (die Reihenfolge bleibt).
  kaputt.villagers.roster = Object.fromEntries(Object.entries(kaputt.villagers.roster).map(([k, v]) => [k === 'Judy Marks' ? 'Judy Markus' : k, v]));
  const p = rosterProbleme(kaputt);
  assert.ok(p.length >= 3, `eine Meldung je Option: ${p.join(' | ')}`);
  for (const n of [1, 2, 3]) assert.ok(p.some(m => m.includes(`doerfler${n}`) && m.includes('Judy Marks')), `doerfler${n} nennt „Judy Marks“`);
  // `validateOptions` kennt das Roster nicht – es bleibt unverändert und schweigt (Spec, „Wo die Spec nicht stimmt“ Nr. 7).
  assert.deepEqual(validateOptions(kaputt.options, ziel.sequence, actions), []);

  // Ein Tippfehler in nur einer Wahl: genau diese wird genannt.
  const tipp = copy(ziel.scenario);
  tipp.options.doerfler2.choices.Henlo.vars.Doerfler2 = 'Henlo Bulwerk';
  const q = rosterProbleme(tipp);
  assert.equal(q.length, 1, q.join(' | '));
  assert.match(q[0], /doerfler2/);
  assert.match(q[0], /Henlo Bulwerk/);
  assert.deepEqual(validateOptions(tipp.options, ziel.sequence, actions), [], '… und auch das sieht validateOptions nicht');

  // Schlüssel und Kurzname, Vorgabe, Reihenfolge: auch das ist Sache des Bausteins.
  const schluessel = copy(ziel.scenario);
  schluessel.options.doerfler3.choices = Object.fromEntries(Object.entries(schluessel.options.doerfler3.choices).reverse());
  assert.ok(rosterProbleme(schluessel).some(m => /doerfler3/.test(m) && /Reihenfolge/.test(m)));
  const vorgabe = copy(ziel.scenario);
  vorgabe.options.doerfler1.default = 'Nobody';
  assert.ok(rosterProbleme(vorgabe).some(m => /doerfler1/.test(m) && /default/.test(m)));
  const fehlt = copy(ziel.scenario);
  delete fehlt.options.doerfler2;
  assert.ok(rosterProbleme(fehlt).some(m => /doerfler2/.test(m)));
});

test('EC 3: ein Roster, aus dem der Baustein keine Wahlen bauen kann, ist ein Abbruch – nichts wird geschrieben', () => {
  const doppelt = copy(scenario);
  doppelt.villagers.roster['Judy Marks'].short = 'Norman';
  const r = patchOptionen(doppelt, sequence);
  assert.equal(r.art, 'abweichend');
  assert.match(r.probleme.join('\n'), /Norman/);
  const ohne = copy(scenario);
  delete ohne.villagers;
  assert.equal(patchOptionen(ohne, sequence).art, 'abweichend');
});

// ── 4. Der Tisch ────────────────────────────────────────────────────────────

const tisch = (scenarioData, folge, choices, seed = 1) => bauen({ state, sequence: folge, zones, grids, assets, cards, scenarioData }, choices, seed);
const nichtOk = (log) => log.filter(e => e.status !== 'ok');
const zonenVon = (s) => resolveZones(zones, anchorBoxes(s.boards, s.tokens));
/** Die Stapel ohne die Ids, die bei jedem Lauf anders sind: Bezeichnung, Ort, Anzahl. */
const stapel = (s) => s.stacks.map(x => ({ ...ohneIds({ ...x, card_ids: undefined, cards: undefined }), n: (x.cards ?? x.card_ids ?? []).length }));

test('EC 4: der neue Aufbau mit den Vorgaben ist der alte Aufbau – Tokens, Zähler, Karten, Stapel, Boards, Protokoll', () => {
  const alt = tisch(scenario, sequence, {});
  const neu = tisch(ziel.scenario, ziel.sequence, {});
  assert.deepEqual(nichtOk(alt.log), [], 'der alte Aufbau läuft ohne Beanstandung');
  for (const feld of ['tokens', 'counters', 'cards', 'boards']) {
    assert.deepEqual(ohneIds(neu.state[feld]), ohneIds(alt.state[feld]), feld);
  }
  assert.deepEqual(stapel(neu.state), stapel(alt.state), 'stacks');
  assert.deepEqual(neu.log.map(e => [e.index, e.type, e.status, e.reason]), alt.log.map(e => [e.index, e.type, e.status, e.reason]));
  // Nicht leer verglichen: drei Tableaus, 15 Zähler (12 Dörfler + Münzen + 2 Bösewicht), Auslagen.
  assert.deepEqual([alt.state.tokens.length, alt.state.counters.length, alt.state.cards.length], [24, 15, 22]);
  assert.deepEqual(seatedVillagers(neu.state, assets, ziel.scenario.villagers).map(s => s.name), ['Henlo Bulwark', 'Fridgette Jones', 'Granny Melba']);
});

test('EC 4: die Wahl Judy / Norman / Quintus baut diese drei, zwölf Marker auf ihren Startwerten, keine Beanstandung', () => {
  const { state: s, log } = tisch(ziel.scenario, ziel.sequence, { doerfler1: 'Judy', doerfler2: 'Norman', doerfler3: 'Quintus' });
  assert.deepEqual(nichtOk(log), [], log.map(e => e.reason).join('\n'));
  const sitzende = seatedVillagers(s, assets, ziel.scenario.villagers);
  assert.deepEqual(sitzende.map(x => x.name), ['Judy Marks', 'Norman Fishboy', 'Quintus Binch']);
  const rz = zonenVon(s);
  const marker = s.tokens.filter(t => /^Marker \d: /.test(t.label));
  assert.equal(marker.length, 12);
  for (const { n, data } of sitzende) {
    for (const wert of ['Leben', 'Bewegung', 'Mumm', 'Präzision']) {
      const [m] = s.tokens.filter(t => t.label === `Marker ${n}: ${wert}`);
      assert.ok(m, `Marker ${n}: ${wert}`);
      const zone = rz.find(z => z.label === `Dörfler ${n}: ${wert}`);
      assert.equal(zoneSlotNumberAt(zone, m.x, m.y), data.start[wert], `${data.short}: ${wert}`);
    }
  }
  assert.equal(s.counters.length, 15, 'die Zähler am Platz gibt es in diesem Schritt noch (die nimmt ED weg)');
});

test('EC 4: alle neun Dörfler an Platz 1 – je ein Lauf, ohne Problem; Georgie meldet das `note` aus seinem `unverified`', () => {
  for (const [name, kurz] of NEUN) {
    // Platz 2 und 3 mit zwei anderen, damit nichts doppelt gewählt ist.
    const [zwei, drei] = VORGABE.concat(['Blopsy']).filter(k => k !== kurz);
    const { state: s, log } = tisch(ziel.scenario, ziel.sequence, { doerfler1: kurz, doerfler2: zwei, doerfler3: drei });
    const sitzt = seatedVillagers(s, assets, ziel.scenario.villagers);
    assert.equal(sitzt[0]?.name, name, `${name} sitzt an Platz 1`);
    assert.equal(sitzt.length, 3, `${name}: drei Dörfler`);
    const auffaellig = nichtOk(log);
    if (name === 'Georgie Irongut') {
      assert.equal(auffaellig.length, 1, log.map(e => `${e.status}: ${e.reason}`).join('\n'));
      assert.equal(auffaellig[0].status, 'note');
      assert.equal(auffaellig[0].type, 'seat_villager');
      assert.ok(auffaellig[0].reason.includes(scenario.villagers.roster['Georgie Irongut'].unverified), auffaellig[0].reason);
    } else {
      assert.deepEqual(auffaellig, [], `${name}: ${auffaellig.map(e => e.reason).join('\n')}`);
    }
  }
});

// ── 5. Doppelwahl (M30.4) ───────────────────────────────────────────────────

test('EC 5: zweimal derselbe – Platz 2 bleibt leer, genau eine `skipped`-Zeile, der Rest läuft; der Baustein verhindert es nicht', () => {
  // Der Baustein verbietet nichts: keine Regel „verschieden“, weder im Prüfer noch im Auflöser.
  assert.deepEqual(validateOptions(ziel.scenario.options, ziel.sequence, actions), []);
  assert.deepEqual(resolveChoices(ziel.scenario.options, { doerfler1: 'Judy', doerfler2: 'Judy' }).problems, []);

  const { state: s, log } = tisch(ziel.scenario, ziel.sequence, { doerfler1: 'Judy', doerfler2: 'Judy', doerfler3: 'Granny' });
  assert.deepEqual(seatedVillagers(s, assets, ziel.scenario.villagers).map(x => `${x.n}:${x.name}`), ['1:Judy Marks', '3:Granny Melba']);
  const skip = log.filter(e => e.status === 'skipped');
  assert.equal(skip.length, 1, log.map(e => `${e.status}: ${e.reason}`).join('\n'));
  assert.equal(skip[0].index, 26, 'der Schritt für Platz 2 (0-basiert 26: der Index im Protokoll folgt der Folge)');
  assert.match(skip[0].reason, /"Judy Marks" already sits at seat 1/);
  assert.equal(log.filter(e => e.status === 'failed').length, 0);
  assert.ok(s.counters.some(c => c.name === 'Münzen (gemeinsam)'), 'der folgende Schritt lief');
});

// ── 6. Vorbedingung je Stück ────────────────────────────────────────────────

const PAAR = (s = scenario, q = sequence) => patchOptionen(s, q);
const abbruch = (r, ...teile) => {
  assert.equal(r.art, 'abweichend', `erwartet abweichend, war ${r.art}`);
  assert.ok(r.probleme.length > 0);
  assert.equal(r.scenario, undefined, 'ein Abbruch liefert keinen Zielstand');
  assert.equal(r.sequence, undefined);
  for (const t of teile) assert.ok(r.probleme.join('\n').includes(t), `die Meldung nennt „${t}“: ${r.probleme.join(' | ')}`);
};

test('EC 6: das Paar vom Ausgang ist „zu schreiben“; die Eingabe wird nicht verändert', () => {
  const s = copy(scenario), q = copy(sequence);
  const r = PAAR(s, q);
  assert.equal(r.art, 'zu-schreiben');
  assert.equal(text(s), sw.scenario);
  assert.equal(text(q), sw.sequence);
  assert.notEqual(r.scenario, s);
  assert.notEqual(r.sequence, q);
});

test('EC 6: `options` muss genau `partie` und `troedel` tragen – ein Schlüssel mehr, einer weniger, ein anderer: Abbruch mit Pfad', () => {
  const mehr = copy(scenario); mehr.options.foo = { label: 'x' };
  abbruch(PAAR(mehr), 'options.foo');
  const weniger = copy(scenario); delete weniger.options.troedel;
  abbruch(PAAR(weniger), 'options.troedel');
  const kein = copy(scenario); delete kein.options;
  abbruch(PAAR(kein), 'options');
  const leer = copy(scenario); leer.options = {};
  abbruch(PAAR(leer), 'options.partie');
});

test('EC 6: die drei Plätze müssen Henlo Bulwark / Fridgette Jones / Granny Melba nennen – jede andere Lage ist ein Abbruch mit Pfad', () => {
  for (const [i, n] of [[25, 1], [26, 2], [27, 3]]) {
    const falsch = copy(sequence); falsch[i].villager = 'Henlo Bulwerk';
    abbruch(PAAR(scenario, falsch), `sequence[${i}]`, 'Henlo Bulwerk');
    const art = copy(sequence); art[i].type = 'swap_villager';
    abbruch(PAAR(scenario, art), `sequence[${i}]`);
    const platz = copy(sequence); platz[i].seat = n + 1;
    abbruch(PAAR(scenario, platz), `sequence[${i}]`);
    const feld = copy(sequence); feld[i].onlyChoice = { partie: 'kurz' };
    abbruch(PAAR(scenario, feld), `sequence[${i}]`);
  }
  abbruch(PAAR(scenario, sequence.slice(0, 26)), 'sequence[26]');
  abbruch(PAAR(scenario, 'kein Feld'));
  // Die Plätze vertauscht: jeder Schritt ist für sich falsch, alle drei werden genannt.
  const dreh = copy(sequence); [dreh[25].villager, dreh[26].villager] = [dreh[26].villager, dreh[25].villager];
  abbruch(PAAR(scenario, dreh), 'sequence[25]', 'sequence[26]');
});

test('EC 6: ein vorhandenes `doerfler…`, das anders ist als das Ziel, ist ein Abbruch – auch wenn der Rest stimmt', () => {
  const anders = copy(ziel.scenario);
  anders.options.doerfler2.default = 'Judy';
  abbruch(PAAR(anders, ziel.sequence), 'options.doerfler2', 'Judy');
  const halb = copy(scenario); halb.options.doerfler1 = copy(ziel.scenario.options.doerfler1);
  abbruch(PAAR(halb), 'options.doerfler1');
  const fremd = copy(scenario); fremd.options.doerfler7 = { label: 'x' };
  abbruch(PAAR(fremd), 'options.doerfler7');
});

test('EC 6: ein halber Stand ist ein Abbruch – Optionen da und Schritte alt, oder Schritte neu und Optionen fehlen', () => {
  abbruch(PAAR(ziel.scenario, sequence), 'Schritte', 'sequence[25]');
  abbruch(PAAR(scenario, ziel.sequence), 'options');
  const einer = copy(sequence); einer[25].villager = '$optDoerfler1';
  abbruch(PAAR(scenario, einer));
  const zwei = copy(ziel.sequence); zwei[27].villager = 'Granny Melba';
  abbruch(PAAR(ziel.scenario, zwei), 'sequence[27]');
});

test('EC 6: das Ziel selbst ist „schon geschrieben“ – nichts zu tun, die Eingabe kommt gleich zurück', () => {
  const r = PAAR(copy(ziel.scenario), copy(ziel.sequence));
  assert.equal(r.art, 'schon-da');
  assert.equal(text(r.scenario), text(ziel.scenario));
  assert.equal(text(r.sequence), text(ziel.sequence));
  // Auch ein Zielstand, an dem ED/EE schon gearbeitet haben, zählt: die Stücke sind unabhängig (andere Reihenfolge erlaubt).
  const ed = copy(ziel.scenario);
  for (const s of ed.villagers.seats) delete s.counters;
  assert.equal(PAAR(ed, ziel.sequence).art, 'schon-da');
});

test('EC 6: die Stücke sind unabhängig – nach ED (ohne `counters`) schreibt der Schritt dieselben drei Schlüssel und drei Schritte', () => {
  const ed = copy(scenario);
  for (const s of ed.villagers.seats) delete s.counters;
  const r = PAAR(ed);
  assert.equal(r.art, 'zu-schreiben', (r.probleme ?? []).join('\n'));
  assert.deepEqual(r.scenario.options.doerfler2, ziel.scenario.options.doerfler2);
  assert.deepEqual(beweise({ scenario: ed, sequence }, r), []);
});

// ── 7. Das Gerüst ───────────────────────────────────────────────────────────

test('EC 7: `SCHRITTE` – drei Stücke, je `{ ausgang, ziel }`, alle drei gebaut (EC, ED, EE) – keines ist mehr `null`', () => {
  assert.deepEqual(Object.keys(SCHRITTE), ['optionen', 'zaehler', 'boss']);
  for (const k of Object.keys(SCHRITTE)) assert.deepEqual(Object.keys(SCHRITTE[k]), ['ausgang', 'ziel'], k);
  for (const k of Object.keys(SCHRITTE)) { assert.notEqual(SCHRITTE[k].ausgang, null, k); assert.notEqual(SCHRITTE[k].ziel, null, k); }
  assert.equal(GAME_ID, '072123c0-cd97-4ffb-a330-369630fab93f');
  assert.equal(SETUP_ID, 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b');
});

test('EC 7: der Kopf des Skripts nennt weder Länge noch Hash noch Dateigrößen – sie stehen als Konstanten, hier wird importiert', () => {
  const quelle = fs.readFileSync(new URL('../../scripts/setupwahl-daten.mjs', import.meta.url), 'utf8');
  const kopf = quelle.split('\n').filter((l, i, alle) => alle.slice(0, i + 1).every(x => x.startsWith('//') || x.trim() === '')).join('\n');
  assert.ok(kopf.length > 400, 'der Kopf ist gefunden');
  for (const z of [AUSGANG, ZIEL]) {
    for (const spalte of ['scenario', 'sequence']) {
      const { laenge, sha: h } = z[spalte];
      assert.ok(!kopf.includes(h), `der Kopf nennt ${h}`);
      for (const l of [String(laenge), String(laenge).replace(/(\d)(\d{3})$/, '$1 $2'), String(laenge).replace(/(\d)(\d{3})$/, '$1.$2')]) {
        assert.ok(!kopf.includes(l), `der Kopf nennt ${l}`);
      }
    }
  }
});

// ── Die Läufe gegen eine Wegwerf-Datenbank ──────────────────────────────────

/**
 * Das echte Schema (`setupDatabase` in einem Kindprozess), die Bibliothek aus dem Auszug, die Kurzpartie mit
 * den drei Spalten **aus der Fixture** (Ausgangsstand), dazu ein zweiter Aufbau und drei Spielstände.
 */
function frischeDatenbank({ scen = sw.scenario, seq = sw.sequence, act = sw.actions } = {}) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-setupwahl-'));
  const file = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['--input-type=module', '-e',
    'const { setupDatabase, closeDatabase } = await import("./src/database.js"); await setupDatabase(); closeDatabase();'],
  { cwd: new URL('..', import.meta.url), env: { ...process.env, CGE_DB_PATH: file }, stdio: 'pipe' });
  const db = new Database(file);
  db.prepare("insert into games (id, name) values (?, 'TFT')").run(GAME_ID);
  const cat = new Map();
  const catId = (name) => {
    if (!name) return null;
    if (!cat.has(name)) { cat.set(name, randomUUID()); db.prepare('insert into categories (id, game_id, name) values (?, ?, ?)').run(cat.get(name), GAME_ID, name); }
    return cat.get(name);
  };
  for (const a of assets) {
    db.prepare('insert into table_assets (id, game_id, type, name, image_path, back_image_path, width, height, category_id) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(a.id, GAME_ID, a.type, a.name, a.image_path, a.back_image_path, a.width, a.height, catId(a.category));
  }
  for (const c of cards) {
    db.prepare('insert into cards (id, game_id, category_id, name, image_path, width, height) values (?, ?, ?, ?, ?, ?, ?)')
      .run(c.id, GAME_ID, catId(c.category), c.name, c.image_path, c.width, c.height);
  }
  db.prepare('insert into setups (id, game_id, name, state_data, zone_data, sequence_data, grid_data, action_data, scenario_data) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(SETUP_ID, GAME_ID, 'TFT Kurzpartie', JSON.stringify(state), JSON.stringify(zones), seq, JSON.stringify(grids), act, scen);
  db.prepare("insert into setups (id, game_id, name, sequence_data, scenario_data, action_data) values (?, ?, 'Grundaufbau', '[{\"type\":\"shuffle\"}]', '{}', '[]')").run(randomUUID(), GAME_ID);
  for (const [n, d] of [['Auto Save', '{"a":0}'], ['Partie 14 – Sieg gegen Virginia Fitz', '{"a":1}'], ['Partie 13 – Endkampf', '{"a":2}']]) {
    db.prepare('insert into save_states (id, game_id, name, state_data, setup_id) values (?, ?, ?, ?, ?)').run(randomUUID(), GAME_ID, n, d, SETUP_ID);
  }
  db.close();
  return { tmp, file };
}

/** `main` laufen lassen und aufschreiben, was es ausgibt. */
async function lauf(args, { haken, Db = Database } = {}) {
  const zeilen = [], fehler = [];
  const origLog = console.log, origErr = console.error;
  console.log = (...a) => zeilen.push(a.join(' '));
  console.error = (...a) => fehler.push(a.join(' '));
  try {
    const code = await main(args, { Database: Db, haken });
    return { code, out: [...zeilen, ...fehler].join('\n') };
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

/** Alles, was in der Datenbank steht – neu gelesen, alle Tabellen, alle Spalten. */
const alles = (file) => {
  const db = new Database(file, { readonly: true });
  const out = {};
  for (const { name } of db.prepare("select name from sqlite_master where type = 'table' and name not like 'sqlite_%' order by name").all()) {
    out[name] = db.prepare(`select * from "${name}" order by rowid`).all();
  }
  db.close();
  return out;
};
const zeile = (file) => {
  const db = new Database(file, { readonly: true });
  const r = db.prepare('select * from setups where id = ?').get(SETUP_ID);
  db.close();
  return r;
};
const ohneZweiSpalten = (a) => ({ ...a, setups: a.setups.map(r => ({ ...r, scenario_data: undefined, sequence_data: undefined })) });
const weg = (tmp) => fs.rmSync(tmp, { recursive: true, force: true });
const setze = (file, spalte, t) => {
  const db = new Database(file);
  db.prepare(`update setups set ${spalte} = ? where id = ?`).run(t, SETUP_ID);
  db.close();
};
const sicherung = (tmp, scen = sw.scenario, seq = sw.sequence) => {
  const datei = path.join(tmp, 'sicherung.json');
  const h = sicherungsHash(scen, seq);
  fs.writeFileSync(datei, JSON.stringify({ scenario_data: scen, sequence_data: seq, sha256: h, updated_at: '2026-11-09 00:00:00' }));
  return { datei, h };
};
const schreiben = (file, h, extra = []) => ['--write', file, '--schritt', 'optionen', '--sicherung-sha', h.slice(0, 16), ...extra];

test('EC main: `--check` am Ausgangsstand – schreibgeschützt, „zu schreiben“, Plan, Beweise, Prüfer, Zielstand, Hash für die Sicherung', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    fs.chmodSync(file, 0o444);
    const r = await lauf(['--check', file, '--schritt', 'optionen']);
    fs.chmodSync(file, 0o666);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, new RegExp(`gelesen: scenario_data ${sw.scenario.length} Zeichen`));
    assert.match(r.out, new RegExp(`sequence_data ${sw.sequence.length} Zeichen`));
    assert.match(r.out, /Einordnung: zu schreiben/);
    for (const n of [1, 2, 3]) assert.ok(r.out.includes(`doerfler${n}`), `der Plan nennt doerfler${n}`);
    assert.ok(r.out.includes('"Henlo Bulwark" → "$optDoerfler1"'), r.out);
    assert.match(r.out, /Rückwärtsbeweis scenario_data: ja/);
    assert.match(r.out, /Rückwärtsbeweis sequence_data: ja/);
    assert.match(r.out, /validateScenarioData: 0 Probleme/);
    assert.match(r.out, /validateOptions: 0 Probleme/);
    assert.match(r.out, /Wahlen gegen das Roster: 0 Probleme/);
    assert.ok(r.out.includes(`Zielstand: scenario_data ${ZIEL.scenario.laenge} Zeichen (sha ${ZIEL.scenario.sha}), sequence_data ${ZIEL.sequence.laenge} Zeichen (sha ${ZIEL.sequence.sha})`), r.out);
    assert.ok(r.out.includes(sicherungsHash(sw.scenario, sw.sequence)), 'der Hash, den --write als Sicherung verlangt, steht da');
    assert.match(r.out, /würde schreiben/);
    assert.doesNotMatch(r.out, /Beanstandungen:? [1-9]/);
    assert.deepEqual(alles(file), vorher, '--check hat nichts geschrieben');
  } finally { weg(tmp); }
});

test('EC main: `--check` öffnet schreibgeschützt, `--write` nicht; geschrieben wird nur mit einem UPDATE auf die beiden Spalten', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const optionen = [], sql = [];
    class Spion extends Database {
      constructor(pfad, opt) { optionen.push(opt); super(pfad, opt); }
      prepare(s) { sql.push(s); return super.prepare(s); }
    }
    assert.equal((await lauf(['--check', file, '--schritt', 'optionen'], { Db: Spion })).code, 0);
    assert.equal(optionen.at(-1).readonly, true);
    const lesend = new Database(file, { readonly: true });
    assert.throws(() => lesend.prepare('update setups set name = name').run(), /readonly/i);
    lesend.close();

    sql.length = 0;
    const { h } = sicherung(tmp);
    const w = await lauf(schreiben(file, h), { Db: Spion });
    assert.equal(w.code, 0, w.out);
    assert.equal(optionen.at(-1).readonly, false);
    const schreibend = sql.filter(s => /^\s*(update|insert|delete|replace|drop|alter|create)\b/i.test(s));
    assert.equal(schreibend.length, 1, schreibend.join('\n'));
    assert.match(schreibend[0].replace(/\s+/g, ' '), /^update setups set scenario_data = \?, sequence_data = \? where id = \? and scenario_data = \? and sequence_data = \?$/i);
    // `action_data`, `zone_data` und `state_data` kommen nur im Fingerabdruck vor (ein Hash je Tabelle, `order by rowid`) –
    // für den Schritt oder den Prüfer liest keine Abfrage sie.
    const gelesen = sql.filter(s => /\b(action_data|zone_data|state_data)\b/.test(s) && !/order by rowid/i.test(s));
    assert.deepEqual(gelesen, []);
  } finally { weg(tmp); }
});

test('EC main: `--write` mit Sicherung – beide Spalten auf dem Zielstand, **nichts sonst** geändert, Kontrollausgabe neu gelesen', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    const { h } = sicherung(tmp);
    const r = await lauf(schreiben(file, h));
    assert.equal(r.code, 0, r.out);
    const z = zeile(file);
    assert.equal(z.scenario_data, text(ziel.scenario));
    assert.equal(z.sequence_data, text(ziel.sequence));
    assert.deepEqual([z.scenario_data.length, sha(z.scenario_data)], [ZIEL.scenario.laenge, ZIEL.scenario.sha]);
    assert.deepEqual([z.sequence_data.length, sha(z.sequence_data)], [ZIEL.sequence.laenge, ZIEL.sequence.sha]);
    assert.deepEqual(ohneZweiSpalten(alles(file)), ohneZweiSpalten(vorher), 'jede andere Spalte, Zeile und Tabelle (auch updated_at, save_states, action_data) ist gleich');
    assert.equal(zeile(file).action_data, sw.actions);
    assert.match(r.out, /geschrieben: scenario_data/);
    assert.ok(r.out.includes(`${sw.scenario.length} → ${ZIEL.scenario.laenge} Zeichen, sha ${AUSGANG.scenario.sha} → ${ZIEL.scenario.sha}`), r.out);
    assert.ok(r.out.includes(`${sw.sequence.length} → ${ZIEL.sequence.laenge} Zeichen, sha ${AUSGANG.sequence.sha} → ${ZIEL.sequence.sha}`), r.out);
    assert.match(r.out, /Rückwärtsbeweis scenario_data auf der gelesenen Spalte: ja/);
    assert.match(r.out, /Rückwärtsbeweis sequence_data auf der gelesenen Spalte: ja/);
    assert.match(r.out, /validateScenarioData auf der gelesenen Spalte: 0 Probleme/);
    assert.match(r.out, /Zielstand aus den Konstanten \(.*\): erreicht/);
    assert.match(r.out, /save_states Auto Save: sha \w+ → \w+ gleich/);
    assert.match(r.out, /partie\s+sha \w+ → \w+ gleich/);
    assert.match(r.out, /doerfler1\s+sha \(fehlt\) → \w+ neu/);
  } finally { weg(tmp); }
});

test('EC main: der zweite Lauf – „schon geschrieben“, Rückgabe 0, nichts geschrieben', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const { h } = sicherung(tmp);
    assert.equal((await lauf(schreiben(file, h))).code, 0);
    const nach1 = alles(file);
    const check = await lauf(['--check', file, '--schritt', 'optionen']);
    assert.equal(check.code, 0, check.out);
    assert.match(check.out, /schon geschrieben/);
    // Der zweite `--write` braucht keine Sicherung (es gibt nichts zu sichern) und schreibt nichts.
    const r = await lauf(['--write', file, '--schritt', 'optionen']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /schon geschrieben/);
    assert.match(r.out, /nichts zu schreiben/);
    assert.deepEqual(alles(file), nach1);
  } finally { weg(tmp); }
});

test('EC main: ohne Sicherung kein Schreiben – fehlender Hash, falsche Form, falscher Hash; nichts geändert', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    const ohne = await lauf(['--write', file, '--schritt', 'optionen']);
    assert.equal(ohne.code, 1);
    assert.match(ohne.out, /ohne Sicherung kein Schreiben/);
    const kurz = await lauf(['--write', file, '--schritt', 'optionen', '--sicherung-sha', 'abc']);
    assert.equal(kurz.code, 1);
    assert.match(kurz.out, /12 Hex-Stellen/);
    const falsch = await lauf(['--write', file, '--schritt', 'optionen', '--sicherung-sha', 'deadbeefdead']);
    assert.equal(falsch.code, 1);
    assert.match(falsch.out, /passt nicht zum gelesenen Text/);
    // Der Hash nur einer der beiden Spalten reicht nicht: es ist der Hash über beide.
    const nurEine = await lauf(['--write', file, '--schritt', 'optionen', '--sicherung-sha', sha(sw.scenario)]);
    assert.equal(nurEine.code, 1);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EC main: ein anderer Stand ist ein Abbruch mit Pfad – nichts geschrieben, kein Schalter dagegen', async () => {
  const fremd = JSON.parse(sw.sequence); fremd[26].villager = 'Judy Marks';
  const { tmp, file } = frischeDatenbank({ seq: text(fremd) });
  try {
    const vorher = alles(file);
    const c = await lauf(['--check', file, '--schritt', 'optionen']);
    assert.equal(c.code, 1);
    assert.match(c.out, /ABWEICHEND/);
    assert.match(c.out, /sequence\[26\]/);
    assert.match(c.out, /Judy Marks/);
    assert.match(c.out, /es wird nichts überschrieben/);
    assert.doesNotMatch(c.out, /würde schreiben/);
    const { h } = sicherung(tmp, sw.scenario, text(fremd));
    const w = await lauf(schreiben(file, h));
    assert.equal(w.code, 1, w.out);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EC main: ein Stand, der nicht kompaktes JSON.stringify ist, wird nicht angefasst (der Text-Vergleich trüge nicht)', async () => {
  const lose = JSON.stringify(JSON.parse(sw.scenario), null, 1);
  const { tmp, file } = frischeDatenbank({ scen: lose });
  try {
    const vorher = alles(file);
    const c = await lauf(['--check', file, '--schritt', 'optionen']);
    assert.equal(c.code, 1);
    assert.match(c.out, /kompaktes JSON/);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EC main: Vergleich-und-Tausch – ändert jemand **eine** der beiden Spalten zwischen Lesen und Schreiben, wird nichts geschrieben', async () => {
  for (const spalte of ['scenario_data', 'sequence_data']) {
    const { tmp, file } = frischeDatenbank();
    try {
      const { h } = sicherung(tmp);
      const fremd = spalte === 'scenario_data' ? sw.scenario + ' ' : sw.sequence + ' ';
      const r = await lauf(schreiben(file, h), { haken: (stelle, db) => { if (stelle === 'nach-lesen') db.prepare(`update setups set ${spalte} = ? where id = ?`).run(fremd, SETUP_ID); } });
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /seit dem Lesen geändert/);
      const z = zeile(file);
      assert.equal(z[spalte], fremd, `${spalte}: die fremde Änderung bleibt stehen`);
      const andere = spalte === 'scenario_data' ? 'sequence_data' : 'scenario_data';
      assert.equal(z[andere], andere === 'scenario_data' ? sw.scenario : sw.sequence, `${andere} wurde nicht geschrieben`);
    } finally { weg(tmp); }
  }
});

test('EC main: ändert sich in der Transaktion eine andere Tabelle (Auto Save), rollt alles zurück', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    const { h } = sicherung(tmp);
    const r = await lauf(schreiben(file, h), {
      haken: (stelle, db) => { if (stelle === 'in-transaktion') db.prepare("update save_states set state_data = '{\"a\":99}' where name = 'Auto Save'").run(); },
    });
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, /unerwartet geändert/);
    assert.deepEqual(alles(file), vorher, 'Rollback: auch das Auto Save ist wieder, wie es war');
  } finally { weg(tmp); }
});

test('EC main: `--zurueck` – der exakte Zielstand kommt auf den Ausgang, Zeichen für Zeichen; ein zweites Mal ist „schon der Ausgangsstand“', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    const { datei, h } = sicherung(tmp);
    assert.equal((await lauf(schreiben(file, h))).code, 0);
    assert.notDeepEqual(alles(file), vorher);
    const r = await lauf(['--zurueck', datei, file, '--schritt', 'optionen']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /zurückgeschrieben/);
    assert.match(r.out, /\(= die Sicherung, Zeichen für Zeichen\)/);
    assert.deepEqual(alles(file), vorher, 'jede Tabelle, jede Spalte wie am Anfang');
    const nochmal = await lauf(['--zurueck', datei, file, '--schritt', 'optionen']);
    assert.equal(nochmal.code, 0, nochmal.out);
    assert.match(nochmal.out, /schon der Ausgangsstand/);
  } finally { weg(tmp); }
});

test('EC main: `--zurueck` ersetzt nur den exakten Zielstand – hat jemand danach weitergearbeitet, bleibt alles stehen', async () => {
  for (const spalte of ['scenario_data', 'sequence_data']) {
    const { tmp, file } = frischeDatenbank();
    try {
      const { datei, h } = sicherung(tmp);
      assert.equal((await lauf(schreiben(file, h))).code, 0);
      setze(file, spalte, zeile(file)[spalte] + ' ');
      const vorher = alles(file);
      const r = await lauf(['--zurueck', datei, file, '--schritt', 'optionen']);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /nicht der Zielstand/);
      assert.deepEqual(alles(file), vorher);
    } finally { weg(tmp); }
  }
});

test('EC main: `--zurueck` prüft die Sicherung – beschädigt, nicht kompakt, nicht der Ausgang dieses Schritts', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const { h } = sicherung(tmp);
    assert.equal((await lauf(schreiben(file, h))).code, 0);
    const vorher = alles(file);
    const schreibe = (name, o) => { const d = path.join(tmp, name); fs.writeFileSync(d, JSON.stringify(o)); return d; };
    const gut = { scenario_data: sw.scenario, sequence_data: sw.sequence, sha256: sicherungsHash(sw.scenario, sw.sequence) };
    const kaputt = await lauf(['--zurueck', schreibe('a.json', { ...gut, sha256: 'f'.repeat(64) }), file, '--schritt', 'optionen']);
    assert.equal(kaputt.code, 1); assert.match(kaputt.out, /beschädigt/);
    const lose = JSON.stringify(JSON.parse(sw.scenario), null, 1);
    const nk = await lauf(['--zurueck', schreibe('b.json', { ...gut, scenario_data: lose, sha256: sicherungsHash(lose, sw.sequence) }), file, '--schritt', 'optionen']);
    assert.equal(nk.code, 1); assert.match(nk.out, /kompaktes JSON/);
    // Die Sicherung ist schon der Zielstand: dorthin führt kein Weg zurück.
    const zs = text(ziel.scenario), zq = text(ziel.sequence);
    const neu = await lauf(['--zurueck', schreibe('c.json', { scenario_data: zs, sequence_data: zq, sha256: sicherungsHash(zs, zq) }), file, '--schritt', 'optionen']);
    assert.equal(neu.code, 1); assert.match(neu.out, /nicht der Ausgangsstand/);
    const form = await lauf(['--zurueck', schreibe('d.json', { scenario_data: sw.scenario }), file, '--schritt', 'optionen']);
    assert.equal(form.code, 1); assert.match(form.out, /nicht die Form/);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EC main: Benutzungsfehler – kein Schritt, ein unbekannter, kein Modus, zwei Modi, zu viele oder zu wenige Pfade: Rückgabe 2', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const vorher = alles(file);
    for (const args of [
      ['--check', file],                                   // kein --schritt
      ['--check', file, '--schritt'],                      // --schritt ohne Wert
      ['--check', file, '--schritt', 'alles'],             // unbekannter Schritt
      ['--schritt', 'optionen', file],                     // kein Modus
      ['--check', '--write', file, '--schritt', 'optionen'],
      ['--check', '--schritt', 'optionen'],                // kein Pfad
      ['--check', file, 'noch.db', '--schritt', 'optionen'],
      ['--zurueck', file, '--schritt', 'optionen'],        // --zurueck braucht Sicherung **und** Datenbank
    ]) {
      const r = await lauf(args);
      assert.equal(r.code, 2, `${args.join(' ')}: ${r.out}`);
      assert.match(r.out, /usage/);
    }
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EC main: es gibt kein `--force` und kein Wort dafür – jedes unbekannte Argument ist ein Benutzungsfehler, geschrieben wird nichts', async () => {
  const fremd = JSON.parse(sw.sequence); fremd[25].villager = 'Yancy Plover';
  const { tmp, file } = frischeDatenbank({ seq: text(fremd) });
  try {
    const vorher = alles(file);
    const { h } = sicherung(tmp, sw.scenario, text(fremd));
    for (const wort of ['--force', '--erzwingen', '--ueberschreiben', '--override', '--yes', '--ignore-precondition', '-f', 'force']) {
      for (const modus of [['--check', file], schreiben(file, h)]) {
        const r = await lauf([...modus, wort]);
        assert.equal(r.code, 2, `${modus[0]} ${wort}: ${r.out}`);
        assert.match(r.out, /usage|unbekannt/);
      }
    }
    // Und im Skript steht keines davon als Argument, das es erkennt.
    const quelle = fs.readFileSync(new URL('../../scripts/setupwahl-daten.mjs', import.meta.url), 'utf8');
    const code = quelle.split('\n').filter(l => !l.trim().startsWith('//')).join('\n');
    assert.ok(!/['"]--(force|erzwingen|ueberschreiben|override)['"]/.test(code));
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EC main: die Transaktion ist `IMMEDIATE` – die Schreibsperre liegt vor dem ersten Hash, nicht erst beim UPDATE', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const aufrufe = [];
    class Spion extends Database {
      transaction(fn) {
        const t = super.transaction(fn);
        const wrap = (...a) => { aufrufe.push('direkt'); return t(...a); };
        wrap.immediate = (...a) => { aufrufe.push('immediate'); return t.immediate(...a); };
        wrap.deferred = t.deferred; wrap.exclusive = t.exclusive;
        return wrap;
      }
    }
    const { h } = sicherung(tmp);
    assert.equal((await lauf(schreiben(file, h), { Db: Spion })).code, 0);
    assert.deepEqual(aufrufe, ['immediate']);
  } finally { weg(tmp); }
});

test('EC main: ein Prüfer, der etwas findet, hält den Lauf an – validateScenarioData (die Tabelle nennt eine Karte, die es nicht gibt), `--check` wie `--write`', async () => {
  const kaputt = copy(scenario);
  kaputt.terrainCards['Auslöser'] = 'Gibt es nicht';
  const { tmp, file } = frischeDatenbank({ scen: text(kaputt) });
  try {
    const vorher = alles(file);
    const c = await lauf(['--check', file, '--schritt', 'optionen']);
    assert.equal(c.code, 1, c.out);
    assert.match(c.out, /validateScenarioData: [1-9]/);
    assert.match(c.out, /Gibt es nicht/);
    assert.doesNotMatch(c.out, /würde schreiben/);
    const { h } = sicherung(tmp, text(kaputt), sw.sequence);
    assert.equal((await lauf(schreiben(file, h))).code, 1);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EC main: gehört der Aufbau zu einem anderen Spiel, wird nichts angefasst', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const db = new Database(file);
    db.prepare("insert into games (id, name) values ('anderes-spiel', 'X')").run();
    db.prepare('update setups set game_id = ? where id = ?').run('anderes-spiel', SETUP_ID);
    db.close();
    const vorher = alles(file);
    const c = await lauf(['--check', file, '--schritt', 'optionen']);
    assert.equal(c.code, 1, c.out);
    assert.match(c.out, /Aufbau gehört zu Spiel anderes-spiel/);
    const { h } = sicherung(tmp);
    assert.equal((await lauf(schreiben(file, h))).code, 1);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

// ════════════════════════════════════════════════════════════════════════════
// ED / Spec M30.5, M30.6, M30.7, M30.9 — der Schritt `zaehler`: die Zähler der Dörfler weg
// ════════════════════════════════════════════════════════════════════════════
//
// Drei Stücke, **ein** Schritt: `seats[].counters` fallen weg (`scenario_data`), Schritt 1 von `dorfphase-beginnen` wird
// `require_marker`, Schritte 16–27 (zwölf `set_counter`) entfallen (`action_data`). Der Eingang ist der Zielstand von EC: `ziel` oben
// (`patchOptionen` zuerst angewendet). Zahlen und Hashes stehen im Skript (`SCHRITTE.zaehler`); hier wird importiert.

const AUSGANG_Z = SCHRITTE.zaehler.ausgang, ZIEL_Z = SCHRITTE.zaehler.ziel;
const EINGANG = ziel.scenario;
let _zz;
/** Der Zielstand des Schrittes auf dem Eingang (einmal gerechnet; ein Test, der ihn verändern will, kopiert). */
const zielZ = () => (_zz ??= patchZaehler(EINGANG, actions, zones));
const dorf = (acts) => acts.find(a => a.id === 'dorfphase-beginnen');
const WERTE = ['Leben', 'Bewegung', 'Mumm', 'Präzision'];
const ZWOELF = [1, 2, 3].flatMap(n => WERTE.map(w => ({ type: 'set_counter', name: `$V${n}: ${w}`, value: w === 'Leben' ? 'max' : 'base' })));
/** Die Wache im Wortlaut von M30.9 — Schlüsselreihenfolge wie dort. */
const WACHE_SOLL = '{"type":"require_marker","zoneLabel":["Dörfler 1: Leben","Dörfler 2: Leben","Dörfler 3: Leben"],"above":0,"confirm":true,"message":"Auf keiner Lebensleiste liegt noch ein Marker — alle drei Dörfler sind besiegt. Nach [DE S.22] ist die Partie damit zu Ende."}';
const mitAktionen = (fn) => { const a = copy(actions); fn(dorf(a).steps, a); return a; };
const mitSzenario = (fn) => { const s = copy(EINGANG); fn(s.villagers.seats, s); return s; };
const abbruchZ = (r, ...teile) => {
  assert.equal(r.art, 'abweichend', `erwartet abweichend, war ${r.art}`);
  assert.ok(r.probleme.length > 0);
  assert.equal(r.scenario, undefined, 'ein Abbruch liefert keinen Zielstand');
  assert.equal(r.action, undefined);
  for (const t of teile) assert.ok(r.probleme.join('\n').includes(t), `die Meldung nennt „${t}“: ${r.probleme.join(' | ')}`);
};

// ── ED 1. Der Zielstand ─────────────────────────────────────────────────────

test('ED 1: Zielstand – Länge und Hash beider Spalten wie die Konstanten; der Eingang ist der Zielstand von EC; 45 → 33 Schritte', () => {
  const r = zielZ();
  assert.equal(r.art, 'zu-schreiben', (r.probleme ?? []).join('\n'));
  const sc = text(r.scenario), ac = text(r.action);
  assert.deepEqual([sc.length, sha(sc)], [ZIEL_Z.scenario.laenge, ZIEL_Z.scenario.sha]);
  assert.deepEqual([ac.length, sha(ac)], [ZIEL_Z.action.laenge, ZIEL_Z.action.sha]);
  assert.equal(dorf(actions).steps.length, 45);
  assert.equal(dorf(r.action).steps.length, 33);
  // Der Ausgang: scenario_data nach EC, action_data unverändert seit der Fixture.
  const ein = text(EINGANG);
  assert.deepEqual([ein.length, sha(ein)], [AUSGANG_Z.scenario.laenge, AUSGANG_Z.scenario.sha]);
  assert.deepEqual([sw.actions.length, sha(sw.actions)], [AUSGANG_Z.action.laenge, AUSGANG_Z.action.sha]);
  assert.equal(Object.keys(r).includes('sequence'), false, 'sequence_data gehört nicht zu diesem Schritt');
});

test('ED 1: alles andere bleibt byteweise gleich – oberste Schlüssel, Dörferdaten bis auf `counters`, die drei übrigen Aktionen, 33 der 45 Schritte', () => {
  const a = EINGANG, b = zielZ().scenario;
  assert.deepEqual(Object.keys(b), Object.keys(a));
  for (const k of Object.keys(a).filter(x => x !== 'villagers')) assert.equal(text(b[k]), text(a[k]), `scenario_data.${k}`);
  assert.deepEqual(Object.keys(b.villagers), Object.keys(a.villagers));
  for (const k of ['fightZone', 'barZone', 'roster']) assert.equal(text(b.villagers[k]), text(a.villagers[k]), `villagers.${k}`);
  assert.equal(b.villagers.seats.length, 3);
  b.villagers.seats.forEach((s, i) => {
    assert.deepEqual(Object.keys(s), ['anchor', 'zones', 'markers', 'vorrat', 'tableau'], `seats[${i}]`);
    for (const k of Object.keys(s)) assert.equal(text(s[k]), text(a.villagers.seats[i][k]), `seats[${i}].${k}`);
  });
  const ra = zielZ().action;
  assert.deepEqual(ra.map(x => x.id), actions.map(x => x.id));
  for (const x of actions.filter(y => y.id !== 'dorfphase-beginnen')) assert.equal(text(ra.find(y => y.id === x.id)), text(x), x.id);
  const alt = dorf(actions), neu = dorf(ra);
  assert.deepEqual(Object.keys(neu), Object.keys(alt));
  assert.equal(neu.label, alt.label);
  assert.deepEqual(neu.steps.map(text), [text(alt.steps[0]), WACHE_SOLL, ...alt.steps.slice(2, 16).map(text), ...alt.steps.slice(28).map(text)]);
});

test('ED 1: Rückwärtsbeweis – die drei `counters` wieder einsetzen, Schritt 1 und 16–27 zurück: der gelesene Text, Zeichen für Zeichen', () => {
  const sc = copy(zielZ().scenario);
  sc.villagers.seats.forEach((s, i) => { s.counters = copy(EINGANG.villagers.seats[i].counters); });
  assert.equal(text(sc), text(EINGANG));
  const ac = copy(zielZ().action);
  const st = dorf(ac).steps;
  st[1] = copy(dorf(actions).steps[1]);
  st.splice(16, 0, ...copy(dorf(actions).steps.slice(16, 28)));
  assert.equal(text(ac), sw.actions);
  // Und der Baustein sagt dasselbe, auf dem echten Paar.
  assert.deepEqual(beweiseZaehler({ scenario: EINGANG, action: actions }, zielZ()), []);
});

test('ED 1: der Beweis fängt, was nicht stimmt – ein fremdes Feld, ein zweiter entfallener Schritt, ein verschobener Eintrag, eine andere Aktion, ein Zähler, der bleibt', () => {
  const vor = { scenario: EINGANG, action: actions };
  const z = () => copy(zielZ());
  const a = z(); a.scenario.villagers.seats[1].tableau.x += 1;
  assert.ok(beweiseZaehler(vor, a).some(m => /scenario_data/.test(m)), 'ein Feld neben counters');
  const b = z(); b.scenario.villagers.roster['Judy Marks'].short = 'Judie';
  assert.ok(beweiseZaehler(vor, b).some(m => /scenario_data/.test(m)), 'das Roster');
  const c = z(); dorf(c.action).steps.splice(20, 1);
  assert.ok(beweiseZaehler(vor, c).some(m => /action_data/.test(m)), 'ein Schritt zu viel entfallen');
  const d = z(); dorf(d.action).steps[30].slot = '$V9LEB';
  assert.ok(beweiseZaehler(vor, d).some(m => /action_data/.test(m)), 'ein Schritt neben den entfallenen');
  const e = z(); e.action.find(x => x.id === 'kampf-beginnen').steps[8].value = 0;
  assert.ok(beweiseZaehler(vor, e).some(m => /action_data/.test(m)), 'eine andere Aktion');
  const f = z(); f.scenario = { options: f.scenario.options, ...Object.fromEntries(Object.entries(f.scenario).filter(([k]) => k !== 'options')) };
  assert.ok(beweiseZaehler(vor, f).some(m => /scenario_data/.test(m)), 'die Reihenfolge der Schlüssel');
  const g = z(); g.scenario.villagers.seats[0].counters = copy(EINGANG.villagers.seats[0].counters);
  assert.ok(beweiseZaehler(vor, g).some(m => /seats\[0\]\.counters/.test(m)), 'ein Zähler, der noch da ist, ist kein Zielstand');
  const h = z(); dorf(h.action).steps.splice(16, 0, copy(ZWOELF[0]));
  assert.ok(beweiseZaehler(vor, h).some(m => /action_data/.test(m)), 'ein set_counter zu wenig entfallen');
  const i = z(); i.action.push({ id: 'neu', label: 'x', steps: [] });
  assert.ok(beweiseZaehler(vor, i).some(m => /action_data/.test(m)), 'eine Aktion mehr');
});

// ── ED 2. Vorbedingung je Stück ─────────────────────────────────────────────

test('ED 2: die Fixture trägt genau die Stücke, die der Schritt erwartet – zwölf `set_counter` ($V<n> + Wert; `max` bei Leben, `base` sonst) an 16–27, den `require_counter` an 1', () => {
  const st = dorf(actions).steps;
  assert.deepEqual(st.slice(16, 28).map(text), ZWOELF.map(text));
  assert.deepEqual(st[1], {
    type: 'require_counter', name: ['$V1: Leben', '$V2: Leben', '$V3: Leben'], above: 0, confirm: true,
    message: 'Alle drei Lebenszähler stehen auf 0 — alle Dörfler sind besiegt. Nach [DE S.22] ist die Partie damit zu Ende.',
  });
  assert.deepEqual(Object.keys(st[1]), ['type', 'name', 'above', 'confirm', 'message']);
  EINGANG.villagers.seats.forEach(s => assert.deepEqual(Object.keys(s.counters), WERTE));
  assert.equal(patchZaehler(EINGANG, actions, zones).art, 'zu-schreiben');
});

test('ED 2: jeder der zwölf Schritte 16–27 muss genau der `set_counter` sein – Name, Wert, Art, ein Feld mehr: Abbruch mit Pfad und Index', () => {
  for (let i = 16; i < 28; i++) {
    const flip = dorf(actions).steps[i].value === 'max' ? 'base' : 'max';
    for (const fn of [
      (s) => { s[i].name += 'x'; },
      (s) => { s[i].name = s[i].name.replace('$V', 'Henlo'); },
      (s) => { s[i].value = flip; },
      (s) => { s[i].type = 'place_counter'; },
      (s) => { s[i].onlyChoice = { partie: 'kurz' }; },
    ]) abbruchZ(patchZaehler(EINGANG, mitAktionen(fn), zones), 'dorfphase-beginnen', `steps[${i}]`);
  }
  // Die Reihenfolge: zwei vertauscht – beide Indizes werden genannt.
  abbruchZ(patchZaehler(EINGANG, mitAktionen((s) => { [s[17], s[18]] = [s[18], s[17]]; }), zones), 'steps[17]', 'steps[18]');
  // Einer fehlt, einer mehr.
  abbruchZ(patchZaehler(EINGANG, mitAktionen((s) => { s.splice(20, 1); }), zones), 'dorfphase-beginnen');
  abbruchZ(patchZaehler(EINGANG, mitAktionen((s) => { s.push({ type: 'shuffle' }); }), zones), 'dorfphase-beginnen');
  abbruchZ(patchZaehler(EINGANG, mitAktionen((s) => { s.splice(28, 0, copy(ZWOELF[0])); }), zones), 'dorfphase-beginnen');
});

test('ED 2: der alte Schritt 1 muss genau der `require_counter` sein – Name, `above`, `confirm`, `message`, Feld mehr, Reihenfolge der Felder: Abbruch mit Pfad', () => {
  for (const fn of [
    (s) => { s[1].name = ['$V1: Leben', '$V2: Leben']; },
    (s) => { s[1].name.reverse(); },
    (s) => { s[1].above = 1; },
    (s) => { s[1].confirm = false; },
    (s) => { s[1].message += ' '; },
    (s) => { s[1].onlyFinal = true; },
    (s) => { delete s[1].message; },
    (s) => { s[1] = { type: s[1].type, above: s[1].above, name: s[1].name, confirm: s[1].confirm, message: s[1].message }; },
    (s) => { s[1].type = 'require_zone'; },
    (s) => { s[1] = { type: 'require_zone', zoneLabel: 'Bösewicht-Tableau', expect: 'occupied' }; },
  ]) abbruchZ(patchZaehler(EINGANG, mitAktionen(fn), zones), 'dorfphase-beginnen', 'steps[1]');
});

test('ED 2: die drei `counters` müssen genau die der Daten sein – eine Koordinate, ein Schlüssel weg, einer mehr, leer, null: Abbruch mit Pfad `seats[<i>].counters`', () => {
  for (let i = 0; i < 3; i++) {
    for (const fn of [
      (s) => { s[i].counters.Mumm.x += 1; },
      (s) => { delete s[i].counters.Präzision; },
      (s) => { s[i].counters.Glück = { x: 1, y: 1 }; },
      (s) => { s[i].counters = {}; },
      (s) => { s[i].counters = null; },
      (s) => { s[i].counters = { Bewegung: s[i].counters.Bewegung, Leben: s[i].counters.Leben, Mumm: s[i].counters.Mumm, Präzision: s[i].counters.Präzision }; },
    ]) abbruchZ(patchZaehler(mitSzenario(fn), actions, zones), `seats[${i}].counters`);
  }
  abbruchZ(patchZaehler(mitSzenario((s) => { s.pop(); }), actions, zones), 'seats');
  const ohne = copy(EINGANG); delete ohne.villagers;
  abbruchZ(patchZaehler(ohne, actions, zones), 'villagers');
});

test('ED 2: die Aktion muss es geben, genau einmal, mit Schritten – sonst Abbruch', () => {
  abbruchZ(patchZaehler(EINGANG, actions.filter(a => a.id !== 'dorfphase-beginnen'), zones), 'dorfphase-beginnen');
  abbruchZ(patchZaehler(EINGANG, [...actions, copy(dorf(actions))], zones), 'dorfphase-beginnen');
  abbruchZ(patchZaehler(EINGANG, 'keine Aktionen', zones), 'action_data');
  abbruchZ(patchZaehler(EINGANG, mitAktionen((s, a) => { dorf(a).steps = 'kein Feld'; }), zones), 'dorfphase-beginnen');
});

test('ED 2: ein halber Stand ist ein Abbruch – Zähler weg und Schritte alt, Schritte neu und Zähler da, Wache neu und `set_counter` da, nur zwei Plätze ohne Zähler', () => {
  const z = zielZ();
  abbruchZ(patchZaehler(z.scenario, actions, zones), 'halber Stand');
  abbruchZ(patchZaehler(EINGANG, z.action, zones), 'halber Stand');
  abbruchZ(patchZaehler(mitSzenario((s) => { delete s[2].counters; }), actions, zones), 'halber Stand', 'seats[2]');
  abbruchZ(patchZaehler(EINGANG, mitAktionen((s) => { s[1] = JSON.parse(WACHE_SOLL); }), zones), 'halber Stand');
  // die Wache alt, die zwölf Schritte schon weg
  abbruchZ(patchZaehler(EINGANG, mitAktionen((s) => { s.splice(16, 12); }), zones), 'halber Stand');
  // Alles neu bis auf einen Platz: eine Meldung, die den Platz nennt.
  const fast = copy(z.scenario); fast.villagers.seats[1].counters = copy(EINGANG.villagers.seats[1].counters);
  abbruchZ(patchZaehler(fast, z.action, zones), 'seats[1]');
});

test('ED 2: das Ziel selbst ist „schon geschrieben“ – nichts zu tun, die Eingabe kommt gleich zurück und wird nicht verändert', () => {
  const s = copy(zielZ().scenario), a = copy(zielZ().action);
  const r = patchZaehler(s, a, zones);
  assert.equal(r.art, 'schon-da');
  assert.equal(text(r.scenario), text(zielZ().scenario));
  assert.equal(text(r.action), text(zielZ().action));
  assert.equal(text(s), text(zielZ().scenario));
  // Die Eingabe des Ausgangs wird nicht verändert.
  const e = copy(EINGANG), x = copy(actions);
  const q = patchZaehler(e, x, zones);
  assert.equal(q.art, 'zu-schreiben');
  assert.equal(text(e), text(EINGANG));
  assert.equal(text(x), sw.actions);
  assert.notEqual(q.scenario, e);
  assert.notEqual(q.action, x);
});

// ── ED 3. Der neue Schritt 1 im Wortlaut ────────────────────────────────────

test('ED 3: Schritt 1 ist `require_marker` im Wortlaut von M30.9 – Schlüsselreihenfolge, drei Zonen, `above` 0, `confirm`, der Satz', () => {
  const w = dorf(zielZ().action).steps[1];
  assert.equal(text(w), WACHE_SOLL);
  assert.deepEqual(Object.keys(w), ['type', 'zoneLabel', 'above', 'confirm', 'message']);
  assert.equal(w.type, 'require_marker');
  assert.deepEqual(w.zoneLabel, ['Dörfler 1: Leben', 'Dörfler 2: Leben', 'Dörfler 3: Leben']);
  assert.equal(w.above, 0);
  assert.equal(w.confirm, true);
  assert.match(w.message, /Auf keiner Lebensleiste liegt noch ein Marker/);
  assert.doesNotMatch(w.message, /Zähler/, 'die Wache spricht von Markern');
});

test('ED 3: die drei Zonen der Wache gibt es in den Zonen – fehlt eine, gibt es keinen Zielstand (auch beim „schon geschrieben“)', () => {
  for (const z of dorf(zielZ().action).steps[1].zoneLabel) assert.ok(zones.some(x => x.label === z), z);
  for (const n of [1, 2, 3]) {
    const ohne = zones.filter(z => z.label !== `Dörfler ${n}: Leben`);
    abbruchZ(patchZaehler(EINGANG, actions, ohne), `Dörfler ${n}: Leben`);
    abbruchZ(patchZaehler(zielZ().scenario, zielZ().action, ohne), `Dörfler ${n}: Leben`);
  }
  // Ein ähnlicher Name ist keine Zone.
  const falsch = zones.map(z => (z.label === 'Dörfler 2: Leben' ? { ...z, label: 'Dörfler 2: Leben ' } : z));
  abbruchZ(patchZaehler(EINGANG, actions, falsch), 'Dörfler 2: Leben');
  // Keine Zonen: nichts zu prüfen, also kein Schreiben.
  for (const keine of [[], undefined, null, 'zonen']) abbruchZ(patchZaehler(EINGANG, actions, keine), 'zone');
});

// ── ED 4. Der Tisch ─────────────────────────────────────────────────────────

const aktion = (acts, id) => acts.find(a => a.id === id).steps;
const scZ = () => zielZ().scenario;
const acZ = () => zielZ().action;
const tischZ = (choices = {}, seed = 1) => tisch(scZ(), ziel.sequence, choices, seed);
const lauf2 = (stateObj, steps, scenarioData, seed = 7) => executeSequenceWithLog(stateObj, steps, zones, { assets, cards, grids, scenarioData, rng: seededRng(seed) });
/** Einen echten Kampf beginnen (die Aktion aus den Daten) – der Tisch „nach einem Kampf“. */
const kampf = (s, scenarioData) => {
  const r = lauf2(s, aktion(actions, 'kampf-beginnen'), scenarioData);
  assert.deepEqual(r.log.filter(e => e.status === 'failed'), [], 'der Kampf beginnt ohne Fehlschlag');
  return r.state;
};
const AUSSEN = { x: 5, y: 5 };
const lebenMarker = (s) => [1, 2, 3].map(n => s.tokens.find(t => t.label === `Marker ${n}: Leben`));
/** Je Marker: [Name, Nummer des Platzes, auf dem er liegt, Startwert des Dörflers] */
const beiStart = (s, scenarioData) => {
  const rz = zonenVon(s);
  const p = [];
  for (const { n, data } of seatedVillagers(s, assets, scenarioData.villagers)) {
    for (const wert of WERTE) {
      const m = s.tokens.find(t => t.label === `Marker ${n}: ${wert}`);
      p.push([`${data.short} ${wert}`, m ? zoneSlotNumberAt(rz.find(z => z.label === `Dörfler ${n}: ${wert}`), m.x, m.y) : null, data.start[wert]]);
    }
  }
  return p;
};
const alleAmStart = (s, scenarioData) => beiStart(s, scenarioData).every(([, ist, soll]) => ist === soll);
/** Alle zwölf Marker auf Platz 1 ihrer Leiste – keiner liegt auf seinem Startwert. */
const aufPlatzEins = (s) => {
  const rz = zonenVon(s);
  for (const m of s.tokens.filter(t => /^Marker \d: /.test(t.label))) {
    const [, n, wert] = m.label.match(/^Marker (\d): (.+)$/);
    Object.assign(m, zoneSlotNumbered(rz.find(z => z.label === `Dörfler ${n}: ${wert}`), 1));
  }
  return s;
};

test('ED 4a: der Aufbau ohne Zähler am Platz – nur `Münzen (gemeinsam)` und die zwei Bösewicht-Zähler; sonst derselbe Tisch wie vor ED', () => {
  const neu = tischZ();
  const alt = tisch(EINGANG, ziel.sequence, {});
  assert.deepEqual(nichtOk(neu.log), [], neu.log.map(e => e.reason).join('\n'));
  assert.deepEqual(neu.state.counters.map(c => c.name), ['Münzen (gemeinsam)', 'Bösewicht: Bewegung', 'Bösewicht: Leben']);
  assert.equal(alt.state.counters.length, 15, 'vor ED: zwölf Zähler der Dörfler mehr');
  for (const feld of ['tokens', 'cards', 'boards']) assert.deepEqual(ohneIds(neu.state[feld]), ohneIds(alt.state[feld]), feld);
  assert.deepEqual(stapel(neu.state), stapel(alt.state), 'stacks');
  assert.deepEqual(neu.log.map(e => [e.index, e.type, e.status, e.reason]), alt.log.map(e => [e.index, e.type, e.status, e.reason]));
  const muenzen = (s) => s.counters.find(c => c.name === 'Münzen (gemeinsam)').value;
  assert.equal(muenzen(neu.state), muenzen(alt.state));
  assert.deepEqual(seatedVillagers(neu.state, assets, scZ().villagers).map(s => s.name), ['Henlo Bulwark', 'Fridgette Jones', 'Granny Melba']);
  assert.equal(beiStart(neu.state, scZ()).length, 12);
  assert.ok(alleAmStart(neu.state, scZ()), 'zwölf Marker auf den Startwerten');
});

test('ED 4a: die Wahl Judy / Norman / Quintus und die Doppelwahl auf dem neuen Tisch – drei Zähler, zwölf Marker auf den Startwerten; zweimal Judy lässt Platz 2 leer', () => {
  const { state: s, log } = tischZ({ doerfler1: 'Judy', doerfler2: 'Norman', doerfler3: 'Quintus' });
  assert.deepEqual(nichtOk(log), [], log.map(e => e.reason).join('\n'));
  assert.equal(s.counters.length, 3);
  assert.equal(beiStart(s, scZ()).length, 12);
  assert.ok(alleAmStart(s, scZ()), JSON.stringify(beiStart(s, scZ())));
  const d = tischZ({ doerfler1: 'Judy', doerfler2: 'Judy', doerfler3: 'Granny' });
  assert.equal(d.log.filter(e => e.status === 'skipped').length, 1);
  assert.equal(d.state.counters.length, 3);
});

test('ED 4b: „Dorfphase beginnen“ nach einem Kampf – keine `skipped`-Zeile, 33 Zeilen im Protokoll, zwölf Marker auf den Startwerten, die drei Zähler bleiben', () => {
  const sd = scZ();
  const verbraucht = aufPlatzEins(copy(kampf(tischZ().state, sd)));
  assert.ok(beiStart(verbraucht, sd).every(([, ist, soll]) => ist !== soll), 'vorher liegt keiner auf seinem Startwert');
  const r = lauf2(verbraucht, aktion(acZ(), 'dorfphase-beginnen'), sd);
  assert.deepEqual(r.log.filter(e => e.status === 'skipped'), [], 'keine skipped-Zeile');
  assert.deepEqual(r.log.filter(e => e.status === 'failed'), []);
  assert.deepEqual(nichtOk(r.log), [], r.log.map(e => `${e.index} ${e.status}: ${e.reason}`).join('\n'));
  assert.equal(r.log.length, 33);
  assert.ok(alleAmStart(r.state, sd), JSON.stringify(beiStart(r.state, sd)));
  assert.deepEqual(r.state.counters.map(c => c.name), ['Münzen (gemeinsam)', 'Bösewicht: Bewegung', 'Bösewicht: Leben']);
  // Der Beleg, warum es ED gibt: die alte Aktion hielte auf dem neuen Tisch an der Wache und täte nichts.
  const alt = lauf2(verbraucht, aktion(actions, 'dorfphase-beginnen'), sd);
  assert.equal(alt.log.length, 2);
  assert.match(alt.log[1].reason, /no counter named "Henlo: Leben"/);
  assert.equal(JSON.stringify(alt.state), JSON.stringify(verbraucht));
});

test('ED 4c: alle drei Lebensmarker von der Leiste genommen (oder ganz vom Tisch) – die Aktion hält mit der Rückfrage, nichts wird abgeräumt; „Trotzdem“ läuft weiter', () => {
  const sd = scZ();
  const k = kampf(tischZ().state, sd);
  const rz = zonenVon(k);
  for (const n of [1, 2, 3]) assert.ok(!zoneContains(rz.find(z => z.label === `Dörfler ${n}: Leben`), AUSSEN.x, AUSSEN.y), 'der Ort „außerhalb“ liegt in keiner Lebensleiste');
  const steps = aktion(acZ(), 'dorfphase-beginnen');
  for (const [was, vorbereiten] of [
    ['von der Leiste genommen', (s) => { for (const m of lebenMarker(s)) Object.assign(m, AUSSEN); }],
    ['ganz vom Tisch', (s) => { s.tokens = s.tokens.filter(t => !/^Marker \d: Leben$/.test(t.label)); }],
  ]) {
    const weg = copy(k);
    vorbereiten(weg);
    const r = lauf2(weg, steps, sd);
    const ask = r.log.find(e => e.confirm && e.status !== 'ok');
    assert.ok(ask, `${was}: die Rückfrage fehlt`);
    assert.equal(ask.index, 1, was);
    assert.match(ask.message, /Auf keiner Lebensleiste liegt noch ein Marker/);
    assert.equal(r.log.length, 2, `${was}: die Aktion hält an der Wache`);
    assert.equal(JSON.stringify(r.state), JSON.stringify(weg), `${was}: nichts wird abgeräumt`);
  }
  // „Trotzdem“: dieselbe Aktion ohne die Wache – sie läuft und holt die Marker zurück auf ihre Startwerte.
  const weg = copy(k);
  for (const m of lebenMarker(weg)) Object.assign(m, AUSSEN);
  const trotz = lauf2(weg, steps.filter((_, i) => i !== 1), sd);
  assert.deepEqual(nichtOk(trotz.log), []);
  assert.ok(alleAmStart(trotz.state, sd));
});

test('ED 4d: liegt auch nur einer der drei Lebensmarker auf der Leiste, läuft die Aktion – gleich welcher, und auch auf Platz 1 (die Leiste hat keinen Platz 0)', () => {
  const sd = scZ();
  const k = kampf(tischZ().state, sd);
  const steps = aktion(acZ(), 'dorfphase-beginnen');
  const rz = zonenVon(k);
  for (const bleibt of [0, 1, 2]) {
    for (const platz of [null, 1]) {
      const s = copy(k);
      lebenMarker(s).forEach((m, i) => { if (i !== bleibt) Object.assign(m, AUSSEN); });
      if (platz) Object.assign(lebenMarker(s)[bleibt], zoneSlotNumbered(rz.find(z => z.label === `Dörfler ${bleibt + 1}: Leben`), platz));
      const r = lauf2(s, steps, sd);
      assert.deepEqual(r.log.filter(e => e.confirm), [], `Marker ${bleibt + 1}${platz ? ` auf Platz ${platz}` : ''}: keine Rückfrage`);
      assert.equal(r.log.length, 33);
      assert.deepEqual(nichtOk(r.log), []);
    }
  }
  // Neben seinem Platz ist kein Wert: alle drei daneben → Halt mit Diagnose, **ohne** den Satz „alle besiegt“.
  const s = copy(k);
  for (const m of lebenMarker(s)) m.y += 3;
  const r = lauf2(s, steps, sd);
  assert.equal(r.log.length, 2);
  assert.notEqual(r.log[1].status, 'ok');
  assert.ok(!r.log[1].confirm, 'unlesbar ist keine Rückfrage');
  assert.ok(!/alle drei Dörfler sind besiegt/.test(String(r.log[1].message ?? '')), 'die Wache behauptet nichts, was sie nicht weiß');
  // …aber ein lesbarer neben unlesbaren genügt („mindestens einer“).
  const t = copy(k);
  lebenMarker(t).forEach((m, i) => { if (i !== 0) m.y += 3; });
  const q = lauf2(t, steps, sd);
  assert.equal(q.log.length, 33);
  assert.deepEqual(q.log.filter(e => e.confirm), []);
});

test('ED 4e: der Tausch (`swapAction`) – am unberührten Tisch ohne Rückfrage, nach Verschieben des Lebensmarkers mit Rückfrage, Abbrechen ändert nichts', () => {
  const sd = scZ();
  const t = tischZ().state;
  const action = swapAction(sd.villagers, 1, 'Henlo Bulwark', 'Judy Marks');
  const frisch = lauf2(t, action.steps, sd);
  assert.deepEqual(frisch.log.map(e => e.status), ['ok', 'ok', 'ok']);
  assert.ok(seatedVillagers(frisch.state, assets, sd.villagers).some(s => s.name === 'Judy Marks'));
  const judy = beiStart(frisch.state, sd).filter(([w]) => /^Judy/.test(w));
  assert.equal(judy.length, 4);
  assert.ok(judy.every(([, ist, soll]) => ist === soll), 'die Marker des Neuen auf ihren Startwerten');

  const gespielt = copy(t);
  Object.assign(lebenMarker(gespielt)[0], zoneSlotNumbered(zonenVon(gespielt).find(z => z.label === 'Dörfler 1: Leben'), 2)); // Henlo startet auf 3
  const first = lauf2(gespielt, action.steps, sd);
  const ask = first.log.find(e => e.confirm && e.status !== 'ok');
  assert.ok(ask, 'die Rückfrage fehlt');
  assert.equal(ask.index, 1);
  assert.match(ask.message, /Henlo Bulwark/);
  assert.doesNotMatch(ask.reason, /no counter named/);
  assert.equal(JSON.stringify(first.state), JSON.stringify(gespielt), 'Abbrechen lässt den Tisch');
  const trotz = lauf2(gespielt, action.steps.filter((_, i) => i !== ask.index), sd);
  assert.deepEqual(trotz.log.map(e => e.status), ['ok', 'ok']);
});

// ── ED 5. Ein alter Spielstand ──────────────────────────────────────────────

test('ED 5: ein alter Spielstand mit verwaisten Zählern – die neue Dorfphase läuft, die Zähler bleiben stehen, die Marker werden zurückgestellt', () => {
  const sd = scZ();
  const alt = tisch(EINGANG, ziel.sequence, {}).state;   // `build()` der alten Daten: die zwölf Zähler am Platz sind da
  assert.equal(alt.counters.length, 15);
  const verbraucht = aufPlatzEins(copy(kampf(alt, sd)));
  const waisen = (s) => s.counters.filter(x => /^(Henlo|Fridgette|Granny): /.test(x.name));
  for (const c of waisen(verbraucht)) c.value = -2;
  assert.equal(waisen(verbraucht).length, 12);
  const r = lauf2(verbraucht, aktion(acZ(), 'dorfphase-beginnen'), sd);
  assert.deepEqual(r.log.filter(e => e.status !== 'ok'), [], r.log.map(e => `${e.index} ${e.status}: ${e.reason}`).join('\n'));
  assert.equal(r.log.length, 33);
  assert.deepEqual(waisen(r.state), waisen(verbraucht), 'die verwaisten Zähler bleiben, wie sie sind');
  assert.ok(alleAmStart(r.state, sd), 'die Marker sind zurückgestellt');
});

test('ED 5: die Wache liest in einem alten Spielstand die **Marker**, nicht die Zähler – Zähler auf 0 und Marker da: läuft; Marker weg und Zähler über 0: hält', () => {
  const sd = scZ();
  const steps = aktion(acZ(), 'dorfphase-beginnen');
  const k = copy(kampf(tisch(EINGANG, ziel.sequence, {}).state, sd));
  const nullen = copy(k);
  for (const n of ['Henlo', 'Fridgette', 'Granny']) nullen.counters.find(c => c.name === `${n}: Leben`).value = 0;
  const a = lauf2(nullen, steps, sd);
  assert.deepEqual(a.log.filter(e => e.confirm), [], 'die Zähler stehen auf 0, die Marker liegen: keine Rückfrage');
  assert.equal(a.log.length, 33);
  const weg = copy(k);
  for (const m of lebenMarker(weg)) Object.assign(m, AUSSEN);
  assert.ok(['Henlo', 'Fridgette', 'Granny'].every(n => weg.counters.find(c => c.name === `${n}: Leben`).value > 0));
  const b = lauf2(weg, steps, sd);
  assert.ok(b.log.find(e => e.confirm && e.status !== 'ok'), 'die Marker sind weg: die Rückfrage kommt, obwohl die Zähler über 0 stehen');
  assert.equal(b.log.length, 2);
});

// ── ED 6. Disjunkt ──────────────────────────────────────────────────────────

test('ED 6: `zaehler` vor und nach `optionen` – beide Reihenfolgen geben **denselben** Text', () => {
  // zaehler zuerst (auf dem Ausgang von EC), dann optionen.
  const zuerst = patchZaehler(scenario, actions, zones);
  assert.equal(zuerst.art, 'zu-schreiben', (zuerst.probleme ?? []).join('\n'));
  const dann = patchOptionen(zuerst.scenario, sequence);
  assert.equal(dann.art, 'zu-schreiben', (dann.probleme ?? []).join('\n'));
  // optionen zuerst (`ziel`), dann zaehler.
  const danach = patchZaehler(ziel.scenario, actions, zones);
  assert.equal(danach.art, 'zu-schreiben');
  assert.equal(text(dann.scenario), text(danach.scenario));
  assert.equal(text(dann.scenario), text(zielZ().scenario));
  assert.equal(text(dann.sequence), text(ziel.sequence), 'sequence_data ist von zaehler nie berührt');
  assert.equal(text(zuerst.action), text(danach.action), 'action_data hängt nicht von options ab');
  // Auf dem Stand vor EC wird dasselbe Stück entfernt: die Länge fällt um dieselben Zeichen.
  assert.equal(text(zuerst.scenario).length, sw.scenario.length - (text(EINGANG).length - ZIEL_Z.scenario.laenge));
  assert.equal(patchOptionen(zielZ().scenario, ziel.sequence).art, 'schon-da');
});

test('ED 6: nach `boss` (EE: Schritte 14–15 der Dorfphase `clear_table`, in `kampf-beginnen` zwei Schritte weniger) ist `zaehler` genauso anwendbar – die Stücke überschneiden sich nicht', () => {
  const ee = copy(actions);
  const d = dorf(ee).steps;
  d[14] = { type: 'clear_table', assetName: 'Marker: Bösewicht BEW' };
  d[15] = { type: 'clear_table', assetName: 'Marker: Bösewicht LEB' };
  ee.find(a => a.id === 'kampf-beginnen').steps.splice(8, 2);
  const r = patchZaehler(EINGANG, ee, zones);
  assert.equal(r.art, 'zu-schreiben', (r.probleme ?? []).join('\n'));
  const neu = dorf(r.action).steps;
  assert.equal(neu.length, 33);
  assert.equal(text(neu[14]), text(d[14]));
  assert.equal(text(neu[15]), text(d[15]));
  assert.equal(text(r.action.find(a => a.id === 'kampf-beginnen')), text(ee.find(a => a.id === 'kampf-beginnen')));
  assert.deepEqual(beweiseZaehler({ scenario: EINGANG, action: ee }, r), []);
  assert.equal(patchZaehler(r.scenario, r.action, zones).art, 'schon-da');
});

// ── ED 7. Das Gerüst ────────────────────────────────────────────────────────

test('ED 7: `SCHRITTE.zaehler` – Ausgang und Ziel tragen je `scenario` und `action` (Länge, Hash)', () => {
  assert.deepEqual(Object.keys(SCHRITTE.zaehler), ['ausgang', 'ziel']);
  for (const z of [AUSGANG_Z, ZIEL_Z]) {
    assert.deepEqual(Object.keys(z), ['scenario', 'action']);
    for (const k of ['scenario', 'action']) {
      assert.deepEqual(Object.keys(z[k]), ['laenge', 'sha']);
      assert.ok(Number.isInteger(z[k].laenge) && z[k].laenge > 0);
      assert.match(z[k].sha, /^[0-9a-f]{12}$/);
    }
  }
  // Der Ausgang von `zaehler` ist der Zielstand von `optionen` (die empfohlene Reihenfolge) – dieselbe Zahl, nicht eine zweite.
  assert.deepEqual(AUSGANG_Z.scenario, SCHRITTE.optionen.ziel.scenario);
});

test('ED 7: der Kopf des Skripts nennt weder Länge noch Hash des Schrittes `zaehler` – sie stehen als Konstanten, hier wird importiert', () => {
  const quelle = fs.readFileSync(new URL('../../scripts/setupwahl-daten.mjs', import.meta.url), 'utf8');
  const kopf = quelle.split('\n').filter((l, i, alle) => alle.slice(0, i + 1).every(x => x.startsWith('//') || x.trim() === '')).join('\n');
  assert.ok(kopf.length > 400, 'der Kopf ist gefunden');
  for (const z of [AUSGANG_Z, ZIEL_Z]) {
    for (const spalte of ['scenario', 'action']) {
      const { laenge, sha: h } = z[spalte];
      assert.ok(!kopf.includes(h), `der Kopf nennt ${h}`);
      for (const l of [String(laenge), String(laenge).replace(/(\d)(\d{3})$/, '$1 $2'), String(laenge).replace(/(\d)(\d{3})$/, '$1.$2')]) {
        assert.ok(!kopf.includes(l), `der Kopf nennt ${l}`);
      }
    }
  }
});

// ── ED main: der Schritt `zaehler` gegen eine Wegwerf-Datenbank ─────────────
//
// Die Datenbank steht auf dem Zielstand von EC (der Eingang), `action_data` ist die der Fixture. Geschrieben werden
// `scenario_data` und `action_data` – **nicht** `sequence_data`.

const nachEC = () => {
  const d = frischeDatenbank({ scen: text(EINGANG), seq: text(ziel.sequence) });
  return d;
};
const sicherungZ = (tmp, scen = text(EINGANG), act = sw.actions) => {
  const datei = path.join(tmp, 'sicherung-z.json');
  const h = sicherungsHash(scen, act);
  fs.writeFileSync(datei, JSON.stringify({ scenario_data: scen, action_data: act, sha256: h, updated_at: '2026-11-09 00:00:00' }));
  return { datei, h };
};
const schreibenZ = (file, h, extra = []) => ['--write', file, '--schritt', 'zaehler', '--sicherung-sha', h.slice(0, 16), ...extra];
const ohneScAk = (a) => ({ ...a, setups: a.setups.map(r => ({ ...r, scenario_data: undefined, action_data: undefined })) });

test('ED main: `--check` am Ausgangsstand – schreibgeschützt, „zu schreiben“, Plan, Beweise, Prüfer, Zielstand, Hash für die Sicherung', async () => {
  const { tmp, file } = nachEC();
  try {
    const vorher = alles(file);
    fs.chmodSync(file, 0o444);
    const r = await lauf(['--check', file, '--schritt', 'zaehler']);
    fs.chmodSync(file, 0o666);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, new RegExp(`gelesen: scenario_data ${text(EINGANG).length} Zeichen`));
    assert.match(r.out, new RegExp(`action_data ${sw.actions.length} Zeichen`));
    assert.match(r.out, /Einordnung: zu schreiben/);
    for (const i of [0, 1, 2]) assert.ok(r.out.includes(`seats[${i}].counters`), `der Plan nennt seats[${i}].counters`);
    assert.ok(r.out.includes('dorfphase-beginnen[1]: require_counter → require_marker'), r.out);
    assert.ok(/dorfphase-beginnen\[16–27\]/.test(r.out), r.out);
    assert.match(r.out, /Rückwärtsbeweis scenario_data: ja/);
    assert.match(r.out, /Rückwärtsbeweis action_data: ja/);
    assert.match(r.out, /validateScenarioData: 0 Probleme/);
    assert.match(r.out, /validateVillagers: 0 Probleme/);
    assert.ok(r.out.includes(`Zielstand: scenario_data ${ZIEL_Z.scenario.laenge} Zeichen (sha ${ZIEL_Z.scenario.sha}), action_data ${ZIEL_Z.action.laenge} Zeichen (sha ${ZIEL_Z.action.sha})`), r.out);
    assert.ok(r.out.includes(sicherungsHash(text(EINGANG), sw.actions)), 'der Hash, den --write als Sicherung verlangt (über scenario_data und action_data), steht da');
    assert.match(r.out, /würde schreiben: scenario_data \d+ → \d+ Zeichen, action_data \d+ → \d+ Zeichen/);
    assert.doesNotMatch(r.out, /Beanstandungen:? [1-9]/);
    assert.deepEqual(alles(file), vorher, '--check hat nichts geschrieben');
  } finally { weg(tmp); }
});

test('ED main: geschrieben wird mit **einem** UPDATE auf `scenario_data` und `action_data`; `sequence_data` und `state_data` liest keine Abfrage, `zone_data` nur ein lesendes SELECT', async () => {
  const { tmp, file } = nachEC();
  try {
    const optionen = [], sql = [];
    class Spion extends Database {
      constructor(pfad, opt) { optionen.push(opt); super(pfad, opt); }
      prepare(s) { sql.push(s); return super.prepare(s); }
    }
    assert.equal((await lauf(['--check', file, '--schritt', 'zaehler'], { Db: Spion })).code, 0);
    assert.equal(optionen.at(-1).readonly, true);
    sql.length = 0;
    const { h } = sicherungZ(tmp);
    const w = await lauf(schreibenZ(file, h), { Db: Spion });
    assert.equal(w.code, 0, w.out);
    assert.equal(optionen.at(-1).readonly, false);
    const schreibend = sql.filter(s => /^\s*(update|insert|delete|replace|drop|alter|create)\b/i.test(s));
    assert.equal(schreibend.length, 1, schreibend.join('\n'));
    assert.match(schreibend[0].replace(/\s+/g, ' '), /^update setups set scenario_data = \?, action_data = \? where id = \? and scenario_data = \? and action_data = \?$/i);
    const gelesen = sql.filter(s => /\b(sequence_data|state_data)\b/.test(s) && !/order by rowid/i.test(s));
    assert.deepEqual(gelesen, [], 'sequence_data und state_data liest nur der Fingerabdruck (ein Hash je Tabelle)');
    const zonen = sql.filter(s => /\bzone_data\b/.test(s) && !/order by rowid/i.test(s));
    assert.ok(zonen.length >= 1 && zonen.every(s => /^\s*select\b/i.test(s)), zonen.join('\n'));
  } finally { weg(tmp); }
});

test('ED main: `--write` mit Sicherung – beide Spalten auf dem Zielstand, `sequence_data` und **alles sonst** unverändert, Kontrollausgabe neu gelesen', async () => {
  const { tmp, file } = nachEC();
  try {
    const vorher = alles(file);
    const { h } = sicherungZ(tmp);
    const r = await lauf(schreibenZ(file, h));
    assert.equal(r.code, 0, r.out);
    const z = zeile(file);
    assert.equal(z.scenario_data, text(zielZ().scenario));
    assert.equal(z.action_data, text(zielZ().action));
    assert.deepEqual([z.scenario_data.length, sha(z.scenario_data)], [ZIEL_Z.scenario.laenge, ZIEL_Z.scenario.sha]);
    assert.deepEqual([z.action_data.length, sha(z.action_data)], [ZIEL_Z.action.laenge, ZIEL_Z.action.sha]);
    assert.equal(z.sequence_data, text(ziel.sequence), 'sequence_data ist nicht angefasst');
    assert.deepEqual(ohneScAk(alles(file)), ohneScAk(vorher), 'jede andere Spalte, Zeile und Tabelle (auch zone_data, updated_at, save_states, sequence_data) ist gleich');
    assert.match(r.out, /geschrieben: scenario_data/);
    assert.ok(r.out.includes(`${text(EINGANG).length} → ${ZIEL_Z.scenario.laenge} Zeichen, sha ${AUSGANG_Z.scenario.sha} → ${ZIEL_Z.scenario.sha}`), r.out);
    assert.ok(r.out.includes(`${sw.actions.length} → ${ZIEL_Z.action.laenge} Zeichen, sha ${AUSGANG_Z.action.sha} → ${ZIEL_Z.action.sha}`), r.out);
    assert.match(r.out, /Rückwärtsbeweis scenario_data auf der gelesenen Spalte: ja/);
    assert.match(r.out, /Rückwärtsbeweis action_data auf der gelesenen Spalte: ja/);
    assert.match(r.out, /validateScenarioData auf der gelesenen Spalte: 0 Probleme/);
    assert.match(r.out, /dorfphase-beginnen hat 33 Schritte/);
    assert.match(r.out, /Schritt 1 ist require_marker/);
    assert.match(r.out, /Zielstand aus den Konstanten \(.*\): erreicht/);
    assert.match(r.out, /save_states Auto Save: sha \w+ → \w+ gleich/);
  } finally { weg(tmp); }
});

test('ED main: der zweite Lauf – „schon geschrieben“, Rückgabe 0, nichts geschrieben, auch ohne Sicherung', async () => {
  const { tmp, file } = nachEC();
  try {
    const { h } = sicherungZ(tmp);
    assert.equal((await lauf(schreibenZ(file, h))).code, 0);
    const nach1 = alles(file);
    const check = await lauf(['--check', file, '--schritt', 'zaehler']);
    assert.equal(check.code, 0, check.out);
    assert.match(check.out, /schon geschrieben/);
    const r = await lauf(['--write', file, '--schritt', 'zaehler']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /nichts zu schreiben/);
    assert.deepEqual(alles(file), nach1);
  } finally { weg(tmp); }
});

test('ED main: ohne Sicherung kein Schreiben – der Hash gilt für `scenario_data` **und** `action_data`; der einer anderen Spalte oder eines anderen Paares reicht nicht', async () => {
  const { tmp, file } = nachEC();
  try {
    const vorher = alles(file);
    const ohne = await lauf(['--write', file, '--schritt', 'zaehler']);
    assert.equal(ohne.code, 1);
    assert.match(ohne.out, /ohne Sicherung kein Schreiben/);
    for (const falsch of ['abc', 'deadbeefdead', sha(text(EINGANG)), sicherungsHash(text(EINGANG), text(ziel.sequence)).slice(0, 16)]) {
      const r = await lauf(['--write', file, '--schritt', 'zaehler', '--sicherung-sha', falsch]);
      assert.equal(r.code, 1, `${falsch}: ${r.out}`);
    }
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('ED main: ein anderer Stand ist ein Abbruch mit Pfad – ein `set_counter` anders, ein `counters` anders, eine Zone fehlt: nichts geschrieben, kein Schalter dagegen', async () => {
  const faelle = [
    ['action', (() => { const a = copy(actions); dorf(a).steps[21].value = 'max'; return text(a); })(), /steps\[21\]/],
    ['scenario', (() => { const s = copy(EINGANG); s.villagers.seats[1].counters.Mumm.y += 1; return text(s); })(), /seats\[1\]\.counters/],
  ];
  for (const [spalte, fremd, muster] of faelle) {
    const { tmp, file } = nachEC();
    try {
      setze(file, spalte === 'action' ? 'action_data' : 'scenario_data', fremd);
      const vorher = alles(file);
      const c = await lauf(['--check', file, '--schritt', 'zaehler']);
      assert.equal(c.code, 1, c.out);
      assert.match(c.out, /ABWEICHEND/);
      assert.match(c.out, muster);
      assert.match(c.out, /es wird nichts überschrieben/);
      assert.doesNotMatch(c.out, /würde schreiben/);
      const { h } = spalte === 'action' ? sicherungZ(tmp, text(EINGANG), fremd) : sicherungZ(tmp, fremd, sw.actions);
      assert.equal((await lauf(schreibenZ(file, h))).code, 1);
      assert.deepEqual(alles(file), vorher);
    } finally { weg(tmp); }
  }
  // Eine Zone der Wache fehlt in `zone_data`: Abbruch, die Wache hätte nichts zu lesen.
  const { tmp, file } = nachEC();
  try {
    const db = new Database(file);
    db.prepare('update setups set zone_data = ? where id = ?').run(JSON.stringify(zones.filter(z => z.label !== 'Dörfler 3: Leben')), SETUP_ID);
    db.close();
    const vorher = alles(file);
    const c = await lauf(['--check', file, '--schritt', 'zaehler']);
    assert.equal(c.code, 1, c.out);
    assert.match(c.out, /Dörfler 3: Leben/);
    const { h } = sicherungZ(tmp);
    assert.equal((await lauf(schreibenZ(file, h))).code, 1);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('ED main: Vergleich-und-Tausch – ändert jemand **eine** der beiden Spalten zwischen Lesen und Schreiben, wird nichts geschrieben', async () => {
  for (const spalte of ['scenario_data', 'action_data']) {
    const { tmp, file } = nachEC();
    try {
      const { h } = sicherungZ(tmp);
      const fremd = (spalte === 'scenario_data' ? text(EINGANG) : sw.actions) + ' ';
      const r = await lauf(schreibenZ(file, h), { haken: (stelle, db) => { if (stelle === 'nach-lesen') db.prepare(`update setups set ${spalte} = ? where id = ?`).run(fremd, SETUP_ID); } });
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /seit dem Lesen geändert/);
      const z = zeile(file);
      assert.equal(z[spalte], fremd, `${spalte}: die fremde Änderung bleibt stehen`);
      const andere = spalte === 'scenario_data' ? 'action_data' : 'scenario_data';
      assert.equal(z[andere], andere === 'scenario_data' ? text(EINGANG) : sw.actions, `${andere} wurde nicht geschrieben`);
    } finally { weg(tmp); }
  }
});

test('ED main: ändert sich in der Transaktion eine andere Tabelle (Auto Save) oder `sequence_data`, rollt alles zurück', async () => {
  for (const eingriff of [
    "update save_states set state_data = '{\"a\":99}' where name = 'Auto Save'",
    "update setups set sequence_data = sequence_data || ' ' where id = 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b'",
    "update setups set zone_data = zone_data || ' ' where id = 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b'",
  ]) {
    const { tmp, file } = nachEC();
    try {
      const vorher = alles(file);
      const { h } = sicherungZ(tmp);
      const r = await lauf(schreibenZ(file, h), { haken: (stelle, db) => { if (stelle === 'in-transaktion') db.prepare(eingriff).run(); } });
      assert.equal(r.code, 1, `${eingriff}: ${r.out}`);
      assert.match(r.out, /unerwartet geändert/);
      assert.deepEqual(alles(file), vorher, 'Rollback');
    } finally { weg(tmp); }
  }
});

test('ED main: `--zurueck` – der exakte Zielstand kommt auf den Ausgang, Zeichen für Zeichen; ein zweites Mal ist „schon der Ausgangsstand“', async () => {
  const { tmp, file } = nachEC();
  try {
    const vorher = alles(file);
    const { datei, h } = sicherungZ(tmp);
    assert.equal((await lauf(schreibenZ(file, h))).code, 0);
    assert.notDeepEqual(alles(file), vorher);
    const r = await lauf(['--zurueck', datei, file, '--schritt', 'zaehler']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /zurückgeschrieben/);
    assert.match(r.out, /\(= die Sicherung, Zeichen für Zeichen\)/);
    assert.deepEqual(alles(file), vorher, 'jede Tabelle, jede Spalte wie am Anfang');
    const nochmal = await lauf(['--zurueck', datei, file, '--schritt', 'zaehler']);
    assert.equal(nochmal.code, 0, nochmal.out);
    assert.match(nochmal.out, /schon der Ausgangsstand/);
  } finally { weg(tmp); }
});

test('ED main: `--zurueck` ersetzt nur den exakten Zielstand und prüft die Sicherung – danach weitergearbeitet, beschädigt, nicht der Ausgang, falsche Form: nichts wird überschrieben', async () => {
  for (const spalte of ['scenario_data', 'action_data']) {
    const { tmp, file } = nachEC();
    try {
      const { datei, h } = sicherungZ(tmp);
      assert.equal((await lauf(schreibenZ(file, h))).code, 0);
      setze(file, spalte, zeile(file)[spalte] + ' ');
      const vorher = alles(file);
      const r = await lauf(['--zurueck', datei, file, '--schritt', 'zaehler']);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /nicht der Zielstand/);
      assert.deepEqual(alles(file), vorher);
    } finally { weg(tmp); }
  }
  const { tmp, file } = nachEC();
  try {
    const { h } = sicherungZ(tmp);
    assert.equal((await lauf(schreibenZ(file, h))).code, 0);
    const vorher = alles(file);
    const schreibe = (name, o) => { const d = path.join(tmp, name); fs.writeFileSync(d, JSON.stringify(o)); return d; };
    const gut = { scenario_data: text(EINGANG), action_data: sw.actions, sha256: sicherungsHash(text(EINGANG), sw.actions) };
    const kaputt = await lauf(['--zurueck', schreibe('a.json', { ...gut, sha256: 'f'.repeat(64) }), file, '--schritt', 'zaehler']);
    assert.equal(kaputt.code, 1); assert.match(kaputt.out, /beschädigt/);
    const lose = JSON.stringify(JSON.parse(sw.actions), null, 1);
    const nk = await lauf(['--zurueck', schreibe('b.json', { ...gut, action_data: lose, sha256: sicherungsHash(text(EINGANG), lose) }), file, '--schritt', 'zaehler']);
    assert.equal(nk.code, 1); assert.match(nk.out, /kompaktes JSON/);
    const zs = text(zielZ().scenario), za = text(zielZ().action);
    const neu = await lauf(['--zurueck', schreibe('c.json', { scenario_data: zs, action_data: za, sha256: sicherungsHash(zs, za) }), file, '--schritt', 'zaehler']);
    assert.equal(neu.code, 1); assert.match(neu.out, /nicht der Ausgangsstand/);
    const form = await lauf(['--zurueck', schreibe('d.json', { scenario_data: text(EINGANG), sequence_data: text(ziel.sequence), sha256: sicherungsHash(text(EINGANG), text(ziel.sequence)) }), file, '--schritt', 'zaehler']);
    assert.equal(form.code, 1); assert.match(form.out, /nicht die Form/);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('ED main: `zaehler` und `optionen` in jeder Reihenfolge – dieselbe Datenbank am Ende; zurück in der umgekehrten', async () => {
  const lauftSo = async (reihenfolge) => {
    const { tmp, file } = frischeDatenbank();          // der Stand vor EC: beide Schritte stehen aus
    try {
      const vorher = alles(file);
      const gesichert = {};
      for (const schritt of reihenfolge) {
        const z = zeile(file);
        const spalten = schritt === 'optionen' ? [z.scenario_data, z.sequence_data] : [z.scenario_data, z.action_data];
        const datei = path.join(tmp, `sicherung-${schritt}.json`);
        const h = sicherungsHash(...spalten);
        fs.writeFileSync(datei, JSON.stringify({ scenario_data: spalten[0], [schritt === 'optionen' ? 'sequence_data' : 'action_data']: spalten[1], sha256: h }));
        gesichert[schritt] = datei;
        const r = await lauf(['--write', file, '--schritt', schritt, '--sicherung-sha', h.slice(0, 16)]);
        assert.equal(r.code, 0, `${schritt}: ${r.out}`);
      }
      const am_ende = zeile(file);
      for (const schritt of reihenfolge) assert.equal((await lauf(['--check', file, '--schritt', schritt])).code, 0, `${schritt} ist geschrieben`);
      for (const schritt of [...reihenfolge].reverse()) {
        const r = await lauf(['--zurueck', gesichert[schritt], file, '--schritt', schritt]);
        assert.equal(r.code, 0, `zurück ${schritt}: ${r.out}`);
      }
      assert.deepEqual(alles(file), vorher, 'umgekehrt zurück: wie am Anfang');
      return am_ende;
    } finally { weg(tmp); }
  };
  const a = await lauftSo(['optionen', 'zaehler']);
  const b = await lauftSo(['zaehler', 'optionen']);
  assert.equal(a.scenario_data, b.scenario_data);
  assert.equal(a.sequence_data, b.sequence_data);
  assert.equal(a.action_data, b.action_data);
  assert.equal(a.scenario_data, text(zielZ().scenario));
  assert.equal(a.sequence_data, text(ziel.sequence));
  assert.equal(a.action_data, text(zielZ().action));
});

test('ED main: ein unbekanntes Argument ist auch bei `zaehler` ein Benutzungsfehler – es gibt kein `--force`', async () => {
  const { tmp, file } = nachEC();
  try {
    const vorher = alles(file);
    const { h } = sicherungZ(tmp);
    for (const wort of ['--force', '--erzwingen', '-f']) {
      for (const modus of [['--check', file, '--schritt', 'zaehler'], schreibenZ(file, h)]) {
        const r = await lauf([...modus, wort]);
        assert.equal(r.code, 2, `${modus[0]} ${wort}: ${r.out}`);
      }
    }
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

// ── Nachgetragen nach den Mutationen (drei Lücken, die die erste Fassung der Tests nicht fing) ──

test('ED 2: ein Rest, der nicht ins Muster passt, ist kein „schon geschrieben“ – ein `set_counter` auf $V<n> bei 33 Schritten, `counters: null` an allen Plätzen', () => {
  const z = zielZ();
  // Dieselbe Länge (33) wie das Ziel, aber ein Schritt ist ein übrig gebliebener `set_counter` auf einen Dörfler-Zähler.
  for (const name of ['$V1: Leben', '$V2: Mumm', '$V3: Präzision']) {
    const a = copy(z.action);
    dorf(a).steps[20] = { type: 'set_counter', name, value: 'base' };
    assert.equal(dorf(a).steps.length, 33);
    abbruchZ(patchZaehler(z.scenario, a, zones), 'dorfphase-beginnen', name);
  }
  // `counters: null` ist nicht „ohne counters“: der Platz nennt etwas, das nicht der erwartete Text ist.
  const nullen = copy(z.scenario);
  for (const s of nullen.villagers.seats) s.counters = null;
  abbruchZ(patchZaehler(nullen, z.action, zones), 'seats[0].counters', 'seats[1].counters', 'seats[2].counters');
});

test('ED 2: „schon geschrieben“ gibt Kopien zurück, nicht die Eingabe selbst', () => {
  const s = copy(zielZ().scenario), a = copy(zielZ().action);
  const r = patchZaehler(s, a, zones);
  assert.equal(r.art, 'schon-da');
  assert.notEqual(r.scenario, s);
  assert.notEqual(r.action, a);
});

test('ED main: der Rückwärtsbeweis hält den Lauf an – steht `counters` an einem Platz nicht am Ende, ließe sich der Zielstand nicht Zeichen für Zeichen zurückführen', async () => {
  const s = copy(EINGANG);
  const seat = s.villagers.seats[0];
  s.villagers.seats[0] = { anchor: seat.anchor, counters: seat.counters, zones: seat.zones, markers: seat.markers, vorrat: seat.vorrat, tableau: seat.tableau };
  // Der Baustein ordnet das Stück ein (der Text von `counters` ist der erwartete) – erst der Beweis sieht, dass die Reihenfolge nicht stimmt.
  assert.equal(patchZaehler(s, actions, zones).art, 'zu-schreiben');
  assert.ok(beweiseZaehler({ scenario: s, action: actions }, patchZaehler(s, actions, zones)).some(m => /scenario_data/.test(m)));
  const { tmp, file } = frischeDatenbank({ scen: text(s), seq: text(ziel.sequence) });
  try {
    const vorher = alles(file);
    const c = await lauf(['--check', file, '--schritt', 'zaehler']);
    assert.equal(c.code, 1, c.out);
    assert.match(c.out, /Rückwärtsbeweis scenario_data: NEIN/);
    assert.match(c.out, /Rückwärtsbeweis action_data: ja/);
    assert.doesNotMatch(c.out, /würde schreiben/);
    const { h } = sicherungZ(tmp, text(s));
    assert.equal((await lauf(schreibenZ(file, h))).code, 1);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('ED main: ein Prüfer, der etwas findet, hält den Lauf an – `validateVillagers` (ein Platz ohne Tableau-Position), `--check` wie `--write`', async () => {
  const s = copy(EINGANG);
  delete s.villagers.seats[1].tableau;
  const { tmp, file } = frischeDatenbank({ scen: text(s), seq: text(ziel.sequence) });
  try {
    const vorher = alles(file);
    const c = await lauf(['--check', file, '--schritt', 'zaehler']);
    assert.equal(c.code, 1, c.out);
    assert.match(c.out, /validateVillagers: [1-9]/);
    assert.match(c.out, /tableau/);
    assert.doesNotMatch(c.out, /würde schreiben/);
    const { h } = sicherungZ(tmp, text(s));
    assert.equal((await lauf(schreibenZ(file, h))).code, 1);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('ED main: stimmt der gerechnete Zielstand nicht mit der Konstante überein, hält der Lauf an – `--check` wie `--write` (die Konstante wird für den Test kurz verstellt)', async () => {
  const { tmp, file } = nachEC();
  const echt = ZIEL_Z.action.sha;
  try {
    const vorher = alles(file);
    ZIEL_Z.action.sha = '000000000000';
    const c = await lauf(['--check', file, '--schritt', 'zaehler']);
    assert.equal(c.code, 1, c.out);
    assert.match(c.out, /action_data: der gerechnete Zielstand hat/);
    assert.match(c.out, /000000000000/);
    assert.doesNotMatch(c.out, /würde schreiben/);
    const { h } = sicherungZ(tmp);
    assert.equal((await lauf(schreibenZ(file, h))).code, 1);
    assert.deepEqual(alles(file), vorher);
  } finally { ZIEL_Z.action.sha = echt; weg(tmp); }
});

// ═══════════════════════════════════════════════════════════════════════════════════════════════
// EE / Spec M30.8 — Die Zähler des Bösewichts weg: Schritt `boss`
// ═══════════════════════════════════════════════════════════════════════════════════════════════
//
// Drei Stücke, **ein** Schritt, zwei Spalten: Aufbau-Schritte 29–30 (`place_counter Bösewicht: …`) entfallen (`sequence_data`),
// `kampf-beginnen` 8–9 (`set_counter … $BEW/$LEB`) entfallen, und in `dorfphase-beginnen` werden 14–15 (`set_counter … 0`) zu
// `clear_table` auf die zwei Marker (`action_data`). Der Eingang ist der Zielstand von EC **und** ED (`ziel` und `acZ()`); die
// Disjunktheit der drei Schritte (jede Reihenfolge) steht in EE 6. Die Zahlen stehen im Skript (`SCHRITTE.boss`), hier wird importiert.

const AUSGANG_B = SCHRITTE.boss.ausgang, ZIEL_B = SCHRITTE.boss.ziel;
const BEW = 'Bösewicht: Bewegung', LEB = 'Bösewicht: Leben';
const ZAEHLER_B = [{ type: 'place_counter', name: BEW, value: 0, x: 1470, y: 903 }, { type: 'place_counter', name: LEB, value: 0, x: 1470, y: 977 }];
const SETZE_B = [{ type: 'set_counter', name: BEW, value: '$BEW' }, { type: 'set_counter', name: LEB, value: '$LEB' }];
const NULL_B = [{ type: 'set_counter', name: BEW, value: 0 }, { type: 'set_counter', name: LEB, value: 0 }];
/** Im Wortlaut von M30.9: Schlüsselreihenfolge `type`, `assetName` (sie ist Teil des Hashes). */
const RAEUMEN_B = ['{"type":"clear_table","assetName":"Marker: Bösewicht BEW"}', '{"type":"clear_table","assetName":"Marker: Bösewicht LEB"}'];
let _zb;
/** Der Zielstand des Schrittes auf dem Eingang nach EC und ED (einmal gerechnet; wer ihn verändern will, kopiert). */
const zielB = () => (_zb ??= patchBoss(ziel.sequence, acZ()));
const acB = () => zielB().action;
const kampfS = (acts) => aktion(acts, 'kampf-beginnen');
const dorfS = (acts) => aktion(acts, 'dorfphase-beginnen');
const eingangB = () => ({ sq: copy(ziel.sequence), ac: copy(acZ()) });
const abbruchB = (r, ...teile) => {
  assert.equal(r.art, 'abweichend', `erwartet abweichend, war ${r.art}`);
  assert.ok(r.probleme.length > 0);
  assert.equal(r.sequence, undefined, 'ein Abbruch liefert keinen Zielstand');
  assert.equal(r.action, undefined);
  for (const t of teile) assert.ok(r.probleme.join('\n').includes(t), `die Meldung nennt „${t}“: ${r.probleme.join(' | ')}`);
};
const kennz = (t) => [t.length, sha(t)];

// ── EE 1. Der Zielstand ─────────────────────────────────────────────────────

test('EE 1: Zielstand – Länge und Hash beider Spalten wie die Konstanten; der Eingang nach EC und ED ist der Ausgang; 31 → 29, 19 → 17, Dorfphase bleibt 33', () => {
  assert.deepEqual(kennz(text(ziel.sequence)), [AUSGANG_B.sequence.laenge, AUSGANG_B.sequence.sha], 'sequence_data nach EC ist der Ausgang');
  assert.deepEqual(kennz(text(acZ())), [AUSGANG_B.action.laenge, AUSGANG_B.action.sha], 'action_data nach ED ist der Ausgang');
  const r = zielB();
  assert.equal(r.art, 'zu-schreiben', (r.probleme ?? []).join('\n'));
  assert.deepEqual(kennz(text(r.sequence)), [ZIEL_B.sequence.laenge, ZIEL_B.sequence.sha]);
  assert.deepEqual(kennz(text(r.action)), [ZIEL_B.action.laenge, ZIEL_B.action.sha]);
  assert.equal(ziel.sequence.length, 31);
  assert.equal(r.sequence.length, 29);
  assert.equal(kampfS(acZ()).length, 19);
  assert.equal(kampfS(r.action).length, 17);
  assert.equal(dorfS(acZ()).length, 33);
  assert.equal(dorfS(r.action).length, 33, 'zwei Schritte getauscht, nicht gestrichen');
  assert.deepEqual(Object.keys(r), ['art', 'sequence', 'action'], 'der Schritt liefert nur seine zwei Spalten – scenario_data kennt er nicht');
});

test('EE 1: alles andere bleibt byteweise gleich – 29 der 31 Schritte, die Münzen, 17 der 19 Schritte von `kampf-beginnen`, 31 der 33 der Dorfphase, die zwei übrigen Aktionen', () => {
  const r = zielB();
  assert.equal(text(r.sequence), text(ziel.sequence.slice(0, 29)), 'die Folge ist die alte, ohne 29 und 30');
  assert.equal(r.sequence[28].name, 'Münzen (gemeinsam)');
  const k0 = kampfS(acZ()), k1 = kampfS(r.action);
  assert.equal(text(k1), text([...k0.slice(0, 8), ...k0.slice(10)]));
  const d0 = dorfS(acZ()), d1 = dorfS(r.action);
  assert.deepEqual(d1.map((s, i) => i).filter(i => text(d1[i]) !== text(d0[i])), [14, 15]);
  for (const id of ['dorfereignis', 'laden-nachfuellen']) {
    assert.equal(text(r.action.find(a => a.id === id)), text(acZ().find(a => a.id === id)), id);
  }
  assert.deepEqual(r.action.map(a => a.id), acZ().map(a => a.id), 'dieselbe Reihenfolge der Aktionen');
  for (const a of r.action) assert.deepEqual(Object.keys(a), ['id', 'label', 'steps'], 'Schlüssel der Aktion');
  assert.equal(r.action.find(a => a.id === 'kampf-beginnen').label, acZ().find(a => a.id === 'kampf-beginnen').label);
});

test('EE 1: Rückwärtsbeweis – die Schritte 29–30, `kampf-beginnen` 8–9 und Dorfphase 14–15 wieder einsetzen: der gelesene Text, Zeichen für Zeichen', () => {
  const r = zielB();
  const sq = copy(r.sequence);
  sq.splice(29, 0, ...copy(ZAEHLER_B));
  assert.equal(text(sq), text(ziel.sequence));
  const ac = copy(r.action);
  kampfS(ac).splice(8, 0, ...copy(SETZE_B));
  dorfS(ac).splice(14, 2, ...copy(NULL_B));
  assert.equal(text(ac), text(acZ()));
  assert.deepEqual(beweiseBoss({ sequence: ziel.sequence, action: acZ() }, r), []);
});

test('EE 1: der Beweis fängt, was nicht stimmt – ein Zähler, der bleibt, ein fremder Schritt, ein fremdes Feld, eine falsche Dorfphase, eine andere Aktion, die Reihenfolge', () => {
  const vor = { sequence: ziel.sequence, action: acZ() };
  const bis = (fn) => { const x = copy(zielB()); fn(x); return beweiseBoss(vor, x); };
  assert.ok(bis(x => x.sequence.push(copy(ZAEHLER_B[0]))).some(m => /sequence_data/.test(m)), 'der Zähler ist im Zielstand noch da');
  assert.ok(bis(x => { x.sequence[3].count = 99; }).some(m => /sequence_data/.test(m)), 'ein Schritt neben den zweien');
  assert.ok(bis(x => { x.sequence[28].value = 1; }).some(m => /sequence_data/.test(m)), 'die Münzen verändert');
  assert.ok(bis(x => kampfS(x.action).splice(8, 1)).some(m => /action_data/.test(m)), 'ein zweiter entfallener Schritt in kampf-beginnen');
  assert.ok(bis(x => { kampfS(x.action)[6].slot = '$LEB'; }).some(m => /action_data/.test(m)), 'ein Marker-Schritt verändert');
  assert.ok(bis(x => { dorfS(x.action)[14].assetName = 'Marker: Bösewicht LEB'; }).some(m => /action_data/.test(m)), 'ein falsches clear_table');
  assert.ok(bis(x => { dorfS(x.action)[3].zoneLabel = 'X'; }).some(m => /action_data/.test(m)), 'ein Schritt der Dorfphase daneben');
  assert.ok(bis(x => { x.action.find(a => a.id === 'dorfereignis').steps.pop(); }).some(m => /action_data/.test(m)), 'eine andere Aktion');
  assert.ok(bis(x => x.action.reverse()).some(m => /action_data/.test(m)), 'die Reihenfolge der Aktionen');
  assert.ok(bis(x => { dorfS(x.action).splice(14, 2); }).some(m => /action_data/.test(m)), 'die zwei Schritte gestrichen statt getauscht');
});

// ── EE 2. Genau diese Stücke ────────────────────────────────────────────────

test('EE 2: die Fixture trägt genau die Stücke, die der Schritt erwartet – 28 Münzen, 29–30 die Zähler, 8–9 die Werte, 14–15 die Nullen (vor und nach ED gleich)', () => {
  assert.equal(text(ziel.sequence[29]), text(ZAEHLER_B[0]));
  assert.equal(text(ziel.sequence[30]), text(ZAEHLER_B[1]));
  assert.equal(ziel.sequence[28].type, 'place_counter');
  assert.equal(ziel.sequence[28].name, 'Münzen (gemeinsam)');
  for (const acts of [actions, acZ()]) {
    assert.equal(text(kampfS(acts).slice(8, 10)), text(SETZE_B));
    assert.equal(text(dorfS(acts).slice(14, 16)), text(NULL_B), 'vor ED (45 Schritte) wie nach ED (33): 14–15');
  }
  assert.equal(kampfS(actions)[6].assetName, 'Marker: Bösewicht BEW');
  assert.equal(kampfS(actions)[7].assetName, 'Marker: Bösewicht LEB');
});

test('EE 2: jedes der sechs Stücke muss genau das sein – ein Wert, eine Koordinate, ein Feld mehr, ein anderer Typ: Abbruch mit Pfad', () => {
  const faelle = [
    ['sequence[29].x', ({ sq }) => { sq[29].x += 1; }, 'sequence[29]'],
    ['sequence[29].value', ({ sq }) => { sq[29].value = 5; }, 'sequence[29]'],
    ['sequence[30].y', ({ sq }) => { sq[30].y -= 1; }, 'sequence[30]'],
    ['sequence[30] Feld mehr', ({ sq }) => { sq[30].locked = true; }, 'sequence[30]'],
    ['sequence[29] andere Art', ({ sq }) => { sq[29] = { type: 'set_counter', name: BEW, value: 0 }; }, 'sequence[29]'],
    ['sequence[29] anderer Zähler', ({ sq }) => { sq[29].name = 'Bösewicht: Mumm'; }, 'sequence[29]'],
    ['die Folge hat einen harmlosen Schritt mehr', ({ sq }) => { sq.push({ type: 'shuffle', stackLabel: 'x' }); }, 'sequence: 32 Schritte'],
    ['kampf-beginnen hat einen harmlosen Schritt mehr', ({ ac }) => { kampfS(ac).push({ type: 'shuffle', stackLabel: 'x' }); }, '20 Schritte'],
    ['kampf[8] anderer Wert', ({ ac }) => { kampfS(ac)[8].value = '$LEB'; }, 'kampf-beginnen'],
    ['kampf[9] anderer Zähler', ({ ac }) => { kampfS(ac)[9].name = BEW; }, 'steps[9]'],
    ['kampf[8] Feld mehr', ({ ac }) => { kampfS(ac)[8].confirm = true; }, 'steps[8]'],
    ['dorf[14] anderer Wert', ({ ac }) => { dorfS(ac)[14].value = 1; }, 'dorfphase-beginnen'],
    ['dorf[15] anderer Zähler', ({ ac }) => { dorfS(ac)[15].name = 'Bösewicht: Mumm'; }, 'steps[15]'],
    ['dorf[14] ein clear_table, aber das falsche', ({ ac }) => { dorfS(ac)[14] = { type: 'clear_table', assetName: 'Marker: Bösewicht LEB' }; }, 'steps[14]'],
  ];
  for (const [was, fn, pfad] of faelle) {
    const e = eingangB(); fn(e);
    abbruchB(patchBoss(e.sq, e.ac), pfad);
  }
});

test('EE 2: was daneben hängt, muss stimmen – `Münzen (gemeinsam)` an 28 muss da sein, `place_asset` der Marker an 6–7 auch', () => {
  for (const [was, fn, pfad] of [
    ['die Münzen fehlen', ({ sq }) => { sq.splice(28, 1); }, 'sequence'],
    ['die Münzen heißen anders', ({ sq }) => { sq[28].name = 'Münzen'; }, 'sequence[28]'],
    ['die Münzen sind kein Zähler', ({ sq }) => { sq[28] = { type: 'shuffle' }; }, 'sequence[28]'],
    ['der Marker BEW wird nicht mehr gelegt', ({ ac }) => { kampfS(ac)[6].assetName = 'Marker: Bösewicht Z'; }, 'steps[6]'],
    ['der Marker LEB wird nicht mehr gelegt', ({ ac }) => { kampfS(ac).splice(7, 1); }, 'kampf-beginnen'],
  ]) {
    const e = eingangB(); fn(e);
    abbruchB(patchBoss(e.sq, e.ac), pfad);
  }
});

test('EE 2: die Aktionen müssen da sein, je genau einmal, mit Schritten – sonst Abbruch; die Folge muss ein Feld sein', () => {
  const e = eingangB();
  abbruchB(patchBoss(e.sq, e.ac.filter(a => a.id !== 'kampf-beginnen')), 'kampf-beginnen');
  abbruchB(patchBoss(e.sq, e.ac.filter(a => a.id !== 'dorfphase-beginnen')), 'dorfphase-beginnen');
  abbruchB(patchBoss(e.sq, [...e.ac, copy(e.ac.find(a => a.id === 'dorfphase-beginnen'))]), 'dorfphase-beginnen');
  const f = eingangB(); f.ac.find(a => a.id === 'kampf-beginnen').steps = 'x';
  abbruchB(patchBoss(f.sq, f.ac), 'kampf-beginnen');
  for (const keine of [undefined, null, {}, 'x']) {
    abbruchB(patchBoss(keine, e.ac), 'sequence');
    abbruchB(patchBoss(e.sq, keine), 'action');
  }
});

test('EE 2: ein halber Stand ist ein Abbruch – jede Mischung aus „schon“ und „noch nicht“ über die drei Stücke; nur alle alt oder alle neu gilt', () => {
  const z = zielB();
  const misch = (s, k, d) => {
    const e = eingangB();
    if (s) e.sq = copy(z.sequence);
    if (k) e.ac.find(a => a.id === 'kampf-beginnen').steps = copy(kampfS(z.action));
    if (d) e.ac.find(a => a.id === 'dorfphase-beginnen').steps = copy(dorfS(z.action));
    return e;
  };
  for (const s of [0, 1]) for (const k of [0, 1]) for (const d of [0, 1]) {
    const e = misch(s, k, d);
    const r = patchBoss(e.sq, e.ac);
    if (!s && !k && !d) assert.equal(r.art, 'zu-schreiben', (r.probleme ?? []).join('\n'));
    else if (s && k && d) assert.equal(r.art, 'schon-da', (r.probleme ?? []).join('\n'));
    else abbruchB(r, 'halber Stand');
  }
});

test('EE 2: das Ziel selbst ist „schon geschrieben“ – nichts zu tun, die Eingabe kommt gleich zurück (als Kopie) und wird nicht verändert', () => {
  const z = zielB();
  const vorher = text([z.sequence, z.action]);
  const r = patchBoss(z.sequence, z.action);
  assert.equal(r.art, 'schon-da');
  assert.equal(text([r.sequence, r.action]), vorher);
  assert.notEqual(r.sequence, z.sequence);
  assert.notEqual(r.action, z.action);
  assert.equal(text([z.sequence, z.action]), vorher, 'die Eingabe ist unverändert');
  const e = eingangB();
  const aus = text([e.sq, e.ac]);
  patchBoss(e.sq, e.ac);
  assert.equal(text([e.sq, e.ac]), aus, 'auch beim Schreiben bleibt die Eingabe unverändert');
});

test('EE 2: kein anderer Schritt darf die Bösewicht-Zähler lesen – ein `require_counter`, ein `set_counter`, ein Name in einer Liste, in der Folge oder einer Aktion: Abbruch, auch beim „schon geschrieben“', () => {
  const leser = [
    { type: 'require_counter', name: LEB, above: 0, confirm: true, message: 'x' },
    { type: 'set_counter', name: BEW, value: 3 },
    { type: 'require_counter', name: ['$V1: Leben', LEB], above: 0 },
  ];
  for (const schritt of leser) {
    for (const ort of ['dorfereignis', 'laden-nachfuellen', 'kampf-beginnen']) {
      const e = eingangB(); e.ac.find(a => a.id === ort).steps.push(copy(schritt));
      abbruchB(patchBoss(e.sq, e.ac), ort);
    }
    const f = eingangB(); f.sq.splice(5, 0, copy(schritt));
    abbruchB(patchBoss(f.sq, f.ac), 'sequence');
    // Auch am Ziel: wer später einen Leser einbaut, bekommt kein „schon geschrieben“.
    const z = copy(zielB()); z.action.find(a => a.id === 'dorfereignis').steps.push(copy(schritt));
    abbruchB(patchBoss(z.sequence, z.action), 'dorfereignis');
  }
  // Ohne die Länge zu ändern (der Leser **ersetzt** einen Schritt): hier findet nur das Lesen der Schritte selbst den Leser.
  for (const schritt of leser) {
    for (const [ort, i] of [['dorfereignis', 1], ['laden-nachfuellen', 0], ['kampf-beginnen', 16], ['dorfphase-beginnen', 5]]) {
      const e = eingangB(); e.ac.find(a => a.id === ort).steps[i] = copy(schritt);
      abbruchB(patchBoss(e.sq, e.ac), `${ort}].steps[${i}]`, 'nennt');
    }
    const f = eingangB(); f.sq[3] = copy(schritt);
    abbruchB(patchBoss(f.sq, f.ac), 'sequence[3] nennt');
  }
  // Der Name als **Zone** ist kein Zähler: `targetZoneLabel` und `zoneLabel` dürfen ihn tragen (kampf-beginnen 6–7 tun es).
  assert.ok(JSON.stringify(actions).includes(`"targetZoneLabel":"${BEW}"`));
  const e = eingangB(); e.ac.find(a => a.id === 'dorfereignis').steps.push({ type: 'require_zone', zoneLabel: LEB, expect: 'occupied' });
  assert.equal(patchBoss(e.sq, e.ac).art, 'zu-schreiben');
});

// ── EE 3. Die zwei neuen Schritte im Wortlaut ───────────────────────────────

test('EE 3: Dorfphase 14 und 15 sind `clear_table` auf `Marker: Bösewicht BEW` / `…LEB` – Wortlaut von M30.9, Schlüsselreihenfolge, an derselben Stelle', () => {
  const d = dorfS(zielB().action);
  assert.equal(text(d[14]), RAEUMEN_B[0]);
  assert.equal(text(d[15]), RAEUMEN_B[1]);
  assert.deepEqual(Object.keys(d[14]), ['type', 'assetName']);
  // Dieselbe Stelle wie die zwei `set_counter`, davor und danach unberührt.
  const alt = dorfS(acZ());
  assert.equal(text(d.slice(0, 14)), text(alt.slice(0, 14)));
  assert.equal(text(d.slice(16)), text(alt.slice(16)));
  assert.equal(d[13].assetName, '$F3');
});

// ── EE 4. Der Tisch ─────────────────────────────────────────────────────────

const scB = () => scZ();
const tischB = (choices = {}, seed = 1) => tisch(scB(), zielB().sequence, choices, seed);
const tischAlt = (choices = {}, seed = 1) => tisch(scB(), ziel.sequence, choices, seed);
const NAMENLOS = (log) => log.map(e => [e.type, e.status, e.reason]);
/** Die verdeckten Plättchen der Bösewicht-Leiste tragen den Namen dieses Bösewichts – der nächste Kampf ist dann **dieser**. */
const mitBoss = (s, name) => {
  const leiste = zonenVon(s).find(z => z.label === 'Bösewicht-Leiste');
  let n = 0;
  for (const t of s.tokens) if (t.backImageUrl && zoneContains(leiste, t.x, t.y)) { t.label = `Bösewicht: ${name}`; n++; }
  assert.ok(n > 0, 'es liegt noch ein verdecktes Plättchen auf der Leiste');
  return s;
};
const lauf3 = (s, steps, seed = 7) => executeSequenceWithLog(s, steps, zones, { assets, cards, grids, scenarioData: scB(), rng: seededRng(seed) });
const markerB = (s) => ({
  BEW: s.tokens.filter(t => t.label === 'Marker: Bösewicht BEW'),
  LEB: s.tokens.filter(t => t.label === 'Marker: Bösewicht LEB'),
});
const platz = (s, tok, zone) => zoneSlotNumberAt(zonenVon(s).find(z => z.label === zone), tok.x, tok.y);
const wertB = (name) => scB().bosses[name].stats;
const ZAHLEN = () => Object.keys(scB().bosses).filter(n => typeof scB().bosses[n].stats.BEW === 'number' && typeof scB().bosses[n].stats.LEB === 'number');
/** Einen Kampf beginnen (die neue Aktion), auf Wunsch gegen einen bestimmten Bösewicht. */
const kampf2 = (s, n = null) => {
  const r = lauf3(copy(n ? mitBoss(copy(s), n) : s), kampfS(acB()));
  assert.deepEqual(r.log.filter(e => e.status === 'failed'), [], 'der Kampf beginnt ohne Fehlschlag');
  return r.state;
};

test('EE 4a: der Aufbau – nur `Münzen (gemeinsam)` als Zähler; sonst derselbe Tisch wie vor EE, das Protokoll gleich bis auf die zwei entfallenen Zeilen', () => {
  const neu = tischB(), alt = tischAlt();
  assert.deepEqual(nichtOk(neu.log), [], neu.log.map(e => e.reason).join('\n'));
  assert.deepEqual(neu.state.counters.map(c => c.name), ['Münzen (gemeinsam)']);
  assert.deepEqual(alt.state.counters.map(c => c.name), ['Münzen (gemeinsam)', BEW, LEB], 'vor EE: die zwei Bösewicht-Zähler mehr');
  assert.equal(neu.state.counters[0].value, alt.state.counters[0].value, 'der Wert der Münzen ist derselbe');
  for (const feld of ['tokens', 'cards', 'boards']) assert.deepEqual(ohneIds(neu.state[feld]), ohneIds(alt.state[feld]), feld);
  assert.deepEqual(stapel(neu.state), stapel(alt.state), 'stacks');
  assert.deepEqual(NAMENLOS(neu.log), NAMENLOS(alt.log.filter(e => e.index < 29 || e.index > 30)));
  assert.equal(neu.log.length, alt.log.length - 2, 'zwei Zeilen weniger im Protokoll (das Protokoll führt nur, was etwas getan oder gemeldet hat)');
  // Die Wahl der Dörfler ändert daran nichts: die Münzen sind in jedem Fall das einzige Zählerobjekt.
  const w = tischB({ doerfler1: 'Judy', doerfler2: 'Norman', doerfler3: 'Quintus' });
  assert.deepEqual(nichtOk(w.log), []);
  assert.deepEqual(w.state.counters.map(c => c.name), ['Münzen (gemeinsam)']);
  assert.ok(alleAmStart(w.state, scB()));
});

test('EE 4a: `Münzen (gemeinsam)` bleibt – die Folge legt sie (Schritt 28, `$optMuenzen`), der Tisch trägt sie, durch Kampf und Dorfphase; keine Leiste, kein Marker, kein Ersatz', () => {
  assert.equal(text(zielB().sequence[28]), text(ziel.sequence[28]));
  assert.equal(zielB().sequence[28].value, '$optMuenzen');
  const standard = tischB({}).state.counters, ohneTroedel = tischB({ troedel: 'ohne' }).state.counters;
  assert.deepEqual(standard.map(c => c.name), ['Münzen (gemeinsam)']);
  assert.deepEqual(ohneTroedel.map(c => c.name), ['Münzen (gemeinsam)']);
  assert.ok(!zones.some(z => /Münzen/.test(z.label)), 'keine Leiste');
  assert.ok(!assets.some(a => /Münzen/.test(a.name)), 'kein Marker');
  const d = lauf3(copy(kampf2(tischB().state)), dorfS(acB()));
  assert.deepEqual(d.state.counters.map(c => c.name), ['Münzen (gemeinsam)']);
  // Der Wert ändert sich in der Dorfphase (Einkommen) – heute wie nach dem Schnitt gleich: dieselbe Zahl wie mit den Zählern.
  const alt = lauf3(copy(lauf3(copy(tischAlt().state), kampfS(acZ())).state), dorfS(acZ()));
  assert.equal(d.state.counters[0].value, alt.state.counters.find(c => c.name === 'Münzen (gemeinsam)').value);
});

test('EE 4b: für **jeden** Bösewicht mit Zahlen – die Marker liegen auf den Plätzen seiner Werte, kein Zähler außer den Münzen, derselbe Tisch wie mit den Zählern', () => {
  const namen = ZAHLEN();
  assert.equal(namen.length, 19, 'Barry Bluff ist der zwanzigste und hat Formeltexte');
  assert.equal(Object.keys(scB().bosses).length, 20);
  for (const name of namen) {
    const { BEW: b, LEB: l } = wertB(name);
    const neu = lauf3(copy(mitBoss(copy(tischB().state), name)), kampfS(acB()));
    const alt = lauf3(copy(mitBoss(copy(tischAlt().state), name)), kampfS(acZ()));
    const m = markerB(neu.state);
    assert.equal(m.BEW.length, 1, `${name}: ein Marker BEW`);
    assert.equal(m.LEB.length, 1, `${name}: ein Marker LEB`);
    assert.equal(platz(neu.state, m.BEW[0], BEW), b, `${name}: BEW ${b}`);
    assert.equal(platz(neu.state, m.LEB[0], LEB), l, `${name}: LEB ${l}`);
    assert.deepEqual(neu.state.counters.map(c => c.name), ['Münzen (gemeinsam)'], name);
    // Der Beleg, dass nichts verloren geht: der Zähler des alten Tisches zeigte **dieselbe** Zahl wie der Marker.
    assert.deepEqual(alt.state.counters.filter(c => c.name === BEW || c.name === LEB).map(c => [c.name, c.value]), [[BEW, b], [LEB, l]], `${name}: der alte Zähler`);
    for (const feld of ['tokens', 'cards', 'boards']) assert.deepEqual(ohneIds(neu.state[feld]), ohneIds(alt.state[feld]), `${name}: ${feld}`);
    assert.deepEqual(stapel(neu.state), stapel(alt.state), `${name}: stacks`);
    assert.deepEqual(NAMENLOS(neu.log), NAMENLOS(alt.log.filter(e => e.index < 8 || e.index > 9)), `${name}: Protokoll gleich bis auf die zwei Zeilen`);
    assert.equal(neu.log.length, alt.log.length - 2, name);
    assert.deepEqual(neu.log.filter(e => e.status === 'failed'), [], name);
  }
});

test('EE 4c: Barry Bluff – kein Marker, kein Zähler, die Zeile `has no place` wie heute; der Kampf läuft bis zum Ende', () => {
  const neu = lauf3(copy(mitBoss(copy(tischB().state), 'Barry Bluff')), kampfS(acB()));
  const alt = lauf3(copy(mitBoss(copy(tischAlt().state), 'Barry Bluff')), kampfS(acZ()));
  assert.equal(typeof wertB('Barry Bluff').LEB, 'string', 'Barrys Werte sind Formeltexte');
  const m = markerB(neu.state);
  assert.deepEqual([m.BEW.length, m.LEB.length], [0, 0], 'kein Marker');
  assert.deepEqual(neu.state.counters.map(c => c.name), ['Münzen (gemeinsam)'], 'kein Zähler');
  const keinPlatz = neu.log.filter(e => /has no place/.test(e.reason ?? ''));
  assert.ok(keinPlatz.length >= 1, neu.log.map(e => `${e.index} ${e.status}: ${e.reason}`).join('\n'));
  assert.ok(keinPlatz.every(e => e.type === 'place_asset'));
  assert.deepEqual(keinPlatz.map(e => e.reason), alt.log.filter(e => /has no place/.test(e.reason ?? '')).map(e => e.reason), 'dieselben Zeilen wie heute');
  assert.equal(neu.log.length, alt.log.length - 2, 'der Aufbau läuft bis zum letzten Schritt – dieselben Zeilen wie heute, bis auf die zwei entfallenen');
  assert.equal(neu.log.at(-1).index, alt.log.at(-1).index - 2, 'und der letzte Schritt ist der letzte');
  assert.deepEqual(neu.log.filter(e => e.status === 'failed'), []);
  for (const feld of ['tokens', 'cards', 'boards']) assert.deepEqual(ohneIds(neu.state[feld]), ohneIds(alt.state[feld]), feld);
  // Danach räumt die Dorfphase nichts weg und läuft trotzdem durch (nichts zu räumen ist gelungen).
  const d = lauf3(copy(neu.state), dorfS(acB()));
  assert.deepEqual(nichtOk(d.log), [], d.log.map(e => `${e.index} ${e.status}: ${e.reason}`).join('\n'));
});

test('EE 4d: `dorfphase-beginnen` räumt beide Marker vom Tisch; ein zweites Mal ohne Marker ist **ok**, nichts zu räumen ist gelungen', () => {
  const k = kampf2(tischB().state, 'Tartar Fishboy');
  const m = markerB(k);
  assert.deepEqual([m.BEW.length, m.LEB.length], [1, 1], 'vorher liegen zwei Marker auf den Leisten – sonst beweist der Test nichts');
  const d = lauf3(copy(k), dorfS(acB()));
  assert.deepEqual(nichtOk(d.log), [], d.log.map(e => `${e.index} ${e.status}: ${e.reason}`).join('\n'));
  assert.equal(d.log.length, 33);
  assert.deepEqual(d.state.tokens.filter(t => /^Marker: Bösewicht/.test(t.label)), [], 'kein Token mit diesem Namen mehr');
  assert.equal(d.state.tokens.filter(t => /^Marker \d: /.test(t.label)).length, 12, 'die zwölf Marker der Dörfler stehen noch');
  assert.deepEqual(d.state.counters.map(c => c.name), ['Münzen (gemeinsam)']);
  // Die zwei Schritte allein, auf einem Tisch ohne Marker: ok, nicht skipped.
  const nochmal = lauf3(copy(d.state), dorfS(acB()).slice(14, 16));
  assert.deepEqual(nochmal.log.map(e => [e.type, e.status]), [['clear_table', 'ok'], ['clear_table', 'ok']]);
  assert.equal(text(nochmal.state), text(d.state), 'und tun nichts');
  // Auch auf dem frisch gebauten Tisch (vor dem ersten Kampf) sind sie gelungen.
  const frisch = lauf3(copy(tischB().state), dorfS(acB()).slice(14, 16));
  assert.deepEqual(frisch.log.map(e => e.status), ['ok', 'ok']);
});

test('EE 4e: **die Probe am Tisch** – zwei Kämpfe hintereinander; auf den Leisten stehen beim zweiten die Werte des **zweiten** Bösewichts, nicht die des ersten', () => {
  // (1) Der natürliche Lauf: Deputy Waggums (6/14), dann Virginia Fitz (6/15) – wie die Leiste sie ablegt.
  let s = tischB().state;
  s = kampf2(s);
  assert.deepEqual([markerB(s).BEW.length, markerB(s).LEB.length], [1, 1]);
  assert.equal(platz(s, markerB(s).LEB[0], LEB), wertB('Deputy Waggums').LEB, 'erster Bösewicht');
  s = lauf3(s, dorfS(acB())).state;
  assert.deepEqual([markerB(s).BEW.length, markerB(s).LEB.length], [0, 0], 'zwischen den Kämpfen sind die Leisten leer');
  s = kampf2(s);
  assert.deepEqual([markerB(s).BEW.length, markerB(s).LEB.length], [1, 1], 'ein Marker je Leiste, nicht zwei');
  assert.equal(platz(s, markerB(s).BEW[0], BEW), wertB('Virginia Fitz').BEW);
  assert.equal(platz(s, markerB(s).LEB[0], LEB), wertB('Virginia Fitz').LEB, 'zweiter Bösewicht (Virginia Fitz), nicht der erste');
  assert.notEqual(wertB('Virginia Fitz').LEB, wertB('Deputy Waggums').LEB);
  // (2) Zwei Bösewichte, die sich in **beiden** Werten unterscheiden: Tartar Fishboy (9/17), dann Patches (8/2).
  let t = tischB().state;
  t = kampf2(t, 'Tartar Fishboy');
  assert.deepEqual([platz(t, markerB(t).BEW[0], BEW), platz(t, markerB(t).LEB[0], LEB)], [wertB('Tartar Fishboy').BEW, wertB('Tartar Fishboy').LEB]);
  t = lauf3(t, dorfS(acB())).state;
  t = kampf2(t, 'Patches');
  const m = markerB(t);
  assert.deepEqual([m.BEW.length, m.LEB.length], [1, 1]);
  assert.deepEqual([platz(t, m.BEW[0], BEW), platz(t, m.LEB[0], LEB)], [wertB('Patches').BEW, wertB('Patches').LEB]);
  assert.notEqual(wertB('Patches').BEW, wertB('Tartar Fishboy').BEW);
  assert.notEqual(wertB('Patches').LEB, wertB('Tartar Fishboy').LEB);
  assert.deepEqual(t.counters.map(c => c.name), ['Münzen (gemeinsam)']);
  // (3) Barry Bluff trägt keine Zahlen und legt keinen Marker. Mit den zwei `clear_table` liegt danach nichts auf den Leisten …
  let v = kampf2(tischB().state, 'Tartar Fishboy');
  v = lauf3(v, dorfS(acB())).state;
  v = kampf2(v, 'Barry Bluff');
  assert.deepEqual([markerB(v).BEW.length, markerB(v).LEB.length], [0, 0], 'nach Barry Bluff: kein Marker – er hat keine Werte');
  // (4) … und die Gegenprobe, warum es zwei `clear_table` sind und nicht zwei gestrichene Schritte: ohne sie blieben die Marker des ersten
  // Kampfes zwischen den Kämpfen liegen (ein `place_asset` mit gleichem Namen setzt sie nur um) – und vor Barry Bluff mit den Werten des ersten.
  const gestrichen = copy(acB());
  dorfS(gestrichen).splice(14, 2);
  let u = kampf2(tischB().state, 'Tartar Fishboy');
  u = lauf3(u, dorfS(gestrichen)).state;
  assert.deepEqual([markerB(u).BEW.length, markerB(u).LEB.length], [1, 1], 'ohne clear_table steht der Marker des ersten Kampfes zwischen den Kämpfen noch da');
  u = kampf2(u, 'Barry Bluff');
  assert.deepEqual([markerB(u).BEW.length, markerB(u).LEB.length], [1, 1], 'und liegt im Kampf gegen Barry Bluff noch immer dort');
  assert.equal(platz(u, markerB(u).LEB[0], LEB), wertB('Tartar Fishboy').LEB, 'mit dem Wert des **ersten** Bösewichts');
});

test('EE 4f: ein Kampf nach der Dorfphase beginnt mit **neuen** Marker-Plättchen – nicht den alten, nicht verschoben', () => {
  let s = kampf2(tischB().state, 'Tartar Fishboy');
  const alteIds = [...markerB(s).BEW, ...markerB(s).LEB].map(t => t.id);
  assert.equal(alteIds.length, 2);
  s = lauf3(s, dorfS(acB())).state;
  s = kampf2(s, 'Patches');
  const neueIds = [...markerB(s).BEW, ...markerB(s).LEB].map(t => t.id);
  assert.equal(neueIds.length, 2);
  for (const id of neueIds) assert.ok(!alteIds.includes(id), 'ein neues Plättchen');
});

// ── EE 5. Kein anderer Schritt liest die Zähler ─────────────────────────────

test('EE 5: nach dem Schnitt nennt kein Schritt `Bösewicht: Bewegung` / `Bösewicht: Leben` als Zähler – nur als Zone (`targetZoneLabel`)', () => {
  const z = zielB();
  const stellen = [];
  const lies = (wo, schritt) => {
    for (const [k, v] of Object.entries(schritt)) {
      for (const w of Array.isArray(v) ? v : [v]) if (w === BEW || w === LEB) stellen.push([wo, k, w]);
    }
  };
  z.sequence.forEach((s, i) => lies(`sequence[${i}]`, s));
  for (const a of z.action) a.steps.forEach((s, i) => lies(`${a.id}[${i}]`, s));
  assert.ok(stellen.length > 0, 'der Name steht noch als Zone da');
  for (const [wo, k, w] of stellen) assert.ok(['targetZoneLabel', 'zoneLabel'].includes(k), `${wo}.${k} nennt „${w}“ – das ist ein Zähler`);
  // `JSON.stringify` der Folge und der Aktionen: als `"name":` kommt keiner der beiden mehr vor – auf dem Eingang sechsmal.
  const alsName = new RegExp(`"name":"(${BEW}|${LEB})"`, 'g');
  assert.equal((JSON.stringify([ziel.sequence, acZ()]).match(alsName) ?? []).length, 6, 'sechs Stücke nennen sie als Zähler');
  assert.equal((JSON.stringify([z.sequence, z.action]).match(alsName) ?? []).length, 0);
  // Der Tisch: keine Wache und keine Aktion verlangt sie – die Dorfphase hält nirgends an einem fehlenden Zähler.
  const d = lauf3(copy(kampf2(tischB().state)), dorfS(acB()));
  assert.ok(!d.log.some(e => /no counter named/.test(e.reason ?? '')));
});

// ── EE 6. Disjunkt ──────────────────────────────────────────────────────────

const SCHRITTE_NAMEN = ['optionen', 'zaehler', 'boss'];
const REIHENFOLGEN = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map(r => r.map(i => SCHRITTE_NAMEN[i]));
const anwenden = (reihenfolge, start = { scenario: copy(scenario), sequence: copy(sequence), action: copy(actions) }) => {
  let st = start;
  for (const schritt of reihenfolge) {
    const r = schritt === 'optionen' ? patchOptionen(st.scenario, st.sequence)
      : schritt === 'zaehler' ? patchZaehler(st.scenario, st.action, zones)
        : patchBoss(st.sequence, st.action);
    assert.equal(r.art, 'zu-schreiben', `${reihenfolge.join(' → ')}, bei ${schritt}: ${(r.probleme ?? []).join(' | ')}`);
    st = { scenario: r.scenario ?? st.scenario, sequence: r.sequence ?? st.sequence, action: r.action ?? st.action };
  }
  return st;
};

test('EE 6: `optionen`, `zaehler` und `boss` in **jeder** der sechs Reihenfolgen – derselbe Text, und der ist der Zielstand aus den Konstanten', () => {
  const texte = REIHENFOLGEN.map(r => { const st = anwenden(r); return [r.join(' → '), text(st.scenario), text(st.sequence), text(st.action)]; });
  for (const [r, sc, sq, ac] of texte) {
    assert.equal(sc, texte[0][1], `${r}: scenario_data`);
    assert.equal(sq, texte[0][2], `${r}: sequence_data`);
    assert.equal(ac, texte[0][3], `${r}: action_data`);
  }
  const [, sc, sq, ac] = texte[0];
  assert.deepEqual(kennz(sc), [SCHRITTE.zaehler.ziel.scenario.laenge, SCHRITTE.zaehler.ziel.scenario.sha]);
  assert.deepEqual(kennz(sq), [ZIEL_B.sequence.laenge, ZIEL_B.sequence.sha]);
  assert.deepEqual(kennz(ac), [ZIEL_B.action.laenge, ZIEL_B.action.sha]);
});

test('EE 6: jeder Schritt berührt nur sein Stück – `boss` kennt `scenario_data` nicht, und `optionen` und `zaehler` lassen die Münzen und die Bösewicht-Schritte stehen', () => {
  const b = patchBoss(sequence, actions);                    // auf dem Stand vor EC und ED
  assert.equal(b.art, 'zu-schreiben', (b.probleme ?? []).join('\n'));
  assert.equal(b.sequence.length, 29);
  assert.equal(dorfS(b.action).length, 45, 'vor ED: die zwölf set_counter stehen noch, 14–15 sind getauscht');
  assert.equal(text(dorfS(b.action).slice(14, 16)), text(RAEUMEN_B.map(x => JSON.parse(x))));
  assert.equal(text(dorfS(b.action).slice(16)), text(dorfS(actions).slice(16)), '16–27 und der Rest unberührt');
  for (const i of [28, 29, 30]) assert.equal(text(ziel.sequence[i]), text(sequence[i]), `optionen lässt sequence[${i}] stehen`);
  assert.equal(text(dorfS(acZ()).slice(14, 16)), text(dorfS(actions).slice(14, 16)), 'zaehler lässt 14–15 stehen');
  assert.equal(text(kampfS(acZ())), text(kampfS(actions)), 'zaehler lässt kampf-beginnen ganz');
});

// ── EE 7. Das Gerüst ────────────────────────────────────────────────────────

test('EE 7: `SCHRITTE.boss` – Ausgang und Ziel tragen je `sequence` und `action` (Länge, Hash); der Ausgang ist der Zielstand von `optionen` (Folge) und `zaehler` (Aktionen)', () => {
  assert.deepEqual(Object.keys(SCHRITTE.boss), ['ausgang', 'ziel']);
  for (const z of [AUSGANG_B, ZIEL_B]) {
    assert.deepEqual(Object.keys(z), ['sequence', 'action']);
    for (const k of ['sequence', 'action']) {
      assert.deepEqual(Object.keys(z[k]), ['laenge', 'sha']);
      assert.ok(Number.isInteger(z[k].laenge) && z[k].laenge > 0);
      assert.match(z[k].sha, /^[0-9a-f]{12}$/);
    }
  }
  // Dieselbe Zahl, nicht eine zweite (M6).
  assert.deepEqual(AUSGANG_B.sequence, SCHRITTE.optionen.ziel.sequence);
  assert.deepEqual(AUSGANG_B.action, SCHRITTE.zaehler.ziel.action);
});

test('EE 7: der Kopf des Skripts nennt weder Länge noch Hash des Schrittes `boss` – sie stehen als Konstanten, hier wird importiert', () => {
  const quelle = fs.readFileSync(new URL('../../scripts/setupwahl-daten.mjs', import.meta.url), 'utf8');
  const kopf = quelle.split('\n').filter((l, i, alle) => alle.slice(0, i + 1).every(x => x.startsWith('//') || x.trim() === '')).join('\n');
  assert.ok(kopf.length > 400, 'der Kopf ist gefunden');
  for (const z of [AUSGANG_B, ZIEL_B]) {
    for (const spalte of ['sequence', 'action']) {
      const { laenge, sha: h } = z[spalte];
      assert.ok(!kopf.includes(h), `der Kopf nennt ${h}`);
      for (const l of [String(laenge), String(laenge).replace(/(\d)(\d{3})$/, '$1 $2'), String(laenge).replace(/(\d)(\d{3})$/, '$1.$2')]) {
        assert.ok(!kopf.includes(l), `der Kopf nennt ${l}`);
      }
    }
  }
});

// ── EE main: der Schritt `boss` gegen eine Wegwerf-Datenbank ────────────────
//
// Die Datenbank steht auf dem Zielstand von EC und ED (der Eingang). Geschrieben werden `sequence_data` und `action_data` –
// **nicht** `scenario_data`, und `zone_data` wird von diesem Schritt nicht einmal gelesen.

const nachED = () => frischeDatenbank({ scen: text(scZ()), seq: text(ziel.sequence), act: text(acZ()) });
const sicherungB = (tmp, seq = text(ziel.sequence), act = text(acZ()), name = 'sicherung-b.json') => {
  const datei = path.join(tmp, name);
  const h = sicherungsHash(seq, act);
  fs.writeFileSync(datei, JSON.stringify({ sequence_data: seq, action_data: act, sha256: h, updated_at: '2026-11-09 00:00:00' }));
  return { datei, h };
};
const schreibenB = (file, h, extra = []) => ['--write', file, '--schritt', 'boss', '--sicherung-sha', h.slice(0, 16), ...extra];
const ohneSqAk = (a) => ({ ...a, setups: a.setups.map(r => ({ ...r, sequence_data: undefined, action_data: undefined })) });
const SPALTEN_VON = { optionen: ['scenario_data', 'sequence_data'], zaehler: ['scenario_data', 'action_data'], boss: ['sequence_data', 'action_data'] };

/** Einen Schritt über `main` schreiben, mit einer Sicherung des gelesenen Standes; gibt die Sicherungsdatei zurück. */
async function schreibeSchritt(tmp, file, schritt) {
  const z = zeile(file);
  const [a, b] = SPALTEN_VON[schritt];
  const datei = path.join(tmp, `sicherung-${schritt}.json`);
  const h = sicherungsHash(z[a], z[b]);
  fs.writeFileSync(datei, JSON.stringify({ [a]: z[a], [b]: z[b], sha256: h }));
  const r = await lauf(['--write', file, '--schritt', schritt, '--sicherung-sha', h.slice(0, 16)]);
  assert.equal(r.code, 0, `${schritt}: ${r.out}`);
  return datei;
}

test('EE main: `--check` am Ausgangsstand – schreibgeschützt, „zu schreiben“, Plan, Beweise, Zielstand, Hash für die Sicherung; `scenario_data` und `zone_data` werden nicht gelesen', async () => {
  const { tmp, file } = nachED();
  try {
    const vorher = alles(file);
    const sql = [];
    class Spion extends Database { prepare(s) { sql.push(s); return super.prepare(s); } }
    fs.chmodSync(file, 0o444);
    const r = await lauf(['--check', file, '--schritt', 'boss'], { Db: Spion });
    fs.chmodSync(file, 0o666);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, new RegExp(`gelesen: sequence_data ${text(ziel.sequence).length} Zeichen`));
    assert.match(r.out, new RegExp(`action_data ${text(acZ()).length} Zeichen`));
    assert.match(r.out, /Einordnung: zu schreiben/);
    assert.match(r.out, /sequence\[29–30\]/, r.out);
    assert.match(r.out, /kampf-beginnen\[8–9\]/, r.out);
    assert.match(r.out, /dorfphase-beginnen\[14–15\]/, r.out);
    assert.match(r.out, /Rückwärtsbeweis sequence_data: ja/);
    assert.match(r.out, /Rückwärtsbeweis action_data: ja/);
    assert.match(r.out, /validateScenarioData: entfällt/, 'der Schritt sagt, dass er das Szenario nicht prüft – nicht „0 Probleme“');
    assert.ok(r.out.includes(`Zielstand: sequence_data ${ZIEL_B.sequence.laenge} Zeichen (sha ${ZIEL_B.sequence.sha}), action_data ${ZIEL_B.action.laenge} Zeichen (sha ${ZIEL_B.action.sha})`), r.out);
    assert.ok(r.out.includes(sicherungsHash(text(ziel.sequence), text(acZ()))), 'der Hash, den --write verlangt (über sequence_data und action_data)');
    assert.match(r.out, /würde schreiben: sequence_data \d+ → \d+ Zeichen, action_data \d+ → \d+ Zeichen/);
    assert.doesNotMatch(r.out, /Beanstandungen:? [1-9]/);
    assert.deepEqual(alles(file), vorher, '--check hat nichts geschrieben');
    const gelesen = sql.filter(s => /\b(scenario_data|zone_data|state_data)\b/.test(s) && !/order by rowid/i.test(s));
    assert.deepEqual(gelesen, [], 'scenario_data, zone_data und state_data liest keine Abfrage (nur der Fingerabdruck, ein Hash je Tabelle)');
  } finally { weg(tmp); }
});

test('EE main: geschrieben wird mit **einem** UPDATE auf `sequence_data` und `action_data`, mit Vergleich beider gelesener Texte', async () => {
  const { tmp, file } = nachED();
  try {
    const sql = [], optionen = [];
    class Spion extends Database {
      constructor(pfad, opt) { optionen.push(opt); super(pfad, opt); }
      prepare(s) { sql.push(s); return super.prepare(s); }
    }
    const { h } = sicherungB(tmp);
    const w = await lauf(schreibenB(file, h), { Db: Spion });
    assert.equal(w.code, 0, w.out);
    assert.equal(optionen.at(-1).readonly, false);
    const schreibend = sql.filter(s => /^\s*(update|insert|delete|replace|drop|alter|create)\b/i.test(s));
    assert.equal(schreibend.length, 1, schreibend.join('\n'));
    assert.match(schreibend[0].replace(/\s+/g, ' '), /^update setups set sequence_data = \?, action_data = \? where id = \? and sequence_data = \? and action_data = \?$/i);
  } finally { weg(tmp); }
});

test('EE main: `--write` mit Sicherung – beide Spalten auf dem Zielstand, `scenario_data` und **alles sonst** unverändert, Kontrollausgabe neu gelesen', async () => {
  const { tmp, file } = nachED();
  try {
    const vorher = alles(file);
    const { h } = sicherungB(tmp);
    const r = await lauf(schreibenB(file, h));
    assert.equal(r.code, 0, r.out);
    const z = zeile(file);
    assert.equal(z.sequence_data, text(zielB().sequence));
    assert.equal(z.action_data, text(zielB().action));
    assert.deepEqual(kennz(z.sequence_data), [ZIEL_B.sequence.laenge, ZIEL_B.sequence.sha]);
    assert.deepEqual(kennz(z.action_data), [ZIEL_B.action.laenge, ZIEL_B.action.sha]);
    assert.equal(z.scenario_data, text(scZ()), 'scenario_data ist nicht angefasst');
    assert.deepEqual(ohneSqAk(alles(file)), ohneSqAk(vorher), 'jede andere Spalte, Zeile und Tabelle (auch zone_data, scenario_data, updated_at, save_states) ist gleich');
    assert.match(r.out, /geschrieben: sequence_data/);
    assert.ok(r.out.includes(`${text(ziel.sequence).length} → ${ZIEL_B.sequence.laenge} Zeichen, sha ${AUSGANG_B.sequence.sha} → ${ZIEL_B.sequence.sha}`), r.out);
    assert.ok(r.out.includes(`${text(acZ()).length} → ${ZIEL_B.action.laenge} Zeichen, sha ${AUSGANG_B.action.sha} → ${ZIEL_B.action.sha}`), r.out);
    assert.match(r.out, /Rückwärtsbeweis sequence_data auf der gelesenen Spalte: ja/);
    assert.match(r.out, /Rückwärtsbeweis action_data auf der gelesenen Spalte: ja/);
    assert.match(r.out, /Zielstand aus den Konstanten \(.*\): erreicht/);
    assert.match(r.out, /Folge hat 29 Schritte/);
    assert.match(r.out, /kampf-beginnen hat 17 Schritte/);
    assert.match(r.out, /dorfphase-beginnen hat 33 Schritte, 14–15 sind clear_table/);
    assert.match(r.out, /save_states Auto Save: sha \w+ → \w+ gleich/);
  } finally { weg(tmp); }
});

test('EE main: der zweite Lauf – „schon geschrieben“, Rückgabe 0, nichts geschrieben, auch ohne Sicherung', async () => {
  const { tmp, file } = nachED();
  try {
    const { h } = sicherungB(tmp);
    assert.equal((await lauf(schreibenB(file, h))).code, 0);
    const nach1 = alles(file);
    const check = await lauf(['--check', file, '--schritt', 'boss']);
    assert.equal(check.code, 0, check.out);
    assert.match(check.out, /schon geschrieben/);
    const r = await lauf(['--write', file, '--schritt', 'boss']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /nichts zu schreiben/);
    assert.deepEqual(alles(file), nach1);
  } finally { weg(tmp); }
});

test('EE main: ohne Sicherung kein Schreiben – der Hash gilt für `sequence_data` **und** `action_data`; der einer anderen Spalte oder eines anderen Paares reicht nicht', async () => {
  const { tmp, file } = nachED();
  try {
    const vorher = alles(file);
    const ohne = await lauf(['--write', file, '--schritt', 'boss']);
    assert.equal(ohne.code, 1);
    assert.match(ohne.out, /ohne Sicherung kein Schreiben/);
    for (const falsch of ['abc', 'deadbeefdead', sha(text(ziel.sequence)), sicherungsHash(text(scZ()), text(acZ())).slice(0, 16), sicherungsHash(text(ziel.sequence), sw.actions).slice(0, 16)]) {
      const r = await lauf(['--write', file, '--schritt', 'boss', '--sicherung-sha', falsch]);
      assert.equal(r.code, 1, `${falsch}: ${r.out}`);
    }
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EE main: ein anderer Stand ist ein Abbruch mit Pfad – ein Zähler anders, ein `set_counter` anders, ein anderer Leser: nichts geschrieben, kein Schalter dagegen', async () => {
  const faelle = [
    ['sequence_data', (() => { const q = copy(ziel.sequence); q[30].y += 1; return text(q); })(), /sequence\[30\]/],
    ['action_data', (() => { const a = copy(acZ()); kampfS(a)[9].value = '$BEW'; return text(a); })(), /kampf-beginnen\]\.steps\[9\]/],
    ['action_data', (() => { const a = copy(acZ()); dorfS(a)[15].value = 2; return text(a); })(), /dorfphase-beginnen\]\.steps\[15\]/],
    ['action_data', (() => { const a = copy(acZ()); a.find(x => x.id === 'dorfereignis').steps.push({ type: 'require_counter', name: LEB, above: 0 }); return text(a); })(), /dorfereignis/],
  ];
  for (const [spalte, fremd, muster] of faelle) {
    const { tmp, file } = nachED();
    try {
      setze(file, spalte, fremd);
      const vorher = alles(file);
      const c = await lauf(['--check', file, '--schritt', 'boss']);
      assert.equal(c.code, 1, c.out);
      assert.match(c.out, /ABWEICHEND/);
      assert.match(c.out, muster);
      assert.match(c.out, /es wird nichts überschrieben/);
      assert.doesNotMatch(c.out, /würde schreiben/);
      const z = zeile(file);
      const { h } = sicherungB(tmp, z.sequence_data, z.action_data);
      assert.equal((await lauf(schreibenB(file, h))).code, 1);
      assert.deepEqual(alles(file), vorher);
    } finally { weg(tmp); }
  }
});

test('EE main: Vergleich-und-Tausch – ändert jemand **eine** der beiden Spalten zwischen Lesen und Schreiben, wird nichts geschrieben', async () => {
  for (const spalte of ['sequence_data', 'action_data']) {
    const { tmp, file } = nachED();
    try {
      const { h } = sicherungB(tmp);
      const fremd = (spalte === 'sequence_data' ? text(ziel.sequence) : text(acZ())) + ' ';
      const r = await lauf(schreibenB(file, h), { haken: (stelle, db) => { if (stelle === 'nach-lesen') db.prepare(`update setups set ${spalte} = ? where id = ?`).run(fremd, SETUP_ID); } });
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /seit dem Lesen geändert/);
      const z = zeile(file);
      assert.equal(z[spalte], fremd, `${spalte}: die fremde Änderung bleibt stehen`);
      const andere = spalte === 'sequence_data' ? 'action_data' : 'sequence_data';
      assert.equal(z[andere], andere === 'sequence_data' ? text(ziel.sequence) : text(acZ()), `${andere} wurde nicht geschrieben`);
    } finally { weg(tmp); }
  }
});

test('EE main: ändert sich in der Transaktion eine andere Tabelle (Auto Save) oder `scenario_data`/`zone_data`, rollt alles zurück', async () => {
  for (const eingriff of [
    "update save_states set state_data = '{\"a\":99}' where name = 'Auto Save'",
    "update setups set scenario_data = scenario_data || ' ' where id = 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b'",
    "update setups set zone_data = zone_data || ' ' where id = 'b1e10f4e-b8f2-4c2a-bb3e-54643944121b'",
  ]) {
    const { tmp, file } = nachED();
    try {
      const vorher = alles(file);
      const { h } = sicherungB(tmp);
      const r = await lauf(schreibenB(file, h), { haken: (stelle, db) => { if (stelle === 'in-transaktion') db.prepare(eingriff).run(); } });
      assert.equal(r.code, 1, `${eingriff}: ${r.out}`);
      assert.match(r.out, /unerwartet geändert/);
      assert.deepEqual(alles(file), vorher, 'Rollback');
    } finally { weg(tmp); }
  }
});

test('EE main: `--zurueck` – der exakte Zielstand kommt auf den Ausgang, Zeichen für Zeichen; ein zweites Mal ist „schon der Ausgangsstand“', async () => {
  const { tmp, file } = nachED();
  try {
    const vorher = alles(file);
    const { datei, h } = sicherungB(tmp);
    assert.equal((await lauf(schreibenB(file, h))).code, 0);
    assert.notDeepEqual(alles(file), vorher);
    const r = await lauf(['--zurueck', datei, file, '--schritt', 'boss']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /\(= die Sicherung, Zeichen für Zeichen\)/);
    assert.deepEqual(alles(file), vorher, 'jede Tabelle, jede Spalte wie am Anfang');
    const nochmal = await lauf(['--zurueck', datei, file, '--schritt', 'boss']);
    assert.equal(nochmal.code, 0, nochmal.out);
    assert.match(nochmal.out, /schon der Ausgangsstand/);
  } finally { weg(tmp); }
});

test('EE main: **einzeln widerrufbar** – `--zurueck … --schritt boss` stellt genau diesen Schritt zurück; `optionen` und `zaehler` bleiben geschrieben, `scenario_data` ist byteweise dasselbe', async () => {
  const { tmp, file } = frischeDatenbank();               // der Stand vor EC: alle drei Schritte stehen aus
  try {
    const gesichert = {};
    for (const schritt of ['optionen', 'zaehler', 'boss']) gesichert[schritt] = await schreibeSchritt(tmp, file, schritt);
    const alle3 = zeile(file);
    assert.equal(alle3.sequence_data, text(zielB().sequence));
    assert.equal(alle3.action_data, text(zielB().action));
    const r = await lauf(['--zurueck', gesichert.boss, file, '--schritt', 'boss']);
    assert.equal(r.code, 0, r.out);
    const z = zeile(file);
    // Genau der Stand nach EC und ED – nicht der Ausgang von allem.
    assert.equal(z.scenario_data, alle3.scenario_data, 'scenario_data: byteweise gleich (weder optionen noch zaehler berührt)');
    assert.equal(z.sequence_data, text(ziel.sequence), 'sequence_data: nach optionen, die Zähler 29–30 sind zurück');
    assert.equal(z.action_data, text(acZ()), 'action_data: nach zaehler, die set_counter in kampf-beginnen und der Dorfphase sind zurück');
    assert.deepEqual([kennz(z.sequence_data), kennz(z.action_data)], [[AUSGANG_B.sequence.laenge, AUSGANG_B.sequence.sha], [AUSGANG_B.action.laenge, AUSGANG_B.action.sha]]);
    for (const schritt of ['optionen', 'zaehler']) {
      const c = await lauf(['--check', file, '--schritt', schritt]);
      assert.equal(c.code, 0, `${schritt}: ${c.out}`);
      assert.match(c.out, /schon geschrieben/, schritt);
    }
    const c = await lauf(['--check', file, '--schritt', 'boss']);
    assert.equal(c.code, 0, c.out);
    assert.match(c.out, /Einordnung: zu schreiben/);
  } finally { weg(tmp); }
});

test('EE main: `--zurueck` ersetzt nur den exakten Zielstand und prüft die Sicherung – danach weitergearbeitet, beschädigt, nicht kompakt, nicht der Ausgang, falsche Form: nichts wird überschrieben', async () => {
  for (const spalte of ['sequence_data', 'action_data']) {
    const { tmp, file } = nachED();
    try {
      const { datei, h } = sicherungB(tmp);
      assert.equal((await lauf(schreibenB(file, h))).code, 0);
      setze(file, spalte, zeile(file)[spalte] + ' ');
      const vorher = alles(file);
      const r = await lauf(['--zurueck', datei, file, '--schritt', 'boss']);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /nicht der Zielstand/);
      assert.deepEqual(alles(file), vorher);
    } finally { weg(tmp); }
  }
  const { tmp, file } = nachED();
  try {
    const { h } = sicherungB(tmp);
    assert.equal((await lauf(schreibenB(file, h))).code, 0);
    const vorher = alles(file);
    const schreibe = (name, o) => { const d = path.join(tmp, name); fs.writeFileSync(d, JSON.stringify(o)); return d; };
    const sq = text(ziel.sequence), ac = text(acZ());
    const gut = { sequence_data: sq, action_data: ac, sha256: sicherungsHash(sq, ac) };
    const kaputt = await lauf(['--zurueck', schreibe('a.json', { ...gut, sha256: 'f'.repeat(64) }), file, '--schritt', 'boss']);
    assert.equal(kaputt.code, 1); assert.match(kaputt.out, /beschädigt/);
    const lose = JSON.stringify(JSON.parse(ac), null, 1);
    const nk = await lauf(['--zurueck', schreibe('b.json', { ...gut, action_data: lose, sha256: sicherungsHash(sq, lose) }), file, '--schritt', 'boss']);
    assert.equal(nk.code, 1); assert.match(nk.out, /kompaktes JSON/);
    const zs = text(zielB().sequence), za = text(zielB().action);
    const neu = await lauf(['--zurueck', schreibe('c.json', { sequence_data: zs, action_data: za, sha256: sicherungsHash(zs, za) }), file, '--schritt', 'boss']);
    assert.equal(neu.code, 1); assert.match(neu.out, /nicht der Ausgangsstand/);
    const form = await lauf(['--zurueck', schreibe('d.json', { scenario_data: text(scZ()), action_data: ac, sha256: sicherungsHash(text(scZ()), ac) }), file, '--schritt', 'boss']);
    assert.equal(form.code, 1); assert.match(form.out, /nicht die Form/);
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EE main: `boss` zuerst, in der Mitte oder zuletzt – dieselbe Datenbank am Ende; zurück in der umgekehrten Reihenfolge wie am Anfang', async () => {
  const lauftSo = async (reihenfolge) => {
    const { tmp, file } = frischeDatenbank();
    try {
      const vorher = alles(file);
      const gesichert = {};
      for (const schritt of reihenfolge) gesichert[schritt] = await schreibeSchritt(tmp, file, schritt);
      const am_ende = zeile(file);
      for (const schritt of reihenfolge) assert.equal((await lauf(['--check', file, '--schritt', schritt])).code, 0, `${schritt} ist geschrieben`);
      for (const schritt of [...reihenfolge].reverse()) {
        const r = await lauf(['--zurueck', gesichert[schritt], file, '--schritt', schritt]);
        assert.equal(r.code, 0, `zurück ${schritt}: ${r.out}`);
      }
      assert.deepEqual(alles(file), vorher, 'umgekehrt zurück: wie am Anfang');
      return am_ende;
    } finally { weg(tmp); }
  };
  const a = await lauftSo(['optionen', 'zaehler', 'boss']);
  const b = await lauftSo(['boss', 'optionen', 'zaehler']);
  const c = await lauftSo(['zaehler', 'boss', 'optionen']);
  for (const x of [b, c]) {
    assert.equal(x.scenario_data, a.scenario_data);
    assert.equal(x.sequence_data, a.sequence_data);
    assert.equal(x.action_data, a.action_data);
  }
  assert.equal(a.scenario_data, text(scZ()));
  assert.equal(a.sequence_data, text(zielB().sequence));
  assert.equal(a.action_data, text(zielB().action));
});

test('EE main: `boss` auf dem Stand vor EC und ED – die Stücke stimmen, der Hash des Ausgangs nicht: `--check` sagt „anders“, `--write` vergleicht nicht mit der Konstante', async () => {
  const { tmp, file } = frischeDatenbank();
  try {
    const c = await lauf(['--check', file, '--schritt', 'boss']);
    assert.equal(c.code, 0, c.out);
    assert.match(c.out, /Ausgang laut Schritt: anders/);
    assert.match(c.out, /Einordnung: zu schreiben/);
    const z = zeile(file);
    const { h } = sicherungB(tmp, z.sequence_data, z.action_data);
    const w = await lauf(schreibenB(file, h));
    assert.equal(w.code, 0, w.out);
    assert.match(w.out, /nicht mit den Konstanten vergleichbar/);
    const nach = zeile(file);
    assert.equal(nach.sequence_data.length, sw.sequence.length - (text(ziel.sequence).length - ZIEL_B.sequence.laenge));
    assert.equal(nach.scenario_data, sw.scenario);
  } finally { weg(tmp); }
});

test('EE main: ein unbekanntes Argument ist auch bei `boss` ein Benutzungsfehler – es gibt kein `--force`', async () => {
  const { tmp, file } = nachED();
  try {
    const vorher = alles(file);
    const { h } = sicherungB(tmp);
    for (const wort of ['--force', '--erzwingen', '-f']) {
      for (const modus of [['--check', file, '--schritt', 'boss'], schreibenB(file, h)]) {
        const r = await lauf([...modus, wort]);
        assert.equal(r.code, 2, `${modus[0]} ${wort}: ${r.out}`);
      }
    }
    assert.deepEqual(alles(file), vorher);
  } finally { weg(tmp); }
});

test('EE main: stimmt der gerechnete Zielstand nicht mit der Konstante überein, hält der Lauf an – `--check` wie `--write` (die Konstante wird für den Test kurz verstellt)', async () => {
  const { tmp, file } = nachED();
  const echt = ZIEL_B.action.sha;
  try {
    const vorher = alles(file);
    ZIEL_B.action.sha = '000000000000';
    const c = await lauf(['--check', file, '--schritt', 'boss']);
    assert.equal(c.code, 1, c.out);
    assert.match(c.out, /action_data: der gerechnete Zielstand hat/);
    assert.match(c.out, /000000000000/);
    assert.doesNotMatch(c.out, /würde schreiben/);
    const { h } = sicherungB(tmp);
    assert.equal((await lauf(schreibenB(file, h))).code, 1);
    assert.deepEqual(alles(file), vorher);
  } finally { ZIEL_B.action.sha = echt; weg(tmp); }
});
