// `place_card` (Spec M8.8, Aufgaben A2 und A3): **eine benannte Karte** aus der
// Bibliothek in eine Zone.
//
// Befund aus der gespielten Partie: auf jedem Doerfler-Tableau steht
// „Starting Gear: …" mit zwei Karten, und das Vokabular konnte sie nicht
// auslegen. `deal_to_zone` setzt einen Stapel am Tisch voraus, `place_stack`
// erzeugt einen — eine angelegte Ausruestungskarte ist beides nicht.
//
// Geprueft wird hier beides zugleich: dass der Executor den Schritt kann und
// dass der **Editor** ihn anbietet. Ein Schritt nur im Executor existiert im
// Editor nicht — das Muster, das docs/audit-dead-controls.md sammelt.
//
// Run with: npm test  (node --test, keine Test-Dependency)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');
const { STEP_TYPES, stepFields, defaultStep, describeStep, validateStep } =
  await import('../../client/src/utils/sequenceSteps.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** So sieht ein Name aus dem OCR-Textlayer aus: jedes Wort gedoppelt. */
const ocr = (name) => name.split(' ').map(w => `${w} ${w}`).join(' ').toUpperCase();

const GEAR = 'Startausrüstung';

/**
 * Die Bibliothek: zwei Ausruestungskarten mit zerlegtem Namen, eine saubere,
 * und zwei Karten, deren Namen sich ueberlappen (`Zaun` / `Holzzaun`).
 * Die Ausruestungskarten sind **hochkant** (300x420) — eine verlorene `height`
 * faellt damit sofort auf (Nachtrag zu M2.12).
 */
function cardFixture() {
  return [
    { id: 'g1', game_id: 'g', category_id: 'cat-g', category: GEAR, card_back_id: 'b1',
      name: ocr('The Rooty Tooter'), image_path: '/uploads/cards/g1.png', width: 300, height: 420 },
    { id: 'g2', game_id: 'g', category_id: 'cat-g', category: GEAR, card_back_id: 'b1',
      name: ocr('Paulis Gebiss'), image_path: '/uploads/cards/g2.png', width: 300, height: 420 },
    { id: 'g3', game_id: 'g', category_id: 'cat-g', category: GEAR, card_back_id: 'b1',
      name: 'Zaun', image_path: '/uploads/cards/g3.png', width: 300, height: 420 },
    { id: 'g4', game_id: 'g', category_id: 'cat-g', category: GEAR, card_back_id: 'b1',
      name: 'Holzzaun', image_path: '/uploads/cards/g4.png', width: 300, height: 420 },
  ];
}

/** Drei offene Ausruestungszonen, je zwei Plaetze — eine je Doerfler. */
function zoneFixture() {
  return [1, 2, 3].map(i => ({
    id: `gear-${i}`, label: `Ausrüstung Dörfler ${i}`,
    x: 100, y: 200 * i, width: 400, height: 180,
    shape: 'rect', accepts: ['card'], capacity: 2, layout: 'row',
  }));
}

const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [], counters: [] });
const run = (steps, over = {}) =>
  executeSequenceWithLog(emptyState(), steps, zoneFixture(), { cards: cardFixture(), ...over });

const ctxFixture = () => ({
  stackLabels: [],
  zoneLabels: zoneFixture().map(z => z.label),
  pools: [],
  assetNames: [],
  cardCategories: [GEAR],
  cards: cardFixture(),
});

// ── A2: der Executor ─────────────────────────────────────────────────────────

test('A2 / Abnahme 1: je Doerfler liegt seine Startausruestung vor ihm', () => {
  const { state, log } = run([
    { type: 'place_card', cardName: 'The Rooty Tooter', targetZoneLabel: 'Ausrüstung Dörfler 1' },
    { type: 'place_card', cardName: 'Paulis Gebiss', targetZoneLabel: 'Ausrüstung Dörfler 1' },
    { type: 'place_card', cardName: 'Zaun', targetZoneLabel: 'Ausrüstung Dörfler 2' },
  ]);

  const bad = log.filter(e => e.status !== 'ok');
  assert.deepEqual(bad, [], bad.map(e => `${e.index}: ${e.reason}`).join(' | '));
  assert.equal(state.cards.length, 3);

  const [a, b] = state.cards;
  assert.equal(a.cardId, 'g1');
  assert.equal(b.cardId, 'g2');
  // Zwei Plaetze in einer Reihe: die zweite Karte liegt neben der ersten,
  // nicht auf ihr.
  assert.notEqual(a.x, b.x);
  assert.equal(a.y, b.y);
  // Offen, nicht in der Hand — angelegte Ausruestung wirkt (Regelwerk 6.3).
  assert.ok(state.cards.every(c => c.faceDown === false && c.face_up === true));
});

test('A2: die Kartenmasse kommen aus der Bibliothekszeile mit', () => {
  // Eine aufgezaehlte Feldliste hat in diesem Repo schon zweimal width/height
  // verschluckt (Nachtrag zu M2.12, M4a) — quadratische Karten lagen danach
  // im Hochformat.
  const { state } = run([{ type: 'place_card', cardName: 'Zaun', targetZoneLabel: 'Ausrüstung Dörfler 1' }]);
  const laid = state.cards[0];
  assert.equal(laid.width, 300);
  assert.equal(laid.height, 420);
  assert.equal(laid.card_back_id, 'b1');
  assert.equal(laid.image_path, '/uploads/cards/g3.png');
  assert.ok(laid.tableId, 'jede Karte am Tisch hat eine tableId');
  assert.notEqual(laid.tableId, laid.cardId);
});

test('A2 / Abnahme 2: ein Name, den es nicht gibt, bricht den Aufbau nicht ab', () => {
  const { state, log } = run([
    { type: 'place_card', cardName: 'Gibt Es Nicht', targetZoneLabel: 'Ausrüstung Dörfler 1' },
    { type: 'place_card', cardName: 'Zaun', targetZoneLabel: 'Ausrüstung Dörfler 1' },
  ]);
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Gibt Es Nicht/);
  assert.equal(log[1].status, 'ok', 'der Aufbau laeuft weiter');
  assert.equal(state.cards.length, 1);
});

test('A2 / Abnahme 3: ein mehrdeutiger Name legt nichts und meldet es', () => {
  // `Zaun` trifft die Karte „Zaun" exakt und ist damit eindeutig, obwohl
  // „Holzzaun" den Namen enthaelt — exakt schlaegt grosszuegig. Mehrdeutig
  // wird erst eine Anfrage, die exakt nichts trifft und grosszuegig beide.
  const eindeutig = run([{ type: 'place_card', cardName: 'Zaun', targetZoneLabel: 'Ausrüstung Dörfler 1' }]);
  assert.equal(eindeutig.log[0].status, 'ok');
  assert.equal(eindeutig.state.cards[0].cardId, 'g3');

  const { state, log } = run([
    { type: 'place_card', cardName: 'aun', targetZoneLabel: 'Ausrüstung Dörfler 1' },
  ]);
  assert.equal(log[0].status, 'failed');
  assert.match(log[0].reason, /Zaun/);
  assert.equal(state.cards.length, 0, 'es liegt nichts');

  // Kein Treffer ist dagegen kein Fehler, sondern eine fehlende Voraussetzung.
  const nichts = run([{ type: 'place_card', cardName: 'zaunlatte', targetZoneLabel: 'Ausrüstung Dörfler 1' }]);
  assert.equal(nichts.log[0].status, 'skipped');
});

test('A2: zwei verschiedene Karten unter einem Namen melden beide', () => {
  const cards = [
    { id: 'a', name: 'Holzzaun', image_path: '/uploads/cards/a.png', width: 1, height: 1 },
    { id: 'b', name: 'Gartenzaun', image_path: '/uploads/cards/b.png', width: 1, height: 1 },
  ];
  const { state, log } = run(
    [{ type: 'place_card', cardName: 'zaun', targetZoneLabel: 'Ausrüstung Dörfler 1' }],
    { cards },
  );
  assert.equal(log[0].status, 'failed');
  assert.match(log[0].reason, /Holzzaun/);
  assert.match(log[0].reason, /Gartenzaun/);
  assert.equal(state.cards.length, 0);
});

test('A2: zwei Exemplare derselben Karte legen eins und vermerken es', () => {
  const cards = [
    { id: 'a', name: 'Münze', image_path: '/uploads/cards/m.png', width: 1, height: 1 },
    { id: 'b', name: 'Münze', image_path: '/uploads/cards/m.png', width: 1, height: 1 },
  ];
  const { state, log } = run(
    [{ type: 'place_card', cardName: 'Münze', targetZoneLabel: 'Ausrüstung Dörfler 1' }],
    { cards },
  );
  assert.equal(log[0].status, 'ok');
  assert.equal(state.cards.length, 1);
  assert.ok(log[0].reason, 'der Griff in den Dublettenstapel steht im Protokoll');
});

test('A2: ohne Zone, mit unbekannter Zone und in einer vollen Zone liegt nichts', () => {
  const steps = [
    { type: 'place_card', cardName: 'Zaun', targetZoneLabel: '' },
    { type: 'place_card', cardName: 'Zaun', targetZoneLabel: 'Gibt Es Nicht' },
  ];
  const { state, log } = run(steps);
  assert.deepEqual(log.map(e => e.status), ['skipped', 'skipped'], log.map(e => e.reason).join(' | '));
  assert.equal(state.cards.length, 0);

  // Die Zone fasst zwei Karten; die dritte bleibt draussen und meldet.
  const full = run([
    { type: 'place_card', cardName: 'Zaun', targetZoneLabel: 'Ausrüstung Dörfler 1' },
    { type: 'place_card', cardName: 'Holzzaun', targetZoneLabel: 'Ausrüstung Dörfler 1' },
    { type: 'place_card', cardName: 'Paulis Gebiss', targetZoneLabel: 'Ausrüstung Dörfler 1' },
  ]);
  assert.deepEqual(full.log.map(e => e.status), ['ok', 'ok', 'skipped'], full.log.map(e => e.reason).join(' | '));
  assert.equal(full.state.cards.length, 2);
});

// ── A3: das Schrittvokabular ─────────────────────────────────────────────────

test('A3 / Abnahme 4: place_card steht im Editor, mit genau seinen zwei Feldern', () => {
  assert.ok(STEP_TYPES.some(t => t.value === 'place_card'), 'place_card fehlt im Editor');
  assert.deepEqual(stepFields('place_card'), ['cardName', 'targetZoneLabel']);

  // Keine Stelle: „vor dem Doerfler" ist eine am Brett verankerte Zone, und
  // eine feste x/y ist das, was M3a abgeschafft hat. Kein `label`: eine
  // angelegte Karte ist kein Stapel.
  for (const f of ['x', 'y', 'gridLabel', 'cell', 'label', 'stackLabel', 'count', 'category']) {
    assert.ok(!stepFields('place_card').includes(f), `place_card darf kein ${f} anbieten`);
  }
});

test('A3: ein frischer place_card traegt nur Felder, die der Editor auch zeigt', () => {
  const fresh = defaultStep('place_card', ctxFixture());
  assert.equal(fresh.type, 'place_card');
  assert.equal(fresh.cardName, '', 'den Kartennamen kennt nur der Autor');
  assert.equal(fresh.targetZoneLabel, 'Ausrüstung Dörfler 1', 'vorbelegt wie jeder Zonenschritt');

  const allowed = new Set([...stepFields(fresh), 'type']);
  for (const key of Object.keys(fresh)) {
    assert.ok(allowed.has(key), `place_card hat kein Editorfeld fuer "${key}"`);
  }
});

test('A3: die Zeile nennt Karte und Zone und zeigt nie den rohen Typ', () => {
  const line = describeStep({ type: 'place_card', cardName: 'The Rooty Tooter', targetZoneLabel: 'Ausrüstung Dörfler 1' });
  assert.ok(!line.includes('_'), `zeigt den rohen Typ: ${line}`);
  assert.match(line, /The Rooty Tooter/);
  assert.match(line, /Ausrüstung Dörfler 1/);
});

test('A3: die Validierung meldet, was der Tisch sonst erst beim Aufbau meldet', () => {
  const ctx = ctxFixture();
  const ok = { type: 'place_card', cardName: 'The Rooty Tooter', targetZoneLabel: 'Ausrüstung Dörfler 1' };
  assert.deepEqual(validateStep(ok, ctx), []);

  assert.equal(validateStep({ ...ok, cardName: '' }, ctx).length, 1, 'ohne Namen');
  // Anders als bei `deal_to_zone` ist „keine Zone" hier keine gueltige Wahl:
  // eine Ausruestungskarte ohne Zone hat keinen Ort.
  assert.equal(validateStep({ ...ok, targetZoneLabel: '' }, ctx).length, 1, 'ohne Zone');
  assert.match(validateStep({ ...ok, targetZoneLabel: 'Weg' }, ctx)[0], /Weg/);

  const missing = validateStep({ ...ok, cardName: 'Gibt Es Nicht' }, ctx);
  assert.equal(missing.length, 1);
  assert.match(missing[0], /Gibt Es Nicht/);

  const many = validateStep({ ...ok, cardName: 'zaun' }, { ...ctx, cards: [
    { id: 'a', name: 'Holzzaun', image_path: '/a.png' },
    { id: 'b', name: 'Gartenzaun', image_path: '/b.png' },
  ] });
  assert.equal(many.length, 1);
  assert.match(many[0], /Holzzaun/);

  // „hier nicht bekannt" ist nicht „gibt es nicht": ohne geladene Karten
  // erfindet der Editor keine Probleme (dieselbe Regel wie bei Pools und Zonen).
  assert.deepEqual(validateStep({ ...ok, cardName: 'Irgendwas' }, { ...ctx, cards: [] }), []);
  const { cards, ...noCards } = ctx;
  assert.deepEqual(validateStep({ ...ok, cardName: 'Irgendwas' }, noCards), []);
});

test('A3: ein Platzhalter im Kartennamen ist kein Fehler', () => {
  // Wie bei `assetName` (M7/T4): welchen Namen `$revealed` meint, weiss erst
  // der Tisch.
  assert.deepEqual(validateStep(
    { type: 'place_card', cardName: 'Beute: $revealedBase', targetZoneLabel: 'Ausrüstung Dörfler 1' },
    ctxFixture(),
  ), []);
});
