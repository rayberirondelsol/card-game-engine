# Endkampf-Gelände und Dörflerzahl — wie viele `EG`/`FF`-Plättchen bei 2, 3, 4, 5 Dörflern

Erhoben am 2026-11-09. Reine Messung an den Tableau-Rückseiten: gelesen und
gemessen, **nichts in der Datenbank oder im Code geändert**, kein Zugriff auf den
Server.

Die Frage: `[DE S.23]` sagt, die Anzahl der `EG`-Terrains werde „**in den meisten
Fällen** durch die Anzahl der mitspielenden Dörfler bestimmt". **Wann nicht?** Und
was legt man bei **zwei** Dörflern?

Begriff vorweg: auf den **englischen** Tableaus heißt das Kürzel **`FF`**
(*Final Fight*), nicht `EG`. `EG` ist die deutsche Anleitung. Gemeint ist
dasselbe: die Felder, auf die der AUFBAU-Kasten („SETUP") die Endkampf-Plättchen legt.

---

## 0. Kurzfassung

1. **Die Zahl steht im SETUP-Kasten, nicht auf dem Plan.** Der Plan zeigt immer
   *alle* möglichen Plätze (bis zu fünf); der Kasten sagt, wie viele davon man belegt.
2. **Nur bei drei von acht** hängt die Zahl an den Dörflern, und dort ist es
   wörtlich **„1 je Dörfler"** — Deputy Waggums, Pepin Milkfrog, Samuel Strawman.
   Auf dem Plan stehen dort `FF1` … `FF5`; man belegt sie **„in numerischer
   Reihenfolge"** (*in numerical order*). Bei 2 Dörflern also `FF1` und `FF2`.
3. **Bei den anderen fünf gilt „in den meisten Fällen" nicht**, die Zahl ist
   fest: Virginia Fitz **5**, Handsy **5**, The Bundits **1**, Tilda Fields **1**,
   Umbrello **1**. Unabhängig von der Dörflerzahl.
4. **Die Vermutung „die 5 ist Dörflerzahl + 2" ist falsch.** Die 5 ist bei
   Virginia und Handsy eine **feste Zahl** (*„Shuffle 5 Burial Mounds"*,
   *„Place 5 Hiding Citizens"*).
5. **Unsere heutigen Daten decken sich für drei Dörfler mit dem Kasten — bei allen
   acht, Feld für Feld.** Kein Fehler in den Daten. Falsch ist ein **Halbsatz in
   `docs/tft-regeln.md` §8.1** („solo also 3"), siehe Abschnitt 4.
6. **Die 2P-Spalte der acht Vorderseiten stimmt mit §5.5 überein** — alle 16
   Zellen der 2P-Spalte, und ebenso 3P/4P/5P (64 von 64). Keine Abweichung, nichts
   „nicht lesbar".

**Die Regel für zwei Dörfler** (Quelle: SETUP-Kasten, Abschnitt 2):

| Bösewicht | Plättchen bei 2 | bei 3 (heute in den Daten) | bei 2 fallen weg |
|---|---|---|---|
| Deputy Waggums | **2** (`FF1`, `FF2`) | 3 | `FF3` = **C5** |
| Virginia Fitz | **5** (fest) | 5 | nichts |
| The Bundits | **1** (fest) | 1 | nichts |
| Tilda Fields | **1** (fest) | 1 | nichts |
| Handsy | **5** (fest) | 5 | nichts |
| Pepin Milkfrog | **2** (`FF1`, `FF2`) | 3 | `FF3` = **S9** |
| Samuel Strawman | **2** (`FF1`, `FF2`) | 3 | `FF3` = **A1:B2** |
| Umbrello | **1** (fest) | 1 | nichts |

---

## 1. Methode

**Quellen je Bösewicht.** Bilder im Scratchpad unter
`C:\Users\benja\AppData\Local\Temp\claude\C--Users-benja-projects\a20869d2-5038-44bc-9878-66120a69e42a\scratchpad\eg\`.

| Bösewicht | Rückseite (Pixel) | Vorderseite (Pixel) | PDF unter `Z:\Austausch\TfT\` |
|---|---|---|---|
| Deputy Waggums | 1474 × 2918 | 1445 × 2883 | ja |
| Virginia Fitz | 1396 × 2766 | 1433 × 2840 | ja |
| The Bundits | 1518 × 2997 | 1488 × 2944 | ja |
| Tilda Fields | 1420 × 2845 | 1528 × 3062 | ja |
| Handsy | 1276 × 2555 | 1255 × 2505 | ja |
| Pepin Milkfrog | 1500 × 3000 | 1500 × 3000 | **nein** |
| Samuel Strawman | 1500 × 3000 | 1500 × 3000 | **nein** |
| Umbrello | 1500 × 3000 | 1500 × 3000 | **nein** |

**Die PDFs sind hier keine bessere Quelle.** Alle fünf PDFs sind **reine
Bild-PDFs**: zwei Seiten, je ein eingebettetes Rasterbild, **keine Textebene**
(`get_text()` liefert 0 Zeichen). Das eingebettete Bild jeder Seite ist **Pixel für
Pixel identisch** mit der PNG-Datei im Scratchpad (zehn von zehn Seiten geprüft:
gleiche Größe, leere Differenz-Bounding-Box). Das PDF liefert also weder schärferen
Text noch eine zweite Messung — **eine Quelle, nicht zwei.** Gelesen wurde in jedem
Fall am Bild. Die fünf PDF-Bilder (Deputy, Virginia, Bundits, Tilda, Handsy) sind
Fotos der gedruckten Tableaus mit Papierstruktur und leichter Perspektive; Pepin,
Samuel und Umbrello sind saubere Artwork-Bilder.

**Gelesen.**

1. Jede Rückseite auf 700 px Breite verkleinert, um den SETUP-Kasten zu finden. Er
   sitzt bei allen acht **unter dem Banner `FINAL FIGHT / <Name>` und dem
   Erzähltext** als erster der grauen Kästen.
2. Den Kasten **in voller Auflösung** ausgeschnitten (650 von 700 Übersichtspixeln
   Breite, auf 1300 px skaliert) und wörtlich gelesen. Alle acht Wortlaute waren
   **klar lesbar**. Bei Virginia war der erste Ausschnitt oben abgeschnitten und
   wurde mit höherem Ansatz wiederholt.
3. Den Plan (Raster A–S waagerecht / 1–14 senkrecht) mit einem **Gitter
   überlagert**, das aus den **gedruckten Spaltenbuchstaben und Zeilenzahlen**
   kalibriert ist (Mitte von A, Mitte von S, Mitte von Zeile 1, Mitte von
   Zeile 14), nicht aus dem Bildrand. Geprüft: jedes `FF`-Kästchen liegt mittig in
   seinem Feld, bei den Fotos mit höchstens einem Viertelfeld Versatz am Rand.
   **Feldadressen sind auf das Feld genau**; bei 2 × 2-Plättchen stehen linke
   obere und rechte untere Ecke.
4. Die `FF`-Beschriftung (mit oder ohne Ziffer) an sechs Kästchen im Ausschnitt
   nachgesehen: Virginia B1 und R14, Handsy P5 und M12, Bundits E10 — **ohne
   Ziffer**; Deputy D12 — **`FF4`**.
5. **2P-Gegenprobe:** je Vorderseite den Kasten `MVMT` / `2P 3P 4P 5P` / `HEALTH`
   ausgeschnitten (66 % der Seitenbreite, auf 1100 px) und alle acht Zahlen
   gelesen. Bei Tilda Fields war der erste Ausschnitt zu tief angesetzt (MVMT-Zeile
   fehlte) und wurde mit höherem Ansatz wiederholt.

**Was ich nicht gemacht habe.** Keine Messung an den zwölf anderen Bösewichten
(Bort Dovis, Lawman Dozy, Penny Pinchetti, Will Barlow, Qing & Kween und die sieben
übrigen der Erweiterung) — ihre Bilder lagen nicht vor. Die Regel unten gilt
**nur für diese acht**.

---

## 2. Je Bösewicht: Wortlaut, Plan, Zahl

Alle Wortlaute: `[Tableau <Name>, Rückseite, SETUP, Schritt 1]` (englisch, so
wörtlich wie lesbar). Alle **sicher gelesen**.

### Deputy Waggums — „Pacifying the Pooch"

- **SETUP 1:** „Place 1 **Sedative Treat** on the board per townsfolk (in
  numerical order)."
- **Plan:** `FF1` … `FF5`, **nummeriert**.

| Marke | Feld | Sicherheit |
|---|---|---|
| `FF1` | **O13** | sicher |
| `FF2` | **N4** | sicher |
| `FF3` | **C5** | sicher |
| `FF4` | **D12** | sicher |
| `FF5` | **R8** | sicher |

- **Regel: 1 je Dörfler.** Bei **2** → `FF1`, `FF2`. Bei 3 → dazu `FF3`. Bei 4 →
  dazu `FF4`. Bei 5 → dazu `FF5`.
- Gegenüber 3 Dörflern: **bei 2 fällt C5 weg; bei 4 kommt D12 dazu; bei 5 kommen
  D12 und R8 dazu.**
- Angrenzend, nicht das Gelände: `RUFFIAN ABILITY: BOUNDLESS ENERGY` — „2 energy
  per townsfolk".

### Virginia Fitz — „The Old Sheriff's Debt"

- **SETUP 1:** „Shuffle **5 Burial Mounds** (with their Coin values facedown) and
  place them on the board."
- **Plan:** fünf Kästchen, nur **`FF`, unnummeriert**: **B1, L3, S5, A8, R14**
  (alle sicher).
- **Regel: fest 5.** Die Zahl ist **ausgeschrieben** („5"), nicht „je Dörfler".
  Bei 2, 3, 4, 5 Dörflern: **immer 5**, immer dieselben fünf Felder. Weil alle
  fünf belegt werden, braucht es keine Reihenfolge — darum keine Ziffern.
- Gegenüber 3 Dörflern: **nichts fällt weg, nichts kommt dazu.**
- Angrenzend, nicht das Gelände: die Schuld beträgt „at least 12 Coins per
  townsfolk" (`TOWNSFOLK ABILITY: SHERIFF'S DEBT`).

### The Bundits — „The Bunny Queen Cometh"

- **SETUP 1:** „Place **The Bundo Queen** terrain piece on the board."
- **Plan:** ein Kästchen, `FF`, unnummeriert: **E10** (sicher).
- **Regel: fest 1.** Bei jeder Dörflerzahl 1 Plättchen auf E10.
- Angrenzend: „The Bundo Queen has **3 HP per townsfolk**" (`TERRAIN: THE BUNDO
  QUEEN`) — Lebenspunkte skalieren, die Plättchenzahl nicht.

### Tilda Fields — „Shearing the Scoundrels"

- **SETUP 1:** „Place the **Pile of Locals** terrain piece on the board."
- **Plan:** ein 2 × 2-Kästchen, `FF`, unnummeriert: **F1:G2** (sicher).
- **Regel: fest 1.** Bei jeder Dörflerzahl 1 Plättchen auf F1:G2.

### Handsy — „The Hostile Hand Hijacking"

- **SETUP 1:** „Place **5 Hiding Citizens** on the board."
- **Plan:** fünf Kästchen, nur **`FF`, unnummeriert**: **P5, E7, M9, H10, M12**
  (alle sicher; Reihenfolge zeilenweise, wie in `docs/szenariodaten-grundspiel.md`
  §9 Nr. 8).
- **Regel: fest 5.** Die Zahl ist ausgeschrieben und **an die Siegbedingung
  gebunden**: der Kasten `TERRAIN: HIDING CITIZENS` zählt „1 Slain … 5 Slain: The
  townsfolk lose!", und `HOW TO WIN` nennt als Niederlage, wenn „all Hiding
  Citizens are killed". Eine Dörflerzahl-Abhängigkeit würde diese Zählung zerstören.
- Gegenüber 3 Dörflern: **nichts fällt weg, nichts kommt dazu.**

### Pepin Milkfrog — „The Dairylord Takeover"

- **SETUP 1:** „Place 1 **Giant Milk Jug** on the board per townsfolk (in
  numerical order)."
- **Plan:** `FF1` … `FF5`, **nummeriert**.

| Marke | Feld | Sicherheit |
|---|---|---|
| `FF1` | **N14** | sicher |
| `FF2` | **A1** | sicher |
| `FF3` | **S9** | sicher |
| `FF4` | **M1** | sicher |
| `FF5` | **A9** | sicher |

- **Regel: 1 je Dörfler.** Bei **2** → `FF1`, `FF2`.
- Gegenüber 3 Dörflern: **bei 2 fällt S9 weg; bei 4 kommt M1 dazu; bei 5 kommen
  M1 und A9 dazu.**
- Angrenzend: „Until all Giant Milk Jugs are removed from the board, Pepin
  Milkfrog is unable to go below 1 HP."

### Samuel Strawman — „The Sacrificial Fields"

- **SETUP 1:** „Place 1 **Wheat Field** on the board per townsfolk (in numerical
  order)."
- **Plan:** `FF1` … `FF5`, **nummeriert**, alle **2 × 2**.

| Marke | Felder | Sicherheit |
|---|---|---|
| `FF1` | **R1:S2** | sicher |
| `FF2` | **C13:D14** | sicher |
| `FF3` | **A1:B2** | sicher |
| `FF4` | **R12:S13** | sicher |
| `FF5` | **M1:N2** | sicher |

- **Regel: 1 je Dörfler.** Bei **2** → `FF1`, `FF2`.
- Gegenüber 3 Dörflern: **bei 2 fällt A1:B2 weg; bei 4 kommt R12:S13 dazu; bei 5
  kommen R12:S13 und M1:N2 dazu.**
- Angrenzend: „until ALL terrain pieces are removed from the board, Strawman is
  unable to go below 1 HP", und die Schwäche „instantly takes 1 DMG per
  townsfolk".

### Umbrello — „The Great Town Flooding"

- **SETUP 1:** „Place **Engulfing Wave** on the board."
- **Plan:** ein 2 × 2-Kästchen, `FF`, unnummeriert: **A5:B6** (sicher).
- **Regel: fest 1.** Bei jeder Dörflerzahl 1 Plättchen auf A5:B6.

---

## 3. Die Regel — und für welche der acht sie nicht gilt

**Die Regel, wenn sie gilt:** der SETUP-Kasten sagt „**1 \<Plättchen> on the board
per townsfolk (in numerical order)**". Dann gibt es `FF1` … `FF5` auf dem Plan, und
man legt so viele, wie Dörfler im Spiel sind, **von `FF1` an aufwärts**. Bei
weniger Dörflern fallen also immer die **höchsten Nummern** weg.

- **Gilt für 3 von 8:** Deputy Waggums, Pepin Milkfrog, Samuel Strawman.
- **Gilt nicht für 5 von 8** — die Zahl ist fest:
  - **5, fest:** Virginia Fitz („Shuffle 5 …"), Handsy („Place 5 …", an die
    Siegbedingung gebunden).
  - **1, fest:** The Bundits, Tilda Fields, Umbrello (ein einzelnes
    Sonderplättchen, kein Plättchen-Satz).

**Das ist das „in den meisten Fällen" aus `[DE S.23]` — an diesen acht aber nicht
die Mehrheit, sondern eine Minderheit.** Ob die zwölf anderen Bösewichte anders
liegen, steht hier nicht (Abschnitt 6).

**Erschlossen** (nicht gelesen, sondern aus dem Muster): die Plätze sind **genau
dann nummeriert** (`FF1` … `FF5`), **wenn** der Kasten „per townsfolk" sagt. Wo die
Zahl fest ist, tragen die Kästchen **nur `FF`** — bei Virginia und Handsy auch dann,
wenn es fünf sind, vermutlich weil alle fünf belegt werden und eine Reihenfolge
nichts bedeutet. Das Muster hält in **allen acht**. **Als Faustregel für die
Engine: Nummer auf dem Plan ⇒ Zahl hängt an den Dörflern; keine Nummer ⇒ fest.**
Sie ersetzt **nicht** das Lesen des Kastens: es ist eine Beobachtung an acht, keine
gedruckte Regel. Und der Satz in `[DE S.23]` („Gibt es mehrere solcher Terrains,
sind diese mit EG1, EG2, EG3 usw. gekennzeichnet") trifft auf Virginia und Handsy
**nicht** zu — dort stehen mehrere, **unnummeriert**.

**Die Zählung „Dörfler im Spiel":** *per townsfolk* = alle Dörfler, die im Spiel
sind. Der neue Sheriff ist **einer von ihnen** (er wird nach Heldenpunkten aus den
Dörflern gewählt, `docs/tft-regeln.md` §8.2) und zählt **nicht zusätzlich**. Solo
mit 3 Dörflern ⇒ 3. *Erschlossen* aus §8.2 — der Kasten sagt es nicht ausdrücklich.

---

## 4. Gegenprobe der heutigen Daten (drei Dörfler)

Heutige Daten laut Auftrag (`final.terrain`) gegen den Kasten für **drei** Dörfler:

| Bösewicht | Daten: Plättchen — Felder | Kasten bei 3 | gelesen auf dem Plan | Ergebnis |
|---|---|---|---|---|
| Deputy Waggums | 3 — O13, N4, C5 | 3 (`FF1`–`FF3`) | `FF1` O13, `FF2` N4, `FF3` C5 | **gleich** |
| Virginia Fitz | 5 — B1, L3, S5, A8, R14 | 5 (fest) | B1, L3, S5, A8, R14 | **gleich** |
| The Bundits | 1 — E10 | 1 (fest) | E10 | **gleich** |
| Tilda Fields | 1 — F1:G2 | 1 (fest) | F1:G2 | **gleich** |
| Handsy | 5 — P5, E7, M9, H10, M12 | 5 (fest) | P5, E7, M9, H10, M12 | **gleich** |
| Pepin Milkfrog | 3 — N14, A1, S9 | 3 (`FF1`–`FF3`) | `FF1` N14, `FF2` A1, `FF3` S9 | **gleich** |
| Samuel Strawman | 3 — R1:S2, C13:D14, A1:B2 | 3 (`FF1`–`FF3`) | `FF1` R1:S2, `FF2` C13:D14, `FF3` A1:B2 | **gleich** |
| Umbrello | 1 — A5:B6 | 1 (fest) | A5:B6 | **gleich** |

**Ergebnis: keine Abweichung, kein Fehler in den Daten** — Anzahl und Felder, für
drei Dörfler, bei allen acht. Auch die **Reihenfolge** stimmt dort, wo sie zählt
(Deputy, Pepin, Samuel stehen in der Folge `FF1`, `FF2`, `FF3`). Die Einordnung der
drei Muster 1 / 3 / 5 ist damit aufgelöst: die 3 ist „je Dörfler", die 5 ist fest,
die 1 ist fest. (Die Daten selbst wurden nicht erneut aus der Datenbank gelesen;
verglichen ist mit der Tabelle aus dem Auftrag.)

**Was dagegen falsch ist — in der Dokumentation, nicht in den Daten:**

- **`docs/tft-regeln.md` §8.1, Punkt 1:** „…durch die Anzahl der mitspielenden
  Dörfler bestimmt" (solo also 3)". Der Zusatz **„solo also 3" stimmt nur für drei
  von acht** (Deputy, Pepin, Samuel). Für Virginia und Handsy sind es solo **5**,
  für Bundits, Tilda und Umbrello solo **1**. Das Handsy-Beispiel im selben
  Abschnitt („5 Versteckte Bürger auf die `EG`-Felder") ist richtig, widerspricht
  aber dem „solo also 3" davor.
- **`docs/szenariodaten-grundspiel.md` §9 Nr. 8 und 9** sind **richtig** (Handsy
  „5 unabhängig von der Dörferzahl"; Pepin/Samuel „solo: 1 je Dörfler", `FF1`–`FF3`)
  — hiermit bestätigt.

**Was die Daten für 2, 4 oder 5 Dörfler nicht tragen** (kein Fehler, eine Lücke):
sie kennen nur die 3-Dörfler-Aufstellung. Für Deputy, Pepin und Samuel fehlen
`FF4` und `FF5` (D12 und R8; M1 und A9; R12:S13 und M1:N2), und für zwei Dörfler
müsste `FF3` entfallen. Die Positionen oben sind gelesen und können übernommen
werden, **sobald** der Aufbau die Dörflerzahl kennt.

> **Nachtrag (M31, 2026-11-10): die Lücke ist geschlossen.** Seit Aufgabe `ES` tragen die
> Daten die Plättchen für vier und fünf Dörfler: bei Deputy Waggums, Pepin Milkfrog und
> Samuel Strawman hat der Eintrag `FF3` den Schlüssel `fromCount: 3`, dahinter stehen
> zwei neue Einträge (`FF4` mit `fromCount: 4`, `FF5` mit `5`) auf den Feldern dieses
> Abschnitts — **drei Schlüssel und sechs neue Einträge** (Spec M31.7). **`fields.EG`
> trug alle fünf Felder schon vorher**; es fehlten nur die Plättchen. `build_scenario`
> legt Plättchen **und** Karten aus derselben gefilterten Liste (`terrainFor(part, n)`),
> bei zwei Dörflern entfällt also `FF3`, wie hier gelesen; die fünf festen Bösewichte
> sind byteweise unverändert. **Erschlossen, nicht gelesen:** welches Bürger-Asset bei
> Pepin auf `FF4` und `FF5` liegt (der Baustein nimmt `(Dörfler)` und `(blond)` in der
> Reihenfolge der fünf Plättchen, die Handsy trägt; verdeckt liegt überall die
> Milchkanne, diese Messung nennt keine Zuordnung). Die Berichtigung des Halbsatzes in
> `docs/tft-regeln.md` §8.1 Nr. 1 steht seit `EZ` dort, mit dem alten Satz daneben.
> Geschrieben in `scenario_data`: 20 858 → 21 473 Zeichen (`82592d1ac883` →
> `69dbe9e2b8cb`, `scripts/doerflerzahl-daten.mjs`, `SCHRITTE.gelaende`).

---

## 5. Die 2P-Gegenprobe der Vorderseiten

Gelesen an den acht Vorderseiten, Kasten `MVMT` / `HEALTH` mit den Spalten
`2P 3P 4P 5P`. Erwartet laut `docs/tft-regeln.md` §5.5. **Alle Zellen klar
lesbar.** Quelle jeder Zelle: `[Tableau <Name>, Vorderseite, Kasten MVMT/HEALTH]`.
Jede Zelle: gelesener Wert, dann „gleich" (= §5.5).

| Bösewicht | BEW 2P | BEW 3P | BEW 4P | BEW 5P | LEB 2P | LEB 3P | LEB 4P | LEB 5P |
|---|---|---|---|---|---|---|---|---|
| Deputy Waggums | 6 gleich | 6 gleich | 7 gleich | 7 gleich | 12 gleich | 14 gleich | 17 gleich | 20 gleich |
| Virginia Fitz | 5 gleich | 6 gleich | 6 gleich | 7 gleich | 12 gleich | 15 gleich | 18 gleich | 21 gleich |
| The Bundits | 6 gleich | 6 gleich | 7 gleich | 7 gleich | 11 gleich | 15 gleich | 18 gleich | 21 gleich |
| Tilda Fields | 2 gleich | 3 gleich | 3 gleich | 4 gleich | 10 gleich | 15 gleich | 20 gleich | 24 gleich |
| Handsy | 7 gleich | 7 gleich | 8 gleich | 8 gleich | 11 gleich | 14 gleich | 18 gleich | 21 gleich |
| Pepin Milkfrog | 6 gleich | 6 gleich | 7 gleich | 7 gleich | 11 gleich | 14 gleich | 17 gleich | 20 gleich |
| Samuel Strawman | 6 gleich | 7 gleich | 7 gleich | 8 gleich | 11 gleich | 15 gleich | 18 gleich | 21 gleich |
| Umbrello | 6 gleich | 6 gleich | 7 gleich | 7 gleich | 11 gleich | 14 gleich | 17 gleich | 20 gleich |

**Ergebnis: 64 von 64 Zellen gleich** (die 2P-Spalte: 16 von 16). **Keine
Abweichung, keine „nicht lesbar".**

**Neu gegen das Bild geprüft sind damit Deputy Waggums, Virginia Fitz, The Bundits
und Tilda Fields** — die vier anderen (Handsy, Pepin, Samuel, Umbrello) waren schon
in `docs/szenariodaten-grundspiel.md` §5 gelesen und bestätigen sich ein zweites Mal.
Zusammen sind damit **13 der 19** Bösewichte mit Zahlenwerten gegen das Bild gelesen
(die neun aus §5 plus diese vier). **Ohne Bildprüfung bleiben sechs:** Ernie Offal,
Red Atrocious, Tartar Fishboy, The Door Knockers, Ms. Falls & Co., Patches. Barry
Bluff hat Formeln statt Zahlen (§5.4) und zählt nicht mit.

---

## 6. Was offen bleibt

1. **Die zwölf anderen Bösewichte.** Bort Dovis, Lawman Dozy, Penny Pinchetti,
   Will Barlow, Qing & Kween und die sieben übrigen der Erweiterung lagen nicht vor.
   Ob dort „1 je Dörfler", fest oder etwas Drittes steht, ist **nicht gemessen** —
   und damit auch nicht, ob „in den meisten Fällen" über alle 20 gerechnet stimmt.
   Die Faustregel „Nummer auf dem Plan ⇒ je Dörfler" ist an **acht** beobachtet.
2. **Ob der Sheriff mitzählt** ist aus §8.2 erschlossen (er ist einer der Dörfler),
   der Kasten sagt es nicht. Solo zählt er jedenfalls nicht zusätzlich.
3. **Zwei Dörfler als Spielfall.** Die Regel „1 je Dörfler" ist gelesen; ob und wie
   eine Partie mit **genau zwei Dörflern** vorgesehen ist, sagt der SETUP-Kasten
   nicht. Das Tableau druckt aber eine 2P-Spalte (Abschnitt 5).
4. **Andere Zahlen, die an den Dörflern hängen**, sind beim Lesen aufgefallen, aber
   **nicht** Teil dieser Frage und nicht weiter geprüft: Bundo-Königin 3 LEB je
   Dörfler, Virginias Schuld 12 Münzen je Dörfler, Samuels Schwäche „1 DMG per
   townsfolk", Deputys „2 energy per townsfolk". Bei einer Dörflerzahl ungleich 3
   müssten diese mit.
5. **Die Engine reicht keine Dörflerzahl in den Aufbau** (Abschnitt 4, „Lücke").
   Das ist hier nicht angefasst.

   > **Nachtrag (M31, 2026-11-10).** Seit M31 kennt der Aufbau die Zahl: sie wird **aus
   > dem Tisch gelesen** (`villagerCount` in `shared/villagers.js`, Platzhalter
   > `$doerflerzahl`), nicht aus einer Wahl (Spec M31.2); `build_scenario` fragt sie für
   > `statsByCount` und `fromCount`. Die Zahl ist im Dialog wählbar, zwei bis fünf,
   > Vorgabe zwei.

---

## 7. Die Gegenprobe der sechs bisher nicht am Bild gelesenen Bösewichte (Aufgabe `EQ`)

Erhoben am 2026-11-09. Reine Messung, **nichts in der Datenbank oder im Code
geändert**. Gelesen sind die Vorderseiten von **Ernie Offal, Red Atrocious, Tartar
Fishboy, The Door Knockers, Ms. Falls & Co. und Patches** — die sechs, die §5 und
`docs/szenariodaten-grundspiel.md` §5 offen gelassen hatten. Barry Bluff trägt
Formeln und zählt nicht mit.

### 7.1 Methode

**Quelle je Bösewicht: das Asset `Tableau: <Name>` der Bibliothek, Vorderseite**
(vom Auftraggeber aus der Produktion geholt, wie die acht aus §1), im Scratchpad
unter `…\scratchpad\eg\<Name>_vorn.png`. **Keine PDF geöffnet:** für Ernie Offal,
Red Atrocious und Patches liegen unter `Z:\Austausch\TfT\` zwar Bild-PDFs, aber §1
hat gezeigt, dass deren Bilder mit den Datenbank-PNGs Pixel für Pixel gleich sind —
ein Abgleich wäre keine zweite Quelle. **Eine Quelle, nicht zwei.**

| Bösewicht | Vorderseite (Pixel) | Art des Bildes |
|---|---|---|
| Ernie Offal | 1663 × 3264 | Foto des gedruckten Tableaus (Papierstruktur, leichte Perspektive) |
| Red Atrocious | 1513 × 2983 | Foto des gedruckten Tableaus (Gewebestruktur) |
| Tartar Fishboy | 1500 × 3000 | sauberes Artwork |
| The Door Knockers | 1500 × 3000 | sauberes Artwork |
| Ms. Falls & Co. | 1500 × 3000 | sauberes Artwork |
| Patches | 1500 × 3000 | sauberes Artwork |

**Verfahren wie §1 Nr. 5:** je Bild den Kasten `MVMT` / `2P 3P 4P 5P` / `HEALTH`
ausgeschnitten (66 % der Seitenbreite, auf 1100 px skaliert) und alle acht Zahlen
einzeln gelesen. Der Ausschnitt saß bei allen sechs im ersten Versuch (Höhe
70–88 % der Seite); nichts musste wiederholt werden. **Alle 48 Zellen waren klar
lesbar**, auch auf den beiden Fotos — keine Ziffer war verdeckt, verwischt oder
zweideutig. Die Spaltenmarken `2P`…`5P` stehen zwischen den Zeilen und gelten für
beide; sie wurden an jedem Bild mitgelesen.

### 7.2 Die Zellen

Jede Zelle: gelesener Wert, dann die Antwort gegen §5.5. Quelle jeder Zelle:
`[Tableau <Name>, Vorderseite, Kasten MVMT/HEALTH]`.

| Bösewicht | BEW 2P | BEW 3P | BEW 4P | BEW 5P | LEB 2P | LEB 3P | LEB 4P | LEB 5P |
|---|---|---|---|---|---|---|---|---|
| Ernie Offal | 5 gleich | 5 gleich | 5 gleich | 5 gleich | 12 gleich | 18 gleich | 21 gleich | 24 gleich |
| Red Atrocious | 5 gleich | 6 gleich | 8 gleich | 8 gleich | 13 gleich | 17 gleich | 20 gleich | 24 gleich |
| Tartar Fishboy | 9 gleich | 9 gleich | 9 gleich | 9 gleich | 13 gleich | 17 gleich | 20 gleich | 23 gleich |
| The Door Knockers | 5 gleich | 5 gleich | 6 gleich | 7 gleich | 10 gleich | 15 gleich | 18 gleich | 21 gleich |
| Ms. Falls & Co. | 4 gleich | 4 gleich | 5 gleich | 5 gleich | 13 gleich | 17 gleich | 20 gleich | 23 gleich |
| Patches | 7 gleich | 8 gleich | 8 gleich | 9 gleich | 1 gleich | 2 gleich | 2 gleich | 3 gleich |

(§5.5 zum Vergleich: Ernie 5/5/5/5 · 12/18/21/24; Red 5/6/8/8 · 13/17/20/24; Tartar
9/9/9/9 · 13/17/20/23; Door Knockers 5/5/6/7 · 10/15/18/21; Ms. Falls & Co.
4/4/5/5 · 13/17/20/23; Patches 7/8/8/9 · 1/2/2/3.)

**Ergebnis: 48 von 48 Zellen gleich. Keine Abweichung, keine „nicht lesbar".**
§5.5 muss für diese sechs **nicht** berichtigt werden.

**Patches** — der Sonderfall, auf den die Aufgabe hinwies: die `HEALTH`-Zeile
**steht** auf der Vorderseite und trägt **1 / 2 / 2 / 3**, gedruckt wie bei jedem
anderen. Die Anmerkung in §5.5 „Kostüm-Fetzen ersetzen LEB" steht **nicht** in
diesem Kasten und nirgends als Ersatzzeile auf der Vorderseite; sie ist eine
Deutung aus den Regelheften (`docs/tft-regeln.md` §5.5, Absatz „Patches / Fleckchen").
Gelesen wurde nur die Zahl, und die ist gleich. Zwei Nachbarzeilen der Vorderseite,
**nicht** Teil der Messung: die Schwäche „Sticky Costume" senkt „the Ruffian's **Max
HP by 1** for the fight", und der Kasten `AMBUSH` nennt „9 lives".

### 7.3 Gegenprobe der 3P-Spalte gegen `scenario_data.bosses[…].stats`

Gelesen mit einem Node-Einzeiler aus `server/test/fixtures/setupwahl-kurzpartie.json`
(Spalte `scenario`, Stand sha `914461d63f77`; die Fixture ist die Kurzpartie, also
das, was der Tisch lädt). Die Zahlen aus dem Auftrag stimmen mit der Fixture
überein.

| Bösewicht | `stats` in den Daten (BEW/LEB) | 3P auf dem Bild | Ergebnis |
|---|---|---|---|
| Ernie Offal | 5 / 18 | 5 / 18 | **gleich** |
| Red Atrocious | 6 / 17 | 6 / 17 | **gleich** |
| Tartar Fishboy | 9 / 17 | 9 / 17 | **gleich** |
| The Door Knockers | 5 / 15 | 5 / 15 | **gleich** |
| Ms. Falls & Co. | 4 / 17 | 4 / 17 | **gleich** |
| Patches | 8 / 2 | 8 / 2 | **gleich** |

Die 3P-Spalte der Daten ist bei allen sechs richtig; `ET` ändert sie nicht.

### 7.4 Freigabe für `ET`

**`ET` ist für alle 19 Zahlen-Bösewichte freigegeben.** Mit diesem Abschnitt sind
alle 19 gegen ein Bild gelesen (neun aus `docs/szenariodaten-grundspiel.md` §5, vier
aus §5 hier, sechs aus §7); jede der 8 × 19 Zellen der Spalten 2P–5P von BEW und
LEB trägt eine Bildlesung, und keine weicht von §5.5 ab. Kein Bösewicht ist
ausgenommen. **Einschränkung, die bleibt:** für die neun aus
`szenariodaten-grundspiel.md` §5 beruht die Freigabe auf jener Lesung, die hier
nicht wiederholt wurde (Handsy, Pepin, Samuel, Umbrello sind dazu in §5 ein zweites
Mal bestätigt). Barry Bluff trägt Formeln statt Zahlen und gehört nicht zu `ET`s
Spalten 2, 4, 5.
