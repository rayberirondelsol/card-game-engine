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

---

## 8. Der Endgegner-Kampf der sechs ohne `final`-Abschnitt (erfasst 2026-10-15)

### 8.1 Das Ergebnis in einem Satz

**Keiner der sechs braucht einen `final`-Abschnitt.** Red Atrocious, Ernie
Offal, Tartar Fishboy, Ms. Falls & Co., Patches und Barry Bluff haben auf ihrer
Tableau-Rückseite **kein einziges `EG`-Feld** (auf den englischen Tableaus
**FF**) und **kein zusätzliches Gelände**. Ihr Endgegner-Kampf fügt dem Aufbau
nichts hinzu, was der Tisch legen könnte — er fügt die **Besondere Ausrüstung
des neuen Sheriffs** hinzu und Regeln. Dass die sechs keinen `final`-Abschnitt
haben, ist also **kein Datenmangel**, sondern richtig.

Das deckt sich mit `docs/tft-regeln.md` §8.1, die die Dörflerzahl nur für „die
meisten Fälle" an die `EG`-Zahl bindet — es gibt Endgegner-Kämpfe ganz ohne
`EG`-Terrain, und das sind diese sechs.

### 8.2 Woher das kommt und wie geprüft wurde

| Angabe | Quelle |
|---|---|
| `EG`-Felder, Zusatzgelände | **Rückseite des Bösewicht-Tableaus**, `table_assets."Tableau: <Name>".back_image_path`, über `https://gaming.benjathi.de<image_path>` geladen |
| „AUFBAU"-Schritte, Name der Besonderen Ausrüstung | dasselbe Bild, das **SETUP**-Band unter dem Szenariobanner (y ≈ 0,53–0,61 der Bildhöhe), auf 1400 px Breite hochskaliert abgelesen |
| Ausrüstungskarte in der Bibliothek | `cards` des Spiels `072123c0-…`, Kategorien `Einzigartige Ausrüstung` und `Einzigartige Ausrüstung (Üble Nachbarn)`; zugeordnet über **Kartenbild und Kartentext**, nicht über den Namen (die Bibliothek ist deutsch, die Tableaus sind englisch) |

**Zwei Gegenproben, damit „ich sehe nichts" nicht „ich erkenne es nicht" heißt.**

1. **Wie ein `EG`-Feld aussieht**, wurde an den beiden schon erfassten
   Erweiterungs-Tableaus abgelesen: bei **The Door Knockers** steht auf **L8**
   ein weißes Kästchen mit der Aufschrift **FF**, bei **Tilda Fields** ein
   ebensolches über **F1:G2**. In derselben Darstellung (Rasterbereich auf
   900 px Breite) ist auf keinem der sechs Tableaus ein solches Kästchen. Für
   die drei Handyfotos (Red Atrocious, Ernie Offal, Barry Bluff) wurde
   zusätzlich in zwei Hälften auf 1500 px Breite nachgesehen — ebenfalls keines.
2. **Dass das Raster richtig liegt**, zeigt die Gegenprobe an schon erfassten
   Werten: auf Red Atrocious' Rückseite liest dieselbe Rasterlage die
   Dörflerfelder **F9, H9, J9, E10, J10** — genau das, was in `scenario_data`
   steht (Abschnitt 3). Die Lesung wurde nicht an die Daten angepasst, sie
   fällt mit ihnen zusammen.

Unabhängig davon stützt der **Text** die Lesung: keiner der sechs
SETUP-Abschnitte enthält überhaupt eine Platzierungsanweisung. Wo es `EG`-Felder
gibt, nennt der Tableautext sie (The Door Knockers: *„The new sheriff begins the
fight on the square marked FF."*).

### 8.3 Die Tabelle

Alle Angaben **sicher** gelesen, sofern nicht anders vermerkt. Die Szenarionamen
stimmen mit den schon erfassten Einträgen überein — Gegenprobe, dass das
richtige Tableau vor einem liegt.

| Bösewicht (Szenario) | `EG`-Felder | Zusatzgelände | weitere AUFBAU-Schritte | Besondere Ausrüstung |
|---|---|---|---|---|
| **Red Atrocious** — „Feelin' Feverish" | **keine** | **keines** | nur Schritt 1 (Sheriff) | **Snake Oil** — *„They receive the Snake Oil unique gear, and may equip it immediately."* |
| **Ernie Offal** — „The Forced Feasting" | **keine** | **keines** | nur Schritt 1 (Sheriff) | **Belly Balm** — *„They never leave home without their tummy meds … They receive Belly Balm unique gear."* |
| **Tartar Fishboy** — „Uncalm Waters" | **keine** | **keines** | nur Schritt 1 (Sheriff) | **„Spare" Limbs** — mit Anführungszeichen wie gedruckt, *„(may equip immediately)"* |
| **Ms. Falls & Co.** — „In Bad Company" | **keine** | **keines** | nur Schritt 1 (Sheriff) | **Absorbant Towel** — so gedruckt, nicht „Absorbent"; *„from a nearby clothesline (may equip immediately)"* |
| **Patches** — „Meal Time's Over" | **keine** | **keines** | Schritt 2: *„Set **10 Fetid Furball** terrain pieces aside for later use (pictured below)."* | **Shooing Broom** — *„leaning against a nearby wall (may equip immediately)"* |
| **Barry Bluff** — „The Skinned Skirmish" | **keine** | **keines** | Schritt 2: *„At the start of the fight, each other townsfolk receives a piece of **Faceless** unique gear at random."* | **Blood-Splattered** |

Fundstelle je Zeile: Tableau-Rückseite, SETUP-Band direkt unter dem Banner
„FINAL FIGHT / ⟨Szenarioname⟩"; der `EG`-Befund stammt aus dem Rasterbereich
darüber, über die ganze Breite und die Zeilen 1–14.

### 8.4 Die Besondere Ausrüstung in der Kartenbibliothek

Alle sechs Karten **liegen in der Bibliothek**, alle in der Kategorie
**`Einzigartige Ausrüstung (Üble Nachbarn)`** (33 Karten). Die Bibliothek ist
deutsch; zugeordnet wurde deshalb über **Kartenbild und Kartentext**, nicht über
den Namen.

| Tableau (englisch) | Karte (deutsch) | Kategorie | Beleg | Sicherheit |
|---|---|---|---|---|
| Snake Oil | **QUACKSALBE** | `Einzigartige Ausrüstung (Üble Nachbarn)` | Flasche „QUACK-SALBE" mit Schlange; der Text nimmt bzw. wirft `Krankheit` ab — Red Atrocious' Kampf läuft über Krankheiten | **sicher** |
| Belly Balm | **KÖRPERBUTTER** | dto. | Tiegel „ENTSPANNUNG", *„Wenn's dir mal wieder zu viel wird!"*; einzige Balsam-/Cremekarte des Satzes. **Nachgeprüft 2026-10-15** (Abschnitt 9.2): der Kartentext *„Abwerfen: -2 MUMM"* ist die Antwort auf Ernie Offals Fähigkeit **„Cuisine Counterer"** (*„Whenever a townsfolk deals DMG to Ernie, they gain +1 MOX … if that townsfolk has 10 MOX, they take 1 DMG"*) — MUMM = MOX | **sicher** (vorher „hoch, aber nicht wörtlich") |
| „Spare" Limbs | **ERSATZ-GLIEDMASSEN** | dto. | wörtliche Übersetzung | **sicher** |
| Absorbant Towel | **MIKROFASERTUCH** | dto. | tropfendes Tuch; der Text verschiebt `Wasser`-Marker — Ms. Falls' Kampf läuft über Wasser | **sicher** |
| Shooing Broom | **MIETZ-SCHEUCHER** | dto. | Besen; *„Entferne 1 Siffigen Haarball innerhalb von 4 Feldern"* — das sind Patches' Fetid Furballs | **sicher** |
| Blood-Splattered | **BLUTBESPRITZT** | dto. | wörtliche Übersetzung | **sicher** |
| Faceless (Barry, Schritt 2) | **GESICHTSLOS**, `GESICHTSLOS (2)`…`(5)` | dto. | fünf Exemplare, genau wie der Schritt sie braucht | **sicher** |

Zur Einordnung: dieselbe Zuordnung trägt auch das Beispiel aus
`docs/tft-regeln.md` §8.1 — Handsys „Warning Whistle" liegt als
**TRILLERPFEIFE** in der Grundspielkategorie `Einzigartige Ausrüstung`.

### 8.5 Was die Szenariodaten nicht aufnehmen können

Drei Angaben sind erfasst, haben aber **keinen Platz** in `scenario_data`, und
es wurde **keiner erfunden**:

1. ~~**Die Besondere Ausrüstung je Bösewicht.**~~ **Erledigt am 2026-10-15,
   siehe Abschnitt 9.** Der Platz war schon da: `final.stats` — dieselbe
   Bindung, die `$BEW` und `$LEB` liefert. Ein `final`-Abschnitt, der **nur**
   `stats` enthält, trägt (9.3), und ein `place_card`-Schritt am Ende von
   „Kampf beginnen" legt `$SHERIFF` aus. Neues Verhalten brauchte es nicht.
2. **Patches' „10 Fetid Furball terrain pieces aside for later use".** „Aside"
   nennt kein Feld, und die Assetliste führt `Fetid Furball` nur **zweimal**
   (beide `width` 95) — zehn Exemplare gibt es dort nicht. Die Plättchen kommen
   im Kampf über die Bösewicht-Fähigkeit „Coughin' Fits" aufs Brett, nicht beim
   Aufbau.
3. **Barry Bluffs „each other townsfolk receives a piece of Faceless unique gear
   at random".** Das ist ein Kartengeschäft, kein Gelände; die fünf Karten
   liegen (8.4).

### 8.6 Prüfung

**`validateScenarioData`** gegen die echte Assetliste (212 Assets) und das echte
Raster `Spielfeld A–S / 1–14`, auf die unveränderte Spalte `scenario_data` des
Aufbaus `b1e10f4e-b8f2-4c2a-bb3e-54643944121b`: **0 Probleme**.

**Durchgerechnet** wurde mit den echten Produktionsdaten (`state_data`,
`sequence_data`, `zone_data`, `grid_data`, `action_data`, `scenario_data`,
212 Assets, 1087 Karten) durch `executeSequenceWithLog`: je Durchlauf die echte
Aufbausequenz, nur mit dem Testbösewicht auf dem **dritten und damit letzten**
Leistenplatz, danach dreimal die echte Aktion „Kampf beginnen" mit „Dorfphase
beginnen" dazwischen. Im dritten Durchgang nimmt `reveal_next` vom letzten
Platz, `final: "auto"` greift also.

- **Positivprobe Tilda Fields** (hat einen `final`-Abschnitt): im dritten
  Durchgang liegen **acht** Geländeteile statt sieben — dazugekommen ist
  **F1:G2**, der `Pile of Locals`. Der Zusatzaufbau greift also nachweislich.
- **Die sechs**: im dritten Durchgang liegt **genau das Hauptgelände** aus
  Abschnitt 3, kein Teil mehr und keins weniger (Red Atrocious 9, Ernie Offal 7,
  Tartar Fishboy 7, Ms. Falls & Co. 7, Patches 7, Barry Bluff 8 Geländeteile,
  dazu die Bösewicht-Basis und die drei Dörfler).

> **Weiterhin offen: Sichtprüfung am laufenden Tisch.** Der Browser-Bereich war
> auch diesmal nicht angemeldet, und anmelden ist nicht zulässig. Die Prüfung
> läuft gegen denselben Executor und dieselben Daten, aber nicht durch die
> Oberfläche.

### 8.7 Die gemeldeten „fehlenden Geländekarten" sind **keine** fehlenden `decks`-Angaben

Beim Durchrechnen meldet `build_scenario` weiterhin *„no terrain card named …"*.
Die Ursache ist **nicht** eine fehlende `decks`-Angabe (die gibt es in diesen
Daten ohnehin nirgends), sondern der Namensvergleich zwischen **Geländeasset**
und **Geländekarte**: die Karte wird über ihren Namen gesucht, ersatzweise über
den Teil vor bzw. hinter dem Schrägstrich eines zweiseitigen Teils
(`shared/sequenceExecutor.js`, M8.3).

| Meldung | wahre Lage | Folge |
|---|---|---|
| `Sprengstoff`, `Auslöser` (Red Atrocious, Barry Bluff) | Die Bibliothek führt **eine** Karte **`Sprengstoff & Auslöser`** für **zwei** Plättchen. | Im Spiel richtig (eine Karte für beide Teile), aber die Karte wird **gar nicht** ausgelegt, weil kein Name trifft. |
| `Dichter Wald 2` (Red Atrocious, The Door Knockers) | Es gibt **eine** Karte `Dichter Wald` für beide Waldstücke; sie liegt schon über das erste Stück. | Harmlos — die Meldung ist Rauschen. |
| `Pile of Locals` (**Tilda Fields, `final`**) | In der Kartenbibliothek gibt es **keine** Karte dieses Namens. | **Echte Lücke**, neu gefunden; sie betrifft einen der fünf schon vorhandenen `final`-Abschnitte, nicht die sechs. |

Nicht behoben, weil jede Behebung eine Entscheidung verlangt, die der Auftrag
nicht deckt: Assets umbenennen zöge `scenario_data` mit, Karten anzulegen hieße
Kartendaten zu erfinden.

### 8.8 Geschrieben wurde nichts

`setups.scenario_data` ist **unverändert**. Es gab nichts zu schreiben: die
sechs haben kein Endgegner-Gelände und keine `EG`-Felder, und für die Besondere
Ausrüstung gibt es in den Daten keinen Platz — einen zu erfinden untersagt der
Auftrag ausdrücklich. Gelesen wurden `scenario_data` sowie `zone_data`,
`grid_data`, `sequence_data`, `action_data` und `state_data` für das
Durchrechnen; geschrieben wurde keine Spalte.
---

## 9. Die Besondere Ausrüstung des neuen Sheriffs (eingetragen 2026-10-15)

### 9.1 Das Ergebnis in einem Satz

Zehn der elf Bösewichte nennen auf ihrer Tableau-Rückseite **eine** Besondere
Ausrüstung; sie steht jetzt als `final.stats.SHERIFF` in den Szenariodaten, und
ein `place_card`-Schritt am Ende der Aktion **„Kampf beginnen"** legt sie im
Endgegner-Kampf in die **Terrain-Auslage**. **Tilda Fields fällt heraus** — bei
ihr zieht der Sheriff die oberste Karte eines gemischten Decks, es gibt also
keinen Kartennamen, den der Tisch legen könnte.

### 9.2 Die fünf nachgelesenen Namen

Abgelesen mit derselben Methode wie in Abschnitt 8.2: `table_assets."Tableau:
<Name>".back_image_path`, das **SETUP**-Band unter dem Szenariobanner
(y 0,50–0,72 der Bildhöhe), auf 1400 px Breite hochskaliert. Die Bilder wurden
diesmal nicht über `https://gaming.benjathi.de` geholt (der Vorsatz antwortet
inzwischen mit **403**), sondern direkt aus dem Upload-Verzeichnis des
Containers — dieselbe Datei, ein anderer Weg.

| Bösewicht (Szenario) | SETUP-Wortlaut | Ausrüstung (englisch) | Karte (deutsch) | Sicherheit |
|---|---|---|---|---|
| **Deputy Waggums** — „Pacifying the Pooch" | *„Appoint a new sheriff! The new sheriff quickly scatters treats across the landscape and grabs the **Sheriff's Tranq** unique gear (may equip immediately)."* | Sheriff's Tranq | **BETÄUBUNGSWUMME** | **sicher** |
| **Virginia Fitz** — „The Old Sheriff's Debt" | *„… They receive the **Sheriff's Shovel** unique gear (may equip immediately)!"* | Sheriff's Shovel | **SHERIFFS SCHAUFEL** | **sicher** |
| **The Bundits** — „The Bundo Queen Cometh" | *„… the newly appointed sheriff receives the **Irresistible Carrot** unique gear (may equip immediately)."* | Irresistible Carrot | **PERFEKTE MÖHRE** | **sicher** |
| **The Door Knockers** — „The Flawless Sales Pitch" | *„… the new sheriff grabs some gear from Goob's Tavern. They receive the **'No Solicitors'** unique gear (may equip immediately)."* | 'No Solicitors' | **DER BEGRÜSSER** | **sicher** |
| **Tilda Fields** — „Shearing the Scoundrels" | *„Find the 10 **garden** keyword gear in the unique gear deck. Shuffle them face down and set them aside to form the **Garden deck**."* / *„Appoint a new sheriff! They rush ahead and receive the top card of the Garden deck."* | **kein benanntes Teil** | — | **sicher gelesen, nicht eintragbar** |

**Warum die vier Zuordnungen sicher sind** — zugeordnet wurde wie in 8.4 über
**Kartenbild und Kartentext**, nicht über den Namen:

- **BETÄUBUNGSWUMME** (Betäubungs-Wumme, Spritzenpistole): *„Reichweite 4. Wenn
  du hiermit triffst, **-1 ENERGIE für Willi**."* „Willi" ist Deputy Waggums im
  Deutschen, und **Energie** ist genau seine Fähigkeit „Boundless Energy"
  (*„Waggums begins the fight with 2 energy per townsfolk"*). Die vier
  „SHERIFFS …"-Karten der Grundspielkategorie (Anker, Feuerzeug, Klebstoff,
  Schaufel) gehören nachweislich zu anderen Bösewichten.
- **SHERIFFS SCHAUFEL** (blutige Schaufel): *„+1 auf deine Terrain-Würfe für
  **Grabhügel**."* Grabhügel = Burial Mound, Virginia Fitz' einziges
  Endkampf-Terrain. Nicht zu verwechseln mit **GÜNNIS SCHAUFEL** aus derselben
  Kategorie.
- **PERFEKTE MÖHRE**: *„1 MUMM: Bewege **Die Karnönigin** oder 1 **Karni** um
  bis zu 3 Felder."* Karnönigin = The Bundo Queen, Karni = Bundo.
- **DER BEGRÜSSER**: Das Artwork zeigt eine aufgerollte Fußmatte mit der
  Aufschrift „HAU AB!", die wie eine Wumme abgefeuert wird, mit einem roten
  Verbotszeichen als Mündungsrauch — das „No Solicitors"-Türschild. Der Text
  *„Immer wenn du einen **bekehrten** Dörfler mit dieser Waffe angreifst,
  darfst du 1 **Glaube** abwerfen"* nennt beide Begriffe, die nur den Door
  Knockers gehören.

**Nebenbefund: die Rückfrage zu Ernie Offal ist geklärt.** Der Auftrag bat um
eine zweite Lesung der einzigen Zuordnung aus 8.4, die „hoch, aber nicht
wörtlich" stand. Das SETUP-Band sagt wortgleich *„They never leave home without
their tummy meds — a wise choice! They receive **Belly Balm** unique gear."*
**KÖRPERBUTTER** trägt *„Abwerfen: -2 MUMM."* Ernies Fähigkeit **„Cuisine
Counterer"** schiebt den Dörflern bei jedem Treffer +1 MOX zu und bestraft sie
bei 10 MOX mit 1 DMG — MUMM ist MOX, und die Karte ist das Gegenmittel. Damit
hängt die Zuordnung nicht mehr nur am Tiegelbild: **sicher** (8.4 nachgezogen).

**Was weggelassen wurde: Tilda Fields.** Ihr Sheriff bekommt kein benanntes
Teil, sondern die **oberste Karte des Garten-Decks** — zehn gemischte Karten
mit dem Schlüsselwort `garden`. Der Tisch dürfte nicht entscheiden, welche das
ist, und einen Deck-Schritt zu bauen hieße, die zehn Karten erst einmal zu
identifizieren (die Kategorie `Einzigartige Ausrüstung (Üble Nachbarn)` führt
neun offensichtliche: GARTENHANDSCHUHE, GARTENSCHERE, GARTENSCHLAUCH,
GARTENSTIEFEL, RECHEN, SPATEN, UNKRAUTVERNICHTER, WASSEREIMER, ERNTEHUT — die
zehnte ist nicht am Namen erkennbar). Also **kein Eintrag**, und der Schritt
wird bei ihr übersprungen wie in jedem Vorkampf.

### 9.3 Trägt ein `final`-Abschnitt, der nur `stats` enthält?

**Ja.** Sechs der elf hatten gar keinen `final`-Abschnitt (8.1, und das ist
richtig — sie haben kein Endkampf-Gelände). Geprüft wurde an beiden Stellen,
die darüber entscheiden:

- **`shared/sequenceExecutor.js`, `build_scenario`:**
  `const parts = [entry, useFinal ? entry?.final : null].filter(Boolean);` —
  `filter(Boolean)` wirft nur `null`/`undefined` weg, ein Objekt `{ stats: … }`
  ist wahr und bleibt drin. Die Schleife darunter liest `part?.terrain`,
  `part?.fields` und `part?.stats` je für sich; leere Gelände- und Feldlisten
  tun schlicht nichts.
- **`shared/scenarioData.js`, `validateScenarioData`:** `section()` meldet nur,
  was dasteht, und gibt zurück, ob der Abschnitt etwas legt. Die einzige Stelle,
  die daran hängt, ist `if (!placesSomething && !finalPlaces) problems.push(…
  "places nothing")` — und `placesSomething` ist für alle elf Einträge wahr
  (jeder hat Hauptgelände). Ein `final`, das nur `stats` trägt, gilt also **nicht
  als leer**, sondern als „legt nichts, bindet aber".

Gegenprobe am Durchrechnen: für alle elf Bösewichte sind **Rasterobjekte,
Status von `build_scenario`, dessen Meldungen und die beiden Bösewicht-Zähler
vor und nach der Änderung identisch** — der neue `final`-Abschnitt ändert am
Aufbau nichts außer der zusätzlichen Karte.

### 9.4 Was eingetragen wurde

**`setups.scenario_data`** — je Bösewicht ein Schlüssel im `final`-Abschnitt,
genau in der Form, die `$BEW` und `$LEB` schon benutzen:

```json
"Red Atrocious":   { "final": { "stats": { "SHERIFF": "QUACKSALBE" } } },
"Deputy Waggums":  { "final": { "terrain": [...], "fields": {...},
                                "stats": { "SHERIFF": "BETÄUBUNGSWUMME" } } }
```

| Bösewicht | `final` vorher | `final` nachher | `SHERIFF` |
|---|---|---|---|
| Deputy Waggums | `terrain`+`fields` | `terrain`+`fields`+`stats` | BETÄUBUNGSWUMME |
| Virginia Fitz | `terrain`+`fields` | `terrain`+`fields`+`stats` | SHERIFFS SCHAUFEL |
| The Bundits | `terrain`+`fields` | `terrain`+`fields`+`stats` | PERFEKTE MÖHRE |
| The Door Knockers | `fields` | `fields`+`stats` | DER BEGRÜSSER |
| Red Atrocious | — | `stats` | QUACKSALBE |
| Ernie Offal | — | `stats` | KÖRPERBUTTER |
| Tartar Fishboy | — | `stats` | ERSATZ-GLIEDMASSEN |
| Ms. Falls & Co. | — | `stats` | MIKROFASERTUCH |
| Patches | — | `stats` | MIETZ-SCHEUCHER |
| Barry Bluff | — | `stats` | BLUTBESPRITZT |
| **Tilda Fields** | `terrain`+`fields` | **unverändert** | — |

**`setups.action_data`** — ein Schritt, **angehängt** an „Kampf beginnen"
(Schritt 17, die Aktion hat jetzt 18):

```json
{ "type": "place_card", "cardName": "$SHERIFF", "targetZoneLabel": "Terrain-Auslage" }
```

Die Schritte 0–16 sind Zeichen für Zeichen unverändert, die beiden anderen
Aktionen („Dorfereignis ziehen", „Dorfphase beginnen") ebenfalls. `zone_data`,
`grid_data`, `sequence_data` und `state_data` wurden **nur gelesen**.

**Eindeutigkeit der Namen.** `place_card` löst über `findCardByName` gegen die
**ganze** Bibliothek auf (1087 Karten), nicht gegen eine Kategorie. Alle zehn
eingetragenen Namen und die fünf `GESICHTSLOS`-Namen treffen dort **genau eine**
Zeile — exakte Übereinstimmung auf `squashName`, kein `ambiguous`, kein
„has N copies". Geprüft mit `findCardByName` gegen die echte Kartenliste.

### 9.5 Wohin die Karte fällt — und warum dorthin

**`Terrain-Auslage`.** Wer Sheriff wird, entscheiden die Spieler über
Heldenpunkte (`docs/tft-regeln.md` §8.2); der Tisch darf das nicht vorwegnehmen.
Er legt die Karte darum **sichtbar und unparteiisch** hin, von Hand wandert sie
zum richtigen Dörfler. Von den 45 Zonen des Aufbaus bleibt dafür genau eine
übrig:

- **`Ausrüstung Dörfler 1/2/3`** scheiden aus — jede Wahl wäre eine Sheriffwahl.
- **`Heldentaten-Auslage`** hat `capacity: 6`, und „Dorfphase beginnen" füllt sie
  mit `fill: true` wieder auf 6 Heldentaten auf; eine Fremdkarte nähme einen
  Platz weg und verschöbe die Zählung.
- **`Nachschub-Auslage`** ist der Laden, und „Kampf beginnen" räumt sie mit
  `clear_zone` in den Stapel *Nachschub (Tante Emma)* — die Ausrüstung
  verschwände im nächsten Kampf im Nachziehstapel.
- **`Ablage`** ist der Ablagestapel: eine Karte, die noch genommen werden soll,
  sähe dort weggeworfen aus.
- **`Aktionen`** bekommt im selben Durchlauf das Verhaltensdeck (Schritt 15).
- **`Hand Dörfler 1/2/3`** wären wieder eine Zuweisung.

Übrig bleibt **`Terrain-Auslage`**: `accepts: ["card"]`, **`capacity: null`**
(sie kann also nie voll laufen und keiner Geländekarte den Platz nehmen), am
Hauptbrett verankert und über dessen ganze Breite sichtbar, und sie hält genau
die Karten, die zum **gerade liegenden Kampf** gehören. Dass „Dorfphase
beginnen" sie mit `clear_zone` leert, ist hier das Entscheidende: die Besondere
Ausrüstung gilt nur im Endgegner-Kampf und wird mit ihm abgeräumt, statt liegen
zu bleiben.

Die Karte liegt **hinter** den Geländekarten, weil der Schritt ans Ende der
Aktion gehängt ist und `place_card` den ersten freien Platz nimmt.

### 9.6 Wie die Meldung im Vorkampf lautet

In den Kämpfen vor dem Endkampf bindet `build_scenario` den `final`-Abschnitt
nicht, `$SHERIFF` bleibt also ungebunden, und der Schritt wird **übersprungen**
— mit Absicht. Im Protokoll steht dann, wortgleich:

> **place_card** — `skipped` — `"$SHERIFF": $SHERIFF is not bound`

Das ist dieselbe Zeile, die jeder Platzhalterschritt ohne Bindung erzeugt
(`shared/sequenceExecutor.js`, Platzhalterauflösung über `NAME_FIELDS`), und
**kein Datenmangel**: im Chump-, Hooligan- und Troublemaker-Kampf gibt es keinen
neuen Sheriff. Bei **Tilda Fields** steht dieselbe Zeile auch im Endkampf, aus
dem Grund in 9.2.

### 9.7 Prüfung

**Verfahren** nach `docs/datenzugriff.md`: Trockenlauf mit Gegenprobe („außer
`final.stats` ist nichts anders, die Schritte 0–16 sind unverändert, die
anderen Aktionen sind unverändert"), Sicherung der beiden Spalten, dann scharf
in **einer** `db.transaction` über `scenario_data` und `action_data` — jede
Spalte mit ihrem eigenen `UPDATE`, keine ganze Zeile zurückgeschrieben.
Danach Kontrollausgabe aus der Datenbank.

**`validateScenarioData`** gegen die echte Assetliste (212 Assets) und das echte
Raster `Spielfeld A–S / 1–14`, auf die **geschriebene** Spalte: **0 Probleme**.

**Durchgerechnet** mit den echten Produktionsdaten (`state_data`,
`sequence_data`, `zone_data`, `grid_data`, `action_data`, `scenario_data`,
212 Assets, 1087 Karten) durch `executeSequenceWithLog`, je Durchlauf die echte
Aufbausequenz mit dem Testbösewicht auf dem **dritten und damit letzten**
Leistenplatz, danach dreimal „Kampf beginnen" mit „Dorfphase beginnen"
dazwischen. (Zwei Füller auf den vorderen Plätzen: zweimal derselbe Name ginge
nicht, `place_asset` verschiebt dasselbe Objekt, statt ein zweites zu legen.)

| Bösewicht | Kampf 1 | Kampf 3 (Endkampf) | Terrain-Auslage nach Kampf 3 |
|---|---|---|---|
| Deputy Waggums | `skipped` | **`ok`** | 7 Geländekarten + **BETÄUBUNGSWUMME** |
| Virginia Fitz | `skipped` | **`ok`** | 5 + **SHERIFFS SCHAUFEL** |
| The Bundits | `skipped` | **`ok`** | 6 + **PERFEKTE MÖHRE** |
| The Door Knockers | `skipped` | **`ok`** | 7 + **DER BEGRÜSSER** |
| Red Atrocious | `skipped` | **`ok`** | 6 + **QUACKSALBE** |
| Ernie Offal | `skipped` | **`ok`** | 7 + **KÖRPERBUTTER** |
| Tartar Fishboy | `skipped` | **`ok`** | 7 + **ERSATZ-GLIEDMASSEN** |
| Ms. Falls & Co. | `skipped` | **`ok`** | 7 + **MIKROFASERTUCH** |
| Patches | `skipped` | **`ok`** | 7 + **MIETZ-SCHEUCHER** |
| Barry Bluff | `skipped` | **`ok`** | 6 + **BLUTBESPRITZT** |
| **Tilda Fields** | `skipped` | `skipped` (`$SHERIFF is not bound`) | 7, keine Ausrüstung |

> **Weiterhin offen: Sichtprüfung am laufenden Tisch.** Der Browser-Bereich war
> auch diesmal nicht angemeldet, und anmelden ist nicht zulässig. Die Prüfung
> läuft gegen denselben Executor und dieselben Daten, aber nicht durch die
> Oberfläche. Wer das nachholt: Token `Bösewicht: Patches` auf den **letzten**
> Leistenplatz legen, verdeckt, dreimal „Kampf beginnen" mit „Dorfphase
> beginnen" dazwischen — im dritten Durchgang liegt **MIETZ-SCHEUCHER** in der
> Terrain-Auslage, in den ersten beiden steht die Zeile aus 9.6 im Protokoll.

**Unverändert fortbestehend** (nicht Teil dieses Befunds): die Meldungen
*„no terrain card named …"* aus 8.7, und Barry Bluffs beide Zählerschritte, die
seine Formel nicht rechnen können (7.3).

### 9.8 Was weiterhin keinen Platz hat

1. **Barry Bluffs zweiter Schritt** — *„At the start of the fight, each other
   townsfolk receives a piece of **Faceless** unique gear at random."* Die fünf
   Karten liegen und heißen eindeutig (`GESICHTSLOS`, `GESICHTSLOS (2)` …
   `(5)`), aber der Schritt richtet sich an *„each **other** townsfolk"* — also
   an alle außer dem Sheriff, und wer das ist, darf der Tisch nicht entscheiden.
   Dazu kommt „at random". Abbildbar wäre nur „leg alle fünf irgendwo hin", und
   das wären fünf weitere Schritte, die in zehn von elf Kämpfen übersprungen im
   Protokoll stünden. **Nicht gebaut**, bewusst.
2. **Tilda Fields' Garten-Deck** (9.2).
3. **Patches' „10 Fetid Furball terrain pieces aside for later use"** —
   unverändert, siehe 8.5.
