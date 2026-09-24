# Aufgaben: Grundfläche aus der Größe (Spec M7.2)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M7.2**. Nummern sind `F…`
(Fläche), damit sie weder mit T1–T9 aus `docs/tasks-kampfvorbereitung.md` noch
mit G1–G6 aus `docs/tasks-gelaendelage.md` kollidieren.

**Gilt für jede Aufgabe.** Wie in G: eine Fähigkeit ist erst fertig, wenn alle
vier Schichten stimmen, und **„nichts zu tun" ist eine gültige Antwort, aber nur
eine geprüfte.** Bei M7.2 ist das besonders wichtig, weil drei der fünf
Abnahmepunkte gar keine neue Zeile brauchen — sie verlangen, dass eine
vorhandene Zeile die neue Antwort *auch* trägt. Genau das ist in M3c und G5
zweimal schiefgegangen.

1. **Ausführung** — `shared/gridGeometry.js`
2. **Schrittvokabular** — `client/src/utils/sequenceSteps.js`
3. **Editor / Tisch** — `client/src/pages/GameTable.jsx`
4. **Serverrouten / Persistenz** — `server/src/websocket/messageHandler.js`,
   `server/src/routes/rooms.js`, die Feldlisten in
   `getGameState`/`loadGameState`

Tests laufen mit `cd server && npm test`.

---

## Vorab: was an M7.2 geprüft wurde und nicht stimmt

Die Abschnitte stehen hier und nicht als Kommentar im Code, weil sie den
Zuschnitt der Aufgaben begründen.

### Die Größe ist am Aufrufpunkt vorhanden — aber nicht bei jedem Aufrufer

Die Sorge aus dem Auftrag („steht `width`/`height` nur im `table_assets`-Satz?")
ist unbegründet: ein Tisch-Token trägt seine Maße seit M3c selbst.
`assetToken()` setzt `width`/`height` aus dem Asset, `getGameState` **und**
`loadGameState` führen beide Felder, und das Drag-Ende in `GameTable.jsx` liest
sie schon (`obj.width` beim `token_move`). Die Regel ist dort also ausführbar.

**Aber `snapInto` hat drei Aufrufer, und zwei davon sind Karten.** Eine Karte
trägt zwar auch `width`/`height`, aber:

- der Karten-Zweig schreibt `hit.width`/`hit.height` **nicht** auf die Karte,
- `card_move` schickt sie **nicht** in den Raum.

Bekäme eine Karte eine abgeleitete Grundfläche, würde sie beim Ziehen nicht,
beim nächsten Laden aber sehr wohl auf Feldmaße gezogen — Tisch und Raum sagten
bis dahin Verschiedenes. Das ist genau der Fehler aus G5, nur andersherum.
Dazu kommt M2.12: Karten haben ein Seitenverhältnis, das gehalten wird; ein
Bereich aus gerundeten Feldzahlen hält es nicht.

**Folge für den Zuschnitt:** die Rechnung ist **nicht** global, sondern wird vom
Aufrufer angeboten. Wer die Größe hineinreicht, bekommt die Grundfläche; wer
nicht, bekommt Zeichen für Zeichen das bisherige Verhalten. Nur das Drag-Ende
für Token reicht sie hinein.

### Die Regel darf nicht für `place_asset` / `build_scenario` gelten

Die Regel in M7.2 ist global formuliert („trägt ein Objekt keinen
Bereichsnamen"), die Abnahme dagegen spricht durchweg von „von Hand auf das
Raster gezogen". Global wäre sie falsch: die Szenariodaten setzen Dörfler über
`"D": ["K11", …]` auf **einzelne** Felder (M7.1-Nachtrag), und eine Dörflerfigur
mit 100×100 auf einem 50er-Raster würde dadurch 2×2 Felder belegen. Das
widerspricht dem Regelwerk *und* M7.1-Abnahme 4 („`C7` verhält sich Zeichen für
Zeichen wie bisher"). Die Rechnung gilt deshalb nur beim Ziehen von Hand.

### Was die Regel mit den vorhandenen Stücken macht

Gerechnet für das Raster `Spielfeld A–S / 1–14` (19×14 Felder), beide plausiblen
Feldgrößen:

| Stück | 50er-Raster | Raster am Brett (1200/19 × 1000/14 = 63×71) |
|---|---|---|
| Figur 100×100 | **2×2** ✔ | **2×1** ✘ — und auf 126×71 gequetscht |
| Figur 50×50 | 1×1 ✔ | 1×1, aber auf 63×71 gezogen |
| Gelände 142×142 | 3×3, wird 150×150 | 2×2, wird 126×143 |
| Gelände 187×187 | 4×4, wird 200×200 | 3×3, wird 189×214 |
| Gelände 350×200 | 7×4, Maße unverändert | 6×3, wird 379×214 |
| Gelände 600×100 | 12×2, Maße unverändert | 10×1, Seitenverhältnis 6,0 → 8,8 |
| Tableau 300×400 | 6×8 | 5×6 |
| Tableau 300×600 | 6×12 | 5×8 |
| Hauptplan 1200×1000 | 24×20 — **passt nicht ins Raster** | 19×14 — genau das ganze Raster |

Vier Befunde daraus:

1. **Auf einem nicht-quadratischen Raster fällt die Regel in sich zusammen.**
   Ein Token speichert seine Größe **quadratisch** (M7.1: der TTS-Import
   schreibt dieselbe Zahl in beide Spalten, der Größenregler schickt
   `{ width: v, height: v }`). Eine quadratische Zahl kann keine
   nicht-quadratische Feldzahl ausdrücken: 100/63,16 rundet auf 2, 100/71,43
   rundet auf 1. Der Bösewicht, das Motiv der ganzen Änderung, bekäme dort 2×1
   statt 2×2 — **Abnahme 1 scheitert an ihrem eigenen Beispiel.** Das ist kein
   Rundungsfehler, sondern die Grenze der Datenquelle.
   *Entscheidung:* die Formel bleibt achsenweise (auf einem quadratischen Raster
   ist sie richtig, und das ist der Normalfall — ein gleichmäßig skaliertes
   Brett behält quadratische Felder). Der Fall steht als offener Punkt unten.
2. **Der Hauptplan ist kein Stück auf dem Raster.** Bei 50er-Feldern ergibt er
   24×20 und passt nirgends hin: `rangeAt` gibt `null`, er rastet gar nicht mehr
   ein (heute rastet er auf eine Feldmitte). Das ist eine Verbesserung — ein
   Brett, an dem das Raster *hängt*, soll kein Feld belegen. Eine eigene Sperre
   braucht es nicht: deckt er das Raster genau ab (verankert, volle Fläche), ist
   das Ergebnis ein Fixpunkt (Bereich = Rasterkasten = Brettkasten, nichts
   ändert sich); deckt er es nur teilweise ab, ist er größer als das Raster und
   die Randregel aus M7.1 fängt ihn. Nachgerechnet, nicht geraten.
3. **Ein abgeleiteter Bereich zieht die Maße nach.** `placeOnGrids` rechnet bei
   `ranged` Maße aus dem Bereichskasten — das ist M7.1 und bleibt so. Für ein
   Stück, dessen Bildgröße nie als Grundfläche gemeint war (142×142, 187×187),
   heißt das: es wird beim ersten Ziehen **einmalig** auf Feldmaße gezogen
   (150×150, 200×200) und ist danach stabil (der Bereichsname schlägt die
   Rechnung, und die Rechnung ist idempotent). Bewusst so: sonst gäben Ziehen
   und Laden zwei Antworten.
4. **Bestehende Stände ändern sich erst, wenn man sie anfasst.** Die Ableitung
   läuft beim Ziehen, nicht beim Laden. Ein Geländestück mit `F7` bleibt nach
   dem Update auf `F7`, in seiner Größe, an seinem Platz. Das ist der Grund,
   die Ableitung **nicht** zusätzlich in `placeOnGrids` zu setzen — dort würde
   sie jedes vorhandene, übergroße Stück beim nächsten Laden um mehrere Felder
   versetzen.

### Rundung: `round` ist richtig

`ceil` und `floor` wären beide falsch, und zwar aus demselben Grund: die Größe
ist eine **verrauschte Angabe einer gemeinten Feldzahl**, kein Hüllrechteck.
Ein aus TTS importiertes Plättchen, das zwei Felder breit sein soll, misst 101
statt 100 — `ceil` machte daraus drei Felder, `floor` bei 99 eines. `round`
verträgt den Fehler in beide Richtungen und trifft die gemeinte Zahl, solange
sie weniger als ein halbes Feld daneben liegt.

### Abnahme 2 stimmt, aber nur auf diesem Raster

„50×50 bleibt Einzelfeld" gilt, solange `50 / cellW < 1,5`, also **bis
cellW ≈ 33,3**. Ab einer Feldgröße von 33 und darunter kippt dasselbe Stück auf
2×2. Bei größeren Feldern (60, 70) bleibt es 1×1, dafür sorgt `max(1, …)`. Der
Satz ist also kein allgemeines Gesetz, sondern eine Aussage über das
50er-Raster; der Testfall hält beide Seiten der Kippschwelle fest.

---

## F1 — `snapToGrid` rechnet die Grundfläche aus der Größe

**Ziel.** Ein Stück, das keinen Bereichsnamen trägt, aber größer ist als ein
Feld, rastet auf den Bereich ein, den es bedeckt — und nur dann, wenn der
Aufrufer seine Größe mitgibt.

**Umfang** (`shared/gridGeometry.js`):

- Eine private `footprint(grid, size)`: `{ cols, rows }` aus
  `max(1, round(width / cellW))` bzw. `height / cellH`, oder `null`, wenn keine
  brauchbare Größe dasteht (fehlend, 0, negativ, NaN). Kein neuer Export — die
  Rechnung wird über `snapToGrid`/`snapInto` geprüft, weil nur das die Aufrufer
  benutzen.
- `snapToGrid(grid, x, y, cell = null, size = null)`: ein **Bereichsname** in
  `cell` schlägt die Rechnung (M7.1 bleibt unangetastet), ein **Einzelfeld**
  schlägt sie nicht (sonst bekäme ein Bösewicht, der einmal auf einem Feld
  stand, nie seine vier). Ohne `size` ist das Verhalten Zeichen für Zeichen das
  bisherige.
- Der zurückgegebene `cell` ist ein Bereichsname, sobald die Grundfläche mehr
  als ein Feld ist; `width`/`height` kommen dann mit, dieselbe Rechnung wie in
  `placeOnGrids`.
- `snapInto(x, y, { …, size })` reicht `size` an `snapToGrid` durch. Neue
  Option, kein geänderter Parameter — die beiden Karten-Aufrufer bleiben
  unverändert stehen.

**Warum ein neuer Parameter und kein globales Verhalten:** siehe oben,
„Die Größe ist am Aufrufpunkt vorhanden". Die Alternative — `snapInto` bekommt
das ganze Objekt statt `cell` — würde acht Testfälle und drei Aufrufer
umschreiben, ohne mehr zu können.

**Dateien.** `shared/gridGeometry.js`.

**Die vier Schichten.**
1. *Ausführung* — `footprint`, `snapToGrid`, `snapInto`.
2. *Schrittvokabular* — **nichts.** `validateStep` prüft den geschriebenen
   Feldnamen; die Rechnung erzeugt keinen. Geprüft, nicht geraten.
3. *Editor / Tisch* — F2.
4. *Persistenz* — F3, F4.

**Abnahmekriterium.** `snapInto` mit `size: { width: 100, height: 100 }` auf
einem 50er-Raster liefert einen Bereichsnamen über 2×2 Feldern samt Maßen;
mit 50×50 ein Einzelfeld ohne Maße; mit `cell: 'C7:D8'` weiterhin 2×2, egal was
die Größe sagt; **ohne** `size` dasselbe Ergebnis wie vor der Änderung.

**Testidee.** Neu: `server/test/grid-footprint.test.js`. Kippschwelle (Feldgröße
34 → 1×1, 33 → 2×2), Größe 0/fehlend/NaN → altes Verhalten, ein Stück größer als
das Raster → kein Treffer.

**Abhängigkeiten.** Keine.

---

## F2 — Der Tisch reicht die Größe hinein, die Karten nicht

**Ziel.** Das Drag-Ende eines Tokens benutzt die neue Rechnung; der Karten-Pfad
bleibt, wie er ist, und zwar begründet.

**Umfang** (`client/src/pages/GameTable.jsx`): der eine `snapInto`-Aufruf im
Token-Zweig von `handleObjDragEnd` bekommt
`size: { width: token.width || token.size, height: token.height || token.size }`.
Das `|| token.size` fängt Tisch-Token aus Ständen vor M3c ab, die nur `size`
tragen. Die beiden Karten-Aufrufe bleiben unverändert; der Grund steht als
Kommentar dort, damit ihn nicht jemand „nachzieht".

**Dateien.** `client/src/pages/GameTable.jsx`.

**Die vier Schichten.**
1. *Ausführung* — F1.
2. *Schrittvokabular* — nichts.
3. *Editor / Tisch* — der Aufruf oben. Das Anwenden von `hit.width`/`hit.height`
   auf das Token steht schon da (G1), ebenso das Löschen der Adresse beim
   Verlassen des Rasters.
4. *Persistenz* — F3, F4.

**Abnahmekriterium.** Handprüfung: eine Figur auf 100×100 über ein 50er-Raster
ziehen — sie rastet auf vier Felder ein und sitzt auf dem Rasterkreuz, nicht auf
einer Feldmitte. Eine Karte über dasselbe Raster ziehen — sie rastet auf ein
Feld ein und behält ihre Maße.

**Abhängigkeiten.** F1.

---

## F3 — Ziehen und Laden geben dieselbe Antwort

**Ziel.** Der abgeleitete Bereich überlebt Speichern und Laden, ohne sich um
einen halben Feldversatz zu verschieben — die Falle aus M3c und G5.

**Umfang.** Voraussichtlich **keine Codeänderung**: `snapToGrid` schreibt die
abgeleitete Grundfläche als Bereichsnamen in `cell`, und `placeOnGrids` liest
genau diesen Namen wieder. Zu prüfen und im Testfall festzuhalten:

- Mitte und Maße aus `placeOnGrids` sind identisch mit denen aus `snapInto`.
- Die Rechnung ist idempotent: das Stück, einmal auf Feldmaße gezogen, leitet
  beim nächsten Ziehen dieselbe Grundfläche ab.
- Ein gewachsenes Brett zieht die Maße mit (M7.1, hier nur nachgeprüft).
- Ein Stück mit Einzelfeld-Adresse ändert beim Laden **nichts** — bestehende
  Stände bleiben, wo sie sind.

**Dateien.** keine (wenn die Prüfung hält).

**Abnahmekriterium.** Ein Testfall, der `snapInto` und `placeOnGrids`
gegeneinander stellt und bei Abweichung fehlschlägt — nicht das Auge.

**Abhängigkeiten.** F1.

---

## F4 — Die abgeleitete Adresse reist in den Raum

**Ziel.** Ein 2×2-Stück behält `width`/`height` in der `token_move`-Nachricht
(G5 bleibt heil).

**Umfang.** Voraussichtlich **keine Codeänderung**: `ADDRESS_FIELDS` führt
`gridId`, `cell`, `width`, `height`, und das Drag-Ende schickt die Maße, sobald
`movedPlace` welche trägt — ein abgeleiteter Bereich trägt welche. Zu prüfen
und festzuhalten:

- `gridAddress` nimmt die Maße eines abgeleiteten Bereichs mit.
- Ein Zug **ohne** Maße überschreibt vorhandene nicht (steht seit G5, gilt
  weiter).
- `rooms.js` ruft `placeOnGrids` nach dem Laden — der Raum kommt auf dieselbe
  Antwort wie der Tisch.

**Dateien.** keine (wenn die Prüfung hält).

**Abnahmekriterium.** Ein Testfall in `server/test/move-address.test.js` mit
einem abgeleiteten Bereich; `npm test` bleibt grün.

**Abhängigkeiten.** F1, F2.

---

## Offene Punkte aus der Planung

- **Nicht-quadratische Raster.** Siehe oben, Befund 1. Solange ein Token seine
  Größe quadratisch speichert, kann sie auf einem Raster mit
  `cellW ≠ cellH` keine richtige Feldzahl ergeben. Wer das braucht, braucht
  getrennte Maße am Token — und damit die Diskussion, die M7.1 unter „Keine
  Größenangabe am Asset" schon einmal geführt hat.
- **Stücke, deren Bildgröße nie Grundfläche war.** 142×142 und 187×187 werden
  beim ersten Ziehen auf Feldmaße gezogen. Das ist die in M7.2 ausdrücklich
  bedachte Folge; der Ausweg ist ein ausdrücklicher Bereich oder die passende
  Größe, beides Daten, kein Code.
- **Keine Ableitung im Sequenz-Executor.** `place_asset` und `build_scenario`
  legen weiterhin auf das Feld, das dasteht. Wer dort Felder statt Bereiche
  geschrieben hat, korrigiert sie als Daten (M7.1 hat es genauso gehalten).
