// DM / Spec M29.6, M29.7, M29.1 — die Zuordnung der drei Plättchenarten zu ihrer Geländekarte:
// `scripts/gelaendekarten-zuordnung.mjs`, der **reine** Baustein (ohne Datenbank).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Grundlage ist `fixtures/auslagen-kurzpartie.json` (nichts davon wird geschrieben). Ihr
// `scenarioBefore` ist der Stand **vor** M28; `berichtige(...)` aus dem M28-Skript (eingelesen,
// nicht kopiert) macht den Ausgangsstand von M29 daraus. Der **erste** Test hält das fest: ist
// die Fixture nicht der Ausgangsstand, ist alles Weitere wertlos.
//
// Die Zahlen stehen hier **als Text aus der Spec** (M29.1, M29.6, M29.10) und sind nicht aus
// dem Ergebnis des Skripts abgeleitet.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';

import {
  ZUORDNUNG, AUSGANG, ZIEL, ergaenze, plane, beweise, pruefeZiel, vergleiche,
} from '../../scripts/gelaendekarten-zuordnung.mjs';
import { berichtige } from '../../scripts/szenariodaten-berichtigung.mjs';
import { terrainName } from '../../scripts/szenariodaten-grundspiel.mjs';
import { validateScenarioData } from '../../shared/scenarioData.js';

const fx = JSON.parse(fs.readFileSync(new URL('./fixtures/auslagen-kurzpartie.json', import.meta.url), 'utf8'));
const { assets, cards, grids } = fx;
const env = { assets, cards, grids };
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const copy = (x) => JSON.parse(JSON.stringify(x));
const text = (x) => JSON.stringify(x);

const ausgang = berichtige(fx.scenarioBefore).next;
const ziel = ergaenze(ausgang);

// M29.6: sha256 des kompakten Textes, 12 Stellen — alle 20 Einträge, alle gleich.
const EINTRAEGE_SHA = {
  'Deputy Waggums': '1fb204d54257', 'Virginia Fitz': '0e8f97427d33', 'The Bundits': '909beab802e5',
  'Red Atrocious': 'dfc3c087210f', 'Tilda Fields': 'e5a9e2eeaa7f', 'Ernie Offal': '26f455032580',
  'Barry Bluff': 'ebeedd302fda', 'Tartar Fishboy': '93902e65bcb8', 'Ms. Falls & Co.': '80a78f3a8e4d',
  'Patches': '931d0547a617', 'The Door Knockers': 'e7ea86b2cdb1', 'Bort Dovis': '5ef877d75e05',
  'Handsy': '4fc6177a6bf6', 'Lawman Dozy': '355edd78fc78', 'Penny Pinchetti': '415789baf76e',
  'Pepin Milkfrog': 'cd7a7c5dcde8', 'Qing & Kween': 'cc8f1f845834', 'Samuel Strawman': '1d15be2b81e4',
  'Umbrello': 'c18f8eb1bc25', 'Will Barlow': 'df21cf20aa52',
};
const TABELLE_TEXT = '{"Dichter Wald 2":"Dichter Wald","Sprengstoff":"Sprengstoff & Auslöser","Auslöser":"Sprengstoff & Auslöser"}';

// ── 1. Der Ausgang ───────────────────────────────────────────────────────────

test('DM: die Fixture IST der Ausgangsstand — bosses 15 567 Zeichen (f6c1d5f585c0), 20 Einträge mit ihren Hashes', () => {
  const t = text(ausgang.bosses);
  assert.equal(t.length, 15567);
  assert.equal(sha(t), 'f6c1d5f585c0');
  assert.deepEqual(Object.keys(ausgang.bosses), Object.keys(EINTRAEGE_SHA));
  for (const [name, h] of Object.entries(EINTRAEGE_SHA)) assert.equal(sha(text(ausgang.bosses[name])), h, name);
  assert.equal('terrainCards' in ausgang, false);
});

// ── 2. Die Tabelle ───────────────────────────────────────────────────────────

test('DM: die Tabelle ist genau der Text aus M29.6 — 108 Zeichen, aad39d745984, NFC', () => {
  const t = text(ZUORDNUNG);
  assert.equal(t, TABELLE_TEXT);
  assert.equal(t.length, 108);
  assert.equal(sha(t), 'aad39d745984');
  assert.equal(t.normalize('NFC'), t, 'norm normalisiert nicht: ein Trema aus zwei Zeichen träfe still nichts');
  assert.equal(Object.keys(ZUORDNUNG).join('|'), 'Dichter Wald 2|Sprengstoff|Auslöser', 'Reihenfolge ist Teil des Hashes');
});

test('DM: jedes Ziel ist genau eine Karte der Fixture, jeder Schlüssel genau ein Asset der Fixture', () => {
  for (const [key, target] of Object.entries(ZUORDNUNG)) {
    assert.equal(assets.filter(a => a.name === key).length, 1, `Asset „${key}“`);
    assert.equal(cards.filter(c => c.name === target).length, 1, `Karte „${target}“`);
  }
});

// ── 3. ergaenze: nur hinten anhängen ─────────────────────────────────────────

test('DM: ergaenze hängt terrainCards hinten an und ändert nichts anderes', () => {
  const vor = text(ausgang);
  const z = ergaenze(ausgang);

  assert.equal(text(ausgang), vor, 'die Eingabe wird nicht verändert');
  assert.deepEqual(Object.keys(z), [...Object.keys(ausgang), 'terrainCards']);
  assert.equal(text(z.terrainCards), TABELLE_TEXT);
  for (const k of Object.keys(ausgang)) assert.equal(text(z[k]), text(ausgang[k]), k);
  for (const [name, h] of Object.entries(EINTRAEGE_SHA)) assert.equal(sha(text(z.bosses[name])), h, name);
  assert.notEqual(z.terrainCards, ZUORDNUNG, 'eine Kopie, nicht das Original (ein Schreiber darf die Konstante nicht verändern)');
});

test('DM: Präfixbeweis und Rückwärtsbeweis — das Fragment ist `,"terrainCards":…` (124 Zeichen) vor der letzten `}`', () => {
  const alt = text(ausgang), neu = text(ziel);
  assert.equal(neu, `${alt.slice(0, -1)},"terrainCards":${TABELLE_TEXT}}`, 'Präfix');
  assert.equal(neu.length - alt.length, 124);
  const fragment = `,"terrainCards":${TABELLE_TEXT}`;
  assert.equal(fragment.length, 124);
  assert.equal(neu.replace(fragment, ''), alt, 'Rückwärts');
  assert.deepEqual(beweise(ausgang, ziel), []);
});

test('DM: ein geändertes Zeichen in einem Eintrag lässt beide Beweise anschlagen', () => {
  const x = copy(ziel);
  x.bosses['Handsy'].scenario += '!';
  const b = beweise(ausgang, x);
  assert.ok(b.some(m => /^Präfixbeweis/.test(m)), b.join('\n'));
  assert.ok(b.some(m => /^Rückwärtsbeweis/.test(m)), b.join('\n'));
  // Auch ein geänderter Schlüssel außerhalb von bosses, und eine andere Tabelle.
  const y = copy(ziel);
  y.gridLabel += 'x';
  assert.ok(beweise(ausgang, y).length >= 2);
  const z = copy(ziel);
  z.terrainCards.Sprengstoff = 'Etwas anderes';
  assert.ok(beweise(ausgang, z).length >= 1);
});

test('DM: ergaenze überschreibt nie — eine vorhandene Tabelle ist ein Fehler', () => {
  assert.throws(() => ergaenze(ziel), /terrainCards/);
});

// ── 4. Einordnung ────────────────────────────────────────────────────────────

test('DM: plane — Stand ohne Tabelle ist zu schreiben, und next ist der Zielstand', () => {
  const p = plane(ausgang);
  assert.equal(p.art, 'zu-schreiben');
  assert.equal(text(p.next), text(ziel));
});

test('DM: plane — eine gleiche Tabelle ist schon da, gleich was der Rest sagt; next ist die Eingabe', () => {
  assert.equal(plane(ziel).art, 'schon-da');
  assert.equal(plane(ziel).next, ziel);
  const weiter = copy(ziel);
  weiter.bosses['Handsy'].scenario += ' (weiterbearbeitet)';
  weiter.options = { partie: 1 };
  const p = plane(weiter);
  assert.equal(p.art, 'schon-da');
  assert.equal(p.next, weiter);
});

test('DM: plane — eine andere Tabelle ist abweichend, die Meldung nennt beide Texte, next fehlt', () => {
  const varianten = {
    'ein Paar fehlt': { 'Dichter Wald 2': 'Dichter Wald', Sprengstoff: 'Sprengstoff & Auslöser' },
    'ein Paar mehr': { ...ZUORDNUNG, 'Holzzaun 2': 'Holzzaun' },
    'andere Reihenfolge': { Auslöser: 'Sprengstoff & Auslöser', Sprengstoff: 'Sprengstoff & Auslöser', 'Dichter Wald 2': 'Dichter Wald' },
    'anderes Ziel': { ...ZUORDNUNG, Sprengstoff: 'Auslöser' },
    'kein Objekt': ['x'],
    'leer': {},
  };
  for (const [wie, tabelle] of Object.entries(varianten)) {
    const p = plane({ ...copy(ausgang), terrainCards: tabelle });
    assert.equal(p.art, 'abweichend', wie);
    assert.equal(p.next, undefined, wie);
    assert.ok(p.meldung.includes(text(tabelle)) && p.meldung.includes(TABELLE_TEXT), `${wie}: ${p.meldung}`);
  }
});

test('DM: plane — bosses nicht der Ausgang: abweichend, die Meldung nennt den Eintrag', () => {
  const x = copy(ausgang);
  x.bosses['Qing & Kween'].terrain[0].cells[0] = 'A1';
  const p = plane(x);
  assert.equal(p.art, 'abweichend');
  assert.equal(p.next, undefined);
  assert.match(p.meldung, /Qing & Kween/);
  assert.doesNotMatch(p.meldung, /Handsy/, 'nur der geänderte Eintrag wird genannt');

  const fehlt = copy(ausgang);
  delete fehlt.bosses['Handsy'];
  assert.match(plane(fehlt).meldung, /Handsy/);
  const mehr = { ...copy(ausgang) };
  mehr.bosses['Neuer Bösewicht'] = { terrain: [] };
  assert.equal(plane(mehr).art, 'abweichend');
  assert.equal(plane({ gridLabel: 'x' }).art, 'abweichend', 'kein bosses: kein Wurf');

  // Dieselben Einträge in anderer Reihenfolge sind nicht der Ausgang (der Text hat einen anderen Hash).
  const [erster, ...rest] = Object.entries(ausgang.bosses);
  const vertauscht = { ...copy(ausgang), bosses: Object.fromEntries([...rest, erster]) };
  assert.match(plane(vertauscht).meldung, /Reihenfolge/);
});

// ── 5. Prüfer ────────────────────────────────────────────────────────────────

// Die drei 6-%-Meldungen (Milchkannen) und die Matschpfütze zeigen sich nur mit Bildmaßen (M28).
const imageSizes = {
  'Flut / Matschpfuetze': { width: 560, height: 1000 },
  'Versteckter Bürger (Soßenflasche) / Große Milchkanne': { width: 940, height: 1000 },
  'Versteckter Bürger (blond) / Große Milchkanne': { width: 950, height: 1000 },
};

test('DM: pruefeZiel — 0 Probleme, nur bekannte Seitenverhältnisse, 40 Läufe sauber', () => {
  const p = pruefeZiel(ziel, { ...env, imageSizes });
  assert.deepEqual(p.probleme, []);
  assert.deepEqual(p.beanstandungen, []);
  assert.deepEqual(p.aspekt.map(m => `${m.boss}|${m.cell}`).sort(), ['Handsy|M12', 'Handsy|M9', 'Ms. Falls & Co.|H8:J12', 'Pepin Milkfrog|S9']);
  assert.equal(p.laeufe.length, 40);
  assert.deepEqual([...new Set(p.laeufe.map(l => l.boss))], Object.keys(EINTRAEGE_SHA));
  for (const l of p.laeufe) assert.equal(l.tokens, l.erwartet, `${l.boss} ${l.final ? 'Endkampf' : 'Kampf'}`);
  const skipped = p.laeufe.flatMap(l => l.log.filter(e => e.status === 'skipped' || e.status === 'failed').map(e => `${l.boss}: ${e.reason}`));
  // Zwei gewollte Fehlschläge, vorher wie nachher: Tildas fehlender `$SHERIFF` und Handsys doppelte
  // TRILLERPFEIFE (`durchrechnen` ruft `place_card` ohne Kategorie auf) — M29-Abweichung Nr. 21.
  assert.deepEqual(skipped.map(x => x.split(':')[0]).sort(), ['Handsy', 'Tilda Fields']);
  assert.ok(skipped.every(s => /^Tilda Fields: .*\$SHERIFF is not bound/.test(s) || /^Handsy: .*"TRILLERPFEIFE" matches 2 cards/.test(s)), skipped.join('\n'));
});

test('DM: pruefeZiel meldet, wenn die Tabelle ins Leere zeigt — der Prüfer ist die Wache', () => {
  const x = copy(ziel);
  x.terrainCards.Sprengstoff = 'Gibt es nicht';
  const p = pruefeZiel(x, env);
  assert.ok(p.beanstandungen.some(b => /validateScenarioData.*Sprengstoff.*Gibt es nicht/.test(b)), p.beanstandungen.join('\n'));
});

// ── 6. Die Umfangstabelle (M29.1) ────────────────────────────────────────────

// Je Lauf, der sich ändert: Namen ohne Karte vorher → nachher, Status vorher → nachher.
// (Aus M29.1; „Karten“ steht je Bösewicht darunter.) Läufe, die nicht hier stehen, ändern sich nicht.
const DREI = ['Dichter Wald 2', 'Auslöser', 'Sprengstoff'];
const GRAB = ['0', '6', '10', '14', '30'].map(n => `Grabhügel / Grabhügel ausgehoben (${n})`);
const BUERGER = ['Katze', 'Dörflerin', 'Soßenflasche', 'Dörfler', 'blond'].map(n => `Versteckter Bürger (${n}) / Große Milchkanne`);
const UMFANG = {
  'Virginia Fitz|K': [DREI, [], 'note', 'ok'],
  'Virginia Fitz|E': [[...DREI, ...GRAB], GRAB, 'note', 'note'],
  'Red Atrocious|K': [DREI, [], 'note', 'ok'],
  'Red Atrocious|E': [DREI, [], 'note', 'ok'],
  'Barry Bluff|K': [['Auslöser', 'Sprengstoff'], [], 'note', 'ok'],
  'Barry Bluff|E': [['Auslöser', 'Sprengstoff'], [], 'note', 'ok'],
  'The Door Knockers|K': [['Dichter Wald 2'], [], 'note', 'ok'],
  'The Door Knockers|E': [['Dichter Wald 2'], [], 'note', 'ok'],
  'Handsy|K': [DREI, [], 'note', 'ok'],
  'Handsy|E': [[...DREI, ...BUERGER], BUERGER, 'note', 'note'],
  'Lawman Dozy|K': [['Dichter Wald 2'], [], 'note', 'ok'],
  'Lawman Dozy|E': [['Dichter Wald 2'], [], 'note', 'ok'],
  'Qing & Kween|K': [['Dichter Wald 2'], [], 'note', 'ok'],
  'Qing & Kween|E': [['Dichter Wald 2'], [], 'note', 'ok'],
  'Umbrello|K': [['Auslöser', 'Sprengstoff'], [], 'note', 'ok'],
  'Umbrello|E': [['Auslöser', 'Sprengstoff', 'Verschlingende Welle'], ['Verschlingende Welle'], 'note', 'note'],
};
// Zuwachs der Geländekarten je Bösewicht (Kampf wie Endkampf).
const ZUWACHS = {
  'Virginia Fitz': 1, 'Red Atrocious': 1, 'Barry Bluff': 1, 'Lawman Dozy': 1, 'Umbrello': 1,
  'Handsy': 2, 'The Door Knockers': 0, 'Qing & Kween': 0,
};

// Die Namen ohne Karte, die nach der Zuordnung bleiben (M29.10): 14 Plättchenarten, 18 Nennungen, acht Endkämpfe.
const BUNDO = 'Die Bundo-Königin / Beruhigungs-Leckerli';
const BLEIBT = {
  'Deputy Waggums|E': [BUNDO],
  'Virginia Fitz|E': GRAB,
  'The Bundits|E': [BUNDO],
  'Tilda Fields|E': ['Pile of Locals'],
  'Handsy|E': BUERGER,
  'Pepin Milkfrog|E': ['Katze', 'Dörflerin', 'Soßenflasche'].map(n => `Versteckter Bürger (${n}) / Große Milchkanne`),
  'Samuel Strawman|E': ['Ritualzeichen / Weizenfeld'],
  'Umbrello|E': ['Verschlingende Welle'],
};

const v = vergleiche(ausgang, ziel, env);
const zeile = (boss, final) => v.zeilen.find(z => z.boss === boss && z.final === final);
const sortiert = (a) => [...a].sort((x, y) => x.localeCompare(y, 'de'));

test('DM: M29.1 — 40 Läufe, Zeile für Zeile: Namen ohne Karte, build_scenario, Zuwachs', () => {
  assert.equal(v.zeilen.length, 40);
  for (const z of v.zeilen) {
    const erwartet = UMFANG[`${z.boss}|${z.final ? 'E' : 'K'}`];
    const wo = `${z.boss} ${z.final ? 'Endkampf' : 'Kampf'}`;
    if (erwartet) {
      assert.deepEqual([sortiert(z.vorher.namen), sortiert(z.nachher.namen), z.vorher.status, z.nachher.status],
        [sortiert(erwartet[0]), sortiert(erwartet[1]), erwartet[2], erwartet[3]], wo);
    } else {
      assert.equal(z.vorher.status, z.nachher.status, wo);
      assert.deepEqual(z.vorher.namen, z.nachher.namen, wo);
      assert.equal(z.unveraendert, true, `${wo}: Meldung und Kartenreihe Zeichen für Zeichen dieselbe`);
    }
    assert.equal(z.nachher.karten.length - z.vorher.karten.length, ZUWACHS[z.boss] ?? 0, `${wo}: Zuwachs`);
  }
  assert.equal(v.zeilen.filter(z => z.unveraendert).length, 24, '24 von 40 Läufen sind Zeichen für Zeichen dieselben');
});

test('DM: M29.1 — die Summen: ok 19 → 32, note 21 → 8, Vorkämpfe mit note 8 → 0, Namensnennungen 50 → 18', () => {
  const s = v.summe;
  assert.deepEqual([s.ok.vorher, s.ok.nachher], [19, 32]);
  assert.deepEqual([s.note.vorher, s.note.nachher], [21, 8]);
  assert.deepEqual([s.vorkampfNote.vorher, s.vorkampfNote.nachher], [8, 0]);
  assert.deepEqual([s.namen.vorher, s.namen.nachher], [50, 18]);
  // Die 32, die verschwinden: 12 × Dichter Wald 2, 10 × Sprengstoff, 10 × Auslöser.
  assert.deepEqual(s.verschwunden, { 'Dichter Wald 2': 12, 'Sprengstoff': 10, 'Auslöser': 10 });
});

test('DM: M29.1 — monoton: jede vorher gelegte Karte liegt nachher, in gleicher Reihenfolge; Raster und übrige Zeilen gleich', () => {
  for (const z of v.zeilen) {
    const wo = `${z.boss} ${z.final ? 'Endkampf' : 'Kampf'}`;
    let i = 0;
    for (const k of z.nachher.karten) if (k === z.vorher.karten[i]) i++;
    assert.equal(i, z.vorher.karten.length, `${wo}: monoton`);
    assert.equal(z.nachher.tokens, z.vorher.tokens, `${wo}: Objekte auf dem Raster`);
    assert.equal(z.restGleich, true, `${wo}: übrige Protokollzeilen`);
  }
});

test('DM: M29.1 — die größte Auslage bleibt 7 Geländekarten, kein Platzmangel', () => {
  const gelaende = (z) => z.nachher.karten.filter(k => k !== 'Sheriff' && !/sheriff/i.test(k)).length;
  const max = Math.max(...v.zeilen.filter(z => !z.final).map(gelaende));
  assert.equal(max, 7);
});

// ── 7. Was nachher noch fehlt ────────────────────────────────────────────────

test('DM: M29.10 — nachher fehlen genau die 18 Nennungen in acht Endkämpfen, in keinem Vorkampf', () => {
  const bleibt = Object.fromEntries(v.zeilen.filter(z => z.nachher.namen.length)
    .map(z => [`${z.boss}|${z.final ? 'E' : 'K'}`, z.nachher.namen]));
  assert.deepEqual(Object.keys(bleibt).sort(), Object.keys(BLEIBT).sort());
  for (const [k, namen] of Object.entries(BLEIBT)) assert.deepEqual(sortiert(bleibt[k]), sortiert(namen), k);
  assert.equal(Object.values(BLEIBT).flat().length, 18);
  assert.equal(new Set(Object.values(BLEIBT).flat()).size, 14, 'vierzehn Plättchenarten ohne Karte');
});

// ── 8. terrainName() und NFC ─────────────────────────────────────────────────

test('DM: terrainName() aus szenariodaten-grundspiel.mjs kennt dieselben drei Paare — die zweite Abbildung im Repo läuft nicht auseinander', () => {
  for (const [key, target] of Object.entries(ZUORDNUNG)) assert.equal(terrainName(key), target, key);
  // Und sie kennt mehr (Holzzaun 2): das ist der Grund, sie nicht zusammenzulegen.
  assert.equal(terrainName('Holzzaun 2'), 'Holzzaun');
  assert.equal(Object.hasOwn(ZUORDNUNG, 'Holzzaun 2'), false);
});

// ── 9. Konstanten ────────────────────────────────────────────────────────────

test('DM: AUSGANG und ZIEL stehen so im Baustein — M29.6 (rechnen kann sie nur die Produktion, DQ)', () => {
  assert.deepEqual(AUSGANG, { laenge: 18982, sha: '5eec10582ec8' });
  assert.deepEqual(ZIEL, { laenge: 19106, sha: '914461d63f77' });
  assert.equal(ZIEL.laenge - AUSGANG.laenge, 124, 'das Fragment');
  assert.equal(text(ziel).length - text(ausgang).length, ZIEL.laenge - AUSGANG.laenge, 'auch an der Fixture');
});

test('DM: der Prüfer des Bausteins ist validateScenarioData mit cards (eine Stelle je Regel)', () => {
  assert.deepEqual(validateScenarioData(ziel, { assets, grids, cards }), []);
});
