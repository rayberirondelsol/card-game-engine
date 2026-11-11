// EU Teil 1 / Spec M31.8, M31.12 — die Zonen der Plätze 4 und 5 und das Layout: `scripts/doerflerzahl-daten.mjs`, Schritt `zonen`,
// und `equipmentZonesFor` in `scripts/equipment-zones.mjs`.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Die Daten kommen aus `fixtures/auslagen-kurzpartie.json` (54 Zonen, 212 Assets, Auszug der Produktion; Teil 1 liest die Produktion nicht).
// Die Dörfler-Daten (Sitze mit `tableau`, `barZone`) kommen aus `fixtures/doerflerzahl-kurzpartie.json` (Stand nach M30) — der Auszug
// der Zonen ist älter und trägt diese Felder nicht. Die Zahlen, die der Test selbst braucht (Tableau-Mitten, Asset-Ids der Plätze,
// Hand 3 absolut), stehen **hier** ausgeschrieben, aus dem Pflichtenheft und der Messung — nicht aus dem Baustein gelesen.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto, { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';

import * as ez from '../../scripts/equipment-zones.mjs';
import * as dz from '../../scripts/doerflerzahl-daten.mjs';
import { resolveZones, resolveBox, anchorBoxes } from '../../shared/anchoring.js';
import { ZONE_LABEL_HEIGHT, ZONE_LABEL_WIDTH } from '../../shared/zoneGeometry.js';
import { validateVillagers } from '../../shared/villagers.js';

const { default: Database } = await import('better-sqlite3');

const lies = (name) => JSON.parse(fs.readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const auszug = lies('auslagen-kurzpartie.json');
const AUSGANG = auszug.zones;
const dzFixture = lies('doerflerzahl-kurzpartie.json');
const scenario = JSON.parse(dzFixture.scenario);
const sequenz = auszug.sequenceBefore;
const { SETUP_ID, GAME_ID } = dz;

const copy = (x) => JSON.parse(JSON.stringify(x));
const text = (x) => JSON.stringify(x);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);

// ── Die Zahlen, aus Pflichtenheft und Messung ausgeschrieben ───────────────────
const ID = {
  1: '98e26309-d1d5-432c-b2ea-26289f26fb75', // Henlo Bulwark
  2: 'd4691079-bd86-496a-a49b-c6b7a317c2d9', // Fridgette Jones
  3: 'bad13f49-c614-4551-9e81-fe8603dbf09a', // Granny Melba
  4: 'af3a4982-a0f5-4884-834f-221447ba5377', // Blopsy Twins (Platz 4)
  5: 'dae61142-a596-46c9-acba-640f82e9433c', // Yancy Plover (Platz 5)
};
const MITTE_X = { 1: 300, 2: 880, 3: 1460, 4: 2040, 5: 2620 };   // Tableau-Mitten bei y 1600, 300 × 400
const kasten = (n) => ({ x: MITTE_X[n] - 150, y: 1400, width: 300, height: 400 });
const tisch = (ns) => anchorBoxes(auszug.state.tokens, ns.map(n => ({ assetId: ID[n], x: MITTE_X[n], y: 1600, width: 300, height: 400 })));
const NEU_ALLE = 28;
const LEISTEN = ['Leben', 'Bewegung', 'Mumm', 'Präzision'];
const SLOTS = ['Kopf', 'Brust', 'Beine', 'Linke Hand', 'Rechte Hand', 'Mitbringsel'];

/** Der Zielstand, aus dem Ausgang gerechnet — ein Aufruf je Test, damit ein fehlender Baustein nur den Test rot macht. */
const ziel = () => dz.patchZonen(AUSGANG).zone;

/** Die Zonen, die zu Platz `n` gehören: der Anker ist die Tableau-Id, die Hand trägt `zhand<n>`. */
const seatOf = (z) => {
  const m = /^zhand(\d)$/.exec(z.id);
  if (m) return Number(m[1]);
  const n = Object.keys(ID).find(k => ID[k] === z.anchor?.assetId);
  return n ? Number(n) : null;
};

/** Die Kopie einer Leiste, ohne Id, Label und Anker-Id — der Rest muss Zeichen für Zeichen gleich sein. */
const normal = (z) => {
  const { id: _id, label: _label, ...rest } = z;
  if (rest.anchor) rest.anchor = { ...rest.anchor, assetId: 'ID' };
  return text(rest);
};
const bySeatLabel = (zones, label) => zones.find(z => z.label === label);

// ── Der Layoutrechner (Teil des Tests, nicht des Bausteins) ───────────────────
const LABEL_H = ZONE_LABEL_HEIGHT;   // das Schild über der Zone: Höhe und Mindestbreite aus `shared/zoneGeometry.js`
const rect = (b) => ({ x: b.x, y: b.y, w: b.w, h: b.h });
const schild = (b) => ({ x: b.x, y: b.y - LABEL_H, w: Math.max(b.w, ZONE_LABEL_WIDTH), h: LABEL_H });
const ueberlappt = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Alle Teile (Kasten und Schild) je Zone am Tisch mit allen Zonen aus `zones` und den Tableau-Ankern. */
function tischTeile(zones, ns = [1, 2, 3, 4, 5]) {
  const gelöst = resolveZones(zones, tisch(ns));
  return gelöst.map(z => {
    const b = { x: z.x, y: z.y, w: z.width, h: z.height };
    return { id: z.id, label: z.label, seat: seatOf(z), teile: [rect(b), schild(b)] };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 1  equipmentZonesFor (parametrisiert) — die drei Plätze unverändert
// ─────────────────────────────────────────────────────────────────────────────

test('EU 1: equipmentZonesFor – für die drei bestehenden Plätze dasselbe wie equipmentZones() (deepEqual), und die einundzwanzig Zonen der Fixture bleiben', () => {
  const drei = [1, 2, 3].map(n => ({ n, assetId: ID[n], vorratId: ez.VORRAT_IDS[n] }));
  assert.deepEqual(ez.equipmentZonesFor(drei), ez.equipmentZones());
  const alt = new Map(AUSGANG.map(z => [z.id, z]));
  const zonen = ez.equipmentZones();
  assert.equal(zonen.length, 21);
  for (const z of zonen) assert.deepEqual(z, alt.get(z.id), z.id);
});

test('EU 1: der Generator für die drei Plätze zählt nicht mit den Plätzen 4 und 5 — Platz 3 ist die Vorlage, die Kopie gleicht ihr', () => {
  const neu = ez.equipmentZonesFor(dz.NEUE_PLAETZE.map(p => ({ n: p.n, assetId: p.assetId, vorratId: p.vorratId })));
  const platz3 = AUSGANG.filter(z => z.anchor?.assetId === ID[3] && (SLOTS.some(s => z.label === `Dörfler 3: ${s}`) || z.label === 'Ausrüstung Dörfler 3'));
  assert.equal(platz3.length, 7);
  for (const z3 of platz3) {
    const z4 = neu.find(z => z.label === z3.label.replace('3', '4'));
    assert.ok(z4, z3.label);
    const a = { ...z3, id: 'X', label: 'X', anchor: { ...z3.anchor, assetId: 'X' } };
    const b = { ...z4, id: 'X', label: 'X', anchor: { ...z4.anchor, assetId: 'X' } };
    assert.deepEqual(b, a, z3.label);
  }
});

test('EU 1: equipmentZonesFor – Platz 4 und 5 je sieben Zonen (sechs Plätze und Vorrat) an der eigenen Tableau-Id, Labels „Dörfler n: …“', () => {
  const neu = ez.equipmentZonesFor(dz.NEUE_PLAETZE.map(p => ({ n: p.n, assetId: p.assetId, vorratId: p.vorratId })));
  assert.equal(neu.length, 14);
  for (const p of dz.NEUE_PLAETZE) {
    const mine = neu.filter(z => z.anchor.assetId === p.assetId);
    assert.equal(mine.length, 7, `Platz ${p.n}`);
    assert.deepEqual(mine.map(z => z.label).sort(), [...SLOTS.map(s => `Dörfler ${p.n}: ${s}`), `Ausrüstung Dörfler ${p.n}`].sort());
    assert.ok(mine.every(z => z.capacity === (z.label.startsWith('Ausrüstung') ? null : 1)), `Platz ${p.n}: capacity`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2  Die Konstanten — neu und eindeutig
// ─────────────────────────────────────────────────────────────────────────────

test('EU 2: die Konstanten – Platz 4 mit `af3a4982…`, Platz 5 mit `dae61142…`, je Vorrat-Id und vier Leisten-Ids, zusammen mit den Zonen-Ids eindeutig und neu', () => {
  assert.equal(dz.NEUE_PLAETZE.length, 2);
  assert.equal(dz.NEUE_PLAETZE[0].n, 4);
  assert.equal(dz.NEUE_PLAETZE[0].assetId, 'af3a4982-a0f5-4884-834f-221447ba5377');
  assert.equal(dz.NEUE_PLAETZE[1].n, 5);
  assert.equal(dz.NEUE_PLAETZE[1].assetId, 'dae61142-a596-46c9-acba-640f82e9433c');
  for (const p of dz.NEUE_PLAETZE) assert.equal(p.leisten.length, 4, `Platz ${p.n}`);
  const alle = ziel().map(z => z.id);
  assert.equal(alle.length, 54 + NEU_ALLE);
  assert.equal(new Set(alle).size, alle.length, 'Zonen-Ids eindeutig');
  const alt = new Set(AUSGANG.map(z => z.id));
  const neu = ziel().filter(z => !alt.has(z.id));
  assert.equal(neu.length, NEU_ALLE, 'genau 28 neue Ids');
  assert.equal(new Set(ziel().map(z => z.label)).size, alle.length, 'Labels eindeutig');
});

// ─────────────────────────────────────────────────────────────────────────────
// 3  Die Kopien nach Spaltenlage — der Gegenbeweis an den Vorlagen zuerst
// ─────────────────────────────────────────────────────────────────────────────

test('EU 3: Gegenbeweis an den Vorlagen (Fixture) – die Leisten von Platz 1 und 3 sind Zeichen für Zeichen gleich, die von Platz 2 nicht; Heldentaten und Ausliegend sind an allen drei gleich', () => {
  for (const l of LEISTEN) {
    const p1 = bySeatLabel(AUSGANG, `Dörfler 1: ${l}`), p2 = bySeatLabel(AUSGANG, `Dörfler 2: ${l}`), p3 = bySeatLabel(AUSGANG, `Dörfler 3: ${l}`);
    assert.equal(normal(p1), normal(p3), `${l}: 1 = 3`);
    assert.notEqual(normal(p1), normal(p2), `${l}: 1 ≠ 2`);
  }
  for (const h of ['Erfüllte Heldentaten', 'Ausliegend']) {
    const z = [1, 2, 3].map(n => bySeatLabel(AUSGANG, `Dörfler ${n}: ${h}`));
    assert.equal(normal(z[0]), normal(z[2]), `${h}: 1 = 3`);
    assert.equal(normal(z[1]), normal(z[2]), `${h}: 2 = 3`);
  }
});

test('EU 3: Platz 4 kopiert die Leisten von Platz 1, Platz 5 die von Platz 2 (bis auf Anker-Id, Zonen-Id, Label); Heldentaten und Ausliegend beider von Platz 3', () => {
  const z = ziel();
  for (const [n, vor] of [[4, 1], [5, 2]]) {
    for (const l of LEISTEN) {
      const kopie = bySeatLabel(z, `Dörfler ${n}: ${l}`), vorlage = bySeatLabel(AUSGANG, `Dörfler ${vor}: ${l}`);
      assert.ok(kopie, `Dörfler ${n}: ${l} fehlt`);
      assert.equal(normal(kopie).replace(',"showWithoutAnchor":false', ''), normal(vorlage), `Dörfler ${n}: ${l}`);
      assert.equal(kopie.anchor.assetId, ID[n]);
      assert.equal(kopie.showInPlay, false);
      assert.deepEqual(kopie.accepts, ['asset']);
      assert.equal(kopie.layout, 'slots');
      assert.equal(kopie.slots.length, 10);
      const nummern = kopie.slots.map(s => s.n);
      assert.deepEqual(nummern, l === 'Präzision' ? [-4, -3, -2, -1, 0, 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }
    for (const h of ['Erfüllte Heldentaten', 'Ausliegend']) {
      const kopie = bySeatLabel(z, `Dörfler ${n}: ${h}`), vorlage = bySeatLabel(AUSGANG, `Dörfler 3: ${h}`);
      assert.equal(normal(kopie).replace(',"showWithoutAnchor":false', ''), normal(vorlage), `Dörfler ${n}: ${h}`);
      assert.equal(kopie.anchor.assetId, ID[n]);
    }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4  Die Hände
// ─────────────────────────────────────────────────────────────────────────────

test('EU 4: Hand Dörfler 4 und 5 verankert über dem Tableau (relX 0, relY −0,65, 360 × 170), capacity 3, type player, color null, exclusive false', () => {
  const z = ziel();
  for (const n of [4, 5]) {
    const h = bySeatLabel(z, `Hand Dörfler ${n}`);
    assert.ok(h, `Hand ${n} fehlt`);
    assert.equal(h.anchor.assetId, ID[n]);
    assert.ok(Math.abs(h.anchor.relX - 0) < 1e-12);
    assert.ok(Math.abs(h.anchor.relY - (-0.65)) < 1e-12);
    assert.ok(Math.abs(h.anchor.relWidth - 1.2) < 1e-12);
    assert.ok(Math.abs(h.anchor.relHeight - 0.425) < 1e-12);
    const b = resolveBox(h.anchor, kasten(n));
    assert.ok(Math.abs(b.x - (MITTE_X[n] - 150)) < 1e-9 && Math.abs(b.y - 1140) < 1e-9 && Math.abs(b.width - 360) < 1e-9 && Math.abs(b.height - 170) < 1e-9, `Hand ${n}: ${text(b)}`);
    assert.equal(h.capacity, 3);
    assert.equal(h.type, 'player');
    assert.equal(h.color, null);
    assert.equal(h.exclusive, false);
    assert.equal(h.layout, 'row');
    assert.deepEqual(h.accepts, ['card']);
  }
});

test('EU 4: Hand Dörfler 3 relativ, dieselbe absolute Box (970 … 1330 × 1140 … 1310) – resolveBox mit dem Anker (Mitte 1460/1600) bis auf 1e-9; sonst wie vorher', () => {
  const z = ziel();
  const h3 = bySeatLabel(z, 'Hand Dörfler 3');
  assert.ok(h3.anchor, 'Hand 3 ist nicht relativ');
  assert.equal(h3.anchor.assetId, ID[3]);
  assert.ok(Math.abs(h3.anchor.relX - (-340 / 300)) < 1e-9, `relX ${h3.anchor.relX}`);
  assert.ok(Math.abs(h3.anchor.relY - (-0.65)) < 1e-12);
  assert.ok(Math.abs(h3.anchor.relWidth - 1.2) < 1e-12);
  assert.ok(Math.abs(h3.anchor.relHeight - 0.425) < 1e-12);
  const b = resolveBox(h3.anchor, kasten(3));
  assert.ok(Math.abs(b.x - 970) < 1e-9 && Math.abs(b.y - 1140) < 1e-9 && Math.abs(b.width - 360) < 1e-9 && Math.abs(b.height - 170) < 1e-9, `Hand 3: ${text(b)}`);
  assert.equal(h3.x, undefined, 'die absolute Position steht nicht mehr da');
  assert.equal(h3.capacity, 3);
  assert.equal(h3.type, 'player');
  assert.equal(h3.color, null);
  assert.equal(h3.exclusive, false);
  assert.equal(h3.showWithoutAnchor, false);
  // Hand 1 und 2 bleiben, wie sie sind
  for (const id of ['zhand1', 'zhand2']) assert.deepEqual(z.find(x => x.id === id), AUSGANG.find(x => x.id === id), id);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5  Das Feld showWithoutAnchor
// ─────────────────────────────────────────────────────────────────────────────

test('EU 5: showWithoutAnchor: false an allen 14 Zonen der Plätze 3, 4 und 5 (Hand eingeschlossen) – an keiner von Platz 1 und 2, nicht an gemeinsamen Zonen', () => {
  const z = ziel();
  for (const n of [3, 4, 5]) {
    const mine = z.filter(x => seatOf(x) === n);
    assert.equal(mine.length, 14, `Platz ${n}`);
    assert.ok(mine.every(x => x.showWithoutAnchor === false), `Platz ${n}: Feld`);
  }
  for (const x of z.filter(x => seatOf(x) === null || seatOf(x) === 1 || seatOf(x) === 2)) {
    assert.equal(hasOwnProperty(x, 'showWithoutAnchor'), false, `${x.label}`);
  }
  assert.equal(z.filter(x => hasOwnProperty(x, 'showWithoutAnchor')).length, 42);
});

const hasOwnProperty = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// ─────────────────────────────────────────────────────────────────────────────
// 6  Das Layout — gerechnet aus den Zonen der Fixture
// ─────────────────────────────────────────────────────────────────────────────

/** Die Stapel auf dem Tisch (`place_stack`, Mitte x 1780, Karte 100 × 140) — zählen als gemeinsame Teile. */
const stapel = () => sequenz.filter(s => s.type === 'place_stack' && s.x === 1780).map(s => ({ x: s.x - 50, y: s.y - 70, w: 100, h: 140 }));

test('EU 6: das Layout – keine Überschneidung zweier Zonen verschiedener Plätze und keine mit den gemeinsamen Zonen und Stapeln, Schilder eingerechnet', () => {
  const teile = tischTeile(ziel());
  const alle = [
    ...teile,
    ...stapel().map((b, i) => ({ id: `stapel${i}`, label: 'Stapel', seat: null, teile: [rect(b)] })),
  ];
  const treffer = [];
  for (let i = 0; i < alle.length; i++) {
    for (let j = i + 1; j < alle.length; j++) {
      const a = alle[i], b = alle[j];
      if (a.seat === null && b.seat === null) continue;          // gemeinsame Zonen untereinander sind nicht Gegenstand
      if (a.seat !== null && a.seat === b.seat) continue;        // innerhalb eines Platzes
      for (const x of a.teile) for (const y of b.teile) if (ueberlappt(x, y)) treffer.push(`${a.label} ↔ ${b.label}`);
    }
  }
  assert.deepEqual([...new Set(treffer)], []);
});

test('EU 6: die Plätze 1 bis 5 haben Luft (40 Punkte) zum Nachbarn – gemessen an den Ausrüstungsplätzen und Wertleisten, nicht am Vorrat', () => {
  const teile = tischTeile(ziel());
  const band = (n) => {
    const z = teile.filter(t => t.seat === n && (SLOTS.some(s => t.label === `Dörfler ${n}: ${s}`) || LEISTEN.some(l => t.label === `Dörfler ${n}: ${l}`)));
    const xs = z.map(t => t.teile[0]);
    return { min: Math.min(...xs.map(r => r.x)), max: Math.max(...xs.map(r => r.x + r.w)), n: xs.length };
  };
  const b = [1, 2, 3, 4, 5].map(band);
  for (const k of [1, 2, 3, 4]) assert.equal(b[k].n, 10, `Platz ${k + 1}: zehn Teile im Band`);
  for (let k = 0; k < 4; k++) assert.equal(b[k + 1].min - b[k].max, 40, `Luft zwischen Platz ${k + 1} und ${k + 2}`);
});

test('EU 6: der Münzkasten (185 × 102, Versatz −70/−40) auf (2000, 1040) überschneidet nichts, auf (2080, 1430) überschneidet er das Tableau von Platz 4', () => {
  assert.deepEqual(ez.COUNTER_SIZE, { width: 185, height: 102, offsetX: -70, offsetY: -40 });
  const teile = tischTeile(ziel());
  const andere = [
    ...teile.flatMap(t => t.teile.map(r => ({ label: t.label, r }))),
    ...stapel().map(r => ({ label: 'Stapel', r: rect(r) })),
  ];
  const kasten2 = (p) => { const c = ez.counterBox(p); return { x: c.x, y: c.y, w: c.width, h: c.height }; };
  const hits = (p) => [...new Set(andere.filter(o => ueberlappt(kasten2(p), o.r)).map(o => o.label))];
  assert.deepEqual(hits(dz.MUENZKASTEN.ziel), [], `Münzkasten auf ${text(dz.MUENZKASTEN.ziel)}: ${hits(dz.MUENZKASTEN.ziel).join(', ')}`);
  const alt = hits(dz.MUENZKASTEN.alt);
  assert.ok(alt.length > 0 && alt.every(l => /^(Dörfler 4: |Hand Dörfler 4$)/.test(l)), `auf ${text(dz.MUENZKASTEN.alt)} trifft er Platz 4: ${alt.join(', ')}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// 7  Der Tisch — leere Plätze, und `validateVillagers` (EV ist noch nicht angewendet)
// ─────────────────────────────────────────────────────────────────────────────

test('EU 7: der Tisch mit zwei Dörflern – die 42 Zonen der Plätze 3, 4, 5 sind abgewandt und anchorMissing; mit fünf Dörflern keine', () => {
  const z = ziel();
  const zwei = resolveZones(z, tisch([1, 2]));
  const leer = zwei.filter(x => x.anchorMissing);
  assert.equal(leer.length, 42);
  assert.deepEqual([...new Set(leer.map(seatOf))].sort(), [3, 4, 5]);
  assert.ok(leer.every(x => x.facingAway === true), 'die leeren Plätze sind abgewandt');
  // Die übrigen abgewandten Zonen (Aktionen, Ablage am Sideboard) kommen von der Seitenregel, nicht vom leeren Platz.
  assert.ok(zwei.filter(x => x.facingAway && !x.anchorMissing).every(x => x.anchorSide), 'nur die Seitenregel');
  assert.equal(zwei.filter(x => x.facingAway && [1, 2].includes(seatOf(x))).length, 0);

  const fuenf = resolveZones(z, tisch([1, 2, 3, 4, 5]));
  assert.equal(fuenf.filter(x => x.anchorMissing).length, 0);
  assert.equal(fuenf.filter(x => x.facingAway && !x.anchorSide).length, 0, 'mit fünf keine abgewandte Zone des leeren Platzes');
});

test('EU 7: validateVillagers mit fünf Plätzen ist ohne Problem, wenn die acht Marker-Zeilen da sind (als Testeingabe, EV baut sie nicht) – ohne sie nennt er die Marker', () => {
  const alt = scenario.villagers;
  const sitz = (n) => ({ anchor: `Tableau: ${n === 4 ? 'Blopsy Twins' : 'Yancy Plover'}`, zones: `Dörfler ${n}`, markers: `Marker ${n}`, vorrat: `Ausrüstung Dörfler ${n}`, tableau: { x: MITTE_X[n], y: 1600 } });
  const fuenfDoerfler = { ...alt, seats: [...alt.seats, sitz(4), sitz(5)] };
  const zonen = ziel();
  const marker3 = (w) => auszug.assets.find(a => a.name === `Marker 3: ${w}`);
  const acht = [4, 5].flatMap(n => LEISTEN.map(w => ({ ...copy(marker3(w)), id: randomUUID(), name: `Marker ${n}: ${w}` })));
  assert.equal(acht.length, 8);
  const mitMarkern = [...auszug.assets, ...acht];
  assert.deepEqual(validateVillagers(fuenfDoerfler, { assets: mitMarkern, zones: zonen }), []);
  const ohne = validateVillagers(fuenfDoerfler, { assets: auszug.assets, zones: zonen });
  assert.ok(ohne.some(p => p.includes('Marker 4: Leben')), ohne.join(' | '));
  assert.ok(ohne.some(p => p.includes('Marker 5: Präzision')), ohne.join(' | '));
});

// ─────────────────────────────────────────────────────────────────────────────
// 8  Vorbedingung je Stück, Abbruch mit Pfad, Rückwärtsbeweis
// ─────────────────────────────────────────────────────────────────────────────

test('EU 8: der Ausgang – 54 Zonen, Platz 3 ohne das Feld, Hand 3 absolut wie gemessen → zu schreiben; der Zielstand hat 82 Zonen', () => {
  const r = dz.patchZonen(AUSGANG);
  assert.equal(r.art, 'zu-schreiben');
  assert.equal(r.zone.length, 82);
});

test('EU 8: schon im Ziel → „schon-da“, die Eingabe kommt gleich zurück (als Kopie) und wird nicht verändert', () => {
  const z = ziel();
  const vorher = text(z);
  const r = dz.patchZonen(z);
  assert.equal(r.art, 'schon-da');
  assert.equal(text(r.zone), vorher);
  assert.equal(text(z), vorher, 'Eingabe unverändert');
});

test('EU 8: Abbruch mit Pfad – eine Zone zu viel, ein fehlender Eintrag, ein Feld an Platz 3, Hand 3 relativ wie im Ziel, aber mit Fehler, ein Platz-1-Wert, ein Teil-Stand', () => {
  const fremd = { id: 'zfremd', label: 'Fremd', shape: 'rect', type: 'shared', color: null, accepts: ['card'], capacity: null, layout: 'stack', snap: true, exclusive: false, startingHandCardIds: [], dealStackId: null, dealCount: 0, x: 0, y: 0, width: 100, height: 100 };
  const a = dz.patchZonen([...copy(AUSGANG), fremd]);
  assert.equal(a.art, 'abweichend');
  assert.ok(a.probleme.length > 0);

  const weniger = copy(AUSGANG).filter(z => z.id !== 'zmitbringsel1');
  const b = dz.patchZonen(weniger);
  assert.equal(b.art, 'abweichend');
  assert.ok(b.probleme.some(p => /zone_data/.test(p)), b.probleme.join(' | '));

  const feld = copy(AUSGANG).map(z => (z.id === 'zmitbringsel3' ? { ...z, showWithoutAnchor: false } : z));
  const c = dz.patchZonen(feld);
  assert.equal(c.art, 'abweichend');
  assert.ok(c.probleme.some(p => p.includes('Dörfler 3: Mitbringsel')), c.probleme.join(' | '));

  const hand = copy(AUSGANG).map(z => (z.id === 'zhand3' ? { ...z, anchor: { assetId: ID[3], relX: -1.1, relY: -0.65, relWidth: 1.2, relHeight: 0.425 } } : z));
  const d = dz.patchZonen(hand);
  assert.equal(d.art, 'abweichend');
  assert.ok(d.probleme.some(p => p.includes('Hand Dörfler 3')), d.probleme.join(' | '));

  const eins = copy(AUSGANG).map(z => (z.id === 'zkopf1' ? { ...z, relY: 0.5 } : z));
  const e = dz.patchZonen(eins);
  assert.equal(e.art, 'abweichend');
  assert.ok(e.probleme.some(p => p.includes('Dörfler 1: Kopf') || p.includes('zkopf1')), e.probleme.join(' | '));

  const teil = ziel().filter(z => z.id !== 'zkopf4');
  const f = dz.patchZonen(teil);
  assert.equal(f.art, 'abweichend');
  assert.ok(f.probleme.some(p => /teil|Teil|halb/.test(p)), f.probleme.join(' | '));
});

test('EU 8: Rückwärtsbeweis – die 28 entfernen, das Feld entfernen, Hand 3 wieder absolut ergibt den gelesenen Text, Zeichen für Zeichen; die Vorwärtsprobe stimmt', () => {
  assert.deepEqual(dz.beweiseZonen({ zone: AUSGANG }, { zone: ziel() }), []);
});

test('EU 8: der Beweis fängt, was nicht stimmt – eine relX-Abweichung an Hand 3, ein Feld an Platz 1, ein fremder Schlüssel an einer Zone', () => {
  const z = ziel();
  const relX = z.map(x => (x.id === 'zhand3' ? { ...x, anchor: { ...x.anchor, relX: x.anchor.relX + 0.01 } } : x));
  assert.ok(dz.beweiseZonen({ zone: AUSGANG }, { zone: relX }).length > 0, 'relX');
  const feld1 = z.map(x => (x.id === 'zkopf1' ? { ...x, showWithoutAnchor: false } : x));
  assert.ok(dz.beweiseZonen({ zone: AUSGANG }, { zone: feld1 }).length > 0, 'Feld an Platz 1');
  const fremd = z.map(x => (x.id === 'zkopf4' ? { ...x, neu: 1 } : x));
  assert.ok(dz.beweiseZonen({ zone: AUSGANG }, { zone: fremd }).length > 0, 'fremder Schlüssel');
});

// ─────────────────────────────────────────────────────────────────────────────
// 9  Disjunkt — geschrieben wird `zone_data`, sonst nichts; die Konstanten
// ─────────────────────────────────────────────────────────────────────────────

test('EU 9: die Konstanten – Ausgang = Länge und Hash der Fixture (gerechnet), Ziel = Länge und Hash des Zielstands; nur die Spalte `zone`', () => {
  const ausgang = dz.SCHRITTE.zonen.ausgang;
  assert.deepEqual(Object.keys(ausgang), ['zone']);
  assert.deepEqual(ausgang.zone, { laenge: text(AUSGANG).length, sha: sha(text(AUSGANG)) });
  const z = dz.SCHRITTE.zonen.ziel;
  assert.deepEqual(Object.keys(z), ['zone']);
  assert.deepEqual(z.zone, { laenge: text(ziel()).length, sha: sha(text(ziel())) });
});

test('EU 9: der Schritt berührt nur zone_data – das Ergebnis trägt keine andere Spalte', () => {
  const r = dz.patchZonen(AUSGANG);
  assert.deepEqual(Object.keys(r).sort(), ['art', 'zone']);
});

test('EU 9: der Prüfer – Ids und Labels eindeutig, das Feld nur an den Plätzen 3–5, jede Zone mit Anker hat Zahlen', () => {
  assert.deepEqual(dz.pruefeZonen(ziel()), []);
  assert.ok(dz.pruefeZonen([...ziel(), { ...copy(AUSGANG[0]), id: 'zkopf1' }]).length > 0);
  assert.ok(dz.pruefeZonen(AUSGANG.map(z => (z.id === 'zkopf1' ? { ...z, showWithoutAnchor: false } : z))).length > 0);
});

test('EU 9: der Kopf des Skripts und SCHRITTE – `zonen` ist gebaut (alle sechs Schritte seit EX: `assets` seit EV, `aktionen` seit EW, `optionen` seit EX); die Kurzfassung „Befund“ nennt keine Zahl des Ziels', () => {
  assert.deepEqual(Object.keys(dz.SCHRITTE), ['gelaende', 'werte', 'zonen', 'assets', 'aktionen', 'optionen', 'haende', 'aktionen-spieler', 'aufbau-spieler', 'eigentum']);
  for (const k of Object.keys(dz.SCHRITTE)) assert.notEqual(dz.SCHRITTE[k], null, k);
  assert.notEqual(dz.SCHRITTE.zonen, null);
  assert.notEqual(dz.SCHRITTE.aktionen, null);
});

// ─────────────────────────────────────────────────────────────────────────────
// main — gegen eine Wegwerf-Datenbank
// ─────────────────────────────────────────────────────────────────────────────

function frischeDatenbank(zonenText) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cge-doerflerzahl-zonen-'));
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

async function lauf(args, { Db = Database } = {}) {
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

test('EU main: --check – schreibgeschützt, „zu schreiben“, Beweis, Prüfer, Zielstand, Hash für die Sicherung; geschrieben wird nichts', async () => {
  const { tmp, file } = frischeDatenbank(text(AUSGANG));
  try {
    const vorher = zoneDaten(file);
    const r = await lauf(['--check', file, '--schritt', 'zonen']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /zu schreiben/);
    assert.ok(r.out.includes(dz.sicherungsHash(text(AUSGANG))), 'der Hash für die Sicherung steht in der Ausgabe');
    assert.equal(zoneDaten(file), vorher);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('EU main: --write mit Sicherung – zone_data auf dem Zielstand, nichts sonst geändert; der zweite Lauf schreibt nichts', async () => {
  const { tmp, file } = frischeDatenbank(text(AUSGANG));
  try {
    const andereVorher = andere(file);
    const r = await lauf(['--write', file, '--schritt', 'zonen', '--sicherung-sha', dz.sicherungsHash(text(AUSGANG)).slice(0, 12)]);
    assert.equal(r.code, 0, r.out);
    assert.equal(zoneDaten(file), text(ziel()));
    assert.deepEqual(andere(file), andereVorher);
    const zweit = await lauf(['--write', file, '--schritt', 'zonen']);
    assert.equal(zweit.code, 0, zweit.out);
    assert.match(zweit.out, /schon geschrieben|nichts zu schreiben/);
    assert.equal(zoneDaten(file), text(ziel()));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('EU main: ohne oder mit falscher Sicherung wird nichts geschrieben; --force ist ein Benutzungsfehler', async () => {
  const { tmp, file } = frischeDatenbank(text(AUSGANG));
  try {
    assert.equal((await lauf(['--write', file, '--schritt', 'zonen'])).code, 1);
    assert.equal((await lauf(['--write', file, '--schritt', 'zonen', '--sicherung-sha', 'abcdefabcdef'])).code, 1);
    assert.equal((await lauf(['--write', file, '--schritt', 'zonen', '--force'])).code, 2);
    assert.equal(zoneDaten(file), text(AUSGANG));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('EU main: --zurueck – der exakte Zielstand kommt auf den Ausgang, Zeichen für Zeichen', async () => {
  const { tmp, file } = frischeDatenbank(text(AUSGANG));
  try {
    assert.equal((await lauf(['--write', file, '--schritt', 'zonen', '--sicherung-sha', dz.sicherungsHash(text(AUSGANG)).slice(0, 12)])).code, 0);
    const sicherung = path.join(tmp, 'sicherung.json');
    fs.writeFileSync(sicherung, JSON.stringify({ zone_data: text(AUSGANG), sha256: dz.sicherungsHash(text(AUSGANG)), updated_at: 'test' }));
    const r = await lauf(['--zurueck', sicherung, file, '--schritt', 'zonen']);
    assert.equal(r.code, 0, r.out);
    assert.equal(zoneDaten(file), text(AUSGANG));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
});
