/**
 * Die Masse, mit denen ein Asset auf den Tisch kommt (M7.3).
 *
 * Eine Funktion, weil sie zwei Fragen beantwortet: wie gross das Token wird
 * *und* wie viele Rasterfelder es belegt. Zwei Rechnungen waeren zwei
 * Antworten – ein Stueck, das andere Felder belegt, als es bedeckt.
 *
 * Der Rueckfall von `height` auf die Breite ist der Grund, dass es sie gibt:
 * ohne ihn gaebe ein Asset mit leerer `height` gar keine Ableitung (eine
 * unbrauchbare Groesse ergibt keine Grundflaeche) und belegte still ein Feld.
 */
export function assetSize(asset) {
  const width = asset?.width || 60;
  return { width, height: asset?.height || width };
}

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
  const { width, height } = assetSize(asset);
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
    height,
    x,
    y,
    attachedTo: null,
    attachedCorner: null,
    locked: false,
    rotation: 0,
  };
}

/** Die vier Winkel, die ein Plättchen auf einem Raster einnehmen kann (M7.1). */
export const ROTATIONS = [0, 90, 180, 270];

/**
 * Ein Drehwinkel aus dem, was dasteht – oder `null`, wenn es keiner ist (M7.1).
 *
 * Eine Funktion, nicht zwei: wer meldet, fragt auf `null`; wer legt, nimmt
 * `?? 0`. Nichts dazustehen ist kein Fehler, sondern die Vorgabe – `rotation`
 * fehlt in jedem Spielstand von vor M7.1 und in jeder Sequenz, die ohne
 * Drehung auskommt.
 */
export function rotationOf(value) {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  return ROTATIONS.includes(n) ? n : null;
}

/**
 * Die eine Definition davon, was Umdrehen heißt (Spec M3d): `faceDown` setzen
 * UND `imageUrl` zwischen Vorder- und Rückseite tauschen. Nur `faceDown` zu
 * kippen ließe das alte Bild stehen.
 *
 * Nimmt die Zielseite, nicht ein Umschalten – `set_asset_face` setzt eine
 * absolute Seite, das Kontextmenü rechnet sich `!obj.faceDown` selbst aus.
 * Gibt die beiden Felder zurück, die der Aufrufer auf sein Objekt legt, oder
 * `null`, wenn es die gewünschte Seite nicht gibt (verdeckt ohne Rückseite).
 * Das Objekt selbst wird nicht angefasst.
 */
export function assetFace(obj, faceDown) {
  const down = Boolean(faceDown);
  if (down && !obj.backImageUrl) return null;
  return { faceDown: down, imageUrl: down ? obj.backImageUrl : (obj.frontImageUrl || obj.imageUrl) };
}
