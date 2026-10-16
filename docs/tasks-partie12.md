# Aufgaben: Befunde der zwölften Partie (Spec M21.1–M21.5)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M21**. Die Belege stehen in
`docs/partie12-bericht.md` (F1, F2, L1, L3, L4, Abschnitt „Widerspruch").
Vorgeschichte: `docs/tasks-ausruestung.md` (BH, die Aufteilung der
Ausrüstungszonen), `docs/tasks-partie10.md` (Phase 0, das Messverfahren),
`docs/tasks-endkampf.md` (BQ, die Grenze aus §1) und
`docs/szenariodaten-erweiterung.md` 8.5/9.8 (was keinen Platz hat).

**Aufgabenbuchstaben.** `AA`–`AE` in `docs/tasks-partie5.md`, `AF`–`AN` in
`docs/tasks-partie6.md`, `AP`–`AV` in `docs/tasks-partie7.md`, `AW`–`AY` in
`docs/tasks-zonen.md`, `AZ`–`BB` in `docs/tasks-ansichten.md`, `BC`–`BG` in
`docs/tasks-partie9.md`, `BH` in `docs/tasks-ausruestung.md`, `BI`–`BM` in
`docs/tasks-partie10.md`, `BN`–`BS` in `docs/tasks-endkampf.md`. Hier geht es
mit `BT` weiter.

**Reihenfolge.** `BT` (M21.1) zuerst — es ist der einzige Befund, der eine
Partie anhält. Danach `BU` (M21.2), `BV` (M21.4, zweite Hälfte) und `BW`
(M21.5, die Rolle). **M21.3 bekommt keine Aufgabe**, und M21.4 bekommt nur
halb eine — siehe „Wo die Spec nicht stimmt".

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: **1197**, alle
grün). Bau: `cd client && npx vite build` — keine **neue** Warnung (zwei sind
vorbestehend). Der Client hat keine Testinfrastruktur (CLAUDE.md): reine
Rechnung gehört nach `shared/` oder `client/src/utils/` und wird aus
`server/test/` geprüft. Jede Geste gilt für Maus, Tastatur **und** Touch. Es
gibt genau **einen** Executor für Tisch und Raum (M6).

Datenänderungen gegen Spiel `072123c0-cd97-4ffb-a330-369630fab93f`, Aufbau
*TFT Kurzpartie* `b1e10f4e-b8f2-4c2a-bb3e-54643944121b`, nach
`docs/datenzugriff.md`: nur die Spalte lesen und schreiben, die gebraucht wird,
erst Trockenlauf, dann `db.transaction`, dann Kontrollausgabe.

---

## Wo die Spec nicht stimmt

### 1. M21.3 ist ein Artefakt der Fernsteuerung — die Aufgabe entfällt

Gemessen am laufenden Tisch (Spiel `072123c0-…`, Zoom 46 %, Raster `gmain`,
50 Weltpunkte je Feld, Fenster 932 × 742), mit echten `MouseEvent`s
(`mousedown` / n × `mousemove` / `mouseup`, auf das getroffene Element bzw. den
Tischbehälter geschickt) und **einem doppelten `requestAnimationFrame` zwischen
je zwei Ereignissen**:

| Zug | Ereignisse | Bildwechsel dazwischen | Ergebnis |
|---|---|---|---|
| **816 Weltpunkte (18 Felder, ganze Brettbreite)** | 12 | ja | **auf dem gewollten Feld, erster Versuch** |
| 816 Weltpunkte zurück | 12 | **nein** | **gar keine Bewegung** (0 von 816) |
| 652 Weltpunkte (13 Felder) | 10 | ja, außer vor `mouseup` | auf dem gewollten Feld |
| 50 Weltpunkte (ein Feld) | 1 | ja | ein Feld, erster Versuch |

Die Zwischenstände des langen Zuges sind einzeln mitgeschrieben worden: das
Stück folgte **jedem** der zwölf Schritte (67 … 810 Weltpunkte), und das
Loslassen rastete es auf das Feld unter dem Zeiger.

**Die Ursache ist dieselbe wie bei M19.2** und steht in
`docs/tasks-partie10.md`: `handleObjDragStart` setzt `draggingObj` über
`setDraggingObj`, `handleGlobalMove` liest es aus dem Abschluss des *aktuellen*
Renders. Ohne Bildwechsel sieht **jedes** `mousemove` `draggingObj === null`.
Ein langer Zug besteht aus mehr Ereignissen als ein kurzer — wer zwischendurch
nur manchmal rendert, verliert die Ereignisse dazwischen, und `handleObjDragEnd`
legt das Stück dort ab, wo der letzte *angekommene* Zug es hingestellt hat.
Genau das beschreibt der Bericht („das Objekt folgt dem Zeiger mit Verzögerung
und wird dort abgelegt, wo es gerade ist", F2), und genau das erklärt, warum der
Fehlbetrag mit der Zuglänge wächst.

**Damit ist F2 derselbe Fall wie „20 Rastungen" (Partie 6) und „70 Pixel"
(Partie 10): ein vollwertiges Messergebnis, und nichts zu bauen.** Die Abnahme
aus M21.3 („Ein Zug über die ganze Brettbreite landet beim ersten Versuch —
oder der Befund ist als Artefakt widerlegt und die Aufgabe entfällt") ist über
den zweiten Zweig erfüllt.

### 2. M21.4, erste Hälfte: die Abweisung meldet sich sehr wohl

Die Spec sagt, die sichtbare Abweisung aus M16.2 greife „hier nicht". Am
laufenden Tisch nachgestellt — eine Karte aus der `Ablage` auf die Zone
`Bösewicht-Tableau` gezogen (nimmt nur Assets), 8 Bewegungsereignisse mit
Bildwechsel:

* Die Karte stand hinterher **exakt** wieder auf ihrer Ausgangsstelle
  (1540,75 / 711,481 vor und nach dem Zug).
* `[data-testid="setup-issues"]` stand da, mit dem Wortlaut
  **„1 action did not work — #1 drop ‚Bösewicht-Tableau' — skipped: zone
  ‚Bösewicht-Tableau' does not accept cards"**.

Die Abweisung „voll" und die Abweisung „nimmt keine Karten" kommen aus
**derselben** Funktion (`zoneRejects`, `shared/zoneGeometry.js`) und laufen
durch **denselben** Zweig in `handleCardDragEnd` (`if (finalRefusal)`): dort
wird die Karte an ihren Ursprung zurückgesetzt **und** `setSetupIssues`
gerufen. Es gibt keinen Pfad, der das eine ohne das andere tut. Und genau
dieser Zweig ist der einzige, der eine Karte „in Henlos Zone zurück" springen
lässt — eine stumme Rückkehr gibt es nicht.

Dazu passt A5 des Berichts: „Ich habe den Spielzustand durchweg per DOM-Abfrage
geprüft statt per Bild." Das Band war da, es wurde nicht abgefragt.

**Abnahme 1 von M21.4 ist damit belegt und wird nicht gebaut.** Sie bleibt als
Prüfpunkt bestehen (siehe `BV`, Abnahme 4), nicht als Änderung.

### 3. M21.1: der Stapel fehlt nicht am Aufdecken, sondern an der Zone

Die Spec fragt: „Entsteht der Stapel nicht, weil das Aufdecken die Karte
einzeln ablegt, oder weil die Zone `Ablage` keine Stapelbildung kennt?"

**Die Zone kennt sie nicht, und das Aufdecken kann sie nicht erfinden.**
`layout: 'stack'` ist heute ausschließlich eine **Ortsregel**: `zoneSlots`
liefert einen Platz (die Mitte), `snapPoint` und `spotFor` verschieben jede
weitere Karte um `STACK_OFFSET = 6` (`stackPoint`, M12.5). **Nirgends wird
`inStack` gesetzt.** Ein Stapel am Tisch ist nichts als ein gemeinsames
`inStack` an mehreren Karten (`client/src/utils/stackDrag.js`), und keiner der
Wege in eine Zone — `deal_to_zone`, `place_card`, `handleCardDragEnd` — schreibt
es.

**M12.5 hat also die Staffelung gebaut, nicht den Stapel.** Das ist am Tisch
nachgezählt: in der `Ablage` (Zonenkasten 1479,6 / 638,9, 117 × 179,82) liegen
**13 lose Karten**, neun davon im 6-Punkt-Treppenmuster von der Zonenmitte
(1538,1 / 728,8) aus und **vier deckungsgleich auf dem Deckel** bei
Mitte + 52,65 = `0,45 · min(117; 179,82)`. Ein `Verhaltensdeck` gibt es im
Spielstand nicht mehr — `deal_to_zone` entfernt einen leer gewordenen Stapel.
Das ist der blockierte Zustand aus L1, unverändert erhalten.

**Zur zweiten Frage der Spec** („gibt es schon einen Weg, einen Stapel zum
Ziehstapel zu machen, oder fehlt der?"): **Der Weg fehlt nicht.** Ein Stapel
ist ein Ding, das sich ziehen lässt (M9.4), und das Kontextmenü eines Stapels
hat `Flip Stack` und `Shuffle`. Sobald auf der `Ablage` ein Stapel liegt, ist
„mischen und als neuen Ziehstapel auslegen" **drei vorhandene Griffe**: in die
Zone `Aktionen` ziehen, `Flip Stack`, `Shuffle`. Abnahme 3 braucht darum keinen
Code, nur Abnahme 1.

**Und ein Loch, das die Spec nicht nennt — ohne das wäre ihre eigene Abnahme
schädlich:** „Dorfphase beginnen" enthält den Schritt
`clear_zone { zoneLabel: "Ablage" }`. `clear_zone` liest `state.cards`, und die
Karten eines Stapels liegen in `stack.cards` und sind dort **unsichtbar** (der
Kommentar an `remove_stack` sagt das ausdrücklich). Ein Stapel auf der `Ablage`
würde die Rundenwende also **still** überleben, der nächste Kampf fing mit
dreizehn alten Aktionskarten an, und `place_stack` legte das Verhaltensdeck
daneben neu aus — Dubletten in jedem Kampf. Der unnamed-Stapel-Zweig in
`clear_zone` ist deshalb Teil von `BT` und nicht optional.

### 4. M21.5: „Es gibt keine Karni-Marker" ist falsch

Die Spec übernimmt L3 („der Endkampf braucht **sechs**, der Aufbau liefert
**null**. Der Spieler hat sie selbst gebaut"). Gegen die Daten geprüft:

* In `table_assets` des Spiels liegen **`Bundo 1` … `Bundo 6`**, je 34 × 34,
  Kategorie **`Gelände`** — dazu `Karnibunker` (48 × 36, Kategorie
  `Toller Trödel: Aufstellbares`).
* **Alle 212 Assets dieses Spiels haben `type = 'token'`.** Der Dialog
  „Add Token" filtert genau darauf (`assets.filter(a => a.type === 'token')`)
  und zeigt sie deshalb **alle** — die sechs Bundos eingeschlossen.

Die Marker sind also da und von Hand auf den Tisch zu legen. Was fehlt, ist
**nicht** der Aufbau, sondern die Auskunft: die Rolle nennt sie nicht, und die
Bildliste des Dialogs ist ein 144 Punkte hoher Rollkasten über 212 Einträge
ohne Suchfeld. Der Spieler hat stattdessen sechs blaue Kreise mit „K" gebaut —
nachvollziehbar, aber es ist ein Rollen- und ein Bedienbefund, kein
Aufbaubefund.

**Damit bleibt M20.3s Kriterium unangetastet**, und zwar genau mit seiner
eigenen Begründung: `scenario_data.terrain` ist die Abschrift **gedruckter**
Positionen, und „angrenzend an die Bundo-Königin" ist keine. Die Zahl ist fest
(sechs Plättchen, vier zu Kampfbeginn), **der Platz ist Wahl** — vier von sechs
auf acht Nachbarfeldern, und SPREAD erzeugt im Kampf weitere. Was ohne
Spielerwahl feststeht — dass es die sechs Plättchen gibt und wie sie heißen —,
steht bereits am Tisch zur Verfügung. Siehe `BW`.

### 5. M21.5: „SIE KOMMEN!" und *Scatter* sind dieselbe Karte

Die Spec führt drei Dinge auf, von denen zwei dasselbe sind: „**„SIE KOMMEN!"**
bleibt im Verhaltensdeck" und „**Scatter** aus dem Deck zu nehmen ist
Handarbeit". Der Bericht selbst sagt es in L2: *„Das Tableau verlangt: ‚Begin
the fight with the Scatter action card in play.'"* — und nennt die Karte, die
ausliegen sollte, „SIE KOMMEN!".

**Das ist eine Richtigstellung an M20.3.** Dort stand, *Scatter* sei „im
deutschen 15er-Deck nicht identifizierbar"; das ist seit dieser Partie
überholt — die Karte heißt **„SIE KOMMEN!"**. Die Entscheidung von M20.3 bleibt
trotzdem stehen, aber nur noch auf dem zweiten Bein, das die Spec hier selbst
formuliert: *„Eine Karte aus dem Deck zu ziehen ist ein Zug."* Dazu kommt, dass
`place_card` die Karte **aus der Bibliothek** kopiert und nicht aus dem Deck
nimmt — ein Aufbauschritt dafür erzeugte genau die Dublette, die der Spieler in
Runde 5 abwerfen musste. Gebaut wird es darum nicht; der **Name** gehört in die
Rolle (`BW`).

### 6. Was die Spec richtig sieht

**M21.2 ist durch die Daten gedeckt.** Am Sideboard (`table_assets`
`f7d9704c-68e7-4412-b355-86507fcac48d`) hängen vier Zonen — `Aktionen`,
`Ablage`, `Bösewicht: Bewegung`, `Bösewicht: Leben` — über `anchor.assetId`.
Eine Drehung des Sideboards verschiebt deren aufgelösten Kasten mit
(`resolveBox`, M3a) und damit jede Karte, die darin einrastet. „Flip tauscht ein
Bild, Drehen verschiebt eine Fläche, an der Zonen und Zähler verankert sind" ist
nicht nur ein Argument, es steht in `zone_data`.

**M21.4, zweite Hälfte, ist richtig.** `Ausrüstung Dörfler 1–3` haben
`capacity: 5`, und die Regel kennt keine Obergrenze `[BR S.8]`. Die Rechnung von
M18 stimmt auch weiter: in 580 × 140 Weltpunkten ergibt jede Kapazität über 5
**zwei Reihen** (`cols = round(sqrt(cap·w/h))`, bei 580/140 also höchstens 5 in
einer Reihe), und eine zweite Reihe liegt entweder in der ersten oder hinter der
Werkzeugleiste — beide Varianten hat M18 begründet verworfen. Geändert wird
darum **nicht der Kasten, sondern das Layout** (`BV`).

---

## BT — Abgelegte Karten bilden einen Stapel (M21.1, blockierend)

**Befund.** Die `Ablage` ist `layout: 'stack'`, und das heißt heute nur: jede
weitere Karte liegt 6 Punkte versetzt auf derselben Stelle. Gezählt am Tisch:
**13 lose Karten**, kein Stapel, kein `Verhaltensdeck` mehr. Ohne Stapel gibt
es `Shuffle`, `Flip Stack` und `Reveal Top Card` nicht — ab dem leeren
Ziehstapel ist die Bösewicht-Runde am Tisch nicht mehr ausführbar
(`docs/partie12-bericht.md` L1).

**Änderung.** Eine Zone, die ein Stapel *ist*, hält auch einen.

1. **Die Regel, einmal, als reine Rechnung:** `pileUp(cards, zone, newStackId)`
   in `client/src/utils/cardDrop.js` — der Datei, die schon die Frage „wem
   tritt eine abgelegte Karte bei?" beantwortet. Sie gibt die Kartenliste
   zurück, in der alle Karten, die in der Zone liegen, **ein** `inStack`
   teilen, auf dem Stapelplatz der Zone sitzen und fortlaufende `zIndex`
   tragen; die Reihenfolge ist die bisherige (unten bleibt unten, die
   Hinzukommende liegt oben). Nichts zu tun ist: andere Layouts, weniger als
   zwei Karten, oder „liegt schon alles in einem Stapel". **Gesperrte Karten
   bleiben außen vor** — dieselbe Regel, die `clear_zone` und `rotate_zone`
   schon haben. Liegt bereits ein Stapel in der Zone, **behält er seine Id**,
   sonst gilt die mitgegebene: sonst zählte das Abzeichen `#n` (M15.4) bei
   jeder neuen Karte von vorn.
2. **Verdrahtung, zwei Stellen, ein Aufruf je Weg:** in `handleCardDragEnd`
   (Hand, Maus wie Finger — das Ablegen läuft für beide hier zusammen) und in
   `revealTopCardToZone`, nach `loadGameState`. Mehr Wege in eine
   Stapel-Zone gibt es am Tisch nicht.
3. **`clear_zone` sieht einen Stapel in der Zone** (`shared/sequenceExecutor.js`):
   ein **namenloser** Stapel, dessen Stelle in der Zone liegt, wird vor der
   bisherigen Logik in lose Karten aufgelöst; danach gelten alle drei Zweige
   (löschen, in eine Zone, in einen Stapel) unverändert. **Namenlos** ist die
   Grenze: ein am Tisch entstandener Haufen gehört zur Zone, ein benannter
   Stapel (`Verhaltensdeck`, `Nachschub (Tante Emma)`) ist ein Ding für sich
   und wird mit `remove_stack` entfernt — das ist die Entscheidung, die dort
   schon steht, und sie bleibt.
4. **Daten:** ein Schritt `clear_zone { zoneLabel: "Aktionen" }` in „Dorfphase
   beginnen", neben dem vorhandenen `clear_zone Ablage`. Er räumt den Fall ab,
   den Abnahme 3 ausdrücklich erlaubt: wer die Ablage zum neuen Ziehstapel
   macht, hinterlässt einen namenlosen Stapel in `Aktionen`, und
   `remove_stack Verhaltensdeck` findet ihn nicht. Das benannte Verhaltensdeck
   rührt dieser Schritt nicht an.

**Abnahme.**
1. Nach fünfzehn aufgedeckten Aktionen liegt auf der `Ablage` **ein** Stapel,
   und das Abzeichen zeigt `(15)`.
2. Er lässt sich mischen; `#n` zählt über mehrere Mischungen hinweg, auch wenn
   danach eine weitere Karte dazukommt.
3. In die Zone `Aktionen` gezogen, `Flip Stack`, `Shuffle` — der nächste
   „Reveal Top Card to ‚Ablage'" nimmt von oben. Ohne den Tisch zu verlassen.
4. Eine **gesperrte** Karte in der Zone tritt dem Stapel nicht bei.
5. „Dorfphase beginnen" räumt `Ablage` **und** `Aktionen` leer, auch wenn dort
   Stapel liegen; das benannte `Verhaltensdeck` verschwindet weiter über
   `remove_stack`, und `Nachschub (Tante Emma)` bleibt stehen.
6. Tests grün, Bau ohne neue Warnung.

## BU — Gesperrt heißt auch undrehbar (M21.2)

**Befund.** M13.1 hat `locked` beim Drehen ausdrücklich nicht geprüft
(„gesperrt heißt unbeweglich, nicht undrehbar, wie schon bei Flip"). Ein
Fehlklick hat das **gesperrte** Sideboard um 90° quer über das Spielfeld gelegt
— samt der vier Zonen, die daran hängen (`Aktionen`, `Ablage`,
`Bösewicht: Bewegung`, `Bösewicht: Leben`, alle `anchor.assetId = f7d9704c…`).
Die alte Begründung trägt nicht: Flip tauscht ein Bild, Drehen verschiebt eine
Fläche.

**Änderung.** `rotatePlacement` (`shared/gridGeometry.js`) gibt für ein
gesperrtes Token **`null`** zurück — „es ändert sich nichts, und das ist eine
Abweisung". Dort und nicht im Menü: es ist die eine Stelle, die eine Drehung
ausrechnet, und sie ist aus `server/test/` prüfbar. Der Aufrufer in
`GameTable.jsx` bricht bei `null` ab.

Die beiden Einträge `↺ Rotate Left` / `↻ Rotate Right` **bleiben sichtbar**,
werden aber abgeschaltet und nennen den Grund („gesperrt") — ein Eintrag, der
stumm nichts tut, ist der Fehler aus `docs/audit-dead-controls.md`.

**Nicht geändert:**
* **Flip** bleibt erlaubt (M3d) — die Stelle, an der die alte Begründung
  richtig war.
* **Karten** bleiben drehbar, auch gesperrte. An einer Karte hängt keine Zone
  und kein Zähler, und das Kartendrehen liegt heute an **fünf** Stellen
  (`E`/`Q`, zwei Menüeinträge, Mobilleiste, Zwei-Finger-Geste) — eine Wache an
  fünf Stellen wäre genau das, was M6 verbietet. Das zusammenzufassen ist eine
  eigene Aufgabe und hat keinen Befund.
* Die Nachricht `token_rotate` im Raum prüft `locked` weiterhin nicht —
  `token_move` tut es auch nicht, und „keine Ownership" ist eine bekannte und
  getrennt geführte Lücke (CLAUDE.md).

**Abnahme.**
1. Rechtsklick auf ein gesperrtes Bild-Token: beide Dreheinträge stehen da,
   sind abgeschaltet und nennen „gesperrt". Ein Klick darauf dreht nichts.
2. Entsperrt dreht es wie bisher, einschließlich Kastentausch und Neueinrasten
   (M13.4).
3. `Flip` am gesperrten Token wirkt weiter.
4. Für Maus (Rechtsklick) und Finger (Langdruck) dasselbe Menü — es gibt nur
   diese eine Geste.

## BV — Der Vorrat kennt keine Obergrenze (M21.4, zweite Hälfte)

**Befund.** `Ausrüstung Dörfler N` fasst fünf Karten. „WAFFEN-WIRRWARR" gibt
zwei Dörflern gegenseitig **alle** Waffen; die sechste Karte wurde abgewiesen
und blieb beim falschen Besitzer — mit Nebenwirkung auf den Zielwert von
„BEUTE MACHEN" („der Dörfler mit der meisten Ausrüstung").
„Es gibt keine Obergrenze, wie viel Ausrüstung ein Dörfler besitzen darf"
`[BR S.8]`.

**Änderung (Daten, kein Laufzeit-Code).** Der Vorrat wird ein **Ablagestapel**:
`layout: "grid"`, `capacity: 5` → `layout: "stack"`, **kein** `capacity`. Kasten,
Anker, Farbe und Name bleiben, wie M18 sie gemessen hat; die fünfzehn
Slot-Zonen bleiben vollständig unberührt.

**Warum `stack` und nicht mehr Plätze.** Jede Zahl wäre eine erfundene
Obergrenze, und in 580 × 140 Weltpunkten gibt es keine zweite Reihe (siehe „Wo
die Spec nicht stimmt", 6). `capacity` weg heißt `zoneCapacity === null` heißt
`zoneRejects` sagt nie „voll" — die Regel ohne Obergrenze, ohne eine Zahl
hinzuschreiben. Drei Dinge kommen dazu, und sie treffen je einen Befund dieser
Partie:
* Mit `BT` wird der Vorrat ein echter Stapel, sein Abzeichen zeigt die **Zahl
  der besessenen Ausrüstung** — genau der Wert, den „BEUTE MACHEN" braucht (L4).
* `Browse` liest alle Karten des Vorrats auf einmal in Lesegröße statt acht
  Karten einzeln aufzudecken (A2).
* Der Zonen-Snap bleibt (`snapPoint` kennt `stack`), und den hat der Bericht
  ausdrücklich gelobt.

**Was das kostet, und es gehört gesagt:** `revealZones` bietet alle Zonen mit
`layout: 'stack'` an, das Stapel-Kontextmenü wächst damit von zwei auf **fünf**
„Reveal Top Card to …"-Einträge. Ä1 aus `docs/tasks-ausruestung.md` hatte das
für die Slot-Zonen befürchtet; für drei Zonen tritt es jetzt ein. Und eine
Karte aus dem Vorrat anzulegen ist ein Griff mehr: `Browse`, Karte anklicken
(sie liegt dann offen daneben, M17.2), in den Slot ziehen.

**Die Zahlen stehen weiter nur in `scripts/equipment-zones.mjs`** (M6) — der
Baustein liefert sie für Trockenlauf, Schreiben und
`server/test/equipment-zones.test.js`. Die Vorprüfung des Schalters vergleicht
jetzt gegen den **nach M18 geschriebenen** Stand (`grid`, 5), nicht mehr gegen
den davor.

**Abnahme.**
1. `node scripts/equipment-zones.mjs --check <db>`: 0 Beanstandungen, 30 Zonen,
   die drei Vorräte wie nach M18.
2. Nach `--write`: die drei Vorräte tragen `layout: "stack"` und kein
   `capacity`; `relX`, `relY`, `relWidth`, `relHeight`, `anchor`, `id`, `label`
   und `color` sind unverändert, und die **27** übrigen Zonen sind Zeichen für
   Zeichen dieselben.
3. Ein Dörfler kann sieben Ausrüstungskarten besitzen; keine wandert zum
   Nachbarn, keine wird abgewiesen.
4. Eine zweite Karte in `Dörfler 1: Kopf` wird weiter abgewiesen, **mit Band**
   — der Prüfpunkt aus „Wo die Spec nicht stimmt", 2, am geänderten Aufbau.
5. `validateScenarioData` gegen die echte Assetliste und das echte Raster: 0
   Probleme (`zone_data` ist angefasst, `scenario_data` nicht — die Prüfung
   belegt das).
6. Tests grün.

## BW — Was der Endkampf stellt, und was Handarbeit ist (M21.5)

**Befund und Entscheidung.** Nichts zu bauen; die Grenze aus §1 läuft dort, wo
M20.3 sie gezogen hat, und M21.5s Gegenbehauptung beruht auf einer falschen
Voraussetzung (siehe „Wo die Spec nicht stimmt", 4 und 5).

| Sache | fest | Wahl | Entscheidung |
|---|---|---|---|
| **Bundo-/Karni-Plättchen** | sechs Stück, `Bundo 1`–`Bundo 6`, liegen in der Assetliste und im Dialog „Add Token" | **wo** sie liegen („angrenzend an die Bundo-Königin", vier von sechs auf acht Nachbarfeldern; SPREAD erzeugt im Kampf weitere) | **Steht bereit, wird nicht gelegt.** Die Rolle nennt die Namen. |
| **„SIE KOMMEN!" / *Scatter*** | der Name — neu belegt in dieser Partie | — | **Handarbeit, unverändert.** „Eine Karte aus dem Deck zu ziehen ist ein Zug" (M21.5), und `place_card` kopierte sie aus der Bibliothek statt sie dem Deck zu entnehmen: das wäre die Dublette aus Runde 5 als Aufbauschritt. Die Rolle nennt jetzt den Namen. |
| **Neuer Sheriff** | dass einer ernannt wird | **wer** — §8.2 über die Heldenpunkte aller erfüllten Heldentaten | **Handarbeit.** Eine Rechnung über den Spielstand, §1. |
| **Blickrichtung des Bösewichts** | — | der naheste Dörfler | **Handarbeit**, unverändert aus M20.4. |

**Änderung.** `.claude/agents/tft-spieler.md` — die Datei **gibt es**, sie liegt
unter `.claude/` und nicht in `docs/`. Nachzuziehen:

1. Aus „**Zwei** Dinge baut der Aufbau bewusst nicht" werden **vier**: Bundos
   ans Feld legen, Blickrichtung, **neuen Sheriff ernennen**, **„SIE KOMMEN!"
   aus dem Verhaltensdeck nehmen**.
2. Bei den Bundos steht, **wie die Plättchen heißen und wo sie liegen**
   (`Bundo 1`–`Bundo 6` im Dialog „Add Token", Kategorie `Gelände`) — statt
   blaue Kreise zu bauen.
3. Die neue Stapelbildung (`BT`): die `Ablage` wird von der zweiten Karte an
   ein Stapel, und wie daraus der neue Ziehstapel wird.
4. Der Vorrat ist jetzt ein Stapel ohne Obergrenze (`BV`) — `Browse` liest ihn,
   das Abzeichen zählt ihn.
5. Gesperrt heißt undrehbar (`BU`).
6. Die Richtigstellung des Spielers an sich selbst: die Bundo-Königin steht
   nach den Aufbaudaten auf **E10**; dass sie in Partie 12 auf H10 stand, war
   ein Ziehfehler. Die Daten sind richtig.

**Abnahme.**
1. Die Rolle nennt vier bewusst manuelle Schritte, jeden mit Grund.
2. Die sechs Bundo-Plättchen sind in der Rolle namentlich zu finden.
3. Kein Code, keine Daten geändert — die Entscheidung steht begründet in dieser
   Datei und in der Spec.

---

## Was gefunden, aber nicht gebaut wurde

* **Der Dialog „Add Token" hat kein Suchfeld.** 212 Bildtoken in einem 144
  Punkte hohen Rollkasten; das ist der eigentliche Grund für L3. Die
  Kartenbibliothek hat eine Suche über alle Kategorien — die Assetliste nicht.
  Kein Auftrag in M21, aber der nächstliegende Kandidat.
* **Ein neues Token erscheint in der Bildschirmmitte**, nicht an der Stelle des
  Rechtsklicks (`spawnSlot(viewCenter(), tokens)`). Das war M10.5/J5 mit Absicht
  so entschieden („von dort, wo der Spieler hinsieht"); L3 nennt es trotzdem als
  Reibung. Zwei begründete Lesarten, kein Befund.
* **Der Deckel der Staffelung** (`stackPoint`, `0,45 · min(w; h)`) ist am Tisch
  erreicht: vier der dreizehn Ablagekarten lagen deckungsgleich. Mit `BT` wird
  die Frage gegenstandslos, solange die Karten einen Stapel bilden; der
  `ponytail:`-Vermerk in `shared/zoneGeometry.js` bleibt für lose Karten gültig.
* **`clear_table` sieht Stapel nicht.** Wer einen Haufen aus seiner Zone
  **heraus** zieht, bekommt ihn von „Dorfphase beginnen" nicht mehr abgeräumt —
  `BT` schließt das nur für die Zonen `Ablage` und `Aktionen`. Dieselbe
  Blindheit, die der Kommentar an `remove_stack` beschreibt; sie wird hier
  bewusst nicht ausgeweitet.
