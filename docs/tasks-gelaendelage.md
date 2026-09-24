# Aufgaben: Geländelage (Spec M7.1)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M7.1**. Nummern sind `G…`
statt `T…`, damit sie nicht mit T1–T9 aus `docs/tasks-kampfvorbereitung.md`
kollidieren.

**Gilt für jede Aufgabe.** Dieses Repo hat wiederholt daran verloren, dass eine
Fähigkeit in einer Schicht fertig war und in der Nachbarschicht nicht nachgezogen
wurde (`docs/audit-dead-controls.md`); jede der acht Vorgängeraufgaben hat genau
so einen Fall gefunden. Jede Aufgabe ist erst fertig, wenn **alle vier**
Schichten stimmen — und die Definition of Done nennt sie einzeln. **„Nichts zu
tun" ist eine gültige Antwort, aber nur eine geprüfte.**

1. **Ausführung** — `shared/sequenceExecutor.js`, `shared/gridGeometry.js`,
   `shared/assetToken.js`, `shared/scenarioData.js`
2. **Schrittvokabular** — `client/src/utils/sequenceSteps.js`
   (`STEP_TYPES`, `stepFields`, `defaultStep`, `describeStep`, `validateStep`)
3. **Editor** — `client/src/components/SetupSequenceEditor.jsx`, das Rendern am
   Tisch (`TokenShape`, Drag-Ende in `GameTable.jsx`) und die Daten, die
   `GameTable.jsx` als `ctx` hineinreicht
4. **Serverrouten / Persistenz** — `server/src/routes/rooms.js`,
   `server/src/routes/setups.js`, `server/src/database.js`, die Feldlisten in
   `getGameState`/`loadGameState` (`client/src/pages/GameTable.jsx`) und
   `server/src/websocket/messageHandler.js`

Tests laufen mit `cd server && npm test` (Nodes eingebauter Runner, **keine
Test-Dependency**). Reine Logik gehört in `shared/` oder `client/src/utils/` und
wird von `server/test/` aus geprüft; für Komponenten gibt es keine
Testinfrastruktur — was dort nicht testbar ist, steht als Handprüfung dabei.

---

## G1 — Ein Feldbereich als Adresse

**Ziel.** `E3:G4` ist eine gültige Adresse, das Stück sitzt auf der Mitte des
Bereichs statt einen halben Feldversatz daneben, und es überlebt Laden, Ziehen
und ein verschobenes Brett.

**Umfang.**

*Geometrie* (`shared/gridGeometry.js`) — neben `cellFromLabel`, nicht anstelle:
- `cellRange(grid, label)` → `{ col, row, cols, rows, ranged }` oder `null`.
  Beide Enden über `cellFromLabel`, Ecken über `Math.min`/`Math.max` normalisiert,
  `ranged` merkt sich, ob ein Doppelpunkt dastand. Ohne Doppelpunkt ist es das
  1×1-Ergebnis von `cellFromLabel` — **eine** Rechnung, nicht zwei nebeneinander.
- `rangeLabel(grid, r)` → `"E3:G4"` bzw. `"C7"`, je nach `ranged`.
- `rangeBox(grid, r)` → `{ x, y, width, height }`; `cellPoint` liefert für einen
  Bereich dessen Mitte.
- `placeOnGrids` setzt bei `ranged` zusätzlich `width`/`height` aus `rangeBox`.
  **Bei einem Einzelfeld nicht** — sonst änderte jedes vorhandene Geländeobjekt
  beim nächsten Laden seine Größe.
- `snapInto` nimmt die aktuelle Adresse des gezogenen Objekts entgegen
  (`{ …, cell }`) und hält bei einem Bereich dessen Kantenlänge fest: gesucht
  wird der gleich große Bereich unter dem Mittelpunkt. Läuft er über den Rand,
  ist es kein Treffer (`snapped: false`), wie heute.

*Executor* (`shared/sequenceExecutor.js`) — der Raster-Zweig von `place_asset`
benutzt `cellRange` statt `cellFromLabel`, setzt `cell: rangeLabel(...)` und bei
`ranged` `width`/`height`. `clear_grid` bleibt unangetastet (geprüft: `cellAt`
auf den Mittelpunkt trifft immer ein Feld des Rasters).

**Dateien.** `shared/gridGeometry.js` · `shared/sequenceExecutor.js` ·
`client/src/utils/sequenceSteps.js` (`validateStep` prüft `cell` über
`cellRange`) · `client/src/components/SetupSequenceEditor.jsx` (nur der
Platzhaltertext des Feld-Eingabefeldes: `e.g. C7 or E3:G4` — das Feld ist schon
freier Text) · `client/src/pages/GameTable.jsx` (Token-Drag-Ende reicht
`cell: token.cell` in `snapInto`).

**Die vier Schichten.**
1. *Ausführung* — `cellRange`/`rangeLabel`/`rangeBox`, `cellPoint`,
   `placeOnGrids`, `snapInto`, `place_asset`.
2. *Schrittvokabular* — `validateStep` (`cell`-Zweig) über `cellRange`; melden,
   wenn ein Bereichsende außerhalb liegt. `stepFields` und `STEP_TYPES`
   unverändert (kein neues Feld). `describeStep` gibt den Rohtext aus — prüfen,
   dass die Zeile mit Bereich lesbar bleibt, sonst nichts tun.
3. *Editor* — Platzhaltertext; `ctx.grids` reicht bereits Rasterobjekte statt
   Namen durch (geprüft, T1). Am Tisch: Drag-Ende, siehe oben.
4. *Serverrouten / Persistenz* — **keine Routenänderung.** Zu prüfen und im
   Testfall festzuhalten: `width`, `height` und `cell` stehen in **beiden**
   Token-Feldlisten (`getGameState` **und** `loadGameState`); `rooms.js` ruft
   `placeOnGrids` bereits nach dem Laden auf und erbt das Verhalten aus
   `shared/`; `handleTokenCreate` schiebt ganze Objekte und verliert nichts.

**Testidee.** `server/test/grid-cell-range.test.js` (reine Geometrie): `E3:G4`
und `G4:E3` ergeben denselben Bereich und dieselbe Mitte; die Mitte liegt
senkrecht auf der Feldgrenze; `rangeBox` ergibt 3×2 Zellen; ein Ende außerhalb →
`null`; `C7` verhält sich identisch zu `cellFromLabel`; `placeOnGrids` setzt
Maße nur bei `ranged` und rechnet sie nach einer Brettvergrößerung neu;
`snapInto` mit einem 3×2-Objekt trifft einen 3×2-Bereich und am Rand keinen.
Erweiterung von `server/test/sequence-grid-cell.test.js`: `place_asset` auf
`E3:G4` → Mitte und Maße stimmen, `cell` ist normalisiert; auf `C7` → Maße
unverändert aus dem Asset. Erweiterung von
`server/test/room-start-sequence.test.js`: derselbe Bereich im Raum.
In `sequence-steps.test.js`: `validateStep` nimmt `E3:G4` an, meldet `E3:Z99`.

**Handprüfung.** Ein Geländestück mit Bereich von Hand über das Raster ziehen,
speichern, neu laden — es liegt, wo es lag.

**Abhängigkeiten.** Keine. Erste Aufgabe; G2 und G4 stehen darauf.

---

## G2 — `build_scenario` und die Prüfung kennen Bereiche

**Ziel.** Der Heuhaufen steht als `"cells": ["E3:G4"]` in den Szenariodaten, wird
vor dem Legen geprüft und liegt danach richtig.

**Umfang.** In `shared/scenarioData.js` prüft `badCell` Geländefelder über
`cellRange` statt `cellFromLabel`. **`fields` bleibt einfeldrig** und bekommt
dafür eine eigene Meldung („`B` nennt einen Bereich; ein Dörfler steht auf einem
Feld") — ein Bereich als `$B` würde sonst unbemerkt als Platzhaltertext in ein
`place_asset` wandern. In `shared/sequenceExecutor.js` benutzt die
Geländeschleife von `build_scenario` `cellRange`/`rangeLabel`/`rangeBox` und
setzt dieselben Felder wie `place_asset` aus G1. „Erst prüfen, dann legen"
bleibt: ein einziger Bereichsfehler → `failed`, **kein** Objekt liegt.

**Dateien.** `shared/scenarioData.js` · `shared/sequenceExecutor.js`.

**Die vier Schichten.**
1. *Ausführung* — beide Dateien oben.
2. *Schrittvokabular* — **nichts.** `build_scenario` hat nur `final`, der
   Bereich steht in den Daten. Prüfen und abhaken, nicht raten.
3. *Editor* — **nichts.** Und das ist der Fund, der hierher gehört, nicht der
   Freibrief: `validateScenarioData` hat überhaupt keinen Aufrufer in der
   Oberfläche, obwohl T5 sie so geschnitten hat. Entweder in dieser Aufgabe
   anzeigen oder ausdrücklich als offener Punkt stehenlassen — nicht wortlos
   übergehen.
4. *Serverrouten / Persistenz* — **keine Änderung**, aber geprüft: `setups.js`
   reicht `scenario_data` untypisiert durch (POST, PUT, GET), `rooms.js` parst
   es und gibt es in dieselben `options`. Ein Testfall hält das fest, damit der
   Raum nicht später still zurückfällt.

**Testidee.** Erweiterung von `server/test/scenario-data-validate.test.js`: ein
Bereich in `terrain[].cells` ist sauber; ein Bereich mit einem Ende außerhalb
ergibt **eine** Meldung mit Bösewicht und Feldtext; ein Bereich in `fields` ergibt
die eigene Meldung. Erweiterung von `server/test/sequence-build-scenario.test.js`:
`["E3:G4", "K2"]` legt zwei Objekte — eines über sechs Felder, eines über
eines —, jedes mit seinen Maßen; ein Bereich außerhalb → `failed`, `state`
unverändert; `clear_grid` danach räumt beide weg. In
`room-start-sequence.test.js`: dasselbe Szenario im Raum.

**Abhängigkeiten.** G1.

---

## G3 — Ein Tischobjekt kann gedreht liegen

**Ziel.** Derselbe Zaun liegt in einem Szenario waagerecht und im nächsten
senkrecht, und man sieht es.

**Umfang.** `rotation` (`0|90|180|270`, Vorgabe `0`) am gelegten Objekt, am
Schritt `place_asset` und am Geländeeintrag. **Gedreht wird das Bild, nicht der
Kasten**: `width`/`height`, die Trefferfläche zum Ziehen und `cellAt` bleiben, wo
der Bereich sie hinlegt. Im Rendern heißt das: die Transformation gehört an das
innere `<img>` in `TokenShape` (bei 90/270 mit vertauschten Maßen und
`transform-origin: center`), **nicht** an das äußere `<div>` — dessen `left`/`top`
rechnen mit `tokenW`/`tokenH`, eine Drehung dort verschöbe die Trefferfläche.

**Dateien.** `shared/assetToken.js` (`rotation: 0` in der Fabrik, neben
`locked: false`) · `shared/sequenceExecutor.js` (`place_asset` übernimmt
`step.rotation`, `build_scenario` den Wert des Geländeeintrags) ·
`shared/scenarioData.js` (ein `rotation`, das kein erlaubter Winkel ist, wird
gemeldet) · `client/src/utils/sequenceSteps.js` ·
`client/src/components/SetupSequenceEditor.jsx` · `client/src/pages/GameTable.jsx`
(`TokenShape` **und** beide Feldlisten).

**Die vier Schichten.**
1. *Ausführung* — `assetToken`, `place_asset`, `build_scenario`,
   `validateScenarioData`.
2. *Schrittvokabular* — `rotation` in `STEP_TYPES` für `place_asset` (immer
   sichtbar, auch im Zonen- und im x/y-Zweig: ein gedrehtes Token in einer Zone
   ist genauso legitim); `defaultStep` → `0`; `describeStep` nennt die Drehung
   **nur, wenn sie nicht 0 ist**; `validateStep` lässt nur 0/90/180/270 zu.
3. *Editor* — Auswahlfeld im Sequenz-Editor; `TokenShape` dreht das Bild.
4. *Serverrouten / Persistenz* — `rotation` in die Token-Feldliste von
   `getGameState` **und** von `loadGameState`. Das ist die Stelle, an der dieses
   Repo am häufigsten verliert: bei Karten steht es in beiden, bei Token
   bisher in keiner. Im Raum reicht `token_create` (schiebt ganze Objekte);
   **kein** `token_rotate`, weil es keine Drehung von Hand gibt — das steht als
   ausdrücklicher Nicht-Umfang in M7.1, samt der vier Stellen für später.

**Testidee.** Erweiterung von `server/test/asset-token.test.js`: die Fabrik legt
`rotation: 0` an. Neue `server/test/sequence-rotation.test.js`: `place_asset` mit
`rotation: 90` setzt das Feld und lässt `width`/`height`/`cell` unberührt; ein
Winkel außerhalb der vier wird von `validateStep` gemeldet; zwei
Geländeeinträge desselben Assets mit verschiedener Drehung ergeben zwei Objekte
mit verschiedenem `rotation`; ein Zustand ohne das Feld liest sich als 0.

**Handprüfung** (keine Client-Testinfrastruktur): ein Zaun mit `L10:L13` und
`rotation: 90` steht senkrecht im Kasten, lässt sich am selben Fleck anfassen
wie ungedreht, und `clear_grid` nimmt ihn mit.

**Abhängigkeiten.** Keine gegen G1/G2 — die Drehung ist ein eigenes Feld und
kann parallel laufen. Sichtbar sinnvoll wird sie erst mit G1.

---

## G4 — Die drei erfassten Szenarien nachziehen (Daten, kein Code)

**Ziel.** Was beim Abtippen weggelassen oder verschoben wurde, steht richtig da.

**Umfang.** Keine Codeänderung. In `scenario_data` der Produktion:
- Der Heuhaufen wird `"cells": ["E3:G4"]` statt eines angenäherten Einzelfeldes.
- Die beiden senkrechten Holzzäune kommen dazu: „Deputy Waggums" `D5:G5` ohne
  Drehung, „The Bundits" `L10:L13` mit `"rotation": 90` — **zwei Einträge**,
  nicht einer mit zwei Feldern, sobald sich die Ausrichtung unterscheidet.
- **Jedes** Einzelfeld der drei Szenarien, das als „nächstliegender Anker" für
  ein mehrfeldriges Stück gewählt wurde, gegen das Tableau nachziehen. Das ist
  die eigentliche Arbeit: der Versatz steckt in jedem mehrfeldrigen Stück, nicht
  nur im Heuhaufen.

**Vorarbeit.** Die lokale Datenbank ist leer; die Daten leben nur in der
Produktion (siehe „Offene Punkte" in `docs/tasks-kampfvorbereitung.md`). Raster-
und Assetnamen sind vor dem Bearbeiten gegen das gespeicherte Setup abzugleichen.

**Testidee.** Von Hand am echten Tisch: „Kampf beginnen" für jeden der drei
Bösewichte; jedes mehrfeldrige Stück liegt bündig auf seinen Feldern, kein
halber Versatz; die senkrechten Zäune stehen senkrecht; zweimal drücken lässt
nichts vom vorigen Kampf übrig.

**Abhängigkeiten.** G1, G2, G3.

---

## G5 — `token_move` traegt die Rasteradresse mit

**Ziel.** Ein von Hand gezogenes Geländestück liegt im Raum dort, wo es der
Spieler hingezogen hat — auch nach dem nächsten Laden.

**Befund (aus G1).** `server/src/websocket/messageHandler.js` sendet bei
`token_move` nur `{ token_id, x, y }`. Der neue `cell` und, bei einem Bereich,
die nachgerechneten Maße kommen nie an: `room.boardState` und die übrigen
Clients behalten die alte Adresse, und `placeOnGrids` zieht das Stück beim
nächsten Laden auf den **alten** Bereich zurück — genau den halben Feldversatz
weit, den G1 beseitigt.

Das ist eine Altlast aus M3b (`cell` war schon vorher betroffen), aber M7.1
macht sie sichtbar: **Abnahme 7 gilt am Tisch und nicht im Raum, Abnahme 8
bricht, sobald jemand im Raum zieht.**

**Umfang.** `cell` — und bei `ranged` auch `width`/`height` — in die
`token_move`-Nachricht, Sender **und** Empfänger. Prüfen, ob `card_move`
dasselbe Problem hat (Karten tragen `gridId`/`cell` ebenfalls).

**Dateien.** `server/src/websocket/messageHandler.js` ·
`client/src/pages/GameTable.jsx` (Sendestelle) · ggf. `useGameRoom.js`.

**Testidee.** `server/test/` gegen den Nachrichtenhandler: ein `token_move` mit
`cell` schreibt ihn in `room.boardState`; eines ohne lässt die alte Adresse
stehen, statt sie zu löschen (Rückwärtskompatibilität mit älteren Clients).

**Abhängigkeiten.** G1.

---

## Offene Punkte aus der Planung

- **`validateScenarioData` ohne Bedienung.** Siehe G2, Schicht 3. Solange sie nur
  der Executor ruft, fällt ein Tippfehler in den Szenariodaten erst am Tisch auf
  — und dann als `failed` mitten in der Aktion.
- **Nichts sagt, wie groß eine Kachel *ist*,** nur wie viele Felder sie *hier*
  belegt. Dieselbe Kachel zweimal verschieden groß eingetragen bleibt
  unbemerkt. Ein `fieldsWide`/`fieldsTall` am Asset wäre die Prüfung dafür — und
  eine zweite Quelle für dieselbe Angabe; in M7.1 bewusst verworfen.
- **Kein Bereich auf Hexrastern.** `GRID_TYPES` kennt nur `square`; ein Bereich
  ist ein Rechteck und wäre dort eine andere Rechnung.
