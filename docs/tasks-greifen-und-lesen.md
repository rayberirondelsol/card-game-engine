# Aufgaben: Greifen und Lesen (Spec M10.1, M10.2, M10.3)

Vertrag ist `docs/spec-setup-system.md`, Abschnitte **M10.1**, **M10.2** und
**M10.3**. Nummern sind `W…` (Was man sieht), damit sie weder mit T1–T9
(`tasks-kampfvorbereitung.md`), G1–G6 (`tasks-gelaendelage.md`),
F1–F4 (`tasks-grundflaeche.md`), S1–S6 (`tasks-szenarioflaeche.md`),
K1–K6 (`tasks-gelaendekarten.md`), B1–B6 (`tasks-blockaden.md`),
R1–R7 (`tasks-rundenwende.md`), V1–V5 (`tasks-gelaendeseite.md`),
N1–N8 (`tasks-bedienbarkeit.md`), A1–A5 (`tasks-startausruestung.md`),
D1–D5 (`tasks-aufdecken.md`), E1–E5 (`tasks-dauerstapel.md`),
Z1–Z7 (`tasks-ebenen.md`), L1–L6 (`tasks-marker.md`),
P1–P4 (`tasks-vorbedingung.md`) noch H1–H… (`tasks-stapel-und-zaehler.md`)
kollidieren. `M` bleibt den Spec-Abschnitten.

**Gilt für jede Aufgabe.** Eine Fähigkeit ist erst fertig, wenn alle Schichten
stimmen, und **„nichts zu tun" ist eine gültige Antwort, aber nur eine
geprüfte.**

Tests laufen mit `cd server && npm test`; die Verdrahtung prüft
`cd client && npx vite build`.

Schichten hier:

1. **Reine Logik** — `client/src/utils/tokenLayer.js` (Treffer),
   `client/src/utils/cameraZoom.js` (Kamera), `shared/counters.js` (Zähler)
2. **Verdrahtung** — `client/src/pages/GameTable.jsx`

---

## Vorab: fünf Stellen, an denen Spec und Auftrag nachgeschärft werden mussten

### 1. „Der Zeiger trifft, was man sieht" ist ohne Bilddaten nicht erreichbar — der Befund aber schon

Der Auftrag nennt drei Wege und fragt nach dem, der ohne Bilddaten auskommt.
Der ehrliche Befund: **es gibt keinen, der die Regel wörtlich erfüllt**, und
einen, der **drei der vier berichteten Fehlgriffe** beseitigt.

- **Trefferfläche verkleinern** setzt voraus, dass man weiß, *wie weit* die
  gezeichnete Figur in ihrem Kästchen steht. Das Bild steht mit
  `object-fit: contain` mittig im Kasten (`TokenShape`, Zweig `image`) — „unten
  mittig eingepasst" ist eine Eigenschaft des **Bildinhalts**, nicht des
  Einpassens. Jeder Schrumpffaktor ist damit geraten, und ein falsch geratener
  bricht **Abnahme 3** (auf der gezeichneten Figur muss es unverändert
  funktionieren) für runde Marker und randlose Teile.
  Der einzige rechenbare Anteil wäre der **Briefkasten** eines nicht
  quadratischen Bildes in einem quadratischen Kasten (aus `naturalWidth` /
  `naturalHeight`, also Metadaten statt Pixeln). Der greift hier nicht: der
  durchsichtige Bereich liegt *im* Bild, nicht neben ihm.
- **Alphakanal abfragen** erfüllt die Regel wörtlich, braucht aber Bilddaten:
  Offscreen-Canvas, `getImageData`, ein Rückfall für nicht geladene und für
  getaintete Bilder, und eine Antwort auf „das Bild ist noch nicht da, der
  Spieler greift trotzdem". Das ist die Bauform, die man um drei Uhr nachts
  auseinandernimmt, und sie bricht Abnahme 3 genau dann, wenn der Rückfall
  greift.
- **Kleinerer Abstand zum Mittelpunkt gewinnt** braucht nichts als die Zahlen,
  die ohnehin dastehen.

Entschieden wird am Befund, nicht am Regelsatz. Drei der vier Fehlgriffe
(„aus der Mitte des Bösewichts", Granny statt Fridgette, Fridgette statt
Henlo) und die gesamte Ursachenbeschreibung („stehen zwei Figuren auf
benachbarten Feldern, überlappen sich ihre Kästchen um ein volles Feld … elf
Pixel breiter Streifen") sind **Überlappung zweier gleich großer Figuren** —
genau der Fall, für den die Spec selbst schreibt: „Zwischen zwei gleich großen
Figuren hilft die Reihenfolge nicht."

Darum **W1**: bei Überlappung gewinnt der kleinere Abstand zum Mittelpunkt —
aber erst **nach** der Fläche, nicht davor. Siehe Punkt 2.

**Was damit offen bleibt:** Abnahme 1, zweite Hälfte („oder pannt, wenn dort
nichts liegt"). Ein Druck auf den durchsichtigen Rand einer *einzeln
stehenden* Figur greift weiterhin die Figur. Das ist der Anteil, der ohne
Bilddaten nicht geht, und er ist der harmloseste: er bewegt das Richtige, nur
an einer Stelle, an der man lieber gepannt hätte.

### 2. Der Abstand darf die Fläche nicht überstimmen — sonst fällt M8.2 um

Der naheliegende Bau wäre „der nächste Mittelpunkt gewinnt, Punkt". Der bricht
M8.2 Abnahme 2: eine Figur, die nahe der Mitte eines sechs mal drei Felder
großen Geländeteils steht, verliert gegen dessen Mittelpunkt, sobald man ihren
Rand drückt — das Gelände ist dann wieder das, was man greift, und genau
davon handelt M8.2.

Die Ordnung bleibt deshalb die von M8.2/M9.1 — **kleinere Fläche gewinnt** —
und der Abstand ist der **Tie-Break bei gleicher Fläche**, dort, wo heute die
DOM-Reihenfolge steht. Das ist wörtlich das, was M8.2 offengelassen hat („bei
gleicher Fläche bleibt es beim bisherigen Verhalten"), und es ändert an keinem
Fall etwas, den M8.2 oder M9.1 abnehmen.

### 3. M2.13 (`canStartPan`) bleibt unberührt — **weil** die Trefferfläche nicht schrumpft

Der Auftrag warnt zu Recht: wer die Trefferfläche verkleinert, verschiebt das
Ereignisziel, und `canStartPan` entscheidet am Ziel. W1 verkleinert nichts.
Kein `pointer-events`, kein `z-index`, keine veränderten Kästen — der Druck
landet auf demselben Element wie heute, und erst **danach** rechnet
`handleObjDragStart` nach, welcher Token gemeint war. Pannen, Rechtsklick,
Kontextmenü und die Sperre sehen keinen Unterschied.

Der Preis dafür steht in Punkt 1: „pannt, wenn dort nichts liegt" bekommt man
nur über ein verschobenes Ereignisziel, und das kostet M2.13.

### 4. M10.2 Regel 2 ist **kein** Ankerproblem, sondern ein Vorzeichenfehler

Die Spec vermutet, der Zoom ankere „auf die Bildmitte". Beides ist falsch: die
drei Zoomstellen rechnen den Mauszeiger **ausdrücklich** mit — und zwar in
einer Koordinatenkonvention, die der des Tisches entgegengesetzt ist.

Gezeichnet wird mit `scale(z) translate(cam)` und `transform-origin: 50% 50%`:

```
Bildschirm = Mitte + (Welt + cam − Mitte) · z      ⇒   Welt = (Bildschirm − Mitte)/z − cam + Mitte
```

Genau das steht in `screenToWorld` und trägt jeden Drag-and-drop. Die drei
Zoomstellen rechnen aber

```
Welt = (Zeiger − Mitte)/z + cam
```

— **`+ cam` statt `− cam`**. Das Ergebnis ist nicht „die Mitte bleibt stehen",
sondern: die Kamera fährt um denselben Betrag in die **falsche** Richtung. Der
Punkt unter dem Zeiger wandert beim Hineinzoomen doppelt so schnell aus dem
Bild wie bei einem Zoom ohne jede Nachführung. Das ist die genaue Mechanik von
„rund 130 Mausrad-Rasten plus mehrere Schwenks".

Deshalb ist **W3/W4 das Stück von M10.2 mit dem meisten Nutzen je Zeile**: es
ist ein Fehler, keine Fähigkeit; es liegt an einer Stelle dreifach; es
verbilligt **jeden** vorhandenen Leseweg statt einen neuen danebenzustellen;
und es ist als reine Funktion prüfbar, während eine Großansicht nur der
Vite-Build sieht.

### 5. Die Großansicht **gibt es** — dreimal, und keine davon ist erreichbar, wo man sie sucht

| Weg | Wo | Zustand |
|---|---|---|
| ALT halten + Zeiger auf der Karte | Desktop, `data-testid="alt-card-preview"` | funktioniert, 250 × 350 |
| Langdruck | Touch, `longpress-card-preview` | funktioniert, 280 × 392 |
| Doppeltipp | Touch, `handleTap` | funktioniert, dieselbe Ansicht |

Die ALT-Lupe ist **kein** totes Bedienelement (`docs/audit-dead-controls.md`):
`setHoveredTableCard` hängt an `onMouseEnter` der Karte, `altKeyHeld` am
`keydown`. Die Messgrenze der Spec ist also eine echte Messgrenze.

Zwei Befunde bleiben trotzdem:

1. **Das Kontextmenü hat keinen Eintrag** — steht so in der Spec, stimmt.
2. **250 × 350 ist nicht groß genug.** Eine Tischkarte ist 100 × 140; 250 × 350
   sind 250 %, gelesen werden konnte erst bei 450–500 %. Die vorhandene Lupe
   ist zu klein für genau das, wofür sie da ist.

Darum wird **keine zweite gebaut** (W6): die vorhandene Ansicht wird groß und
bekommt einen Eintrag im Kontextmenü.

---

## W1 — Bei gleicher Fläche gewinnt der nähere Mittelpunkt (reine Logik)

`client/src/utils/tokenLayer.js` bekommt `pickTopmost(point, items)` neben
`tableLayers` — dieselbe Datei, weil es dieselbe Ordnung ist: `tableLayers`
sagt, **was oben liegt**, `pickTopmost` sagt, **wer den Zeiger bekommt**, und
zwei Dateien wären zwei Antworten.

`items` sind `{ key, x, y, width?, height?, size? }` in derselben Reihenfolge
wie bei `tableLayers` (bei gleicher Fläche liegt der spätere oben).

1. **Kandidaten** sind die Stücke, deren Kasten den Punkt enthält. Der Kasten
   ist mittig an `x`/`y` (`left: x − w/2`, wie `GameTable` zeichnet), die Maße
   kommen aus denselben Rückfällen wie `tokenArea`.
2. Gewinner ist die **kleinste Fläche** — unverändert die Regel aus M8.2/M9.1.
3. Bei **gleicher Fläche** der **kleinere Abstand zum Mittelpunkt** (quadriert,
   keine Wurzel).
4. Bei gleichem Abstand der **spätere** in der Liste — das bisherige Verhalten.

Ohne Kandidat: `null`. Der Aufrufer bleibt dann bei dem, was er hatte.

**Abnahme.**
1. M10.1 Abnahme 2: zwei 82 × 82-Figuren auf benachbarten Feldern (41 Einheiten
   Abstand) — ein Druck in der Mitte jeder Figur trifft sie selbst, und jeder
   Punkt der Überlappung gehört der näheren.
2. M10.1 Abnahme 4: dasselbe bei vier Figuren in einer Reihe; jede ist über
   ihre halbe Kästchenbreite adressierbar, unabhängig vom Zoom (die Regel
   rechnet in Weltkoordinaten, Zoom kommt darin nicht vor).
3. M10.1 Abnahme 3: eine einzeln stehende Figur bekommt jeden Druck in ihrem
   Kasten — auch den auf dem durchsichtigen Rand.
4. M8.2 Abnahme 2 bleibt: die kleine Figur auf dem großen Geländeteil gewinnt
   auch dann, wenn der Mittelpunkt des Geländes näher liegt.
5. M8.2 Abnahme 3 bleibt: neben der Figur gewinnt das Gelände.

## W2 — Verdrahtung: der Zug fragt nach, wen er gemeint hat

`handleObjDragStart(e, objType, objId)` in `GameTable.jsx` ist die **eine**
Stelle, durch die Token, Zähler, Würfel, Notiz, Textfeld und Board ihren Zug
beginnen. Dort — und nur dort — wird für `objType === 'token'` nachgerechnet:
Zeiger nach `screenToWorld`, `pickTopmost` über die Tokenliste, und der
gefundene Schlüssel ersetzt `objId`.

- **Vor** der Sperrprüfung und vor dem Langdruck-Zeitgeber, damit das
  Kontextmenü auf Touch denselben Token meint wie der Zug.
- Nur Token gehen in die Liste. Ein Zähler ist klein und liegt nach M9.1
  ohnehin oben; ihn in dasselbe Rennen zu schicken, änderte nur Fälle
  **gleicher** Fläche zwischen verschiedenen Objektarten — die es nicht gibt.
- Karten laufen über `handleCardDragStart`, einen eigenen Pfad mit Stapel-
  und Auswahllogik. Karten eines Stapels liegen **deckungsgleich**, ihr
  Abstand zum Mittelpunkt ist identisch, die Regel fiele auf den vorhandenen
  Tie-Break zurück. **Nichts zu tun, geprüft.**

**Abnahme.** M10.1 Abnahme 1 (erste Hälfte), 2, 3, 4 am Tisch.
`cd client && npx vite build` läuft durch. M2.13 unverändert: `canStartPan`
wird nicht angefasst, kein Kasten schrumpft, kein `pointer-events` fällt weg.

## W3 — Eine Kamera, eine Konvention (reine Logik)

Neu: `client/src/utils/cameraZoom.js`.

- `worldAt(camera, screen, center)` — die Umkehrung der gezeichneten
  Transformation, die Konvention aus `screenToWorld`.
- `zoomAt(camera, cursor, center, zoom)` — neue Kamera, die den Weltpunkt
  unter `cursor` festhält, mit `zoom` auf `[ZOOM_MIN, ZOOM_MAX]` geklemmt:

  ```
  cam₁ = cam₀ + (Zeiger − Mitte) · (1/z₁ − 1/z₀)
  ```

`ZOOM_MIN = 0.2`, `ZOOM_MAX = 5` — die Grenzen, die heute an drei Stellen
ausgeschrieben stehen.

**Abnahme.**
1. M10.2 Abnahme 2: der Weltpunkt unter dem Zeiger liegt nach dem Zoomen
   wieder unter dem Zeiger — geprüft, indem `worldAt` auf die neue Kamera
   angewandt wird. Über zwanzig Rasten hintereinander bleibt er stehen.
2. Zeiger genau in der Mitte: die Kamera bleibt stehen.
3. Am Anschlag (0.2 / 5) ändert sich weder Zoom noch Kamera.
4. Ein Zeiger rechts der Mitte fährt die Kamera beim Hineinzoomen nach
   **links** — das Vorzeichen, das heute falsch steht.

## W4 — Verdrahtung: drei Zoomstellen, eine Rechnung

`handleWheel` (nativ), `handleGlobalWheel` (React) und der Pinch-Zweig in
`handleTouchMove` rufen `zoomAt`. `screenToWorld` ruft `worldAt`.

Die vierte Kopie derselben Konvention — die ausgeschriebene Umkehrung in
`screenToWorld` — verschwindet damit ebenfalls. Vier Stellen, an denen
dieselbe Matrix von Hand invertiert wurde, waren die Ursache: **eine** davon
hatte das Vorzeichen falsch, und keine konnte die andere widerlegen.

**Abnahme.** M10.2 Abnahme 2 am Tisch. `npx vite build` läuft durch.

## W5 — Das Namensschild verdeckt nichts mehr

Der graue Streifen (`absolute bottom-0 … bg-black/60`) auf der Vorderseite
einer Tischkarte fällt **weg**. Der Name ist nicht verloren: der äußere
Kartenrahmen trägt ihn schon als `title` (Tooltip), eine Karte **ohne** Bild
zeichnet ihn ohnehin mittig, das Kontextmenü nennt ihn, und die Großansicht
(W6) schreibt ihn unter das Bild.

Verschieben statt löschen wäre die schlechtere Antwort: unter die Karte gelegt
stünde der Streifen außerhalb des Kartenkastens, finge dort Zeiger ab und
verschöbe genau die Trefferflächen, die W1/W2 gerade geradeziehen.

**Abnahme.** M10.2 Abnahme 3: die unterste Zeile einer Karte ist bei jedem
Zoom sichtbar. Der Name bleibt am Tisch erreichbar.

## W6 — Die Großansicht wird groß und steht im Kontextmenü

Die vorhandene Overlay-Ansicht (`longpress-card-preview`) wird von 280 × 392
auf einen Bildschirmanteil gehoben (`min(78vh, …)` mit dem Seitenverhältnis
der Karte) und ihre Bildunterschrift rutscht **unter** das Bild statt darüber
— derselbe Befund wie W5, dieselbe Antwort.

Dazu ein Eintrag **Enlarge** im Kartenteil des Kontextmenüs, der
`setLongPressPreviewCard(tableId)` ruft. Ein Klick, ein Schritt, keine zweite
Ansicht.

**Abnahme.** M10.2 Abnahme 1: ein Griff an einer Karte (Rechtsklick →
Enlarge, ALT, Langdruck oder Doppeltipp) zeigt sie lesbar, ohne Zoomen und
Schwenken.

**Bewusst nicht jetzt:** eine eigene Leseansicht mit eigenem Zoom und
Schwenken; die ALT-Lupe auf dieselbe Größe zu heben (sie ist die
Vorbeischau-Geste, nicht die Leseansicht); `ZOOM_MAX` über 500 % zu heben.

## W7 — Wegklicken übernimmt, Escape verwirft

`onBlur={cancelCounterEdit}` am Zählerfeld wird zu „übernehmen", also zu
demselben Weg, den Enter geht. Escape setzt vorher eine Merkfahne, damit das
Verwerfen nicht über das Abmelden des Feldes doch noch übernimmt.

**Die Entscheidung, die der Auftrag verlangt — und warum nicht verwerfen.**
Beide Richtungen verlieren manchmal etwas. Den Ausschlag gibt nicht, welcher
Verlust häufiger ist, sondern welcher **sichtbar** ist:

- Ein **ungewolltes Übernehmen** steht danach am Tisch. Der Spieler sieht die
  falsche Zahl und klickt sie in einem Griff wieder richtig.
- Ein **stilles Verwerfen** sieht aus wie „es hat geklappt". Genau das ist der
  Befund: dreimal erwischt, bevor er es verstand.

Dazu kommt, dass die Spec den freundlichen Fall schon anders löst: M9.5 Regel 2
schickt eine **unlesbare** Eingabe in den Meldekasten, statt sie zu schlucken —
ein Vertipper wird also auch beim Wegklicken nicht stillschweigend zur Zahl,
sondern gemeldet. Und Escape steht als ausdrückliches Verwerfen daneben, seit
M8.6 Abnahme 2. Verwerfen ist damit nicht abgeschafft, nur nicht mehr die
Vorgabe.

**Reine Logik gibt es hier nicht.** Was die Eingabe *bedeutet*, steht seit M9.5
in `counterEdit` (`shared/counters.js`) und ändert sich nicht; geprüft ist das
in `server/test/counter-edit.test.js`. Geändert wird allein, **welcher
Ausgang welche Funktion ruft** — drei Zeilen Verdrahtung, die nur der
Vite-Build sieht. Eine Hilfsfunktion dafür zu erfinden wäre eine Abstraktion
mit einem einzigen Aufrufer.

**Abnahme.** M10.3 Abnahme 1–3: `11` tippen und wegklicken setzt 11; Escape
lässt den Wert stehen; `-2-3` sagt weiterhin, dass es sich nicht lesen lässt.
