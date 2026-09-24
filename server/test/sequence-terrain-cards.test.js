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

/** Ein Szenario mit genau den genannten Geländeteilen, je auf einem Feld. */
function pairScenario(...assetNames) {
  return {
    gridLabel: 'Kampffeld',
    cardZoneLabel: 'Geländekarten',
    bosses: {
      Waggums: {
        scenario: 'Zwei Seiten',
        terrain: assetNames.map((assetName, i) => ({ assetName, cells: [`${'ABCDEFGHIJ'[i]}1`] })),
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
