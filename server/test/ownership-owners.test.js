// FK / Spec M32.3 — wer führt welchen Platz, und die Zonenbindung: `ownersOf`, `ownersOfPlayers`, `bindZones`
// in `shared/ownership.js` (eine Stelle, M6). Reines Rechnen, ohne Raum und Datenbank.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die Erwartungen der Blöcke sind die **Tabelle der Spec** (M32.3), als Literal ausgeschrieben — nicht aus der
// Formel gerechnet. Die Hand-Zonen kommen aus der echten Fixture (`auslagen-kurzpartie.json`, mit EU und FF
// angewendet: der Baustein `scripts/doerflerzahl-daten.mjs` rechnet den Stand); `platz` setzt der Test selbst,
// denn das Schreiben ist `FS`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { ownersOf, ownersOfPlayers, bindZones } from '../../shared/ownership.js';
import { resolveZones, anchorBoxes } from '../../shared/anchoring.js';
import * as dz from '../../scripts/doerflerzahl-daten.mjs';

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const auszug = lies('auslagen-kurzpartie.json');
const copy = (x) => JSON.parse(JSON.stringify(x));

const FF = dz.patchHaende(dz.patchZonen(auszug.zones).zone).zone;
/** Die Hand-Zonen mit der Bindung, die `FS` schreiben wird: `zhand<n>` → `platz: n`. */
const MIT_PLATZ = FF.map(z => (/^zhand(\d)$/.test(z.id) ? { ...z, platz: Number(z.id.slice(5)) } : z));

const lage = (players, villagers, kind = players === 1 ? 'solo' : players === villagers ? 'normal' : 'mehrfach') =>
  ({ players, villagers, kind, problems: [] });
const spieler = (...sitze) => sitze.map((seat, i) => ({ id: `p${seat}`, seat, color: ['red', 'blue', 'green', 'purple', 'orange'][i] }));

// ── 1. ownersOf ──────────────────────────────────────────────────────────────

test('FK 1: ownersOf(S, D) – die Blöcke der Spec, Platz 1 … D', () => {
  assert.deepEqual(ownersOf(2, 2), [1, 2]);
  assert.deepEqual(ownersOf(2, 3), [1, 1, 2]);
  assert.deepEqual(ownersOf(2, 4), [1, 1, 2, 2]);
  assert.deepEqual(ownersOf(3, 4), [1, 1, 2, 3]);
  assert.deepEqual(ownersOf(3, 5), [1, 1, 2, 2, 3]);
  assert.deepEqual(ownersOf(2, 5), [1, 1, 1, 2, 2]);
  assert.deepEqual(ownersOf(5, 5), [1, 2, 3, 4, 5]);
});

test('FK 1: Eigenschaft über alle S ≤ D ≤ 5 – jeder Rang kommt vor, nicht fallend, Platz 1 gehört Rang 1', () => {
  for (let D = 2; D <= 5; D++) {
    for (let S = 2; S <= D; S++) {
      const r = ownersOf(S, D);
      assert.equal(r.length, D, `${S}/${D}`);
      assert.equal(r[0], 1, `${S}/${D}: Platz 1`);
      for (let i = 1; i < D; i++) assert.ok(r[i] >= r[i - 1], `${S}/${D}: nicht fallend`);
      for (let k = 1; k <= S; k++) assert.ok(r.includes(k), `${S}/${D}: Rang ${k} fehlt`);
      assert.equal(Math.max(...r), S, `${S}/${D}: höchster Rang`);
    }
  }
});

// ── 2. Kein Eigentum ─────────────────────────────────────────────────────────

test('FK 2: kein Eigentum – S = 1, S > D, keine Zahl: `null` (kein Wurf, kein leeres Objekt)', () => {
  assert.equal(ownersOf(1, 1), null);
  assert.equal(ownersOf(1, 4), null);
  assert.equal(ownersOf(3, 2), null);
  assert.equal(ownersOf(), null);
  assert.equal(ownersOf(undefined, 4), null);
  assert.equal(ownersOf(2, NaN), null);
  assert.equal(ownersOf('2', '4'), null);
  assert.equal(ownersOf(2.5, 4), null);
  assert.equal(ownersOf(0, 0), null);
});

test('FK 2: ownersOfPlayers – `lage` ohne `kind`, `solo`, `null`, mit Problemen: `null`', () => {
  const p = spieler(1, 2);
  assert.equal(ownersOfPlayers(null, p), null);
  assert.equal(ownersOfPlayers(undefined, p), null);
  assert.equal(ownersOfPlayers({ players: 2, villagers: 4, kind: null, problems: ['x'] }, p), null);
  assert.equal(ownersOfPlayers(lage(1, 3), spieler(1)), null);
  assert.equal(ownersOfPlayers(lage(1, 3), spieler(1, 2)), null, 'solo mit zwei Menschen: kein Eigentum');
});

// ── 3. ownersOfPlayers ───────────────────────────────────────────────────────

test('FK 3: ownersOfPlayers – { [platz]: { id, color } }, Ränge nach Sitz', () => {
  const [host, gast] = spieler(1, 2);
  assert.deepEqual(ownersOfPlayers(lage(2, 4), [host, gast]), {
    1: { id: host.id, color: host.color },
    2: { id: host.id, color: host.color },
    3: { id: gast.id, color: gast.color },
    4: { id: gast.id, color: gast.color },
  });
});

test('FK 3: Sitze mit Lücken (1, 3, 4) → Rang 1, 2, 3 – nach Reihenfolge, nicht nach Sitznummer', () => {
  const [a, b, c] = spieler(1, 3, 4);
  const owners = ownersOfPlayers(lage(3, 4), [a, b, c]);
  assert.deepEqual(Object.fromEntries(Object.entries(owners).map(([k, v]) => [k, v.id])), { 1: a.id, 2: a.id, 3: b.id, 4: c.id });
});

test('FK 3: unabhängig von der Reihenfolge des Arrays; die Eingabe bleibt unverändert', () => {
  const [a, b, c] = spieler(1, 3, 4);
  const eingabe = [c, a, b];
  const vor = copy(eingabe);
  const owners = ownersOfPlayers(lage(3, 5), eingabe);
  assert.deepEqual(owners, ownersOfPlayers(lage(3, 5), [a, b, c]));
  assert.deepEqual(eingabe, vor, 'nicht sortiert, nicht verändert');
  assert.equal(owners[5].id, c.id);
});

test('FK 3: falsche Spielerzahl → Problem (deutsch, beide Zahlen), kein Eigentum', () => {
  const eins = ownersOfPlayers(lage(2, 4), spieler(1));
  assert.deepEqual(Object.keys(eins), ['problems']);
  assert.equal(eins.problems.length, 1);
  assert.match(eins.problems[0], /braucht genau 2 Spieler, im Raum sind 1/);

  const drei = ownersOfPlayers(lage(2, 4), spieler(1, 2, 3));
  assert.match(drei.problems[0], /braucht genau 2 Spieler, im Raum sind 3/);

  const keiner = ownersOfPlayers(lage(2, 4), []);
  assert.match(keiner.problems[0], /im Raum sind 0/);
});

// ── 4. bindZones ─────────────────────────────────────────────────────────────

const zone = (id, extra = {}) => ({ id, label: id, shape: 'rect', type: 'player', color: null, exclusive: false, x: 0, y: 0, width: 10, height: 10, ...extra });
const OWNERS_2_4 = ownersOfPlayers(lage(2, 4), spieler(1, 2));

test('FK 4: bindZones – `platz` ≤ D bekommt Farbe und `exclusive`; alle anderen Zonen sind **dasselbe Objekt**', () => {
  const [host, gast] = spieler(1, 2);
  const h = [1, 2, 3, 4].map(n => zone(`zhand${n}`, { platz: n }));
  const rest = zone('zrest', { type: 'shared', color: 'green' });
  const eingabe = [rest, ...h];
  const { zones } = bindZones(eingabe, OWNERS_2_4);

  assert.equal(zones.length, 5);
  assert.equal(zones[0], rest, 'nicht gebunden = `===`');
  assert.deepEqual(zones.slice(1).map(z => z.color), [host.color, host.color, gast.color, gast.color]);
  assert.ok(zones.slice(1).every(z => z.exclusive === true));
  assert.ok(zones.slice(1).every((z, i) => z.platz === i + 1 && z.id === `zhand${i + 1}`), 'sonst nichts verändert');
});

test('FK 4: die Eingabe wird nicht verändert', () => {
  const eingabe = [1, 2].map(n => zone(`zhand${n}`, { platz: n }));
  const vor = copy(eingabe);
  const { zones } = bindZones(eingabe, OWNERS_2_4);
  assert.deepEqual(eingabe, vor);
  assert.notEqual(zones[0], eingabe[0], 'gebundene Zone ist eine Kopie');
});

test('FK 4: `platz` > D (ein leerer Platz) bleibt unberührt, ebenso eine Zone ohne `platz`', () => {
  const fuenf = zone('zhand5', { platz: 5 });
  const ohne = zone('zhandx');
  const { zones, warnings } = bindZones([fuenf, ohne], OWNERS_2_4);
  assert.equal(zones[0], fuenf);
  assert.equal(zones[1], ohne);
  assert.equal(warnings.length, 4, 'die Plätze 1–4 haben keine Zone');
});

test('FK 4: owners `null` → dieselbe Liste (`===`), keine Warnung – der Beleg für M32.7', () => {
  const eingabe = MIT_PLATZ;
  const r = bindZones(eingabe, null);
  assert.equal(r.zones, eingabe);
  assert.deepEqual(r.warnings, []);
  assert.equal(bindZones(eingabe, undefined).zones, eingabe);
  // ein Problem-Ergebnis von ownersOfPlayers ist kein Eigentum
  assert.equal(bindZones(eingabe, ownersOfPlayers(lage(2, 4), spieler(1))).zones, eingabe);
});

test('FK 4: keine Liste → leere Liste, kein Wurf', () => {
  assert.deepEqual(bindZones(null, OWNERS_2_4), { zones: [], warnings: [] });
  assert.doesNotThrow(() => bindZones(undefined, null));
});

// ── 5. Warnungen ─────────────────────────────────────────────────────────────

test('FK 5: jeder Platz 1 … D ohne Zone mit `platz` wird namentlich gemeldet', () => {
  const h = [1, 2, 4].map(n => zone(`zhand${n}`, { platz: n }));
  const { warnings } = bindZones(h, OWNERS_2_4);
  assert.deepEqual(warnings, ['Platz 3: keine Hand-Zone mit `platz`']);
});

test('FK 5: keine Warnung bei vollständiger Bindung', () => {
  const h = [1, 2, 3, 4].map(n => zone(`zhand${n}`, { platz: n }));
  assert.deepEqual(bindZones(h, OWNERS_2_4).warnings, []);
});

test('FK 5: Daten ohne `platz` (jeder Stand vor FS): nichts gebunden, eine Warnung je Platz – der Raum startet trotzdem', () => {
  const { zones, warnings } = bindZones(FF, OWNERS_2_4);
  assert.deepEqual(zones, FF);
  zones.forEach((z, i) => assert.equal(z, FF[i]));
  assert.equal(warnings.length, 4);
  assert.match(warnings[0], /^Platz 1:/);
});

// ── 6. Die Fixture ist die echte ─────────────────────────────────────────────

test('FK 6: die fünf Hand-Zonen der Fixture (EU + FF, `platz` 1 … 5) bekommen bei 2 Spielern / 4 Dörfern die erwartete Farbe', () => {
  assert.equal(MIT_PLATZ.filter(z => z.platz).length, 5, 'die Fixture trägt fünf Hände');
  const [host, gast] = spieler(1, 2);
  const { zones, warnings } = bindZones(MIT_PLATZ, OWNERS_2_4);
  const hand = (n) => zones.find(z => z.id === `zhand${n}`);
  assert.deepEqual([1, 2, 3, 4].map(n => hand(n).color), [host.color, host.color, gast.color, gast.color]);
  assert.ok([1, 2, 3, 4].every(n => hand(n).exclusive === true));
  assert.equal(hand(5), MIT_PLATZ.find(z => z.id === 'zhand5'), 'Platz 5 ist leer und bleibt unberührt');
  assert.equal(hand(5).exclusive, false);
  assert.deepEqual(warnings, []);
  // alle übrigen Zonen sind dasselbe Objekt
  const gebunden = new Set(['zhand1', 'zhand2', 'zhand3', 'zhand4']);
  zones.forEach((z, i) => { if (!gebunden.has(z.id)) assert.equal(z, MIT_PLATZ[i], z.id); });
});

test('FK 6: `platz` überlebt `resolveZones` und einen Editor-Rundlauf (M32.9)', () => {
  const tableaus = [{ assetId: 'bad13f49-c614-4551-9e81-fe8603dbf09a', x: 1460, y: 1600, width: 300, height: 400 }];
  const aufgeloest = resolveZones(MIT_PLATZ, anchorBoxes(tableaus));
  for (const n of [1, 2, 3, 4, 5]) assert.equal(aufgeloest.find(z => z.id === `zhand${n}`).platz, n, `zhand${n}`);

  const editiert = aufgeloest.map(z => ({ ...z, ...{ label: `${z.label}!` } }));
  for (const n of [1, 2, 3, 4, 5]) assert.equal(editiert.find(z => z.id === `zhand${n}`).platz, n);

  // und der Rundlauf durch JSON (so liegt es in `zone_data`)
  assert.deepEqual(JSON.parse(JSON.stringify(MIT_PLATZ)), MIT_PLATZ);
});
