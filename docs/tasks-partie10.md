# Aufgaben: Befunde der zehnten Partie (Spec M19.1–M19.6)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M19**. Die Belege stehen in
`docs/partie10-bericht.md` (B1, U1, U3, L-Teil von Prüfpunkt 5, Prüfpunkt 1).
Die Vorgeschichte der Datenänderungen an diesem Aufbau steht in
`docs/tasks-partie7.md` (AS1–AS3) und `docs/tasks-ausruestung.md` (BH).

**Aufgabenbuchstaben.** `AA`–`AE` in `docs/tasks-partie5.md`, `AF`–`AN` in
`docs/tasks-partie6.md`, `AP`–`AV` in `docs/tasks-partie7.md`, `AW`–`AY` in
`docs/tasks-zonen.md`, `AZ`–`BB` in `docs/tasks-ansichten.md`, `BC`–`BG` in
`docs/tasks-partie9.md`, `BH` in `docs/tasks-ausruestung.md`. Hier geht es mit
`BI` weiter.

**Reihenfolge.** `BI` (M19.3) und `BJ` (M19.4) zuerst — eine Karte bleibt
liegen, der Würfel ist unlesbar. Danach `BK` (M19.1, der einzige Befund, der
beim Nachmessen stehengeblieben ist), `BL` (M19.6, Darstellung) und `BM`
(M19.5). **M19.2 bekommt keine Aufgabe** — siehe „Wo die Spec nicht stimmt", 1.

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: **1152**, alle
grün). Bau: `cd client && npx vite build` — keine **neue** Warnung (zwei sind
vorbestehend). Der Client hat keine Testinfrastruktur (CLAUDE.md): reine
Rechnung gehört nach `shared/` oder `client/src/utils/` und wird aus
`server/test/` geprüft. Jede Geste gilt für Maus, Tastatur **und** Touch. Es
gibt genau eine Stelle je Sache (M6).

---

## Phase 0 — nachgemessen, bevor etwas gebaut wurde

Die Spec verlangt für M19.1 und M19.2 ausdrücklich eine Messung mit **echten
Mausereignissen**, weil die Fernsteuerung des Spielers keine verlässlichen
Zugereignisse erzeugt (Partie 6: Zoomschritt und „halbe Strecke" waren beide
Werkzeugartefakte).

**Wie gemessen wurde.** Nicht mit `left_click_drag` des Browserwerkzeugs,
sondern mit `mousedown` / n × `mousemove` / `mouseup` als echte `MouseEvent`,
aufs jeweils getroffene Element geschickt (`document.elementFromPoint`), so dass
sie durch dieselben React-Handler laufen wie eine Maus — **und mit einem
`requestAnimationFrame` zwischen je zwei Ereignissen.**

**Das Bildwechsel-Warten ist der ganze Punkt.** Dieselbe Folge ohne Pause
bewegt **gar nichts**: `handleObjDragStart` setzt `draggingObj` über
`setDraggingObj`, und `handleGlobalMove` liest `draggingObj` aus dem Abschluss
des *aktuellen* Renders. Kommen Druck und Bewegungen in einer einzigen
JS-Aufgabe, hat React dazwischen nicht neu gerendert — jedes `mousemove` sieht
`draggingObj === null` und tut nichts. **Das ist die Erklärung für das
Werkzeugartefakt**, und sie gilt für beide Verdachtsfälle: ein Zug, der aus
wenigen, schnell hintereinander geschickten Ereignissen besteht, verliert die
ersten davon.

Gemessen am laufenden Tisch, Spiel `072123c0-…`, Aufbau *TFT Kurzpartie*, nach
„Kampf beginnen" (Bösewicht *Virginia Fitz*, 2 × 2 Felder, Raster 50 Weltpunkte
je Feld).

### M19.2 — es gibt keine 70-Pixel-Schwelle

Eine Dörflerfigur (1 × 1) wiederholt um **eine** Feldbreite nach rechts
gezogen, je zehn Bewegungsereignisse:

| Zoom | ein Feld am Bildschirm | Zug um … | Figur rückt |
|---|---|---|---|
| 54 % | 27 px | 27 px | 1 Feld (50 Weltpunkte) |
| 54 % | 27 px | 24 px | 1 Feld |
| 54 % | 27 px | 14 px | 1 Feld |
| 54 % | 27 px | 10 px | — |
| **41 %** | **20,5 px** | **21 px** | **1 Feld** |
| 41 % | 20,5 px | 18 px | 1 Feld |
| 41 % | 20,5 px | 12 px | 1 Feld |
| 41 % | 20,5 px | **11 px** | **1 Feld** |
| 41 % | 20,5 px | 9 px | — |

Die Schwelle liegt bei **9 Pixeln**, nicht bei 70 — genau da, wo `BAR_SLOP`
(8) sie hinlegt, und deckungsgleich mit dem halben Feld, ab dem `snapInto`
auf das nächste Feld rastet. **Ein Feld weit ziehen geht bei 41 % mit doppelt
so viel Weg, wie nötig wäre.** Die Abnahme von M19.2 („eine Figur lässt sich
bei Spielzoom um ein Feld ziehen") ist heute erfüllt.

→ **Artefakt. Keine Aufgabe, keine Zeile Code.**

### M19.1 — der Befund bleibt, aber nicht in der Mitte

Zwei Messungen, dieselbe Lage: Bösewicht (100 × 100) **vollständig** auf dem
Geländeteil *Dichter Wald* (350 × 200), Zoom 41 %, je 12–15 Bewegungen.

1. Druck auf dem **Mittelpunkt des Bösewichts**, 96 px nach Westen: der
   **Bösewicht** rückt vier Felder (1071,87 → 871,71), das Geländeteil steht
   still. Genau die Geste aus dem Bericht — sie funktioniert.
2. Druck auf dem Punkt, unter dem der **Mittelpunkt des Geländeteils** liegt
   (Weltpunkt 1097/643; er liegt innerhalb des Bösewicht-Kastens
   1071,9–1172,0), 40 px nach Westen: der **Wald** rückt zwei Felder
   (921,85 → 821,77), der Bösewicht steht still. **Reproduziert.**

→ **Echter Fehler**, aber an einer anderen Stelle als im Bericht vermutet.
Aufgabe `BK`.

---

## Wo die Spec nicht stimmt

Sechs Stellen. Eine streicht eine Aufgabe ganz (M19.2), eine dreht die Ursache
des Befundes um (M19.1), eine korrigiert die Vorgeschichte einer Karte (M19.3),
eine beantwortet eine offene Frage gegen den Vorschlag der Spec (M19.4), eine
berichtigt einen Satz im Quelltext (M19.1), und eine formuliert eine Abnahme neu
(M19.5).

### 1. M19.2 — „unter rund 70 Bildschirmpunkten passiert nichts" ist falsch

Siehe Phase 0. Gemessen greift der Zug ab **9 px**; ein Feld ist bei 41 % gut
**20 px** breit. Die Spec hat das selbst vermutet („`BAR_SLOP` ist 8, nicht 70 —
die Schwelle allein erklärt den Befund nicht"). Es war dasselbe Artefakt wie bei
M19.1: zu wenige, zu schnell geschickte Bewegungsereignisse.

**Folge:** M19.2 entfällt ersatzlos. Was in der Partie wirklich weh tat, steht
im Bericht daneben und ist **U2** (keine Rasterbeschriftung im Spielausschnitt)
— ein eigener Befund, kein Teil von M19.

### 2. M19.1 — nicht `tableLayers`, und nicht in der Mitte

Die Spec nennt `pickTopmost` **und** `tableLayers` als Verdächtige.
`tableLayers` ist unbeteiligt: es ordnet nur die Zeichenreihenfolge, und die ist
bei einer kleinen Figur auf einem großen Geländeteil richtig (kleinere Fläche =
weiter vorn). Der Druck landet auch tatsächlich auf dem Bösewicht-Element —
gemessen, `data-testid` des getroffenen Elements ist seines.

Was dann passiert, ist `pickTopmost`: es **überstimmt** das getroffene Element
anhand der Daten. Und die Mitte des Bösewichts ist nicht der Ort, an dem es
schiefgeht — dort gewinnt er. Schief geht es auf der Hälfte seines Kastens, die
dem **Mittelpunkt des Geländeteils** zugewandt ist.

### 3. M19.1 — ein Satz im Quelltext ist nachweislich falsch

In `client/src/utils/tokenLayer.js` steht seit M11.9:

> M8.2 bleibt unberuehrt: eine Figur auf einem Gelaendeteil hat dessen
> Mittelpunkt nur dann naeher als ihren eigenen, wenn sie gar nicht darauf
> steht

Sie hat ihn auch dann näher, wenn sie **genau darauf steht und ihn überdeckt** —
und das ist der Normalfall, denn ein Geländeteil ist 7 × 4 Felder groß und sein
Mittelpunkt liegt mitten im Kampfgeschehen. Messung 2 oben ist der Gegenbeweis.

### 4. M19.3 — die Karte lag **nicht** im Verhaltensdeck

Die Spec (und der Bericht) sagen, die Karte sei „ins Verhaltensdeck gemischt"
gewesen. Das kann nicht sein: `remove_stack` (Schritt 9 von „Dorfphase
beginnen") entfernt den Stapel **mit seinen Karten** aus `state.stacks` — eine
wirklich eingemischte Karte wäre spurlos gelöscht worden und läge nirgends mehr.
Der Bericht sagt aber, sie liege „als einzige lose Karte quer über der neuen
Ladenauslage".

Sie war also eine **lose Tischkarte**, die auf dem Verhaltensdeck lag, ohne mit
ihm zu verschmelzen. Das deckt sich mit U6 desselben Berichts („danach zeigte
der Stapel dauerhaft ihr Bild, obwohl die nächste gezogene Karte eine andere
war") — das ist kein Stapel, der sein Deckblatt verrät, das ist eine lose Karte
obendrauf.

**Welcher Schritt hätte sie erfassen müssen?** Keiner. „Dorfphase beginnen"
sammelt Dorf-Ereigniskarten an genau drei Orten ein (Schritte 5–7:
`clear_zone` auf `Hand Dörfler 1–3`, kategoriegefiltert, zurück unter den
Stapel). Die Karte lag an einem vierten. Der Schritt für „egal wo es liegt"
existiert seit M17.4 — `clear_table` —, aber er **löscht nur** und kann nichts
zurücklegen. Genau diese Lücke schließt `BI`.

**Nebenbefund, nicht Teil dieser Liste:** eine Karte, die wirklich in einen
Stapel eingemischt wurde, wird von `remove_stack` stillschweigend mitgelöscht.
Das ist die Gegenrichtung zu M15.1 („Fremdkarten bleiben liegen statt begraben
zu werden") und gehört in eine eigene Spec-Nummer.

### 5. M19.4 — „Enlarge" ist das falsche Mittel

Die Spec fragt, ob „Enlarge" (M11.6) den Würfel erfassen soll. **Nein.**
Begründet in `BJ`: zwanzig Würfe kosteten dann vierzig Klicks, und das, was zu
vergrößern wäre, ist eine einzelne Zahl bzw. ein 48-Punkte-Bildchen.
`tokenPreview` antwortet für ein Ding ohne `imageUrl` ohnehin `null` — ein
Würfel hat keins. Die Abnahme der Spec („die Augenzahl ist bei Spielzoom
ablesbar, ohne den Tisch zu bewegen") spricht selbst gegen das Overlay: sie
verlangt **Lesbarkeit am Tisch**, nicht eine zweite Ansicht.

### 6. M19.5 — den Zustand „alle Dörfler besiegt" gibt es nicht

Die Abnahme lautet: „Sind alle Dörfler besiegt, meldet ‚Dorfphase beginnen' das,
**bevor** es etwas abräumt. Bestätigen kann man es trotzdem."

Der Tisch kennt „besiegt" nicht. Er kennt Zähler, Zonen, Raster und Stapel —
und es gibt **keinen Schritt, der einen Zähler als Bedingung liest**
(`require_zone` fragt Zonen, `set_counter` schreibt). Die einzige Spur einer
Niederlage sind die drei Zähler `Henlo/Fridgette/Granny: Leben` auf 0, und die
führt der Spieler von Hand.

Der Zustand muss also **erfunden** werden, und zwar als Definition im Aufbau,
nicht in der Maschine: *besiegt heißt, der Lebenszähler steht auf 0.* Das ist
vertretbar — es ist dieselbe Arbeitsteilung wie bei `require_zone`, wo der Satz
„Erst den Kampf beenden" auch im Aufbau steht und nicht im Executor.

**Die Abnahme bleibt, mit einer Präzisierung**: „bevor es etwas abräumt" ist nur
zu halten, wenn die Bedingung wie `require_zone` **vorn** steht und die ganze
Folge anhält; „bestätigen kann man es trotzdem" heißt dann, dass der Spieler
dieselbe Aktion nach der Rückfrage ohne die Wache laufen lässt. Beides ist in
`BM` so gebaut. Was der Tisch **nicht** tut: etwas über den Ausgang der Partie
behaupten. Er nennt den Zählerstand und fragt.

---

## BI — „Räum das vom Tisch" bekommt ein Ziel (M19.3)

### BI1 — `clear_table` darf zurücklegen, nicht nur löschen

**Befund.** Siehe „Wo die Spec nicht stimmt", 4. Eine Dorf-Ereigniskarte, die
während des Kampfes ihre Handzone verlassen hat, wird von „Dorfphase beginnen"
nicht eingesammelt: die drei Schritte, die Ereigniskarten zurücklegen, sehen nur
die drei Handzonen (`clear_zone`), und der Schritt, der überall sucht
(`clear_table`, M17.4), kann nur löschen. Löschen wäre hier falsch — der Stapel
bliebe auf 79.

Dazu kommt ein zweiter Weg zu derselben 79: Schritt 4 ist `clear_zone` auf
`Ablage` **ohne Ziel und ohne Kategorie**, löscht also alles, was dort liegt.
Genau dorthin verlangt *Schwitzige Hände* auf der Karte selbst gelegt zu werden
(„legt diese Karte danach auf den Ablagestapel der Bösewicht-Aktionen"). Ein
Schritt, der Ereigniskarten **vor** allen Aufräumschritten überall einsammelt,
deckt beide Wege mit einer Zeile ab.

**Änderung, Teil 1 (Executor).** `clear_table` bekommt `targetStackLabel` und
`faceDown` — dieselben zwei Felder, dieselbe Bedeutung wie bei `clear_zone`
(M5.1: unter den Stapel, Reihenfolge bleibt, ohne `faceDown` behält jede Karte
ihre Seite). Die Hälfte, die „Karten unter einen Stapel zurücklegen" ausmacht,
steht heute **inline im `clear_zone`-Zweig**; sie wandert in eine Funktion
`returnToStack(state, cards, stack, faceDown)` daneben, und beide Zweige rufen
sie. Zweimal hinzuschreiben wären zwei Antworten auf dieselbe Frage (M6) — genau
die Begründung, mit der M15.3/AR1 schon `moveIntoZone` herausgezogen hat.

Ohne `targetStackLabel` bleibt `clear_table` Wort für Wort, was es war.
Ein **Asset** kann nicht in einen Kartenstapel: es bleibt liegen und steht mit
Namen im Protokoll — derselbe Satz wie im `clear_zone`-Zweig.

**Änderung, Teil 2 (Vokabular).** `client/src/utils/sequenceSteps.js`:
`clear_table` bekommt die Felder `targetStackLabel` und `faceDown`, eine
Zusammenfassung („… back under stack ‚X', face down") und die Vorgabe `''`
(kein Ziel = löschen, wie bisher — eine geratene Vorgabe wäre hier die
gefährlichste).

**Änderung, Teil 3 (Daten).** In der Aktion „Dorfphase beginnen" des Aufbaus
*TFT Kurzpartie* ersetzt **ein** Schritt die drei Handzonen-Schritte 5–7:

```json
{ "type": "clear_table",
  "category": ["Dorf-Ereignisse", "Dorf-Ereignisse (Üble Nachbarn)"],
  "targetStackLabel": "Dorf-Ereignisse", "faceDown": true }
```

Er steht an **Position 1** (direkt hinter `require_zone`), also vor jedem
Schritt, der löscht. Die drei `clear_zone`-Schritte fallen weg: der neue
Schritt findet dieselben Karten (Handzonenkarten sind lose Tischkarten) und
zusätzlich jede andere. 45 Schritte werden 43.

**Abnahme.**
1. Roter Test zuerst in `server/test/`: `clear_table` mit `targetStackLabel`
   legt eine Karte der genannten Kategorie **unter** den Stapel, lässt die
   `zIndex` der vorhandenen Karten aufrücken und setzt `faceDown`; ohne
   `targetStackLabel` löscht es wie bisher; ein Asset bleibt liegen und steht
   im Protokoll.
2. `returnToStack` ist eine Funktion, und `clear_zone` benutzt sie — der
   vorhandene `clear_zone`-Test bleibt unverändert grün.
3. `sequenceSteps`-Test: die Felder und die Zusammenfassung.
4. Datenänderung mit Trockenlauf vorab, dann **eine** `db.transaction`, dann
   Kontrollausgabe. Gelesen und geschrieben wird **nur `action_data`**.
5. Am Tisch: eine Dorf-Ereigniskarte frei irgendwo ablegen, „Dorfphase
   beginnen" drücken → die Karte ist weg, der Stapel `Dorf-Ereignisse` zählt
   wieder 80, auf der Ladenauslage liegt keine Ereigniskarte (Sichtprüfung).

---

## BJ — Der Würfel behält seine Größe am Bildschirm (M19.4)

### BJ1 — gegen „Enlarge", für Lesbarkeit am Tisch

**Befund, nachgemessen.** Der Würfel, der in Partie 10 rund zwanzigmal geworfen
wurde, ist ein **Eigenwürfel** mit Bildseiten (`Würfel 1`, Wurf #19 steht noch
dran). Bei 41 % ist sein ganzer Kasten **32,8 × 49,4** Bildschirmpunkte, die
Bildseite darin knapp 20. Der Standardwürfel daneben zeichnet seine Augenzahl
mit `text-2xl` = 24 Weltpunkten, am Bildschirm also **knapp 10**. Beides ist
genau das, was der Bericht meldet.

**Entscheidung: kein Overlay.** „Enlarge" (M11.6) ist für das
Bösewicht-Tableau gebaut — ein textreiches Bild, das man einmal je Kampf liest.
Ein Würfel wird je Partie zwanzigmal *abgelesen*. Zwei Klicks je Wurf sind
vierzig Klicks; der Zoom-Ausflug, den sie ersetzen sollen, war einer. Dazu:
`tokenPreview` antwortet ohne `imageUrl` `null`, und ein Menüeintrag, der eine
leere Fläche öffnet, ist der Fehler aus `docs/audit-dead-controls.md`.

**Änderung.** Ein Würfel ist ein **Bedienwidget**, kein Spielstein: seine Größe
auf dem Tisch bedeutet nichts (er steht auf keinem Feld, er verdeckt nichts, was
zu ihm gehört). Er bekommt deshalb eine Gegenskalierung — `transform:
scale(1/zoom)` um seinen eigenen Mittelpunkt —, so dass er **am Bildschirm immer
gleich groß** ist. Bei 41 % wächst er von 32,8 auf 80 Punkte, die Bildseite von
20 auf 48, die Augenzahl von 10 auf 24. Kein Klick, kein Zoom, keine zweite
Ansicht.

Die Rechnung („welcher Faktor, und von welchem Punkt aus") gehört nicht ins JSX,
sondern als reine Funktion neben die anderen Maße — `client/src/utils/
tokenLayer.js` hält mit `WIDGET_BOX` schon die Kästen der Bedienwidgets. Dort
kommt `widgetScale(zoom)` dazu und wird aus `server/test/` geprüft.

**Alle drei Würfelarten** (`die`, `customDie`, `hitDie`), nicht nur die gemeldete:
sie stehen in `WIDGET_BOX` nebeneinander, haben dieselbe Aufgabe und werden
gleich gezeichnet. Eine davon anders zu behandeln wäre die zweite Mechanik, die
M6 verbietet. **Zähler und Notizen bleiben unberührt** — ein Zähler steht
absichtlich neben seinem Tableau, seine Lage *ist* seine Aussage; der Bericht
beanstandet an ihnen auch nichts (U4 ist ein Ausschnitts-, kein
Lesbarkeitsproblem).

**Der Preis, ausgesprochen:** bei kleinem Zoom deckt ein Würfel mehr Tisch ab
als bisher. Er liegt am Rand, und er lässt sich wegziehen.

**Trefferfläche.** `barObjectAt` (M14.5) misst Bedienwidgets über `WIDGET_BOX`
in Weltpunkten. Weil der gezeichnete Kasten jetzt mit dem Zoom wächst, muss
dieselbe Zahl dort mitwachsen — sonst wäre die Trefferfläche eines Würfels unter
einer Leiste kleiner als sein Bild. Dieselbe eine Funktion liefert den Faktor
für beides.

**Abnahme.**
1. Roter Test: `widgetScale(zoom)` ist `1/zoom` für sinnvolle Zoomwerte, `1` für
   `0`, `NaN`, `null` und negative Werte (ein kaputter Zoom darf nichts
   verschwinden lassen).
2. Quellentest: alle drei Würfelzweige im JSX tragen den Faktor, und
   `barObjectAt` rechnet ihn auf `WIDGET_BOX` der drei Würfelarten.
3. `cd client && npx vite build` bringt keine neue Warnung.
4. Am Tisch bei **41 %**: die Augenzahl des Standardwürfels und die Bildseite
   des Eigenwürfels sind ohne Zoomwechsel lesbar; „Roll" lässt sich treffen;
   der Würfel lässt sich ziehen (Sichtprüfung, Maus **und** Touch).

---

## BK — Eine Figur auf ihrem Gelände gehört der Figur (M19.1)

### BK1 — `pickTopmost` bekommt das Feldmaß, statt es zu raten

**Befund.** Phase 0, Messung 2, und „Wo die Spec nicht stimmt", 2 und 3.

**Die Ursache, Zeile für Zeile.** `pickTopmost` ordnet die Stücke unter dem
Zeiger nach Fläche (M8.2: kleiner gewinnt). M11.9 hat eine Ausnahme ergänzt: wer
in der **Mitte** eines Stücks drückt, bekommt dieses Stück, auch wenn es größer
ist. Als Maß für „Mitte" dient ein halbes Feld — und **das Feld rät die
Funktion**, nämlich als kleinste Kantenlänge unter dem Zeiger:

```js
const half = Math.min(...under.map(u => u.side)) / 2;
```

Steht eine Figur allein auf einem Geländeteil, ist das kleinste Stück unter dem
Zeiger die **Figur selbst**. Beim 2 × 2-Bösewicht ist das geratene Feld damit
doppelt so groß wie das echte, und die „Mitte" des 7 × 4-Geländeteils wird zu
einem 100 × 100 großen Bereich um seinen Mittelpunkt — den der Bösewicht
überdeckt. Dort stehen beide in der „Mitte", und innerhalb der Mitte entscheidet
der **nähere Mittelpunkt**: das Geländeteil gewinnt.

**Änderung.** Zwei Sätze, beide in `pickTopmost`:

1. **Das Feld wird übergeben, nicht geraten.** `pickTopmost(point, items,
   field)`. Ohne `field` bleibt alles, wie es war (der geratene Wert) — ältere
   Aufrufe und Tische ohne Raster verhalten sich unverändert.
2. **Die Mitte ist nur bei einem Stück ein Griff, das höchstens zwei Felder
   misst.** Alles Größere ist Untergrund: auf seinen Mittelpunkt zielt niemand,
   der liegt irgendwo im Gelände. Zwei Felder, weil das die größte Figur im
   Spiel ist (der Bösewicht) — und weil genau dieser Fall M11.9 war.

Die Reihenfolge innerhalb der Mitte (näherer Mittelpunkt) bleibt unberührt, und
außerhalb bleibt M8.2/M9.1/M10.1 Wort für Wort stehen.

Das Feldmaß liefert das Raster unter dem Zeiger. `shared/gridGeometry.js` kennt
die Zellmaße bereits in `dims`, exportiert sie aber nicht; dort kommt
`fieldAt(grids, x, y)` dazu (kleinere Zellkante des Rasters unter dem Punkt,
sonst `0`) — **eine** Stelle, die diese Frage beantwortet, neben `gridAt`, das
sie schon halb beantwortet.

Aufrufer sind `handleObjDragStart` (der Zug) und `barObjectAt` (der Zug unter
einer Leiste). Beide haben `tableGrids` zur Hand; beide bekommen dieselbe Zahl,
sonst griffe man unter der Leiste etwas anderes als daneben.

**Was nicht gebaut wird: die Rückmeldung.** Die Abnahme der Spec endet mit
„Bewegt sich etwas anderes, sagt der Tisch es." Nach dieser Änderung bewegt sich
nichts anderes mehr — eine Meldung bei jedem Zug wäre eine zweite Mechanik für
einen Fall, den es nicht mehr gibt, und bei zwanzig Zügen je Kampfrunde Lärm.
Was der Tisch bereits sagt: das gegriffene Stück wandert unter dem Zeiger mit,
und der Zeiger steht auf `grabbing`.

**Abnahme.**
1. Roter Test zuerst: Bösewicht (2 × 2 Felder) vollständig auf einem
   Geländeteil (7 × 4 Felder), Feldmaß 50 übergeben. Ein Druck auf **jeden**
   Punkt im Bösewicht-Kasten — Mittelpunkt, der Punkt über dem Mittelpunkt des
   Geländeteils, und ein Punkt dazwischen — liefert den Bösewicht.
2. Die neun vorhandenen `pick-topmost`-Tests bleiben unverändert grün
   (sie übergeben kein Feldmaß und messen damit das alte Verhalten).
3. Dieselben M11.9-Fälle noch einmal **mit** Feldmaß 50: der Griff in die Mitte
   des Bösewichts nimmt den Bösewicht, der Griff auf dem Feld des Dörflers nimmt
   den Dörfler.
4. `fieldAt` hat eigene Tests: Raster unter dem Punkt, kein Raster, Raster mit
   nicht-quadratischen Zellen (die kleinere Kante gilt), kaputte Eingabe.
5. Am Tisch bei **41 %**: eine Figur auf einem Geländeteil lässt sich an jeder
   Stelle ihres Kastens ziehen, ohne dass das Geländeteil wandert
   (Sichtprüfung).

---

## BL — Angelegt trägt die Karte selbst (M19.6)

### BL1 — die Farbe der Zone wandert an den Kartenrand

**Befund.** M18 unterscheidet angelegt von weggepackt über die **Zone**
(`color: "green"` gegen `null`), und das ist richtig so — „angelegt" ist eine
Lage, kein Feld an der Karte. Gezeichnet wird die Unterscheidung aber nur an der
**Fläche**: wer die Karte ansieht, sieht ihr nichts an.

**Nachgemessen in den Daten** (Aufbau *TFT Kurzpartie*, 45 Zonen): genau die
**fünfzehn** Ausrüstungs-Slots tragen `color: "green"`, **alle dreißig anderen**
Zonen tragen `null`. Die Farbe ist also heute schon die Aussage „diese Zone ist
etwas Besonderes" — und zwar die einzige Aussage dieser Art, die ein Setup an
einer Zone treffen kann, ohne ein Feld zu erfinden.

**Änderung.** Eine Karte, die in einer **farbigen** Zone liegt, trägt deren
Farbe als Rahmen. Keine neue Eigenschaft an der Karte, kein neues Feld, kein
neues Vokabular — die Darstellung wird aus der **Lage** abgeleitet, dort, wo
gezeichnet wird (`renderCard` in `GameTable.jsx`). Eine Karte im Vorrat
(`color: null`) sieht aus wie bisher.

Die Zuordnung Farbname → Hex steht heute in `ZoneOverlay.jsx` (`COLOR_HEX`).
Sie wandert nach `shared/zoneGeometry.js`, weil sie jetzt an zwei Stellen
gebraucht wird; eine zweite Tabelle wären zwei Antworten darauf, welches Grün
gemeint ist (M6).

Welche Zone eine Karte trägt, beantwortet `zoneAt` — dieselbe Funktion, mit der
`handleObjDragEnd` schon entscheidet, in welcher Zone eine Karte landet. Eine
zweite Suche danebenzustellen wäre eine zweite Antwort; und weil `zoneAt` von
hinten sucht, gewinnt bei überlappenden Zonen die spätere — die Slots stehen in
den Daten hinter `Ausrüstung Dörfler N`, also gewinnt der Slot.

**Die Entscheidung gehört nach `shared/`**, nicht ins JSX: `cardTint(zones,
card)` gibt den Hex-Wert oder `null` und wird aus `server/test/` geprüft. Im JSX
bleibt eine Zeile.

**Rangfolge der Rahmen.** Ziel-Leuchten (grün, M10.9), Auswahl (blau) und Stapel
(gelb) sind **Vorgänge** und bleiben vorn; die Zonenfarbe ersetzt allein den
Ruhezustand `border-white/30`. Eine angelegte Karte, die gerade ausgewählt ist,
zeigt die Auswahl — sonst stünde beim Ziehen die Herkunft über dem Ziel.

**Bei 41 % lesbar**, nicht nur vorhanden: ein 2 Punkte breiter Rahmen ist dort
0,8 Bildschirmpunkte. Die Karte bekommt deshalb zusätzlich einen Ring von 4
Weltpunkten in derselben Farbe — dieselbe Bauform, die das Ziel-Leuchten schon
benutzt (`ring-4`), nur in der Farbe der Zone.

**Abnahme.**
1. Roter Test: `cardTint` gibt für eine Karte in einer grünen Zone `#22c55e`,
   für eine Karte in einer farblosen Zone `null`, für eine Karte außerhalb jeder
   Zone `null`, und wirft bei kaputter Eingabe nicht.
2. Quellentest: `COLOR_HEX` steht genau einmal im Projekt, und `ZoneOverlay`
   liest dieselbe Tabelle.
3. `cd client && npx vite build` bringt keine neue Warnung.
4. Am Tisch bei **41 %**: eine Karte in `Dörfler 1: Brust` ist grün gerahmt,
   dieselbe Karte in `Ausrüstung Dörfler 1` nicht; der Unterschied ist
   erkennbar, ohne die Zonenrahmen zu sehen (Sichtprüfung).

---

## BM — Der Tisch fragt nach, wenn alle Lebenszähler auf 0 stehen (M19.5)

### BM1 — eine Vorbedingung, die einen Zähler liest

**Befund.** Siehe „Wo die Spec nicht stimmt", 6: den Zustand gibt es nicht, und
es gibt kein Schrittwort, das einen Zähler als Bedingung liest.

**Änderung, Teil 1 (Executor).** Ein Schrittwort `require_counter`, gebaut wie
`require_zone` und an derselben Stelle im Vokabular:

```json
{ "type": "require_counter", "name": ["Henlo: Leben", "Fridgette: Leben", "Granny: Leben"],
  "above": 0, "confirm": true,
  "message": "Alle drei Lebenszähler stehen auf 0. Nach [DE S.22] ist die Partie damit zu Ende." }
```

Die Bedingung, die **gelten muss**: mindestens einer der genannten Zähler steht
**über** `above` (Vorgabe 0). Kein `expect`-Wörterbuch mit einem einzigen
Eintrag, sondern das eine Feld, das die Frage beantwortet.

Gilt sie nicht, hält die Folge an — wie `require_zone`, über `ctx.halted`, nicht
über einen Wurf (`executeSequence` wirft nie). Der Spieler liest `message`
(`issueLine`, K2), die Diagnose mit den Zählerständen steht im Protokoll.

Ein Zähler, den es nicht gibt, ist **kein** erfüllter Zustand: dieselbe
Entscheidung wie bei `require_zone` („eine Bedingung, die sich nicht prüfen
lässt, ist keine erfüllte") — sonst hinge die Wache an einem Tippfehler.

**Änderung, Teil 2 (Client).** `confirm: true` am Schritt macht aus dem Halt eine
**Rückfrage**. `runSetupAction` findet im Protokoll den anhaltenden Schritt mit
`confirm` und öffnet denselben `SwipeModal`, mit dem M14.7 vor dem Löschen
fragt — kein `window.confirm` (die Umgebung beantwortet Browserdialoge am Tisch
nicht, M12.2). Bestätigt der Spieler, läuft **dieselbe Aktion ohne diesen einen
Schritt** noch einmal. Kein zweiter Weg durch den Executor, kein Zustandsbit:
die Folge ist eine Liste, und eine Liste ohne ihre Wache ist eine Liste.

Ohne `confirm` ist `require_counter` eine Wache wie jede andere — das Feld ist
die eine Entscheidung, die das Setup trifft.

**Änderung, Teil 3 (Vokabular + Daten).** `sequenceSteps.js` bekommt den Typ
(Felder `name`, `above`, `confirm`, `message`), und die Aktion „Dorfphase
beginnen" bekommt den Schritt **an Position 1**, direkt hinter dem vorhandenen
`require_zone`.

**Was der Tisch nicht tut.** Er erklärt die Partie nicht für beendet, räumt
nichts anders ab und legt das Bösewicht-Tableau weiterhin dorthin, wo der
Aufbau es hinlegt. Er nennt den Zählerstand und fragt. (Dass das Tableau bei
einer Niederlage in `Besiegte Bösewichte` landet, ist im Bericht als
**kosmetisch** geführt und bleibt, wie es ist — der Tisch kennt keinen Sieger.)

**Abnahme.**
1. Roter Test zuerst: `require_counter` lässt durch, solange ein genannter
   Zähler über 0 steht; es hält an und trägt `message`, wenn alle auf 0 stehen;
   ein unbekannter Zählername hält an; die Schritte dahinter laufen nicht.
2. `sequenceSteps`-Test: Felder, Vorgaben und Zusammenfassung.
3. Quellentest: `runSetupAction` öffnet bei einem anhaltenden Schritt mit
   `confirm` die Rückfrage und führt die Aktion danach **ohne diesen Schritt**
   aus.
4. Datenänderung mit Trockenlauf, einer `db.transaction` und Kontrollausgabe —
   **nur `action_data`**.
5. Am Tisch: alle drei Lebenszähler auf 0 → „Dorfphase beginnen" räumt nichts
   ab und fragt nach; „Abbrechen" lässt den Tisch unberührt, „Trotzdem" räumt
   ab wie bisher. Mit mindestens einem Zähler über 0 kommt keine Rückfrage
   (Sichtprüfung).

---

## Nicht Teil dieser Liste

- **M19.2** — Artefakt, siehe Phase 0.
- **U2** (keine Rasterbeschriftung im Spielausschnitt), **U4** (Zähler und
  Schlachtfeld nie zugleich), **U5** (die Ablage zeigt nicht die zuletzt
  aufgedeckte Karte), **U6** (die offen eingemischte Karte verrät sich), **U7**
  („unter den Nachschub schieben" gibt es nicht), **L1**, **L2**, **L3** aus
  `docs/partie10-bericht.md` — eigene Befunde ohne Spec-Nummer.
- **`remove_stack` löscht fremde Karten mit** — siehe „Wo die Spec nicht
  stimmt", 4.
- **Ä1, Ä2, M14.13** — bekannt und im Bericht ausdrücklich nicht erneut
  gemeldet.

---

## Nachträge aus der Umsetzung

### 1. Warum das Werkzeug keine Züge erzeugt — die Erklärung, nicht nur der Befund

`handleObjDragStart` setzt `draggingObj` über `setDraggingObj`, und
`handleGlobalMove` liest `draggingObj` aus dem Abschluss des **aktuellen**
Renders. Kommen Druck und Bewegungen in einer einzigen JS-Aufgabe, hat React
dazwischen nicht neu gerendert — jedes `mousemove` sieht `draggingObj === null`
und tut nichts. Mit einem `requestAnimationFrame` zwischen je zwei Ereignissen
greift derselbe Zug auf den Pixel genau.

Das erklärt alle drei bisherigen Artefakte an einer Stelle: die „halbe Strecke"
aus Partie 6/7, die „70-Pixel-Schwelle" (M19.2) und den Zug, der angeblich das
Geländeteil erwischt (M19.1 in der gemeldeten Form). **Wer künftig misst,
schickt einzelne Ereignisse und lässt dazwischen einen Bildwechsel zu.**

### 2. BK — die Regel, die am Ende dasteht

Fünf Fassungen sind an einem der sieben Fälle gescheitert (M11.9 Abnahme 1,
M8.2 Abnahme 2/3, M10.1, und der neue Fall). Was trägt, sind **zwei** Sätze,
nicht einer:

1. Das Feld wird übergeben (`fieldAt`), statt als kleinste Kantenlänge unter
   dem Zeiger geraten zu werden.
2. In die „Mitte"-Auswahl kommt nur, was **höchstens zwei Felder** misst.

Der zweite Satz ist der entscheidende: die Reihenfolge *innerhalb* der Mitte
(näherer Mittelpunkt) lässt sich nicht retten, denn der Mittelpunkt eines
7 × 4-Geländeteils ist nun einmal ein Mittelpunkt. Ihn gar nicht erst
mitreden zu lassen ist die einzige Fassung, die M11.9 **und** M19.1 hält.
Ohne Feldmaß gilt beides nicht — ein Tisch ohne Raster verhält sich wie vorher,
und die neun vorhandenen `pick-topmost`-Tests messen genau das.

### 3. BI — es gab einen dritten Weg zur 79

Neben „die Karte liegt irgendwo" und „die Karte steckt im Verhaltensdeck" gibt
es einen dritten: `clear_zone` auf `Ablage` (Schritt 4 der alten Folge) hat
**kein** Ziel und **keine** Kategorie, löscht also alles, was dort liegt — und
genau dorthin verlangt *Schwitzige Hände* auf der Karte gelegt zu werden. Weil
der neue Schritt an **Position 2** steht, also vor jedem löschenden, deckt er
alle drei Wege mit einer Zeile ab. Am laufenden Tisch nachgestellt: Ereignis in
die Ablage aufgedeckt (80 → 79), „Dorfphase beginnen" bestätigt, Stapel wieder
**80**.

### 4. Sichtprüfung, Spielzoom 38 %

| | Ergebnis |
|---|---|
| BJ | Die Augenzahl ist **32 Bildschirmpunkte** hoch statt 9; „Roll" trifft (9 → 14, Zähler #2), der Würfel lässt sich ziehen. |
| BK | Druck genau über dem Mittelpunkt des *Überwucherten Maisfelds*, der unter dem Bösewicht liegt: der **Bösewicht** rückt zwei Felder, das Maisfeld steht still. |
| BL | Zwei Karten in Slot-Zonen tragen den grünen Rahmen, die vier Karten im Vorratsband darunter nicht — der Unterschied ist bei 38 % ohne die Zonenrahmen erkennbar. |
| BM | Mit allen drei Lebenszählern auf 0 räumt „Dorfphase beginnen" nichts ab und fragt; „Abbrechen" lässt den Tisch unberührt, „Trotzdem" räumt ab. |
| BI | Ereignisstapel nach dem Abräumen wieder **80**, keine Ereigniskarte auf der Auslage, keine Meldung im Band. |

Nebenbei bestätigt: die angelegten Karten überdauern „Dorfphase beginnen"
(M18 Abnahme 7) und tragen ihren Rahmen danach weiter.

### 5. Datenänderung

Aktion „Dorfphase beginnen" im Aufbau *TFT Kurzpartie*: **45 → 44** Schritte.
Entfernt die drei `clear_zone` auf `Hand Dörfler 1–3`, neu an Position 1 und 2
die Wache und der eine `clear_table`. Trockenlauf vorab, dann **ein** `PUT` mit
ausschließlich `action_data` (die Route schreibt mit `COALESCE`, die übrigen
Spalten bleiben unberührt). Kontrollausgabe danach: 45 Zonen, 3 Szenarien,
65 Aufbau-Schritte — alles unverändert.
