# Szenariodaten der acht Bösewichte aus „Neue Nachbarn"

Erfasst am 2026-10-14 in `setups.scenario_data` des Aufbaus **TFT Kurzpartie
(3 Bösewichte, beide Erweiterungen)** (`b1e10f4e-b8f2-4c2a-bb3e-54643944121b`,
Spiel `072123c0-cd97-4ffb-a330-369630fab93f`).

Die drei vorhandenen Einträge (Deputy Waggums, Virginia Fitz, The Bundits) sind
**unverändert**; dazugekommen sind acht neue. `validateScenarioData` meldet für
die gesamte Spalte **0 Probleme** gegen die echte Assetliste und das echte Raster
`Spielfeld A–S / 1–14` (19 × 14, Feld 50).

---

## 1. Welche acht Bösewichte das sind

Die deutsche Anleitung nennt die Bösewichte anders als die englischen Tableaus,
die in der Engine liegen. Die Zuordnung ist **nicht geraten**, sondern über die
Terrainlisten belegt: `[NN S.15]` (deutsch) und `Rulebook_FOULNEIGHBORS_
Compressed.pdf` S. 14–15 (englisch) führen je Bösewicht dieselben sieben
Terrains — die Listen decken sich eins zu eins.

| Deutsch `[NN S.15]` | Englisch (= `$revealedBase`, Schlüssel in `scenario_data`) | Beleg |
|---|---|---|
| Dr. Bosskop | **Red Atrocious** | Dense Woods / Murky Moat / Doc's Hut / Vegetable Patch / Dynamite & Detonator / Foul Outhouse / Tool Shed = Dichter Wald / Trüber Fluss / Hütte des Dorfdoktors / Gemüsebeet / Sprengstoff & Auslöser / Gammliges Plumpsklo / Werkzeugschuppen |
| Thea Kotta | **Tilda Fields** | Cleatus Guytrap / Doofadil / Marigoon / Lawn Mower / Doc's Hut / Buzzing Hive / Tool Shed |
| Rosa Voir & die WG | **Ms. Falls & Co.** | Fluch „Blitz & Donner" = „Storm Chasers"; Wasser-Marker |
| Arnold Schmatz | **Ernie Offal** | Meat Truck / Boiling Pot / Vegetable Patch / Big Barrel / Old Jalopy / Wooden Fence / Overgrown Cornfield |
| Fritze Fischkopp | **Tartar Fishboy** | Flood / Baitwich / Deserted Picnic / Vegetable Patch / Hidey Haystack / Overgrown Cornfield / Dangerous Ditch |
| Die weißen Herren | **The Door Knockers** | Gooby's Tavern / Dense Woods / Buzzing Hive / Rickety Farm / Old Jalopy / Wooden Fence / Foul Outhouse; Glaubens-Marker |
| Fleckchen | **Patches** | Murky Moat / Wishing Well / Mushroom Grove / Foul Outhouse / Overgrown Cornfield / Rickety Farm / Deserted Picnic |
| Viktor Visage | **Barry Bluff** | Murky Moat / Dynamite & Detonator / Wooden Fence / Foul Outhouse / Doc's Hut / Tool Shed / Hidey Haystack; Masken-Mechanik |

> **Befund für `docs/regelabgleich-erweiterungen.md`:** die Erweiterung „Neue
> Nachbarn" bringt laut `[FN S.3]` **acht** Bösewicht-Token, und das sind genau
> die acht oben. Die acht 120px-Assets `Boss: …` (Samuel Strawman, Pepin
> Milkfrog, Umbrello, Qing & Kween, Ms. Falls & Co., Tartar Fishboy, Patches,
> The Door Knockers) sind **nicht** diese Menge — das sind die Figuren, die
> im TTS-Mod als 3D-Modelle vorlagen. Wer die acht Erweiterungs-Bösewichte
> sucht, darf sich an dieser Assetliste nicht orientieren.

---

## 2. Woher jede Angabe stammt

| Angabe | Quelle |
|---|---|
| Welcher Bösewicht gehört zur Erweiterung | `Rulebook_FOULNEIGHBORS_Compressed.pdf` S. 3 („Add the 8 Ruffian tokens from this expansion"), S. 4 (Character Breakdown), S. 14–15 (Ruffian FAQs mit Terrainlisten) |
| Deutsche Terrainnamen | `Townsfolk_Tussle_Ueble_Nachbarn_Anleitung.pdf` S. 15 (via PyMuPDF), übernommen aus `docs/regelabgleich-erweiterungen.md` M-NN-4 |
| **Platzierung (alle Feldadressen)** | **Rückseite des jeweiligen Bösewicht-Tableaus**, `table_assets.back_image_path`, abgerufen über `https://gaming.benjathi.de<image_path>` |
| Szenarioname | dasselbe Bild, Banner unter dem Raster |
| Endkampf-Felder (`EG`) | dasselbe Bild, die mit **FF** beschrifteten Kästen, plus der SETUP-Text darunter |
| Geländeteil-Identifikation | Vergleich mit dem Artwork der `table_assets` selbst (Vorder- und Rückseitenbild heruntergeladen und als Kontaktbogen nebeneinandergelegt) |
| Kantenlängen zur Gegenprobe | Seitenverhältnis des Asset-Bildes (z. B. `Trüber Fluss` 3600×600 = 6:1 = 12×2 Felder; `Marodes Farmhaus` 2055×1627 ≈ 5:4) |

**Vier der acht Tableaus liegen zusätzlich als PDF unter `Z:\Austausch\TfT\`**
(`Red_Atrocious.pdf`, `Tilda_Fields.pdf`, `Ernie_Offal.pdf`, `Barry_Bluff.pdf`,
dazu `Patches_without_costume.pdf`). Sie enthalten dieselben Fotos, die auch in
`table_assets.back_image_path` stecken — also keine zweite Quelle, sondern
dieselbe. Für Ms. Falls & Co., Tartar Fishboy, The Door Knockers und Patches
liegt in der Datenbank sauberes Artwork (1500×3000), für die anderen vier
Handyfotos des gedruckten Tableaus (~1540×3080, leicht verkippt).

**Ableseverfahren.** Je Bild wurden die Rasterlinien über die Spalten- bzw.
Zeilenmittel des Graubildes bestimmt (Tiefpunktsuche mit fester Teilung 19 × 14),
anschließend wurde ein beschriftetes Gitter über das Bild gelegt und in
Ausschnitten (zwei Hälften je Tableau, dazu Zoomausschnitte für jedes
Einzelteil) abgelesen. Das Gitter wurde gegen die aufgedruckten Spalten- und
Zeilenbeschriftungen des Tableaus geprüft.

**Gegenprobe an den Grundspiel-Einträgen.** Die schon erfassten Einträge geben
die Normgrößen vor, und alle neuen Lesungen stimmen damit überein:
Gemüsebeet 3×3, Überwuchertes Maisfeld 5×3, Hohler Heuhaufen 3×2, Holzzaun 4×1,
Verwahrlostes Picknick 2×2, Wunschbrunnen 2×2, Pilzwäldchen 2×2,
Hütte des Dorfdoktors 3×3, Trüber Fluss 12×2, Marodes Farmhaus 5×4.

---

## 3. Die Tabelle

Raster: `Spielfeld A–S / 1–14`. Alle Geländeeinträge stehen als **Bereich**
(auch die einfeldrigen, als `H6:H6`) — damit bestimmt die Adresse die
Grundfläche und nicht die TTS-Skalierung des Assets (siehe Lücke 4).
`rot` = `rotation`, `↓` = `faceDown: true` (Rückseite des doppelseitigen
Plättchens).

### Red Atrocious (Dr. Bosskop) — „Feelin' Feverish"

| Gelände | Felder | |
|---|---|---|
| Hütte des Dorfdoktors | F1:H3 | |
| Gemüsebeet | I1:K3 | |
| Trüber Fluss | D4:O5 | |
| Dichter Wald | P4:S10 | rot 90 |
| Sprengstoff | H6:H6 | |
| Dichter Wald 2 | A7:D13 | rot 90 |
| Auslöser | L9:L9 | |
| Miefiges Plumpsklo | L10:M11 | |
| Werkzeugschuppen / … (offen) | Q11:S12 | rot 90 |

`B` = G12:H13 · `D` = F9, H9, J9, E10, J10 · kein `EG`

### Tilda Fields (Thea Kotta) — „Shearing the Scoundrels"

| Gelände | Felder | |
|---|---|---|
| Hütte des Dorfdoktors | J1:L3 | |
| Wehtuh-Fratzenfalle / Goob's Tavern | M1:O3 | (Vorderseite = Fratzenfalle) |
| Summender Bienenstock | F6:G7 | |
| Koederstulle / Rasenmaeher | G8:G8 | ↓ (Rasenmäher) |
| Werkzeugschuppen / … (offen) | Q8:S9 | rot 90 |
| Rangelblume / Die Wolken-Gang | N10:O11 | (Vorderseite = Rangelblume) |
| Doofster-Glocke / Kochtopf | H11:I12 | (Vorderseite = Doofsterglocke) |

`B` = J6:K7 · `D` = M6, N6, I9, K9, M10
`final`: **Pile of Locals** auf F1:G2, `EG` = F1:G2

### Ernie Offal (Arnold Schmatz) — „The Forced Feasting"

| Gelände | Felder | |
|---|---|---|
| Gemüsebeet | F1:H3 | |
| Foodtruck | I1:L3 | |
| Altes Fass / Altes Fass (leer) | M3:M3 | |
| Rostige Schrottkarre | A5:C6 | |
| Holzzaun | G7:G10, N7:N10 | rot 90 (zwei Zäune) |
| Doofster-Glocke / Kochtopf | J7:K8 | ↓ (Kochtopf) |
| Überwuchertes Maisfeld | J11:N13 | |

`B` = J5:K6 · `D` = I6, N6, I7, M7, K10 · kein `EG`

### Barry Bluff (Viktor Visage) — „The Skinned Skirmish"

| Gelände | Felder | |
|---|---|---|
| Trüber Fluss | L1:M12 | rot 90 |
| Auslöser | K6:K6 | |
| Sprengstoff | Q6:Q6 | |
| Holzzaun | F7:I7, H12:K12 | (zwei Zäune) |
| Miefiges Plumpsklo | J7:K8 | |
| Hütte des Dorfdoktors | Q7:S9 | |
| Werkzeugschuppen / … (offen) | R10:S12 | |
| Hohler Heuhaufen | K13:M14 | |

`B` = F9:G10 · `D` = I9, K10, I11, J11, F12 · kein `EG`

### Tartar Fishboy (Fritze Fischkopp) — „Uncalm Waters"

| Gelände | Felder | |
|---|---|---|
| Gemüsebeet | G1:I3 | |
| Hohler Heuhaufen | M3:O4 | |
| Matschiger Graben | P3:Q14 | rot 90 |
| Flut | A5:E7, F5:J7, K5:O7 | **drei Plättchen nebeneinander** |
| Verwahrlostes Picknick | C8:D9 | |
| Koederstulle / Rasenmaeher | H10:H10 | (Vorderseite = Köderstulle) |
| Überwuchertes Maisfeld | K11:O13 | |

`B` = H5:I6 · `D` = F8, J8, K8, G9, I10 · kein `EG`

### Ms. Falls & Co. (Rosa Voir & die WG) — „In Bad Company"

| Gelände | Felder | |
|---|---|---|
| Marodes Farmhaus | G3:K6 | |
| Dorfteich | L3:P7 | |
| Wäscheleine | D4:D7 | rot 90 |
| Hohler Heuhaufen | N8:P9 | |
| Flut / Matschpfuetze | H8:J12 | ↓ (Matschpfütze) |
| Rangelblume / Die Wolken-Gang | K10:L11 | ↓ (Die Wolken-Gang) |
| Lagerfeuer / … (erloschen) | C11:D12 | |

`B` = K8:L9 · `D` = G7, G9, F10, G12, J13 · kein `EG`

### Patches (Fleckchen) — „Meal Time's Over"

| Gelände | Felder | |
|---|---|---|
| Trüber Fluss | A5:L6 | |
| Wunschbrunnen / … (leer) | M5:N6 | |
| Pilzwäldchen | A7:B8 | |
| Miefiges Plumpsklo | J9:K10 | |
| Überwuchertes Maisfeld | L9:P11 | |
| Marodes Farmhaus | C11:G14 | |
| Verwahrlostes Picknick | H13:I14 | |

`B` = E9:F10 · `D` = D7, H7, I7, J8, I9 · kein `EG`

### The Door Knockers (Die weißen Herren) — „The Flawless Sales Pitch"

| Gelände | Felder | |
|---|---|---|
| Dichter Wald | A1:G4 | |
| Dichter Wald 2 | M1:S4 | |
| Summender Bienenstock | E5:F6 | |
| Marodes Farmhaus | G5:K8 | |
| Wehtuh-Fratzenfalle / Goob's Tavern | L5:N7 | ↓ (Goob's Tavern = Günnis Kneipe) |
| Rostige Schrottkarre | Q9:S10 | |
| Holzzaun | C11:F11, K11:N11 | (zwei Zäune) |
| Miefiges Plumpsklo | I11:J12 | |

`B` = D8:E9 · `D` = H9, J9, H10, G11, F12
`final`: `EG` = L8 — der SETUP-Text sagt wörtlich: *„The new sheriff begins the
fight on the square marked FF."*

---

## 4. Die zwei offenen Fragen aus dem Regelabgleich

### 4.1 „Flut" kommt dreifach vor — wie bildet sich das ab?

**Geklärt.** Es gibt **drei gleiche Flut-Plättchen**, und die Datenbank führt
sie auch dreifach:

| Asset | Bild (Vorderseite) | Rückseite |
|---|---|---|
| `Flut` (width 178) | 1785×1043 — **quer** | Flut |
| `Flut` (width 187) | 990×1793 — **hochkant** | Flut |
| `Flut / Matschpfuetze` (width 187) | 1016×1811 — hochkant | Matschpfütze |

990×1793 und 1785×1043 sind dieselben Maße transponiert — es ist **ein und
dasselbe Plättchen**, im TTS-Mod nur einmal quer und zweimal hochkant abgelegt.
Die Grundfläche ist 5 × 3 Felder (bzw. 3 × 5 gedreht).

Auf Tartars Tableau liegen die drei Plättchen in einer Reihe (A5:E7, F5:J7,
K5:O7) — die Nahtstellen sind im Bild sichtbar, jedes Teil ist 5 × 3. Das deckt
sich mit „13 Terrainkarten bei 15 Plättchen, Flut dreifach" `[NN S.16]`: eine
Karte, drei Plättchen. Das dritte Plättchen trägt auf der Rückseite die
Matschpfütze (Rosa Voir), weshalb die Zählung „13 Karten / 15 Plättchen"
aufgeht.

**Aber ein Mangel bleibt:** zwei Assets heißen **beide genau `Flut`**.
`findAsset` nimmt das erste Treffer-Asset, `assetName: "Flut"` ist also
mehrdeutig, und aus demselben Grund steht an den Flut-Einträgen **keine
`rotation`** — welches der beiden (quer oder hochkant abgelegten) Bilder
getroffen wird, ist aus den Daten nicht vorhersagbar. **Empfehlung:** eins der
beiden umbenennen (z. B. `Flut 2`), dann kann man beide ansprechen und die
Drehung richtig setzen.

### 4.2 „Gammliges Plumpsklo" vs. „Miefiges Plumpsklo" — zwei Terrains oder ein Setzfehler?

**Ein Setzfehler in der deutschen Anleitung.** Das englische Heft nennt für
**alle vier** betroffenen Bösewichte dasselbe Terrain **„Foul Outhouse"**:

- Red Atrocious (= Dr. Bosskop): *„Dense Woods, Murky Moat, Doc's Hut, Vegetable
  Patch, Dynamite & Detonator, **Foul Outhouse**, Tool Shed"* `[FN S.14]`
- The Door Knockers, Patches, Barry Bluff: ebenfalls **Foul Outhouse**
  `[FN S.14–15]`

Dazu kommt der Augenschein: auf Dr. Bosskops Tableau (Red Atrocious, L10:M11)
liegt **dasselbe Plättchen** wie bei den drei anderen — braunes Häuschen mit
Ranken und angehefteten Zetteln. Es gibt im ganzen Spiel nur **ein**
Plumpsklo-Plättchen und dementsprechend nur das eine Asset
`Miefiges Plumpsklo`.

→ In `scenario_data` steht bei allen vier `Miefiges Plumpsklo`.
→ Für `docs/tft-regeln.md` §13.8: „Gammliges Plumpsklo" sollte als deutscher
  Übersetzungsfehler vermerkt, nicht als eigener Terrainname geführt werden.

---

## 5. Was fehlt und warum

1. ~~**`stats` (BEW / LEB) für alle acht.**~~ **Erledigt am 2026-10-15, siehe
   Abschnitt 7.** Die damalige Begründung („je Stufe CHUMP / HOOLIGAN /
   TROUBLEMAKER / FINAL FIGHT verschieden") war ein Irrtum: die Stufenkästen auf
   der Vorderseite tragen die **Bösewicht-Fähigkeiten**, nicht BEW und LEB.
   BEW und LEB stehen in **einem** Block darunter, in vier Spalten
   **2P / 3P / 4P / 5P** — maßgeblich ist die Anzahl Dörfler im Spiel, solo also
   die 3P-Spalte (`docs/tft-regeln.md` §5.4).

2. **`Dichter Wald` vs. `Dichter Wald 2`.** Red Atrocious und The Door Knockers
   haben je **zwei** Waldstücke. Welches der beiden Assets (die sich im Artwork
   nur minimal unterscheiden) auf welchem Platz liegt, ist auf dem Tableaubild
   nicht zu unterscheiden. Erfasst ist: erstes Stück = `Dichter Wald`, zweites =
   `Dichter Wald 2`. Zwei Waldstücke liegen also richtig, ihre Reihenfolge ist
   willkürlich.

3. **Tilda Fields, `Pile of Locals` auf F1:G2 — teils erschlossen.** Sicher
   abgelesen ist der mit **FF** beschriftete 2×2-Kasten auf F1:G2. Dass dort der
   *Pile of Locals* hingehört, folgt aus SETUP-Schritt 1 („Place the **Pile of
   Locals** terrain piece on the board") in Verbindung damit, dass es der einzige
   markierte Platz des Tableaus ist und das Asset mit 730×730 genau 2 × 2 Felder
   groß ist. Der Tableautext nennt das Feld nicht ausdrücklich.
   Bei Deputy Waggums ist dieselbe Lesart schon im Bestand (FF1–FF3 tragen die
   Beruhigungs-Leckerli, der Tableautext sagt nur „in numerical order").

4. **Mehrere Assets haben eine falsche TTS-Skalierung.** `table_assets.width`
   gibt bei vielen Geländeteilen nicht die Felderzahl her (Feldgröße 50):
   `Matschiger Graben` 96 statt 600 (12 Felder), `Dorfteich` 194 statt 250,
   `Flut` 178/187 statt 250, `Wäscheleine` 144 statt 200,
   `Koederstulle / Rasenmaeher` 142 statt 50, `Miefiges Plumpsklo` 73 statt 100,
   `Werkzeugschuppen` 71 statt 150, `Marodes Farmhaus` 200 statt 250.
   **Umgangen**, indem jeder Geländeeintrag einen ausdrücklichen Bereich nennt —
   dann setzt `build_scenario` die Kastengröße aus dem Bereich (`r.ranged`) und
   die Assetgröße spielt keine Rolle mehr. Wer die Assets korrigieren will,
   findet hier die Liste.

5. **Keine Prüfung der Drehrichtung im Bild.** `rotation` ist dort gesetzt, wo
   das Plättchen auf dem Tableau erkennbar quer zu seinem Asset-Artwork liegt
   (Werkzeugschuppen mit der roten Tür links statt unten, Trüber Fluss hochkant,
   Matschiger Graben hochkant, Holzzaun hochkant, Wäscheleine hochkant, Dichter
   Wald hochkant). Die Richtung (90 statt 270) ist bei allen betroffenen Teilen
   entweder symmetrisch oder am Artwork ablesbar; geprüft wurde sie im Bild,
   nicht am Tisch.

6. **Keine `decks`-Angaben.** Wie bei den Grundspiel-Einträgen.

---

## 6. Sichtprüfung

Am 2026-10-14 am laufenden System (`https://gaming.benjathi.de`):

1. Aufbau *TFT Kurzpartie* geladen.
2. Die Bösewicht-Leiste des Aufbaus enthält fest Deputy Waggums, Virginia Fitz
   und The Bundits — also keinen Erweiterungs-Bösewicht. Für die Prüfung wurde
   darum **am Tisch** (nicht am gespeicherten Aufbau) ein Token
   `Bösewicht: Patches` auf den zweiten Leistenplatz gelegt, verdeckt, und der
   dort liegende Token beiseitegeschoben.
3. „Kampf beginnen" gedrückt.

**Ergebnis:** Das Kampffeld wurde vollständig gestellt — Trüber Fluss über
A5:L6, Pilzwäldchen links daneben, Wunschbrunnen rechts im Fluss, Miefiges
Plumpsklo, Überwuchertes Maisfeld, Marodes Farmhaus, Verwahrlostes Picknick,
dazu Patches auf E9:F10 und die drei Dörfler auf ihren Feldern. In der
Terrain-Auslage lagen die passenden **sieben** Geländekarten. Das Bild deckt
sich mit der Tableaurückseite.

Gemeldet wurden nur die vier Schritte aus Lücke 1 (`$BEW` / `$LEB` nicht
gebunden). Danach wurde der Aufbau neu geladen, der Tisch ist wieder im
Ausgangszustand.

---

## 7. Kampfwerte BEW und LEB (ergänzt 2026-10-15)

### 7.1 Regel und Spalte

`docs/tft-regeln.md` §5.4: BEW und LEB stehen auf der **Vorderseite** des
Bösewicht-Tableaus, in vier Spalten **2P / 3P / 4P / 5P**. Maßgeblich ist die
**Anzahl Dörfler im Spiel**, nicht die Spielerzahl — *„Welche Werte zutreffen
ist abhängig von der Anzahl Dörfler im Spiel"* `[DE S.13]`, *„Sowohl BEWEGUNG
als auch LEBEN des Bösewichts sind von der Anzahl der Dörfler abhängig"*
`[DE S.15]`. Dieser Aufbau spielt **solo mit drei Dörflern** (Henlo Bulwark,
Fridgette Jones, Granny Melba) ⇒ **immer die 3P-Spalte**. Der Startwert ist
zugleich das **Maximum** des Bösewichts `[DE S.15]`.

**Gegenprobe an den Grundspiel-Einträgen.** Die drei vorhandenen `stats` sind
genau die 3P-Spalte ihrer Tableaus — Deputy Waggums `6 / 14` aus
`MVMT 6 6 7 7` / `HEALTH 12 14 17 20`, Virginia Fitz `6 / 15`, The Bundits
`6 / 15`. Damit ist belegt, welche Spalte das Feld meint; geraten wurde nichts.

### 7.2 Die Werte

Alle acht Vorderseiten wurden aus `table_assets."Tableau: <Name>".image_path`
über `https://gaming.benjathi.de<image_path>` geladen und in Zoomausschnitten
abgelesen (Originalauflösung 1500×3000 bis 1663×3264, Ausschnitt jeweils
`y 0,72–0,87`, `x 0,02–0,68` der Bildfläche, auf 1000 px Breite hochskaliert).

| Bösewicht | Zeile MVMT (2P/3P/4P/5P) | Zeile HEALTH | **BEW** (3P) | **LEB** (3P) | Sicherheit | Fundstelle im Bild |
|---|---|---|---|---|---|---|
| Red Atrocious | 5 / **6** / 8 / 8 | 13 / **17** / 20 / 24 | **6** | **17** | **sicher** | Ausschnitt `y 2147–2595`, Block unter dem Umschreibungskasten, über `AMBUSH: 'Plaguebearer'` |
| Tilda Fields | 2 / **3** / 3 / 4 | 10 / **15** / 20 / 24 | **3** | **15** | **sicher** | `y 2204–2663`, über `AMBUSH: 'Living Garden'` |
| Ernie Offal | 5 / **5** / 5 / 5 | 12 / **18** / 21 / 24 | **5** | **18** | **sicher** | `y 2350–2839`, über `AMBUSH: 'Prepare the Main Course'` |
| Tartar Fishboy | 9 / **9** / 9 / 9 | 13 / **17** / 20 / 23 | **9** | **17** | **sicher** | `y 2160–2610`, über `AMBUSH: 'Angry Angler'` |
| Ms. Falls & Co. | 4 / **4** / 5 / 5 | 13 / **17** / 20 / 23 | **4** | **17** | **sicher** | `y 2160–2610`, über `AMBUSH: 'Shocking Guests'` |
| Patches | 7 / **8** / 8 / 9 | 1 / **2** / 2 / 3 | **8** | **2** | **sicher** | `y 2160–2610`, über `AMBUSH: '9 lives'` |
| The Door Knockers | 5 / **5** / 6 / 7 | 10 / **15** / 18 / 21 | **5** | **15** | **sicher** | `y 2160–2610`, über `AMBUSH: 'One of Us'` |
| Barry Bluff | **keine Zahlen — Formel** | **keine Zahlen — Formel** | Text (s. u.) | Text (s. u.) | **sicher gelesen, nicht rechenbar** | `y 2232–2697`, statt der Spalten steht Fließtext |

**Alle sieben Zahlenpaare sind eindeutig lesbar** — die Ziffern stehen groß und
dunkel auf hellem Grund, auch auf den vier Handyfotos der gedruckten Tableaus.
Keine Ziffer musste erschlossen werden. Die Werte decken sich zusätzlich Zeile
für Zeile mit der unabhängig erstellten Tabelle in `docs/tft-regeln.md` §5.5.

### 7.3 Barry Bluff — die Formel, wortgleich eingetragen

Barry Bluffs Tableau trägt an der Stelle der vier Spalten Fließtext. Er ist
wörtlich übernommen, wie er dasteht (englisch, wie gedruckt):

```json
"Barry Bluff": { "stats": {
  "BEW": "Equal to the highest MVMT among townsfolk at start of fight, plus 1.",
  "LEB": "Equal to HP total of all townsfolk combined at start of fight, plus 3."
} }
```

Das ist Absicht und kein Notbehelf: der Platzhalter `$BEW` **bindet** damit, und
die beiden Zählerschritte melden anschließend sauber, dass sie den Wert nicht
lesen können — *„counter ‚Bösewicht: Bewegung': ‚Equal to the highest MVMT …'
is not a value it can take"*. Vorher meldeten sie *„$BEW ist nicht gebunden"*,
also einen Datenmangel, den es bei Barry Bluff gar nicht gibt. Die Formel ist
Barry Bluffs persönlicher Kartentext, keine Erweiterungsregel
(`docs/tft-regeln.md` §5.4).

### 7.4 Zwei Werte, die stimmen, aber in die Irre führen können

- **Ms. Falls & Co. — `LEB 17` gilt für Ms. Falls selbst.** Ihre Begleiter
  („The Company") beginnen laut Tableautext mit **3 LEB je Dörfler** und sind
  das eigentliche Angriffsziel (*„Defeat The Company! Be sure not to let
  Ms. Falls die"*). Die Engine führt einen Bösewicht-Zähler, und der gehört
  Ms. Falls — die Company ist damit **nicht** abgebildet.
- **Patches — `LEB 2` ist richtig abgelesen.** Fleckchen hat tatsächlich
  1/2/2/3 Leben; der Kampf läuft über seine neun **Kostüm-Fetzen** und die
  Überfallkarte „9 lives". Ein Zähler, der auf 2 steht, ist also kein
  Lesefehler.

### 7.5 Was geschrieben wurde

Geschrieben wurde **ausschließlich** die Spalte `setups.scenario_data` des
Aufbaus `b1e10f4e-b8f2-4c2a-bb3e-54643944121b` (Spiel
`072123c0-cd97-4ffb-a330-369630fab93f`), in einer `db.transaction`, nach einem
Trockenlauf, der die Gegenprobe *„alles außer den acht neuen `stats` ist
unverändert"* mitführt. `action_data` und `zone_data` wurden nicht angefasst.
Die drei Grundspiel-Einträge sind unverändert (`6/14`, `6/15`, `6/15`).

`validateScenarioData` gegen die echte Assetliste (212 Assets) und das echte
Raster `Spielfeld A–S / 1–14`: **0 Probleme**.

### 7.6 Prüfung des Ergebnisses

Der Aufbau und die Aktion *„Kampf beginnen"* wurden mit den **echten**
Produktionsdaten (`state_data`, `sequence_data`, `zone_data`, `grid_data`,
`action_data`, `scenario_data`, 212 Assets, 1087 Karten) durch
`executeSequenceWithLog` geschickt — je Durchlauf mit einem der acht
Erweiterungs-Bösewichte auf dem ersten aufdeckbaren Platz der Bösewicht-Leiste.

Ergebnis für alle sieben mit Zahlen: die vier vorher übersprungenen Schritte
stehen auf **`ok`**, und die beiden Zähler tragen danach die 3P-Werte —
`Bösewicht: Bewegung` / `Bösewicht: Leben` = 6/17, 3/15, 5/18, 9/17, 4/17, 8/2,
5/15. Für Barry Bluff stehen die vier Schritte auf `skipped` mit der oben
zitierten Begründung („is not a value it can take"), nicht mehr mit
„nicht gebunden".

**Nicht Teil dieses Befunds:** bei Red Atrocious, The Door Knockers und Barry
Bluff meldet `build_scenario` weiterhin *„no terrain card named ‚Sprengstoff' /
‚Auslöser' / ‚Dichter Wald 2'"*. Das sind fehlende **Geländekarten** in der
Kartenbibliothek (Lücke 6, „keine `decks`-Angaben"); die Geländeteile selbst
liegen. Der Befund bestand vorher und ist von dieser Änderung unberührt.

> **Offen: Sichtprüfung am laufenden Tisch.** Anders als am 2026-10-14 konnte
> der Browser-Bereich diesmal **nicht** angemeldet werden — er zeigte die
> Anmeldemaske, und Zugangsdaten einzugeben ist nicht zulässig. Die Prüfung
> oben läuft deshalb gegen denselben Executor und dieselben Daten, aber nicht
> durch die Oberfläche. Wer das nachholt: Token `Bösewicht: Patches` auf den
> zweiten Leistenplatz legen, verdeckt, „Kampf beginnen" drücken — erwartet
> werden die Zähler **Bewegung 8** und **Leben 2** und **keine** Meldung über
> `$BEW` / `$LEB`.
