// Die **gezeichnete** Transformation des Tisches, einmal — nicht `.test.js`,
// damit `node --test "test/**/*.test.js"` sie nicht als Testdatei aufsammelt.
//
// Sie stand bis hierher in `camera-zoom.test.js` und wird jetzt auch von
// `table-views.test.js` gebraucht (Spec M14.13 Abnahme 3: geprüft gegen
// dieselbe Transformation, die `camera-zoom.test.js` benutzt — nicht gegen die
// eigene Umkehrfunktion, sonst wäre jede in sich stimmige Konvention grün,
// auch die falsche). Eine zweite Kopie wäre genau der Fehler, gegen den M10.2
// die Rechnung überhaupt an eine Stelle geholt hat.
//
// Gezeichnet wird mit `scale(z) translate(cam)` und `transform-origin: 50% 50%`:
//
//     Bildschirm = Mitte + (Welt + cam − Mitte) · z

/** Was der Browser aus einem Weltpunkt macht – die Zeile aus dem JSX. */
export function screenOf(world, camera, center) {
  return {
    x: center.x + (world.x + camera.x - center.x) * camera.zoom,
    y: center.y + (world.y + camera.y - center.y) * camera.zoom,
  };
}
