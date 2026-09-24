// M3c – ein von Hand ausgelegtes Bild-Asset taugt als Anker (Spec-Abschnitt
// "M3c — Ein von Hand ausgelegtes Brett taugt als Anker").
//
// Run with: npm test  (node --test, no test framework dependency)
//
// Ein Bild-Asset kam auf zwei Wegen auf den Tisch – `place_asset` und der
// „Add Token"-Dialog – und die beiden Wege bauten nicht dasselbe Objekt. Seit
// M3c gehen beide durch dieselbe Fabrik, und die steht deshalb in einem
// eigenen Modul: der Dialog ist eine React-Komponente und soll dafür nicht den
// ganzen Sequenz-Executor importieren müssen.
//
// Was hier geprüft wird:
//   * die Fabrik setzt die Felder, die der Dialog bisher weggelassen hat
//   * ein Token aus der Fabrik hat das Seitenverhältnis seines Bildes
//   * es taucht in der Ankerliste auf (das Abnahmekriterium der Spec)
//   * ein alter Spielstand mit nur `size` verhält sich unverändert
//   * verdeckt ohne Rückseite bleibt null (Spec-Abschnitt 6)
//   * ein Raster auf einem nicht-quadratischen Token (M3a/M3b über M3c)

import { test } from 'node:test';
import assert from 'node:assert/strict';

const { assetToken } = await import('../../shared/assetToken.js');
const { assetBox, anchorBoxes, resolveBox } = await import('../../shared/anchoring.js');

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** Der Hauptplan als table_assets-Zeile: breiter als hoch, mit Rückseite. */
function boardAsset(over = {}) {
  return {
    id: 'asset-board',
    name: 'Hauptplan',
    type: 'token',
    image_path: '/uploads/board-front.png',
    back_image_path: '/uploads/board-back.png',
    width: 1200,
    height: 1000,
    ...over,
  };
}

// ── Die Fabrik ───────────────────────────────────────────────────────────────

test('the factory sets assetId, both image sides, faceDown, width and height', () => {
  const t = assetToken(boardAsset(), 500, 400, false);
  assert.equal(t.assetId, 'asset-board');
  assert.equal(t.frontImageUrl, '/uploads/board-front.png');
  assert.equal(t.backImageUrl, '/uploads/board-back.png');
  assert.equal(t.faceDown, false);
  assert.equal(t.width, 1200);
  assert.equal(t.height, 1000);
  assert.equal(t.shape, 'image');
  assert.equal(t.label, 'Hauptplan');
  assert.equal(t.imageUrl, '/uploads/board-front.png', 'face up shows the front');
  assert.equal(t.size, 1200, 'size stays set for everything that only reads size');
  assert.equal(t.x, 500);
  assert.equal(t.y, 400);
});

test('the factory lays a token down unrotated (M7.1)', () => {
  // `rotation` steht neben `locked`: ein Feld, das jedes Tischobjekt hat, statt
  // eines, das erst der Sequenz-Executor nachtraegt. Ein Zustand ohne das Feld
  // liest sich als 0 - hier wird es angelegt, damit es gar nicht erst fehlt.
  assert.equal(assetToken(boardAsset(), 0, 0, false).rotation, 0);
});

test('a token laid face down shows its back and says so', () => {
  const t = assetToken(boardAsset(), 0, 0, true);
  assert.equal(t.faceDown, true);
  assert.equal(t.imageUrl, '/uploads/board-back.png');
  assert.equal(t.frontImageUrl, '/uploads/board-front.png');
});

test('face down without a back image places nothing (spec section 6)', () => {
  assert.equal(assetToken(boardAsset({ back_image_path: null }), 0, 0, true), null);
  assert.ok(assetToken(boardAsset({ back_image_path: null }), 0, 0, false), 'face up is fine');
});

test('an asset without a height yields a square token', () => {
  const t = assetToken(boardAsset({ height: null }), 0, 0, false);
  assert.equal(t.width, 1200);
  assert.equal(t.height, 1200, 'no height known → square, as before M3c');
  const box = assetBox(t);
  assert.equal(box.width, box.height);
});

// ── Ankern (das Abnahmekriterium) ────────────────────────────────────────────

test('a factory token keeps the aspect ratio of its image, centre-anchored', () => {
  const box = assetBox(assetToken(boardAsset(), 500, 400, false));
  assert.deepStrictEqual(box, {
    id: 'asset-board',
    label: 'Hauptplan',
    x: 500 - 1200 / 2,
    y: 400 - 1000 / 2,
    width: 1200,
    height: 1000,
  });
});

test('a hand-laid image asset IS offered as an anchor', () => {
  const t = assetToken(boardAsset(), 500, 400, false);
  const boxes = anchorBoxes([], [t]);
  assert.equal(boxes.length, 1, 'it must show up in the anchor list at all');
  assert.equal(boxes[0].id, 'asset-board', 'and it must be nameable by its asset id');
});

test('an old token that only has size behaves exactly as before', () => {
  const old = { id: 'tok-hand', x: 200, y: 200, size: 60 };
  assert.equal(assetBox(old), null, 'a hand-drawn token is deliberately not an anchor');
  assert.equal(anchorBoxes([old]).length, 0);
});

// ── M3c zurück an M3a/M3b ────────────────────────────────────────────────────

test('a grid on a non-square token covers the part of it that it names', () => {
  const anchor = assetBox(assetToken(boardAsset(), 500, 400, false));
  // Die rechte untere Viertelfläche des Bretts.
  const abs = resolveBox({ relX: 0.5, relY: 0.5, relWidth: 0.5, relHeight: 0.5 }, anchor);
  assert.deepStrictEqual(abs, { x: 500, y: 400, width: 600, height: 500 });
  // Vor M3c wäre der Anker 1200x1200 gewesen – das Raster säße 100px zu tief
  // und wäre 100px zu hoch.
  assert.notEqual(abs.height, 600);
});
