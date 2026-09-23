# Townsfolk Tussle — Regelreferenz für Solopartien (mit beiden Erweiterungen)

Stand: 2026-09-23. Zweck: Wissensgrundlage für einen Agenten, der eine Solopartie
regelkonform auf der Engine durchspielt. Wer diese Datei liest, soll die Quellen
nicht mehr öffnen müssen.

---

## 0. Quellen und Belegkonventionen

| Kürzel | Quelle |
|---|---|
| `[BR S.x]` | **Basis-Regelwerk** „Townsfolk Tussle – Rules & Results Booklet" (1st Ed., 32 S.), englisch. Kopie: `scratchpad/rules/base.pdf`, Textauszug `base.txt`. Seitenzahlen = Buchseiten = PDF-Seiten. |
| `[EXP S.4]` | **Expansion-Demo-Regelwerk**, Seite 4 „Base Game Rule Updates" — offizielle Regel-Updates, die in die **2. Edition** einfließen. Die deutsche Frosted-Games-Ausgabe entspricht diesem Stand (siehe §1.3). Kopie: `scratchpad/rules/expansion.pdf`. |
| `[FN S.x]` | **Foul Neighbors Rulebook** (dt. „Üble Nachbarn"), `C:\Users\benja\Downloads\Rulebook_FOULNEIGHBORS_Compressed.pdf`. Seitenzahlen = Buchseiten (das PDF enthält Doppelseiten). |
| `[OJ S.x]` | **Odd Jobs Rulebook** (dt. „Toller Trödel"), `C:\Users\benja\Downloads\Rulebook_ODDJOBS_compressed.pdf`. |
| `[E01 hh:mm]` | Regelvideo Genus Solo S01E01 „Regeln" (Aufbau + Dorfphase, 1:20:30), YouTube `2PeqrpPXJxo`. Transkript: `scratchpad/subs/e01.txt`. |
| `[E02 hh:mm]` | Regelvideo Genus Solo S01E02 „Regeln" (Kampfphase, 1:06:52), YouTube `jv8WfAgnPe4`. Transkript: `scratchpad/subs/e02.txt`. |
| `[Tableau <Name>]` | Foto des Bösewicht-Tableaus. Basis + Üble Nachbarn: `Z:\Austausch\TfT\*.pdf`. Weitere 8: TTS-Mod `2999560617`, Bilder in `scratchpad/tableaus/`. |
| `[CS-DE]` | Deutsche Cheatsheet-Karte, `Downloads\Cheatsheet_Card_{FRONT,BACK}_DE_V2*.pdf` — maßgeblich für **deutsche Begriffe**. |
| `[Crit-DE]` | Deutsche Knaller-Karte, `Downloads\Crit_Hit_Card_FRONT_DE_V1_RZ_klein.pdf`. |

**Warnhinweis zu den Videos:** die Transkripte sind **automatisch ins Englische
übersetzte** Untertitel eines deutschen Videos. Eigennamen und Fachbegriffe sind
teils zerstört („Towns for Tassel" = Townsfolk Tussle, „Dürfler" = Dörfler,
„Mum"/„Mumm" = Moxie, „riot" = Randale, „Auer"/„AU" = AUA/Schaden, „Knaller" =
kritischer Treffer). **Inhaltlich** sind sie zuverlässig, sprachlich nicht.
Wo Video und Regelwerk sich widersprechen, gilt das Regelwerk — jede solche
Stelle ist unten ausdrücklich markiert.

**Unsicherheiten** sind mit `⚠️ UNSICHER` gekennzeichnet. §14 sammelt sie.

---

## 1. Grundlagen

### 1.1 Begriffe (deutsch / englisch)

Alle deutschen Begriffe sind aus der deutschen Cheatsheet-Karte und den deutschen
Druckdaten belegt `[CS-DE]`, `[Crit-DE]`.

| Deutsch | Abk. | Englisch |
|---|---|---|
| Bösewicht | — | Ruffian |
| Dörfler | — | Townsfolk |
| Hauptplan / Schlachtfeld | — | main board / landscape |
| Zusatz-Brett (beidseitig) | — | sideboard |
| „Wer ist dran?"-Leiste | — | Buyin'/Beatin' Bar |
| Dorf-Phase / Kampf-Phase | — | Town Phase / Fight Phase |
| Dorf-Ereignis | — | Town Event |
| Heldentat | — | Feat of Mettle |
| Tante Emma / Tante Emmas Laden | — | the Peddler / Peddler shop |
| Nachschub(-stapel) | — | Peddler deck |
| Ausrüstung / weggepackt / anlegen | — | gear / stashed / equip |
| Bösewicht-Aktion (Verhaltenskarte) | — | Ruffian action card |
| Bewegung | **BEW** | Movement (**MVMT**) |
| Leben | **LEB** | Health (**HP**) |
| Mumm | **MUMM** | Moxie (**MOX**) |
| Präzision | **PRZ** | Accuracy (**ACC**) |
| Schaden | **AUA** | Damage (**DMG**) |
| Knaller | — | critical hit |
| „Deinen Mumm zusammenraffen" | — | „Muster your Moxie" (Neuwurf) |
| Hindernis-Terrain / Gebiet-Terrain | — | obstacle / feature |
| Überfall | — | Ambush (nur Üble Nachbarn) |
| Fluch | — | Curse (nur Üble Nachbarn) |
| Rolle / Aufstellbares | — | Role / Deployable (nur Toller Trödel) |

Auf der Bösewicht-Aktionskarte heißen die drei Abschnitte **Ziel** → *(Pfeil-Symbol,
im Video „Randale" genannt; im engl. Regelwerk „Move/Act")* → **Nachspiel**
(Aftereffect) `[Aktionskarten-DE]`, `[BR S.15]`, `[E02 03:55]`.
`⚠️ UNSICHER:` Ob „Randale" tatsächlich als Wort auf der Karte steht, ließ sich
nicht belegen — im Textlayer der deutschen Karten steht dort nur ein Symbol.

### 1.2 Partiegrundgerüst

- Eine Partie = **4 Runden**. Jede Runde = **Dorfphase + Kampfphase**.
  Der **4. Bösewicht ist der Endgegner** („Final Fight"); es gibt **keine
  zusätzliche 5. Runde** `[BR S.10]`, `[E01 08:41]`.
- Besiegt die Gruppe alle 4 Bösewichte, hat sie gewonnen `[BR S.10]`.
- **3-Runden-Modus** (offiziell empfohlen für kürzere Partien) `[EXP S.4]`:
  - 3-Runden-Marker auf das **erste** Feld der Bösewicht-Leiste, **kein** Bösewicht-Plättchen dorthin.
  - Die Partie beginnt mit der **zweiten** Dorfphase; erste Dorf- und Kampfphase (Stufe Tunichtgut) entfallen.
  - Jeder Dörfler startet mit **15** statt 10 Münzen.

### 1.3 Welche Regelfassung gilt?

Das englische Basis-Regelwerk im TTS-Mod ist die **1. Edition**. Die deutsche
Ausgabe (Frosted Games), die im Video gespielt wird, entspricht dem **2.-Edition-Stand**.
Die Unterschiede stehen gesammelt in `[EXP S.4]` und werden im Video genau so
gespielt — sie sind damit doppelt belegt:

1. **Laden füllt sofort nach:** Wird Ausrüstung gekauft (oder anders entfernt),
   wird die Lücke **sofort** aus dem Nachschubstapel aufgefüllt
   `[EXP S.4]`, bestätigt `[E01 57:16]`. (1. Ed.: Auslage blieb lückenhaft.)
2. **Laden-Reset jederzeit:** Der Reset (2 Münzen pro Dörfler) darf **in jedem
   Spielerzug** erfolgen, auch nachdem schon gekauft wurde `[EXP S.4]`.
   (1. Ed. `[BR S.11]`: nur *vor* jeder Kaufaktion.)
3. **„Deinen Mumm zusammenraffen" (Neuwurf):** Im Kampf darf ein Dörfler nach
   einem **Angriffs- oder Terrainwurf** 2 MUMM zahlen und den Wurf wiederholen.
   Der neue Wurf gilt. Maximal 1× pro Wurf `[EXP S.4]`, `[CS-DE]`, `[E02 28:22]`.
4. **Formulierung „Behalte diese Karte vor der Gruppe"** statt vor einem einzelnen
   Dörfler `[EXP S.4]`.
5. **3-Runden-Modus** (siehe oben).

> **Für die Engine gilt der 2.-Edition-Stand.**

---

## 2. Partieaufbau

### 2.1 Standardaufbau (gilt auch solo) `[BR S.6]`

1. **Hauptplan** auslegen. Er trägt das aufgedruckte Raster (Spalten **A–S**,
   Zeilen **1–14**) `[BR S.13]`. **Zusatz-Brett rechts daneben, Seite „Dorf-Phase"
   nach oben.**
2. Schachtel griffbereit halten; Dorf-Ereignisse, Heldentaten und die halbe
   Nachschub-Ausrüstung in Reichweite legen.
3. **Alle Bösewicht-Plättchen verdeckt mischen, vier zufällig ziehen** und auf die
   Bösewicht-Leiste des Hauptplans legen. Die vier Plätze tragen die Stufen
   **CHUMP → HOOLIGAN → TROUBLEMAKER → FINAL FIGHT**
   (dt. sinngemäß Tunichtgut → Rüpel → Unruhestifter → Endkampf).
   Die restlichen Plättchen gehen **ungesehen** zurück in die Schachtel — kein
   Ausschlussverfahren `[E01 09:32]`.
4. Jeder Spieler wählt einen Dörfler, nimmt dessen Karte und setzt auf **jeder
   Werteleiste** (LEB, BEW, MUMM, PRZ) einen Marker auf die farbig hervorgehobene
   **Startzahl** `[BR S.6-7]`.
5. Jeder Dörfler erhält **10 Münzen** (15 im 3-Runden-Modus) und die
   **Startausrüstung**, die unten auf seiner Dörfler-Karte steht `[BR S.6]`.
6. Dörfler-Plättchen in frei gewählter Reihenfolge auf die **„Wer ist dran?"-Leiste**.
7. **Drei Stapel mischen und bereitlegen:** Dorf-Ereignisse, Nachschub-Ausrüstung,
   Heldentaten `[BR S.6]`.

Optional: **Max-LEB-Stopper.** Ein roter Marker auf dem Feld **über** dem
Maximum-LEB, damit Heilung nie darüber hinausgeht `[BR S.7]`, `[E01 16:08]`.

### 2.2 Solo-Besonderheiten

**Offizielle Soloregel (englisches Regelwerk)** `[BR S.30]`:

> „For the solo variant, you control **3 townsfolk** at once. **All rules and
> setup remain the same**, but **secret events are removed** from the Town Event
> deck at the start of the game."

Also: Solo = **ein Spieler steuert genau 3 Dörfler**; für Bösewicht-Werte,
Endkampf-Terrain usw. zählen **3 „controlled townsfolk"**, d. h. die **3P-Spalte**
(§5.4). Geheime Dorf-Ereignisse (roter Balken) werden **vor Partiebeginn
aussortiert** — sie ergeben ohne Mitspieler keinen Sinn `[E01 25:36]`.
Dieselbe Streichung gilt, wenn ein Spieler in einer Mehrspielerpartie mehr als
einen Dörfler steuert `[E01 26:01]`.

**Drei Abweichungen, die das deutsche Regelvideo zusätzlich nennt** — sie stehen
**nicht** im englischen Regelwerk (dort heißt es ausdrücklich „all rules remain
the same"). Sie stammen vermutlich aus dem ausführlicheren Solo-Abschnitt der
deutschen Ausgabe. `⚠️ UNSICHER — vor der Automatisierung gegen die deutsche
Regelbeilage prüfen.`

| # | Regel laut Video | Beleg |
|---|---|---|
| S1 | **Heldentaten:** statt 3 verdeckter pro Dörfler liegen **6 gemeinsame, offene** Heldentaten aus. Wer eine erfüllt, nimmt sie an sich; in der nächsten Dorfphase wird wieder auf **6** aufgefüllt. | `[E01 43:47]`, `[E01 44:00]` |
| S2 | **Münzen:** **ein gemeinsamer Topf**. Bei 3 Dörflern also 30 Münzen zu Beginn — und ausdrücklich **auch alles später erworbene Geld**. Das Video merkt an, die deutsche Regel lasse das offen, die englische stelle klar, dass *alle* Münzen gemeinsam verwaltet werden. | `[E01 54:43]`, `[E02 15:02]` |
| S3 | **Ausrüstungstausch:** Dörfler dürfen in der **Dorfphase** Ausrüstung frei untereinander tauschen — **außer Startausrüstung**. Im Kampf nicht. | `[E01 20:04]`, `[E01 44:41]` |

Zum Vergleich die Regelwerkslage: „Townsfolk cannot trade gear with one another,
although some Town Events will allow townsfolk to exchange gear" `[BR S.8]`.
S3 widerspricht dem also direkt. Das Video nennt S3 als **Variante**
(„Tauschmodus"), die man optional zuschalten kann und die solo ohnehin sinnvoll
ist `[E01 19:57–20:16]`.

**Empfehlung für die Engine:** S1–S3 als **abschaltbare Solo-Optionen** führen,
Voreinstellung = wie im Video (S1, S2, S3 aktiv), weil die Partie sonst
mechanisch entkernt ist (verdeckte Heldentaten und getrennte Geldbeutel haben
solo keine Funktion).

---

## 3. Rundenstruktur und Reihenfolge

```
Runde 1..4:
  Dorfphase (Zusatz-Brett Seite „Dorf-Phase")
     1 Heldentaten auffüllen
     2 Dorf-Ereignisse
     3 Tante Emmas Laden
     4 Auslage abräumen → Brett wenden → Bösewicht aufdecken
  Kampfphase (Zusatz-Brett Seite „Kampf-Phase")
     Aufbau → Kampf → Nachbereitung
```

**„Wer ist dran?"-Leiste** `[BR S.10]`:

- **Von unten nach oben = Kaufreihenfolge (Buyin' Order)** — gilt für alles in
  der Dorfphase.
- **Von oben nach unten = Kampfreihenfolge (Beatin' Order)** — gilt im Kampf.
- Der **Bösewicht steht im Kampf immer ganz oben** und ist **immer zuerst dran**.
- **Nach jedem Kampf rotiert die Leiste:** der oberste Dörfler wandert nach unten,
  alle anderen rücken einen Platz auf `[BR S.20]`, `[E02 1:04:38]`.

---

## 4. Die Dorfphase (4 Schritte, links nach rechts)

Die Schritte sind auf dem Zusatz-Brett aufgedruckt und werden **strikt in dieser
Reihenfolge** abgearbeitet `[BR S.10]`, `[CS-DE]`, `[E01 40:11]`.

### Schritt 1 — Heldentaten auffüllen

**Regulär** `[BR S.10]`: Jeder Dörfler zieht **verdeckt auf 3 unerfüllte
Heldentaten auf**. In der ersten Dorfphase zieht jeder schlicht 3.

**Solo (laut Video, S1):** eine **gemeinsame offene Auslage von 6** Heldentaten;
Nachziehen bis wieder 6 offen liegen `[E01 43:47]`.

**Wie Heldentaten funktionieren** `[BR S.10]`, `[E01 40:57]`:

- Jede Karte nennt ein **Ziel** („Sei der erste Dörfler, der im Kampf
  ausgeschaltet wird", „Beende deinen Zug angrenzend zum Bösewicht", …), eine
  **Belohnung** (Münzen **oder** Schaden am Bösewicht **oder** Werteerhöhung) und
  **Heldenpunkte**.
- Erfüllt ein Dörfler das Ziel **nachdem** er die Karte erhalten hat, deckt er sie
  **sofort** auf, nimmt sie vor sich und kassiert die Belohnung **sofort**.
- Heldentaten können **in der Dorfphase genauso wie im Kampf** erfüllt werden —
  immer alle Texte prüfen `[E01 46:04]`.
- Erfüllte Heldentaten liegen offen vor ihrem Erfüller.
- **Zwei Auswertungen:**
  - **Am Ende jedes Kampfes:** Wer in *dieser Runde* die **meisten Heldentaten
    (Anzahl, nicht Punkte)** erfüllt hat und **nicht ausgeschaltet** wurde,
    bekommt die Bösewicht-Beute (§9).
  - **Vor dem Endkampf:** Wer die **höchste Summe an Heldenpunkten** hat, wird
    **Sheriff** (§10.2).
- Am Ende jedes Kampfes dürfen **unerfüllte** Heldentaten abgeworfen werden, die
  man nicht behalten will `[BR S.20]`.
- Auflösungsreihenfolge bei mehreren gleichzeitig: **first come, first served**
  `[BR S.30 FAQ]`.

### Schritt 2 — Dorf-Ereignisse

- **Jeder Dörfler zieht genau eine Dorf-Ereignis-Karte** und löst sie **laut** in
  **Kaufreihenfolge (unten → oben)** auf `[BR S.11]`, `[E01 45:26]`.
- Verlangt das Ereignis einen Wurf, wird **ein W10** geworfen. Steht „Wirf
  (+ max. BEW)", wird der entsprechende Wert addiert `[BR S.11]`.
- Ereignisse können gut **oder** schlecht sein und sich auch auf **andere**
  Dörfler beziehen als den, der gezogen hat `[E01 51:47]`.
- **Werteänderungen lesen** `[E01 47:08]`:
  - Wert **auf schwarzem Grund** → **dauerhaft**, auch für alle folgenden Runden.
  - Wert **ohne schwarzen Grund** → gilt **nur für den nächsten Kampf**; danach
    auf den Ausgangswert zurücksetzen.
  - Steht „nur für einen Zug" o. ä. → entsprechend kürzer.
- **Geheime Ereignisse** (roter Balken oben) bleiben verdeckt beim Ziehenden und
  lösen erst aus, wenn die auf der Karte genannte Bedingung eintritt — auch über
  mehrere Runden hinweg, und auch wenn der Dörfler ausgeschaltet ist
  `[BR S.11]`. **Solo werden sie vor Partiebeginn aussortiert** (§2.2).
- Danach wird die Karte abgeworfen.

### Schritt 3 — Tante Emmas Laden

- Zu Beginn des Schritts werden die **obersten 10 Karten** des Nachschubstapels
  offen auf das Dorf-Phase-Brett gelegt `[BR S.11]`, `[E01 53:56]`.
- In **Kaufreihenfolge** darf jeder Dörfler in seinem Zug **entweder eine
  Ausrüstung kaufen oder eine verkaufen** — dann ist der Nächste dran. Der Zyklus
  wiederholt sich, bis niemand mehr will `[BR S.11]`.
- **Kaufen:** Preis steht am rechten Rand der Karte.
- **Verkaufen:** Man erhält **die Hälfte des Werts, abgerundet**.
  **Startausrüstung kann nicht verkauft werden** `[BR S.11]`, `[E01 55:16]`.
- **Nachfüllen (2. Ed.):** Jede gekaufte/entfernte Karte wird **sofort** ersetzt
  `[EXP S.4]`, `[E01 57:16]`.
- **Laden-Reset:** Die Gruppe darf gemeinsam **2 Münzen pro Dörfler** zahlen
  (Aufteilung frei, aber **alle** müssen zustimmen), um die gesamte Auslage
  abzuwerfen und 10 neue Karten auszulegen. **Höchstens einmal pro Dorfphase.**
  Nach 2. Ed. in jedem Spielerzug möglich `[EXP S.4]`; nach 1. Ed. nur vor allen
  anderen Ladenaktionen `[BR S.11]`. Solo mit 3 Dörflern kostet das **6 Münzen**
  `[E01 1:02:01]`.
- **Ausrüstung anlegen/ablegen ist in der Dorfphase jederzeit und kostenlos**
  möglich `[BR S.8]`, `[E01 1:00:45]`.

### Schritt 4 — Auf in den Kampf

Genau diese Reihenfolge `[E01 1:07:34]`:

1. **Gesamte Ladenauslage abräumen** und **unter** den Nachschubstapel legen `[BR S.10]`.
2. **Zusatz-Brett auf die Kampf-Phase-Seite wenden.**
3. **Oberstes noch verdecktes Bösewicht-Plättchen aufdecken** (von oben nach
   unten) und **ganz oben auf die „Wer ist dran?"-Leiste** legen `[BR S.11]`.

---

## 5. Kampfaufbau

Reihenfolge nach `[BR S.12]` und `[CS-DE]`; Video bestätigt sie `[E01 1:08:08]`.

### 5.1 Schritte

1. Zusatz-Brett auf **Kampf-Phase** gewendet.
2. **Nächsten Bösewicht** von der Bösewicht-Leiste aufdecken, Plättchen **oben
   auf die „Wer ist dran?"-Leiste**.
3. **Bösewicht-Tableau** auf das dafür vorgesehene Feld des Zusatz-Bretts legen.
   **Aktionsdeck des Bösewichts mischen** und darunter ablegen. Jeder Bösewicht
   hat **15 Aktionskarten** `[BR S.15]`.
4. **Schlachtfeld aufbauen:** Die **Rückseite des Bösewicht-Tableaus** zeigt eine
   Rasterkarte (A–S / 1–14) mit den Positionen aller Terrain-Teile. Diese Teile
   werden auf den Hauptplan gelegt `[BR S.12]`.
   - **Felder mit `FF` sind Terrain, das NUR im Endkampf platziert wird**
     `[BR S.12]` — bei den Bösewichten 1–3 also ignorieren.
   - **Der obere Teil der Tableau-Rückseite (Rasterkarte, T-/R-Felder, Terrainliste)
     gilt für JEDEN Kampf gegen diesen Bösewicht**, nicht nur für den Endkampf.
     Nur der **untere Textabschnitt** (Endkampf-Setup, Sonderfähigkeiten,
     HOW TO WIN, THE RESULTS) gilt ausschließlich, wenn dieser Bösewicht der
     vierte ist `[BR S.12]`, `[BR S.21]`, `[E01 1:09:02]`, `[E01 1:13:05]`.
     (Das Banner „FINAL FIGHT" steht auf allen Rückseiten und bezeichnet nur
     diesen unteren Abschnitt.)
5. **Für jedes ausliegende Terrain-Teil die passende Terrain-Karte** unter das
   Schlachtfeld legen `[BR S.12]`.
6. **Dörfler-Startpositionen:** Die Rasterkarte zeigt **5 mit `T` markierte
   Felder**. Die Dörfler wählen **in Kampfreihenfolge (oben → unten)** je eine
   davon aus `[BR S.12]`, `[E01 1:12:01]`.
7. **Bösewicht auf das Feld `R`** stellen, **mit Blick auf den nächstgelegenen
   Dörfler** `[BR S.12]`, `[E01 1:11:52]`.
8. **BEW und LEB des Bösewichts markieren** — siehe §5.4.
9. **Falls Endkampf:** zusätzlich die Anweisungen im unteren Abschnitt der
   Rückseite abarbeiten (§10).
10. **Falls Üble Nachbarn:** Überfall-Karte(n) lesen und neben das Kampfbrett
    legen (§12.2).

**Der Kampf beginnt mit dem Zug des Bösewichts** `[BR S.12]`.

### 5.2 Stufen-Fähigkeit des Bösewichts

Auf welchem der vier Leistenplätze der Bösewicht lag, bestimmt, **welche seiner
vier Fähigkeiten** er für den **ganzen Kampf** erhält `[BR S.14]`:

| Platz | Stufe | Wirkung |
|---|---|---|
| 1 | **CHUMP** (Tunichtgut) | meist reiner Flavourtext, keine Zusatzfähigkeit |
| 2 | **HOOLIGAN** (Rüpel) | eine Zusatzfähigkeit |
| 3 | **TROUBLEMAKER** (Unruhestifter) | stärkere Zusatzfähigkeit |
| 4 | **FINAL FIGHT** (Endkampf) | verweist auf die Rückseite → Endkampfregeln |

Beispiel Handsy: CHUMP „Mediocre Monster" (nichts), HOOLIGAN „Fabled Fighter"
(alle Aktionen mit ‚1000' im Namen +1 AUA), TROUBLEMAKER „Folklore Frenzy"
(zusätzlich Ausrüstung entfernen) `[Tableau Handsy]`.

### 5.3 Schwäche und Beute

- Jedes Bösewicht-Tableau nennt eine **Schwäche (Weakness)**, die unter
  bestimmten Bedingungen — meist durch eine Bösewicht-Aktion — aktiviert wird.
  Ist sie aktiv, wird sie markiert und ihr Effekt gilt `[BR S.14]`, `[E01 1:17:31]`.
- Unten auf dem Tableau stehen die **3 Bösewicht-Ausrüstungen**, die man erbeuten
  kann. Die mit **(★)** markierte kann zusätzlich **während** des Kampfes durch
  einen Knaller-Wurf von 9+ erlangt werden (§7.4) `[BR S.8]`, `[BR S.30 FAQ]`.

### 5.4 Bösewicht-Werte (BEW und LEB) — **die geklärte Frage**

**Regel:**

> „Mark the Ruffian's starting health (HP) and movement (MVMT). These stats are
> **shown on the front of the Ruffian card**, and **vary with the number of
> controlled townsfolk**." `[BR S.12]`
>
> „A Ruffian's MVMT/HP **changes depending on the number of controlled
> townsfolk**." `[BR S.14]`

Auf dem Tableau stehen darum vier Spalten **2P / 3P / 4P / 5P**.
**Solo mit 3 Dörflern ⇒ immer die 3P-Spalte** („controlled townsfolk", nicht
Spieleranzahl — das Regelwerk formuliert es ausdrücklich so).

Ein Bösewicht **kann nicht über seinen Start-LEB hinaus geheilt werden** `[BR S.14]`.

**Die vermeintliche Formel-Regel ist eine Karteneigenschaft eines einzigen
Bösewichts, keine Regel des Basisspiels oder einer Erweiterung.** Beleg:

- Auf **Barry Bluff**s Tableau steht anstelle von Zahlen wörtlich
  `[Tableau Barry_Bluff, Vorderseite]`:
  - **MVMT:** „Equal to the highest MVMT among townsfolk at start of fight, **plus 1**."
  - **HEALTH:** „Equal to HP total of all townsfolk combined at start of fight, **plus 3**."
  - **AMBUSH:** „Begin the fight with the ‚Maskless' and ‚Mask Straps' action cards in play."
- **Barry Bluff = „Viktor Visage"**, der Bösewicht aus dem Regelvideo. Belegt
  dreifach: (a) das deutsche Aktionsdeck `FN_Action_deck_NormalPrint_FRONT_DE`
  enthält 13 Karten mit der Fußzeile **„VIKTOR VISAGE"**; (b) Barry Bluffs
  Hintergrundgeschichte (erfolgloser Schauspieler, Skalpell, gesammelte Masken,
  Gildenmeister, eigene Mutter) deckt sich wörtlich mit der im Video vorgelesenen
  `[E01 1:09:20]`; (c) die beiden Überfallkarten heißen im Video genau
  „Maskless" und „Mask Straps" `[E01 1:16:04]`.
- Barry Bluff trägt oben links das Kürzel **FN** — er gehört zu **Üble Nachbarn**.
- **Alle übrigen 19 Bösewichte** (11 aus dem Basisspiel, 7 aus Üble Nachbarn)
  haben **fest gedruckte Zahlen** in den Spalten 2P/3P/4P/5P. Einzeln geprüft:
  - Basisspiel `[Z:\Austausch\TfT\*.pdf]`: Bort Dovis, Bundits, Deputy Waggums,
    Handsy, Lawman Dozy, Penny Pinchetti, Virginia Fitz, Will Barlow.
  - Üble Nachbarn `[Z:\Austausch\TfT\*.pdf]`: Ernie Offal, Red Atrocious,
    Tilda Fields (alle mit FN-Kürzel **und** Zahlen **und** Überfall-Zeile).
  - TTS-Mod `[scratchpad/tableaus/]`: Qing & Kween, Umbrello, Samuel Strawman,
    Pepin Milkfrog (Basis) sowie The Door Knockers, Tartar Fishboy,
    Ms. Falls & Co., Patches (FN) — alle mit Zahlen.

**Fazit:** Die frühere Vermutung („Basisspiel gedruckt, Üble Nachbarn Formel")
ist **widerlegt**. Es gibt **keine** Erweiterungsregel dieser Art. Die Formel ist
Barry Bluffs / Viktor Visages persönlicher Kartentext. Die Engine muss die
Bösewicht-Werte daher **pro Bösewicht als Datenfeld** führen, das entweder eine
4er-Zahlentabelle **oder** eine Formel enthält.

Zwei weitere, ähnlich gelagerte Sonderfälle existieren:

- **Ms. Falls & Co.:** Ms. Falls selbst hat gedruckte Werte (BEW 4/4/5/5,
  LEB 13/17/20/23), ihre Begleiter („The Company") beginnen laut Tableautext mit
  „**3 HP per townsfolk**" und sind das eigentliche Angriffsziel
  („Defeat The Company! Be sure not to let Ms. Falls die") `[Tableau Ms. Falls & Co.]`.
- **Patches:** hat mit LEB 1/2/2/3 absurd wenige Lebenspunkte — der Kampf läuft
  stattdessen über seine **Kostümteile** und die Überfallkarte „9 lives"
  `[Tableau Patches]`, `[FN S.7]`.

### 5.5 Bösewichtstatistik (alle 20)

BEW und LEB, Reihenfolge **2P / 3P / 4P / 5P**. *Solo relevant: Spalte 3P.*
Quelle jeweils das Tableau. Deutsche Namen aus den deutschen Aktionsdecks.

**Basisspiel (12):**

| Bösewicht (EN) | Deutsch | BEW | LEB | Überfall |
|---|---|---|---|---|
| Bort Dovis | Bert Doofis | 7/7/8/8 | 11/15/18/21 | – |
| The Bundits | Die Karnoven | 6/6/7/7 | 11/15/18/21 | – |
| Deputy Waggums | Willi Wedler | 6/6/7/7 | 12/14/17/20 | – |
| Handsy | Truthand | 7/7/8/8 | 11/14/18/21 | – |
| Lawman Dozy | Schnarchbert | 5/6/6/6 | 12/14/18/21 | – |
| Penny Pinchetti | Penny Gönnzales | 7/7/8/8 | 12/15/18/21 | – |
| Virginia Fitz | Viktoria Spitz | 5/6/6/7 | 12/15/18/21 | – |
| Will Barlow | Jupp Karre | 7/7/7/7 | 11/14/17/20 | – |
| Qing & Kween | Nönigin & Könich | 6/6/7/7 | 11/14/17/20 | – |
| Umbrello | Fürst Wetternich | 6/6/7/7 | 11/14/17/20 | – |
| Samuel Strawman | Rüdiger Schreck | 6/7/7/8 | 11/15/18/21 | – |
| Pepin Milkfrog | Freddy Froschmilch | 6/6/7/7 | 11/14/17/20 | – |

**Üble Nachbarn (8):**

| Bösewicht (EN) | Deutsch | BEW | LEB | Überfall |
|---|---|---|---|---|
| Barry Bluff | Viktor Visage | **höchste Dörfler-BEW +1** | **Summe aller Dörfler-LEB +3** | „Maskless" + „Mask Straps" |
| Ernie Offal | Arnold Schmatz | 5/5/5/5 | 12/18/21/24 | „Prepare the Main Course" |
| Red Atrocious | Dr. Bosskop | 5/6/8/8 | 13/17/20/24 | „Plaguebearer" |
| Tilda Fields | Thea Kotta | 2/3/3/4 | 10/15/20/24 | „Living Garden" |
| Tartar Fishboy | Fritze Fischkopp | 9/9/9/9 | 13/17/20/23 | „Angry Angler" |
| The Door Knockers | Die weissen Herren | 5/5/6/7 | 10/15/18/21 | „One of Us" |
| Ms. Falls & Co. | Rosa Voir & die WG | 4/4/5/5 | 13/17/20/23 (die „Company" beginnt mit **3 LEB je Dörfler** und ist das eigentliche Angriffsziel) | „Shocking Guests" |
| Patches | Fleckchen | 7/8/8/9 | 1/2/2/3 (Kostümteile ersetzen LEB) | „9 lives" |

`⚠️ UNSICHER:` Die Zuordnung *Deputy Waggums = Willi Wedler* und
*Handsy = Truthand* ist aus der Bedeutung erschlossen (wag → wedeln; Hand →
Truthand), nicht direkt belegt. Alle übrigen Zuordnungen sind über Artwork,
Aktionstexte oder Story eindeutig.

---

## 6. Kampfablauf

### 6.1 Zugreihenfolge

- **„Wer ist dran?"-Leiste von oben nach unten.** Der **Bösewicht steht oben und
  ist immer zuerst dran** `[BR S.10]`, `[E02 01:53]`.
- Danach reihum die Dörfler, dann wieder von oben.
- Der Bösewicht kann **zusätzlich zu seinem Leistenplatz** aktiviert werden,
  wenn eine Karte, Fähigkeit oder ein **Wutangriff** das ausdrücklich sagt
  `[E02 02:11]`.
- **Keine Diagonalen.** Bewegung, Reichweite und **jede** Entfernungsmessung
  erfolgt ausschließlich **orthogonal** (waagerecht/senkrecht)
  `[BR S.30 FAQ]`, `[E01 1:12:46]`.
- **Ein einziger W10** wird für alles verwendet: Dorf-Ereignisse, Angriffe,
  Terrain, Bösewicht-Aktionen `[BR S.30 FAQ]`.

### 6.2 Zug des Bösewichts

**Der ganze Zug besteht darin, die oberste Karte des Aktionsdecks aufzudecken und
von oben nach unten abzuarbeiten** `[BR S.15]`.

Kartenaufbau `[BR S.15]`:

1. **Name + Flavourtext.**
2. **Ziel (Target)** — wird **zuerst und für die ganze Karte** bestimmt.
3. **Randale / Move-Act** *(Pfeil-Symbol)* — Bewegung und Hauptaktion.
4. **Nachspiel (Aftereffect)** — greift nur, wenn das **Ziel Schaden genommen**
   hat, oder wenn die Karte etwas anderes ausdrücklich nennt. Nicht jede Karte
   hat eins.

**Zielbestimmung** `[BR S.16]`:

- Häufige Ziele: **nächster Dörfler**, **fernster Dörfler**, **schwächster
  Dörfler** (niedrigste aktuelle LEB), **alle Dörfler im Umkreis von 2 Feldern**,
  **kein Ziel**.
- Entfernung = **erforderliche Bewegungspunkte**, orthogonal gemessen. Andere
  Dörfler im Weg zählen **nicht** als Hindernis, weil der Bösewicht sie wegrempelt
  `[E02 06:20]`. **Hindernis-Terrain** verlängert den Weg dagegen sehr wohl
  `[E02 06:35]`.
- Auch ein **unerreichbares** Ziel wird gewählt — der Bösewicht bewegt sich dann
  trotzdem in seine Richtung `[BR S.16]`.
- **Gleichstand:** Die betroffenen Dörfler würfeln; **der niedrigste Wurf ist das
  Ziel** `[BR S.16]`, `[E02 12:37]`.
- Eine Aktion wird **vollständig** abgearbeitet, **auch wenn es kein gültiges Ziel
  gibt** `[BR S.16]`.

**Bewegung des Bösewichts** `[BR S.15-16]`:

- BEW = Höchstzahl an Feldern pro Aktion. **Der Bösewicht belegt selbst 4 Felder**;
  jeder BEW-Punkt verschiebt ihn um **ein** angrenzendes Feld `[BR S.15]`,
  `[E02 05:33]`.
- Er **dreht sich zum Ziel** und nimmt den **kürzesten Weg**.
- Gibt es **mehrere gleich kurze Wege**, **wählen die Spieler** `[BR S.15]`.
- Würde ein Weg ihm **Schaden zufügen**, muss er ihn **meiden** `[BR S.15]`.
- **Hindernis-Terrain** kann er nicht durchqueren, **Gebiet-Terrain** schon
  `[BR S.15]`.
- **„Bewege dich vorwärts":** Er dreht sich zum Ziel und geht dann BEW Felder
  geradeaus. Bei perfekter Diagonale wählen die Spieler die Richtung. Stößt er
  dabei auf undurchdringliches Terrain, **endet die Bewegung** `[BR S.16]`.
- **Platzieren ≠ Bewegen:** Wird jemand **platziert**, kommt er unabhängig von der
  Entfernung **direkt** auf das genannte Feld; BEW spielt keine Rolle. Ist das
  Feld besetzt, kommt er auf das nächstmögliche `[BR S.15]`.

**Rempeln (Collision)** `[BR S.15]`, `[E02 09:25]`:

- Zieht der Bösewicht auf ein Feld mit einem Dörfler, wird dieser **auf ein
  angrenzendes Feld seiner Wahl geschoben**.
- Das **kostet den Bösewicht keine zusätzliche Bewegung**, und der geschobene
  Dörfler **verliert keine eigenen Bewegungspunkte**.
- Das kann **mehrfach pro Aktion** passieren — und ist für die Dörfler oft
  **nützlich**, weil man sich gratis umpositionieren kann.
- Ist kein angrenzendes Feld frei, kommt der Dörfler auf das **nächstmögliche
  Feld**, das weder von Dörfler, Bösewicht noch Hindernis besetzt ist.

**Fernangriffe des Bösewichts:** Aktionen, die als „ranged attack" ausgewiesen
sind, brauchen das Ziel in der genannten Reichweite. **Anders als Dörfler
ignorieren Bösewichte dabei Hindernisse** — sie treffen auch durch Sichtblocker
hindurch `[BR S.15]`.

**Aktionsdeck leer:** Ablagestapel mischen und als neues Deck verwenden. Manche
Aktionen verlangen ausdrücklich ein Neumischen — dann wird der gesamte
Ablagestapel eingemischt `[BR S.15]`.

**Karten, die liegen bleiben:** „Behalte diese Karte vor der Gruppe / vor dem
Dörfler" — solche Karten gehen **nicht** auf den Ablagestapel, sondern bleiben
liegen, bis sie auslösen `[BR S.16]`, `[EXP S.4]`.

### 6.3 Zug eines Dörflers

Ein Dörfler darf in **beliebiger Reihenfolge** und **beliebig verschränkt** alles
tun, wofür er noch BEW und MUMM hat `[BR S.18]`, `[CS-DE]`:

| Aktion | Kosten / Grenze |
|---|---|
| **Bewegen** | 1 BEW = 1 orthogonal angrenzendes Feld |
| **Angreifen** | MUMM-Kosten der Waffe; **jede Waffe max. 1× pro Zug** |
| **Terrain-Interaktion** | MUMM- oder Münzkosten der Terrain-Karte; **max. 1× pro Terrain-Teil pro Zug** |
| **Ausrüstungsfähigkeit aktivieren** | wie angegeben; **jede max. 1× pro Zug** |
| **Dörfler-Fähigkeit aktivieren** | meist MUMM; **jede max. 1× pro Zug** |
| **Ausrüstung auswechseln** | **2 MUMM** |
| **Mumm zusammenraffen (Neuwurf)** | **2 MUMM**, max. 1× pro Angriffs-/Terrainwurf |
| **Aufstellbares platzieren** (Toller Trödel) | keine Kosten, auf ein leeres angrenzendes Feld |

**Bewegung** `[BR S.18]`, `[E02 15:56]`:

- BEW ist ein **Vorrat pro Zug**, kein Wert, der abgebaut wird. **Den Marker auf
  der BEW-Leiste nicht verschieben** — er zeigt nur, wie viel man **jeden** Zug hat.
- Die Bewegung ist **frei aufteilbar**: 2 Felder gehen, angreifen, 2 Felder gehen.
  **Aktionen verbrauchen keine Bewegungspunkte** `[E02 16:48]`.
- **Dörfler dürfen durcheinander hindurchgehen, aber nicht durch den Bösewicht**
  `[BR S.18]`.

**Mumm (MUMM) = Aktionspunkte** `[BR S.7]`, `[E02 21:31]`:

- MUMM ist ebenfalls ein **Vorrat pro Zug**. Auch hier den Marker **nicht**
  verschieben; man rechnet mit.
- Der Marker wird **nur** bei **dauerhaften** Wertänderungen verschoben
  (Ausrüstungsbonus mit schwarzem Kasten, Effekte ohne „nur für diesen Zug").
- Gilt ein Bonus laut Text **nicht** nur „für diesen Zug", **gilt er für den
  ganzen Kampf** `[E02 22:36]`.

**Ausrüstung im Kampf** `[BR S.18]`:

- **Anlegen/Tauschen kostet 2 MUMM.** Die bisher in dem Slot liegende Ausrüstung
  wird weggepackt. Beliebig oft pro Zug. **Beide Handslots zählen als eine
  Aktion** — z. B. zwei Einhandwaffen ablegen und eine Zweihandwaffe anlegen
  kostet insgesamt 2 MUMM.
- **Weggepackte Ausrüstung wirkt nicht** — Ausnahme: **„Besondere Ausrüstung"
  (Special Gear)**; deren passive Fähigkeiten sind **immer** aktiv und
  aktivierbar, auch ungelegt `[BR S.8]`, `[E02 22:49]`.
- **Max-LEB-Feinheiten:** Legt man Ausrüstung ab, die Max-LEB gab, sinkt die
  aktuelle LEB auf das neue Maximum, man nimmt aber **keinen Schaden**. Legt man
  sie im Kampf an, **gewinnt man keine LEB** dazu.
- BEW/MUMM/PRZ-Boni wirken **sofort** beim An- bzw. Ablegen — auch noch im
  laufenden Zug.
- **Zähler auf Ausrüstung** bleiben zwischen Runden und beim Ablegen liegen
  `[BR S.18]`.

**„Tappen" (Quer legen)** — *Tischkonvention, keine gedruckte Regel*:
Ausrüstung, deren Fähigkeit „einmal pro Kampf" gilt, wird nach Gebrauch **um 90°
gedreht**, damit man sie nicht erneut nutzt. Zum nächsten Kampf wird alles wieder
gerade gelegt `[E02 27:29]`. Regeltechnisch gilt schlicht: **jede Fähigkeit max.
1× pro Zug, sofern nicht anders angegeben** `[BR S.18]`; steht „einmal pro Kampf"
auf der Karte, gilt das. **Achtung:** viele Verzehrbares-Karten des Basisspiels
sagen stattdessen **abwerfen** — die sind dann endgültig weg `[E02 27:41]`
(Odd-Jobs-Verzehrbares dagegen nicht, §11.3).

**Terrain-Interaktion** `[BR S.13]`, `[E02 17:15]`:

- **Hindernis (Obstacle, brauner Rahmen):** blockiert Bewegung für Dörfler **und**
  Bösewicht, kann nicht betreten werden. Man muss **angrenzend** stehen, um zu
  interagieren (diagonal zählt **nicht**). Manche verlangen eine **bestimmte
  Position** — z. B. „an der Tür" des Wackelhofs.
- **Gebiet (Feature, grüner Rahmen):** blockiert nichts, kann durchquert werden.
  Man muss **darin stehen**, um zu interagieren.
- Interaktion kostet den auf der **Terrain-Karte** angegebenen MUMM- oder
  Münzpreis; **pro Terrain-Teil max. 1× pro Zug**.
- Manches Terrain hat Extrakosten für Betreten (z. B. Dichter Wald: **2 BEW pro
  Feld** — gilt **nicht** für Bösewichte und nicht für Bewegung durch
  Ausrüstung/Fähigkeiten) `[BR S.13]`.
- Einige Terrain-Teile lassen sich **zerstören oder umwandeln** (Matschiger
  Graben → Schlammgraben, Zaun einreißen, TNT zünden); manche darf man auch
  **angreifen** (z. B. das Plumpsklo) und richtet dann Flächenschaden an
  `[E02 18:36]`, `[E02 19:59]`, `[E02 43:56]`.

### 6.4 Angreifen

**Ablauf** `[BR S.18-19]`:

1. **In Reichweite kommen.** Nahkampfwaffen haben Reichweite **1** = orthogonal
   angrenzend, sofern nichts anderes dasteht. Fernkampfwaffen nennen
   „Reichweite: X".
2. **MUMM-Kosten der Waffe zahlen.**
3. **W10 werfen und die eigene PRZ addieren.** Ist das Ergebnis **≥** dem
   ACC-Wert der Waffe, trifft der Angriff.
4. Bei Treffer erleidet der Bösewicht den **AUA-Wert** der Waffe.

- **Jede Waffe darf pro Zug einmal angreifen**, sofern nichts anderes dasteht.
  Mit zwei Einhandwaffen also zwei Angriffe `[BR S.18]`, `[E02 26:54]`.
- Man darf mit einer **Fernkampfwaffe auch im Nahkampf** angreifen `[E02 26:46]`.
- **Sichtlinie (nur für Dörfler):** **Hindernisse blockieren Fernangriffe von
  Dörflern, nicht die des Bösewichts.** Prüfung: eine **gerade Linie** von
  **irgendeinem Punkt** des Dörflerfeldes zu **irgendeinem Punkt** eines
  Bösewichtfeldes ziehen; berührt sie kein Hindernisfeld, ist der Schuss
  erlaubt `[BR S.18]`, `[E02 41:34]`. **Figuren blockieren nicht** `[E02 41:45]`.
- **Neuwurf:** nach dem Wurf 2 MUMM zahlen, neu würfeln, **neues Ergebnis gilt**,
  max. 1× pro Wurf `[EXP S.4]`, `[CS-DE]`.

**Patzer (Whiff):** Eine **natürliche 1** ist **immer ein Fehlschlag**, egal wie
hoch die PRZ ist `[BR S.18]`, `[E02 52:17]`.

**Knaller (kritischer Treffer):** Zeigt der Würfel das **Knaller-Symbol**, ist es
ein **automatischer Treffer**, zählt als Wurf **10**, und man würfelt **sofort
erneut** auf der Knaller-Tabelle `[BR S.20]`. Man soll **immer würfeln**, auch
wenn der Treffer ohnehin sicher wäre `[E02 30:26]`.

**Knaller-Tabelle** (zweiter W10) `[Crit-DE]`, `[BR Rückseite]`, `[FN S.16]`:

| Wurf | Wirkung |
|---|---|
| **1** | Dein Angriff erzürnt den Bösewicht! **Dein Zug endet sofort nach dem Angriff**, der Bösewicht führt eine Aktion aus. |
| **2-3** | Der Bösewicht ist aus der Fassung: **oberste Bösewicht-Aktion ansehen.** |
| **4-5** | Zehen zerquetscht: **-1 BEW für den Bösewicht.** |
| **6-7** | Aufgeputscht: **+1 BEW oder +1 MUMM oder +1 PRZ** (für diesen Kampf). |
| **8** | Was für ein Schlag: **+1 AUA**. |
| **9+** | Nimm dir die mit **(★)** gekennzeichnete Bösewicht-Ausrüstung; du darfst sie **sofort anlegen**. Wurde das in diesem Kampf schon aktiviert, stattdessen **+1 AUA**. |

Der Schaden des Angriffs und der Knaller-Bonus werden **gleichzeitig** zugeteilt;
ein dadurch ausgelöster Wutangriff greift erst **nach** dem Knaller-Bonus
`[BR S.20]`, `[BR S.30 FAQ]`.

### 6.5 Wutangriff (Breaking Point)

- Auf der LEB-Leiste des Bösewichts sind Schwellen mit einem Symbol markiert:
  **bei 4, 7, 12 und 18 LEB** `[BR S.20]`. Praktisch sind es die **roten Felder**
  `[E02 02:37]`.
- **Sinkt die LEB durch Schaden auf oder unter eine solche Schwelle**, tritt der
  Wutangriff ein.
- **Während eines Dörflerzugs:** Der Zug dieses Dörflers **endet sofort** —
  restliche BEW und MUMM verfallen —, der **Bösewicht führt sofort eine Aktion
  aus**. Danach geht die Reihenfolge nach dem unterbrochenen Dörfler weiter
  `[BR S.20]`, `[E02 30:50]`.
- **Während des Bösewicht-Zugs:** Er führt **nach** seinem Zug eine **Bonusaktion**
  aus `[BR S.20]`.
- **Wutangriffe können mehrfach auslösen**, wenn der Bösewicht sich über eine
  Schwelle zurückheilt und wieder darunter fällt `[BR S.20]`, `[E02 31:09]`.
  **Heilt** er sich über die Schwelle, löst das für sich **keinen** Wutangriff aus
  `[E02 31:23]`.
- Taktisch: **Timing beachten** — wer knapp vor einer roten Schwelle noch etwas
  vorhatte, sollte erst das andere tun `[E02 03:16]`.

### 6.6 Schaden, Heilung, Ausschalten, Niederlage

- **Schaden** senkt LEB. **LEB unter 1 ⇒ ausgeschaltet** und vom Feld genommen
  `[BR S.7]`, `[BR S.20]`.
- **Heilung** kann LEB nie über das **Maximum** heben `[BR S.7]`.
- **Ausgeschaltete Dörfler** bekommen bei Sieg über den Bösewicht trotzdem ihre
  Münzen, sind aber **nicht** für die Bösewicht-Beute berechtigt — egal wie viele
  Heldentaten sie erfüllt haben `[BR S.20]`.
- **Solange mindestens ein Dörfler den Kampf übersteht, werden zu Beginn der
  nächsten Dorfphase ALLE Dörfler auf volle LEB geheilt** `[BR S.20]`.
  (Ausnahme: der Fluch „Curse of the Bruised Peel", §12.3.)
- **Wertesenkungen** durch Bösewichte werden am **Ende des Kampfes** aufgehoben
  `[BR S.20]`.
- **Vom Feld entfernt:** Ein entfernter Dörfler kann **nicht als Ziel gewählt
  werden** und **keine Ausrüstung/Fähigkeiten aktivieren**. Ein entfernter
  Bösewicht kann **nicht angegriffen werden und nimmt keinen Schaden** `[BR S.20]`.
- **Niederlage:** Die Partie ist verloren, wenn **alle Dörfler ausgeschaltet** sind
  oder **alle verbliebenen Dörfler ohne Rückkehrmöglichkeit vom Feld entfernt**
  sind `[BR S.20]`. Im Endkampf zusätzlich: **der Sheriff darf nicht
  ausgeschaltet werden** (§10.2).
- **Regelkonflikte:** Widersprechen sich zwei Regeln, wird **zugunsten des
  Bösewichts** entschieden; gibt es keine solche Auslegung, entscheiden die
  Spieler nach bestem Ermessen `[BR S.30 FAQ]`.
- **Reihenfolge von Effekten:** Fähigkeiten sind **reaktiv** und lösen **sofort**
  aus. Nimmt der Bösewicht z. B. Schaden dadurch, dass er einen Dörfler als Ziel
  wählt, wird dieser Schaden **vor** dem Rest der Aktion zugeteilt `[BR S.30 FAQ]`.
- **Sich selbst** gilt man **nicht** als „angrenzenden Dörfler" — Fähigkeiten, die
  einen angrenzenden Dörfler verlangen, können nicht auf einen selbst zielen
  `[BR S.30 FAQ]`.

---

## 7. Nach dem Kampf (Bösewicht besiegt)

Sinkt die LEB des Bösewichts **unter 1**, ist der Kampf sofort vorbei
`[BR S.20]`. Dann in dieser Reihenfolge `[BR S.20]`, `[CS-DE]`, `[E02 1:00:54]`:

1. **Unerfüllte Heldentaten** dürfen abgeworfen werden (freiwillig, einzeln
   wählbar). Abgeworfene sind aus dem Spiel.
2. **Jeder Dörfler erhält 6 Münzen** (solo: in den gemeinsamen Topf, §2.2/S2).
3. **Bösewicht-Beute:** Wer in **dieser Runde** die **meisten Heldentaten
   (Anzahl, nicht Punkte)** erfüllt hat und **nicht ausgeschaltet** wurde, erhält
   **eine zufällige** der 3 Bösewicht-Ausrüstungen. **Gleichstand:** würfeln,
   höchster Wurf gewinnt.
4. **Erfüllte Heldentaten beiseitelegen** — sie zählen weiter für die
   **Sheriffwahl**, aber **nicht mehr** für die Beute-Auswertung der nächsten
   Runde. (Tipp aus dem Video: umdrehen, um sie nicht zu verwechseln
   `[E02 1:03:04]`.)
5. **Alle Dörflerwerte zurücksetzen.** Nur Wertänderungen durch **angelegte
   Ausrüstung** bleiben.
6. **Bösewicht-Material wegräumen** (Tableau, Miniatur, Aktionsdeck, kampfeigene
   Sonderausrüstung wie „Faceless"). **Trophäen und Erweiterungs-Fortschritt
   werden hier NICHT eingetragen — das geschieht erst am Partieende**
   `[E02 1:04:22]`.
7. **„Wer ist dran?"-Leiste rotieren:** Oberster Dörfler nach unten, Rest rückt auf.
8. **Zusatz-Brett zurück auf die Dorf-Phase wenden** → nächste Runde.

---

## 8. Der Endkampf (Final Fight, 4. Runde)

`[BR S.21]`

Der vierte Bösewicht kämpft nach eigenen Regeln. Der **untere Abschnitt der
Tableau-Rückseite** gilt jetzt — und **nur** jetzt.

### 8.1 Zusätzlicher Aufbau

1. **Endkampf-Setup** laut Tableau abarbeiten. Das umfasst regelmäßig:
   - **Zusätzliches Terrain** auf den mit **`FF`** markierten Feldern. Bei mehreren
     Teilen geben **`FF1`, `FF2`, …** die Reihenfolge vor. Die **Anzahl** hängt oft
     von der **Anzahl gesteuerter Dörfler** ab (solo also 3) `[BR S.21]`.
   - **Ernennung des neuen Sheriffs** (§8.2).
2. **Sonderfähigkeiten** für Bösewicht und/oder Dörfler, die nur im Endkampf gelten.
3. **„HOW TO WIN"** — die Siegbedingungen **und** ein **Sonderziel**
   (Special Objective).
4. **„THE RESULTS"** — drei Nummern: Sieg, Sieg mit Sonderziel, Niederlage.

Beispiel Handsy „The Hostile Hand Hijacking" `[Tableau Handsy, Rückseite]`:
5 Versteckte Bürger auf die `FF`-Felder; neuer Sheriff erhält die einzigartige
Ausrüstung „Warning Whistle"; Dörfler dürfen ihre BEW nutzen, um **statt sich
selbst** einen Versteckten Bürger zu bewegen; werden **alle 5** getötet,
verlieren die Dörfler.

### 8.2 Sheriffwahl

- **Beim Aufbau des Endkampfs** wird der Dörfler mit der **höchsten Summe an
  Heldenpunkten** (nicht Anzahl Karten!) zum **Sheriff** ernannt `[BR S.21]`.
- **Gleichstand:** Die Gruppe darf sich einigen; sonst würfeln die
  Gleichstehenden, der höchste Wurf wird Sheriff.
- Der Sheriff erhält eine **einzigartige Ausrüstung**, die auf dem Tableau genannt
  wird und meist der Schlüssel zum Sieg ist. Sie darf **sofort angelegt** werden.
- **Wird der Sheriff ausgeschaltet, ist die Partie sofort verloren**
  `[BR S.10]`, `[BR S.21]`. Mehrere Tableaus formulieren es präziser:
  „**du verlierst, wenn der neue Sheriff zu Beginn des Bösewicht-Zuges
  ausgeschaltet ist**" `[Tableau Handsy]`, `[Tableau Qing & Kween]`.
  `⚠️ UNSICHER:` welche Formulierung im Zweifel Vorrang hat — die des Tableaus
  ist die speziellere und sollte gelten.
- **Solo** entscheidet die Heldenpunktsumme genauso; der Sheriff ist einfach der
  Dörfler mit den meisten Punkten und muss anschließend besonders geschützt werden
  `[E01 44:54]`.

### 8.3 Sonderziel und Ergebnis

- Das **Sonderziel** zu erfüllen bringt ein **alternatives Ende** und
  **freischaltbare Ausrüstung** für künftige Partien — insbesondere die
  **alternative Startausrüstung** eines Dörflers `[BR S.8]`, `[BR S.21]`.
- Nach dem Kampf wird **genau eine** Ergebnisnummer gelesen: Sieg, Sieg mit
  Sonderziel, oder Niederlage `[BR S.22]`.

---

## 9. Erweiterung „Toller Trödel" (Odd Jobs) — Erstpartie

`[OJ S.4-10]`. Alle Komponenten tragen **`OJ`** oben links. Voll kombinierbar mit
Üble Nachbarn `[OJ S.4]`.

### 9.1 Der Laden

- **Das Basis-Nachschubdeck wird komplett ersetzt.** Die Basis-Ausrüstung (blauer
  Rand) kommt in die Schachtel `[OJ S.4]`, `[E01 26:51]`.
- **In der ersten Partie sind nur die Karten Nr. 1–30 kaufbar** (Register
  „Peddler Gear (Odd Jobs)"). Der ganze Rest liegt **ungemischt** hinter dem
  Register **„Locked (Odd Jobs)"** `[OJ S.4]`.
- Wer über Endkampf-Sonderziele bereits Nachschub-Ausrüstung freigeschaltet hat,
  darf sie in das Odd-Jobs-Deck einsortieren `[OJ S.4]`.
- Ansonsten gelten die normalen Ladenregeln (10 Karten Auslage, sofortiges
  Nachfüllen, Reset für 2 Münzen pro Dörfler).

### 9.2 Rollen (Roles)

`[OJ S.6]`

- Die meisten Odd-Jobs-Ausrüstungen tragen am **linken Rand** eine oder mehrere
  **Rollenbezeichnungen**.
- **Sobald ein Dörfler die dritte Ausrüstung derselben Rolle besitzt, erhält er
  deren Rollenkarte.** **Besitzen genügt — nicht anlegen.**
- **Jeder Dörfler kann nur eine Rolle gleichzeitig haben.**
- **First come, first served:** Hat ein Dörfler eine Rolle, kann kein anderer sie
  bekommen.
- Würde jemand zwei Rollen gleichzeitig erhalten, wählt er eine.
- **Rollenwechsel:** Erhält ein Dörfler die dritte (oder weitere) Ausrüstung einer
  **anderen** Rolle, darf er diese Rollenkarte nehmen und die alte abgeben.
- **Eine Rolle geht sonst nicht verloren** — auch nicht, wenn man die zugehörige
  Ausrüstung verkauft oder abwirft.
- Rollenfähigkeiten sind **passiv**, **aktivierbar** (dann max. 1× pro Zug) oder
  **verschaffen einzigartige Ausrüstung**.

### 9.3 Aufstellbares (Deployables)

`[OJ S.5]`

- **Kann nicht angelegt werden.** Zu jeder Aufstellbar-Karte gehört ein **Token**.
- **Im Kampf, im eigenen Zug:** Token auf ein **leeres angrenzendes Feld** legen
  (leer = kein Terrain, keine Figur, kein anderes Aufstellbares).
- Einmal platziert, kommt es **bis Kampfende nicht zurück**.
- **Max. 2 eigene Aufstellbare gleichzeitig** auf dem Schlachtfeld (Besitz selbst
  ist unbegrenzt).
- **Jeder Dörfler darf ein beliebiges ausliegendes Aufstellbares benutzen.**
  Angreifen bzw. Fähigkeiten aktivieren geht nur, wenn man **auf dem Token
  steht** — sofern die Karte nichts anderes sagt.
- Wird der Besitzer ausgeschaltet oder vom Feld entfernt, **bleibt** das Token liegen.
- Wird die Karte im Kampf **abgeworfen**, wird das Token entfernt.
- **Am Kampfende gehen alle Token an ihre Besitzer zurück.**
- **Aufstellbare gelten nicht als Terrain** und blockieren keine Bewegung.

### 9.4 Weitere Odd-Jobs-Kartentypen

- **Odd-Jobs-Verzehrbares:** wird **nicht abgeworfen**, sondern ist **einmal pro
  Kampf** nutzbar `[OJ S.5]`. (Unterschied zum Basisspiel, wo Verzehrbares meist
  endgültig weg ist.)
- **Karren-Ereignis-Ausrüstung (Cart Event Gear):** erscheint nur beim Einkaufen.
  Wird sie **außerhalb des Ladens** aufgedeckt, wird sie **abgeworfen** und durch
  die nächste Nachschubkarte ersetzt `[OJ S.5]`.
- **Schlüssel / Reparatur / Graben (Key, Repair, Dig):** Schlagworte unter dem
  Kartennamen. In Kombination mit bestimmter anderer Ausrüstung schalten sie über
  das **Händler-Journal** neue Ware frei `[OJ S.9]`.
- **Mehrere Fähigkeiten auf einer Karte:** trotzdem **nur eine pro Zug**
  aktivierbar `[OJ S.10 FAQ]`.

### 9.5 Was ohne das Händler-Journal gilt — **uns fehlt das Heft**

Das **Peddler's Journal** („Tante Emmas Notizbuch") ist ein eigenes Heft und
**liegt uns nicht vor**. Es steuert den partieübergreifenden Fortschritt:
Expeditionen mit je 3 Orten, **Vorbereitungen** (z. B. „Beende eine Partie mit
der Tüftler-Rolle"), **Sticker** am Partieende (Sieg **oder** Niederlage), und
**Journaleinträge**, die Ausrüstung **freischalten** oder **entsorgen** `[OJ S.8-9]`.

**Ohne das Journal gilt für eine Erstpartie:**

| Funktioniert vollständig | Funktioniert nicht |
|---|---|
| Odd-Jobs-Nachschubdeck **Nr. 1–30** als Laden | Expeditionen, Orte, Vorbereitungen |
| **Rollen** und Rollenkarten | Sticker am Partieende |
| **Aufstellbare** | Journaleinträge („Lies Journal XX") |
| Odd-Jobs-Verzehrbares, Karren-Ereignis-Ausrüstung | **Freischalten** und **Entsorgen** von Ausrüstung |
| Schlüssel/Reparatur/Graben **als Gegenstandstypen** | deren Auslösewirkung (verweist auf Journal-Nummern) |

**Praktische Folge:** Der Kartenpool bleibt **dauerhaft bei Nr. 1–30**; es gibt
**keinen Fortschritt zwischen Partien** über Odd Jobs. Karten mit farbigem
Balken am unteren Rand („D.I.Y. Scavenging") können ihre Freischaltwirkung
**nicht** entfalten — man kann sie benutzen, aber der Verweis ins Journal läuft
ins Leere. `⚠️ Empfehlung:` Solche Karten in der Engine als spielbar, aber mit
wirkungslosem Journal-Verweis modellieren, statt sie zu entfernen — sonst
verändert sich die Wahrscheinlichkeitsverteilung des Decks.

---

## 10. Erweiterung „Üble Nachbarn" (Foul Neighbors) — Erstpartie

`[FN S.4-5, 12-15]`. Alle Komponenten tragen **`FN`** oben links. Voll
kombinierbar mit Toller Trödel `[FN S.4]`.

### 10.1 Aufbau (einmalig und je Partie)

`[FN S.4]`

- **8 neue Bösewicht-Plättchen** in den Basis-Pool → insgesamt **20 Bösewichte**.
  Nach jeder Partie darf man sie integriert lassen oder wieder trennen.
- **2 neue Dörfler**: **Judy Marks** (dt. Frieda Paletti) und **Fridgette Jones**
  (dt. Karla Kühl). Sie sind ganz normal wählbar.
- **5 neue Dorf-Ereignisse** in den Dorf-Ereignis-Stapel mischen.
- **9 Überfall-Aktionskarten** in die jeweiligen Bösewicht-Aktionsdecks —
  **jedes Deck hat danach 15 Karten**.
- **Patches' Kostüm-Matte NICHT ausbrechen**, bevor man gegen ihn kämpft
  (Spoilerschutz).
- **Flüche:** nur **„Curse of the Bruised Peel"** hinter das Register
  **„Curses – Unlocked"**, **alle anderen** hinter **„Curses – Locked"**.

### 10.2 Überfall (Ambush)

`[FN S.5]`

> Bösewichte aus Üble Nachbarn haben **neben ihren BEW-/LEB-Werten** einen
> **Überfall-Eintrag**. Er bedeutet: der Kampf **beginnt mit der genannten
> Aktionskarte bereits im Spiel**.

- Die Überfall-Karte ist eine **Karte aus dem regulären 15er-Aktionsdeck** dieses
  Bösewichts.
- Beim Kampfaufbau: **Überfall-Karte lesen** und **neben das Kampfbrett legen**.
- Sie enthält oft **zusätzliche Aufbauregeln** und ist der Ort, an dem die
  Schlagworte des Bösewichts erklärt werden (z. B. Tartars *cast / lure in /
  thrash*, Ernies *dunk / force-feed / sharpen cleaver*, Barrys *embody*)
  `[FN S.6-7]`.
- Ein Bösewicht kann **mehrere** Überfall-Karten haben — Barry Bluff/Viktor
  Visage hat zwei: **„Maskless"** und **„Mask Straps"** `[Tableau Barry_Bluff]`,
  `[E01 1:16:04]`.
- **Die Bösewichte des Basisspiels haben keinen Überfall** — der Schritt entfällt
  dann `[E01 1:15:41]`.

**Nicht verwechseln:** „Überfall" ist die **dritte Zeile im Wertekasten** des
Tableaus (unter BEW und LEB) — nicht eine zusätzliche Leiste auf dem Hauptplan.

### 10.3 Flüche (Curses) — in der Erstpartie fast alle gesperrt

`[FN S.5, S.14]`

- Flüche sind eine **optionale Schwierigkeitserhöhung**. **Am Partiebeginn darf
  man höchstens einen freigeschalteten Fluch hinzufügen.**
- Er wird neben den Hauptplan gelegt, und seine Wirkung ist **die ganze Partie
  über für alle aktiv**.
- Flüche sind in drei Schwierigkeitsstufen (1–3 Symbole) eingeteilt.
- **In der Erstpartie ist genau EIN Fluch verfügbar: „Curse of the Bruised Peel"**
  (dt. sinngemäß „Fluch der matschigen Schale"). Alle anderen liegen gesperrt.
- **Wirkung laut Video:** Normalerweise werden alle Dörfler zwischen den Kämpfen
  **vollständig geheilt**. Mit diesem Fluch heilt man stattdessen nur **1 LEB** —
  bzw. **2 LEB**, wenn man ausgeschaltet wurde `[E01 36:16]`.
  `⚠️ UNSICHER:` Der genaue Wortlaut steht auf der Fluchkarte, die uns nur als
  deutsche Druckdatei vorliegt und die ich nicht gelesen habe. Der Fluch ist
  ausgerechnet ein **3-Sterne-Fluch** und laut Video „für die erste Partie nicht
  zu empfehlen" `[E01 36:33]`.

**Freischaltung weiterer Flüche — Trophäenwand** `[FN S.12-14]`:

- **Am Ende jeder Partie** (Sieg oder Niederlage) klebt man für **jeden in dieser
  Partie besiegten Bösewicht** eine Trophäe auf die Trophäenwand im
  FN-Regelheft.
- **Beim dritten Sieg über denselben Bösewicht** wird dessen **Kopf** montiert und
  man schaltet den **diesem Bösewicht zugeordneten Fluch** dauerhaft frei.
- Zuordnung `[FN S.14]`, u. a.: Handsy → „Sprouting Hand Disorder",
  Barry Bluff → „Face Blindness", Ernie Offal → „Taste for Townsfolk",
  Qing & Kween → „Gear Shortages", Umbrello → „Violent Winds",
  Lawman Dozy → „Fight Fatigue", Penny Pinchetti → „Greed Pains",
  Tilda Fields → „Nature's Rebellion", Red Atrocious → „Disease Carriers",
  Patches → „Fading Lifespan", Tartar Fishboy → „Alluring Scent",
  The Door Knockers → „Cube-Wielding Ruffians", Ms. Falls & Co. → „Storm Chasers",
  Bort Dovis → „Wave of Tourism", Will Barlow → „Stubborn Spirits",
  Virginia Fitz → „Overzealous Attacks", The Bundits → „Frantic Looting",
  Samuel Strawman → „Looming Crows", Pepin Milkfrog → „Hopping Pox",
  Deputy Waggums → „False Empathy".
- **In einer einzelnen Partie mit 4 verschiedenen Bösewichten wird also nie ein
  Fluch freigeschaltet** — man braucht drei Siege über **denselben** `[E01 38:05]`.

### 10.4 Neue Marker und Mechaniken

`[FN S.5-7]`

- **Wasser-Marker:** Viele FN-Bösewichte legen Wasser auf sich selbst, auf
  Dörfler, auf Terrain-Karten oder auf das Schlachtfeld, um Effekte auszulösen.
  **Sind keine Wasser-Marker mehr verfügbar, wird keiner gelegt.**
  **Am Ende jedes Kampfes alle Wasser-Marker entfernen.**
- **Glaubens-Marker (Belief)** — nur bei The Door Knockers. Zu viele davon →
  der Dörfler erhält einen **Strange Cube** und greift in seinem Zug die eigenen
  Leute an. Sie werden **beim Ausschalten nicht abgeworfen**, aber **am Kampfende
  entfernt** `[FN S.6, S.15]`.
- **Krankheits-Marker** — nur bei Red Atrocious; **werden beim Ausschalten des
  Dörflers entfernt** `[FN S.15]`.
- **Masken** — nur bei Barry Bluff/Viktor Visage: Masken liegen auf seiner
  „Maskless"-Überfallkarte; **nur eine Maske gleichzeitig**. Bei „embody" wird der
  Embody-Effekt der **getragenen** Maske ausgeführt, sonst der der
  „Maskless"-Karte. Man kann die **Riemen** angreifen (2 Zähler); sind beide weg,
  **fliegt die Maske aus dem Spiel — endgültig aus dem Aktionsdeck entfernt, nicht
  nur abgeworfen** — und Barry nimmt sofort Schaden `[FN S.7, S.15]`,
  `[E02 33:26]`, `[E02 45:25]`.
- **Patches' Kostüm:** Im Kampf werden nach und nach Kostümteile entfernt. **Am
  Kampfende kommen alle Teile auf die Matte zurück** `[FN S.7]`.
- **Tildas Pflanzen** (Marigoon, Doofadil, Cleatus Guytrap) bewegen sich und
  greifen an. Sie können **nicht durcheinander oder durch Hindernisse**, aber sie
  **rempeln Figuren weg — auch Tilda selbst**. Blockieren sie sich gegenseitig,
  gehen sie so nah ans Ziel wie möglich `[FN S.7]`.

### 10.5 Spielvariante „Invasion des Nachbardorfs"

`[FN S.15]` Optional: den Bösewicht-Pool thematisch begrenzen.
- **Misty Bluff:** Ernie Offal, Barry Bluff, The Door Knockers, Patches.
- **Sprinkle Falls:** Tilda Fields, Tartar Fishboy, Ms. Falls & Co., Red Atrocious.

Das erhöht auch die Chance, denselben Bösewicht dreimal zu besiegen und so Flüche
freizuschalten `[E01 38:43]`.

---

## 11. Dörfler — Werte und Karte

`[BR S.7]`

| Wert | Bedeutung |
|---|---|
| **LEB (HP)** | Lebenspunkte. Unter 1 ⇒ ausgeschaltet. Heilung nie über Max. |
| **BEW (MVMT)** | Bewegungsvorrat **pro Zug**. 1 BEW = 1 orthogonales Feld. **Marker beim Bewegen nicht verschieben.** |
| **MUMM (MOX)** | Aktionspunkte **pro Zug**. Alle Aktionen (angreifen, Terrain, Fähigkeiten, Ausrüstungstausch) kosten MUMM. **Marker beim Handeln nicht verschieben.** |
| **PRZ (ACC)** | Modifikator auf jeden Angriffswurf. |

- **Ausrüstungs-Slots:** Kopf, Brust, Beine, Zubehör, linke Hand, rechte Hand.
  **Pro Slot eine Ausrüstung.** Eine **Zweihandwaffe** belegt beide Handslots
  `[BR S.8]`.
- **Zwei Dörfler-Fähigkeiten** pro Karte, oft eine für die Dorfphase und eine für
  den Kampf. **Jede max. 1× pro Zug** `[BR S.7, S.18]`.
- **Startausrüstung** (grauer Rand) kann **nicht verkauft**, aber sehr wohl
  **zerstört** werden `[BR S.8]`.
- **Alternative Startausrüstung** wird durch **Endkampf-Sonderziele**
  freigeschaltet und steht danach in allen künftigen Partien zur Wahl `[BR S.8]`.
- **Ausrüstungsrahmen-Farben:** grau = Start, blau = Nachschub, lila =
  Bösewicht-Beute, gelb = einzigartig `[BR S.8]`.
- **Es gibt keine Obergrenze**, wie viel Ausrüstung ein Dörfler **besitzen** darf
  („weggepackt") `[BR S.8]`.
- **Abgeworfene Ausrüstung ist endgültig verloren** (zurück in die Schachtel).
  Wer etwas loswerden will, **verkauft** es lieber `[BR S.8]`.

**Deutsche Dörflernamen** (Zuordnung soweit belegt):

| Englisch | Deutsch | Quelle |
|---|---|---|
| Henlo Bulwark | Hennriette Heu | `[Dorf-Ereignisse DE]`, `[E01 13:14]` |
| Granny Melba | Omma Melba | `[Dorf-Ereignisse DE]`, `[E01 13:04]` |
| Norman Fishboy | Finn Fischkopp | `[Dorf-Ereignisse DE]` |
| Georgie Irongut | Alois Amboss | `[Dorf-Ereignisse DE]` ⚠️ erschlossen |
| Blopsy Twins | Duo Dacapo | `[Dorf-Ereignisse DE]` ⚠️ erschlossen |
| Judy Marks (FN) | Frieda Paletti | `[Dorf-Ereignisse DE]` ⚠️ erschlossen |
| Fridgette Jones (FN) | Karla Kühl | `[E01 12:52]`, `[E02 …]` |
| Yancy Plover / Quintus | ⚠️ ungeklärt (Kandidat: „Ludwig Knilch") | — |

---

## 12. Kurzreferenz für die Engine

```
SETUP
  Hauptplan + Zusatzbrett(Dorf) ; 4 Bösewichtplättchen zufällig auf Leiste
  3 Dörfler (solo) : Startwerte, Startausrüstung, 10 Münzen (15 @ 3-Runden)
  Stapel: Dorf-Ereignisse (ohne geheime!), Nachschub, Heldentaten
  Solo-Optionen: 6 offene Heldentaten | gemeinsamer Münztopf | Ausrüstungstausch

RUNDE r = 1..4
  DORFPHASE   (Reihenfolge: Leiste unten→oben)
    1 Heldentaten auffüllen  (regulär 3 verdeckt/Dörfler | solo 6 offen gemeinsam)
    2 je 1 Dorf-Ereignis, laut auflösen
    3 Laden: 10 Karten Auslage, je Zug 1x kaufen ODER verkaufen (halber Wert abgerundet),
             Nachfüllen sofort, Reset 2 Münzen/Dörfler (1x/Dorfphase)
    4 Auslage unter Nachschubstapel → Brett wenden → Bösewicht r aufdecken → oben auf Leiste

  KAMPFPHASE  (Reihenfolge: Leiste oben→unten, Bösewicht zuerst)
    Aufbau: Tableau + gemischtes 15er-Aktionsdeck ; Terrain laut Rückseite (FF nur r=4)
            Terrain-Karten auslegen ; Dörfler auf T-Felder (Kampfreihenfolge)
            Bösewicht auf R, Blick auf nächsten Dörfler
            BEW/LEB aus Spalte 3P  (Ausnahme Barry Bluff: Formel)
            Stufenfähigkeit nach Leistenplatz ; ggf. Überfall-Karte(n)
            r=4: Endkampf-Setup + Sheriffwahl (höchste Heldenpunktsumme)
    Schleife:
      Bösewicht: 1 Aktionskarte  → Ziel → Randale → Nachspiel(nur bei Schaden am Ziel)
      Dörfler:   BEW+MUMM frei verplanen, beliebige Reihenfolge
      Wutangriff bei LEB ≤ {18,12,7,4}: Dörflerzug endet sofort, Bösewicht agiert
    Ende: Bösewicht LEB < 1  → Sieg ; alle Dörfler K.O. (oder Sheriff K.O. in r=4) → Niederlage

  NACH SIEG
    1 unerfüllte Heldentaten abwerfen (optional)
    2 je 6 Münzen
    3 Beute an meiste erfüllte Heldentaten dieser Runde (nicht K.O.; Gleichstand: würfeln)
    4 erfüllte Heldentaten beiseite (zählen weiter für Sheriffwahl)
    5 Werte zurücksetzen (nur Ausrüstungsboni bleiben)
    6 Bösewichtmaterial wegräumen  (Trophäen/Journal erst am PARTIEENDE!)
    7 Leiste rotieren (oberster nach unten)
    8 Brett auf Dorfphase wenden
```

---

## 13. Was ich NICHT sicher klären konnte

1. **Die drei Solo-Sonderregeln S1–S3** (6 offene Heldentaten, gemeinsamer
   Münztopf, freier Ausrüstungstausch). Sie stehen **nicht** im englischen
   Basis-Regelwerk, dessen Solo-Abschnitt ausdrücklich sagt „all rules and setup
   remain the same" `[BR S.30]`. Das Video nennt sie mehrfach und offenbar aus
   einer schriftlichen Quelle `[E01 43:47]`, `[E01 54:43]`, `[E02 15:02]`.
   **Prüfen an:** der deutschen Regelbeilage / dem deutschen Regelheft von
   Frosted Games. Uns liegt nur die englische 1. Edition vor.
2. **Genauer Wortlaut des Fluchs „Curse of the Bruised Peel".** Wirkung nur aus
   dem Video `[E01 36:16]`; die Fluchkarten liegen nur als deutsche Druckdatei
   (`FN_Curse_Cards_FRONT_DE_RZ_klein.pdf`) vor und wurden nicht gelesen.
3. **Formulierung „Randale"** auf der deutschen Aktionskarte — im Textlayer steht
   an dieser Stelle nur ein Symbol; das Wort stammt aus dem Video.
4. **Sheriff-Niederlagebedingung:** Regelwerk „wenn der Sheriff ausgeschaltet
   wird" `[BR S.21]` vs. Tableau-Formulierung „wenn der Sheriff **zu Beginn des
   Bösewicht-Zuges** ausgeschaltet ist" `[Tableau Handsy]`. Ich halte die
   Tableau-Formulierung für die präzisere, habe es aber nicht belegen können.
5. **Zählen ausgeschaltete oder vom Feld entfernte Dörfler für „Anzahl Dörfler"
   in Kartentexten?** Das Video stellt genau diese Frage und lässt sie offen
   `[E02 49:50]`. Im Regelwerk nicht beantwortet.
6. **Deutsche Namen von Yancy Plover und Quintus** sind nicht zugeordnet; die
   Zuordnungen von Georgie Irongut, Blopsy Twins und Judy Marks sind aus der
   Bedeutung erschlossen, nicht direkt belegt.
7. **Deutsche Namen von Deputy Waggums und Handsy** (Willi Wedler / Truthand)
   sind ebenfalls nur erschlossen; die übrigen 10 Basis-Zuordnungen sind über
   Story und Aktionstexte eindeutig.
8. **Terrainkarten-Details.** Die 20 Basis- + 13 FN-Terrainkarten wurden nicht
   einzeln erfasst; nur die im Video gezeigten (Hohler Heuhaufen, Matschiger
   Graben, Holzzaun, TNT + Zünder, Plumpsklo, Werkzeugschuppen, Arzthütte,
   Dichter Wald, Summender Bienenstock, Wackelhof) und einzelne aus den
   Regelwerken. Für eine vollständige Implementierung müssen
   `terrain_deck_FRONT_DE_V10` und `FN_terrain_deck_FRONT_DE` ausgewertet werden.
9. **Heldentaten- und Dorf-Ereignis-Decks** wurden nicht erfasst (75 bzw. 100
    Karten im Basisspiel, +5 Ereignisse aus FN). Sie liegen als deutsche
    Druckdaten in `Downloads\` vor und extrahieren sauber als Text.
