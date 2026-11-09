# Aufgaben: Zwei Altlasten gehen, Dörfler werden gewählt, ein Wert hat einen Ort (Spec M30)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M30** — dort stehen der gemessene Befund (M30.1), die beiden alten Aufbauten und der Name (M30.2), die Dörferwahl (M30.3), die Doppelwahl (M30.4),
was an den Zählern hängt (M30.5), die Lebensleiste ohne Platz 0 (M30.6), `require_marker` und die Umkehrung `zoneSlotNumberAt` (M30.7), die Bösewicht-Zähler (M30.8), der Zielstand mit Hashes (M30.9),
was **nicht** dazugehört (M30.10) und die Abnahme (M30.11). Datengrundlage: `docs/doerflerdaten.md` (Startwerte, Leisten), `docs/datenzugriff.md` (**Pflicht**, bevor Produktionsdaten auch nur gelesen werden).
Vorgeschichte: `docs/tasks-doerfler.md` (M26, `CI`–`CN`: `swap_villager`, das Tauschmenü), `docs/tasks-auslagen.md` (M27, `CO`–`DA`: `seat_villager`, Optionen), `docs/tasks-kartenzuordnung.md` (M29, `DK`–`DT`: dieselbe Vorlage
für das Schreiben).

**Aufgabenbuchstaben.** Der höchste vergebene ist `DT` (`docs/tasks-kartenzuordnung.md`); hier geht es mit **`DU`** weiter, bis **`EF`**. Geprüft: `DU`–`DZ` und `EA`–`EF` stehen in keiner `docs/tasks-*.md`.

**Reihenfolge.**
`DU` und `DV` sind voneinander unabhängig → `DW` (braucht `DU` und `DV`) → `DX` (braucht `DW`) → `DY` (unabhängig von `DW`, braucht nichts) → `DZ` (braucht `DW` und `DY`) — alles gegen **Fixtures und Wegwerf-Datenbank**, ohne Produktion.
→ **`EA`** (Deploy beider Images, Rauchtest davor und danach). **`EB`** (alte Aufbauten löschen, Rest umbenennen) hängt an **keinem** Code und darf jederzeit; **`EC`** (Dörferwahl), **`ED`** (Zähler der Dörfler), **`EE`** (Zähler des Bösewichts)
brauchen `EA`; `ED` zusätzlich `DW`, `DY`, `DZ` **im Deploy** (steht in `EA`). Jede der Daten-Aufgaben `EB`–`EE` hat **Teil 1** (Baustein, Tests gegen Fixture — kein Zugriff auf die Produktion) und **Teil 2** (Produktion lesen, schreiben, kontrollieren —
**ein eigener Lauf, einzeln freigegeben**). → `EF` (Dokumente, Liste für den Auftraggeber).
**Erst deployen, dann schreiben** (M30.9): die umgekehrte Reihenfolge wäre bei `EC` und `EE` ebenfalls unschädlich, bei `ED` **nicht** (der Executor kennt `require_marker` sonst nicht, die Dorfphase stünde an der Wache still).

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die ihn grün macht. Tests: `cd server && npm test` (Stand vorher, gemessen am 2026-11-09: **1 686**, alle grün).
Bau: `cd client && npx vite build` — **keine neue** Warnung (zwei sind vorbestehend: doppeltes `data-testid`, Chunkgröße). **Der Client hat keine Testinfrastruktur** (CLAUDE.md): reine Rechnung gehört nach `shared/` oder `client/src/utils/` und wird aus `server/test/` geprüft;
was nur Oberfläche ist (`SetupSequenceEditor.jsx`), prüft der Bau, nicht ein Test. Es gibt **eine** Stelle je Sache (M6): die Platznummer-Regel steht **einmal** in `shared/zoneGeometry.js`, die Wache **einmal** im Handler, der Startwert **einmal** in `shared/villagers.js`, die Zahlen der Daten **einmal** im Baustein.
**Kein `--force`**, nirgends. Datenänderungen gegen Spiel `072123c0-cd97-4ffb-a330-369630fab93f`, Aufbau `b1e10f4e-b8f2-4c2a-bb3e-54643944121b`, nach `docs/datenzugriff.md`: **nur** die Spalten lesen und schreiben, die die Aufgabe nennt — **nie** `zone_data`, `grid_data`, `state_data`, `save_states`;
erst Trockenlauf, dann `db.transaction`, dann Kontrollausgabe, **vorher** eine Sicherung ins **Scratchpad, nicht ins Repo** (die vom 2026-11-09 liegt dort: `…\scratchpad\bak\setups-2026-11-09-vor-CR.json`, sha256 `b877dbe20bc8`). Zugang zur Produktion:
`ssh -o UserKnownHostsFile=<Scratchpad>/known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes root@192.168.178.96` (die `known_hosts` des Nutzers ist veraltet und bleibt unberührt); Python auf diesem Rechner ist `py`. **Nicht an `gaming.benjathi.de` anmelden, keine Passwörter eingeben** — gemessen wird an der Datenbank.
**Der Agent committet und pusht nicht** (der Auftraggeber tut es); Skripte gehören nach `/app/<name>.mjs` im Container (`docs/datenzugriff.md`), ein neu angelegter Container hat sie nicht mehr.

---

## Wo die Spec nicht stimmt

Der Auftrag (Vorarbeit vom 2026-11-09) war an Code und Produktion gemessen; beim Schreiben der Spec haben sich neun Stellen gezeigt, an denen er nicht ganz trägt. Die ersten drei ändern den Zuschnitt, 4 bis 6 ändern Aufgaben, 7 bis 9 sind Fallen. Nach dem Bauen kamen 10 bis 18 dazu (`EF`, „Stand nach DU–EF“).

### 1. Es gibt keinen Platz 0 auf der Lebensleiste — und die Wache braucht ihn nicht

Der Auftrag fragte: „Leben 0 ist kein Platz — der Marker kann die ‚alle besiegt‘-Lage gar nicht einnehmen; prüfe es nach.“ Nachgelesen an `zone_data` der drei Zonen `Dörfler n: Leben` (Sicherung `b877dbe20bc8`): **zehn Plätze, Nummern 1…10, kein 0**; auch Bewegung und Mumm (1…10); nur Präzision hat 0 (−4…5).
Ein Platz 0 läge bei `relY` ≈ 1,04, **außerhalb des Rechtecks** der Zone, und gedruckt gibt es ihn nicht (M30.6). **Die Wache liest etwas anderes:** nicht „Wert über 0“, sondern „liegt ein Marker auf einer der drei Leisten“ — jeder Marker auf einer Leiste ist ≥ 1, `none` (kein Marker) ist 0.
Die in der Vorarbeit erwogene Alternative („die Leiste bekommt einen Platz 0“) ist **verworfen**, nicht aufgeschoben: sie kostete drei Vermessungen für einen nicht gedruckten Zustand.

### 2. An den Zählern hängen neun Stellen, nicht sechs

Die Vorarbeit nannte sechs. Hinzu kommen der Rauchtest (erkennt `require_marker` nicht als Wache), der Editor (kennt den Schritt nicht) und die Fixtures samt älteren Skripten (tragen `counters` als Stand von M26/M27 und **bleiben**). Tabelle in M30.5.

### 3. Der Code darf die Zähler nicht einfach entfernen

Entfernte der Executor sie, bräche eine frisch gebaute Kurzpartie **vor** dem Datenschnitt an der Wache (`no counter named "Henlo: Leben"`; `require_counter` hält bei einem fehlenden Zähler auch dann, wenn die anderen da sind). Darum **optional statt gelöscht** (`DY`): ein Platz ohne `counters` legt keine —
und der Deploy bleibt folgenlos, das Schreiben (`ED`) wird der eine Schalter.

### 4. In `placeVillager` sitzt eine Prüfung in der falschen Schleife

`placeVillager` prüft `no start value for <Wert>` **innerhalb** der Zählerschleife. Fiele die Schleife weg, entfiele die Prüfung — und die Markerschleife legte mit `slot: undefined` den Marker **auf Platz 1** (`place_asset` rechnet ohne `slot` aus der Belegung, `docs/tasks-marker.md`), ohne ein Wort.
**Die Prüfung muss bleiben, vor beiden Schleifen** (`DY`, ein Test dafür).

### 5. `require_counter` und `require_marker` halten bei „unlesbar“ verschieden

`require_counter` hält, wenn **irgendein** genannter Zähler fehlt (`missing.length`) — der Aufbau ist dann falsch. `require_marker` hält bei einer unlesbaren Zone nur, wenn **keine** andere besteht: ein Marker liegt schief, weil am Tisch gespielt wird, und „mindestens eine lebt“ ist dann trotzdem wahr (M30.7). Das ist
eine **Entscheidung**, kein Versehen (unten, Nr. 5), und der Handler trägt beide Lesarten, ohne die Haltelogik zu verdoppeln.

### 6. Die Bösewicht-Marker räumt heute niemand weg

`dorfphase-beginnen` 14–15 setzten die Zähler auf 0; die Marker auf `Bösewicht: Bewegung`/`Leben` bleiben nach dem Kampf stehen (kein Schritt räumt sie). Fallen die Zähler weg, stünden zwischen den Kämpfen die Werte des letzten Bösewichts auf den Leisten. Darum werden aus den zwei `set_counter` zwei
`clear_table` (`EE`), nicht zwei gestrichene Schritte.

### 7. `validateOptions` prüft nicht, dass ein Variablenwert ein Dörfler ist

`validateOptions` kennt Optionen, Wahlen und Platzhalter, aber nicht das Roster: eine Wahl `vars: { Doerfler1: "Henlo Bulwerk" }` (Tippfehler) bestünde die Prüfung und scheiterte erst beim Aufbau (`"Henlo Bulwerk" is not in the roster`). **Der Baustein (`EC`) prüft es gegen das Roster, und ein Test pinnt es**; `validateOptions` bleibt unverändert (es soll kein TFT-Wissen bekommen).

### 8. Die gemeinsamen Fixtures bilden den Stand vor M30 ab, und sollen es tun

`server/test/fixtures/doerfler-kurzpartie.json` und `auslagen-kurzpartie.json` tragen `counters` und die 65 Schritte vor M27; mit ihnen beweisen die Tests von M26/M27, dass der Aufbau „gleichwertig“ ist. **Nicht nachziehen** — sonst gehen die Beweise verloren. `EC` legt eine **eigene** Fixture an
(`setupwahl-kurzpartie.json`, die drei Spalten der Sicherung, Hash-gebunden).

### 9. Ein Lesezeichen auf einen gelöschten Aufbau lädt nicht

`?setup=<id>` eines gelöschten Aufbaus bricht mit `Failed to load setup` ab (`GameTable.jsx`, `console.error`). Die Kurzpartie behält ihre Id; die beiden alten waren unreferenziert. Der Auftraggeber sagt, ob er eines gespeichert hat (`EB`, Teil 2, Frage).

10. **M30.8 (`place_asset`) war falsch begründet.** Ein zweites `place_asset` mit demselben Namen setzt den vorhandenen Marker um und legt keinen zweiten an (`if (existing)` in `shared/sequenceExecutor.js`). Der Schaden ohne die zwei `clear_table` sind darum **stehenbleibende Werte** zwischen den Kämpfen (und vor Barry Bluff die des Vorgängers), nicht zwei Marker. Die `clear_table` bleiben richtig. Berichtigt im Text von M30.8 (Spec).
11. **`EA` 5 (b): `zoneSlotNumberAt` ist kein Beleg.** Der Minifier benennt interne Funktionen um; der Treffer ist 0 und muss es sein. Belegbar sind nur Zeichenketten: `require_marker`, `cannot be read`, `has no place`. Berichtigt in `EA` 5 (b).
12. **`DU`: nicht rot war der Test `validateOptions`** (Nummer 6). Die Folge mit `$optDoerfler<n>` bestand schon vorher, weil `validateOptions` `NAME_FIELDS` nicht liest. Rot war Nummer 7, der Quelltext-Test: vor `DU` stand in der Zeile `const NAME_FIELDS` kein `villager`. Nummer 6 bleibt als Pin, beweist aber nichts über die Änderung. Berichtigt in `DU`.
13. **`EF` Teil 1 Nr. 5: „die drei, die der Rauchtest importiert“ stimmt nicht.** `auslagen-rauchtest.mjs` importiert direkt `auslagen-daten.mjs` und `gelaendekarten-zuordnung.mjs`; über deren Importe kommen `doerfler-daten.mjs`, `equipment-zones.mjs`, `szenariodaten-berichtigung.mjs` und `szenariodaten-grundspiel.mjs` hinzu: sieben Dateien für den Rauchtest. Mit `setupwahl-daten.mjs` und `setups-aufraeumen.mjs` sind es neun. Berichtigt in `EF` Teil 1 Nr. 5 und in `docs/datenzugriff.md`.
14. **M30.2 gegen M30.9 und M30.11 — gemessen, nicht vermutet.** M30.2 sagte, die `--check` von M28 und M29 liefen nach `EB` nicht mehr. Am 2026-11-09, nach allen vier Schnitten, gefahren: `gelaendekarten-zuordnung.mjs` meldet „schon geschrieben: terrainCards 108 Zeichen, sha `aad39d745984`“, `szenariodaten-berichtigung.mjs` „22 Läufe sauber … alle sieben schon berichtigt“ mit Trockenlauf 0 Beanstandungen — auf dem **neuen** `scenario_data` (20 858, `82592d1ac883`), **ohne jede Abweichung**. Beide prüfen ihr eigenes Stück **am Inhalt**, nicht die Spalte am Gesamthash. Damit waren **zwei** Annahmen falsch: M30.2 („danach nicht mehr“) und die erste Fassung dieses Punktes („sie melden Abweichungen an den übrigen Zeilen“). Was bleibt: `auslagen-daten.mjs` und `doerfler-daten.mjs` sind Stand M26/M27 und dürfen nicht mehr mit `--write` fahren (Kopfkommentar dort).
15. **Name:** M30.2 nennt `Townsfolk Tussle` als Vorschlag; entschieden ist **„TFT Aufbau“** (Auftraggeber). Der Rückweg `--zurueck` stellt den **alten** Namen wieder her, nicht den Vorschlag. `EF` Teil 2, Punkt 9 ist angepasst.
16. **M30.5 Nr. 3 (Zahl der Spielstände) — geschlossen.** Von 17 `save_states` tragen **acht** je zwölf Dörfler-Zähler; **fünf** davon zeigen über `setup_id` auf den Aufbau, **drei** auf keinen, die neun übrigen sind TTS-Import-Stände vom Februar ohne Dörfler. Die Fünf aus M30.5 Nr. 3 und die Acht zählen Verschiedenes, es gibt keinen Widerspruch. Nachgemessen am 2026-11-09, lesend über `save_states.state_data`.
17. **Kopf von `scripts/setupwahl-daten.mjs`:** der Satz „Das Skript braucht nur `../shared/scenarioData.js` und `../shared/setupOptions.js`“ stimmt nicht; die Datei importiert auch `../shared/villagers.js`. Nicht geändert (`EF` ändert keinen Code); offen.
18. **`docs/datenzugriff.md`, Kopierliste:** seit M29 standen dort vier Dateien (`auslagen-daten`, `auslagen-rauchtest`, `doerfler-daten`, `equipment-zones`); M29 hatte die Liste nicht nachgezogen. Korrigiert auf neun Dateien.

---

## Entscheidungen

Entschieden hat der Auftraggeber nur, was im Auftrag steht: **die beiden alten Aufbauten weg**, **die Kurzpartie umbenennen** (Name offen), **Dörfler im Setup wählbar**, **Zähler weg, wo ein Marker denselben Wert zeigt**, **spec-, test- und subagent-getrieben**, **kein `--force`**. Der Rest steht hier mit Begründung;
wo er kippen soll, ist der Satz **Umkehr** der Preis.

1. **Die Dörferwahl ist der Optionsmechanismus** (drei Optionen `doerfler1`–`doerfler3`, Schlüssel = Kurzname, Vorgabe Henlo / Fridgette / Granny). *Umkehr:* ein eigenes Feld im Dialog — dann ein zweiter Mechanismus neben `SetupChoiceFields`, den Raum und Tisch je pflegen müssten.
2. **Das Tauschmenü bleibt.** Die Wahl im Setup ersetzt es nicht (M30.3). *Umkehr:* Menü streichen — es kostet nichts, und es ist der einzige Weg, mitten im Spiel zu wechseln.
3. **Doppelwahl: (a) so lassen** (M30.4). Platz bleibt leer, eine Zeile im Protokoll. *Umkehr:* eine Regel „diese Variablen müssen verschieden sein“ in `shared/setupOptions.js` — **nicht** in `SetupChoiceFields`; (b) „Halt statt Skip“ ist **verworfen**: es hinterließe dieselbe halbe Tischfläche mit weniger darauf.
4. **Zähler am Platz sind optional** (`DY`), nicht gelöscht. *Umkehr:* den Zweig entfernen, **nachdem** `ED` geschrieben ist und kein anderes Spiel Zähler am Platz braucht — dann sind `seatGeometryProblems`, `placeVillager` und `swapVillager` je ein Zweig kürzer; ein Test muss dann `seat.counters` als Datenfehler melden.
5. **`require_marker` ist ein eigener Schritttyp mit gemeinsamem Handler**, kein Feld an `require_counter` und keine Zonenliste an `require_zone` (M30.7). `above`: **mindestens eine** Zone > `above` besteht, unlesbare Zonen schaden nur, wenn keine besteht. `atStart`: **jede** Zone auf dem Startwert, unlesbar ist Halt. *Umkehr:* ein Feld `source` an `require_counter` —
   dann stoßen `Bösewicht: Leben` (Zähler **und** Zone) und der Editor zusammen.
6. **Kein Marker auf der Leiste heißt `none`, gelesen als 0 nur bei `above`** und als „abgewichen“ bei `atStart` (M30.6). *Umkehr:* Platz 0 einrichten (drei Vermessungen) — dann ist `none` ein Fehler und „besiegt“ ein Platz.
7. **Ein Marker ist das *eine* Plättchen auf der Leiste, das auf einem Platz liegt.** Zwei Plättchen → unlesbar, die Wache rät nicht. *Umkehr:* ein Feld `assetName` am Schritt — erst, wenn jemand einen Max-LEB-Stopper legt.
8. **`zoneSlotNumberAt` nimmt `onSlot` (0,5 Punkt), keinen „nächsten Platz“.** *Umkehr:* eine Toleranz am Aufruf — dann zählt ein Marker, der **neben** seinem Platz liegt, als darauf liegend, und die Aufräumfrage von M8.10 („was danebenliegt, hat den Punkt nicht bekommen“) wird still beantwortet.
9. **Die Bösewicht-Zähler sind eine Erweiterung** und eine **eigene Aufgabe** (`EE`). Streicht der Auftraggeber sie, bleibt der Rest unberührt. Sie werden nicht ersatzlos gestrichen: `dorfphase-beginnen` 14–15 räumen die Marker (`clear_table`).
10. **Die Wache sagt im Text „Marker“, nicht „Zähler“:** „Auf keiner Lebensleiste liegt noch ein Marker — alle drei Dörfler sind besiegt. Nach [DE S.22] ist die Partie damit zu Ende.“ (Wortlaut in M30.9). *Umkehr:* der alte Satz — er spräche von Zählern, die es nicht mehr gibt.
11. **Der Name der Kurzpartie ist ein Vorschlag:** `Townsfolk Tussle`. Das Skript von `EB` **verlangt** den Namen als Argument (`--name`), es hat keine Vorgabe: der Auftraggeber entscheidet, nicht der Baustein.
12. **Die älteren Skripte (`doerfler-daten.mjs`, `auslagen-daten.mjs`) und die gemeinsamen Fixtures bleiben unverändert**, ihr `--write` wird nicht mehr gefahren (`EF` schreibt es in ihren Kopf). *Umkehr:* nachziehen — dann sind die Gleichwertigkeitsbeweise von M26/M27 weg.
13. **Drei Schritte, ein Skript:** `scripts/setupwahl-daten.mjs` mit `--schritt optionen|zaehler|boss`, Vorbedingung **je Stück**. *Umkehr:* ein Lauf, der alles schreibt — dann gibt es keinen einzeln widerrufbaren Schritt, und M30.8 (Erweiterung) wäre nicht mehr abwählbar.
14. **Deploy vor Schreiben, kein Gegenbeweis nötig:** der Code ist ohne die Daten folgenlos (Entscheidung 4 und M30.9) — das ist ein **Test** (`DY`: der Aufbau mit den heutigen Daten und dem neuen Code ist **derselbe**, byteweise), keine Behauptung.
15. **Der Prototyp (`m30/proto2.js` im Scratchpad) kommt nicht ins Repo.** Er hat die Hashes in M30.9 geliefert; der Code wird nach den Tests neu geschrieben.

---

## DU — `villager` ist ein Namensfeld; die Doppelwahl wird festgehalten (M30.3, M30.4)

**Stand: fertig** (`b2fc3ab`). `server/test/seat-villager-choice.test.js` mit acht Testfällen; `'villager'` steht in `NAME_FIELDS`. Nummer 6 war nicht rot (Nr. 12).

**Befund.** `NAME_FIELDS` in `shared/sequenceExecutor.js` kennt `villager` nicht; ein `"$optDoerfler1"` in einem `seat_villager`-Schritt bliebe Text, und `pickSeat` meldete `"$optDoerfler1" is not in the roster`. Ist das behoben, fällt die Doppelwahl als Verhalten an, das niemand beschlossen hat — M30.4 beschließt es.

**Test zuerst** (`server/test/seat-villager-choice.test.js`, die Datei gibt es nicht; Tisch und Helfer aus `server/test/villager-table.js` — `fx`, `ZONES`, `scenarioData`, `opts`, `copy`, `build`). Die Optionen des Tests baut der Test selbst aus dem Roster (`scenarioData.villagers.roster`): je `doerfler<n>` mit neun Wahlen, wie M30.3.
Rot, solange `villager` kein Namensfeld ist (Nummern 1–5 und 7; Nummer 6 war schon grün, „Wo die Spec nicht stimmt“ Nr. 12):

1. **Die Wahl greift:** Folge `seat_villager seat 1/2/3 villager "$optDoerfler<n>"`, `choices { doerfler1: 'Judy', doerfler2: 'Norman', doerfler3: 'Quintus' }` → `seatedVillagers` nennt Judy Marks, Norman Fishboy, Quintus Binch; das Protokoll hat keinen Eintrag mit Status `failed` oder `skipped` (ein `note` ist erlaubt).
2. **Die Vorgabe baut den Tisch von heute:** `choices: {}` (Vorgaben) → **derselbe Zustand** wie `build()` aus `villager-table.js` (`deepEqual` auf `tokens`, `counters`, `cards`; `build()` setzt die drei Dörfler mit festen Namen).
3. **Ohne `choices`** (Aufruf wie von einer Aktion): drei Zeilen `skipped`, jede `$optDoerfler<n> is not bound`, **kein** Dörfler am Tisch, nichts wirft.
4. **Doppelwahl:** `doerfler1: 'Judy'`, `doerfler2: 'Judy'` → Platz 1 Judy, Platz 2 **leer**, Platz 3 sitzt; **genau eine** Protokollzeile mit Status `skipped` und dem Text `"Judy Marks" already sits at seat 1`; der übrige Aufbau (Zähler von Platz 3, ein nachfolgender `place_counter` in der Folge) läuft.
   **Dreimal derselbe:** zwei leere Plätze, zwei Zeilen.
5. **`swap_villager` bekommt es mit:** `villager: "$F1"` nach dem Aufbau (`$F1` = voller Name an Platz 1) → es meldet `already sits at seat 1`, nicht `is not in the roster` (der Platzhalter wird ersetzt).
6. **`validateOptions`** auf den drei Optionen, einer Folge mit `$optDoerfler<n>` und den vier Aktionen von heute → `[]`; alle **neun** Schlüssel (`Henlo` … `Yancy`) bestehen die Schlüsselregel (`KEY`).
7. **Der Kommentar:** `readFileSync('shared/sequenceExecutor.js')` enthält in der Zeile von `NAME_FIELDS` das Wort `'villager'` — der **einzige** Quelltext-Test dieser Datei (wie `DD` in `szenariodaten-berichtigung-lauf.test.js`).

**Dann** die kleinste Änderung: `'villager'` in `NAME_FIELDS`, im Kommentar darüber ein Satz (M30.3: für `seat_villager`/`swap_villager`, ein Platzhalter `$opt…` oder `$F1`). Nichts sonst — **kein** Prüfer, kein Dialog, keine Sonderbehandlung.

**Fertig, wenn:** die sieben Tests grün sind, `seat-villager.test.js`, `sequence-villager-steps.test.js`, `swap-villager.test.js`, `setup-options.test.js` **unverändert** grün sind und `npm test` grün ist.

## DV — Die Umkehrung: Punkt → Platznummer (M30.7)

**Stand: fertig** (`b2fc3ab`). `zoneSlotNumberAt` neben `zoneSlotNumbered` in `shared/zoneGeometry.js`; Tests in `server/test/zone-slot-number-at.test.js`.

**Befund.** `zoneSlotNumbered(zone, n)` liefert den Punkt zu einer Nummer; die Gegenrichtung gibt es nicht. Gebraucht wird sie, um den **Wert** eines Markers zu lesen (`require_marker`). Die Nummernregel (das geschriebene `n`, sonst die Stelle ab 1) und die Toleranz (`onSlot`, 0,5 Punkt) stehen schon
in `shared/zoneGeometry.js`; die Umkehrung nimmt **beide**, sie schreibt keine zweite.

**Test zuerst** (`server/test/zone-slot-number-at.test.js`; die Zonen aus `server/test/fixtures/auslagen-kurzpartie.json` — dort liegen die 54 Zonen der Produktion; aufgelöst wie in `zone-slot-number.test.js` mit `resolveZones`). Alle rot, solange die Funktion fehlt:

1. **Rundreise:** für jede Zone mit `layout: 'slots'` der Fixture (`Dörfler 1–3` × vier Werte, `Bösewicht: Bewegung` 12 Plätze, `Bösewicht: Leben` 24) und jede ihrer Nummern `n` gilt `zoneSlotNumberAt(zone, p.x, p.y) === n` mit `p = zoneSlotNumbered(zone, n)`.
2. **Null ist eine Zahl:** `Dörfler 1: Präzision`, Nummer **0** → `zoneSlotNumberAt` gibt `0` zurück (`=== 0`, nicht `null`); `−4` → `−4`; ein Punkt, der keinem Platz gleicht → `null`.
3. **Toleranz:** `0,4` Punkt neben einem Platz → die Nummer; `0,6` → `null` (dieselbe Schwelle wie `freeSlots`: ein Test legt `onSlot`-Verhalten und diese Funktion nebeneinander: ein Objekt, das `freeSlots` als „liegt auf dem Platz“ sieht, hat die Nummer, und umgekehrt); **mitten zwischen zwei Plätzen** → `null`.
4. **Keine Plätze:** Zone mit `layout: 'free'` oder ohne `layout`, eine Zone `layout: 'row'` ohne `capacity` → `null`. **Abgeleitete Plätze** (`row` mit `capacity: 4`) → Nummern ab **1** nach Position (`zoneSlotNumbered(zone, 1)` ist der erste); ein `stack` → `1`.
5. **Unsinn:** `x`/`y` `undefined`, `null`, `''`, `NaN`, ein Text → `null`, **kein** Wurf (wie `zoneSlotNumbered` bei `''`: „leer ist keine 0“).
6. **Eine Regel für die Nummer:** `zoneSlotNumberAt` und `zoneSlotNumbered` benutzen **dieselbe** Nummernrechnung (das geschriebene `n`, sonst `k + 1`); ein Test mit einer Zone, deren `slots` **zum Teil** `n` tragen (z. B. Nr. 1, dann eine Stelle ohne `n`, dann Nr. 5), gibt für beide Richtungen dasselbe.

**Dann** die kleinste Änderung: `export function zoneSlotNumberAt(zone, x, y)` in `shared/zoneGeometry.js`, **neben** `zoneSlotNumbered`; die Rechnung „Nummer des k-ten Platzes“ wird **eine** kleine Funktion, die beide benutzen (kein Kopieren der Zeile `Number.isFinite(s?.n) ? s.n : k + 1`). Kommentar: die Entscheidung von
M30.7 (eine Toleranz, kein „nächster Platz“; `0` ist gültig, Aufrufer vergleichen mit `=== null`).

**Fertig, wenn:** die sechs Tests grün sind, `zone-slot-number.test.js` und `zone-slots.test.js` **unverändert** grün sind, und `npm test` grün ist.

## DW — Der Schritt `require_marker` und der Startwert aus dem Roster (M30.7)

**Stand: fertig** (`b2fc3ab`). `markerStart` in `shared/villagers.js`. `require_marker` teilt sich in `shared/sequenceExecutor.js` den Handler mit `require_counter` (`case 'require_counter':` und `case 'require_marker':` stehen untereinander).

**Befund.** `require_counter` fragt Zähler. `dorfphase-beginnen` Schritt 1 und das Tauschmenü brauchen dieselbe Wache über **Marker**. M30.7 entscheidet: eigener Typ `require_marker`, **ein** Handler. Der Startwert für `atStart` kommt aus `roster[<Dörfler>].start[<Wert>]` und gehört nach `shared/villagers.js`
(`markerStart`), nicht in den Executor (er weiß nichts über Townsfolk Tussle).

**Test zuerst, 1: `markerStart`** (`server/test/villagers.test.js`, am Ende; die Datei gibt es): `markerStart(villagers, 'Henlo Bulwark', 'Dörfler 1: Mumm') === 2`; `'Dörfler 3: Präzision'` für Granny `=== −2`; Name **ohne Rücksicht auf Groß-/Kleinschreibung** (`findVillager`); unbekannter Dörfler → `undefined`; Zonenname ohne `": "` → `undefined`;
Wert, der keiner von `STATS` ist (`Dörfler 1: Foo`) → `undefined`; leere `villagers` → `undefined`.

**Test zuerst, 2: der Schritt** (`server/test/sequence-require-marker.test.js`; Tisch aus `villager-table.js` — `build()` stellt die drei Dörfler mit ihren zwölf Markern auf die Startwerte; die zwölf Leisten liegen in `ZONES`; Marker erkennt man am Etikett `Marker <n>: <Wert>`). Alle rot, solange der Schritt fehlt:

*Lesart `above` (die Wache „alle besiegt“):*
1. **Es besteht:** `build()`, `require_marker zoneLabel ["Dörfler 1: Leben","Dörfler 2: Leben","Dörfler 3: Leben"], above 0, confirm, message` + ein Schritt dahinter → alle `ok`, der Schritt dahinter **läuft**.
2. **Alle drei Marker von der Leiste genommen** (aus `tokens` gelöscht) → der Schritt hält: Status `skipped`, `entry.message` = der Satz, `entry.confirm === true`, `reason` endet auf `(1 further step skipped)`, und er nennt den Stand (`Dörfler 1: Leben: no marker`).
3. **Einer genügt:** zwei Marker entfernt, einer liegt → besteht. **Auch auf Platz 1 der Leiste** (Nummer 1 > 0).
4. **Unlesbar, keiner besteht:** auf `Dörfler 1: Leben` ein **zweites** Plättchen (Etikett `Max`), die beiden anderen Marker entfernt → hält **ohne** `message` (kein `confirm`), die Diagnose nennt `Dörfler 1: Leben` und `2 objects`. Ein **verschobener** Marker (3 Punkt neben seinem Platz) → Diagnose `has no place`, ebenfalls ohne `message`.
5. **Unlesbar neben einer bestandenen:** Marker 1 verschoben, Marker 2 liegt → besteht (M30.7: mindestens eine genügt).
6. **Zone fehlt:** `zoneLabel "Dörfler 9: Leben"` → hält mit `zone "Dörfler 9: Leben" not found`; **kein** Name (`[]`, `''`, fehlt) → hält mit `no zone given`; eine Zone **ohne feste Plätze** (im Test selbst gebaut: `layout: 'free'`) → hält mit `has no places`. In **keinem** dieser Fälle läuft der Rest.
7. **`above` frei:** `above: 3` und Marker auf 3 → hält (3 ist nicht über 3); Marker auf 4 → besteht. `above: 'x'` → hält mit `"x" is not a number` (wie `require_counter`).

*Lesart `atStart`:*
8. **Am Start:** `build()`, vier Zonen von Platz 1 (`Dörfler 1: Leben`, `…: Bewegung`, `…: Mumm`, `…: Präzision`), `atStart: true, villager: 'Henlo Bulwark'` → besteht. **`above` bleibt unbeachtet** (`above: 99` besteht ebenso).
9. **Abgewichen:** der Lebensmarker auf Nummer 2 (statt 3) → hält mit `message` und `confirm`; **Marker fehlt** → hält ebenso (`none` ist nicht am Start); der Stand nennt `Dörfler 1: Leben` und `started at 3`.
10. **Startwert 0:** Quintus an Platz 1 (`seat_villager`), Präzision-Marker auf **0** → besteht; Marker **fehlt** → hält (ein fehlender Marker ist **nicht** `0`, die 0 ist ein Platz und eine Zahl).
11. **Kein Startwert:** `villager` fehlt/leer/unbekannt, oder Zone `Dörfler 1: Foo` → hält mit `no starting value: "<Zone>"`, **ohne** `message`. **Unlesbare** Zone → hält mit Diagnose.
12. **Platzhalter:** `villager: '$F1'` löst auf (Platz 1 = Henlo) — wie `swap_villager` mit `$F1`.
13. **Kein Wurf:** `zoneLabel: 5`, `above: {}`, `villager: []` → Status `skipped`/`failed`, `executeSequence` wirft nie.

*Der Handler ist einer:*
14. **`sequence-require-counter.test.js` bleibt unverändert** (`git diff --stat server/test/sequence-require-counter.test.js` ist leer) und läuft grün.
15. **Quelltext-Test:** in `shared/sequenceExecutor.js` steht `case 'require_marker':` **unmittelbar** unter `case 'require_counter':` (ein Handler, M6) — der zweite Quelltext-Test dieses Meilensteins, mit Begründung im Kommentar: ein zweiter Handler wäre eine zweite Haltelogik.

**Dann** die kleinste Änderung: in `shared/sequenceExecutor.js` der gemeinsame Handler — die Felder lesen, `above`/`atStart`/`confirm`/`message` und das Halten **bleiben, wo sie stehen**; neu ist nur, woher die Liste `{ label, value, start }` kommt (eine kleine Funktion je Quelle: Zähler wie heute, Marker nach M30.7). Eine **private** Hilfe `readMarker(zone, state)` im Executor
(`objectsInZone(zone, state.tokens)` + `zoneSlotNumberAt` aus `DV`); `markerStart` in `shared/villagers.js` (exportiert). **Das Verhalten von `require_counter` ändert sich nicht** — auch nicht in den Meldungen.

**Fertig, wenn:** die Tests grün sind, `sequence-require-counter.test.js` **unverändert** grün ist, `npm test` grün ist.

## DX — Der Editor kennt `require_marker` (M30.5 Nr. 8, M30.5 Nr. 7)

**Stand: fertig** (`b2fc3ab`). Vokabular in `client/src/utils/sequenceSteps.js`, Tests in `server/test/sequence-steps.test.js`; Editor-Feld in `SetupSequenceEditor.jsx` (der Bau prüft es, kein Test).

**Befund.** Ohne Eintrag im Schrittvokabular ist der Schritt im Editor ein unbekannter Typ: er lässt sich weder lesen noch bearbeiten. Das Vokabular steht in `client/src/utils/sequenceSteps.js` (Felder je Typ, `stepFields`, `defaultStep`, `describeStep`, `validateStep`); der Rauchtest (`scripts/auslagen-rauchtest.mjs`) erkennt eine Wache an `require_counter`/`require_zone`.

**Test zuerst** (`server/test/sequence-steps.test.js`, am Ende; die Datei gibt es, ihr Muster gilt):
1. **Vokabular:** `require_marker` steht in der Typliste mit den Feldern `zoneLabel, above, atStart, villager, confirm, message`.
2. **`stepFields`:** mit `atStart: true` **fehlt** `above` und **steht** `villager`; ohne `atStart` umgekehrt (ein Feld ohne Wirkung ist ein Versprechen, das der Aufbau nicht hält — wie bei `require_counter`).
3. **`defaultStep('require_marker')`** ist `{ type, zoneLabel: [], above: 0, confirm: true, message: '' }` — **keine geratene Zone, kein geratener Satz** (wie `require_counter`).
4. **`describeStep`:** beide Lesarten stehen in der Zeile (`Require one of "Dörfler 1: Leben", … to carry a marker above 0, else ask before going on: "…"` und `Require every one of … to carry the starting value of "Henlo Bulwark" …`) — der Wortlaut ist frei, der Test prüft, dass sich beide **unterscheiden** und die Zonen, `ask before going on` bzw. `stop the sequence` und die `message` nennen.
5. **`validateStep`:** ohne Zone → Problem; `atStart` ohne `villager` → Problem; `above` kein Zahlenwert → Problem; ein `$opt…` in einer Aktion → das bekannte Problem aus der Aktionsprüfung (nichts Neues). Ein gültiger Schritt → `[]`.
6. **Der Rauchtest:** `scripts/auslagen-rauchtest.mjs` erkennt eine Wache **aus `require_marker`** wie die aus `require_counter` — die Prüfung steht dort in einer Zeile; **zieh sie in eine kleine, exportierte Funktion** (`istWache(eintrag)`), **ein** Test (in `auslagen-daten.test.js` neben den Tests von `rauchtest`/`bekannt`, oder in einer eigenen Datei) hält fest: `require_marker` mit `further steps skipped` → `true`, `require_counter` ebenso, `place_asset` → `false`.

**Dann** die kleinste Änderung: der Eintrag im Vokabular samt `stepFields`-Regel, `defaultStep`, `describeStep`, `validateStep`; im Editor (`client/src/components/SetupSequenceEditor.jsx`) das Feld `zoneLabel` für `require_marker` als **Liste, eine Zeile je Zone** — dieselbe Bauform wie das Feld `Counters` von `require_counter` (`nameLines`/`linesToCategory`),
das Feld `villager` als Textfeld (schon da für `swap_villager`/`seat_villager`). **Keine neue Komponente.** Der Bau (`cd client && npx vite build`) prüft die Oberfläche; es gibt keinen Test für sie.

**Fertig, wenn:** die Tests grün sind, `cd client && npx vite build` **ohne neue** Warnung läuft, und ein Blick in `SetupSequenceEditor.jsx` zeigt: **eine** Listenbauform, nicht zwei.

## DY — Zähler am Platz sind optional (M30.5, Wo die Spec nicht stimmt Nr. 3 und 4)

**Stand: fertig** (`b2fc3ab`). `server/test/seat-counters-optional.test.js` neu. Entscheidung 14 (Code vor Daten folgenlos) belegt der Deploy-Rauchtest in `EA`.

**Befund.** `seatGeometryProblems` **verlangt** vier Zählerstellen je Platz (`shared/villagers.js`); `seatVillager` baut `spots.counters` aus ihnen; `placeVillager` legt je Wert einen Zähler **und prüft darin den Startwert** (`no start value for <Wert>`); `swapVillager` übernimmt die Stellen der alten Zähler und meldet `noCounter(st)`.
M30.5 macht die Zähler **optional**: ein Platz ohne `counters` legt keine — der Code wird vor den Daten deploybar, ohne dass sich etwas ändert.

**Test zuerst** (`server/test/seat-counters-optional.test.js`; Tisch aus `villager-table.js`; die Szenariodaten des Tests sind eine **Kopie** von `scenarioData` mit `seats[].counters` gelöscht — `copy`, dann `delete`). Alle rot, solange die Zähler Pflicht sind:

1. **Die Geometrie:** `seatGeometryProblems(seat ohne counters, 1) → []`; mit **vier** Stellen → `[]` (wie heute); mit **nur Leben** → **drei** Probleme (`no counter position for Bewegung` …). **Eine** Regel, im Kommentar des Tests festgehalten: `counters` fehlt, ist `null` oder `{}` → „der Platz hat keine“ (`[]`); jede **Teil-Angabe** ist der Fehler.
2. **`validateVillagers`** auf den Daten **ohne** Zähler (mit `fx.assets`, `fx.cards`, Zonen) → keine Probleme; auf den heutigen Daten → keine (unverändert).
3. **Aufbau ohne Zähler:** `seat_villager` × 3 → `state.counters` ist leer; die **zwölf** Marker liegen auf den Startwerten (jede Nummer an ihrem Platz, `zoneSlotNumberAt` aus `DV` bestätigt es), Tableaus gesperrt, Spielsteine auf der Leiste, Ausrüstung in den Plätzen; Protokoll ohne Beanstandung.
4. **Derselbe Rest:** der Aufbau mit Zählern (heutige Daten) und der ohne sind **gleich** in `tokens` und `cards` (`deepEqual`) und unterscheiden sich **nur** in `counters` (12 gegen 0). **Das ist der Beweis, dass der Code vor den Daten deploybar ist** (Entscheidung 14): mit den heutigen Daten verhält sich der neue Code wie der alte
   (`seat-villager.test.js` und der Gleichwertigkeitstest dort bleiben **unverändert** grün).
5. **Der Startwert bleibt geprüft:** ein Roster-Eintrag ohne `start.Mumm` → `seat_villager` **scheitert** mit `no start value for Mumm` — **auch ohne Zähler am Platz**, und der Marker liegt **nicht** auf Platz 1 (Wo die Spec nicht stimmt Nr. 4). Erst nach der Prüfung wird gelegt: `state` bleibt unverändert (alles oder nichts).
6. **Tausch ohne Zähler am Platz:** `build` (ohne Zähler), `swap_villager 1 → Judy` → ok, **kein** `note` je Wert; Judys Marker auf ihren Startwerten; **keine** Zähler entstehen.
7. **Tausch mit alten Zählern am Tisch, Platz ohne Zählerstellen** (ein alter Spielstand): `build` **mit** Zählern, dann der Tausch gegen Daten **ohne** `counters` → die vier Zähler `Henlo: …` sind **weg**, neue entstehen **nicht**, kein `note`, ok.
8. **Tausch mit Zählerstellen** (heutige Daten): unverändert — `swap-villager.test.js` bleibt grün, **ohne dass eine Zeile in ihm angefasst wird**.
9. **Teil-Angabe:** `counters` nur mit `Leben` → `seat_villager` meldet weiterhin `no counter position for …` und stellt **nichts** (skip, wie heute); der Prüfer meldet dasselbe.

**Dann** die kleinste Änderung: (a) `seatGeometryProblems`: Zählerstellen nur prüfen, wenn der Platz **irgendeine** nennt; (b) `seatVillager`: `spots.counters` ist `null`, wenn `seat.counters` nicht genannt ist (die Stellen sonst wie heute); (c) `placeVillager`: **erst** die Startwerte prüfen (eine kleine Schleife über `STATS`, `problems.push('… no start value …')`, vor jedem Legen),
**dann** die Zählerschleife nur, wenn `spots.counters` da ist, **dann** die Markerschleife wie heute; (d) `swapVillager`: die Zähler des Alten werden **weggeräumt, wenn sie am Tisch liegen** (wie heute), `spots.counters` ist `null`, wenn der Platz keine Stellen nennt, und `noCounter` wird dann **nicht** gemeldet. **Keine** Änderung an den Daten, an `swapAction` (`DZ`) oder am Client.

**Fertig, wenn:** die neun Tests grün sind, `villagers.test.js`, `seat-villager.test.js`, `swap-villager.test.js`, `sequence-villager-steps.test.js`, `doerfler-daten.test.js` und `auslagen-daten.test.js` **unverändert** grün sind und `npm test` grün ist.

## DZ — Das Tauschmenü liest Marker (M30.5 Nr. 6, M30.7)

**Stand: fertig** (`b2fc3ab`). `swapAction` schreibt `require_marker`; die Rückfrage-Tests in `swap-villager.test.js` sind auf Marker umgeschrieben, nicht gestrichen.

**Befund.** `swapAction` (`client/src/utils/swapVillager.js`) schreibt als Schritt 2 ein `require_counter … atStart confirm` über die vier Zähler des Alten. Ohne Zähler **hielte es mit `no counter named …`** — jeder Tausch scheiterte an einer Rückfrage, die es nicht stellen kann. Das Menü muss auf `require_marker` umgestellt sein,
**bevor** die Daten die Zähler weglassen. Marker lagen und liegen immer (der Aufbau hat sie in jeder Fassung gelegt), das neue Menü läuft darum **auch mit den heutigen Daten**.

**Test zuerst** (`server/test/swap-villager.test.js`, die Tests, die die Form von `swapAction` festhalten, **werden geändert** — das ist die einzige Datei dieses Meilensteins, in der ein bestehender Test geändert werden darf; vorher die Zeilen 45–64 lesen, sie nennen `require_counter` und `atStart`). Rot, solange das Menü Zähler liest:
1. **Form:** `swapAction(VILLAGERS, 1, 'Henlo Bulwark', 'Judy Marks').steps.map(s => s.type)` → `['require_zone', 'require_marker', 'swap_villager']`; Schritt 2 hat `zoneLabel` = die **vier** Zonen `Dörfler 1: Leben`, `…: Bewegung`, `…: Mumm`, `…: Präzision` (aus `villagers.seats[0].zones` und `STATS`), `atStart: true`, `villager: 'Henlo Bulwark'`, `confirm: true` und denselben Satz wie bisher.
2. **Platz 3:** die Zonen heißen `Dörfler 3: …` (der Platz, nicht der Dörfler, bestimmt die Zonen).
3. **Am unberührten Tisch** (`build()`): die Aktion läuft ohne Rückfrage durch, der Tausch geschieht (wie die heutigen Tests 75–83).
4. **Lebensmarker verschoben:** die Aktion **fragt** (`entry.confirm`), **Abbrechen** lässt den Tisch unberührt, **Trotzdem** (ohne den Wachschritt) tauscht — wie heute für den Zähler (`swap-villager.test.js`, die drei Rückfrage-Tests werden auf Marker umgeschrieben, nicht gestrichen).
5. **Ohne Zähler am Tisch:** dieselben Fälle auf einem Tisch aus den Daten **ohne** `counters` (`DY`) — das Menü läuft, fragt, tauscht. **Das ist der Test, der vor `ED` grün sein muss.**
6. **Mit den heutigen Daten (Zähler vorhanden)** läuft das Menü ebenso: es liest die Marker, nicht die Zähler (ein Zähler auf einem **anderen** Stand als der Marker ändert die Rückfrage **nicht**).

**Dann** die kleinste Änderung: Schritt 2 von `swapAction` wird der `require_marker`; die Zonennamen kommen aus `villagers.seats[seat - 1].zones` und `STATS` (aus `shared/villagers.js`); `counterName` wird in `swapVillager.js` **nicht mehr importiert**, wenn nichts anderes es braucht. Die Kopfkommentare (`require_counter … atStart`) sagen danach **Marker**.

**Fertig, wenn:** die Tests grün sind, `cd client && npx vite build` ohne neue Warnung läuft, und `grep -n "require_counter\|counterName" client/src/utils/swapVillager.js` nur noch Kommentare findet, die erklären, was **früher** da stand (oder nichts).

## EA — Deploy beider Images (M30.9)

**Stand: erledigt** (CI-Deploy zu `b2fc3ab`, laut Bauprotokoll). Belege und Rauchtest-Vergleich: `docs/spec-setup-system.md`, „M30 — gebaut“. Schritt 5 (b) korrigiert (Nr. 11).

**Befund.** Der Executor und `shared/villagers.js`/`zoneGeometry.js` liegen in **beiden** Images (`docs/datenzugriff.md`, „Fallen“). Ein Deploy ändert nach `DU`–`DZ` **nichts Sichtbares** (Entscheidung 14, `DY` Test 4); er ist die Voraussetzung, dass das Schreiben der Daten der **eine** Schalter ist. Nichts wird in die Spalten geschrieben.

**Vorher fragen:** **spielt gerade jemand?** Der Deploy legt Container neu an (Datenbank und Uploads liegen in Named Volumes und bleiben). **Läuft CI?** `gh run list --limit 10` und `gh api repos/rayberirondelsol/card-game-engine/actions/runners` — ein Lauf in `queued` und ein fehlender Runner heißen, dass nichts deployt wird (CLAUDE.md).

**Schritte** (kein Test — jeder Schritt hat seinen Beleg):

1. Alle Tests von `DU`–`DZ` grün, Bau grün; die Änderungen sind auf `origin/master` (der Auftraggeber committet und pusht; der Agent nicht).
2. **Rauchtest `vorher`** (`auslagen-rauchtest.mjs`, **die Fassung, die jetzt auf der VM liegt**, gegen die Produktion): Ausgabe **und** Datei ins Scratchpad. Erwartet: 0 Beanstandungen.
3. **M28/M29 `--check`.** *Nachgetragen 2026-11-09: dieser Schritt wurde vor dem Löschen übersprungen und erst nach allen vier Schnitten gefahren. Ergebnis: `gelaendekarten-zuordnung.mjs` meldet „schon geschrieben: terrainCards 108 Zeichen, sha `aad39d745984`“ und `szenariodaten-berichtigung.mjs` „22 Läufe sauber … alle sieben schon berichtigt“, Trockenlauf 0 Beanstandungen — auf dem **neuen** `scenario_data` (20 858, `82592d1ac883`). Die Annahme aus M30.2 („danach nicht mehr“) war falsch: beide prüfen ihr eigenes Stück am Inhalt, nicht die Spalte am Gesamthash (Nr. 14).*
4. **Deploy:** per CI (Push auf `master`) oder von Hand (`cd /opt/card-game-engine && git reset --hard origin/master && docker compose up -d --build`). **Beide** Images neu.
5. **Belege:** (a) `sha256sum /shared/sequenceExecutor.js` im Backend = Hash der Datei im Repo (`zoneGeometry.js`, `villagers.js` ebenso); (b) **das Frontend-Bundle** enthält die Zeichenketten `require_marker`, `cannot be read` und `has no place` (`zoneSlotNumberAt` ist **kein** Beleg: der Minifier benennt interne Funktionen um, der Treffer ist 0 und muss es sein; „Wo die Spec nicht stimmt“ Nr. 11) (`docker exec card-game-engine-frontend sh -c 'grep -o "require_marker" /usr/share/nginx/html/assets/*.js | sort | uniq -c'` — Pfad prüfen;
   es ist ein Bündel, kein Quelltext; für jede der drei Zeichenketten zählen); (c) `gh run list --workflow=deploy.yml --limit 1 --json headSha` = der gepushte Commit; (d) die Skripte **neu in den Container**, **derselbe alte Rauchtest wie in Schritt 2** → `diff` der beiden Ausgaben **leer**.
6. Stimmt (d) nicht: **nicht weiter.** Den Deploy zurücknehmen (`git revert`, Rebuild) — die Spalten sind unberührt.

**Fertig, wenn:** (a)–(d) belegt sind und die Ausgabe der Schritte im Scratchpad liegt. **Sagt der Auftraggeber „nicht jetzt“, bleibt `EA` offen** — `EB` (Teil 1), `EC`–`EE` (Teil 1) dürfen vorher laufen, **kein** Teil 2 von `EC`–`EE`.

## EB — Die beiden alten Aufbauten löschen, die Kurzpartie umbenennen (M30.2)

**Stand: Teil 1 fertig** (`b2fc3ab`: `scripts/setups-aufraeumen.mjs`, `server/test/setups-aufraeumen.test.js`, `server/test/fixtures/setups-alt.json`). **Teil 2 erledigt** (Produktion): beide Zeilen gelöscht, Kurzpartie heißt **„TFT Aufbau“**; Sicherung sha `b877dbe20bc8`. Mutationstests: 4 Mutanten, 3 gefangen, 1 Test nachgetragen.

**Befund.** Siehe M30.1 und M30.2: zwei unreferenzierte Aufbauten (`c0f43ae6-f28c-40e5-a007-6f362f715b95` mit 0 Schritten, `8bc238c0-3043-4afb-804d-432742e78e80` mit hartverdrahteten Dörflern), ein Name, der lügt. Das ist die einzige Daten-Aufgabe, die an **keinem** Code hängt.

### Teil 1 — der Baustein, ohne Produktion

**Test zuerst** (`server/test/setups-aufraeumen.test.js`; eine **Wegwerf-Datenbank** in `os.tmpdir()`, aufgebaut mit `CGE_DB_PATH` und `getDb()` wie die anderen Datenbanktests; die beiden alten Zeilen stehen **vollständig** in der neuen Fixture `server/test/fixtures/setups-alt.json` —
`id, game_id, name, state_data, created_at, updated_at, zone_data, sequence_data, grid_data, action_data, scenario_data` aus der Sicherung, die Datei ist klein, rund 10 KB —; die Kurzpartie ist ein Stellvertreter mit derselben Id und kleinen Spalten). Alle rot, solange das Skript fehlt:
1. **`--check`** schreibt nichts und nennt: beide Zeilen **vorhanden**, **nicht referenziert** (Anzahl `save_states` und `game_rooms` mit dieser `setup_id`: 0), Hash je Zeile (`sha256` über die elf Spalten) **gleich der Fixture**, der heutige Name der Kurzpartie.
2. **Verweigert** (`exit` ≠ 0, **nichts** geändert) wenn: eine `save_states`- **oder** `game_rooms`-Zeile auf eine der beiden zeigt; eine der beiden Zeilen **anders** ist als die Fixture (ein Hash weicht ab); die Kurzpartie fehlt; `--name` fehlt oder ist leer; die Sicherung (`--sicherung <Datei>`, `--sicherung-sha <sha>`) fehlt oder ihr Hash nicht stimmt.
3. **`--write --name "Townsfolk Tussle" … `:** genau **zwei** Zeilen weg; die Kurzpartie hat **nur** den neuen `name`, **alle anderen Spalten byteweise gleich**, `updated_at` unverändert; **alle** übrigen Tabellen unverändert (Fingerabdruck je Tabelle, `save_states` je Zeile); eine `IMMEDIATE`-Transaktion; bei einem Fehler mittendrin **nichts** geändert (Rollback; der Test erzwingt ihn).
4. **Zweiter Lauf:** „schon erledigt“, schreibt nichts, Exit 0.
5. **`--zurueck <Sicherung> <db>`:** die beiden Zeilen sind **byteweise** wieder da (gleiche Spalten, gleiche `created_at`/`updated_at`), die Kurzpartie hat ihren **alten** Namen zurück — **nur** wenn ihr Name **genau** der gesetzte ist (sonst Abbruch: jemand hat ihn inzwischen geändert); ein `--zurueck` auf eine Datenbank, in der die Zeilen schon da sind → Abbruch, nichts geändert.
6. **Kein `--force`:** das Argument wird nicht erkannt (Fehlermeldung, Exit ≠ 0).

**Dann:** `scripts/setups-aufraeumen.mjs` (`--check`, `--write … --sicherung-sha … --name …`, `--zurueck`; startet nur, wenn `process.argv[1]` auf seinen Namen endet, wie die anderen) — die Zahlen und Hashes stehen **einmal** als Konstanten im Skript, der Test importiert sie.

### Teil 2 — Produktion (eigener Lauf, nach Freigabe)

1. **Fragen an den Auftraggeber, vorher:** (a) **der Name** — Vorschlag `Townsfolk Tussle` (M30.2), **er entscheidet**; (b) **hat er ein Lesezeichen** auf einen der beiden alten Aufbauten (Wo die Spec nicht stimmt Nr. 9); (c) **ist ein Setup-Editor offen?** (Er schreibt beim Speichern auch `name` zurück, `docs/datenzugriff.md`, „Fallen“.)
2. **Lesen** (Rezept in `docs/datenzugriff.md`): beide Zeilen, ihre Hashes **gegen die Fixture**; Anzahl `save_states`/`game_rooms` je Id (erwartet 0 und 0); der heutige Name der Kurzpartie. Weicht etwas ab: **stopp** und dem Auftraggeber sagen.
3. **Sicherung ins Scratchpad:** die beiden Zeilen vollständig (`setups-alt-2026-11-09.json`, Hash notieren); die vom 2026-11-09 (`b877dbe20bc8`) ist die Gegenprobe.
4. **`--check`**, dann **`--write … --sicherung-sha <Hash> --name "<Name>"`**; Kontrollausgabe **neu gelesen**: `SELECT id, name FROM setups WHERE game_id = ?` → genau **ein** Aufbau mit der Id `b1e10f4e…` und dem neuen Namen; `scenario_data`/`sequence_data`/`action_data`/`zone_data` der Kurzpartie **Hash gleich** wie vorher; `save_states` jede Zeile gleich.
5. **Zweiter Lauf:** „schon erledigt“.

**Wenn etwas nicht stimmt:** `--zurueck`. Nichts anderes anfassen.

**Fertig, wenn:** Teil 1 grün ist, **Teil 2** belegt im Scratchpad liegt (Sicherung, `--check`, Kontrollausgabe).

## EC — Die Dörferwahl: drei Optionen und drei Platzhalter (M30.3, M30.9)

**Stand: Teil 1 fertig** (`98935b6`), **Teil 2 erledigt**: `scenario_data` 19 106 → **21 244**, `sequence_data` 2 781 → **2 780**, Hashes wie in M30.9. Mutationstests: 27 Mutanten, 24 gefangen, drei Tests nachgetragen.

**Befund.** `scenario_data.options` hat `partie` und `troedel`; die Dörfler stehen in `sequence_data` 25–27 hartverdrahtet. M30.3 legt die Daten im Wortlaut fest, M30.9 den Zielstand (`scenario_data` 19 106 → **21 244**, `7e654774e019`; `sequence_data` 2 781 → **2 780**, `a63d57d7ea86`; `action_data` unverändert).
Hier entsteht auch das Gerüst für `ED` und `EE`: `scripts/setupwahl-daten.mjs`, die **Fixture** und der gemeinsame Testunterbau.

### Teil 1 — Baustein, Fixture, Tests, ohne Produktion

**Fixture zuerst:** `server/test/fixtures/setupwahl-kurzpartie.json` mit den **drei Spalten** `sequence`, `scenario`, `actions` als **Text** (so, wie sie in der Datenbank stehen, aus der Sicherung `b877dbe20bc8`), dazu die Hashes `914461d63f77` / `33a42ffe0f71` / `63abf4174038`; Bibliothek, Assets und **Zonen** lesen die Tests aus
`auslagen-kurzpartie.json` (dort liegen die 54 Zonen der Produktion). **Ein Test pinnt die Hashes der Fixture** (sie ist hier der Ausgangsstand, nicht der Zielstand).

**Test zuerst** (`server/test/setupwahl-daten.test.js`; **reine** Funktionen des Bausteins `patchOptionen(scenario, sequence)`, kein Datenbankzugriff in diesem Teil). Rot, solange das Skript fehlt:
1. **Zielstand:** auf der Fixture → `scenario` **21 244** Zeichen, sha `7e654774e019`; `sequence` **2 780**, `a63d57d7ea86`; die **zwei** vorhandenen Optionen (`partie`, `troedel`) und alle übrigen Schlüssel (`bosses`, `villagers`, `terrainCards`, `gridLabel`, `cardZoneLabel`) **byteweise gleich** (Rückwärtsbeweis: im neuen Text die drei neuen Schlüssel von `options` entfernen und die drei `villager` zurücksetzen → der gelesene Text, Zeichen für Zeichen).
2. **Die Optionen im Wortlaut:** `doerfler1`–`doerfler3`, `label` `Dörfler <n>`, `default` `Henlo` / `Fridgette` / `Granny`, je **neun** Wahlen in der Reihenfolge des Rosters, `vars: { Doerfler<n>: "<voller Name>" }`, Schlüssel = `roster[name].short`. Die Reihenfolge der Schlüssel von `options`: `partie`, `troedel`, `doerfler1`, `doerfler2`, `doerfler3`.
3. **Prüfer:** `validateOptions(options, sequence, actions)` → `[]`; `validateScenarioData(…)` auf dem neuen Text → keine Probleme; **jeder** `vars.Doerfler<n>` ist ein Schlüssel von `roster` (Wo die Spec nicht stimmt Nr. 7 — der Test erzeugt ein Problem, wenn man einen Namen im Roster umbenennt, ohne die Option mitzuziehen; **das prüft der Baustein**, nicht `validateOptions`).
4. **Der Tisch:** der neue Aufbau mit den Vorgaben (`choices: {}`) = der **alte** Aufbau (`deepEqual` auf `tokens`, `counters`, `cards`, `stacks`, `boards`; **Zonen, Assets und Bibliothek aus `auslagen-kurzpartie.json`**, `rng` fest); die Wahl `{ doerfler1: 'Judy', doerfler2: 'Norman', doerfler3: 'Quintus' }` baut Judy, Norman, Quintus, **zwölf Marker auf ihren Startwerten** (Nummern aus `zoneSlotNumberAt`), keine Beanstandung außer dem erlaubten `note` für `unverified`; **alle neun** Dörfler **an Platz 1** (je ein Lauf) bauen ohne Problem; Georgie meldet das `note` aus seinem `unverified`.
5. **Doppelwahl** (M30.4): zwei gleiche → Platz 2 leer, **eine** `skipped`-Zeile; der Baustein verhindert es **nicht**.
6. **Vorbedingung je Stück:** der Baustein prüft, bevor er etwas ändert, dass `options` **genau** `partie` und `troedel` trägt **und** dass die drei `seat_villager` an 25–27 (0-basiert) **genau** `Henlo Bulwark` / `Fridgette Jones` / `Granny Melba` nennen (oder schon `$optDoerfler<n>` — dann „schon geschrieben“); jede andere Abweichung → Abbruch mit Pfad (kein `--force`). **Vorhandene** Optionen `doerfler…`, die **anders** sind als das Ziel → Abbruch.
7. **Der Kopf des Skripts** nennt Zielstand und Hashes **nicht noch einmal** (sie stehen als Konstanten, der Test importiert sie): `SCHRITTE = { optionen, zaehler, boss }` mit je `{ ausgang, ziel }`.

**Dann:** `scripts/setupwahl-daten.mjs` mit `patchOptionen`, `main(argv, deps)` (nur `--schritt optionen` in dieser Aufgabe, die anderen melden „noch nicht gebaut“), `--check`, `--write … --sicherung-sha`, `--zurueck`, **kein `--force`**, nach der Vorlage von `scripts/gelaendekarten-zuordnung.mjs` (M29, `DM`/`DN`): Vergleich-und-Tausch mit `UPDATE … WHERE scenario_data = <gelesen> AND sequence_data = <gelesen>`, `IMMEDIATE`,
Fingerabdruck je Tabelle und je Zeile von `save_states` vorher/nachher, Rückwärtsbeweis, zweiter Lauf „schon geschrieben“. Gelesen und geschrieben werden **nur** `scenario_data` und `sequence_data` dieses Schritts. Ein Test mit einer Wegwerf-Datenbank deckt `--check`, `--write`, den zweiten Lauf und `--zurueck` (exakter Zielstand → Ausgang) ab.

### Teil 2 — Produktion (eigener Lauf, nach `EA` und Freigabe)

1. **Lesen:** `scenario_data`, `sequence_data` roh, Länge, sha256, Schlüsselreihenfolge von `options`; **gegen M30.9 (Ausgang)**. Weicht etwas ab: **stopp**, dem Auftraggeber sagen.
2. **Sicherung** der beiden Spalten ins Scratchpad (`…-M30-EC-vorher.json`, Hash notieren) und je Zeile von `save_states` ein Hash.
3. **`--check`** im Container (Skripte nach `/app/`, `docs/datenzugriff.md`), Ausgabe gegen M30.9 lesen.
4. **Frage an den Auftraggeber:** ist ein **Setup-Editor** (`?mode=setup`) offen? Er stellt beim Speichern **auch M28 und M29 zurück** (`docs/datenzugriff.md`, „Fallen“). Der Server sieht es nicht.
5. **`--write … --sicherung-sha <Hash>`**, Kontrollausgabe **neu gelesen**: `21 244` / `7e654774e019`, `2 780` / `a63d57d7ea86`, `bosses` und `villagers` Hash gleich, `validateScenarioData` 0 Probleme, Fingerabdruck gleich. **Zweiter Lauf:** „schon geschrieben“.
6. **Rauchtest** (nur lesend; `auslagen-rauchtest.mjs`, um die Fälle aus M30.9 erweitert — das geschieht in **diesem** Teil, mit Test für die neuen Fälle in `auslagen-daten.test.js`): Aufbau mit der Vorgabe = der Tisch von heute; Aufbau mit Judy/Norman/Quintus; Doppelwahl; **0 Beanstandungen** bei den ersten beiden.

**Wenn etwas nicht stimmt:** `--zurueck <Sicherung> <db>`. Nichts anderes anfassen.

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt (oder `EA` offen ist: dann Teil 2 **nicht** begonnen).

## ED — Die Zähler der Dörfler weg (M30.5, M30.6, M30.9)

**Stand: Teil 1 fertig** (`98935b6`), **Teil 2 erledigt**: `scenario_data` 21 244 → **20 858**, `action_data` 6 611 → **5 937**, `dorfphase-beginnen` 45 → **33** Schritte. Mutationstests: 50 Mutanten, 42 gefangen, fünf Tests nachgetragen, danach 49 / 50.

**Befund.** Siehe M30.5/M30.6. Ist der Code deployt (`DW`, `DY`, `DZ` in `EA`), werden **drei** Stücke geändert: `scenario_data.villagers.seats[].counters` fallen weg (−386 Zeichen); `dorfphase-beginnen` Schritt 1 (die Wache) wird `require_marker`; Schritte 16–27 (zwölf `set_counter`) entfallen. Zielstand: `scenario_data` **20 858**, `82592d1ac883`; `action_data` **5 937**, `526c17f0fdf6` (`dorfphase-beginnen` 45 → **33**).
**Ändert** (nicht nur ergänzt) → `docs/datenzugriff.md` „Regeln fürs Schreiben“ **Nr. 5** gilt: Vorbedingung je Stück, Rückwärtsbeweis.

### Teil 1 — der Schritt `zaehler` im Baustein, ohne Produktion

**Test zuerst** (`server/test/setupwahl-daten.test.js`, am Ende; Eingang ist der Zielstand von `EC`, nicht die Fixture allein — der Test wendet `patchOptionen` zuerst an). Rot, solange der Schritt fehlt:
1. **Zielstand:** nach `optionen` → `scenario` **20 858**, `82592d1ac883`; `action` **5 937**, `526c17f0fdf6`; **alles andere** byteweise gleich (die vier Aktionen, bis auf `dorfphase-beginnen`; `bosses`, `roster`, `options`, `terrainCards`, `barZone`, `fightZone`, `seats[].anchor/zones/markers/vorrat/tableau` unverändert). Rückwärtsbeweis: die drei `counters` wieder einsetzen, Schritt 1 und 16–27 zurücksetzen → der gelesene Text, Zeichen für Zeichen.
2. **Vorbedingung je Stück:** jeder der 12 Schritte 16–27 ist **genau** der `set_counter` aus der Sicherung (`$V<n>` + `: <Wert>`, `"max"` bei Leben, `"base"` sonst); Schritt 1 ist **genau** der `require_counter` aus der Sicherung (Name, `above`, `confirm`, `message`); jede Abweichung → Abbruch mit Pfad. Ein Stück, das schon im Ziel ist, ist „schon geschrieben“.
3. **Der neue Schritt 1 im Wortlaut** (M30.9): `type require_marker, zoneLabel [Dörfler 1: Leben, Dörfler 2: Leben, Dörfler 3: Leben], above 0, confirm true, message …` — Schlüsselreihenfolge **wie hier**, und die drei Zonen **gibt es** in den Zonen der Fixture (der Baustein prüft sie gegen `zones`, sonst Abbruch).
4. **Der Tisch:** auf dem neuen Aufbau (`EC` angewendet, `counters` weg): (a) **Aufbau:** `state.counters` hat nur `Münzen (gemeinsam)` und die zwei Bösewicht-Zähler; (b) `dorfphase-beginnen` nach einem Kampf: **keine** `skipped`-Zeile, zwölf Marker auf den Startwerten; (c) **alle drei Lebensmarker von der Leiste genommen** → die Aktion **hält mit der Rückfrage**, **nichts** wird abgeräumt; (d) **einer liegt** → sie läuft; (e) **Tausch** (`swapAction`) am unberührten Tisch ohne Rückfrage, nach Verschieben des Lebensmarkers mit Rückfrage.
5. **Alter Spielstand** (ein Zustand, der noch Dörfler-Zähler trägt, aus `build()` der **alten** Daten): die neue Dorfphase läuft, die **verwaisten Zähler bleiben** stehen, die Marker werden zurückgestellt; die Wache liest die Marker.
6. **Disjunkt:** der Schritt `zaehler` ist **vor** und **nach** `optionen` (und `boss`) anwendbar; die Stücke überschneiden sich nicht (Test: beide Reihenfolgen führen zu **demselben** Text, wenn man alle drei anwendet).

**Dann:** `patchZaehler(scenario, actions, zones)` im Baustein, `--schritt zaehler` in `main`.

### Teil 2 — Produktion (eigener Lauf, nach `EA`, `EC` und Freigabe)

**Voraussetzung:** `EA` fertig — `DW`, `DY`, `DZ` **laufen in beiden Images** (Beleg in `EA` 5 (b)). **Ohne sie bleibt die Dorfphase an der Wache stehen.**

1. **Lesen:** `scenario_data`, `action_data` roh, Länge, sha256; **gegen M30.9**. Weicht etwas ab: **stopp**.
2. **Sicherung** der zwei Spalten ins Scratchpad (`…-M30-ED-vorher.json`, Hash notieren), Hash je Zeile von `save_states`. **Wie viele der fünf Zustände tragen Dörfler-Zähler?** (`state_data` lesen, zählen, **nicht ändern**) — die Zahl geht an den Auftraggeber (M30.5 Nr. 3).
3. **`--check`**, die Frage nach dem offenen Editor, **`--write … --sicherung-sha`**, Kontrollausgabe **neu gelesen**: `20 858` / `82592d1ac883`, `5 937` / `526c17f0fdf6`, `dorfphase-beginnen` hat **33** Schritte, Schritt 1 ist `require_marker`; zweiter Lauf „schon geschrieben“.
4. **Rauchtest** (nur lesend, mit den Fällen aus `EC`): ein Aufbau, ein `kampf-beginnen`, `dorfphase-beginnen` → **keine** `skipped`-Zeile; alle drei Lebensmarker entfernt → Halt mit `entry.confirm`; Tausch am unberührten Tisch → ohne Rückfrage; **0 Beanstandungen**.

**Wenn etwas nicht stimmt:** `--zurueck <Sicherung> <db>` — **sofort**, solange die Zähler am Tisch fehlen und die alte Wache sie verlangte, ist jeder frische Aufbau an der Dorfphase **gesperrt** (der Ausgang ist ein Wegwerf-Aufbau, kein Datenverlust).

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt.

## EE — Die Zähler des Bösewichts weg (M30.8, Erweiterung über das Gesagte hinaus)

**Stand: Teil 2 erledigt** (Produktion); **Teil 1 nicht committet** (`scripts/setupwahl-daten.mjs` und `server/test/setupwahl-daten.test.js` im Arbeitsbaum). `sequence_data` 2 780 → **2 621**, `action_data` 5 937 → **5 803**, `kampf-beginnen` 19 → **17**. Mutationstests: 36 Mutanten, 35 gefangen, drei Tests nachgetragen. Die Erweiterung ist mit `--zurueck … --schritt boss` einzeln zurücknehmbar.

**Befund.** Siehe M30.8: **eine Erweiterung**, einzeln widerrufbar; sie hängt an nichts anderem als an `EA`. Wer sie nicht will, **streicht diese Aufgabe**, und `EB`–`ED` gelten unverändert. Geändert werden **zwei Spalten**: `sequence_data` (31 → **29** Schritte, `2 621`, `e859bd457002`) und `action_data`
(`kampf-beginnen` 19 → **17**; in `dorfphase-beginnen` werden **zwei** `set_counter` zu `clear_table` — 33 Schritte bleiben; `5 803`, `33033dace238` nach `EC`, `ED`, `EE`). **`Münzen (gemeinsam)` bleibt.**

### Teil 1 — der Schritt `boss` im Baustein, ohne Produktion

**Test zuerst** (`server/test/setupwahl-daten.test.js`, am Ende). Rot, solange der Schritt fehlt:
1. **Zielstand** nach `optionen` und `zaehler`: `sequence` **2 621**, `e859bd457002`; `action` **5 803**, `33033dace238`; **alles andere** byteweise gleich. Rückwärtsbeweis wie in `ED`.
2. **Genau diese Stücke:** Aufbau-Schritte 29–30 (0-basiert) sind **genau** `place_counter Bösewicht: Bewegung` (`value 0`, `x 1470`, `y 903`) und `place_counter Bösewicht: Leben` (`value 0`, `x 1470`, `y 977`); `Münzen (gemeinsam)` (28) **bleibt**; `kampf-beginnen` 8–9 sind **genau** `set_counter … "$BEW"`/`"$LEB"`; `dorfphase-beginnen` (nach `ED`: 14–15, vor `ED` ebenfalls 14–15) sind **genau** `set_counter … 0`. Jede Abweichung → Abbruch mit Pfad.
3. **Die zwei neuen Schritte im Wortlaut:** `{ "type": "clear_table", "assetName": "Marker: Bösewicht BEW" }` und `…LEB`; an derselben Stelle (14–15).
4. **Der Tisch:** (a) der Aufbau hat **nur** `Münzen (gemeinsam)` als Zähler; (b) `kampf-beginnen` legt die Marker auf die Leisten (Nummern = Werte des Bösewichts; für **jeden der 20** Bösewichte außer Barry Bluff — Werte aus `scenario_data.bosses`, der Test rechnet sie nicht selbst); (c) **Barry Bluff:** kein Marker, **kein** Zähler, die Zeile `has no place` wie heute, der Aufbau läuft;
   (d) `dorfphase-beginnen` räumt beide Marker **vom Tisch** (kein Token mit diesem Namen mehr); ein zweites Mal ohne Marker → **ok** (nichts zu räumen ist gelungen); (e) das nächste `kampf-beginnen` legt **neue** Marker.
5. **Kein anderer Schritt liest die Bösewicht-Zähler:** `JSON.stringify` der Folge und der Aktionen nach dem Schnitt enthält `Bösewicht: Bewegung` und `Bösewicht: Leben` **nur** als Zonennamen (`targetZoneLabel`), nicht als `name` eines Zählers.
6. **Disjunkt** wie in `ED`: jede Reihenfolge von `optionen`, `zaehler`, `boss` führt zum selben Text.

**Dann:** `patchBoss(sequence, actions)`, `--schritt boss`.

### Teil 2 — Produktion (eigener Lauf, nach `EA` und Freigabe; unabhängig von `EC`/`ED`)

Lesen / Sicherung / `--check` / Editor-Frage / `--write … --sicherung-sha` / Kontrollausgabe / zweiter Lauf, **wie in `ED`**, gegen **M30.9**: `sequence_data` `2 621` / `e859bd457002`, `action_data` `5 803` / `33033dace238` (in der empfohlenen Reihenfolge; liegt `EE` **vor** `EC`/`ED`, gelten die Texte der Vorbedingung je Stück, nicht diese Hashes — der Baustein nennt den erwarteten Zielstand je Reihenfolge nicht, er prüft die Stücke).
**Rauchtest (nur lesend):** je ein Kampf gegen einen Bösewicht mit Zahlen **und** gegen Barry Bluff; danach `dorfphase-beginnen` → die Leisten sind leer; **0 Beanstandungen**.

**Wenn etwas nicht stimmt:** `--zurueck` für **diesen** Schritt (er ändert nur seine Stücke zurück); `EC` und `ED` bleiben.

**Fertig, wenn:** Teil 1 grün ist und Teil 2 belegt im Scratchpad liegt. **Oder: der Auftraggeber hat die Erweiterung gestrichen** — dann steht das in `EF` (Nachtrag in M30.8: „nicht umgesetzt, auf Wunsch“).

## EF — Dokumente nachziehen, Liste für den Auftraggeber (M30)

**Stand: Teil 1 geschrieben** (diese Aufgabe; Code wurde nicht geändert, außer den Kopfkommentaren zweier Skripte). **Teil 2** ist die Liste für den Auftraggeber und offen.

### Teil 1 — Dokumente

**Test:** keiner (Dokumente) — Prüfung ist das Lesen. **Zu ändern:**
1. **`CLAUDE.md`:** unter „Laufende Arbeit“ nach M29 ein Absatz **„Setup-Wahl (M30)“**: Aufgaben `DU`–`EF` in `docs/tasks-m30-setupwahl.md`; die zwei alten Aufbauten sind weg (**Id der Kurzpartie bleibt**, Name `<entschieden>`); Dörfler wählbar (`options.doerfler1`–`doerfler3`, `?opt=doerfler1:Judy`); **`require_marker`** liest den Wert aus der
   Markerlage (`zoneSlotNumberAt`), `none` = 0 nur bei `above`; Zähler am Platz **optional**; Bösewicht-Zähler (falls `EE` geschrieben); `Münzen (gemeinsam)` bleibt als einziger Zähler. **„Stand“** am Ende (geschrieben/offen, mit den Zahlen aus den `Teil 2`).
   Im Absatz **M26** und **M27** je ein Satz: „Seit M30 hat ein Platz keine Zähler mehr; `placeVillager` legt Zähler nur, wo `seat.counters` Stellen nennt“ — **die Beschreibungen dort nicht umschreiben**, nur den Satz anhängen.
2. **`docs/spec-setup-system.md`:** am Ende von M30 ein Abschnitt **„M30 — gebaut, und was die Spec dabei berichtigt“** (Zahlen aus den Läufen; jede Abweichung der gebauten Fassung vom Entwurf, besonders: der gemessene Stand von `npm test`, ob `markerStart`/`zoneSlotNumberAt` an der Stelle stehen, die M30.7 nennt, und was die Rauchtests an der Produktion gesagt haben).
3. **`docs/doerflerdaten.md`:** Abschnitt 7 und 8 je ein **Nachtrag** „Seit M30 ohne Zähler am Platz; die Startwerte stehen im Roster und an den Markern“ — nicht umschreiben, der Befund bleibt als Befund.
4. **Kopf von `scripts/doerfler-daten.mjs` und `scripts/auslagen-daten.mjs`:** **ein** Satz je Datei: „Stand von M26 bzw. M27; **nicht mehr mit `--write` fahren**: der Aufbau trägt seit M30 weder Dörfler-Zähler noch hartverdrahtete Dörfler (`scripts/setupwahl-daten.mjs`); `--check` meldet danach Abweichungen, die von M30 kommen.“ Keine Zeile Code.
5. **`docs/datenzugriff.md`:** unter dem Rezept die Liste der Dateien, die für `setupwahl-daten.mjs` nach `/app/` gehören (`setupwahl-daten.mjs`, `setups-aufraeumen.mjs`, `auslagen-rauchtest.mjs`, dazu die sechs, die der Rauchtest über seine Importe braucht: `auslagen-daten.mjs`, `doerfler-daten.mjs`, `equipment-zones.mjs`, `gelaendekarten-zuordnung.mjs`, `szenariodaten-berichtigung.mjs`, `szenariodaten-grundspiel.mjs`; neun Dateien insgesamt, Nr. 13), und unter „Fallen“ **ein** Satz: der Rauchtest und `--check` von M27/M28/M29 melden nach `EB` Abweichungen an „den übrigen Zeilen“ von `setups`; das ist erwartet.

**Fertig, wenn:** ein Leser, der nur `CLAUDE.md` kennt, `docs/tasks-m30-setupwahl.md` und M30 findet, und in keinem Dokument mehr steht, die Dörfler seien hartverdrahtet oder jeder Dörfler habe vier Zähler, ohne dass M30 danebensteht.

### Teil 2 — Liste für den Auftraggeber (kein Agent)

**Kein Agent.** Der Browser-Bereich ist an `gaming.benjathi.de` nicht angemeldet, und Anmelden ist nicht zulässig. Eine Prüfliste von Hand, **nach** `EC`–`EE`:

1. **Den Tisch neu laden** (ein Tisch, der vor dem Schreiben offen war, hält die alten Szenariodaten im Zustand).
2. **Aufbauliste:** **ein** TFT-Aufbau mit dem neuen Namen; die beiden alten fehlen. Ein altes Lesezeichen lädt nicht — gewollt.
3. **Dialog beim Laden:** **fünf** Felder (Spiellänge, Toller Trödel, Dörfler 1–3). Ohne Änderung bestätigt: Henlo, Fridgette, Granny, wie vorher.
4. **Wahl:** drei andere Dörfler wählen (z. B. Judy, Norman, Quintus): Tableaus, Spielsteine, Startausrüstung, zwölf Marker auf den Startwerten; Georgie wählen → die Meldung „Werte ungeprüft“; **zweimal denselben** wählen → ein leerer Platz und **eine** Zeile in der Meldeliste (M30.4).
5. **Zähler:** unter den Tableaus **keine** Kästen mehr; nur `Münzen (gemeinsam)` (`EE` ist geschrieben: die zwei Bösewicht-Zähler sind weg.)
6. **Dorfphase:** Kampf beginnen, Dorfphase beginnen → ohne Meldung, zwölf Marker wieder auf den Startwerten, Bösewicht-Marker **weg**. **Alle drei Lebensmarker von den Leisten nehmen**, Dorfphase beginnen → **Rückfrage**; „Abbrechen“ räumt nichts ab; „Trotzdem“ räumt ab. **Einen** Marker liegen lassen → keine Rückfrage.
7. **Tauschmenü** (Rechtsklick am Tableau): am unberührten Tisch tauscht es ohne Rückfrage; nach Verschieben des Lebensmarkers fragt es.
8. **Ein alter Spielstand** (benannt gespeichert): lädt, die Dörfler-Zähler stehen noch dort (verwaist, von Hand zu entfernen).
9. **Der Name:** „TFT Aufbau“ ist gesetzt (vom Auftraggeber gewählt; `Townsfolk Tussle` war nur ein Vorschlag). Gefällt er? `setups-aufraeumen.mjs --zurueck` stellt den alten Namen `TFT Kurzpartie (3 Bösewichte, beide Erweiterungen)` wieder her, nicht den Vorschlag; ein anderer Name ist ein `UPDATE` auf `setups.name`.
10. **Rückweg bekannt:** `--zurueck` je Schritt (zuerst `EE`, dann `ED`, dann `EC`, dann `EB` aus der Sicherung), falls etwas nicht stimmt; das Ergebnis dieser Liste geht an den Auftraggeber, nicht an einen Agenten.

**Fertig, wenn:** der Auftraggeber 1–8 abgehakt oder einen Befund genannt hat und 9 beantwortet ist.

## Stand nach DU–EF

**Gebaut und deployt:** `DU`–`DZ` in `b2fc3ab`, `EC` und `ED` (Teil 1) in `98935b6`, `EA` (CI-Deploy zu `b2fc3ab`). Tests 1 686 → **1 883** (Angabe des Bauprotokolls; in `EF` nicht erneut gelaufen).

**Geschrieben (Produktion, je mit Hash und Rückweg):** `EB`, `EC`, `ED`, `EE`. Die Zielzahlen aus M30.9 kamen byteweise heraus; die Schreibprotokolle liegen im Scratchpad (`EB-write.txt` bis `EE-write.txt`).

| Spalte | Ausgang (nach M29) | nach `EC` | nach `ED` | nach `EE` |
|---|---|---|---|---|
| `scenario_data` | 19 106, `914461d63f77` | 21 244, `7e654774e019` | 20 858, `82592d1ac883` | unverändert |
| `sequence_data` | 2 781, `33a42ffe0f71` | 2 780, `a63d57d7ea86` | unverändert | 2 621, `e859bd457002` |
| `action_data` | 6 611, `63abf4174038` | unverändert | 5 937, `526c17f0fdf6` | 5 803, `33033dace238` |

- `setups`: die zwei alten Zeilen (`c0f43ae6…`, `8bc238c0…`) sind gelöscht. Die Kurzpartie heißt **„TFT Aufbau“**, Id `b1e10f4e-b8f2-4c2a-bb3e-54643944121b` unverändert. Es gibt nur noch **einen** TFT-Aufbau.
- Abnahme am Tisch und Rauchtest: Zahlen in `docs/spec-setup-system.md`, „M30 — gebaut“. Rauchtest nach allen drei Schnitten: 0 Beanstandungen.
- **Acht** der 17 Spielstände tragen je zwölf verwaiste Dörfler-Zähler (fünf mit `setup_id`, drei ohne; Nr. 16). Sie bleiben stehen, und der Spieler entfernt sie von Hand.
- **Nicht committet:** `EE` Teil 1 (`scripts/setupwahl-daten.mjs`, `server/test/setupwahl-daten.test.js`). Der Auftraggeber committet und pusht; der Agent hat nichts committet.

**Offen beim Auftraggeber:**

1. Die Sichtprüfung am Tisch (`EF` Teil 2, Punkte 1–8).
2. Der Name „TFT Aufbau“ (`EF` Teil 2, Punkt 9).
3. Die Vorfragen aus `EB` Teil 2 (Name, Lesezeichen auf einen alten Aufbau, offener Setup-Editor): die Antworten stehen in den Unterlagen nicht. Festgehalten ist nur der gewählte Name.
4. Der `--check` aller Skripte (`EB`–`EE`) am Ende des Tages.
5. Der Commit von `EE` Teil 1.

**Offen im Code:** der Kopf von `scripts/setupwahl-daten.mjs` (Nr. 17).
