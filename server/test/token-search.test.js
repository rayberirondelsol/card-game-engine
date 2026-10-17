// CE / Spec M24.2 — ein Suchfeld für „Add Token".
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Befund der Sichtprüfung zu M21: der Dialog listet alle 212 Assets in einem
// Kasten von 144 Punkten Höhe, vier je Zeile, die Namen auf „Marker 1…"
// gekürzt. Das war der Grund, warum in Partie 12 die Karni-Marker nicht
// gefunden wurden — sie existierten, nur sah sie niemand.
//
// **Dieselbe Suche wie die Kartenbibliothek** (M6): `matchesCardSearch` aus
// `shared/cardSearch.js`. Was die Suche kann und was nicht, steht in
// `card-search.test.js`; hier steht nur, dass der Tokendialog sie benutzt und
// keine zweite danebenstellt.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { matchesCardSearch } from '../../shared/cardSearch.js';

const source = readFileSync(
  fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');

/** Namen, wie sie wirklich in `table_assets` des Spiels stehen. */
const ASSETS = [
  '"Sheriff"-Piñata', 'Altes Fass / Altes Fass (leer)', 'Auftragswumme', 'Ausguck',
  'Marker 1: Leben', 'Marker 1: Bewegung', 'Marker 2: Leben', 'Marker 3: Leben',
  'Boss-Token Rückseite: Patches', 'Besessener Geist',
];

const hits = (q) => ASSETS.filter(n => matchesCardSearch(n, q));

// ── Was die Suche leisten muss ──────────────────────────────────────────────

test('CE1: ein Teilwort findet die Marker', () => {
  assert.deepEqual(hits('marker 1'), ['Marker 1: Leben', 'Marker 1: Bewegung']);
});

test('CE2: Groß- und Kleinschreibung ist egal – wie in der Bibliothek', () => {
  assert.deepEqual(hits('AUSGUCK'), ['Ausguck']);
  assert.deepEqual(hits('ausguck'), ['Ausguck']);
});

test('CE3: Umlaute verhalten sich wie in der Bibliothek', () => {
  // `squashName` schiebt zusammen und macht klein, es faltet **keine**
  // Diakritika. Genau so sucht die Kartenbibliothek seit M8.5, und eine
  // zweite, freundlichere Regel hier wären zwei Antworten auf dieselbe Frage.
  assert.deepEqual(hits('rückseite'), ['Boss-Token Rückseite: Patches']);
  assert.deepEqual(hits('RÜCKSEITE'), ['Boss-Token Rückseite: Patches']);
  assert.deepEqual(hits('piñata'), ['"Sheriff"-Piñata']);
  assert.deepEqual(hits('pinata'), []);
});

test('CE4: eine leere Anfrage zeigt alles', () => {
  assert.equal(hits('').length, ASSETS.length);
  assert.equal(hits('   ').length, ASSETS.length);
});

test('CE5: die Wortreihenfolge ist egal, Leerzeichen im Namen auch', () => {
  assert.deepEqual(hits('leben marker 2'), ['Marker 2: Leben']);
  assert.deepEqual(hits('altesfass'), ['Altes Fass / Altes Fass (leer)']);
});

// ── Dass der Dialog sie benutzt ─────────────────────────────────────────────

test('CE6: der Tokendialog filtert über matchesCardSearch', () => {
  const at = source.indexOf('const tokenSearchHits');
  assert.ok(at > 0, 'der Dialog hat keine Trefferliste');
  assert.match(source.slice(at, at + 300), /matchesCardSearch\(/);
});

test('CE7: keine zweite Suche daneben (M6)', () => {
  // Genau ein Import, und jede Filterung im Tisch läuft über ihn.
  assert.equal((source.match(/from '\.\.\/\.\.\/\.\.\/shared\/cardSearch\.js'/g) || []).length, 1);
  assert.ok(!/toLowerCase\(\)\.includes\(\s*tokenSearch/.test(source),
    'der Dialog sucht an einer zweiten Stelle selbst');
});

test('CE8: das Eingabefeld steht im Dialog und räumt sich mit Escape', () => {
  const at = source.indexOf('data-testid="token-search-input"');
  assert.ok(at > 0, 'es gibt kein Suchfeld');
  const modal = source.indexOf('data-testid="token-modal"');
  const shapes = source.indexOf('data-testid={`token-shape-${shape}`}');
  assert.ok(at > modal && at < shapes, 'das Suchfeld steht nicht über dem Rollkasten');
  assert.match(source.slice(at - 900, at), /e\.key === 'Escape' && tokenSearch/);
});
