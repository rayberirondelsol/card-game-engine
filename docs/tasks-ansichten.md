# Aufgaben: Eine Ansicht gilt in jedem Fenster (Spec M14.13)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M14.13**. Die Vorgeschichte
steht in **M14.4** (die beiden Ansichten „Schlachtfeld" und „Dörfler" liegen seit
dort in den Daten) und in **M10.6** (warum der Spielstand der Träger ist und
nicht die Zone).

**Aufgabenbuchstaben.** `A1`–`AY` sind vergeben (zuletzt `AP`–`AV` in
`docs/tasks-partie7.md`, `AW`–`AY` davor). Hier geht es mit `AZ` weiter, dann
`BA`, `BB`. `BA` kollidiert nicht mit `B1`–`B6`: dort steht immer eine Ziffer.

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: **1114**, alle
grün). Bau: `cd client && npx vite build` — keine **neue** Warnung; zwei sind
vorbestehend (`Duplicate "data-testid" attribute` in `GameTable.jsx`, Chunk über
500 kB). Der Client hat keine Testinfrastruktur (CLAUDE.md): reine Rechnung
gehört nach `client/src/utils/tableViews.js` und wird aus
`server/test/table-views.test.js` geprüft.

Schichten hier:

1. **Reine Rechnung** — `client/src/utils/tableViews.js` (benutzt `worldAt` aus
   `client/src/utils/cameraZoom.js`, die einzige Umrechnung zwischen Kamera und
   Welt)
2. **Verdrahtung** — `client/src/pages/GameTable.jsx` (nur vom Vite-Build
   geprüft)
3. **Daten** — `setups.state_data` der beiden TFT-Aufbauten

---

## Wo die Spec nicht stimmt

Fünf Stellen. Zwei verschieben, wo gebaut wird; eine nimmt einer Abnahme die
Grundlage; zwei Behauptungen stimmen und sind nachgerechnet.

### 1. `goToView` liegt **nicht** in `tableViews.js`, und kann dort auch nicht ganz hin

Die Spec sagt: „`putView` rechnet die Weltmitte aus […] `goToView` rechnet sie
zurück. **Beides** in `client/src/utils/tableViews.js`."

Nachgesehen: `tableViews.js` exportiert `MAX_VIEWS`, `normalizeViews`, `putView`
und `removeView` — **kein `goToView`**. `goToView` ist eine lokale Funktion in
`client/src/pages/GameTable.jsx` (Zeile 3334) und tut vier Dinge, von denen drei
nicht in ein reines Modul können:

```js
function goToView(view) {
  const camera = cameraRef.current;     // React-Ref
  camera.x = view.x; camera.y = view.y; camera.zoom = view.zoom;
  setZoomDisplay(...); setPanPosition(...);  // React-State
  renderCanvas();                        // Zeichnen
  setShowViews(false);                   // Menü zu
}
```

**Also:** nach `tableViews.js` wandert nur die *Rechnung* — eine neue exportierte
Funktion, die aus einer Ansicht und der Containergröße die Kamera macht.
`goToView` bleibt in `GameTable.jsx` und ruft sie auf. Das ist dieselbe
Arbeitsteilung, die `putView` schon hat (Regeln im Modul, `setViews` am Tisch),
und es ist die einzige Form, in der die Rechnung testbar wird — ein Test kann
`cameraRef` und `renderCanvas` nicht stellen.

### 2. Keine der drei Funktionen kennt die Containergröße — der Aufrufer muss sie hereinreichen

`normalizeViews`, `putView` und `removeView` nehmen heute nur Liste, Name und
Kamera. `tableViews.js` importiert aus dem Browser nichts und hat keinen Zugriff
auf ein DOM-Element; es importiert genau `ZOOM_MIN`/`ZOOM_MAX`.

Woher der Aufrufer sie nimmt: `GameTable.jsx` hält `containerRef` auf das
äußere `<div className="w-screen h-screen …">` (Zeile 4786), und
`containerRef.current.getBoundingClientRect()` liefert `width`/`height`. Dieselbe
Quelle benutzen `screenToWorld` (Zeile 491) und `viewCenter` (Zeile 511) bereits.

**Zum Zeitpunkt des Speicherns ist sie bekannt.** Der Namensdialog
(`view-save-modal`) liegt *innerhalb* derselben Komponente; wer ihn öffnen kann,
hat einen gemounteten Container. `confirmSaveView` läuft also nie ohne Rechteck.
Trotzdem gehört ein Rückfall hinein: fehlt das Rechteck doch, wird wie bisher die
Kamera abgelegt — eine Ansicht, die in *einem* Fenster stimmt, ist besser als
eine mit `NaN`, aus der die Kamera ohne Neuladen nicht zurückkäme (dieselbe
Begründung wie bei `zoomAt`).

### 3. `getGameState`/`loadGameState` führen **keine** Feldliste für Ansichten — die Feldliste steht in `tableViews.js`

Der Auftrag fragt, ob beide Feldlisten die neuen Felder führen, mit Verweis auf
den Wurfzähler (M15.6) und den Mischzähler (M15.4/AP3). Die Frage hat hier keine
Grundlage: `getGameState` schreibt `views` als **ganzes Array** (Zeile 3554),
`loadGameState` liest `normalizeViews(state.views)` (Zeile 3967). Es gibt dort
nichts, was je Ansicht Felder aufzählt. Der Server rührt `views` nicht an — ein
`grep` über `server/src` und `shared/` findet das Wort nicht, `state_data` ist
dort ein undurchsichtiger JSON-Text.

**Die Gefahr ist aber echt und liegt eine Ebene tiefer.** `view()` in
`tableViews.js` baut jedes Mal ein **neues** Objekt:

```js
return { label: name, x, y, zoom };
```

Was dort nicht steht, ist nach dem nächsten `normalizeViews` weg — und
`normalizeViews` läuft bei jedem Laden *und* in `putView`. Das ist genau der
M15.6-Fehler, nur an einer anderen Stelle: ein Feld, das der Schreiber kennt und
der Leser verwirft. Das neue Feld muss hier hinein, und die Abnahme prüft genau
das: einmal durch `normalizeViews` und wieder heraus, unverändert.

### 4. „Der Münztopf rutscht aus dem Bild" trifft für 1920 × 1080 nicht zu

Nachgerechnet für „Dörfler" (`cam (−734, −1278)`, Zoom 0,41):

| Fenster | Weltmitte | sichtbarer Weltbereich x | y |
|---|---|---|---|
| 831 × 794 | (1149,5 / 1675) | 136 … 2163 | 707 … 2643 |
| 1920 × 1080 | (1694 / 1818) | −647 … 4035 | 501 … 3135 |

Der alte Ausschnitt liegt **vollständig** im neuen. Ein größeres Fenster zeigt
bei gleichem Zoom mehr, nicht weniger; verloren gehen kann dabei nichts.

Was wirklich passiert, ist das, was die Spec im Satz davor richtig rechnet: der
Inhalt sitzt um die halbe Maßdifferenz **daneben**, (1089/2, 286/2) =
**544,5 nach links und 143 nach oben** relativ zur neuen Bildmitte. „Dörfler"
zeigt dann nicht die Dörfler in der Mitte, sondern die Dörfler oben links und
rechts daneben Tischplatte. Abgeschnitten wird erst beim Wechsel in ein
**kleineres oder anders geformtes** Fenster — und das ist der Fall, der im
Betrieb vorkommt, weil die Ansichten in 831 × 794 entstanden sind und jedes
heutige Fenster breiter ist.

**Folge für die Abnahme:** Abnahme 1 der Spec bleibt wörtlich stehen, denn sie
prüft genau das Richtige („dieselbe Stelle des Tisches, **mittig**") und nicht
das Abschneiden. Der Zusatz „nur mehr Rand drumherum" ist die korrekte
Beschreibung dessen, was ein größeres Fenster tut.

### 5. Zwei Behauptungen stimmen — nachgerechnet, nicht übernommen

**`worldAt` rechnet Weltmitte = Containermitte − cam.** Eingesetzt
`screen = center`:

```
x = (center.x − center.x)/zoom − cam.x + center.x = center.x − cam.x
```

Dieselbe Rechnung in Gegenrichtung ist **dieselbe Formel**: aus
`cam = center − welt` folgt `welt = center − cam`. Die Abbildung ist ihre eigene
Umkehrung. Das ist der Grund, warum keine zweite Umrechnung nötig ist:
`worldAt(v, center, center)` liefert hin *und* zurück, je nachdem, ob `v` eine
Kamera oder eine Weltstelle trägt.

**Die Containermitte ist die halbe Fenstergröße.** Der Container ist das `<div
className="w-screen h-screen relative overflow-hidden …">` aus Zeile 4786 —
Fensterbreite und -höhe, keine innere Fläche, keine Leiste darüber. Die beiden
Hauptleisten liegen seit M14.5 *über* dem Tisch und nehmen ihm keinen Platz. Nur
in CSS-Pixeln gemessen, aber das gilt für beide Seiten der Rechnung.

**Die Daten stehen so, wie die Spec sagt** (in der Produktionsdatenbank
nachgesehen, Spiel `072123c0-cd97-4ffb-a330-369630fab93f`):

| Aufbau | Ansichten |
|---|---|
| `TFT Kurzpartie (3 Bösewichte, beide Erweiterungen)` | Schlachtfeld `(−444, −163)` z 0,54 · Dörfler `(−734, −1278)` z 0,41 |
| `TFT Grundaufbau (Dorfphase)` | dieselben zwei, zeichengleich |
| `TFT Basis-Aufbau` | keine (`views` fehlt) |

Dass sie für 831 × 794 gerechnet sind, steht in `docs/partie6-bericht.md` Zeile 4
(„Fenster 831×794") und ist in den Daten selbst nicht hinterlegt — genau das ist
der Befund. Der dritte Aufbau bleibt unberührt: er hat keine Ansicht.

---

## AZ — Eine Ansicht legt die Stelle am Tisch ab, nicht die Kamera

**Befund.** `view()` in `client/src/utils/tableViews.js` schreibt
`{label, x, y, zoom}`, und `x`/`y` sind die Kameraposition aus `cameraRef`.
`goToView` setzt sie unverändert zurück in die Kamera. Zwischen Speichern und
Aufrufen steht keine Containergröße — also verschiebt jede Änderung der
Fenstergröße den Ausschnitt um die halbe Maßdifferenz in Weltpunkten
(831 × 794 → 1920 × 1080: 544,5 und 143).

**Änderung.** In `tableViews.js`, mit `worldAt` als einziger Umrechnung:

1. `putView(views, label, camera, center)` bekommt die Containermitte als
   vierten Parameter und legt `worldAt(camera, center, center)` ab — die
   Weltstelle in der Bildmitte. Dazu **ein** unterscheidendes Feld:
   `space: 'world'`.
2. Neu exportiert: `viewCamera(view, center)` gibt die Kamera, mit der diese
   Ansicht in *diesem* Container dieselbe Stelle mittig zeigt. Bei
   `space === 'world'` über dieselbe `worldAt`-Zeile (die Abbildung ist ihre
   eigene Umkehrung, siehe „Wo die Spec nicht stimmt", 5), sonst `x`/`y`
   unverändert als Kamera.
3. `view()` reicht `space` durch, sonst verwirft `normalizeViews` es beim ersten
   Laden (siehe „Wo die Spec nicht stimmt", 3).
4. Ohne brauchbares `center` legt `putView` wie bisher die Kamera ab, **ohne**
   `space` — ein in einem Fenster gültiger Eintrag statt `NaN`.

**Warum `space` und nicht ein zweites Zahlenpaar `wx`/`wy`.** Beides
unterscheidet durch Abwesenheit, aber `wx`/`wy` verdoppelt die Prüfung in
`view()` (zwei Paare, zwei Gültigkeitsfälle, ein Mischfall) und zwingt jeden
Leser, sich zu fragen, was gilt, wenn beide dastehen. `space` lässt die Prüfung
von `x`/`y` buchstäblich stehen und beantwortet genau die eine Frage, die offen
ist: in welchem Bezugssystem die beiden Zahlen gemeint sind. Ein alter Eintrag
hat kein `space` und wird damit weiter als Kamera gelesen — ohne Migration, weil
`state_data` beim Server ein JSON-Text ist.

**Abnahme.**
1. `putView` mit Kamera `(−444, −163)` und Mitte `(415,5 / 397)` legt
   `space: 'world'` und die Weltstelle `(859,5 / 560)` ab. Geprüft gegen
   `screenOf` — die **gezeichnete** Transformation aus `camera-zoom.test.js`,
   nicht gegen `viewCamera`: der Weltpunkt, den die Ansicht trägt, landet mit
   `screenOf` genau auf der Containermitte.
2. Hin und zurück in **verschiedenen** Fenstern: gespeichert bei 831 × 794,
   aufgerufen bei 1920 × 1080 — `screenOf(stelle, viewCamera(ansicht, mitte₂),
   mitte₂)` liegt auf `mitte₂`. Zoom unverändert.
3. Ein alter Eintrag **ohne** `space` liefert aus `viewCamera` genau seine
   `x`/`y` zurück, in jeder Containergröße (Spec-Abnahme 2).
4. `normalizeViews` führt `space` durch; ein Eintrag mit `space: 'world'`
   übersteht Hin- und Herlaufen durch `normalizeViews` unverändert.
5. `putView` ohne Mitte (`null`) legt die Kamera ab und **kein** `space`.
6. Die bestehenden Ansichtstests bleiben grün; `MAX_VIEWS`, Ersetzen am Platz,
   Namenstrimmen und `removeView` sind unberührt.

---

## BA — Der Tisch reicht die Containergröße in beide Richtungen herein

**Befund.** `confirmSaveView` (Zeile 3367) ruft
`putView(prev, label, cameraRef.current)` und `goToView` (Zeile 3334) schreibt
`view.x`/`view.y` direkt in die Kamera. Beide Stellen haben die Containergröße
in Reichweite (`containerRef`) und benutzen sie nicht.

**Änderung.** In `client/src/pages/GameTable.jsx`:

1. Ein kleiner Helfer liefert die Containermitte aus
   `containerRef.current.getBoundingClientRect()` oder `null`. `screenToWorld`
   und `viewCenter` schreiben dieselben zwei Zeilen heute aus und benutzen ihn
   mit — es entsteht keine vierte Kopie, sondern eine weniger.
2. `confirmSaveView` gibt die Mitte an `putView` weiter.
3. `goToView` setzt die Kamera aus `viewCamera(view, mitte)` statt aus
   `view.x`/`view.y`. Fehlt die Mitte, bleibt die Kamera stehen: ohne Container
   ist auch nichts zu zeichnen.

Keine weitere Stelle schreibt oder liest eine Ansicht. Geprüft: der
Setup-Editor hat seit M10.6 keinen „Save Current View"-Knopf mehr
(`ZoneEditor.jsx` Zeile 624, nur noch ein Kommentar, der die Begründung hält),
der Mehrspielerraum lädt über `loadGameState(room.boardState)` (Zeile 3772) und
damit durch dieselbe `normalizeViews`-Zeile, und `server/src` kennt `views`
überhaupt nicht.

**Abnahme.**
1. `cd client && npx vite build` bringt keine neue Warnung (zwei sind
   vorbestehend).
2. Quellentest in `server/test/client-hygiene.test.js`: `goToView` setzt die
   Kamera nicht mehr aus `view.x`, sondern über `viewCamera(`, und
   `confirmSaveView` übergibt eine Mitte an `putView(`.
3. Sichtprüfung am laufenden Tisch, zwei Fenstergrößen: eine Ansicht im
   schmalen Fenster speichern, auf 1920 × 1080 wechseln, Ansicht aufrufen —
   dieselbe Stelle des Tisches steht mittig, nur mit mehr Rand (Spec-Abnahme 1).
   Danach zurück und erneut aufrufen: wieder dieselbe Stelle.

---

## BB — Die beiden mitgelieferten Ansichten einmalig umrechnen

**Befund.** Die Spec sagt, die beiden Ansichten aus M14.4 seien „mit Daten nicht
zu beheben". Das gilt **vor** AZ. Danach nicht mehr: sobald `space: 'world'` die
neue Lesart trägt, sind die beiden Einträge umrechenbar, denn beide Größen sind
bekannt — die Kameraposition steht in den Daten, die Containergröße, für die sie
gerechnet wurde, in `docs/partie6-bericht.md` (831 × 794). Ohne diesen Schritt
bleiben ausgerechnet die zwei Voreinstellungen die einzigen, die weiterhin nur
in einem Fenster taugen.

**Änderung.** Daten, einmalig, in `setups.state_data` der beiden Aufbauten
`TFT Kurzpartie (3 Bösewichte, beide Erweiterungen)` und
`TFT Grundaufbau (Dorfphase)`. Mitte = (415,5 / 397):

| Ansicht | alt (Kamera) | neu (Weltstelle) | Zoom |
|---|---|---|---|
| Schlachtfeld | (−444 / −163) | (859,5 / 560) | 0,54 |
| Dörfler | (−734 / −1278) | (1149,5 / 1675) | 0,41 |

Jeder Eintrag bekommt `space: "world"`. `TFT Basis-Aufbau` bleibt unberührt
(hat keine Ansicht).

Vorgehen wie bei AS2/AS3 in `docs/tasks-partie7.md`: Trockenlauf vorab, dann
eine einzige `db.transaction(...)`, dann Kontrollausgabe. Gerechnet wird mit
derselben Formel wie im Code (`worldAt`), nicht mit einer zweiten im Skript.

**Abnahme.**
1. Trockenlauf vorab: beide Aufbauten tragen genau zwei Ansichten mit den
   Werten aus der Spalte „alt", keine trägt schon `space` — 0 Beanstandungen.
2. Kontrollausgabe nach dem Schreiben: vier Einträge mit `space: "world"` und
   den Werten aus der Spalte „neu", Zoom unverändert, Namen unverändert, und
   sonst hat sich an `state_data` nichts geändert (gleiche Kartenzahl, gleiche
   Zonen, gleiche Länge bis auf die vier Zusätze).
3. Sichtprüfung im laufenden Fenster (rund 932 × 790, also **nicht** dem, in dem
   die Werte entstanden): „Schlachtfeld" zeigt den Hauptplan mittig,
   „Dörfler" die drei Tableaus mit dem Münztopf im Bild.
