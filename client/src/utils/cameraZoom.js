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

/**
 * Was eine Mausradrastung am Zoom aendert (Spec M14.9).
 *
 * Der Befund der sechsten Solopartie: der Weg von 48 % auf 151 % und zurueck
 * kostet je 40–50 Rastungen — bei jedem Tableau, das man lesen will, jedes Mal.
 *
 * Der Schritt stand bis hierher **zweimal** ausgeschrieben in `GameTable.jsx`
 * (nativer und React-Radhorcher), als `0.9` bzw. `1.1`: dieselbe Doppelung,
 * gegen die M10.2 den Rest der Rechnung ueberhaupt hierher geholt hat. Und die
 * beiden Zahlen waren nicht zueinander invers — `0,9 · 1,1 = 0,99`, hinein und
 * wieder heraus landete jedes Mal ein Prozent tiefer.
 *
 * `1.15` ist die kleinste bequeme Zahl, die die Abnahme traegt: fuenf
 * Rastungen sind `1,15⁵ = 2,01`, also der Weg von 50 % auf 100 %.
 */
export const ZOOM_WHEEL_STEP = 1.15;

/**
 * Die neue Kamera nach einer Mausradrastung.
 *
 * Eine Rastung hinaus ist genau der Kehrwert einer Rastung hinein. Gerechnet
 * wird nicht hier, sondern in `zoomAt` — sonst stuende die Verankerung am
 * Zeiger zum vierten Mal irgendwo.
 *
 * @param {{x: number, y: number, zoom: number}} camera
 * @param {number} deltaY Vorzeichen des Rades; positiv heisst heraus.
 * @param {{x: number, y: number}} cursor Zeiger, relativ zum Container.
 * @param {{x: number, y: number}} center Halbe Containergroesse.
 */
export function wheelZoom(camera, deltaY, cursor, center) {
  const z0 = Number(camera?.zoom) || 1;
  const step = deltaY > 0 ? 1 / ZOOM_WHEEL_STEP : ZOOM_WHEEL_STEP;
  return zoomAt(camera, cursor, center, z0 * step);
}

/**
 * Gehoert dieses Rad-Ereignis noch keinem Zoomschritt? (Spec M14.9, Nachtrag)
 *
 * Am laufenden Tisch nachgemessen: **eine** Rastung brachte von 66 % auf 100 %,
 * also `ZOOM_WHEEL_STEP³`. Derselbe native Horcher haengt an `canvas` **und**
 * an `container` – ein Rad ueber dem Tisch blubbert durch beide –, und darueber
 * liegt noch der React-`onWheel` ("backup for native event approach"). Drei
 * Anwendungen je Rastung.
 *
 * Mit `0.9`/`1.1` fiel das nicht auf (`1,1³ = 1,33`, unangenehm fein genug, um
 * als "zu fein" durchzugehen). Mit einem brauchbaren Schritt ist es die Haelfte
 * des Zooms, und die Abnahme waere um das Dreifache uebererfuellt.
 *
 * Gemerkt wird es am Ereignis und nicht an einer Uhr: die drei Horcher sehen
 * **dasselbe** Objekt, das naechste Rad bringt ein eigenes. Eine Zeitschwelle
 * waere geraten und wuerde schnelles Drehen verschlucken.
 *
 * @param {object|null} nativeEvent Das native `WheelEvent` (bei React
 *   `e.nativeEvent`).
 * @returns {boolean} true genau beim ersten Aufruf je Ereignis.
 */
export function claimWheel(nativeEvent) {
  if (!nativeEvent || nativeEvent.__cgeZoomed) return false;
  nativeEvent.__cgeZoomed = true;
  return true;
}
