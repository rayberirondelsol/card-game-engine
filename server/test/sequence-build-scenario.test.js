// Tests for `build_scenario` (M7, T6): ein Schritt baut das Szenario des
// zuletzt aufgedeckten Bösewichts auf.
//
// Zwei Dinge stehen hier im Mittelpunkt, weil sie die teuren Fehler sind:
//
// 1. **Je Feld ein eigenes Objekt.** `place_asset` verschiebt ein vorhandenes
//    Objekt - drei gleiche Geländeplättchen auf drei Feldern wären damit eines,
//    das zweimal umzieht. Genau deshalb gibt es diesen Schritt.
// 2. **Erst prüfen, dann legen.** Eine einzige falsche Feldangabe lässt den
//    ganzen Schritt scheitern, *bevor* das erste Objekt liegt. Ein halb
//    gestelltes Kampffeld ist schlimmer als ein leeres: das leere sieht man.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');
const { STEP_TYPES, stepFields, defaultStep, describeStep, validateStep } =
  await import('../../client/src/utils/sequenceSteps.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BOSS_BACK = '/uploads/tokens/boss-back.png';
const BOSSES = ['Klaus', 'Bertha', 'Grimm'];
const TERRAIN = ['Fetid Furball', 'Wheat Field', 'Giant Milk Jug'];
const TIERS = ['CHUMP', 'HOOLIGAN', 'TROUBLEMAKER', 'FINAL FIGHT'];

function assetFixture() {
  return [
    ...BOSSES.map((n, i) => ({
      id: `boss-${i}`, name: `Bösewicht: ${n}`, type: 'token', category: 'Bösewichte',
      image_path: `/uploads/tokens/boss-${i}.png`, back_image_path: BOSS_BACK, width: 60, height: 60,
    })),
    ...TERRAIN.map((name, i) => ({
      id: `tile-${i}`, name, type: 'token', category: 'Gelände',
      image_path: `/uploads/tokens/tile-${i}.png`, back_image_path: null, width: 60, height: 60,
    })),
    {
      id: 'granny', name: 'Figur: Granny', type: 'token', category: 'Dörfler',
      image_path: '/uploads/tokens/granny.png', back_image_path: null, width: 40, height: 40,
    },
    // Der offene Kurzpartie-Marker auf Platz 1.
    {
      id: 'marker', name: 'Kurzpartie', type: 'token', category: 'Sonder',
      image_path: '/uploads/tokens/marker.png', back_image_path: BOSS_BACK, width: 60, height: 60,
    },
  ];
}

/** 10x10 ab (0,0), Buchstaben quer, Zahlen runter - C7 ist Spalte 2, Zeile 6. */
const GRIDS = [{
  id: 'g1', label: 'Kampffeld', type: 'square',
  origin: { x: 0, y: 0 }, cell: 60, cols: 10, rows: 10,
  labels: { cols: 'alpha', rows: 'numeric' },
}];

/** Mitte von C7: (2.5*60, 6.5*60). */
const center = (col, row) => ({ x: (col + 0.5) * 60, y: (row + 0.5) * 60 });

const ZONES = [{
  id: 'z1', label: 'Stufenleiste', x: 1000, y: 100, width: 400, height: 80,
  accepts: ['asset'], capacity: 4, layout: 'row', slotLabels: TIERS,
}];

/**
 * Die Kurzpartie: der Marker liegt **offen** auf Platz 1, dahinter drei
 * verdeckte Bösewichte. Platz 4 bleibt der letzte, auch mit nur drei Bossen -
 * das ist der Fall, in dem eine aus der Rundenzahl abgeleitete Stufe still um
 * eins daneben läge.
 */
function shortGameBar() {
  return executeSequence(
    emptyState(),
    [
      { type: 'place_asset', assetName: 'Kurzpartie', targetZoneLabel: 'Stufenleiste', faceDown: false },
      ...BOSSES.map(n => ({ type: 'place_asset', assetName: `Bösewicht: ${n}`, targetZoneLabel: 'Stufenleiste', faceDown: true })),
    ],
    ZONES,
    opts()
  );
}

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [] });

/**
 * Ein Szenario für Klaus: dreimal dasselbe Plättchen auf drei Feldern, ein
 * zweites auf einem vierten, benannte Felder für Bösewicht und Dörfler - und
 * ein additiver Endkampf-Abschnitt.
 */
function scenarioFixture(over = {}) {
  return {
    gridLabel: 'Kampffeld',
    bosses: {
      Klaus: {
        scenario: "Meal Time's Over",
        terrain: [
          { assetName: 'Fetid Furball', cells: ['C7', 'D7', 'H9'] },
          { assetName: 'Wheat Field', cells: ['E4'] },
        ],
        fields: { B: 'J5', D: ['A1', 'B3', 'C4', 'D6', 'E9'] },
        final: {
          terrain: [{ assetName: 'Giant Milk Jug', cells: ['I2', 'I3'] }],
          fields: { FF: ['I2', 'I3', 'J2', 'J3', 'H2'] },
        },
        ...over,
      },
    },
  };
}

const opts = (scenarioData = scenarioFixture()) => ({ assets: assetFixture(), grids: GRIDS, scenarioData });

const REVEAL = { type: 'reveal_next', zoneLabel: 'Stufenleiste' };
const BUILD = { type: 'build_scenario', final: 'auto' };

/** Alle Objekte, die dieses Asset tragen - der Kern von „je Feld ein Objekt". */
const tilesNamed = (state, name) => state.tokens.filter(t => t.label === name);
const cellsOf = (state, name) => tilesNamed(state, name).map(t => t.cell).sort();
const statuses = (log) => log.map(e => e.status);
const reasons = (log) => log.map(e => e.reason).join(' | ');

// ── Aufbau ───────────────────────────────────────────────────────────────────

test('build_scenario legt je Feld ein eigenes Objekt, nicht eines, das umzieht', () => {
  const { state, log } = executeSequenceWithLog(shortGameBar(), [REVEAL, BUILD], ZONES, opts());

  assert.deepEqual(statuses(log), ['ok', 'ok'], reasons(log));

  const furballs = tilesNamed(state, 'Fetid Furball');
  assert.equal(furballs.length, 3, 'drei Felder sind drei Plättchen');
  assert.equal(new Set(furballs.map(t => t.id)).size, 3, 'drei eigene Objekte, nicht dreimal dasselbe');
  assert.deepEqual(cellsOf(state, 'Fetid Furball'), ['C7', 'D7', 'H9']);

  // Jedes auf seiner Feldmitte, jedes mit gridId und cell - sonst zieht
  // `placeOnGrids` es beim nächsten Laden auf ein altes Feld zurück (M3b).
  const c7 = furballs.find(t => t.cell === 'C7');
  assert.deepEqual({ x: c7.x, y: c7.y }, center(2, 6));
  assert.equal(c7.gridId, 'g1');
  for (const t of furballs) assert.equal(t.gridId, 'g1');

  const wheat = tilesNamed(state, 'Wheat Field');
  assert.equal(wheat.length, 1);
  assert.deepEqual({ x: wheat[0].x, y: wheat[0].y }, center(4, 3));

  // Platz 2 von vier ist nicht der Endkampf: der untere Abschnitt bleibt weg.
  assert.equal(tilesNamed(state, 'Giant Milk Jug').length, 0);
});

test('build_scenario bindet die benannten Felder für die folgenden Schritte', () => {
  const { state, log, bindings } = executeSequenceWithLog(
    shortGameBar(),
    [
      REVEAL,
      BUILD,
      { type: 'place_asset', assetName: '$revealed', gridLabel: 'Kampffeld', cell: '$B' },
      { type: 'place_asset', assetName: 'Figur: Granny', gridLabel: 'Kampffeld', cell: '$D2' },
    ],
    ZONES,
    opts()
  );

  assert.deepEqual(statuses(log), ['ok', 'ok', 'ok', 'ok'], reasons(log));
  assert.equal(bindings.B, 'J5');
  assert.deepEqual([bindings.D1, bindings.D2, bindings.D5], ['A1', 'B3', 'E9']);

  const boss = state.tokens.find(t => t.label === 'Bösewicht: Klaus');
  assert.equal(boss.cell, 'J5', '$B ist das B-Feld');
  assert.deepEqual({ x: boss.x, y: boss.y }, center(9, 4));

  const granny = state.tokens.find(t => t.label === 'Figur: Granny');
  assert.equal(granny.cell, 'B3', '$D2 ist das *zweite* D-Feld');
});

// ── Der Endkampf ─────────────────────────────────────────────────────────────

test('final "auto" nimmt den Endkampf-Abschnitt genau vom letzten Platz der Leiste dazu', () => {
  // Zweimal aufdecken: Platz 3 von vier - noch nicht der Endkampf, obwohl nur
  // drei Bösewichte in der Leiste lagen. Das ist unsere Kurzvariante.
  const middle = executeSequenceWithLog(shortGameBar(), [REVEAL, REVEAL, BUILD], ZONES, opts({
    ...scenarioFixture(), bosses: { ...scenarioFixture().bosses, Bertha: scenarioFixture().bosses.Klaus },
  }));
  assert.deepEqual(statuses(middle.log), ['ok', 'ok', 'ok'], reasons(middle.log));
  assert.equal(tilesNamed(middle.state, 'Giant Milk Jug').length, 0, 'Platz 3 von vier ist kein Endkampf');
  assert.equal(middle.bindings.FF1, undefined, 'ohne Endkampf keine FF-Bindung');

  // Dreimal: der dritte Bösewicht steht auf Platz 4, dem letzten der Zone.
  const last = executeSequenceWithLog(shortGameBar(), [REVEAL, REVEAL, REVEAL, BUILD], ZONES, opts({
    gridLabel: 'Kampffeld', bosses: { Grimm: scenarioFixture().bosses.Klaus },
  }));
  assert.deepEqual(statuses(last.log), ['ok', 'ok', 'ok', 'ok'], reasons(last.log));
  assert.deepEqual(cellsOf(last.state, 'Giant Milk Jug'), ['I2', 'I3'], 'der untere Abschnitt kommt dazu');
  assert.deepEqual(cellsOf(last.state, 'Fetid Furball'), ['C7', 'D7', 'H9'], 'und ersetzt den regulären nicht');
  assert.deepEqual(
    [last.bindings.FF1, last.bindings.FF5, last.bindings.B],
    ['I2', 'H2', 'J5'],
    'die Endkampf-Felder kommen dazu, die regulären bleiben'
  );
});

test('final true und false überstimmen die Automatik', () => {
  const forced = executeSequenceWithLog(
    shortGameBar(), [REVEAL, { type: 'build_scenario', final: true }], ZONES, opts()
  );
  assert.deepEqual(statuses(forced.log), ['ok', 'ok'], reasons(forced.log));
  assert.deepEqual(cellsOf(forced.state, 'Giant Milk Jug'), ['I2', 'I3'], 'Platz 2, aber final: true');

  const suppressed = executeSequenceWithLog(
    shortGameBar(), [REVEAL, REVEAL, REVEAL, { type: 'build_scenario', final: false }], ZONES,
    opts({ gridLabel: 'Kampffeld', bosses: { Grimm: scenarioFixture().bosses.Klaus } })
  );
  assert.deepEqual(statuses(suppressed.log), ['ok', 'ok', 'ok', 'ok'], reasons(suppressed.log));
  assert.equal(tilesNamed(suppressed.state, 'Giant Milk Jug').length, 0, 'letzter Platz, aber final: false');
});

test('final überschreibt gleichnamige Felder des regulären Abschnitts', () => {
  const scenario = {
    gridLabel: 'Kampffeld',
    bosses: {
      Grimm: {
        terrain: [{ assetName: 'Fetid Furball', cells: ['C7'] }],
        fields: { B: 'J5' },
        final: { fields: { B: 'A10' } },
      },
    },
  };
  const { bindings, log } = executeSequenceWithLog(
    shortGameBar(), [REVEAL, REVEAL, REVEAL, BUILD], ZONES, opts(scenario)
  );
  assert.deepEqual(statuses(log), ['ok', 'ok', 'ok', 'ok'], reasons(log));
  assert.equal(bindings.B, 'A10', 'beim Endkampf gewinnt final');
});

// ── Sinnvoll scheitern statt halb aufbauen ───────────────────────────────────

test('ohne vorheriges reveal_next wird der Schritt übersprungen', () => {
  const before = shortGameBar();
  const { state, log } = executeSequenceWithLog(before, [BUILD], ZONES, opts());

  assert.deepEqual(statuses(log), ['skipped']);
  assert.match(log[0].reason, /revealedBase/);
  assert.deepEqual(state.tokens.length, before.tokens.length, 'nichts gelegt');
});

test('ein Bösewicht ohne Eintrag wird übersprungen und im Protokoll genannt', () => {
  const start = shortGameBar();
  const { state, log } = executeSequenceWithLog(
    start, [REVEAL, BUILD], ZONES, opts({ gridLabel: 'Kampffeld', bosses: { Bertha: scenarioFixture().bosses.Klaus } })
  );

  assert.deepEqual(statuses(log), ['ok', 'skipped'], reasons(log));
  assert.match(log[1].reason, /Klaus/, 'das Protokoll nennt den Bösewicht');

  // Zustand unverändert bis auf das Aufdecken selbst: kein Plättchen liegt.
  const revealed = executeSequence(start, [REVEAL], ZONES, opts());
  assert.deepEqual(state, revealed);
});

test('ein Feld außerhalb des Rasters lässt den ganzen Schritt scheitern, bevor das erste Objekt liegt', () => {
  const broken = scenarioFixture();
  // Das *letzte* der drei Furball-Felder ist falsch: ein Schritt, der erst legt
  // und dann prüft, hätte hier schon zwei Plättchen auf dem Tisch.
  broken.bosses.Klaus.terrain[0].cells = ['C7', 'D7', 'Z99'];

  const start = shortGameBar();
  const { state, log } = executeSequenceWithLog(start, [REVEAL, BUILD], ZONES, opts(broken));

  assert.deepEqual(statuses(log), ['ok', 'failed'], reasons(log));
  assert.match(log[1].reason, /Z99/);
  assert.equal(tilesNamed(state, 'Fetid Furball').length, 0, 'kein einziges Objekt gelegt');
  assert.equal(tilesNamed(state, 'Wheat Field').length, 0);
  assert.deepEqual(state, executeSequence(start, [REVEAL], ZONES, opts()));
});

test('ein unbekanntes Asset lässt den Schritt scheitern, ohne etwas zu legen', () => {
  const broken = scenarioFixture();
  broken.bosses.Klaus.terrain[1].assetName = 'Gibt es nicht';

  const { state, log } = executeSequenceWithLog(shortGameBar(), [REVEAL, BUILD], ZONES, opts(broken));
  assert.deepEqual(statuses(log), ['ok', 'failed'], reasons(log));
  assert.match(log[1].reason, /Gibt es nicht/);
  assert.equal(tilesNamed(state, 'Fetid Furball').length, 0);
});

test('ohne Szenariodaten wird übersprungen statt zu scheitern', () => {
  const { log } = executeSequenceWithLog(shortGameBar(), [REVEAL, BUILD], ZONES, { assets: assetFixture(), grids: GRIDS });
  assert.deepEqual(statuses(log), ['ok', 'skipped'], reasons(log));
});

// ── Schrittvokabular und Editor ──────────────────────────────────────────────

test('das Schrittvokabular kennt build_scenario', () => {
  const spec = STEP_TYPES.find(t => t.value === 'build_scenario');
  assert.ok(spec, 'build_scenario fehlt in STEP_TYPES - der Editor böte ihn dann nicht an');
  assert.deepEqual(stepFields('build_scenario'), ['final']);

  // Kein Raster am Schritt: es steht in den Szenariodaten. Zwei Quellen für
  // dieselbe Adresse wären eine Frage danach, welche gewinnt.
  assert.ok(!spec.fields.includes('gridLabel'), 'das Raster kommt aus den Daten, nicht vom Schritt');
  // Und kein Feld für die Adresse: der Bereich aus M7.1 steht in
  // `terrain[].cells`, nicht am Schritt. Das Schrittvokabular hat für G2
  // nichts zu tun – geprüft, nicht geraten.
  assert.ok(!spec.fields.includes('cell'), 'die Adresse steht in den Szenariodaten, nicht am Schritt');

  const fresh = defaultStep('build_scenario');
  assert.equal(fresh.type, 'build_scenario');
  assert.equal(fresh.final, 'auto', 'die Automatik ist die Vorgabe');
  assert.deepEqual(validateStep(fresh, {}), []);

  assert.match(describeStep(fresh), /scenario/i);
  assert.match(describeStep({ type: 'build_scenario', final: true }), /final/i);
});

// ── Feldbereiche (M7.1, G2) ──────────────────────────────────────────────────
//
// Ein Geländestück deckt mehrere Felder. `E3:G4` ist die Adresse dafür, und
// das Stück sitzt auf der Mitte der sechs Felder, nicht auf einer Feldmitte –
// sonst läge es einen halben Feldversatz daneben. Ein Einzelfeld daneben
// bleibt Zeichen für Zeichen, was es war.

/** E3:G4 auf dem 10x10-Raster: Spalten 4–6, Zeilen 2–3. */
const RANGE_BOX = { x: 330, y: 180, width: 180, height: 120 };

test('build_scenario legt einen Bereich über sechs Felder und ein Einzelfeld daneben', () => {
  const scenario = scenarioFixture();
  scenario.bosses.Klaus.terrain = [{ assetName: 'Fetid Furball', cells: ['E3:G4', 'J2'] }];
  delete scenario.bosses.Klaus.final;

  const { state, log } = executeSequenceWithLog(shortGameBar(), [REVEAL, BUILD], ZONES, opts(scenario));
  assert.deepEqual(statuses(log), ['ok', 'ok'], reasons(log));

  const tiles = tilesNamed(state, 'Fetid Furball');
  assert.equal(tiles.length, 2, 'zwei Einträge, zwei Objekte');

  const ranged = tiles.find(t => t.cell === 'E3:G4');
  assert.ok(ranged, `der Bereich wird normalisiert gemerkt, nicht als Einzelfeld: ${tiles.map(t => t.cell)}`);
  assert.deepEqual(
    { x: ranged.x, y: ranged.y, width: ranged.width, height: ranged.height },
    RANGE_BOX,
    'Mitte des Bereichs und Maße des Bereichs'
  );
  assert.equal(ranged.gridId, 'g1');

  // Und das Einzelfeld behält die Größe seines Assets.
  const single = tiles.find(t => t.cell === 'J2');
  assert.ok(single, 'das Einzelfeld liegt daneben');
  assert.deepEqual(
    { x: single.x, y: single.y, width: single.width, height: single.height },
    { ...center(9, 1), width: 60, height: 60 }
  );
});

test('G4:E3 ist derselbe Bereich und wird als E3:G4 gemerkt', () => {
  const scenario = scenarioFixture();
  scenario.bosses.Klaus.terrain = [{ assetName: 'Wheat Field', cells: ['G4:E3'] }];
  delete scenario.bosses.Klaus.final;

  const { state, log } = executeSequenceWithLog(shortGameBar(), [REVEAL, BUILD], ZONES, opts(scenario));
  assert.deepEqual(statuses(log), ['ok', 'ok'], reasons(log));
  const tile = tilesNamed(state, 'Wheat Field')[0];
  assert.equal(tile.cell, 'E3:G4');
  assert.deepEqual({ x: tile.x, y: tile.y, width: tile.width, height: tile.height }, RANGE_BOX);
});

test('ein Bereich mit einer Ecke außerhalb lässt den Schritt scheitern, bevor das erste Objekt liegt', () => {
  const broken = scenarioFixture();
  // Wieder an *dritter* Stelle: ein Schritt, der erst legt und dann prüft,
  // hätte hier schon zwei Plättchen auf dem Tisch.
  broken.bosses.Klaus.terrain[0].cells = ['C7', 'D7', 'H9:K9'];

  const start = shortGameBar();
  const { state, log } = executeSequenceWithLog(start, [REVEAL, BUILD], ZONES, opts(broken));

  assert.deepEqual(statuses(log), ['ok', 'failed'], reasons(log));
  assert.match(log[1].reason, /H9:K9/);
  assert.equal(tilesNamed(state, 'Fetid Furball').length, 0, 'kein einziges Objekt gelegt');
  assert.deepEqual(state, executeSequence(start, [REVEAL], ZONES, opts()));
});

test('clear_grid räumt den Bereich genauso weg wie das Einzelfeld', () => {
  const scenario = scenarioFixture();
  scenario.bosses.Klaus.terrain = [{ assetName: 'Fetid Furball', cells: ['E3:G4', 'J2'] }];
  delete scenario.bosses.Klaus.final;

  const { state, log } = executeSequenceWithLog(
    shortGameBar(),
    [REVEAL, BUILD, { type: 'clear_grid', gridLabel: 'Kampffeld' }],
    ZONES,
    opts(scenario)
  );
  assert.deepEqual(statuses(log), ['ok', 'ok', 'ok'], reasons(log));
  assert.equal(tilesNamed(state, 'Fetid Furball').length, 0, 'beide weg – die Mitte eines Bereichs liegt in einem Feld');
});

test('ein Bereich in fields wird gemeldet, bevor das erste Objekt liegt', () => {
  const broken = scenarioFixture();
  broken.bosses.Klaus.fields.B = 'J5:J6';

  const start = shortGameBar();
  const { state, log } = executeSequenceWithLog(start, [REVEAL, BUILD], ZONES, opts(broken));

  assert.deepEqual(statuses(log), ['ok', 'failed'], reasons(log));
  assert.match(log[1].reason, /J5:J6/);
  assert.match(log[1].reason, /range/i, 'die eigene Meldung, nicht "kein solches Feld"');
  assert.equal(tilesNamed(state, 'Fetid Furball').length, 0, 'kein einziges Objekt gelegt');
});
