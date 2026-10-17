# Aufgaben: Der Kleinkram aus dreizehn Partien (Spec M24.1–M24.4)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M24**. Die Belege stammen
aus `docs/partie9-bericht.md` (Ä1, Ä2, Ä6), aus der Sichtprüfung zu M21
(M24.2) und aus M17/M22 (M24.3). Vorgeschichte: `docs/tasks-dauerstapel.md`
(die Sammelkategorien `Dorf-Ereignisse` + `Dorf-Ereignisse (Üble Nachbarn)`),
`docs/befund-beute-und-aufstellbares.md` (M13.7, die Aufteilung nach
Rahmenfarbe), `docs/tasks-partie13.md` (BX–CB, zuletzt vergebene Buchstaben).

**Aufgabenbuchstaben.** `AA`–`AE` in `tasks-partie5.md`, `AF`–`AN` in
`tasks-partie6.md`, `AP`–`AV` in `tasks-partie7.md`, `AW`–`AY` in
`tasks-zonen.md`, `AZ`–`BB` in `tasks-ansichten.md`, `BC`–`BG` in
`tasks-partie9.md`, `BH` in `tasks-ausruestung.md`, `BI`–`BM` in
`tasks-partie10.md`, `BN`–`BS` in `tasks-endkampf.md`, `BT`–`BW` in
`tasks-partie12.md`, `BX`–`CB` in `tasks-partie13.md`. Hier geht es mit `CC`
weiter.

**Reihenfolge.** `CC` (M24.1) zuerst — der einzige mit echtem Risiko. Danach
`CD` (M24.3, reine Daten), `CE` (M24.2), `CF`/`CG`/`CH` (M24.4).

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: **1245**, alle
grün). Bau: `cd client && npx vite build` — keine **neue** Warnung (zwei sind
vorbestehend). Der Client hat keine Testinfrastruktur (CLAUDE.md): reine
Rechnung gehört nach `shared/` oder `client/src/utils/` und wird aus
`server/test/` geprüft. Jede Geste gilt für Maus, Tastatur **und** Touch. Es
gibt genau **eine** Stelle je Sache (M6).

Datenänderungen gegen Spiel `072123c0-cd97-4ffb-a330-369630fab93f`, Aufbau
*TFT Kurzpartie* `b1e10f4e-b8f2-4c2a-bb3e-54643944121b`, nach
`docs/datenzugriff.md`: nur die Spalte lesen und schreiben, die gebraucht wird,
erst Trockenlauf, dann `db.transaction`, dann Kontrollausgabe. Betroffen sind
`categories.name`, `card_backs.name`, `setups.sequence_data` und
`setups.action_data` — **nicht** `state_data` (siehe CC, Nachprüfung 3).

---

## Wo die Spec nicht stimmt

### 1. M24.1: zwei der aufgezählten Kategorien gibt es nicht, eine fehlt

Die Spec nennt fünf Namen plus „die `Beute: …`-Kategorien der acht
Erweiterungs-Bösewichte". Gemessen an den **68 Kategorien** des Spiels
(`categories`, Stand 2026-10-17) tragen genau **vier** den Zusatz:

| Kategorie | Karten | in der Spec genannt |
|---|---:|---|
| `Dorf-Ereignisse (Üble Nachbarn)` | 5 | ja |
| `Einzigartige Ausrüstung (Üble Nachbarn)` | 33 | ja |
| `Startausrüstung (Üble Nachbarn)` | 7 | ja |
| `Gelände (Üble Nachbarn)` | 13 | **nein** |

* **`Nachschub (Üble Nachbarn)` gibt es nicht.** Es gibt `Nachschub` (177) und
  `Nachschub (freischaltbar)` (24), beide ohne Zusatz.
* **Die `Beute: …`-Kategorien tragen den Zusatz nicht.** Es sind **20** Stück,
  alle in der Form `Beute: <Bösewicht>` (`Beute: Barry Bluff`, `Beute: Ernie
  Offal`, …), je 3 Karten. Es gibt also keine acht umzubenennen. Was die Spec
  mit „acht Erweiterungs-Bösewichte" meint, steht korrekt in
  `.claude/agents/tft-spieler.md` — dort wird behauptet, die Beute-Kategorien
  trügen „jeweils mit dem Erweiterungszusatz `(Üble Nachbarn)` bzw.
  `(Hookbox)`". **Auch das stimmt nicht**, und die Rolle wird mit CC
  mitkorrigiert.
* **`Gelände (Üble Nachbarn)`** fehlt in der Spec-Liste, steht aber in der
  Spec selbst an anderer Stelle (Zeile 1885) und wird hier mitgenommen.

### 2. M24.1: die zweite Bindung ist von einer Umbenennung gar nicht betroffen

Die Spec (und `docs/datenzugriff.md`) warnt zu Recht vor der Doppelbindung aus
M13.6. Die Nachprüfung ist trotzdem nötig gewesen, denn sie **entlastet**: eine
Umbenennung verschiebt keine Karte, und `card_ids` bindet über die
Karten-`id`, nicht über den Kategorienamen. Gemessen (alle 58 Karten der vier
Kategorien gegen jede JSON-Spalte, rekursiv über die Werte, nicht als
Textsuche):

| Ort | gebundene Karten |
|---|---|
| `setups.state_data` *TFT Grundaufbau (Dorfphase)* | 10 aus `Dorf-Ereignisse (Üble Nachbarn)` |
| `setups.state_data` *TFT Kurzpartie* | 10 aus `Dorf-Ereignisse (Üble Nachbarn)` |
| 7 Spielstände (u. a. „Partie 12 — Endstand") | je 2 aus `Startausrüstung (…)` + 9–10 aus `Dorf-Ereignisse (…)` |

Alle diese Bindungen laufen über Karten-`id` und überleben die Umbenennung
unverändert. **`state_data` wird deshalb nicht angefasst** — und kein
Spielstand muss angefasst werden, auch die benannten nicht.

M13.6 war ein *Umhängen* von Karten; M24.1 ist ein *Umbenennen*. Die Lehre gilt
weiter, die Reparatur fällt hier aber auf null zusammen.

### 3. M24.1: die Namensbindung ist eine Stelle, nicht viele

Die Spec erwartet `place_stack.category`-Treffer in `sequence_data`. Gemessen
über alle drei Aufbauten, alle sechs JSON-Spalten und alle Spielstände: **zwei**
Treffer, beide im Aufbau *TFT Kurzpartie*, beide auf `Dorf-Ereignisse (Üble
Nachbarn)`:

* `sequence_data[1]`, `place_stack`, `category[1]`
* `action_data[3]` („Dorfphase beginnen"), `steps[2]`, `clear_table`,
  `category[1]`

Die anderen drei Kategorien werden **nirgends beim Namen** gerufen.

### 4. M24.1: drei `card_backs` tragen den Namen ebenfalls

Nicht in der Spec, aber derselbe Fehler und in der Oberfläche sichtbar
(Kartenrückseiten-Verwaltung):
`Dorf-Ereignisse (Üble Nachbarn) Back`, `Gelände (Üble Nachbarn) Back` und
`Ausrüstung (Üble Nachbarn) Back`. Der dritte zeigt zusätzlich auf eine
Kategorie, die es seit M13.7 nicht mehr gibt (sie wurde in `Einzigartige
Ausrüstung (Üble Nachbarn)` umbenannt). Rückseiten binden über `card_back_id`,
die Namen sind reine Anzeige — CC benennt sie mit um und lässt den
Kategorie-Teil ansonsten so, wie er dasteht.

### 5. M24.3: der Editor ist nicht der Befund

Die Spec verlangt zu prüfen, „ob der Editor beim Anlegen überhaupt eine `id`
vergibt — wenn nicht, ist **das** der Befund". Er vergibt eine:
`createAction` in `client/src/utils/setupActions.js` setzt `id: generateId()`,
und alle vier Lese-/Schreibfunktionen daneben adressieren ausschließlich über
`id`. Die eine Aktion ohne `id` ist von Hand über die API entstanden — genau
das, was der Kommentar über `setupActions.js` seit M5 behauptet. **Reine
Datenarbeit, keine Codeänderung**, und die nächste im Editor angelegte Aktion
hat das Problem nicht.

### 6. M24.4/Ä1: der Preis ist seit Partie 9 gestiegen, nicht gefallen

Die Spec vermutet, M14.10 (scrollbar) könnte reichen. Gemessen am laufenden
Tisch, Fenster 932 × 742, Spielzoom 38 %, Rechtsklick auf `Dorf-Ereignisse`:

* **23 Einträge**, davon **9** `Reveal Top Card to "…"`
* Kasten **924 × 726** Punkte bei einem Fenster von 932 × 742 — das sind
  **99,1 % der Breite und 97,8 % der Höhe**. Vom Tisch ist nichts mehr zu sehen.
* natürliche Höhe 939, auf 726 gekappt, also zusätzlich gescrollt.

Partie 9 meldete 18 Einträge. M23.2 hat sechs Ablagestapel-Zonen gebaut
(`Dörfler 1–3: Erfüllte Heldentaten` und `: Ausliegend`), und jede davon ist
ein `Reveal Top Card to …`-Eintrag. **Die Breite ist neu**: sie kommt von den
langen Zonennamen, nicht von der Zahl der Einträge. Ä1 ist also nicht erledigt,
sondern schlimmer geworden.

### 7. M24.4/Ä6: es ist **nicht** eine Stelle, und darum passiert hier nichts

Die Spec lässt die Wahl ausdrücklich offen („Prüf, ob es eine Stelle ist oder
viele; eine halbe Übersetzung ist schlechter als gar keine"). Gezählt:

| Datei | englische Diagnosetexte |
|---|---:|
| `shared/sequenceExecutor.js` (`skip(…)`, `fail(…)`, `halt(…)`) | 58 |
| `shared/zoneGeometry.js` (`zoneRejects`) | 3 |
| `shared/counters.js` | 3 |

Dazu der Rahmen, in dem sie stehen: `issueLine`
(`client/src/utils/setupActions.js`) baut `#3 place_stack "Ablage" — skipped: …`
— Status und Schritttyp sind ebenfalls englisch.

Die Abweisungsmeldung aus Ä6 ist **eine** dieser 64 und läuft durch denselben
Kanal (`setupIssues`) wie das Aufbauprotokoll. Nur `zoneRejects` zu übersetzen
heißt: dieselbe Meldungszeile zeigt künftig deutschen Grund in englischem
Rahmen, neben 61 weiterhin englischen Gründen. Das ist genau die halbe
Übersetzung, die die Spec verbietet.

**Ergebnis: CH wird nicht gebaut.** Die Übersetzung des Protokolls ist ein
eigener Meilenstein — 64 Texte, ein Rahmen und rund drei Dutzend Tests in
`server/test/sequence-*.test.js`, die die englischen Texte wörtlich prüfen. Das
ist kein Kleinkram.

Es gibt den Weg, den `issueLine` schon kennt: ein Schritt mit `message` zeigt
**nur** diesen deutschen Satz. Wer Ä6 angeht, sollte dort ansetzen und nicht
an den Diagnosetexten.

---

## CC — Die Erweiterung heißt „Neue Nachbarn" (M24.1)

**Befund, nachgeprüft 2026-10-17.** Besteht. Vier Kategorien tragen den alten
Namen (Abweichung 1), zwei Aufbauschritte rufen eine davon beim Namen
(Abweichung 3), drei Kartenrückseiten heißen ebenfalls so (Abweichung 4). Die
Kartenbindung über `card_ids` ist von einer Umbenennung nicht betroffen
(Abweichung 2).

**Änderung.** Ein Schalter `scripts/kleinkram-daten.mjs`, `--json` /
`--check` / `--write`, nach dem Muster von `scripts/partie13-daten.mjs`:

1. `categories.name`: in den vier Namen `(Üble Nachbarn)` → `(Neue Nachbarn)`.
2. `card_backs.name`: in den drei Namen dasselbe.
3. `setups.sequence_data` der *TFT Kurzpartie*: `category[1]` des Schrittes 1.
4. `setups.action_data` der *TFT Kurzpartie*: `category[1]` in Schritt 2 von
   „Dorfphase beginnen".

`state_data`, `zone_data`, `grid_data` und `scenario_data` werden **nicht
gelesen und nicht geschrieben**. Spielstände bleiben unangetastet.

Danach `docs/tft-regeln.md` und `.claude/agents/tft-spieler.md` gegenlesen:
Beide behaupten, die Datenbank trage noch den alten Namen; beide Sätze müssen
weg. In der Rolle zusätzlich der falsche Satz über die `Beute: …`-Kategorien
(Abweichung 1).

**Abnahme.**
1. `select name from categories where name like '%Üble%'` liefert null Zeilen,
   dasselbe für `card_backs`.
2. Die vier Kategorien haben unverändert 5 / 33 / 13 / 7 Karten.
3. Ein Durchlauf des Aufbaus *TFT Kurzpartie* meldet keinen übersprungenen
   `place_stack`; der Stapel `Dorf-Ereignisse` liegt mit 80 Karten da wie vorher.
4. `validateScenarioData` gegen die echte Assetliste und das echte Raster ist
   sauber.
5. Regeldatei und Rolle nennen „Üble Nachbarn" nur noch als historischen Namen,
   nicht mehr als Zustand der Datenbank.

## CD — „Dorfphase beginnen" bekommt eine `id` (M24.3)

**Befund, nachgeprüft 2026-10-17.** Besteht. Von den fünf Aktionen des Spiels
(vier in *TFT Kurzpartie*, eine in *TFT Grundaufbau*) hat genau eine keine
`id`: `action_data[3]`, Label „Dorfphase beginnen". Ihr Knopf trägt
`key={undefined}` und `data-testid="table-action-undefined"`
(`GameTable.jsx:6013/6016`). Der Editor ist nicht schuld (Abweichung 5).

**Änderung.** Im selben Schalter wie CC: `id: "dorfphase-beginnen"` ergänzen —
Schreibweise wie die drei vorhandenen (`kampf-beginnen`, `dorfereignis`,
`laden-nachfuellen`). Nur `action_data`, nur dieses eine Feld; die 45 Schritte
der Aktion werden Zeichen für Zeichen durchgereicht.

**Abnahme.**
1. Alle fünf Aktionen tragen eine `id`, alle `id` sind verschieden.
2. Am Tisch gibt es `[data-testid="table-action-dorfphase-beginnen"]`, und
   kein `data-testid` enthält `undefined`.
3. Die Aktion tut dasselbe wie vorher (45 Schritte, unverändert).

## CE — Ein Suchfeld für „Add Token" (M24.2)

**Befund, nachgeprüft 2026-10-17.** Besteht, gesehen am laufenden Tisch. Der
Dialog listet alle **212** Assets (`table_assets`, alle vom Typ `token`) in
einem Kasten von 144 Punkten Höhe (`max-h-36`), vier je Zeile, Namen auf
„Marker 1…" gekürzt. Kein Eingabefeld.

**Änderung.** Ein `<input type="search">` über dem Rollkasten, gefiltert mit
`matchesCardSearch` aus `shared/cardSearch.js` — **dieselbe** Stelle wie die
Kartenbibliothek (M6), keine zweite Suche. Dieselben Eigenheiten wie dort:
`Escape` räumt erst die Suche, eine leere Anfrage zeigt alles, und eine Anfrage
ohne Treffer sagt das, statt einen leeren Kasten zu zeigen.

**Abnahme.**
1. Die Eingabe `marker 1` lässt nur die „Marker 1: …"-Assets stehen.
2. Groß-/Kleinschreibung und Umlaute verhalten sich wie in der Bibliothek
   (`PINATA` findet `"Sheriff"-Piñata` nicht — `squashName` normalisiert keine
   Diakritika; `pinata` findet es ebenfalls nicht, `piñata` schon. Das ist das
   Verhalten der Bibliothek und wird hier nicht verbessert).
3. Ohne Eingabe verhält sich der Dialog unverändert.
4. Die Zahl der Treffer steht da, wie in der Bibliothek.

## CF — Das Stapelmenü füllt den Bildschirm (M24.4 / Ä1)

**Befund, nachgeprüft 2026-10-17.** Besteht und ist schlimmer geworden: 23
Einträge, 924 × 726 Punkte in einem Fenster von 932 × 742 (Abweichung 6).

**Änderung.** Die 9 `Reveal Top Card to "…"`-Einträge kommen hinter **einen**
Eintrag `Reveal Top Card to …`, der sie aufklappt; zugeklappt ist die Vorgabe.
Ein `<button>`, also Maus, Tastatur und Berührung in einem. Das nimmt dem Menü
8 Zeilen **und** die Breite, denn die Breite kommt von den langen Zonennamen.

Was **nicht** geändert wird: `revealZones` bleibt, wie es ist. Welche Zonen
angeboten werden, ist eine Regelfrage (M8.9, M11.5, M23.3) und keine
Platzfrage; wer hier filterte, nähme dem Spieler ein Ziel weg, weil der Kasten
zu groß ist.

**Abnahme.**
1. Zugeklappt hat das Stapelmenü 15 statt 23 Einträge.
2. Der Kasten ist am selben Tisch schmaler als 400 und kürzer als 600 Punkte.
3. Ein Klick auf den Sammeleintrag zeigt alle 9 Zonen; ein Klick auf eine Zone
   deckt auf wie bisher.
4. Bei genau einem Ablagestapel (dem Normalfall aus M8.9) steht der eine
   Eintrag weiterhin unmittelbar da — kein zusätzlicher Klick.

## CG — Das Kontextmenü nennt das angefasste Stück (M24.4 / Ä2)

**Befund, nachgeprüft 2026-10-17.** Besteht. Die Kopfzeile sagt „STACK
ACTIONS" bzw. „CARD ACTIONS" und sonst nichts (`GameTable.jsx:7844`).

**Änderung.** Die Kopfzeile nennt das Stück. Die Auskunft gibt es schon
zweimal im JSX — `stackNames[stackId] ? '<Name> (<Zahl>)' : 'Stack: <Zahl>
cards'`, bei `title=` (Zeile 5147) und im Schwebeschild (Zeile 5310). Das wird
**eine** Funktion in `client/src/utils/tableObjectView.js` (`stackCaption`),
aus `server/test/` geprüft, und alle drei Stellen rufen sie.

Für eine einzelne Karte gilt `tableObjectView(card, 'Card').caption`, also
dieselbe Entscheidung wie bei der Löschabfrage (M23.1) — **und damit „Face
down" für ein verdeckt liegendes Stück.** Das ist Absicht (Spec Abschnitt 6):
die acht gleichen Rückseiten aus Partie 9 bleiben acht gleiche Rückseiten,
aufgedeckte Stücke stehen künftig mit Namen da.

**Abnahme.**
1. Rechtsklick auf den Stapel `Dorf-Ereignisse` zeigt in der Kopfzeile
   „Dorf-Ereignisse (80)".
2. Rechtsklick auf eine offene Einzelkarte zeigt ihren Namen.
3. Rechtsklick auf eine verdeckte Einzelkarte zeigt „Face down" und nirgends
   den Namen.
4. `title=` und Schwebeschild sagen weiterhin dasselbe wie vorher.

## CH — Die englische Abweisungsmeldung (M24.4 / Ä6)

**Befund, nachgeprüft 2026-10-17.** Besteht — aber als **64 Stellen**, nicht
als eine (Abweichung 7).

**Änderung: keine.** Begründung in Abweichung 7. Der Punkt gehört in einen
eigenen Meilenstein; der Weg dorthin führt über `message`, nicht über die
Diagnosetexte.

**Abnahme.** Die Zählung steht in Abweichung 7 dieser Datei — mit den Zahlen,
die ein künftiger Meilenstein braucht, um den Aufwand zu schätzen.
