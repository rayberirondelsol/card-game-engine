# Aufgaben: Ablegen und Anlegen (Spec M10.4, M10.5)

Vertrag ist `docs/spec-setup-system.md`, Abschnitte **M10.4** und **M10.5**.
Nummern sind `J…`, weil T, G, F, S, K, B, R, V, N, A, D, E, Z, L, P, H und W
belegt sind und `M` den Spec-Abschnitten bleibt. `J` und nicht `I` oder `O`,
weil `I1` und `O1` wie `11` und `01` aussehen.

**Gilt für jede Aufgabe.** Eine Fähigkeit ist erst fertig, wenn alle Schichten
stimmen, und „nichts zu tun" ist eine gültige Antwort, aber nur eine geprüfte.
Tests laufen mit `cd server && npm test`.

Schichten hier:

1. **Reine Logik** — `client/src/utils/cardDrop.js`, `client/src/utils/spawnSlot.js`
2. **Verdrahtung** — `client/src/pages/GameTable.jsx` (nur vom Vite-Build
   geprüft, der Client hat keine Testinfrastruktur)

---

## Vorab: vier Stellen, an denen der Auftrag nachgeschärft werden musste

### 1. Das Verschmelzen ist Absicht — und trotzdem der Fehler

Die Frage war, ob hier dasselbe vorliegt wie bei M9.4, wo das Abheben der
obersten Karte eine bewusst gebaute Tabletop-Simulator-Geste war. **Ja.** Der
Zweig trägt den Kommentar „Create new stack from two single cards", er setzt
`maxZIndex` fort, und beim Ziehen leuchtet der Zielstapel vorher auf — es gibt
sogar einen eigenen Platzhalter `'__single_card_target__'` für den Fall „Karte
über Karte". Das ist gebaut, nicht verunglückt, und TTS macht es genauso.

Anders als bei M9.4 ist die Geste hier aber nicht die Lösung, sondern der
Befund: in TTS bleibt die untere Karte als Stapelbild sichtbar, hier
verschwindet sie hinter einer Zahl in der Ecke. Die Spec-Entscheidung („es gibt
`G`, das Ablegen braucht keine zweite Geste") bleibt richtig. Der Preis steht
in **J2**.

### 2. Der Code kennt den Unterschied „Karte auf Karte" / „Karte auf Stapel" — er ist nur nicht der Unterschied, der zählt

Der Auftrag vermutet, die Unterscheidung sei erfunden. Sie ist es nicht:
`handleCardDragEnd` verzweigt ausdrücklich nach `otherCard.inStack` und macht
zwei verschiedene Dinge daraus (beitreten / neuen Stapel gründen). Abnahme 1
und 2 sind also je für sich umsetzbar.

Was der Code **nicht** kennt, ist „auf". Beide Zweige fragen dasselbe:

```js
const dist = Math.sqrt((card.x - otherCard.x) ** 2 + (card.y - otherCard.y) ** 2);
if (dist < STACK_DROP_THRESHOLD) {   // 80
```

Eine Karte ist 100 × 140 (`getCardDims`). Ein Mittelpunktsabstand von 80 in
der Breite heißt **20 Pixel Überlappung** — die Karten liegen sichtbar
nebeneinander, und trotzdem verschmelzen sie. Und die Rasterweite des Tisches
ist ebenfalls 80 (`GRID_SIZE`): das **Nachbarfeld** liegt genau auf der
Schwelle.

### 3. Der belegte Schadensfall: die Abnahme 2 verfehlt ihn — aus einem anderen Grund als vermutet

Die aufgedeckte Karte rutschte in einen **Stapel** zurück; nach Abnahme 2 wäre
das weiterhin erlaubt. Der Auftrag hat damit recht, dass die Regel den Befund
verfehlt. Der Grund steht aber nicht im Unterschied Karte/Stapel, sondern in
der **Reihenfolge der Entscheidungen**:

```js
const dropZone = zoneAt(tableZones, card.x, card.y);
…
hit = snapInto(card.x, card.y, { zone: dropZone, … });   // die Zone entscheidet
…
if (targetStack) { …; return; }                          // und wird verworfen
```

Der Zonenplatz wird ausgerechnet und danach **weggeworfen**, wenn irgendein
Stapel im 80-Pixel-Umkreis der *ungerasterten* Loslassstelle liegt. Eine Karte,
die auf die `Ablage` gelegt wird, kann so im Nachziehstapel daneben landen,
obwohl die Zone sie schon angenommen hatte. Genau das ist der Befund:
Ablagestapel → Nachziehstapel, 11 wieder auf 12.

**Bessere Regel, statt Abnahme 2:**

> Eine Karte tritt einem Stapel bei, wenn sie am Ende **auf ihm liegt** — ihre
> endgültige Stelle, die eine Zone oder das Raster bestimmt hat, liegt
> innerhalb der Kartenfläche des Stapels. Entschieden wird auf der Stelle, die
> die Karte wirklich einnimmt, nicht auf der, wo der Finger losließ.

Das ist eine Regel und keine zwei: wer wirklich auf den Stapel legt, rastet auf
dessen Feld ein (Abstand 0, beitreten); wer auf das **Nachbarfeld** legt, liegt
80 Pixel daneben — außerhalb von ±50 in der Breite und außerhalb von ±70 in der
Höhe, also kein Beitritt. Ein Zonenplatz schlägt damit das Verschmelzen, ohne
dass irgendwo „Zone" stehen muss. Abnahme 2 bleibt erfüllt, der Schadensfall
nicht mehr möglich.

### 4. M10.5: die Kamera ist an der Stelle bekannt — der gemeinsame Zähler ist es, der nicht trägt

`createDie`, `placeCustomDie` und `createHitDie` sind Funktionen von
`GameTable`; `cameraRef` und `containerRef` liegen im selben Bauteil, und
`screenToWorld` (seit M10.2 über `worldAt`) steht zwei Bildschirmseiten
darüber. **Es fehlt keine Leitung**, es wird nur `canvas.width / 2` gerechnet —
eine Bildschirmbreite als Weltkoordinate — plus `(Math.random() − 0.5) * 100`.
Der Zufall ist auch der Grund, warum zwei Würfel deckungsgleich lagen: er
verhindert nichts, er macht es nur unvorhersagbar.

Z7 vermutet, es brauche einen **gemeinsamen Zähler** über Würfel, eigene
Würfel, Trefferwürfel und Zähler. Zwei Drittel davon stimmen:

- **Über die drei Würfelsorten hinweg: ja.** Jede zählt ihre eigene Liste;
  drei Sorten führen sonst drei Reihen, die alle bei Platz 0 anfangen.
- **Zähler mit dazu: nein.** Zähler liegen auf der **absoluten** Ablagereihe
  (`shelfSlot`, M8.6), Würfel künftig **relativ zur Blickmitte**. Ein
  gemeinsamer Zähler würde die Zähler verschieben, sobald Würfel im Spiel sind
  — das bricht M10.5 Abnahme 3 („Zähler und Karten verhalten sich
  unverändert"). Die beiden Familien teilen kein Koordinatensystem, also auch
  keinen Zähler.
- **Ein Zähler ist ohnehin das schwächere Mittel.** Wer zwei Würfel anlegt und
  einen löscht, bekommt vom Zähler Platz 2 — der dritte Würfel liegt auf dem
  zweiten. Gesucht ist der **erste freie Platz**, und das ist eine Frage an
  die Liste, nicht an einen Zähler. Kostet dieselben zehn Zeilen.

`shelfSlot` selbst reicht für Abnahme 1 nicht, und zwar unabhängig davon:
es ist eine Reihe an einer **festen** Weltstelle (250,300)…(700,1200). Abnahme
2 verlangt die **sichtbare** Stelle. Die Reihe kommt also mit, die Stelle nicht.

---

## J1 — Wer bekommt die abgelegte Karte? (reine Logik)

`client/src/utils/cardDrop.js`, eine Funktion:

```js
stackAt(point, stacks)   // stacks: [{ id, x, y, w, h }] → id | null
```

- Getroffen ist ein Stapel, dessen **Kartenfläche** `point` enthält
  (`|dx| ≤ w/2`, `|dy| ≤ h/2`; ohne Maße 100 × 140 wie `getCardDims`).
- Treffen mehrere, gewinnt der **nächste Mittelpunkt** — derselbe Tie-Break
  wie `pickTopmost` (M10.1). Bisher gewann der erste in Listenreihenfolge, also
  der Zufall der Einfügereihenfolge.
- Unbrauchbare Zahlen (`NaN`, fehlendes `x`) fallen heraus, statt die Rechnung
  zu vergiften.

Die 80-Pixel-Schwelle verschwindet an **beiden** Stellen, an denen sie steht
(`handleCardDragMove` für das Aufleuchten, `handleCardDragEnd` für die Tat) —
sonst leuchtet ein Ziel auf, das nicht mehr eins ist.

**Abnahme.**
1. Ein Punkt auf dem Stapelmittelpunkt trifft ihn.
2. Ein Punkt 80 Pixel daneben (ein Rasterfeld) trifft ihn nicht — weder in der
   Breite noch in der Höhe.
3. Von zwei sich überlappenden Stapeln gewinnt der nähere.
4. Eine leere Liste antwortet `null` und wirft nicht.

## J2 — Karte auf Karte gründet keinen Stapel mehr

Der Zweig „Create new stack from two single cards" in `handleCardDragEnd`
entfällt, und mit ihm `'__single_card_target__'` in `handleCardDragMove` —
eine Vorschau auf etwas, das nicht mehr passiert, ist schlimmer als keine.

`groupSelectedCards` (`G`) bleibt unberührt; es ist ab jetzt der einzige Weg,
aus losen Karten einen Stapel zu machen.

**Der Preis, ausdrücklich:** zwei lose Karten zu stapeln kostet jetzt drei
Handgriffe statt einem (beide wählen, `G`). Das ist die Rechnung, die M10.4
aufmacht — dreimal stille Verfälschung in einer Partie gegen zwei zusätzliche
Klicks bei einer Handlung, die in der Partie kein einziges Mal *gewollt*
vorkam.

**Abnahme.** M10.4 Abnahme 1 und 3.

## J3 — Entschieden wird auf der Stelle, die die Karte einnimmt

In `handleCardDragEnd` wandert die Berechnung von `finalX`/`finalY`
(Zonenplatz, sonst Rasterfeld, sonst das 80er-Gitter des Tisches) **vor** die
Stapelfrage, und `stackAt` bekommt diese Stelle statt der rohen
Loslassstelle. Beitritt und Zusammenlegen zweier Stapel gehen durch dieselbe
Funktion — eine Antwort auf dieselbe Frage.

Für die Vorschau in `handleCardDragMove` gibt es die endgültige Stelle noch
nicht; sie fragt mit dem Rasterpunkt (`snapX`/`snapY`), den sie für das
Gitter-Aufleuchten ohnehin schon ausrechnet. Wo eine **Zone** den Platz
bestimmt, können Vorschau und Tat dadurch auseinanderliegen — und zwar nur so,
dass die Tat **weniger** verschmilzt als die Vorschau versprach. Das ist die
richtige Richtung für den Irrtum.

**Abnahme.** M10.4 Abnahme 2 (in der geschärften Fassung aus Vorab 3) und 4.

## J4 — Wo ein neues Ding erscheint (reine Logik)

`client/src/utils/spawnSlot.js`:

```js
spawnSlot(center, taken)   // → { x, y }
```

- Ein Gitter von 5 × 5 Plätzen mit 80 Pixeln Abstand **um** `center`, also
  ±160 — bei den Zoomstufen, bei denen gespielt wird (45 – 82 %), sind das
  144 – 262 Bildschirmpunkte.
- Die Plätze sind nach Abstand zur Mitte geordnet: das erste Ding liegt
  **genau** in der Blickmitte.
- Genommen wird der erste Platz, auf dem noch nichts aus `taken` liegt (näher
  als der halbe Abstand in beiden Richtungen). Ist alles belegt, bricht es um
  wie `shelfSlot` — dieselbe Entscheidung wie M8.1 und M8.6: sichtbar zu
  bleiben ist mehr wert als überschneidungsfrei zu liegen.

**Abnahme.**
1. Ohne Belegung liegt das Ding in der Mitte.
2. Ein zweites Ding liegt nicht auf dem ersten.
3. Wird das erste gelöscht, ist sein Platz wieder frei.
4. Eine fehlende oder unbrauchbare Liste wirft nicht.

## J5 — Verdrahtung der drei Würfelsorten

`createDie`, `placeCustomDie` und `createHitDie` fragen `spawnSlot` mit

- der **Blickmitte** in Weltkoordinaten: `worldAt(camera, Mitte, Mitte)` über
  den Container, dieselbe eine Umkehrung wie `screenToWorld` (M10.2/W4), und
- **allen drei Würfellisten** als Belegung — der gemeinsame Zähler aus Z7, nur
  als Liste statt als Zahl.

`canvas.width / 2` und `(Math.random() − 0.5) * 100` verschwinden an allen drei
Stellen.

**Und an vier weiteren.** Dieselbe Zeile stand wörtlich in `createTextField`,
`createToken`, im Notiz-Dialog und beim Bild-Token aus der Bibliothek. Der
Befund nennt Würfel, die **Regel** nennt „ein neu angelegtes Ding" — und einen
Fehler nur auf dem Pfad zu beheben, den der Befund gegangen ist, lässt die
Geschwister kaputt. Sie bekommen dieselbe Zeile mit ihrer eigenen Liste als
Belegung (`textFields`, `tokens`, `notes`), nicht mit der der Würfel: eine
Notiz ist 160 breit, ein Würfel 80 — gemeinsame Plätze hätten die Maße von
keinem.

**Nicht dabei:** `playCardFromHand` rechnet als einzige Stelle weiterhin aus
`canvas.width / 2`. Das ist eine **Karte**, und M10.5 Abnahme 3 stellt Karten
ausdrücklich unter Bestandsschutz; wo eine Handkarte ohne Zielangabe landet,
gehört zur Familie M8.1 und wird dort entschieden, nicht hier nebenbei.

**Abnahme.** M10.5 Abnahme 1 und 2. `cd client && npx vite build` läuft durch.

## J6 — Zähler und Karten bleiben, wo sie sind (nichts zu tun, geprüft)

M10.5 Abnahme 3. `createCounter` (`shelfSlot(counters.length)`),
`placeCardOnTable` und `placeCategoryAsStack`
(`shelfSlot(shelfCount(tableCards))`) werden **nicht** angefasst: sie lösen
M8.1/M8.6, deren Befund „landet außerhalb des Tisches" lautete, nicht „liegt
übereinander". Würfel in dieselbe Reihe zu nehmen hieße, die Reihe
weiterzuzählen und damit die Zähler zu verschieben — die Abnahme, die das
ausdrücklich verbietet.

Dass ein Würfel in der Blickmitte auf einem Zähler landen kann, bleibt. Es ist
dieselbe abgewogene Kröte wie in M8.6 („ein neuer Zähler kann auf einer
ausgelegten Karte landen").
