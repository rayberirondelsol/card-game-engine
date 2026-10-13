// M15.3 / AR1: `clear_grid` kann einen Pool verschonen.
//
// Partie 7, N3: nach „Dorfphase beginnen" ist das Bösewicht-Plättchen
// **vollständig vom Tisch** — nicht in der Zone `Besiegte Bösewichte`, die der
// Aufbau eigens dafür mitbringt. Am echten Tisch ist die Reihe der erledigten
// Bösewichte der sichtbare Fortschritt der Partie.
//
// **Warum der Schritt 1 der Aktion nicht greift.** „Dorfphase beginnen" hat
// `clear_zone "Bösewicht-Platz" → "Besiegte Bösewichte"` als ersten Schritt —
// nur steht der Bösewicht beim Abräumen nicht dort. „Kampf beginnen" holt ihn
// mit `reveal_next` auf den Platz und schiebt dasselbe Plättchen vier Schritte
// später mit `place_asset "$revealed"` auf das **Spielfeld**. Dort steht er den
// ganzen Kampf, und `clear_grid` löscht alles, was auf dem Raster steht.
//
// Ein `remove_asset` gibt es im Vokabular nicht; einen verschiebenden Schritt
// gibt es zweimal (`place_asset` mit Zone, `clear_zone` mit Zone). Was fehlte,
// war die Möglichkeit, beim Abräumen eines Rasters etwas zu **verschonen**.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { executeSequence, executeSequenceWithLog } = await import('../../shared/sequenceExecutor.js');
const { describeStep, validateStep, stepFields } = await import('../../client/src/utils/sequenceSteps.js');

const ASSETS = [
  { id: 'boss-0', name: 'Bösewicht: Klaus', type: 'token', category: 'Bösewichte', image_path: '/u/b0.png', width: 100, height: 100 },
  { id: 'boss-1', name: 'Bösewicht: Bertha', type: 'token', category: 'Bösewichte', image_path: '/u/b1.png', width: 100, height: 100 },
  { id: 'v-0', name: 'Granny Melba', type: 'token', category: 'Dörfler', image_path: '/u/v0.png', width: 50, height: 50 },
  { id: 'v-1', name: 'Henlo Bulwark', type: 'token', category: 'Dörfler', image_path: '/u/v1.png', width: 50, height: 50 },
  { id: 't-0', name: 'Dichter Wald', type: 'token', category: 'Gelände', image_path: '/u/t0.png', width: 60, height: 60 },
];

const GRIDS = [{
  id: 'g1', label: 'Spielfeld', type: 'square',
  origin: { x: 0, y: 0 }, cell: 60, cols: 10, rows: 10,
  labels: { cols: 'alpha', rows: 'numeric' },
}];

const ZONES = [
  { id: 'zb', label: 'Besiegte Bösewichte', x: 1900, y: 860, width: 300, height: 90, accepts: ['asset'], capacity: 4, layout: 'row' },
  { id: 'ze', label: 'Eng', x: 1900, y: 1200, width: 100, height: 90, accepts: ['asset'], capacity: 1, layout: 'row' },
  { id: 'zc', label: 'Nur Karten', x: 1900, y: 1400, width: 300, height: 90, accepts: ['card'], capacity: 4, layout: 'row' },
];

const opts = () => ({ assets: ASSETS, grids: GRIDS });
const byName = (state, name) => state.tokens.find(o => o.label === name || o.name === name);
const inZone = (state, label) => {
  const z = ZONES.find(x => x.label === label);
  return state.tokens.filter(o => o.x >= z.x && o.x <= z.x + z.width && o.y >= z.y && o.y <= z.y + z.height);
};

/** Bösewicht auf R-Feld, zwei Dörfler und ein Geländeteil daneben. */
function battlefield(extra = []) {
  return executeSequence(
    { cards: [], stacks: [], tokens: [], boards: [] },
    [
      { type: 'place_asset', assetName: 'Bösewicht: Klaus', gridLabel: 'Spielfeld', cell: 'E5' },
      { type: 'place_asset', assetName: 'Granny Melba', gridLabel: 'Spielfeld', cell: 'B2' },
      { type: 'place_asset', assetName: 'Henlo Bulwark', gridLabel: 'Spielfeld', cell: 'C3' },
      { type: 'place_asset', assetName: 'Dichter Wald', gridLabel: 'Spielfeld', cell: 'G8' },
      ...extra,
    ],
    ZONES,
    opts(),
  );
}

const spare = (targetZoneLabel = 'Besiegte Bösewichte', pool = 'Bösewichte') =>
  ({ type: 'clear_grid', gridLabel: 'Spielfeld', targetZoneLabel, pool });

// ── Der Fall aus der Partie ─────────────────────────────────────────────────

test('AR1/1+2: der Bösewicht wandert in seine Zone, alles andere wird gelöscht', () => {
  const { state, log } = executeSequenceWithLog(battlefield(), [spare()], ZONES, opts());

  const boss = byName(state, 'Bösewicht: Klaus');
  assert.ok(boss, 'der Bösewicht ist noch da');
  assert.deepEqual(inZone(state, 'Besiegte Bösewichte').map(o => o.label || o.name), ['Bösewicht: Klaus']);
  assert.equal(boss.gridId, null, 'er steht nicht mehr auf einem Rasterfeld');
  assert.equal(boss.cell, null);

  assert.equal(byName(state, 'Granny Melba'), undefined);
  assert.equal(byName(state, 'Henlo Bulwark'), undefined);
  assert.equal(byName(state, 'Dichter Wald'), undefined);
  assert.equal(log[0].status, 'ok');
});

test('AR1: nach zwei Kämpfen liegen zwei Bösewichte in der Zone', () => {
  let state = executeSequenceWithLog(battlefield(), [spare()], ZONES, opts()).state;
  // Kampf zwei: derselbe Aufbau, anderer Bösewicht.
  state = executeSequence(
    state,
    [
      { type: 'place_asset', assetName: 'Bösewicht: Bertha', gridLabel: 'Spielfeld', cell: 'E5' },
      { type: 'place_asset', assetName: 'Granny Melba', gridLabel: 'Spielfeld', cell: 'B2' },
    ],
    ZONES,
    opts(),
  );
  state = executeSequence(state, [spare()], ZONES, opts());

  assert.deepEqual(
    inZone(state, 'Besiegte Bösewichte').map(o => o.label || o.name).sort(),
    ['Bösewicht: Bertha', 'Bösewicht: Klaus'],
  );
});

// ── Die Ränder ──────────────────────────────────────────────────────────────

test('AR1/3: ohne Ziel und Pool löscht clear_grid alles — unverändert', () => {
  const state = executeSequence(battlefield(), [{ type: 'clear_grid', gridLabel: 'Spielfeld' }], ZONES, opts());
  assert.equal(state.tokens.length, 0);
});

test('AR1/3: ein Ziel ohne Pool verschont nichts', () => {
  const state = executeSequence(
    battlefield(),
    [{ type: 'clear_grid', gridLabel: 'Spielfeld', targetZoneLabel: 'Besiegte Bösewichte' }],
    ZONES,
    opts(),
  );
  assert.equal(state.tokens.length, 0, 'ohne Pool ist nicht gesagt, was verschont wird');
});

test('AR1/4: wofür in der Zielzone kein Platz ist, bleibt auf dem Raster liegen und steht im Protokoll', () => {
  // Zwei Bösewichte auf dem Raster, eine Zielzone mit einem Platz.
  const start = executeSequence(
    battlefield(),
    [{ type: 'place_asset', assetName: 'Bösewicht: Bertha', gridLabel: 'Spielfeld', cell: 'H9' }],
    ZONES,
    opts(),
  );
  const { state, log } = executeSequenceWithLog(start, [spare('Eng')], ZONES, opts());

  assert.equal(inZone(state, 'Eng').length, 1, 'einer kommt unter');
  assert.equal(state.tokens.filter(o => /Bösewicht/.test(o.label || o.name)).length, 2,
    'gelöscht wird keiner von beiden');
  assert.notEqual(log[0].status, 'ok');
  assert.match(log[0].reason, /Bösewicht/);
  // Die Dörfler sind trotzdem weg: der Schritt tut, was er soll, nur nicht ganz.
  assert.equal(byName(state, 'Granny Melba'), undefined);
});

test('AR1/4: eine volle Zielzone überspringt den Schritt — gelöscht wird dann nichts', () => {
  const start = executeSequence(
    battlefield(),
    [{ type: 'place_asset', assetName: 'Bösewicht: Bertha', targetZoneLabel: 'Eng' }],
    ZONES,
    opts(),
  );
  const { state, log } = executeSequenceWithLog(start, [spare('Eng')], ZONES, opts());

  assert.ok(byName(state, 'Bösewicht: Klaus'), 'gelöscht wird er nicht');
  assert.ok(byName(state, 'Granny Melba'), 'und mit ihm bleibt alles stehen — wie bei clear_zone');
  assert.equal(log[0].status, 'skipped');
  assert.match(log[0].reason, /Eng/);
});

test('AR1/5: eine Zielzone, die keine Assets annimmt, lässt es liegen', () => {
  const { state, log } = executeSequenceWithLog(battlefield(), [spare('Nur Karten')], ZONES, opts());
  assert.ok(byName(state, 'Bösewicht: Klaus'));
  assert.notEqual(log[0].status, 'ok');
});

test('AR1: eine Zielzone, die es nicht gibt, überspringt den Schritt — nichts wird gelöscht', () => {
  const { state, log } = executeSequenceWithLog(battlefield(), [spare('Gibtsnicht')], ZONES, opts());
  assert.equal(log[0].status, 'skipped');
  assert.equal(state.tokens.length, 4, 'ein geratenes Ziel darf nicht löschen');
});

test('AR1/6: ein gesperrtes Objekt bleibt gesperrt liegen, wie bisher', () => {
  const start = executeSequence(battlefield(), [{ type: 'lock_asset', assetName: 'Dichter Wald' }], ZONES, opts());
  const { state, log } = executeSequenceWithLog(start, [spare()], ZONES, opts());
  assert.ok(byName(state, 'Dichter Wald'));
  assert.notEqual(log[0].status, 'ok');
  assert.match(log[0].reason, /locked/);
});

test('AR1: ein unbekannter Pool verschont nichts und löscht alles', () => {
  const state = executeSequence(battlefield(), [spare('Besiegte Bösewichte', 'Gibtsnicht')], ZONES, opts());
  assert.equal(state.tokens.length, 0);
});

// ── Das Schrittvokabular des Editors ────────────────────────────────────────

test('AR1/7: die Zeile im Editor nennt Pool und Ziel — und nur, wenn es sie gibt', () => {
  assert.doesNotMatch(describeStep({ type: 'clear_grid', gridLabel: 'Spielfeld' }), /pool/);
  const line = describeStep(spare());
  assert.match(line, /"Bösewichte"/);
  assert.match(line, /"Besiegte Bösewichte"/);
});

test('AR1/7: der Pool wird geprüft, und er steht nur mit Zielzone zur Wahl', () => {
  const ctx = { grids: GRIDS, zoneLabels: ZONES.map(z => z.label), pools: ['Bösewichte', 'Dörfler', 'Gelände'] };
  assert.deepEqual(validateStep({ type: 'clear_grid', gridLabel: 'Spielfeld' }, ctx), [], 'ohne Ziel kein Pool nötig');
  assert.deepEqual(validateStep(spare(), ctx), []);
  assert.deepEqual(
    validateStep({ type: 'clear_grid', gridLabel: 'Spielfeld', targetZoneLabel: 'Besiegte Bösewichte', pool: 'Tippfehler' }, ctx),
    ['pool "Tippfehler" is empty or unknown'],
  );
  assert.deepEqual(
    validateStep({ type: 'clear_grid', gridLabel: 'Spielfeld', targetZoneLabel: 'Besiegte Bösewichte' }, ctx),
    ['no pool chosen'],
    'mit Ziel, aber ohne Pool wäre nicht gesagt, was verschont wird',
  );
  assert.ok(!stepFields({ type: 'clear_grid', gridLabel: 'Spielfeld' }).includes('pool'));
});
