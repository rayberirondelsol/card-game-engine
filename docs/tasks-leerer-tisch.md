# Aufgaben: der Tisch bleibt weiß bei Breite 0

Vorgeschichte: `docs/befund-leerer-tisch.md` (2026-11-07). Tests: `cd server && npm test`
(Stand vorher: **1362**, alle grün). Bau: `cd client && npx vite build` — nur die
zwei vorbestehenden Warnungen.

## Plan

1. **`client/src/utils/textureCache.js`** (neu), zwei Dinge:
   - `canDrawTexture(width, height)` — `true` nur bei endlichen Zahlen, beide ≥ 1.
   - `createTextureCache(makeCanvas, paint)` — der Zwischenspeicher samt
     Entscheidung. Bei „nein" kommt eine **geteilte 1×1-Leinwand** zurück, es wird
     weder `paint` gerufen noch etwas gespeichert. Die Leinwand wird per Einspritzung
     erzeugt, damit der Test in Node ohne DOM läuft.
2. **`GameTable.jsx`**: das Malen (`felt`/`wood`/`solid`) wird zu `paintTexture`,
   `getOrCreateTexture = createTextureCache(...)`. Die drei `draw…`-Funktionen und
   `renderCanvas` bleiben unverändert — es gibt genau **einen** Eintrittspunkt,
   kein Aufrufer bekommt eine eigene Prüfung.
3. **Test zuerst** (`server/test/texture-cache.test.js`), rot sehen, dann Code.
   Dazu eine Quellprüfung, dass `getOrCreateTexture` nicht an der Fabrik vorbei
   gebaut wird (Muster `client-hygiene.test.js`).

## Wo die Spec nicht stimmt

Im Browser nachgemessen (Chrome 152, dieselbe Engine wie der Produktionstisch).

1. **Der `solid`-Zweig ist nicht sicher.** Der Befund sagt, `solid` werfe nicht.
   Innerhalb von `getOrCreateTexture` stimmt das (`fillRect` und
   `createRadialGradient` vertragen 0). Aber die Funktion gibt dann eine **0 breite
   Leinwand** zurück, und der Aufrufer macht `ctx.drawImage(tex, 0, 0)` —
   das wirft `InvalidStateError: … a canvas element with a width or height of 0`.
   Drei der fünf Hintergründe (`slate`, `navy`, `green`) sind `solid`; auf ihnen
   wäre die Seite bei Breite 0 genauso weiß geblieben. Ein Fix, der nur die zwei
   Rauschzweige schützt (so lautet Punkt 1 des Befunds: „die zwei Rauschzweige"),
   hätte `solid` offen gelassen. Und das Zurückgeben irgendeiner Leinwand reicht
   nicht — sie muss ≥ 1×1 sein.
2. **„Die Ausnahme fliegt aus dem Render heraus" stimmt nicht.** Sie fliegt aus
   zwei `useEffect`s (`resize()` beim Einhängen, Zeile ~1048/1055, und dem
   „Re-render when state changes"-Effekt, Zeile ~1065). Folge dieselbe: in der
   ganzen App gibt es **keine Fehlergrenze** (`ErrorBoundary` kommt nirgends vor),
   React 19 hängt den Baum ab. Aber wer es mit einem Render-Fehler verwechselt,
   sucht an der falschen Stelle.
3. **Bruchteile, `NaN` und negative Werte können diesen Aufrufer nicht erreichen.**
   `renderCanvas` liest `canvas.width`/`canvas.height`, und die kürzt der Browser
   selbst auf ganze Zahlen (`0.5 → 0`, `NaN → 0`). Gerechnet wird `width * 3` —
   es kommt also genau `0` oder ≥ 3 an. Die Prüfung fängt sie trotzdem (sie ist
   eine allgemeine Funktion, und `getImageData(…, NaN, …)` würde sonst als
   `TypeError`, nicht als `IndexSizeError` scheitern), aber im echten Ablauf ist
   die Vorbedingung allein `0`.
4. **Bei Höhe 0 und Breite > 0 gilt dasselbe**, der Befund nennt sie nur in
   einer Klammer. `getImageData` wirft dann „The source height is 0".

## Gesehen, aber nicht angefasst (andere Ursache)

- **`CameraCardScanner.jsx`** — `getImageData` in `warpCanvas` (Z. 130) und
  `computeBlurScore` (Z. 176) könnten bei Videobreite 0 werfen. Andere Ursache
  (Kamerabild noch nicht da, nicht Layout), liegt in Klick-Handlern hinter
  `video.readyState`/`videoWidth`-Wächtern (Z. 314, 446), und `detectCardCorners`
  hat schon sein `try/catch`. Kein weißer Tisch daraus.
- **Der `textureCache` wächst bei jedem Resize.** Jede Fenstergröße legt eine
  neue Textur mit 3-facher Breite *und* Höhe an (4K: 11520×6480 ≈ 300 MB RGBA)
  und nichts räumt ab. Ein eigener Befund, nicht dieselbe Ursache.
- **Obergrenze der Leinwand:** `width * 3` × `height * 3` kann bei sehr großen
  Flächen (≈ 8K bei 1× Pixeldichte) die Flächengrenze des Browsers übersteigen;
  `getContext` liefert dann `null`. Gleiche Wirkung (weiße Seite), andere
  Ursache — im Browser nicht auslösbar gewesen (30000×30000 gab noch einen
  Kontext zurück), deshalb ungeprüft und nicht mitgenommen.
- **Keine Fehlergrenze in `main.jsx`.** Jeder Fehler in einem Effekt oder Render
  macht die ganze Seite weiß. Das ist eine Entscheidung (was zeigt man stattdessen?),
  keine Nebenbei-Änderung.

## Stand nachher

1391 Tests grün (vorher 1362, +29 in `server/test/texture-cache.test.js`). `vite build`:
nur die zwei bekannten Warnungen. Gegenprobe: Wächter entfernt, auf `=== 0`
verkürzt, Ersatz 0×0, Ersatz je Schlüssel zwischengespeichert, alte Verdrahtung
in `GameTable.jsx` — jeweils rot. Im Browser (echte Leinwand, Chrome 152) liefen
alle drei Typen mit 0×0, 0×9, 9×0, NaN, 0.5, −2 durch `drawImage` ohne Ausnahme.
Nicht deployt.
