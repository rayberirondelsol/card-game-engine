// Die Szenariodaten der neun Grundspiel-Bösewichte, die zu `scenario_data`
// ergänzt werden (`scripts/szenariodaten-grundspiel.mjs`,
// `docs/szenariodaten-grundspiel.md`).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Geprüft wird, was der Baustein **verspricht**, nicht die Tableaus: dass die
// Daten durch `validateScenarioData` und `build_scenario` laufen, dass die
// Namenszuordnung über die Terrainlisten wirklich eindeutig ist, und vor
// allem, dass ein zweiter Lauf **nichts überschreibt** (M27: der alte
// `doerfler-daten.mjs --write` setzte seinen Abschnitt bedingungslos).
// Die Bibliothek ist synthetisch, aus den Namen der Einträge gebaut — der Test
// lädt nichts aus dem Netz und braucht keine Produktionsdatenbank.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ENTRIES, NEUN, DE_LISTEN, DE_NAME, TEXTBELEG, terrainName, terrainMenge, findeDeutschen, gleicheListen, beweiseNamen,
  patchScenario, beweiseUnveraendert, durchrechnen, erwartetAufRaster,
} from '../../scripts/szenariodaten-grundspiel.mjs';
import { validateScenarioData } from '../../shared/scenarioData.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const GRID = {
  id: 'gmain', label: 'Spielfeld A–S / 1–14', type: 'square',
  origin: { x: 321, y: 93 }, cell: 50, cols: 19, rows: 14,
  labels: { cols: 'alpha', rows: 'numeric' },
};

/** Die elf Einträge, die es in der Produktion schon gibt — Inhalt hier beliebig, nur Stand-ins. */
const ELF = ['Deputy Waggums', 'Virginia Fitz', 'The Bundits', 'Red Atrocious', 'Tilda Fields', 'Ernie Offal',
  'Barry Bluff', 'Tartar Fishboy', 'Ms. Falls & Co.', 'Patches', 'The Door Knockers'];

const vorhanden = () => ({
  gridLabel: GRID.label,
  bosses: Object.fromEntries(ELF.map(k => [k, {
    scenario: `Szenario ${k}`, terrain: [{ assetName: 'Dorfteich', cells: ['A1:E5'] }],
    fields: { B: 'J5:K6', D: ['A8', 'B8', 'C8'] }, stats: { BEW: 5, LEB: 15 },
  }])),
  cardZoneLabel: 'Terrain-Auslage',
  villagers: { fightZone: 'Bösewicht-Tableau', seats: [], roster: {} },
});

const allTerrain = (e) => [...(e.terrain ?? []), ...(e.final?.terrain ?? [])];
const alleNamen = [...new Set(NEUN.flatMap(k => allTerrain(ENTRIES[k]).map(t => t.assetName)))];

const asset = (name, back = false) => ({
  id: `a-${name}`, name, type: 'token', category: 'Gelände',
  image_path: `/uploads/x/${encodeURIComponent(name)}.png`,
  back_image_path: back ? `/uploads/x/${encodeURIComponent(name)}-back.png` : null,
  width: 50, height: 50,
});
const ASSETS = [
  // Plättchen mit Rückseite sind die, deren Name einen Schrägstrich trägt (wie in der Produktion).
  ...alleNamen.map(n => asset(n, n.includes(' / '))),
  ...NEUN.map(k => asset(`Bösewicht: ${k}`, true)),
  ...['Henlo Bulwark', 'Fridgette Jones', 'Granny Melba'].map(n => asset(n)),
];
const CARDS = NEUN.map((k, i) => ({
  id: `c${i}`, name: ENTRIES[k].final.stats.SHERIFF, category: 'Einzigartige Ausrüstung', image_path: `/uploads/c/${i}.png`,
}));

// ── Form ─────────────────────────────────────────────────────────────────────

test('es sind genau die neun, die in der Produktion fehlen — keine der elf vorhandenen', () => {
  assert.deepEqual([...NEUN].sort(), [
    'Bort Dovis', 'Handsy', 'Lawman Dozy', 'Penny Pinchetti', 'Pepin Milkfrog',
    'Qing & Kween', 'Samuel Strawman', 'Umbrello', 'Will Barlow',
  ].sort());
  for (const k of NEUN) assert.equal(ELF.includes(k), false, k);
});

test('jeder Eintrag hat Szenario, Gelände, Bösewicht, fünf Dörfler, Werte und die Sheriff-Karte', () => {
  for (const k of NEUN) {
    const e = ENTRIES[k];
    assert.ok(e.scenario, k);
    assert.ok(e.terrain.length >= 7, `${k}: Gelände`);
    assert.match(e.fields.B, /^[A-S]\d+:[A-S]\d+$/, `${k}: B ist ein 2×2-Bereich`);
    assert.equal(e.fields.D.length, 5, `${k}: fünf Dörferfelder`);
    assert.ok(Number.isInteger(e.stats.BEW) && Number.isInteger(e.stats.LEB), k);
    assert.ok(e.final?.stats?.SHERIFF, `${k}: SHERIFF`);
  }
});

test('Reihenfolge der Dörferfelder: zeilenweise (wie in den vorhandenen Einträgen)', () => {
  for (const k of NEUN) {
    const key = (c) => [Number(c.slice(1)), c.charCodeAt(0)];
    const sorted = [...ENTRIES[k].fields.D].sort((a, b) => key(a)[0] - key(b)[0] || key(a)[1] - key(b)[1]);
    assert.deepEqual(ENTRIES[k].fields.D, sorted, k);
  }
});

test('ein Endkampf-Gelände liegt nur auf EG-Feldern und nummeriert nach EG', () => {
  for (const k of NEUN) {
    const f = ENTRIES[k].final;
    if (!f.terrain) continue;
    const eg = f.fields.EG;
    f.terrain.forEach((t, i) => assert.equal(t.cells[0], eg[i], `${k}: Teil ${i + 1} auf EG${i + 1}`));
  }
});

test('validateScenarioData: 0 Probleme gegen Assetliste und 19×14-Raster', () => {
  const { next } = patchScenario(vorhanden());
  assert.deepEqual(validateScenarioData(next, { assets: ASSETS, grids: [GRID] }), []);
});

test('kein Feld liegt außerhalb des Rasters und keine Drehung ist unzulässig (der Validator sagt es sonst)', () => {
  // Gegenprobe, dass der Validator hier überhaupt anschlägt: ein Feld außerhalb.
  const kaputt = structuredClone(ENTRIES['Bort Dovis']);
  kaputt.terrain[0].cells = ['T1:U3'];
  const problems = validateScenarioData({ gridLabel: GRID.label, bosses: { x: kaputt } }, { assets: ASSETS, grids: [GRID] });
  assert.ok(problems.some(p => /no field/.test(p)), problems.join('; '));
});

// ── Namenszuordnung ──────────────────────────────────────────────────────────

test('die Zuordnung ist belegt: das Terrain deckt die behauptete deutsche Liste, und wo es zwei deckt, steht ein Textbeleg da', () => {
  assert.deepEqual(beweiseNamen(), []);
  for (const k of NEUN) assert.ok(findeDeutschen(ENTRIES[k]).includes(DE_NAME[k]), k);
  // Sieben der neun sind durch das Terrain **allein** eindeutig.
  const eindeutig = NEUN.filter(k => findeDeutschen(ENTRIES[k]).length === 1);
  assert.equal(eindeutig.length, 7);
  assert.deepEqual(NEUN.filter(k => !eindeutig.includes(k)).sort(), ['Bort Dovis', 'Lawman Dozy']);
});

test('genau ein Paar deutscher Listen ist gleich: Bert Doofis = Schnarchbert — dort entscheidet das Terrain nicht', () => {
  assert.deepEqual(gleicheListen(), [['Bert Doofis', 'Schnarchbert']]);
  // und es sind genau die zwei Tableaus, die dasselbe Terrain legen
  assert.deepEqual(findeDeutschen(ENTRIES['Bort Dovis']).sort(), ['Bert Doofis', 'Schnarchbert']);
  assert.deepEqual(findeDeutschen(ENTRIES['Lawman Dozy']).sort(), ['Bert Doofis', 'Schnarchbert']);
  assert.ok(TEXTBELEG['Bort Dovis'].length >= 2 && TEXTBELEG['Lawman Dozy'].length >= 2);
});

test('die zwölf deutschen Listen haben je sieben verschiedene Terrains', () => {
  assert.equal(Object.keys(DE_LISTEN).length, 12);
  for (const [name, liste] of Object.entries(DE_LISTEN)) assert.equal(new Set(liste).size, 7, name);
});

test('der Beweis schlägt an: falsche Behauptung, fehlender Textbeleg, doppelt vergebener Name', () => {
  // Handsys Terrain deckt Truthand — wer „Schnarchbert" behauptet, wird gemeldet.
  const falsch = { ...DE_NAME, Handsy: 'Schnarchbert' };
  assert.ok(beweiseNamen(ENTRIES, falsch).some(c => /Handsy: behauptet Schnarchbert/.test(c)));
  // Ohne Textbeleg ist das Paar Bort/Dozy nicht zu entscheiden.
  assert.ok(beweiseNamen(ENTRIES, DE_NAME, DE_LISTEN, {}).some(c => /Bort Dovis: .*ohne Textbeleg/.test(c)));
  // Beide dürfen nicht denselben Namen tragen.
  const doppelt = { ...DE_NAME, 'Lawman Dozy': 'Bert Doofis' };
  assert.ok(beweiseNamen(ENTRIES, doppelt).some(c => /„Bert Doofis" ist 2-mal vergeben/.test(c)));
});

test('terrainName legt Zweiseiter, Varianten und das geteilte Dynamit-Terrain zusammen', () => {
  assert.equal(terrainName('Dichter Wald 2'), 'Dichter Wald');
  assert.equal(terrainName('Holzzaun 2'), 'Holzzaun');
  assert.equal(terrainName('Sprengstoff'), 'Sprengstoff & Auslöser');
  assert.equal(terrainName('Auslöser'), 'Sprengstoff & Auslöser');
  assert.equal(terrainName('Marodes Farmhaus / Marodes Farmhaus (gedeckter Tisch)'), 'Marodes Farmhaus');
  assert.equal(terrainName(ENTRIES.Handsy.final.terrain[0].assetName), 'Versteckter Bürger (Katze)');
});

test('das Hauptgelände jedes Eintrags hat genau sieben verschiedene Terrainnamen', () => {
  for (const k of NEUN) assert.equal(terrainMenge(ENTRIES[k]).length, 7, k);
});

// ── Der zweite Lauf überschreibt nichts ──────────────────────────────────────

test('patchScenario ergänzt die neun hinter die elf — und lässt den alten Text als Präfix stehen', () => {
  const before = vorhanden();
  const { next, hinzu, schonDa, abweichend } = patchScenario(before);
  assert.equal(hinzu.length, 9);
  assert.deepEqual([schonDa, abweichend], [[], []]);
  assert.deepEqual(Object.keys(next.bosses), [...ELF, ...NEUN]);
  assert.deepEqual(beweiseUnveraendert(before, next), []);
  // byteweise
  assert.ok(JSON.stringify(next.bosses).startsWith(JSON.stringify(before.bosses).slice(0, -1)));
});

test('ein zweiter Lauf ändert nichts: alle neun schon da und gleich', () => {
  const einmal = patchScenario(vorhanden()).next;
  const zweimal = patchScenario(einmal);
  assert.deepEqual(zweimal.hinzu, []);
  assert.equal(zweimal.schonDa.length, 9);
  assert.equal(JSON.stringify(zweimal.next), JSON.stringify(einmal));
});

test('ein zweiter Lauf überschreibt **keine** abweichende Arbeit — er meldet sie', () => {
  const einmal = patchScenario(vorhanden()).next;
  // Jemand hat Handsy inzwischen von Hand verbessert.
  einmal.bosses.Handsy = { ...einmal.bosses.Handsy, stats: { BEW: 8, LEB: 14 } };
  const zweimal = patchScenario(einmal);
  assert.deepEqual(zweimal.abweichend, ['Handsy']);
  assert.deepEqual(zweimal.next.bosses.Handsy.stats, { BEW: 8, LEB: 14 }, 'die Handarbeit bleibt');
});

test('der Unverändert-Beweis schlägt an, wenn ein vorhandener Eintrag oder ein anderer Schlüssel sich ändert', () => {
  const before = vorhanden();
  const next = patchScenario(before).next;
  next.bosses['The Bundits'] = { ...next.bosses['The Bundits'], scenario: 'anders' };
  assert.ok(beweiseUnveraendert(before, next).some(c => /Eintrag „The Bundits" hat sich geändert/.test(c)));

  const next2 = patchScenario(before).next;
  next2.villagers = { ...next2.villagers, fightZone: 'woanders' };
  assert.ok(beweiseUnveraendert(before, next2).some(c => /Schlüssel „villagers" hat sich geändert/.test(c)));
});

test('patchScenario fasst scenario_data ohne bosses an, ohne zu werfen', () => {
  const { next, hinzu } = patchScenario({ gridLabel: GRID.label });
  assert.equal(hinzu.length, 9);
  assert.equal(next.gridLabel, GRID.label);
});

// ── Durchgerechnet mit dem echten Executor ───────────────────────────────────

for (const k of NEUN) {
  test(`${k}: build_scenario legt Gelände, Bösewicht und drei Dörfler — im Vor- und im Endkampf`, () => {
    const { next } = patchScenario(vorhanden());
    const ctx = { assets: ASSETS, cards: CARDS, grids: [GRID], scenarioData: next };
    for (const final of [false, true]) {
      const r = durchrechnen(k, ctx, final);
      const bad = r.log.filter(l => l.status === 'failed' || l.status === 'skipped');
      assert.deepEqual(bad, [], `${k} ${final ? 'Endkampf' : 'Kampf'}: ${JSON.stringify(bad)}`);
      assert.equal(r.tokensAufRaster, erwartetAufRaster(next.bosses[k], final), `${k} ${final ? 'Endkampf' : 'Kampf'}: Objekte auf dem Raster`);
      // Die Sheriff-Karte liegt nur im Endkampf.
      assert.deepEqual(r.karten, final ? [ENTRIES[k].final.stats.SHERIFF] : [], k);
    }
  });
}

test('Pepin und Samuel legen ihre Endkampf-Teile **verdeckt** (Rückseite = Milchkanne / Weizenfeld)', () => {
  const { next } = patchScenario(vorhanden());
  for (const k of ['Pepin Milkfrog', 'Samuel Strawman']) {
    const t = ENTRIES[k].final.terrain;
    assert.equal(t.length, 3, k);
    assert.ok(t.every(x => x.faceDown === true), k);
    assert.ok(t.every(x => ASSETS.find(a => a.name === x.assetName).back_image_path), `${k}: Rückseite vorhanden`);
  }
  assert.ok(next.bosses.Handsy.final.terrain.every(x => !x.faceDown), 'Handsys Bürger liegen offen');
});
