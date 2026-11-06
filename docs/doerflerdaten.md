# Dörflerdaten — Werte, Ausrüstung, Figuren, Randplätze

Erhoben am 2026-11-06 als Grundlage für **M26.2** (Dörfler tauschen) und
**M26.1** (Ausrüstungsplätze am Tableaurand), `docs/spec-setup-system.md` ganz
am Ende. Reine Erhebung: gelesen und gemessen, **nichts in der Datenbank oder im
Code geändert**.

Spiel `072123c0-cd97-4ffb-a330-369630fab93f`. Quellen: `table_assets`
(`Tableau: <Name>`, Bilder über `https://gaming.benjathi.de/uploads/…`, kein 403),
`cards` / `categories`, `setups` (*TFT Kurzpartie*
`b1e10f4e-b8f2-4c2a-bb3e-54643944121b`, Spalte `sequence_data`).

---

## 0. Kurzfassung

1. **Alle neun Dörfler sind sicher erfasst** — Startwerte, Maxima/Minima,
   Startausrüstung, Slots, Figuren.
2. **Die Spaltenenden sind bei allen neun gleich**: HEALTH / MOVEMENT / MOXIE
   laufen **1 … 10**, ACCURACY **−4 … 5**. Das ist eine Aussage, keine Tabelle.
3. **Die Gegenprobe geht auf**: Henlo, Fridgette und Granny stimmen in allen
   zwölf Zählern mit `sequence_data` der Kurzpartie überein.
4. **Die Pfeilhöhen sind bei allen gleich** (acht Tableaus auf Pixel genau,
   Georgie als Foto auf ±0,007): links 0,154 / 0,491 / 0,844,
   rechts 0,154 / 0,491 / 0,826.
5. **Vier Dinge, die der Auftrag anders vorausgesetzt hat** (Abschnitt 8):
   die Hervorhebung ist nur bei Henlo türkis; Judy bekommt **drei Karten, die ihr
   nicht gehören**; das „46 × 46-Token" ist nicht rund (die runde Figur ist die
   50 × 50); der `max` eines Lebenszählers ist der **Startwert**, nicht das
   Spaltenende.

   > **Berichtigung vom 2026-11-06 (M26, `docs/tasks-doerfler.md`, „Wo die Spec
   > nicht stimmt", 2):** die 50 × 50-Figur wird **doch** benutzt — nicht von
   > `sequence_data`, aber von den Aktionen *Kampf beginnen* (Schritte 12–14, auf
   > das Spielfeld) und *Dorfphase beginnen* (Schritte 12–14, wieder weg). Die
   > Aussage „in keinem Aufbau benutzt" in 0 und 7 gilt nur für die Sequenz.

---

## 1. Methode

**Tableaus.** Alle neun Bilder aus `table_assets."Tableau: <Name>".image_path`
geladen (acht Stück 1748 × 2327, **Georgie Irongut 1948 × 2614** — ein Foto des
gedruckten Tableaus, nicht das Artwork der anderen acht).

**Startwerte — zwei unabhängige Wege, die sich decken:**

1. **Ablesen.** Das Bild auf 900 px Breite verkleinert und die hervorgehobene
   Zahl je Spalte gelesen; Georgie zusätzlich als Ausschnitt `x 0,50–0,98`,
   `y 0,02–0,66` (Zahlen darin groß und eindeutig).
2. **Messen.** Die hervorgehobenen Kreise per Sättigungsmaske gefunden und aus
   der **Zeilenlage** der Mittelpunkte (zehn gleich hohe Zeilen, oben 10 bzw. 5,
   unten 1 bzw. −4) auf den Wert zurückgerechnet. Das liest nicht die Ziffer,
   sondern die Position — ein Fehler beim Ablesen würde hier auffallen.
   Ergebnis: **acht von acht** Farbtableaus decken sich mit dem Ablesen
   (Abweichung der errechneten Zeile von der ganzen Zahl höchstens 0,03).
   Georgie ist ein Foto mit anderer Geometrie und nur abgelesen.

**Startausrüstung.** Fußzeile jedes Tableaus als Ausschnitt gelesen
(`y 0,925–0,995`, auf 1000 px Breite).

**Slots.** Typzeile der Karte (Ausschnitt `y 0–0,40` der 744 × 744-Karte). Die
sechs Karten der Kurzpartie aus `docs/tasks-partie13.md` (Abschnitt BY)
**übernommen, nicht neu gelesen**; die Typzeilen der übrigen 16 am Bild.

**Pfeilhöhen.** Die roten Dreiecke an den Rändern per Farbmaske gefunden,
Schwerpunkt-y durch Bildhöhe geteilt.

---

## 2. Maxima und Minima

| Spalte | Max | Min | auf allen neun? |
|---|---|---|---|
| HEALTH | 10 | 1 | ja |
| MOVEMENT | 10 | 1 | ja |
| MOXIE | 10 | 1 | ja |
| ACCURACY | 5 | −4 | ja |

Jedes Tableau zeigt oben `10 10 10 5`, unten `1 1 1 −4`, dazwischen lückenlos
zehn Zeilen. **Sicherheit: sicher** (alle neun gesichtet, Georgie im Ausschnitt).
Es genügt also **eine** Aussage für alle Dörfler; eine Tabelle je Dörfler wäre
Ballast.

---

## 3. Zusammenfassung — die neun Dörfler

Zählernamen im Aufbau: HEALTH = `Leben`, MOVEMENT = `Bewegung`, MOXIE = `Mumm`,
ACCURACY = `Präzision`.

| Dörfler | Leben | Bewegung | Mumm | Präzision | Hervorhebung | Startausrüstung (englisch, wie gedruckt) |
|---|---|---|---|---|---|---|
| Henlo Bulwark | **3** | **5** | **2** | **−1** | türkis | Farmer's Overalls, Wheat Sickle |
| Fridgette Jones | **4** | **5** | **2** | **−1** | grün | Swinging Door, Ice Pack |
| Granny Melba | **4** | **4** | **2** | **−2** | korallrot | Granny's Cane, The Rooty Tooter |
| Blopsy Twins | **4** | **4** | **3** | **−1** | violett | Boasting Bullhorn, Traveler's Shiv, Crystal Ball |
| Georgie Irongut | **3** | **4** | **4** | **−1** | dunkelgrau (Foto) | Dad's Head Hammer, Stale Cake |
| Judy Marks | **3** | **4** | **3** | **+1** | braun | Giant Paintbrush, Artist's Cape (+ drei fremde Karten, s. 5.6) |
| Norman Fishboy | **4** | **4** | **2** | **+2** | rotorange | Reliable Rod, Fishy Cap |
| Quintus Binch | **4** | **5** | **2** | **0** | grün | Rubber Bat, Stolen Candy |
| Yancy Plover | **4** | **3** | **3** | **0** | orange | Smithy's Apron, Ol' Smacky |

Maxima/Minima überall wie in Abschnitt 2.

---

## 4. Gegenprobe gegen die Kurzpartie

`sequence_data` der *TFT Kurzpartie*, Schritte 28–37 und 46–49 (`place_counter`),
dazu die `slot`-Werte der zwölf Leistenmarker (Schritte 53–64):

| | Leben (`value`/`max`) | Bewegung (`base`) | Mumm (`base`) | Präzision (`base`) | Tableau-Ablesung | |
|---|---|---|---|---|---|---|
| Henlo | 3 / 3 | 5 | 2 | −1 | 3 / 5 / 2 / −1 | **gleich** |
| Fridgette | 4 / 4 | 5 | 2 | −1 | 4 / 5 / 2 / −1 | **gleich** |
| Granny | 4 / 4 | 4 | 2 | −2 | 4 / 4 / 2 / −2 | **gleich** |

Auch die zwölf Marker-`slot`-Werte (`Marker 1: Leben` = 3, `Marker 2: Leben` = 4,
`Marker 3: Leben` = 4 usw.) sind dieselben Zahlen. **Keine Abweichung — damit ist
die Methode an drei von neun Dörflern belegt**, und zwar an drei verschiedenen
Farbgebungen (türkis, grün, korallrot) und an den zwei Spaltenlagen (siehe 6.3).
Georgie ist der einzige Fall, den die Gegenprobe nicht deckt (Foto-Tableau,
abweichende Geometrie) — dort steht die Ablesung allein.

---

## 5. Je Dörfler

Kartenkategorien: `Startausrüstung` (Grundspiel, 15 Karten),
`Startausrüstung (Neue Nachbarn)` (7), `Startausrüstung (Hookbox)` (4).
**Alle Kartennamen sind in der Bibliothek einmalig** (je ein Treffer in der
genannten Kategorie; ähnliche Namen wie `OMAS KNALLKOPF` in
`Toller Trödel: Nachschub` sind andere Karten). Die Karten tragen **nur deutsche
Namen** — die englischen stehen ausschließlich auf den Tableaus, daher die
Zuordnung unten.

**Slotnamen:** Kopf · Brust · Beine · Linke Hand · Rechte Hand · Mitbringsel.
`1-Hand` heißt *eine* der beiden Hände (links oder rechts, frei wählbar),
`2-Hand` belegt **beide** (`[DE S.9]`).

**Sicherheit der Namenszuordnung** (englisch → deutsch):

- *sicher*: der deutsche Name übersetzt den englischen unmittelbar, oder die
  Karte ist in der Kurzpartie schon im Einsatz.
- *durch Ausschluss*: die Grundspiel-Kategorie hat **genau 15** Karten, und das
  sind genau die 15 Stücke der sieben Grundspiel-Dörfler (2+2+2+3+2+2+2). Jede
  Karte gehört damit zu genau einem englischen Namen; wo der Name nicht
  durchsichtig ist, bleibt nur eine Karte übrig.
- *Bedeutung*: nur bei den drei Gemälden (5.6), aus Kartentext.

### 5.1 Henlo Bulwark — „The Paranoid Law Dodger"

| Wert | Start | Max | Min | Sicherheit |
|---|---|---|---|---|
| Leben | 3 | 10 | 1 | sicher (Ablesung + Zeilenmessung + Kurzpartie) |
| Bewegung | 5 | 10 | 1 | sicher (dito) |
| Mumm | 2 | 10 | 1 | sicher (dito) |
| Präzision | −1 | 5 | −4 | sicher (dito) |

| Englisch | Deutsche Karte | Kategorie | Typzeile | Slot | Namenszuordnung |
|---|---|---|---|---|---|
| Farmer's Overalls | `BAUERNLATZHOSE` | Startausrüstung | Beine | **Beine** | sicher |
| Wheat Sickle | `ROSTIGE SICHEL` | Startausrüstung | 1-Hand, Waffe, Nahkampf, Schwert | **Linke oder Rechte Hand** | sicher |

Slots aus `docs/tasks-partie13.md` BY übernommen.
Figuren: `Henlo` (46 × 46), `Henlo Bulwark` (50 × 50).
Fundstellen: Tableau `de146faa-0f8c-46ef-8d7b-9b938ae26efc.png` (Fußzeile
`y 0,945–0,995`); Karten `54c1f562-…` und `1b884038-…`.

### 5.2 Fridgette Jones — „The Inspiring Icebox"

| Wert | Start | Max | Min | Sicherheit |
|---|---|---|---|---|
| Leben | 4 | 10 | 1 | sicher (Ablesung + Zeilenmessung + Kurzpartie) |
| Bewegung | 5 | 10 | 1 | sicher (dito) |
| Mumm | 2 | 10 | 1 | sicher (dito) |
| Präzision | −1 | 5 | −4 | sicher (dito) |

| Englisch | Deutsche Karte | Kategorie | Typzeile | Slot | Namenszuordnung |
|---|---|---|---|---|---|
| Swinging Door | `GEFRIERFACHTÜR` | Startausrüstung (Neue Nachbarn) | 2-Hand, Waffe, Nahkampf, Prügel | **Linke + Rechte Hand** | sicher (in der Kurzpartie im Einsatz) |
| Ice Pack | `KÜHL-PACK` | Startausrüstung (Neue Nachbarn) | Brust | **Brust** | sicher |

Slots aus `docs/tasks-partie13.md` BY übernommen.
Figuren: `Fridgette` (46 × 46), `Fridgette Jones` (50 × 50).
Fundstelle Tableau: `4ad190d3-9d05-4834-964e-ab554bbda23d.png`.

### 5.3 Granny Melba — „The Flirty Old Gunslinger"

| Wert | Start | Max | Min | Sicherheit |
|---|---|---|---|---|
| Leben | 4 | 10 | 1 | sicher (Ablesung + Zeilenmessung + Kurzpartie) |
| Bewegung | 4 | 10 | 1 | sicher (dito) |
| Mumm | 2 | 10 | 1 | sicher (dito) |
| Präzision | −2 | 5 | −4 | sicher (dito) |

| Englisch | Deutsche Karte | Kategorie | Typzeile | Slot | Namenszuordnung |
|---|---|---|---|---|---|
| Granny's Cane | `OMMAS GEHSTOCK` | Startausrüstung | 1-Hand, Waffe, Nahkampf, Stab | **Linke oder Rechte Hand** | sicher |
| The Rooty Tooter | `DAS ALTE EISEN` | Startausrüstung | 1-Hand, Waffe, Fernkampf, Wumme | **Linke oder Rechte Hand** | durch Ausschluss; passt zu „Gunslinger" und zur einzigen Fernkampfwaffe der Gruppe; die Kurzpartie legt sie ebenso, und `spec-setup-system.md` M8.5 nennt „The Rooty Tooter" als Startausrüstung aus einer gespielten Partie |

Slots aus `docs/tasks-partie13.md` BY übernommen. Beide Waffen sind 1-Hand —
Granny trägt sie in **beiden** Händen.
Figuren: `Granny` (46 × 46), `Granny Melba` (50 × 50).
Fundstelle Tableau: `d3743b31-ed45-49a1-8126-00cd96ef023e.png`.

### 5.4 Blopsy Twins — „The Roaming Vagabonds"

| Wert | Start | Max | Min | Sicherheit |
|---|---|---|---|---|
| Leben | 4 | 10 | 1 | sicher (Ablesung + Zeilenmessung) |
| Bewegung | 4 | 10 | 1 | sicher (dito) |
| Mumm | 3 | 10 | 1 | sicher (dito) |
| Präzision | −1 | 5 | −4 | sicher (dito) |

**Drei** Stücke:

| Englisch | Deutsche Karte | Kategorie | Typzeile | Slot | Namenszuordnung |
|---|---|---|---|---|---|
| Boasting Bullhorn | `BLECHERNE TRÖTE` | Startausrüstung | 1-Hand, Waffe, Nahkampf, Instrument | **Linke oder Rechte Hand** | durch Ausschluss (Instrument; „Bullhorn" = Tröte) |
| Traveler's Shiv | `MIESES MESSER` | Startausrüstung | 1-Hand, Waffe, Nahkampf, Messer | **Linke oder Rechte Hand** | durch Ausschluss („Shiv" = Messer) |
| Crystal Ball | `KRISTALLKUGEL` | Startausrüstung | Mitbringsel | **Mitbringsel** | sicher |

Die Typzeilen am Kartenbild gelesen (neu). Zwei 1-Hand-Waffen füllen beide
Hände, die Kugel liegt im Mitbringsel — drei Stücke, drei freie Plätze.
Figuren: `Blopsy` (46 × 46), `Blopsy Twins` (50 × 50).
Fundstellen: Tableau `4febf2bd-5819-4297-b66d-a379779aaae4.png`; Karten
`bb9204d2-…`, `69e98fcb-…`, `96d6063c-…`.

### 5.5 Georgie Irongut — „The Expired Royal"

| Wert | Start | Max | Min | Sicherheit |
|---|---|---|---|---|
| Leben | 3 | 10 | 1 | sicher (Ziffer im Ausschnitt eindeutig) |
| Bewegung | 4 | 10 | 1 | sicher (dito) |
| Mumm | 4 | 10 | 1 | sicher (dito) |
| Präzision | −1 | 5 | −4 | sicher (dito) |

**Einziger Fall ohne zweiten Weg.** Dieses Tableau ist ein **Foto** des
gedruckten Spielertableaus (Aussparungen, Maserung des Kartons), kein Artwork, in
anderer Auflösung (1948 × 2614) und mit anderer Geometrie. Die Startwerte sind
**nicht türkis**, sondern **dunkler grau getönte Kreise** — in jeder Spalte genau
einer, nach dem Muster der übrigen acht Tableaus der Startwert. Die Ziffern in den
Kreisen sind im Ausschnitt klar lesbar; die Gleichung „dunkler Kreis = Startwert"
ist aus dem Muster der anderen acht geschlossen, nicht am Tableau selbst
beschriftet. Dafür gibt es keine Gegenprobe (kein Setup nutzt Georgie). **Wer ihn einbaut, sollte die vier Zahlen einmal am gedruckten Tableau
gegenprüfen.**

| Englisch | Deutsche Karte | Kategorie | Typzeile | Slot | Namenszuordnung |
|---|---|---|---|---|---|
| Dad's Head Hammer | `PAPAS KNALLKOPF` | Startausrüstung | 2-Hand, Waffe, Nahkampf, Prügel | **Linke + Rechte Hand** | durch Ausschluss („Papas" = Dad's; `OMAS KNALLKOPF` ist eine andere Karte im Trödel) |
| Stale Cake | `MUFFIGER KUCHEN` | Startausrüstung | Mitbringsel, Snack | **Mitbringsel** | sicher |

Figuren: `Georgie` (46 × 46), `Georgie Irongut` (50 × 50).
Fundstellen: Tableau `04b0c229-3e41-49c0-b344-ce556712ba3a.png`; Karten
`9bd25467-…`, `e41431df-…`.

### 5.6 Judy Marks — „The Scarred Artist"

| Wert | Start | Max | Min | Sicherheit |
|---|---|---|---|---|
| Leben | 3 | 10 | 1 | sicher (Ablesung + Zeilenmessung) |
| Bewegung | 4 | 10 | 1 | sicher (dito) |
| Mumm | 3 | 10 | 1 | sicher (dito) |
| Präzision | **+1** | 5 | −4 | sicher (dito) — der einzige positive Startwert neben Norman |

| Englisch | Deutsche Karte | Kategorie | Typzeile | Slot | Namenszuordnung |
|---|---|---|---|---|---|
| Giant Paintbrush | `RIESENPINSEL` | Startausrüstung (Neue Nachbarn) | 2-Hand, Waffe, Nahkampf, Speer | **Linke + Rechte Hand** | sicher |
| Artist's Cape | `KÜNSTLERSCHÄRPE` | Startausrüstung (Neue Nachbarn) | Brust | **Brust** | sicher (Name sagt Schärpe, nicht Cape; die NN-Kategorie hat keine andere Künstler-Karte) |

**Dazu drei Karten, die Judy nicht besitzt.** Der Kasten unten rechts auf dem
Tableau sagt wörtlich: *„In addition to your starting gear, take the ‚Happy
Place', ‚Focus, Friend!', and ‚Hero's Journey' cards from the starting gear deck
and set them nearby. You do not own this gear, but they can be given to
teammates with your Gift of Art ability."*

| Englisch | Deutsche Karte | Typzeile | Slot | Bei-Erhalt-Text (Kartenbild) | Namenszuordnung |
|---|---|---|---|---|---|
| Happy Place | `„ACH, WIE SCHÖN!“` | Seltsam, Gemälde | **keiner** | +3 BEW und +2 MUMM für den nächsten Zug | durch Ausschluss + Bedeutung, **mittel-sicher** |
| Focus, Friend! | `„KLARER HIMMEL“` | Seltsam, Gemälde | **keiner** | der nächste Angriffs-Wurf gilt (mind.) als Treffer | durch Ausschluss (zwei andere sind benannt), **mittel-sicher** |
| Hero's Journey | `„DIE GROSSE REISE“` | Seltsam, Gemälde | **keiner** | bis zu 4 Felder bewegen, dann ggf. 1 AUA | durch Bedeutung („Journey" = Reise), **mittel-sicher** |

Alle drei gehören zu `Startausrüstung (Neue Nachbarn)`; die Kategorie hat genau
sieben Karten = 2 (Fridgette) + 2 (Judy) + diese drei. **Dass es genau diese drei
Karten sind, ist sicher; welche deutsche Karte welchem englischen Titel
entspricht, ist es nicht** (die Karten tragen keinen englischen Titel). Für den
Tausch ist die Zuordnung ohne Folge, solange alle drei zusammen bewegt werden.

**Folge für M26.2:** Judys Startausrüstung ist **nicht** „zwei Karten, auf dem
Tableau angeschrieben". Sie besteht aus zwei Karten **in Slots** und drei Karten
**neben dem Tableau, ohne Slot** (die Typzeile nennt keinen). Wer „zwei Karten
ersetzen" baut, lässt bei Judy drei Gemälde liegen oder — beim Wegtauschen —
drei Karten zurück.

Figuren: `Judy` (46 × 46), `Judy Marks` (50 × 50).
Fundstellen: Tableau `2afb7dcd-57ff-42c6-ab8d-3e26efc07517.png` (Fußzeile
`y 0,925–0,995`, Kasten daneben); Karten `27b9b168-…`, `efc07239-…`,
`563b3047-…`, `862fab8d-…`, `05288809-…`.

### 5.7 Norman Fishboy — „The Enticing Fisherman"

| Wert | Start | Max | Min | Sicherheit |
|---|---|---|---|---|
| Leben | 4 | 10 | 1 | sicher (Ablesung + Zeilenmessung) |
| Bewegung | 4 | 10 | 1 | sicher (dito) |
| Mumm | 2 | 10 | 1 | sicher (dito) |
| Präzision | **+2** | 5 | −4 | sicher (dito) |

| Englisch | Deutsche Karte | Kategorie | Typzeile | Slot | Namenszuordnung |
|---|---|---|---|---|---|
| Reliable Rod | `BEWÄHRTE ANGEL` | Startausrüstung | 2-Hand, Waffe, Nahkampf, Speer | **Linke + Rechte Hand** | sicher |
| Fishy Cap | `FISCHMÜTZE` | Startausrüstung | Kopf | **Kopf** | sicher |

Figuren: `Norman` (46 × 46), `Norman Fishboy` (50 × 50).
Fundstellen: Tableau `02021631-6125-4ec2-b4d0-c1014d9233ca.png`; Karten
`1147ef86-…`, `0d75c74f-…`.

### 5.8 Quintus Binch — „The Troublemaker"

| Wert | Start | Max | Min | Sicherheit |
|---|---|---|---|---|
| Leben | 4 | 10 | 1 | sicher (Ablesung + Zeilenmessung) |
| Bewegung | 5 | 10 | 1 | sicher (dito) |
| Mumm | 2 | 10 | 1 | sicher (dito) |
| Präzision | 0 | 5 | −4 | sicher (dito) |

| Englisch | Deutsche Karte | Kategorie | Typzeile | Slot | Namenszuordnung |
|---|---|---|---|---|---|
| Rubber Bat | `GUMMIKNÜPPEL` | Startausrüstung | 1-Hand, Waffe, Nahkampf, Prügel | **Linke oder Rechte Hand** | sicher |
| Stolen Candy | `GEKLAUTE BONBONS` | Startausrüstung | Mitbringsel, Snack | **Mitbringsel** | sicher |

Figuren: `Quintus` (46 × 46), `Quintus Binch` (50 × 50).
Fundstellen: Tableau `7e2637ff-a36e-4447-9325-e43d2bd813fe.png`; Karten
`38dbf644-…`, `4769dc79-…`.

### 5.9 Yancy Plover — „The Reckless Handiman"

| Wert | Start | Max | Min | Sicherheit |
|---|---|---|---|---|
| Leben | 4 | 10 | 1 | sicher (Ablesung + Zeilenmessung) |
| Bewegung | 3 | 10 | 1 | sicher (dito) |
| Mumm | 3 | 10 | 1 | sicher (dito) |
| Präzision | 0 | 5 | −4 | sicher (dito) |

| Englisch | Deutsche Karte | Kategorie | Typzeile | Slot | Namenszuordnung |
|---|---|---|---|---|---|
| Smithy's Apron | `SCHMIEDESCHÜRZE` | Startausrüstung | Brust | **Brust** | sicher |
| Ol' Smacky | `ALTER WÄMSER` | Startausrüstung | 1-Hand, Waffe, Nahkampf, Prügel | **Linke oder Rechte Hand** | durch Ausschluss („Wämser" von *wämsen* = verprügeln; die Prügel-Zeile passt zu einem Hammer, den Yancy auf dem Tableau schwingt) |

Figuren: `Yancy` (46 × 46), `Yancy Plover` (50 × 50).
Fundstellen: Tableau `854ed48a-9195-4d0f-8747-df32c84032ed.png`; Karten
`5550575c-…`, `f76c6059-…`.

### 5.10 Auf einen Blick: Slotbelegung der Startausrüstung

| Dörfler | Kopf | Brust | Beine | Hände | Mitbringsel | ohne Slot |
|---|---|---|---|---|---|---|
| Henlo | | | Bauernlatzhose | Rostige Sichel (1) | | |
| Fridgette | | Kühl-Pack | | Gefrierfachtür (2) | | |
| Granny | | | | Ommas Gehstock (1), Das alte Eisen (1) | | |
| Blopsy | | | | Blecherne Tröte (1), Mieses Messer (1) | Kristallkugel | |
| Georgie | | | | Papas Knallkopf (2) | Muffiger Kuchen | |
| Judy | | Künstlerschärpe | | Riesenpinsel (2) | | 3 Gemälde |
| Norman | Fischmütze | | | Bewährte Angel (2) | | |
| Quintus | | | | Gummiknüppel (1) | Geklaute Bonbons | |
| Yancy | | Schmiedeschürze | | Alter Wämser (1) | | |

(1) = eine Hand, frei wählbar; (2) = beide Hände. **Kein Dörfler hat zwei Stücke
im selben Einzelslot**, und keiner braucht mehr als die zwei Hände — die
Startausrüstung passt in jedem Fall ohne Konflikt in die sechs Plätze. Kopf und
Beine sind je nur einmal belegt (Norman / Henlo).

---

## 6. Die sechs Ausrüstungsplätze am Tableaurand (für M26.1)

### 6.1 Was auf dem Rand steht

Links, Pfeil nach außen (links): **Head Gear / Chest Gear / Leg Gear**.
Rechts, Pfeil nach außen (rechts): **Left Hand / Right Hand / Accessory**.
Dies steht auf **allen neun** Tableaus, auch auf dem Foto von Georgie.

### 6.2 Gemessene Pfeilhöhen

Relativ zur Bildhöhe: **0 = Oberkante, 1 = Unterkante** des Tableaus. Gemessen ist
der **Schwerpunkt des roten Dreiecks**; die Beschriftung daneben ist auf dieselbe
Höhe zentriert (Textmitte im Bild nachgesehen, Abweichung unter 0,005).

| Platz | Seite | Henlo, Fridgette, Granny, Blopsy, Judy, Norman, Quintus, Yancy | Georgie (Foto) | in Weltpunkten bei 300 × 400 |
|---|---|---|---|---|
| Head Gear | links | **0,154** | 0,147 | 61,6 |
| Chest Gear | links | **0,491** | 0,492 | 196,4 |
| Leg Gear | links | **0,844** | 0,849 | 337,6 |
| Left Hand | rechts | **0,154** | 0,147 | 61,6 |
| Right Hand | rechts | **0,491** | 0,491 | 196,4 |
| Accessory | rechts | **0,826** | 0,830 | 330,4 |

**Aussage: die Höhen sind bei allen neun Tableaus gleich.** Bei den acht
Artwork-Tableaus sind sie auf drei Nachkommastellen **identisch** (Kopf/Hand-links
0,154 · Brust/Hand-rechts 0,491 · Beine 0,844 · Mitbringsel 0,826; der Unterschied
zwischen den Zeilen ist Pixelrauschen bei der Schwerpunktbestimmung, 0,000 bis
0,002); Georgie weicht um höchstens **0,007** ab — das ist der Foto-Zuschnitt, kein
anderes Layout.

**Wichtig für M26.1:**

- **Die Höhen paaren sich nicht ganz.** Links liegt der dritte Pfeil bei 0,844,
  rechts bei 0,826 — **18 Tausendstel = 7 Weltpunkte** höher. Die Spec nennt die
  Plätze „paarweise auf gleicher Höhe"; für die ersten beiden Paare stimmt das
  genau, für das dritte (Beine / Mitbringsel) nicht ganz. Ein Platz pro Pfeil
  mit der eigenen Höhe ist richtig; wer eine gemeinsame Höhe für das dritte
  Paar nimmt, liegt 3–4 Punkte daneben.
- **Seitenlage der Pfeile:** Schwerpunkt-x bei 0,026 (links) bzw. 0,972 (rechts)
  der Bildbreite, also **7,8 bzw. 291,6 Weltpunkte** von der linken Kante bei
  Breite 300 — knapp **innerhalb** des Randes. Die Pfeile zeigen nach außen; der
  Platz liegt also **außerhalb dieser Kanten**.
- **Seitenverhältnis:** die Bilder haben 0,7512 (1748 × 2327); der Kasten ist
  300 × 400 = 0,75. Wegen `object-fit: contain` bleibt die Höhe bei 400 und die
  Breite bei 299,8 — vernachlässigbar. Georgie (0,7452) liegt bei 298,1 Breite;
  auch das ändert die relativen Höhen nicht merklich.
- Beide Zähler-Layouts (zwei Spaltenlagen, 6.3) haben **dieselben** Pfeilhöhen —
  die Abweichung der Spaltenlage hat keinen Einfluss auf M26.1.

### 6.3 Nebenbefund: zwei Spaltenlagen auf den Tableaus

Die vier Wertespalten liegen **nicht auf allen Tableaus gleich**. Henlo, Granny,
Blopsy, Norman und Quintus haben Spalten, deren Kreise **abwechselnd versetzt**
(„Wellenlinie") stehen und deren Zeile „10" bei `y ≈ 0,090` liegt; Fridgette, Judy
und Yancy haben **gerade** Spalten mit der Zeile „10" bei `y ≈ 0,068`. Georgie
(Foto) liegt nochmal anders (`y ≈ 0,062`). Für **diese Erhebung** ohne Folge, weil
Werte hier als Zeilenindex gelesen sind; **relevant, falls später Zählermarker
automatisch auf die aufgedruckten Kreise gelegt werden** — dann ist die Lage je
Tableau zu messen, nicht pauschal anzunehmen.

---

## 7. Figuren (Spielstein und runde Figur)

Je Dörfler gibt es **zwei** Assets, beide `token`:

| Dörfler | Spielstein, 46 × 46 | Figur, 50 × 50 (rund) | Tableau, 300 × 400 |
|---|---|---|---|
| Henlo Bulwark | `Henlo` | `Henlo Bulwark` | `Tableau: Henlo Bulwark` |
| Fridgette Jones | `Fridgette` | `Fridgette Jones` | `Tableau: Fridgette Jones` |
| Granny Melba | `Granny` | `Granny Melba` | `Tableau: Granny Melba` |
| Blopsy Twins | `Blopsy` | `Blopsy Twins` | `Tableau: Blopsy Twins` |
| Georgie Irongut | `Georgie` | `Georgie Irongut` | `Tableau: Georgie Irongut` |
| Judy Marks | `Judy` | `Judy Marks` | `Tableau: Judy Marks` |
| Norman Fishboy | `Norman` | `Norman Fishboy` | `Tableau: Norman Fishboy` |
| Quintus Binch | `Quintus` | `Quintus Binch` | `Tableau: Quintus Binch` |
| Yancy Plover | `Yancy` | `Yancy Plover` | `Tableau: Yancy Plover` |

Alle 27 Namen sind **einmalig** (je genau ein Asset gleichen Namens im Spiel) und
**gegen die Datenbank geprüft, nicht geraten**.

**Welches ist „die Figur"?** Das Wort im Auftrag („rundes Token, 46 × 46") trifft
auf **keines der beiden** zu:

- Der **46 × 46-Spielstein** (`Henlo` usw.) ist ein 300 × 300-**Quadrat**: bei
  Henlo, Granny, Blopsy, Norman, Quintus, Yancy ein Namensschild in der Farbe des
  Dörflers, bei Fridgette, Georgie und Judy ein Gesichtsausschnitt. Der Client
  zeichnet Bildtokens als `rounded-sm` (nicht rund).
- Die **50 × 50-Figur** (`Henlo Bulwark` usw., Datei `tok_<Name>.png`, 512 × 512)
  ist das **runde Porträt-Token** (farbiger Ring, Beschriftung). Sie wird in
  **keinem** Aufbau benutzt.

**Was die Kurzpartie benutzt:** den 46 × 46-Spielstein — `place_asset`
`assetName: "Henlo"` / `"Fridgette"` / `"Granny"`, Schritte 23–25, Ziel
*Buyin'/Beatin'-Leiste*. Auch *TFT Grundaufbau (Dorfphase)* nennt dieselben drei
Kurznamen; *TFT Basis-Aufbau* keinen. **Für M26.2 ist der Spielstein
(Kurzname) maßgeblich**, weil das der ist, der heute gelegt und getauscht wird;
die 50 × 50-Figuren sind ungenutzt und gehören nicht zur Aufgabe, solange niemand
entscheidet, sie zu verwenden.

> **Berichtigung (M26):** das stimmt nicht. Die **Aktionen** der Kurzpartie
> (*Kampf beginnen* 12–14, *Dorfphase beginnen* 12–14) setzen und räumen die
> 50 × 50-Figur auf dem Spielfeld; der 46 × 46-Spielstein liegt auf der
> *Buyin'/Beatin'-Leiste*. Beide gehören zu einem Dörfler, und ein Tausch ersetzt
> beide.

**Marker auf den Leisten** heißen nach der **Position**, nicht nach dem Dörfler:
`Marker 1: Leben` … `Marker 3: Präzision` (zwölf Assets, 22 × 22, nur für die
Plätze 1–3). Ein Tausch **benennt sie nicht um**, er versetzt nur ihren `slot`
auf den Startwert des Neuen. **Aber:** weil es nur drei Positionen gibt, hat ein
vierter Dörfler gar keinen Marker — das betrifft die Kurzpartie nicht (drei
Dörfler), wohl aber jeden Aufbau mit mehr.

---

## 8. Vier Befunde, die den Auftrag berühren

1. **„Türkis hervorgehoben" gilt nur für Henlo.** Die Hervorhebung hat **die
   Farbe des jeweiligen Dörflers** (grün, korallrot, violett, braun, rotorange,
   grün, orange) — bei Georgie ein **dunkleres Grau** auf einem Foto. Wer das
   automatisch erkennen will, kann nicht auf „türkis" suchen, sondern auf „der
   gesättigte Kreis in der Spalte". Hier wurde deshalb die **Zeilenlage** gemessen.

2. **Judy hat drei Karten ohne Slot** (5.6). Die Annahme „Startausrüstung = zwei
   Karten" gilt für acht von neun; bei Blopsy sind es **drei**, bei Judy fünf (zwei
   im Slot, drei daneben).

3. **Der „Maximum" eines Lebenszählers ist nicht das Spaltenende.** Die Kurzpartie
   setzt `max` bei Leben auf den **Startwert** (3 / 4 / 4), nicht auf 10. Das ist
   Absicht: das Maximale LEBEN ist der Startwert (`docs/regelabgleich.md`, die
   Regel zu „Maximales LEBEN"), die Spalte reicht nur als **Anzeige** bis 10, weil
   sich das Maximum im Spiel ändern kann. Die „vier Maxima" aus M26.2 sind also in
   Wahrheit **zwei verschiedene Dinge**: die Spaltenenden (10 / 10 / 10 / 5, für
   alle gleich) und `max` am Lebenszähler (= Startwert, je Dörfler eigen). Bewegung,
   Mumm und Präzision haben in der Kurzpartie **kein** `max`, nur `base`.

4. **Die Zuordnung englisch → deutsche Karte ist nicht überall belegt.** Von den
   19 Stücken in Slots sind 14 sicher, 5 nur durch Ausschluss (Rooty Tooter,
   Boasting Bullhorn, Traveler's Shiv, Dad's Head Hammer, Ol' Smacky — dort bleibt
   in der Grundspiel-Kategorie jeweils nur eine Karte übrig); die drei Gemälde
   Judys sind mittel-sicher. Das **Slot-Ergebnis** hängt davon nicht ab, weil es
   aus der Karte kommt; nur die Zuordnung *Karte → Dörfler* hängt an ihr. Im Repo
   liegt keine Liste „Dörfler → Startausrüstung"; wer sie absichern will, liest
   sie an der gedruckten Anleitung gegen.

---

## 9. Sicherheit im Überblick

| Angabe | Stand |
|---|---|
| Startwerte, acht Dörfler (alle außer Georgie) | **sicher** — Ablesung + Zeilenmessung, bei dreien zusätzlich Kurzpartie |
| Startwerte Georgie | **sicher abgelesen**, kein zweiter Weg; „dunkler Kreis = Start" aus dem Muster geschlossen |
| Maxima / Minima | **sicher**, auf allen neun gleich |
| Namen der Startausrüstung (englisch) | **sicher** (Fußzeile gelesen) |
| Zuordnung englisch → deutsche Karte | 14 von 19 sicher, 5 durch Ausschluss, die drei Gemälde Judys mittel-sicher |
| Slots der 19 Stücke | **sicher** (Typzeile am Bild; die sechs der Kurzpartie übernommen) |
| Figurnamen | **sicher** (gegen die Datenbank geprüft) |
| Pfeilhöhen | **sicher** (gemessen, acht identisch) |

**Nicht erfasst, bewusst weggelassen:** die Fähigkeiten der Dörfler (stehen auf dem
Tableau, gehören nicht zu M26.2), Dörfler aus der Hookbox-Erweiterung (die vier
Karten `ALTE MASKE`, `SCHLEUDERSITZ`, `STARKSTROMKABEL`, `TINTENKLECKSER` in
`Startausrüstung (Hookbox)` gehören zu vier **anderen** Dörflern, deren Tableaus
nicht in der Bibliothek stehen).
