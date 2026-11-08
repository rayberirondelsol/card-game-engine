// Tests für den dritten Versuch der Kartenzuordnung (M29.3, M29.4, Aufgabe DK):
// `build_scenario` sucht die Karte eines Geländeplättchens exakt, dann über den
// Teil der Seite (M7.6) - und **zuletzt** in der Tabelle `terrainCards` der
// Szenariodaten (`{ "<Assetname>": "<Kartenname>" }`).
//
// Die Tabelle füllt nur Lücken: sie ersetzt nie einen Treffer, gilt nie für
// Namen mit Schrägstrich und wird am Tisch nicht gegen die Bibliothek geprüft
// (das tut `validateScenarioData`, DL).
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

// ── Fixtures (lokal, wie in sequence-terrain-cards.test.js) ──────────────────

const BOSS = 'Bösewicht: Waggums';

const asset = (name, back = null) => ({
  id: `a-${name}`, name, type: 'token', category: 'Gelände',
  image_path: `/uploads/tokens/${encodeURIComponent(name)}.png`, back_image_path: back, width: 60, height: 60,
});
const card = (name, path = `/uploads/cards/${encodeURIComponent(name)}.png`) => ({
  id: `c-${name}-${path}`, game_id: 'g1', category_id: 'cat-t', category: 'Gelände',
  card_back_id: 'back-t', name, image_path: path, width: 300, height: 420,
});

const GRIDS = [{
  id: 'g1', label: 'Kampffeld', type: 'square',
  origin: { x: 0, y: 0 }, cell: 60, cols: 10, rows: 10,
  labels: { cols: 'alpha', rows: 'numeric' },
}];
const ZONES = [
  { id: 'z1', label: 'Stufenleiste', x: 1000, y: 100, width: 400, height: 80, accepts: ['asset'], capacity: 4 },
  { id: 'z2', label: 'Geländekarten', x: 0, y: 700, width: 900, height: 200, accepts: ['card'] },
];
const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [] });
const REVEAL = { type: 'reveal_next', zoneLabel: 'Stufenleiste' };

/**
 * Ein Aufbau mit genau den genannten Plättchen (Name oder `{ assetName, faceDown }`),
 * je auf einem Feld. `assets`/`cards` sind Namenslisten (oder fertige Zeilen);
 * `final` legt den Endkampf-Abschnitt an, `table` den Schlüssel `terrainCards`.
 */
function run({ tiles, assets, cards, table, final, zoneLabel = 'Geländekarten' }) {
  const cell = (i) => `${'ABCDEFGHIJ'[i]}1`;
  const terrain = (list) => list.map((e, i) => ({ ...(typeof e === 'string' ? { assetName: e } : e), cells: [cell(i)] }));
  const sd = {
    gridLabel: 'Kampffeld',
    ...(zoneLabel ? { cardZoneLabel: zoneLabel } : {}),
    bosses: {
      Waggums: {
        scenario: 'Test',
        terrain: terrain(tiles || []),
        fields: { B: 'I8:J9' },
        ...(final ? { final: { terrain: terrain(final) } } : {}),
      },
    },
  };
  if (table !== undefined) sd.terrainCards = table;
  const rows = (list, make) => (list || []).map(x => (typeof x === 'string' ? make(x) : x));
  const o = {
    assets: [{ ...asset(BOSS, '/uploads/tokens/boss-back.png'), category: 'Bösewichte' }, ...rows(assets, n => asset(n))],
    cards: rows(cards, n => card(n)),
    grids: GRIDS,
    scenarioData: sd,
  };
  const start = executeSequence(emptyState(),
    [{ type: 'place_asset', assetName: BOSS, targetZoneLabel: 'Stufenleiste', faceDown: true }], ZONES, o);
  return executeSequenceWithLog(start, [REVEAL, { type: 'build_scenario', final: Boolean(final) }], ZONES, o);
}

const cardNames = (state) => state.cards.map(c => c.name);
const buildLog = (log) => log[1];
const WALD = { tiles: ['Dichter Wald 2'], assets: ['Dichter Wald 2'], cards: ['Dichter Wald'] };
const TABLE_WALD = { 'Dichter Wald 2': 'Dichter Wald' };

// ── 1. die Zuordnung greift ──────────────────────────────────────────────────

test('M29.3: ein Plättchen ohne gleichnamige Karte findet sie über die Tabelle', () => {
  const { state, log } = run({ ...WALD, table: TABLE_WALD });

  assert.deepEqual(cardNames(state), ['Dichter Wald']);
  assert.equal(buildLog(log).status, 'ok', buildLog(log).reason);
  assert.equal(state.tokens.filter(t => t.gridId === 'g1').length, 1, 'das Plättchen selbst liegt');
});

// ── 2. ohne Tabelle unverändert ──────────────────────────────────────────────

test('M29.3: ohne Tabelle bleibt es beim Vermerk, mit dem alten Wortlaut', () => {
  const { state, log } = run({ ...WALD });

  assert.equal(state.cards.length, 0);
  assert.equal(buildLog(log).status, 'note');
  assert.equal(buildLog(log).reason,
    '1 terrain tile on the table has no terrain card in this library (nothing to do): "Dichter Wald 2"');
});

// ── 3. zwei Plättchen, eine Karte ────────────────────────────────────────────

test('M29.3: Dichter Wald und Dichter Wald 2 legen zusammen eine Karte', () => {
  const { state, log } = run({
    tiles: ['Dichter Wald', 'Dichter Wald 2'], assets: ['Dichter Wald', 'Dichter Wald 2'],
    cards: ['Dichter Wald'], table: TABLE_WALD,
  });

  assert.deepEqual(cardNames(state), ['Dichter Wald']);
  assert.equal(buildLog(log).status, 'ok', buildLog(log).reason);
});

test('M29.3: Sprengstoff und Auslöser zeigen auf eine Karte und legen eine', () => {
  const { state, log } = run({
    tiles: ['Sprengstoff', 'Auslöser'], assets: ['Sprengstoff', 'Auslöser'], cards: ['Sprengstoff & Auslöser'],
    table: { Sprengstoff: 'Sprengstoff & Auslöser', Auslöser: 'Sprengstoff & Auslöser' },
  });

  assert.deepEqual(cardNames(state), ['Sprengstoff & Auslöser']);
  assert.equal(buildLog(log).status, 'ok', buildLog(log).reason);
});

// ── 4. die Tabelle ersetzt nie einen Treffer ─────────────────────────────────

test('M29.3: der exakte Name gewinnt vor der Tabelle', () => {
  const { state } = run({
    tiles: ['Holzzaun'], assets: ['Holzzaun'], cards: ['Holzzaun', 'Hohler Heuhaufen'],
    table: { Holzzaun: 'Hohler Heuhaufen' },
  });

  assert.deepEqual(cardNames(state), ['Holzzaun']);
});

test('M29.3: der Teil der Seite gewinnt vor der Tabelle', () => {
  const { state } = run({
    tiles: ['Doofster-Glocke / Kochtopf'], assets: [asset('Doofster-Glocke / Kochtopf', '/uploads/tokens/pot.png')],
    cards: ['Doofster-Glocke', 'Wunschbrunnen'],
    table: { 'Doofster-Glocke / Kochtopf': 'Wunschbrunnen' },
  });

  assert.deepEqual(cardNames(state), ['Doofster-Glocke']);
});

// ── 5. ein zweiseitiges Teil ohne Karte bekommt auch aus der Tabelle keine ───

test('M29.3: ein zweiseitiges Teil ohne Karte bleibt ohne - die Tabelle kennt keine Seiten', () => {
  const name = 'Wunschbrunnen / Wunschbrunnen (leer)';
  const { state, log } = run({
    tiles: [{ assetName: name, faceDown: true }], assets: [asset(name, '/uploads/tokens/b.png')],
    cards: ['Wunschbrunnen'], table: { [name]: 'Wunschbrunnen' },
  });

  assert.equal(state.cards.length, 0, 'die Karte der Vorderseite neben das verdeckte Teil zu legen wäre falsch');
  assert.equal(buildLog(log).status, 'note');
  assert.match(buildLog(log).reason, /Wunschbrunnen \/ Wunschbrunnen \(leer\)/);
});

// ── 6. Ziel ins Leere ────────────────────────────────────────────────────────

test('M29.5: ein Ziel, das es nicht gibt, ist ein Vermerk und kein Fehlschlag', () => {
  const { state, log } = run({
    tiles: ['Hohler Heuhaufen', 'Dichter Wald 2'], assets: ['Hohler Heuhaufen', 'Dichter Wald 2'],
    cards: ['Hohler Heuhaufen'], table: { 'Dichter Wald 2': 'Gibt es nicht' },
  });

  assert.deepEqual(cardNames(state), ['Hohler Heuhaufen'], 'der Rest der Reihe liegt');
  assert.equal(state.tokens.filter(t => t.gridId === 'g1').length, 2, 'das Gelände liegt');
  assert.equal(buildLog(log).status, 'note');
  assert.match(buildLog(log).reason, /"Dichter Wald 2"/);
});

// ── 7. Form ──────────────────────────────────────────────────────────────────

test('M29.3: eine Tabelle, die kein Objekt ist, wirkt wie keine - ohne Wurf', () => {
  const without = run({ ...WALD });
  for (const table of [['Dichter Wald'], 'Dichter Wald 2', null, 42, {}, true]) {
    const { state, log } = run({ ...WALD, table });
    assert.deepEqual(cardNames(state), cardNames(without.state), JSON.stringify(table));
    assert.deepEqual(log.map(e => [e.status, e.reason]), without.log.map(e => [e.status, e.reason]), JSON.stringify(table));
  }
});

test('M29.3: Liste und Text sind keine Tabelle, auch wenn ihre Indizes wie Schlüssel aussehen', () => {
  // Object.keys(['Dichter Wald']) ist ['0'] - ein Plättchen namens "0" träfe sonst die Karte.
  for (const table of [['Dichter Wald'], 'Dichter Wald']) {
    const { state } = run({ tiles: ['0'], assets: ['0'], cards: ['Dichter Wald'], table });
    assert.equal(state.cards.length, 0, JSON.stringify(table));
  }
});

test('M29.5: der Tisch prüft die Tabelle nicht - fremde Schlüssel stören den Aufbau nicht', () => {
  const { state, log } = run({
    ...WALD,
    table: { 'Kein Asset': 'Dichter Wald', 'A/B': 'Dichter Wald', 'Dichter Wald 2': 'Dichter Wald' },
  });

  assert.deepEqual(cardNames(state), ['Dichter Wald']);
  assert.equal(buildLog(log).status, 'ok', buildLog(log).reason);
});

// ── 8. Vergleich ─────────────────────────────────────────────────────────────

test('M29.3: der Schlüssel wird mit norm verglichen (klein), nicht tolerant', () => {
  assert.deepEqual(cardNames(run({ ...WALD, table: { 'dichter wald 2': 'Dichter Wald' } }).state), ['Dichter Wald']);
  assert.deepEqual(cardNames(run({ ...WALD, table: { 'Dichter Wald2': 'Dichter Wald' } }).state), []);
});

test('M29.3: das Ziel wird nicht als Teilstring gesucht', () => {
  const { state, log } = run({
    tiles: ['Sprengstoff'], assets: ['Sprengstoff'], cards: ['Sprengstoff & Auslöser', 'SPRENGSTOFF-ZIGARRE'],
    table: { Sprengstoff: 'Sprengstoff' },
  });

  assert.equal(state.cards.length, 0, 'weder "Sprengstoff & Auslöser" noch "SPRENGSTOFF-ZIGARRE" ist "Sprengstoff"');
  assert.equal(buildLog(log).status, 'note');
});

test('M29.3: ein leeres Ziel trifft keine Karte ohne Namen', () => {
  const nameless = { ...card('x'), name: '' };
  const { state } = run({ ...WALD, cards: [nameless], table: { 'Dichter Wald 2': '' } });

  assert.equal(state.cards.length, 0);
});

// ── 9. faceDown ──────────────────────────────────────────────────────────────

test('M29.3: dasselbe Plättchen verdeckt findet dieselbe Karte', () => {
  const { state, log } = run({
    tiles: [{ assetName: 'Auslöser', faceDown: true }],
    assets: [asset('Auslöser', '/uploads/tokens/auslöser-b.png')],
    cards: ['Sprengstoff & Auslöser'], table: { Auslöser: 'Sprengstoff & Auslöser' },
  });

  assert.deepEqual(cardNames(state), ['Sprengstoff & Auslöser']);
  assert.equal(buildLog(log).status, 'ok', buildLog(log).reason);
});

// ── 10. final.terrain, ohne cardZoneLabel ────────────────────────────────────

test('M29.3: der Endkampf-Abschnitt liest dieselbe Tabelle', () => {
  const { state, log } = run({
    tiles: ['Hohler Heuhaufen'], final: ['Dichter Wald 2'],
    assets: ['Hohler Heuhaufen', 'Dichter Wald 2'], cards: ['Hohler Heuhaufen', 'Dichter Wald'], table: TABLE_WALD,
  });

  assert.deepEqual(cardNames(state), ['Hohler Heuhaufen', 'Dichter Wald']);
  assert.equal(buildLog(log).status, 'ok', buildLog(log).reason);
});

test('M29.3: ohne cardZoneLabel legt die Tabelle keine Karte und sagt nichts', () => {
  const { state, log } = run({ ...WALD, table: TABLE_WALD, zoneLabel: null });

  assert.equal(state.cards.length, 0);
  assert.equal(buildLog(log).status, 'ok');
  assert.equal(log.map(e => e.reason).filter(Boolean).join(''), '');
});

// ── 11. monoton ──────────────────────────────────────────────────────────────

test('M29.3: eine Tabelle, die nichts trifft, ändert weder Karten noch Protokoll', () => {
  const base = {
    tiles: ['Hohler Heuhaufen', 'Holzzaun', 'Wunschbrunnen', 'Die Bundo-Königin'],
    assets: ['Hohler Heuhaufen', 'Holzzaun', 'Wunschbrunnen', 'Die Bundo-Königin'],
    cards: ['Wunschbrunnen', 'Hohler Heuhaufen', 'Holzzaun', 'Dichter Wald'],
  };
  const without = run(base);
  const withTable = run({ ...base, table: { ...TABLE_WALD, Auslöser: 'Sprengstoff & Auslöser' } });

  assert.deepEqual(cardNames(withTable.state), cardNames(without.state), 'gleiche Karten, gleiche Reihenfolge');
  assert.deepEqual(withTable.log, without.log);
});

// ── 12. der Kommentar ────────────────────────────────────────────────────────

test('M29.4: der Kommentar im Executor sagt nicht mehr "kein dritter", aber nennt die Tabelle', () => {
  const src = readFileSync(new URL('../../shared/sequenceExecutor.js', import.meta.url), 'utf8');

  assert.ok(!src.includes('kein dritter'), 'der alte Satz widerspräche dem Code');
  assert.ok(src.includes('terrainCards'));
});
