// Der Tisch bleibt nicht weiß, wenn die Fläche keine Breite hat
// (docs/befund-leerer-tisch.md, docs/tasks-leerer-tisch.md).
//
// Run with: npm test  (node --test, keine Test-Dependency)
//
// Der Client hat keine Testinfrastruktur, deshalb steht die Entscheidung
// „lohnt sich eine Textur?" samt Zwischenspeicher in einem reinen Modul, und die
// Leinwand wird eingespritzt. Gemessen im Browser (Chrome 152):
//   getImageData(0,0,0,h)      -> IndexSizeError  (die zwei Rauschzweige)
//   drawImage(Leinwand 0 breit) -> InvalidStateError (auch der `solid`-Zweig!)
// Die Ersatz-Leinwand muss also mindestens 1×1 sein, nicht nur „keine Ausnahme".

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { canDrawTexture, createTextureCache } = await import('../../client/src/utils/textureCache.js');

/** Eine Leinwand, die wie der Browser reagiert: Rauschen an Breite/Höhe 0 wirft. */
function fabrik() {
  const gebaut = [];
  const makeCanvas = (width, height) => {
    const c = { width, height };
    gebaut.push(c);
    return c;
  };
  return { makeCanvas, gebaut };
}

/** Malt wie `paintTexture`: wirft, wo `getImageData` werfen würde. */
function malen(canvas, type) {
  if (type !== 'solid' && (canvas.width === 0 || canvas.height === 0)) {
    throw new Error('IndexSizeError');
  }
  canvas.gemalt = type;
}

// ---------------------------------------------------------------- canDrawTexture

test('canDrawTexture: ganze Pixel ab 1 sind eine Textur', () => {
  assert.equal(canDrawTexture(1, 1), true);
  assert.equal(canDrawTexture(1920, 1080), true);
  assert.equal(canDrawTexture(1.5, 3), true); // wird beim Anlegen auf 1 gekürzt, bleibt ≥ 1
});

test('canDrawTexture: 0 in Breite oder Höhe ist keine Textur', () => {
  assert.equal(canDrawTexture(0, 600), false);
  assert.equal(canDrawTexture(800, 0), false);
  assert.equal(canDrawTexture(0, 0), false);
});

test('canDrawTexture: Bruchteile unter 1 sind keine Textur', () => {
  assert.equal(canDrawTexture(0.5, 600), false);
  assert.equal(canDrawTexture(800, 0.99), false);
});

test('canDrawTexture: NaN, Unendlich und negative Werte sind keine Textur', () => {
  assert.equal(canDrawTexture(NaN, 600), false);
  assert.equal(canDrawTexture(800, NaN), false);
  assert.equal(canDrawTexture(Infinity, 600), false);
  assert.equal(canDrawTexture(-5, 600), false);
  assert.equal(canDrawTexture(800, -1), false);
});

test('canDrawTexture: Nicht-Zahlen sind keine Textur', () => {
  assert.equal(canDrawTexture(undefined, 600), false);
  assert.equal(canDrawTexture(null, 600), false);
  assert.equal(canDrawTexture('800', 600), false);
});

// ------------------------------------------------------------ createTextureCache

for (const type of ['felt', 'wood', 'solid']) {
  for (const [w, h] of [[0, 600], [800, 0], [0, 0], [NaN, 600], [-3, 600], [0.5, 600]]) {
    test(`${type} bei ${w}×${h}: keine Ausnahme, Ersatz ist drawImage-tauglich (≥ 1×1)`, () => {
      const { makeCanvas } = fabrik();
      const get = createTextureCache(makeCanvas, malen);
      const tex = get(type, w, h, '#123456');
      assert.ok(tex.width >= 1 && tex.height >= 1, `Ersatz ist ${tex.width}×${tex.height}`);
    });
  }
}

test('verhinderte Größe wird weder gemalt noch zwischengespeichert', () => {
  const { makeCanvas, gebaut } = fabrik();
  let gemalt = 0;
  const get = createTextureCache(makeCanvas, (c, t) => { gemalt++; malen(c, t); });
  get('felt', 0, 600, '#123456');
  get('felt', 0, 600, '#123456');
  assert.equal(gemalt, 0);
  // nur die eine Ersatz-Leinwand, nicht eine je Aufruf
  assert.equal(gebaut.length, 1);
});

test('der Ersatz ist überall derselbe — er hängt nicht an Typ oder Größe', () => {
  const { makeCanvas } = fabrik();
  const get = createTextureCache(makeCanvas, malen);
  assert.equal(get('felt', 0, 600, '#111111'), get('wood', NaN, 5, '#222222'));
});

test('eine brauchbare Größe wird gemalt und beim zweiten Mal wiederverwendet', () => {
  const { makeCanvas, gebaut } = fabrik();
  let gemalt = 0;
  const get = createTextureCache(makeCanvas, (c, t) => { gemalt++; malen(c, t); });
  const a = get('felt', 800, 600, '#123456');
  const b = get('felt', 800, 600, '#123456');
  assert.equal(a, b);
  assert.equal(gemalt, 1);
  assert.equal(a.width, 800);
  assert.equal(a.height, 600);
  assert.equal(gebaut.length, 1);
});

test('Typ, Größe und Farbe trennen die Einträge', () => {
  const { makeCanvas } = fabrik();
  const get = createTextureCache(makeCanvas, malen);
  const basis = get('felt', 800, 600, '#123456');
  assert.notEqual(get('wood', 800, 600, '#123456'), basis);
  assert.notEqual(get('felt', 801, 600, '#123456'), basis);
  assert.notEqual(get('felt', 800, 600, '#654321'), basis);
});

test('nach einer verhinderten Größe geht dieselbe Größe wieder, wenn sie brauchbar wird', () => {
  const { makeCanvas } = fabrik();
  const get = createTextureCache(makeCanvas, malen);
  get('felt', 0, 600, '#123456'); // frisch geöffnet, noch ohne Breite
  const tex = get('felt', 3, 600, '#123456'); // Layout ist da
  assert.equal(tex.gemalt, 'felt');
  assert.equal(tex.width, 3);
});

// ------------------------------------------------------------------- Verdrahtung

test('GameTable baut getOrCreateTexture über createTextureCache', () => {
  const src = readFileSync(new URL('../../client/src/pages/GameTable.jsx', import.meta.url), 'utf8');
  assert.match(src, /const getOrCreateTexture = createTextureCache\(/);
  assert.doesNotMatch(src, /function getOrCreateTexture/);
});
