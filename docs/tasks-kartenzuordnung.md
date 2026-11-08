# Aufgaben: Drei Plättchenarten finden ihre Geländekarte (Spec M29)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M29** — dort stehen der gemessene Befund (M29.1), die Entscheidung
mit den verworfenen Alternativen (M29.2), die Regel (M29.3), die Abgrenzung zum Ähnlichkeitsrechner (M29.4), die Prüfung (M29.5), der
Zielstand mit Hashes (M29.6), das Schreiben (M29.7), die Reihenfolge von Deploy und Daten (M29.8), der Rauchtest (M29.9), was **nicht** dazugehört
(M29.10) und die Abnahme. Datengrundlage: `docs/szenariodaten-grundspiel.md` §6.4, §6.5, §9.10; `docs/befund-beute-und-aufstellbares.md` §3.3;
`docs/datenzugriff.md` (**Pflicht**, bevor Produktionsdaten auch nur gelesen werden). Vorgeschichte: `docs/tasks-szenarien.md` (M28, `DB`–`DJ`) — dieselbe
Spalte, dieselbe Vorlage für das Schreiben.

**Dateiname.** Der Auftrag nannte `docs/tasks-gelaendekarten.md`. Die Datei **gibt es schon** (M8.3, Aufgaben `K1`–`K6`, Commit `97edcf2`) — diese Datei heißt deshalb
`tasks-kartenzuordnung.md`, und die alte bleibt unberührt.

**Aufgabenbuchstaben.** Mit **`DK`** geht es nach `DJ` (`docs/tasks-szenarien.md`) weiter. Geprüft: `DK`–`DT` sind in keiner `docs/tasks-*.md` vergeben.

**Reihenfolge.** `DK` → `DL` → `DM` → `DN` → `DO` (alles gegen **Fixture und Wegwerf-Datenbank**, ohne Produktion; `DK` und `DL` sind voneinander unabhängig, `DM` braucht beide) →
**`DP`** (Deploy, Rauchtest davor und danach) → **`DQ`** (Produktion lesen, Sicherung, Trockenlauf, Frage an den Auftraggeber) → **`DR`** (schreiben) → `DS` (Dokumente) →
`DT` (der Auftraggeber sieht es am Tisch). **Erst deployen, dann schreiben** (M29.8) — die umgekehrte Reihenfolge wäre auch unschädlich, aber nicht die verbindliche.

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die ihn grün macht. Tests: `cd server && npm test` (Stand vorher, gemessen am 2026-11-08: **1 595**, alle grün).
Es gibt **eine** Stelle je Sache (M6): die Zuordnung steht **einmal** im Baustein (`ZUORDNUNG`), Prüfer, Skript, Rauchtest und Tests lesen dieselbe. **Kein `--force`**, nirgends. Datenänderungen gegen
Spiel `072123c0-cd97-4ffb-a330-369630fab93f`, Aufbau `b1e10f4e-b8f2-4c2a-bb3e-54643944121b`: **nur** `setups.scenario_data` wird gelesen und geschrieben — **nie** `zone_data`, `action_data`, `grid_data`,
`sequence_data`, `state_data`, `save_states`, `updated_at`. Erst Trockenlauf, dann `db.transaction`, dann Kontrollausgabe, **vorher** eine Sicherung ins **Scratchpad, nicht ins Repo**. Zugang zur Produktion:
`ssh -o UserKnownHostsFile=<Scratchpad>/known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes root@192.168.178.96` (die `known_hosts` des Nutzers ist veraltet und bleibt unberührt); Python auf diesem
Rechner ist `py`. **Nicht an `gaming.benjathi.de` anmelden, keine Passwörter eingeben** — gemessen wird an der Datenbank, nicht durch die Oberfläche. Skripte gehören nach `/app/<name>.mjs` im Container
(`docs/datenzugriff.md`), und ein neu angelegter Container hat sie nicht mehr.

---

## Wo die Spec nicht stimmt

Zwanzig Stellen, an denen der Auftrag vom 2026-11-08, ältere Dokumente oder der Stand im Repo beim Nachmessen nicht zutrafen oder etwas ausließen. Die Nummern 1–6 ändern, was gebaut wird; die übrigen, was
gelesen werden muss.

1. **Die Datei `docs/tasks-gelaendekarten.md` gibt es schon** (M8.3, `K1`–`K6`). Neu angelegt wurde `docs/tasks-kartenzuordnung.md`; hätte man den Namen genommen, wäre die Aufgabenliste von M8.3 überschrieben worden.
2. **Die Liste der „echt fehlenden“ Karten ist unvollständig.** Der Auftrag nannte `Verschlingende Welle`, `Ritualzeichen`/`Weizenfeld`, `Milchkanne`/`Bürger`, `Bundo`/`Leckerli`, `Pile of Locals`. Gemessen (1 087 Karten,
   ohne Rücksicht auf Leerzeichen gesucht, null Treffer für jeden Suchbegriff) bleiben nach der Zuordnung **14 Plättchenarten** in acht Endkämpfen. **Es fehlen in der Liste: die fünf `Grabhügel / Grabhügel ausgehoben (0|6|10|14|30)` im
   Endkampf von Virginia Fitz.** Außerdem steht die Bundo-Königin **auch bei Deputy Waggums** im Endkampf (nicht nur bei The Bundits; M20.2 hatte das schon festgehalten), und die Bürger kommen bei Handsy **offen** und bei Pepin
   **verdeckt** vor. Die null Treffer des Auftrags sind bestätigt; die Vollständigkeit nicht (M29.10).
3. **`bekannt()` ist keine Liste, die „mitgezogen“ werden müsste.** Es ist ein regulärer Ausdruck auf den **allgemeinen** Wortlaut der Meldung (`no terrain card(s) in this library (nothing to do)`); die Namen stehen nirgends darin.
   Gemessen: Rauchtest vorher und nachher **0 Beanstandungen**; er beanstandet die kürzere Meldung nicht und meldet nicht „alles gut“ für etwas, das nicht mehr vorkommt. **Die Gefahr liegt umgekehrt:** `bekannt()` lässt
   *jedes* Plättchen ohne Karte durch — fiele die Tabelle aus, bliebe der Rauchtest grün. Dafür ist `DO` die Sperre.
4. **„Genau drei Namen verschwinden aus den Meldungen“ stimmt für die Namen, nicht für die Meldungen.** In **13** der 16 betroffenen Läufe verschwindet die **ganze** `note` (`build_scenario` wird `ok`), in 3 bleibt sie kürzer, und in
   Barry Bluffs Zeile sinkt „ohne ok“ von 5 auf 4, weil die vier übrigen die bekannten `Equal to …`-Schritte sind. Über alle 40 Läufe: `ok` 19 → 32, `note` 21 → 8, Vorkämpfe mit `note` 8 → 0 (M29.1, M29.9).
5. **Betroffen sind acht Bösewichte, nicht nur die elf aus M28:** Virginia Fitz, Red Atrocious, Barry Bluff, The Door Knockers (berichtigt in M28) **und** Handsy, Lawman Dozy, Qing & Kween, Umbrello (aus den neun vom
   2026-11-07). Die zwölf übrigen — darunter Deputy Waggums, Tilda Fields, The Bundits — ändern sich in keinem Lauf.
6. **Punkt 4 des Auftrags („fällt bei Qing & Kween automatisch auf eine Karte zusammen“) gilt für vier Einträge, nicht nur für einen** — Qing & Kween, The Door Knockers, Virginia, Red führen beide Wälder. **Bei Handsy und
   Lawman Dozy führt der Eintrag nur `Dichter Wald 2`;** dort kommt die Waldkarte **neu** dazu (5 → 7, 6 → 7). Das ist die eigentliche Änderung am Tisch und die, die der Auftraggeber sehen soll (`DT`).
7. **Der Kategoriename stimmt im Auftrag und nicht in den Texten:** `Gelände (Neue Nachbarn)` (gemessen). M8.3 und `szenariodaten-erweiterung.md` 8.9 sagen noch `Gelände (Üble Nachbarn)` — der alte Name; `DS` zieht das nach.
8. **„Ein Deploy“ sind zwei Images.** Der Tisch führt den Executor aus dem **Frontend-Bundle** aus (`GameTable.jsx` importiert `../../../shared/sequenceExecutor.js`; `client/Dockerfile`: `COPY shared/ /shared/`), der Raum
   (`POST /api/rooms/:code/start`) aus dem Backend-Image. Wer nur das Backend prüft (Hash von `/shared/sequenceExecutor.js`, Rauchtest), hat den Tisch nicht geprüft. Dazu: der Checkout `/opt/card-game-engine` auf der VM steht auf `1fc6f39`
   (M27), acht Commits hinter `origin/master` — nur Dokumente und Skripte, aber der Deploy zieht sie nach.
9. **Es gibt im Repo schon eine zweite Abbildung derselben Namen:** `terrainName()` in `scripts/szenariodaten-grundspiel.mjs` (eine Regex; sie legt `Dichter Wald 2` auf `Dichter Wald`, `Sprengstoff`/`Auslöser` auf `Sprengstoff & Auslöser` und
   auch `Holzzaun 2` auf `Holzzaun`, um die sieben Terrains je Szenario auszuzählen). „Eine Stelle je Sache“ (M6) ist damit verletzt, bevor M29 beginnt; es wird nicht zusammengelegt (anderer Zweck, anderes Werkzeug), aber ein Test hält sie
   zusammen (`DM`).
10. **`validateScenarioData` „muss den Schlüssel annehmen, ohne daran zu scheitern“ — tut es schon:** sie liest `gridLabel` und `bosses` und sonst nichts, und `build_scenario` übergibt ihr auch nur diese zwei. Was **fehlt**, ist, dass sie
    die Tabelle **sieht** und die Bibliothek kennt (`cards` ist heute kein Parameter). Das ist `DL`.
11. **Diesmal wird ergänzt, nicht geändert** — der Präfixbeweis, den M28 (Nr. 13 in `tasks-szenarien.md`) als „gilt hier nicht“ verworfen hat, **gilt wieder** (gemessen: neuer Text = alter ohne die letzte `}` plus `,"terrainCards":…}`), und
    der Rückwärtsbeweis ist das Entfernen **eines** Fragments. Beides prüft `DM`; die Regeln Nr. 5 aus `docs/datenzugriff.md` („Vorhandene Werte ändern“) gelten nur zum Teil.
12. **Die Sicherung von M28 ist nicht die von M29.** `scenario_data.2026-11-08.json` im Scratchpad hält den Stand **vor** M28 (18 678 Zeichen, `2f9cf558a0f7`); `--write` und `--zurueck` von M29 lehnen sie ab. Eine neue
    Sicherung (18 982 Zeichen, `5eec10582ec8`) kommt in `DQ`. Und nach M29 verweigert M28s `--zurueck` den Dienst (es verlangt *seinen* Zielstand) — **Rückweg in umgekehrter Reihenfolge: zuerst M29, dann M28.** M28s `--check` bleibt grün (gemessen: `plane()`
    auf dem Zielstand → 0 zu berichtigen, 7 schon berichtigt).
13. **Ein bestehender Test wird rot, sobald der Rauchtest die Tabelle verlangt:** `CZ: der Rauchtest findet nach dem Schreiben nichts` (`server/test/auslagen-daten.test.js`, Zeile ≈ 596) läuft auf einer Wegwerf-Datenbank **ohne**
    Tabelle und erwartet `problems = []`. `DO` zieht ihn mit (schreibt die Tabelle in die Wegwerf-Datenbank) und fügt den Gegentest „ohne Tabelle schlägt der Rauchtest an“ hinzu.
14. **Der Executor sucht nicht mit `findCardByName`, und die Tabelle darf es auch nicht** — das hatte der Auftrag richtig gesehen. Der konkrete Grund: `findCardByName(cards, 'Sprengstoff')` meldet **zwei Treffer** (`SPRENGSTOFF-ZIGARRE` in
    `Nachschub` und `Sprengstoff & Auslöser`), `findCardByName(cards, 'Dichter Wald 2')` **keinen**, nur `Auslöser` trifft richtig — durch Zufall.
15. **Zwei weitere Plättchenarten gehören zur selben Klasse und stehen nicht in der Tabelle:** `Holzzaun 2` und `Flut (hochkant)` (`szenariodaten-erweiterung.md` 8.7). **Kein Eintrag benutzt sie** (0 Stellen). Nicht aufgenommen (M29.10, Entscheidung 6).
16. **„Im gedruckten Spiel gibt es eine Karte dafür“ (Auftrag, `Dichter Wald 2`) ist nicht geprüft.** Belegt ist: die Bibliothek hat eine Karte, §6.4 trennt zwei Artworks. Offen (M29, „Offen und ungeprüft“ Nr. 1).
17. **Die Zonen- und Kartenzahlen ändern sich weniger, als man erwartet:** die größte Auslage bleibt 7 Geländekarten (Deputy Waggums hat heute schon 7), die Zone hat `capacity: null`. Keine Platznot, und kein Test braucht eine
    größere Zone.
18. **Das Verbot „kein Ähnlichkeitsrechner“ steht an zwei Stellen und nur eine ist Code:** im Kommentar in `build_scenario` („zwei Versuche, kein dritter und kein Aehnlichkeitsrechner“) und in M8.3 Regel 1. M8.3 bleibt wahr (es
    sagt, die 33 Namen seien bereinigt und die Zuordnung sei ein Namensvergleich); **der Kommentar nicht mehr** — `DK` ändert ihn. In M7.6 steht „Offen und nicht Teil davon: `Sprengstoff & Auslöser` … ein eigener Fall“; den Nachtrag „gelöst mit M29“ habe ich dort schon gesetzt.
19. **Der Browser schreibt mit** (`Auto Save`), und **ein offener Setup-Editor schreibt `scenario_data` aus seinem Zustand zurück** — mit jedem neuen Schreiben in dieselbe Spalte ist die Lücke eine weitere. M28 und M29 würden beide zurückgenommen
    (`docs/datenzugriff.md`, „Fallen“). Gegenmaßnahme wie bei M28: fragen, nachprüfen, am Ende des Tages `--check` — **beider** Skripte.
20. **Meine Zahlen für „nachher“ sind aus einem Prototyp** (eine Kopie von `shared/` im Scratchpad, acht Zeilen, Daten als Kopie der Produktion), nicht aus dem gebauten Code. Wo `DK`–`DO` etwas anderes messen, gilt die neue Messung — und
    M29.1 wird dann berichtigt, nicht der Code der Spec angepasst.

**Nachtrag aus dem Bauen (`DK`–`DO`, gebaut am 2026-11-08; Nummern 21 ff. setzen die Liste fort).** Nr. 20 ist beantwortet: die Zahlen für „nachher“ **halten**, gemessen am gebauten Code und an der Fixture, die den Produktionsstand byteweise nachbildet
(`ok` 19 → 32, `note` 21 → 8, Vorkämpfe mit `note` 8 → 0, Namensnennungen 50 → 18, 24 von 40 Läufen Zeichen für Zeichen gleich, Zuwachs je Bösewicht wie in M29.1, monoton, Objekte auf dem Raster und übrige Protokollzeilen gleich).
M29.1 braucht keine Berichtigung. Was nicht hielt:

21. **Die Fixture *kann* den Ausgangsstand der Produktion erreichen** (M29.7 Nr. 10, Entscheidung 10, `DM` Nr. 9: „rechnen kann ihn nur die Produktion“). `patchScenario` aus `auslagen-daten.mjs` (M27 schreibt `options`) und dann `berichtige` (M28) macht aus `fx.scenarioBefore`
    **Zeichen für Zeichen** den Stand vom 2026-11-08: 18 678 Zeichen `2f9cf558a0f7` (vor M28) → **18 982 Zeichen `5eec10582ec8`**; mit `ergaenze` **19 106 Zeichen `914461d63f77`**; auch die fünf Schlüssel-Hashes aus M29.6 stimmen. Die Naht `deps.ausgang` ist damit überflüssig
    und **gestrichen** (ich hatte sie zuerst gebaut, dann die Kette gemessen und sie wieder entfernt): die Tests laufen gegen die **echten** Konstanten `AUSGANG`/`ZIEL`, und ein Test hält die Kette fest. Das ist stärker als der Plan — die Konstanten sind nicht aus dem Ergebnis des Skripts abgeleitet und werden doch von ihm erreicht.
    Folge: `--check` an der Produktion hat hier eine **Probe an der Kopie** hinter sich, die dieselben Zahlen zeigt, die `DQ` lesen soll.
22. **„40 Läufe nie `failed`/`skipped` außer Tildas `$SHERIFF is not bound`“ (M29.7 Nr. 3, `DM` Nr. 5) stimmt nicht:** in Handsys **Endkampf** scheitert der Schritt `place_card` mit `"TRILLERPFEIFE" matches 2 cards` — die Karte gibt es zweimal (zwei Bilder, zwei Kategorien, `docs/datenzugriff.md`),
    und `durchrechnen` (`szenariodaten-grundspiel.mjs`) ruft `place_card` **ohne Kategorie** auf, die echte Aufbau-Folge mit. M28s `pruefeZiel` sah das nie: es rechnet nur die elf M28-Bösewichte, und Handsy gehört nicht dazu. Der Fehlschlag ist vorher wie nachher **derselbe** (Protokollzeilen gleich, gemessen) und gehört nicht zu M29;
    `pruefeZiel` führt ihn als **zweite** bekannte Ausnahme neben Tildas Sheriff (Bösewicht, Endkampf, Schritt und Wortlaut genau eingegrenzt). Der **Rauchtest** ist davon nicht betroffen (er läuft die echte Aktion).
23. **M28s `pruefeZiel` ist an `EINTRAEGE_ELF` gebunden und kennt `cards` nicht** (`validateScenarioData` ohne Bibliothek) — es ließ sich für die 40 Läufe und die Tabellenprüfung nicht wiederverwenden. M29 hat eine eigene `pruefeZiel` und eine `laeufe()` (eine Schleife, einmal; `vergleiche` benutzt sie auch), M28s Funktion blieb unberührt.
    Das ist eine zweite Fassung derselben Läufe-Regel (etwa fünfzehn Zeilen); wer sie zusammenlegen will, parametrisiert M28s Funktion nach Bösewichten und Bibliothek — hier nicht getan, weil M28s Tests unverändert grün bleiben sollten.
24. **Der Rauchtest hängt jetzt an drei weiteren Dateien** (`DO`): er liest `ZUORDNUNG` aus `gelaendekarten-zuordnung.mjs`, und das importiert `szenariodaten-berichtigung.mjs` und `szenariodaten-grundspiel.mjs`. Im Container müssen diese **drei** neben `auslagen-rauchtest.mjs` in `/app/` liegen, nicht nur für `--check` (so steht es in `DQ`).
    Der **alte** Rauchtest (`DP` Schritt 2) braucht sie nicht. Im Repo-Wurzelverzeichnis läuft `node scripts/auslagen-rauchtest.mjs <db>` nicht: `better-sqlite3` liegt nur unter `server/node_modules`; „gegen die Fixture-Datenbank“ (`DO` „Fertig, wenn“) geht in der Containeranordnung, und so habe ich es geprobt
    (Scratchpad `m29\probe\`: `app\` mit den Skripten und einer Verknüpfung auf `server\node_modules`, daneben `shared\`).
25. **`CZ` hat zwei Tests, nicht einen, die rot werden** (`DO`, Abschnitt 13 dieser Liste nennt den ersten): auch `CZ: der Rauchtest schlägt an – vor dem Schreiben …` (der zweite) verlangt nach `--write` `every(p => /^Partie 14/…)` und bricht ohne Tabelle. Beide bekommen `mitTabelle(file)` (hinten angehängt, wie in der Produktion).
    Und: die Zahlen aus M29.9 (Virginia Vorkampf `0`, Barry `4` …) gelten für die Daten **nach M28**; die Wegwerf-Datenbank von `CZ` hat die **alten** Einträge. Die neuen Tests setzen deshalb `berichtige` davor (`mitTabelle(file, { nachM28: true })`); `CZ` selbst bleibt auf den alten Einträgen, wie es war.
26. **`validateScenarioData`: drei Stellen, die M29.5 offen lässt, und was ich getan habe.** (a) Ein Schlüssel mit Formfehler (leer, `/`, doppelt) bekommt **nur** diese eine Meldung, keine Folgeprüfung — sonst melden `A/B` und ein leerer Schlüssel zusätzlich „kein Asset“. (b) „matches `<n>` different cards“ zählt die verschiedenen **Bilder** (`image_path`), nicht die Zeilen.
    (c) Kein Eintrag `terrainCards` und `terrainCards: undefined` sind dasselbe (nichts zu prüfen), `null` ist ein Formfehler.
27. **Ein Test, der sofort grün war:** von den 18 Tests in `sequence-terrain-card-table.test.js` waren zehn von Anfang an grün (Spec `DK`: „alle rot“) — sie halten **unverändertes** Verhalten fest (ohne Tabelle, exakter Name gewinnt, Form-Fälle, monoton …) und können vor der Änderung nicht rot sein. Sie wurden durch Mutationen belegt
    (Zweig entfernen, Bedingung `part === null` weglassen, `Array.isArray` weglassen … — jeweils rot, der Rest siehe Bericht). Dasselbe gilt für die M29.1-Tests in `DM` (Zahlen, Monotonie): sie waren grün, sobald `DK` stand, und werden durch dieselbe Mutation (dritten Versuch entfernen) rot.
28. **Pepins drei verdeckte Bürger** (M29.10 sagt „drei“, nennt sie nicht): `Katze`, `Dörflerin`, `Soßenflasche` — eine Teilmenge der fünf von Handsy; die vierzehn Plättchenarten stimmen.

**Stand nach `DK`–`DO` (gebaut, nichts deployt, nichts an der Produktion gelesen oder geschrieben):** `DK` `8dc9bd8`, `DL` `615fd33`, `DM` `69884d6`, `DN` `423ae6a` + `d76811d` (Naht gestrichen), `DO` `53e09be`; Spec und Aufgabenliste als `d980c1f`. Tests **1 595 → 1 686**, alle grün. `DP`–`DT` offen (siehe unten).

**Stand nach `DP`–`DS` (2026-11-08, deployt und geschrieben; die Befunde Nr. 29–37 stehen in `docs/spec-setup-system.md`, „M29 — gebaut, und was die Spec dabei berichtigt“).** `DP`: Deploy beider Images von Hand 14:27 UTC (Checkout `1fc6f39` → `8e09dca`), `/shared/sequenceExecutor.js` im Backend gleich dem Repo (`3b3b4de76ce2…`),
`terrainCards` im Frontend-Bundle (dritter Versuch eingeschlossen), alter Rauchtest vor/nach dem Deploy `diff` leer. `DQ`: gelesen = M29.6 (18 982 Zeichen, `5eec10582ec8`, 5 Schlüssel, 20 Einträge Hash für Hash), Sicherung `scenario_data.M29-vorher.json`, `--check` = M29.1
(40 Läufe, `ok` 32 / `note` 8, 18 Nennungen, 19 106 / `914461d63f77`); Editor-Frage: „Weiß ich nicht“ → Absicherung durch erneuten `--check`. `DR`: `--write` 14:31:15 UTC, **19 106 Zeichen, `914461d63f77`**, `terrainCards` `aad39d745984`, alle Gleichheiten, `save_states` gleich, zweiter Lauf „schon geschrieben“,
neuer Rauchtest 0 Beanstandungen (3 neue + 18 geänderte Zeilen, sonst gleich), 40 Läufe an der Produktion wie M29.1, M28 `--check` „7 schon berichtigt“, erneuter `--check` 14:34:50 UTC sauber. `DS`: `CLAUDE.md`, `datenzugriff.md`, Spec, diese Datei; Nachträge „behoben mit M29“ in `szenariodaten-grundspiel.md` und `-erweiterung.md`.
**`DT` ist offen** (Auftraggeber), dazu der dritte `--check` beider Skripte am Ende des Tages.


**Was der Auftrag richtig hatte** (damit niemand es nachprüft, als wäre es unsicher): die 33 Geländekarten mit ihren Namen und Kategorien; die drei Plättchennamen und ihre Karten; die Falle mit der Vertauschung (an `H7` steht `Auslöser`, an `Q5` `Sprengstoff`);
`norm` im Executor ist **nicht** `findCardByName`; die Entdoppelung nach Karte (`!found.includes(card)`) fängt `Dichter Wald 2` bei zwei Wäldern ab; der alte Executor läuft mit dem neuen Schlüssel **unbeschädigt** (Rauchtest-Ausgabe Byte für
Byte wie vorher); der Ausgangsstand 18 982 Zeichen / `5eec10582ec8` / fünf Schlüssel / 20 Bösewichte; HEAD `3fc4fa8`, Arbeitsbaum sauber auf `master`.

## Entscheidungen

Entschieden hat der Auftraggeber nur, was im Auftrag steht: **kein `--force`** (M28), **die echt fehlenden Karten sind nicht Teil davon**, **spec-, test- und subagent-getrieben**. Der Rest steht hier mit Begründung; wo er kippen soll, ist der Satz
**Umkehr** der Preis.

1. **Die Zuordnung steht in `setups.scenario_data.terrainCards`** (M29.2, Alternative (a)). *Umkehr:* ein Feld an `table_assets` — Schema-Migration, Import, Eintragestelle; lohnt bei einem zweiten Spiel oder mehr als etwa zehn Paaren.
2. **Die Tabelle füllt nur Lücken, sie überstimmt nichts** (dritter Versuch, nicht erster). So ist das Ergebnis für jedes Plättchen, das heute eine Karte hat, **dasselbe** (monoton, gemessen). *Umkehr:* Tabelle zuerst — dann kann ein falscher Eintrag eine richtige Karte verdecken, und der Prüfer müsste auf Überschneidungen achten.
3. **Nur für Namen ohne Schrägstrich.** Die Tabelle kennt keine Seiten; ein zweiseitiges Teil bekäme auf der Rückseite die Karte der Vorderseite, und `sequence-terrain-cards.test.js` hält fest, dass das nie passieren soll. *Umkehr:* Schlüssel `Vorderseite / Rückseite` mit zwei Zielen — erst wenn ein Fall da ist.
4. **Das Ziel wird mit `norm` gegen die ganze Bibliothek verglichen**, nicht über `findCardByName` und nicht in einer Kategorie (wie die ersten beiden Versuche; eine Regel, M6). Der Prüfer verlangt, dass es **genau eine** (oder mehrere Exemplare derselben) Karte gibt.
5. **Die Bibliothek wird am Tisch nicht geprüft.** Eine gelöschte Karte darf keinen Kampfaufbau abbrechen (M8.3). Der Prüfer läuft im Baustein, im Rauchtest und in Tests. *Umkehr:* `cards` in den Aufruf in `build_scenario` — dann bricht jeder Aufbau ab, sobald eine der drei Karten fehlt.
6. **Es sind genau drei Paare.** `Holzzaun 2` und `Flut (hochkant)` fehlen bewusst (0 Stellen in den Daten, Geländeart nicht gemessen); wer sie braucht, fügt **eine Zeile** mit eigenem Nachweis hinzu (neuer Zielstand, neue Hashes).
7. **Der neue Schlüssel steht hinten**, die Reihenfolge der Paare ist `Dichter Wald 2`, `Sprengstoff`, `Auslöser`, der Text ist festgelegt (108 Zeichen, `aad39d745984`), und er ist NFC.
8. **Erst deployen, dann schreiben** (M29.8). Der Deploy ist folgenlos (gemessen), das Schreiben der eine Schalter, `--zurueck` der Rückweg. *Umkehr:* Daten zuerst — ebenfalls unschädlich (gemessen), aber der Schalter ist dann der Deploy, und der ist schwerer zurückzunehmen.
9. **Ein Stand ohne die Tabelle, der nicht der Ausgangsstand ist, bricht ab** (kein `--force`); eine **vorhandene** Tabelle wird nie überschrieben; ist sie **gleich**, ist alles andere gleichgültig („schon geschrieben“). `--zurueck` ersetzt nur den **exakten** Zielstand.
10. **Ein Test-Seam für den Ausgangsstand:** die Vorbedingung nennt die Produktionswerte (18 982 Zeichen, `5eec10582ec8`); die Fixture hat `options` nicht und kann sie nicht erreichen. Darum nimmt `main(argv, deps)` ein `deps.ausgang`, und **ein** Test hält die Konstanten gegen M29.6 fest. Die Prüfung der **Einträge** (`bosses`, 15 567 Zeichen, `f6c1d5f585c0`, 20 Hashes) läuft ohne Seam, weil die Fixture sie hat.
11. **Keine Oberfläche, kein Schrittvokabular, kein `client/`** (M7.6): die Szenariodaten haben keine Oberfläche. `build_scenario` bleibt ein Schritt ohne Felder.
12. **Kein neuer Wortlaut für „Ziel zeigt ins Leere“.** Am Tisch ist es von einer fehlenden Karte nicht zu unterscheiden — und soll es auch nicht sein (Entscheidung 5). *Umkehr:* ein eigener Satz in `build_scenario` — dann verlangt `bekannt()` eine Ausnahme und der Rauchtest eine zweite Beanstandungsart.
13. **`bekannt()` bleibt ein Ausdruck auf den allgemeinen Wortlaut, plus eine Sperre für die drei Namen.** Keine Liste echt fehlender Namen im Rauchtest (14 Namen, ändert sich mit jedem Szenario — Vorrat). *Umkehr:* eine Liste, dann schlägt jede neu erfasste Szenariodatei den Rauchtest an, bis jemand sie nachträgt.
14. **`terrainName()` bleibt, wie es ist** — und ein Test hält die drei Paare gleich (kein Zusammenlegen: anderer Zweck, und die Regex kennt `Holzzaun 2`).
15. **Der Prototyp kommt nicht ins Repo.** Er lag im Scratchpad; der Code wird nach den Tests neu geschrieben.

---

## DK — Der dritte Versuch im Executor (M29.3, M29.4)

**Befund.** `build_scenario` sucht die Karte eines Plättchens in zwei Versuchen: exakter Name, dann der Teil der Seite (`shared/sequenceExecutor.js`, `cards.find(c => norm(c.name) === norm(name)) || (part ? … : null)`).
Dazu steht ein Kommentar, der „zwei Versuche, kein dritter und kein Aehnlichkeitsrechner“ sagt. M29.3 fügt einen **dritten** hinzu: die Tabelle `scenarioData.terrainCards`, nur für Namen ohne Schrägstrich (`part === null`), nur wo 1 und 2 nichts finden.

**Test zuerst** (`server/test/sequence-terrain-card-table.test.js`, die Datei gibt es noch nicht; Fixture-Helfer wie in `sequence-terrain-cards.test.js`, lokal, nicht aus dieser Datei exportiert — sie hat keine). Alle rot, solange es die Tabelle nicht gibt:

1. **Die Zuordnung greift:** Plättchen `Dichter Wald 2`, Bibliothek mit `Dichter Wald`, Tabelle `{ 'Dichter Wald 2': 'Dichter Wald' }` → die Karte `Dichter Wald` liegt, das Protokoll von `build_scenario` ist `ok`.
2. **Ohne Tabelle unverändert:** dieselbe Lage ohne `terrainCards` → keine Karte, `note`, die Meldung nennt `"Dichter Wald 2"`, Wortlaut wie in `sequence-terrain-cards.test.js` (`… have no terrain card in this library (nothing to do)`).
3. **Zwei Plättchen, eine Karte:** `Dichter Wald` + `Dichter Wald 2` (beide Wälder im Eintrag) → **eine** Karte; `Sprengstoff` + `Auslöser` mit Tabelle auf `Sprengstoff & Auslöser` → **eine** Karte (die zweite Entdoppelung, nach Karte).
4. **Die Tabelle ersetzt nie einen Treffer:** Plättchen `Holzzaun`, Tabelle `{ Holzzaun: 'Hohler Heuhaufen' }` → die Karte `Holzzaun` (exakter Name gewinnt); `Doofster-Glocke / Kochtopf` mit der Tabelle `{ 'Doofster-Glocke / Kochtopf': 'Wunschbrunnen' }` → `Doofster-Glocke` (Teil der Seite gewinnt).
5. **Ein zweiseitiges Teil ohne Karte bekommt auch aus der Tabelle keine:** `Wunschbrunnen / Wunschbrunnen (leer)` verdeckt, Tabelle auf den ganzen Namen → keine Karte, `note` (die Karte der Vorderseite neben das verdeckte Teil zu legen wäre die falsche).
6. **Ziel ins Leere:** Tabelle nennt eine Karte, die es nicht gibt → Plättchen steht in der `note`, Gelände und Rest der Reihe liegen, **kein** Fehlschlag.
7. **Form:** Tabelle ist eine Liste, ein Text, `null`, eine Zahl, `{}` → wie ohne Tabelle, **kein Wurf**; Tabelle mit Schlüssel, der kein Asset ist, oder mit `'A/B'` → der Aufbau läuft, `ok` (der Tisch prüft die Tabelle nicht, M29.5).
8. **Vergleich:** `dichter wald 2` (klein) als Schlüssel trifft (`norm`); `Dichter Wald2` nicht; das Ziel `Sprengstoff` trifft **weder** `Sprengstoff & Auslöser` **noch** `SPRENGSTOFF-ZIGARRE` (kein Teilstring: Bibliothek mit beiden Karten, Tabelle `{ Sprengstoff: 'Sprengstoff' }` → `note`).
9. **`faceDown`:** ein Plättchen ohne Schrägstrich, das eine Rückseite hat, verdeckt gelegt, mit Tabelle → dieselbe Karte wie offen.
10. **`final.terrain`** liest dieselbe Tabelle; **ohne `cardZoneLabel`** legt die Tabelle keine Karte und sagt nichts (wie heute).
11. **Monoton:** ein Szenario ohne Plättchen, das die Tabelle trifft, mit einer Tabelle, die es nicht trifft → dieselben Karten (Namen, Reihenfolge) und dasselbe Protokoll wie ohne Tabelle.
12. **Der Kommentar:** `readFileSync('shared/sequenceExecutor.js')` enthält `kein dritter` **nicht**, aber `terrainCards` — der einzige Test dieser Datei, der Quelltext liest (wie `DD`, letzter Test in `szenariodaten-berichtigung-lauf.test.js`).

**Dann** die kleinste Änderung: vor der Schleife `for (const { name, down } of wanted)` die Tabelle lesen (nur ein Objekt, kein Array), eine Hilfsfunktion, die den Schlüssel mit `norm` sucht und das Ziel mit `norm` in `cards` findet, und in der Suche ein dritter Zweig `|| (part === null ? viaTable(name) : null)`.
`validateScenarioData` wird hier **nicht** angefasst (`DL`). **Den Kommentar ersetzen** (der alte steht über `side`/`wanted`, der Satz „Kein Aehnlichkeitsrechner … zwei Versuche, kein dritter und kein Aehnlichkeitsrechner“); neuer Wortlaut, wie im Repo ohne Umlaute:

```
// Die Zuordnung Plaettchen -> Karte hat **drei** Versuche, alle benannt, keiner gerechnet:
//   1. der Name des Plaettchens, exakt (norm: trim, klein);
//   2. bei einem zweiseitigen Teil (`Vorderseite / Rueckseite`) der Teil der Seite, auf der es liegt (M7.6);
//   3. eine **Tabelle**, die ein Mensch geschrieben hat: `scenario_data.terrainCards`
//      (`{ "<Assetname>": "<Kartenname>" }`, M29) - nur fuer Namen ohne Schraegstrich, nur wo 1 und 2 nichts finden.
// Kein Aehnlichkeitsrechner: einer, der "SCHROTKARRE" auf "Schrottkarre" zieht, zieht beim naechsten Deck etwas
// Falsches (M8.3). Die Tabelle rechnet nichts - sie ist eine geschlossene Liste von Paaren, jedes gegen das Bild
// geprueft (M29.1) und von `validateScenarioData` gegen die Bibliothek gehalten; ein Name, der nicht drinsteht,
// bleibt ohne Karte, genau wie vorher. Raten ist eine Funktion des Namens; hier entscheidet eine Zeile in den Daten.
// Am Tisch wird die Bibliothek nicht geprueft: eine fehlende Karte ist ein Vermerk, kein Abbruch (M8.3).
```

**Fertig, wenn:** die zwölf Tests grün sind, `sequence-terrain-cards.test.js` **unverändert** grün ist (kein bestehender Test wird angefasst), `grep -n "kein dritter" shared/sequenceExecutor.js` nichts findet, und `npm test` grün ist.

## DL — Der Prüfer (M29.5)

**Befund.** `validateScenarioData(scenarioData, { assets, grids })` liest `gridLabel` und `bosses`; `terrainCards` kennt sie nicht, `cards` ist kein Parameter, und bei leeren `bosses` kehrt sie früh zurück
(`if (entries.length === 0) return problems;`). M29.5 hat neun Fälle.

**Test zuerst** (`server/test/scenario-data-terrain-cards.test.js`; Helfer aus `scenario-data-validate.test.js` nachbauen, nicht importieren). Rot, solange die Funktion die Tabelle nicht liest:

1. Ohne Schlüssel: `[]` — auch mit `cards`. Mit `terrainCards: {}`: `[]`.
2. Je Zeile der Tabelle in M29.5 **ein** Test mit genau einer Meldung, die den Schlüssel nennt: Wert kein Objekt (Liste, Text, Zahl, `null`); Schlüssel leer; Schlüssel mit `/`; zwei Schlüssel gleich unter `norm` (`'Dichter Wald 2'` und `'dichter wald 2'`);
   Schlüssel ist kein Asset; es gibt eine Karte mit dem Namen des Schlüssels („nie benutzt“); Ziel kein nichtleerer Text; Ziel nicht in der Bibliothek; Ziel in mehreren Karten mit verschiedenem `image_path`.
3. Mehrere Karten gleichen Namens **mit demselben** `image_path` → kein Problem (wie `findCardByName`).
4. **„Kann ich nicht wissen“:** ohne `cards` (oder leer) schweigt sie über Ziele und über „eigener Name“; ohne `assets` über „kein Asset“; mit beidem leer bleiben nur die Formfehler (kein Objekt, leer, `/`, doppelt).
5. **Unabhängig von den Bösewichten:** `{ terrainCards: { 'X': 'Y' } }` ohne `bosses` meldet trotzdem (heute kehrt die Funktion davor zurück).
6. **Jeder Fehler seine Zeile:** drei Fehler → drei Meldungen, keine verschluckt (wie `every mistake gets its own line`).
7. **Die drei Paare aus M29.6** mit den Assets und Karten der Fixture → `[]` (die Fixture hat dieselben 212 Assets und 1 087 Karten wie die Produktion, gemessen).
8. **Unverändert:** alle Tests in `scenario-data-validate.test.js` grün, ohne Änderung; `validateScenarioData(data, { assets, grids })` ohne `cards` verhält sich wie heute.

**Dann:** `cards = []` in die Parameterliste, die Prüfung der Tabelle **vor** dem frühen `return`. Kein neues Modul (`shared/scenarioData.js` hat schon `norm` und `text`). `build_scenario` ruft sie weiter mit `{ gridLabel, bosses: { [key]: entry } }` — **nicht** ändern (Entscheidung 5).

**Fertig, wenn:** die Tests grün sind und `git diff` an `shared/sequenceExecutor.js` für diese Aufgabe leer ist.

## DM — Der Baustein: `scripts/gelaendekarten-zuordnung.mjs`, rein (M29.6, M29.7)

**Befund.** Wie bei M28 `DB`: der Baustein ist **rein** (kein `better-sqlite3`, kein Dateizugriff) und bekommt `scenario_data` als Objekt. Die Tabelle steht **einmal** hier (`ZUORDNUNG`); alle anderen lesen sie.

**Test zuerst** (`server/test/gelaendekarten-zuordnung.test.js`). Grundlage ist `fixtures/auslagen-kurzpartie.json` (`scenarioBefore`, `assets`, `cards`, `grids`) — **nichts** davon wird geschrieben oder geändert; der Test lädt nichts aus dem Netz.

1. **Ausgang (zuerst — ist die Fixture nicht der Ausgangsstand, ist alles Weitere wertlos):** `berichtige(fx.scenarioBefore).next.bosses` hat 15 567 Zeichen, sha256 `f6c1d5f585c0`, und die 20 Einträge haben die Hashes aus M29.6 (`berichtige` aus `scripts/szenariodaten-berichtigung.mjs`, **eingelesen, nicht kopiert**).
2. **Die Tabelle:** `JSON.stringify(ZUORDNUNG)` ist genau `{"Dichter Wald 2":"Dichter Wald","Sprengstoff":"Sprengstoff & Auslöser","Auslöser":"Sprengstoff & Auslöser"}`, 108 Zeichen, `aad39d745984`; `normalize('NFC')` ändert nichts; jedes Ziel ist eine Karte, jeder Schlüssel ein Asset **der Fixture**, genau einmal.
3. **`ergaenze(scenario)`:** hängt `terrainCards` **hinten** an, ändert **keinen** Schlüssel und keinen der 20 Einträge (Hashes), verändert die Eingabe nicht (kein Mutieren); der Text ist der alte ohne die letzte `}` plus `,"terrainCards":…}` (**Präfixbeweis**); das Fragment entfernt ergibt den alten Text (**Rückwärtsbeweis**). Gegentest: ein geändertes Zeichen in einem Eintrag lässt beide Beweise anschlagen.
4. **Einordnung `plane(scenario)`:** Stand ohne Tabelle → `zu-schreiben`; Tabelle gleich (egal welcher Rest) → `schon-da`, `next` ist die Eingabe; Tabelle **anders** (ein Paar fehlt, ein Paar mehr, andere Reihenfolge, anderes Ziel) → `abweichend`, die Meldung nennt beide Texte, `next` nicht gesetzt; **`bosses` nicht der Ausgang** (ein Eintrag geändert) → `abweichend` mit dem Eintragsnamen.
5. **Prüfer:** `pruefeZiel(ziel, { assets, cards, grids })` → `validateScenarioData(…, { assets, grids, cards })` = 0 Probleme, `checkScenarioAspect` meldet nur Bekanntes (`bekannteMeldung` aus dem M28-Skript, eingelesen), und die **40 Läufe** (`durchrechnen` für alle 20 Bösewichte, Kampf und Endkampf, `erwartetAufRaster`) sind sauber (nie `failed`/`skipped` außer Tildas `$SHERIFF is not bound`).
6. **Die Umfangstabelle (M29.1) als Test:** für Ausgang und Ziel dieselben 40 Läufe; je Bösewicht/Lauf stehen in einer Tabelle im Test die **Namen ohne Karte vorher/nachher**, der **`build_scenario`-Status vorher/nachher** (`note → ok` in 13 Läufen, `note → note` in 3, unverändert in 24) und der **Zuwachs der Karten** (Virginia, Red, Barry, Dozy, Umbrello je +1; Handsy +2; Door Knockers und Qing 0). Summe: `ok` 19 → 32, `note` 21 → 8, Vorkämpfe mit `note` 8 → 0, Namensnennungen 50 → 18. Dazu: **monoton** (jede Karte, die vorher lag, liegt nachher, in gleicher Reihenfolge untereinander), Objekte auf dem Raster und die übrigen Protokollzeilen in allen 40 Läufen gleich.
7. **Die nachher noch fehlenden Namen** sind genau die 18 Nennungen aus M29.10 (14 Plättchenarten in acht Endkämpfen) — der Test **listet sie auf**; kommt ein Name dazu oder fällt einer weg, schlägt er an.
8. **`terrainName()`** aus `scripts/szenariodaten-grundspiel.mjs` (eingelesen) liefert für jeden Schlüssel der Tabelle ihr Ziel; die Tabelle ist **NFC**.
9. **Der Ausgangsstand als Konstante:** `AUSGANG = { laenge: 18982, sha: '5eec10582ec8' }` und `ZIEL = { laenge: 19106, sha: '914461d63f77' }` stehen so im Baustein (ein Test hält sie gegen M29.6 fest; rechnen kann ihn nur die Produktion, `DQ`).

**Dann** `scripts/gelaendekarten-zuordnung.mjs`: `ZUORDNUNG`, `AUSGANG`, `ZIEL`, `ergaenze`, `plane`, `beweise`, `pruefeZiel`; **`GAME_ID`, `SETUP_ID`, `saveStateHashes`** aus dem M28-Skript, **`fingerprint`, `durchrechnen`, `erwartetAufRaster`, `pngSize`** aus `szenariodaten-grundspiel.mjs` — eingelesen. Kein `main` hier (`DN`).

**Fertig, wenn:** die Tests grün sind, `terrainName`-Test und NFC-Test stehen, und kein Code aus `szenariodaten-berichtigung.mjs` oder `szenariodaten-grundspiel.mjs` kopiert wurde.

## DN — Das Schreiben: `main`, `--check`, `--write`, `--zurueck` (M29.7)

**Befund.** Vorlage ist `scripts/szenariodaten-berichtigung.mjs` (`main`, `vorpruefung`, `tausche`, `fingerabdruckZeilen`, `zurueck`) und sein Test `server/test/szenariodaten-berichtigung-lauf.test.js` (`DC`/`DD`, Wegwerf-Datenbank mit dem echten Schema). `tausche`
(Vergleich-und-Tausch, `IMMEDIATE`, Fingerabdruck) und `fingerabdruckZeilen` sind dort **nicht exportiert**; sie bekommen ein `export` (ein Wort je Funktion) — **kopiert wird nicht** (M6).

**Test zuerst** (`server/test/gelaendekarten-zuordnung-lauf.test.js`; dieselbe Bauart wie `DC`/`DD`, `frischeDatenbank` nachbauen, Wegwerf-Datenbank aus der Fixture mit `scenario_data = berichtige(fx.scenarioBefore).next`, **dazu** `main(argv, { Database, ausgang })` mit `deps.ausgang` = Länge und Hash **dieser** Spalte — Entscheidung 10). Rot:

1. **`--check` am Ausgangsstand:** schreibgeschützt (Datei unverändert), „zu schreiben“, Plan als Diff (Schlüssel `terrainCards`, 124 Zeichen), Beweise `ja`, `validateScenarioData: 0 Probleme`, 40 Läufe sauber, **kein** „würde schreiben“ bei einem Fehler, Rückgabe 0.
2. **`--check`, abweichende Tabelle in der Spalte:** Rückgabe 1, die Meldung nennt beide Texte; **anderer Stand ohne Tabelle** (ein Eintrag geändert, oder ein Schlüssel mehr): Rückgabe 1, Meldung mit Zeichenzahl und Hash.
3. **`--check` am Zielstand:** „schon geschrieben“, Rückgabe 0 — **auch** wenn der Rest der Spalte sich seither geändert hat.
4. **Nicht kompaktes JSON** in der Spalte → Beanstandung (der Vergleich ist byteweise); **ein Aufbau eines anderen Spiels** wird nicht angefasst.
5. **`--json`** druckt die Tabelle samt `AUSGANG`/`ZIEL`, ohne Datenbank; **`--force`** ist ein Benutzungsfehler (Rückgabe 2), nichts geschrieben.
6. **`--write` am Ausgangsstand:** schreibt genau den Zielstand und **nur** `scenario_data` (alle anderen Spalten der Zeile, `updated_at` eingeschlossen, gleich); Kontrollausgabe **neu gelesen** (Zeichen, Hash vorher → nachher, je Schlüssel `gleich`/`neu`, je Eintrag `gleich`, Beweise, Prüfer, Fingerabdruck).
7. **Zweiter Lauf schreibt nichts** („schon geschrieben“, Spalte byteweise gleich); **abweichender Stand** bricht ab, **bevor** geschrieben wird.
8. **Vergleich-und-Tausch:** ändert sich die Spalte zwischen Lesen und Schreiben (`deps.haken('nach-lesen')`), trifft das `UPDATE` keine Zeile, die Transaktion bricht ab, die fremde Änderung bleibt.
9. **`IMMEDIATE`:** die Schreibsperre ist da, bevor der Fingerabdruck genommen wird; ändert sich in der Transaktion eine Zeile von `save_states`, weicht der Fingerabdruck ab — Rollback, Meldung nennt die Zeile beim Namen; eine Änderung **vor** der Transaktion (Auto Save) ist kein Fehler.
10. **Sicherung:** ohne `--sicherung-sha`, mit einem falschen, mit einem zu kurzen schreibt `--write` nicht und sagt warum; **die M28-Sicherung (Stand vor M28) wird abgelehnt.**
11. **`--zurueck`** stellt am Zielstand den gesicherten Text her (Hash gleich dem Ausgang); weigert sich, wenn der Stand **nicht** der Zielstand ist; prüft die Sicherung (Hash zum Text, Text = Ausgangsstand von M29, kompakt); ein zweiter Lauf: „Ausgangsstand“.
12. **Das Zusammenspiel mit M28:** nach `--write` meldet M28s `main(['--check', db])` weiter „7 schon berichtigt“ (Rückgabe 0), und M28s `--zurueck` weigert sich (der Stand ist nicht sein Zielstand) — der Test hält die Rückweg-Reihenfolge fest.
13. **Der Quelltext** enthält kein `--force` (außer im Benutzungstext, wie bei `DD`) und schreibt nur `scenario_data` (`update setups set scenario_data`, sonst kein `update`/`insert`/`delete`).

**Dann** `main`, `vorpruefung`, `trockenlauf`, `schreiben`, `zurueck` im Skript — nur das, was sich vom M28-Skript unterscheidet (die Einordnung nach M29.7, kein `--ohne-z1`, keine Einträge-Liste).

**Fertig, wenn:** die Tests grün sind, die Tests von M28 **unverändert** grün sind (nur `export` kam dazu), und die Ausgabe von `--check` auf der Fixture sich gegen M29.1 und M29.6 lesen lässt.

## DO — Der Rauchtest (M29.9)

**Befund.** Der Rauchtest läuft lesend gegen die Produktion. `bekannt()` ist ein Ausdruck auf den allgemeinen Wortlaut; er lässt jedes Plättchen ohne Karte durch. Fiele die Tabelle aus, bliebe er grün. Der bestehende Test `CZ` in
`server/test/auslagen-daten.test.js` (Zeile ≈ 596) fährt `rauchtest(db)` auf einer Wegwerf-Datenbank **ohne** Tabelle und erwartet `problems = []`.

**Test zuerst** (`server/test/auslagen-daten.test.js`, bei `CZ`; kein neues Test-File, `frischeDatenbank` und `lauf` gibt es dort):

1. **Mit Tabelle:** Wegwerf-Datenbank wie `CZ`, aber nach `--write` auch `ergaenze` in die Spalte → `rauchtest(db).problems` ist `[]`, die Ausgabe hat die Zeile von **Abschnitt 0** (Tabelle da, Prüfer 0 Probleme), und sie ändert sich nach M29.9: Virginia Vorkampf `ohne ok: 0`, Virginia Endkampf nennt nur die fünf Grabhügel, Qing & Kween `0`, Barry Bluff `ohne ok: 4`, die Handsy-Zeile besteht den bestehenden Ausdruck (`bekannte Hinweise: [1-9]`).
2. **Ohne Tabelle schlägt der Rauchtest an:** dieselbe Datenbank ohne `terrainCards` → eine Beanstandung aus Abschnitt 0 und **eine je Lauf**, in dem eines der drei Plättchen namentlich ohne Karte steht (Sperre).
3. **Die Sperre in Isolation:** `bekannt('Virginia Fitz', { type: 'build_scenario', status: 'note', reason: '… no terrain card in this library (nothing to do): "Dichter Wald 2"' })` → `false`; dasselbe mit `"Grabhügel / Grabhügel ausgehoben (14)"` → `true`; mit `"Auslöser", "Grabhügel …"` zusammen → `false`.
4. **Eine fehlerhafte Tabelle** (Ziel, das es nicht gibt) → Beanstandung aus Abschnitt 0, Name des Schlüssels in der Meldung.
5. **Alles Übrige unverändert:** die Tests `CZ` (beide) bleiben bis auf die Tabelle in der Wegwerf-Datenbank, wie sie sind.

**Dann** in `scripts/auslagen-rauchtest.mjs`: Abschnitt 0 (`env.scenarioData.terrainCards` gleich der Tabelle aus `scripts/gelaendekarten-zuordnung.mjs`, eingelesen; `validateScenarioData(env.scenarioData, { assets, grids, cards })` = `[]`), in `bekannt()` die Sperre (die Schlüssel der Tabelle, als `"<Name>"` im `reason` gesucht), und das Zusammenführen von `plaettchen()` bleibt. `bekannt()` ändert sich **nicht** im allgemeinen Ausdruck.

**Fertig, wenn:** die Tests grün sind, `node scripts/auslagen-rauchtest.mjs` gegen die Fixture-Datenbank (Test 1) die Zeilen aus M29.9 zeigt und `CZ` wie vorher besteht.

## DP — Deploy (M29.8, Schritte 1–3)

**Befund.** Der Executor liegt in **beiden** Images. Ein Deploy ändert **nichts Sichtbares** (gemessen: neuer Executor ohne Schlüssel = dieselbe Rauchtest-Ausgabe); er ist die Voraussetzung dafür, dass das Schreiben der **eine** Schalter ist. Nichts wird in die Spalte geschrieben.

**Vorher fragen:** **spielt gerade jemand?** Der Deploy legt Container neu an (Datenbank und Uploads liegen in Named Volumes und bleiben); `docker compose up -d --build` baut zwei Images.

**Schritte** (kein Test — jeder Schritt hat seinen Beleg):

1. Alle Tests von `DK`–`DO` grün; die Änderungen sind auf `origin/master` (der Auftraggeber committet und pusht; der Agent nicht).
2. **Rauchtest `vorher`:** die Fassung von `auslagen-rauchtest.mjs`, die **jetzt** auf der VM liegt (M28, `docker exec card-game-engine-backend ls /app`), gegen die Produktion laufen lassen; Ausgabe **und** die Datei selbst (`docker cp` heraus) ins Scratchpad. (`ssh … "docker exec -w /app card-game-engine-backend node /app/auslagen-rauchtest.mjs /app/data/card-game-engine.db"`.) Erwartet: 0 Beanstandungen.
3. **Deploy:** `cd /opt/card-game-engine && git reset --hard origin/master && docker compose up -d --build`.
4. **Belege:** (a) `docker exec card-game-engine-backend sha256sum /shared/sequenceExecutor.js` = der Hash der Datei im Repo; (b) **das Frontend-Bundle** enthält `terrainCards` (`docker exec card-game-engine-frontend sh -c 'grep -lc terrainCards /usr/share/nginx/html/assets/*.js'` — Pfad prüfen; es ist ein Bündel, kein Quelltext); (c) die Skripte **neu in den Container** (`docker cp`, Rezept in `docs/datenzugriff.md`), und **derselbe alte Rauchtest wie in Schritt 2** → `diff` der beiden Ausgaben **leer**.
5. Stimmt (c) nicht: **nicht weiter.** Den Deploy zurücknehmen (`git revert`, Rebuild) — die Spalte ist unberührt.

**Fertig, wenn:** (a)–(c) belegt sind und die Ausgabe der Schritte im Scratchpad liegt. **Wenn der Auftraggeber „nicht jetzt“ sagt, bleibt `DP` offen** — `DQ` darf vorher laufen (lesen), `DR` nicht.

## DQ — Produktion lesen, Sicherung, Trockenlauf, Frage (M29.7 Nr. 1, 4; M29.8 Schritt 4 vorn)

**Befund.** Der Zielstand ist aus einer Kopie des Ausgangsstandes erzeugt; ob die **heutige** Produktion noch der Ausgangsstand ist, sagt nur das Lesen. Das Skript schreibt nichts.

**Schritte:**

1. **Lesen** (Rezept in `docs/datenzugriff.md`): `scenario_data` roh, Länge, sha256, Schlüsselreihenfolge, die fünf Schlüssel-Hashes, die 20 Eintrags-Hashes; **gegen M29.6**. Weicht etwas ab, **stopp** und dem Auftraggeber sagen — es wird nicht „nachgezogen“.
2. **Sicherung ins Scratchpad** (nicht ins Repo): `{ scenario_data, sha256, updated_at }` als `scenario_data.M29-vorher.json`, dazu je Zeile von `save_states` ein Hash. **Die M28-Sicherung nicht benutzen.**
3. **`--check`** (schreibgeschützt, im Container; Skripte `gelaendekarten-zuordnung.mjs`, `szenariodaten-berichtigung.mjs`, `szenariodaten-grundspiel.mjs` nach `/app/`): die Ausgabe wird **gegen M29.1 (Umfang) und M29.6 (Zielstand) gelesen** — 40 Läufe, `ok` 32 / `note` 8, 18 Nennungen, `19 106` Zeichen, `914461d63f77`.
4. **Frage an den Auftraggeber:** ist ein **Setup-Editor** (`?mode=setup`) offen oder war einer nach 2026-11-08 offen? Ein Editor, der vor dem Schreiben geöffnet wurde, stellt beim Speichern den alten Text wieder her und nähme **auch M28** zurück (`docs/datenzugriff.md`, „Fallen“). Der Server sieht es nicht.

**Fertig, wenn:** Sicherung und `--check` im Scratchpad liegen und die Antwort auf Frage 4 da ist. **`DR` beginnt erst danach.**

## DR — Schreiben und Kontrolle (M29.7, M29.8 Schritte 4–5)

**Voraussetzung:** `DP` ist fertig, `DQ` ist fertig, die Antwort auf die Editor-Frage ist „nein“ (oder der Auftraggeber hat den Editor geschlossen, ohne zu speichern).

**Schritte:**

1. **`--write … --sicherung-sha <sha256 der Sicherung aus DQ>`**, in einer `IMMEDIATE`-Transaktion; Kontrollausgabe **neu gelesen**: Länge **18 982 → 19 106**, sha `5eec10582ec8` → **`914461d63f77`**; `terrainCards` 108 Zeichen / `aad39d745984`; fünf Schlüssel und 20 Einträge „gleich“; Beweise; `validateScenarioData` auf der gelesenen Spalte 0 Probleme; Fingerabdruck (alle Tabellen außer `setups.scenario_data`, jede Zeile von `save_states`) gleich.
2. **Zweiter Lauf:** „schon geschrieben“, schreibt nichts.
3. **Der neue Rauchtest** (`DO`) gegen die Produktion: 0 Beanstandungen, Abschnitt 0 sauber; seine Ausgabe gegen die aus `DP` (Schritt 2) **mit `diff`** — der Unterschied ist **genau** die Tabelle in M29.9 (16 Zeilen in Abschnitt 2, zwei in Abschnitt 1), nicht mehr, nicht weniger.
4. **40 Läufe an der Produktion** (der Baustein druckt sie; oder `DM`s Messung gegen die gelesenen Daten): `ok` 32, `note` 8, Vorkämpfe mit `note` 0, 18 Namensnennungen; Karten je Lauf wie M29.1.
5. **M28s `--check`** (ohne `--write`!) → „7 schon berichtigt“.
6. **Am Ende des Tages** beide `--check` wiederholen; meldet eines, dass etwas fehlt, hat ein Editor zurückgeschrieben — dann `DR` wiederholen (M29 und M28 prüfen).

**Wenn etwas nicht stimmt:** `--zurueck <Sicherung> <db>` (nur der exakte Zielstand wird ersetzt). Nichts anderes anfassen; **kein `--force`.**

**Fertig, wenn:** 1–5 belegt sind und das Ergebnis (mit den gelesenen Zahlen) im Scratchpad liegt.

## DS — Dokumente nachziehen (M29)

**Test:** keiner (Dokumente) — Prüfung ist das Lesen. **Zu ändern:**

1. **`CLAUDE.md`:** der Absatz **„Gelände-Zuordnung (M29)“** unter „Laufende Arbeit“ (nach M28) steht schon; **„Stand“** am Ende ergänzen (geschrieben, Zahlen aus `DR`, oder „offen: DP/DR“).
2. **`docs/spec-setup-system.md`:** am Ende von M29 ein Abschnitt **„M29 — gebaut, und was die Spec dabei berichtigt“** (nummeriert **ab 21**, fortlaufend nach `tasks-kartenzuordnung.md`, „Wo die Spec nicht stimmt“, 1–20): die gelesenen Zahlen aus `DR`, jede Abweichung der Messung an gebautem Code gegen den Prototyp (Nr. 20), und was offen blieb.
3. **`docs/szenariodaten-grundspiel.md`** §6.4 („nur `Dichter Wald 2` … dort fehlt die Wald-Karte … nicht behoben“) und §9.10 (`Sprengstoff`/`Auslöser`, `Dichter Wald 2`) sowie **`docs/szenariodaten-erweiterung.md`** 8.7 (die Tabelle mit `Sprengstoff`, `Auslöser`, `Dichter Wald 2`, „Harmlos — die Meldung ist Rauschen“): je ein **Nachtrag** „behoben mit M29“ — **nicht** umschreiben, der Befund bleibt als Befund.
4. **`docs/datenzugriff.md`:** unter „Fallen“ ein Satz: **der Executor läuft auch im Frontend-Bundle** (`GameTable.jsx`); wer ihn ändert, deployt beide Images, und ein neu angelegter Container hat die Skripte aus `/app` nicht mehr. Und unter dem Rezept die neue Liste der Skripte, die nach `/app/` gehören.
5. **`docs/spec-setup-system.md` M8.3 / `szenariodaten-erweiterung.md` 8.9:** der Kategoriename `Gelände (Üble Nachbarn)` → `Gelände (Neue Nachbarn)` mit einem Satz „heute so benannt“ (Nr. 7 oben) — als Hinweis, nicht als Umschreiben.

**Fertig, wenn:** ein Leser, der nur `CLAUDE.md` kennt, `docs/tasks-kartenzuordnung.md` und M29 findet, und in keinem Dokument mehr steht, `Dichter Wald 2`/`Sprengstoff`/`Auslöser` fänden keine Karte, ohne dass M29 danebensteht.

## DT — Der Auftraggeber sieht es am Tisch (M29, Abnahme 13)

**Kein Agent.** Der Browser-Bereich ist nicht angemeldet, und Anmelden ist nicht zulässig. Eine Prüfliste von Hand, **nach** `DR`:

1. **Tisch neu laden** (ein Tisch, der vor dem Schreiben offen war, hat die alten Szenariodaten im Zustand).
2. **Handsy:** „Kampf beginnen“ gegen Handsy — Geländekarten-Reihe mit **7** Karten, darunter `Dichter Wald` und **eine** `Sprengstoff & Auslöser` (vorher 5, ohne beide). Protokoll von `build_scenario`: `ok`, **kein** Hinweis auf die drei Namen.
3. **Lawman Dozy:** 7 Karten, `Dichter Wald` dabei (vorher 6).
4. **Qing & Kween** (und, wenn er dran ist, **The Door Knockers**): genau **eine** Waldkarte, nicht zwei; Protokoll `ok`.
5. **Virginia Fitz:** `Sprengstoff & Auslöser` zwischen `Werkzeugschuppen` und `Bärenfalle`; im **Endkampf** nur noch die fünf Grabhügel im Hinweis.
6. **Ein Kampf, der sich nicht ändern soll** (z. B. Deputy Waggums, Ernie Offal): Reihe und Protokoll wie vorher.
7. **Rückweg bekannt:** `--zurueck` ist ein Befehl (`DR`), falls etwas nicht stimmt; das Ergebnis dieser Liste geht an den Auftraggeber, nicht an einen Agenten.

**Fertig, wenn:** der Auftraggeber Punkt 1–6 abgehakt oder einen Befund genannt hat.
