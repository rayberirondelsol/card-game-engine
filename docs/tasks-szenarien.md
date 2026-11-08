# Aufgaben: Die elf ersten Szenarien nach dem Tableau berichtigen (Spec M28)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M28** — dort stehen Messverfahren, das
Urteil über jede Behauptung aus §11, die Änderung als Tabelle mit Hashes, und die Antworten auf
die fünf Fragen. Datengrundlage: `docs/szenariodaten-grundspiel.md` §11 (der Befund, **nicht**
die Wahrheit), `docs/szenariodaten-erweiterung.md` (wie die acht erfasst wurden),
`docs/datenzugriff.md` (Pflicht, bevor Produktionsdaten auch nur gelesen werden). Vorgeschichte:
`docs/tasks-auslagen.md` (M27, `CO`–`DA`).

**Aufgabenbuchstaben.** Mit **`DB`** geht es nach `DA` (`docs/tasks-auslagen.md`) weiter. Geprüft:
`DB`–`DJ` sind in keiner `docs/tasks-*.md` vergeben.

**Reihenfolge.** `DB` → `DC` → `DD` (Baustein, Trockenlauf, Schreiben — alles gegen eine
**Fixture**, ohne Produktion) → **`DE`** (Produktion lesen, Sicherung, Frage an den Auftraggeber) →
`DF` (Trockenlauf an der Produktion) → **`DG`** (schreiben) → `DH` (Dokumente) → `DI` (der
Auftraggeber sieht es am Tisch). `DJ` ist unabhängig und darf jederzeit. **Es gibt keinen Deploy:**
M28 ändert keine Zeile Code in `shared/`, `client/` oder `server/src/`; die Daten gelten ab dem
Schreiben (wie bei `szenariodaten-grundspiel.mjs`). Das Skript läuft im Backend-Container, wo
`better-sqlite3` und `/shared` liegen (`docs/datenzugriff.md`).

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die ihn grün macht.
Tests: `cd server && npm test` (Stand vorher, 2026-11-08: **1555**, alle grün). Es gibt **eine**
Stelle je Sache (M6): die Änderungsliste steht einmal im Baustein, Trockenlauf, Schreiben und Test
lesen dieselbe. Datenänderungen gegen Spiel `072123c0-cd97-4ffb-a330-369630fab93f`, Aufbau
`b1e10f4e-b8f2-4c2a-bb3e-54643944121b`: **nur** `setups.scenario_data` wird gelesen und
geschrieben — **nie** `zone_data`, `action_data`, `grid_data`, `sequence_data`, `state_data`,
`save_states`, `updated_at`. Erst Trockenlauf, dann `db.transaction`, dann Kontrollausgabe,
**vorher** eine Sicherung ins **Scratchpad, nicht ins Repo**. Zugang zur Produktion:
`ssh -o UserKnownHostsFile=<Scratchpad>/known_hosts -o StrictHostKeyChecking=yes -o BatchMode=yes
root@192.168.178.96` (die `known_hosts` des Nutzers ist veraltet und bleibt unberührt, `docs/datenzugriff.md`);
Python auf diesem Rechner ist `py`, nicht `python3`.

---

## Wo die Spec nicht stimmt

Vierzehn Stellen, an denen `szenariodaten-grundspiel.md` §11, die älteren Dokumente oder der Auftrag
vom 2026-11-08 beim Nachmessen nicht zutrafen. Die Nummern 1–4 ändern, was geschrieben wird; die übrigen
ändern, was **gelesen** werden muss.

1. **§11 irrt bei The Door Knockers, rechter Wald (`M1:S4`).** §11: „trägt `Dichter Wald 2`, ohne dass das
   Bild mit einer der beiden Varianten übereinstimmt (0,05) — unklar“. Gemessen: `Dichter Wald 2` **0,50**
   (Spitze 0,79), `Dichter Wald` 0,02, und der Kachelrahmen deckt den Bereich. **Der Eintrag ist richtig und
   bleibt.** §11 bekommt eine Berichtigung (`DH`). Die einzige der 22 Behauptungen, die nicht stand.
2. **§11 sagt bei Ernie „linker Zaun stimmt“ und im selben Absatz, er habe die falsche Richtung.** Die
   *Position* stimmt (G7:G10), die *Drehung* nicht (270, nicht 90). Und §11 nennt „die Schrottkarre stimmt“,
   aber das Tableau zeigt sie **gespiegelt** (M28.1, Z3) — durch keine Drehung darstellbar, bleibt unverändert.
3. **§11 sagt bei den Bundits nichts zur Drehung der Zäune.** Der L-Zaun braucht 270 (0,60 gegen 0,11 bei 90),
   der P-Zaun bleibt 90 (0,28 gegen 0,09; schwach). Wer nur die Zeile liest, verschiebt beide Zäune und lässt sie
   falsch herum liegen.
4. **`EG5` steht bei Virginia zweimal in den Daten** — in `final.terrain[4].cells` (das Grabhügel-Plättchen) und
   in `final.fields.EG[4]`. §11 nennt „EG5 `Q14` → `R14`“; ändert man nur das Feld, liegt das Plättchen beim
   nächsten Endkampf neben dem FF-Kasten und `$EG5` zeigt woandershin. **Beide ändern**, und ein Test prüft, dass
   Plättchen und Feld dasselbe nennen.
5. **Die Zahlen aus §11 sind nicht meine Zahlen.** Wo beide vorkommen, weichen sie ab (Virginia, Wald 2 bei `A4:G7`:
   §11 0,43, hier 0,70; Bundits-Zaun 0,37 gegen 0,60 — andere Vorlage, andere Entzerrung). Das Urteil ist in 21 von 22
   Fällen dasselbe. Wer die Zahlen aus §11 in einen Test schreibt, schreibt eine Messung eines anderen Verfahrens.
6. **„Fünf falsche Drehungen“ (Auftrag) sind vier in §11 und neun in M28.** §11 nennt je eine bei Red Atrocious,
   Barry Bluff, Ms. Falls und Door Knockers = **vier**. Dazu kommen Virginia-Schuppen, Bundits-Farmhaus, Ernies
   linker Zaun (alle drei in §11 unter „Farmhaus/Schuppen/Zaun“), der Bundits-L-Zaun (Nr. 3) und Ms. Falls'
   Wäscheleine (Z1, nicht in §11): **neun** (siebenmal 270, zweimal 180).
7. **`docs/szenariodaten-erweiterung.md` §5.2 und §5.5 sind falsch.** §5.2: die Waldvarianten seien „auf dem
   Tableaubild nicht zu unterscheiden“; gemessen trennen sie 0,50–0,84 von höchstens 0,04, und Red Atrocious
   ist genau deshalb vertauscht, Door Knockers nur zufällig richtig. §5.5: die Drehrichtung sei „entweder
   symmetrisch oder am Artwork ablesbar“ — falsch bei Barry (Fluss), Red (Wald), Ms. Falls (Wäscheleine),
   den Bundits (Zaun). **Und das Verfahren ist das zu grobe:** „Tiefpunktsuche mit fester Teilung 19 × 14“ kennt
   keine Perspektive, vier der acht Tableaus von damals sind Fotos. Die Fehler häufen sich dort (M28.1, Z7).
8. **`szenariodaten-grundspiel.md` §6.7 unterschätzt die Korrelation.** „0,2–0,4 ist bei Teilen, die das Tableau neu
   zeichnet, kein Beleg“ — gemessen ist es einer, wenn man den **Abstand zur zweitbesten Drehung** liest, nicht den
   Absolutwert: das Plumpsklo liegt in allen fünf Tableaus bei 0,24–0,41 mit zweitbester ≤ 0,05 um 180° gedreht.
9. **`szenariodaten-grundspiel.md` §12 sagt „`save_states` (17 benannte Spielstände …)“.** Es sind **17 Zeilen**, davon
   2 *Auto Save* und **9 aus zwei anderen Spielen** (alle ohne `setup_id`); zu diesem Spiel gehören **8**, benannt sind
   sieben, davon **5** mit `setup_id` (Auto Save mitgezählt). Die Aussage „unangetastet“ stimmt; die Zahl nicht.
10. **`szenariodaten-grundspiel.md` §6.5: „gegenüber dem Artwork vertauscht“** ist ungenau. Vertauscht ist der
    **Assetname gegenüber der Bedeutung des Wortes**: `Sprengstoff` zeigt den Kasten, `Auslöser` das Dynamit. Das
    *Artwork* (Bild) ist eindeutig, und die Einträge richten sich danach (M28.4).
11. **Der Prüfer sieht von den sieben Fehlerarten genau eine** (Seitenverhältnis, Ernies Foodtruck 19 %). Versatz um
    ein Feld, Drehung, Variante, fehlende Plättchen sieht kein Prüfer im Repo — deshalb `DJ`.
12. **Die Fixture `server/test/fixtures/auslagen-kurzpartie.json` reicht als Testgrundlage.** Sie hält `scenarioBefore`
    (die 20 Einträge, **byteweise gleich** der Produktion von heute: `bosses` 15 263 Zeichen, geprüft), alle 212 Assets,
    alle 1 087 Karten, die Zonen und das Raster. Kein Test braucht das Netz oder die Produktion, und `DB` darf sich auf
    `scenarioBefore` verlassen. **Aber:** die Fixture hat *vor* M27 gelesene `scenarioBefore` ohne `options` — der
    Ausgangsstand der Produktion ist 18 678 Zeichen, die Fixture-Spalte 17 743 (ohne `options`, mit dem alten `villagers`); der Test arbeitet
    auf `bosses`.
13. **`scripts/szenariodaten-grundspiel.mjs` beweist „der alte Text von `bosses` ist Präfix des neuen“.** Dieser Beweis gilt
    hier nicht (es wird nichts angehängt, es wird geändert). Der Ersatz ist der **Rückwärtsbeweis** (M28.6, Punkt 3).
    Wer den Präfixbeweis kopiert, schreibt einen Beweis, der bei jeder echten Berichtigung scheitert.
14. **Der Setup-Editor schreibt `scenario_data` aus seinem Zustand zurück** (`GameTable.jsx` `saveSetup`). Das ist keine
    Abweichung der Spec, sondern eine, die niemand im Auftrag genannt hat: eine vor M28 geöffnete Editor-Sitzung hebt
    M28 beim nächsten Speichern still auf. Gegenmaßnahme: `DE` fragt, `DG` prüft am Ende des Tages nach.

## Entscheidungen

Entschieden hat der Auftraggeber (2026-11-08) nur: **die elf werden berichtigt, die neun nicht.** Der Rest
steht hier mit Begründung; wo er die Entscheidung kippen will, ist der Satz **Umkehr** der Preis.

1. **Ein Lauf, alle sieben Einträge, eine Transaktion** (M28.7). *Umkehr:* gestaffelt (z. B. Ernie allein zuerst)
   heißt eine Zielliste mit eigenen Hashes, kein Schalter im Skript.
2. **Kein Deploy.** Nur Daten; derselbe Weg wie `szenariodaten-grundspiel.mjs`. Der Executor im Container ist der im
   Repo (`DE` prüft den Hash von `shared/sequenceExecutor.js`).
3. **Bärenfalle bei Virginia `E11`:** Vorderseite, keine Drehung — wie Pepin K12 und Qing L5. Das Tableau zeigt die
   Falle halb zugeschnappt, was der Rückseite um 180° entspricht, aber „welche Seite der Tisch als scharf liest, ist nicht
   entscheidbar“ (`szenariodaten-grundspiel.md` §6.6), und **drei** Einträge mit derselben Unsicherheit sind ein
   Unfall, drei verschiedene sind drei Unfälle. *Umkehr:* `faceDown: true`, `rotation: 180` — alle drei auf einmal.
4. **Z1 (Wäscheleine, Ms. Falls) ist drin, einzeln abwählbar.** Entschieden nach der Reihenfolge der Kleidungsstücke
   (Hose, Hemd, Kleid von oben), die Korrelation (0,20 gegen 0,03) ist schwach. Wer die Regel „nicht entscheidbar
   → nicht ändern“ streng liest, streicht sie; dann gelten die zweiten Zahlen aus M28.2 (`18 981` Zeichen, `0fd820c8b8b8`,
   Falls `78204866a9de`).
5. **Die quadratischen Plättchen mit gedrehtem Bild bleiben** (18 sicher, 7 vermutet; M28.1, Z4). Sie sind die Klasse aus
   `szenariodaten-grundspiel.md` §6.7 und waren nicht der Auftrag; sie zu ändern wären bis zu 25 Zeilen in zehn Einträgen,
   ohne dass das Spiel anders liefe. *Umkehr:* eigener Auftrag — mit der Vorfrage, ob an den Daten oder am Asset
   (das Plumpsklo liegt überall um 180°).
6. **Keine Spiegelung** (Ernies Schrottkarre). Ein Feld für einen einzelnen Wagen ist es nicht wert.
7. **Die drei neuen Einfeldplättchen als Bereich `H7:H7`,** nicht `H7`: wie Red Atrocious und Barry Bluff, und die Assets
   sind 47 × 48, 47 × 46, 48 × 49 groß (TTS) und sollen auf dem Tisch ein Feld füllen. Die Einträge der neun benutzen
   die andere Schreibweise (`N3`); beide sind gültig, M7.1 Regel 1.
8. **Die gespeicherten Partien werden nicht migriert** (M28.3). *Partie 14* zeigt weiter das Brett, auf dem sie gespielt
   wurde. *Umkehr:* `state_data` Token für Token umschreiben — eigener Auftrag, mit eigenem Beweis.
9. **Fremde Änderung → Abbruch, ohne Schalter.** Jeder der sieben Einträge muss **genau** der erwartete Text sein
   (oder schon das Ergebnis). Ein `--force` gibt es nicht und kommt nicht dazu. `--zurueck` ersetzt nur den **exakten**
   Zielstand.
10. **Neue Einträge hinten an `terrain`, der Zaun-Eintrag bei Ernie wird geteilt, nichts wird umsortiert.** Die Reihenfolge
    der Geländekarten in der Auslage folgt der Reihenfolge der Gelände; was schon da ist, behält seinen Platz.
11. **Die Änderung steht als Liste `{ eintrag, pfad, alt, neu }`, jede mit ihrem erwarteten alten Wert.** Zusätzlich zum
    Hash des ganzen Eintrags: jede Einzeländerung prüft ihren eigenen `alt`-Wert und nennt bei Abweichung den Pfad.
    So meldet ein Fehler „Ernie Offal `terrain[2].cells[0]` ist `M3:M3`, erwartet `N3:N3` oder schon `N3:N3`“ statt
    „Hash passt nicht“.
12. **Die Messwerkzeuge kommen ins Repo (`DJ`), die Messdaten nicht.** M27 hat das schon als Mangel festgehalten
    (`docs/tasks-auslagen.md`, „Wo die Spec nicht stimmt“, 2b: die Messdateien lagen nur in einem Kratzverzeichnis).
    Das Werkzeug ist Python mit OpenCV; die Tests laufen ohne Python.

---

## DB — Der Baustein: `scripts/szenariodaten-berichtigung.mjs`, rein (M28.2, M28.5)

**Befund.** Spec M28.2: sieben Einträge, jede Änderung als `{ eintrag, pfad, alt, neu }`; der Zielstand ist als Text und
als Hash je Eintrag festgelegt. Der Baustein ist **rein** — kein `better-sqlite3`, kein Dateizugriff; er bekommt
`scenario_data` als Objekt und gibt ein Objekt zurück. Die Form folgt `scripts/szenariodaten-grundspiel.mjs`
(`patchScenario`, `beweiseUnveraendert`, `durchrechnen`), und `durchrechnen` und `erwartetAufRaster` werden **von dort
eingelesen, nicht kopiert** (M6).

**Test zuerst** (`server/test/szenariodaten-berichtigung.test.js`, die Datei gibt es noch nicht). Grundlage ist die Fixture
`server/test/fixtures/auslagen-kurzpartie.json` (`scenarioBefore`, `assets`, `cards`, `zones`, `grids`); der Test lädt
nichts aus dem Netz.

- **Ausgang:** `scenarioBefore.bosses` hat 15 263 Zeichen und sha256 `8c8666618388` (der Produktionsstand von heute), die sieben Einträge darin haben die `ALT_SHA` aus M28.2 (sha256 des kompakten
  `JSON.stringify`, 12 Stellen: Ernie `f70452263c32`, Virginia `3856872a71ea`, Bundits `0bd09089d250`, Red `50839293ad24`,
  Barry `f2a12ec7c71b`, Falls `84e18b1486e2`, Door Knockers `163ddc7225d6`). **Ist das nicht so, ist die Fixture nicht der
  Ausgangsstand, und alles Weitere ist wertlos** — dieser Test steht an erster Stelle.
- **Ziel:** `berichtige(scenarioBefore)` liefert einen `bosses`-Text von 15 567 Zeichen (`f6c1d5f585c0`) und für jeden der sieben den `NEU_SHA` aus M28.2 (`26f455032580`,
  `0e8f97427d33`, `909beab802e5`, `dfc3c087210f`, `ebeedd302fda`, `80a78f3a8e4d`, `e7ea86b2cdb1`), die 13 übrigen Einträge
  und jeden anderen Schlüssel **byteweise unverändert**, die Reihenfolge der Einträge in `bosses` gleich.
- **Rückwärtsbeweis:** im Ergebnis jeden der sieben Einträge durch seinen alten Text ersetzen → der Text von `bosses` gleicht
  dem Ausgang **Zeichen für Zeichen**. Und ein Gegentest: ändert man *ein* Zeichen in einem der 13 anderen, schlägt der Beweis an.
- **Je Behauptung, die in M28.1 steht, eine Zeile** (Beleg: die Nummer der Tabelle in einem Kommentar): Ernie `B` = `K5:L6`,
  `D` = `["I6","O6","I7","N7","L10"]`, Foodtruck `I1:M3`, Fass `N3:N3`, Kochtopf `K7:L8` (`faceDown` bleibt), Maisfeld `K11:O13`,
  **zwei** Zaun-Einträge (`G7:G10` mit 270, `O7:O10` mit 90); Virginia: Wald 2 an `A4:G7`, Wald an `M9:S12`, Schuppen 270,
  drei angehängte Einträge, **`final.terrain[4].cells` und `final.fields.EG[4]` beide `R14`**; Bundits: Farmhaus 270, L-Zaun
  `L9:L12`/270, P-Zaun `P9:P12`/90, Plumpsklo `I11:J12`; Red: `P4:S10` = Wald 2/90, `A7:D13` = Wald/270; Barry: Fluss 270;
  Falls: Farmhaus 180, Wäscheleine 270 (Z1); Door Knockers: Farmhaus 180 — und **Door Knockers' `terrain[1]` ist weiter
  `Dichter Wald 2` an `M1:S4`** (Behauptung 22, widerlegt: der Test hält fest, dass der Eintrag *nicht* angefasst wird).
- **„Nach dem Bild, nicht nach dem Namen“:** an `H7` steht `Auslöser`, an `Q5` `Sprengstoff` (M28.4). Der Kommentar nennt den
  Grund; ohne ihn sieht ein Leser zwei Namen, die sich „richtig“ vertauschen ließen.
- **Prüfer:** `validateScenarioData(ziel, { assets, grids })` = **0 Probleme**; `checkScenarioAspect` (Bildmaße der 38
  Gelände-Assets aus der Fixture, falls vorhanden — sonst ein synthetischer Satz mit dem Seitenverhältnis des Foodtrucks
  1,65) meldet **nicht** mehr den Foodtruck.
- **22 Läufe** `durchrechnen(boss, …, final)` mit Zielstand: `build_scenario` ist `ok` oder `note` (nie `failed`/`skipped`), die
  Objektzahl auf dem Raster gleicht `erwartetAufRaster`; Virginia 13/18, Bundits 12/13, Ernie 12/12; nur Tildas
  `$SHERIFF is not bound` ist ein gewolltes `skipped`.
- **Vorbedingung je Änderung:** ein Eintrag, dessen Wert an einem `alt`-Pfad *weder* `alt` *noch* `neu` ist (Test: Ernies
  `fields.B` auf `J5:K5` gesetzt), lässt `berichtige` **werfen** und nennt Eintrag und Pfad; ein Eintrag, der schon `NEU_SHA` hat,
  bleibt unverändert und wird als „schon berichtigt“ gemeldet. **Zweimal angewendet ist einmal angewendet.**
- **Kein Plättchen außerhalb des Rasters, keine Drehung außerhalb 0/90/180/270** (der Validator sagt es, der Test prüft, dass
  er es *könnte*: ein künstlicher Eintrag `S14:T15` wird gemeldet).

**Änderung.** `scripts/szenariodaten-berichtigung.mjs`: Konstanten `EINTRAEGE` (die sieben, je `ALT_SHA`, `NEU_SHA`,
`aenderungen: [{ pfad, alt, neu }]`), `berichtige(scenario)` → `{ next, berichtigt: [...], schonNeu: [...] }`
(wirft bei Abweichung), `rueckwaertsbeweis(alt, neu)` → Beanstandungen, `pruefeZiel(next, env)` (Validator, Aspect,
22 Läufe). Das Skript **hat noch keinen Schreibweg**; `DC` und `DD` bauen darauf.

**Fertig, wenn** die Tests grün sind und `git status` nur das Skript und die Testdatei zeigt.

## DC — Der Trockenlauf: `--json` und `--check` (M28.6, Punkt 5)

**Test zuerst:** an einer Wegwerf-Datenbank — das Vorbild ist `server/test/auslagen-daten.test.js` ab Zeile 455 (`setupDatabase()` in
einem Kindprozess legt das echte Schema an, `lauf(args)` ruft `main(argv, { Database })` auf, `spalten(file)` liest zurück), mit einer
`setups`-Zeile, die die Fixture-Spalte trägt, und drei `save_states`-Zeilen. `main` nimmt wie dort `{ Database }` als zweites Argument:

- `--check` öffnet die Datei **schreibgeschützt** (der Test setzt sie auf `readonly` und der Lauf scheitert nicht), druckt je
  Eintrag den Plan als Diff (Pfad, alt, neu) und alle Beweise, und **ändert nichts** (Hash der Spalte danach gleich).
- Ausgabe bei Ausgangsstand: „7 zu berichtigen, 0 schon berichtigt, 0 abweichend; `validateScenarioData` 0 Probleme;
  `checkScenarioAspect` 1 Meldung (Flut / Matschpfuetze, bekannt); 22 Läufe sauber“; Rückgabe 0.
- Bei **einem abweichenden Eintrag**: Rückgabe 1, die Meldung nennt Eintrag und Pfad, und es steht **kein** Satz „würde
  schreiben“ darin.
- Bei Zielstand: „nichts zu schreiben (alle sieben schon berichtigt)“, Rückgabe 0.
- Bei nicht kompaktem JSON in der Spalte: Beanstandung („der gespeicherte Text ist nicht kompaktes `JSON.stringify` —
  byteweiser Vergleich nicht möglich“), kein Schreiben.
- `--json` druckt den Plan (ohne Datenbank).

**Änderung.** `main` mit `--json | --check <db>`; lesen: **nur** `scenario_data`, `game_id` des Aufbaus, `table_assets`,
`cards`, `grid_data` (zum Prüfen, nie zum Schreiben); `GAME_ID` und `SETUP_ID` als Konstanten und gegen die Zeile geprüft
(wie `szenariodaten-grundspiel.mjs`).

**Fertig, wenn** die Tests grün sind. `--write` gibt es noch nicht und antwortet mit der Benutzungszeile.

## DD — Schreiben, Fingerabdruck, Weg zurück (M28.6, Punkte 6–9)

**Test zuerst** (Wegwerf-Datenbank wie `DC`):

1. **`--write`** auf dem Ausgangsstand schreibt **genau** den Zielstand und **nur** `scenario_data`. Der Test prüft, was die
   Fixture hergibt: der Text von `bosses` wächst von 15 263 Zeichen (`8c8666618388`) auf **15 567** (`f6c1d5f585c0`), die Spalte
   insgesamt um **304 Zeichen** (in der Produktion 18 678 → 18 982); der Hash der *ganzen* Spalte ist ein Produktionswert
   (`2f9cf558a0f7` → `5eec10582ec8`), weil die Fixture vor M27 gelesen ist und `options` nicht hat — **er gehört in `DE`/`DG`, nicht
   in den Test**. Gleich bleiben: `zone_data`, `action_data`, `grid_data`, `sequence_data`, `state_data`, `updated_at` der Zeile und alle
   Zeilen der anderen Tabellen gleich.
2. **Zweiter Lauf schreibt nichts** („schon berichtigt: 7“), Spalte byteweise gleich.
3. **Abweichender Eintrag** (Ernie `fields.B` geändert): Abbruch **vor** dem Schreiben, die Spalte unverändert.
4. **Die Spalte ändert sich zwischen Lesen und Schreiben** (der Test schreibt über eine zweite Verbindung in der Lücke —
   der Baustein bietet dafür eine einzige, benannte Stelle an, an der ein Test einhängen kann): `UPDATE … WHERE scenario_data = <gelesen>`
   trifft keine Zeile, die Transaktion bricht ab, **es steht nichts Halbes da**.
5. **Eine Zeile von `save_states` ändert sich** in der Transaktion (der Test hängt am selben Haken ein): Fingerabdruck
   weicht ab → Rollback, **die Meldung nennt die Zeile beim Namen**. Und: eine Änderung **vor** der Transaktion (zwischen
   `--check` und `--write`) ist **kein** Fehler — sie ist die Auto-Save-Zeile (`docs/datenzugriff.md`); der Hash wird *in* der
   Transaktion genommen, nachdem die Schreibsperre da ist (`IMMEDIATE`).
6. **Fingerabdruck** umfasst alle Tabellen, bei `setups` alle Spalten **außer `scenario_data`**, und **je Zeile `save_states`
   einen Hash mit Namen und `updated_at`**.
7. **`--zurueck <Sicherung> <db>`:** auf dem Zielstand stellt es den gesicherten Text wieder her (Hash gleich dem Ausgang);
   auf einem Stand, der **nicht** der Zielstand ist (jemand hat nach M28 weitergearbeitet), **weigert** es sich und schreibt
   nichts; auf dem Ausgangsstand meldet es „schon der Ausgangsstand“.
8. **Die Sicherung gibt es, bevor geschrieben wird — und sie liegt nicht im Repo.** Das Skript legt **keine** an (es schreibt nichts
   außer der einen Spalte). `--write` verlangt stattdessen `--sicherung-sha <Hex>` (mindestens 12 Stellen): den Hash des Textes, den der
   Aufrufer gesichert hat. Stimmt er nicht mit dem **gelesenen** Text überein, schreibt `--write` nicht und sagt warum; ohne das
   Argument schreibt es auch nicht. Ein Test je Fall (fehlt, falsch, richtig).

**Änderung.** `--write <db> --sicherung-sha <hex>` und `--zurueck <sicherungsdatei> <db>` (die Datei ist die aus `DE`, im Container
per `docker cp`; Format: roher Text, sha256, `updated_at`): `IMMEDIATE`-Transaktion
(`db.transaction(...).immediate()`), Vergleich-und-Tausch auf dem **exakt gelesenen Text**, Fingerabdruck vorher/nachher **in** der
Transaktion, Rollback bei jeder Abweichung; danach die Kontrollausgabe (M28.6, Punkt 9): gelesen, nicht aus dem Plan.
`updated_at` wird **nicht** angefasst. **Kein `--force`.**

**Fertig, wenn** die Tests grün sind und `cd server && npm test` insgesamt grün ist (Zahl notieren).

## DE — Der Ausgangsstand an der Produktion, die Sicherung, die Frage (M28.6, Punkte 1 und 2)

Erst **lesen**, nichts schreiben. `docs/datenzugriff.md` vorher ganz lesen (`Auto Save`-Warnung, base64-Rezept, wie ein Skript in
den Container kommt).

1. **Den Ausgangsstand gegen M28.2 halten.** Im Container (Skript `--check` gibt es seit `DC`; oder ein kleines Lesestück mit dem
   base64-Rezept): `scenario_data` des Aufbaus ist **18 678 Zeichen**, sha256 beginnt mit **`2f9cf558a0f7`**, `JSON.stringify(parse(text)) === text`,
   Schlüssel `gridLabel, bosses, cardZoneLabel, villagers, options`, **20** Einträge, und die sieben `ALT_SHA` stimmen. **Weicht
   irgendetwas ab, ist der Ausgangsstand nicht mehr der der Spec: anhalten**, den Auftraggeber fragen, nichts schreiben.
2. **Der Executor im Container ist der im Repo:** sha256 von `/shared/sequenceExecutor.js`, `/shared/scenarioData.js`,
   `/shared/gridGeometry.js` im Container gegen die Dateien auf der VM (`/opt/card-game-engine/shared/…`, nach `git fetch &&
   git reset --hard origin/master`). Gleich → der Probelauf ist aussagekräftig. Ungleich → anhalten.
3. **Die Sicherung ins Scratchpad**, nicht ins Repo, **vom Rechner des Agenten aus gelesen** (ssh und base64-Rezept, nicht vom Skript
   erzeugt): der **rohe** Text von `scenario_data` (18 678 Zeichen), seine sha256, `updated_at` der Zeile, die Hashes je Zeile
   `save_states`, als `scenario_data.<Datum>.json`. Optional zusätzlich `db.backup()` in den Container und `docker cp` ins Scratchpad.
   **Den Pfad der Sicherung in den Bericht schreiben** — sie ist der Weg zurück — und den **Hash** notieren: `DG` braucht ihn als
   `--sicherung-sha`.
4. **Frage an den Auftraggeber, vor `DG`:** „Ist irgendwo eine Setup-Editor-Sitzung für *TFT Kurzpartie* offen (`?mode=setup`)?
   Wenn ja: schließen, ohne zu speichern.“ Der Server sieht es nicht (M28.6).
5. **Skripte in den Container** (nach `docs/datenzugriff.md`, `docker cp` nach `/app/<name>.mjs`):
   `szenariodaten-berichtigung.mjs`, `szenariodaten-grundspiel.mjs` (für `durchrechnen`, `pngSize`, `erwartetAufRaster`) und was dieses
   importiert. Nach der Arbeit **wieder entfernen** (wie beim Vorgänger).

**Fertig, wenn** 1–4 mit Zahlen im Bericht stehen und die Sicherung liegt.

## DF — Der Trockenlauf an der Produktion (M28.6, Punkt 5)

`node /app/szenariodaten-berichtigung.mjs --check /app/data/card-game-engine.db` im Backend-Container, Ausgabe **Zeile für Zeile
gegen die Tabelle in M28.2 lesen** — nicht nur den Rückgabewert. Erwartet:

- 7 zu berichtigen, 0 schon berichtigt, 0 abweichend; je Eintrag das Diff genau wie in der Tabelle M28.2 (deren Zeilen: Ernie 7 — mit der Zaunteilung —,
  Virginia 6, Bundits 4, Red 2, Barry 1, Falls 2, Door Knockers 1);
- `validateScenarioData`: 0 Probleme, gegen die **echten** 212 Assets und das **echte** Raster `Spielfeld A–S / 1–14`;
- `checkScenarioAspect`: 1 Meldung (Flut / Matschpfuetze, 7 %);
- 22 Läufe sauber; Virginia 13/18 Objekte, Bundits 12/13, Ernie 12/12; Virginia-Kampf `note` mit den drei Plättchen ohne Karte
  (`Dichter Wald 2`, `Auslöser`, `Sprengstoff`) — neu, bekannt (M28.4);
- Rückwärtsbeweis: ja; Zielstand 18 982 Zeichen, `5eec10582ec8`.

**Weicht etwas ab, wird nicht geschrieben,** sondern gefragt. Ein Trockenlauf, der „0 Beanstandungen“ sagt, aber ein anderes
Diff zeigt als M28.2, ist ein Fehler im Baustein, kein Erfolg.

## DG — Schreiben, Kontrolle, Rauchtest (M28.6, Punkt 6–9; Abnahme 1–6)

Nur nach `DF` und nach der Antwort aus `DE` 4.

1. `node /app/szenariodaten-berichtigung.mjs --write /app/data/card-game-engine.db --sicherung-sha <Hash aus DE>`. Die Sicherung
   selbst hat `DE` schon gelegt (Scratchpad, **nicht im Repo**); das Skript prüft nur, dass der Hash zum gelesenen Text passt.
2. **Kontrollausgabe lesen**, nicht aus dem Plan: Länge 18 678 → 18 982, sha `2f9cf558a0f7` → `5eec10582ec8`; die sieben Hashes alt → neu;
   die 13 übrigen „gleich“; `gridLabel` `29499d91a16c`, `cardZoneLabel` `f04e85a28054`, `villagers` `9d58cc5bb60a`, `options` `0c567cede3be`
   gleich; Rückwärtsbeweis; `validateScenarioData` auf der **gelesenen** Spalte 0; Fingerabdruck aller Tabellen **und jeder Zeile von
   `save_states`** gleich — die Zeile *Partie 14* beim Namen.
3. **Zweiter Lauf:** schreibt nichts („schon berichtigt: 7“).
4. **Rauchtest lesend:** `node /app/auslagen-rauchtest.mjs /app/data/card-game-engine.db` (die Dateien nach `docs/datenzugriff.md` im Container):
   wie vor M28, **kein neues** „ohne ok“ außer den bekannten `note`. Dazu: *Partie 14 – Sieg gegen Virginia Fitz* laden (im Rauchtest) und
   „Kampf beginnen“ darauf — das alte Virginia-Brett bleibt **nicht** liegen (`clear_grid`), der nächste Kampf baut aus der berichtigten Tabelle.
5. **Skripte aus dem Container entfernen.**
6. **Am Ende des Tages** (und vor `DI`): `--check` noch einmal. Meldet er einen Eintrag als `ALT_SHA`, hat ein Editor zurückgeschrieben — dann
   `DG` wiederholen, nachdem der Auftraggeber den Editor geschlossen hat.

**Fertig, wenn** Abnahme 1–6 aus M28 mit gelesenen Zahlen im Bericht stehen. **Wird etwas Unerwartetes gefunden: `--zurueck`**, nicht
Reparieren von Hand.

## DH — Dokumente nachziehen (M28.1, Wo die Spec nicht stimmt)

Nach `DG`. Nur Text; kein Code.

- **`docs/szenariodaten-grundspiel.md` §11:** eine **Berichtigung** darunter (die Tabelle bleibt als Befund stehen): Door Knockers, rechter
  Wald, ist **widerlegt** (Wald 2 an `M1:S4`, 0,50 gegen 0,02); die Bundits-Zäune brauchen L 270 / P 90; Ernies linker Zaun ist in der Position richtig und
  in der Drehung falsch; `EG5` steht bei Virginia zweimal; **Verweis auf M28**. §12: „17 benannte Spielstände“ → „17 Zeilen, 8 zu diesem Spiel“
  (Nr. 9 oben). §6.5: „gegenüber dem Artwork“ → „gegenüber der Bedeutung der Wörter“ (Nr. 10). §6.7: ein Satz zur Korrelation und zur systematischen Drehung des Plumpsklos (Nr. 8).
- **`docs/szenariodaten-erweiterung.md`:** am Anfang von §3 ein Kasten **„Berichtigt in M28“** mit der Liste der geänderten Einträge (die Tabellen sind
  der Stand vom 2026-10-14 und bleiben es); §5.2 und §5.5 mit „falsch, siehe M28.1“.
- **`docs/datenzugriff.md`:** unter „Regeln fürs Schreiben“ ein Absatz **„Vorhandene Werte ändern“** (Vorbedingung je Wert, Rückwärtsbeweis statt Präfixbeweis, `--zurueck`)
  und unter „Fallen“ **„Der Setup-Editor schreibt `scenario_data` zurück“**.
- **`CLAUDE.md`, „Laufende Arbeit“:** ein Absatz „Szenario-Berichtigung (M28)“ mit Verweis auf diese Datei.
- **`docs/spec-setup-system.md`:** M27, letzter Absatz („Offen geblieben: … die elf Szenarien aus §11“) auf M28 verweisen; am Ende von M28 ein
  „— gebaut“-Abschnitt mit den Zahlen aus `DG` und den Stellen, an denen M28 selbst nicht stimmte.
- **Hier:** „Stand nachher“ (unten) füllen.

**Fertig, wenn** `grep -rn "unklar" docs/szenariodaten-grundspiel.md` die Behauptung nicht mehr unkommentiert führt und die Verweise stimmen.

## DI — Der Auftraggeber sieht es am Tisch (Abnahme 7)

Keine Automatik (der Client hat keine Testinfrastruktur, der Browser-Bereich ist nicht angemeldet, ein Agent trägt kein Passwort ein). Eine **Prüfliste von Hand**:

1. Aufbau *TFT Kurzpartie* laden, so oft „Kampf beginnen“, bis **Ernie Offal** an der Reihe ist (oder Ernie auf Platz 2 der Leiste legen, wie `szenariodaten-erweiterung.md` §6).
   Stehen der Bösewicht **auf dem Kreuz zwischen K und L, Zeilen 5/6**, die drei Dörfler auf **I6, O6, I7**, der Foodtruck über **I–M**, die Tonne auf **N3**, der Kochtopf auf **K7:L8**,
   der rechte Zaun auf **O**, der linke auf **G**, das Maisfeld über **K–O**?
2. Dasselbe für **Virginia Fitz**: Wald oben links ist der **gelbere** (Dichter Wald 2), der rechte liegt in den Zeilen **9–12**, der Schuppen hat die Tür **rechts**; **Dynamitbündel auf H7,
   TNT-Kasten auf Q5, Falle auf E11**. Im Endkampf: die fünf Grabhügel auf den fünf FF-Kästen, der fünfte auf **R14**.
3. **The Bundits:** Farmhaus mit dem Giebel **links**, beide Zäune eine Zeile höher, **Plumpsklo bei I11:J12**.
4. *Partie 14 – Sieg gegen Virginia Fitz* laden: das alte Brett, unverändert; „Kampf beginnen“ danach räumt es ab.
5. **Was fehlt oder falsch aussieht, in den Bericht** — und `--zurueck` ist ein Befehl.

## DJ — Die Messwerkzeuge ins Repo (unabhängig; Entscheidung 12)

**Warum.** Die Zahlen in M28.1 stammen aus Python-Skripten, die in einem Kratzverzeichnis lagen (Fetch der Bilder, Linien und Perspektive, Spielstein- und
FF-Schablonen, Vorlagen aus sauberen Tableaus, Hypothesentabelle, Kachelblatt, Abdeckprobe). Ohne sie ist die nächste Erfassung wieder Augenmaß, und der Prüfer sieht von
sieben Fehlerarten eine (Nr. 11). Es ist die Lehre aus M27 („die Messdateien liegen nicht im Repo“).

**Änderung.** `scripts/tableau-messung/` mit den Skripten in der Reihenfolge: Bilder holen → entzerren → Spielsteine und FF-Kästen → Plättchen (Asset-Korrelation, Vorlage, Kachelblatt) →
Abdeckprobe; ein Kopfkommentar je Datei mit den **Parametern aus M28** („Wie gemessen wurde“) und der Grenze („Werte unter 0,2 tragen nichts“). Eine **Selbstprobe**: auf dem sauberen Tableau
*Ms. Falls & Co.* müssen die fünf T und das R auf den Feldern liegen, die die Daten nennen; sonst ist das Werkzeug kaputt. **Keine Python-Abhängigkeit in `npm test`** (der Client und der Server haben
keine) — die Selbstprobe läuft von Hand.

**Nicht tun.** Keine Bilder einchecken (Größe, und sie liegen in der Produktion), keinen Bildvergleich als Prüfer in `shared/` bauen (eigener Auftrag, M28 „Bewusst nicht Teil davon“).

---

## Stand nachher

*Wird von `DG` und `DH` gefüllt, wie in `docs/tasks-auslagen.md`:* Testzahl vorher (1555) → nachher; die Länge und die Hashes aus der Kontrollausgabe von `DG`; der Pfad der Sicherung; was der Rauchtest und
`DI` fanden; welche der Entscheidungen 3–7 der Auftraggeber geändert hat; welche Stellen M28 selbst nicht traf („Wo die Spec nicht stimmt“ der Umsetzung).

### Zwischenstand 2026-11-08: `DB`–`DF` und `DJ` gebaut, **`DG` nicht**

*Das Schreiben (`DG`) wartet auf die Antwort zu `DE` Punkt 4 (Setup-Editor offen?). Bis dahin ist an der Produktion **nichts** geschrieben.*

- **Tests:** 1555 → **1595**, alle grün. Neue Dateien: `server/test/szenariodaten-berichtigung.test.js` (19, der reine Baustein) und
  `server/test/szenariodaten-berichtigung-lauf.test.js` (21, `main` gegen eine Wegwerf-Datenbank mit dem echten Schema). Kein Laufzeitcode
  angefasst (`shared/`, `server/src/`, `client/src/`: kein Diff gegen `1fc6f39`, den Stand auf der VM).
- **Der Baustein** `scripts/szenariodaten-berichtigung.mjs`: `AENDERUNGEN` (die Liste `{ eintrag, pfad, alt, neu, beleg }`, 31 Zeilen, neun Drehungen) ist die
  einzige Stelle; der Zielstand wird daraus **gerechnet** und trifft alle sieben `NEU_SHA` aus M28.2 und `5eec10582ec8` für die ganze Spalte. `--json`,
  `--check <db>`, `--write <db> --sicherung-sha <hex>`, `--zurueck <sicherung> <db>`, `--ohne-z1`; **kein `--force`**.
- **Ausgangsstand an der Produktion (gelesen, 2026-11-08):** `scenario_data` **18 678 Zeichen**, sha256 beginnt mit `2f9cf558a0f7`, kompaktes `JSON.stringify`,
  Schlüssel `gridLabel, bosses, cardZoneLabel, villagers, options`, **20** Einträge, die sieben `ALT_SHA` und die 13 übrigen wie in M28.2, die vier Schlüssel-Hashes
  (`29499d91a16c`, `f04e85a28054`, `9d58cc5bb60a`, `0c567cede3be`) wie in `DG`. **Die Spec stimmt.**
- **Executor:** `/shared/*.js` im Container = `/opt/card-game-engine/shared/*.js` auf der VM = Repo (neun Dateien, sha256 gleich; VM auf `1fc6f39`).
- **Trockenlauf an der Produktion:** 7 zu berichtigen, 0 abweichend; je Eintrag das Diff wie in M28.2; Rückwärtsbeweis ja; `validateScenarioData` 0 (212 Assets, 1 087 Karten);
  22 Läufe sauber (Virginia 13/18, Bundits 12/13, Ernie 12/12); Zielstand 18 982 Zeichen, `5eec10582ec8`.
- **Wo M28 selbst nicht traf:** M28.5 sagt, `checkScenarioAspect` melde heute 2 Treffer und nach M28 einen. Mit den echten Bildmaßen aller 211 Assets sind es **5 vor und 4 nach**:
  zusätzlich die drei 6-%-Treffer an den Milchkannen-Plättchen (Handsy-Endkampf M9, M12; Pepin-Endkampf S9), die in `szenariodaten-grundspiel.md` §9.16 stehen und zu den neun vom
  2026-11-07 gehören. Sie sind jetzt als bekannt geführt (je Eintrag, Seite, Asset und Feld); dasselbe Asset an anderer Stelle bleibt eine Beanstandung.
- **`DJ`:** `scripts/tableau-messung/` (Python/OpenCV, Selbstprobe an Ms. Falls & Co.; reproduziert die Zahlen aus M28.1, z. B. Foodtruck 0,40 gegen 0,07, Falls-Farmhaus 180 = 0,28 / Vorlage 0,79,
  Ernie `B` bei K5:L6, Virginia `EG5` bei R14). Nicht Teil von `npm test`.
