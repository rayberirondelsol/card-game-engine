# Aufgaben: Befunde aus der sechsten Solopartie (Spec M14.5–M14.11, K2–K4)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M14**. Der Spielbericht
steht in `docs/partie6-bericht.md`, §4.

**Zuschnitt.** M14.1–M14.4 und K1 sind **Daten** und gehören nicht hierher.
Diese Datei deckt M14.5–M14.11 sowie K2–K4 ab, also den Code.

**Aufgabenbuchstaben.** `AA`–`AE` sind in `docs/tasks-partie5.md` vergeben,
hier geht es mit `AF` weiter. `I` und `O` bleiben gesperrt (von `1` und `0`
nicht zu unterscheiden), deshalb folgt auf `AH` direkt `AJ`.

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: 999). Bau:
`cd client && npx vite build` — es darf keine **neue** Warnung dazukommen; zwei
sind vorbestehend (doppeltes `data-testid`, Chunk-Größe). Der Client hat keine
Testinfrastruktur (CLAUDE.md): reine Rechnung gehört nach `client/src/utils/`
oder `shared/` und wird aus `server/test/` geprüft; was zwingend in der
Auszeichnung steht, bekommt einen Quellentest nach dem Muster von
`server/test/table-bars.test.js`. Jede Bediengeste gilt für **Maus, Tastatur
und Berührung**.

---

## Wo die Spec nicht stimmt

Sieben Stellen. Zwei davon ändern den Zuschnitt einer Aufgabe grundlegend,
eine streicht eine Aufgabe ganz.

### 1. M14.5 — die obere Leiste *steht* in der Lösung von M12.1

Die Spec sagt: „Die beiden Leisten stehen nicht in dieser Lösung." Für die
obere stimmt das nicht. `GameTable.jsx` Zeile 5415:

```
<div className="absolute top-0 left-0 right-0 z-40 pointer-events-none …">
```

Der Rahmen ist seit M11.1/M12.1 durchlässig; jede Bediengruppe darin setzt
sich mit `pointer-events-auto` wieder davor. Die **untere** Werkzeugleiste ist
tatsächlich nicht so gebaut: ihr Pillenkörper (`bg-black/70 … px-3 py-2`) nimmt
Zeiger auf seiner ganzen Fläche an.

Eine „Hilfsfunktion aus M12.1", die M14.5 benutzen könnte, gibt es nicht —
M12.1 ist eine **Konvention in der Auszeichnung** (Rahmen `pointer-events-none`,
Bedienelement `pointer-events-auto`), festgehalten in
`server/test/table-bars.test.js`, nicht eine Funktion.

**Und, wichtiger: die Konvention löst den Befund nicht.** Der Bösewicht stand
laut Bericht auf `x 150–292, y 65–110` — das ist der Knopf „Dorfereignis
ziehen" selbst, nicht der Zwischenraum daneben. Ein Knopf, der Klicks annimmt
(Abnahme 2), nimmt am selben Pixel auch den Zeigerdruck an. Wendet man die
Konvention buchstäblich an, gewinnt man die Lücken zwischen den Knöpfen — beim
Bericht null Pixel, bei der Werkzeugleiste ein Rand von 12 px um 44-px-Knöpfe.
Abnahme 1 bliebe unerfüllt.

**Was den Befund wirklich erklärt.** Ein `click` entsteht, wenn Druck und
Loslassen auf **demselben** Element liegen. Der Knopf ist 142 px breit; drei
Rasterfelder bei 48 % Zoom sind rund 40–70 px. Der Zug endete also noch auf dem
Knopf — deshalb bewegte sich nichts *und* der Knopf feuerte.

**Neuer Zuschnitt (Abnahme unverändert, Mittel neu):** die Leiste unterscheidet
**Klick** von **Zug**. Ein Druck, der in Ruhe endet, gehört dem Knopf; ein
Druck, der über eine Schwelle hinauswandert, wird an das Tischobjekt unter dem
Druckpunkt weitergereicht und der darauf folgende `click` verworfen. Damit
gelten Abnahme 1 und 2 gleichzeitig, statt sich zu widersprechen. Die
M12.1-Konvention wird zusätzlich auf die Werkzeugleiste nachgezogen, weil sie
dort fehlt und billig ist.

### 2. M14.10 — ist gebaut, funktioniert, und der Befund ist ein Messartefakt

Die Spec sagt: „`menuPlacement.js` rechnet die Lage bereits — die Höhe gehört
dorthin." Die Höhe steht **schon dort**: `menuPlacement` gibt seit M2.9 ein
drittes Feld `maxHeight` zurück, und `GameTable.jsx` Zeile 7176 setzt es samt
`overflow: 'auto'`. In `server/test/menu-placement.test.js` ist es an vier
Stellen geprüft.

Am laufenden `https://gaming.benjathi.de/` nachgemessen, Kartenmenü bei
Fensterhöhe 300:

```
top 8   bottom 292   maxHeight "284px"   clientHeight 284   scrollHeight 369
```

Das Menü bleibt im Fenster und scrollt. Der Bericht misst `y≈888` an einem
Eintrag **innerhalb** des scrollenden Kastens — `getBoundingClientRect` eines
Kindes gibt die Layoutlage zurück, nicht die sichtbare; ein Eintrag unterhalb
der Kante meldet weiterhin seine rechnerische Position. Unerreichbar ist er
deshalb nicht.

**Folge:** keine Änderung an der Rechnung. Was fehlt, ist der Schutz davor,
dass die Verdrahtung wieder herausfällt — die Rechnung ist geprüft, ihre
Anwendung im JSX nicht. Aufgabe `AM` ist deshalb ein reiner Quellentest.

### 3. M14.6 — es sind keine „festen ~400 px", und es sind zwei Stellen

Die Vorschau rechnet heute schon mit dem Fenster, nicht mit einer festen
Breite (`GameTable.jsx` 7950 und 8002):

```
aspectRatio: `${ratio.w} / ${ratio.h}`,  height: '74vh', maxHeight: '74vh', maxWidth: '92vw'
```

Bei 794 px Fensterhöhe sind 74 vh = 587 px; ein Tableau im Verhältnis 1:2 wird
damit 294 px breit, eines im Verhältnis 2:3 rund 390 px — das ist die im
Bericht geschätzte Zahl. Die Ursache ist also nicht „fest", sondern **26 % der
Fensterhöhe liegen brach**, und `maxWidth: 92vw` greift bei hochkant stehenden
Stücken nie.

Es sind **zwei Stellen** mit denselben Zahlen: `token-preview` (M11.6) und
`longpress-card-preview` (M10.2). Eine dritte Vorschau gibt es nicht
(`HoverCard.jsx` rechnet seine Größe selbst und ist die Schwebevorschau, nicht
„Enlarge").

**Abnahme 1 neu formuliert.** „Füllt die Höhe des Fensters" ist erfüllbar und
bleibt. „Die Stufenabsätze sind lesbar" ist es durch reines Einpassen **nicht**:
ein 1:2-Tableau, das ganz ins Fenster passen soll, kann in einem 794 px hohen
Fenster höchstens rund 350 px breit werden — weniger als die 453 px, die der
Tischzoom auf 151 % geliefert hat. Der Umweg des Spielers war schlicht größer
als jede Einpassung sein kann.

Neue Abnahme 1: **Das Tableau nutzt die Fensterhöhe abzüglich Beschriftung
aus** (mindestens 88 % der Höhe statt 74 %), **und die Vorschau lässt sich auf
Fensterbreite umschalten**, wobei senkrecht gescrollt wird. Der Umschalter ist
ein echter Knopf — damit erreichen ihn Maus, Finger und Tastatur gleich.

### 4. M14.7 — die Reihenfolge stimmt, das vorgeschlagene Muster ist verboten

„Delete" liegt für ein Token wirklich unmittelbar unter „Enlarge": zwischen
beiden stehen nur `context-counter-edit` (nur Zähler) und „Edit Text" (nur
Textfeld). Bei einem Token folgt Zeile auf Zeile.

Ein Muster für eine Sicherheitsabfrage gibt es — aber **nicht für den Tisch**:
`GameDetail.jsx` benutzt `window.confirm(...)`, und `server/test/client-hygiene.test.js`
verbietet `prompt`/`confirm`/`alert` in `GameTable.jsx`, `components/` und
`utils/` ausdrücklich (M12.2: die Umgebung beantwortet solche Dialoge nicht).
Das Muster für den Tisch ist der **Dialog im JSX**, wie ihn M12.2 für „Save
current view" gebaut hat (`view-save-modal`, `view-name-input`,
`view-save-confirm-btn`). Den übernimmt AH.

### 5. M14.9 — `zoomAt` rechnet den Rastungsschritt nicht

`cameraZoom.js` bekommt den **gewünschten neuen Zoom** übergeben und klemmt ihn.
Der Schritt steht an **zwei** Stellen in `GameTable.jsx`, jede für sich:

```
960:   const delta = e.deltaY > 0 ? 0.9 : 1.1;   // nativer Radhorcher
4280:  const delta = e.deltaY > 0 ? 0.9 : 1.1;   // React-Radhorcher
```

Das ist genau die Doppelung, gegen die M10.2 den Rest der Rechnung nach
`cameraZoom.js` geholt hat. Nebenbefund: `0.9` und `1.1` sind nicht zueinander
invers (`0,9 · 1,1 = 0,99`) — hinein und wieder heraus landet nicht dort, wo
man losgefahren ist.

Die im Bericht gemessenen „20 Rastungen von 66 % auf 48 %" entsprechen 1,6 % je
Rastung und passen zu keinem der beiden Werte (0,9²⁰ wäre 66 % → 8 %). Wie die
Rastungen im Bericht erzeugt wurden, lässt sich nicht mehr feststellen; die
Abnahme ist davon unabhängig und wird gegen den Faktor geprüft, nicht gegen die
Messung.

### 6. M14.11 — eine Rückmeldung beim Wurf gibt es bereits

Alle drei Würfelarten zeigen während des Wurfs 800 ms lang `animate-bounce`,
zählen die Augenzahl zehnmal durch und schreiben `...` auf den Knopf
(`GameTable.jsx` 5017/5024/5036, 5056, 5114/5131/5145). „Eine kurze sichtbare
Rückmeldung beim Wurf" ist also schon da — was fehlt, ist eine **bleibende
Spur**: wer 800 ms lang nicht hinsieht, kann hinterher nicht mehr entscheiden,
ob gewürfelt wurde.

**Änderung neu:** ein mitlaufender Wurfzähler am Würfel. Er beantwortet genau
die Frage des Berichts („hat der Klick gezählt?") und beantwortet sie auch noch
eine Minute später. Abnahme unverändert.

### 7. K4 — die Staffelung läuft nicht nach sechs, sondern nach neun Karten aus,
und die Grenze ist Absicht

`shared/zoneGeometry.js`:

```
const d = Math.min(i * STACK_OFFSET, Math.min(b.w, b.h) / 4);
```

Für die `Ablage` (200 × 280) ist der Deckel 50 px, bei 6 px Versatz also neun
unterscheidbare Lagen. Der `ponytail:`-Kommentar an der Funktion sagt das
ausdrücklich voraus.

Der Deckel ist **keine Willkür**: `zoneContains` entscheidet über den
Mittelpunkt, ob eine Karte in der Zone liegt. Wandert er hinaus, findet
`clear_zone` sie nicht mehr und `require_zone` sieht sie nicht — der
Ablagestapel verlöre seine unterste Karte an den Tisch. `min(w,h)/4` ist der
Wert, der auch in einem Kreis und in einem Sechseck noch trägt.

**Zuschnitt:** nicht den Deckel abschaffen, sondern ihn **nach Form** rechnen.
In einem Rechteck trägt bis knapp unter `min(w,h)/2`; Kreis und Sechseck
behalten den konservativen Wert. Das verdoppelt die unterscheidbaren Lagen
einer rechteckigen Ablage, ohne dass eine Karte aus ihrer Zone fällt.

---

## AF — Die Leisten geben Züge an den Tisch weiter (M14.5)

> **Blocker.** Drei verlorene Züge und sechs still gezogene Ereigniskarten in
> einer Partie.

### AF1 — Der Pillenkörper der Werkzeugleiste wird durchlässig

**Befund.** Die obere Leiste ist seit M12.1 `pointer-events-none` mit
`pointer-events-auto` an den Bediengruppen. Die untere Werkzeugleiste ist es
nicht: `GameTable.jsx` 6098, die Pille nimmt Zeiger auf ihrer ganzen Fläche an,
also auch auf den 12 px Innenabstand und den Lücken zwischen den Knöpfen.

**Änderung.** Dieselbe Konvention: `pointer-events-none` an der Pille,
`pointer-events-auto` an ihren Kindern. Keine zweite Mechanik.

**Abnahme.** `server/test/table-bars.test.js` verlangt für `floating-toolbar`
dasselbe, was es für die Meldebänder verlangt. Die Knöpfe der Werkzeugleiste
lösen weiterhin aus (Bau grün, Sichtprüfung).

### AF2 — Ein Zug auf einer Leiste greift das Stück darunter

**Befund.** Siehe „Wo die Spec nicht stimmt", Punkt 1. Ein Zug, der auf einem
Leistenknopf beginnt, bewegt nichts und feuert beim Loslassen den Knopf.

**Änderung.** Drei Teile:

1. **Rein und geprüft** — `client/src/utils/barPassthrough.js`:
   `BAR_SLOP` (Schwelle in Bildschirmpixeln), `passedSlop(start, point)` und
   `splitObjectKey('token:42') → {type:'token', id:'42'}`. Die Schlüssel sind
   dieselben, die `tableLayers`/`pickTopmost` schon führen — kein zweites
   Vokabular.
2. **Kennzeichnung** — beide Leistenrahmen tragen `data-bar-overlay="true"`.
3. **Verdrahtung** — `handleGlobalStart` merkt sich einen Druck, dessen Ziel
   unter `[data-bar-overlay]` liegt. `handleGlobalMove` reicht ihn, sobald er
   `BAR_SLOP` überschreitet, an `pickTopmost` über **alle** Tischobjekte weiter
   (dieselbe Liste wie `layerZ`, zusätzlich mit `x`/`y`) und startet von dort
   `handleObjDragStart` bzw. `actualCardDragStart`. Der `click`, der auf so
   einen Zug folgt, wird in der Capture-Phase des Containers verworfen.

Die Auswahl läuft über die **Daten**, nicht über `elementFromPoint` — dieselbe
Begründung wie in `tokenLayer.js`: am DOM schrumpft dabei nichts, und `M2.13`
(`canStartPan`) sieht keinen Unterschied.

**Abnahme.**
1. `passedSlop` und `splitObjectKey` sind aus `server/test/` geprüft,
   einschließlich Ids mit Doppelpunkt und unbrauchbarer Eingabe.
2. Quellentest: beide Leisten tragen `data-bar-overlay`, und die Verdrahtung
   ruft `passedSlop` und `pickTopmost`.
3. Sichtprüfung: ein Token unter der oberen Leiste lässt sich ziehen; ein Klick
   auf denselben Knopf löst ihn weiterhin aus; dasselbe unten mit einem Würfel.
4. Gilt für Maus **und** Berührung: die Schwelle wird in `handleGlobalMove`
   ausgewertet, das beide Wege bedient (`handleGlobalMouseMove`,
   `handleGlobalTouchMove`).

---

## AG — „Enlarge" nutzt das Fenster aus (M14.6)

### AG1 — Die Vorschau bekommt die ganze Fensterhöhe abzüglich Beschriftung

**Befund.** `height: '74vh'` an zwei Stellen mit denselben Zahlen; 26 % der
Fensterhöhe bleiben ungenutzt, obwohl darunter nur zwei Textzeilen stehen.

**Änderung.** Eine Stelle statt zwei: `previewBox(ratio, zoomed)` in
`client/src/utils/tableObjectView.js` — dort steht `tokenPreview` schon.
Eingepasst heißt `calc(100vh - PREVIEW_CHROME)` in der Höhe und `92vw` in der
Breite, Seitenverhältnis erhalten.

**Abnahme.**
1. `previewBox` ist aus `server/test/` geprüft: eingepasst begrenzt es beide
   Achsen, und die nutzbare Höhe ist größer als die bisherigen 74 vh.
2. Beide Vorschauen benutzen `previewBox`; im JSX steht kein `74vh` mehr
   (Quellentest).
3. Eine quadratische Karte wird nicht kleiner dargestellt als bisher.

### AG2 — Die Tokenvorschau lässt sich auf Fensterbreite umschalten

**Befund.** Auch voll eingepasst bleibt ein 1:2-Tableau in einem 794 px hohen
Fenster rund 350 px breit — schmaler als der Umweg über den Tischzoom.

**Änderung.** Ein Knopf in der Beschriftungszeile der Tokenvorschau schaltet
zwischen „eingepasst" und „Fensterbreite". In der zweiten Stellung ist die
Vorschau so breit wie das Fenster erlaubt und senkrecht scrollbar. Ein echter
`<button>`, fingergroß (44 px), also zugleich der Tastaturweg; Escape schließt
weiterhin (M11.7/`escapeLayers`).

**Abnahme.**
1. `previewBox(ratio, true)` gibt die Breite vor und lässt die Höhe laufen.
2. Der Knopf trägt `data-testid="token-preview-zoom-btn"` und misst mindestens
   44 × 44 px (Quellentest, Muster `table-bars.test.js`).
3. Sichtprüfung: das Bösewicht-Tableau ist in der zweiten Stellung lesbar.
4. Bei einem zweiseitigen Token zeigt die Vorschau weiter die obenliegende
   Seite (`tokenPreview` unverändert).

---

## AH — Löschen fragt nach (M14.7)

### AH1 — „Delete" im Kontextmenü bekommt eine Rückfrage

**Befund.** Für ein Token folgt „Delete" unmittelbar auf „Enlarge"; ein
danebengezielter Klick löscht endgültig, ohne Rückfrage und ohne Rückgängig. In
der Partie ist so ein Dörfler-Tableau verlorengegangen.

**Änderung.** Ein Dialog im JSX nach dem Muster von `view-save-modal` (M12.2) —
**kein** `window.confirm`, das verbietet `client-hygiene.test.js` für den Tisch.
Der Dialog nennt das Objekt beim Namen; der Name kommt aus `tableObjectView`,
damit ein verdecktes Stück seinen Namen auch hier nicht preisgibt. Gelöscht
wird erst auf den Bestätigungsknopf, und dieser trägt die rote Farbe, die
„Delete" heute hat.

**Abnahme.**
1. `deletePrompt(objType, obj)` ist aus `server/test/` geprüft: Name aus
   `tableObjectView`, verdecktes Stück ohne Namen, unbekannter Typ ohne Absturz.
2. Quellentest: `object-delete-modal`, `object-delete-confirm-btn` und
   `object-delete-cancel-btn` gibt es, der Bestätigungsknopf ist fingergroß, und
   der Menüeintrag ruft **nicht** mehr direkt `objDeleters`.
3. Ein Token lässt sich nicht in einem einzigen Klick endgültig entfernen.

---

## AJ — Eine Mausradrastung zoomt spürbar (M14.9)

### AJ1 — Der Rastungsschritt zieht nach `cameraZoom.js` und wird größer

**Befund.** Der Schritt steht zweimal ausgeschrieben in `GameTable.jsx`
(Zeilen 960 und 4280), nicht in `cameraZoom.js`, und `0,9`/`1,1` sind nicht
zueinander invers.

**Änderung.** `ZOOM_WHEEL_STEP` und `wheelZoom(zoom, deltaY)` in
`client/src/utils/cameraZoom.js`; beide Radhorcher rufen es. Ein Schritt
hinaus ist der Kehrwert eines Schritts hinein.

**Abnahme.**
1. Fünf Rastungen decken mindestens den Weg von 50 % auf 100 % ab
   (`ZOOM_WHEEL_STEP⁵ ≥ 2`).
2. Hinein und wieder heraus landet exakt beim Ausgangswert.
3. `ZOOM_MIN` und `ZOOM_MAX` gelten unverändert — `wheelZoom` gibt seinen
   Wunsch an `zoomAt` weiter, das klemmt.
4. Im JSX steht der Faktor nicht mehr ausgeschrieben (Quellentest).

---

## AK — Der Schwenkmodus ist am Zeiger zu sehen (M14.8)

### AK1 — Im Pan-Modus ist der Zeiger über dem Tisch eine Hand

**Befund.** Der Zeiger wechselt heute nur **während** eines laufenden Schwenks
auf `grabbing` (`canvas.style.cursor`, vier Stellen). Bei bloß eingeschaltetem
Pan-Modus bleibt er der Pfeil; drei Figurenzüge fielen dadurch lautlos aus.

**Änderung.** `panCursor(panMode, panning)` in
`client/src/utils/panTarget.js` — dort steht `canStartPan` schon. Alle vier
Stellen, die heute `'grabbing'` oder `'default'` schreiben, fragen die Funktion.

**Abnahme.**
1. `panCursor` ist aus `server/test/` geprüft: `grabbing` beim Schwenken,
   `grab` im Modus, `default` sonst.
2. Im JSX wird `canvas.style.cursor` nur noch aus `panCursor` gespeist
   (Quellentest).
3. Bei aktivem Pan ist der Zeiger über dem Tisch eine Hand, sonst nicht.

---

## AL — Ein Wurf hinterlässt eine Spur (M14.11)

### AL1 — Der Würfel zählt seine Würfe

**Befund.** Die Wurfanimation läuft 800 ms und ist danach spurlos. Fällt
zweimal dieselbe Zahl, ist nicht mehr feststellbar, ob der Klick angekommen ist.

**Änderung.** Jeder Würfel führt `rolls`; die drei Wurffunktionen (`rollDie`,
`rollCustomDie`, `rollHitDie`) zählen hoch, und das Widget zeigt die Zahl klein
neben der Augenzahl. Kein neues Bedienelement, keine neue Geste.

**Abnahme.**
1. Ein Wurf, der dieselbe Zahl ergibt wie vorher, ist am gestiegenen Wurfzähler
   als Wurf zu erkennen.
2. Alle drei Würfelarten zählen (Quellentest: `rolls` steigt in jeder der drei
   Funktionen).
3. Ein frisch gelegter Würfel steht auf 0.

---

## AM — Das Kontextmenü bleibt im Fenster (M14.10)

### AM1 — Nachweis und Schutz statt Neubau

**Befund.** Gebaut und nachgemessen, siehe „Wo die Spec nicht stimmt", Punkt 2.
Ungeschützt ist nur die **Anwendung** von `maxHeight` im JSX: die Rechnung ist
geprüft, die Zeile, die sie benutzt, nicht.

**Änderung.** Keine an der Rechnung. Ein Quellentest, der festhält, dass das
Kontextmenü `maxHeight` aus `menuPlacement` setzt und `overflow: auto` trägt.

**Abnahme.** Wer `maxHeight` oder `overflow` aus dem Menü entfernt, bekommt
einen roten Test.

---

## AN — Kleinkram (K2, K3, K4)

### AN1 — Die Vorbedingungsmeldung zeigt keine Innereien mehr (K2)

**Befund.** Der Spieler liest
`#1 require_zone „Bösewicht-Tableau" — skipped: Erst die Dorfphase beginnen — der vorige Kampf steht noch. [in zone: Tableau: Deputy Waggums] (16 further steps skipped)`.
Der deutsche Satz in der Mitte ist der einzige Teil, der für ihn geschrieben
ist. Das Drumherum entsteht in `GameTable.jsx` (Zeilennummer, Typ, Ziel,
Status), in `sequenceExecutor.js` (`zoneContents`, „further steps skipped") und
soll im Protokoll auch bleiben — es ist die Diagnose.

**Änderung.** `require_zone` legt seinen Spielersatz zusätzlich als
`entry.message` ab; `reason` bleibt unverändert, damit die vorhandenen Tests
und das Protokoll nichts verlieren. Eine reine Funktion `issueLine(entry)`
entscheidet, was das Meldeband zeigt: `message`, wenn es eine gibt, sonst die
bisherige Zeile.

**Abnahme.**
1. `issueLine` ist aus `server/test/` geprüft: mit `message` genau der Satz,
   ohne `message` die alte Zeile.
2. `executeSequenceWithLog` setzt `message` an einem `require_zone` mit
   `step.message` und lässt `reason` unangetastet.
3. Das Meldeband benutzt `issueLine` (Quellentest).

### AN2 — Kartennamen in der Bibliothek brechen um (K3)

**Befund.** `GameDetail.jsx` 1598: `truncate` kürzt einzeilig mit Auslassung;
„WEDELNDER SCHWANZ ★" wird zu „WEDELNDER SCHW…", und gerade das ★ der
Beutekarte fällt weg.

**Änderung.** Zweizeilig umbrechen statt einzeilig kürzen (`line-clamp-2`,
`break-words`). Reine Auszeichnung.

**Abnahme.** Ein langer Name ist in der Kachel in zwei Zeilen zu lesen; der Bau
bleibt ohne neue Warnung. Der `title` bleibt als dritter Weg stehen.

### AN3 — Der Ablagestapel staffelt länger (K4)

**Befund.** Siehe „Wo die Spec nicht stimmt", Punkt 7: der Deckel ist
`min(w,h)/4`, für die `Ablage` also neun Lagen — nicht sechs, und die Grenze
ist eine bewusste.

**Änderung.** Der Deckel wird nach der **Form** gerechnet: in einem Rechteck
trägt `0,45 · min(w,h)`, Kreis und Sechseck behalten `0,25 · min(w,h)`. Der
Mittelpunkt bleibt in jeder Form in der Zone.

**Abnahme.**
1. Eine rechteckige `Ablage` (200 × 280) zeigt mindestens zwölf
   unterscheidbare Lagen.
2. `zoneContains` bleibt für jede Form und jede Kartenzahl wahr — auch für die
   winzige Zone aus `zone-slots.test.js`.
3. Die Staffelung läuft weiterhin monoton in eine Richtung (M12.5 Abnahme 2),
   und eine Zone mit festen Plätzen bleibt unberührt (M12.5 Abnahme 3).

---

## Nachträge aus der Umsetzung

### 1. AF2 — das Klick-Veto musste einen Ausgang bekommen

Der Zug auf einer Leiste setzt ein Veto, damit der `click` beim Loslassen den
Knopf nicht mehr auslöst. Auf **Berührung** entsteht nach einem Zug aber gar
kein `click` — das Veto stünde dann noch, wenn der nächste, harmlose Klick
kommt, und schluckte ihn. Es fällt deshalb bei jedem neuen Druck
(`handleGlobalStart`), nicht erst, wenn es verbraucht wird.

### 2. AL1 — der Wurfzähler muss das Laden überleben

`rolling: false` steht an sechs Stellen: drei beim Anlegen und drei beim
Wiederherstellen eines Spielstands. Beim Anlegen gehört `rolls: 0` daneben,
beim Wiederherstellen `rolls: d.rolls || 0` — ein Zähler, der beim Laden auf 0
zurückfällt, behauptet, es sei nie gewürfelt worden, und das ist derselbe
Schaden in anderer Form.

### 3. AH1 — die Rückfrage ist eine Escape-Schicht

Ein Dialog, den Escape nicht schließt, wäre M11.7 zum dritten Mal.
`deleteModal` steht deshalb in `ESCAPE_LAYERS`, direkt unter `cardPreview` und
über `contextMenu` — er kommt aus dem Menü und verlangt eine Entscheidung.

### 4. AN3 — der neue Deckel gilt nur für Rechtecke

`0,45 · min(w,h)` trägt in einem Rechteck, nicht in einem Kreis und nicht in
einem Sechseck. Dort bleibt `0,25 · min(w,h)` stehen. Geprüft wird das nicht
über den Wert, sondern über `zoneContains` für jede Form und bis zur
zehntausendsten Karte.

### 5. Offen geblieben, nicht angefasst

- **M14.6 hat eine Grenze, die keine Einpassung überwindet.** Ein 1:2-Tableau
  passt in ein 794 px hohes Fenster höchstens 350 px breit. Der Umschalter auf
  Fensterbreite (AG2) ist die Antwort darauf; eine stufenlose Lupe in der
  Vorschau wäre die nächste Stufe und ist hier nicht gebaut.
- **AF2 reicht den Zug an das Stück unter dem Druckpunkt weiter, nicht an eine
  Zone oder ein Raster.** Wer unter einer Leiste eine *leere* Stelle greift,
  schwenkt weiterhin nicht — dort liegt kein Stück, und der Knopf behält den
  Druck. Das ist der Fall, den niemand gemeldet hat.
