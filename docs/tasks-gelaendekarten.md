# Aufgaben: Geländekarten im Kampfaufbau (Spec M8.3)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M8.3**. Nummern sind `K…`
(Karten), damit sie weder mit T1–T9 (`docs/tasks-kampfvorbereitung.md`),
G1–G6 (`docs/tasks-gelaendelage.md`), F1–F4 (`docs/tasks-grundflaeche.md`)
noch S1–S6 (`docs/tasks-szenarioflaeche.md`) kollidieren.

**Gilt für jede Aufgabe.** Wie in S, F und G: eine Fähigkeit ist erst fertig,
wenn alle vier Schichten stimmen, und **„nichts zu tun" ist eine gültige
Antwort, aber nur eine geprüfte.** Bei M8.3 sind das drei von fünf Aufgaben —
die Änderung sitzt in einer Funktion, alles andere trägt sie schon oder ist
gar kein Code.

1. **Ausführung** — `shared/sequenceExecutor.js`
2. **Schrittvokabular** — `client/src/utils/sequenceSteps.js`
3. **Editor / Tisch** — `client/src/pages/GameTable.jsx`
4. **Serverrouten / Persistenz** — `server/src/routes/setups.js`, `rooms.js`

Tests laufen mit `cd server && npm test`.

---

## Vorab: drei Stellen, an denen M8.3 nicht stimmt

Die Abschnitte stehen hier und nicht als Kommentar im Code, weil sie den
Zuschnitt der Aufgaben begründen.

### `build_scenario` kann Karten — der Auftrag ist richtig geschnitten

Die Sorge aus dem Auftrag ist unbegründet. Der Executor bekommt die
**Kartenbibliothek** seit M7/T3 als `options.cards` hereingereicht, an **allen
drei** Aufrufstellen (`GameTable.jsx` Aufbau, `GameTable.jsx` Aktion,
`server/src/routes/rooms.js` Raumstart), und jede Zeile darin trägt den *Namen*
ihrer Kategorie. `place_stack` baut daraus einen Stapel. Was fehlt, ist nicht
der Zugang zu den Karten, sondern eine Schleife, die statt eines Stapels
einzelne Karten in `state.cards` legt — dieselbe Form, die `deal_to_zone` schon
erzeugt.

Der Schritt gehört auch inhaltlich dorthin: die Karte hängt am **Geländeeintrag
des Szenarios**, und nur `build_scenario` liest den. Ein eigener Schritt
„Geländekarten auslegen" müsste die Szenariodaten ein zweites Mal aufschlagen
und denselben Bösewicht ein zweites Mal nachschlagen — zwei Leser derselben
Daten, die auseinanderlaufen können.

### Die Zone gibt es nicht, und `build_scenario` kann keine anlegen

Zonen sind **Eingabe** des Executors (`executeSequence(state, sequence, zones,
…)`), nicht Teil des Zustands. Sie stehen in `setups.zone_data`, werden beim
Aufbau hereingereicht und nirgends geschrieben. Es gibt keinen Schritt, der eine
Zone anlegt, und es soll keinen geben: eine Zone, die erst beim Ausführen
entsteht, stünde in keinem Setup und der Zoneneditor wüsste nichts von ihr.

**Die Zone muss also im Setup stehen**, und zwar von Hand (M2.5). Was
einzutragen ist, steht unten bei K5.

**Daraus folgt der Schnitt von K2:** der Zonenname darf nicht im Code stehen.
`Geländekarten` ist ein Townsfolk-Tussle-Begriff wie `B` und `Kampffeld`, und
M7 sagt ausdrücklich, dass der Code nichts über Townsfolk Tussle weiß. Er
gehört dorthin, wo `gridLabel` schon steht: in `scenario_data`.

### Die Zone räumt sich nicht selbst ab — das tut ein Schritt

M8.3 Regel 3 sagt, die Reihe sei eine Zone, „damit sie … beim nächsten
Kampfaufbau mit abgeräumt wird". **Das stimmt nicht.** Eine Zone zu sein
bewirkt von sich aus gar nichts. Abgeräumt wird in T8 Schritt für Schritt und
namentlich:

```
1  clear_zone   Ladenauslage     → Stapel "Nachschub"
2  clear_zone   Bösewicht-Platz  → Zone "Besiegte Bösewichte"
3  clear_zone   Bösewicht-Tableau
4  clear_grid   Kampffeld
5  remove_stack "Verhaltensdeck"
6  remove_stack "Überfall"
```

Genau das erklärt auch den Befund vom gespielten Tisch: Gelände (Raster),
Bösewichtfigur, Tableau und Verhaltensdeck verschwanden, weil für sie eine Zeile
dasteht. Abgelegte Aktionskarten und Handkarten blieben liegen, weil für sie
keine dasteht. Die neue Reihe käme ohne eigene Zeile **zu diesen Resten dazu**
und verdoppelte sich bei jedem Kampf.

`clear_zone` kann sie: es liest `objectsInZone(zone, state.cards, state.tokens)`
— Karten sind dabei, und die Reihe liegt frei, nicht in einem Stapel.
`clear_grid` kann sie **nicht**: die Reihe liegt unter dem Hauptplan und damit
außerhalb des Rasters „Kampffeld".

---

## K1 — Die 33 Kartennamen entziffern (Daten, kein Code)

**Ziel.** Jede Geländekarte heißt wie ihr Geländeteil, damit die Zuordnung ein
Namensvergleich ist und kein Ähnlichkeitsrechner (M8.3 Regel 1).

**Umfang.** Keine Codeänderung. Eine Zuordnungstabelle alter Name → sauberer
Name für die 33 Zeilen der Kategorien `Gelände` (20) und
`Gelände (Üble Nachbarn)` (13) im Spiel
`072123c0-cd97-4ffb-a330-369630fab93f`. Entziffert wird von Hand; wo der Name
nicht eindeutig lesbar ist, wird er **als unklar gekennzeichnet**, nicht
erfunden.

**Abnahme.** Die Tabelle hat 33 Zeilen, jeder in den drei erfassten Szenarien
vorkommende Geländeteilname taucht darin als Zielname auf, und die Zeilen, bei
denen geraten werden müsste, sind als solche markiert.

### Die Tabelle (Stand 2026-09-24)

Gelesen wurde so: jedes Wort steht **doppelt** hintereinander, die Buchstaben
sind an beliebiger Stelle durch Leerzeichen zerrissen, die beiden Zeilen des
Kartenkopfs stehen gelegentlich vertauscht, und ein abschließender Bindestrich
(`PI L Z-`) markiert den *ersten* Teil eines Kompositums. „·" in der Spalte
„Prüfung" heißt: der Name kommt in den drei erfassten Szenarien als Geländeteil
vor und stimmt zeichengenau mit dessen Tokennamen.

#### Kategorie `Gelände` (20)

| alter Name (DB) | sauberer Name | Prüfung |
| --- | --- | --- |
| `ALTES FASS` | Altes Fass | · |
| `BIE NE N ST OCK BIE NE N ST OCK SU M E ND ER SU M E ND ER` | Summender Bienenstock | fehlendes M in `SUMENDER` |
| `BÄ RE N FA LLE` | Bärenfalle | |
| `DIC HT E R WA LD` | Dichter Wald | · |
| `DO RF TE ICH` | Dorfteich | |
| `DOR FD O KT ORS DOR FD O KT ORS HÜT E DE S HÜT E DE S` | Hütte des Dorfdoktors | · , fehlendes T in `HÜTE` |
| `FA R M HA US FA R M HA US MA R OD ES MA R OD ES` | Marodes Farmhaus | · |
| `GE MÜ S EB EET` | Gemüsebeet | · |
| `HO H LE R HO H LE R HE UH A UF EN HE UH A UF EN` | Hohler Heuhaufen | · |
| `HO LZ ZA UN` | Holzzaun | · |
| `MA TS C HI GER MA TS C HI GER GR A BE N GR A BE N` | Matschiger Graben | |
| `MI EF IG ES MI EF IG ES PLU M P SK LO PLU M P SK LO` | Miefiges Plumpsklo | |
| `PIC KN ICK PIC KN ICK VER WA HR LOS TES VER WA HR LOS TES` | Verwahrlostes Picknick | · |
| `SC HU P EN SC HU P EN WE RK ZE UGWE RK ZE UG-` | Werkzeugschuppen | fehlendes P in `SCHUPEN` |
| `SCH RO T KAR RE SCH RO T KAR RE RO S TI GE RO S TI GE` | Rostige Schrottkarre | · , fehlendes T in `SCHROTKARRE` |
| `SPR EN GS TOF F SPR EN GS TOF F & A US LÖ SER & A US LÖ SER` | Sprengstoff & Auslöser | |
| `TRÜ BE R FL USS` | Trüber Fluss | · |
| `WU N SC HWU N SC HBR U N NE N BR U N NE N` | Wunschbrunnen | · |
| `WÄ LD CH EN WÄ LD CH EN PI L ZPI L Z-` | Pilzwäldchen | · |
| `ÜBER WU CH ERTE S ÜBER WU CH ERTE S MA IS FEL D MA IS FEL D` | Überwuchertes Maisfeld | · |

#### Kategorie `Gelände (Üble Nachbarn)` (13)

| alter Name (DB) | sauberer Name | Prüfung |
| --- | --- | --- |
| `D IE D IE WO LK E NGA NG WO LK E NGA NG` | Die Wolkengang | **unklar** |
| `FE UE R CH EN FE UE R CH EN LA G ER - LA G ER -` | Lagerfeuerchen | |
| `FL UT` | Flut | |
| `FO OD T RU CK` | Food Truck | |
| `GL O CK E GL O CK E DO OF ST ERDO OF ST ER-` | Doofster-Glocke | Teilname `Doofster-Glocke / Kochtopf` |
| `KN EI PE KN EI PE GÜ N NI S GÜ N NI S` | Günnis Kneipe | Ö als Ü gelesen, Codepoint U+00DC |
| `KO C H TO PF` | Kochtopf | Rückseite von `Doofster-Glocke / Kochtopf` |
| `KÖ DE R ST ULL E` | Koederstulle | Teilname `Koederstulle / Rasenmaeher` |
| `PFÜTZEPFÜTZEMATSCH MATSCH-` | Matschpfütze | |
| `RAN GE LB LU ME` | Rangelblume | |
| `RAS EN MÄ HER` | Rasenmaeher | Rückseite von `Koederstulle / Rasenmaeher` |
| `WE H TU HWE H TU HFRA TZ E NF ALL E FRA TZ E NF ALL E` | Wehtuh-Fratzenfalle | **unklar** |
| `WÄS C H EL EIN E` | Wäscheleine | |

#### Die unklaren

- **`D IE … WO LK E NGA NG`** — die Buchstaben ergeben `DIE` und `WOLKENGANG`,
  also „Die Wolkengang". Kein Geländeteil dieses Namens ist erfasst, und
  „Wolkengang" ist kein gängiges deutsches Wort. Vor dem Einsetzen am
  gedruckten Kartenkopf nachsehen.
- **`GL O CK E … DO OF ST ER-`** — **geklärt (K6).** Der Bindestrich gehört zum
  Wort, nicht zum Zeilenumbruch: das Geländeteil heißt
  `Doofster-Glocke / Kochtopf`, die Karte also `Doofster-Glocke`. Damit passt
  auch der doppelte Kartenkopf zusammen, ohne dass ein Buchstabe fehlt.
- **`WE H TU H… FRA TZ E NF ALL E`** — `WEHTUH` und `FRATZENFALLE`, beide ohne
  Bindestrich, also zwei vollständige Wörter. „Wehtuh-Fratzenfalle" ist die
  wörtliche Lesart; ob die Karte einen Bindestrich, ein Leerzeichen oder ein
  zusammengeschriebenes Kompositum trägt, sagt der Text nicht. Nachsehen.

#### Geländeteile ohne Karte

Aus den drei erfassten Szenarien: **Die Bundo-Königin** (samt Rückseite
„Beruhigungs-Leckerli") und die fünf **Grabhügel**. Für beide gibt es unter den
33 Namen keinen Kandidaten — das ist genau der Fall aus M8.3 Abnahme 2, und der
Aufbau meldet ihn im Protokoll, statt abzubrechen.

#### Karten ohne Geländeteil

Zwanzig: die sieben aus `Gelände` (Summender Bienenstock, Bärenfalle,
Dorfteich, Matschiger Graben, Miefiges Plumpsklo, Werkzeugschuppen,
Sprengstoff & Auslöser) und alle dreizehn aus `Gelände (Üble Nachbarn)`.

Das heißt **nicht**, dass die Karten überzählig sind — erfasst sind erst drei
von zwanzig Szenarien. Eine davon ist sogar schon belegt: die Nachträge zu M7.4
nennen bei Virginia Fitz ein fehlendes Geländeteil „Holzschuppen auf `C1:E2`",
und dazu passt die Karte **Werkzeugschuppen**. Wer das Teil nachträgt, gleicht
den Namen gegen die Karte ab.

---

## K2 — Die Szenariodaten sagen, wohin die Reihe gehört

**Ziel.** `scenario_data` bekommt neben `gridLabel` ein optionales
`cardZoneLabel`. Dieselbe Begründung wie beim Raster (M7): die Adresse gehört
zu den erfassten Daten, nicht zum Knopf, und zwei Quellen für dieselbe Adresse
wären eine Frage danach, welche gewinnt.

**Umfang.** `shared/sequenceExecutor.js` liest den Schlüssel. Kein neues Feld am
Schritt `build_scenario`, keine Routenänderung (`scenario_data` reicht der
Server untypisiert durch, M7.1).

**Abnahme.** Ein Szenario **ohne** `cardZoneLabel` verhält sich zeichengenau wie
bisher: es liegt keine Karte, im Protokoll steht nichts darüber, und die drei
erfassten Szenarien laufen unverändert durch.

---

## K3 — `build_scenario` legt je Geländeteil eine Karte aus

**Ziel.** M8.3 Regel 2.

**Umfang.** Eine Schleife im `build_scenario`-Zweig, nach dem Gelände:
die Assetnamen aller Geländeeinträge (regulärer Abschnitt **und**, wenn er
gebaut wird, `final`) in Reihenfolge, **entdoppelt**, je einer eine Karte
gleichen Namens aus der Bibliothek, gelegt in die Zone aus `cardZoneLabel`.
Gelegt wird wie in `draw_assets`: `zoneRoom` prüft `accepts`/`capacity`,
`zoneSlotFor` verteilt der Reihe nach.

Die Karte entsteht per Spread aus der Bibliothekszeile, **nicht** über eine
aufgezählte Feldliste — die hat in diesem Repo schon zweimal `width`/`height`
verschluckt (Nachtrag zu M2.12, M4a).

**Abnahme.** Ein Szenario mit einem Plättchen auf drei Feldern und einem
zweiten auf einem vierten legt **zwei** Karten; zwei Geländeeinträge desselben
Plättchens (zwei Ausrichtungen, M7.1) legen **eine**. Die Karten liegen
nebeneinander in der Zone, nicht übereinander, und tragen Name, Bild und Maße
ihrer Bibliothekszeile.

---

## K4 — Ein Teil ohne Karte bricht nichts ab

**Ziel.** M8.3 Abnahme 2.

**Umfang.** Fehlende Karte, fehlende Zone und eine volle Zone sind Vermerke, die
das **Gelände unangetastet lassen**: es liegt schon, bevor die Karten drankommen.
Der Schritt endet als `failed` mit dem Grund im Protokoll — dieselbe Form, die
`deal_to_zone` für eine halb ausgeteilte Auslage benutzt.

Das ist die Umkehrung von „erst prüfen, dann legen" aus M7, und mit Absicht: die
Prüfung dort schützt das **Kampffeld** vor einem Halbaufbau. Eine fehlende
Geländekarte ist kein Halbaufbau, sondern ein bekannter Normalfall (die
Bundo-Königin hat keine), und ein Abbruch dafür ließe das ganze Kampffeld leer.

**Abnahme.** Ein Geländeteil, zu dem es keine gleichnamige Karte gibt, lässt
Gelände und Reihe unverändert, nennt den Namen im Protokoll und lässt den
übrigen Aufbau durchlaufen.

---

## K5 — Was die anderen drei Schichten nicht tun

**Ziel.** Geprüft festhalten, dass Schrittvokabular, Tisch und Server nichts
bekommen — und was statt dessen von Hand in die Daten muss.

**Umfang, geprüft:**

- **Schrittvokabular** (`sequenceSteps.js`): nichts. `build_scenario` behält
  sein einziges Feld `final`; die Zone steht in den Daten, nicht am Schritt.
- **Tisch** (`GameTable.jsx`): nichts. Freie Karten in `state.cards` rendert,
  speichert und lädt er seit jeher; die Form ist dieselbe, die `deal_to_zone`
  erzeugt.
- **Server** (`setups.js`, `rooms.js`): nichts. `scenario_data` geht
  untypisiert durch, und `rooms.js` reicht `cards` bereits hinein.

**Was von Hand in die Daten muss** (Produktionssetup, kein Code):

1. **Zone anlegen** (Setup-Editor, `?mode=setup`): Name `Geländekarten`,
   unter dem Hauptplan, breit und flach, `accepts: ['card']`, **ohne**
   `capacity` und ohne `layout` — dann verteilt `zoneSlotFor` beliebig viele
   Karten gleichmäßig über die Breite, statt gegen eine feste Platzzahl zu
   rechnen. Am Hauptplan verankern (M3a), damit die Reihe mitwandert.
2. **`cardZoneLabel: "Geländekarten"`** in `scenario_data` neben `gridLabel`.
3. **Einen Schritt `clear_zone "Geländekarten"`** in die Aktion „Kampf
   beginnen", bei den übrigen `clear_zone` (T8, Schritte 1–3). Ohne ihn
   verdoppelt sich die Reihe bei jedem Kampf.
4. Die 33 Kartennamen aus K1 einsetzen.

**Abnahme.** Ein Test legt die Reihe und räumt sie mit `clear_zone` wieder ab —
die Zone ist danach leer und das Gelände auf dem Raster unberührt. Die vier
Punkte oben stehen im Bericht, damit sie nicht in einem Commit verschwinden.

---

## K6 — Ein Teil mit zwei Seiten heißt `Vorderseite / Rückseite`

**Ziel.** Nachtrag zu M8.3 Regel 1. Die Spec zählt die Teilnamen mit Schrägstrich
auf und schreibt trotzdem „Namensvergleich" — der exakte Vergleich findet für
`Wunschbrunnen / Wunschbrunnen (leer)` keine Karte. Bei Deputy Waggums trifft
das eines von sieben Teilen, in den anderen beiden Szenarien `Altes Fass / …`
und `Marodes Farmhaus / …`.

**Umfang.** **Eine** Regel in der Suche: erst exakt vergleichen, dann gegen den
Teil **vor** dem Schrägstrich. Zwei Versuche, kein dritter, kein
Ähnlichkeitsrechner. Dazu eine zweite Entdopplung — nun nach *Karte*: erst der
Schrägstrich macht möglich, dass zwei verschieden benannte Teile auf dieselbe
Karte zeigen.

**Warum der vordere Teil und nicht irgendeiner.** `build_scenario` legt Gelände
mit fest verdrahtetem `assetToken(asset, x, y, false)` hin, also **immer offen**,
und der Geländeeintrag kennt nur `assetName`, `cells` und `rotation` — **keine
Seite**. Was auf dem Tisch liegt, ist die Vorderseite. Bei einem Teil, dessen
Seiten zwei verschiedene Gelände sind (`Doofster-Glocke / Kochtopf`), wäre die
zweite Karte die Regel zu einem Gelände, das gar nicht daliegt — schlimmer als
keine Karte, weil eine falsche gelesen wird.

**Der Vergleich bleibt zeichengenau.** `norm` trimmt und macht klein, mehr
nicht. Die Karte muss deshalb genau so heißen wie der Teil vor dem
Schrägstrich — samt Bindestrich und samt `ae`/`oe`, wenn der Teilname sie so
trägt. Umgekehrt ginge nicht: die Assetnamen stehen in `scenario_data`, ein
Umbenennen des Teils bräche die erfassten Szenarien. Die Karte ist die
billigere Seite.

**Abnahme.** `Wunschbrunnen / Wunschbrunnen (leer)` findet die Karte
`Wunschbrunnen`; von `Doofster-Glocke / Kochtopf` liegt nur `Doofster-Glocke`;
eine Karte, die exakt `Doofster-Glocke / Kochtopf` heißt, gewinnt gegen
`Doofster-Glocke`; zwei Teile, die auf dieselbe Karte zeigen, legen eine; und
`Doofsterglocke` ohne Bindestrich trifft `Doofster-Glocke / Kochtopf` **nicht**.
