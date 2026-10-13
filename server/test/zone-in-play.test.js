// AS1 / Spec M15.5 — am Hotseat-Tisch wird jetzt auch gezeichnet, wo eine Zone endet.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Befund N5 der siebten Solopartie, zusammen mit Audit-Fund 8: `ZoneOverlay`
// hing ausschliesslich im `{room && (…)}`-Zweig von `GameTable.jsx`. Die
// Solopartie, fuer die der ganze Aufbau gebaut ist, sah keine einzige ihrer
// dreissig Zonen — weder Rahmen noch Namensschild. Der Spieler musste sich von
// Hand merken, wem welche Ausruestungskarte gehoert.
//
// Umgekehrt zeichnet der Raum **alle** Zonen, auch die sechzehn, die nur eine
// aufgedruckte Markerleiste nachzeichnen. Raster haben dafuer seit M3b ein
// `showInPlay`; Zonen bekommen hier dasselbe Feld — mit dem **umgekehrten**
// Vorgabewert, weil beide Vorgaben das bisherige Verhalten wiedergeben muessen:
// ein Raster wurde nie gezeichnet, eine Zone im Raum immer.
//
// Begruendung in `docs/tasks-partie7.md`, „Wo die Spec nicht stimmt (Teil 2)",
// Punkt 8.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { zoneShownInPlay } from '../../shared/zoneGeometry.js';

const source = readFileSync(
  fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');

test('AS1: ohne Feld wird gezeichnet – jede Zone aus der Zeit vor M15.5', () => {
  assert.equal(zoneShownInPlay({ label: 'Hand Dörfler 1' }), true);
  assert.equal(zoneShownInPlay({ showInPlay: undefined }), true);
  assert.equal(zoneShownInPlay({ showInPlay: null }), true);
  assert.equal(zoneShownInPlay({}), true);
});

test('AS1: nur ein ausdrückliches `false` legt eine Zone still', () => {
  assert.equal(zoneShownInPlay({ showInPlay: false }), false);
  assert.equal(zoneShownInPlay({ showInPlay: true }), true);
  // Kein Schluss aus Zeichenketten: `showInPlay: "false"` ist kein `false`,
  // und still zu raten waere schlimmer als zu zeichnen.
  assert.equal(zoneShownInPlay({ showInPlay: 'false' }), true);
});

test('AS1: eine fehlende Zone ist keine gezeichnete', () => {
  assert.equal(zoneShownInPlay(null), false);
  assert.equal(zoneShownInPlay(undefined), false);
});

test('AS1: der Zonen-Block haengt nicht mehr am Raum', () => {
  // Der ganze Block, von der Bedingung bis zum ZoneOverlay.
  const i = source.indexOf('<ZoneOverlay');
  assert.ok(i > 0, 'ZoneOverlay wird nicht mehr gezeichnet');
  const before = source.slice(0, i);
  // `{room && (` liegt im Quelltext weiterhin vor dem Overlay – aber nicht
  // mehr *zwischen* dem schliessenden Zweig und dem Overlay. Geprueft wird
  // darum die eigene Bedingung des Blocks.
  const block = before.slice(before.lastIndexOf('{!setupMode'));
  assert.match(block, /^\{!setupMode && /, 'der Block ist nicht mit !setupMode bewacht');
  assert.match(block, /zoneShownInPlay/, 'der Block filtert nicht über zoneShownInPlay');
  assert.doesNotMatch(block, /\{room && \(/, 'der Block haengt weiterhin im room-Zweig');
});

test('AS1: kein overflow-hidden auf einer Kameraebene', () => {
  // Der Behaelter ist `inset-0`, sein eigener Kasten also fensterhoch, und die
  // `transform` schiebt ihn erst danach. Mit `overflow-hidden` schnitt er jede
  // Zone weg, die in Weltkoordinaten unterhalb der Fensterhoehe liegt — die
  // Ausruestungszone bei y = 1808 stand im DOM und war nie zu sehen. Die
  // Tischebene mit den Karten hat aus demselben Grund keines; geklippt wird am
  // Wurzelbehaelter.
  assert.equal((source.match(/absolute inset-0 pointer-events-none overflow-hidden/g) || []).length, 0,
    'eine Kameraebene schneidet weiterhin am Fensterkasten ab');
  assert.ok((source.match(/className="absolute inset-0 pointer-events-none"/g) || []).length >= 3,
    'die drei Kameraebenen (Tisch, Zonen, Raster) sind nicht mehr gleich gebaut');
});

test('AS1: der Raum verhaelt sich unveraendert – die eigene Farbe reist mit', () => {
  const i = source.indexOf('<ZoneOverlay');
  const tag = source.slice(i, source.indexOf('/>', i) + 2);
  assert.match(tag, /myColor=\{room\?\.myColor/,
    'ohne room?.myColor faerbt der Raum die eigene Zone nicht mehr');
});
