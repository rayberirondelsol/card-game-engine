// FF Teil 1 / Spec M31.14, M31.17 — die Hand-Zonen fassen vier Karten: `scripts/doerflerzahl-daten.mjs`, Schritt `haende`.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Zu schreiben (später, Teil 2) ist in `zone_data` an den fünf Zonen `Hand Dörfler 1` … `Hand Dörfler 5` die `capacity` 3 → 4, sonst nichts.
// **Der Grund** steht in Nr. 2: drei verdeckte Heldentaten und das Dorf-Ereignis teilen sich eine Zone; bei `capacity 3` bleibt die Ereigniskarte im Stapel.
//
// Eingang ist der Stand, auf dem `FF` aufsetzt: die Zonen aus `fixtures/auslagen-kurzpartie.json` **mit `patchZonen` aus `EU` angewendet** (82 Zonen).
// Der Tisch von Welle 1 (Nr. 2 und 4) ist aus den Daten der Fixture gerechnet, mit EU, EV, EW und EX — so wie die Produktion ihn seit 2026-11-10 hält.
// Die Zahlen, die der Test selbst braucht (Kartenbreite 100, Abstand 90, die Schrittweite von 15), stehen **hier** ausgeschrieben; der Baustein liefert nur die Zonen.
// Diese Datei ändert keine andere Testdatei und liest `doerflerzahl-daten.test.js` nicht.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto, { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

import * as dz from '../../scripts/doerflerzahl-daten.mjs';
import { bauen, seededRng } from '../../scripts/auslagen-daten.mjs';
import { executeSequenceWithLog } from '../../shared/sequenceExecutor.js';
import { resolveZones, anchorBoxes } from '../../shared/anchoring.js';
import { zoneSlots, zoneContains } from '../../shared/zoneGeometry.js';
import { getCardDims } from '../../client/src/utils/cardDims.js';

const { default: Database } = await import('better-sqlite3');

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const auszug = lies('auslagen-kurzpartie.json');
const dzFixture = lies('doerflerzahl-kurzpartie.json');
const { assets, cards, zones, grids, state } = auszug;
const { SETUP_ID, GAME_ID } = dz;

const copy = (x) => JSON.parse(JSON.stringify(x));
const text = (x) => JSON.stringify(x);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

// ── Der Eingang: Zonen nach EU; der Zielstand ─────────────────────────────────

/** Die Zonen, auf denen `FF` aufsetzt: 82 Zonen, die Hände mit `capacity 3`. */
const frost = (x) => { Object.values(x).forEach(v => { if (v && typeof v === 'object') frost(v); }); return Object.freeze(x); };
const EU = frost(dz.patchZonen(zones).zone);
const HAND_LABELS = [1, 2, 3, 4, 5].map(n => `Hand Dörfler ${n}`);
const istHand = (z) => HAND_LABELS.includes(z?.label);

/** Der Zielstand, aus dem Eingang gerechnet — ein Aufruf je Test, damit ein fehlender Baustein nur den Test rot macht. */
const ziel = () => copy(dz.patchHaende(EU).zone);   // eine Kopie: Tests, die ein Feld verändern, dürfen den Eingang nicht anfassen

/** Unabhängiges Orakel (aus der Aufgabe, nicht aus dem Baustein): die fünf Hände mit `capacity 4`, **an derselben Stelle der Schlüssel**, sonst nichts. */
const mitKapazitaet = (zonen, c) => zonen.map(z => (istHand(z) ? { ...z, capacity: c } : z));
const ohneHaende = (zonen) => zonen.filter(z => !istHand(z));

// ── Der Tisch von Welle 1 (solo) ──────────────────────────────────────────────

const scenario = JSON.parse(dzFixture.scenario);
const sequence = JSON.parse(dzFixture.sequence);
const actions = JSON.parse(dzFixture.actions);
const ASSETS = dz.patchAssets(assets).assets;                      // EV
const AKTIONEN = dz.patchAktionen(actions).action;                 // EW
const SC_PROD = dz.patchWerte(dz.patchGelaende(scenario).scenario).scenario;   // ES, ET
const WELLE1 = dz.patchSchalter(SC_PROD, sequence, { zone: EU, assets: ASSETS, action: AKTIONEN });   // EX
/** Wie `ohneIds` aus `auslagen-daten.mjs`, aber auch ohne `inStack` und `card_ids`: zwei getrennte Aufbauten würfeln dort verschiedene Ids, in zwei Läufen aus *einem* Zustand wären sie gleich. */
function ohneIds(v) {
  if (Array.isArray(v)) return v.map(ohneIds);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([k]) => !['id', 'tableId', 'stackId', 'table_ids', 'card_ids', 'inStack'].includes(k)).map(([k, x]) => [k, ohneIds(x)]));
  return v;
}
const stepsOf = (id) => AKTIONEN.find(a => a.id === id).steps;

const WAHL = (n) => ({ ...(n >= 3 ? { doerfler3: 'Granny' } : {}), ...(n >= 4 ? { doerfler4: 'Blopsy' } : {}), ...(n >= 5 ? { doerfler5: 'Yancy' } : {}) });
const tisch = (zonen, n) => {
  assert.equal(WELLE1.art, 'zu-schreiben', (WELLE1.probleme ?? []).join('\n'));
  const r = bauen({ state, sequence: WELLE1.sequence, zones: zonen, grids, assets: ASSETS, cards, scenarioData: WELLE1.scenario }, WAHL(n), 1);
  assert.deepEqual(r.log.filter(e => e.status === 'failed' || e.status === 'skipped'), [], `der Aufbau für ${n} Dörfler`);
  return r;
};
const lauf = (zonen, steps, st) => executeSequenceWithLog(copy(st), steps, zonen, { assets: ASSETS, cards, grids, scenarioData: WELLE1.scenario, rng: seededRng(7) });
const aktion = (zonen, id, st) => lauf(zonen, stepsOf(id), st);
const aufgeloest = (zonen, st) => resolveZones(zonen, anchorBoxes(st.boards, st.tokens));
const handZone = (zonen, st, n) => aufgeloest(zonen, st).find(z => z.label === `Hand Dörfler ${n}`);
const inHand = (zonen, st, n) => st.cards.filter(c => zoneContains(handZone(zonen, st, n), c.x, c.y));
const schlecht = (r) => r.log.filter(e => e.status !== 'ok');

const HELDEN = (n) => ({ type: 'deal_to_zone', stackLabel: 'Heldentaten', count: 3, targetZoneLabel: `Hand Dörfler ${n}`, faceDown: true });
const EREIGNIS = (n) => ({ type: 'deal_to_zone', stackLabel: 'Dorf-Ereignisse', count: 1, targetZoneLabel: `Hand Dörfler ${n}`, faceDown: false });
const stapelGroesse = (st, label) => st.stacks.find(s => s.label === label)?.cards.length;

// ── Der Layoutrechner (Tisch von Welle 1, Tableau-Mitten bei y 1600, 300 × 400) ───

const ID = {
  1: '98e26309-d1d5-432c-b2ea-26289f26fb75', 2: 'd4691079-bd86-496a-a49b-c6b7a317c2d9', 3: 'bad13f49-c614-4551-9e81-fe8603dbf09a',
  4: 'af3a4982-a0f5-4884-834f-221447ba5377', 5: 'dae61142-a596-46c9-acba-640f82e9433c',
};
const MITTE_X = { 1: 300, 2: 880, 3: 1460, 4: 2040, 5: 2620 };
const alleFuenf = () => anchorBoxes(auszug.state.tokens, [1, 2, 3, 4, 5].map(n => ({ assetId: ID[n], x: MITTE_X[n], y: 1600, width: 300, height: 400 })));

// ─────────────────────────────────────────────────────────────────────────────
// 1  Der Zielstand — capacity 4 an den fünf Händen, alles andere byteweise gleich
// ─────────────────────────────────────────────────────────────────────────────

test('FF 1: der Eingang – nach EU 82 Zonen, die fünf Hände mit capacity 3 (Hand 1 und 2 absolut, 3 bis 5 verankert)', () => {
  assert.equal(EU.length, 82);
  assert.equal(EU.filter(istHand).length, 5);
  for (const z of EU.filter(istHand)) assert.equal(z.capacity, 3, z.label);
  assert.ok(!EU.find(z => z.label === 'Hand Dörfler 1').anchor && EU.find(z => z.label === 'Hand Dörfler 3').anchor);
});

test('FF 1: Zielstand – capacity 4 an Hand Dörfler 1 … 5, **alles andere** byteweise gleich (Reihenfolge der Zonen, der Schlüssel, jede andere Zone)', () => {
  const r = dz.patchHaende(EU);
  assert.equal(r.art, 'zu-schreiben', (r.probleme ?? []).join('\n'));
  assert.deepEqual(Object.keys(r).sort(), ['art', 'zone'], 'geschrieben wird `zone_data`, sonst nichts');
  assert.equal(r.zone.length, 82);
  assert.equal(text(r.zone), text(mitKapazitaet(EU, 4)), 'genau das Orakel: nur capacity, an derselben Stelle');
  assert.equal(text(ohneHaende(r.zone)), text(ohneHaende(EU)), 'alle 77 anderen Zonen Zeichen für Zeichen gleich');
  assert.deepEqual(r.zone.map(z => z.id), EU.map(z => z.id), 'dieselbe Reihenfolge der Zonen');
  for (const z of r.zone.filter(istHand)) {
    const alt = EU.find(x => x.id === z.id);
    assert.equal(z.capacity, 4, z.label);
    assert.deepEqual(Object.keys(z), Object.keys(alt), `${z.label}: dieselben Schlüssel in derselben Reihenfolge`);
    assert.equal(text({ ...z, capacity: 3 }), text(alt), `${z.label}: außer capacity nichts`);
  }
});

test('FF 1: die Konstanten – Ausgang ist der Zielstand von `zonen` (39 886 Zeichen, sha efe0b0743364), Ziel ist gerechnet; nur die Spalte `zone`', () => {
  const s = dz.SCHRITTE.haende;
  assert.ok(s, 'SCHRITTE.haende ist eingetragen');
  assert.deepEqual(Object.keys(s.ausgang), ['zone']);
  assert.deepEqual(Object.keys(s.ziel), ['zone']);
  assert.deepEqual(s.ausgang.zone, { laenge: 39886, sha: 'efe0b0743364' }, 'ausgeschrieben: dieselbe Zahl wie das Ziel von `zonen`');
  assert.deepEqual(s.ausgang, dz.SCHRITTE.zonen.ziel);
  assert.deepEqual(s.ausgang.zone, { laenge: text(EU).length, sha: sha(text(EU)) });
  assert.deepEqual(s.ziel.zone, { laenge: text(ziel()).length, sha: sha(text(ziel())) });
  assert.notEqual(s.ziel.zone.sha, s.ausgang.zone.sha);
  assert.equal(s.ziel.zone.laenge, s.ausgang.zone.laenge, 'eine Ziffer getauscht: 3 → 4, gleiche Länge');
});

test('FF 1: Rückwärtsbeweis – capacity wieder 3 ergibt den gelesenen Text, Zeichen für Zeichen (`--zurueck` führt auf den Ausgang)', () => {
  assert.deepEqual(dz.beweiseHaende({ zone: EU }, { zone: ziel() }), []);
  const zurueck = ziel().map(z => (istHand(z) ? { ...z, capacity: 3 } : z));
  assert.equal(text(zurueck), text(EU));
});

test('FF 1: der Beweis fängt, was nicht stimmt – eine Hand mit capacity 5, eine Hand noch auf 3, ein fremdes Feld an einer Hand, eine Zone verändert, eine Zone mehr', () => {
  const fehler = (nach) => dz.beweiseHaende({ zone: EU }, { zone: nach });
  const mit = (fn) => { const z = ziel(); fn(z); return z; };
  const hand = (z, n) => z.find(x => x.label === `Hand Dörfler ${n}`);
  assert.ok(fehler(mit(z => { hand(z, 2).capacity = 5; })).length > 0, 'capacity 5');
  assert.ok(fehler(mit(z => { hand(z, 4).capacity = 3; })).length > 0, 'noch auf 3');
  assert.ok(fehler(mit(z => { hand(z, 1).exclusive = true; })).length > 0, 'fremdes Feld an einer Hand');
  assert.ok(fehler(mit(z => { z.find(x => x.id === 'zkopf1').capacity = 2; })).length > 0, 'eine andere Zone verändert');
  assert.ok(fehler(mit(z => { z.push(copy(z[0])); z.at(-1).id = 'zfremd'; })).length > 0, 'eine Zone mehr');
  assert.ok(fehler(mit(z => { z.splice(z.findIndex(x => x.label === 'Hand Dörfler 5'), 1); })).length > 0, 'eine Hand fehlt');
});

test('FF 1: der Prüfer – der Zielstand besteht (Ids, Labels, Anker wie bei EU, jede Hand mit capacity 4); er fängt capacity 3, 5 oder fehlend', () => {
  assert.deepEqual(dz.pruefeHaende(ziel()), []);
  assert.ok(dz.pruefeHaende(EU).length > 0, 'capacity 3 ist nicht das Ziel');
  assert.ok(dz.pruefeHaende(mitKapazitaet(ziel(), 5)).length > 0);
  assert.ok(dz.pruefeHaende(ziel().map(z => (z.label === 'Hand Dörfler 3' ? { ...z, capacity: undefined } : z))).length > 0);
  assert.ok(dz.pruefeHaende(ziel().filter(z => z.label !== 'Hand Dörfler 2')).length > 0, 'eine Hand fehlt');
});

// ─────────────────────────────────────────────────────────────────────────────
// 2  Der Befund als Test — der Grund für die Änderung
// ─────────────────────────────────────────────────────────────────────────────

// **Wo die Meldung der Spec nicht stimmt (M31.14):** dort steht `1 of 1 cards stayed in the stack`. Gemessen meldet der Executor bei einer **vollen** Zone, die das einzige Ziel des Schrittes ist,
// `skipped` mit `zone "Hand Dörfler 1" is full (3)` (`usable` ist leer, `skip(problems)`); „stayed in the stack“ kommt nur, wenn die Zone während des Schrittes voll wird (mehr Karten als Platz).
// **Die Folge ist dieselbe** — die Karte bleibt im Stapel, die Zone bleibt, wie sie ist —, und das ist, was die Tests festhalten; die Wortwahl der Spec ist zu berichtigen.
const VOLL = /^zone "Hand Dörfler \d" is full \(3\)$/;

test('FF 2: **der Befund** – mit capacity 3 und drei Heldentaten in der Hand bleibt das Dorf-Ereignis im Stapel (`skipped`, `zone … is full (3)`); mit 4 liegt es in der Zone', () => {
  const FF = ziel();
  for (const [wie, zonen, kap] of [['capacity 3 (Stand nach EU)', EU, 3], ['capacity 4 (Stand nach FF)', FF, 4]]) {
    const st0 = tisch(zonen, 3).state;
    const mitHeld = lauf(zonen, [HELDEN(1)], st0);
    assert.deepEqual(schlecht(mitHeld), [], `${wie}: drei Heldentaten lassen sich in die Hand legen`);
    assert.equal(inHand(zonen, mitHeld.state, 1).length, 3, `${wie}: drei Karten in Hand Dörfler 1`);
    assert.equal(handZone(zonen, mitHeld.state, 1).capacity, kap);
    const vorher = stapelGroesse(mitHeld.state, 'Dorf-Ereignisse');
    assert.ok(vorher > 0, 'der Ereignis-Stapel liegt');
    const r = lauf(zonen, [EREIGNIS(1)], mitHeld.state);
    if (kap === 3) {
      assert.equal(r.log.length, 1);
      assert.equal(r.log[0].status, 'skipped');
      assert.match(r.log[0].reason, /^zone "Hand Dörfler 1" is full \(3\)$/, wie);
      assert.equal(stapelGroesse(r.state, 'Dorf-Ereignisse'), vorher, 'die Karte ist im Stapel geblieben');
      assert.equal(inHand(zonen, r.state, 1).length, 3, 'in der Hand liegen weiter nur die drei Heldentaten');
      assert.equal(r.state.cards.length, mitHeld.state.cards.length, 'keine Karte ist hinzugekommen');
    } else {
      assert.deepEqual(r.log.map(e => e.status), ['ok'], wie);
      assert.equal(stapelGroesse(r.state, 'Dorf-Ereignisse'), vorher - 1, 'die Karte hat den Stapel verlassen');
      assert.equal(inHand(zonen, r.state, 1).length, 4, 'vier Karten in der Zone: drei Heldentaten und das Ereignis');
      assert.equal(r.state.cards.length, mitHeld.state.cards.length + 1);
    }
  }
});

test('FF 2: der Befund gilt durch die **Aktion** `dorfereignis` – mit drei Heldentaten in jeder der drei Hände: capacity 3 → drei Meldungen (`skipped`) und kein Ereignis in der Hand; capacity 4 → drei Karten ausgeteilt, keine Meldung', () => {
  for (const [zonen, kap] of [[EU, 3], [ziel(), 4]]) {
    let st = tisch(zonen, 3).state;
    for (const n of [1, 2, 3]) st = lauf(zonen, [HELDEN(n)], st).state;
    const vorher = st.cards.length;
    const r = aktion(zonen, 'dorfereignis', st);
    if (kap === 3) {
      assert.equal(schlecht(r).length, 3, 'drei Zeilen `skipped`');
      for (const e of schlecht(r)) { assert.equal(e.status, 'skipped'); assert.match(e.reason, VOLL); }
      assert.equal(r.state.cards.length, vorher, 'es wurde nichts ausgeteilt');
    } else {
      assert.deepEqual(schlecht(r), [], 'keine Beanstandung');
      assert.equal(r.state.cards.length, vorher + 3, 'drei Ereignisse ausgeteilt');
      for (const n of [1, 2, 3]) assert.equal(inHand(zonen, r.state, n).length, 4, `Hand ${n}`);
    }
  }
});

test('FF 2: Gegenprobe – mit **zwei** Heldentaten reicht capacity 3 (das Ereignis liegt); es ist also die Zahl der Plätze, nichts anderes, das die Karte im Stapel hält', () => {
  const zonen = EU;
  const st0 = tisch(zonen, 3).state;
  const zwei = lauf(zonen, [{ ...HELDEN(1), count: 2 }], st0);
  assert.equal(inHand(zonen, zwei.state, 1).length, 2);
  const r = lauf(zonen, [EREIGNIS(1)], zwei.state);
  assert.deepEqual(r.log.map(e => e.status), ['ok']);
  assert.equal(inHand(zonen, r.state, 1).length, 3);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3  Die Plätze — vier, 90 Punkte Abstand bei Breite 360; die Karten (100 breit) überlappen
// ─────────────────────────────────────────────────────────────────────────────

test('FF 3: `zoneSlots` einer Hand-Zone liefert **vier** Plätze im Abstand von **90 Punkten** (Breite 360, eine Reihe); vorher drei im Abstand 120 — an allen fünf Händen', () => {
  const tokens = alleFuenf();
  for (const [zonen, anzahl, abstand] of [[ziel(), 4, 90], [EU, 3, 120]]) {
    const gelöst = resolveZones(zonen, tokens);
    for (const n of [1, 2, 3, 4, 5]) {
      const h = gelöst.find(z => z.label === `Hand Dörfler ${n}`);
      assert.equal(h.width, 360, `Hand ${n}: Breite`);
      const s = zoneSlots(h);
      assert.equal(s.length, anzahl, `Hand ${n}: ${anzahl} Plätze`);
      for (let i = 1; i < s.length; i++) assert.ok(Math.abs((s[i].x - s[i - 1].x) - abstand) < 1e-9, `Hand ${n}: Abstand ${abstand}, ist ${s[i].x - s[i - 1].x}`);
      assert.ok(s.every(p => Math.abs(p.y - (h.y + h.height / 2)) < 1e-9), `Hand ${n}: eine Reihe auf halber Höhe`);
      assert.ok(Math.abs(s[0].x - (h.x + abstand / 2)) < 1e-9, `Hand ${n}: der erste Platz einen halben Abstand vom linken Rand`);
    }
  }
});

test('FF 3: **die Überlappung, gemessen** – Karte 100 breit (aus der Bibliothek, `getCardDims`): bei vier Plätzen **10 Punkte** Überlappung benachbarter Karten, und die beiden äußeren Karten ragen je **5 Punkte** über den Rand der Zone hinaus; bei drei Plätzen 20 Punkte Luft, nichts ragt hinaus', () => {
  const heldentat = cards.find(c => c.category === 'Heldentaten');
  const ereignis = cards.find(c => c.category === 'Dorf-Ereignisse');
  for (const c of [heldentat, ereignis]) assert.equal(getCardDims(c).w, 100, `${c.name}: auf dem Tisch 100 breit`);
  const KARTE = getCardDims(heldentat).w;
  const tokens = alleFuenf();
  const messe = (zonen) => {
    const h = resolveZones(zonen, tokens).find(z => z.label === 'Hand Dörfler 1');
    const s = zoneSlots(h);
    const abstand = s[1].x - s[0].x;
    return { abstand, ueberlappung: KARTE - abstand, links: h.x - (s[0].x - KARTE / 2), rechts: (s.at(-1).x + KARTE / 2) - (h.x + h.width) };
  };
  assert.deepEqual(messe(ziel()), { abstand: 90, ueberlappung: 10, links: 5, rechts: 5 });
  assert.deepEqual(messe(EU), { abstand: 120, ueberlappung: -20, links: -10, rechts: -10 });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4  Die Lage solo — der einzige Unterschied zum Tisch von Welle 1: die Lage der Ereigniskarte
// ─────────────────────────────────────────────────────────────────────────────
//
// **Die Ausnahme, benannt:** in der Hand liegt in der Lage solo nur das Dorf-Ereignis. Es sitzt bei capacity 4 auf Platz 1 von 4 (x = Rand + 45) statt auf
// Platz 1 von 3 (x = Rand + 60): **15 Punkte weiter links**. Alles andere — jede Karte außerhalb der Hände, jeder Stein, Zähler, Stapel, die Protokollzeilen — ist gleich.

const FIGUREN = ['tokens', 'counters', 'boards'];

/** Die Karten der beiden Läufe, paarweise: `{ gleich: [...], anders: [{ alt, neu }] }`; die Paare stehen an derselben Stelle der Liste. */
function kartenVergleich(alt, neu) {
  assert.equal(neu.length, alt.length, 'gleich viele Karten');
  const a = ohneIds(alt), n = ohneIds(neu);
  const anders = [];
  a.forEach((k, i) => { if (text(k) !== text(n[i])) anders.push({ alt: k, neu: n[i] }); });
  return anders;
}

test('FF 4: **Lage solo** – Aufbau, Kampf, Dorfphase, Ereignis (zwei Runden, 2 bis 5 Dörfler): mit capacity 3 und 4 derselbe Zustand und **dieselben Protokollzeilen** — **bis auf die Lage der Ereigniskarten in den Hand-Zonen**, und die ist es, wo sie sich unterscheidet: n Karten, nur `x`, genau **−15**', () => {
  const FF = ziel();
  for (const n of [2, 3, 4, 5]) {
    const a0 = tisch(EU, n), b0 = tisch(FF, n);
    assert.deepEqual(ohneIds(b0.state.cards), ohneIds(a0.state.cards), `${n} Dörfler, Aufbau: dieselben Karten (die Hände sind leer)`);
    let a = a0.state, b = b0.state;
    for (const runde of [1, 2]) {
      for (const id of ['kampf-beginnen', 'dorfphase-beginnen', 'dorfereignis']) {
        const ra = aktion(EU, id, a), rb = aktion(FF, id, b);
        const wo = `${n} Dörfler, Runde ${runde}, ${id}`;
        assert.deepEqual(rb.log.map(e => [e.type, e.target, e.status, e.reason]), ra.log.map(e => [e.type, e.target, e.status, e.reason]), `${wo}: dieselben Protokollzeilen`);
        for (const f of FIGUREN) assert.deepEqual(ohneIds(rb.state[f]), ohneIds(ra.state[f]), `${wo}: ${f}`);
        assert.deepEqual(ohneIds(rb.state.stacks), ohneIds(ra.state.stacks), `${wo}: stacks`);
        const anders = kartenVergleich(ra.state.cards, rb.state.cards);
        // Wie viele Ereigniskarten liegen in den Händen: nach `dorfereignis` n; die Dorfphase räumt sie ab (clear_table); der Kampf der zweiten Runde sieht noch die der ersten.
        const erwartet = id === 'dorfereignis' || (id === 'kampf-beginnen' && runde === 2) ? n : 0;
        assert.equal(anders.length, erwartet, `${wo}: ${erwartet} Karten liegen anders`);
        for (const { alt, neu } of anders) {
          assert.equal(text({ ...neu, x: 0 }), text({ ...alt, x: 0 }), `${wo}: die Karte unterscheidet sich **nur** in x`);
          assert.equal(neu.x - alt.x, -15, `${wo}: 15 Punkte weiter links (${alt.x} → ${neu.x})`);
        }
        // Es sind genau die Karten, die in einer Hand-Zone liegen — nicht irgendwelche.
        const inHaenden = [1, 2, 3, 4, 5].slice(0, n).flatMap(i => inHand(FF, rb.state, i));
        assert.equal(inHaenden.length, erwartet, `${wo}: in den Händen liegen ${erwartet} Karten`);
        assert.deepEqual(anders.map(x => text(x.neu)).sort(), ohneIds(inHaenden).map(text).sort(), `${wo}: die abweichenden Karten sind die in den Händen`);
        a = ra.state; b = rb.state;
      }
    }
  }
});

test('FF 4: die Verschiebung ist **gemessen**, nicht geschätzt – Platz 1 von 3 bei Rand + 60, Platz 1 von 4 bei Rand + 45; die Ereigniskarte liegt auf dem ersten Platz (Hand Dörfler 1: x 210 → 195)', () => {
  const FF = ziel();
  const [a, b] = [EU, FF].map(zonen => {
    const st = aktion(zonen, 'dorfereignis', tisch(zonen, 3).state).state;
    return inHand(zonen, st, 1).map(c => c.x);
  });
  assert.deepEqual(a, [150 + 60]);
  assert.deepEqual(b, [150 + 45]);
  assert.equal(b[0] - a[0], -15);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5  Vorbedingung je Stück, Abbruch mit Pfad
// ─────────────────────────────────────────────────────────────────────────────

const abweichend = (zonen) => {
  const r = dz.patchHaende(zonen);
  assert.equal(r.art, 'abweichend', `erwartet abweichend, ist ${r.art}`);
  assert.equal(r.zone, undefined, 'bei einer Abweichung gibt es keinen Zielstand');
  assert.ok(Array.isArray(r.probleme) && r.probleme.length > 0);
  return r.probleme.join('\n');
};
const mitHand = (zonen, n, fn) => { const z = copy(zonen); fn(z.find(x => x.label === `Hand Dörfler ${n}`)); return z; };
const mitKapAn = (zonen, ns, c) => mitKapazitaet(zonen, 3).map(z => (ns.some(n => z.label === `Hand Dörfler ${n}`) ? { ...z, capacity: c } : z));

test('FF 5: der Ausgang – alle fünf Hände auf capacity 3 → zu schreiben', () => {
  const r = dz.patchHaende(EU);
  assert.equal(r.art, 'zu-schreiben');
  assert.equal(EU.filter(z => z.capacity === 3 && istHand(z)).length, 5);
});

test('FF 5: schon im Ziel → „schon-da“, die Eingabe kommt gleich zurück (als Kopie) und wird nicht verändert', () => {
  const z = ziel();
  const vorher = text(z);
  const r = dz.patchHaende(z);
  assert.equal(r.art, 'schon-da');
  assert.equal(text(r.zone), vorher);
  assert.notEqual(r.zone, z, 'eine Kopie');
  assert.equal(text(z), vorher, 'Eingabe unverändert');
});

test('FF 5: Abbruch mit Pfad – jede Hand einzeln mit einer anderen capacity (2, 5, null, Text): die Meldung nennt `zone_data`, das Label und den gefundenen Wert', () => {
  for (const n of [1, 2, 3, 4, 5]) {
    for (const c of [2, 5, null, '3']) {
      const m = abweichend(mitHand(EU, n, h => { h.capacity = c; }));
      assert.match(m, /zone_data/, `Hand ${n}, capacity ${text(c)}`);
      assert.ok(m.includes(`Hand Dörfler ${n}`), `Hand ${n}: ${m}`);
      assert.ok(m.includes(text(c)), `Hand ${n}: nennt den gefundenen Wert ${text(c)}: ${m}`);
    }
  }
});

test('FF 5: **teils** geschrieben ist ein Abbruch – eine, zwei von fünf (die Aufgabe), vier von fünf auf capacity 4: nichts wird überschrieben, die Meldung sagt „teils“ und nennt die Hände', () => {
  for (const ns of [[1], [4], [1, 2], [2, 5], [3, 4], [1, 2, 3, 4]]) {
    const m = abweichend(mitKapAn(EU, ns, 4));
    assert.match(m, /teils/, `Hände ${ns}`);
    for (const n of ns) assert.ok(m.includes(`Hand Dörfler ${n}`), `Hände ${ns}: nennt Hand ${n}`);
  }
  // Zwei von fünf: der Test der Aufgabe, wörtlich
  assert.match(abweichend(mitKapAn(EU, [1, 2], 4)), /2 von 5/);
});

test('FF 5: Abbruch – eine Hand fehlt, eine Zone mehr, ein anderes Feld einer Hand (exclusive, x), eine **andere** Zone verändert; und der Zustand **vor** EU (die 54 Zonen) ist kein Ausgang', () => {
  assert.match(abweichend(EU.filter(z => z.label !== 'Hand Dörfler 5')), /Hand Dörfler 5/);
  const fremd = { ...copy(EU[0]), id: 'zfremd', label: 'Fremd' };
  assert.ok(abweichend([...copy(EU), fremd]).length > 0);
  // Ein anderes Feld einer Hand: der Baustein kennt den Stand nach EU als Hash (`patchZonen`), nicht je Feld — die Meldung nennt `zone_data` und EU, nicht die Hand.
  assert.match(abweichend(mitHand(EU, 2, h => { h.exclusive = true; })), /zone_data: außer capacity an den Händen sind die Zonen nicht der Stand nach EU/);
  assert.match(abweichend(mitHand(EU, 1, h => { h.x = 151; })), /zone_data: außer capacity an den Händen sind die Zonen nicht der Stand nach EU/);
  assert.match(abweichend(mitHand(EU, 4, h => { h.anchor.relX = 0.1; })), /Hand Dörfler 4/);
  const z = copy(EU); z.find(x => x.id === 'zkopf1').capacity = 2;
  assert.ok(abweichend(z).length > 0, 'eine Zone, die nicht zum Schritt gehört, weicht ab');
  assert.ok(abweichend(zones).length > 0, 'EU ist noch nicht geschrieben: der Eingang ist ein anderer');
  assert.equal(dz.patchHaende('keine Liste').art, 'abweichend');
  assert.equal(dz.patchHaende(null).art, 'abweichend');
});

test('FF 5: **disjunkt zu EU** – alle anderen Felder der Hände bleiben, wie EU sie geschrieben hat (Anker, showWithoutAnchor, x/y/Breite, type, color, exclusive, layout, accepts); die Zonen, die EU anlegt, sind unberührt', () => {
  const FF = ziel();
  for (const n of [1, 2, 3, 4, 5]) {
    const alt = EU.find(z => z.label === `Hand Dörfler ${n}`), neu = FF.find(z => z.label === `Hand Dörfler ${n}`);
    for (const k of Object.keys(alt).filter(x => x !== 'capacity')) assert.equal(text(neu[k]), text(alt[k]), `Hand ${n}.${k}`);
    assert.deepEqual(Object.keys(neu), Object.keys(alt));
  }
  const neuVonEU = new Set(EU.map(z => z.id)); // alle 82: 54 alte und 28 neue
  assert.equal(FF.filter(z => neuVonEU.has(z.id) && !istHand(z)).every(z => text(z) === text(EU.find(x => x.id === z.id))), true);
  // Und die Hand 1 und 2 sind noch absolut, 3 bis 5 noch verankert, `showWithoutAnchor` an 3 bis 5 noch da.
  assert.ok(!FF.find(z => z.label === 'Hand Dörfler 1').anchor && !FF.find(z => z.label === 'Hand Dörfler 2').anchor);
  for (const n of [3, 4, 5]) assert.equal(FF.find(z => z.label === `Hand Dörfler ${n}`).showWithoutAnchor, false);
  assert.deepEqual(Object.keys(dz.patchHaende(EU)).sort(), ['art', 'zone'], 'nur zone_data');
});

test('FF 5: der Kopf des Skripts und SCHRITTE – `haende` ist gebaut, jetzt sieben Schritte; der Eintrag in `DEFS` kennt nur die Spalte `zone`', () => {
  assert.deepEqual(Object.keys(dz.SCHRITTE), ['gelaende', 'werte', 'zonen', 'assets', 'aktionen', 'optionen', 'haende', 'aktionen-spieler', 'aufbau-spieler', 'eigentum']);
  for (const k of Object.keys(dz.SCHRITTE)) assert.notEqual(dz.SCHRITTE[k], null, k);
  const kopf = fs.readFileSync(new URL('../../scripts/doerflerzahl-daten.mjs', import.meta.url), 'utf8').split('\n').slice(0, 12).join('\n');
  assert.match(kopf, /haende/, 'der Kopf nennt den Schritt');
  assert.match(kopf, /FF/, 'mit der Aufgabe');
});

// ─────────────────────────────────────────────────────────────────────────────
// main — gegen eine Wegwerf-Datenbank (nie gegen eine echte)
// ─────────────────────────────────────────────────────────────────────────────

function frischeDatenbank(zonenText) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-doerflerzahl-haende-'));
  const file = path.join(tmp, 'test.db');
  execFileSync(process.execPath, ['--input-type=module', '-e',
    'const { setupDatabase, closeDatabase } = await import("./src/database.js"); await setupDatabase(); closeDatabase();'],
  { cwd: new URL('..', import.meta.url), env: { ...process.env, CGE_DB_PATH: file }, stdio: 'pipe' });
  const db = new Database(file);
  db.prepare("insert into games (id, name) values (?, 'TFT')").run(GAME_ID);
  db.prepare('insert into setups (id, game_id, name, state_data, zone_data, sequence_data, grid_data, action_data, scenario_data) values (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(SETUP_ID, GAME_ID, 'TFT Aufbau', '{}', zonenText, dzFixture.sequence, '[]', dzFixture.actions, dzFixture.scenario);
  db.prepare("insert into save_states (id, game_id, name, state_data, setup_id) values (?, ?, 'Auto Save', '{\"a\":0}', ?)").run(randomUUID(), GAME_ID, SETUP_ID);
  db.close();
  return { tmp, file };
}

async function fahre(args, { Db = Database } = {}) {
  const zeilen = [], fehler = [];
  const origLog = console.log, origErr = console.error;
  console.log = (...a) => zeilen.push(a.join(' '));
  console.error = (...a) => fehler.push(a.join(' '));
  try {
    const code = await dz.main(args, { Database: Db });
    return { code, out: [...zeilen, ...fehler].join('\n') };
  } finally {
    console.log = origLog;
    console.error = origErr;
  }
}

/** Alles außer `zone_data` in der Zeile des Aufbaus, und jede Zeile von `save_states`. */
function andere(file) {
  const db = new Database(file, { readonly: true });
  try {
    const row = db.prepare('select * from setups where id = ?').get(SETUP_ID);
    const { zone_data: _z, ...rest } = row;
    return { setups: text(rest), saves: text(db.prepare('select * from save_states order by rowid').all()) };
  } finally { db.close(); }
}
const zoneDaten = (file) => {
  const db = new Database(file, { readonly: true });
  try { return db.prepare('select zone_data from setups where id = ?').get(SETUP_ID).zone_data; } finally { db.close(); }
};
const sicherungsSha = (t) => dz.sicherungsHash(t).slice(0, 12);

test('FF main: --check – schreibgeschützt, „zu schreiben“, Beweis, Prüfer, Zielstand, Hash für die Sicherung; geschrieben wird nichts', async () => {
  const { tmp, file } = frischeDatenbank(text(EU));
  try {
    const vorher = zoneDaten(file);
    const r = await fahre(['--check', file, '--schritt', 'haende']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /zu schreiben/);
    assert.ok(r.out.includes(dz.sicherungsHash(text(EU))), 'der Hash für die Sicherung steht in der Ausgabe');
    assert.equal(zoneDaten(file), vorher);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('FF main: --write mit Sicherung – zone_data auf dem Zielstand, nichts sonst geändert; der zweite Lauf schreibt nichts („schon geschrieben“)', async () => {
  const { tmp, file } = frischeDatenbank(text(EU));
  try {
    const andereVorher = andere(file);
    const r = await fahre(['--write', file, '--schritt', 'haende', '--sicherung-sha', sicherungsSha(text(EU))]);
    assert.equal(r.code, 0, r.out);
    assert.equal(zoneDaten(file), text(ziel()));
    assert.equal(zoneDaten(file), text(mitKapazitaet(EU, 4)));
    assert.deepEqual(andere(file), andereVorher);
    const zweit = await fahre(['--write', file, '--schritt', 'haende']);
    assert.equal(zweit.code, 0, zweit.out);
    assert.match(zweit.out, /schon geschrieben|nichts zu schreiben/);
    assert.equal(zoneDaten(file), text(ziel()));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('FF main: ohne oder mit falscher Sicherung wird nichts geschrieben; --force ist ein Benutzungsfehler', async () => {
  const { tmp, file } = frischeDatenbank(text(EU));
  try {
    assert.equal((await fahre(['--write', file, '--schritt', 'haende'])).code, 1);
    assert.equal((await fahre(['--write', file, '--schritt', 'haende', '--sicherung-sha', 'abcdefabcdef'])).code, 1);
    assert.equal((await fahre(['--write', file, '--schritt', 'haende', '--force'])).code, 2);
    assert.equal(zoneDaten(file), text(EU));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('FF main: Abbruch mit Pfad auf der Datenbank – eine abweichende Hand, und ein Stand **teils** (zwei von fünf): Exit 1, die Spalte bleibt, wie sie war', async () => {
  for (const zonen of [mitHand(EU, 3, h => { h.capacity = 5; }), mitKapAn(EU, [1, 2], 4)]) {
    const { tmp, file } = frischeDatenbank(text(zonen));
    try {
      const r = await fahre(['--write', file, '--schritt', 'haende', '--sicherung-sha', sicherungsSha(text(zonen))]);
      assert.equal(r.code, 1, r.out);
      assert.match(r.out, /zone_data/);
      assert.match(r.out, /Hand Dörfler/);
      assert.equal(zoneDaten(file), text(zonen));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
});

test('FF main: --zurueck – der exakte Zielstand kommt auf den Ausgang, Zeichen für Zeichen; ein Stand, der nicht der Zielstand ist, wird nicht überschrieben', async () => {
  const { tmp, file } = frischeDatenbank(text(EU));
  try {
    assert.equal((await fahre(['--write', file, '--schritt', 'haende', '--sicherung-sha', sicherungsSha(text(EU))])).code, 0);
    const sicherung = path.join(tmp, 'sicherung.json');
    fs.writeFileSync(sicherung, JSON.stringify({ zone_data: text(EU), sha256: dz.sicherungsHash(text(EU)), updated_at: 'test' }));
    const r = await fahre(['--zurueck', sicherung, file, '--schritt', 'haende']);
    assert.equal(r.code, 0, r.out);
    assert.equal(zoneDaten(file), text(EU));
    // Jetzt steht der Ausgang da: ein zweiter Rückweg tut nichts.
    const nochmal = await fahre(['--zurueck', sicherung, file, '--schritt', 'haende']);
    assert.equal(nochmal.code, 0, nochmal.out);
    assert.match(nochmal.out, /nichts zu tun/);
    assert.equal(zoneDaten(file), text(EU));
    // Und ein Stand, der weder Ziel noch Ausgang ist (jemand hat danach weitergearbeitet), wird nicht überschrieben.
    const fremd = text(mitHand(ziel(), 2, h => { h.capacity = 6; }));
    const db = new Database(file); db.prepare('update setups set zone_data = ? where id = ?').run(fremd, SETUP_ID); db.close();
    assert.equal((await fahre(['--zurueck', sicherung, file, '--schritt', 'haende'])).code, 1);
    assert.equal(zoneDaten(file), fremd);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
