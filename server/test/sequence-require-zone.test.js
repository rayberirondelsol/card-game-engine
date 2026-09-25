// P1 - `require_zone`: eine Vorbedingung haelt die ganze Sequenz an
// (docs/tasks-vorbedingung.md P1; Spec M9.3).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Befund stammt aus einer gespielten Partie: „Kampf beginnen" ohne
// vorherige Dorfphase liess `reveal_next` durchlaufen, deckte den naechsten
// Boesewicht auf - und die anschliessende Dorfphase raeumte ihn als
// Boesewichtmaterial weg. Aus drei Kaempfen wurden zwei.
//
// Geprueft vorab: `clear_zone` und `rotate_zone` lesen dieselbe Zone, aendern
// sie aber; keiner der vorhandenen Schritte kann eine Sequenz anhalten.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

const BACK = '/uploads/tokens/boss-back.png';
const BOSSES = ['Klaus', 'Bertha'];

const ASSETS = [
  ...BOSSES.map((n, i) => ({
    id: `boss-${i}`, name: `Bösewicht: ${n}`, type: 'token', category: 'Bösewichte',
    image_path: `/uploads/tokens/boss-${i}.png`, back_image_path: BACK, width: 60, height: 60,
  })),
  ...BOSSES.map((n, i) => ({
    id: `tableau-${i}`, name: `Tableau: ${n}`, type: 'board', category: 'Tableaus',
    image_path: `/uploads/boards/tableau-${i}.png`, back_image_path: null, width: 400, height: 300,
  })),
  { id: 'side', name: 'Zusatz-Brett', type: 'board', category: 'Bretter', image_path: '/uploads/boards/side.png', back_image_path: '/uploads/boards/side-back.png', width: 300, height: 200 },
];

const ZONES = [
  { id: 'z1', label: 'Bösewicht-Leiste', x: 100, y: 100, width: 400, height: 80, accepts: ['asset'], capacity: 4, layout: 'row' },
  { id: 'z2', label: 'Bösewicht-Platz', x: 800, y: 100, width: 80, height: 80, accepts: ['asset'], capacity: 1, layout: 'column' },
  { id: 'z3', label: 'Bösewicht-Tableau', x: 1200, y: 100, width: 440, height: 340, accepts: ['asset'], capacity: 1, layout: 'column' },
  { id: 'z4', label: 'Besiegte Bösewichte', x: 100, y: 600, width: 400, height: 80, accepts: ['asset'], capacity: 4, layout: 'row' },
  // Eine am Zusatz-Brett verankerte Zone: das Brett liegt *unter* ihr, nicht
  // *in* ihr - dieselbe Ausnahme, die `clear_zone` und `countInZone` kennen.
  { id: 'z5', label: 'Auf dem Brett', x: 0, y: 0, width: 10, height: 10, accepts: ['asset'], capacity: 4, layout: 'row',
    anchor: { assetId: 'side', relX: 0, relY: 0, relWidth: 1, relHeight: 1 } },
];

const MELDUNG = 'Erst die Dorfphase beginnen — der vorige Kampf steht noch.';

// Der Kern von „Kampf beginnen": die Wache, dann drei Schritte, die den
// Boesewicht verbrennen, wenn sie ohne sie laufen.
const KAMPF = [
  { type: 'require_zone', zoneLabel: 'Bösewicht-Tableau', expect: 'empty', message: MELDUNG },
  { type: 'reveal_next', zoneLabel: 'Bösewicht-Leiste', targetZoneLabel: 'Bösewicht-Platz' },
  { type: 'place_asset', assetName: 'Tableau: $revealedBase', targetZoneLabel: 'Bösewicht-Tableau' },
  { type: 'set_asset_face', assetName: 'Zusatz-Brett', faceDown: false },
];

const opts = () => ({ assets: ASSETS });
const emptyState = () => ({ cards: [], stacks: [], tokens: [], boards: [], counters: [] });

/** Zwei verdeckte Boesewichte in der Leiste, dazu das Zusatz-Brett. */
const tableState = () => executeSequence(
  emptyState(),
  [
    ...BOSSES.map(n => ({ type: 'place_asset', assetName: `Bösewicht: ${n}`, targetZoneLabel: 'Bösewicht-Leiste', faceDown: true })),
    { type: 'place_asset', assetName: 'Zusatz-Brett', x: 2000, y: 2000, faceDown: true },
  ],
  ZONES,
  opts()
);

/** Die aufgedeckten Bösewichte - das ist es, was der Befund verbrennt. */
const faceUp = (state) => state.tokens.filter(t => !t.faceDown && String(t.label).startsWith('Bösewicht: ')).map(t => t.label);
const bad = (log) => log.filter(e => e.status !== 'ok');

// ── Die erfuellte Bedingung aendert nichts ───────────────────────────────────

test('erfuellte Vorbedingung: alle Schritte laufen, der erste Kampf ist unveraendert', () => {
  const { state, log } = executeSequenceWithLog(tableState(), KAMPF, ZONES, opts());

  assert.deepEqual(bad(log), [], 'kein Schritt darf melden');
  assert.equal(log.length, KAMPF.length, 'jeder Schritt bekommt eine Zeile');
  assert.deepEqual(faceUp(state), ['Bösewicht: Klaus'], 'der erste Bösewicht ist aufgedeckt');
  assert.ok(state.tokens.some(t => t.label === 'Tableau: Klaus'), 'sein Tableau liegt');
});

// ── Der Befund aus der Partie ────────────────────────────────────────────────

test('zweimal hintereinander: der zweite Druck deckt keinen Bösewicht auf', () => {
  const erst = executeSequence(tableState(), KAMPF, ZONES, opts());
  const { state, log } = executeSequenceWithLog(erst, KAMPF, ZONES, opts());

  assert.deepEqual(faceUp(state), ['Bösewicht: Klaus'], 'Bertha bleibt verdeckt in der Leiste');
  assert.equal(state.tokens.length, erst.tokens.length, 'nichts Neues kommt auf den Tisch');
  assert.ok(!state.tokens.some(t => t.label === 'Tableau: Bertha'), 'kein zweites Tableau');
});

test('die Meldung sagt, was zu tun ist - und steht genau einmal da', () => {
  const erst = executeSequence(tableState(), KAMPF, ZONES, opts());
  const { log } = executeSequenceWithLog(erst, KAMPF, ZONES, opts());

  // Die Oberflaeche zeigt `log.filter(e => e.status !== 'ok')`. Drei Zeilen
  // „uebersprungen" waeren lauter als das Problem - bei der echten Aktion
  // waeren es sechzehn.
  assert.equal(bad(log).length, 1, `genau eine Meldung, nicht ${bad(log).length}`);
  assert.equal(log.length, 1, 'die uebersprungenen Schritte bekommen keine eigene Zeile');

  const one = log[0];
  assert.equal(one.index, 0);
  assert.equal(one.type, 'require_zone');
  assert.equal(one.status, 'skipped');
  assert.ok(one.reason.includes(MELDUNG), `die Meldung aus den Daten fehlt: ${one.reason}`);
  assert.match(one.reason, /3/, 'die Zeile sagt, wie viele Schritte ausgefallen sind');
});

test('nach dem Abräumen läuft dieselbe Sequenz unverändert durch', () => {
  const erst = executeSequence(tableState(), KAMPF, ZONES, opts());
  const aufgeraeumt = executeSequence(
    erst,
    [
      { type: 'clear_zone', zoneLabel: 'Bösewicht-Platz', targetZoneLabel: 'Besiegte Bösewichte' },
      { type: 'clear_zone', zoneLabel: 'Bösewicht-Tableau' },
    ],
    ZONES,
    opts()
  );

  const { state, log } = executeSequenceWithLog(aufgeraeumt, KAMPF, ZONES, opts());
  assert.deepEqual(bad(log), [], 'kein Schritt darf melden');
  assert.ok(faceUp(state).includes('Bösewicht: Bertha'), 'der zweite Bösewicht kommt dran');
  assert.ok(state.tokens.some(t => t.label === 'Tableau: Bertha'));
});

// ── Die Gegenrichtung: „Dorfphase beginnen" vor dem ersten Kampf ─────────────

test('expect "occupied" hält an, solange die Zone leer ist, und lässt danach durch', () => {
  const DORF = [
    { type: 'require_zone', zoneLabel: 'Bösewicht-Tableau', expect: 'occupied', message: 'Erst einen Kampf beginnen.' },
    { type: 'clear_zone', zoneLabel: 'Bösewicht-Platz', targetZoneLabel: 'Besiegte Bösewichte' },
  ];

  const frisch = executeSequenceWithLog(tableState(), DORF, ZONES, opts());
  assert.equal(frisch.log.length, 1);
  assert.equal(frisch.log[0].status, 'skipped');
  assert.ok(frisch.log[0].reason.includes('Erst einen Kampf beginnen.'));

  const nachKampf = executeSequence(tableState(), KAMPF, ZONES, opts());
  const { log } = executeSequenceWithLog(nachKampf, DORF, ZONES, opts());
  assert.deepEqual(bad(log), [], 'mit liegendem Tableau läuft die Dorfphase');
});

// ── Grenzfälle ───────────────────────────────────────────────────────────────

test('eine Zone, die es nicht gibt, lässt nichts durch - und sagt es', () => {
  const { log } = executeSequenceWithLog(
    tableState(),
    [{ type: 'require_zone', zoneLabel: 'Gibts nicht', expect: 'empty', message: MELDUNG }, ...KAMPF.slice(1)],
    ZONES,
    opts()
  );
  assert.equal(log.length, 1, 'eine unprüfbare Bedingung ist keine erfüllte');
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Gibts nicht/);
});

test('ein unlesbares expect lässt nichts durch', () => {
  const { log } = executeSequenceWithLog(
    tableState(),
    [{ type: 'require_zone', zoneLabel: 'Bösewicht-Tableau', expect: 'vielleicht' }, ...KAMPF.slice(1)],
    ZONES,
    opts()
  );
  assert.equal(log.length, 1);
  assert.equal(log[0].status, 'skipped');
});

test('ohne Meldung steht eine Diagnose da, kein leerer Grund', () => {
  const erst = executeSequence(tableState(), KAMPF, ZONES, opts());
  const { log } = executeSequenceWithLog(
    erst,
    [{ type: 'require_zone', zoneLabel: 'Bösewicht-Tableau', expect: 'empty' }],
    ZONES,
    opts()
  );
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Bösewicht-Tableau/);
});

test('der Anker einer Zone liegt nicht *in* ihr', () => {
  // Das Zusatz-Brett trägt die Zone „Auf dem Brett" - es zählt nicht mit,
  // sonst wäre jede aufgedruckte Zone dauerhaft belegt.
  const state = executeSequence(
    emptyState(),
    [{ type: 'place_asset', assetName: 'Zusatz-Brett', x: 400, y: 400 }],
    ZONES,
    opts()
  );
  const { log } = executeSequenceWithLog(
    state,
    [{ type: 'require_zone', zoneLabel: 'Auf dem Brett', expect: 'empty', message: MELDUNG }],
    ZONES,
    opts()
  );
  assert.equal(log[0].status, 'ok', log[0].reason);
});

test('executeSequence wirft nicht und gibt den Zustand zurück', () => {
  const erst = executeSequence(tableState(), KAMPF, ZONES, opts());
  const out = executeSequence(erst, KAMPF, ZONES, opts());
  assert.equal(typeof out, 'object');
  assert.equal(out.tokens.length, erst.tokens.length);
});

test('die Wache hält nur ihre eigene Sequenz an, nicht den nächsten Aufruf', () => {
  const erst = executeSequence(tableState(), KAMPF, ZONES, opts());
  executeSequence(erst, KAMPF, ZONES, opts()); // hält an
  const { log } = executeSequenceWithLog(
    erst,
    [{ type: 'set_asset_face', assetName: 'Zusatz-Brett', faceDown: false }],
    ZONES,
    opts()
  );
  assert.equal(log[0].status, 'ok', log[0].reason);
});

// ── M12.3 (AC1/AC2): eine fremde Karte im Rechteck sperrt nichts ─────────────
//
// Fünfte Solopartie: der erste Druck auf „Kampf beginnen" meldete „Erst die
// Dorfphase beginnen — der vorige Kampf steht noch." **Es gab keinen vorigen
// Kampf** — es lag eine beiseitegelegte Karte im Rechteck des Tableaus.
//
// Der Befund vermutet, `column` mit `capacity: 1` habe keine festen Plätze.
// Es hat einen: `zoneSlots` liefert für `Bösewicht-Tableau` genau (1420, 270),
// und `countInZone` zählt dort schon heute richtig. Die Ursache ist eine
// andere und allgemeinere — `require_zone` fragt als einzige Stelle im
// Executor noch `objectsInZone(…).length`, also das Rechteck. Begründung in
// `docs/tasks-partie5.md`, „Vorab 1".

/** Eine beiseitegelegte Karte im Rechteck des Tableaus, auf keinem Platz. */
const FREMDE_KARTE = { tableId: 'fremd', cardId: 'c-fremd', name: 'Bösewicht-Aktion: Hieb', x: 1250, y: 150, zIndex: 3, faceDown: false };

test('M12.3/1: eine Karte im Rechteck, aber auf keinem Platz, sperrt die Zone nicht', () => {
  const state = tableState();
  state.cards.push({ ...FREMDE_KARTE });

  const { state: nachher, log } = executeSequenceWithLog(state, KAMPF, ZONES, opts());

  assert.deepEqual(bad(log), [], `die Wache hält ohne Grund an: ${log.map(e => e.reason).join('; ')}`);
  assert.deepEqual(faceUp(nachher), ['Bösewicht: Klaus'], 'der Kampf läuft wie ohne die Karte');
  assert.ok(nachher.cards.some(c => c.tableId === 'fremd'), 'die fremde Karte bleibt liegen');
});

test('M12.3/1: auf dem Platz zählt sie sehr wohl', () => {
  // Die Gegenprobe zur vorigen – sonst prüfte der Test nur, dass die Wache
  // nie anhält.
  const state = tableState();
  state.cards.push({ ...FREMDE_KARTE, x: 1420, y: 270 });

  const { log } = executeSequenceWithLog(state, KAMPF, ZONES, opts());
  assert.equal(log.length, 1, 'die Wache hält an');
  assert.equal(log[0].status, 'skipped');
});

test('M12.3/2: eine Zone ohne feste Plätze zählt unverändert', () => {
  // `Ablage` hat `layout: "free"` – dort gibt es keine Plätze, und was im
  // Rechteck liegt, *ist* die Belegung. Das muss so bleiben.
  const FREI = [...ZONES, { id: 'z6', label: 'Ablage', x: 2000, y: 0, width: 200, height: 280, layout: 'free', accepts: ['card'] }];
  const WACHE = [{ type: 'require_zone', zoneLabel: 'Ablage', expect: 'empty', message: 'Erst die Ablage räumen.' }];

  const leer = executeSequenceWithLog(tableState(), WACHE, FREI, opts());
  assert.equal(leer.log[0].status, 'ok', 'leer ist leer');

  const state = tableState();
  state.cards.push({ ...FREMDE_KARTE, x: 2050, y: 30 });
  const belegt = executeSequenceWithLog(state, WACHE, FREI, opts());
  assert.equal(belegt.log[0].status, 'skipped', 'irgendwo im Rechteck reicht hier');
});

test('M12.3/3: die Meldung nennt, was tatsächlich in der Zone liegt', () => {
  const erst = executeSequence(tableState(), KAMPF, ZONES, opts());
  const { log } = executeSequenceWithLog(erst, KAMPF, ZONES, opts());

  const grund = log[0].reason;
  assert.ok(grund.includes(MELDUNG), `die Auskunft führt weiterhin: ${grund}`);
  assert.ok(grund.includes('Tableau: Klaus'), `was dort liegt, fehlt: ${grund}`);
  // Eine Zeile, nicht sechzehn: M9.3 hat die übersprungenen Schritte
  // abgeschafft, und daran ändert die Diagnose nichts.
  assert.equal(log.length, 1);
  assert.equal(grund.split('\n').length, 1, `die Diagnose macht daraus mehrere Zeilen: ${grund}`);
});
