# Aufgaben: Befunde der dreizehnten Partie (Spec M23.1–M23.5)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M23**. Die Belege stehen in
`docs/partie13-bericht.md` (F1, L1, L2, L3, Ä1). Vorgeschichte:
`docs/tasks-ausruestung.md` (BH, die Aufteilung des Streifens unter den
Tableaus), `docs/tasks-startausruestung.md` (A5, woher die sechs
`place_card`-Schritte kommen), `docs/tasks-aufdecken.md` (M8.9, das
Aufdeck-Menü), `docs/tasks-ansichten.md` (AZ–BB, die benannten Ansichten) und
`docs/tasks-partie12.md` (BT–BW).

**Aufgabenbuchstaben.** `AA`–`AE` in `tasks-partie5.md`, `AF`–`AN` in
`tasks-partie6.md`, `AP`–`AV` in `tasks-partie7.md`, `AW`–`AY` in
`tasks-zonen.md`, `AZ`–`BB` in `tasks-ansichten.md`, `BC`–`BG` in
`tasks-partie9.md`, `BH` in `tasks-ausruestung.md`, `BI`–`BM` in
`tasks-partie10.md`, `BN`–`BS` in `tasks-endkampf.md`, `BT`–`BW` in
`tasks-partie12.md`. Hier geht es mit `BX` weiter.

**Reihenfolge.** `BX` (M23.1) zuerst — klein, sicher, und seit Partie 9 als Ä4
gemeldet. Danach `BY` (M23.4, reine Daten), `BZ` (M23.3), `CA` (M23.5),
`CB` (M23.2).

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: **1222**, alle
grün; nachher **1245**). Bau: `cd client && npx vite build` — keine **neue** Warnung (zwei sind
vorbestehend). Der Client hat keine Testinfrastruktur (CLAUDE.md): reine
Rechnung gehört nach `shared/` oder `client/src/utils/` und wird aus
`server/test/` geprüft. Jede Geste gilt für Maus, Tastatur **und** Touch. Es
gibt genau **eine** Stelle je Sache (M6).

Datenänderungen gegen Spiel `072123c0-cd97-4ffb-a330-369630fab93f`, Aufbau
*TFT Kurzpartie* `b1e10f4e-b8f2-4c2a-bb3e-54643944121b`, nach
`docs/datenzugriff.md`: nur die Spalte lesen und schreiben, die gebraucht wird,
erst Trockenlauf, dann `db.transaction`, dann Kontrollausgabe. Betroffen sind
drei verschiedene Spalten — `sequence_data` (BY, CA), `action_data` (BZ),
`zone_data` (CB).

---

## Wo die Spec nicht stimmt

### 1. M23.3: die vermutete Ursache ist nicht die Ursache

Die Spec vermutet, `Nachschub-Auslage` falle über den Seitenfilter aus M11.5
aus dem Menü, und das Fehlen könne deshalb **richtig** sein. Gemessen an den
echten Daten (`setups.zone_data`, 45 Zonen) stimmt das nicht:

* `Sideboard` zeigt in der **Dorfphase** die Rückseite — die Aufbau-Sequenz
  setzt `set_asset_face … faceDown: true` (Schritt 9), „Dorfphase beginnen"
  tut dasselbe (Schritt 30), „Kampf beginnen" dreht sie zurück.
* `Nachschub-Auslage` trägt `anchorSide: "back"`. In der Dorfphase ist sie
  damit **nicht** `facingAway`, sondern da — dass der Spieler eine Karte von
  Hand hineinziehen konnte und sie „korrekt einrastete", belegt es: eine
  abgewandte Zone weist jeden Wurf ab (M10.13 Regel 3).
* `Aktionen` und `Ablage` tragen `anchorSide: "front"` und sind in der
  Dorfphase ihrerseits abgewandt.

Was die Zone wirklich aus dem Menü nimmt, ist die **Vorzugsregel** in
`revealZones` (`client/src/utils/revealToZone.js`): `piles.length ? piles :
cardZones`. `Nachschub-Auslage` hat `layout: "grid"`; die drei Vorräte
`Ausrüstung Dörfler 1/2/3` haben `layout: "stack"`. Sobald ein Ablagestapel da
ist, stehen **nur noch Ablagestapel** zur Wahl. In der Dorfphase sind das genau
die drei Vorräte — und genau diese drei Einträge nennt der Bericht
(„*Reveal Top Card to „Ausrüstung Dörfler 1/2/3"*"). Der Befund ist also echt,
aber phasenunabhängig und an einer anderen Stelle.

**Trotzdem wird das Menü nicht geändert.** `docs/tasks-ausruestung.md`
(„Nicht Teil dieser Liste", Ä1) hat sich beim Bau der fünfzehn Slot-Zonen
ausdrücklich darauf verlassen, dass diese Vorzugsregel das Menü kurz hält.
Fällt sie, wächst es von 3 (Dorfphase) bzw. 5 (Kampf) auf **24 bzw. 26**
Einträge — in einem Menü, das der Bericht ohnehin als zu lang meldet (Ä2).

Der Nachfüllschritt existiert längst und steht an der falschen Stelle:
„Dorfphase beginnen" Schritt 32 ist
`deal_to_zone … stackLabel: "Nachschub (Tante Emma)", count: 10,
targetZoneLabel: "Nachschub-Auslage", fill: true`. Er läuft **einmal** zu
Beginn der Phase; §4 Schritt 3 verlangt ihn nach **jedem** Kauf. `BZ` macht
daraus eine eigene Aktion — reine Daten, kein Code, und sie füllt alle Lücken
auf einmal und **offen** (der Umweg des Berichts ließ drei Plätze verdeckt).

**Abnahme neu formuliert:** „In der Dorfphase füllt **ein Griff** die Ladenauslage
wieder auf 10 offene Karten auf; im Kampf meldet derselbe Griff folgenlos, dass
die Zone abgewandt ist." Die Spec-Abnahme („eine Ladenkarte nachziehen") ist
darin enthalten.

### 2. M23.4: es gibt nichts nachzurechnen

Die Abnahme verlangt, „die Nachbereitung rechnet ihre Werte wieder auf".
Nachgesehen auf den sechs Kartenbildern (`/uploads/072123c0-…/`):

| Karte | Zeile unter dem Namen | schwarz markierte Wertveränderung |
|---|---|---|
| BAUERNLATZHOSE | Beine | **keine** (+1 auf Terrain-*Würfe*) |
| ROSTIGE SICHEL | 1-Hand, Waffe, Nahkampf, Schwert | **keine** (1 MUMM / 5+ / 1 AUA = Angriffsprofil) |
| GEFRIERFACHTÜR | 2-Hand, Waffe, Nahkampf, Prügel | **keine** |
| KÜHL-PACK | Brust | **keine** (1 MUMM: 1 LEB heilen) |
| OMMAS GEHSTOCK | 1-Hand, Waffe, Nahkampf, Stab | **keine** |
| DAS ALTE EISEN | 1-Hand, Waffe, Fernkampf, Wumme | **keine** |

Eine dauerhafte Wertveränderung trägt nach `[DE S.35]` eine **schwarze
Markierung** (`docs/tft-regeln.md`, Tabelle „Dauerhafte Wertveränderung");
MUMM / TRIFFT / AUA auf einer Waffe sind ihr Angriffsprofil, nicht BEW/LEB/
MUMM/PRZ des Dörflers. Keine der sechs Karten ändert also einen Zähler. Die
`place_counter`-Grundwerte (`base`) und `set_counter … "base"` in „Dorfphase
beginnen" bleiben **unverändert richtig**, gleich in welcher Zone die Karten
liegen.

**Abnahme neu formuliert:** „Nach dem Aufbau liegt jede Startausrüstung in dem
Slot, dessen Name auf ihr steht; die zwölf Attributzähler stehen unverändert auf
ihren Grundwerten, weil keine der sechs Karten eine schwarz markierte
Wertveränderung trägt."

Zweite Ungenauigkeit: „die sechs `place_card`-Schritte zielen noch auf die alte
Fläche". Sie zielen auf `Ausrüstung Dörfler N` — die Zone gibt es weiterhin, sie
ist seit M18 der **Vorrat** (weggepackt). Das Ziel ist nicht veraltet, es ist
das falsche von zwei gültigen.

### 3. M23.5: Platzproblem, und die Abnahme greift zu weit

Gemessen (Weltkoordinaten aus `sequence_data` und `state_data`, Fenster
932 × 742):

| Stück | Kasten |
|---|---|
| Raster `gmain` | 321 … 1271 × 93 … 793 (19 × 14 Felder à 50) |
| Hauptplan | 100 … 1300 × 60 … 1060 |
| Zusatz-Brett | 1320 … 1620 × 60 … 1060 |
| `place_counter` Leben D1/D2/D3 | 580 / 1160 / 1740 × **1430** |
| BEW / MUMM / PRZ | dieselben Spalten × 1520 / 1610 / 1700 |

**Ein Zähler wird mit `left: x − 70`, `top: y − 40` gezeichnet** und ist bis zu
185 × 102 Weltpunkte groß (am laufenden Tisch nachgemessen) — `x`/`y` sind also
nicht seine obere linke Ecke. Der Lebenszähler-Kasten liegt damit auf
510 … 695 × 1390 … 1492.

Zwischen der Unterkante des Rasters (793) und der Oberkante des ersten Zählers
(1390) liegen **597 Weltpunkte Leere**; vom oberen Rasterrand bis zur
Zählerunterkante sind es 1399. Das nutzbare Band zwischen Kopf- und
Werkzeugleiste ist rund **567 Bildpunkte** hoch. Beides gleichzeitig geht also
erst ab Zoom ≈ **0,40**, und dort ist ein Rasterfeld 20 Bildpunkte breit — das
deckt sich mit den 38 % des Berichts. Bei dem Zoom, bei dem die Partie gespielt
wurde (62 %), ist der Ausschnitt 915 Weltpunkte hoch; die Zähler liegen 475
Punkte darunter. BEW, MUMM und PRZ reichen bis y 1762 und passen auch bei 0,40
nicht mehr mit ins Bild (1669 × 0,40 = 668 > 567).

**Das ist Platz, nicht Ansicht.** Eine Ansicht ist eine Kamerastellung; auf
„Dörfler" zu wechseln **ist** der Ansichtswechsel, den die Abnahme verbietet.
M14.4 und M14.13 haben sie gebaut, und der Spieler hat die Zähler in Partie 12
(A2/A6) **und** Partie 13 (Ä1) trotzdem in Runde 1 von Hand hochgezogen. Eine
bessere Ansicht kann den Abstand nicht verkürzen.

**Die Abnahme greift aber zu weit.** „Die Werte des gerade ziehenden Dörflers"
sind vier Zähler je Dörfler, zwölf insgesamt; zwölf Kästen à 169 × 102
Weltpunkte neben das Schlachtfeld zu legen hieße, genau die Fläche zuzubauen,
die frei bleiben muss. BEW und MUMM werden nach `[DE S.7]` **im Kopf
mitgezählt** („der Marker bleibt"), PRZ ändert sich nur dauerhaft — der Bericht
sagt genau das („BEW, MUMM und PRZ blieben unten; die habe ich im Kopf
geführt (regelkonform)"). Was Runde für Runde ablesbar sein muss, ist **LEB**;
die beiden Bösewicht-Zähler (1470 × 903 / 977) passen bei 62 % bereits mit ins
Bild.

**Abnahme neu formuliert:** „Nach einem frischen Aufbau sind bei Spielzoom
(≈ 40 %) das ganze Raster **und** die drei Lebenszähler gleichzeitig im Bild,
ohne Ansichtswechsel — und bei 50 %, wo ein Rasterfeld 25 Bildpunkte breit ist,
immer noch. BEW, MUMM und PRZ bleiben, wo sie sind."

### 4. M23.2: die Lücke unter den Tableaus ist wirklich zu, aber es gibt eine andere

Die Spec sagt richtig, dass der Streifen unter den Tableaus seit M18 verplant
ist: `scripts/equipment-zones.mjs` belegt y 1808 … 2272 mit drei Reihen
(Kopf/Brust/Beine, Hände/Mitbringsel, Vorrat), und `BAND.bottom` = 2329 ist die
Unterkante der gespeicherten Ansicht „Dörfler".

**Im Feld eines Dörflers ist dann aber wirklich nichts mehr frei.** Der erste
Entwurf dieser Liste zielte auf den Streifen zwischen Tableau (x 150 … 450) und
Zählerspalte; er ist nicht 130 Punkte breit, sondern **60** — der Zählerkasten
beginnt bei `x − 70`, die Spalte liegt also auf 510 … 695 und nicht auf
580 … 765. Zusammen mit dem Tableau (150 … 450 × 1400 … 1800) und den drei
Ausrüstungsreihen (1808 … 2272) bleibt im 580 Punkte breiten Feld eines
Dörflers **kein kartengroßes Loch**.

Frei ist dagegen der Platz **unter** dem M18-Streifen: eine vierte Reihe im
gewohnten Raster (Reihenhöhe 140, Lücke 22) liegt auf y 2294 … 2434, ist 580
Punkte breit und nimmt **zwei** Zonen nebeneinander à 280 Punkten. Dort liegt
nichts, und es kann nichts hinkommen: tiefer steht kein Stück des Aufbaus.
Die gespeicherte Ansicht „Dörfler" reicht bei Zoom 0,41 bis y 2366 — die neue
Reihe ist darin halb zu sehen und nach einem kurzen Schwenk ganz. Die Ansicht
nachzuziehen hieße `state_data` anzufassen; das ist eine andere Spalte und ein
anderer Auftrag.

Zweite Ergänzung: die Spec sagt, ausliegende Bösewicht-Aktionen räume M17.4
bereits ab — das stimmt (Schritt 10 von „Dorfphase beginnen", `clear_table`
über die drei Aktionskategorien, und `clear_table` greift **überall** auf dem
Tisch, nicht nur in Zonen). Derselbe Schritt gilt aber auch für
**Dorf-Ereignisse** (Schritt 2, zurück in den verdeckten Stapel). Eine neue Zone
„Ausliegend" schützt *MIGRÄNE* also **nicht** vor der nächsten Dorfphase; was
sie schützt, ist `locked` („Gesperrt heißt gesperrt", `clear_table`). Das ist
ein eigener Befund und bleibt außerhalb dieser Liste — die Abnahme von M23.2
verlangt, dass der Platz einen **Schwenk** übersteht, nicht einen Phasenwechsel.

### 5. M23.1: es sind zwei Löschwege, nicht einer

Der Bericht nennt das Kontextmenü. `removeCardFromTable` wird aber von **zwei**
Bedienelementen aufgerufen: dem Eintrag „Remove from Table" im Kontextmenü
(Maus) und `onRemove` der `MobileActionBar` (Touch). Eine Abfrage nur am
Kontextmenü ließe den Einklick-Löscher auf dem Tablet stehen. Beide gehen
durch dieselbe Stelle.

Die Spec sagt außerdem „das Kartenmenü hat keine feste Höhe, der Eintrag wandert
je nach Stapelzustand". Stimmt, und **daran ändert BX nichts** — Ä2 bleibt
offen. Die Abfrage macht den Fehlklick umkehrbar, nicht unwahrscheinlicher.

---

## BX — „Remove from Table" fragt nach (M23.1)

**Befund.** Rechtsklick auf eine Karte → *Remove from Table* löscht sofort und
endgültig; bei einem Token kommt seit M14.7 „Delete from table?" mit
*Cancel* / *Delete*. Dreimal in Partie 13 ausgelöst (zwei Aktionskarten, ein
Gehstock), jedes Mal gewollt — aber nicht umkehrbar. Seit Partie 9 als Ä4
gemeldet.

**Änderung.** Dieselbe Abfrage, dieselbe Stelle: `deleteTarget` /
`object-delete-modal` nehmen zusätzlich ein Kartenziel auf
(`{ objType: 'card', cardIds: [...] }`). Beide Löschwege (Kontextmenü und
`MobileActionBar.onRemove`) setzen nur noch das Ziel; gelöscht wird erst im
*Delete*-Knopf. Keine zweite Mechanik, kein `window.confirm` (M12.2).

Den Namen liefert eine neue reine Funktion `cardDeleteLabel(cards)` neben
`deleteLabel` in `client/src/utils/objectTypes.js`:

* eine Karte → ihr Name über `tableObjectView` — eine verdeckt liegende Karte
  heißt auch hier „Face down" (Spec Abschnitt 6);
* mehrere (ein Stapel ist beim Rechtsklick ganz ausgewählt, `handleCardMouseDown`)
  → `„N cards"`.

**Abnahme.**
1. `server/test/object-types.test.js`: `cardDeleteLabel` gibt für eine Karte
   ihren Namen, für eine verdeckte `HIDDEN_CAPTION`, für drei Karten `3 cards`,
   für nichts den Rückfall `Card`.
2. Am Tisch: Rechtsklick auf eine Karte → *Remove from Table* öffnet die
   Abfrage und nennt die Karte beim Namen; *Cancel* lässt sie liegen.
3. Rechtsklick auf einen Stapel → die Abfrage nennt die Zahl der Karten.
4. Tokens verhalten sich unverändert (M14.7), Escape schließt die Abfrage
   (M2.10, `escape-layers.test.js` bleibt grün).
5. `npx vite build` ohne neue Warnung.

---

## BY — Die Startausrüstung landet in ihrem Slot (M23.4)

**Befund.** Die sechs `place_card`-Schritte (Index 39–44 in `sequence_data`)
zielen auf `Ausrüstung Dörfler N`, also seit M18 auf den **Vorrat** =
weggepackt. Startausrüstung ist nach §2.1 Schritt 4 **angelegt**; im Kampf
kostet jeder Slot 2 MUMM (§6.3), und die Kurzpartie hat vor dem ersten Kampf
keine Dorfphase, in der man es kostenlos nachholen könnte. Der Spieler hat sechs
Karten von Hand einsortiert.

**Änderung.** Nur `targetZoneLabel` der sechs Schritte, nach der Zeile unter dem
Kartennamen (am Bild abgelesen, nicht geraten):

| # | Karte | Dörfler | gelesen | neues Ziel |
|---|---|---|---|---|
| 39 | BAUERNLATZHOSE | 1 Henlo | Beine | `Dörfler 1: Beine` |
| 40 | ROSTIGE SICHEL | 1 Henlo | 1-Hand, Waffe | `Dörfler 1: Hände` |
| 41 | GEFRIERFACHTÜR | 2 Fridgette | 2-Hand, Waffe | `Dörfler 2: Hände` |
| 42 | KÜHL-PACK | 2 Fridgette | Brust | `Dörfler 2: Brust` |
| 43 | OMMAS GEHSTOCK | 3 Granny | 1-Hand, Waffe | `Dörfler 3: Hände` |
| 44 | DAS ALTE EISEN | 3 Granny | 1-Hand, Waffe | `Dörfler 3: Hände` |

`Hände` hat zwei Plätze; `place_card` setzt über `zoneRoom`/`spotFor` auf den
ersten freien, Granny bekommt also beide Waffen nebeneinander, Fridgettes
Zweihandwaffe lässt einen Platz frei (so hat es der Bericht auch von Hand
gemacht). Geschrieben wird **nur** `sequence_data`.

**Abnahme.**
1. Trockenlauf: genau sechs Schritte ändern sich, alle übrigen 59 sind Zeichen
   für Zeichen gleich.
2. `server/test/partie13-daten.test.js`: die sechs Ziele sind Namen echter
   Zonen aus `equipmentZones()`, jede Zielzone fasst die Zahl der Karten, die
   ihr zugewiesen ist (`zoneCapacity`).
3. Am Tisch nach „Load Setup": jede der sechs Karten liegt in ihrem Slot, das
   Protokoll meldet keinen übersprungenen Schritt, und die zwölf Attributzähler
   stehen auf ihren Grundwerten (siehe „Wo die Spec nicht stimmt", 2).

---

## BZ — Ein Griff füllt den Laden nach (M23.3)

**Befund.** §4 Schritt 3 / §9.1: „Jede gekaufte Karte wird **sofort** durch 1
neue Karte vom Nachschub ersetzt." Am Tisch geht das nur über *Take Top Card*
und Ziehen; die Karte bleibt dabei verdeckt. Vier Karten, zehn Griffe, drei
Plätze blieben verdeckt. Die Ursache des fehlenden Menüeintrags steht oben; sie
wird nicht behoben, sondern umgangen — mit dem Schritt, den die Aufbaudaten
dafür schon haben.

**Änderung.** Eine neue Aktion in `action_data`, hinter „Dorfereignis ziehen":

```json
{ "id": "laden-nachfuellen", "label": "Laden nachfüllen", "steps": [
  { "type": "deal_to_zone", "stackLabel": "Nachschub (Tante Emma)",
    "count": 10, "targetZoneLabel": "Nachschub-Auslage",
    "faceDown": false, "fill": true }
]}
```

Buchstabengleich mit Schritt 32 von „Dorfphase beginnen". `fill: true` zieht ab,
was schon liegt (M11.2): ist die Auslage voll, passiert nichts und es gibt keine
Meldung; fehlen vier Karten, kommen vier **offen** nach. Zeigt das Zusatz-Brett
die Kampfseite, ist die Zone abgewandt, und `zoneRoom` meldet das als
übersprungen — eine Zeile, keine Nebenwirkung. Geschrieben wird **nur**
`action_data`.

**Abnahme.**
1. `server/test/partie13-daten.test.js`: gegen die echten Zonen ausgeführt füllt
   der Schritt eine halbleere `Nachschub-Auslage` auf zehn offene Karten auf,
   lässt eine volle unberührt und meldet bei abgewandter Zone `skipped`.
2. Trockenlauf: die drei vorhandenen Aktionen sind Zeichen für Zeichen
   unverändert, es kommt genau eine dazu.
3. Am Tisch in der Dorfphase: eine Karte aus der Auslage wegnehmen, „Laden
   nachfüllen" drücken → zehn offene Karten, Nachschubstapel um eins kleiner.

---

## CA — Die Lebenszähler ziehen neben das Schlachtfeld (M23.5)

**Befund und Messung** siehe oben (3). Der Spieler hat in Partie 13 selbst
gemessen, wohin: er hat die drei Lebenszähler nach `1371…1377 × 139…363`
gezogen und **damit die ganze Partie gespielt**, Spielzoom 62 %, drei Kämpfe.

**Diese Stelle ist am frischen Aufbau aber nicht frei.** Sie liegt in der linken
Spalte des Zusatz-Bretts, und dort liegen in der Dorfphase die zehn Karten der
`Nachschub-Auslage`. Am laufenden Tisch nachgesehen (`elementFromPoint` auf die
drei Stellen): der oberste Zähler lag oben, die beiden anderen **unter**
Kartenbildern. Der Spieler hatte die Stelle im **Kampf** gewählt, wo das Brett
die andere Seite zeigt und keine Ladenkarten liegen.

**Änderung.** Die drei `place_counter`-Schritte für `… : Leben` (Index 28, 34,
46) bekommen neue `x`/`y` — eine Reihe **über** dem Schlachtfeld:

| Zähler | alt | neu | Kasten |
|---|---|---|---|
| Henlo: Leben | 580, 1430 | **360, −110** | 290 … 475 × −150 … −48 |
| Fridgette: Leben | 1160, 1430 | **700, −110** | 630 … 815 × −150 … −48 |
| Granny: Leben | 1740, 1430 | **1040, −110** | 970 … 1155 × −150 … −48 |

Über dem Hauptplan (Oberkante y 60) liegt nichts und kann nichts liegen: es gibt
keine Weltgrenze und keinen oberen Brettrand — `zoneLabelAbove` in
`shared/zoneGeometry.js` begründet dasselbe für Zonenschilder. Die Reihe ist
damit in **beiden** Phasen sichtbar, und vom oberen Zählerrand (−150) bis zur
Rasterunterkante (793) sind es 943 Weltpunkte: bei Zoom 0,40 sind das 377 von
567 Bildpunkten, bei 0,50 noch 472. `base`, `max` und `value` bleiben
unangetastet; BEW, MUMM, PRZ und Münzen bleiben, wo sie sind. Geschrieben wird
**nur** `sequence_data`.

**Abnahme.**
1. `server/test/partie13-daten.test.js`: die drei neuen Kästen liegen auf keinem
   der beiden Bretter, stehen über dem Hauptplan und überlappen einander nicht;
   Raster **und** alle drei Zähler passen zusammen in 932 × 567 Bildpunkte bei
   Zoom 0,4 — und die Gegenprobe: an der alten Stelle geht das bei 0,5 nicht.
2. Trockenlauf: genau drei Schritte ändern sich, nur `x` und `y`.
3. Sichtprüfung am Tisch bei ≈ 40 %: Raster und die drei Lebenszähler
   gleichzeitig lesbar, ohne Ansichtswechsel.

---

## CB — Zwei Zonen je Dörfler, und zwei begründete Lücken (M23.2)

**Befund.** Zwölf Karten ohne Ablagefläche, rund zwanzig Griffe am Brettrand:
sieben abgeschlossene Heldentaten, zwei ausliegende Dorf-Ereignisse, zwei
ausliegende Bösewicht-Aktionen, zwei „seltsame" Ausrüstungen. Zweimal ist es
schiefgegangen — die `Heldentaten-Auslage` zog erfüllte Heldentaten in ihr
Raster zurück, und die `Ablage` fing Karten ein, die beim nächsten Mischen im
Ziehstapel gelandet wären.

**Entscheidung: zwei der vier Kartenarten bekommen eine Zone, zwei nicht.**

**Zone, je Dörfler: `Dörfler N: Erfüllte Heldentaten`** (`layout: "stack"`,
`capacity: null`, `color: "yellow"`). Sie gehören **einem** Dörfler (§5.1, §8.2:
sie entscheiden am Partieende die Sheriffwahl) und überdauern jede Dorfphase.
Eine gemeinsame Zone verlöre die Zuordnung, und die Zuordnung ist die einzige
Auskunft, die ihre Lage trägt. `stack` statt fester Plätze, weil die Partie bis
zu drei je Dörfler erzeugt hat und `[BR]` keine Obergrenze nennt — dieselbe
Begründung wie beim Vorrat (BV/M21.4); gelesen wird über `Browse`.

**Zone, je Dörfler: `Dörfler N: Ausliegend`** (`layout: "stack"`,
`capacity: null`, `color: "purple"`). Geheime Dorf-Ereignisse (§5.2) bleiben
beim Ziehenden, bis ihre Bedingung eintritt; in Partie 13 lagen zwei
gleichzeitig bei zwei verschiedenen Dörflern (*MIGRÄNE* bei Fridgette,
*PROBLEME AM PIER*). Getrennt von den Heldentaten, weil sie vergänglich sind
und ein Stapel nur seine oberste Karte zeigt — in einem gemeinsamen Kasten wäre
nicht ablesbar, was davon noch gilt.

**Keine Zone: ausliegende Bösewicht-Aktionen.** Sie gehören zum laufenden Kampf,
nicht zu einem Dörfler, und sind nach spätestens einem Kampf weg: Schritt 10 von
„Dorfphase beginnen" räumt sie über `clear_table` mit ihren drei Kategorien ab,
**überall auf dem Tisch** (M17.4). Der Kreislauf Ziehstapel → Ablage hat auf dem
Zusatz-Brett bereits zwei Zonen; eine dritte wäre ein Kasten, der je Kampf
höchstens eine Karte für ein paar Runden hält, und sie müsste auf die Kampfseite
des Zusatz-Bretts, wo `Aktionen` und `Ablage` schon stehen.

**Keine Zone: seltsame Ausrüstung.** „Seltsam" heißt nie angelegt und trotzdem
wirksam (`[DE S.9]`). „Nie angelegt" ist am Tisch genau der **Vorrat**
(`Ausrüstung Dörfler N`, `layout: "stack"`, ohne Obergrenze) — er existiert seit
M18 und ist der richtige Ort, nicht ein neuer. Die Spec sagt das selbst.

**Damit sechs neue Zonen statt zwölf.** Sie bilden eine **vierte Reihe unter dem
M18-Streifen** (siehe oben 4), am Tableau verankert und deshalb schwenkfest:

| Feld | Wert | Weltmaß bei D1 |
|---|---|---|
| `anchor.relY` | (1808 − 1400 + 3 × 162) / 400 = 2.235 | y 2294 … 2434 |
| `anchor.relHeight` | 140/400 | eine Kartenhöhe |
| `anchor.relWidth` | 280/300 | 280 breit |
| Heldentaten `relX` | 0 | x 150 … 430 |
| Ausliegend `relX` | 1.0 | x 450 … 730 |

Reihenhöhe 140 und Lücke 22 sind dieselben wie in M18: ohne die Lücke setzte
`zoneLabelAbove` das Schild der neuen Reihe auf die Karten des Vorrats darüber
(M16.1). Zahlen und Zonen stehen **einmal**, in `scripts/partie13-daten.mjs`,
und werden von dort geprüft, geschrieben und getestet — wie
`scripts/equipment-zones.mjs`; `BAND.top` kommt aus `equipment-zones.mjs`, damit
die vierte Reihe mitwandert, wenn die drei darüber einmal wandern. Geschrieben
wird **nur** `zone_data`.

**Abnahme.**
1. `server/test/partie13-daten.test.js`: sechs Zonen, eindeutige Namen, keine
   überlappt eine der 45 vorhandenen, eine andere neue **oder einen
   Zählerkasten**; jedes Schild hat oberhalb Platz (`zoneLabelAbove === true`);
   jede nimmt Karten und wird nie „voll" (`zoneRejects(z,'card',99) === null`);
   keine ragt über die Tableau-Teilung von 580 Punkten hinaus in das Feld des
   Nachbarn.
2. Trockenlauf: 45 Zonen vorher, 51 nachher, die 45 Zeichen für Zeichen
   unverändert.
3. Sichtprüfung in der Ansicht „Dörfler": je Dörfler zwei beschriftete Kästen
   unter seinem Vorrat; eine hineingezogene Karte rastet ein und bleibt nach
   einem Schwenk dort.

---

## Nicht Teil dieser Liste

* **Ä2** (Kontextmenü ohne feste Position und Länge) und **Ä3** (Token-Legende
  schluckt Klicks) — eigene Befunde, von M23 nicht benannt.
* **Der Menüeintrag `Reveal Top Card to „Nachschub-Auslage"`** — begründet oben
  unter „Wo die Spec nicht stimmt", 1.
* **`clear_table` räumt ausliegende Dorf-Ereignisse mit ab** — oben unter 4.
  Betrifft eine Regel, nicht eine Zone, und M23.2 fragt nicht danach.
* **L4** (jedes Bundo-Plättchen kostet vier Griffe) und **L5** (kein Zähler für
  die Bundo-Königin) — in M23 nicht aufgenommen.
