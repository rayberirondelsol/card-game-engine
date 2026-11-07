# Aufgaben: Auslagen aus den Daten, Schalter beim Start (Spec M27)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M27**. Datengrundlage:
`docs/doerflerdaten.md` (Dörfler), `docs/tft-regeln.md` §1.2 (3-Runden-Modus), §9.1
(Toller Trödel, der Laden), `docs/szenariodaten-erweiterung.md` (welche Bösewichte
Szenariodaten haben). Vorgeschichte: `docs/tasks-doerfler.md` (M26, `CI`–`CN`),
`docs/tasks-dauerstapel.md` (M8.11, die Dauerstapel), M20.1 (`onlyFinal`), M22
(Spielstand).

**Aufgabenbuchstaben.** Mit **`CO`** geht es nach `CN` weiter (`docs/tasks-doerfler.md`).
Geprüft: `CO`–`CZ` sind in keiner `docs/tasks-*.md` vergeben.

**Reihenfolge.** Block A `CO`→`CP`→`CQ`→`CR` (Dörfler aus den Daten); Block B
`CS`→`CT`→`CU`→`CV` (Schalter im Executor und im Editor); Block C `CW`, `CX` (Start
am Tisch, Start im Raum). `CT` braucht `CS`; `CW` und `CX` brauchen `CS` und `CT`.
**Dann ausliefern — Code zuerst, beide Images** — und erst danach `CY` (Daten
schreiben). `CZ` zuletzt. Warum diese Reihenfolge nicht verhandelbar ist: „Wo die
Spec nicht stimmt", 11.

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die ihn
grün macht. Tests: `cd server && npm test` (Stand vorher, 2026-11-07: **1391**, alle
grün — nicht 1362, wie `docs/tasks-doerfler.md` es nach M26 festhielt; seither kamen
Tests dazu). Bau: `cd client && npx vite build` — keine **neue** Warnung (zwei sind
vorbestehend). **Der Client hat keine Testinfrastruktur** (CLAUDE.md): reine Rechnung
gehört nach `shared/` oder `client/src/utils/` und wird aus `server/test/` geprüft;
was nur ein Bauteil zeichnet (Dialog, Lobby-Zeile), bekommt eine **Prüfliste von
Hand**, und die Aufgabe sagt, welche Klicks das sind. Es gibt genau **eine** Stelle
je Sache (M6).

Datenänderungen gegen Spiel `072123c0-cd97-4ffb-a330-369630fab93f`, Aufbau
`b1e10f4e-b8f2-4c2a-bb3e-54643944121b`, nach `docs/datenzugriff.md`: nur die Spalte
lesen und schreiben, die gebraucht wird (hier `sequence_data` und `scenario_data` —
**nie** `zone_data`, `action_data`, `grid_data`, `state_data`), erst Trockenlauf,
dann `db.transaction`, dann Kontrollausgabe, **vorher** eine Sicherung der beiden
Spalten.

---

## Wo die Spec nicht stimmt

Zwölf Stellen. Die ersten sieben ändern den Zuschnitt: 1 macht aus „Daten
definierbar machen" ein **neues Schrittwort**, 2 nimmt die Markerlage aus dem
Auftrag, 3 und 4 entscheiden die Bedingungsfrage, 5 hängt an die lange Partie eine
Datenlücke, 6 und 7 zeigen, dass der „normale" Laden heute **in keinem Aufbau**
vorkommt und dass eine Kategorie auf **drei** Arten gebunden ist.

Die drei Annahmen des Auftrags auf einen Blick:

| Annahme | Urteil |
|---|---|
| 1. Die Hälfte existiert schon; es geht um „Hartverdrahtetes im Setup definierbar machen" | **Teilweise falsch.** Die Daten existieren (Werte, Ausrüstung, Slots) — aber der **Aufbau liest sie nicht**, er trägt sie als Kopie (39 von 65 Schritten). Die Markerlage existiert **nicht** als Dörferdatum. |
| 2. Eine Ladenvariante als Aufbau-Parameter, der `$NACHSCHUB` auflöst, trägt ohne Bedingung | **Trägt für Werte** (Nachschub-Kategorie, Münzen), **nicht für Anwesenheit** (Rollenstapel, Marker, Bösewichte). Und die Regel ist seit M9.3 und M20.1 **schon gebrochen**. |
| 3. Die Regel ist strenger als der Wunsch klingt (ersetzt, nicht ergänzt; Rollenkarten; Ausnahme) | **Stimmt**, aber die Kategorien sind anders, als der Auftrag sie nennt, und der „normale" Laden gibt es heute **nirgends**. |

### 1. M27.1: der Aufbau liest die Dörferdaten nicht — er hat sie noch einmal

Der Auftrag: „Die Hälfte existiert schon … `setups.scenario_data.villagers`." Das
stimmt für die **Daten**. Es stimmt nicht für den **Aufbau**: `sequence_data` der
Kurzpartie trägt dieselben Angaben hartverdrahtet, **39 von 65 Schritten** (0-basiert,
wie `docs/doerflerdaten.md`):

| Schritte | Inhalt |
|---|---|
| 23–25 | drei Spielsteine |
| 26–27, 32–33, 38, 45 | drei Tableaus samt `lock_asset` |
| 28–31, 34–37, 46–49 | zwölf Zähler |
| 39–44 | sechs `place_card` |
| 53–64 | zwölf Leistenmarker |

Gelesen wird der Roster von `swap_villager` (`shared/sequenceExecutor.js`,
`swapVillager`), von `seatVars` (`$V1`, `$F1`) und von
`scripts/doerfler-daten.mjs`. Das Skript tut das **Umgekehrte** dessen, was der
Wunsch will: es schreibt die Schritte der Folge **aus dem Roster um**
(`patchSequence`, `counterSpots`). Ein Dörfler im Roster zu ändern ändert den Aufbau
nicht; heute stimmen beide überein, weil jemand das Skript gelaufen ist.

**Folge für den Zuschnitt:** „im Setup definierbar machen" heißt nicht „Daten
erfinden" und nicht „das Skript verbessern", sondern **den Aufbau den Roster lesen
lassen** — ein Schrittwort (`seat_villager`, `CQ`), das das „Hin" von
`swap_villager` ohne das „Weg" ausführt. Ohne ein neues Schrittwort bleibt die Kopie.

Was dem Platz gehört und nicht dem Dörfler, fehlt in den Daten und kommt in `CO`
hinzu: wohin das Tableau (`300/880/1460, 1600`), wohin die Zähler (die Lebenszähler
auf dem Zusatzbrett bei `360/700/1040, −110`, die übrigen drei aus
`counterSpots()`), welche Leiste die Spielsteine nimmt.

### 2. M27.1: die Lage der Marker gehört dem Platz, nicht dem Dörfler — und es sind drei Layouts

Der Auftrag: „die Markerlagen auf den Wertespalten ebenfalls (zwei Tableau-Layouts A
und B, Spec Zeile 2336–2383)". Dort steht M8.10. **Der Wert** (Feld 3 auf der
Lebensleiste) steht im Roster. **Die Lage** der zehn Felder je Leiste steht in den
**Zonen des Platzes**, nicht beim Dörfler. Gemessen an der Produktion
(`zone_data`, `layout: "slots"`):

| Zone | `anchor.assetId` | `slots[0..3].relX` | Layout |
|---|---|---|---|
| `Dörfler 1: Bewegung` | `98e26309…` (Henlos Tableau) | 0,5885 · 0,4143 · 0,5853 · 0,4143 | Zickzack (A) |
| `Dörfler 2: Bewegung` | `d4691079…` (Fridgettes) | 0,5021 · 0,5021 · 0,5021 · 0,4979 | gerade (B) |
| `Dörfler 3: Bewegung` | `bad13f49…` (Grannys) | wie Platz 1 | Zickzack (A) |

Ein Marker liegt dort, wo die Zone des **Platzes** ihr Feld hat; sitzt Norman (A) an
Platz 2 (B), liegt er bis zu 8 Weltpunkte neben dem Aufdruck. Das ist die offene
Frage aus M26 und **nicht** Teil von M27 (Spec „Bewusst nicht Teil davon"). Zwei
Zusätze: (a) es sind **drei** Layouts (`docs/doerflerdaten.md` 6.3: Georgie ist ein
Foto mit eigener Geometrie), nicht zwei; (b) die Messdateien `leisten.json` und
`varianten.json`, aus denen die Slots stammen, liegen **nicht im Repo** — nur in
einem Kratzverzeichnis, das M8.10 nennt (`grep` über das Repo trifft sie nur als
Erwähnung in `docs/tasks-marker.md` und einem Testkommentar). Die Messung wäre neu zu
machen, wer die Lage je Layout bauen will.

**Folge:** der Wunsch „wo seine Token auf den Stats liegen" wird als **Wert**
erfüllt (Startfeld je Wert, aus dem Roster) — das ist, was „Auslage" hier sinnvoll
meint. Die Lage je Layout ist ein eigener Auftrag mit eigener Messung.

### 3. M27.2: „Keine Bedingungen im Vokabular" ist seit M9.3 nicht mehr wahr

Der Auftrag nennt den Satz (Spec Zeile 1294) eine **bewusste Entwurfsregel**. Die
Spec selbst hat sie zweimal gebaut:

- **M9.3/M19.5** — `require_zone` und `require_counter` halten die **ganze Folge**
  an (`ctx.halted`, `executeSequenceWithLog`).
- **M20.1** — `onlyFinal` an **jedem** Schritt; die Schleife lässt ihn aus, bevor
  er eine Protokollzeile bekommt (`const gate = onlyFinalOf(step?.onlyFinal)`).

Der Satz wurde nicht nachgeführt. M27 **bricht ihn also nicht still**, sondern
schreibt hin, was von ihm gilt (Spec M27.2, „Die Regel ‚keine Bedingungen'": vier
Bedingungen, unter denen eine Bedingung zulässig ist) und setzt eine **Berichtigung**
unter den alten Satz. Eine Wache, die Ernst macht, ist strenger als `onlyFinal`:
`onlyFinal` lässt einen **unverstandenen** Wert den Schritt *laufen* (fail-open, mit
Grund: „ein Schritt, der lautlos ausfällt, weil jemand ‚vielleicht' hingeschrieben
hat"). Für Optionen wäre das falsch — es liefen Kurz- **und** Lang-Aufbau zugleich.
`onlyChoice` ist darum **fail-loud**: unbekannte Option oder Wahl → `failed`-Zeile,
der Schritt läuft nicht (`CT`).

### 4. M27.2: der Platzhalter trägt Werte, nicht Anwesenheit — und nicht „in jedem Namensfeld"

Der Verdacht des Auftrags: Platzhalter gelten in jedem Namensfeld, `category`
ausdrücklich eingeschlossen; eine Variante sei ein Wert in den Daten. Geprüft:

- **`category` und `value` tragen.** `NAME_FIELDS` ist
  `['assetName', 'cardName', 'cell', 'slot', 'category', 'label', 'name', 'value']`;
  `category` darf eine Liste sein, jeder Eintrag wird ersetzt. Damit trägt der
  Nachschub (`["$optNachschub"]`) und die Münzen (`"$optMuenzen"`,
  `normalizeCounter` liest `"45"` als 45).
- **Die Spec sagt mehr, als der Code tut.** „Platzhalter gelten in jedem
  Namensfeld" stimmt nicht: **`pool`, `count`, `stackLabel`, `zoneLabel`,
  `targetZoneLabel`, `targetStackLabel`, `gridLabel`, `message`** stehen nicht in
  der Liste. Für M27 stört das nicht (keines der Felder braucht einen Platzhalter,
  und das Etikett soll gerade **fest** bleiben, 7), aber wer die Bösewichtzahl als
  `count: "$optBoesewichte"` schreibt, bekommt `Number('$optBoesewichte')` → 1, ohne
  Meldung. `validateStep` meldet es **nicht**.
- **Anwesenheit trägt nicht.** Ein Platzhalter liefert Text. Der Rollenstapel, der
  3-Runden-Marker und die Bösewichte (drei benannte oder ein `draw_assets`) sind
  *da* oder *nicht da*. Ungebunden → `skipped: "$x" is not bound` in **jedem** Start
  (der Lärm aus M20.1). Leer gebunden → `category … is empty or unknown`, derselbe
  Lärm unter anderem Namen. Beides macht aus einem gemeldeten Überspringen ein
  beabsichtigtes. Der Weg über Daten-Abschnitte (`final`-Muster) ist dieselbe
  Bedingung, nur verlegt, und zusätzlich ein zweiter Ausführungsweg.
- **Also ein Gate, an sechs Schritten.** Marker, drei benannte Bösewichte,
  `draw_assets` lang, Rollenstapel. Beweis in `CT`: gäbe es keinen Schritt mit Gate,
  bliebe das Protokoll in der Variante „ohne" nie leer.

### 5. M27.2: „lang" hat Bösewichte ohne Kampffeld — 9 von 20

> **ERLEDIGT 2026-11-07 (`9a54155`).** Die neun sind erfasst, `bosses` führt 20 von 20,
> `validateScenarioData` meldet 0 Probleme. Der Befund bleibt stehen, weil er die
> Entscheidung begründet; gebaut wird daraus **nichts** (`CU` entfällt).

Nicht im Auftrag, entscheidend für „lang". Die Kurzpartie nennt **drei Bösewichte beim
Namen**, die langen vier kämen aus `draw_assets pool "Bösewichte"` — dem ganzen Pool
von **20**. `scenario_data.bosses` hat Einträge für **11**: die drei ersten und die
acht aus Neue Nachbarn (`docs/szenariodaten-erweiterung.md`). Es fehlen: Bort Dovis,
Handsy, Lawman Dozy, Penny Pinchetti, Pepin Milkfrog, Qing & Kween, Samuel Strawman,
Umbrello, Will Barlow.

- P(alle vier gezogenen haben Daten) = C(11,4)/C(20,4) = 330/4845 = **6,8 %**.
- In **93 %** der langen Partien kommt mindestens einer ohne Kampffeld;
  `build_scenario` legt nichts und das Protokoll nennt ihn.
- Die Kurzpartie hat das Problem nur, weil ihre drei Bösewichte **zufällig die ersten
  drei erfassten** sind — es ist ein Erfassungsstand, keine Spielwahl.

Das ist die einzige Stelle, an der der Wunsch **teurer** wird, als er klingt: die
**Schrittdifferenz** zwischen kurz und lang ist klein (fünf Schritte, ein Wert), die
**Datendifferenz** ist neun Bösewichte. Der Auftrag `CU` baut den Filter
`draw_assets { needsScenario }` (Weg B in der Spec); die Erfassung der neun ist ein
eigener Auftrag (Weg C) und **nicht** in `CO`–`CZ`.

### 6. M27.2: der „normale" Laden kommt heute in keinem Aufbau vor

Der Auftrag nennt die Kategorien `Nachschub`, `Nachschub (freischaltbar)`,
`Toller Trödel: Nachschub (Nr. 1-30)`, `… (gesperrt, Nr. 31-162)`, `Toller Trödel:
Rollen` „…". Geprüft gegen die Produktion (`categories` ⨝ `cards`):

| Kategorie | Karten |
|---|---|
| `Nachschub` | 177 |
| `Nachschub (freischaltbar)` | 24 |
| `Toller Trödel: Nachschub (Nr. 1-30)` | 30 |
| `Toller Trödel: Nachschub (gesperrt, Nr. 31-162)` | **109** (nicht 132; 24 stehen in `Aufstellbares`, 4 in `Geld`) |
| `Toller Trödel: Aufstellbares` | 24 (und **24 Assets** gleichen Kategorienamens in `table_assets`) |
| `Toller Trödel: Geld (Nr. 163-166)` | 4 |
| `Toller Trödel: Rollen` | 20, 825 × 1424 (Hochformat; die Nachschubkarten sind 744 × 744) |
| `Ausrüstung (Hookbox)` + `Startausrüstung (Hookbox)` | 12 + 4 — das sind die **16 freischaltbaren Karten aus Neue Nachbarn** (`docs/tft-regeln.md` §10.6: Herr Hottehü, Angelhakenanzug …) |

**Der Aufbau fasst drei an**: `Nachschub`, `Nr. 1-30`, `Rollen`. Alle anderen setzen
einen Fortschritt voraus (M4 steht aus). **Und:** beide Aufbauten mit einem Laden —
Kurzpartie **und** Grundaufbau — bauen heute **nur** Toller Trödel (`Nr. 1-30`, Etikett
`Nachschub (Tante Emma)`). Die 177 Karten von `Nachschub` sind in **keinem** Aufbau
verdrahtet. Der „normale" Laden ist also **neu**, nicht nur parametrisiert — und wird
im Test (`CT`) und im Rauchtest (`CY`) gegen die echte Bibliothek geprüft, nicht gegen
eine Annahme. Die Ausnahme `[TT S.4]` (freigeschaltete Karten dürfen untergemischt
werden) ist Fortschritt und kein Aufbau: sie gilt in **beiden** Varianten gleich und
wird, wenn überhaupt, eine **Aktion**, die die Wahl nicht kennen muss.

`place_stack` vergleicht Namen **exakt**: `Nachschub` zieht die 24 von `Nachschub
(freischaltbar)` **nicht** mit. (Eine Teilzeichenfolgensuche täte es — der Test in
`CT` hält es fest.)

### 7. Eine Kategorie wird auf **drei** Arten gebunden — und die dritte ist das Etikett

`docs/datenzugriff.md` kennt zwei: Name (`place_stack.category`) und Karten
(`card_ids` in `state_data`). Es gibt eine **dritte**: das **Etikett**
`Nachschub (Tante Emma)` in `stackLabel` von drei Schritten der Aktionen
(`kampf-beginnen` 1, `laden-nachfuellen` 0, `dorfphase-beginnen` 32) **und im
Zustand jedes gespeicherten Spiels**. Folgen:

- Der Stapel heißt in **beiden** Varianten gleich. „Nachschub (Grundspiel)" ist eine
  naheliegende Umbenennung und bricht alle Aktionen.
- `state_data` der Kurzpartie **und** des Grundaufbaus trägt den Stapel mit den 30
  Toller-Trödel-Karten. In der Kurzpartie räumt ihn `remove_stack` (Schritt 4) vor
  dem `place_stack` (Schritt 5) ab — **harmlos**. Der **Grundaufbau** hat kein
  `place_stack`: sein `card_ids` ist die **einzige** Bindung und lässt sich nicht
  umschalten. Wer „lang" als Kopie des Grundaufbaus baut, hat Toller Trödel
  festgenagelt (siehe 8).
- Der **Rollenstapel** ist neu: kein Stapel in `state_data`, also **kein**
  `remove_stack` davor — der träfe nichts und erzeugte `skipped` in jedem Start.

### 8. M27.4: der Grundaufbau ist nicht „lang"

Der Auftrag fragt, ob die anderen Aufbauten zusammengelegt werden müssen. Nein, und
„lang" ist **nicht** der Grundaufbau: er ist laut M14.12 ein **Baustein** (11 von 30
Zonen, `scenario_data` leer, keine `base`-Werte, kein Kampfmaterial, keine
M26-Zonen). **„Lang" ist die Kurzpartie ohne fünf Schritte.** Beide anderen Aufbauten
bleiben unangetastet nebeneinander bestehen; löschen ist keine Aufgabe von M27.

Ebenso: **„Kurzpartie" ist der offizielle 3-Runden-Modus** (`[DE S.34]`, 45 Münzen =
30 solo + 3 × 5), kein Hausentwurf; die lange Partie hat 30 und kein Plättchen.

### 9. M27.4: die Spielstände — fünf von acht verweisen auf den Aufbau

`save_states.setup_id` zeigt bei **fünf** von acht Zeilen auf `b1e10f4e…`: *Auto Save*
(heute früh geschrieben, 08:29), *Partie 14 – Sieg gegen Virginia Fitz*, *Partie 13 –
Endkampf, Ziehstapel leer + neu gemischt*, *Partie 13 – Kampf 1 Ende (M22-Probe)*,
*M22-Probe Neuladen*; drei haben `NULL`. **Ein Spielstand lädt vom Aufbau nur das
Gerüst** (Zonen, Raster, Aktionen, Szenariodaten — `applySetupScaffold`), **nie** die
Folge (M22). Zwei Folgen, die der Auftrag nicht nennt:

- Eine Schalterwahl **hinterlässt nichts im Gerüst**, also kann ein Spielstand sie
  nicht kennen. **Aktionen dürfen sie nicht lesen** (`validateStep` meldet
  `onlyChoice`/`$opt…` in einer Aktion). Sonst liefen sie nach jedem Neuladen mit
  einer Wahl, die niemand mehr hat.
- Was *Partie 14* heil hält, ist **nicht** „der Aufbau bleibt gleich", sondern:
  **`zone_data` und `action_data` bleiben bytegleich**, `scenario_data` bekommt nur
  Schlüssel **dazu**, die Zeile behält ihre Id. Das ist eine Prüfsumme, kein Vorsatz
  (`CY`).

### 10. `scripts/doerfler-daten.mjs --write` zerstört nach M27 die neue Platzgeometrie

Eine Falle, die sich erst beim **zweiten** Lauf zeigt: `patchScenario` schreibt
`{ ...base, villagers: VILLAGERS }` — es **ersetzt** den ganzen Abschnitt `villagers`
durch die Konstante des Skripts. Hat die Datenbank nach `CY` zusätzliche Schlüssel
(`barZone`, `seats[].tableau`, `seats[].counters`) und jemand ruft das alte Skript
noch einmal, sind sie **still weg** (das Skript prüft nur, dass fremde Schlüssel
neben `villagers` unverändert bleiben). Der Test in `doerfler-daten.test.js` fände es
nicht. Darum zieht die Konstante in `CO` **vor** jedem Schreiben um: `VILLAGERS`
trägt die neuen Schlüssel, und ein Test hält fest, dass `patchScenario` sie nicht
verliert. `patchSequence`/`counterSpots`/`COUNTER_ROW` fallen in `CZ`, **nachdem** die
Daten geschrieben sind (die Schranken des Skripts: „es darf kein Schritt dazukommen",
„höchstens 13 ersetzte Schritte" passen auf die neue Folge nicht mehr).

### 11. Die Reihenfolge beim Ausliefern

Die neuen Daten nennen ein Schrittwort (`seat_villager`) und ein Feld (`onlyChoice`),
die der **heutige** Executor nicht kennt. Er antwortet `unknown step type
"seat_villager"` — dreimal `skipped`, der Tisch steht ohne Dörfler da, und
`executeSequence` wirft nie. Der Executor läuft an **zwei** Orten: im Backend-Image
(Räume) und im **Client-Bundle** (Tisch, `GameTable.jsx` importiert
`../../../shared/sequenceExecutor.js`); beide Images bauen aus dem Wurzelkontext.
**Erst beide Images neu, dann `CY`.** Umgekehrt ist neuer Code mit alten Daten
harmlos: ohne `options` gibt es keine Platzhalter und keine Gates.

### 12. Kleinere Abweichungen

- **„Alle drei Aufrufstellen ziehen mit"** (Spec, M3b: Aufbau am Tisch, Aktion am
  Tisch, Raumstart). Für die **Wahl** laufen nur **zwei** davon durch die Folge:
  `GameTable.jsx` (Aufbau am Tisch) und `server/src/routes/rooms.js` (Raumstart). Die
  Aktion am Tisch ruft den Executor ohne Wahl (und darf sie nicht lesen, 9). Der
  Sequenz-Editor führt den Executor **nicht** aus.
- **Die Wahl fällt im Raum beim Anlegen, nicht beim Start.** `POST
  /api/rooms/:code/start` kennt nur `player_id`; das Setup wird in `POST /api/rooms`
  gesetzt (`setup_id`, `game_rooms.setup_id`). Wer die Wahl in den Start legt,
  überrascht die Mitspieler, die in der Lobby nicht sehen, womit gespielt wird.
- **Die Tabelle heißt `game_rooms`**, nicht `rooms` (`server/src/database.js`).
- **Schrittzahlen:** die Folge hat 65 Schritte; nach `CQ` 29 (−39 +3), nach `CY` 31.
  Acht ändern sich (zwei mit Platzhalter, sechs mit Gate), 23 laufen in jeder
  Variante gleich. „Fünf Schritte und ein Wert" ist der Unterschied **kurz/lang**, und
  der Rollenstapel kommt von der anderen Option.
- **Georgie Irongut ist ein drittes Layout**, nicht nur ein ungeprüfter Datensatz
  (2). `seat_villager` für Georgie meldet seinen `unverified`-Satz weiterhin als
  `note`.
- **Die Aufbauanweisung auf dem Tableau von Karla Kühl** (= Fridgette Jones,
  `[NN S.4]`) ist nicht erfasst (`docs/tft-regeln.md` §10.1 „OFFEN"). Die Auslage, die
  M27 aus den Daten baut, ist für Fridgette also vollständig im Sinne der Daten und
  unvollständig im Sinne der Regel. Das ist **keine** Aufgabe hier; es steht hier, weil
  es sonst niemand ahnt.

---

## Entscheidungen

Entschieden durch den Auftraggeber (2026-11-07): **ein Aufbau mit zwei Schaltern**
(Spiellänge, Toller Trödel), **Neue Nachbarn fest**, die Wahl **beim Start**. Der
Rest ist hier begründet; nur **eine** Frage bleibt offen (6).

**1. `options` steht in `scenario_data`, nicht in einer neuen Spalte.** `GET
/api/games/:id/setups` liefert die ganze Zeile, `GameDetail` kennt die Optionen also
ohne neue Route; der Editor schreibt `scenario_data` als ganzes Objekt zurück
(unbekannte Schlüssel bleiben); keine Migration. Der Preis: `scenario_data` wird von
mehreren Aufträgen angefasst (M7, M26, jetzt M27) — darum schreibt `CY` nur
**Schlüssel dazu** und prüft, dass `bosses` unverändert bleibt.

**2. Die Wahl im Raum liegt in `game_rooms.setup_choices`**, gesetzt beim Anlegen.
Verworfen: im Start-Body (die Mitspieler sähen sie nicht; und der Body vertraut schon
`player_id`), in der URL des Raums (Räume haben keine).

**3. `seat_villager` als Schritt in der Folge, nicht als Liste `lineup` in den
Daten.** Die Besetzung steht damit dort, wo `swap_villager` schon steht, im Editor
sichtbar und änderbar, und im selben Vokabular. Verworfen: `lineup: [...]` in
`villagers` — ein zweiter Ort für „wer sitzt wo", den der Tisch (`seatedVillagers`,
liest das Tableau-Token) wieder beantworten müsste (M22).

**4. Das Etikett `Nachschub (Tante Emma)` bleibt für beide Varianten** (7).

**5. Die drei benannten Bösewichte der Kurzpartie bleiben.** Zufällig ziehen wäre ein
Verhaltenswechsel des heutigen Aufbaus (Standard-Wahl = heutiges Verhalten, das ist die
Zusage an Lesezeichen und Spielstände), und erst mit allen 20 Einträgen sinnvoll.

**6. ENTSCHIEDEN (2026-11-07): Weg C — die neun sind erfasst.** Der Auftraggeber hat
nicht den Filter gewählt, sondern die Ursache beseitigen lassen. `scenario_data.bosses`
führt jetzt **20 von 20** (`9a54155`, `docs/szenariodaten-grundspiel.md`),
`validateScenarioData` meldet 0 Probleme. Folgen für diese Liste:
**`CU` entfällt** — `needsScenario` wäre ein Filter, der nichts mehr aussiebt; **`CY`
trägt keinen Filter**; `draw_assets pool "Bösewichte" count 4` zieht aus allen zwanzig.
Befund (5) ist damit erledigt.

**7. Der Name des Aufbaus.** „TFT Kurzpartie (3 Bösewichte, beide Erweiterungen)" stimmt
nach der Wahl „lang" nicht mehr. Vorschlag „TFT Solo (3 Dörfler)"; Umbenennen ist
unschädlich (Spielstände verweisen per Id), aber eine Entscheidung des Auftraggebers,
und `CY` rührt den Namen **nicht** an.

---

## CO — Die Platzdaten und `VILLAGERS` (M27.1)

**Befund.** Wohin das Tableau, wohin die Zähler, welche Leiste die Spielsteine
nimmt, steht nur in 18 hartverdrahteten Schritten (drei Tableaus, zwölf Zähler, drei Spielsteine) (Wo die Spec nicht stimmt, 1).
`patchScenario` überschreibt `villagers` als Ganzes (10).

**Test zuerst** (`server/test/villagers.test.js`, `server/test/doerfler-daten.test.js`):
- `validateVillagers`: ein Platz ohne `tableau` → „seat 1: no tableau position"; ohne
  `counters` oder mit weniger als vier Werten → je Wert eine Meldung; ohne `barZone`
  → „no barZone"; `barZone` nennt eine Zone, die es nicht gibt → Meldung.
- Koordinaten sind endlich: `NaN`, leere Zeichenkette, `null` → Meldung (dieselbe
  Regel wie bei `place_counter`: leer ist keine 0).
- `patchScenario(scenario)` verliert die neuen Schlüssel **nicht**, wenn sie schon
  dastehen, und das Ergebnis ist bei einem zweiten Lauf gleich (idempotent).

**Änderung.** `shared/villagers.js`: die drei Prüfungen. `scripts/doerfler-daten.mjs`:
`VILLAGERS` trägt `barZone: "Buyin'/Beatin'-Leiste"` und je Platz `tableau`,
`counters` — die **heutigen Zahlen** aus den Schritten (Tableaus `300/880/1460, 1600`;
`counterSpots()` für Bewegung/Mumm/Präzision; Leben `360/700/1040, −110`), abgeleitet
aus der bestehenden Rechnung, **nicht neu abgetippt**. Nichts wird in die Datenbank
geschrieben.

**Fertig, wenn** `npm test` grün ist und `node scripts/doerfler-daten.mjs --json` die
neuen Schlüssel zeigt.

## CP — `swapVillager` zerlegen: „Hin" und „Weg" (M27.1)

**Befund.** Alles, was `seat_villager` braucht, steht im „hin"-Teil von
`swapVillager` (`shared/sequenceExecutor.js`): Tableau mit `anchorId`, Spielstein,
Zähler, Marker, Startausrüstung samt Vorrat-Rückfall. Eine Kopie wäre die Regel aus M6
verletzt.

**Test zuerst.** Keiner neu — **das Sicherheitsnetz ist da**: `swap-villager.test.js`
(8) und `villagers.test.js` (36) laufen **vor** dem Umbau grün und **nach** ihm
unverändert. Das ist die Aufgabe: ein Refactor ohne neues Verhalten.

**Änderung.** Eine Funktion `placeVillager(work, seatNo, villager, spots, ctx)` mit
dem „Hin"; `swapVillager` ruft sie mit den Stellen der **alten** Objekte auf
(`oldTableau.x/y`, `c.x/c.y`, `stones[0]`). Nichts sonst ändert sich — kein neuer
Schrittname, keine neue Meldung.

**Fertig, wenn** die 44 Tests ohne Änderung an ihnen grün sind und `git diff` an
`swapVillager` nur Verschieben zeigt. Eigener Commit.

## CQ — `seat_villager { seat, villager }` (M27.1)

**Test zuerst** (`server/test/sequence-villager-steps.test.js`):
- Leerer Tisch → `seat_villager 1 "Henlo Bulwark"`: Tableau mit `anchorId` = Id des
  Platz-Assets, Spielstein auf der `barZone`, vier Zähler (`Leben` mit `max`, die drei
  anderen mit `base`), vier Marker auf ihrem Startfeld, Startausrüstung in den Slots.
- Belegter Platz → `skipped`, Grund nennt `swap_villager`, Zustand unberührt.
  Doppelter Dörfler → `skipped`. Platz ohne Geometrie (CO) → `skipped`, **nichts**
  halb gestellt.
- Judy an Platz 1: drei Gemälde im Vorrat, kein Slot-Konflikt (`note`, wo etwas in den
  Vorrat musste); Georgie: `note` mit `unverified`.
- Danach bindet `ctx.seatVars` neu: ein folgender Schritt `place_asset "$F1"` findet
  den Dörfler.
- **Gleichwertigkeit.** Die alte Folge aus `fixtures/doerfler-kurzpartie.json`
  (`sequenceBefore`, 39 Dörfler-Schritte) und drei `seat_villager` bauen **denselben
  Tisch** — verglichen ohne die zufälligen Ids (`id`, `tableId`, `stackId`),
  Objekte nach (`assetId`/`cardId`, `x`, `y`) sortiert, `locked` und `anchorId`
  eingeschlossen. Dieser Test ist die Abnahme 1 aus M27.1.
- `validateStep` (`server/test/sequence-steps.test.js`): Platz ist eine ganze Zahl ab
  1, Dörfler nicht leer — dieselben zwei Regeln wie bei `swap_villager`.

**Änderung.** `case 'seat_villager'` im Executor, derselbe Weg wie `swap_villager`
(Zustand zurückgeben oder `skip`/`fail`, `note` bei Hinweisen); Eintrag in
`STEP_TYPES`, `stepFields`, `describeStep` und `validateStep` in
`client/src/utils/sequenceSteps.js`.

**Fertig, wenn** der Gleichwertigkeitstest grün ist und der Editor den Schritt
zeichnet (Prüfliste von Hand: Schritt hinzufügen, Platz 1, Dörfler eintippen, die
Zeile sagt „Seat Henlo Bulwark at seat 1" oder Entsprechendes).

## CR — Die Testhilfe baut über `seat_villager` (M27.1)

**Befund.** `server/test/villager-table.js` ruft `patchSequence(fx.sequenceBefore)`
(39 hartverdrahtete Schritte); `villagers.test.js` und `swap-villager.test.js` hängen
daran. Das Skript, das die Schritte umschreibt, wird in `CZ` entfernt.

**Test zuerst.** Die 44 Tests bleiben unverändert und grün, **nachdem** `build()` auf
den neuen Weg umgestellt ist.

**Änderung.** `build()` baut aus `fixtures/doerfler-kurzpartie.json` die Folge **ohne**
die 39 Schritte und mit drei `seat_villager`; die alte Folge bleibt in der Fixture als
`sequenceHardwired`, **nur** für den Gleichwertigkeitstest aus `CQ`. `scenarioData`
kommt aus `VILLAGERS` (CO).

**Fertig, wenn** `npm test` grün ist, ohne dass ein Test der 44 angefasst wurde.

## CS — Optionen: eine Stelle für die Regel, `shared/setupOptions.js` (M27.3)

**Test zuerst** (`server/test/setup-options.test.js`, Modul gibt es noch nicht):
- `resolveChoices(options, given)`: nichts gegeben → alle `default`s; teilweise
  gegeben → der Rest bekommt `default`; **unbekannte Option**, **unbekannte Wahl**,
  Wert kein Text → `problems`, nicht stillschweigend `default`.
- Ein Setup **ohne** `options`: `{ choices: {}, vars: {}, problems: [] }`; wird trotzdem
  eine Wahl gegeben → `problems` („setup has no option x"), damit ein Tippfehler in
  der Adresse nicht still durchgeht.
- `vars` kommt als `{ optMuenzen: "45", optNachschub: "…" }`.
- `validateOptions(options, sequence, actions)`: `default` ist keine der `choices`;
  Name in `vars` beginnt mit `V<Ziffer>`/`F<Ziffer>`/`revealed`, enthält `ü` oder
  Leerzeichen; ein Schritt der Folge mit `onlyChoice` nennt eine Option oder Wahl, die
  es nicht gibt; ein Schritt **einer Aktion** trägt `onlyChoice` oder `$opt…` — jede
  Meldung nennt Option/Wahl und Schritt.

**Änderung.** `shared/setupOptions.js` mit `resolveChoices`, `validateOptions`,
`describeChoices(options, choices)` (die Bezeichnungen für die Meldung nach dem Laden:
„Kurz, mit Toller Trödel"). Rein, ohne Imports aus Client oder Server.

**Fertig, wenn** die Tests grün sind. Noch nichts ruft das Modul auf.

## CT — Der Executor kennt Wahl, Platzhalter und Gate (M27.2)

**Test zuerst** (`server/test/sequence-options.test.js`, kleine Bibliothek im Test,
keine Produktionsdaten):
- **Wert:** `place_stack { category: ["$optNachschub"] }` mit `choices: {troedel: "ohne"}`
  legt den Stapel aus `Nachschub`, mit `"mit"` aus `Toller Trödel: Nachschub (Nr. 1-30)`;
  eine dritte Kategorie `Nachschub (freischaltbar)` mit **Teilnamen-Treffer** bleibt
  draußen (exakter Vergleich). `place_counter { value: "$optMuenzen" }` → Zähler 45 bzw.
  30 (Zahl, nicht Text).
- **Gate:** ein Schritt mit `onlyChoice: { partie: "kurz" }` läuft bei `kurz` und
  bekommt bei `lang` **keine Protokollzeile**; UND über mehrere Optionen; Werteliste
  (`["kurz","lang"]`) trifft beide.
- **Fail-loud:** `onlyChoice` mit unbekannter Option oder Wahl → `failed`-Zeile, der
  Schritt läuft **nicht**. Ungültige `choices` im Aufruf → **nichts** wird gebaut:
  Zustand wie hineingegeben, eine Zeile `failed` (`index: -1`, wie beim kaputten
  JSON), `executeSequence` wirft nicht.
- **`reveal_next` löscht die Wahl nicht:** eine Folge mit `reveal_next` zwischen zwei
  Schritten mit `$optNachschub` — beide sehen den Wert (`optionVars` steht **neben**
  `vars`, wie `seatVars`).
- **Aktion ohne Wahl:** ein Schritt mit `$optNachschub` in einer Aktion (Aufruf **ohne**
  `choices`) → `skipped: "$optNachschub" is not bound`, laut, nicht still.
- **`onlyFinal` unverändert:** alle Tests in `sequence-only-final.test.js` bleiben
  unangefasst grün.
- **Mit Toller Trödel kein Rollen-`skipped`:** vier Kombinationen auf einer Mini-Folge
  mit allen sechs Gates → Protokoll leer außer erwarteten `note`s.

**Änderung.** `options.choices` in `executeSequenceWithLog` (aufgelöst über
`resolveChoices` aus `CS`, die letzte Wache); `ctx.optionVars` als **dritte**
Bindungsquelle in der Platzhalterschleife von `applyStep`
(`ctx.vars[x] ?? ctx.seatVars?.[x] ?? ctx.optionVars?.[x]`); die Wache in der
Schleife wird **eine** Funktion `stepApplies(step, ctx)`, die `onlyFinal` (unverändert,
fail-open) und `onlyChoice` (fail-loud) beantwortet. Rückgabe der Funktion um
`choices` erweitert, damit die Meldung nach dem Laden die Bezeichnungen nennen kann.

**Fertig, wenn** alle Tests grün sind, `sequence-only-final.test.js` **unverändert** ist
und `git diff` an `applyStep` nur die eine Bindungszeile zeigt.

## CU — ENTFÄLLT: `draw_assets { needsScenario }` (M27.2)

> **Nicht bauen.** Weg C ist gegangen (Entscheidung 6): alle 20 Bösewichte haben
> Szenariodaten, der Filter wäre wirkungslos. Die Aufgabe bleibt als Begründung stehen.
>
> <details><summary>ursprünglicher Text</summary>

**Befund.** Spec, „Offene Frage". `draw_assets` filtert den Pool heute nur über die
Kategorie.

**Test zuerst** (`server/test/sequence-draw-needs-scenario.test.js`):
- Pool aus 20 Assets `Bösewicht: …`, `scenarioData.bosses` mit 11 Einträgen, `count: 4`,
  `needsScenario: true`: über 200 Ziehungen (mit festem `rng`) kommt **nie** einer ohne
  Eintrag; ohne das Feld bleibt das Verhalten byte-gleich wie heute.
- Der Abgleich läuft über `baseName` (`"Bösewicht: Patches"` → `Patches`) gegen die
  Schlüssel, ohne Beachtung von Groß-/Kleinschreibung.
- Weniger Treffer als `count`: das bestehende „holds only n of m" **plus** der Grund
  („only bosses with scenario data"). Kein Treffer: `skipped` mit Grund.
- Sind **alle** 20 erfasst, ist das Ergebnis dasselbe wie ohne Filter (No-op).
- Editor: `validateStep` kennt das Feld (Wahrheitswert), `describeStep` nennt es.

**Änderung.** Ein Feld im Schritt, ein Filter vor dem Ziehen in `case 'draw_assets'`
(`shared/sequenceExecutor.js`), Eintrag in `STEP_TYPES`/`validateStep`.

**Fertig, wenn** die Tests grün sind. Die Zahlen 6,8 % und 93 % (Wo die Spec nicht
stimmt, 5) stehen als Kommentar im Test, damit sie nachgerechnet werden können.

</details>

## CV — Der Editor zeichnet und prüft das Gate (M27.2)

**Test zuerst** (`server/test/sequence-steps.test.js`):
- `describeStep` hängt ein Gate hinten an („· only with partie=kurz"), und zwar **nur**
  an Schritten, die eines tragen; `onlyFinal` und `onlyChoice` zugleich ergeben beide
  Nachsätze.
- `validateStep(step, ctx)` meldet: `onlyChoice` kein Objekt; Option/Wahl unbekannt
  (mit `ctx.options`); **der Schritt steht in einer Aktion** (`ctx.inAction`) →
  Meldung, Begründung: Spielstände kennen die Wahl nicht; `$opt…` in einer Aktion.
- Ein Platzhalter `$opt…` in `category`/`value` besteht die Prüfung („Kategorie
  unbekannt" wird für Platzhalter schon heute nicht gemeldet, `hasPlaceholder`);
  `place_counter { value: "$optMuenzen" }` wird **nicht** als unlesbare Zahl
  gemeldet.

**Änderung.** `client/src/utils/sequenceSteps.js` (beide Funktionen); die Zeile in der
Schrittmaske, wo `onlyFinal` gezeichnet wird (**dieselbe Stelle**, keine zweite;
`GameTable.jsx`/Editor — dort suchen, nicht raten).

**Prüfliste von Hand** (keine Testinfrastruktur): Setup im Editor öffnen, an einem
Schritt `onlyChoice` setzen, speichern, neu öffnen → das Gate steht noch da;
**anderes Feld desselben Schritts ändern, speichern → das Gate ist nicht verschwunden**
(das ist der Fehler, der still wäre); Setup mit `options` im Editor speichern →
`scenario_data.options` ist danach unverändert (Ganz-Objekt-Roundtrip).

**Fertig, wenn** die Tests grün sind und die vier Punkte der Prüfliste stimmen.

## CW — Der Start am Tisch (M27.3)

**Test zuerst** (`server/test/setup-choices.test.js`, Modul `client/src/utils/setupChoices.js`):
- `parseChoices(['partie:lang','troedel:ohne'])` → `{ partie: 'lang', troedel: 'ohne' }`;
  ohne Einträge `{}`; Eintrag ohne `:`, mit leerem Teil, doppelte Option → Problem,
  **nicht** Default.
- `formatChoices(choices)` → die Parameterliste; Hin- und Rückweg ergeben dasselbe.
- `resolveTableSource` (M22) bleibt unverändert: `opt` ist kein Quellenparameter.

**Änderung.** Der Knopf „Load" in `GameDetail.jsx` (Zeile `setup-load-btn`): hat das
Setup `scenario_data.options`, öffnet er einen kleinen Dialog (neue Komponente, je
Option eine Auswahl, `default` vorbelegt, „Starten" navigiert zu
`/games/:id/play?setupId=…&opt=…`); sonst wie bisher. `GameTable.jsx`
(Aufbau-Zweig, `source.kind === 'setup'`): `choices` aus der Adresse
(`searchParams.getAll('opt')` → `parseChoices`), an `executeSequenceWithLog` über die
`options`; bei Problem eine Meldung statt eines Aufbaus mit Defaults; die Meldung nach
dem Laden nennt die Wahl (`describeChoices`).

**Prüfliste von Hand:** (1) „Load" auf der Kurzpartie öffnet den Dialog, Defaults
„Kurz" und „mit Toller Trödel"; (2) „Lang" + „ohne" starten → 177 Karten im Stapel
`Nachschub (Tante Emma)`, kein Marker auf dem ersten Platz der Bösewicht-Leiste, vier
verdeckte Bösewichte, 30 Münzen; (3) dieselbe Adresse neu laden → derselbe Aufbau;
(4) `/play?setupId=…` ohne `opt` → die heutige Kurzpartie; (5) `opt=partie:xxx` → keine
Aufbauten, eine Meldung; (6) Grundaufbau und Basis-Aufbau: **kein** Dialog, Verhalten
wie vorher.

**Fertig, wenn** die Tests grün sind, der Bau keine neue Warnung zeigt und die sechs
Punkte stimmen.

## CX — Der Start im Raum (M27.3)

**Befund.** Ein Raum, der die Wahl nicht trägt, baut **stumm die Standardvariante**
(Auftrag). `POST /api/rooms` setzt das Setup (`setup_id`, `game_rooms`), `POST
/api/rooms/:code/start` führt die Folge aus und kennt nur `player_id`.

**Test zuerst** (`server/test/room-start-sequence.test.js`-Muster, App über
`buildApp()` und `app.inject()`):
- Raum mit `setup_choices: { partie: 'lang', troedel: 'ohne' }` anlegen, starten → im
  `boardState` liegt der Stapel `Nachschub (Tante Emma)` mit **den** Karten von
  `Nachschub`, **kein** Stapel `Rollen`, kein Marker, 30 Münzen.
- **Parität:** derselbe Executor mit denselben Eingaben (`choices`) **am Tisch**
  (direkter Aufruf wie `GameTable.jsx`) und **im Raum** (HTTP) ergeben dieselben
  Stapel und Objekte (ohne Ids).
- Raum **ohne** `setup_choices` → Defaults (die heutige Kurzpartie).
- Unbekannte Wahl beim Anlegen → **400**, deutsche Meldung, **kein** Raum angelegt.
- Raum für ein Setup **ohne** `options` → wie vorher; wird dennoch eine Wahl gegeben →
  400.
- `GET /api/rooms/:code` liefert `setup_choices` mit.

**Änderung.** `server/src/database.js`: additive Migration `game_rooms.setup_choices
TEXT` nach dem Muster von `setup_id`; `server/src/routes/rooms.js`: `POST /api/rooms`
nimmt und prüft (`resolveChoices`), `start` liest die gespeicherte Wahl und gibt sie als
`choices` in die `options`; `CreateRoomModal.jsx`: dieselben Auswahlfelder unter der
Setup-Auswahl (das Modal bekommt die vollen Setup-Zeilen als Prop `setups`, die
Optionen sind also schon da); die Lobby (`RoomLobby.jsx`) zeigt die Wahl.

**Prüfliste von Hand:** Raum mit Lang/ohne anlegen, zweiter Spieler tritt bei und sieht
die Wahl in der Lobby, Start → derselbe Aufbau wie am Tisch.

**Fertig, wenn** die Tests grün sind und die Prüfliste stimmt.

## Ausliefern (zwischen `CX` und `CY`)

`cd /opt/card-game-engine && git reset --hard origin/master && docker compose up -d
--build` — **beide** Container (`CLAUDE.md`, „Deployment"); der Client-Bundle trägt
den Executor (11). Kontrolle: nach dem Bau ein Setup **ohne** neue Daten laden — die
Kurzpartie muss **unverändert** wie vorher aufbauen (neuer Code, alte Daten:
harmlos). Erst dann `CY`.

## CY — Die Daten schreiben (M27.1, M27.2)

**Befund.** Spec M27.1–M27.2. Geschrieben werden **zwei Spalten**: `sequence_data` und
`scenario_data`.

**Skript** `scripts/auslagen-daten.mjs` — Form wie `scripts/doerfler-daten.mjs`
(`--json`, `--check <db>`, `--write <db>`); die Zahlen stehen **einmal** (M6), Skript
und Test lesen dieselben.

**Test zuerst** (`server/test/auslagen-daten.test.js`, Fixture-Auszug der Produktion
statt Netz, wie M26):
- Aus der heutigen Folge (65) werden 31: **39 raus, 3 `seat_villager` rein** an der
  Stelle des Schritts 23; Schritt 5 trägt `category: ["$optNachschub"]`, Schritt 50
  `value: "$optMuenzen"`; sechs Schritte tragen `onlyChoice` (Marker, drei Bösewichte,
  `draw_assets` lang **mit** `needsScenario: true` bei Weg B, `place_stack` Rollen); der
  Rest der Schritte ist **Zeichen für Zeichen** wie vorher.
- `scenario_data`: nur Schlüssel **dazu** (`options`, `villagers.barZone`,
  `seats[].tableau/counters`); **`bosses` ist byte-gleich**; die übrigen Schlüssel
  (`gridLabel`, `cardZoneLabel`) ebenso.
- `validateOptions` und `validateVillagers` melden **0 Probleme** gegen die echte
  Assetliste, Kartenbibliothek und die Zonen der Datenbank.
- **Vier Kombinationen** laufen mit dem Executor aus dem Repo gegen die Auszüge:
  Protokoll **leer** (nur erwartete `note`s); kurz/mit baut **denselben Tisch** wie die
  alte Folge (Gleichwertigkeit aus `CQ`).
- Ein zweiter Lauf findet nichts mehr zu tun.

**Zu messen, bevor geschrieben wird** (und nicht zu raten): **wohin der Rollenstapel
kommt.** Die drei Dauerstapel stehen auf `x 1780`, `y 200/420/640`; der Nachschub liegt
unten. Eine Rollenkarte ist 825 × 1424 (Hochformat), die Nachschubkarten 744 × 744.
Gesucht: die Stelle **neben** dem Nachschubstapel, an der ein Stapel in der Größe der
Rollenkarten **nichts überlappt** (Zonen, Bretter, Münzzähler bei `2080, 1430`) und
bei Spielzoom erreichbar bleibt. Ergebnis mit den gemessenen Maßen in die Aufgabe
schreiben. Die Rollen liegen **offen** und **ungemischt** (`[TT S.6]`: „aus dem Stapel
heraus", „zurück auf den Stapel"), im Tisch über das Durchblättern des Stapels
(`browseStackId`) zu nehmen.

**Ablauf** (`docs/datenzugriff.md`, Regeln 1–4): Sicherung von `sequence_data` und
`scenario_data` → `--check` (Trockenlauf, Ausgabe gegen die Erwartung gelesen) →
`--write` (`db.transaction`) → Kontrollausgabe, **neu gelesen**. Die Schranken des
Skripts sind **Obergrenzen**, keine Sollwerte (ein zweiter Lauf darf nichts melden).

**Fertig, wenn** `--check` 0 Beanstandungen meldet, `--write` gelaufen ist, die
Prüfsummen von `zone_data`, `action_data`, `grid_data`, `state_data` **und aller acht
`save_states`** vorher/nachher gleich sind und ein erneuter Lauf nichts tut.

## CZ — Abschluss: Rauchtest, Spielstände, Aufräumen (M27)

- **Rauchtest lesend** gegen die Produktion mit dem ausgelieferten Executor: die vier
  Kombinationen laufen mit leerem Protokoll; „Kampf beginnen" → „Dorfphase beginnen" →
  „Laden nachfüllen" laufen in jeder (Abnahme 7 aus M27.2, `action_data` unverändert).
- **Ladeprobe *Partie 14 – Sieg gegen Virginia Fitz*** und *Auto Save* am Tisch:
  laden, die Stapel sind da, die Aktionen laufen. Dasselbe für eine der beiden
  Partie-13-Zeilen.
- **Sichtprüfung** am Tisch (der Browser-Bereich war bei M26 an `gaming.benjathi.de`
  nicht angemeldet — ein Passwort trägt der Agent nicht ein; dann wie M26 eine lokale
  Probeinstanz mit einem Auszug der Produktion): Rollenstapel neben dem Nachschub,
  nichts überlappt; Dialog beim Start; Meldung nach dem Laden nennt die Wahl.
- **Aufräumen:** `patchSequence`, `counterSpots`, `COUNTER_ROW`, `rowBox` aus
  `scripts/doerfler-daten.mjs` entfernen (ihre Tests laufen über die Gleichwertigkeit
  aus `CQ`); das Skript schreibt danach **nur** noch `zone_data`, `action_data` und den
  Roster-Teil von `villagers`. `docs/datenzugriff.md`: „Eine Kategorie wird auf **drei**
  Arten gebunden" (Name, Karten, Etikett). `CLAUDE.md`, „Laufende Arbeit": ein Absatz
  „Aufbau-Optionen (M27)" mit Verweis hierher. Spec: ein „— gebaut"-Abschnitt wie bei
  M26, mit den Berichtigungen, die die Umsetzung findet.
- **Offen lassen** (nicht entscheiden): Umbenennen des Aufbaus (Entscheidung 7),
  Löschen oder Behalten des Grundaufbaus, und die Befunde an den **elf vorhandenen**
  Szenarien (`docs/szenariodaten-grundspiel.md` §11: Plättchen daneben, drei fehlende,
  fünf falsche Drehungen) — eigener Auftrag, M27 rührt sie nicht an.

**Stand nachher** (wie `docs/tasks-doerfler.md`): Testzahl vorher → nachher, welche
Daten geschrieben wurden, was der Rauchtest und die Sichtprüfung fanden, was offen
blieb.

---

## DA — `place_card { category }`, damit dem Sheriff die Karte nicht fehlt (M27.5)

Vor `CZ`, unabhängig von `CO`–`CY` — betrifft nur `place_card`.

**Warum.** `TRILLERPFEIFE` liegt zweimal in der Bibliothek, mit verschiedenen Bildern
und in verschiedenen Kategorien (`Einzigartige Ausrüstung` und `Toller Trödel:
Nachschub (gesperrt, Nr. 31-162)`). *Kampf beginnen* Schritt 17 (`place_card
"$SHERIFF"`, `onlyFinal: true`) meldet im **Endkampf gegen Handsy** `failed` und legt
nichts. `executeSequence` wirft nie — am Tisch fehlt die Karte stumm. Sichtbar wird es
erst in der langen Partie, weil Handsy in der Kurzpartie nicht vorkommt.

**Reihenfolge, test-first.**

1. **Test, der das heutige Verhalten festhält:** `place_card` **ohne** `category`
   verhält sich unverändert (inklusive „mehrdeutig" bei zwei Bildern und „hat N
   Exemplare, nahm das erste" bei gleichem Bild). Dieser Test darf sich nicht ändern.
2. **Test, der fehlschlägt:** zwei gleichnamige Karten in verschiedenen Kategorien,
   `place_card { cardName, category: "<die eine>" }` → legt die richtige.
3. `shared/sequenceExecutor.js`: in `place_card` die Kartenliste **vor**
   `findCardByName` auf die genannten Kategorien einschränken. `category` ist Text
   **oder Liste**, exakt verglichen mit demselben `norm` wie `place_stack`.
   `findCardByName` **nicht** anfassen.
4. `category` in `NAME_FIELDS` aufnehmen, damit Platzhalter darin ersetzt werden —
   Listeneinträge je Eintrag (wie `place_stack.category`). Test dazu.
5. Test: Name kommt nur **außerhalb** der genannten Kategorien vor → `no card named
   "…"`, **kein** Ersatzgriff.
6. `client/src/utils/sequenceSteps.js`: Feld `category` bei `place_card`,
   Zusammenfassung und Validierung (`server/test/sequence-steps.test.js`).
7. **Daten** (zusammen mit `CY`, dieselben Regeln: nur ergänzen, Prüfsummen vorher
   und nachher): Schritt 17 von *Kampf beginnen* erhält
   `"category": ["Einzigartige Ausrüstung", "Einzigartige Ausrüstung (Neue Nachbarn)"]`.
   Beide Kategorien, weil die Einzigartige Ausrüstung in zwei liegt (28 + 33) und eine
   Angabe alle zwanzig Bösewichte abdecken soll. **`action_data` wird damit geändert** —
   das ist die einzige Stelle in M27, die das tut, und sie gehört in die Kontrollausgabe.
8. **Rauchtest lesend** gegen die Produktion: *Kampf beginnen* im Endkampf gegen
   **Handsy** mit leerem Protokoll, und die neunzehn übrigen Endkämpfe legen weiterhin
   ihre Karte.

**Nicht tun.** Keine der beiden Karten umbenennen, verschieben oder löschen; keinen
Vorrang einer Kategorie einbauen.


---

## Stand nachher (2026-11-07)

**Tests:** 1418 → **1555**, alle grün (`cd server && npm test`). Neu: `seat-villager` (14),
`setup-options` (21), `sequence-options` (15), `setup-choices` (9), `room-setup-choices` (8),
`sequence-place-card-category` (15), `auslagen-daten` (35), dazu je ein paar Tests in
`doerfler-daten`, `sequence-steps` und `sequence-villager-steps`. Bau: `cd client && npx vite
build` — dieselben zwei Warnungen wie vorher (doppeltes `data-testid`, Chunkgröße), keine dritte.

**Aufgaben.** Erledigt: `CO`, `CP`, `CQ`, `CR`, `CS`, `CT`, `CV`, `CW`, `CX`, `DA`, `CY`, `CZ`.
`CU` entfiel (Weg C). Ein Commit je Aufgabe, `CP` und `CR` ohne Änderung an den 44 Tests von
`villagers`/`swap-villager`.

**Reihenfolge beim Ausliefern, eingehalten.** Zuerst Code (`6efeaa2`, beide Images neu, geprüft:
`seat_villager` steht im Backend-Image in `/shared/sequenceExecutor.js` **und** im Client-Bundle;
alter Aufbau mit neuem Code: der Executor aus dem Repo und der von `edb0118` bauen auf den echten
Produktionsdaten bei gleichem Zufall **denselben Tisch** und dasselbe Protokoll, Aufbau und alle drei
Aktionen). Erst danach die Daten.

**Daten geschrieben** (`scripts/auslagen-daten.mjs --write`, eine `IMMEDIATE`-Transaktion, Sicherung der
drei Spalten vorher lokal im Kratzverzeichnis, **nicht** im Repo):

| Spalte | vorher | nachher |
|---|---|---|
| `sequence_data` | 65 Schritte, 5850 Zeichen, sha 4824dd42ed3e | **31** Schritte, 2781 Zeichen, sha 33a42ffe0f71 |
| `scenario_data` | 17 743 Zeichen, sha 7a4644d2ec78 | 18 678 Zeichen, sha 2f9cf558a0f7 (nur Schlüssel dazu) |
| `action_data` | 6530 Zeichen, sha 55d3860b257d | 6611 Zeichen, sha 63abf4174038 (**ein** Schritt: *Kampf beginnen* 17) |

Unverändert und nachgewiesen (neu gelesen): `scenario_data.bosses` (20 Einträge, sha 8c8666618388 vorher
= nachher), `villagers.roster` (sha c19449fe1e90 vorher = nachher), `gridLabel`, `cardZoneLabel`;
`zone_data` (c574e646476d), `grid_data` (e38ba3c68692), `state_data` (e46ad8eaba32) der Zeile; alle
dreizehn Tabellen-Fingerabdrücke vorher/nachher gleich (die beiden anderen Aufbauten eingeschlossen);
**alle 17 `save_states`-Zeilen** einzeln gehasht und gleich, *Partie 14* eingeschlossen. Ein zweiter
Lauf sagt „nichts zu schreiben". Das alte `doerfler-daten.mjs --check` findet auf der Produktion nach
dem Schreiben 0 Änderungen (Befund 10 ist damit belegt erledigt).

**Rauchtest** (`scripts/auslagen-rauchtest.mjs`, nur lesend, im Backend-Container mit dem
ausgelieferten Executor gegen die echte Datenbank, 0 Beanstandungen):

- Vier Kombinationen: Aufbau mit **0 Zeilen ohne `ok`**, dann *Kampf beginnen* → *Dorfphase beginnen*
  → *Laden nachfüllen* (und ein zweiter Kampf) jeweils 0 ohne `ok`. kurz/mit: Nachschub 20 + 10 offen,
  Rollen 20, 45 Münzen; kurz/ohne 167 + 10, kein Rollenstapel; lang/*: 30 Münzen, vier verdeckte
  Bösewichte, kein Marker.
- Alle 20 Bösewichte, Vor- und Endkampf mit der echten Aktion: 40 von 40 ohne Beanstandung. **Handsy-
  Endkampf legt die TRILLERPFEIFE aus der Einzigartigen Ausrüstung.** *Dorfphase beginnen* räumt nach
  jedem der 40 Kämpfe Verhaltensdeck und `Aktionen: …`-Karten ab.
- Die fünf Spielstände, die auf den Aufbau zeigen (*Auto Save*, *M22-Probe Neuladen*, *Partie 13* ×2,
  *Partie 14*): Stapel da, Dörfler Henlo/Fridgette/Granny erkannt, die Aktionen laufen **im Speicher**
  (*Partie 13 – Kampf 1 Ende* hält an der Wache „alle Lebenszähler 0", wie es soll).

**Sichtprüfung.** Am Tisch der Produktion **nicht gemacht** (der Browser-Bereich ist dort nicht
angemeldet, ein Passwort trägt der Agent nicht ein). Stattdessen eine **lokale Probeinstanz** (eigene
Datenbank aus dem Auszug, Testkonto, **ohne Bilder** — Karten zeigen ihre Namen, Tableaus fehlen) mit
dem gebauten Client und denselben Daten:

- „Load" auf der Kurzpartie öffnet den Dialog mit „Kurz" / „mit Toller Trödel"; „Lang" + „ohne" →
  Adresse `?setupId=…&opt=partie:lang&opt=troedel:ohne`, Tisch: Nachschub 167 (177 − 10 offen), kein
  Rollenstapel, 30 Münzen, vier verdeckte Bösewichte. Kurz/mit: Nachschub 20, **Rollenstapel 20 unter
  dem Nachschub**, 45 Münzen, Meldung „Loaded setup: „…" - Kurz (3-Runden-Modus), mit Toller Trödel".
- `/play?setupId=…` ohne `opt` baut die Vorgaben; `opt=partie:xxx` baut **nichts** und meldet
  „choices: option "partie" has no choice "xxx" (kurz, lang) - nothing was built"; der Basis-Aufbau
  bekommt **keinen** Dialog.
- Editor: 31 Schritte, jede Zeile mit Gate-Zeile („Only with" mit Haken je Wahl); Zeilen lesen sich
  „… · only with partie=kurz", „Seat "Henlo Bulwark" at seat 1". Prüfliste CV: ein Gate setzen und
  zugleich ein anderes Feld desselben Schritts ändern, speichern → beides steht in der Datenbank;
  `scenario_data.options` nach dem Speichern byteweise gleich (416 Zeichen), `bosses` 20, `barZone` und
  `tableau` bleiben.
- Raum: das Modal zeigt unter der Setup-Auswahl die zwei Auswahlfelder (nur wenn ein Setup mit Optionen
  gewählt ist); die Lobby zeigt „Lang (4 Runden), ohne Toller Trödel".

**Offen / nicht geprüft** (vollständig):

1. **Die Sichtprüfung am Tisch der Produktion** und mit den echten Bildern: Lage des Rollenstapels (am
   Tisch gemessen **und** in der Probeinstanz als Rahmen gesehen, nicht mit Kartenbild), Lesbarkeit bei
   Spielzoom, das Aussehen des Dialogs auf dem Boox/Handy.
2. **Das Laden eines Spielstands im Browser** (*Partie 14*, *Auto Save*): geprüft ist nur, was der
   Executor am gespeicherten Zustand sieht, nicht `loadGameState`/`applySetupScaffold`.
3. **Der Raum im Betrieb:** Anlegen, Lobby und die Wahl sind in der Probeinstanz und im Test geprüft;
   „Start Game" mit zwei Spielern und das Zeichnen des gebauten Tisches im Raum (WebSocket) nicht.
4. **Die Wahl hinterlässt nichts im Spielstand.** Nach dem Laden eines Spielstands weiß der Tisch nicht,
   ob er „lang" oder „kurz" war (Spec M27.2, gewollt); die Meldung nennt sie nur beim Aufbau.
5. **Aufbau umbenennen** (Entscheidung 7) und **Grundaufbau löschen oder behalten**: offen gelassen.
6. **Die elf alten Szenarien** (`docs/szenariodaten-grundspiel.md` §11) und **Geländekarten**, die es
   nicht gibt (§9.10): `build_scenario` meldet sie als bekannten Hinweis; Handsys Protokoll ist deshalb
   nicht wörtlich leer (siehe 15).
7. **Tilda Fields** hat keine Sheriff-Karte (siehe 14); **Karla Kühls Aufbauanweisung** und die **Lage der
   Marker je Layout** sind weiter offen.
8. **Die Auto-Save-Zeile** (`Auto Save`, `setup_id` der Kurzpartie) schreibt der Browser, sobald ein Tisch
   offen ist; sie hat sich zwischen den Messungen nicht verändert, **kann** es aber jederzeit. Exakt ist
   der Beweis nur *in* der Transaktion (Schreibsperre).

### Wo die Spec bei der Umsetzung nicht stimmte (13–)

Fortsetzung von „Wo die Spec nicht stimmt", Belege jeweils am Code oder an den Produktionsdaten.

13. **Es sind 17 `save_states`, nicht „acht".** Spec M27.2 Abnahme 8, M27.4, Abnahme (Gesamt) 3 und `CY`
    sagen „alle acht"; die Tabelle hat 17 Zeilen (fünf zeigen auf die Kurzpartie). Gehasht sind alle 17.
14. **Neunzehn von zwanzig Endkämpfen legen eine Sheriff-Karte, nicht zwanzig** (M27.5 Abnahme 6:
    „Handsy plus die neunzehn übrigen"). **Tilda Fields** hat in `final.stats` keine `SHERIFF`: ihr Sheriff
    bekommt kein benanntes Teil, sondern die oberste Karte des Gartendecks
    (`docs/szenariodaten-erweiterung.md`). `$SHERIFF is not bound` ist dort **gewollt**. Mit der Angabe
    `category` finden alle 19 anderen ihre Karte (alle in den zwei Kategorien).
15. **Handsys Protokoll ist nicht wörtlich leer.** `build_scenario` meldet als `note` Geländeplättchen
    ohne Karte in der Bibliothek (M25.2, bekannt); der Schritt mit der TRILLERPFEIFE steht auf `ok`.
    Ähnlich bei Barry Bluff (Werte als Formel, R1) und in einigen Vorkämpfen. Der Rauchtest nennt diese
    drei Fälle beim Namen (`bekannt()`) und zählt alles andere als Beanstandung.
16. **kurz/mit ist nicht ganz „derselbe Tisch wie vor M27".** Abnahme 2 und Abnahme 4 widersprechen sich:
    mit Toller Trödel liegt der **neue** Rollenstapel. Bewiesen ist die Gleichheit **bis auf diesen
    einen Stapel** (Objekte, Zähler, Stapelinhalt ohne Ids), im Test und gegen die Produktion.
17. **`anchorId` steht beim Platzieren nur, wenn das Tableau nicht das Platz-Asset ist.** Die Spec sagt
    „mit `anchorId`, wie beim Tausch", und die Gleichwertigkeit „`anchorId` eingeschlossen". Die alten
    Schritte setzten keines; Henlo an Platz 1 wäre mit `anchorId` ein anderer Tisch. Judy an Platz 1
    trägt es (Id von Henlos Tableau); der Tausch setzt es weiter immer.
18. **Die drei `seat_villager` stehen an Index 25, nicht 23.** Davor liegen jetzt der Rollenstapel und
    `draw_assets`. Gemeint ist „an der Stelle des ersten entfernten Schritts" — nach dem Austeilen der
    Heldentaten, vor den Münzen.
19. **`category` stand schon in `NAME_FIELDS`** (M27.5, Punkt 4): Platzhalter darin liefen für
    `place_stack` bereits; für `place_card` war nur die Einschränkung nachzutragen (`cardsInCategories`,
    **eine** Funktion, die auch der Editor fragt). Der alte Test „`place_card` hat genau zwei Felder"
    wurde bewusst auf drei angehoben.
20. **`options.choices` ist „gegeben oder nicht", nicht „leer oder voll".** Spec/`CT` verlangen zugleich:
    eine Aktion (ohne Wahl) bindet `$opt…` nicht; ein Start ohne `opt` baut die Vorgaben. Das trägt nur,
    wenn **undefiniert** = „keine Wahl" (Aktion; `$opt…` ungebunden, Gate scheitert laut) und **`{}`** =
    „die Vorgaben" (Tisch, Raum) heißt. Der Tisch gibt darum immer ein Objekt mit.
21. **`validateOptions` prüft mehr als die Spec nennt:** Schlüssel der Optionen und Wahlen nur
    `[A-Za-z0-9_-]` (sie reisen in der Adresse), jede Wahl einer Option setzt dieselben Variablen, eine
    Variable setzt nur eine Option, und jedes `$opt…` der Folge hat eine Quelle. Jede dieser Lücken wäre
    ein „is not bound" in jedem Start.
22. **`parseChoices` gibt `{ choices, problems }` zurück**, nicht die bloße Wahl (`CW`): ein Problem muss
    neben der Wahl reisen können, ohne dass es zum Default wird.
23. **Raum: `setup_choices` ist die aufgelöste Wahl** (mit den Vorgaben für den Rest), `GET` liefert
    zusätzlich `setup_choices_label` (die Bezeichnungen aus `describeChoices`), und der Start gibt **409**,
    wenn das Setup sich seit dem Anlegen so geändert hat, dass die Wahl nicht mehr passt — sonst baute der
    Executor (letzte Wache) nichts auf, und der Raum liefe mit leerem Tisch.
24. **Der erste zweite Lauf des eigenen Skripts war falsch.** Er verglich die schon umgestellte Folge
    ohne Wahl mit sich selbst als „alten Aufbau" und meldete eine Abweichung. Die reinen Tests konnten
    das nicht sehen; `main` läuft darum im Test gegen eine echte SQLite-Datei (Schema aus
    `setupDatabase`, Zeilen aus dem Auszug): `--check` ändert nichts, `--write` schreibt genau drei
    Spalten, der zweite Lauf schreibt nichts, ein abweichender Wert bricht ab, ein UPDATE ohne Treffer
    schreibt nichts.
25. **`COUNTER_ROW` bleibt in `doerfler-daten.mjs`** (`CZ` wollte es entfernen): `VILLAGERS` leitet die
    Zählerstellen daraus ab; ohne die Konstante stünden die Zahlen neu abgetippt da. Entfernt sind
    `patchSequence`, `counterSpots`, `rowBox`.
26. **Die Auto-Save-Zeile ändert sich im Betrieb.** Ein offener Tisch schreibt sie; „alle 17 Zeilen vorher/
    nachher gleich" ist darum nur *in* der Transaktion exakt (`IMMEDIATE` nimmt die Schreibsperre vor dem
    Hashen). Das Skript meldet zusätzlich je Zeile, ob sie zwischen Lesen und Schreiben abwich.
27. **Zwei Hilfsskripte im Repo sind neu:** `scripts/auslagen-daten.mjs` (schreibt, `--check` zum Prüfen)
    und `scripts/auslagen-rauchtest.mjs` (liest nur). Beide laufen im Backend-Container mit
    `auslagen-daten.mjs`, `doerfler-daten.mjs`, `equipment-zones.mjs` daneben in `/app` (`docs/datenzugriff.md`).
