// M10.6 – Zähler und Schlachtfeld sind nie gleichzeitig bedienbar.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Derselbe Grund wie bei card-drop.test.js und spawn-slot.test.js: der Client
// hat keine Testinfrastruktur, also liegt der entscheidbare Teil – die Liste
// der benannten Ansichten – in einem reinen Modul.
//
// **Nicht die Zone trägt die Ansicht.** `createZone` setzt `cameraX/Y/Zoom` bei
// jeder Zone, `moveZone` hält sie auf der Mitte: es gibt keine Zone *ohne*
// Ansicht, und M10.6 Abnahme 3 wäre damit unerfüllbar. Begründung in
// docs/tasks-ergonomie.md, Vorab 1.
//
// Aufgaben: docs/tasks-ergonomie.md, U3.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { normalizeViews, putView, removeView, MAX_VIEWS } = await import(
  '../../client/src/utils/tableViews.js'
);
const { ZOOM_MIN, ZOOM_MAX } = await import('../../client/src/utils/cameraZoom.js');

const cam = (x, y, zoom) => ({ x, y, zoom });

test('U3 Abnahme 1: nichts Lesbares gibt eine leere Liste und wirft nicht', () => {
  assert.deepEqual(normalizeViews(null), []);
  assert.deepEqual(normalizeViews(undefined), []);
  assert.deepEqual(normalizeViews('Schlachtfeld'), []);
  assert.deepEqual(normalizeViews({}), []);
  assert.deepEqual(normalizeViews([]), []);
});

test('U3: eine brauchbare Ansicht überlebt normalizeViews unverändert', () => {
  const views = normalizeViews([{ label: 'Schlachtfeld', x: 120, y: -340, zoom: 0.82 }]);
  assert.deepEqual(views, [{ label: 'Schlachtfeld', x: 120, y: -340, zoom: 0.82 }]);
});

test('U3 Abnahme 3: eine unbrauchbare Stelle fällt heraus', () => {
  const views = normalizeViews([
    { label: 'gut', x: 0, y: 0, zoom: 1 },
    { label: 'ohne x', y: 10, zoom: 1 },
    { label: 'NaN', x: Number.NaN, y: 0, zoom: 1 },
    { label: '', x: 1, y: 2, zoom: 1 },
    { x: 1, y: 2, zoom: 1 },
    null,
  ]);
  assert.deepEqual(views.map(v => v.label), ['gut']);
});

test('U3 Abnahme 3: ein unbrauchbarer Zoom wird geklemmt, nicht verworfen', () => {
  const views = normalizeViews([
    { label: 'zu weit', x: 0, y: 0, zoom: 40 },
    { label: 'zu nah', x: 0, y: 0, zoom: 0.001 },
    { label: 'gar keiner', x: 0, y: 0 },
  ]);
  assert.equal(views[0].zoom, ZOOM_MAX);
  assert.equal(views[1].zoom, ZOOM_MIN);
  assert.equal(views[2].zoom, 1);
});

test('U3: putView hängt an und nimmt die Kamera, die dasteht', () => {
  const views = putView([], 'Schlachtfeld', cam(120, -340, 0.82));
  assert.deepEqual(views, [{ label: 'Schlachtfeld', x: 120, y: -340, zoom: 0.82 }]);
});

test('U3 Abnahme 2: derselbe Name ersetzt, verdoppelt nicht, und bleibt an seiner Stelle', () => {
  let views = putView([], 'Schlachtfeld', cam(0, 0, 1));
  views = putView(views, 'Dörfler', cam(10, 20, 0.5));
  views = putView(views, 'Schlachtfeld', cam(99, 98, 0.45));

  assert.equal(views.length, 2);
  assert.deepEqual(views.map(v => v.label), ['Schlachtfeld', 'Dörfler']);
  assert.deepEqual(views[0], { label: 'Schlachtfeld', x: 99, y: 98, zoom: 0.45 });
});

test('U3: ein leerer Name legt nichts an', () => {
  assert.deepEqual(putView([], '   ', cam(1, 2, 1)), []);
  assert.deepEqual(putView([], null, cam(1, 2, 1)), []);
});

test('U3: ein Name wird an den Rändern beschnitten', () => {
  assert.equal(putView([], '  Schlachtfeld  ', cam(1, 2, 1))[0].label, 'Schlachtfeld');
});

test('U3 Abnahme 4: über der Obergrenze wächst die Liste nicht weiter', () => {
  let views = [];
  for (let i = 0; i < MAX_VIEWS + 3; i++) views = putView(views, `V${i}`, cam(i, i, 1));
  assert.equal(views.length, MAX_VIEWS);
  // Die ersten bleiben – wer acht Ansichten hat, verliert nicht die alten,
  // sondern legt keine neunte an.
  assert.equal(views[0].label, 'V0');
});

test('U3: removeView nimmt genau eine heraus und lässt den Rest stehen', () => {
  let views = putView(putView([], 'A', cam(1, 1, 1)), 'B', cam(2, 2, 1));
  views = removeView(views, 'A');
  assert.deepEqual(views.map(v => v.label), ['B']);
  assert.deepEqual(removeView(views, 'gibt es nicht').map(v => v.label), ['B']);
  assert.deepEqual(removeView(null, 'A'), []);
});

test('U3: putView lässt die übergebene Liste unangetastet', () => {
  const before = putView([], 'A', cam(1, 1, 1));
  const after = putView(before, 'B', cam(2, 2, 1));
  assert.equal(before.length, 1);
  assert.equal(after.length, 2);
});

test('U3: eine Kamera ohne brauchbare Zahlen legt nichts an', () => {
  assert.deepEqual(putView([], 'A', null), []);
  assert.deepEqual(putView([], 'A', { x: Number.NaN, y: 0, zoom: 1 }), []);
});
