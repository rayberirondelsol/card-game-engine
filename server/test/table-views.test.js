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

import { screenOf } from './drawn-transform.js';

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

// ─── AZ (Spec M14.13): eine Ansicht gilt in jedem Fenster ────────────────────
//
// Der Befund: `x`/`y` waren die **Kameraposition**, und `worldAt` liest sie als
// `Weltmitte = Containermitte − cam`. Dieselbe Ansicht zeigte in einem anderen
// Fenster auf eine andere Stelle — die halbe Maßdifferenz in Weltpunkten.
//
// Geprüft wird gegen `screenOf` aus `drawn-transform.js`, also gegen die
// **gezeichnete** Transformation und nicht gegen `viewCamera` selbst (Spec
// M14.13 Abnahme 3). Aufgaben: docs/tasks-ansichten.md, AZ.

const { viewCamera } = await import('../../client/src/utils/tableViews.js');

// 831 × 794 — das Fenster der sechsten Partie, in dem die beiden
// mitgelieferten Ansichten entstanden sind (docs/partie6-bericht.md).
const MITTE_SCHMAL = { x: 415.5, y: 397 };
// 1920 × 1080 — ein gewöhnliches Vollbild.
const MITTE_BREIT = { x: 960, y: 540 };

const dicht = (a, b, was) => assert.ok(Math.abs(a - b) < 1e-6, `${was}: ${a} != ${b}`);

test('AZ Abnahme 1: putView legt die Stelle am Tisch ab, und sie liegt mittig', () => {
  const [v] = putView([], 'Schlachtfeld', cam(-444, -163, 0.54), MITTE_SCHMAL);
  assert.equal(v.space, 'world');
  dicht(v.x, 859.5, 'Weltstelle x');
  dicht(v.y, 560, 'Weltstelle y');
  // Der gespeicherte Weltpunkt landet mit der gezeichneten Transformation
  // genau auf der Containermitte — geprüft gegen screenOf, nicht gegen viewCamera.
  const schirm = screenOf(v, cam(-444, -163, 0.54), MITTE_SCHMAL);
  dicht(schirm.x, MITTE_SCHMAL.x, 'Bildschirm x');
  dicht(schirm.y, MITTE_SCHMAL.y, 'Bildschirm y');
});

test('AZ Abnahme 2: im anderen Fenster steht dieselbe Stelle wieder mittig', () => {
  const [v] = putView([], 'Dörfler', cam(-734, -1278, 0.41), MITTE_SCHMAL);
  const stelle = { x: v.x, y: v.y };

  const kamera = viewCamera(v, MITTE_BREIT);
  assert.equal(kamera.zoom, 0.41, 'der Zoom bleibt');
  const schirm = screenOf(stelle, kamera, MITTE_BREIT);
  dicht(schirm.x, MITTE_BREIT.x, 'Bildschirm x');
  dicht(schirm.y, MITTE_BREIT.y, 'Bildschirm y');

  // Und im Fenster, in dem sie entstand, ist es die alte Kamera.
  const zurueck = viewCamera(v, MITTE_SCHMAL);
  dicht(zurueck.x, -734, 'Kamera x');
  dicht(zurueck.y, -1278, 'Kamera y');
});

test('AZ Abnahme 3: ein alter Eintrag ohne `space` bleibt eine Kameraposition', () => {
  const [alt] = normalizeViews([{ label: 'Schlachtfeld', x: -444, y: -163, zoom: 0.54 }]);
  assert.equal(alt.space, undefined);
  for (const mitte of [MITTE_SCHMAL, MITTE_BREIT, { x: 0, y: 0 }]) {
    const kamera = viewCamera(alt, mitte);
    dicht(kamera.x, -444, 'Kamera x');
    dicht(kamera.y, -163, 'Kamera y');
    assert.equal(kamera.zoom, 0.54, 'Zoom');
  }
});

test('AZ Abnahme 4: `space` übersteht normalizeViews — die Feldliste führt es', () => {
  const einmal = normalizeViews([{ label: 'Dörfler', x: 1149.5, y: 1675, zoom: 0.41, space: 'world' }]);
  assert.deepEqual(einmal, [{ label: 'Dörfler', x: 1149.5, y: 1675, zoom: 0.41, space: 'world' }]);
  // Zweimal durch, weil `putView` selbst normalisiert: genau so fiel der
  // Wurfzähler in M15.6 auf 0.
  assert.deepEqual(normalizeViews(einmal), einmal);
  const nachPut = putView(einmal, 'Schlachtfeld', cam(-444, -163, 0.54), MITTE_SCHMAL);
  assert.equal(nachPut[0].space, 'world', 'der alte Eintrag hat `space` verloren');
});

test('AZ Abnahme 5: ohne brauchbare Mitte legt putView die Kamera ab, ohne `space`', () => {
  for (const mitte of [undefined, null, { x: Number.NaN, y: 0 }]) {
    const [v] = putView([], 'A', cam(-444, -163, 0.54), mitte);
    assert.equal(v.space, undefined, 'eine geratene Mitte darf nicht als Welt gelten');
    assert.equal(v.x, -444);
    assert.equal(v.y, -163);
  }
});

test('AZ: viewCamera erträgt Unsinn, statt die Kamera mit NaN zu vergiften', () => {
  // Von dort käme sie ohne Neuladen nicht zurück – dieselbe Begründung wie bei
  // `zoomAt`. Ohne Mitte gilt die Ansicht als Kameraposition.
  const welt = { label: 'A', x: 100, y: 200, zoom: 0.5, space: 'world' };
  for (const kamera of [viewCamera(welt, null), viewCamera(welt, { x: Number.NaN, y: 0 })]) {
    assert.ok(Number.isFinite(kamera.x) && Number.isFinite(kamera.y), 'NaN in der Kamera');
  }
  assert.deepEqual(viewCamera(null, MITTE_SCHMAL), null);
});
