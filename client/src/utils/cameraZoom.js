/**
 * Die Kamera des Tisches – eine Konvention, eine Rechnung (Spec M10.2 Regel 2).
 *
 * Der Befund aus der dritten Solopartie: um den Fliesstext einer Karte zu
 * lesen, braucht es rund 130 Mausrad-Rasten plus mehrere Schwenks, weil das
 * Ziel beim Zoomen aus dem Bild wandert. Der Spieler ist dazu uebergegangen,
 * die Bild-URL in einem zweiten Browser-Tab zu oeffnen.
 *
 * **Die Spec vermutet einen Anker auf der Bildmitte. Es ist ein
 * Vorzeichenfehler.** Alle drei Zoomstellen (nativer Radhorcher, React-
 * Radhorcher, Pinch) rechnen den Zeiger ausdruecklich mit – nur in einer
 * Konvention, die der gezeichneten entgegengesetzt ist. Gezeichnet wird mit
 * `scale(z) translate(cam)` und `transform-origin: 50% 50%`:
 *
 *     Bildschirm = Mitte + (Welt + cam − Mitte) · z
 *     Welt       = (Bildschirm − Mitte)/z − cam + Mitte
 *
 * Gerechnet wurde `Welt = (Zeiger − Mitte)/z + cam`: **`+ cam` statt `− cam`**.
 * Die Kamera faehrt daraufhin um denselben Betrag in die falsche Richtung –
 * der Punkt unter dem Zeiger wandert doppelt so schnell aus dem Bild wie ohne
 * jede Nachfuehrung. Das ist die genaue Mechanik der 130 Rasten.
 *
 * Die Ursache war, dass dieselbe Matrix an **vier** Stellen von Hand invertiert
 * wurde (die drei Zoomstellen und `screenToWorld`) – eine hatte das Vorzeichen
 * falsch, und keine konnte die andere widerlegen. Darum steht sie jetzt hier,
 * einmal.
 *
 * Reine Logik, weil der Client keine Testinfrastruktur hat; geprueft aus
 * `server/test/camera-zoom.test.js` gegen die **gezeichnete** Transformation
 * und nicht gegen die eigene Umkehrfunktion.
 */

/** Die Grenzen, die bisher an drei Stellen ausgeschrieben standen. */
export const ZOOM_MIN = 0.2;
export const ZOOM_MAX = 5;

/**
 * Der Weltpunkt unter einem Bildschirmpunkt.
 *
 * @param {{x: number, y: number, zoom: number}} camera
 * @param {{x: number, y: number}} screen Relativ zur linken oberen Ecke des Containers.
 * @param {{x: number, y: number}} center Die halbe Containergroesse.
 */
export function worldAt(camera, screen, center) {
  const zoom = Number(camera?.zoom) || 1;
  return {
    x: (screen.x - center.x) / zoom - (camera?.x || 0) + center.x,
    y: (screen.y - center.y) / zoom - (camera?.y || 0) + center.y,
  };
}

/**
 * Die neue Kamera nach einem Zoomschritt, die den Weltpunkt unter `cursor`
 * festhaelt:
 *
 *     cam₁ = cam₀ + (Zeiger − Mitte) · (1/z₁ − 1/z₀)
 *
 * `zoom` ist der **gewuenschte** neue Zoom und wird hier geklemmt; am Anschlag
 * ist `1/z₁ − 1/z₀` null, die Kamera bleibt also von selbst stehen. Ein
 * unbrauchbarer Wunsch (NaN) laesst alles unveraendert, statt die Kamera mit
 * NaN zu vergiften – von dort kaeme sie ohne Neuladen nicht zurueck.
 *
 * @returns {{x: number, y: number, zoom: number}}
 */
export function zoomAt(camera, cursor, center, zoom) {
  const z0 = Number(camera?.zoom) || 1;
  const x0 = Number(camera?.x) || 0;
  const y0 = Number(camera?.y) || 0;
  const wanted = Number(zoom);
  if (!Number.isFinite(wanted)) return { x: x0, y: y0, zoom: z0 };

  const z1 = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, wanted));
  const shift = 1 / z1 - 1 / z0;
  return {
    x: x0 + (cursor.x - center.x) * shift,
    y: y0 + (cursor.y - center.y) * shift,
    zoom: z1,
  };
}
