# Aufgaben: Befunde der vierzehnten Partie (Spec M25.1–M25.3)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M25**. Die Belege stehen in
`docs/partie14-bericht.md` (Befunde 1–3 im Abschnitt „Was Züge gekostet hat"),
der ersten **gewonnenen** Partie der Reihe. Vorgeschichte:
`docs/tasks-greifen-und-lesen.md` (M10.1/M11.9, wer den Zeiger bekommt),
`docs/tasks-partie10.md` (BK = M19.1, das übergebene Feldmaß, und Phase 0, die
Messung mit echten Mausereignissen), `docs/tasks-ebenen.md` (M8.2/M9.1, die
Zeichenreihenfolge), `docs/tasks-gelaendekarten.md` (M8.3, die Geländekarten),
`docs/tasks-vorbedingung.md` (M9.3/M11.2, `require_zone`) und
`docs/tasks-partie10.md` (BM = M19.5, `require_counter`).

**Aufgabenbuchstaben.** `AA`–`AE` in `tasks-partie5.md`, `AF`–`AN` in
`tasks-partie6.md`, `AP`–`AV` in `tasks-partie7.md`, `AW`–`AY` in
`tasks-zonen.md`, `AZ`–`BB` in `tasks-ansichten.md`, `BC`–`BG` in
`tasks-partie9.md`, `BH` in `tasks-ausruestung.md`, `BI`–`BM` in
`tasks-partie10.md`, `BN`–`BS` in `tasks-endkampf.md`, `BT`–`BW` in
`tasks-partie12.md`, `BX`–`CB` in `tasks-partie13.md`. Hier geht es mit `CC`
weiter.

**Reihenfolge.** `CC` (M25.3) zuerst — ein offen liegendes Plättchen ließ den
ganzen Kampfaufbau ausfallen. Danach `CD` (M25.1, der stille Fehlgriff) und
`CE` (M25.2, der Wortlaut).

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: **1278**, alle
grün). Bau: `cd client && npx vite build` — keine **neue** Warnung (zwei sind
vorbestehend). Der Client hat keine Testinfrastruktur (CLAUDE.md): reine
Rechnung gehört nach `shared/` oder `client/src/utils/` und wird aus
`server/test/` geprüft. Es gibt genau **eine** Stelle je Sache (M6).

**Datenänderungen: keine.** Alle drei Aufgaben sind Code. Die Produktionsdaten
(Spiel `072123c0-cd97-4ffb-a330-369630fab93f`, Aufbau *TFT Kurzpartie*
`b1e10f4e-b8f2-4c2a-bb3e-54643944121b`) wurden nur **gelesen** — sie sind der
Beleg für die beiden Abweichungen unten.

---

## Wo die Spec nicht stimmt

### 1. M25.1: weder Stapelreihenfolge noch Artefakt — die **Größenregel** greift daneben

Die Spec stellt zwei Hypothesen zur Wahl („Entscheidet die Auswahl nach Größe
oder nach Stapelreihenfolge?") und vermutet die Ursache darin, dass der
Grabhügel **später** auf dasselbe Feld kommt und dann obenauf liegt. Gemessen
stimmt beides nicht.

**Phase 0, Reproduktion.** Am laufenden Tisch (`gaming.benjathi.de`,
Spielstand `Partie 14 - Sieg gegen Virginia Fitz`, Spielzoom 36 %), mit echten
`MouseEvent`s und **zwei** `requestAnimationFrame` zwischen je zwei
Ereignissen:

1. `Fridgette Jones` (L5) auf das Feld Q14 gezogen, auf dem
   `Grabhügel / Grabhügel ausgehoben (30)` liegt → die Figur wandert, wie sie
   soll.
2. Von Q14 aus gezogen → **der Grabhügel wandert, die Figur bleibt stehen.**

→ **Kein Artefakt.** Der Befund steht, und er ist reproduzierbar.

**Aber die Ursache ist eine andere.** Der Grabhügel lag in diesem Versuch
**vorher** da, die Figur kam danach — die Reihenfolge war also genau umgekehrt
zu der, die die Spec verdächtigt, und der Grabhügel gewann trotzdem. Die
Zahlen aus `table_assets` sagen, warum:

| Stück | Maße | Fläche |
|---|---|---|
| Dörflerfigur (`Henlo Bulwark`, `Fridgette Jones`, `Granny Melba`) | 50 × 50 | 2500 |
| `Grabhügel … (6)` | 45 × 44 | 1980 |
| `Grabhügel … (30)` | 46 × 45 | 2070 |
| `Grabhügel … (14)` | 46 × 46 | 2116 |
| `Grabhügel … (10)` | 47 × 47 | 2209 |
| `Grabhügel … (0)` | 48 × 48 | 2304 |

Ein Rasterfeld misst 50 Weltpunkte. **Alle fünf Grabhügel sind kleiner als die
Figur**, und `pickTopmost` lässt bei gleichem Mittelpunkt die kleinere Fläche
gewinnen (M8.2/M10.1). Beide stehen auf demselben Feld, haben also **denselben**
Mittelpunkt; der Abstand ist immer gleich, die Fläche entscheidet immer, und
sie entscheidet immer für den Hügel. Die Stapelreihenfolge kommt nie zum Zug.

Dasselbe gilt für die **Zeichenreihenfolge**: am Tisch gemessen trägt der
Grabhügel `z-index: 280`, die Figur `272` — der Hügel liegt **über** der Figur
und verdeckt sie. Deshalb sah es wie ein fehlgeschlagener Zug aus: der Spieler
hat gegriffen, was obenauf lag, und das war der Hügel.

Der Unterschied ist **kein Spielmaß, sondern Bildrauschen**: 44 bis 48 Punkte
sind das Seitenverhältnis eines eingescannten Plättchens, nicht eine Aussage
darüber, wie viel Platz es einnimmt. Beide Stücke belegen **ein Feld**.

**Daraus folgt die Änderung** (CD): die Ordnung misst in **Feldern**, wo ein
Raster liegt, nicht in Bildpunkten — mit derselben Rechnung, mit der
`snapToGrid` das Stück schon setzt (`footprint`, M7.2: `max(1, round(w/Feld))`).
Dann sind Figur und Grabhügel gleich groß, und erst dort greift der bestehende
Gleichstands-Ausgleich.

### 2. M25.1 Abnahme 1 ist so nicht erfüllbar — neu formuliert

> „Steht eine Dörflerfigur auf einem Feld, auf dem **später** ein Token
> abgelegt wurde, bewegt ein Zug auf der Figur die Figur."

Diese Abnahme setzt voraus, dass es eine Aussage darüber gibt, **was eine
Figur ist** — und die gibt es in den Daten nicht. Ein Tischtoken trägt Bild,
Maße, Platz und Seite; eine Sorte trägt es nicht. `table_assets` kennt zwar
Kategorien (`Dörfler`, `Gelände`), aber am Tisch steht davon nichts im
Spielstand, und eine Kategorieliste in den Code zu schreiben hieße, dem Code
Townsfolk Tussle beizubringen (gegen M7).

Dazu kommt: **die geforderte Regel wäre falsch herum.** Wer ein Plättchen
bewusst auf eine Figur legt, legt es obenauf — am echten Tisch wie hier. Eine
Regel „die Figur gewinnt immer" ließe genau dieses Plättchen unerreichbar
werden, und sie bräche die Übereinstimmung von Zeichnung und Treffer, die M8.2
ausdrücklich festhält („Trefferfläche und Zeichenreihenfolge sind derselbe
Wert"). Dann bewegte sich regelmäßig etwas anderes als das, was obenauf zu
sehen ist — genau der Fehler, gegen den Abnahme 3 steht.

**Neu:**

> 1. Stehen eine Dörflerfigur und ein Geländeplättchen auf **demselben Feld**,
>    entscheidet nicht, welches Bild ein paar Punkte kleiner eingescannt ist.
>    Beide belegen ein Feld; es gewinnt, was **zuletzt** dorthin kam — und was
>    gewinnt, liegt auch sichtbar oben.

Das ist der Fall aus Partie 14: der Grabhügel liegt aus `build_scenario`, die
Figuren kommen in der Sequenz danach, und im Spielstand stehen sie dahinter
(Hügel an Stelle 33–37, Figuren an 38–40). Nach der Änderung greift ein Zug auf
der Figur die Figur, und die Figur wird über dem Hügel gezeichnet.

Abnahme 2 (`das Token lässt sich weiterhin bewegen, wenn keine Figur darauf
steht`) und Abnahme 3 (`bewegt sich etwas anderes als das Angefasste, sagt der
Tisch es`) bleiben Wort für Wort. Abnahme 3 wird dabei **strukturell** erfüllt
statt durch eine Meldung: Treffer und Zeichnung lesen dieselbe Größe, also
bewegt sich immer das, was obenauf liegt.

### 3. M25.3: `reveal_next` soll ein offen liegendes Plättchen annehmen

Die Spec stellt es zur Entscheidung. **Entschieden: ja.** `docs/tft-regeln.md`
§5.1, Schritt 2 lautet:

> „**Nächstes Bösewicht-Plättchen aufdecken** — auf dem nächsten Kampf-Platz
> (**von oben nach unten**) … so dass ihr den Namen des nächsten Bösewichts
> seht. Legt es auf das **oberste Feld** der „Wer ist dran?"-Leiste."

Die Regel wählt das Plättchen über seinen **Platz**, nicht über seine Seite.
„So dass ihr den Namen seht" ist das **Ergebnis** des Schritts, nicht seine
Vorbedingung — liegt es schon offen, ist dieser halbe Schritt bereits getan.
Das ist dieselbe Entscheidung, die `clear_zone` schon trägt: „Eine leere Zone
zu leeren ist gelungen, nicht gescheitert." Nach dem Tausch durch *DIE
STRASSENSPERRE* lag Virginia Fitz offen auf der Leiste und war trotzdem
unbestritten der nächste Gegner.

**Warum der Filter `faceDown` überhaupt dastand**, und was davon bleibt: ohne
Zielzone bleibt das aufgedeckte Plättchen liegen, und dann ist „verdeckt" das
einzige Kennzeichen, an dem der nächste Aufruf merkt, dass dieses hier schon
dran war. Deshalb gilt die neue Nachsicht **nur, wenn der Schritt das Plättchen
wegräumt** (`targetZoneLabel` gesetzt) — und genau so ist er in den
Produktionsdaten eingetragen:

    { type: "reveal_next", zoneLabel: "Bösewicht-Leiste",
      targetZoneLabel: "Bösewicht-Platz" }

### 4. M25.3: eine Wache nach dem Muster von `require_zone` ist **nicht** die Lösung

Die Spec bietet sie für den Fall an, dass `reveal_next` ein offen liegendes
Plättchen ablehnt. Da es das nicht mehr tut, bliebe eine Wache ein zweiter Ort
für dieselbe Frage (gegen M6) — und sie löste den Lärm trotzdem nicht: die
vierzehn Folgefehler entstehen bei **jedem** gescheiterten `reveal_next`, auch
bei einer leeren Leiste oder einem verschriebenen Zonennamen.

**Die Ursache ist, dass `reveal_next` nicht anhält.** Jeder Schritt dahinter
liest `$revealed…`; keiner von ihnen kann ohne das Aufdecken etwas Sinnvolles
tun. Darum hält ein gescheitertes `reveal_next` ab jetzt die ganze Folge an —
derselbe `ctx.halted`-Weg, den M9.3 für `require_zone` gebaut hat, nur ohne
einen neuen Schritttyp. Übrig bleibt **eine** Zeile mit „(14 further steps
skipped)".

### 5. M25.2: „fünfmal" ist in der Oberfläche **eine** Zeile

Der Bericht spricht von fünf Meldungen. Im Protokoll steht aber ein einziger
`build_scenario`-Eintrag, dessen `reason` die fünf Vermerke mit „; "
aneinanderhängt. Das ändert an der Aufgabe nichts — der Wortlaut ist schuld,
nicht die Anzahl —, aber eine Änderung, die „die fünf Meldungen zu einer
zusammenfasst", wäre an der falschen Stelle gebaut.

---

## CC — Ein offen liegendes Plättchen hält den Kampfaufbau nicht mehr auf (M25.3)

**Befund.** Nach dem Tausch durch *DIE STRASSENSPERRE* lag Virginia Fitz offen
auf der Bösewicht-Leiste. `reveal_next` sucht `entries.find(e => e.o.faceDown)`,
fand nichts und übersprang sich selbst. Die **vierzehn** Schritte dahinter
liefen weiter und fielen einzeln mit „`$revealedBase` is not bound" durch. Es
wurde nichts aufgebaut, und der eine Satz, der zählt, stand nirgends.

**Änderung.** `shared/sequenceExecutor.js`, `case 'reveal_next'`, zwei Zeilen:

1. **Die Seite wählt nicht mehr aus, der Platz tut es.** Findet sich nichts
   Verdecktes, nimmt der Schritt den **ersten Eintrag in Platzreihenfolge** —
   aber nur, wenn `targetZoneLabel` gesetzt ist, der Schritt das Plättchen also
   aus der Zone wegräumt (Begründung oben, Abweichung 3). `assetFace(obj, false)`
   ist auf einem offen liegenden Plättchen ohnehin ein Nullgriff.
2. **Ein gescheitertes `reveal_next` hält an** (`ctx.halted = true`), wie
   `require_zone` und `require_counter`. Nicht als neuer Schritttyp, sondern
   am vorhandenen: der Schritt **ist** die Vorbedingung für alles dahinter.

**Abnahme.**
1. Liegt das nächste Plättchen offen und hat der Schritt eine Zielzone, wird es
   aufgedeckt, umgelegt und gebunden — der Kampf wird aufgebaut.
2. Ist die Leiste leer, der Zonenname falsch oder die Zielzone voll, steht
   **eine** Protokollzeile mit dem Grund und „(n further steps skipped)"; keine
   einzige Zeile „`$revealedBase` is not bound".
3. Ohne `targetZoneLabel` bleibt es beim bisherigen Verhalten: nur Verdecktes
   wird aufgedeckt, zweimal hintereinander deckt zwei verschiedene auf.

---

## CD — Die Ordnung misst in Feldern, nicht in Bildpunkten (M25.1)

**Befund.** Siehe „Wo die Spec nicht stimmt", 1 und 2. Kurz: ein Grabhügel
(44–48 Punkte) ist flächenkleiner als eine Dörflerfigur (50 Punkte), obwohl
beide **ein Feld** belegen. `pickTopmost` gibt ihm deshalb immer den Zeiger und
`tableLayers` immer den höheren `z-index` — unabhängig davon, wer zuerst da war.
Dreimal in Partie 14 wanderte der Hügel statt des Dörflers; vier Tokens lagen am
Ende falsch, die Reparatur kostete rund zwanzig Züge.

**Änderung.** Eine Stelle, zwei Nutznießer (M6):

* `shared/gridGeometry.js`: `footprint` wird als `fieldsAt(grids, x, y, size)`
  exportiert — wie viele Felder ein Stück an dieser Stelle belegt, `0` ohne
  Raster. Keine neue Rechnung: es ist **die** Rechnung, mit der `snapToGrid`
  das Stück setzt. Ein Stück anders einzusortieren, als es gesetzt wird, wären
  zwei Antworten auf eine Frage.
* `client/src/utils/tokenLayer.js`: `tokenArea` gibt für ein Stück mit
  `fields > 0` die **Feldfläche** zurück (`fields × Feld²`), sonst wie bisher
  `w × h`. Die Einheit bleibt Weltpunkte², damit Stücke ohne Raster (Karten,
  Würfel, Zähler, Notizen) unverändert einsortiert werden. `pickTopmost`
  benutzt dieselbe Funktion statt seiner eigenen `w * h`-Zeile; das Feldmaß
  für die Mitten-Regel (M19.1/BK) und `side` bleiben **roh**, sie messen eine
  Länge und keine Fläche.
* `client/src/pages/GameTable.jsx`: die drei Listen, die beide Funktionen
  speisen (`layerZ`, `barObjectAt`, `handleObjDragStart`), tragen je Token ein
  `fields` aus `fieldsAt`. Nur Token — Karten und Bedienwidgets stehen auf
  keinem Feld.

**Was ausdrücklich gleich bleibt.** M19.1 und Partie 13 („die Figur schlägt das
Gelände unter ihr"): ein Geländeteil über zwei Felder bleibt flächengrößer als
die Figur darauf, die Rundung ändert daran nichts. M11.9 (Bösewicht 2×2 gegen
Dörfler 1×1): vier Felder gegen eines, unverändert. M10.1 (zwei gleich große
Figuren): gleiche Feldzahl wie vorher gleiche Fläche, der nähere Mittelpunkt
entscheidet weiter. Der Hauptplan (24 × 20 Felder) bleibt das Größte am Tisch.

**Abnahme.**
1. Ein Stück von 46 × 45 und eines von 50 × 50 auf **demselben** Feld eines
   50er-Rasters sind gleich groß; den Zeiger bekommt das später gelegte, und
   es wird auch oben gezeichnet.
2. Ohne Raster (`fields = 0`) rechnet alles wie bisher — Karten, Würfel,
   Zähler, Notizen rücken nicht.
3. Geländeteile über mehrere Felder liegen weiter unter der Figur, die darauf
   steht (M19.1, Partie 13).
4. Das Token lässt sich weiterhin bewegen, wenn keine Figur darauf steht.

---

## CE — Eine liegende Geländekarte meldet keinen Fehlschlag (M25.2)

**Befund.** `build_scenario` meldete fünfmal `no terrain card named
"Grabhügel / Grabhügel ausgehoben (…)"` mit Status `failed`, während alle fünf
Hügel korrekt auf B1/L3/S5/A8/Q14 lagen. Der Spieler hat daraufhin angefangen,
das Szenario von Hand nachzubauen — Arbeit, die der Tisch schon getan hatte.

M20.2 hat den Fall untersucht und als **strukturell** eingestuft: 34 von 62
Geländeassets haben keine Karte in der Bibliothek, durchweg Plättchen, die erst
im Endkampf oder über eine Fähigkeit aufs Brett kommen. **Nichts zu erfinden
war richtig und bleibt richtig.** Falsch ist, dass ein bekannter Normalfall
aussieht wie ein Fehlschlag.

**Änderung.**

* `shared/sequenceExecutor.js`: ein dritter Protokollstatus `note` neben `ok`,
  `skipped` und `failed` — „der Schritt hat getan, was er sagt; hier ist etwas,
  das Du wissen solltest". `build_scenario` sammelt die fehlenden Geländekarten
  getrennt von den echten Problemen: steht ein echtes dabei, bleibt es bei
  `failed` (mit den Vermerken dahinter), sonst wird der Schritt zur `note`.
  **Nicht unterdrückt** — eine unterdrückte Meldung ist der Fehler aus M20.1.
* Der Wortlaut sagt beides: dass das Plättchen liegt, und dass nichts zu tun
  ist. Statt fünfmal „no terrain card named X" steht ein Satz:

      5 terrain tiles lie on the table without a terrain card in this library
      (nothing to do): "Grabhügel / …", "…"

* `client/src/pages/GameTable.jsx`: die Überschrift des Meldekastens behauptet
  nicht mehr „did not work", wenn nur Vermerke dastehen.

**Abnahme.**
1. Ein Aufbau, bei dem nur Geländekarten fehlen, steht mit Status `note` im
   Protokoll, nicht mit `failed`, und am Wortlaut ist zu erkennen, dass nichts
   zu tun ist.
2. Fehlt zusätzlich etwas Echtes (Zone nicht gefunden, Karten passen nicht in
   die Zone), bleibt der Schritt `failed` und nennt beides.
3. Die Meldung wird in keinem Fall unterdrückt.
