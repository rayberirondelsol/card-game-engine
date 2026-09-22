/**
 * Build a table token from a table_asset row – the one factory both ways onto
 * the table go through (spec milestone M3c).
 *
 * Es gab diese Fabrik schon, aber nur im sequenceExecutor; der „Add Token"-
 * Dialog baute sein eigenes Literal und ließ `assetId`, die beiden Bildseiten
 * und `faceDown` weg. Ein so ausgelegtes Brett tauchte damit nicht in der
 * Ankerliste auf (`assetBox` gibt ohne `assetId` null zurück) und ließ sich
 * nicht umdrehen. Deshalb steht sie jetzt in einem eigenen Modul: eine React-
 * Komponente soll dafür nicht den ganzen Sequenz-Executor importieren.
 *
 * `width`/`height` kommen aus dem Asset, damit ein Token das Seitenverhältnis
 * seines Bildes behält – ein Hauptplan 3000x2500 in einem Quadrat sitzt mit
 * Rand darin, und ein Raster auf dem aufgedruckten Raster müsste diesen Rand
 * mitrechnen. `size` bleibt gesetzt: alte Spielstände haben nur das, und alles,
 * was nur `size` liest, funktioniert unverändert weiter.
 *
 * Laying an object face down needs a back side; without one it is NOT placed
 * (spec §6) – an unintentionally face-up token gives away exactly the
 * information that was meant to stay hidden, and nobody would notice. The
 * caller turns the null into a protocol entry.
 */
export function assetToken(asset, x, y, faceDown) {
  const back = asset.back_image_path || null;
  if (faceDown && !back) return null;
  const down = Boolean(faceDown);
  const width = asset.width || 60;
  return {
    id: crypto.randomUUID(),
    assetId: asset.id,
    shape: 'image',
    color: null,
    label: asset.name || '',
    imageUrl: down ? back : asset.image_path,
    frontImageUrl: asset.image_path,
    backImageUrl: back,
    faceDown: down,
    size: width,
    width,
    height: asset.height || width,
    x,
    y,
    attachedTo: null,
    attachedCorner: null,
    locked: false,
  };
}
