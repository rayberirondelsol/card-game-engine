# Befund: Bösewicht-Beute und Aufstellbares

Datenerhebung an der Produktionsdatenbank und an den öffentlich ausgelieferten
Bilddateien. Alles unten ist gemessen, nicht geschätzt; wo geschlossen wurde,
steht es dabei.

Spiel-ID `072123c0-cd97-4ffb-a330-369630fab93f`.

> **Umsetzungsstand.** §1 bis §4 beschreiben den Zustand **wie vorgefunden**.
> Danach wurden **V1, V3, V5 und V9 aus §5 umgesetzt** — die Kategorien und
> Kartennamen in den Tabellen von §2 und §3 sind seither die unten in §5.0
> genannten. **Nicht** umgesetzt (bewusst): V4 (256er-`Nachschub` zerlegen),
> V7 (englische Dubletten löschen), V8 (Token für `HERR KÄLTET`). Am Code
> wurde nichts geändert.

---

## 1. Was gemessen wurde und wie

### 1.1 Datenbank

`sqlite3` im Container `card-game-engine-backend` auf VM 101, `readonly: true`.
Erhoben: `categories` (44 Kategorien), `cards` (547 Ausrüstungskarten in den
8 Ausrüstungs-/Trödel-Kategorien), `table_assets` (217 Einträge, **alle vom
Typ `token`** — es gibt keinen anderen Assettyp).

### 1.2 Kartenbilder

Alle 547 Ausrüstungskarten über `https://gaming.benjathi.de<image_path>`
heruntergeladen (je ~140 kB, 744×744 px, verlustfrei). Ein `User-Agent` ist
nötig, sonst antwortet der Tunnel mit **403**; `curl -A "Mozilla/5.0"`
funktioniert, Pythons `urllib` in der Voreinstellung nicht.

### 1.3 Rahmenfarbe — rein rechnerisch

Der Rahmen einer Karte ist der **umlaufende Hintergrund** des 744×744-Bildes,
nicht eine Linie an der Kartenkante. Gemessen wurde der häufigste RGB-Wert
aller Randpixel (2 px vom Rand, jede 4. Spalte/Zeile). Das Ergebnis ist
**exakt bimodal**, ohne Grauzone:

| RGB | Deutung nach `[BR S.8]` | Anzahl |
|---|---|---|
| `(51,138,145)` / `(53,138,145)` | **blau** = Nachschub | 361 |
| `(198,151,44)` | **gelb** = einzigartig | 65 |
| `(134,73,98)` | **lila** = Bösewicht-Beute | **60** |
| `(99,99,96)` | **grau** = Start | 40 |
| `(247,246,239)` | cremeweiß = Rollenkarten (kein Rahmen) | 20 |
| `(199,89,55)` | orange = Einzelfall, Trennkarte „HALT STOP!" | 1 |

> „**Ausrüstungsrahmen-Farben:** grau = Start, blau = Nachschub, lila =
> Bösewicht-Beute, gelb = einzigartig" `[BR S.8]` (`docs/tft-regeln.md`)

60 lila = 20 Bösewichte × 3. Das ist die Antwort auf Frage A.1 und zugleich
die Probe darauf, dass die Messung stimmt.

### 1.4 Bösewicht-Zuordnung — zwei unabhängige Quellen

1. **Tableaus.** Die 20 Assets `Tableau: <Name>` mit Displaygröße 300×600
   (die 300×400er sind Dörfler-Tableaus) tragen unten die Zeile
   `Ruffian Gear Rewards: A (★), B, C`. Aus jedem Bild wurde das Band
   y = 0,915…0,995 ausgeschnitten und zu zwei Kontaktbögen gestapelt.
   **Die Tableaubilder sind englisch**, die Karten deutsch.
2. **Die Karten selbst.** Jede lila Karte trägt links **senkrecht den deutschen
   Bösewichtnamen** (wie Startausrüstung den Dörflernamen trägt). Der Streifen
   x = 0,03…0,13 / y = 0,12…0,68 wurde um 90° gedreht und gestapelt gelesen.

Damit ist die Zuordnung Karte → Bösewicht **direkt abgelesen**, nicht aus dem
Namen erraten. Die Aufteilung innerhalb eines Trios (welcher deutsche Name
welchem englischen entspricht) ist zusätzlich über den ★ abgesichert.

### 1.5 ★-Erkennung — rechnerisch

Die (★)-Karte trägt oben rechts einen grauen Stern. Gezählt wurden graue
Pixel (`|R-G|<14`, `|G-B|<14`, `120<R<190`) im Feld x = 0,80…0,97 /
y = 0,02…0,13. Wieder exakt bimodal: **950 Pixel oder 0**. Genau **20** Karten
haben den Stern, genau eine je Bösewicht. Deckt sich vollständig mit den (★)
der Tableaus.

### 1.6 Schlagwort „Aufstellbar"

Das Schlagwort steht in der **Typzeile direkt unter dem Kartennamen**
(y ≈ 0,152…0,214). Zwei Verfahren:

- **Template-Match** (FFT-Kreuzkorrelation, Dice-Maß, 7 Skalen) mit dem Wort
  „Aufstellbar" aus `STABILES KATAPULT` als Vorlage. Liefert 21 Treffer bei
  Dice ≥ 0,88 und dann eine Lücke bis 0,54.
- **Vollständiges Ablesen** der Typzeile aller 163 Toller-Trödel-Karten über
  drei indizierte Kontaktbögen.

Das Ablesen findet **24** Karten, das Template-Match nur 21. Die drei
Zusätzlichen (`DAS DELIKATE DUO`, `FORT ABFALLINGEN`, `KLAPPERSCHLANGE`) haben
eine kombinierte Typzeile („Aufstellbar, Snack" / „Aufstellbar, Instrument")
bzw. einen Titelbogen, der ins Band hineinragt; dort ändert sich Laufweite und
Schriftgrad, und der Pixelvergleich reißt ab. **Gültig ist das Ablesen** — das
Template-Match taugt hier nur als Untergrenze. Geprüft wurde jede der 163
Zeilen; die einzige unlesbare (`HALT STOP!`, Nr. ohne Typzeile) ist die
Trennkarte des gesperrten Decks und keine Ausrüstung.

Karten der übrigen Kategorien wurden mit dem Template-Match gegengeprüft: kein
Treffer. Das deckt sich mit `docs/tft-regeln.md` Zeile 66, wo
`Rolle / Aufstellbares` als **„nur Toller Trödel"** geführt wird.

---

## 2. Frage A — Bösewicht-Beute

> „Unten auf dem Tableau stehen die **3 Bösewicht-Ausrüstungen**, die man
> erbeuten kann. Die mit **(★)** markierte kann zusätzlich **während** des
> Kampfes durch einen Knaller-Wurf von 9+ erlangt werden" `[BR S.8]`,
> `[BR S.30 FAQ]` (§5.3)

> „**Bösewicht-Beute:** Wer in **dieser Runde** die **meisten Heldentaten**
> erfüllt hat und **nicht ausgeschaltet** wurde, erhält **eine zufällige** der
> 3 Bösewicht-Ausrüstungen." `[BR S.20]` (§7 Schritt 3)

**Alle 60 Karten sind vorhanden. Keine fehlt.** Sie liegen in **zwei**
Kategorien, beide ohne jeden Hinweis auf ihre Funktion:

- **36** in der Sammelkategorie `Nachschub` (256 Karten) — die 12 Grundspiel-Bösewichte
- **24** in `Ausrüstung (Üble Nachbarn)` (64 Karten) — die 8 Üble-Nachbarn-Bösewichte

Der Verdacht aus dem Briefing, alles stecke in der 256er-`Nachschub`, ist also
**zur Hälfte richtig**.

### 2.1 Grundspiel — 12 Bösewichte, Kategorie `Nachschub`

| Bösewicht (DE / EN) | Beutekarte | ★ | `cards.id` |
|---|---|---|---|
| **Bert Doofis** / Bort Dovis | BERTS GESICHT · *Bort's Face* | ★ | `7b36ed0e-18e9-49b3-9bf3-46d8f6dd5248` |
| | BERTS KAMERA · *Bort's Camera* | | `62ee639e-eae6-4cfe-a4db-add8aa987e3d` |
| | BERTS BAUCHTASCHE · *Bort's Fanny Pack* | | `27b3e384-b749-4e03-9689-2ce7128dc5bc` |
| **Die Karnoven** / The Bundits | EMMAS SCHLÜSSEL · *Peddler's Cart Key* | ★ | `6d6ec4b9-7ee3-4c5d-88c7-c20160a1fbd6` |
| | KARNOVEN-JACKE · *Bundits' Cloak* | | `c870c977-36c3-4df9-90ee-724c23816a08` |
| | KARNI AN DER LEINE · *Leashed Bundo* | | `b8009395-eca2-4051-8862-d76059f535a1` |
| **Willi Wedler** / Deputy Waggums | WEDELNDER SCHWANZ · *Distracting Tail* | ★ | `98bcc9b7-dff5-43b1-a4cf-f35e7b23be66` |
| | KULLERAUGEN · *Frantic Eyes* | | `c89d2765-a3bf-42b2-aef8-7a95cf68dc79` |
| | BÖSER REVOLVER · *The Sure Shooter* | | `18d45ae1-d6b6-41bc-9a4b-c40be710c4eb` |
| **Truthand** / Handsy | DICKE HANDSCHUHE · *Oversized Gloves* | ★ | `dc432c38-0923-41cd-bd96-33af2b1fb298` |
| | WEICHER LEICHNAM · *Comfy Carcass* | | `f4ef3aec-8804-4280-b7d7-0023edd40ae3` |
| | ZAHNSCHNABEL · *Handsy's Beak* | | `76371d05-375c-4592-ac67-e18e2b3589c9` |
| **Schnarchbert** / Lawman Dozy | VOLLE AUGENBRAUEN · *Luxurious Brows* | ★ | `9683a9b4-52c2-41d3-b01e-7b3236b6028b` |
| | ALTE HANDSCHELLEN · *Dozy's Handcuffs* | | `c5c79190-a89e-447c-855a-2daa18192e86` |
| | SCHÄRRIFABZEICHEN · *Fake Badge* | | `04397f64-48b7-4a84-a1c2-bfece6fb2541` |
| **Penny Gönnzales** / Penny Pinchetti | KASSENBUCH · *Penny's Ledger* | ★ | `fb0a7d1a-9864-4a88-b9a4-2b0317d5c79b` |
| | TRESORRÜSTUNG · *Safe Armor* | | `e32fa215-0369-4695-ad62-4a0fcc60dcde` |
| | PENNYS GELDSACK · *Penny's Coin Sack* | | `e453bee5-3144-411f-8fc0-cf2a0eb31b6c` |
| **Freddy Froschmilch** / Pepin Milkfrog | MILCHIGER ARM · *Milk-Soaked Limb* | ★ | `970110d0-4b14-4b15-a220-5b7362d6ff18` |
| | FROSCHAUGEN · *Frog Eyes* | | `3c632ac0-379d-4488-bdec-797ada5245ad` |
| | MILCHMANNMÜTZE · *Milkman's Hat* | | `21b6ce16-05d1-4ff1-9417-7ac3e6d73271` |
| **Nönigin & Könich** / Qing & Kween | NÖNIGINS GLOCKE · *Kween's Bell* | ★ | `3ee3a9da-e2d0-4f50-b990-5fc3309bfa1b` |
| | KÖNICHS ZWEIHÄNDER · *Qing's Claymore* | | `6eb7fa48-a1ae-4d73-8737-755e2f75eaa4` |
| | DOPPEL-UMHANG · *Royal Mantle* | | `58b89bf3-5f31-4939-9724-70ab13b5f2e4` |
| **Rüdiger Schreck** / Samuel Strawman | HEMD MIT STEINEN · *Rock-Filled Jacket* | ★ | `06291d0c-d52d-4fdb-85ab-f8361bf70ba2` |
| | GARTENSCHERE · *Garden Shears* | | `097ce360-f305-42c4-8315-dc2dc543b5f9` |
| | RÜDIGERS PFAHL · *Scarecrow's Pole* | | `64d8d8a0-9f4c-4dfc-9043-05f951cf7af8` |
| **Fürst Wetternich** / Umbrello | REGENMACHER · *Rainmaker* | ★ | `2b9b70c1-7a7a-492c-b1ea-c020c6305c76` |
| | WINDJACKE · *Breezy Cape* | | `d8c7d004-7074-429b-b7d2-8747a9214716` |
| | SPRUNGFEDER · *Springy Wand* | | `b409291c-f715-4d7e-a1c6-1457302e5e8a` |
| **Viktoria Spitz** / Virginia Fitz | VIKTORIAS AMULETT · *Virginia's Locket* | ★ | `346a4a1b-a39a-41fb-b61d-617c72758079` |
| | LIEBLINGSDOLCH · *Virginia's Shanker* | | `ef692d36-7fe9-488d-981f-751d1e43486f` |
| | BETÖRENDES PARFÜM · *Irresistible Perfume* | | `3a83c8fd-1543-4b2c-a9d3-ca74ff5eb5cc` |
| **Jupp Karre** / Will Barlow | GRABSTEINSPATEN · *Lively Headstone* | ★ | `c2fc788a-b8d7-4f92-a97c-d23398ffd0b6` |
| | JUPPS KARRE · *Barrow Bottoms* | | `a52bc64e-8316-4ac6-9a1a-fd3acab82396` |
| | GIERIGE GEISTER · *Sneaky Spirits* | | `11d2b2df-05c7-4775-bbe2-6fe025b447ef` |

### 2.2 Üble Nachbarn — 8 Bösewichte, Kategorie `Ausrüstung (Üble Nachbarn)`

| Bösewicht (DE / EN) | Beutekarte | ★ | `cards.id` |
|---|---|---|---|
| **Viktor Visage** / Barry Bluff | AUSWEIS-SAMMLUNG · *ID Collection* | ★ | `9775265d-bce6-4d09-a69e-5334f57ee926` |
| | HALSABSCHNEIDER · *Face Flayer* | | `3cb1c0e6-39a3-435b-ab78-2741748c0c0c` |
| | „LEDER"-GÜRTEL · *Belt of Personality* | | `a6211fed-cf96-4a9f-9f96-84c7f6334001` |
| **Arnold Schmatz** / Ernie Offal | FRISCHE INNEREIEN · *Giblet Pile* | ★ | `7df9efcf-c821-4b68-8d09-e1c22785b8a3` |
| | SUPPE MIT PFIFF · *Cannibal's Pot* | | `478e135e-f873-4fe3-b8cd-67182fe9fb46` |
| | SALZ & PFEFFER · *Spicers* | | `263c2e25-fbe7-4f40-b969-477140f721d7` |
| **Rosa Voir & die WG** / Ms. Falls & Co. | BLITZ(AB)LEITER · *Cloud Caller* | ★ | `55d346de-5398-48f7-b5a3-340d3e80b0e9` |
| | ROHRSTELZEN · *Pipe Stilts* | | `97c16e04-4810-468f-b957-309b78f2ec9c` |
| | GELADENE PLATTEN · *Charged Shield* | | `2d984739-a2e2-4b12-8549-fa2eb726a83d` |
| **Fleckchen** / Patches | SIFFIGER HAARBALL · *Fur Tumbleweed* | ★ | `1ecaac77-88a7-4e02-8180-573e3c882f5a` |
| | MIETZMÜTZE · *Cat Head* | | `9ec4e681-4e46-4826-a2c8-b17d57aa2714` |
| | STINKSTIEFEL · *Rank Claw Boots* | | `f70d6588-961b-430c-adf1-c5e31285a7d2` |
| **Dr. Bosskop** / Red Atrocious | BENUTZTE SPRITZE · *Dirty Needle* | ★ | `4fd6b12b-d035-4676-afa2-5e1d1ceedaa8` |
| | BETÄUBUNGSSPRITZE · *Numbing Needle* | | `0bf47eb9-303f-400f-bab1-185d82a2ddf5` |
| | KLEMMBRETT · *Doc's Clipboard* | | `cd1b0a1b-c512-4521-879f-992e40feb621` |
| **Fritze Fischkopp** / Tartar Fishboy | RÜCKENFLOSSE · *Back Fin* | ★ | `0926eae3-580f-41f9-ba5e-9231b69508b9` |
| | FLEISCHPEITSCHE · *Organic Rod* | | `6c30f7ac-3c07-410e-ac73-8b381ce0962e` |
| | KÖDERSTULLE · *Hooked Baitwich* | | `2a8bc635-1e86-4794-8b10-709457454c42` |
| **Die weissen Herren** / The Door Knockers | DEFEKTER KUBUS · *Haywire Cube* | ★ | `fd4cb47b-79e2-4bb2-8cca-5743ee779980` |
| | FORMEN-TRAINER · *Personal Assistant* | | `e8df38af-2bc7-4fde-a47f-f1f6639c3d8a` |
| | FLUGBLATT · *'Growth' Pamphlet* | | `6d350aaa-5b1e-424a-90ec-e176e078a525` |
| **Thea Kotta** / Tilda Fields | TOPFNUSS · *Clay Fist* | ★ | `d4df449e-a95e-4c41-bf44-4e17a4c476ca` |
| | BLUMENSTRAUSS · *Fresh Bouquet* | | `39831b9b-2387-499d-ac5e-f5b2ce33db71` |
| | GUTE KOPFERDE · *Fertile Head Mud* | | `ea41a46e-854d-4624-8c53-b5762024ec5b` |

### 2.3 Belastbarkeit der Zuordnung

- **Karte → Bösewicht:** abgelesen vom Seitenaufdruck der Karte. Sicher.
- **★ ja/nein:** zweifach belegt (Sternsymbol auf der Karte, `(★)` auf dem
  Tableau). Sicher.
- **Deutscher ↔ englischer Kartenname innerhalb eines Trios:** beim ★ sicher,
  bei den beiden übrigen aus der Bedeutung geschlossen. Eindeutig bei fast
  allen; **weniger eindeutig** sind vier Paare: *Face Flayer* →
  HALSABSCHNEIDER, *Barrow Bottoms* → JUPPS KARRE, *Cannibal's Pot* →
  SUPPE MIT PFIFF, *Royal Mantle* → DOPPEL-UMHANG. Für die Engine ist das
  **belanglos** — die Beute wird pro Bösewicht zufällig aus dem Trio gezogen,
  die englischen Namen kommen im Spiel nicht vor.

### 2.4 Nebenbefund: zwei offene Fragen der Regeldatei sind erledigt

`docs/tft-regeln.md` Zeile 450 markiert *Deputy Waggums = Willi Wedler* und
*Handsy = Truthand* als `⚠️ UNSICHER` (auch offene Frage 7, Zeile 1129). Die
Beutekarten belegen beides direkt: `WEDELNDER SCHWANZ` trägt „WILLI WEDLER"
und ist auf Deputy Waggums' Tableau als *Distracting Tail* (★) genannt;
`DICKE HANDSCHUHE` / `ZAHNSCHNABEL` tragen „TRUTHAND" und stehen auf Handsys
Tableau als *Oversized Gloves* (★) / *Handsy's Beak*. Die Regeldatei kann
entsprechend nachgezogen werden.

Ebenfalls belegt und in `tft-regeln.md` bisher nur dort gelistet:
*Tartar Fishboy = Fritze Fisch**kopp*** (nicht „-kopf") und
*The Door Knockers = Die weissen Herren*.

---

## 3. Frage B — Aufstellbares

> „**Kann nicht angelegt werden.** Zu jeder Aufstellbar-Karte gehört ein
> **Token**." `[OJ S.5]` (§9.3)

### 3.1 Die wichtigste Korrektur: keine der 30 kaufbaren Karten ist Aufstellbar

Alle 30 Karten der Kategorie `Toller Trödel: Nachschub (Nr. 1-30)` wurden
gelesen. Ihre Typzeilen lauten: `Mitbringsel`, `Snack`, `Kopf`, `Brust`,
`Beine`, `1-Hand/2-Hand, Waffe, …`, dazu die Schlagworte `Instrument`,
`Einzigartig` und die fettgesetzten `Fummelei` / `Bastelei` / `Buddelei`
(= Schlüssel / Reparatur / Graben aus §9.4). **`Aufstellbar` kommt nicht vor.**

**Alle 24 Aufstellbar-Karten tragen die Nummern 73 bis 161** und liegen damit
vollständig im gesperrten Deck `Toller Trödel: Nachschub (gesperrt, Nr. 31-162)`.

Das hat eine Folge für §9.5: die Tabelle dort führt **Aufstellbare** in der
Spalte *„Funktioniert vollständig"*, während sie gleichzeitig feststellt, der
Kartenpool bleibe „dauerhaft bei Nr. 1–30". Beides zusammen geht nicht. In
einer Erstpartie ohne Händler-Journal **kann kein Aufstellbares in Umlauf
kommen** — die Regelmechanik ist implementierbar, aber tot. Die Zeile in §9.5
sollte auf *„Funktioniert nicht (Karten liegen alle bei Nr. 73–161)"*
korrigiert werden.

### 3.2 Die 24 Aufstellbar-Karten und ihre Token

Alle in Kategorie `Toller Trödel: Nachschub (gesperrt, Nr. 31-162)`.

| Nr. | Karte | `cards.id` | Token (`table_assets.name`) |
|---|---|---|---|
| 73 | SCHAUKELPFERD | `55467075-3c15-4e19-841f-35f1ffe23549` | `Schaukelpferd` |
| 80 | BESESSENER GEIST | `1b7701fa-e7ef-4136-a79d-73c0c9e60da3` | `Besessener Geist` |
| 90 | GEISTERFINDER | `8fc7a9b1-349e-4104-98e7-22dbee166a8b` | `Geisterfinder` |
| 98 | SHERIFF-„PIÑATA" | `7b312b5d-3022-4699-a289-7133f874b2c9` | `Sheriff-"Piñata"` (46×32) |
| 99 | „SHERIFF"-PIÑATA | `defb2344-7dba-49d3-9b2e-abdb64f200c9` | `"Sheriff"-Piñata` (40×40) |
| 100 | AUFTRAGSWUMME | `64e3482c-417d-40ac-b8ee-0174dea15d74` | `Auftragswumme` |
| 103 | STABILES KATAPULT | `ce7a2396-da00-4062-89cf-11ece2091d2d` | `Stabiles Katapult` |
| 107 | HERR KÄLTET | `743be1b9-778d-437e-a91b-432a9a9ae2f4` | **fehlt** |
| 108 | NATASCHA KRAM | `44b169cd-146f-4fae-84ab-f78787cd2fb1` | `Natascha Kram` |
| 109 | HELGA HARPUNE | `a94062e9-ce26-4610-b1ac-77d6ee6f96aa` | `Helga Harpune` |
| 111 | HENRY HEULEIMER | `c9d375cf-a026-4aea-9899-7be830a302d9` | `Henry Heuleimer` |
| 121 | GRILLSTOPH | `febad477-4783-4046-8c3a-a9d26b99b243` | `Grillstoph` |
| 122 | DAS DELIKATE DUO | `3b560801-b132-48de-be60-506ee160265b` | `Das delikate Duo` |
| 123 | HEFTIGER TYP | `a62e9c25-d85a-431d-b1c8-31d21f33e7b2` | `Heftiger Typ` |
| 125 | KLAPPERSCHLANGE | `798c9615-5176-4572-9805-fc56cdbfe8b4` | `Klapperschlange` |
| 130 | PRÜGELSCHEUCHE | `64f37a0e-83cc-4d02-b31d-34d8115a1740` | `Prügelscheuche` |
| 150 | MAXI MUCKE | `e0c7652c-c700-4b8f-b98f-28df83f314e1` | `Maxi Mucke` |
| 151 | AUSGUCK | `134aca7c-686a-4712-b388-f3fbca115f69` | `Ausguck` |
| 152 | FUSSABDRUCK | `f933136c-d3b5-40f3-ad16-b81440f91afc` | `Fussabdruck` |
| 153 | KLAPPRIGES KATAPULT | `26e1a26e-6bce-4784-9891-6efb63ff2af5` | `Klappriges Katapult` |
| 154 | FORT ABFALLINGEN | `4eb9dcac-5bfb-4e24-a346-c12eaba6e397` | `Fort Abfallingen` |
| 155 | KARNIBUNKER | `98fcfdc3-edc8-43f6-a854-73bc2c8081d1` | `Karnibunker` |
| 156 | TRAMPOLIN | `3ffe5dc1-42a6-4d46-9477-db35f1e06a11` | `Trampolin` (50×50) |
| 161 | SOUVENIR-STAND | `7ba07133-153a-42b9-a9d9-c0867083c71e` | `Souvenir-Stand` |

**23 von 24 haben ein Token.** Es fehlt genau eines: **Nr. 107 „HERR KÄLTET"**
(die Karte zeigt eine grüne Raupe/Schnecke; Text: „X MUMM (Du entscheidest!):
Ziehe den Bösewicht X Felder näher zu dir hin."). Kein Asset passt dazu.

Die Nummern 98 und 99 sind **zwei verschiedene Karten** mit fast gleichem
Namen, und es gibt zu beiden ein eigenes Token in passender Größe — hier liegt
also kein Importdublett vor, sondern echte Doppelung im Material.

### 3.3 Was aus dem Briefing **kein** Aufstellbares ist

| Asset | Tatsächlich |
|---|---|
| `Bärenfalle / Bärenfalle (zugeschnappt)` | **Gelände**karte `Bärenfalle` (Kategorie `Gelände`) |
| `Sprengstoff`, `Auslöser` | **Gelände**karte `Sprengstoff & Auslöser` — ein Geländeteil mit zwei Token |
| `Wunschbrunnen / Wunschbrunnen (leer)` | **Gelände**karte `Wunschbrunnen` |
| `Umarmis` | Karte Nr. 158, Typzeile `2-Hand, Waffe, Nahkampf, Faust, Buddelei` — eine **Waffe**, kein Aufstellbares. Das Token gehört trotzdem dazu (die Karte ist ein Handschuhpaar), aber §9.3 gilt nicht. |
| `Blopsy`, `Fridgette`, `Georgie`, `Granny`, `Henlo`, `Judy`, `Norman`, `Quintus`, `Yancy` | **Dörfler** (je ein 46×46-Spielstein und eine 50×50-Figur; dazu `Tableau: …` 300×400) |

### 3.4 Übrig gebliebene englische Dubletten

Fünf Token liegen **zweimal** vor, einmal deutsch in Originalgröße und einmal
englisch als 30×30-Rest eines älteren Imports:

| deutsch (in Gebrauch) | englisches Dublett (30×30) |
|---|---|
| `Trampolin` 50×50 | `Trampoline` `42f399e9-a980-49d3-81ea-fc555635ab57` |
| `Stabiles Katapult` 42×40 | `Tunable Trebuchet` `d15377bf-0f32-4f5c-95f7-eaf2b41bdf1a` |
| `Prügelscheuche` 42×37 | `Training Scarecrow` `bb356c97-e6d7-499e-80d6-d53aad129c19` |
| `Besessener Geist` 43×33 | `Possessed Spirit` `90829682-89a1-4563-a311-1935ead8f3c1` |
| `Schaukelpferd` 45×39 | `Rocking Horse` `1764cbf4-6a6d-4083-9d66-86a833ccfc36` |

Dazu zwei gleichnamige `Fetid Furball` (95×95, `f54df116…`, `fa08482e…`) ohne
deutsche Entsprechung.

---

## 4. Die 24 namenlosen Token

`table_assets` enthält für dieses Spiel **24** Einträge mit `name = ''`.
(Datenbankweit sind es 30 — sechs gehören zu anderen Spielen und sind hier
nicht gemeint. Die Spanne 30×30 bis 187×187 aus dem Briefing stimmt.)

Alle 24 Bilder wurden angesehen. Sie zerfallen in fünf klar erkennbare Gruppen:

### 4.1 Rückseiten der 8 Boss-Token — **sicher**

Dunkles Feld mit dem Namenszug, Anzeigegröße 46×46 bzw. 47×47. Zu jedem gibt
es bereits ein `Boss: <Name>`-Asset in 120×120.

| `table_assets.id` | Größe | Vorschlag |
|---|---|---|
| `cb2dc35e-…` | 47×47 | `Boss-Token Rückseite: Samuel Strawman` |
| `119e460d-…` | 46×46 | `Boss-Token Rückseite: Umbrello` |
| `3152cb94-…` | 46×46 | `Boss-Token Rückseite: Tartar Fishboy` |
| `6f36231b-…` | 46×46 | `Boss-Token Rückseite: Patches` |
| `869113c3-…` | 46×46 | `Boss-Token Rückseite: Pepin Milkfrog` |
| `9aa7d191-…` | 46×46 | `Boss-Token Rückseite: The Door Knockers` |
| `afce3b2f-…` | 46×46 | `Boss-Token Rückseite: Qing & Kween` |
| `dc85503e-…` | 46×46 | `Boss-Token Rückseite: Ms. Falls & Co.` |

Der Namenszug ist **englisch** aufgedruckt; ob die Benennung im Tisch deutsch
(`Fleckchen`) oder englisch (`Patches`) lauten soll, ist eine Entscheidung,
kein Befund.

### 4.2 Patches' Kostümteile 1–9 — **sicher**

Jedes Bild zeigt ein grünes Kostümstück mit **eingedruckter Ziffer**.

| `table_assets.id` | Größe | Ziffer | Vorschlag |
|---|---|---|---|
| `3b4566ec-…` | 39×39 | 1 | `Kostümteil 1 (Kopf)` |
| `b63993a2-…` | 30×30 | 2 | `Kostümteil 2` |
| `50c6e9e3-…` | 45×45 | 3 | `Kostümteil 3` |
| `0059a837-…` | 30×30 | 4 | `Kostümteil 4` |
| `b5cc597b-…` | 30×30 | 5 | `Kostümteil 5` |
| `269dcb0f-…` | 49×49 | 6 | `Kostümteil 6 (Schwanz)` |
| `97ddb664-…` | 33×33 | 7 | `Kostümteil 7 (Pfote)` |
| `50a3ebfe-…` | 34×34 | 8 | `Kostümteil 8 (Bein)` |
| `539b8c5b-…` | 30×30 | 9 | `Kostümteil 9` |

`⚠️ Achtung:` Es existieren **bereits** neun Assets `Kostümteil 1` … `Kostümteil 9`
in anderen Größen (57×67 bis 151×106). Die neun hier sind offenbar ein
zweiter, kleinerer Satz.

**Umgesetzt wurde:** der namenlose Satz heißt jetzt `Kostümteil 1 (klein)` …
`Kostümteil 9 (klein)`. Damit stehen zwar 18 Kostümteile im Tisch, aber
unterscheidbar, und **gelöscht wurde nichts** — welcher Satz am Ende gelten
soll, bleibt eine Entscheidung des Auftraggebers.

### 4.3 Münzen — **sicher**

| `table_assets.id` | Größe | Vorschlag |
|---|---|---|
| `5bba1752-…` | 30×30 | `Münze 1` (Kupfer) |
| `63470a05-…` | 30×30 | `Münze 5` (Silber) |
| `d01db1f0-…` | 30×30 | `Münze 10` (Gold) |

### 4.4 Zwei Marker — **gut begründet**

| `table_assets.id` | Größe | Vorschlag | Begründung |
|---|---|---|---|
| `1439c8f6-…` | 43×43 | `Glauben-Marker (Die weissen Herren)` | Bild: Door-Knocker-Kopf über einem Gehirn mit Aufschrift „BELIEF". Ihr Tableau nennt „all of their Belief tokens". |
| `44b7360f-…` | 42×42 | `Wasser-Marker (Rosa Voir & die WG)` | Bild: reine Wasseroberfläche. Das Tableau von Ms. Falls & Co. sagt „… and receives 2 water tokens". |

### 4.5 Zwei Seitenhälften von Patches' Kostümbogen — **unsicher**

| `table_assets.id` | Anzeigegröße | Quellbild | Inhalt |
|---|---|---|---|
| `220851d2-…` | 187×187 | 3311×2630 | Illustration: gebeugter Dörfler mit Stock und Kette |
| `27f44fa9-…` | 187×187 | 1714×2630 | Regeltext „PATCHES' COSTUME" (englisch) |

Beide haben dieselbe Quellhöhe (2630 px) und passen nebeneinander zu einer
gescannten Seite. Es gibt bereits ein Asset `Patches' Kostüm-Mat` (600×302).
Vorschlag: `Patches-Kostümbogen: Illustration` und
`Patches-Kostümbogen: Regeltext`. **Mittlere Sicherheit** — dass es zwei
Hälften desselben Scans sind, ist erschlossen, nicht belegt. Beide sind als
187×187-Token am Tisch ohnehin unbrauchbar klein.

---

## 5. Vorschläge

### 5.0 Was davon umgesetzt wurde

Umgesetzt wurden **V1, V3, V5 und V9**, in einer einzigen
`db.transaction(...)` nach einem Trockenlauf, dessen Vorprüfung **0
Beanstandungen** ergab (alle 60 + 24 Karten-IDs und -Namen sowie alle 24
Asset-IDs stimmten mit diesem Befund überein, keine Namenskollision).

| | vorher | nachher |
|---|---|---|
| `Beute: <Bösewicht>` (20 neue Kategorien) | — | je **3** Karten |
| Karten mit Suffix ` ★` | 0 | **20** |
| `Toller Trödel: Aufstellbares` | 0 | **24** |
| `Nachschub` | 256 | **220** |
| `Ausrüstung (Üble Nachbarn)` | 64 | **40** |
| `Toller Trödel: Nachschub (gesperrt, Nr. 31-162)` | 133 | **109** |
| namenlose `table_assets` | 24 | **0** |

Als Kategoriename steht der **englische** Eigenname des Bösewichts, damit die
Kategorie neben `Bösewicht: <Name>`, `Tableau: <Name>` und
`Aktionen: <Name>` in einer Liste beieinandersteht. Der deutsche Name steht in
§2 dieses Befunds und in `tft-regeln.md` §5.5.

**Vorabprüfung, dass das Verschieben nichts kaputt macht** (alles gemessen,
nicht angenommen):

- Kein Aufbau referenziert `Toller Trödel: Nachschub (gesperrt, Nr. 31-162)`,
  `Toller Trödel: Aufstellbares` oder `Ausrüstung (Üble Nachbarn)` als
  Kategorie. *TFT Kurzpartie* baut den Ladenstapel per `place_stack` aus
  `Toller Trödel: Nachschub (Nr. 1-30)` — diese Kategorie bleibt bei 30.
- Die vorgebauten Stapel in `setups.state_data` binden Karten über
  **`card_ids`**, nicht über die Kategorie. Ein Kategoriewechsel lässt sie
  unberührt.
- **`card_backs` hängt an der Karte** (`cards.card_back_id`), nicht an der
  Kategorie. Kontrolle nach dem Schreiben: alle 60 Beutekarten haben weiterhin
  eine Rückseite.
- Keine der 60 lila Karten kommt in einem `setup` oder `save_state` vor — die
  20 Umbenennungen treffen keinen gespeicherten Tisch.

`⚠️ Nebenbefund, nicht angefasst:` Der Aufbau *TFT Grundaufbau (Dorfphase)*
teilt 10 Karten aus einem vorgebauten Stapel „Nachschub (Tante Emma)" aus, der
in `state_data` **133 Karten-IDs** enthält — also das **gesperrte** Deck
Nr. 31–162, nicht Nr. 1–30. *TFT Kurzpartie* ersetzt diesen Stapel per
`remove_stack` + `place_stack` korrekt durch Nr. 1–30; der Grundaufbau tut das
nicht. Das ist ein Fehler im Aufbau, älter als diese Änderung und außerhalb
ihres Auftrags.

### 5.1 Ursprüngliche Vorschlagsliste

### 5.2 Frage A — die Beute auffindbar machen

**V1 — eine Kategorie je Bösewicht.** 20 Unterkategorien `Beute: <Bösewicht>`
mit je 3 Karten. Das ist die einzige Struktur, die §7 Schritt 3 („eine
**zufällige** der 3") direkt bedienbar macht: Stapel ziehen, eine Karte
aufdecken. Dazu paart sich §7 Schritt 6 („Bösewicht-Material wegräumen") — man
räumt eine Kategorie weg, nicht 3 Einzelkarten aus 256.

**V2 — falls 20 Kategorien zu viel sind:** eine Kategorie `Bösewicht-Beute`
mit allen 60, und der Bösewichtname wandert in den Kartennamen
(`BERTS GESICHT (Bert Doofis) ★`). Schlechter zu bedienen, aber ein einziger
Umbau.

**V3 — der ★ muss sichtbar sein.** Die (★)-Karte wird im Kampf bei einem
Knaller von 9+ einzeln gezogen (§7.4). Ohne Markierung im Namen oder in einer
eigenen Mini-Kategorie muss der Spieler 3 Bilder aufmachen, um sie zu finden.
Vorschlag: Suffix ` ★` im Kartennamen der 20 Sternkarten.

**V4 — die 256er-`Nachschub` ist unabhängig davon zu zerlegen.** Gemessen
enthält sie 177 blaue (echter Nachschub), 36 lila (Beute), 28 gelbe
(einzigartig) und 15 graue (Startausrüstung) Karten. Als Nachziehstapel ist
sie in dieser Form **falsch**: wer daraus zieht, zieht Beute- und
Startausrüstung mit. Dasselbe gilt für `Ausrüstung (Üble Nachbarn)` (7 grau,
24 lila, 33 gelb).

### 5.3 Frage B — Aufstellbares

**V5 — die leere Kategorie `Toller Trödel: Aufstellbares` mit den 24 Karten
füllen.** Sie existiert bereits mit `sort_order = 3` und 0 Karten. Die Karten
bleiben Nachschubkarten Nr. 73–161; die Kategorie ist eine Sicht, kein Deck.

**V6 — Token an Karte binden.** 23 der 24 Token heißen exakt wie ihre Karte
(bis auf Groß-/Kleinschreibung und `ß`/`ss`). Eine Verknüpfung über den
normalisierten Namen ist damit ohne Datenpflege möglich; nur `HERR KÄLTET`
braucht ein neues Token.

**V7 — die fünf englischen 30×30-Dubletten löschen** (§3.4). Sie stiften am
Tisch nur Verwechslung mit den deutschen Originalen.

**V8 — Nr. 107 „HERR KÄLTET":** Token fehlt. Entweder aus dem Kartenbild
freistellen oder die Karte bis dahin als unspielbar markieren.

### 5.4 Namenlose Token

**V9 — die 24 nach §4 benennen.** Vorher die Doppelung der Kostümteile klären
(§4.2): entweder den alten oder den neuen Satz entfernen.

---

## 6. Wo das Briefing falsch lag

1. **„Welche der 30 kaufbaren Odd-Jobs-Karten sind Aufstellbare?"** — **keine.**
   Alle 24 Aufstellbaren tragen die Nummern 73–161 und liegen im gesperrten
   Deck. Die Frage ist gestellt, als gäbe es welche; die Antwort ist eine Null.
2. **„Verdacht: die Beute steckt in der 256er-`Nachschub`."** — nur 36 von 60.
   Die anderen 24 liegen in `Ausrüstung (Üble Nachbarn)`, sauber getrennt nach
   Grundspiel (12 Bösewichte) und Erweiterung (8 Bösewichte).
3. **„Bärenfalle, Sprengstoff, Auslöser, Wunschbrunnen sehen nach
   Aufstellbarem aus."** — das sind **Geländekarten** (`Bärenfalle`,
   `Sprengstoff & Auslöser`, `Wunschbrunnen`), keine Ausrüstung.
4. **„Umarmis"** steht in der Verdachtsliste, ist aber eine 2-Hand-Waffe
   (Nr. 158), kein Aufstellbares.
5. **Die Tableaus sind nicht deutsch.** Die 20 `Tableau: <Name>`-Bilder tragen
   englische Ausrüstungsnamen; die Karten in der Datenbank sind deutsch. Ein
   Abgleich über den Namen allein geht deshalb nicht — er geht über den
   senkrechten Bösewichtaufdruck auf der Karte.
6. **„Die 20 Bösewicht-Tableaus liegen als Assets vor."** — stimmt, aber es
   gibt **28** Assets mit Präfix `Tableau:`. Neun davon sind Dörfler-Tableaus
   (Anzeigegröße 300×400 statt 300×600). Die Kategorie `Bösewicht-Tableaus`
   ist leer; die Tableaus sind Token, keine Karten.
7. **„24 Token-Assets haben einen leeren Namen."** — für dieses Spiel ja. Die
   Datenbank enthält insgesamt 30 namenlose Assets; sechs gehören zu anderen
   Spielen.
8. **Die Rahmenfarbe ist nicht „ein schmaler Streifen vom linken Rand" einer
   sonst andersfarbigen Karte**, sondern der gesamte umlaufende Hintergrund
   des quadratischen Bildes. Der Hinweis, das rechnerisch zu bestimmen, war
   richtig und trägt vollständig — die vier Farben sind exakt, ohne Ausreißer.
9. **Kartenbilder sind nicht ohne Weiteres öffentlich abrufbar.** Ohne
   `User-Agent`-Header antwortet `gaming.benjathi.de` mit **403**.

---

## 7. Was nicht geprüft wurde

- Die `Nachschub (freischaltbar)` (24) und `Ausrüstung (Hookbox)` (16) wurden
  nur auf Rahmenfarbe geprüft (kein Lila, kein Gelb dort — also weder Beute
  noch einzigartig) und mit dem Aufstellbar-Template gegengeprüft (kein
  Treffer). Ihre Typzeilen wurden nicht einzeln gelesen.
- Ob die 36 Grundspiel-Beutekarten in der 256er-`Nachschub` beim Auslegen des
  Nachschubdecks tatsächlich mitgemischt wurden, war nicht Teil der Erhebung.
  Bei der Vorprüfung zur Umsetzung (§5.0) stellte sich heraus: **keiner der
  drei Aufbauten legt die 256er-`Nachschub` als Stapel aus.** Die Frage ist
  damit gegenstandslos — und der eigentliche Fehler liegt woanders, siehe den
  Nebenbefund zu *TFT Grundaufbau (Dorfphase)* in §5.0.
- Der Code wurde nicht gelesen. `sequenceExecutor` und die Auflösung von
  `card_ids` beim Laden eines Aufbaus sind aus den Daten erschlossen, nicht
  aus der Implementierung.
