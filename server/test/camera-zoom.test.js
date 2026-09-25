// M10.2 Regel 2 – der Zoom folgt dem Mauszeiger (Aufgabe W3).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Befund: um eine Karte zu lesen, braucht es rund 130 Mausrad-Rasten plus
// mehrere Schwenks, weil das Ziel beim Zoomen aus dem Bild wandert. Die Spec
// vermutet einen Anker auf der Bildmitte. Es ist ein Vorzeichenfehler: alle
// drei Zoomstellen rechnen den Zeiger mit, aber in der Konvention
//
//     Welt = (Zeiger - Mitte)/z + cam
//
// waehrend gezeichnet wird mit `scale(z) translate(cam)` und
// `transform-origin: 50% 50%`, also
//
//     Bildschirm = Mitte + (Welt + cam - Mitte) * z
//     Welt       = (Bildschirm - Mitte)/z - cam + Mitte
//
// `+ cam` statt `- cam`: die Kamera faehrt um denselben Betrag in die falsche
// Richtung, der Punkt unter dem Zeiger wandert doppelt so schnell weg wie bei
// gar keiner Nachfuehrung.
//
// Geprueft wird deshalb gegen die **gezeichnete** Transformation, nicht gegen
// die Umkehrfunktion des Moduls: sonst waere jede in sich stimmige Konvention
// gruen, auch die falsche.
//
// Reine Logik, geprueft ohne Browser: der Client hat keine Testinfrastruktur.

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { zoomAt, worldAt, ZOOM_MIN, ZOOM_MAX } = await import('../../client/src/utils/cameraZoom.js');

const MITTE = { x: 500, y: 300 }; // halbe Fenstergroesse 1000 x 600

/** Was der Browser aus einem Weltpunkt macht – die Zeile aus dem JSX. */
function screenOf(world, camera, center) {
  return {
    x: center.x + (world.x + camera.x - center.x) * camera.zoom,
    y: center.y + (world.y + camera.y - center.y) * camera.zoom,
  };
}

const nahe = (a, b, was) => assert.ok(Math.abs(a - b) < 1e-6, `${was}: ${a} != ${b}`);

test('worldAt ist die Umkehrung der gezeichneten Transformation', () => {
  const cam = { x: -120, y: 75, zoom: 0.82 };
  const welt = { x: 640, y: 410 };
  const schirm = screenOf(welt, cam, MITTE);
  const zurueck = worldAt(cam, schirm, MITTE);
  nahe(zurueck.x, welt.x, 'x');
  nahe(zurueck.y, welt.y, 'y');
});

test('Abnahme 2: der Punkt unter dem Zeiger bleibt unter dem Zeiger', () => {
  const zeiger = { x: 830, y: 180 }; // rechts oben, weit weg von der Mitte
  const cam = { x: -120, y: 75, zoom: 0.82 };
  const vorher = worldAt(cam, zeiger, MITTE);

  const nachher = zoomAt(cam, zeiger, MITTE, cam.zoom * 1.1);
  const wieder = screenOf(vorher, nachher, MITTE);
  nahe(wieder.x, zeiger.x, 'x bleibt');
  nahe(wieder.y, zeiger.y, 'y bleibt');
});

test('Abnahme 2: auch ueber zwanzig Rasten hinweg', () => {
  const zeiger = { x: 830, y: 180 };
  let cam = { x: -120, y: 75, zoom: 0.47 };
  const ziel = worldAt(cam, zeiger, MITTE);
  for (let i = 0; i < 20; i++) {
    cam = zoomAt(cam, zeiger, MITTE, cam.zoom * 1.1);
  }
  const wieder = screenOf(ziel, cam, MITTE);
  nahe(wieder.x, zeiger.x, 'x bleibt');
  nahe(wieder.y, zeiger.y, 'y bleibt');
});

test('der Zeiger in der Mitte laesst die Kamera stehen', () => {
  const cam = { x: -120, y: 75, zoom: 1 };
  const nachher = zoomAt(cam, MITTE, MITTE, 1.1);
  nahe(nachher.x, cam.x, 'x');
  nahe(nachher.y, cam.y, 'y');
  nahe(nachher.zoom, 1.1, 'zoom');
});

test('das Vorzeichen: ein Zeiger rechts der Mitte faehrt die Kamera nach links', () => {
  // Beim Hineinzoomen waechst der Abstand des Punktes zur Bildmitte, also muss
  // die Kamera gegensteuern. Vorher stand hier ein Plus – und das Ziel flog
  // doppelt so schnell aus dem Bild.
  const cam = { x: 0, y: 0, zoom: 1 };
  const nachher = zoomAt(cam, { x: 900, y: 300 }, MITTE, 1.1);
  assert.ok(nachher.x < 0, `nach links, nicht nach rechts: ${nachher.x}`);
});

test('am Anschlag aendert sich weder Zoom noch Kamera', () => {
  const zeiger = { x: 830, y: 180 };
  const oben = zoomAt({ x: 10, y: 20, zoom: ZOOM_MAX }, zeiger, MITTE, ZOOM_MAX * 1.1);
  assert.deepEqual(oben, { x: 10, y: 20, zoom: ZOOM_MAX });
  const unten = zoomAt({ x: 10, y: 20, zoom: ZOOM_MIN }, zeiger, MITTE, ZOOM_MIN * 0.9);
  assert.deepEqual(unten, { x: 10, y: 20, zoom: ZOOM_MIN });
});

test('ein unbrauchbarer Zoom laesst die Kamera unveraendert, statt NaN zu setzen', () => {
  // Mit NaN kaeme die Kamera ohne Neuladen nicht zurueck.
  const cam = { x: 10, y: 20, zoom: 1 };
  assert.deepEqual(zoomAt(cam, { x: 1, y: 1 }, MITTE, NaN), cam);

  // Ein Wunsch unterhalb des Anschlags wird geklemmt und *dann* verankert –
  // die Kamera faehrt also mit, das ist richtig so.
  const zeiger = { x: 830, y: 180 };
  const ziel = worldAt(cam, zeiger, MITTE);
  const geklemmt = zoomAt(cam, zeiger, MITTE, 0);
  assert.equal(geklemmt.zoom, ZOOM_MIN);
  const wieder = screenOf(ziel, geklemmt, MITTE);
  nahe(wieder.x, zeiger.x, 'x bleibt');
  nahe(wieder.y, zeiger.y, 'y bleibt');
});

// ── M14.9 / AJ – eine Mausradrastung zoomt spürbar ──────────────────────────
//
// Der Befund der sechsten Solopartie: der Weg von 48 % auf 151 % (um ein
// Tableau zu lesen) und zurück kostet je 40–50 Rastungen — bei jedem Tableau,
// jedes Mal.
//
// **Die Spec sagt, der Schritt gehöre in `zoomAt`. Er stand nirgends hier.**
// `zoomAt` bekommt den *gewünschten* Zoom und klemmt ihn; der Schritt stand
// zweimal ausgeschrieben in `GameTable.jsx` (nativer und React-Radhorcher),
// als `0.9` bzw. `1.1` — dieselbe Doppelung, gegen die M10.2 den Rest der
// Rechnung überhaupt hierher geholt hat. Nebenbefund: `0,9 · 1,1 = 0,99`, die
// beiden Richtungen waren nicht zueinander invers.
//
// Begründung in `docs/tasks-partie6.md`, „Wo die Spec nicht stimmt", Punkt 5.

const { ZOOM_WHEEL_STEP, wheelZoom } = await import('../../client/src/utils/cameraZoom.js');

test('AJ1 Abnahme 1: fünf Rastungen decken den Weg von 50 % auf 100 %', () => {
  assert.ok(ZOOM_WHEEL_STEP ** 5 >= 2,
    `fünf Rastungen bringen nur das ${(ZOOM_WHEEL_STEP ** 5).toFixed(2)}-fache`);
  let cam = { x: 0, y: 0, zoom: 0.5 };
  for (let i = 0; i < 5; i++) cam = wheelZoom(cam, -1, { x: 0, y: 0 }, { x: 0, y: 0 });
  assert.ok(cam.zoom >= 1, `nach fünf Rastungen erst bei ${Math.round(cam.zoom * 100)} %`);
});

test('AJ1 Abnahme 2: hinein und wieder heraus landet beim Ausgangswert', () => {
  const mitte = { x: 500, y: 300 };
  const zeiger = { x: 820, y: 140 };
  const cam = { x: 10, y: 20, zoom: 1 };
  const hin = wheelZoom(cam, -1, zeiger, mitte);
  const zurueck = wheelZoom(hin, +1, zeiger, mitte);
  nahe(zurueck.zoom, cam.zoom, 'der Zoom');
  nahe(zurueck.x, cam.x, 'die Kamera x');
  nahe(zurueck.y, cam.y, 'die Kamera y');
});

test('AJ1 Abnahme 3: die Anschläge gelten unverändert', () => {
  const mitte = { x: 0, y: 0 };
  let cam = { x: 0, y: 0, zoom: ZOOM_MAX };
  assert.equal(wheelZoom(cam, -1, mitte, mitte).zoom, ZOOM_MAX);
  cam = { x: 0, y: 0, zoom: ZOOM_MIN };
  assert.equal(wheelZoom(cam, +1, mitte, mitte).zoom, ZOOM_MIN);
});

test('AJ1: der Zeiger bleibt auch beim Radzoom stehen', () => {
  // `wheelZoom` reicht an `zoomAt` weiter, statt die Rechnung zu wiederholen.
  const mitte = { x: 500, y: 300 };
  const zeiger = { x: 300, y: 480 };
  const cam = { x: -40, y: 75, zoom: 0.8 };
  const ziel = worldAt(cam, zeiger, mitte);
  const danach = wheelZoom(cam, -1, zeiger, mitte);
  const wieder = screenOf(ziel, danach, mitte);
  nahe(wieder.x, zeiger.x, 'x bleibt');
  nahe(wieder.y, zeiger.y, 'y bleibt');
});

test('AJ1 Abnahme 4: der Faktor steht nicht mehr im JSX', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const src = readFileSync(
    fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');
  assert.doesNotMatch(src, /0\.9 : 1\.1|1\.1 : 0\.9/, 'der Rastungsschritt steht wieder im JSX');
  // Beide Radhorcher – der native und der von React – fragen dieselbe Stelle.
  assert.equal((src.match(/wheelZoom\(/g) || []).length, 2, 'nicht beide Radhorcher benutzen `wheelZoom`');
});

test('AJ1 Nachtrag: ein Rad-Ereignis ergibt genau einen Zoomschritt', async () => {
  // Am laufenden Tisch nachgemessen: **eine** Rastung brachte von 66 % auf
  // 100 %, also das 1,52-fache — `ZOOM_WHEEL_STEP³`. Derselbe Horcher hängt an
  // `canvas` **und** an `container` (das Ereignis blubbert durch beide), und
  // darüber liegt noch der React-`onWheel`. Drei Anwendungen je Rastung.
  //
  // Mit 0,9/1,1 fiel das nicht auf; mit einem brauchbaren Schritt ist es die
  // Hälfte des Zooms. Das Ereignis selbst merkt sich deshalb, dass es schon
  // gezoomt hat — es ist in allen drei Fällen dasselbe Objekt.
  const { claimWheel } = await import('../../client/src/utils/cameraZoom.js');
  const ereignis = {};
  assert.equal(claimWheel(ereignis), true, 'der erste Horcher bekommt es');
  assert.equal(claimWheel(ereignis), false, 'der zweite zoomt noch einmal');
  assert.equal(claimWheel(ereignis), false, 'der dritte auch');
  // Das nächste Rad-Ereignis ist ein eigenes.
  assert.equal(claimWheel({}), true);
  assert.equal(claimWheel(null), false, 'ohne Ereignis kein Zoom');
});

test('AJ1 Nachtrag: das JSX fragt bei jedem Radweg nach', async () => {
  const { readFileSync } = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const src = readFileSync(
    fileURLToPath(new URL('../../client/src/pages/GameTable.jsx', import.meta.url)), 'utf8');
  // Zwei Horcher – der native (an zwei Elementen) und der von React.
  assert.equal((src.match(/claimWheel\(/g) || []).length, 2,
    'nicht jeder Radweg meldet sein Ereignis an');
});
