# Aufgaben: Befunde aus der fünften Solopartie (Spec M12.1–M12.5)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M12**.

**Warum zwei Buchstaben.** Vergeben sind `A`–`H`, `J`–`N` und `P`–`Z`; `M`
bleibt den Spec-Abschnitten selbst. Übrig wären nur `I` und `O`, und die sind
seit `docs/tasks-ablegen.md` ausdrücklich gesperrt: `I1` und `O1` sind von `11`
und `01` nicht zu unterscheiden, und Aufgabennummern stehen in Testnamen und
Commit-Zeilen, wo niemand nachschlägt. Also `AA…`–`AE…` — eine Aufgabengruppe
je Befund, in derselben Reihenfolge wie die Spec.

**Gilt für jede Aufgabe.** Erst der rote Test, dann die Umsetzung. Tests laufen
mit `cd server && npm test`, der Bau mit `cd client && npx vite build`. Der
Client hat keine Testinfrastruktur (CLAUDE.md) — reine Logik gehört deshalb
nach `client/src/utils/` oder `shared/` und wird aus `server/test/` geprüft;
was zwingend in der Auszeichnung steht, bekommt einen Quellentest nach dem
Muster von `server/test/table-bars.test.js`. Die Engine ist berührungsfähig:
jeder neue Knopf ist fingergroß.

---

## Vorab: drei Stellen, an denen der Auftrag nicht gestimmt hat

### 1. M12.3 — die Diagnose im Befund ist falsch

Der Befund sagt: „`Bösewicht-Tableau` hat `layout: "column"` und
`capacity: 1` — dort zählt weiterhin das Rechteck." Nachgesehen in `zoneSlots`:

```
zoneSlots({label:'Bösewicht-Tableau', x:1200,y:100,width:440,height:340,
           capacity:1, layout:'column'})
→ [ { x: 1420, y: 270 } ]
```

Die Zone **hat** einen festen Platz. `countInZone` beantwortet für sie schon
heute die richtige Frage: eine fremde Karte bei (1250,150) liegt im Rechteck,
auf keinem Platz — `objectsInZone` zählt 1, `countInZone` zählt 0. M11.8 war
also **nicht unvollständig**.

Der wirkliche Grund ist ein anderer und allgemeiner: `require_zone` (M9.3)
fragt gar nicht `countInZone`, sondern `objectsInZone(…).length`. Es ist der
einzige verbliebene Ort im Executor, der eine **Belegung** aus dem Rechteck
liest — alle Austeilschritte gehen seit M11.8 über `occupancy` →
`countInZone`. `require_zone` ist schlicht nie mitgezogen worden, weil es
älter ist als der Fix und in keiner der beiden Familien (M8.1, M9.4) vorkam.

**Folge für den Zuschnitt:** die Aufgabe ist kein Sonderfall für `column`,
sondern ein Wort an einer Stelle. Was `layout` und `capacity` sagen, ist
unerheblich.

### 2. M12.1 Abnahme 2 und 3 vertragen sich nicht miteinander

Abnahme 2 bietet zwei Wege an („verschwindet von selbst, **oder** liegt nicht
über dem Tisch"), Abnahme 3 verlangt, dass die Meldung lesbar bleibt.

**„Von selbst verschwinden" fällt aus.** Das Band ist die **einzige** Stelle,
an der das Protokoll eines Aufbaus überhaupt sichtbar wird: `GameTable.jsx`
ruft `executeSequenceWithLog` und setzt `setSetupIssues(bad.length ? bad : null)`
— es gibt kein Protokollfenster daneben, in dem man nachlesen könnte. Dazu
kommt, dass diese Listen lang werden: M11.2 hatte sechzehn Zeilen. Ein Band,
das nach ein paar Sekunden weg ist, verliert genau die Auskunft, wegen der es
steht, und Abnahme 3 sagt selbst, das wäre schlimmer.

**„Nicht über dem Tisch" fällt auch aus.** Der Tisch ist die ganze Fläche. Es
gibt keine Stelle, die nicht über ihm liegt — das ist genau die Beobachtung,
mit der der Befund endet.

Bleibt der dritte Weg aus dem Auftrag: **das Band durchlässig machen, bis auf
sein ×**. Damit erreicht der Zug das Raster (Abnahme 1), die Meldung bleibt
stehen, solange sie jemand braucht (Abnahme 3), und Abnahme 2 ist in ihrem
Zweck erfüllt — sie *ist* Abnahme 1, nur als Bauform ausgesprochen. Notiert,
nicht weggeredet: dem Wortlaut von Abnahme 2 genügt es nicht.

**Preis:** `server/test/table-bars.test.js` behauptet heute das Gegenteil
(„`pointer-events-auto` an jedem Band"). Diese Zeile stammt aus M11.1 und
meinte, dass das × klickbar sein muss. Sie wird auf das × verschoben, nicht
gestrichen.

### 3. M12.5 — Versetzen bricht M8.9 nicht, aber es braucht einen Deckel

M8.9/D2 hat `topZIndex` eingeführt, damit die zuletzt abgelegte Karte **oben**
liegt. Ein Versatz rechnet nur an `x`/`y` und fasst `zIndex` nicht an; die
Reihenfolge bleibt. Umgekehrt trägt der Versatz sie erst: die oberste Karte
ist danach diejenige, die am weitesten versetzt liegt, und damit die, die man
greift.

Was der Auftrag zu Recht nachfragt: **passt der versetzte Stapel noch in seine
Zone?** Nein, nicht ungedeckelt — und das wäre kein Schönheitsfehler. Ob eine
Karte „in" einer Zone liegt, entscheidet `zoneContains` über ihren
**Mittelpunkt**. Wandert der aus dem Rechteck, zählt die Karte nicht mehr zur
Zone: `clear_zone` findet sie nicht mehr, `require_zone` sieht sie nicht, der
Ablagestapel verliert seine unterste Karte an den Tisch. Der Versatz wird
deshalb auf ein Viertel der kürzeren Zonenseite gedeckelt.

---

## AA — Das Meldeband schluckt keine Züge mehr (M12.1)

### AA1 — Die Bänder werden durchlässig, ihre × bleiben klickbar

**Warum.** Ein Zug von `F9` nach `F11` bewegte nichts, weil das Band
`setup-issues` von x≈155 bis 650 und y≈160 bis 250 darüber stand. Es hängt im
Fluss der Kopfleiste (die selbst `pointer-events-none` ist, seit M11.1) und
setzt sich mit `pointer-events-auto` wieder davor — für seinen eigenen Körper,
der nichts anzunehmen hat.

**Umsetzung.** In `client/src/pages/GameTable.jsx` bei allen drei Bändern
(`setup-issues`, `save-toast`, `draw-toast`) `pointer-events-auto` vom Körper
an den ×-Knopf. Sonst nichts: keine Zeitschaltung, kein Ortswechsel, keine
zweite Schicht.

**Prüfung.** `server/test/table-bars.test.js`, dort wo M11.1 schon liest: kein
Band nimmt an seinem Körper Klicks an, jedes × tut es. Ein Quellentest, weil
der Fehler in der Auszeichnung sitzt und es für den Client keine andere Prüfung
gibt.

**Abnahme.** M12.1 (1) und (3) vollständig, (2) dem Zweck nach.

---

## AB — „Save current view" bekommt einen eigenen Dialog (M12.2)

### AB1 — `window.prompt` raus, Dialog wie bei „Save Game"

**Warum.** `saveCurrentView()` ruft `window.prompt`; die Umgebung beantwortet
das mit `prompt() is not supported`, der Rückgabewert ist `null`, die Funktion
kehrt still um. Keine Ansicht, keine Meldung — und Schwenken und Zoomen von
Hand war der größte einzelne Zeitfresser der Partie.

**Umsetzung.** Der Dialog wird **nicht erfunden**: „Save Game" daneben hat
einen (`SwipeModal` + `save-name-input` + Abbrechen/Bestätigen). Dasselbe
Muster mit `viewName`/`showViewSaveModal`. Die Logik dahinter steht schon und
bleibt unangetastet — `putView` in `client/src/utils/tableViews.js` ersetzt
gleiche Namen und deckelt bei `MAX_VIEWS`.

**Prüfung.** `server/test/client-hygiene.test.js` (neu): in `client/src/` steht
kein `window.prompt`, `confirm` oder `alert`; der Dialog und sein Eingabefeld
sind da; der Bestätigungsknopf ruft `putView`.

**Abnahme.** M12.2 (1) und (2).

---

## AC — Eine fremde Karte im Rechteck sperrt nichts mehr (M12.3)

### AC1 — `require_zone` zählt Plätze, nicht Rechtecke

**Warum.** Siehe „Vorab 1". `require_zone` ist der letzte Ort im Executor, der
eine Belegung aus `objectsInZone(…).length` liest.

**Umsetzung.** In `shared/sequenceExecutor.js` die eine Zeile auf `countInZone`
umstellen. `countInZone` beantwortet für Zonen ohne feste Plätze weiterhin
dieselbe Frage wie vorher (`freeSlots` gibt `null`, gezählt wird das Rechteck)
— Abnahme 2 ist damit ohne Zutun erfüllt.

### AC2 — Die gescheiterte Vorbedingung sagt, was wirklich in der Zone liegt

**Warum.** „Erst die Dorfphase beginnen — der vorige Kampf steht noch." ist für
den erwarteten Fall geschrieben. Trifft ein anderer zu, schickt der Satz den
Spieler in die falsche Richtung; in der Partie hat er genau das getan.

**Wird das wieder sechzehn Zeilen?** Nein, und das ist die Stelle, an der der
Auftrag zu Recht nachfragt. M9.3 hat die **Zeilen** abgeschafft: fünfzehn
Schritte hinter der Wache bekommen keine eigene Protokollzeile mehr. Was hier
dazukommt, ist ein **Halbsatz an der einen Zeile, die bleibt** — dieselbe
Zeile, die heute schon „(3 further steps skipped)" trägt. Die Auskunft führt,
die Diagnose steht dahinter in Klammern; M9.3 Regel 2 verlangt genau diese
Reihenfolge, nicht das Weglassen.

**Umsetzung.** An die Meldung aus den Daten anhängen, was die Zone belegt:
Anzahl und Namen dessen, was auf ihren Plätzen liegt. Ohne Meldung bleibt es
bei der heutigen Diagnose allein — der Fall ist geprüft und darf sich nicht
ändern.

**Prüfung.** `server/test/sequence-require-zone.test.js` erweitern: eine Karte
im Rechteck, aber auf keinem Platz, hält nichts an; eine besetzte Zone hält an
und nennt, was dort liegt; eine Zone ohne feste Plätze zählt unverändert.

**Abnahme.** M12.3 (1), (2) und (3).

---

## AD — Die Konsole ist wieder ein Werkzeug (M12.4)

### AD1 — Die `[TouchDetection]`-Ausgaben fallen weg

**Warum.** Über 13 500 Zeilen in einer Partie, ältere Ausgaben aus dem Puffer
verdrängt. `getPointerPosition` und `isTouchEvent` hängen an jedem Zeiger-
ereignis, `isTouchDevice` an jedem davon noch einmal — die Zahl ist keine
Übertreibung, sie ist die untere Grenze.

**Umsetzung.** Die sieben `console.log` in `client/src/utils/touchUtils.js`
streichen. Es sind die einzigen im ganzen Client (nachgezählt). `console.warn`
und `console.error` bleiben, wo sie stehen — Abnahme 2. Die Funktionen behalten
ihre Zwischenwerte nur, wo sie sie brauchen; `getDeviceInfo()` gibt sein Objekt
weiterhin zurück, es schreibt es nur nicht mehr hin.

**Prüfung.** `server/test/client-hygiene.test.js`: kein `console.log`,
`console.debug`, `console.info` in `client/src/`.

**Abnahme.** M12.4 (1) und (2).

---

## AE — Ein Ablagestapel sieht aus wie ein Stapel (M12.5)

### AE1 — `stackPoint`: der Platz der n-ten Karte auf einem Ablagestapel

**Warum.** `freeSlots` gibt für `layout: 'stack'` absichtlich `null` (ein Platz
nimmt beliebig viele Karten — das ist M8.9 Regel 2), und `spotFor` fällt
deshalb auf `zoneCenter` zurück. Sechs Karten, eine Koordinate.

**Umsetzung.** `shared/zoneGeometry.js` bekommt `stackPoint(zone, n)`: die
Mitte, versetzt um `n · 6` Pixel nach rechts unten, gedeckelt auf ein Viertel
der kürzeren Zonenseite (siehe „Vorab 3"). `spotFor` benutzt es **nur** für
`layout: 'stack'`; alles andere bleibt, wie es ist — das ist Abnahme 3.

`n` ist, was schon in der Zone liegt, plus die Nummer in dieser Ausgabe.
`zoneRoom` liefert die Zahl bereits als `occupied`; sie wird an `spotFor`
durchgereicht, statt neu gezählt zu werden.

**Prüfung.** `server/test/zone-slots.test.js` (Geometrie: versetzt, monoton,
im Rechteck, Zonen mit Plätzen unberührt) und
`server/test/sequence-reveal-top.test.js` (sechs Karten nacheinander auf die
`Ablage`, alle Koordinaten verschieden, `zIndex` weiterhin aufsteigend).

### AE2 — „Take Top Card" legt nicht fünfmal auf dieselbe Stelle

**Warum.** `performSplit` rechnet `x: c.x + Kartenbreite + 30` — eine feste
Stelle neben dem Stapel, unabhängig davon, was dort schon liegt. Fünfmal
abgehoben sind fünf Karten auf einem Punkt.

**Umsetzung.** Kein neues Verfahren: `spawnSlot` aus
`client/src/utils/spawnSlot.js` beantwortet seit M10.5 genau diese Frage
(„erster freier Platz um eine Stelle herum, gefragt wird die Liste, nicht ein
Zähler"). Die bisherige Stelle wird sein Mittelpunkt — der erste Griff landet
damit unverändert dort, wo er immer landete.

**Prüfung.** `spawnSlot` ist in `server/test/spawn-slot.test.js` geprüft; die
Verdrahtung deckt der Vite-Bau. Ein zweiter Test dafür wäre ein Test der
Zuweisung, nicht der Regel.

**Abnahme.** M12.5 (1), (2) und (3).

---

## Nachträge aus der Umsetzung

### 1. AE1 hat einen zweiten Weg auf den Ablagestapel gefunden

`deal_to_zone` ist nicht der einzige Weg, auf dem eine Karte auf einer Zone
landet — `snapPoint` ist der andere, der Zug von Hand. Auch er lieferte für
`layout: 'stack'` die Mitte, und zwar unabhängig davon, was schon dort lag.
Ohne ihn wäre das Ergebnis schlimmer als vorher gewesen: eine hingezogene Karte
wäre **unter** den Fächer gesprungen, den der Aufbau gerade gelegt hat, und
Tisch und Aufbau hätten über dieselbe Zone Verschiedenes gesagt. Eine Zeile,
dieselbe `stackPoint`.

### 2. AB1 hat eine Schicht nachgezogen, die M12.2 nicht nennt

Ein Modal, das Escape nicht schließt, wäre M11.7 zum zweiten Mal — und alle
sechs Geschwister im selben Bildschirm schließen. `viewSaveModal` steht deshalb
in `ESCAPE_LAYERS`, zwischen `setupSaveModal` und `counterModal`; die
Reihenfolge der vorhandenen bleibt unverändert (M11.7 Abnahme 3). Drei Zeilen
Code, eine Zeile Test.

### 3. Offen geblieben: die Toleranz von `onSlot` ist 0,5 Pixel

`countInZone` nennt einen Platz belegt, wenn etwas **auf dem Punkt** liegt —
`Math.abs(o.x - slot.x) < 0.5`. Für das Austeilen ist das richtig (M11.8
begründet es ausführlich). Für eine **Vorbedingung** ist es eine schmale Kante:
wer das Bösewicht-Tableau von Hand zwei Pixel verschiebt, macht die Zone für
`require_zone` wieder leer, und der Schutz aus M9.3 fällt still weg.

Das ist **keine neue Lücke** — dieselbe Toleranz entscheidet seit M11.8 auch,
ob `place_asset` ein zweites Tableau auf das erste legt. Sie hier mit einer
zweiten, größeren Zahl zu umgehen, wäre eine zweite Antwort darauf, was „auf
einem Platz" heißt, und `zoneGeometry` lehnt genau das ausdrücklich ab. Gehört
in die Spec, nicht in einen Sonderfall im Executor.

### 4. Nebenbefund, nicht angefasst

`npx vite build` meldet seit Längerem
`Duplicate "data-testid" attribute in JSX element` an
`game-table-container` (GameTable.jsx). Steht in keinem M12-Befund und wurde
nicht angefasst.
