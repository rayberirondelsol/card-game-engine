// Tests für `validateScenarioData` (M7, T5): die Prüfung, die vor dem Legen
// läuft.
//
// Die Szenariodaten werden von den Tableau-Rückseiten abgetippt – zwanzig
// Einträge mit je einem Dutzend Feldnamen. Ein Tippfehler darf nicht erst am
// Tisch auffallen, wenn schon das halbe Kampffeld steht: die Spec verlangt
// „erst prüfen, dann legen". Dieselbe Funktion füttert die Oberfläche, also
// muss jede Meldung sagen, *wo* der Fehler steht – Bösewicht und Feld bzw.
// Asset im Text. „ungültig" hilft beim Abtippen von zwanzig Szenarien nicht.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { validateScenarioData } = await import('../../shared/scenarioData.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

// A–M × 1–14, das gedruckte Raster einer Szenariokarte (Spec, Abschnitt 5).
const GRIDS = [{
  id: 'grid-fight',
  label: 'Kampffeld',
  type: 'square',
  origin: { x: 0, y: 0 },
  cell: 60,
  cols: 13,
  rows: 14,
  labels: { cols: 'alpha', rows: 'numeric' },
}];

const ASSETS = ['Fetid Furball', 'Wheat Field', 'Giant Milk Jug'].map((name, i) => ({
  id: `tile-${i}`, name, type: 'token', image_path: `/uploads/tokens/${i}.png`,
}));

const CTX = { assets: ASSETS, grids: GRIDS };

/** Der Eintrag aus M7, „Die Szenariodaten" – wörtlich. */
function clean() {
  return {
    gridLabel: 'Kampffeld',
    bosses: {
      Patches: {
        scenario: "Meal Time's Over",
        terrain: [
          { assetName: 'Fetid Furball', cells: ['C7', 'D7', 'H9'] },
          { assetName: 'Wheat Field', cells: ['M4'] },
        ],
        fields: { B: 'J5', D: ['A1', 'B3', 'C4', 'D6', 'E9'] },
        decks: [{ category: 'Aktionen: Patches', label: 'Verhaltensdeck' }],
        final: {
          terrain: [{ assetName: 'Giant Milk Jug', cells: ['K2', 'K3'] }],
          fields: { FF: ['K2', 'K3', 'L2', 'L3', 'M2'] },
        },
      },
    },
  };
}

/** Genau eine Meldung, und sie nennt jedes dieser Stichworte. */
function onlyProblem(data, ...mentions) {
  const problems = validateScenarioData(data, CTX);
  assert.equal(problems.length, 1, `expected exactly one problem, got: ${JSON.stringify(problems)}`);
  for (const m of mentions) {
    assert.ok(problems[0].includes(m), `problem "${problems[0]}" does not mention ${JSON.stringify(m)}`);
  }
  return problems[0];
}

// ── Der saubere Fall ─────────────────────────────────────────────────────────

test('the example from the spec passes without a word', () => {
  assert.deepStrictEqual(validateScenarioData(clean(), CTX), []);
});

test('empty scenario data is not a problem – it is just nothing to build', () => {
  assert.deepStrictEqual(validateScenarioData({}, CTX), []);
  assert.deepStrictEqual(validateScenarioData({ gridLabel: 'Kampffeld', bosses: {} }, CTX), []);
});

// ── Das Raster ───────────────────────────────────────────────────────────────

test('an unknown grid is one message, not one per field', () => {
  const data = clean();
  data.gridLabel = 'Kampfffeld';
  onlyProblem(data, 'Kampfffeld');
});

test('no grid at all is named', () => {
  const data = clean();
  delete data.gridLabel;
  onlyProblem(data, 'grid');
});

// ── Gelände ──────────────────────────────────────────────────────────────────

test('an unknown asset names the boss and the asset', () => {
  const data = clean();
  data.bosses.Patches.terrain[0].assetName = 'Rubber Duck';
  onlyProblem(data, 'Patches', 'Rubber Duck');
});

test('a field outside the grid names the boss, the field and the asset', () => {
  const data = clean();
  data.bosses.Patches.terrain[0].cells[1] = 'Z99';
  onlyProblem(data, 'Patches', 'Z99', 'Fetid Furball');
});

test('terrain without any field is a typo, not a placement', () => {
  const data = clean();
  data.bosses.Patches.terrain[1].cells = [];
  onlyProblem(data, 'Patches', 'Wheat Field');
});

test('terrain without an asset name', () => {
  const data = clean();
  delete data.bosses.Patches.terrain[1].assetName;
  onlyProblem(data, 'Patches');
});

// ── Die benannten Felder ─────────────────────────────────────────────────────

test('a D field outside the grid names the boss, the field name and the cell', () => {
  const data = clean();
  data.bosses.Patches.fields.D[2] = 'Q9';
  onlyProblem(data, 'Patches', 'Q9', 'D3');
});

test('the single B field is checked the same way', () => {
  const data = clean();
  data.bosses.Patches.fields.B = 'J55';
  onlyProblem(data, 'Patches', 'J55', 'B');
});

test('an empty field name is reported instead of silently binding nothing', () => {
  const data = clean();
  data.bosses.Patches.fields.B = '';
  onlyProblem(data, 'Patches', 'B');
});

// ── Der Endkampf-Abschnitt ───────────────────────────────────────────────────

test('the final section is checked too – terrain', () => {
  const data = clean();
  data.bosses.Patches.final.terrain[0].cells[0] = 'K99';
  onlyProblem(data, 'Patches', 'K99', 'Giant Milk Jug');
});

test('the final section is checked too – asset', () => {
  const data = clean();
  data.bosses.Patches.final.terrain[0].assetName = 'Rubber Duck';
  onlyProblem(data, 'Patches', 'Rubber Duck');
});

test('the final section is checked too – fields', () => {
  const data = clean();
  data.bosses.Patches.final.fields.FF[4] = 'M22';
  onlyProblem(data, 'Patches', 'M22', 'FF5');
});

// ── Bösewichte ───────────────────────────────────────────────────────────────

test('two entries for the same boss – the second one would never be reached', () => {
  const data = clean();
  data.bosses.patches = { terrain: [{ assetName: 'Wheat Field', cells: ['A1'] }] };
  onlyProblem(data, 'patches');
});

test('an entry that places nothing is an entry someone forgot to finish', () => {
  const data = clean();
  data.bosses['Barry Bluff'] = {};
  onlyProblem(data, 'Barry Bluff');
});

test('an entry without a boss name', () => {
  const data = clean();
  data.bosses[''] = { terrain: [{ assetName: 'Wheat Field', cells: ['A1'] }] };
  onlyProblem(data, 'boss');
});

// ── Mehreres auf einmal ──────────────────────────────────────────────────────

test('every mistake gets its own line – nothing is swallowed by the first', () => {
  const data = clean();
  data.bosses.Patches.terrain[0].assetName = 'Rubber Duck';
  data.bosses.Patches.fields.D[0] = 'Z1';
  data.bosses.Patches.final.fields.FF[0] = 'Z2';
  const problems = validateScenarioData(data, CTX);
  assert.equal(problems.length, 3, JSON.stringify(problems));
});

test('nothing at all in hand is no reason to throw', () => {
  assert.deepStrictEqual(validateScenarioData(null, {}), []);
  assert.deepStrictEqual(validateScenarioData(undefined, undefined), []);
});

// ── Feldbereiche (M7.1, G2/G6) ──────────────────────────────────
//
// Ein Bereich ist überall eine Adresse wie jede andere – in `terrain[].cells`
// und seit G6 auch in `fields`. Die Basis eines Bösewichts überdeckt 2×2 Felder
// (Nachtrag zu M7.1), ein Dörfler eines; was das ist, sagt die Adresse, nicht
// der Schlüsselname. Der Code kennt `B` nicht.

test('a range in terrain is an address like any other', () => {
  const data = clean();
  data.bosses.Patches.terrain[0].cells = ['C7:E8', 'H9'];
  data.bosses.Patches.final.terrain[0].cells = ['K2:K3'];
  assert.deepStrictEqual(validateScenarioData(data, CTX), []);
});

test('G4:E3 is the same range and just as clean', () => {
  const data = clean();
  data.bosses.Patches.terrain[1].cells = ['G4:E3'];
  assert.deepStrictEqual(validateScenarioData(data, CTX), []);
});

test('a range with one end outside the grid is one message, not two', () => {
  const data = clean();
  data.bosses.Patches.terrain[0].cells[1] = 'C7:Z99';
  onlyProblem(data, 'Patches', 'C7:Z99', 'Fetid Furball');
});

test('a range with three ends is not an address', () => {
  const data = clean();
  data.bosses.Patches.terrain[1].cells = ['C7:D8:E9'];
  onlyProblem(data, 'Patches', 'C7:D8:E9', 'Wheat Field');
});

test('a range in the single B field is fine – the boss covers four fields', () => {
  const data = clean();
  data.bosses.Patches.fields.B = 'J8:K9';
  assert.deepStrictEqual(validateScenarioData(data, CTX), []);
});

test('a range in a D field passes the same way – no special case for a key name', () => {
  const data = clean();
  data.bosses.Patches.fields.D[2] = 'C4:D5';
  assert.deepStrictEqual(validateScenarioData(data, CTX), []);
});

test('a range in a final field passes too', () => {
  const data = clean();
  data.bosses.Patches.final.fields.FF[0] = 'K2:K3';
  assert.deepStrictEqual(validateScenarioData(data, CTX), []);
});

test('a single field in fields stays valid, character for character', () => {
  const data = clean();
  assert.deepStrictEqual(data.bosses.Patches.fields.D, ['A1', 'B3', 'C4', 'D6', 'E9']);
  assert.deepStrictEqual(validateScenarioData(data, CTX), []);
});

test('a range in fields with one end outside the grid is still reported', () => {
  const data = clean();
  data.bosses.Patches.fields.B = 'J8:Z99';
  onlyProblem(data, 'Patches', 'J8:Z99', 'B');
});

test('a range in a D field with one end outside is reported with its position', () => {
  const data = clean();
  data.bosses.Patches.fields.D[2] = 'C4:Z99';
  onlyProblem(data, 'Patches', 'C4:Z99', 'D3');
});

test('without a grid in hand a range in fields says nothing – same as a single field', () => {
  const data = clean();
  data.bosses.Patches.fields.B = 'J8:K9';
  assert.deepStrictEqual(validateScenarioData(data, { assets: ASSETS }), []);
});
