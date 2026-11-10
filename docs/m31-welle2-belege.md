# M31 Welle 2 — die Belege der Produktionsläufe

Dieselbe Rolle wie `docs/m31-welle1-belege.md`: was gemessen wurde, steht hier und
nicht nur im Scratchpad (die Lehre aus `ER`). Die Rohausgaben liegen im Scratchpad
der Sitzung (`FE-*`), die Zahlen stehen hier.

## `FE` — Deploy beider Images (die Belege (a)–(d))

**Der Befund vor allen Belegen: der Deploy war schon gelaufen, vier Mal.**
`.github/workflows/deploy.yml` hat `on: push` auf `master` — **jeder Push ist ein
Deploy**. Welle 2 ging darum in vier Schritten live, während sie gebaut wurde
(`gh run list --workflow=deploy.yml`, alle **success**):

| Zeit (UTC) | headSha | Aufgabe |
|---|---|---|
| 2026-11-10T08:11:36Z | `216c0f9` | `FA` |
| 2026-11-10T08:28:56Z | `8baad5a` | `FB` |
| 2026-11-10T08:56:17Z | `1bab055` | `FC` |
| 2026-11-10T09:11:43Z | `bf68290` | `FD` |
| 2026-11-10T09:13:03Z | `d559f70` | `FD`, Dokumente |

Der Schritt „**Vorher fragen**" aus `ER`/`FE` war damit **nicht einzuhalten** — nicht
aus Unachtsamkeit, sondern weil das Protokoll von einem **gewollten, einzelnen** Deploy
ausgeht, den es so nicht gibt. **Das Protokoll ist der Fehler, nicht der Lauf**; es ist
in `CLAUDE.md` und `docs/datenzugriff.md` berichtigt. Dass es **folgenlos** war, ist
unten gemessen: ohne `villagers.lage` in den Daten tut Welle 2 nichts (so war sie
gebaut, M31.20), und ein „Rauchtest vorher" gegen die alte Fassung ist nicht nötig,
weil der **Grundstand von `EY`** (2026-11-10 00:24, vor Welle 2) als Vergleich vorliegt.

**(c) Welcher Commit läuft.** `d559f70` → **success**, 2026-11-10T09:13:03Z. Gegenprobe
von zwei Seiten: die Container sind um 09:17 **vier Minuten alt** (`docker ps`), und das
Checkout der VM steht nach `git fetch` + `reset` auf `d559f70`. Das Frontend-Bündel heißt
nicht mehr `index-CXIhz-h6.js` (Welle 1), sondern **`index-_kVF5aFE.js`** — es ist neu
gebaut, nicht nur neu gestartet.

**(a) Die Laufzeitdateien im Backend** (im Container `card-game-engine-backend` unter
`/shared/`, dazu die eine Route; `sha256sum`, erste 16 Zeichen, gegen das Repo **nach
`tr -d '\r'`**):

| Datei | Container | Repo | |
|---|---|---|---|
| `sequenceExecutor.js` | `f8df76209a09114a` | `f8df76209a09114a` | gleich |
| `villagers.js` | `1b9e54da79a1e120` | `1b9e54da79a1e120` | gleich |
| `setupOptions.js` | `cb74e54290fc49dd` | `cb74e54290fc49dd` | gleich |
| `counters.js` | `2eb8c395163c8bf6` | `2eb8c395163c8bf6` | gleich |
| `scenarioData.js` | `949861ec51050649` | `949861ec51050649` | gleich (wie Welle 1) |
| `anchoring.js` | `f23558383d3090dd` | `f23558383d3090dd` | gleich (wie Welle 1) |
| `src/routes/rooms.js` | `f6beeea12adaa697` | `f6beeea12adaa697` | gleich |

Vier der sieben Hashes sind neu gegenüber `ER` — genau die vier Dateien, die Welle 2
angefasst hat (`sequenceExecutor`, `villagers`, `setupOptions`, `counters`), plus die
Route. `scenarioData.js` und `anchoring.js` tragen **dieselben** Hashes wie in Welle 1:
unberührt.

**(b) Die Zeichenketten im Frontend-Bündel** (`/usr/share/nginx/html/assets/index-_kVF5aFE.js`,
das einzige Bündel; Zeichenketten statt Funktionsnamen, weil der Minifier Namen umbenennt —
je **ein** Treffer):
`onlyLage`, `onlyCounter`, `only in the lage`, `only if counter`, `does not exist`,
`at least as many villagers as players`, `must end in the number of players`, `no lage`.

**(d) Derselbe alte Rauchtest.** `auslagen-rauchtest.mjs` gegen die Produktionsdatenbank
(lesend; die acht gebrauchten Skripte vorher nach `/app/` kopiert und ihre **Anwesenheit**
geprüft, nicht nur ihr Hash — ein neuer Container hat sie nicht): **0 Beanstandungen,
`EXIT=0`**, 8 815 Zeichen, genau so lang wie der Grundstand von `EY`.

Der Vergleich gegen den Grundstand (`m31-ey-rauchtest-produktion.txt`, 2026-11-10 00:24)
ist **eine einzige Zeile** lang:

```
<   Auto Save   … laden-nachfuellen: 1 Zeilen/0 ohne ok → kampf-beginnen: 15 Zeilen/0 ohne ok
>   Auto Save   … laden-nachfuellen: 1 Zeilen/0 ohne ok → kampf-beginnen: 17 Zeilen/0 ohne ok
```

**Und das ist nicht der Deploy, das bin ich.** Gemessen, nicht geschlossen:

1. Der Spielstand `Auto Save` **dieses** Spiels trägt `updated_at` **2026-11-10 09:22:44**
   und fünf Tableaus: `Henlo Bulwark | Fridgette Jones | Granny Melba | Blopsy Twins |
   Yancy Plover`. Das ist mein Fünfer-Testtisch aus der Sichtprüfung (`EZ`).
2. **Mein Browser-Tab von gestern ist noch offen**, mit genau dieser Adresse
   (`?opt=doerfler3:Granny&opt=doerfler4:Blopsy&opt=doerfler5:Yancy`) und
   `data-auto-save-enabled="true"` — nach dem Neustart des Backends um 09:13 hat er um
   09:22:44 wieder gespeichert.
3. `15 → 17` Zeilen sind **die zwei Dörfler auf den Plätzen 4 und 5**. Dass die Namen in
   der Zeile gleich aussehen, liegt am Rauchtest selbst: er schreibt
   `Dörfler ${seats.V1}/${seats.V2}/${seats.V3}` — **nur die ersten drei Plätze**
   (`auslagen-rauchtest.mjs`, Zeile 475, aus der Zeit vor M31). **Eine Blindstelle des
   Rauchtests**, nicht des Tisches; `FI` sollte die Zeile auf fünf Plätze erweitern.
4. **Alle sieben anderen Spielstände dieses Spiels und der ganze Aufbau-Abschnitt sind
   zeichengleich.** Hätte Welle 2 das Verhalten des Executors geändert, wären sie es
   nicht — sie laufen durch dieselben Aktionen.

**Der Tisch von der Seite des Spielers aus** (nachgesehen, nicht nur gemessen): die Seite
lädt das **neue** Bündel (`index-_kVF5aFE.js`), baut **fünf** Tableaus, 32 Spielsteine
und den Zähler `Münzen (gemeinsam)` — also den gemeinsamen Topf wie vor Welle 2. Genau
das ist die Zusage von M31.20: **ohne `villagers.lage` in den Daten tut Welle 2 nichts.**

## Nebenbefund beim Nachsehen: ~500 Konsolenfehler je Tischaufruf

Beim Laden des Tisches meldet die Konsole gut 500 Mal
`<rect> attribute width: Expected length, "NaN"` (und `height`). **Nicht von Welle 2**:
die Stelle ist `client/src/components/ZoneShape.jsx` Zeile 32 (`width={w - 2}`), und
diese Datei ist seit dem Deploy vor Welle 2 (`0730744`) **unverändert** — Welle 2 hat am
Client nur `SetupChoiceDialog.jsx`, `CreateRoomModal.jsx` und `sequenceSteps.js`
angefasst; die Zonendaten sind seit `EX` nicht geschrieben.

**Vorübergehend, nicht dauerhaft:** im fertigen DOM sind **62 Rechtecke und keines mit
`NaN`** — die Zonen zeichnen eine Runde, bevor ihre Geometrie (Ankerkästen, M31 `EU`/`EO`)
da ist. Sichtbarer Schaden ist keiner gemessen. Aber 500 Fehler je Aufruf **verdecken
echte**, und darum ist es als eigene Aufgabe abgelegt, nicht hier behoben.

## `FF` Teil 2 — `capacity` 3 → 4 an den fünf Hand-Zonen (Produktion)

**Freigabe:** ausdrücklich erteilt; die Pflichtfrage „ist ein Setup-Editor offen?" wurde
vorher gestellt und mit „kein Editor offen" beantwortet (der Server kann einen
schlafenden Tab nicht sehen, M31/`EX` — darum fragt der Mensch, nicht das Skript).

**Vorher gelesen.** `zone_data` **39886 Zeichen, sha `efe0b0743364`**, Hände
`1=3, 2=3, 3=3, 4=3, 5=3` — **genau der Ausgang, den Teil 1 aus der Fixture gerechnet
hatte**. Zielstand laut Konstanten: **39886/`e6bf6aeaf3d6`**. `--sicherung-sha`:
`d6da91c44dd9…38c9ef`.

**Sicherung:** `zone_data-M31-FF-vorher.json` im Scratchpad, 39 977 Bytes / 82 Zonen,
**sha256 der Datei = `efe0b0743364`** — also gegen die Lesung des Skripts geprüft, nicht
nur abgelegt.

**Rückwärtsbeweis, wirklich gefahren** (nicht nur gerechnet): auf einer
`VACUUM INTO`-Kopie der **Produktionsdatenbank** `--write` → `e6bf6aeaf3d6`, dann
`--zurueck` → `efe0b0743364`, „Zeichen für Zeichen die Sicherung"; Fingerabdrücke aller
Tabellen in der Transaktion und nach dem Commit unverändert. Kopie danach entfernt.

**Geschrieben.** `zone_data` 39886 → 39886 Zeichen, `efe0b0743364` → **`e6bf6aeaf3d6`**;
Hände `capacity 4, 4, 4, 4, 4`; **die 77 anderen Zonen Zeichen für Zeichen gleich**, die
Hände ohne `capacity` ebenso; „Zielstand aus den Konstanten erreicht"; Fingerabdruck
aller Tabellen in der Transaktion vorher/nachher **und** nach dem Commit neu gelesen:
unverändert; **alle 17 `save_states` mit gleichem sha**. Die zehn nicht geschriebenen
Spalten der Zeile sind einzeln gehasht und gleich. **Zweiter Lauf:** „schon geschrieben
— nichts zu schreiben".

**Rauchtest: 0 Beanstandungen**, und der `diff` gegen den Grundstand von `EY`
(2026-11-10 00:24, **vor** Welle 2) ist **völlig leer**.

Das ist kein Widerspruch zur Änderung, sondern ihr Zuschnitt: heute teilt der Aufbau die
Heldentaten in die **gemeinsame Auslage** (solo), die Hand-Zonen sind **leer**, und ein
Dorf-Ereignis passt in drei Plätze wie in vier. **Wirksam wird `capacity 4` erst mit
`FG`/`FH`**, die drei Heldentaten je Hand austeilen. Das einzige, was heute messbar
anders ist — die Ereigniskarte liegt **15 Punkte weiter links** (x 210 → 195) —, steht
nicht in der Ausgabe des Rauchtests; es steht im Test von Teil 1.

**Zwei Dinge für die Sichtprüfung (`FJ`), beide neu gemessen:**
1. Bei vier Plätzen ragen die **äußeren Karten je 5 Punkte über den Zonenrand** (Platz 1
   bei x−5, Platz 4 bei x+365 von 360); bei drei lagen alle 10 Punkte innerhalb. Die
   Hände stehen 50 auseinander, stoßen also nicht aneinander. **Kosmetisch.**
2. Die Karten (100 breit) **überlappen bei Abstand 90 um 10 Punkte** — gewollt, aber
   sichtbar.

**Die `Auto Save`-Zeile des Rauchtests ist kein Befund.** Sie hat sich heute dreimal
geändert (15 → 17 → 15 Zeilen in `kampf-beginnen`), weil ein **Tisch-Tab mit Auto-Save
offen** war und bei jedem Neuaufbau speichert — zuletzt durch den Auftraggeber selbst um
**10:12:59** (drei Tableaus, 106 650 Zeichen). **Kein Deploy und kein Schreiblauf hat sie
angefasst**; die Fingerabdrücke der Läufe belegen es. Für künftige Belege: **ein offener
Tisch-Tab macht diese Zeile zu einem wandernden Ziel** — vor dem Vergleich schließen oder
die Zeile ausklammern.

## Der NaN-Fix (`eb1d638`) — am laufenden Tisch geprüft

Der Zettel aus `FE` („~500 `<rect> … NaN`-Meldungen je Tischaufruf") ist erledigt:
`drawableSize` in `shared/zoneGeometry.js` entscheidet, ob es Maße zu zeichnen gibt;
`ZoneShape` zeichnet ohne sie nichts, statt `Math.max(1, undefined)` = `NaN` zu schreiben.
**Keine Vorgabemaße** (`0/0/100×140` wäre der Geisterrahmen aus `EO`).

Übernommen wurde **nur der Fix-Commit** (cherry-pick); die zwei `ci:`-Commits derselben
Sitzung (`docker-build.yml`) liegen weiter auf `zone-nan-render` — sie gehören nicht zum
Fix und waren nicht angefordert. Suite **2398 → 2408** (zehn neue Tests), Client-Bau mit
den zwei alten Warnungen, Deploy `eb1d638` grün.

**Gemessen:** neues Bündel `index-C_DN9gtz.js` (vorher `index-_kVF5aFE.js`). In einem
**frischen Tab**, nach einem Neuladen **mit schon laufender Aufzeichnung**: **keine einzige
Konsolenmeldung** (vorher gut 500, bei 500 gekappt); 42 Rechtecke, keines mit `NaN`.
*Warum zwei Läufe:* der erste Versuch im alten Tab zeigte noch NaN-Meldungen — der
Konsolenpuffer enthielt die von **vor** dem Fix, und ein leerer Puffer in einem frischen
Tab beweist nur dann etwas, wenn die Aufzeichnung beim Laden schon angehängt war.

## `FG` Teil 2 — `action_data`: `dorfphase-beginnen` 43 → 53, `dorfereignis` 6 → 11

**Freigabe:** ausdrücklich, mit der Antwort „alles zu" auf die Editor- und Tab-Frage.
**Reihenfolge:** erst der NaN-Deploy, dann der Schreiblauf — der Deploy legt neue
Container an und die von Hand kopierten Skripte verschwinden dabei (Anwesenheit geprüft,
nicht nur Hash: die Container waren eine Minute alt).

**Vorher gelesen:** `action_data` **7564/`9f41211076a4`**, `dorfereignis` 6,
`dorfphase-beginnen` 43 — genau der Ausgang, den Teil 1 gerechnet hatte (= Ziel von
`aktionen`). **Sicherung:** `action_data-M31-FG-vorher.json` im Scratchpad, 7 663 Bytes,
**sha der Datei = `9f41211076a4`** (gegen die Lesung des Skripts geprüft).

**Rückwärtsbeweis, wirklich gefahren:** auf einer `VACUUM INTO`-Kopie der Produktion
schreiben → `33b4dc50051e`, `--zurueck` → `9f41211076a4` (= die Sicherung, Zeichen für
Zeichen); Fingerabdrücke aller Tabellen in der Transaktion unverändert. Kopie entfernt.

**Geschrieben:** 7564 → **9961 Zeichen**, `9f41211076a4` → **`33b4dc50051e`**;
„Zielstand aus den Konstanten erreicht"; Fingerabdruck aller Tabellen vorher/nachher und
nach dem Commit neu gelesen unverändert; alle 17 `save_states` gleich; die zehn nicht
geschriebenen Spalten der Zeile gleich (`zone_data` trägt `e6bf6aeaf3d6` — das Ziel von
`FF`, die beiden Schritte stören sich nicht). **Zweiter Lauf:** „schon geschrieben".

**Der Rauchtest meldete zuerst 2 Beanstandungen — ein Befund, kein Rauschen.** Er nagelt
für die Doppelwahl die Schrittnummern der Dorfphase fest (`place_asset` bei 27–30). Mit
den zehn eingefügten Schritten sind es **37–40**. Gemessen, dass **nur** diese Nummern
wandern: `clear_table` bei 12, die Kampf- und Aufbauzeilen und die Münzen 21/42 sind
gleich. Die Beanstandung war also ein festgenagelter Index, kein verändertes Verhalten —
aber **beide Stände müssen bestehen**: ein bestehender Test (`EY 2`) fährt den Rauchtest
auf dem **Stand von Welle 1**, wo es weiter 27–30 sind. Mein erster Versuch (37–40 fest
verdrahtet) machte genau diesen Test rot. Jetzt rechnet `dorfSoll` die Verschiebung aus
der Zahl der Schritte (`schritte − 43`); beide Stände bestehen.

**Danach: 0 Beanstandungen, `EXIT=0`, und der `diff` gegen den Grundstand von `EY`
(vor Welle 2) ist die Kopfzeile allein** — `dorfereignis 6 → 11`,
`dorfphase-beginnen 43 → 53`. **Alle Verhaltenszeilen** (Münzen +12/+18/…, die solo-Tische,
die Spielstände) sind gleich: in der Lage solo tut `aktionen-spieler` nichts, genau wie
gebaut. Die `Auto Save`-Zeile ist diesmal **nicht** gewandert (kein Tisch-Tab war offen).

**Offen gelassen, ausdrücklich:** nach dem Schreiben melden `--check --schritt aktionen`
und `--schritt optionen` `ABWEICHEND` (beide ordnen `action_data` als Stand von Welle 1
ein) — erwartet, wie nach `FF`. **Wirksam wird `aktionen-spieler` erst mit `FH`**
(die Option `spieler`); bis dahin gibt es keinen Tisch, dessen Gates „mehrfach" lesen.

**Nachtrag: die NaN-Probe hat den Auto Save geschrieben** — erst nach allen Messungen,
der Spielstand trägt jetzt den Tisch mit Granny (drei Tableaus). Ein späterer Rauchtest
zeigt in der `Auto Save`-Zeile wieder einen anderen Wert; das ist dieser Aufruf, kein
Schreiblauf.

## `FH` Teil 2 — die Option `spieler` und der Aufbau der Spielerachse (Produktion)

**Das ist der Schritt, der die Spielerzahl für den Menschen sichtbar macht.**
**Freigabe:** ausdrücklich („FH Teil 2"); die Pflichtfrage zum offenen Editor / Tisch-Tab
wurde gestellt und mit „alles zu" beantwortet. Die Doppelwahl-Grenze (Platz 2) blieb
**wie dokumentiert**; Du hattest die Wahl, sie vorher beheben zu lassen, und hast
geschrieben.

**Vorher gelesen:** `scenario_data` **25284/`7368e504b85a`**, `sequence_data`
**2878/`712f93e99e1a`**, 31 Schritte, sieben Optionen, `villagers.lage` fehlt — **genau
der Ausgang, den Teil 1 gerechnet hatte**. Das Skript hat die Vorgänger **selbst
mitgelesen und geprüft**: `zone_data` 82 Zonen, Hände `capacity 4, 4, 4, 4, 4` (`FF`),
`action_data` 4 Aktionen, `dorfphase-beginnen` 53 Schritte (`FG`), `table_assets` 220
Zeilen. `--check`: Trockenlauf **0 Beanstandungen**; `validateOptions`,
`validateScenarioData`, `validateVillagers`, `lageOf` für jede Kombination und die Form
der Schritte alle 0 Probleme. `--sicherung-sha`: `d61927e4…700a`.

**Sicherung:** `scenario_data-M31-FH-vorher.json` (25 452 Bytes) und
`sequence_data-M31-FH-vorher.json` (2 890 Bytes) im Scratchpad; die **Datei-Hashes sind
`7368e504b85a` und `712f93e99e1a`** — also gegen die Lesung des Skripts geprüft, nicht nur
abgelegt.

**Rückwärtsbeweis, wirklich gefahren:** auf einer `VACUUM INTO`-Kopie der Produktion
schreiben → `377a3ba650fc` / `7ce4574774bd`, `--zurueck` → `7368e504b85a` /
`712f93e99e1a` („= die Sicherung, Zeichen für Zeichen", für **beide** Spalten);
Fingerabdrücke aller Tabellen unverändert. Der Hash der Kopie stimmt mit dem aus
`--check` überein. Kopie danach entfernt.

**Geschrieben:** `scenario_data` 25284 → **25582**, `377a3ba650fc`; `sequence_data`
2878 → **4622**, `7ce4574774bd`, **42 Schritte**; „Zielstand aus den Konstanten
erreicht"; Fingerabdruck aller Tabellen in der Transaktion und nach dem Commit neu
gelesen **unverändert**; **alle 17 `save_states` gleich**; die geschriebenen Spalten sind
die einzigen, die sich ändern (`zone_data` `e6bf6aeaf3d6` und `action_data`
`33b4dc50051e` tragen die Ziele von `FF` und `FG`). **Zweiter Lauf:** „schon geschrieben".

**Rauchtest: 0 Beanstandungen, `EXIT=0`, und der `diff` gegen den Grundstand von `EY`
(vor Welle 2) besteht aus genau zwei Zeilen** — der Kopfzeile (31 → **42** Schritte,
`dorfereignis` 6 → 11, `dorfphase-beginnen` 43 → 53) und der Optionenzeile (`spieler`
dazu). **Alle Verhaltenszeilen sind gleich:** mit der Vorgabe `s1` baut und läuft die
Produktion wie vor Welle 2. Das ist die Zusage von M31.20, am echten Datenbestand
gemessen. Die `Auto Save`-Zeile ist **nicht** gewandert (kein Tisch-Tab war offen).

**Nach dem Schreiben melden `--check --schritt optionen`, `--schritt aktionen` und
`--schritt zonen` `ABWEICHEND`** — erwartet, jeder ordnet seine Spalte als Stand von
Welle 1 ein; der Tages-Check darf es nicht als Fehler lesen (steht in `datenzugriff.md`).

**Am Dialog gesehen** (Multiplayer → Create Room → „TFT Aufbau"; **kein Raum angelegt**,
**kein Tisch geöffnet**, der Tab danach geschlossen): das Feld **„Spieler"** steht
zwischen „Toller Trödel" und „Dörfler 1", mit den fünf Wahlen „1 Spieler (Solo)" …
„5 Spieler" und der Vorgabe **„1 Spieler (Solo)"**. Die Wache aus `FC` greift **am echten
Dialog**: bei „3 Spieler" mit nur zwei Dörflern steht rot unter den Feldern
`option "spieler": 3 players but only 2 villagers - there must be at least as many
villagers as players`, und „Create Room" ist **gesperrt** (`disabled`).
*Gefunden beim Hinsehen, für `FJ`:* der **Problemtext ist englisch**, der Dialog deutsch —
`lageOf` formuliert wie `resolveChoices` seine Probleme (englisch, in `shared/`), der
Client zeigt sie unverändert. Kosmetisch, Nutzer sehen es nur, wenn sie eine
unzulässige Wahl treffen.

## `FI` Teil 2 — der Rauchtest kennt die Lagen, lesend gegen die Produktion

**Der Rauchtest hat jetzt einen Abschnitt „5. Die Lagen"** (`f290722`, Teil 1). Bis `FH` fuhr
er mit der Vorgabe `s1` und sah nur, dass sich nichts geändert hat; **die Spielerachse war
in der Produktion geschrieben, aber nur von Tests belegt.** Jetzt wird sie **am echten
Datenbestand** gemessen. Der Lauf ist **lesend** (`auslagen-rauchtest.mjs` schreibt nie):
keine Freigabe zum Schreiben nötig, keine Sicherung, kein Rückwärtsbeweis. Vorher die
**Anwesenheit** beider gebrauchten Skripte im Container geprüft (`auslagen-rauchtest.mjs`
**und** `doerflerzahl-daten.mjs`, das jener jetzt importiert) — der Deploy davor hatte neue
Container angelegt.

**Ergebnis: 0 Beanstandungen, `EXIT=0`, 105 Zeilen.** Gegenüber dem Lauf vor `FI` (86 Zeilen):
**19 hinzugefügte, 0 entfernte Zeilen** — der neue Abschnitt, sonst nichts. Alles Bestehende
ist zeichengleich; auch die `Auto Save`-Zeile (kein Tisch-Tab war offen).

**Was der Abschnitt misst** (alle Zahlen aus der Ausgabe, nicht aus dem Test):
- `lageOf` gegen die geschriebenen Daten: **40 Kombinationen** (5 Wahlen × 8 Platzbelegungen):
  solo 8, mehrfach 12, normal 8, **12 mit mehr Spielern als Dörflern** — dort genau ein
  Problem; für **6** dieser Kombinationen baut der Aufbau **nichts** (eine Zeile `failed`,
  der Tisch bleibt). Die Wahlen kommen **aus den Daten**, nicht aus festen Schlüsseln.
- **14 zulässige Fälle** (solo 4, mehrfach 6, normal 4): Aufbau → Ereignis → Kampf →
  Dorfphase, jeweils mit **Lage, Form des Geldes und den Schritten der Aktionen** auf
  Übereinstimmung geprüft — **die Probe „Gleiche Auskunft, zwei Zeitpunkte"**.

**Stichproben, dass die Zahlen aufgehen:** solo, 3 Dörfler: Topf **45** (3 × 15), nach der
Dorfphase **63** (+18), Auslage 6, Hände leer. Mehrfach, 3 Dörfler: Töpfe **15/15/15**, nach
der Dorfphase **21/21/21** (+6 je Topf), Auslage **0**, Hände **3/3/3**. Ereignis-Stapel **80**
in solo und mehrfach, **105** in normal (die 25 geheimen). Ereignis-Zeilen `1 + n`, in
solo **offen**, in mehrfach/normal **verdeckt**. Normal 5/5: fünf Töpfe 15 → 21, fünf Hände
mit je drei Karten.

**Die Gegenproben des Teils 1** (17 Mutationen in Wegwerf-Kopien der Daten, alle schlugen
an außer einer, die zu Recht nicht anschlug — Topf 1 auf den Namen von Topf 2, weil Platz 1
und 2 immer sitzen): fehlendes oder vertauschtes `onlyCounter` 2 bis 46, falsches
`onlyLage` 1 bis 52, Wahlen umbenannt 5, Stapel verfälscht 4 bis 14. **Zwei ehrliche
Grenzen:** (1) Fünf `onlyLage`-Mutationen schlagen nur mit **1** Beanstandung an, weil sie
die Zuordnung der Lagen zerstören und der Abschnitt dann abbricht — eine Erkennung an der
**Form** der Daten, nicht am laufenden Aufbau; die einzelne Hand mit 52 belegt die
Erkennung im laufenden Aufbau. (2) **Die Spielerzahl einer Wahl ist ihre Stelle in den
Daten:** die i-te Wahl muss „i Spieler" heißen; `lageOf` liest die Ziffer am Schlüssel. Wer
die Reihenfolge der Wahlen umstellt, wird beanstandet — gewollt, aber bekannt zu halten.

**Nicht belegt, ausdrücklich:** der Rauchtest läuft **im Speicher** und baut keinen
Raum. Der Raumstart steht in `doerflerzahl-aufbau-spieler.test.js` („FH 11") und
`room-lage.test.js` (`FC`), **nicht** gegen die Produktionsdatenbank. Am Dialog gesehen ist
er (siehe `FH` Teil 2); ein **ganzer Raum bis zum ersten Zug** ist bisher von **niemandem**
gespielt worden — das bleibt die Sichtprüfung am Tisch in `FJ`.
