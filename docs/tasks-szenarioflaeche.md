# Aufgaben: Grundfläche im Aufbau (Spec M7.3)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M7.3**. Nummern sind `S…`
(Szenariofläche), damit sie weder mit T1–T9 (`docs/tasks-kampfvorbereitung.md`),
G1–G6 (`docs/tasks-gelaendelage.md`) noch F1–F4
(`docs/tasks-grundflaeche.md`) kollidieren.

**Gilt für jede Aufgabe.** Wie in F und G: eine Fähigkeit ist erst fertig, wenn
alle vier Schichten stimmen, und **„nichts zu tun" ist eine gültige Antwort,
aber nur eine geprüfte.** Bei M7.3 sind das vier von sechs Aufgaben — die
Änderung sitzt in zwei Funktionen, alles andere trägt sie schon.

1. **Ausführung** — `shared/gridGeometry.js`, `shared/sequenceExecutor.js`
2. **Schrittvokabular** — `client/src/utils/sequenceSteps.js`
3. **Editor / Tisch** — `client/src/pages/GameTable.jsx`
4. **Serverrouten / Persistenz** — `server/src/routes/rooms.js`, die Feldlisten
   in `getGameState`/`loadGameState`

Tests laufen mit `cd server && npm test`.

---

## Vorab: drei Stellen, an denen M7.3 nicht stimmt

Die Abschnitte stehen hier und nicht als Kommentar im Code, weil sie den
Zuschnitt der Aufgaben begründen.

### `build_scenario` setzt die Dörfler gar nicht — es kann die Regel nicht tragen

M7.3 sagt: „`build_scenario` leitet die Grundfläche eines Stücks aus dessen
Größe ab, wenn die Szenariodaten ein Einzelfeld nennen", und Abnahme 1 nennt
als Beispiel `"D": ["K11"]`.

**`build_scenario` legt aus `fields` nichts hin.** Der Zweig hat zwei Teile:
eine Schleife über `terrain`, die je Feld ein Token baut, und eine Schleife über
`fields`, die nur **Platzhalter bindet** (`ctx.vars.D1 = "K11"`). Die Dörflerin
kommt einen Schritt später auf den Tisch:

```
place_asset  "Figur: Granny"  → Raster "Kampffeld", Feld "$D1"
```

Der Platzhalter wird im Kopf von `applyStep` ersetzt, danach sieht
`place_asset` ein gewöhnliches `cell: "K11"`. **Dort** muss die Ableitung hin,
nicht in `build_scenario`.

Und sie *kann* nicht in `build_scenario`: beim Binden von `$D1` weiß niemand,
welches Asset später darauf gestellt wird. Ob `K11` 1×1 oder 2×2 bedeutet, hängt
an der Figur — und die nennt erst der folgende Schritt. Ein `build_scenario`,
das `$D1` vorsorglich zu `K11:L12` aufbliese, hätte für ein 50×50-Plättchen
geraten. Die Regel gehört an die Stelle, an der Adresse **und** Asset zusammen
vorliegen, und das ist genau eine: der Rasterzweig von `place_asset`.

**Folge für den Zuschnitt:** S3 (`place_asset`) trägt Abnahme 1, 3 und 5.
`build_scenario` bekommt die Ableitung trotzdem (S4), aber aus einem anderen
Grund — siehe unten.

### Die Größe ist an beiden Setzstellen vorhanden

Die Sorge aus dem Auftrag ist für `place_asset` und für den Geländezweig von
`build_scenario` unbegründet: beide haben `findAsset(...)` schon in der Hand,
bevor sie legen, und eine `table_assets`-Zeile führt `width`/`height`. Was
fehlt, ist nicht die Zahl, sondern ihr Weg in die Rechnung.

Zwei Feinheiten, die nicht geraten werden dürfen:

- **`asset.height` darf leer sein.** `assetToken` fällt dann auf die Breite
  zurück (`asset.height || width`), sonst wäre ein Token 60 hoch und 200 breit.
  Die Ableitung muss dieselben Maße sehen wie das Token, das daraus entsteht —
  sonst belegt ein Stück andere Felder, als es bedeckt. Darum eine Funktion für
  beide (S2), nicht zwei Antworten.
- **Ein `place_asset` kann ein *vorhandenes* Objekt verschieben.** Dessen Maße
  können von denen des Assets abweichen (ein einmal auf Feldmaße gezogenes
  Geländeteil, M7.2-Befund 3). Maßgeblich ist, was auf dem Tisch liegt —
  dieselbe Quelle, die das Ziehen von Hand liest (`token.width`), sonst geben
  Aufbau und Ziehen zwei Antworten und Abnahme 4 fällt.

### Gelände mit Einzelfeldangabe: der Auftrag fragt zu Recht nach

Nachgerechnet für die genannten Stücke, `cols = max(1, round(w / cellW))`:

| Stück | Größe | 50er-Raster | Raster am Brett (63 × 71) |
|---|---|---|---|
| Altes Fass (`M3`) | 50×50 | round(1,00) = **1×1** ✔ | round(0,79)/round(0,70) = **1×1** ✔ |
| Grabhügel ×5 | 45–48 | round(0,90…0,96) = **1×1** ✔ | **1×1** ✔ |
| Die Bundo-Königin ×3 | 45×45 | **1×1** ✔ | **1×1** ✔ |

**Abnahme 2 schützt sie, und zwar nicht knapp.** Die Rundung kippt erst bei
`w / cellW ≥ 1,5`, also für ein 50er-Stück ab einer Feldgröße von 33,3 abwärts
(F1 hält diese Kippschwelle schon als Testfall). Ein Raster mit 33er-Feldern
über einer A–S-Szenariokarte gibt es nicht.

**Was Abnahme 2 *nicht* schützt:** ein Geländeteil, dessen Bild größer als ein
Feld ist und das als **Einzelfeld** abgetippt wurde. Das wandert nach S4 auf
mehrere Felder **und wird auf Feldmaße gezogen** — der Bereich schreibt
`width`/`height`. Für die drei erfassten Szenarien ist das nach obiger Tabelle
folgenlos; für den nächsten abgetippten Bösewicht ist es die Folge, die M7.2
unter „Folge, die bedacht sein will" schon ausgesprochen hat. Der Ausweg ist
ein ausdrücklicher Bereich, also Daten, kein Code.

**Warum `build_scenario` die Ableitung trotzdem bekommt (S4):** wegen Abnahme 4.
Wird ein Geländeteil, das der Aufbau auf ein Einzelfeld gesetzt hat, von Hand
angefasst und losgelassen, leitet der Tisch seit F2 die Grundfläche ab — es
springt auf mehrere Felder. Ließe man `build_scenario` dabei auf 1×1, gäben
Aufbau und Ziehen genau die zwei Antworten, die M7.3 zusammenführen will.

### Der Bösewicht bleibt unberührt

`"B": "J8:K9"` ist ein **Bereichsname**. Ein Bereich schlägt die Rechnung —
dieselbe Regel, die F1 für `snapToGrid` festgehalten hat, und dieselbe
Begründung: was ausdrücklich dasteht, ist die genauere Aussage. Der Bösewicht
kommt über `place_asset "$revealed" → "$B"` auf den Tisch, `cellRange` sieht
`ranged: true`, die Ableitung läuft nicht an. Abnahme 3 ist damit eine
Regressionsprüfung, keine neue Zeile.

### `validateScenarioData` prüft nicht falsch, aber sie prüft nicht mehr alles

Sie ruft `cellRange(grid, cell)` **ohne** Größe und prüft damit weiterhin, was
dasteht: ist `K11` ein Feld dieses Rasters, ist `E3:G4` ein Bereich darin. Das
bleibt richtig — sie prüft die *Daten*, nicht die *Platzierung*.

Neu ist ein Fehlerfall, den sie nicht sehen kann: ein Einzelfeld am Rasterrand,
auf das ein 2×2-Stück nicht mehr passt (`J10` bei 10×10). Für `fields` kann sie
ihn grundsätzlich nicht sehen — sie weiß so wenig wie `build_scenario`, welches
Asset dort landet. Für `terrain` könnte sie es; das wäre eine eigene Aufgabe und
gehört neben die Prüfung, die M7.4 vorschlägt.

**Gefangen wird der Fall trotzdem, vor dem Legen:** der Geländezweig von
`build_scenario` baut in eine eigene Liste und legt erst nach `missing.length`
(„erst prüfen, dann legen"). Das trägt Abnahme 5 ohne neue Struktur.

**Kein Auftrag hier, nur die Antwort auf die Frage:** die Funktion hat weiterhin
keinen Aufrufer in der Oberfläche (M7.1, „Offen").

---

## S1 — `cellRange` nimmt die Größe entgegen

**Ziel.** Eine Adresse plus eine Größe ergibt den Bereich, den ein Stück dieser
Größe dort belegt — dieselbe Rechnung wie beim Ziehen von Hand, derselbe
Helfer, keine zweite Antwort.

**Umfang** (`shared/gridGeometry.js`):

- `cellRange(grid, label, size = null)`: ein **Bereichsname** schlägt die
  Rechnung (M7.1 bleibt unangetastet), ein **Einzelfeld** nicht. Ohne `size`
  ist das Verhalten Zeichen für Zeichen das bisherige — die drei vorhandenen
  Aufrufer (`validateScenarioData`, `validateStep`, `placeOnGrids`) geben keine
  mit und sollen keine mitgeben.
- Gerechnet wird mit den **vorhandenen** privaten Helfern: `footprint(grid,
  size)` für die Feldzahl, `rangeAt(grid, mitte, cols, rows)` für die Lage. Kein
  neuer Rechenweg. `rangeAt` ist die Lesart, die M7.3 ausdrücklich verlangt
  („Das ist dieselbe Lesart, die `rangeAt` beim Ziehen schon hat"): das Stück
  wird um den Punkt zentriert, nicht mit der Ecke angelegt.
- Läuft der abgeleitete Bereich über den Rand, ist er **kein Ziel**: `null`,
  wie `rangeAt` es schon hält. Der Aufrufer macht daraus den Protokolleintrag.
- Ein abgeleiteter Bereich kommt mit `ranged: true` zurück, sonst schriebe
  `rangeLabel` wieder einen Einzelnamen und das Stück spränge beim nächsten
  Laden um einen halben Feldversatz — der Fehler aus M3c und G5.
- `rangeCenter(grid, range)` wird exportiert, weil der Executor den Mittelpunkt
  des **abgeleiteten** Bereichs braucht und `cellPoint(grid, label)` den des
  *geschriebenen* liefert. `cellPoint` wird darauf zurückgeführt, statt eine
  zweite Mittelpunktrechnung danebenzustellen.

**Warum ein dritter Parameter und kein globales Verhalten:** dieselbe
Entscheidung wie F1. `validateStep` und `validateScenarioData` prüfen den
*getippten* Namen; bekämen sie die Ableitung, meldeten sie ein Feld als falsch,
das richtig getippt ist. `placeOnGrids` darf sie erst recht nicht bekommen —
dort würde sie jedes vorhandene übergroße Stück beim nächsten Laden versetzen
(F1, Befund 4). Wer die Größe hineinreicht, bekommt die Grundfläche; wer nicht,
das Verhalten von vorher.

**Dateien.** `shared/gridGeometry.js`.

**Die vier Schichten.**
1. *Ausführung* — `cellRange`, `rangeCenter`.
2. *Schrittvokabular* — **nichts.** `validateStep` prüft den geschriebenen
   Feldnamen und ruft ohne Größe. Geprüft, nicht geraten (S6).
3. *Editor / Tisch* — nichts, der Tisch benutzt `snapInto` (F1/F2).
4. *Persistenz* — S6.

**Abnahmekriterium.** `cellRange(grid50, 'K11', { width: 100, height: 100 })`
liefert den Bereich `K11:L12` mit `ranged: true`; mit 50×50 dasselbe wie ohne
Größe (`K11`, `ranged: false`); mit `'J8:K9'` unverändert den geschriebenen
Bereich, egal was die Größe sagt; am Rasterrand `null`.

**Testidee.** Neu: `server/test/scenario-footprint.test.js`. Einzelfeld + Größe,
Bereich + Größe, Größe fehlt/0/NaN, Rand.

**Abhängigkeiten.** Keine.

---

## S2 — Eine Antwort darauf, wie groß ein Asset auf den Tisch kommt

**Ziel.** Die Ableitung sieht dieselben Maße wie das Token, das daraus wird.

**Umfang** (`shared/assetToken.js`): `assetSize(asset)` → `{ width, height }`
mit den Rückfällen, die `assetToken` heute inline macht (`asset.width || 60`,
`asset.height || width`). `assetToken` benutzt sie, statt sie ein zweites Mal
zu schreiben.

**Warum überhaupt:** ohne den Rückfall auf die Breite gäbe ein Asset mit leerer
`height` keine Ableitung (`footprint` antwortet auf eine unbrauchbare Größe mit
`null`) — das Token wäre 100×100 und belegte still ein Feld. Ein leises
Nichtstun bei fehlenden Daten ist genau das, was M7.2 vermeiden wollte.

**Dateien.** `shared/assetToken.js`.

**Abnahmekriterium.** `assetSize({ width: 100 })` ist `{ width: 100, height:
100 }`; `assetSize({})` ist `{ width: 60, height: 60 }`; ein Token aus
`assetToken` trägt genau diese Maße.

**Abhängigkeiten.** Keine.

---

## S3 — `place_asset` leitet die Grundfläche ab

**Ziel.** Die Dörflerin aus `"D": ["K11"]` belegt nach dem Aufbau vier Felder.
Das ist Abnahme 1 — und sie wird hier erfüllt, nicht in `build_scenario`.

**Umfang** (`shared/sequenceExecutor.js`, Rasterzweig von `place_asset`):

- `cellRange(grid, step.cell, assetSize(existing || asset))` statt
  `cellRange(grid, step.cell)`. `existing` zuerst, weil das, was auf dem Tisch
  liegt, die maßgebliche Größe ist — dieselbe Quelle, die das Drag-Ende liest.
- Ziel ist die Mitte des **abgeleiteten** Bereichs (`rangeCenter`), nicht die
  des geschriebenen Feldes (`cellPoint`). Sonst stünde die Figur auf der
  Feldmitte und trüge einen Bereichsnamen, der woanders hinzeigt — und das
  nächste Laden zöge sie einen halben Feldversatz weit.
- `onGrid.width`/`height` bei `r.ranged` bleibt, wie es ist: ein abgeleiteter
  Bereich ist `ranged` und bekommt damit die Maße seines Bereichskastens.
- Der Fall „passt nicht mehr aufs Raster" wird vom vorhandenen `!r`-Zweig
  gefangen und übersprungen. Die Meldung wird getrennt, damit sie nicht
  behauptet, es gebe das Feld nicht: es gibt es, das Stück passt nur nicht.

**Reichweite, bewusst:** die Ableitung gilt für **jedes** `place_asset` mit
Rasterziel, nicht nur für die aus Szenariodaten gebundenen. Der Schritt kann
nicht unterscheiden, ob sein `cell` aus `$D1` kam oder getippt wurde — und
sollte es nicht: für die Unterscheidung gäbe es keinen Grund außer der Herkunft
des Textes.

**Dateien.** `shared/sequenceExecutor.js`.

**Die vier Schichten.**
1. *Ausführung* — der Zweig oben.
2. *Schrittvokabular* — nichts (S6).
3. *Editor / Tisch* — nichts; der Tisch ruft den Executor, der Editor nicht.
4. *Persistenz* — nichts (S6): `cell` trägt jetzt einen Bereichsnamen, und
   Bereichsnamen reisen seit M7.1/G5.

**Abnahmekriterium.** Ein `place_asset` mit einer 100×100-Figur auf `K11` eines
50er-Rasters legt sie auf `K11:L12`, zentriert auf den Rasterpunkt, mit
`width`/`height` = 100×100 (Abnahme 1). Dasselbe mit 50×50 legt auf `K11` ohne
Maße (Abnahme 2). Mit `cell: "J8:K9"` unverändert (Abnahme 3). Am Rasterrand:
nichts liegt, das Protokoll nennt Grund und Feld (Abnahme 5).

**Abhängigkeiten.** S1, S2.

---

## S4 — `build_scenario` leitet sie für Gelände ab

**Ziel.** Aufbau und Ziehen geben für ein Geländeteil dieselbe Grundfläche —
der Teil von Abnahme 4, der `build_scenario` wirklich betrifft.

**Umfang** (`shared/sequenceExecutor.js`, Geländeschleife von
`build_scenario`): dieselben zwei Zeilen wie in S3 —
`cellRange(grid, label, assetSize(asset))` und `rangeCenter` statt `cellPoint`.
`build_scenario` legt immer neu (je Feld ein eigenes Objekt), ein `existing`
gibt es hier nicht.

Die `fields`-Schleife bleibt **unverändert**. Sie bindet Text; was der Text
bedeutet, entscheidet der Schritt, der ihn benutzt (S3).

**Dateien.** `shared/sequenceExecutor.js`.

**Abnahmekriterium.** Ein Geländeeintrag mit `cells: ["M3"]` und einem
50×50-Asset auf einem 50er-Raster legt weiterhin ein Objekt auf ein Feld, in
seiner Assetgröße (Abnahme 2 — die drei erfassten Szenarien ändern sich nicht).
Dasselbe mit einem 150×150-Asset legt es über 3×3 Felder. Ein Bereich in
`cells` gilt unverändert. Ein Einzelfeld am Rand, auf das die abgeleitete
Fläche nicht passt: **nichts** liegt, auch nicht die anderen Plättchen
desselben Szenarios, und das Protokoll nennt es (Abnahme 5).

**Abhängigkeiten.** S1, S2.

---

## S5 — Aufbau, Ziehen und Laden geben eine Antwort

**Ziel.** Abnahme 4, geprüft und nicht angesehen — die Falle aus M3c, G5 und F3.

**Umfang.** Voraussichtlich **keine Codeänderung**: S1 benutzt denselben
`rangeAt`, den `snapToGrid` benutzt, und schreibt denselben Bereichsnamen, den
`placeOnGrids` liest. Zu prüfen und im Testfall festzuhalten:

- Der Aufbau setzt die Figur dorthin, wo `snapInto` sie nach einem Zug hinlegt.
- Ein Zug auf die vom Aufbau gesetzte Stelle ändert nichts (idempotent).
- `placeOnGrids` setzt sie beim Laden auf dieselben Koordinaten und Maße.

**Dateien.** keine (wenn die Prüfung hält).

**Abnahmekriterium.** Ein Testfall, der `place_asset`, `snapInto` und
`placeOnGrids` gegeneinander stellt und bei Abweichung fehlschlägt.

**Abhängigkeiten.** S3.

---

## S6 — Was die anderen drei Schichten nicht tun

**Ziel.** „Nichts zu tun" belegen, statt es anzunehmen.

**Umfang** — geprüft, Stand 2026-09-24:

- **Schrittvokabular.** `validateStep` ruft `cellRange(grid, step.cell)` ohne
  Größe und prüft damit den *getippten* Namen. Das bleibt richtig; die
  Ableitung darf dort nicht hin (S1, „Warum ein dritter Parameter"). Die
  Feldliste von `place_asset` ändert sich nicht — es kommt kein neues Feld
  dazu, die Größe steht am Asset.
- **Editor / Tisch.** Das Drag-Ende reicht die Größe seit F2 hinein und wendet
  `hit.width`/`hit.height` seit G1 an. Der Sequenz-Editor ruft den Executor
  nicht.
- **Persistenz.** `cell` ist jetzt öfter ein Bereichsname — ein Textfeld, das
  seit M7.1 in beiden Feldlisten (`getGameState`, `loadGameState`) und in
  `ADDRESS_FIELDS` steht, zusammen mit `width`/`height`. `rooms.js` ruft
  `placeOnGrids` nach dem Laden und kommt damit auf dieselbe Antwort wie der
  Tisch.
- **`validateScenarioData`.** Prüft weiter richtig, siehe oben.

**Abnahmekriterium.** Für jede der vier Zeilen ein Beleg im Bericht; für die
Persistenz zusätzlich `npm test` grün (`move-address.test.js`,
`room-start-sequence.test.js` fassen sie an).

**Abhängigkeiten.** S3, S4.

---

## Offene Punkte aus der Planung

- **Nicht-quadratische Raster.** Unverändert offen aus F: ein Token speichert
  seine Größe quadratisch, ein Raster mit `cellW ≠ cellH` kann daraus keine
  richtige Feldzahl ergeben. Auf dem gerechneten 63×71-Raster bekäme eine
  100×100-Figur 2×1 statt 2×2 — und das trifft jetzt auch den Aufbau, nicht
  mehr nur das Ziehen.
- **Der Rand ist keine Warnung, sondern ein Ausfall.** Ein Dörflerfeld, auf das
  die 2×2-Fläche nicht passt, lässt den ganzen `place_asset` ausfallen. Für
  `fields` kann das niemand vorher prüfen (siehe oben); es fällt erst beim
  ersten Aufbau gegen diesen Bösewicht auf.
- **Gelände, dessen Bildgröße nie Grundfläche war**, wandert nach S4 auf
  mehrere Felder. Daten, kein Code — wie M7.1 und M7.2 es schon gehalten haben.
  **Beim Bauen ist das sofort eingetreten:** zwei Fälle in
  `room-start-sequence.test.js` legten 60px-Gelände auf ein 40er-Raster, also
  1,5 Felder, also nach der Rundung 2×2 — und einer davon fiel danach am
  Rasterrand ganz aus. Die Vorlagen sind auf Feldgröße gesetzt, weil die Tests
  nach Raum ≙ Tisch fragen und nicht nach Grundflächen. Für die Produktion
  heißt derselbe Befund: ab `Bildbreite / Feldbreite ≥ 1,5` zieht S4 ein
  Geländestück auf mehrere Felder, und am Rand kann der ganze Aufbau ausfallen.
- **Eine Prüfung für `terrain` gegen die Rasterfläche** gehört neben die
  Seitenverhältnisprüfung aus M7.4, nicht hierher.
