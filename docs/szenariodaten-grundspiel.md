# Szenariodaten der neun übrigen Grundspiel-Bösewichte

Erfasst am 2026-11-07 in `setups.scenario_data` des Aufbaus **TFT Kurzpartie
(3 Bösewichte, beide Erweiterungen)** (`b1e10f4e-b8f2-4c2a-bb3e-54643944121b`,
Spiel `072123c0-cd97-4ffb-a330-369630fab93f`).

Vorher standen dort **11** Bösewichte (die drei Startbösewichte und die acht
aus „Neue Nachbarn", `docs/szenariodaten-erweiterung.md`), jetzt **20**. Die elf
sind **byteweise unverändert** (§10). `validateScenarioData` meldet für die
geschriebene Spalte **0 Probleme** gegen die echte Assetliste (212 Assets) und
das echte Raster `Spielfeld A–S / 1–14` (19 × 14, Feld 50).

Die Erhebung steht als wiederholbares Skript in
`scripts/szenariodaten-grundspiel.mjs` (Daten, Beweise, Trockenlauf, Schreiben),
geprüft in `server/test/szenariodaten-grundspiel.test.js` (27 Tests).
**Nicht deployt**; geschrieben wurde nur die Datenbank (die Daten gelten am Tisch
ab sofort, es braucht keinen Rebuild).

---

## 0. Kurzfassung

1. **Die Neunerliste stimmte.** 20 Kategorien `Aktionen: …`, 11 Schlüssel in
   `scenario_data`, die Differenz sind genau die neun (§1).
2. **Sieben der neun Namenszuordnungen sind allein über die Terrainlisten
   belegt. Bei zweien reicht das Terrain nicht:** Bert Doofis und Schnarchbert
   führen in `[DE S.33]` **dieselben sieben Terrains** — und Bort Dovis und
   Lawman Dozy legen auf ihren Tableaus auch dieselben sieben. Diese zwei sind
   über Fähigkeiten und Kartentexte belegt, nicht über das Terrain (§2.3). Die
   Zuordnung steht nirgends in den Daten (Schlüssel sind die englischen Namen);
   ein Irrtum verfälschte also nur die Namenstabelle.
3. **Positionen** (Gelände, Bösewicht `B`, Dörfler `D`, Endkampf-Felder `EG`) sind
   am entzerrten Raster abgelesen und gegen die Spielsteine geprüft. **Werte**
   (`BEW`/`LEB`, 3P-Spalte) stimmen mit `docs/tft-regeln.md` §5.5 überein; die
   Besondere Ausrüstung des Sheriffs ist für alle neun benannt und liegt in der
   Bibliothek.
4. **Unsicher** ist wenig, aber es ist benannt (§9) — vor allem Drehrichtungen
   dreier Maisfelder (nur nach Augenmaß), die Bärenfalle (welche Seite), die
   Zuordnung der Bürger-Plättchen zu den FF-Kästen bei Handsy, und die
   Namenszuordnung Bort ↔ Dozy über Text statt Terrain.
5. **Zwei Befunde, die auf Daten außerhalb dieser Arbeit zeigen:** `TRILLERPFEIFE`
   (Handsys Sheriff-Karte) gibt es **zweimal** in der Bibliothek — `place_card`
   meldet im Handsy-Endkampf „mehrdeutig". Und die **elf vorhandenen Einträge
   haben Fehler** (§11) — Ernie Offals rechte Hälfte liegt ein Feld daneben,
   Virginia Fitz fehlen drei Plättchen, mehrere Drehrichtungen sind verkehrt.
   Nichts davon wurde angefasst.

---

## 1. Die Neunerliste, gegen die Produktion geprüft

Gelesen aus der Produktionsdatenbank (Weg 1 aus `docs/datenzugriff.md`):

| | |
|---|---|
| Kategorien `Aktionen: …` in `categories` | **20** |
| Schlüssel in `scenario_data.bosses` vorher | **11** — Deputy Waggums, Virginia Fitz, The Bundits, Red Atrocious, Tilda Fields, Ernie Offal, Barry Bluff, Tartar Fishboy, Ms. Falls & Co., Patches, The Door Knockers |
| Differenz | **9** — Bort Dovis, Handsy, Lawman Dozy, Penny Pinchetti, Pepin Milkfrog, Qing & Kween, Samuel Strawman, Umbrello, Will Barlow |

Dieselbe Rechnung macht `--check` bei jedem Lauf; stimmen die Mengen nicht, bricht
er ab.

---

## 2. Welcher deutsche Bösewicht ist welcher englische

Die deutsche Anleitung nennt die Bösewichte anders als die englischen Tableaus.
Wie am 2026-10-14 ist die Zuordnung **nicht geraten**, sondern über die
**Terrainlisten** belegt: `[DE S.33]` (`Townsfolk_Tussle_Anleitung_WEB.pdf`) führt
je Grundspiel-Bösewicht sieben Terrains; dieselben sieben stehen als Plättchen auf
der Rückseite des englischen Tableaus. Die englische Grundspielanleitung liegt
nicht vor; das Tableau selbst ist die englische Seite des Vergleichs.

Das Skript **rechnet** den Beweis (`beweiseNamen`): Terrainnamen der Plättchen
(`Dichter Wald 2` → Dichter Wald, `Sprengstoff` / `Auslöser` → Sprengstoff &
Auslöser, Zweiseiter vorn) gegen die zwölf deutschen Listen; jeder Name darf nur
einmal vergeben sein.

### 2.1 Die Tabelle

| Englisch (= `$revealedBase`) | Deutsch `[DE S.33]` | Die sieben Terrains (deutsch; so viele Plättchen-Arten liegen auf dem Tableau) | Terrain allein eindeutig? |
|---|---|---|---|
| Bort Dovis | Bert Doofis | Dorfteich, Wunschbrunnen, Überwuchertes Maisfeld, Rostige Schrottkarre, Marodes Farmhaus, Gemüsebeet, Dichter Wald | **nein** (= Schnarchbert) |
| Handsy | Truthand | Altes Fass, Hohler Heuhaufen, Holzzaun, Sprengstoff & Auslöser, Marodes Farmhaus, Summender Bienenstock, Dichter Wald | ja |
| Lawman Dozy | Schnarchbert | Dichter Wald, Wunschbrunnen, Rostige Schrottkarre, Marodes Farmhaus, Gemüsebeet, Überwuchertes Maisfeld, Dorfteich | **nein** (= Bert Doofis) |
| Penny Pinchetti | Penny Gönnzales | Wunschbrunnen, Hütte des Dorfdoktors, Matschiger Graben, Miefiges Plumpsklo, Gemüsebeet, Marodes Farmhaus, Verwahrlostes Picknick | ja |
| Pepin Milkfrog | Freddy Froschmilch | Summender Bienenstock, Holzzaun, Trüber Fluss, Rostige Schrottkarre, Wunschbrunnen, Marodes Farmhaus, Bärenfalle | ja |
| Qing & Kween | Nönigin & Könich | Verwahrlostes Picknick, Dichter Wald, Bärenfalle, Wunschbrunnen, Hütte des Dorfdoktors, Werkzeugschuppen, Pilzwäldchen | ja |
| Samuel Strawman | Rüdiger Schreck | Holzzaun, Altes Fass, Hohler Heuhaufen, Marodes Farmhaus, Matschiger Graben, Überwuchertes Maisfeld, Miefiges Plumpsklo | ja |
| Umbrello | Fürst Wetternich | Dorfteich, Verwahrlostes Picknick, Trüber Fluss, Summender Bienenstock, Sprengstoff & Auslöser, Wunschbrunnen, Altes Fass | ja |
| Will Barlow | Jupp Karre | Dorfteich, Verwahrlostes Picknick, Matschiger Graben, Werkzeugschuppen, Hohler Heuhaufen, Marodes Farmhaus, Summender Bienenstock | ja |

Die deutsche und die englische Liste decken sich in jeder Zeile eins zu eins
(sieben gegen sieben, keine Abweichung). **Sieben der neun** treffen genau eine
deutsche Liste.

**Gegenprobe der Methode am vorhandenen Eintrag:** Deputy Waggums legt genau die
Terrains der Liste „Willy Wedler" — die Zuordnung, die `docs/tft-regeln.md` §5.5
und `docs/befund-beute-und-aufstellbares.md` §2.4 schon über die Beutekarten
belegen. (Für Virginia Fitz und The Bundits deckt sich der vorhandene Eintrag
**nicht** mit „Viktoria Spitz" / „Die Karnoven" — siehe §11.)

### 2.2 Zusätzliche Belege (nicht nötig, aber unabhängig)

Die Sheriff-Karten der deutschen Bibliothek und die Anleitungstexte `[DE S.33]`
tragen für sieben der neun den deutschen Namen oder eine Fähigkeit, die nur der
eine hat (§7 und §2.3):

| Deutsch | Beleg außerhalb des Terrains |
|---|---|
| Truthand | Karte TRILLERPFEIFE bewegt einen „Kauernden Bürger" (= Hiding Citizen auf Handsys Tableau); `[DE S.33]`: Aktionen mit „1000" im Namen = Handsys „1000"-Aktionen |
| Fürst Wetternich | Karte SHERIFFS ANKER nennt „Fürst Wetternich"; `[DE S.33]`: „Anrollende Welle" = Umbrellos Engulfing Wave |
| Rüdiger Schreck | Karte SHERIFFS FEUERZEUG nennt „Brennt es nieder!" (= Burn It Down!); `[DE S.33]`: „Weizenfelder" |
| Jupp Karre | Karte RITUAL-SET legt „Zeichen des Schmerzes" (= Ritual Marks); `[DE S.33]` nennt „Zeichen des Schmerzes" und „Ritual-Set" |
| Freddy Froschmilch | Karte KASIMIR, DIE KATZE verlangt, eine „Schwere Milchkanne" zu entfernen (= Giant Milk Jug) |
| Nönigin & Könich | `[DE S.33]`: Regel zu abgeworfener Ausrüstung = Qing & Kweens Fähigkeit „Grand Taxing"; Karte SHERIFFS KLEBSTOFF handelt von weggepackter Ausrüstung und passt dazu |
| Penny Gönnzales | Karte RISSIGE URKUNDE: wirft bei Erhalt alle Münzen ab (= „Fragile Deed", lose all Coins) |

### 2.3 Bort Dovis und Lawman Dozy — hier entscheidet das Terrain nicht

`DE_LISTEN` hat **zwölf** Listen, und **zwei davon sind gleich**: Bert Doofis und
Schnarchbert führen dieselben sieben Terrains. Auf den Tableaus legen Bort Dovis
und Lawman Dozy ebenfalls dieselben sieben. Das Terrain beweist hier „diese zwei
gehören zu diesen zwei", nicht welcher zu welchem.

Entschieden ist über die **Fähigkeiten**, die jeweils nur einer der beiden hat
(`TEXTBELEG` im Skript; der Beweis bricht ab, wenn für ein mehrdeutiges Terrain
kein Textbeleg da ist):

- **Bort Dovis = Bert Doofis:** `[DE S.33]` nennt für Bert die Fähigkeit
  „Kulturelle Aneignung" (zwei zusätzliche Bösewicht-Aktionsstapel) — Borts
  Tableau: „Spreading Culture", sein Aktionsdeck wird mit denen zweier ungenutzter
  Ruffians kombiniert. Dazu ein Foto-Symbol auf Berts Aktionen — Borts Tableau:
  Aktionen mit Kamera-Symbol. Dazu die Karte BERTS NOTIZBUCH (Sheriff-Ausrüstung
  von Borts Endkampf, „Ruffian Handbook").
- **Lawman Dozy = Schnarchbert:** `[DE S.33]` nennt für Schnarchbert ein
  zzz-Symbol (er „pennt ein") und sein „Schätzchen" — Dozys Tableau: zzz-Symbol und
  „Dozy's wife", die Nebenbösewichtin. Dazu die Karte STÄRKERE PILLEN, die
  „Schnarchbert" und „Schätzchen" beim Namen nennt (Sheriff-Ausrüstung von Dozys
  Endkampf, „Stronger Meds").

Das ist ein Textbeleg, kein Terrainbeleg; die Begriffe stimmen paarweise überein
und kreuzen sich nirgends. Dass die Tableaus selbst keinen deutschen Namen tragen,
bleibt der Grund, warum es nur ein Beleg über Entsprechungen ist (§9, Punkt 1).

---

## 3. Woher jede Angabe stammt

| Angabe | Quelle |
|---|---|
| Neunerliste | `categories` der Produktionsdatenbank (`Aktionen: …`) gegen `scenario_data` |
| Deutsche Terrainlisten, Fähigkeitsnamen | `[DE S.33]` (PyMuPDF-Text von `Townsfolk_Tussle_Anleitung_WEB.pdf`); die zwölf Listen stehen in `DE_LISTEN` |
| **Platzierung (alle Feldadressen)** | **Rückseite des Tableaus**, `table_assets."Tableau: <Name>".back_image_path`, aus dem Upload-Verzeichnis des Containers geholt |
| Szenarioname | Banner unter dem Raster auf derselben Rückseite („FINAL FIGHT / …") |
| Endkampf-Felder (`EG`) | die mit **FF** beschrifteten Kästen im Raster; nummeriert (FF1–FF5) bei Pepin und Samuel, unnummeriert bei Handsy |
| Endkampf-Aufbau, Sheriff-Ausrüstung | SETUP-Band unter dem Szenariobanner |
| `BEW` / `LEB` | **Vorderseite** desselben Tableaus, Spalte **3P** (solo, drei Dörfler — `docs/tft-regeln.md` §5.4) |
| Sheriff-Karte | Name im SETUP-Band; Karte über **Kartenbild und Kartentext** der deutschen Bibliothek (§7) |
| Drehung, Variante `Dichter Wald` / `…2` | gemessen am Bild (§6) |
| Seitenverhältnisse | PNG-Köpfe der Assetdateien im Container, `checkScenarioAspect` |

Bildmaße der Tableaus: **Pepin, Qing & Kween, Samuel, Umbrello** sind sauberes
Artwork (1500 × 3000), **Bort Dovis (1609 × 3198), Handsy (1276 × 2555), Lawman
Dozy (1410 × 2807), Penny Pinchetti (1725 × 3438), Will Barlow (1599 × 3181)** sind
Fotos des gedruckten Tableaus, leicht verkippt. Die PDFs unter
`Z:\Austausch\TfT\` (`Bort_Dovis.pdf`, `Handsy.pdf`, `Lawman_Dozy.pdf`,
`Penny_Pinchetti.pdf`, `Will_Barlow.pdf`) wurden **nicht** geöffnet; gearbeitet
wurde mit den Bildern aus der Datenbank, die dieselben Fotos sein dürften
(ungeprüft, §9).

**Ableseverfahren.** Je Rückseite wurde die Rasterlage **aus den gedruckten
Linien** bestimmt: Spalten- und Zeilenprofil des entzerrten Bildes, Tiefpunkte an
den erwarteten Linien, lineare Anpassung über die Stützpunkte (15–18 von 18
Spaltenlinien, 10–13 von 13 Zeilenlinien), das Ergebnis als Perspektiv-Entzerrung
auf 19 × 14 Felder zu je 64 px. Diese Lage wurde gegen **zwei unabhängige Dinge**
geprüft: die aufgedruckten Spaltenbuchstaben A–S über dem Raster, und die
Spielsteine, die zellgenau sitzen müssen (R ist 2 × 2, T ist 1 × 1 — sitzt ein
Stein auf einer Zellmitte, stimmt das Raster dort). Danach wurde ein Gitter mit
Feldnamen über jedes Bild gelegt, jedes Teil und jeder Stein gegen die Beschriftung
gelesen, und am Ende **jeder Eintrag als Umriss über das entzerrte Bild gezeichnet**
und angesehen — alle neun decken sich mit dem Artwork.

**Gegenprobe an den Normgrößen.** Die Bereiche decken sich mit den bekannten
Grundflächen: Gemüsebeet 3×3, Hütte 3×3, Dorfteich 5×5, Wald 7×4, Maisfeld 5×3,
Farmhaus 5×4, Heuhaufen 3×2, Schuppen 2×3, Jalopy 3×2, Zaun 4×1, Fluss und Graben
12×2, Plumpsklo / Brunnen / Bienenstock / Picknick / Pilz 2×2, Fass und Bärenfalle 1×1
(`docs/szenariodaten-erweiterung.md` §2 und §5, Lücke 4).

---

## 4. Die Tabellen

Raster `Spielfeld A–S / 1–14`. Alle Geländeeinträge stehen als **Bereich** (auch
einfeldrige, als `K12`). `rot` = `rotation`, `↓` = `faceDown: true`. `B` ist der
Bösewicht (2×2), `D` die fünf Dörferfelder (zeilenweise geordnet; solo gelten die
ersten drei), `EG` die Endkampf-Felder.

### Bort Dovis (Bert Doofis) — „Bort Meets the Locals"

| Gelände | Felder | |
|---|---|---|
| Rostige Schrottkarre | K1:L3 | rot 270 |
| Gemüsebeet | M1:O3 | |
| Wunschbrunnen | F3:G4 | |
| Marodes Farmhaus | M4:Q7 | rot 180 |
| Dorfteich | C5:G9 | |
| Überwuchertes Maisfeld | H5:J9 | rot 270 (Augenmaß, §6.3) |
| Dichter Wald | M11:S14 | |

`B` = E11:F12 · `D` = K10, I11, L12, I13, K13 · kein `EG`. `BEW`/`LEB` 7 / 15 ·
Sheriff: **BERTS NOTIZBUCH** (Ruffian Handbook).

### Handsy (Truthand) — „The Hostile Hand Hijacking"

| Gelände | Felder | |
|---|---|---|
| Marodes Farmhaus | O1:S4 | rot 180 |
| Sprengstoff (= TNT-Kasten) | N3 | Name gegen Artwork vertauscht, §6.4 |
| Holzzaun | D4:G4, K4:N4 | zwei Zäune |
| Hohler Heuhaufen | C7:D9 | rot 270 |
| Dichter Wald 2 | I7:L13 | rot 270 |
| Summender Bienenstock | O9:P10 | |
| Altes Fass | C10 | |
| Auslöser (= Dynamitbündel) | H12 | Name gegen Artwork vertauscht, §6.4 |

`B` = J5:K6 · `D` = H4, O5, G6, F7, Q7. `final`: **fünf Versteckte Bürger** auf den
fünf FF-Kästen **P5, E7, M9, H10, M12** (offen; welcher Bürger auf welchen Kasten,
sagt das Tableau nicht), `EG` = diese fünf. `BEW`/`LEB` 7 / 14 · Sheriff:
**TRILLERPFEIFE** (Warning Whistle) — ⚠ mehrdeutiger Kartenname, §8.

### Lawman Dozy (Schnarchbert) — „Dozy Nabs a Sidekick"

| Gelände | Felder | |
|---|---|---|
| Rostige Schrottkarre | J1:K3 | rot 270 |
| Marodes Farmhaus | L1:P4 | rot 180 |
| Gemüsebeet | Q1:S3 | |
| Wunschbrunnen | D4:E5 | |
| Dichter Wald 2 | B6:H9 | |
| Dorfteich | L7:P11 | |
| Überwuchertes Maisfeld | Q7:S11 | rot 90 (Augenmaß, §6.3) |

`B` = J10:K11 · `D` = F10, G11, F13, H13, L13. `final`: `EG` = **F4:G5** (der
FF-Kasten, 2×2 — der Platz von Dozys „Schätzchen", einem zufälligen ungenutzten
Ruffian; **kein Geländeteil**). `BEW`/`LEB` 6 / 14 · Sheriff: **STÄRKERE PILLEN**
(Stronger Meds).

### Penny Pinchetti (Penny Gönnzales) — „The Daring Deed Defense"

| Gelände | Felder | |
|---|---|---|
| Marodes Farmhaus | P1:S5 | rot 270 |
| Matschiger Graben | J2:K13 | rot 270 |
| Hütte des Dorfdoktors | A5:C7 | |
| Verwahrlostes Picknick | R6:S7 | |
| Wunschbrunnen | A8:B9 | |
| Miefiges Plumpsklo | M10:N11 | |
| Gemüsebeet | O10:Q12 | |

`B` = F7:G8 · `D` = I3, L5, L7, I9, G12 · kein `EG`. `BEW`/`LEB` 7 / 15 · Sheriff:
**RISSIGE URKUNDE** (Fragile Deed).

### Pepin Milkfrog (Freddy Froschmilch) — „The Dairylord Takeover"

| Gelände | Felder | |
|---|---|---|
| Wunschbrunnen | R1:S2 | |
| Holzzaun | N1:N4 | rot 270 |
| Rostige Schrottkarre | Q5:S6 | |
| Trüber Fluss | H7:S8 | |
| Holzzaun | H9:H12 | rot 270 |
| Summender Bienenstock | C11:D12 | |
| Bärenfalle | K12 | Seite offen, §6.5 |
| Marodes Farmhaus | O11:S14 | |

`B` = D3:E4 · `D` = K2, I4, H6, E7, G8. `final`: **FF1 N14, FF2 A1, FF3 S9, FF4 M1,
FF5 A9** (so nummeriert gedruckt) = `EG`; gelegt werden **drei „Giant Milk Jug"**
(„1 je Dörfler in nummerierter Reihenfolge", solo drei) auf FF1–FF3 — die
**Rückseite** des Hiding-Citizen-Plättchens, darum `↓` (Katze, Dörflerin,
Soßenflasche als Assets; welche, ist gleich). `BEW`/`LEB` 6 / 14 · Sheriff:
**KASIMIR, DIE KATZE** (Jerry the Cat).

### Qing & Kween (Nönigin & Könich) — „Death, Taxes...And Death!"

| Gelände | Felder | |
|---|---|---|
| Verwahrlostes Picknick | B1:C2 | |
| Dichter Wald | D1:G7 | rot 270 |
| Wunschbrunnen | L1:M2 | |
| Hütte des Dorfdoktors | Q3:S5 | |
| Bärenfalle | L5 | Seite offen, §6.5 |
| Werkzeugschuppen | Q6:S7 | rot 90 |
| Dichter Wald 2 | I9:O12 | |
| Pilzwäldchen | P10:Q11 | |

`B` = E11:F12 · `D` = C8, G8, I8, B9, J13 · kein `EG`. `BEW`/`LEB` 6 / 14 · Sheriff:
**SHERIFFS KLEBSTOFF** (Sheriff's Glue).

### Samuel Strawman (Rüdiger Schreck) — „The Sacrificial Fields"

| Gelände | Felder | |
|---|---|---|
| Marodes Farmhaus | H1:L4 | rot 180 |
| Hohler Heuhaufen | F2:G4 | rot 270 |
| Matschiger Graben | M3:N14 | rot 270 |
| Überwuchertes Maisfeld | O6:Q10 | rot 90 |
| Altes Fass | A7 | |
| Holzzaun | A8:D8, I8:L8 | zwei Zäune |
| Miefiges Plumpsklo | I11:J12 | |

`B` = F8:G9 · `D` = D7, J7, L9, C11, F14. `final`: **FF1 R1:S2, FF2 C13:D14, FF3
A1:B2, FF4 R12:S13, FF5 M1:N2** (alle 2×2, nummeriert) = `EG`; gelegt werden **drei
„Wheat Field"** („1 je Dörfler in nummerierter Reihenfolge") auf FF1–FF3 — die
**Rückseite** von `Ritualzeichen / Weizenfeld` (vorn steht das Ritualzeichen aus
Will Barlows Kampf), darum `↓`. `BEW`/`LEB` 7 / 15 · Sheriff: **SHERIFFS FEUERZEUG**
(Sheriff's Lighter).

### Umbrello (Fürst Wetternich) — „The Great Town Flooding"

| Gelände | Felder | |
|---|---|---|
| Verwahrlostes Picknick | C3:D4 | |
| Summender Bienenstock | L3:M4 | |
| Auslöser (= Dynamitbündel) | N4 | Name gegen Artwork vertauscht, §6.4 |
| Dorfteich | C5:G9 | |
| Wunschbrunnen | R5:S6 | |
| Trüber Fluss | H7:S8 | |
| Altes Fass | S10 | |
| Sprengstoff (= TNT-Kasten) | S11 | Name gegen Artwork vertauscht, §6.4 |

`B` = H12:I13 · `D` = J10, N11, D12, D14, K14. `final`: `EG` = **A5:B6** (ein
FF-Kasten, 2×2); gelegt wird die **Verschlingende Welle** („Place Engulfing Wave
on the board"). `BEW`/`LEB` 6 / 14 · Sheriff: **SHERIFFS ANKER** (Sheriff's Anchor).

### Will Barlow (Jupp Karre) — „The Necessary Sacrifice"

| Gelände | Felder | |
|---|---|---|
| Werkzeugschuppen | Q1:S2 | rot 90 |
| Verwahrlostes Picknick | C4:D5 | |
| Dorfteich | C6:G10 | |
| Matschiger Graben | H6:S7 | |
| Hohler Heuhaufen | Q8:S9 | |
| Summender Bienenstock | J10:K11 | |
| Marodes Farmhaus | P10:S14 | rot 270 |

`B` = M3:N4 · `D` = J1, J3, S4, I5, L8 · kein `EG`. `BEW`/`LEB` 7 / 14 · Sheriff:
**RITUAL-SET** (Knife N' Bucket). Die „5 Ritual Mark terrain pieces for later use"
gehen zum Sheriff, nicht aufs Brett — dafür gibt es keinen Platz in den Daten
(wie Patches' Fetid Furballs, `docs/szenariodaten-erweiterung.md` §8.5).

---

## 5. Kampfwerte BEW und LEB

Vorderseite des Tableaus, Zeilen **MVMT** und **HEALTH** in den Spalten
2P / 3P / 4P / 5P; **solo drei Dörfler → 3P** (§5.4). Alle neun Zahlenpaare sind
eindeutig lesbar; sie decken sich Zeile für Zeile mit `docs/tft-regeln.md` §5.5,
das nicht gegengeprüft war — hiermit ist es für diese neun gegengeprüft.

| Bösewicht | MVMT 2P/**3P**/4P/5P | HEALTH 2P/**3P**/4P/5P | **BEW** | **LEB** |
|---|---|---|---|---|
| Bort Dovis | 7 / **7** / 8 / 8 | 11 / **15** / 18 / 21 | **7** | **15** |
| Handsy | 7 / **7** / 8 / 8 | 11 / **14** / 18 / 21 | **7** | **14** |
| Lawman Dozy | 5 / **6** / 6 / 6 | 12 / **14** / 18 / 21 | **6** | **14** |
| Penny Pinchetti | 7 / **7** / 8 / 8 | 12 / **15** / 18 / 21 | **7** | **15** |
| Pepin Milkfrog | 6 / **6** / 7 / 7 | 11 / **14** / 17 / 20 | **6** | **14** |
| Qing & Kween | 6 / **6** / 7 / 7 | 11 / **14** / 17 / 20 | **6** | **14** |
| Samuel Strawman | 6 / **7** / 7 / 8 | 11 / **15** / 18 / 21 | **7** | **15** |
| Umbrello | 6 / **6** / 7 / 7 | 11 / **14** / 17 / 20 | **6** | **14** |
| Will Barlow | 7 / **7** / 7 / 7 | 11 / **14** / 17 / 20 | **7** | **14** |

Zu **Will Barlow:** die FAQ (`[FAQ S.2]`) nennt einen Druckfehler auf Jupp Karres
Tableau (die 3-Dörfler-Spalte sei falsch beschriftet). Auf dem Bild aus der
Datenbank steht die Beschriftung 2P 3P 4P 5P richtig; gelesen ist die **zweite**
Spalte (LEB 14), wie die FAQ es verlangt. Der Wert stimmt unabhängig davon.

---

## 6. Drehungen, Varianten, Namen — am Bild nachgemessen

Die vorhandenen Einträge tragen `rotation` dort, wo ein Plättchen erkennbar quer
zu seinem Asset liegt, und sagen, die Richtung (90 oder 270) sei „am Artwork
ablesbar". Hier ist sie **gemessen**: das Tableaubild jedes Plättchens (am
entzerrten Raster ausgeschnitten) wurde mit dem Asset in allen Drehungen
verglichen (normierte Kreuzkorrelation nach Hochpass; je höher, desto besser). Die
Richtung ist die CSS-Richtung des Tisches (`rotate(…deg)`, im Uhrzeigersinn;
`GameTable.jsx`); der Schuppen mit der roten Tür links ist 90, so wie bei Virginia
Fitz' Eintrag.

### 6.1 Wo `rotation` steht und woher

| Plättchen | Eintrag | gemessen (gesetzte Drehung / beste andere) |
|---|---|---|
| Rostige Schrottkarre | Bort K1:L3 **270**; Dozy J1:K3 **270**; Pepin Q5:S6 0 | 0,45 / −0,01; 0,39 / −0,03; 0,44 |
| Matschiger Graben | Penny J2:K13 **270**; Samuel M3:N14 **270**; Will H6:S7 0 | 0,72 / 0,02; 0,48 / 0,01; 0,66 |
| Trüber Fluss | Pepin H7:S8 0 | 0,80 / 0,04 |
| Holzzaun | Pepin N1:N4 **270**, H9:H12 **270**; Handsy D4:G4, K4:N4 0 | 0,25 / 0,07; 0,21 / 0,03; 0,53; 0,26 |
| Hohler Heuhaufen | Handsy C7:D9 **270**; Samuel F2:G4 **270**; Will Q8:S9 0 | 0,29 / 0,01; 0,10 / 0,01; 0,46 |
| Werkzeugschuppen | Qing Q6:S7 **90**; Will Q1:S2 **90** | 0,13 / 0,03; 0,15 / 0,02 |
| Dichter Wald (beide Varianten) | Qing D1:G7 **270**; Handsy I7:L13 **270**; die anderen 0 | 0,48 / 0,00; 0,45 / 0,00; Bort 0,46 |
| Marodes Farmhaus | siehe 6.2 | |
| Überwuchertes Maisfeld | siehe 6.3 | |

Zäune ohne Drehung (Samuel A8:D8, I8:L8) messen schwach (0,01) — ein Zaun sieht
rotiert und gespiegelt fast gleich aus; sie liegen waagerecht, mehr sagt die
Zahl nicht (§9).

### 6.2 Marodes Farmhaus

Das Farmhaus liegt in den Tableaus in **drei** Ausrichtungen (0°, 180°, 270°), und es ist das einzige
Teil, bei dem eine nicht erfasste Drehung das Bild sofort falsch aussehen lässt (weißes Dach unten statt oben):

| Tableau | Felder | Drehung | gemessen |
|---|---|---|---|
| Bort Dovis | M4:Q7 | **180** | 0,31 (0° : 0,00) |
| Handsy | O1:S4 | **180** | 0,53 |
| Lawman Dozy | L1:P4 | **180** | 0,22 (0° : 0,00) |
| Samuel Strawman | H1:L4 | **180** | Auge (Zahl nur 0,02–0,09, Artwork leicht anders); das weiße Dach liegt oben |
| Penny Pinchetti | P1:S5 | **270** | 0,10–0,12 (90° : 0,02); das weiße Dach liegt rechts |
| Will Barlow | P10:S14 | **270** | 0,20 vorn / 0,49 hinten (90° : 0,00) |
| Pepin Milkfrog | O11:S14 | 0 | 0,15 |

**Welche Seite des Zweiseiters liegt:** an sechs Farmhäusern nebeneinandergelegt
(entdreht, Tableau | Vorderseite | Rückseite „gedeckter Tisch") zeigt die **Vorderseite**
(ohne den gedeckten Tisch im Hof) — alle sechs ohne `faceDown`.

### 6.3 Überwuchertes Maisfeld — Richtung nur nach Augenmaß

Das Maisfeld ist ein Muster; die Korrelation trägt hier nichts (Werte ≈ 0, auch
für die vorhandenen Einträge). Die Richtung ist deshalb an **Landmarken** abgelesen
und bleibt Augenmaß: die weiße Skelett-Hand, der weiße Schädel, die roten Schleifen,
das schwarze Wesen mit den roten Augen, die Truhe.

| Tableau | Felder | Drehung | Landmarken |
|---|---|---|---|
| Samuel Strawman | O6:Q10 | **90** | Schädel oben, Hand links, Wesen links unten, Truhe rechts daneben (sauberes Artwork, eindeutig) |
| Lawman Dozy | Q7:S11 | **90** | Foto: Hand links, Schädel oben, Wesen links unten |
| Bort Dovis | H5:J9 | **270** | Foto: Hand rechts, Schädel unten, Truhe oben links vom Wesen |

Bei Samuel (Artwork) ist die Richtung sicher; bei Dozy und Bort (Fotos) ist sie
nach den gleichen Landmarken entschieden, aber nicht maschinell bestätigt.

### 6.4 `Dichter Wald` und `Dichter Wald 2` sind zwei verschiedene Bilder

Die zwei Assets sind **nicht** dasselbe Artwork (die Kreuzkorrelation trennt sie
klar: 0,4–0,7 mit der richtigen Variante, ≈ 0 mit der falschen). Die Variante ist
also kein Zufall und steht nach Messung in den Daten:

| Tableau | Felder | Asset |
|---|---|---|
| Bort Dovis | M11:S14 | **Dichter Wald** (0,46) |
| Qing & Kween | D1:G7 (270) | **Dichter Wald** (0,48) |
| Qing & Kween | I9:O12 | **Dichter Wald 2** (0,64) |
| Lawman Dozy | B6:H9 | **Dichter Wald 2** (0,72) |
| Handsy | I7:L13 (270) | **Dichter Wald 2** (0,45) |

*Folge:* bei Handsy und Lawman Dozy liegt **nur** `Dichter Wald 2`, und für den
gibt es keine Geländekarte (der Namensvergleich findet „Dichter Wald 2" nicht, die
Karte heißt „Dichter Wald"). Dort fehlt die Wald-Karte in der Terrain-Auslage —
bei Eintrag mit zwei Wäldern (Qing) deckt die erste sie ab. Das ist dieselbe
Klasse wie `docs/szenariodaten-erweiterung.md` §8.7, und auch hier nicht behoben.

### 6.5 Sprengstoff / Auslöser — die Assetnamen sind gegenüber dem Artwork vertauscht

Das Asset **`Sprengstoff`** zeigt den **TNT-Kasten mit weißem Plunger**, das Asset
**`Auslöser`** das **Dynamitbündel**. Gelegt ist, was auf dem Tableau zu *sehen* ist:

- Handsy: TNT-Kasten auf **N3** (= Asset `Sprengstoff`), Dynamitbündel auf **H12**
  (= `Auslöser`).
- Umbrello: Dynamitbündel auf **N4** (= `Auslöser`), TNT-Kasten auf **S11**
  (= `Sprengstoff`).

Bei Red Atrocious und Barry Bluff stimmt die vorhandene Belegung mit dem Artwork
überein (Kasten in `Sprengstoff`, Dynamit in `Auslöser`). Die deutsche Geländekarte
heißt `Sprengstoff & Auslöser` und wird, weil kein Name trifft, nie ausgelegt
(`docs/szenariodaten-erweiterung.md` §8.7).

### 6.6 Bärenfalle

Pepin K12 und Qing L5 tragen eine halb geschlossene Falle (Zähne links, orange Platte
rechts). Das ist die Gestalt der **Rückseite** („zugeschnappt") des Assets, um 180°
gedreht, nicht der Vorderseite (voller offener Ring). Welche Seite der Spieltisch
als „scharf" liest, ist nicht entscheidbar; die Tableaus zeichnen die Falle ohnehin
neu (das Asset ist ein Foto des Plättchens, das Tableau eine Illustration; dasselbe
gilt für Altes Fass und Wunschbrunnen). Der Eintrag legt die **Vorderseite ohne
Drehung** — ungeprüft (§9).

### 6.7 Quadratische Plättchen

Hütte, Brunnen, Picknick, Plumpsklo, Bienenstock, Pilzwäldchen, Teich, Gemüsebeet,
Fass: **keine Drehung erfasst**, wie in den elf. Die Tableaus drehen sie durchaus
(der Brunnen liegt in Bort, Dozy, Pepin und Qing um 180° zum Asset, bei Penny um 90°;
auf Virginias Tableau liegt der TNT-Kasten um 90° gedreht), aber die Korrelation (0,2–0,4)
ist bei Teilen, die das Tableau neu zeichnet, kein Beleg. Siehe §9.

---

## 7. Die Besondere Ausrüstung des neuen Sheriffs

SETUP-Band der Rückseite; Karte über Bild und Text der deutschen Bibliothek
(Kategorie `Einzigartige Ausrüstung`, 28 Karten).

| Bösewicht | SETUP nennt (englisch) | Karte (deutsch) | Beleg am Kartentext | Sicherheit |
|---|---|---|---|---|
| Bort Dovis | Ruffian Handbook | **BERTS NOTIZBUCH** | trägt Berts Namen, wirkt auf die erste Bösewicht-Aktion in Berts Zug | sicher |
| Handsy | Warning Whistle | **TRILLERPFEIFE** | bewegt einen „Kauernden Bürger" (= Hiding Citizen) | sicher (⚠ zwei Karten gleichen Namens, §8) |
| Lawman Dozy | Stronger Meds | **STÄRKERE PILLEN** | nennt Schnarchbert und sein „Schätzchen" | sicher |
| Penny Pinchetti | Fragile Deed | **RISSIGE URKUNDE** | Münzen werden bei Erhalt abgeworfen (= „lose all Coins" im SETUP) | sicher |
| Pepin Milkfrog | Jerry the Cat | **KASIMIR, DIE KATZE** | Katze, Waffe; wirkt, wenn eine „Schwere Milchkanne" entfernt wird | sicher |
| Qing & Kween | Sheriff's Glue | **SHERIFFS KLEBSTOFF** | Klebstoff; verhindert, dass Ausrüstung weggepackt wird — passt zu Qing & Kweens Ausrüstungs-Fähigkeit | sicher |
| Samuel Strawman | Sheriff's Lighter | **SHERIFFS FEUERZEUG** | Bonus auf Terrain-Würfe für die Fähigkeit „Brennt es nieder!" (= Burn It Down!) | sicher |
| Umbrello | Sheriff's Anchor | **SHERIFFS ANKER** | nennt „Fürst Wetternich" (Bewegen/Platzieren darf ignoriert werden) | sicher |
| Will Barlow | Knife N' Bucket | **RITUAL-SET** | Messer + Eimer; platziert „Zeichen des Schmerzes" (= Ritual Marks) | sicher |

Alle neun liegen in der Kategorie `Einzigartige Ausrüstung`. Acht Namen treffen in
der Bibliothek **genau eine** Karte (`findCardByName`, Gleichheit auf `squashName`).

---

## 8. Ein Befund außerhalb: `TRILLERPFEIFE` gibt es zweimal

In der Bibliothek stehen zwei Karten dieses Namens:

| `cards.id` (Anfang) | Kategorie | Bild |
|---|---|---|
| `803a66e4` | `Einzigartige Ausrüstung` | Handsys Sheriff-Karte |
| `4e7f07e0` | `Toller Trödel: Nachschub (gesperrt, Nr. 31-162)` | Nr. 144, „Maestro & Chef" |

Das sind verschiedene Karten (verschiedene Bilder, anderer Text). `findCardByName`
findet bei zwei Treffern mit verschiedenen Bildern „mehrdeutig" und legt **keine**:
im Handsy-Endkampf meldet `place_card "$SHERIFF"` `failed — "TRILLERPFEIFE" matches
2 cards`. Eingetragen ist der **richtige** Name; die Daten können die Mehrdeutigkeit
nicht auflösen (`$SHERIFF` ersetzt nur den Namen). Behebung braucht eine
Entscheidung außerhalb dieser Arbeit (Karte der Erweiterung umbenennen, oder dem
Schritt eine Kategorie geben).

---

## 9. Was ungeprüft blieb

Dieser Abschnitt ist absichtlich lang. Die Werte oben sind, wo nichts anderes steht,
sicher gelesen.

1. **Bort ↔ Dozy ist über Text, nicht über Terrain belegt** (§2.3). Die Belege sind
   Entsprechungen zwischen deutschen Fähigkeitsnamen und englischen Tableautexten —
   keine Seite nennt die andere. Ich halte sie für sicher, aber sie sind von anderer
   Art als der Terrainbeleg der übrigen sieben. In den Daten steht die Zuordnung nicht;
   ein Irrtum beträfe nur diese Tabelle und die Namenstabelle in `docs/tft-regeln.md`.
2. **Fünf der neun Tableaus sind Fotos** (Bort Dovis, Handsy, Lawman Dozy, Penny
   Pinchetti, Will Barlow). Das Raster ist aus den gedruckten Linien entzerrt und gegen
   Buchstaben und Steine geprüft, jede Ablesung gegen den eingezeichneten Umriss; eine
   Restabweichung von einem Zehntelfeld ist möglich. **Gemessen wurde nur am Bild aus der
   Datenbank**, nicht am gedruckten Tableau und nicht an den PDFs unter `Z:\Austausch\TfT\`
   (die nicht geöffnet wurden).
3. **Drehrichtung der drei Maisfelder** (Bort 270, Dozy 90, Samuel 90): Augenmaß nach
   Landmarken (§6.3), nur bei Samuel (Artwork) eindeutig.
4. **Drehung des Samuel-Farmhauses** (180): Augenmaß, die Zahl ist schwach (§6.2).
5. **Zäune ohne Drehung** (Samuel A8:D8, I8:L8; Handsy K4:N4 nur 0,26): waagerecht
   gelesen; eine Drehung um 180° wäre am Bild nicht von keiner zu unterscheiden.
6. **Quadratische Plättchen ohne Drehung** (§6.7): die Tableaus drehen sie, die Daten
   nicht — wie in den elf. Sieht am Tisch anders aus, ändert das Spiel nicht.
7. **Bärenfalle** (Pepin K12, Qing L5): welche Seite, ungeklärt (§6.6).
8. **Handsys Bürger:** die FF-Kästen sind **unnummeriert**; Reihenfolge ist zeilenweise
   (P5, E7, M9, H10, M12), und welches der fünf Bürger-Assets auf welchen Kasten
   kommt, sagt das Tableau nicht (Listenfolge). Für Handsy gilt „5 Bürger" unabhängig
   von der Dörferzahl.
9. **Pepin / Samuel:** 3 von 5 Endkampf-Teilen (solo: „1 je Dörfler"), auf FF1–FF3;
   die Wahl der Assets (Katze/Dörflerin/Soßenflasche) ist beliebig — alle Rückseiten
   sind dieselbe Kanne.
10. **Fehlende Geländekarten** (kein Mangel der Daten, aber sichtbar am Tisch):
    `Sprengstoff` / `Auslöser` (Handsy, Umbrello), `Dichter Wald 2` (bei Handsy und
    Dozy ohne Ersatz, §6.4), `Versteckter Bürger … / Große Milchkanne` (Handsy, Pepin),
    `Ritualzeichen / Weizenfeld` (Samuel), `Verschlingende Welle` (Umbrello). Wie
    `docs/szenariodaten-erweiterung.md` §8.7–8.9: die Plättchen liegen, die Karten gibt
    es nicht oder unter anderem Namen. **Nicht behoben**, weil jede Behebung eine
    Entscheidung verlangt (Assets umbenennen oder Karten anlegen).
11. **`TRILLERPFEIFE` mehrdeutig** (§8): Handsy-Endkampf legt die Karte nicht.
12. **Nicht abgebildet, weil kein Platz in den Daten:** Dozys „Schätzchen" (3 LEB je
    Dörfler, nimmt ihren Zug nach Dozy) und dass Dozy keinen Schaden nimmt, solange sie
    liegt; Pennys Fragile Deed (2 LEB je Dörfler); Bort „kombiniert zwei ungenutzte
    Aktionsdecks"; Wills 5 Ritualzeichen „zur späteren Verwendung"; Wills und Pennys
    zusätzliche Verlustbedingungen; die Spezialaufgaben und Schicksale. Wie bei den elf:
    `scenario_data` kann Gelände, Felder, Werte und eine Sheriff-Karte tragen.
13. **Die Regeln der Endkämpfe** (Siegbedingungen, Spezialaufgaben, Fähigkeiten) stehen auf der
    Tableau-Rückseite und sind nicht abgeschrieben — gelesen wurde dort nur, was `scenario_data`
    braucht (Felder, Gelände, Sheriff-Ausrüstung, Szenarioname).
14. **Keine Sichtprüfung am laufenden Tisch.** Der Browser-Bereich ist nicht angemeldet,
    und Anmelden ist nicht zulässig. Geprüft ist über denselben Executor
    (`build_scenario`, `place_asset` auf `$B`/`$D1`–`$D3`, `place_card $SHERIFF`) mit den
    echten Produktionsdaten — nicht durch die Oberfläche (§10.2).
15. **Szenarioname Qing & Kween:** „Death, Taxes...And Death!" — Schreibweise vom
    Tableau, Auslassungspunkte so gedruckt.
16. **Seitenverhältnis:** `checkScenarioAspect` meldet drei Treffer (je 6 %), alle an
    Bürger-/Milchkannen-Plättchen (Bildverhältnis 0,94–0,95 gegen 1,00) — Foto-Ränder,
    kein Tippfehler (die Schwelle liegt bei 5 %). Alles andere liegt darunter.

---

## 10. Prüfung

### 10.1 `validateScenarioData`

Gegen die **echte** Assetliste (212 Assets) und das **echte** Raster
`Spielfeld A–S / 1–14`: **0 Probleme**, vor dem Schreiben auf dem berechneten
Ergebnis und nach dem Schreiben auf der gelesenen Spalte.

### 10.2 Durchgerechnet

Mit den echten Produktionsdaten (Assetliste, Kartenbibliothek, Raster, die neue
`scenario_data`) durch `executeSequenceWithLog`: je Bösewicht auf die Leiste legen,
aufdecken, `build_scenario` (Vor- und Endkampf), den Bösewicht auf `$B`, die drei
Dörfler auf `$D1`–`$D3`, `place_card "$SHERIFF"` (nur Endkampf).

| Bösewicht | Kampf | Endkampf | Sheriff-Karte |
|---|---|---|---|
| Bort Dovis | ok, 11 Objekte | ok, 11 | ok |
| Handsy | note (3 Karten fehlen), 13 | note (8 fehlen), 18 | **failed — mehrdeutig** (§8) |
| Lawman Dozy | note (Wald 2), 11 | note, 11 | ok |
| Penny Pinchetti | ok, 11 | ok, 11 | ok |
| Pepin Milkfrog | ok, 12 | note (3 Karten), 15 | ok |
| Qing & Kween | note (Wald 2), 12 | note, 12 | ok |
| Samuel Strawman | ok, 12 | note (Weizenfeld), 15 | ok |
| Umbrello | note (2), 12 | note (3), 13 | ok |
| Will Barlow | ok, 11 | ok, 11 | ok |

Die Zahl ist jeweils die der Objekte auf dem Raster (Gelände + Endkampf-Teile +
Bösewicht + drei Dörfler) — sie stimmt in allen 18 Läufen mit der erwarteten
überein. `note` heißt: das Plättchen liegt, seine Karte gibt es nicht (§9, Punkt 10),
`build_scenario` ist gelungen.

### 10.3 Tests

`cd server && npm test`: **1418** grün (vorher **1391**; neu: die 27 Tests aus
`server/test/szenariodaten-grundspiel.test.js`).

---

## 11. Was beim Lesen der Tableaus an den elf vorhandenen Einträgen auffiel

**Nichts davon wurde geändert** — `scenario_data` der elf ist byteweise gleich (§12).
Aber dieselbe Methode (Raster aus den Linien, Umriss der Einträge über das Bild gelegt)
zeigt an den elf mehrere Fehler. Maßgeblich ist der gezeichnete Umriss auf dem Bild;
die Zahlen sind die Kreuzkorrelation wie in §6.

| Eintrag | Befund |
|---|---|
| **Ernie Offal** | **Die rechte Hälfte liegt ein Feld daneben.** `B` J5:K6 → der Bösewicht sitzt auf **K5:L6**; `D` N6 → **O6**, M7 → **N7**, K10 → **L10**; Foodtruck I1:L3 → **I1:M3** (das Asset ist 5 × 3, 1,66; 4 × 3 ist 1,33); Altes Fass M3 → **N3**; Kochtopf J7:K8 → **K7:L8**; rechter Zaun N7:N10 → **O7:O10**; Maisfeld J11:N13 → **K11:O13**. Die linke Hälfte (Gemüsebeet, Schrottkarre, linker Zaun, `D` I6/I7) stimmt. Gegenprobe an den aufgedruckten Spaltenbuchstaben: der Foodtruck liegt über I–M, das Fass auf N. Der linke Zaun G7:G10 hat zudem die falsche Richtung (gemessen 270, Eintrag 90: 0,69). |
| **Virginia Fitz** | **`Dichter Wald` M10:S13 liegt auf M9:S12** (Bild: 0,72 eine Zeile höher, ≈ 0 am Eintrag). **EG5 `Q14` → der FF-Kasten steht auf R14.** **Drei Plättchen fehlen**, die `[DE S.33]` für Viktoria Spitz verlangt: Sprengstoff & Auslöser (Dynamitbündel auf **H7**, TNT-Kasten auf **Q5**) und Bärenfalle (**E11**) — der Eintrag legt fünf der sieben Terrain-Arten. `Dichter Wald` A4:G7 zeigt die Variante **`Dichter Wald 2`** (0,43), die zweite (M9:S12) ist `Dichter Wald`. Der Schuppen C1:E2 liegt mit der Tür rechts: **270** statt 90 (0,16). |
| **The Bundits** | **Farmhaus P4:S8: 270 statt 90** (0,36 bei 270; das weiße Dach liegt rechts). **Die Zäune L10:L13 und P10:P13 liegen eine Zeile höher** (L9:L12, 0,37 bei 270; P9:P12, schwächer 0,18). **`Miefiges Plumpsklo` fehlt** (I11:J12) — `[DE S.33]` nennt es für „Die Karnoven". |
| **Red Atrocious** | Die zwei Wälder sind **vertauscht**: P4:S10 ist `Dichter Wald 2` (0,55, Drehung 90 stimmt), A7:D13 ist `Dichter Wald` mit **270** (0,31) statt 90. |
| **Barry Bluff** | Trüber Fluss L1:M12: **270 statt 90** (0,40 gegen 0,04). |
| **Ms. Falls & Co.** | Farmhaus G3:K6: das weiße Dach liegt oben — **180** fehlt. |
| **The Door Knockers** | Farmhaus G5:K8: das weiße Dach liegt oben — **180** fehlt. Der rechte Wald (M1:S4) trägt `Dichter Wald 2`, ohne dass das Bild mit einer der beiden Varianten übereinstimmt (0,05) — unklar. |
| Deputy Waggums, Tilda Fields, Tartar Fishboy, Patches | **kein Befund** (Umrisse decken die Teile, Drehungen und Felder stimmen, soweit messbar). Das Farmhaus bei Patches liegt unverdreht, wie eingetragen. |

Das Gelände dieser Einträge ist also an einigen Stellen nicht das, was das Tableau
zeigt. Am Tisch fiele es auf (ein Plättchen neben seinem Feld, ein Bösewicht eine Spalte
versetzt). **Ernie Offal ist der schwerste Fall**, weil dort der Bösewicht selbst und
drei Dörferfelder betroffen sind. Ob und wie das korrigiert wird, ist nicht Teil dieser
Arbeit; die Zahlen oben reichen, es nachzuprüfen.

> **Nachgemessen am 2026-11-08 (Spec M28, `docs/spec-setup-system.md`).** Jede der 22 Behauptungen in dieser Tabelle ist
> mit eigener Messung geprüft: **21 bestätigt, eine widerlegt, keine nicht entscheidbar**; die vier Einträge „kein Befund“
> haben tatsächlich keinen. **Widerlegt:** *The Door Knockers*, rechter Wald (`M1:S4`) — er trägt `Dichter Wald 2` und
> stimmt mit dieser Variante zu 0,50 überein (die andere: 0,02), der Eintrag ist **richtig**; „unklar (0,05)“ war ein
> Messfehler. **Ergänzt:** Ernies linker Zaun liegt richtig, aber falsch gedreht (270); der Bundits-L-Zaun braucht zusätzlich
> 270, der P-Zaun bleibt 90; Virginias `EG5` steht **zweimal** in den Daten (`final.terrain` und `final.fields.EG`); die
> Wäscheleine bei Ms. Falls liegt 270 statt 90 (nicht in dieser Tabelle). **Gemessene Zahlen, Verfahren und die Änderung:**
> M28.1 und M28.2 — die Zahlen in dieser Tabelle sind Kreuzkorrelationen eines anderen Verfahrens und nicht dieselben.
> Berichtigt ist hier noch nichts (Stand 2026-11-08); der Auftrag steht in `docs/tasks-szenarien.md`.

---

## 12. Schreiben, und warum ein zweiter Lauf nichts überschreibt

Geschrieben wurde **ausschließlich** `setups.scenario_data` des Aufbaus
`b1e10f4e-b8f2-4c2a-bb3e-54643944121b`, nach einem Trockenlauf
(`--check`, 0 Beanstandungen), in **einer** `db.transaction`. Vorher wurde die Spalte
gesichert (nur lokal, nicht im Repository).

**Wie das Skript einen zweiten Lauf unschädlich macht** (M27: der alte
`doerfler-daten.mjs --write` setzte seinen Abschnitt bedingungslos auf die Konstante
und hat so still fremde Arbeit überschrieben):

1. **Es ergänzt nur.** Fehlt einer der neun Schlüssel, kommt er dazu; steht er schon
   da und ist **gleich**, passiert nichts; steht er da und ist **anders**, bricht der
   Lauf ab — **es gibt keinen Schalter, der das umgeht**. Der zweite echte Lauf sagte
   „schon vorhanden und gleich: 9" und „nichts zu schreiben".
2. **Angefasst wird nur `bosses.<einer der neun>`.** Die elf vorhandenen Einträge und
   jeder andere Schlüssel werden vorher **byteweise** verglichen: der alte Text von
   `bosses` muss Präfix des neuen sein (neue Schlüssel kommen dahinter). Das setzt
   kompaktes `JSON.stringify` voraus, was beim Lesen geprüft wird.
3. **Vergleich-und-Tausch:** `UPDATE … WHERE id = ? AND scenario_data = <exakt der gelesene Text>`.
   Hat jemand die Spalte zwischen Lesen und Schreiben geändert, trifft der `UPDATE` keine
   Zeile, und die Transaktion bricht ab.
4. **Fingerabdruck:** vorher und nachher wird jede Tabelle gehasht (bei `setups` ohne
   `scenario_data`); sind sie nicht gleich, Abbruch und Rollback. Damit ist auch
   `save_states` (17 benannte Spielstände, darunter *Partie 14 – Sieg gegen Virginia Fitz*)
   belegt unangetastet.

### Kontrollausgabe

Gelesen nach dem Schreiben, nicht aus dem Plan:

- `scenario_data`: **10 438 → 17 743 Zeichen**, sha 1b747ac144c4 → 7a4644d2ec78;
  Einträge **11 → 20**; der alte Text von „bosses" ist Präfix des neuen: **ja**.
- **Jeder der elf Einträge hat vor und nach dem Schreiben denselben Hash:**
  Deputy Waggums 1fb204d54257, Virginia Fitz 3856872a71ea, The Bundits 0bd09089d250,
  Red Atrocious 50839293ad24, Tilda Fields e5a9e2eeaa7f, Ernie Offal f70452263c32,
  Barry Bluff f2a12ec7c71b, Tartar Fishboy 93902e65bcb8, Ms. Falls & Co. 84e18b1486e2,
  Patches 931d0547a617, The Door Knockers 163ddc7225d6 — jeweils „gleich".
  Die Schlüssel `gridLabel` (29499d91a16c), `cardZoneLabel` (f04e85a28054) und
  `villagers` (a3ad3d5edcb4) ebenfalls.
- Fingerabdruck aller Tabellen (`setups` ohne `scenario_data`): **unverändert**.
- Länge der übrigen Spalten von `setups` und `updated_at` unverändert; `table_assets`
  253, `cards` 1762, `save_states` 17 wie vorher.
- `validateScenarioData` auf der geschriebenen Spalte: **0 Probleme**.

Aufruf (im Backend-Container, Datei als `/app/szenariodaten-grundspiel.mjs`):

```
node /app/szenariodaten-grundspiel.mjs --check /app/data/card-game-engine.db   # Trockenlauf
node /app/szenariodaten-grundspiel.mjs --write /app/data/card-game-engine.db   # eine Transaktion
```

(Die Datei wurde nach dem Lauf aus dem Container wieder entfernt.)

---

## 13. Offen für M27

Der lange Aufbau soll aus allen 20 ziehen. Damit hängt noch an anderen Stellen:

1. **Die Aktion „Dorfphase beginnen"** räumt `Aktionen: …` nur für die drei
   Startbösewichte ab (`clear_table` mit drei Kategorien) — bei einem der neun bliebe
   dessen Verhaltensdeck liegen.
2. **Geländekarten** (§9, Punkt 10) und die **doppelte `TRILLERPFEIFE`** (§8).
3. **Die elf vorhandenen Einträge** (§11).
