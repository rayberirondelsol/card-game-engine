// Tests für die Geländekarten (M8.3, K2–K5): `build_scenario` legt je
// Geländeteil des Szenarios **eine** Karte in eine Zone unter dem Hauptplan.
//
// Drei Dinge stehen hier im Mittelpunkt, weil sie die teuren Fehler sind:
//
// 1. **Je Geländeteil eine Karte, nicht je Feld eine.** Das Gelände ist genau
//    andersherum (je Feld ein eigenes Objekt) - zwei Holzzäune auf dem Brett
//    sind zwei Plättchen und *eine* Karte.
// 2. **Ein Teil ohne Karte bricht nichts ab.** Die Bundo-Königin hat keine.
//    Ein Abbruch dafür ließe das ganze Kampffeld leer.
// 3. **Die Zone steht in den Daten, nicht im Code.** `Geländekarten` ist ein
//    Townsfolk-Tussle-Begriff, und der Code weiß nichts über Townsfolk Tussle
//    (M7). Ohne `cardZoneLabel` liegt keine Karte - die drei erfassten
//    Szenarien laufen unverändert weiter.
//
// Run with: npm test  (node --test, no test framework dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BOSS_BACK = '/uploads/tokens/boss-back.png';
const TERRAIN = ['Hohler Heuhaufen', 'Holzzaun', 'Wunschbrunnen'];

/** Gelände-Assets, der Bösewicht - und ein Teil, zu dem es keine Karte gibt. */
function assetFixture() {
  return [
    {
      id: 'boss-0', name: 'Bösewicht: Waggums', type: 'token', category: 'Bösewichte',
      image_path: '/uploads/tokens/boss-0.png', back_image_path: BOSS_BACK, width: 60, height: 60,
    },
    ...TERRAIN.map((name, i) => ({
      id: `tile-${i}`, name, type: 'token', category: 'Gelände',
      image_path: `/uploads/tokens/tile-${i}.png`, back_image_path: null, width: 60, height: 60,
    })),
    {
      id: 'bundo', name: 'Die Bundo-Königin', type: 'token', category: 'Gelände',
      image_path: '/uploads/tokens/bundo.png', back_image_path: null, width: 60, height: 60,
    },
  ];
}

/**
 * Die Kartenbibliothek: je Geländeteil eine gleichnamige Karte - außer für die
 * Bundo-Königin, die im echten Spiel auch keine hat. Die Karten sind
 * **hochkant** (300x420), damit eine verlorene `height` sofort auffällt
 * (Nachtrag zu M2.12).
 */
function cardFixture() {
  return [
    ...TERRAIN.map((name, i) => ({
      id: `c${i}`, game_id: 'g1', category_id: 'cat-t', category: 'Gelände',
      card_back_id: 'back-t', name, image_path: `/uploads/cards/t${i}.png`,
      width: 300, height: 420,
    })),
    {
      id: 'cx', game_id: 'g1', category_id: 'cat-x', category: 'Heldentaten',
      card_back_id: 'back-x', name: 'Heldentat 1', image_path: '/uploads/cards/x.png',
      width: 300, height: 420,
    },
  ];
}

/** 10x10 ab (0,0), Buchstaben quer, Zahlen runter. */
const GRIDS = [{
  id: 'g1', label: 'Kampffeld', type: 'square',
  origin: { x: 0, y: 0 }, cell: 60, cols: 10, rows: 10,
  labels: { cols: 'alpha', rows: 'numeric' },
}];

/**
 * Die Leiste oben, die Kartenreihe unter dem Hauptplan (y = 700, das Raster
 * endet bei 600). Breit und flach, ohne `capacity` und ohne `layout`: dann
 * verteilt `zoneSlotFor` beliebig viele Karten über die Breite, statt gegen
 * eine feste Platzzahl zu rechnen (K5).
 */
const ZONES = [
  { id: 'z1', label: 'Stufenleiste', x: 1000, y: 100, width: 400, height: 80, accepts: ['asset'], capacity: 4 },
  { id: 'z2', label: 'Geländekarten', x: 0, y: 700, width: 900, height: 200, accepts: ['card'] },
];

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [] });

/** Ein verdeckter Bösewicht auf der Leiste - mehr braucht `reveal_next` nicht. */
function barWithBoss() {
  return executeSequence(
    emptyState(),
    [{ type: 'place_asset', assetName: 'Bösewicht: Waggums', targetZoneLabel: 'Stufenleiste', faceDown: true }],
    ZONES,
    opts()
  );
}

/**
 * Deputy Waggums, verkürzt: der Heuhaufen einmal, der Holzzaun **zweimal** (zwei
 * Ausrichtungen, also zwei Einträge - M7.1), der Wunschbrunnen auf zwei Feldern
 * eines Eintrags. Drei Teile, fünf Plättchen, drei Karten.
 */
function scenarioFixture(over = {}) {
  return {
    gridLabel: 'Kampffeld',
    cardZoneLabel: 'Geländekarten',
    bosses: {
      Waggums: {
        scenario: 'Doppelt hält besser',
        terrain: [
          { assetName: 'Hohler Heuhaufen', cells: ['C7'] },
          { assetName: 'Holzzaun', cells: ['D5:G5'] },
          { assetName: 'Holzzaun', cells: ['I2:I5'], rotation: 90 },
          { assetName: 'Wunschbrunnen', cells: ['A1', 'B3'] },
        ],
        fields: { B: 'I8:J9' },
        final: {
          terrain: [{ assetName: 'Die Bundo-Königin', cells: ['E9'] }],
        },
        ...over,
      },
    },
  };
}

const opts = (scenarioData = scenarioFixture()) => ({
  assets: assetFixture(), cards: cardFixture(), grids: GRIDS, scenarioData,
});

const REVEAL = { type: 'reveal_next', zoneLabel: 'Stufenleiste' };
const BUILD = { type: 'build_scenario', final: false };

const build = (scenarioData = scenarioFixture(), steps = [REVEAL, BUILD]) =>
  executeSequenceWithLog(barWithBoss(), steps, ZONES, opts(scenarioData));

const names = (state) => state.cards.map(c => c.name).sort();
const statuses = (log) => log.map(e => e.status);
const reasons = (log) => log.map(e => e.reason).filter(Boolean).join(' | ');

// ── K3: je Geländeteil eine Karte ────────────────────────────────────────────

test('build_scenario legt je Geländeteil eine Karte, nicht je Feld eine', () => {
  const { state, log } = build();

  assert.deepEqual(statuses(log), ['ok', 'ok'], reasons(log));
  // Fünf Plättchen auf dem Brett …
  assert.equal(state.tokens.filter(t => t.gridId === 'g1').length, 5);
  // … und drei Karten darunter. Der Holzzaun steht zweimal im Szenario und
  // liegt einmal als Karte.
  assert.deepEqual(names(state), ['Hohler Heuhaufen', 'Holzzaun', 'Wunschbrunnen']);
});

test('die Karten liegen nebeneinander in der Zone, nicht übereinander', () => {
  const { state } = build();
  const zone = ZONES[1];

  for (const c of state.cards) {
    assert.ok(c.x > zone.x && c.x < zone.x + zone.width, `x ${c.x} außerhalb der Zone`);
    assert.ok(c.y > zone.y && c.y < zone.y + zone.height, `y ${c.y} außerhalb der Zone`);
  }
  assert.equal(new Set(state.cards.map(c => c.x)).size, 3);
});

test('die ausgelegte Karte trägt Bild und Maße ihrer Bibliothekszeile', () => {
  const { state } = build();
  const card = state.cards.find(c => c.name === 'Holzzaun');

  assert.equal(card.image_path, '/uploads/cards/t1.png');
  assert.equal(card.width, 300);
  assert.equal(card.height, 420);
  assert.equal(card.card_back_id, 'back-t');
  assert.equal(card.cardId, 'c1');
  assert.ok(card.tableId, 'ohne tableId ist die Karte am Tisch nicht adressierbar');
  assert.equal(card.faceDown, false);
});

test('der Endkampf-Abschnitt bringt seine eigenen Karten mit', () => {
  // Die Bundo-Königin hat keine Karte - aber ein zweiter Geländeeintrag mit
  // Karte im `final` muss dort ankommen.
  const data = scenarioFixture();
  data.bosses.Waggums.final.terrain.push({ assetName: 'Wunschbrunnen', cells: ['H1'] });
  data.bosses.Waggums.terrain = [{ assetName: 'Hohler Heuhaufen', cells: ['C7'] }];

  const { state } = build(data, [REVEAL, { type: 'build_scenario', final: true }]);
  assert.deepEqual(names(state), ['Hohler Heuhaufen', 'Wunschbrunnen']);
});

test('ohne Endkampf bleiben dessen Karten liegen', () => {
  const data = scenarioFixture();
  data.bosses.Waggums.final.terrain.push({ assetName: 'Wunschbrunnen', cells: ['H1'] });
  data.bosses.Waggums.terrain = [{ assetName: 'Hohler Heuhaufen', cells: ['C7'] }];

  const { state } = build(data);
  assert.deepEqual(names(state), ['Hohler Heuhaufen']);
});

// ── K2: ohne `cardZoneLabel` ändert sich nichts ──────────────────────────────

test('ohne cardZoneLabel legt build_scenario keine Karte und sagt nichts dazu', () => {
  const data = scenarioFixture();
  delete data.cardZoneLabel;

  const { state, log } = build(data);
  assert.deepEqual(statuses(log), ['ok', 'ok'], reasons(log));
  assert.equal(state.cards.length, 0);
  assert.equal(reasons(log), '');
});

// ── K4: ein Teil ohne Karte bricht nichts ab ─────────────────────────────────

test('ein Geländeteil ohne Karte lässt Gelände und Reihe stehen und steht im Protokoll', () => {
  const { state, log } = build(scenarioFixture(), [REVEAL, { type: 'build_scenario', final: true }]);

  // Die Bundo-Königin liegt auf dem Brett …
  assert.ok(state.tokens.some(t => t.label === 'Die Bundo-Königin'));
  // … die drei Karten der übrigen Teile liegen …
  assert.deepEqual(names(state), ['Hohler Heuhaufen', 'Holzzaun', 'Wunschbrunnen']);
  // … und der Schritt sagt, welche fehlt.
  assert.equal(log[1].status, 'failed');
  assert.match(log[1].reason, /Bundo-Königin/);
});

test('eine fehlende Zone lässt das Gelände liegen und steht im Protokoll', () => {
  const data = scenarioFixture();
  data.cardZoneLabel = 'Tippfehler';

  const { state, log } = build(data);
  assert.equal(state.tokens.filter(t => t.gridId === 'g1').length, 5);
  assert.equal(state.cards.length, 0);
  assert.equal(log[1].status, 'failed');
  assert.match(log[1].reason, /Tippfehler/);
});

test('eine volle Zone nimmt, was hineinpasst, und meldet den Rest', () => {
  const zones = [ZONES[0], { ...ZONES[1], capacity: 2, layout: 'row' }];
  const { state, log } = executeSequenceWithLog(
    executeSequence(emptyState(),
      [{ type: 'place_asset', assetName: 'Bösewicht: Waggums', targetZoneLabel: 'Stufenleiste', faceDown: true }],
      zones, opts()),
    [REVEAL, BUILD], zones, opts()
  );

  assert.equal(state.cards.length, 2);
  assert.equal(log[1].status, 'failed');
  assert.match(log[1].reason, /full/);
});

// ── K5: das Abräumen ─────────────────────────────────────────────────────────

test('clear_zone räumt die Reihe ab und lässt das Gelände auf dem Raster stehen', () => {
  const { state, log } = build(scenarioFixture(),
    [REVEAL, BUILD, { type: 'clear_zone', zoneLabel: 'Geländekarten' }]);

  assert.deepEqual(statuses(log), ['ok', 'ok', 'ok'], reasons(log));
  assert.equal(state.cards.length, 0);
  assert.equal(state.tokens.filter(t => t.gridId === 'g1').length, 5);
});

test('clear_grid räumt die Reihe nicht ab - sie liegt außerhalb des Rasters', () => {
  // Der Befund vom gespielten Tisch: abgeräumt wird, wofür eine Zeile dasteht.
  const { state } = build(scenarioFixture(),
    [REVEAL, BUILD, { type: 'clear_grid', gridLabel: 'Kampffeld' }]);

  assert.equal(state.tokens.filter(t => t.gridId === 'g1').length, 0);
  assert.equal(state.cards.length, 3);
});

// ── Teile mit zwei Seiten heißen `Vorderseite / Rückseite` ───────────────────
//
// Nachtrag zu M8.3: der exakte Namensvergleich findet für die keine Karte.
// Die Regel ist **eine**: trägt der Teilname einen Schrägstrich, gilt
// zusätzlich der Teil davor. Erst exakt, dann vorderer Teil - kein dritter
// Kniff.
//
// Warum der *vordere* Teil und nicht irgendeiner: `build_scenario` legt
// Gelände mit fest verdrahtetem `assetToken(asset, x, y, false)` hin, also
// **immer offen**, und der Geländeeintrag kennt nur `assetName`, `cells` und
// `rotation` - keine Seite. Was auf dem Tisch liegt, ist die Vorderseite, und
// nur deren Karte gehört daneben.

const pairAssets = () => [
  ...assetFixture(),
  {
    id: 'tile-pair', name: 'Wunschbrunnen / Wunschbrunnen (leer)', type: 'token', category: 'Gelände',
    image_path: '/uploads/tokens/pair.png', back_image_path: '/uploads/tokens/pair-b.png', width: 60, height: 60,
  },
  {
    id: 'tile-bell', name: 'Doofster-Glocke / Kochtopf', type: 'token', category: 'Gelände',
    image_path: '/uploads/tokens/bell.png', back_image_path: '/uploads/tokens/pot.png', width: 60, height: 60,
  },
];

const pairCards = () => [
  ...cardFixture(),
  { id: 'c-bell', game_id: 'g1', category_id: 'cat-n', category: 'Gelände (Üble Nachbarn)', card_back_id: 'back-n', name: 'Doofster-Glocke', image_path: '/uploads/cards/bell.png', width: 300, height: 420 },
  { id: 'c-pot', game_id: 'g1', category_id: 'cat-n', category: 'Gelände (Üble Nachbarn)', card_back_id: 'back-n', name: 'Kochtopf', image_path: '/uploads/cards/pot.png', width: 300, height: 420 },
];

/**
 * Ein Szenario mit genau den genannten Geländeteilen, je auf einem Feld.
 *
 * Ein Eintrag ist ein Name oder - seit M7.6 - ein `{ assetName, faceDown }`.
 * Dieselbe Hilfsfunktion, ein Feld mehr: zwei wären zwei Fixtures, die
 * auseinanderlaufen.
 */
function pairScenario(...entries) {
  return {
    gridLabel: 'Kampffeld',
    cardZoneLabel: 'Geländekarten',
    bosses: {
      Waggums: {
        scenario: 'Zwei Seiten',
        terrain: entries.map((e, i) => ({
          ...(typeof e === 'string' ? { assetName: e } : e),
          cells: [`${'ABCDEFGHIJ'[i]}1`],
        })),
        fields: { B: 'I8:J9' },
      },
    },
  };
}

/** Wie `build`, aber mit eigener Asset- und Kartenliste. */
function buildWith(scenarioData, assets = pairAssets(), cards = pairCards()) {
  const o = { assets, cards, grids: GRIDS, scenarioData };
  const start = executeSequence(emptyState(),
    [{ type: 'place_asset', assetName: 'Bösewicht: Waggums', targetZoneLabel: 'Stufenleiste', faceDown: true }],
    ZONES, o);
  return executeSequenceWithLog(start, [REVEAL, BUILD], ZONES, o);
}

test('ein Teil mit Schrägstrich findet die Karte seiner Vorderseite', () => {
  const { state, log } = buildWith(pairScenario('Wunschbrunnen / Wunschbrunnen (leer)'));

  assert.deepEqual(statuses(log), ['ok', 'ok'], reasons(log));
  assert.deepEqual(names(state), ['Wunschbrunnen']);
});

test('von einem zweiseitigen Teil liegt nur die Karte der Vorderseite', () => {
  // `Doofster-Glocke / Kochtopf`: jede Seite hat eine eigene Karte, aber der
  // Aufbau legt das Teil offen hin. Die Kochtopf-Karte neben eine Glocke zu
  // legen hieße, Regeln für ein Gelände auszulegen, das gar nicht daliegt.
  const { state } = buildWith(pairScenario('Doofster-Glocke / Kochtopf'));

  assert.deepEqual(names(state), ['Doofster-Glocke']);
});

test('der exakte Name gewinnt vor dem Teil vor dem Schrägstrich', () => {
  const cards = [
    ...pairCards(),
    { id: 'c-whole', game_id: 'g1', category_id: 'cat-n', category: 'Gelände (Üble Nachbarn)', card_back_id: 'back-n', name: 'Doofster-Glocke / Kochtopf', image_path: '/uploads/cards/whole.png', width: 300, height: 420 },
  ];
  const { state } = buildWith(pairScenario('Doofster-Glocke / Kochtopf'), pairAssets(), cards);

  assert.deepEqual(names(state), ['Doofster-Glocke / Kochtopf']);
});

test('zwei Teile, die auf dieselbe Karte zeigen, legen eine Karte', () => {
  // Der Schrägstrich macht das erst möglich: zwei verschiedene Teilnamen,
  // dieselbe Karte. Dieselbe Regel wie bei zwei Holzzäunen.
  const { state } = buildWith(pairScenario('Wunschbrunnen / Wunschbrunnen (leer)', 'Wunschbrunnen'));

  assert.deepEqual(names(state), ['Wunschbrunnen']);
});

test('der Vergleich bleibt zeichengenau: ein fehlender Bindestrich trifft nicht', () => {
  // `norm` trimmt und macht klein, mehr nicht. Die Karte muss deshalb genau so
  // heißen wie der Teil vor dem Schrägstrich - `Doofsterglocke` ist ein
  // anderer Name als `Doofster-Glocke`.
  const cards = cardFixture().concat({
    id: 'c-bell2', game_id: 'g1', category_id: 'cat-n', category: 'Gelände (Üble Nachbarn)',
    card_back_id: 'back-n', name: 'Doofsterglocke', image_path: '/uploads/cards/bell.png', width: 300, height: 420,
  });
  const { state, log } = buildWith(pairScenario('Doofster-Glocke / Kochtopf'), pairAssets(), cards);

  assert.equal(state.cards.length, 0);
  assert.equal(log[1].status, 'failed');
  assert.match(log[1].reason, /Doofster-Glocke \/ Kochtopf/);
});

// ── M7.6: ein Geländeteil kann auch auf der Rückseite liegen ─────────────────
//
// Drei Dinge stehen hier im Mittelpunkt:
//
// 1. **Die Seite kommt aus den Daten.** Der Geländeeintrag trägt `faceDown`
//    genau wie `rotation`; ohne das Feld liegt alles wie bisher.
// 2. **Ohne Rückseite wird nicht gelegt.** `assetToken` weigert sich (Spec §6),
//    der Aufbau macht daraus einen Vermerk und läuft weiter - ein still falsch
//    herum liegendes Plättchen ist schlimmer als ein fehlendes.
// 3. **Die Kartenregel gilt in beide Richtungen.** Eine Karte heißt wie der
//    Teil des Teilnamens, zu dem sie gehört: offen der vor dem Schrägstrich,
//    verdeckt der dahinter. Eine Regel, nicht zwei.

/**
 * Die echten Paare aus der Produktion (M7.6) - Plättchen mit zwei Seiten, deren
 * Seiten zwei *verschiedene* Gelände sind, und zu jeder Seite eine Karte.
 * Erfundene Namen würden die Regel genauso zeigen und den Ernstfall nicht.
 */
const REAL_PAIRS = [
  ['Doofster-Glocke / Kochtopf', 'Doofster-Glocke', 'Kochtopf'],
  ['Koederstulle / Rasenmaeher', 'Koederstulle', 'Rasenmaeher'],
  ['Rangelblume / Die Wolken-Gang', 'Rangelblume', 'Die Wolken-Gang'],
  ["Wehtuh-Fratzenfalle / Goob's Tavern", 'Wehtuh-Fratzenfalle', "Goob's Tavern"],
  ['Flut / Matschpfuetze', 'Flut', 'Matschpfuetze'],
];

// `pairAssets`/`pairCards` tragen die Doofster-Glocke schon - hier gewinnt der
// Eintrag aus REAL_PAIRS, sonst stünde derselbe Name zweimal in der Bibliothek
// und `findAsset` nähme den ersten.
const dropDupes = (rows, names) => rows.filter(r => !names.includes(r.name));

const sideAssets = () => [
  ...dropDupes(pairAssets(), REAL_PAIRS.map(([n]) => n)),
  ...REAL_PAIRS.map(([name], i) => ({
    id: `pair-${i}`, name, type: 'token', category: 'Gelände (Üble Nachbarn)',
    image_path: `/uploads/tokens/pair-${i}.png`, back_image_path: `/uploads/tokens/pair-${i}-b.png`,
    width: 60, height: 60,
  })),
  // Zweiseitig benannt, aber **ohne** Rückseitenbild: der Fall aus Abnahme 3.
  {
    id: 'pair-flat', name: 'Grabhügel / Grabhügel ausgehoben (N)', type: 'token', category: 'Gelände',
    image_path: '/uploads/tokens/grab.png', back_image_path: null, width: 60, height: 60,
  },
];

const sideCards = () => [
  ...dropDupes(pairCards(), REAL_PAIRS.flatMap(([, f, b]) => [f, b])),
  ...REAL_PAIRS.flatMap(([, front, back], i) => [
    { id: `pc-${i}f`, game_id: 'g1', category_id: 'cat-n', category: 'Gelände (Üble Nachbarn)', card_back_id: 'back-n', name: front, image_path: `/uploads/cards/${i}f.png`, width: 300, height: 420 },
    { id: `pc-${i}b`, game_id: 'g1', category_id: 'cat-n', category: 'Gelände (Üble Nachbarn)', card_back_id: 'back-n', name: back, image_path: `/uploads/cards/${i}b.png`, width: 300, height: 420 },
  ]),
];

const buildSide = (scenarioData) => buildWith(scenarioData, sideAssets(), sideCards());
const tile = (state, label) => state.tokens.find(t => t.label === label);

// ── V1: die Seite kommt aus den Daten ────────────────────────────────────────

test('ein Geländeeintrag mit faceDown legt das Teil mit seinem Rückseitenbild', () => {
  const { state, log } = buildSide(pairScenario({ assetName: 'Doofster-Glocke / Kochtopf', faceDown: true }));

  assert.deepEqual(statuses(log), ['ok', 'ok'], reasons(log));
  const t = tile(state, 'Doofster-Glocke / Kochtopf');
  assert.equal(t.faceDown, true);
  assert.equal(t.imageUrl, '/uploads/tokens/pair-0-b.png');
});

test('ohne das Feld liegt das Teil offen - die erfassten Szenarien bauen unverändert', () => {
  const { state } = buildSide(pairScenario('Doofster-Glocke / Kochtopf'));

  const t = tile(state, 'Doofster-Glocke / Kochtopf');
  assert.equal(t.faceDown, false);
  assert.equal(t.imageUrl, '/uploads/tokens/pair-0.png');
});

test('faceDown gilt auch im final-Abschnitt', () => {
  // Dort stehen die fünf Grabhügel, und die sind zweiseitig. Geprüft wird es an
  // einem Teil *mit* Rückseitenbild, damit der Fall nicht mit V2 verschmilzt.
  const data = pairScenario('Hohler Heuhaufen');
  data.bosses.Waggums.final = {
    terrain: [{ assetName: 'Flut / Matschpfuetze', cells: ['E9'], faceDown: true }],
  };
  const o = { assets: sideAssets(), cards: sideCards(), grids: GRIDS, scenarioData: data };
  const start = executeSequence(emptyState(),
    [{ type: 'place_asset', assetName: 'Bösewicht: Waggums', targetZoneLabel: 'Stufenleiste', faceDown: true }],
    ZONES, o);
  const { state, log } = executeSequenceWithLog(start,
    [REVEAL, { type: 'build_scenario', final: true }], ZONES, o);

  assert.deepEqual(statuses(log), ['ok', 'ok'], reasons(log));
  const t = tile(state, 'Flut / Matschpfuetze');
  assert.equal(t.faceDown, true);
  assert.equal(t.imageUrl, '/uploads/tokens/pair-4-b.png');
  assert.deepEqual(names(state), ['Hohler Heuhaufen', 'Matschpfuetze']);
});

test('die Drehung überlebt die Seite', () => {
  const data = pairScenario({ assetName: 'Flut / Matschpfuetze', faceDown: true, rotation: 90 });
  const { state } = buildSide(data);

  assert.equal(tile(state, 'Flut / Matschpfuetze').rotation, 90);
  assert.equal(tile(state, 'Flut / Matschpfuetze').faceDown, true);
});

// ── V2: ohne Rückseite wird nicht gelegt, der Rest läuft weiter ──────────────

test('ein Teil ohne Rückseitenbild mit faceDown wird nicht gelegt und steht im Protokoll', () => {
  const { state, log } = buildSide(pairScenario(
    { assetName: 'Grabhügel / Grabhügel ausgehoben (N)', faceDown: true },
    'Hohler Heuhaufen',
  ));

  // Das Teil liegt nicht …
  assert.equal(tile(state, 'Grabhügel / Grabhügel ausgehoben (N)'), undefined);
  // … der übrige Aufbau läuft weiter: das zweite Plättchen liegt, seine Karte auch.
  assert.ok(tile(state, 'Hohler Heuhaufen'));
  assert.deepEqual(names(state), ['Hohler Heuhaufen']);
  // … und der Schritt sagt, welches Teil fehlt.
  assert.equal(log[1].status, 'failed');
  assert.match(log[1].reason, /Grabhügel/);
});

// ── V3: die Kartenregel gilt in beide Richtungen ─────────────────────────────

for (const [name, front, back] of REAL_PAIRS) {
  test(`verdeckt legt "${name}" die Karte "${back}", offen "${front}"`, () => {
    assert.deepEqual(names(buildSide(pairScenario({ assetName: name, faceDown: true })).state), [back]);
    assert.deepEqual(names(buildSide(pairScenario(name)).state), [front]);
  });
}

test('dasselbe Teil einmal offen und einmal verdeckt legt zwei Karten', () => {
  // Die Entdopplung zählt die Seite mit: zwei Seiten sind zwei Gelände.
  const { state, log } = buildSide(pairScenario(
    'Doofster-Glocke / Kochtopf',
    { assetName: 'Doofster-Glocke / Kochtopf', faceDown: true },
  ));

  assert.deepEqual(statuses(log), ['ok', 'ok'], reasons(log));
  assert.deepEqual(names(state), ['Doofster-Glocke', 'Kochtopf']);
});

test('zweimal dieselbe Seite legt weiter eine Karte', () => {
  const { state } = buildSide(pairScenario(
    { assetName: 'Doofster-Glocke / Kochtopf', faceDown: true },
    { assetName: 'Doofster-Glocke / Kochtopf', faceDown: true },
  ));

  assert.deepEqual(names(state), ['Kochtopf']);
});

test('die hintere Richtung findet nur, was es gibt', () => {
  // `Wunschbrunnen / Wunschbrunnen (leer)` verdeckt sucht die Karte
  // `Wunschbrunnen (leer)` - die gibt es nicht, also liegt keine. Die Karte
  // `Wunschbrunnen` der Vorderseite daneben zu legen wäre die Regel zu einem
  // Gelände, das gar nicht daliegt.
  const { state } = buildSide(pairScenario({ assetName: 'Wunschbrunnen / Wunschbrunnen (leer)', faceDown: true }));
  assert.deepEqual(names(state), []);

  const open = buildSide(pairScenario('Wunschbrunnen / Wunschbrunnen (leer)'));
  assert.deepEqual(names(open.state), ['Wunschbrunnen']);
});

test('ein Name ohne Schrägstrich verhält sich mit faceDown unverändert', () => {
  const assets = sideAssets().map(a => (a.name === 'Holzzaun'
    ? { ...a, back_image_path: '/uploads/tokens/zaun-b.png' } : a));
  const { state, log } = buildWith(pairScenario({ assetName: 'Holzzaun', faceDown: true }), assets, sideCards());

  assert.deepEqual(statuses(log), ['ok', 'ok'], reasons(log));
  assert.deepEqual(names(state), ['Holzzaun']);
});

test('ein verweigertes Teil bekommt keine Karte', () => {
  // Das Teil liegt nicht - die Kochtopf-Karte daneben wäre die Regel zu einem
  // Gelände, das gar nicht auf dem Tisch ist. Genau der Fall, für den M8.3 die
  // Vorderseite gewählt hat, nur andersherum.
  const assets = sideAssets().map(a => (a.name === 'Doofster-Glocke / Kochtopf'
    ? { ...a, back_image_path: null } : a));
  const { state, log } = buildWith(
    pairScenario({ assetName: 'Doofster-Glocke / Kochtopf', faceDown: true }, 'Hohler Heuhaufen'),
    assets, sideCards(),
  );

  assert.deepEqual(names(state), ['Hohler Heuhaufen']);
  assert.equal(log[1].status, 'failed');
  assert.match(log[1].reason, /no back side/);
});
