/**
 * Texturen für den Tischhintergrund – und wann es keine gibt.
 *
 * Der Befund (`docs/befund-leerer-tisch.md`): in einem Bereich ohne Breite
 * (frisch geöffnetes Fenster, ausgeblendetes Panel) lief `getImageData` auf einer
 * 0 breiten Leinwand, warf, und die ganze Seite blieb weiß. Im Browser gemessen
 * ist es **nicht nur** `getImageData`: auch `drawImage(Leinwand mit Breite 0)`
 * wirft (`InvalidStateError`), und das trifft den `solid`-Zweig, der beim Malen
 * selbst nichts wirft. Der Ersatz für „keine Textur" ist deshalb eine echte,
 * leere 1×1-Leinwand – `drawImage` verträgt sie und malt nichts Sichtbares; die
 * Grundfarbe liegt in `renderCanvas` ohnehin schon darunter.
 */

/** Ist `width`×`height` eine Fläche, auf der eine Textur gemalt werden kann? */
export function canDrawTexture(width, height) {
  // Der Browser kürzt die Leinwandgröße auf ganze Zahlen: 0.99 wird 0.
  return Number.isFinite(width) && Number.isFinite(height) && width >= 1 && height >= 1;
}

/**
 * @param {(width: number, height: number) => object} makeCanvas
 *   legt eine Leinwand an (im Browser `document.createElement('canvas')`)
 * @param {(canvas: object, type: string, width: number, height: number, baseColor: string) => void} paint
 *   malt die Textur auf die frisch angelegte Leinwand
 * @returns {(type: string, width: number, height: number, baseColor: string) => object}
 */
export function createTextureCache(makeCanvas, paint) {
  const cache = new Map();
  let empty = null;

  return function getOrCreateTexture(type, width, height, baseColor) {
    // Eine verhinderte Größe kommt nie in den Zwischenspeicher: sie ist keine
    // Textur, und derselbe Schlüssel soll wieder gehen, sobald das Layout steht.
    if (!canDrawTexture(width, height)) {
      empty ??= makeCanvas(1, 1);
      return empty;
    }
    const key = `${type}-${width}-${height}-${baseColor}`;
    let tex = cache.get(key);
    if (!tex) {
      tex = makeCanvas(width, height);
      paint(tex, type, width, height, baseColor);
      cache.set(key, tex);
    }
    return tex;
  };
}
