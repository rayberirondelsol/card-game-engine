// Die NaN-Runde beim Laden eines Tisches — `drawableSize` in
// `shared/zoneGeometry.js` und der Rückfall in `client/src/components/ZoneShape.jsx`.
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Gemessen am 10.11.2026 beim Neuladen eines Tisches: gut 500 Konsolenfehler,
// alle derselben Form, die Konsole kappte bei 500.
//
//     Error: <rect> attribute width: Expected length, "NaN".
//     Error: <rect> attribute height: Expected length, "NaN".
//
// Die Ursache ist **kein** Rechenfehler, sondern eine Reihenfolge. Eine
// verankerte Zone (M31 EU/EO) trägt kein gespeichertes `x/y/width/height` — im
// Auszug `fixtures/auslagen-kurzpartie.json` sind das 43 von 54 Zonen. Ihre
// Maße entstehen erst in `resolveZones` aus dem Ankerkasten. Beim ersten
// Rendern liegt noch nichts auf dem Tisch, `anchorBoxes` ist leer,
// `resolveZones` findet keinen Anker und gibt die Zone **ohne** Geometrie
// zurück. Das ist so gewollt (`shared/anchoring.js`: ein fehlender Anker lässt
// die Zone an ihrer letzten Stelle und kennzeichnet sie) — nur rechnete
// `ZoneShape` daraus `Math.max(1, undefined)` = NaN und schrieb das in ein
// SVG-Attribut.
//
// Sichtbarer Schaden war keiner: die nächste Runde hat die Maße, im fertigen
// DOM standen 62 Rechtecke und keines mit NaN. Eine Runde ungültiges SVG ist
// trotzdem eine Runde zu viel — und 500 Meldungen verdecken die, auf die es
// ankommt.
//
// **Keine Vorgabemaße.** `box()` in derselben Datei setzt fürs Treffen und
// Legen 0/0/100×140 — richtig dort, falsch hier: ein Rahmen bei 0/0 wäre eine
// Zone, die liegt, wo keine liegt (der Geisterrahmen aus EO). `null` heißt
// „nicht zeichnen"; sobald die Maße da sind, wird gezeichnet, ohne Zutun.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { drawableSize, zoneShownInPlay } from '../../shared/zoneGeometry.js';
import { resolveZones, anchorBoxes } from '../../shared/anchoring.js';

const auszug = JSON.parse(
  readFileSync(new URL('./fixtures/auslagen-kurzpartie.json', import.meta.url), 'utf8'));
const ZONEN = auszug.zones;

// Wie `GameTable` auflöst: einmal je Render, gegen das, was auf dem Tisch liegt.
// Der erste Render hat noch keine Assets, also auch keine Anker.
const ERSTER_RENDER = resolveZones(ZONEN, []);
const MIT_ANKERN = resolveZones(ZONEN, anchorBoxes(auszug.state.boards, auszug.state.tokens));

// Was `ZoneOverlay` beim Spielen zeichnet (`GameTable`, ohne Ziehen).
const gezeichnet = (zonen) => zonen.filter(z => !z.facingAway && zoneShownInPlay(z));

// ── 1  Die reine Frage: gibt es Maße zu zeichnen? ────────────────────────────

test('Maße gibt es, wenn beide Zahlen sind und beide positiv', () => {
  assert.deepStrictEqual(drawableSize(114, 179.82), { w: 114, h: 179.82 });
  assert.deepStrictEqual(drawableSize(300, 400), { w: 300, h: 400 });
});

test('eine Zone unter einem Punkt Kantenlänge wird auf 1 gehoben, wie bisher', () => {
  // Der einzige Rest des alten `Math.max(1, …)`: eine 0,4 Punkte breite Zone
  // zeichnete schon immer einen Punkt breit, damit der Strich nicht verschwindet.
  assert.deepStrictEqual(drawableSize(0.4, 0.4), { w: 1, h: 1 });
  assert.deepStrictEqual(drawableSize(0.4, 200), { w: 1, h: 200 });
});

test('keine Zahl heißt keine Maße — das ist der gemessene Fall', () => {
  // `Math.max(1, undefined)` war NaN. Genau hier entstanden die 500 Meldungen.
  assert.equal(drawableSize(undefined, undefined), null);
  assert.equal(drawableSize(undefined, 140), null);
  assert.equal(drawableSize(100, undefined), null);
  assert.equal(drawableSize(null, null), null);
  assert.equal(drawableSize(NaN, 140), null);
  assert.equal(drawableSize(Infinity, 140), null);
  // Aus einer Zeichenkette wird nicht geschlossen: '100' ist keine Messung.
  // Dieselbe Regel, die `num()` in dieser Datei überall anwendet.
  assert.equal(drawableSize('100', '140'), null);
});

test('eine Zone ohne Fläche wird nicht gezeichnet', () => {
  // Deckungsgleich mit `zoneContains`, das `w <= 0` schon abweist: eine Zone
  // ohne Fläche nimmt nichts und fängt keinen Ablegevorgang. Ein Rahmen, der
  // nichts kann, ist kein Rahmen.
  assert.equal(drawableSize(0, 0), null);
  assert.equal(drawableSize(0, 140), null);
  assert.equal(drawableSize(-100, 140), null);
  assert.equal(drawableSize(100, -140), null);
});

// ── 2  Der gemessene Fall, am Auszug der Produktion ──────────────────────────

test('43 der 54 Zonen des Auszugs tragen kein eigenes width/height', () => {
  // Nicht als Mangel, sondern als Voraussetzung dieses Tests: hätten sie es,
  // gäbe es die NaN-Runde nicht.
  const ohne = ZONEN.filter(z => !Number.isFinite(z.width) || !Number.isFinite(z.height));
  assert.equal(ohne.length, 43);
  assert.ok(ohne.every(z => z.anchor?.assetId), 'und alle 43 hängen an einem Anker');
});

test('beim ersten Render hat Aktionen keine Maße, mit Anker 114 × 179,82', () => {
  const vorher = ERSTER_RENDER.find(z => z.label === 'Aktionen');
  assert.equal(vorher.anchorMissing, true, 'der Anker liegt noch nicht auf dem Tisch');
  assert.equal(drawableSize(vorher.width, vorher.height), null, 'also nichts zu zeichnen');

  const nachher = MIT_ANKERN.find(z => z.label === 'Aktionen');
  assert.deepStrictEqual(drawableSize(nachher.width, nachher.height), { w: 114, h: 179.82 },
    'und sobald der Anker da ist, wird gezeichnet — ohne Zutun');
});

test('29 Zonen hätten beim ersten Render ein NaN-Rechteck gezeichnet, keine tut es noch', () => {
  const nan = gezeichnet(ERSTER_RENDER).filter(z => Number.isNaN(Math.max(1, z.width)));
  assert.equal(nan.length, 29, 'die gemessene Ursache der gut 500 Meldungen');
  assert.ok(nan.every(z => drawableSize(z.width, z.height) === null));
});

test('keine gezeichnete Zone bekommt erfundene Maße', () => {
  // Der Geisterrahmen aus EO: 0/0/100×140 sind die Vorgaben von `box()` fürs
  // Treffen und Legen. Als Rahmen wären sie eine Behauptung über einen Ort.
  for (const z of gezeichnet(ERSTER_RENDER)) {
    const maße = drawableSize(z.width, z.height);
    if (maße === null) continue;
    assert.equal(maße.w, Math.max(1, z.width), 'die eigene Breite, keine andere');
    assert.equal(maße.h, Math.max(1, z.height), 'die eigene Höhe, keine andere');
  }
});

// ── 3  Dass `ZoneShape` auch fragt ───────────────────────────────────────────
//
// Der Client hat kein Testgerüst, JSX prüft nur der Bau. Was hier geprüft
// werden kann, ist der Quelltext: dass die Form die Frage stellt, dass sie es
// vor dem Rechnen tut, und dass der Ausdruck, der NaN erzeugte, weg ist.
// Dasselbe Verfahren wie in `zone-drag-visible.test.js`.

const shape = readFileSync(
  fileURLToPath(new URL('../../client/src/components/ZoneShape.jsx', import.meta.url)), 'utf8');

test('ZoneShape fragt drawableSize und hört ohne Maße auf', () => {
  assert.match(shape, /from '\.\.\/\.\.\/\.\.\/shared\/zoneGeometry\.js'/,
    'die Logik liegt in `shared/`, nicht im JSX');
  assert.match(shape, /drawableSize\(width, height\)/);

  // Der Rückfall muss **vor** der Form stehen, sonst rechnet sie trotzdem.
  const rückfall = shape.indexOf('return null');
  const figur = shape.indexOf('let figure');
  assert.ok(rückfall > 0, 'ohne Maße wird nichts gezeichnet');
  assert.ok(figur > rückfall, 'und zwar bevor die erste Form gerechnet wird');
});

test('der Ausdruck, der undefined zu NaN machte, steht nicht mehr da', () => {
  assert.doesNotMatch(shape, /Math\.max\(1,\s*width\)/);
  assert.doesNotMatch(shape, /Math\.max\(1,\s*height\)/);
});
