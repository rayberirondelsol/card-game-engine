# Aufgaben: Kampfvorbereitung (Spec M7)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M7**. Reihenfolge ist die
empfohlene; wo Aufgaben unabhängig sind, steht es dabei.

**Gilt für jede Aufgabe.** Dieses Repo hat wiederholt daran verloren, dass eine
Fähigkeit in einer Schicht fertig war und in der Nachbarschicht nicht nachgezogen
wurde (`docs/audit-dead-controls.md`). Jede Aufgabe ist erst fertig, wenn **alle
vier** Schichten stimmen — und die Definition of Done nennt sie einzeln:

1. **Ausführung** — `shared/sequenceExecutor.js` (und was es zieht)
2. **Schrittvokabular** — `client/src/utils/sequenceSteps.js`
   (`STEP_TYPES`, `stepFields`, `defaultStep`, `describeStep`, `validateStep`)
3. **Editor** — `client/src/components/SetupSequenceEditor.jsx`, inklusive der
   Daten, die `GameTable.jsx` als `ctx` hineinreicht
4. **Serverrouten / Persistenz** — `server/src/routes/rooms.js`,
   `server/src/routes/setups.js`, `server/src/database.js`, und die Feldlisten
   in `getGameState`/`loadGameState` (`client/src/pages/GameTable.jsx`)

Tests laufen mit `cd server && npm test` (Nodes eingebauter Runner, **keine
Test-Dependency**). Reine Logik gehört in `shared/` oder `client/src/utils/` und
wird von `server/test/` aus geprüft; für Komponenten gibt es keine
Testinfrastruktur.

---

## T1 — Der Executor kennt Raster, `place_asset` kennt Rasterfelder

**Ziel.** Ein Aufbauschritt kann ein Objekt auf `C7` legen, und es liegt nach
dem Laden wieder dort.

**Umfang.** `options.grids` in `executeSequenceWithLog`, je Schritt aufgelöst mit
`resolveGrids(grids, anchorBoxes(state.boards, state.tokens))` — dieselbe Zeile
wie für Zonen heute, aus demselben Grund (Schritt 1 legt das Brett, Schritt 2
zielt auf ein Feld darauf). `place_asset` bekommt `gridLabel` + `cell`;
Zone / Feld / x-y schließen einander aus. Das erzeugte bzw. verschobene Objekt
trägt `gridId` und `cell`.

**Dateien.** `shared/sequenceExecutor.js` · `client/src/utils/sequenceSteps.js` ·
`client/src/components/SetupSequenceEditor.jsx` ·
`client/src/pages/GameTable.jsx` (beide `executeSequenceWithLog`-Aufrufe,
`ctx` um `gridLabels` erweitern) · `server/src/routes/rooms.js` (Raster stehen
dort bereits geparst bereit, sie müssen nur in die `options`).

**Testidee.** `server/test/sequence-grid-cell.test.js`: ein Raster 10×10 mit
`labels: {cols:'alpha', rows:'numeric'}`, `place_asset` auf `C7` → Token auf
`cellCenter`, mit `gridId`/`cell`. Feld `Z99` → `skipped` mit Grund. Unbekanntes
Raster → `skipped`. Verankertes Raster: Brett vorher per `place_asset`
verschoben → Feld sitzt auf dem verschobenen Brett, nicht auf dem alten.
Dazu in `sequence-steps.test.js`: `stepFields` blendet x/y aus, sobald `cell`
gesetzt ist; `validateStep` meldet unbekanntes Raster und ungültiges Feld
(`cellFromLabel` → `null`); `describeStep` nennt Raster und Feld.

**Abhängigkeiten.** Keine. Erste Aufgabe, weil T2 und T6 darauf stehen.

---

## T2 — `clear_grid`: das Kampffeld wieder leer machen

**Ziel.** Der nächste Kampf beginnt auf leerem Feld.

**Umfang.** `clear_grid { gridLabel }` nimmt jedes Objekt vom Tisch, das auf
diesem Raster steht (`cellAt` auf die Position, nicht `gridId` — auch von Hand
dorthin gezogene Objekte gehören dazu). Gesperrte Objekte bleiben liegen und
stehen mit Namen im Protokoll, wie bei `clear_zone`. Ein leeres Raster zu leeren
ist gelungen, nicht gescheitert (dieselbe Entscheidung wie bei `clear_zone`).

**Dateien.** wie T1, ohne `rooms.js`.

**Testidee.** `server/test/sequence-clear-grid.test.js`: drei Token auf dem
Raster, eines daneben, eines gesperrt → zwei weg, das daneben und das gesperrte
bleiben, das gesperrte steht im Protokoll. Leeres Raster → `ok`. Unbekanntes
Raster → `skipped`.

**Abhängigkeiten.** T1 (Raster im Executor).

---

## T3 — `place_stack` und `remove_stack`: eine Kartenkategorie als Nachziehstapel

**Ziel.** Das Verhaltensdeck des Bösewichts entsteht im Aufbau, nicht von Hand.

**Umfang.** Der Executor bekommt `options.cards` — die Kartenbibliothek des
Spiels, jede Zeile mit einem `category`-**Namen**, genau wie `assets` es schon
hat (Server: Unterabfrage in SQL wie bei `table_assets`; Client: aus den bereits
geladenen `categories` auffüllen). `place_stack { category, label, x, y,
faceDown }` baut daraus einen Stapel in der Form, die `loadGameState` erwartet
(`stackId`, `label`, `x`, `y`, `cards[]` mit `zIndex`, und `width`/`height` je
Karte — sonst verliert der Stapel die Kartenmaße, vgl. Nachtrag zu M2.12).
Existiert bereits ein Stapel mit diesem Namen, wird `skipped`. `remove_stack
{ stackLabel }` nimmt ihn samt Karten vom Tisch. Gemischt wird weiterhin mit
`shuffle` — kein zweiter Weg.

**Dateien.** `shared/sequenceExecutor.js` · `client/src/utils/sequenceSteps.js` ·
`SetupSequenceEditor.jsx` (Auswahl über Kartenkategorien: neue `ctx`-Liste
`cardCategories`) · `client/src/pages/GameTable.jsx` (`cards` in beide
`options`, `cardCategories` in `ctx`) · `server/src/routes/rooms.js` (Karten
laden und mitgeben).

**Testidee.** `server/test/sequence-place-stack.test.js`: zwölf Karten in zwei
Kategorien → `place_stack` legt genau die sechs der genannten Kategorie, mit
`zIndex` 1..6, benanntem Stapel und erhaltenen `width`/`height`; `shuffle` auf
denselben Namen funktioniert danach; `remove_stack` leert; unbekannte Kategorie
→ `skipped`; zweiter `place_stack` desselben Namens → `skipped`.

**Abhängigkeiten.** Keine — läuft parallel zu T1/T2.

---

## T4 — `reveal_next` bindet Platz und Stufe, Platzhalter gelten überall

**Ziel.** Der Aufbau weiß, auf welcher Stufe gekämpft wird — auch in der
verkürzten Partie.

**Umfang.** Zwei Dinge, die zusammengehören:

1. `reveal_next` bindet zusätzlich den Platzindex und, wenn die Zone
   `slotLabels` trägt, dessen Namen. Neue Platzhalter `$revealedSlot`,
   `$revealedTier`. Die Bindung merkt sich außerdem, ob es der **letzte** Platz
   der Zone war — das ist, was T6 als „Endkampf" liest.
2. Die Platzhalter-Ersetzung wandert aus dem `assetName`-Sonderfall in eine
   Stelle, die **jedes** Namensfeld eines Schritts bedient (`assetName`, `cell`,
   `category`, `label`, `name`). Reihenfolge weiterhin längster Name zuerst.
   Nichts gebunden heißt weiterhin: Schritt übersprungen, kein Rückfall auf den
   rohen Text.

`slotLabels` gehört ins `zone_data`; der Zoneneditor muss sie eingeben können
(`ZoneEditor.jsx`), sonst ist es wieder eine Fähigkeit ohne Bedienung.

**Dateien.** `shared/sequenceExecutor.js` · `shared/zoneGeometry.js` (nur, falls
`slotLabels` dort validiert wird) · `client/src/components/ZoneEditor.jsx` ·
`client/src/utils/zoneDraft.js` · `client/src/utils/sequenceSteps.js`
(Validierung darf `$`-Platzhalter in den neuen Feldern nicht anmahnen).

**Testidee.** Erweiterung von `server/test/sequence-reveal.test.js`: Leiste mit
vier Plätzen und `slotLabels`; ein **offener** Marker auf Platz 1 → `reveal_next`
nimmt Platz 2, `$revealedTier` ist der zweite Name, `$revealedSlot` ist 2; das
Token vom letzten Platz ist als letzter Platz gebunden. Ein Schritt mit
`cell: "$D1"` ohne vorherige Bindung → `skipped`. Zone ohne `slotLabels` →
`$revealedTier` bleibt unaufgelöst statt einen Index zu erfinden.

**Abhängigkeiten.** Keine. Läuft parallel zu T1–T3.

---

## T5 — `setups.scenario_data`: Szenariodaten speichern und prüfen

**Ziel.** Die abgelesenen Szenarien haben einen Ort und eine Prüfung, bevor
irgendein Schritt sie benutzt.

**Umfang.** Neue Spalte `scenario_data TEXT DEFAULT '{}'` in `setups`, additive
Migration nach dem vorhandenen Muster (kein Framework). POST und PUT auf
`/api/games/:id/setups` reichen sie durch wie `grid_data`/`action_data`, GET gibt
sie zurück. Dazu eine reine Funktion
`validateScenarioData(scenarioData, { assets, grids })` in `shared/`, die
zurückgibt, was fehlt: unbekanntes Raster, unbekanntes Asset, Feld außerhalb des
Rasters, doppelte Bösewichtnamen, leere Einträge. Sie ist das, was T6 vor dem
Legen ruft **und** was die Oberfläche anzeigen kann.

**Dateien.** `server/src/database.js` · `server/src/routes/setups.js` ·
`shared/scenarioData.js` (neu) · `client/src/pages/GameTable.jsx` (laden,
speichern).

**Testidee.** `server/test/setup-scenario-data.test.js` nach dem Muster von
`setup-action-data.test.js`: anlegen, lesen, aktualisieren, Feld weglassen ändert
nichts. `server/test/scenario-data-validate.test.js`: ein sauberer Eintrag ergibt
keine Meldung; jeder Fehlerfall genau eine, mit Bösewicht und Feld im Text.

**Abhängigkeiten.** Keine für die Spalte; die Validierung will `gridGeometry`
(vorhanden).

---

## T6 — `build_scenario`

**Ziel.** Ein Knopf baut das Szenario des aufgedeckten Bösewichts auf — regulär
oder als Endkampf.

**Umfang.** `build_scenario { final: "auto"|true|false }` (das Raster kommt aus
den Szenariodaten, nicht aus dem Schritt):
Eintrag über `$revealedBase` suchen · bei `final` den unteren Abschnitt additiv
dazunehmen (`auto` = `reveal_next` kam vom letzten Platz) · **erst prüfen, dann
legen** (`validateScenarioData` auf den einen Eintrag; ein Fehler → `failed`,
nichts liegt) · je Feld ein eigenes Objekt über `assetToken`, mit `gridId`/`cell`
· `$B`, `$D1..$D5`, `$FF1..$FF5` binden. Kein Eintrag → `skipped` mit Namen.

**Dateien.** `shared/sequenceExecutor.js` · `shared/scenarioData.js` ·
`client/src/utils/sequenceSteps.js` · `SetupSequenceEditor.jsx` ·
`client/src/pages/GameTable.jsx` (Szenariodaten in die `options` beider Aufrufe)
· `server/src/routes/rooms.js` (dasselbe für den Raumstart).

**Testidee.** `server/test/sequence-build-scenario.test.js`: Szenario mit drei
gleichen Plättchen auf drei Feldern → **drei** Objekte, nicht eines, jedes auf
seiner Feldmitte. Ohne vorheriges `reveal_next` → `skipped`. Unbekannter
Bösewicht → `skipped`, `state` unverändert. Eintrag mit einem Feld außerhalb des
Rasters → `failed`, **kein einziges** Objekt gelegt. `final: "auto"` nach einem
Aufdecken vom letzten Platz → Endkampf-Gelände dabei; von einem früheren Platz →
nicht dabei, und zwar auch dann, wenn nur drei Bösewichte in der Leiste lagen.
Ein folgender `place_asset` mit `cell: "$B"` landet auf dem B-Feld.

**Abhängigkeiten.** T1 (Rasterziel), T4 (Bindung), T5 (Daten + Validierung).

---

## T7 — Aktionen lassen sich in der Oberfläche anlegen

**Ziel.** `action_data` ist beschreibbar. Ohne das ist alles oben nur über
handgeschriebenes JSON an der API erreichbar — genau das Muster aus M2.7.

**Befund.** `action_data` wird im Client an einer Stelle gelesen
(`GameTable.jsx`, Setup-Laden) und **nirgends geschrieben**. Es gibt keinen
Editor, keinen Namen, kein Speichern.

**Umfang.** Im Setup-Modus: Aktionen auflisten, anlegen, umbenennen, löschen;
je Aktion die Schrittliste über den **vorhandenen** `SetupSequenceEditor`
bearbeiten (derselbe Editor, nicht ein zweiter); beim Speichern des Setups
mitschicken. Kein neues Schrittvokabular.

**Dateien.** `client/src/pages/GameTable.jsx` ·
`client/src/components/SetupSequenceEditor.jsx` (Mehrfachverwendung: Titel und
Schrittliste von außen) · ggf. `client/src/utils/` für die reine Logik
(Aktionsliste ändern), damit sie testbar ist.

**Testidee.** Reine Logik als Util auslagern und von `server/test/` prüfen:
Aktion anlegen erzeugt eine `id`, Umbenennen lässt Schritte unberührt, Löschen
trifft nur die eine, die Rundreise durch `JSON.parse(JSON.stringify(...))` ist
verlustfrei. Die JSX-Verdrahtung wird von Hand geprüft — dafür gibt es hier
keine Infrastruktur, und eine dafür einzuziehen ist eine eigene Entscheidung.

**Abhängigkeiten.** Keine. Kann zuerst laufen; spätestens vor T8 fertig.

---

## T8 — Die Aktion „Kampf beginnen" neu schreiben (Daten, kein Code)

**Ziel.** Der Knopf tut, was M7 verspricht.

**Umfang.** Keine Codeänderung. Im Setup:
Zone „Kampffeld" bzw. das Raster benennen · `slotLabels` an der Bösewicht-Leiste
(CHUMP / HOOLIGAN / TROUBLEMAKER / FINAL FIGHT) · Kurzpartie-Marker **offen** auf
Platz 1 · `scenario_data` für die gezogenen Bösewichte erfassen (macht der
Nutzer) · die Schrittfolge:

```
1  clear_zone   Ladenauslage          → Stapel "Nachschub", verdeckt   (M5.1)
2  clear_zone   Bösewicht-Platz       → Zone "Besiegte Bösewichte"
3  clear_zone   Bösewicht-Tableau
4  clear_grid   Kampffeld
5  remove_stack "Verhaltensdeck"
6  remove_stack "Überfall"
7  reveal_next  Bösewicht-Leiste      → Bösewicht-Platz
8  set_asset_face  Sideboard          → Kampfseite
9  place_asset  "Tableau: $revealedBase" → Zone "Bösewicht-Tableau", Szenarioseite
10 build_scenario  final "auto"   (Raster kommt aus scenario_data)
11 place_asset  "$revealed"           → Kampffeld, Feld "$B"
12 place_asset  "Figur: …"            → Kampffeld, Feld "$D1"  (dreimal)
15 set_asset_face  "Tableau: $revealedBase" → Vorderseite
16 place_stack  "Verhalten: $revealedBase" → "Verhaltensdeck"
17 shuffle      "Verhaltensdeck"
18 place_stack  "Überfall: $revealedBase"  → "Überfall", offen
```

Schritt 18 wird bei Bossen aus dem Basisspiel übersprungen und sagt das im
Protokoll — so ist es gewollt (M7, „keine Bedingungen im Vokabular").

**Testidee.** Von Hand am echten Tisch: dreimal drücken, jedes Mal ein anderer
Bösewicht, jedes Mal das passende Szenario, nichts vom vorigen übrig, beim
dritten der Endkampf-Abschnitt dabei. Der vierte Druck meldet, dass nichts mehr
aufzudecken ist, und ändert sonst nichts.

**Abhängigkeiten.** T1–T7.

---

## T9 (offen, nicht eingeplant) — Startwerte als Zähler

Wartet auf die Klärung der Regel (Video-Formel gegen gedruckte Spalten 2P–5P,
siehe M7 „Offen"). Schnitt, wenn es so weit ist: Name und Ort des Zählers im
Setup, die Zahl aus `scenario_data`, verbunden über einen Platzhalter im Wert
von `place_counter`.

---

## Offene Punkte aus der Planung

- Die lokale Datenbank (`server/data/card-game-engine.db`) ist leer — der
  TFT-Aufbau lebt nur in der Produktion. Die Zonennamen in T8 stammen aus der
  Spec, nicht aus den echten Daten, und sind vor T8 gegen das gespeicherte Setup
  abzugleichen.
- Ob es Dörfler-**Figuren** als eigene Assets gibt (neben den Ordnungstoken der
  Buyin'-Leiste), war ohne die Daten nicht feststellbar. T8 nimmt die
  `": "`-Konvention an (`Figur: Granny`).
- Welche Bildseite eines Tableaus die Szenarioseite ist, hängt laut M1b am
  Import und ist pro Kachel verschieden — Schritt 9 in T8 ist erst am echten
  Datenbestand festzuzurren.

---

## Nachtraege aus der Umsetzung

- **Die Kategorien heissen im echten Datenbestand `Aktionen: <Boesewicht>`**, nicht
  `Verhalten: <Boesewicht>` wie in Spec und T8 geschrieben (geprueft an der
  Produktion: 20 Decks a 15 Karten). T8 muss den richtigen Praefix verwenden.
- **Ueberfallkarten sind kein eigenes Deck.** Die 9 Ambush-Karten stecken laut
  Regelreferenz in den jeweiligen Aktionsdecks (dann je 15 Karten). T8 Schritt 18
  (`place_stack "Ueberfall: ..."`) hat damit keine Datenquelle - vor T8 klaeren,
  ob er entfaellt oder die Karten anders herauszuloesen sind.
- **Es sind drei `executeSequenceWithLog`-Aufrufstellen**, nicht zwei:
  `GameTable.jsx` (Aktion ausfuehren **und** Setup laden) sowie `rooms.js`.
  Dieser Zaehlfehler stand in mehreren Aufgabenbeschreibungen.
- **Bosswerte brauchen ein Feld, das entweder eine Vierertabelle oder eine Formel
  haelt** (T9): die meisten Boesewichte haben gedruckte Werte je Doerflerzahl,
  Barry Bluff rechnet sie aus den Doerflern, Ms. Falls hat "3 LEB je Doerfler",
  Patches aendert sie ueber die Kostuem-Mechanik. Siehe `docs/tft-regeln.md` 5.5.

- **`build_scenario` prueft auch den Endkampf-Abschnitt, den es nicht baut.** Die
  Aufgabe schreibt vor, `validateScenarioData` den **ganzen** Eintrag zu reichen
  (`{ gridLabel, bosses: { [name]: entry } }`, T5 hat dafuer keinen Filter). Die
  Folge steht so weder in Spec noch Aufgabe: ein Tippfehler im `final`-Abschnitt
  laesst **jeden** Kampf gegen diesen Boesewicht scheitern, nicht erst den
  letzten. So umgesetzt und bewusst behalten - der Fehler faellt damit beim
  ersten Kampf auf statt beim letzten -, aber T8 sollte es wissen.
- **`shared/scenarioData.js` stand in der Dateiliste von T6 und brauchte keine
  Aenderung.** T5 hat die Funktion passend geschnitten; T6 ruft sie nur.
