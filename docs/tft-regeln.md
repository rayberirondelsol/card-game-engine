# Townsfolk Tussle — Regelreferenz für Solopartien (mit beiden Erweiterungen)

Stand: 2026-10-14. Zweck: Wissensgrundlage für einen Agenten, der eine Solopartie
regelkonform auf der Engine durchspielt. Wer diese Datei liest, soll die Quellen
nicht mehr öffnen müssen.

> **Abgleich 2026-10-14.** Diese Datei ist gegen die deutsche Anleitung
> (`[DE S.x]`, 36 Seiten) geprüft worden. Alle Korrekturen sind eingetragen; die
> Begründungen und die wörtlichen Zitate stehen in `docs/regelabgleich.md`.
> **Rangfolge der Quellen für das Grundspiel:** `[FAQ S.x]` → `[DE S.x]` →
> alles andere. `[DE S.x]` sticht `[BR S.x]`, `[EXP S.4]` und die
> Videotranskripte; die offizielle FAQ sticht auch die Anleitung. Wo nur noch ein
> Video als Beleg dastand und die Anleitung schweigt, ist das mit
> `⚠️ NUR VIDEO` oder `⚠️ ABGELEITET` gekennzeichnet.
>
> **Die Erweiterung heißt auf Deutsch „Neue Nachbarn"** (Titelseite `[NN S.1]`:
> „Townsfolk Tussle / Neue Nachbarn / Erweiterung"), **nicht „Üble Nachbarn"** —
> so stand es bis 2026-10-14 in diesen Unterlagen, und so heißen noch die
> Kategorien in der Produktionsdatenbank (`Dorf-Ereignisse (Üble Nachbarn)` usw.).
> Auch die Anleitung selbst nennt sie so: „Flut ist ein Terrain aus der **Neue
> Nachbarn**-Erweiterung" `[DE S.32]`.
>
> **§9 und §10 (die Erweiterungen) sind NICHT abgeglichen.** Für sie liegen jetzt
> die deutschen Anleitungen `[NN]` und `[TT]` vor; der Abgleich ist ein eigener
> Durchgang (§13.10).

---

## 0. Quellen und Belegkonventionen

| Kürzel | Quelle |
|---|---|
| `[BR S.x]` | **Basis-Regelwerk** „Townsfolk Tussle – Rules & Results Booklet" (1st Ed., 32 S.), englisch. Kopie: `scratchpad/rules/base.pdf`, Textauszug `base.txt`. Seitenzahlen = Buchseiten = PDF-Seiten. |
| `[EXP S.4]` | **Expansion-Demo-Regelwerk**, Seite 4 „Base Game Rule Updates" — offizielle Regel-Updates, die in die **2. Edition** einfließen. Die deutsche Frosted-Games-Ausgabe entspricht diesem Stand (siehe §1.3). Kopie: `scratchpad/rules/expansion.pdf`. |
| `[FN S.x]` | **Foul Neighbors Rulebook** (dt. „Neue Nachbarn"), `C:\Users\benja\Downloads\Rulebook_FOULNEIGHBORS_Compressed.pdf`, englisch, 9 S. **Durch `[NN S.x]` überholt.** |
| `[OJ S.x]` | **Odd Jobs Rulebook** (dt. „Toller Trödel"), `C:\Users\benja\Downloads\Rulebook_ODDJOBS_compressed.pdf`, englisch, 7 S. **Durch `[TT S.x]` überholt.** |
| `[NN S.x]` | **Deutsche Anleitung „Neue Nachbarn"** (Frosted Games, 16 Seiten, inkl. Schicksale 37+), `C:\Users\benja\Downloads\Townsfolk_Tussle_Ueble_Nachbarn_Anleitung.pdf`. Deutlich ausführlicher als `[FN]`. **§10 ist noch NICHT vollständig dagegen abgeglichen** (§13.10). |
| `[TT S.x]` | **Deutsche Anleitung „Toller Trödel"** (Frosted Games, 12 Seiten), `C:\Users\benja\Downloads\Townsfolk_Tussle_Toller_Troedel_Anleitung.pdf`. Deutlich ausführlicher als `[OJ]`. **§9 ist noch NICHT vollständig dagegen abgeglichen** (§13.10). |
| `[E01 hh:mm]` | Regelvideo Genus Solo S01E01 „Regeln" (Aufbau + Dorfphase, 1:20:30), YouTube `2PeqrpPXJxo`. Transkript: `scratchpad/subs/e01.txt`. |
| `[E02 hh:mm]` | Regelvideo Genus Solo S01E02 „Regeln" (Kampfphase, 1:06:52), YouTube `jv8WfAgnPe4`. Transkript: `scratchpad/subs/e02.txt`. |
| `[Tableau <Name>]` | Foto des Bösewicht-Tableaus. Basis + Neue Nachbarn: `Z:\Austausch\TfT\*.pdf`. Weitere 8: TTS-Mod `2999560617`, Bilder in `scratchpad/tableaus/`. |
| `[DE S.x]` | **Deutsche Anleitung** (Frosted Games), `C:\Users\benja\Downloads\Townsfolk_Tussle_Anleitung_WEB.pdf`, 36 Seiten. Entspricht dem Regelstand der 2. Edition (§1.3). **Vollständiges Regelwerk in deutscher Sprache** — sticht die automatisch übersetzten Videountertitel. |
| `[FAQ S.x]` | **Offizielle FAQ von Frosted Games**, „Ich hab da mal ne Frage… — Häufige Fragen, Klarstellungen und Korrekturen (Stand: 16.10.2025)", 3 Seiten, deutsch: `C:\Users\benja\Downloads\Townsfolk_Tussle_FAQ_2025-10-16.pdf`. **Geht der Anleitung vor**, wo beide etwas sagen — sie enthält ausdrücklich „Klarstellungen" und „Korrekturen" zum gedruckten Stand. |
| `[CS-DE]` | Deutsche Cheatsheet-Karte, `Downloads\Cheatsheet_Card_{FRONT,BACK}_DE_V2*.pdf` — maßgeblich für **deutsche Begriffe**. |
| `[Crit-DE]` | Deutsche Knaller-Karte, `Downloads\Crit_Hit_Card_FRONT_DE_V1_RZ_klein.pdf`. |

**Warnhinweis zu den Videos:** die Transkripte sind **automatisch ins Englische
übersetzte** Untertitel eines deutschen Videos. Eigennamen und Fachbegriffe sind
teils zerstört („Towns for Tassel" = Townsfolk Tussle, „Dürfler" = Dörfler,
„Mum"/„Mumm" = Moxie, „riot" = *Krawall*, „Auer"/„AU" = AUA/Schaden, „Knaller" =
kritischer Treffer). **Inhaltlich** sind sie meistens zuverlässig, sprachlich
nicht — und in drei Fällen waren sie Quelle eines echten Fehlers: „Randale"
statt Krawall, vier verunglückte Terrainnamen und die Reihenfolge in
Dorfphase-Schritt 4. **Die deutsche Anleitung `[DE S.x]` löst diese Quelle
vollständig ab.** Wo Video und Anleitung sich widersprechen, gilt die Anleitung.

**Unsicherheiten** sind mit `⚠️ UNSICHER` gekennzeichnet. §13 sammelt sie.

---

## 1. Grundlagen

### 1.1 Begriffe (deutsch / englisch)

Die deutschen Begriffe stehen in der Anleitung `[DE S.4–36]`, allen voran im
Definitionsglossar `[DE S.35]`; die Cheatsheet-Karte bestätigt sie `[CS-DE]`,
`[Crit-DE]`.

| Deutsch | Abk. | Englisch |
|---|---|---|
| Bösewicht | — | Ruffian |
| Dörfler | — | Townsfolk |
| Hauptplan / Schlachtfeld | — | main board / landscape |
| Zusatz-Brett (beidseitig) | — | sideboard |
| „Wer ist dran?"-Leiste | — | Buyin'/Beatin' Bar |
| Kampf-Plätze (Bösewicht-Leiste) | — | fight slots |
| Shoppen-Reihenfolge (Dorfphase, unten → oben) | — | Buyin' Order |
| Kloppen-Reihenfolge (Kampf, oben → unten) | — | Beatin' Order |
| Dorf-Phase / Kampf-Phase | — | Town Phase / Fight Phase |
| Endgegner-Kampf | — | Final Fight |
| Dorf-Ereignis | — | Town Event |
| Heldentat (abgeschlossen / nicht abgeschlossen) | — | Feat of Mettle |
| Tante Emma / Tante Emmas Laden | — | the Peddler / Peddler shop |
| Nachschub (= verdeckter Stapel Tante Emma Ausrüstung) | — | Peddler deck |
| Ausrüstung / weggepackt / anlegen / abwerfen | — | gear / stashed / equip / discard |
| Merkmal „Seltsam" (nie anlegbar, immer aktiv) | — | Odd |
| Besondere Ausrüstung (gelber Rand) | — | Special Gear |
| Snack (konsumierbare Ausrüstung) | — | consumable |
| Mitbringsel (6. Slot) | — | Accessory |
| Bösewicht-Aktion (Verhaltenskarte) | — | Ruffian action card |
| **Krawall** (Kartenabschnitt) | — | Move/Act |
| Nachspiel | — | Aftereffect |
| Bewegung | **BEW** | Movement (**MVMT**) |
| Leben / Max LEB | **LEB** | Health (**HP**) |
| Mumm | **MUMM** | Moxie (**MOX**) |
| Präzision | **PRZ** | Accuracy (**ACC**) |
| Schaden | **AUA** | Damage (**DMG**) |
| Trifft-Voraussetzung (Zielwert der Waffe) | — | ACC value |
| Knaller | — | critical hit |
| Patzer (natürliche 1) | — | whiff |
| Wutausbruch | — | Breaking Point |
| Rammen | — | collision |
| Freie Schussbahn | — | line of sight |
| **besiegt** (LEB auf 0 oder weniger) | — | defeated |
| „Deinen Mumm zusammenraffen" | — | „Muster your Moxie" (Neuwurf) |
| Hindernis-Terrain / Gebiet-Terrain | — | obstacle / feature |
| Überfall | — | Ambush (nur Neue Nachbarn) |
| Fluch | — | Curse (nur Neue Nachbarn) |
| Münzen **abwerfen** (= zurück in den Vorrat) | — | discard coins |
| Münzen **zahlen** (mit Folgetext) | — | pay coins |
| Rolle / Aufstellbares | — | Role / Deployable (nur Toller Trödel) |

Die Bösewicht-Aktionskarte hat **fünf** Abschnitte: **Name** → **Umschreibung**
(Flavourtext) → **Das Ziel** → **Krawall** → **Nachspiel** `[DE S.16]`. Der
Abschnitt heißt **„Krawall"** — das Wort „Randale" aus dem Videountertitel kommt
auf keiner der 36 Anleitungsseiten vor, „Krawall" neunmal `[DE S.16–18, 35]`.

**Begriffe aus dem Glossar, die am Tisch etwas entscheiden** `[DE S.35]`:

- **Freies Feld** — „Felder, auf denen sich nichts befindet (kein Terrain,
  Bösewichte, Dörfler usw.)".
- **Angrenzend** — nur vertikal/horizontal. „Du bist nie angrenzend zu dir selbst."
- **Figur** — Dörfler **und** Bösewichte.
- **„da"** — anwesend auf dem Schlachtfeld.
- **„dürfen"** — darf, muss nicht.
- **„1+"** — „1 oder mehr"; **„/"** trennt Optionen wie ein „oder".
- **Kampf-Beginn** — „nach dem letzten Schritt des Kampf-Aufbaus und vor dem
  ersten Zug".
- **Zugbeginn** — „nach dem Ende des vorangegangenen Zuges, aber bevor die erste
  Aktion des Zuges ausgeführt wurde".

### 1.2 Partiegrundgerüst

- Eine Partie = **4 Runden**. Jede Runde = **Dorfphase + Kampfphase**.
  Die 4. Kampfphase ist der **Endgegner-Kampf**; es gibt **keine zusätzliche
  5. Runde** `[DE S.11]`, `[E01 08:41]`.
- „Besiegt ihr nacheinander alle 4 Bösewichte, die sich euch in den Weg stellen,
  gewinnt ihr die Partie" `[DE S.11]`.
- **3-Runden-Modus** (offizielle Spielvariante für kürzere Partien) `[DE S.34]`:
  - Das **3-Runden-Plättchen** statt eines Bösewicht-Plättchens auf den
    **obersten Kampf-Platz (Tunichtgut)**.
  - Es wird **sofort abgehandelt**: „Ihr überspringt die 1. Runde und erhaltet
    jeder einfach so 5 Münzen." Die Partie beginnt also mit der **zweiten**
    Dorfphase, und jeder hat 10 + 5 = **15 Münzen**. Mechanisch ist das ein
    Zusatzbetrag beim Abhandeln des Plättchens, keine veränderte Startmenge.
  - Schritt 1 der 1. Dorfphase (Heldentaten auffüllen) entfällt mit `[DE S.11]`.
- **Weitere Varianten** `[DE S.34]`: **Doppel-Modus** (zwei Spieler mit je 2
  Dörflern; geheime Dorf-Ereignisse aussortieren) und **Tausch-Modus**
  (Ausrüstung außer Startausrüstung in der Dorfphase frei tauschen und
  verschenken; „Das macht das Spiel leichter!"). Beide sind mit jedem anderen
  Modus kombinierbar.

### 1.3 Welche Regelfassung gilt?

Das englische Basis-Regelwerk im TTS-Mod ist die **1. Edition**. Die deutsche
Ausgabe (Frosted Games, © 2024, Übersetzung Board Game Circus) entspricht dem
**2.-Edition-Stand**. **Alle fünf Änderungen sind direkt in der deutschen
Anleitung belegt** — `[EXP S.4]` ist als Quelle damit entbehrlich:

1. **Laden füllt sofort nach:** „Lege immer, wenn du Ausrüstung aus Tante Emmas
   Laden kaufst oder auf andere Weise dort entfernst, 1 neue Karte offen vom
   Nachschub auf das freigewordene Feld nach." `[DE S.12]`
   (1. Ed.: Auslage blieb lückenhaft.)
2. **Laden erneuern jederzeit:** „wer von euch gerade am Zug ist, ist dabei egal,
   solange alle der Erneuerung zustimmen" `[DE S.12]`.
   (1. Ed. `[BR S.11]`: nur *vor* jeder Kaufaktion.)
3. **„Deinen Mumm zusammenraffen" (Neuwurf):** „Für 2 MUMM, darfst du den letzten
   Angriffs- oder Terrain-Wurf neu würfeln. Tust du das? Dann gilt automatisch das
   neue Würfelergebnis. Du darfst den gleichen Angriffs- oder Terrainwurf nur
   maximal 1x neu würfeln." `[DE S.20]`
4. **„vor dir" / „vor euch"** statt „vor einem Dörfler": „Besagt die Karte, dass
   du sie „vor dir" auslegen sollst, gilt der Text darauf nur für dich. Besagt die
   Karte, dass du sie „vor euch" auslegen sollst, gilt ihr Text im Kasten für euch
   alle." `[DE S.12]`, `[DE S.17]`
5. **3-Runden-Modus** `[DE S.34]` (siehe oben).

> **Für die Engine gilt der 2.-Edition-Stand, und zwar in der Fassung der
> deutschen Anleitung.**

---

## 2. Partieaufbau

### 2.1 Standardaufbau (gilt auch solo) — die 9 gedruckten Schritte `[DE S.6]`

1. **Spielbrett** in die Tischmitte, **Zusatz-Brett rechts daneben, mit der
   Dorf-Phase nach oben**. Das Schlachtfeld „erstreckt sich über die Koordinaten
   A–S (links bis rechts) und 1–14 (oben bis unten)" `[DE S.14]`, `[DE S.35]`.
2. **Alle Bösewicht-Plättchen verdeckt mischen, vier davon (weiterhin verdeckt)
   auf die Kampf-Plätze** links unten auf dem Spielbrett legen. „Legt die
   restlichen Bösewicht-Plättchen in die Schachtel zurück" — **ungesehen**, kein
   Ausschlussverfahren `[DE S.6]`, `[E01 09:32]`.
3. Jeder wählt **1 Dörfler**, legt dessen **Tableau** aus, setzt je 1 schwarzen
   Marker auf die **4 farbig hinterlegten Startwerte** (LEB, BEW, MUMM, PRZ) und
   nimmt die Figur `[DE S.6]`.
4. Jeder sucht die **Startausrüstung**, die unten auf seinem Dörfler-Tableau
   steht. Nicht verwendete Startausrüstung geht zurück in die Schachtel. Ist für
   einen Dörfler die **Alternative Startausrüstung** schon freigeschaltet
   (Kennzeichen oben rechts), darf sie stattdessen gewählt werden `[DE S.6]`,
   `[DE S.8]`.
5. **Dörfler-Plättchen einzeln von oben nach unten** auf die „Wer ist
   dran?"-Leiste legen. **Den obersten Platz mit der Beschriftung „Bösewicht"
   freilassen.** Die Anleitung *empfiehlt* die Sitzreihenfolge, „oben beginnend
   mit dem größten Störenfried unter euch" — eine Empfehlung, kein Zwang
   `[DE S.6]`.
6. **Dorf-Ereignisse und Heldentaten mischen**, beide verdeckt auslegen, dazu
   alle **Münzen als Vorrat** `[DE S.6]`.
7. **Tante Emma Ausrüstung mischen** und als **einen** verdeckten Stapel so
   auslegen, „dass alle ihn gut erreichen können". Dieser Stapel heißt
   **Nachschub** `[DE S.6]`, `[DE S.35]`. (Von einem *halben* Stapel ist nirgends
   die Rede.)
8. Jeder nimmt **1 Übersichts-Karte** sowie **10 Münzen** aus dem Vorrat
   `[DE S.6]`.
9. **5 Würfel und die Knaller-Karte** beiseitelegen `[DE S.6]`.

Die Kampf-Plätze tragen aufgedruckte Stufennamen. Belegt ist nur **„Tunichtgut"**
für den obersten `[DE S.34]` und **„Endgegner-Kampf"** für den vierten; siehe
§5.2.

Optional, Tischkonvention: **Max-LEB-Stopper.** Ein roter Marker auf dem Feld
**über** dem Maximum-LEB, damit Heilung nie darüber hinausgeht
`⚠️ NUR VIDEO: [E01 16:08]`. Die Regel selbst steht in der Anleitung —
„Max LEB: Maximal mögliche Anzahl Leben, die nicht überschritten werden kann"
`[DE S.35]` —, der Marker ist nur eine Hilfe.

### 2.2 Solo-Besonderheiten — die offizielle deutsche Solovariante

Die deutsche Anleitung hat einen eigenen Solo-Abschnitt. **Er ist die
maßgebliche Quelle und ersetzt die bisherige Herleitung aus `[BR S.30]` und dem
Video vollständig.** Wortlaut `[DE S.34]`:

> „Solo-Partie — Es gelten die gleichen Regeln und Vorbereitungen wie im normalen
> Modus, bis auf folgende Abweichungen:
> • Wähle 3 Dörfler, die du spielen willst.
> • Entferne beim Aufbau alle Geheimen Dorf-Ereignisse aus dem
> Dorf-Ereignis-Stapel.
> • Nimm dir zu Beginn der Partie 30 Münzen, auf die alle deine Dörfler jederzeit
> zugreifen können.
> • Ziehe in der 1. Dorf-Phase 6 Heldentaten. Lege sie offen vor dich. Diese
> Heldentaten gelten für alle deine Dörfler. Der Dörfler, der eine Heldentat
> abschließt, erhält sie (und ihre entsprechende Belohnung). Am Ende jeder
> Kampf-Phase darfst du alle nicht abgeschlossenen Heldentaten, die du nicht
> behalten möchtest, abwerfen. Fülle zu Beginn jeder weiteren Dorf-Phase deine
> nicht abgeschlossenen Heldentaten wieder auf 6 auf.
> • In Tante Emmas Laden darfst du für alle deine Dörfler Ausrüstung kaufen und
> Ausrüstung, die keine Startausrüstung ist, darfst du unter allen deinen
> Dörflern tauschen."

Daraus, Punkt für Punkt:

- **3 Dörfler.** Für Bösewicht-Werte und Endgegner-Terrain zählt die **Anzahl
  Dörfler im Spiel** (§5.4), solo also **3**.
- **Geheime Dorf-Ereignisse vor Partiebeginn aussortieren.** Das ist eine echte
  Soloregel, keine Ableitung. Dasselbe gilt im **Doppel-Modus** `[DE S.34]` —
  die Streichung hängt also daran, dass ein Spieler mehr als einen Dörfler
  steuert.
- **Gemeinsamer Münztopf, 30 Münzen zu Beginn.**
  `⚠️ ABGELEITET:` Die Anleitung regelt wörtlich nur die **Startmünzen**. Dass
  auch später erworbenes Geld (die 6 Münzen nach jedem Kampf, Verkäufe,
  Heldentaten-Belohnungen) in denselben Topf geht, ist die naheliegende Lesart
  von „auf die alle deine Dörfler jederzeit zugreifen können", steht aber nicht
  ausdrücklich da. Am Tisch: ein Topf.
- **6 gemeinsame, offene Heldentaten** statt 3 verdeckter pro Dörfler. Abwerfen
  **am Ende jeder Kampf-Phase**, Auffüllen auf 6 **zu Beginn jeder weiteren
  Dorf-Phase**.
- **Ausrüstungstausch unter den eigenen Dörflern**, Startausrüstung ausgenommen.
  Der Satz beginnt mit „In Tante Emmas Laden" — der Tausch ist also an den
  Ladenschritt der Dorfphase gebunden, im Kampf wird nicht getauscht. (Der
  separate **Tausch-Modus** `[DE S.34]` erlaubt ihn allgemein „während der
  Dorf-Phase".)

Die Grundregel, von der das abweicht: „Deine Ausrüstung ist und bleibt deine
Ausrüstung, und das Tauschen und Schenken von Ausrüstungs-Karten untereinander
ist grundsätzlich nicht möglich" `[DE S.10]`.

**Für die Engine:** Diese fünf Punkte sind der **Regelstand** einer Solopartie,
keine optionalen Hausregeln. Wenn sie abschaltbar geführt werden, ist das
Abschalten die Abweichung — Voreinstellung = aktiv.

---

## 3. Rundenstruktur und Reihenfolge

```
Runde 1..4:
  Dorfphase (Zusatz-Brett Seite „Dorf-Phase")
     1 Heldentaten auffüllen
     2 Dorf-Ereignis ausführen
     3 Tante Emmas Laden besuchen
     4 Auf in den Kampf!  (Auslage unter den Nachschub, letzte Anlegekontrolle)
  Kampfphase (Zusatz-Brett Seite „Kampf-Phase")
     Aufbau (10 Schritte, beginnend mit Brett wenden + Bösewicht aufdecken)
     → Kampf → Nachbereitung (8 Schritte)
```

**„Wer ist dran?"-Leiste** `[DE S.11]`:

> „In der Dorf-Phase geht es immer in **Shoppen-Reihenfolge von unten nach oben**.
> In der Kampf-Phase geht es immer in **Kloppen-Reihenfolge von oben nach
> unten**." `[DE S.11]`

- **Shoppen-Reihenfolge** (engl. Buyin' Order) = unten → oben, gilt für alles in
  der Dorfphase.
- **Kloppen-Reihenfolge** (engl. Beatin' Order) = oben → unten, gilt im Kampf.
- „Auf dem obersten Platz der „Wer ist dran?"-Leiste liegt immer der Bösewicht.
  Da in der Kampf-Phase die Kloppen-Reihenfolge gilt, **beginnt somit immer der
  Bösewicht** mit seiner ersten Bösewicht-Aktion." `[DE S.13]`
- **Nach jedem Kampf rotiert die Leiste:** „Schiebt das oberste Dörfler-Plättchen
  an das untere Ende und rutscht dann alle Dörfler-Plättchen wieder nach oben auf.
  Lasst natürlich wie immer den obersten Platz für den Bösewicht frei."
  `[DE S.22]` (Nachbereitung, Schritt 7).

---

## 4. Die Dorfphase (4 Schritte, links nach rechts)

Die Schritte sind auf dem Zusatz-Brett aufgedruckt und werden **strikt in dieser
Reihenfolge** abgearbeitet `[DE S.11-12]`, `[CS-DE]`, `[E01 40:11]`.

### Schritt 1 — Heldentaten auffüllen

**Regulär** `[DE S.11]`: „Ihr alle füllt **in Shoppen-Reihenfolge** eure **nicht
abgeschlossenen** Heldentaten wieder auf 3 auf. Da ihr zu Beginn der Partie noch
gar keine Heldentaten habt, zieht ihr alle in Runde 1 einfach jeweils 3
Heldentaten vom Stapel."

**Solo (§2.2):** eine **gemeinsame offene Auslage von 6** Heldentaten; Auffüllen
auf 6 zu Beginn jeder weiteren Dorfphase `[DE S.34]`.

**Wie Heldentaten funktionieren** `[DE S.11]`:

- Die Karte hat vier Felder: **Name**, **Auftrag**, **Heldenpunkte**,
  **Belohnung**.
- „Neu gezogene Heldentaten sind **nicht abgeschlossen**. Lege deine nicht
  abgeschlossenen Heldentaten **verdeckt** vor dir ab, du darfst sie dir aber
  **jederzeit ansehen**." (Solo liegen sie offen, §2.2.)
- Erfüllt ein Dörfler den Auftrag, verkündet er das, deckt die Karte auf und legt
  sie **offen vor sich**; sie gilt nun als **abgeschlossen** und „gibt dir
  **sofort** die auf ihr angegebene Belohnung".
- **Belohnungsarten:** „eine Wertverbesserung, AUA für den aktuellen Bösewicht,
  eine Anzahl Münzen oder eine Auswahl zwischen mehreren dieser Belohnungen".
- **Werteerhöhungen aus Heldentaten gelten NICHT dauerhaft.** Sie wirken sofort,
  aber nur bis zur **Nachbereitung des laufenden Kampfes**: dort werden die
  Werte-Leisten „wieder auf ihre Startwerte" gesetzt, „alle Veränderungen, die du
  im Laufe des Kampfes erhalten hast, sind hiermit wieder weg", und anschließend
  werden **nur die schwarz markierten Wertveränderungen von angelegter
  Ausrüstung** erneut aufgerechnet `[DE S.22]`, `[DE S.35]`. Eine Heldentat
  erhöht also **nicht** den Grundwert.
  > Die frühere Festlegung „dauerhaft" (**Entscheidung des Auftraggebers,
  > 2026-09-25**) beruhte auf der Annahme, die Regel schweige dazu. Das war
  > falsch — die Anleitung regelt es ausdrücklich. **Die Entscheidung ist am
  > 2026-10-14 aufgehoben**; siehe `docs/regelabgleich.md` §F8 und den Nachtrag
  > zu M12.7 in `docs/spec-setup-system.md`.
- „**Heldentaten lassen sich nicht rückwirkend erfüllen.**" `[DE S.11]`
- Heldentaten können **in der Dorfphase genauso wie im Kampf** abgeschlossen
  werden — immer alle Texte prüfen `[E01 46:04]`.
- **Zwei Auswertungen** `[DE S.11]`:
  - **Am Ende der Kampf-Phase:** Wer in *dieser Runde* die **meisten Heldentaten
    (Karten, nicht Heldenpunkte)** abgeschlossen hat und **nicht besiegt** war,
    bekommt die Bösewicht-Beute (§7.3).
  - **Zu Beginn des Endgegner-Kampfes:** Wer über die ganze Partie die
    **höchste Summe an Heldenpunkten** hat, wird **Sheriff** (§8.2).
- **Im Endgegner-Kampf** zählen Heldentaten nur noch für die Belohnung: „Im
  Endgegner-Kampf in Runde 4 kannst du deine letzten nicht abgeschlossenen
  Heldentaten immer noch abschließen, um ihre Belohnung zu erhalten, es geht dann
  aber nicht mehr um Bösewicht-Ausrüstung oder den Sheriff-Posten." `[DE S.11]`
- Am Ende jedes Kampfes dürfen **nicht abgeschlossene** Heldentaten abgeworfen
  werden, die man nicht behalten will `[DE S.22]`.
- Auflösungsreihenfolge bei mehreren gleichzeitig: „Manche Heldentaten können
  erst am Ende eines Kampfes erfüllt werden. In welcher Reihenfolge überprüfen wir
  solche Heldentaten? **Wer zuerst kommt, mahlt zuerst!**" `[DE S.32]`

### Schritt 2 — Dorf-Ereignis ausführen

- „Ihr alle zieht nacheinander **in Shoppen-Reihenfolge je 1 Dorf-Ereignis** und
  handelt dieses ab." `[DE S.12]`
- „Dabei solltest du den anderen alles **laut vorlesen** … (**Ausnahme: Geheime
  Dorf-Ereignisse**)" `[DE S.12]`.
- Verlangt das Ereignis einen Wurf, wird **ein W10** geworfen. „Steht dort zum
  Beispiel „Würfle (+BEW)", addiere deinen **aktuellen** BEWEGUNG-Wert zum
  Würfelergebnis hinzu." `[DE S.12]` — also der **aktuelle**, nicht der maximale
  Wert.
- Ereignisse „können sowohl positive als auch negative Effekte haben"
  `[DE S.12]` und sich auch auf **andere** Dörfler beziehen als den, der gezogen
  hat `[E01 51:47]`.
- **Offen auslegen** `[DE S.12]`: „Besagt die Karte, dass du sie **„vor dir"**
  auslegen sollst, gilt der Text darauf **nur für dich**. Besagt die Karte, dass
  du sie **„vor euch"** auslegen sollst, gilt ihr Text im Kasten **für euch
  alle**." Und: „Ein ausliegendes Dorf-Ereignis bleibt ausliegend, **bis sein
  Text besagt, dass es abgeworfen wird**."
- **Geheime Ereignisse** (großer roter Balken „GEHEIM!") werden **nicht laut
  vorgelesen**, sondern nur für sich gelesen und **verdeckt** vor sich gelegt. Sie
  „werden immer erst bei einer bestimmten Bedingung aktiviert"; tritt sie ein,
  wird aufgedeckt und sofort abgehandelt. Die Karte kann „auch über mehrere Runden
  vor dir liegen bleiben und … **sogar aktiviert werden, während du besiegt
  bist**" `[DE S.12]`. **Solo werden sie vor Partiebeginn aussortiert** (§2.2).
- „Hast du dein Dorf-Ereignis abgehandelt, **wirf es ab**." `[DE S.12]`

**Werteänderungen lesen — es gibt drei Arten, nicht zwei** `[DE S.10]`:

| Art | Kennzeichen | Dauer |
|---|---|---|
| **Dauerhafte Wertveränderung** | **schwarze Markierung**, steht auf **Ausrüstung** | ab dem Anlegen bis zum Wegpacken oder Abwerfen. „Die Wertveränderung **kommt und geht hier mit der Ausrüstung**!" Nach dem Kampf wird sie auf die zurückgesetzten Startwerte wieder aufgerechnet. |
| **Direkte Wertveränderung** | Kosten oder Effekt einer Fähigkeit, Bösewicht-Aktion oder eines Dorf-Ereignisses | Marker **sofort** verschieben; gilt „immer nur für die **aktuelle Runde**" und wird in der Nachbereitung zurückgesetzt `[DE S.22]`. |
| **Besondere Wertveränderung** | direkte Änderung mit **ausdrücklich genannter Dauer**, „meistens „nur für diesen Zug"" | wie angegeben; Marker danach zurücksetzen. |

**Achtung, zwei verbreitete Irrtümer:** die schwarze Markierung ist ein Merkmal
von **Ausrüstung**, nicht ein generisches „gilt über Runden hinweg"-Kennzeichen
auf Dorf-Ereignissen. Und alles Nicht-Markierte gilt „nur für die **aktuelle
Runde**", nicht „nur für den nächsten Kampf".

### Schritt 3 — Tante Emmas Laden besuchen

- „Legt zu Beginn des Besuchs auf **alle 10 Felder** des Ladens je 1 Karte vom
  Nachschub **offen** aus." `[DE S.12]`
- In **Shoppen-Reihenfolge** darf jeder, wenn er am Zug ist, **entweder** 1
  Ausrüstung kaufen **oder** 1 Ausrüstung aus seinem Besitz verkaufen. „Wenn ihr
  alle 1x am Zug wart, geht es wieder von vorne los. Dies wiederholt ihr so oft,
  bis keiner mehr Ausrüstung kaufen oder verkaufen will." `[DE S.12]`
- **Kaufen:** Münzen in Höhe der Kosten zahlen, Karte in den Besitz nehmen. „Du
  darfst sie **sofort anlegen**." `[DE S.12]`
- **Verkaufen:** „für die **Hälfte ihrer Kosten (abgerundet)**". **Startausrüstung
  kann nicht verkauft werden** `[DE S.12]`.
- **Nachfüllen:** Jede gekaufte oder anders entfernte Karte wird **sofort** durch
  1 neue Karte vom Nachschub ersetzt `[DE S.12]`.
- **„Tante Emmas Laden erneuern"** (nicht „Laden-Reset") `[DE S.12]`:
  > „Um Tante Emmas Laden zu erneuern, müsst ihr **pro Dörfler 2 Münzen**
  > abwerfen. Wie ihr diesen Gesamtbetrag unter euch aufteilt, bleibt euch
  > überlassen, und **wer von euch gerade am Zug ist, ist dabei egal**, solange
  > alle der Erneuerung zustimmen. Werft die entsprechende Menge Münzen ab, werft
  > die Ausrüstung aus Tante Emmas Laden ab und legt 10 neue Karten vom Nachschub
  > offen aus."

  Die Anleitung nennt **keine Häufigkeitsgrenze**. Die frühere Angabe
  „höchstens einmal pro Dorfphase" stammt aus `[BR S.11]` bzw. dem Video und ist
  **nicht Regel** — wer sie behalten will, führt sie ausdrücklich als Hausregel.
  Solo mit 3 Dörflern kostet eine Erneuerung **6 Münzen**.
- **„Münzen abwerfen" ist nicht dasselbe wie „Münzen zahlen"** `[FAQ S.1]`:
  „Münzen „**abwerfen**" heißt, dass sie **in den Vorrat zurück gelegt** werden."
  — „Münzen „**zahlen**" heißt, dass mit diesen oftmals noch **etwas anderes
  passiert**, was später im Text beschrieben wird."
  Die Ladenerneuerung sagt **abwerfen** (`[DE S.12]`) — die 2 Münzen pro Dörfler
  gehen also schlicht in den Vorrat. Beim **Kaufen** heißt es „bezahle Münzen in
  Höhe ihrer Kosten" `[DE S.12]`; wo ein Kartentext „zahlen" sagt, ist der
  Folgetext zu lesen.
- **Ausrüstung anlegen/wegpacken ist in der ganzen Dorfphase frei und kostenlos:**
  „Innerhalb der gesamten Dorf-Phase kannst du Ausrüstung frei anlegen und
  wegpacken." `[DE S.10]`, `[DE S.35]`

### Schritt 4 — Auf in den Kampf!

Der Schritt besteht **nur aus zwei Handgriffen** `[DE S.12]`:

> „Wenn niemand mehr etwas kaufen oder verkaufen will, schiebt ihr alle
> Ausrüstung in Tante Emmas Laden **unter den Nachschub**. Überprüft ein letztes
> Mal, ob ihr auch **alle eure gewünschte Ausrüstung angelegt** habt, denn jetzt
> beginnt die Kampf-Phase!"

1. **Gesamte Ladenauslage abräumen** und unter den Nachschub schieben.
2. **Letzte Anlegekontrolle.** In der Dorfphase ist das Anlegen frei und
   kostenlos, im Kampf kostet jeder Slot 2 MUMM (§6.3).

Damit endet die Dorfphase. **Brettwenden und Bösewicht-Aufdecken gehören NICHT
hierher** — sie sind die Schritte 1 und 2 des **Kampfaufbaus** (§5.1)
`[DE S.13]`, `[DE S.36]`. Umgekehrt gehört „Dreht das Zusatz-Brett auf die
Dorf-Phase" zur **Dorfphase** und ist Schritt 8 der Nachbereitung `[DE S.22]`,
`[DE S.36]`. (Die abweichende Reihenfolge der früheren Fassung stammte aus
`[E01 1:07:34]`.)

---

## 5. Kampfaufbau

Die Anleitung druckt **10 nummerierte Schritte** `[DE S.13]`. Die Engine sollte
diese Reihenfolge abbilden.

### 5.1 Die 10 Schritte `[DE S.13]`

1. **Zusatz-Brett auf die Seite mit der Kampf-Phase drehen.**
2. **Nächstes Bösewicht-Plättchen aufdecken** — „auf dem nächsten Kampf-Platz
   (**von oben nach unten**) … so dass ihr den Namen des nächsten Bösewichts
   seht. Legt es auf das **oberste Feld** der „Wer ist dran?"-Leiste."
3. **Bösewicht-Tableau** auf den **oberen Teil** des Zusatz-Bretts legen.
4. **Bösewicht-Aktionen mischen** und auf das Feld **„Ziehstapel"** des
   Zusatz-Bretts legen. „Jeder Bösewicht hat **15 Bösewicht-Aktionen**"
   `[DE S.16]`.
5. **Schlachtfeld nachbauen:** „Auf der Rückseite des Bösewicht-Tableaus seht ihr
   die **Schlachtfeld-Übersicht** für diesen Kampf. Baut diese mit den
   abgebildeten Terrains nach."
6. **Terrain-Karten auslegen:** „Sucht für jedes Terrain auf dem Schlachtfeld die
   dazugehörige Terrain-Karte heraus und legt diese offen auf die
   **T-E-R-R-A-I-N-Felder**."
7. **Dörfler platzieren:** „Platziert euch nacheinander **in
   Kloppen-Reihenfolge** auf (noch) verfügbare Dörfler-Startpositionen. Diese
   sind mit einem **`D`** markiert."
8. **Bösewicht platzieren:** „Platziert den Bösewicht auf die Felder mit dem
   **großen `B`**. Dreht ihn so, dass er in die Richtung des ihm **nahesten
   Dörflers** blickt."
9. **Werte setzen:** „Legt je 1 (schwarzen) Marker auf die 2 Startwerte für
   **BEWEGUNG und LEBEN** des Bösewichts auf den beiden Werte-Leisten des
   Zusatz-Bretts" — siehe §5.4.
10. **Falls Endgegner-Kampf:** „Befolgt die zusätzlichen Anweisungen unter
    **AUFBAU** auf der Rückseite des Bösewicht-Tableaus." Und: „**Felder, die mit
    `EG` markiert sind, werden nur im Endgegner-Kampf genutzt** und in den Kämpfen
    der Runden 1–3 ignoriert." (§8.1)

**Die Rasterbuchstaben heißen `D`, `B` und `EG`** — nicht `T`, `R` und `FF`.
`D` = Dörfler-Startposition, `B` = Bösewicht (2×2-Fläche, §5.10), `EG` =
Endgegner-Terrain, bei mehreren „`EG1`, `EG2`, `EG3` usw. …, um die Reihenfolge
ihrer Platzierung anzuzeigen" `[DE S.23]`.
> **Achtung, Engine:** `docs/spec-setup-system.md` und die Szenariodaten der
> Produktionsdatenbank verwenden an einigen Stellen noch `T`/`R`/`FF`. Eine
> Umstellung ist eine eigene Entscheidung und hier **nicht** vorgenommen.

- **Wie viele `D`-Felder?** Die Anleitung nennt **keine Anzahl**, nur „(noch)
  verfügbare Dörfler-Startpositionen". Die Beispielgrafik zeigt fünf; bei 7
  Dörfler-Tableaus ist eine feste 5 nicht belegbar. Richtig ist: **so viele, wie
  die Schlachtfeld-Übersicht zeigt.**
- **Der obere Teil der Tableau-Rückseite (Schlachtfeld-Übersicht mit `D`-, `B`-
  und Terrainfeldern) gilt für JEDEN Kampf** gegen diesen Bösewicht. Nur der
  Bereich darunter gilt zusätzlich im Endgegner-Kampf: „Der gesamte Bereich
  **unterhalb** der Schlachtfeld-Übersicht ist dem Endgegner-Kampf gewidmet"
  `[DE S.15]`, `[DE S.23]`. (Das Banner „FINAL FIGHT" steht auf allen Rückseiten
  und bezeichnet nur diesen unteren Abschnitt.)

**Kampf-Beginn** ist ein definierter Zeitpunkt: „nach dem letzten Schritt des
Kampf-Aufbaus und vor dem ersten Zug" `[DE S.35]`. Dort wird geprüft:
„**Überprüft immer zu Kampfbeginn die Bösewicht-Fähigkeit** des aktuellen
Bösewichts. Es gibt verschiedene Arten von Bösewicht-Fähigkeiten und sie können
zu verschiedensten Zeitpunkten im Kampf ausgelöst werden." `[DE S.17]`

**Der Kampf beginnt mit dem Zug des Bösewichts** `[DE S.13]`.

**Zusätzlich bei Neue Nachbarn:** Überfall-Karte(n) lesen und neben das
Kampfbrett legen (§10.2) — eine Erweiterungsregel, die die deutsche Anleitung
nicht kennt.

### 5.2 Stufen-Fähigkeit des Bösewichts

> „Welche Fähigkeiten der Bösewicht hat, ist davon abhängig, **wann** ihr auf ihn
> trefft: Je nachdem ob es euer 1., 2., 3. oder gar euer Endgegner-Kampf ist,
> gewinnt der Bösewicht an Stärke und bringt andere Fähigkeiten mit. **Die Stufe
> des aktuellen Bösewichts entspricht immer dem untersten sichtbaren
> Kampf-Platz. Bösewicht-Fähigkeiten gelten immer für den ganzen Kampf.**"
> `[DE S.15]`

Die **Stufe steht auf dem Kampf-Platz-Feld unter dem Plättchen**: „Die Stufe des
Bösewichts steht auf dem Feld unter seinem Plättchen und bestimmt seine
Fähigkeiten im Kampf" `[DE S.35]`. Gelesen wird also der **unterste noch
sichtbare** Kampf-Platz — was praktisch auf dasselbe hinausläuft (Kampf 1 = Stufe
1 usw.), aber der Lesemechanismus ist dieser.

| Platz | Stufe | Wirkung |
|---|---|---|
| 1 | **Tunichtgut** (engl. CHUMP) | schwächste Fähigkeitsstufe |
| 2 | **Rüpel** (engl. HOOLIGAN) | stärker |
| 3 | **Halunke** (engl. TROUBLEMAKER) | stärker |
| 4 | **Endgegner-Kampf** (engl. FINAL FIGHT) | verweist auf die Rückseite → §8 |

„Tunichtgut" ist für Platz 1 belegt `[DE S.34]`, „Endgegner-Kampf" für Platz 4.
**„Rüpel" und „Halunke" sind in der Erweiterungsanleitung belegt** — „Dr. Bosskops
**Rüpel**- und **Halunke**-Fähigkeiten lösen jedes Mal beim Erreichen der
Bedingung wieder aus" `[NN S.15]`. „Unruhestifter" ist damit erledigt, es kam aus
dem Video.
`⚠️ UNSICHER:` **welcher der beiden Platz 2 und welcher Platz 3 ist**, folgt nur
aus der Satzreihenfolge in diesem Zitat (Rüpel vor Halunke) — die Namen stehen
aufgedruckt auf dem Spielbrett und konnten dort nicht geprüft werden.
Ebenfalls **unbelegt**: dass Stufe 1 „meist reiner Flavourtext" sei. Die
Anleitung formuliert neutral (Zitat oben); dass Stufe 1 oft harmlos ist, ist eine
Tableau-Beobachtung, keine Regel.

Beispiel Handsy: Stufe 1 „Mediocre Monster" (nichts), Stufe 2 „Fabled Fighter"
(alle Aktionen mit ‚1000' im Namen +1 AUA), Stufe 3 „Folklore Frenzy"
(zusätzlich Ausrüstung entfernen) `[Tableau Handsy]`.

### 5.3 Schwäche und Beute

- Jedes Bösewicht-Tableau nennt eine **Schwäche (Weakness)**. Sie ist **nicht von
  Anfang an aktiv** und **muss erst durch eine Bösewicht-Aktion aktiviert
  werden** — kein „in aller Regel", kein „meist". Erst wenn eine Bösewicht-Aktion
  das sagt, legt man 1 Marker auf den **Kreis neben der Schwäche** auf dem
  Tableau, und erst dann wirkt ihr Effekt `[DE S.15]`, `[E01 1:17:31]`.
  > „**WICHTIG: Die Schwäche eines Bösewichts ist nicht von Anfang an aktiv!** Sie
  > **muss** erst durch eine Bösewicht-Aktion aktiviert werden. Sobald eine
  > Bösewicht-Aktion euch sagt, dass die Schwäche des Bösewichts jetzt aktiv ist,
  > legt 1 Marker auf den Kreis neben der Schwäche auf dem Bösewicht-Tableau, um
  > das anzuzeigen." `[DE S.15]`

  Das Glossar formuliert weicher — „Sie ist nicht von Anfang an aktiv und **kann
  normalerweise** durch eine Bösewicht-Aktion aktiviert werden" `[DE S.35]`. Im
  Zweifel gilt der Regelabschnitt S. 15: er ist die speziellere Stelle und
  ausdrücklich fett als „WICHTIG" markiert. Ein abweichender Aktivierungsweg
  müsste auf einem Tableau ausdrücklich gedruckt stehen.
- **Das gilt auch dann, wenn der Schwächentext eine eigene Auslösebedingung
  trägt.** Viele Schwächen sind als Dauer- oder Wiederholungseffekt formuliert
  (Deputy Waggums: „Whenever Waggums takes an action, if a townsfolk does not take
  DMG by the end of the action, Waggums takes 1 DMG."; Pepin Milkfrog: „Pepin takes
  +1 DMG when attacked from the 2 squares directly behind him."). Dieser Text
  beschreibt, **wie** die Schwäche wirkt, sobald sie aktiv ist — er aktiviert sie
  nicht selbst. Das Regelwerk nennt diesen Typ ausdrücklich: Effekte, die „**ab
  jetzt** passiv [gelten] oder … immer wieder ausgelöst werden [können]"
  `[DE S.15]`. Erkennungsmerkmal: der aufgedruckte Markierkreis neben „WEAKNESS".
- **Am Tisch ist die Schwäche ein Zustand pro Kampf**, Startwert *aus*. Der
  Auslösetext wird erst ausgewertet, wenn sie scharfgestellt ist.
- Bösewichte lassen sich auch **ohne** aktivierte Schwäche besiegen: „Ihr könnt
  Bösewichte natürlich auch besiegen, ohne ihre Schwächen zu aktivieren"
  `[DE S.15]`.
- **Im Endgegner-Kampf kann die Schwäche eine andere sein:** „Bei den meisten
  Bösewichten ist die Schwäche immer die gleiche – ob im Endgegner-Kampf oder in
  einem der 3 davor. **Einige wenige Bösewichte aber haben im Endgegner-Kampf
  eine andere Schwäche** als wenn ihr vorher auf ihn trefft." `[DE S.23]`
- Unten auf dem Tableau stehen die **3 Bösewicht-Ausrüstungen**, die man erbeuten
  kann. Die mit **(★)** markierte kann zusätzlich **während** des Kampfes erlangt
  werden: „Bösewicht-Ausrüstung mit [★] kannst du bereits während des Kampfes
  gegen den Bösewicht erhalten, wenn du bei dem Knaller-Bonus **9+** würfelst"
  `[DE S.32]`, `[DE S.8]` (§6.4).

### 5.4 Bösewicht-Werte (BEW und LEB) — **die geklärte Frage**

**Regel** `[DE S.13]`, Aufbauschritt 9:

> „Legt je 1 (schwarzen) Marker auf die 2 Startwerte für BEWEGUNG und LEBEN des
> Bösewichts auf den beiden Werte-Leisten des Zusatz-Bretts. Ihr findet die Werte
> auf der **Vorderseite des Bösewicht-Tableaus**. Welche Werte zutreffen ist
> abhängig von der **Anzahl Dörfler im Spiel**. Nutzt die, die zu eurer Anzahl
> passen."

Und `[DE S.15]`: „Sowohl BEWEGUNG als auch LEBEN des Bösewichts sind von der
**Anzahl der Dörfler** abhängig."

Auf dem Tableau stehen darum vier Spalten **2P / 3P / 4P / 5P**. Maßgeblich ist
die **Anzahl Dörfler im Spiel** — nicht die Spieleranzahl. **Solo mit 3 Dörflern
⇒ immer die 3P-Spalte.** Die Herleitung über „controlled townsfolk" aus
`[BR S.12]` ist damit nicht mehr nötig; die deutsche Formulierung ist direkter.

Der Startwert ist **gleichzeitig das Maximum**: „Gleichzeitig ist dieser Wert aber
auch das Maximale LEBEN des Bösewichts, denn auch wenn er Leben erhält (zum
Beispiel durch Heilung), **kann er nie mehr LEBEN haben, als der Startwert
besagt**." `[DE S.15]`

Verändert ein Effekt die BEW des Bösewichts („-1 BEW für den Bösewicht"), wird
**der Marker auf seiner BEWEGUNG-Leiste sofort verschoben** `[DE S.17]`.

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
- Barry Bluff trägt oben links das Kürzel **FN** — er gehört zu **Neue Nachbarn**.
- **Alle übrigen 19 Bösewichte** (11 aus dem Basisspiel, 7 aus Neue Nachbarn)
  haben **fest gedruckte Zahlen** in den Spalten 2P/3P/4P/5P. Einzeln geprüft:
  - Basisspiel `[Z:\Austausch\TfT\*.pdf]`: Bort Dovis, Bundits, Deputy Waggums,
    Handsy, Lawman Dozy, Penny Pinchetti, Virginia Fitz, Will Barlow.
  - Neue Nachbarn `[Z:\Austausch\TfT\*.pdf]`: Ernie Offal, Red Atrocious,
    Tilda Fields (alle mit FN-Kürzel **und** Zahlen **und** Überfall-Zeile).
  - TTS-Mod `[scratchpad/tableaus/]`: Qing & Kween, Umbrello, Samuel Strawman,
    Pepin Milkfrog (Basis) sowie The Door Knockers, Tartar Fishboy,
    Ms. Falls & Co., Patches (FN) — alle mit Zahlen.

**Fazit:** Die frühere Vermutung („Basisspiel gedruckt, Neue Nachbarn Formel")
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
| Will Barlow | Jupp Karre | 7/7/7/7 | 11/14/17/20 | – ⚠️ Druckfehler, siehe unten |
| Qing & Kween | Nönigin & Könich | 6/6/7/7 | 11/14/17/20 | – |
| Umbrello | Fürst Wetternich | 6/6/7/7 | 11/14/17/20 | – |
| Samuel Strawman | Rüdiger Schreck | 6/7/7/8 | 11/15/18/21 | – |
| Pepin Milkfrog | Freddy Froschmilch | 6/6/7/7 | 11/14/17/20 | – |

**Neue Nachbarn (8):**

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

`✅ BELEGT:` Die Zuordnung *Deputy Waggums = Willi Wedler* und
*Handsy = Truthand* war lange nur aus der Bedeutung erschlossen (wag → wedeln;
Hand → Truthand). Sie ist jetzt direkt belegt: jede Bösewicht-Beutekarte trägt
den **deutschen Bösewichtnamen senkrecht am linken Kartenrand**. „WEDELNDER
SCHWANZ" (= *Distracting Tail* ★ auf Deputy Waggums' Tableau) trägt
„WILLI WEDLER", „DICKE HANDSCHUHE" / „ZAHNSCHNABEL" (= *Oversized Gloves* ★ /
*Handsy's Beak*) tragen „TRUTHAND"
(`docs/befund-beute-und-aufstellbares.md` §2.4). Alle übrigen Zuordnungen sind
über Artwork, Aktionstexte oder Story eindeutig.

**Die acht Namenszuordnungen der Erweiterung sind jetzt direkt belegt** —
`[NN S.15]` nennt alle acht deutschen Bösewichtnamen: Arnold Schmatz, **Viktor
Visage**, Die wei**ß**en Herren, Fleckchen, Thea Kotta, Fritze Fischkopp,
Dr. Bosskop, Rosa Voir & die WG. Dazu zwei Überfall-Kartennamen auf Deutsch:
Dr. Bosskops **„Pestdoktor"** (= *Plaguebearer*) und Viktors **„Die Gurte der
Maske"** (= *Mask Straps*).

**⚠️ Druckfehler auf Jupp Karres Tableau — betrifft genau die Solospalte**
`[FAQ S.2]`:

> „Bösewicht, Jupp Karre: Hier steht aus Versehen **2 mal 2D**. Wie ihr euch aber
> vermutlich schon gedacht habt, **soll das 2D mit höherem Leben eigentlich ein 3D
> sein**."

Auf Jupp Karres Tableau ist die Spalte **3 Dörfler fälschlich mit „2D"
beschriftet**. Solo (3 Dörfler) ist also die **zweite** Spalte zu nehmen — die mit
dem höheren LEB (14), nicht die erste. Die Zahlen in der Tabelle oben sind
richtig, nur die Spaltenbeschriftung auf der Pappe ist falsch. (Frosted Games
bietet dafür einen Aufkleberstreifen an.)

**⚠️ Fehlende Markierung auf Schnarchberts Aktionskarte „Unruhige Beine"**
`[FAQ S.2]`: „Hier fehlt die [zzz]-Markierung unten auf der Karte. **Schnarchbert
pennt aber dennoch**, wie auf der Karte angegeben. Der Effekt auf seiner
„Schlafwandler"-Karte löst dennoch wie üblich aus."

---

## 6. Kampfablauf

### 6.1 Zugreihenfolge

- **„Wer ist dran?"-Leiste in Kloppen-Reihenfolge, oben nach unten.** Der
  **Bösewicht steht oben und ist immer zuerst dran** `[DE S.13]`, `[E02 01:53]`.
- Danach reihum die Dörfler, dann wieder von oben.
- **Drei Auslöser für „Bösewicht-Aktion ausführen"** `[DE S.16]`: „Immer wenn …
  der Bösewicht in Kloppen-Reihenfolge **am Zug** ist, … **ein Effekt** euch
  auffordert eine Bösewicht-Aktion auszuführen, … beim Bösewicht ein
  **Wutausbruch** ausgelöst wird … Zieht die oberste Bösewicht-Aktion vom
  Ziehstapel und handelt sie ab. Werft sie danach auf die Ablage ab."
- **Keine Diagonalen.** „Diagonal is nich, Sportsfreund. **Nie, einfach nie!**"
  `[DE S.7]`. Entfernungen „werden immer auf die gleiche Weise gezählt: über
  vertikal und horizontal angrenzende Felder und **niemals diagonal**"
  `[DE S.32]`.
- **Ein einziger W10** wird für alles verwendet: „Du würfelst immer – bei
  Dorf-Ereignissen, Angriffen, Interaktionen und Bösewicht-Aktionen – nur mit
  genau 1 Würfel mit 10 Seiten (W10)." `[DE S.32]`
- **Mehrere Effekte gleichzeitig:** „Was, wenn zu Beginn oder am Ende eines Zuges
  im Kampf gleich mehrere Effekte eintreten? **Ihr bestimmt gemeinsam**, in
  welcher Reihenfolge die Effekte eintreten." `[DE S.32]`

### 6.2 Zug des Bösewichts

**Der ganze Zug besteht darin, die oberste Karte des Ziehstapels zu ziehen und
abzuarbeiten; danach wird sie auf die Ablage abgeworfen** `[DE S.16]`.

Kartenaufbau — **fünf** Abschnitte `[DE S.16]`:

1. **Name.**
2. **Umschreibung** (Flavourtext).
3. **Das Ziel** — wird **zuerst und für die ganze Karte** bestimmt.
4. **Krawall** — „Hier tut der Bösewicht meist Dinge, die für euch schlecht sind.
   Meistens bewegt er sich und/oder fügt Zielen AUA zu."
5. **Nachspiel** — „ein Zusatz, den nicht alle Bösewicht-Aktionen haben", mit
   eigenem Auslöser (siehe unten).

**Auswertungsreihenfolge** `[DE S.17]`: Ziel bestimmen → **Krawall von oben nach
unten** → prüfen, ob das Nachspiel ausgelöst wurde → **Nachspiel von oben nach
unten** → Karte abwerfen.

**Das Nachspiel wird NICHT automatisch abgehandelt**, sondern genau in zwei
Fällen `[DE S.16]`:

- das Wort „Nachspiel" steht **nicht** im Krawall, das Ziel der Bösewicht-Aktion
  hat aber **1+ AUA erlitten**; **oder**
- das Wort „Nachspiel" steht **ausdrücklich** im Krawall und die dort genannte
  Bedingung (sofern vorhanden) ist erfüllt.

Es löst **auch dann** aus, wenn das Ziel inzwischen besiegt ist: „Ja, sofern das
Ziel innerhalb der Bösewicht-Aktion AUA erlitten hat oder es innerhalb der
Bösewicht-Aktion explizit erwähnt wird" `[DE S.32]`.

**Zielbestimmung** `[DE S.16]`:

- **Das Ziel kann „genau 1 Dörfler, mehrere Dörfler, Terrain oder auch niemand"
  sein.** „Einmal gewählt, bleibt das Ziel **bis zum Abwurf** dieser
  Bösewicht-Aktion gleich."
- **Die vier häufigen Ziele, mit Definition** `[DE S.18]`:
  - **Nahester Dörfler** — „der Dörfler, bei dem der Bösewicht die **wenigste
    BEWEGUNG** bräuchte, um **angrenzend** zu ihm zu stehen".
  - **Fernster Dörfler** — analog mit der **meisten** BEWEGUNG.
  - **Alle Dörfler innerhalb von X Feldern Entfernung.**
  - **Niemand.**
- Entfernung = **erforderliche Bewegungspunkte**, orthogonal gemessen.
  **Hindernis-Terrain verlängert den Weg** und kann einen Dörfler als „nahesten"
  ausschließen: „Würde der Bösewicht wegen des Hindernisses zu dir mehr BEW
  benötigen als zu einem anderen Dörfler, bist du nicht der nahester Dörfler und
  kommst als Ziel nicht in Frage." `[DE S.32]`
- `⚠️ ABGELEITET:` Dass **andere Dörfler im Weg nicht als Hindernis zählen**,
  steht nicht ausdrücklich in der Anleitung. Es folgt aus der Rammen-Regel — der
  Bösewicht bewegt sich sehr wohl auf besetzte Felder `[DE S.17]`, `[E02 06:20]`.
- Auch ein **unerreichbares** Ziel wird gewählt: „Der Bösewicht bewegt sich auch
  dann in Richtung seines Ziels, wenn er es **nicht erreichen** kann."
  `[DE S.17]`. **Aber:** „Soll eine Bewegung zu einem Ziel stattfinden, dass
  **nicht existiert**, findet aber **keine** Bewegung statt." `[DE S.17]`
- **Gleichstand:** „Gleichstände werden durch Würfeln entschieden: **Wer die
  kleinere Zahl würfelt, wird zum Ziel.**" `[DE S.16]` Bei Gleichstand im
  Gleichstandswurf: „Würfelt eben noch mal" `[DE S.32]`.
- **Kein gültiges Ziel:** „wird die Karte **trotzdem abgehandelt**. In diesem
  Falle **ignoriert ihr aber alle Anweisungen, in denen das „Ziel" vorkommt**."
  `[DE S.16]` — der zweite Satz ist die Implementierungsvorschrift.
- **Gemessen wird vom Bösewicht:** „Jede innerhalb einer Bösewicht-Aktion
  vorkommende Entfernung – sei es für eine Bewegung oder einen Angriff – wird
  immer **vom Bösewicht aus** gezählt, es sei denn, es steht etwas anderes da."
  `[DE S.17]`
- **Mehrere Aktionen hintereinander:** „Werdet ihr angewiesen, 2 oder mehr
  Bösewicht-Aktion auszuführen, zieht immer erst die erste Karte, **führt sie
  aus** und zieht **erst dann** die nächste." `[DE S.17]`

**Bewegung des Bösewichts** `[DE S.17]`:

- **Der Bösewicht bedeckt 2×2 Felder** (§5.10): „Da sie größer sind, entspricht
  **1 BEWEGUNG** hier aber **1 angrenzenden Paar an Feldern**." Nur horizontal
  oder vertikal. `[DE S.17]`, `[DE S.35]`
- **Blickrichtung:** „Der Bösewicht dreht sich in seiner Bewegung immer in die
  Richtung, **in die er sich gerade bewegt**." `[DE S.17]` (Nicht „zum Ziel" —
  das gilt nur für die Krawall-Passage „Dreht den Bösewicht Richtung Ziel".)
- **Kürzester Weg, Schaden nur als Tiebreak:**
  > „Bösewichte machen **keine Umwege** und bewegen sich immer auf dem
  > **kürzesten möglichen Weg**. Kommen dabei mehrere Wege in Frage, **bestimmt
  > gemeinsam**, welchen Weg er nimmt. Aber: **Bei gleicher Länge** vermeidet er
  > Wege, auf denen ihm AUA zugefügt werden würde." `[DE S.17]`

  Für die Engine: Schaden ist **kein Hindernis**, sondern ein **Tiebreak**. Ein
  kürzerer Weg mit Schaden sticht einen längeren ohne.
- **Bewegung endet beim Erreichen des Ziels:** „Sobald das Ziel erreicht wird,
  endet die Bewegung, selbst wenn der BEW-Wert noch weitere BEWEGUNG zulassen
  würde." `[DE S.17]` „Ziel erreicht?" = „wenn der Bösewicht sich Richtung vorher
  definiertes Ziel bewegt hat und dann mit seiner Bewegung **auf / angrenzend
  zum** Ziel angekommen ist" `[DE S.35]`.
- **BEW limitiert nur den Krawall** — harte Engine-Regel:
  > „**Wichtig:** Die Bewegung des Bösewichts wird **ausschließlich innerhalb des
  > Krawalls** der Bösewicht-Aktionen durch den BEW-Wert limitiert! … Bewegt sich
  > der Bösewicht innerhalb des **Nachspiels** oder bewegt ihr in durch
  > **Ausrüstungs-Fähigkeiten**, ist diese Bewegung stets **unabhängig** von
  > seinem BEW-Wert." `[DE S.17]` (Setzfehler „bewegt ihr in durch" im Original.)
- **Die FAQ gibt dafür das brauchbarere Kriterium** — es hängt am **Wortlaut der
  Anweisung**, nicht am Kartenabschnitt:
  > „Kurz und Knapp: **Entweder** die Bewegung eines Bösewichts (oder durch einen
  > eurer Effekte) sagt „**Er bewegt sich X Felder**", dann ist seine **BEW
  > unerheblich**; **oder** er bewegt sich „**auf etwas zu**", dann bewegt er sich
  > **bis zu seinem BEW**. Wir werden durch entsprechende Fettung auf den
  > Aktionskarten darauf hinweisen, für welche Bewegung der BEW relevant ist."
  > `[FAQ S.2]`

  Am Tisch also: **feste Feldzahl ⇒ BEW ignorieren; „Richtung/auf … zu" ⇒
  höchstens BEW Felder.** Die FAQ nennt diese Stelle der Anleitung ausdrücklich
  „etwas kryptisch" und kündigt eine überarbeitete Seite 17 an — **unser PDF hat
  sie bereits** (der „Wichtig"-Satz oben steht dort), es ist nichts nachzuladen.
- **Terrain:** „Bei Terrain gelten für den Bösewicht grundsätzlich die
  **gleichen** Regeln wie für Dörfler: Durch die meisten Gebiete kann er sich
  durchbewegen, durch Hindernisse jedoch nicht." `[DE S.17]`
- **„Bewege dich vorwärts":** „Der Bösewicht dreht sich mit dem Gesicht in
  Richtung des Ziels und bewegt sich dann so viele Felder weit in Blickrichtung,
  wie sein BEWEGUNG-Wert angibt (sofern möglich). Steht das Ziel **schräg**, dreht
  er sich in die Richtung des **kürzesten Weges**; steht es **genau diagonal**,
  entscheidet die Gruppe. Stößt er an ein unpassierbares Hindernis-Terrain,
  **endet seine Bewegung**." `[DE S.18]`

**Rammen** (nicht „Rempeln") `[DE S.17]`:

> „Will sich der Bösewicht auf das Feld bewegen, auf dem du grade stehst,
> **rammt** er dich: Du musst dich **sofort auf ein angrenzendes freies Feld
> deiner Wahl** bewegen. Diese erzwungene Bewegung **kostet dich aber keine BEW**
> und kann **mehrmals innerhalb von 1 Bösewicht-Aktion** passieren."

- Es ist für die Dörfler oft **nützlich**: „Das kannst du natürlich auch
  strategisch nutzen, um dich schnell und ohne BEW ausgeben zu müssen, anders zu
  positionieren." `[DE S.17]`
- „Wirst du gerammt und es gibt **kein freies angrenzendes Feld**, … platziere
  dich auf dem **nahesten freien Feld**." `[DE S.17]`
- Auch beim **Schieben/Ziehen** des Bösewichts: „Wird ein Bösewicht auf ein Feld
  geschoben oder gezogen, auf dem ein Dörfler steht, wird dieser **gerammt**, als
  ob sich der Bösewicht aus eigenem Wille dort hinbewegt hätte." `[DE S.17]`

**Schieben und Ziehen** `[DE S.17]`:

> „Werdet ihr angewiesen, 1 Figur zu **schieben** oder zu **ziehen**, spielt der
> BEW-Wert und somit auch der zurückzulegende Weg übers Schlachtfeld dafür
> **keine Rolle**. Schieben und Ziehen zählen **nie als Bewegung**! …
> Unterschied: **Zieht** ihr eine Figur näher an ein Ziel heran, muss dabei
> **jedes Feld die Entfernung zum Ziel verringern**. Beim **Schieben** ist es
> andersrum: … muss dabei **jedes Feld die Entfernung zum Ziel vergrößern**."

**Platzieren ≠ Bewegen** `[DE S.17]`:

- Entfernung und BEW spielen keine Rolle. „Platzierung zählt nie als Bewegung!"
- Ist die Position blockiert, wird **auf dem nahesten freien Feld** platziert.
- „Bei mehreren möglichen Optionen, **entscheidet ihr gemeinsam**!"
- „**Gibt es kein gültiges Feld**, auf dem die Figur platziert werden kann,
  **bleibt sie, wo sie ist**."

**Fernkampf des Bösewichts** `[DE S.17]`: Das Wort „Fernkampf" kann im Krawall
stehen; der Bösewicht muss dann innerhalb der genannten Reichweite stehen.
„**Anders als ihr ignoriert der Bösewicht im Fernkampf alle Hindernisse**, die
zwischen ihm und seinem Ziel stehen." Glossar: „Fernkampf-Angriffe von
Bösewichten werden von Terrain **nicht** blockiert" `[DE S.35]`.

**Aktionsdeck leer** `[DE S.17]`: „Liegt keine Bösewicht-Aktion mehr auf dem
Ziehstapel, mischt **alle** Bösewicht-Aktionen im Ablagestapel und legt sie
verdeckt auf das Feld „Ziehstapel"." Verlangt eine Karte ein Mischen, wird
„(sofern nicht anders vorgegeben) **alle** Bösewicht-Aktionen aus dem
Ablagestapel" eingemischt.

**Karten gelten schon während der Abhandlung als abgeworfen** `[DE S.17]`:

> „**Wichtig:** Bösewicht-Aktionen gelten **bereits während ihres Abhandelns** als
> abgeworfene Bösewicht-Aktionen im Ablagestapel! Bedenkt das, wenn eine
> Bösewicht-Aktion euch auffordert die Bösewicht-Aktionen zu mischen. Führt in
> diesem Fall **trotzdem ihr Nachspiel aus**, auch wenn die Karte bereits
> eingemischt wurde."

> **⚠️ Dieser Passus wird gestrichen** `[FAQ S.2]`. Die FAQ: „Glücklicherweise
> betrifft dies **nur Effekte, die besagen, dass anschließend noch eine
> Bösewicht-Aktion aufgedeckt und abgehandelt wird**. Dennoch ist es unschön, sich
> einen Effekt merken zu müssen, der auszuführen ist, aber nicht mehr auf einer
> Karte sichtbar. **Wir werden diesen Passus streichen** und alle entsprechenden
> Effekte auf Karten so umformulieren, dass das zurückmischen im selben Satz
> stattfindet, wie die Anweisung zur zusätzlichen Bösewicht-Aktion."
>
> **Für den Tisch heißt das:** Wird eine Karte beim Abhandeln eingemischt, ist nur
> noch das auszuführen, was **auf derselben Karte im selben Satz** mit dem
> Mischbefehl steht — in der Praxis die zusätzliche Bösewicht-Aktion. Ein
> Nachspiel aus dem Gedächtnis nachzuholen ist **nicht** mehr nötig. Die
> Anleitung ist hier überholt.

**Karten, die liegen bleiben** `[DE S.17]`: „vor dir" → gilt nur für den
Betreffenden, „vor euch" → für alle; der Text im farbigen Kasten gilt, solange
die Karte ausliegt. **Obergrenze:** „Ausliegende Bösewicht-Aktionen werden
**immer nach dem Kampf** abgeworfen (es sei denn es steht explizit anders da)."
Karten, die zwar nicht ausgelegt werden, aber über ihre Abhandlung hinaus wirken,
„legt euch … etwas abseits hin" — sie zählen bereits zu den abgeworfenen.

**Die fünf häufigen Krawall-Passagen und ihre Auslegung** `[DE S.18]`:

1. „Bewegt den Bösewicht Richtung Ziel. Dann, **nur wenn Ziel erreicht**: Fügt
   dem Ziel 1 AUA zu."
2. „Er versucht dabei, sich **vollständig** auf das Ziel zu bewegen." — bei einem
   **Gebiet-Terrain** als Ziel bleibt er erst stehen, wenn er vollständig darauf
   steht oder seine BEWEGUNG aufgebraucht ist.
3. „Füge **jedem** Ziel 1 AUA zu. **Dann**, bewegt den Bösewicht Richtung
   fernsten Dörfler." — der Schaden kommt zuerst, egal wie weit entfernt.
4. „**Legt diese Karte offen** vor das Ziel/euch."
5. „**Dreht den Bösewicht Richtung Ziel und bewegt ihn vorwärts.**"

### 6.3 Zug eines Dörflers

„In deinem Zug kannst du **in einer Reihenfolge deiner Wahl** eine Menge Dinge
tun, sofern du dafür genug BEW, MUMM, Münzen … hast" `[DE S.20]`:

| Aktion | Kosten / Grenze |
|---|---|
| **Bewegen** | 1 BEW = 1 orthogonal angrenzendes Feld |
| **Angreifen** | MUMM-Kosten der Waffe; **jede Waffe max. 1× pro Zug** |
| **Terrain-Interaktion** | MUMM- oder Münzkosten der Terrain-Karte; **max. 1× pro Terrain-Plättchen pro Zug** |
| **Ausrüstungsfähigkeit aktivieren** | wie angegeben; **jede Ausrüstung max. 1× pro Zug** — bei mehreren Fähigkeiten auf einer Karte **nur eine davon** |
| **Dörfler-Fähigkeit aktivieren** | meist MUMM; **jede max. 1× pro Zug**, MUMM-Fähigkeiten **nur im eigenen Zug** |
| **Ausrüstung auswechseln** | **2 MUMM pro Slot** (Ausnahme: beide Hände zusammen) |
| **Mumm zusammenraffen (Neuwurf)** | **2 MUMM**, max. 1× pro Angriffs-/Terrainwurf |
| **Aufstellbares platzieren** (Toller Trödel) | keine Kosten, auf ein leeres angrenzendes Feld |

**Bewegung** `[DE S.20]`, `[E02 15:56]`:

- BEW ist ein **Vorrat pro Zug**. „Du musst aber deine Bewegung **nicht an einem
  Stück** ausführen und darfst **zwischen den Schritten andere Aktionen**
  ausführen." Aktionen verbrauchen keine Bewegungspunkte.
- „Du darfst dich **nicht** auf Felder mit **Hindernissen oder Bösewichten**
  bewegen. Du darfst dich aber **durch andere Dörfler durchbewegen**, solange du
  die Bewegung wieder **auf einem freien Feld beendest**." `[DE S.20]`
- **Fremdbewegung ist BEW-unabhängig:** „**Wichtig:** Wirst du durch eine
  Bösewicht-Aktion oder eine Ausrüstungs-Fähigkeit bewegt, ist dies **unabhängig
  von deinem BEW-Wert**." `[DE S.20]`

**Marker: wann verschieben, wann nicht** `[DE S.7]`, `[DE S.10]`:

- **Verbrauch** von BEW und MUMM wird im Kopf mitgezählt, der Marker bleibt
  stehen: „Deine Marker für BEWEGUNG und MUMM solltest du **nur anpassen, wenn
  ein Effekt deren Wert verändert**. Bei der ganz normalen Durchführung deines
  Zuges zählst du einfach deine schon genutzte BEWEGUNG und MUMM im Kopf mit."
  `[DE S.7]`
- **Verändert ein Effekt den Wert, wird der Marker sofort verschoben** — und zwar
  auch bei **direkten** (nicht schwarz markierten) Änderungen und auch bei
  **Kosten in Wertform**: „Die Fähigkeit besagt, dass du entweder deinen MUMM oder
  deine PRZ um 1 verringern musst. **Du schiebst dementsprechend den Marker** des
  gewählten Werts um 1 Feld auf seiner Leiste nach unten." `[DE S.10]`
- Bei **besonderen** Änderungen („nur für diesen Zug"): „Passe daher nur dann
  deine entsprechenden Marker an, wenn du sonst durcheinanderkommen würdest (und
  **vergiss dann nicht, die Marker direkt nach deinem Zug wieder
  zurückzusetzen**)." `[DE S.10]`
- Die frühere Formulierung „der Marker wird **nur** bei dauerhaften
  Wertänderungen verschoben" war zu absolut.
- **Hat ein Bonus keine Dauerangabe, gilt er für die aktuelle Runde** — also bis
  zur Nachbereitung —, nicht für die ganze Partie (§4 Schritt 2, `[DE S.10]`,
  `[DE S.22]`).
- **Die Leisten sind harte Grenzen:** „Die Marker können die Leisten **nie
  verlassen**, Veränderungen darüber hinaus **verfallen** somit einfach."
  `[DE S.7]` Ein +3 BEW auf einer Leiste mit nur 1 freien Feld ist kein
  gespeicherter Überschuss.
- **PRZ kann negativ sein:** „Bei einem Angriff würfelst du immer 1
  Angriffs-Wurf und rechnest dann deinen PRÄZISION-Wert zu dem Würfel-Ergebnis
  hinzu (**oder ziehst ihn ab, sofern er negativ ist**)." `[DE S.7]`

**Ausrüstung im Kampf** `[DE S.21]`:

- **Anlegen/Tauschen kostet 2 MUMM PRO SLOT**, beliebig oft pro Zug:
  > „Zahle 2 MUMM, um 1 weggepackte Ausrüstung an 1 deiner Ausrüstungs-Slots
  > anzulegen. Befindet sich an diesem Slot bereits Ausrüstung? Packe sie vorher
  > weg. Während deines Zuges darfst du Ausrüstung so oft du willst wechseln,
  > **musst aber pro Slot jedes Mal 2 MUMM zahlen**. **Ausnahme:** Ausrüstung in
  > deinen **beiden Hand-Slots** darfst du **gleichzeitig** wechseln, ohne doppelt
  > MUMM bezahlen zu müssen." `[DE S.21]`

  Also: zwei Einhandwaffen wegpacken und eine Zweihandwaffe anlegen = **2 MUMM**;
  Kopf und Brust zusammen = **4 MUMM**. Ebenso `[DE S.10]` und `[DE S.35]`.
- **Weggepackte Ausrüstung wirkt nicht.** Ausnahme ist das Merkmal
  **„Seltsam"**, nicht die Kartenart „Besondere Ausrüstung":
  > „**Seltsame Ausrüstung** — Manche Ausrüstung hat das Merkmal „Seltsam". Diese
  > Art von Ausrüstung **kann an keinen deiner 6 Slots angelegt werden**.
  > Wertveränderungen und Fähigkeiten von Seltsamer Ausrüstung sind daher auch
  > **schon aktiv, sobald sie in deinem Besitz ist**." `[DE S.9]`

  Randnotiz derselben Seite: „Seltsame Ausrüstung ist **immer aktiv**, solange sie
  in deinem Besitz ist!" Sie gilt dauerhaft als weggepackt `[DE S.9]`.
  **„Besondere Ausrüstung" (gelber Rand) ist dagegen nur eine Herkunftsart** —
  Ausrüstung, „die du nur unter bestimmten Bedingungen erhältst" `[DE S.8]`,
  `[DE S.35]`. Sie muss **normal angelegt** werden.
- **Was gilt als weggepackt:** „**Nur angelegte Ausrüstung kann weggepackt
  werden.** Jegliche nicht angelegte Ausrüstung (auch Ausrüstung mit dem Merkmal
  „seltsam") in deinem Besitz **gilt als weggepackt**." `[DE S.9]`
- **Max-LEB-Feinheiten** `[DE S.10]`:
  - Sinkt das **Max LEB** (Anlegen, Wegpacken, Abwerfen oder ein Effekt), sinkt
    das aktuelle LEB mit — **aber nur, „sofern es vorher voll war"**.
  - Steigt das **Max LEB in der Dorfphase**, „setze auch dein LEBEN **sofort**
    mit auf diesen neuen maximalen Wert".
  - Steigt das **Max LEB im Kampf**, „erhöht sich dadurch allerdings dein LEBEN
    **nicht** automatisch mit".
  - `⚠️ ABGELEITET:` Dass die Absenkung **kein AUA** ist (und damit keine
    schadensgebundenen Reaktionen auslöst), steht nicht in der Anleitung. Sie
    sagt nur, dass sich das LEBEN mitsenkt.
- **Werteänderungen wirken sofort:** „Wird durch Effekte oder das Anlegen,
  Wegpacken oder Abwerfen von Ausrüstung 1 oder mehrere deiner Werte verändert,
  **passe deine Werte-Leisten sofort** entsprechend an." `[DE S.10]`
- **Marker auf Ausrüstung** bleiben liegen: „Marker auf Ausrüstung werden **weder
  zwischen den Runden noch beim Wegpacken oder Auswechseln** der Ausrüstung
  entfernt." `[DE S.21]`, `[DE S.35]`
- **Snacks** (nicht „Verzehrbares" — das Wort kommt in der Anleitung nicht vor):
  „Snacks sind konsumierbare Ausrüstung. Snacks legst du – genau wie andere
  Ausrüstung auch – **an ihren passenden Slot** an. In deinem Zug darfst du den
  Snack dann „**snacken**" und aktivierst dadurch seine Fähigkeit." `[DE S.9]`
- **Mehrere Fähigkeiten auf einer Karte:** „Es gibt auch Ausrüstung mit mehreren
  Fähigkeiten: Dann darfst du **immer nur 1 Fähigkeit der Ausrüstung pro Zug**
  aktivieren." `[DE S.21]` — das ist eine **Grundregel des Basisspiels**, nicht
  nur eine Odd-Jobs-FAQ.
- **Fähigkeiten können automatisch auslösen:** „Manche Fähigkeiten kannst du auch
  nur in bestimmten Phasen aktivieren oder sie werden **automatisch aktiviert**,
  wenn etwas Bestimmtes passiert." `[DE S.21]`
- **Reichweite wird von der Quelle gemessen:** „wird diese Reichweite immer **von
  der Quelle der Fähigkeit aus (also von dir)** gemessen, es sei denn der Text
  sagt explizit etwas anderes." `[DE S.10]`
- **„Erste Karte einer bestimmten Art vom Nachschub nehmen"** `[DE S.10]`: so
  lange oben aufdecken, bis die erste Karte dieser Art gefunden ist; sie nehmen,
  alle anderen aufgedeckten „in beliebiger Reihenfolge als **unterste** Karten
  unter den Nachschub". „Bist du bei deiner Suche an der untersten Karte des
  Nachschubs angekommen und nicht fündig geworden? **Du gehst leer aus. Mische
  dann den Nachschub neu.**"
- **Abwerfen ist endgültig:** „Abgeworfene Ausrüstung … **verlässt das Spiel**.
  Lege sie dazu zurück in die Spielschachtel." Wer abwerfen muss, darf „sowohl
  angelegte als auch weggepackte Ausrüstung" abwerfen `[DE S.10]`.
- **Zweihandwaffen:** „2-Hand-Waffen … belegen deine **beiden Hand-Slots**. Wenn
  du eine 2-Hand-Waffe angelegt hast, kannst du also keine weitere Waffe
  anlegen." `[DE S.9]`
- **MUMM-Fähigkeiten nur im eigenen Zug:** „Deine Dörfler-Fähigkeiten, die dich
  MUMM kosten, darfst du **nur während deines Zuges** aktivieren – jedoch **jede
  nur maximal 1x pro Zug**." `[DE S.20]`

**„Tappen" (Quer legen)** — *Tischkonvention, keine gedruckte Regel*:
Ausrüstung, deren Fähigkeit „einmal pro Kampf" gilt, wird nach Gebrauch **um 90°
gedreht**, damit man sie nicht erneut nutzt. Zum nächsten Kampf wird alles wieder
gerade gelegt `[E02 27:29]`. Regeltechnisch gilt schlicht: **jede Fähigkeit max.
1× pro Zug, sofern nicht anders angegeben** `[DE S.21]`; steht „einmal pro Kampf"
auf der Karte, gilt das. **Achtung:** viele Snack-Karten des Basisspiels sagen
stattdessen **abwerfen** — die sind dann endgültig weg `[E02 27:41]`
(Odd-Jobs-Snacks dagegen nicht, §9.4).

**Terrain-Interaktion** `[DE S.14]`, `[DE S.20]`, `[E02 17:15]`:

- **Hindernis-Terrain (brauner Rand):** „blockieren Bewegung – **sowohl von
  Dörflern als auch von Bösewichten**. Sie sind unpassierbar und müssen umgangen
  werden." Zum Interagieren muss der Dörfler „auf einem (horizontal oder
  vertikal) **angrenzenden** Feld" stehen. „Bei einigen Hindernis-Terrains musst
  du dich sogar an einer ganz **bestimmten Position** befinden … Beispiel: Um mit
  **Marodes Farmhaus** zu interagieren, muss dein Dörfler **vor der Tür**
  stehen." `[DE S.14]`
- **Gebiet-Terrain (grüner Rand):** betretbar „sowohl von Dörflern als auch von
  Bösewichten". Zum Interagieren muss der Dörfler **auf einem Feld innerhalb des
  Gebiets** stehen. `[DE S.14]`
- Interaktion kostet den auf der **Terrain-Karte** angegebenen MUMM- oder
  Münzpreis; „Du darfst mit **jedem einzelnen Terrain-Plättchen maximal 1x pro
  Zug** interagieren" — zwei Holzzäune sind zwei Plättchen `[DE S.14]`.
- **Terrain-Würfe** heißen Würfe für Terrain-Interaktionen; sie dürfen mit „Mumm
  zusammenraffen" **1× wiederholt** werden `[DE S.14]`, `[DE S.20]`.
- Betretungskosten: „Beispiel: Um dich auf ein Feld von **Dichter Wald** zu
  bewegen, musst du **2 BEW** zahlen, anstatt wie normal 1 BEW." `[DE S.14]`
  - **Das gilt auch für Bösewichte.** Die frühere Behauptung („gilt nicht für
    Bösewichte") ist falsch: Gebiet-Terrains sind „sowohl von Dörflern als auch
    von Bösewichten" betretbar und können dabei „die Bewegung … einschränken"
    `[DE S.14]`; „Bei Terrain gelten für den Bösewicht grundsätzlich die
    **gleichen** Regeln wie für Dörfler" `[DE S.17]`.
    `⚠️ OFFEN:` ob die Terrain-Karte „Dichter Wald" selbst eine Ausnahme für
    Bösewichte druckt, ist ungeprüft — die Karte liegt nicht vor.
  - **Nicht** gilt es für Bewegung durch Ausrüstungs-Fähigkeiten oder
    Bösewicht-Aktionen: die ist BEW-unabhängig `[DE S.17]`, `[DE S.20]`.
- Einige Terrain-Teile lassen sich **zerstören oder umwandeln** (Zaun einreißen,
  Sprengstoff zünden), manche darf man **angreifen** und richtet dann
  Flächenschaden an `⚠️ NUR VIDEO: [E02 18:36]`, `[E02 19:59]`, `[E02 43:56]`.
  Die Einzelheiten stehen auf den Terrain-Karten, nicht in der Anleitung (§13.8).
- **Die 20 Terrainnamen des Grundspiels** stehen auf der Anleitungsrückseite
  `[DE S.36]` — siehe §13.8. Korrigiert gegenüber den Videountertiteln:
  „TNT + Zünder" → **Sprengstoff & Auslöser**, „Plumpsklo" → **Miefiges
  Plumpsklo**, „Arzthütte" → **Hütte des Dorfdoktors**, „Wackelhof" → **Marodes
  Farmhaus**.
- **Die 7 Terrains je Grundspiel-Bösewicht** stehen vollständig auf `[DE S.33]`,
  zusammen mit bösewichtspezifischen Sonderregeln. Das sind **Szenariodaten** und
  gehören in `setups.scenario_data`, nicht in diese Datei.

### 6.4 Angreifen

**Die drei gedruckten Schritte** `[DE S.20]`:

1. **Überprüfen:** Reichweite zum Ziel vorhanden **und freie Schussbahn**?
2. **Kosten:** MUMM-Kosten der Waffe zahlen (dafür wird der Marker **nicht**
   verschoben).
3. **Würfeln:** 1 Angriffs-Wurf mit dem W10, **PRZ addieren**. „Erreicht das
   Ergebnis mindestens die **Trifft-Voraussetzung** der Waffe? Dann landest du
   einen Treffer!" Bei Treffer erleidet das Ziel „AUA in Höhe des AUA-Wertes der
   Waffe".

Der Zielwert der Waffe heißt **„Trifft-Voraussetzung"** `[DE S.20-21]`, `[DE S.35]`
(bisher „ACC-Wert"). Und: „**Nicht jede Waffe kann AUA zufügen.**" `[DE S.35]`

**Reichweite** `[DE S.20]`:

- „Reichweite wird genau gleich gezählt wie Bewegung: Angrenzende horizontale und
  vertikale Felder."
- „**Jede** Waffe hat eine Reichweite, aber nicht bei jeder steht sie dabei."
  Nahkampfwaffen haben „sofern nicht anders vorgegeben … alle **Reichweite 1**".
- **Reichweite 0 gibt es nicht:** „Hast du eine Waffe mit Reichweite 5, kannst du
  somit Ziele auf jedem Feld in **1–5** Feldern Entfernung zu dir angreifen.
  Warum nicht in 0 Feldern Entfernung? Weil du da selbst stehst."
- **Die Reichweite wird NICHT entlang der Schussbahn gemessen** `[FAQ S.1]`:
  > „Die Reichweite einer Fernkampfwaffe wird **nicht an der Sichtlinie
  > gemessen**. Es ist also möglich, mit einer Waffe mit Reichweite 4 auf einen
  > Gegner zu schießen, wenn **die kürzeste Strecke um ein Hindernis nur 3 Felder**
  > lang ist, die Sichtlinie jedoch 5 Felder lang wäre."

  Also zwei getrennte Prüfungen: **Reichweite** = kürzeste orthogonale Strecke
  (um Hindernisse herum), **freie Schussbahn** = die gerade Linie Ecke zu Ecke.
  Beide müssen stimmen, aber die eine wird nicht an der anderen gemessen.
- **Jede Waffe darf pro Zug einmal angreifen**, sofern nichts anderes dasteht.
  Mit zwei Einhandwaffen also zwei Angriffe `[DE S.20]`, `[E02 26:54]`.
- Man darf mit einer **Fernkampfwaffe auch im Nahkampf** angreifen
  `⚠️ NUR VIDEO: [E02 26:46]`.

**Freie Schussbahn (nur für Dörfler)** `[DE S.20]`:

> „Prüfe, ob dein Fernangriff von einem Hindernis blockiert wird, ziehe eine
> grade Linie von **1 Ecke deiner Wahl** des Feldes, auf dem du stehst, zu **1
> Ecke deiner Wahl** des Bösewichts. Berührt diese Linie das Hindernis? Dein
> Angriff wird blockiert."

- Die Regel heißt **„Freie Schussbahn"**, und gezogen wird **Ecke zu Ecke**, nicht
  Punkt zu Punkt. „Hindernis-Terrains blockieren die Sichtlinie von
  Fernkampf-Angriffen **von Dörflern**" `[DE S.14]` — **die des Bösewichts
  nicht** `[DE S.17]`, `[DE S.35]`.
- **Figuren blockieren nicht** `⚠️ NUR VIDEO: [E02 41:45]` — die Anleitung nennt
  nur Hindernis-Terrain.

**Neuwurf („Deinen Mumm zusammenraffen"):** „Für 2 MUMM, darfst du den letzten
Angriffs- oder Terrain-Wurf neu würfeln. Tust du das? Dann gilt automatisch das
**neue** Würfelergebnis. Du darfst den gleichen Angriffs- oder Terrainwurf nur
**maximal 1x** neu würfeln." `[DE S.20]`

**Die vier Ausgänge eines Angriffswurfs** — eine geschlossene Liste `[DE S.20]`:

1. **einen Treffer landen** — Ergebnis ≥ Trifft-Voraussetzung → AUA in Höhe des
   AUA-Werts.
2. **nicht treffen** — Ergebnis darunter → „kein AUA … dein Angriff endet
   ereignislos".
3. **einen Knaller landen** — siehe unten.
4. **einen Patzer landen** — siehe unten.

Knaller und Patzer gelten nur bei einem Angriffs-Wurf **gegen einen Bösewicht**
`[DE S.35]`.

**Patzer:** „Würfelst du beim Angriffs-Wurf die **1**, landest du einen Patzer!
Damit **verfehlst du immer automatisch**, völlig egal ob du es rechnerisch
geschafft hättest oder nicht. Einen Patzer landen gilt auch als nicht treffen."
`[DE S.20]`

**Knaller (kritischer Treffer)** `[DE S.20]`:

> „Würfelst du bei einem **Angriffs-Wurf auf einen Bösewicht** [Symbol], landest
> du einen Knaller! Dies ist – **unabhängig von Ergebnis und
> Trifft-Voraussetzung** – immer ein **automatischer Treffer**."

- Der zweite Wurf auf der Knaller-Tabelle ist **kein Angriffs-Wurf**, sondern
  bestimmt nur den Bonus. „Wende das AUA durch den Treffer und den Bonuseffekt
  der Knaller-Tabelle immer **gleichzeitig** an."
- „Einen Knaller landen gilt **auch als einen Treffer landen**."
- **„Zählt als 10" gilt NICHT für den Angriffswurf**, sondern für **alle anderen**
  Würfe: „**Bei anderen Würfen** wird [Symbol] als eine **10** gewertet."
  `[DE S.20]`, `[DE S.35]` — also bei Dorf-Ereignissen, Terrain-Würfen und
  Gleichstandswürfen.
- Man soll **immer würfeln**, auch wenn der Treffer ohnehin sicher wäre
  `⚠️ NUR VIDEO: [E02 30:26]`.

**Knaller-Tabelle** (zweiter W10) — wörtlich `[DE S.36]`, `[Crit-DE]`:

| Wurf | Wirkung |
|---|---|
| **1** | Dein Angriff erzürnt den Bösewicht! **Dein Zug endet sofort nach dem Angriff**, der Bösewicht führt eine Aktion aus. |
| **2-3** | Der Bösewicht ist aus der Fassung: **oberste Bösewicht-Aktion ansehen.** |
| **4-5** | Zehen zerquetscht: **-1 BEW für den Bösewicht.** |
| **6-7** | Aufgeputscht: **+1 BEW / +1 MUMM / +1 PRZ**. `⚠️ ABGELEITET:` Die Tabelle nennt **keine Dauer**. Dass der Bonus bis Kampfende hält, folgt daraus, dass es eine **Direkte Wertveränderung** ist — gilt „nur für die aktuelle Runde" `[DE S.10]` und wird in der Nachbereitung zurückgesetzt `[DE S.22]`. |
| **8** | „Was für ein Schlag! Der Angriff fügt dem Bösewicht **+1 AUA** zu." |
| **9+** | Nimm dir die mit **(★)** gekennzeichnete Bösewicht-Ausrüstung; „Du darfst sie **sofort anlegen**. Ist das in diesem Kampf schon aktiviert worden? Füge dem Bösewicht **stattdessen +1 AUA** zu." |

Der Schaden des Angriffs und der Knaller-Bonus werden **gleichzeitig** zugeteilt;
ein dadurch ausgelöster Wutausbruch greift erst **nach** dem Knaller-Bonus:
„Das AUA und der Knaller-Bonus passieren gleichzeitig. Somit wird auch der
**Knaller-Bonus vor dem Wutausbruch** abgehandelt." `[DE S.32]`

### 6.5 Wutausbruch (Breaking Point)

Der Mechanismus heißt **„Wutausbruch"**; „Wutangriff" kommt in der Anleitung
nicht vor.

> „Immer wenn das LEBEN des Bösewichts **auf oder über gewisse Schwellen hinweg
> reduziert wird**, hat er 1 Wutausbruch. … **Sie passieren bei 18, 12, 7 und 4
> LEBEN.** Ein Wutausbruch lässt den Bösewicht **1 zusätzliche Bösewicht-Aktion**
> ausführen." `[DE S.22]`

- **Der Auslöser ist das Ereignis der Reduktion, nicht ein Zustand.** „LEB ≤ 12"
  als Dauerprüfung ist falsch — nach einer Heilung auf genau 12 würde sie beim
  nächsten Schaden fälschlich auslösen (siehe unten).
- **Während eines Dörflerzugs:** „beendet der Dörfler seinen Zug **sofort**. Dann
  handelt ihr den Wutausbruch ab, indem ihr 1 Bösewicht-Aktion ausführt. **Danach
  geht es in Kloppen-Reihenfolge weiter.**" `[DE S.22]` Restliche BEW und MUMM
  verfallen.
- **Während des Bösewicht-Zugs:** „beendet dieser **zunächst wie üblich seinen
  Zug**" und führt dann die zusätzliche Aktion aus `[DE S.22]`.
- **Mehrfaches Auslösen:** „Wird das LEBEN des Bösewichts **erneut** auf/über
  einen solchen Schwellenwert reduziert, löst dies auch **erneut** 1 Wutausbruch
  aus." `[DE S.22]`
- **Heilen über die Schwelle löst nichts aus:** „Falls der Bösewicht LEBEN über
  einen solchen Wert hinweg heilt, löst das **keinen** Wutausbruch aus."
  `[DE S.22]`
- **Heilen genau AUF eine Schwelle entschärft sie:** „Falls der Bösewicht LEBEN
  **genau auf** einen Schwellenwert heilt, hat der Bösewicht beim nächsten AUA
  **nicht automatisch** einen Wutausbruch. Das passiert nur, wenn sein LEBEN
  **auf oder über** den Schwellenwert **hinweg reduziert** wird." `[DE S.22]`
- Taktisch: „**Prüfe vor deinem Angriff**, ob das AUA den Bösewicht auf oder über
  [eine Schwelle] bringt. Denn wenn ja, **endet dein Zug dann automatisch**."
  `[DE S.22]`

### 6.6 Schaden, Heilung, Besiegt, Niederlage

Der Zustand heißt **„besiegt"**, nicht „ausgeschaltet" — das Wort kommt in der
Anleitung nicht vor.

- **Schaden** senkt LEB. „Wird das LEB einer Figur auf **0 oder weniger**
  reduziert, ist sie **besiegt**. Entferne sie vom Schlachtfeld." `[DE S.35]`
  Für Dörfler: „Müsstest du dein LEBEN auf 0 (oder weniger) reduzieren, bist du
  besiegt. Entferne deine Figur vom Schlachtfeld." `[DE S.22]` („LEB unter 1" ist
  gleichbedeutend.)
- **Heilung** kann LEB nie über das **Max LEB** heben `[DE S.35]`.
- **Besiegte Dörfler** „erhalten bei einem Sieg über den Bösewicht zwar ebenfalls
  Münzen, haben aber **keine Chance**, sich die Bösewicht-Ausrüstung zu schnappen
  – selbst wenn sie die heldenhaftesten Helden von allen waren!" `[DE S.22]`
- **Nach gewonnenem Kampf setzt JEDER Dörfler seine Werte-Leisten auf die
  Startwerte zurück** — damit auch LEB auf Max LEB. Das ist **Schritt 5 der
  Nachbereitung** (§7), nicht ein Schritt der nächsten Dorfphase, es gilt für
  **alle** (auch besiegte) und hängt an **keiner** Bedingung `[DE S.22]`.
  Die frühere Formulierung („solange mindestens ein Dörfler übersteht, werden zu
  Beginn der nächsten Dorfphase alle auf volle LEB geheilt") steht so **nicht** in
  der Anleitung; „solange es noch mindestens 1 unbesiegten Dörfler im Kampf gibt"
  `[DE S.22]` ist die Bedingung dafür, dass es überhaupt **weitergeht**, nicht für
  die Heilung. (Ausnahme: der Fluch „Curse of the Bruised Peel", §10.3 — dort ist
  der **Reset-Schritt** zu überschreiben, nicht ein separater Heilungsschritt.)
- **Wertesenkungen** werden am Ende des Kampfes aufgehoben: „Am Ende des Kampfes
  werden **alle** Wertveränderungen (außer dauerhaften Wertveränderungen) wieder
  zurückgesetzt." `[DE S.35]`
- **Vom Schlachtfeld entfernt** `[DE S.22]`:
  - „Solange du vom Schlachtfeld entfernt bist, kannst du **weder zum Ziel einer
    Bösewicht-Aktion werden** noch lassen sich deine Dörfler-Fähigkeiten oder
    Ausrüstungen aktivieren."
  - **Zugprüfung:** „**Überprüfe zu Beginn deines Zuges**, ob du durch einen
    Effekt wieder aufs Schlachtfeld gebracht wirst. Ist das nicht so,
    **überspringe deinen Zug**."
  - „Solange ein Bösewicht vom Schlachtfeld entfernt ist, kann er **weder als
    Ziel eines Angriffs** gewählt werden **noch kann er AUA erleiden**."
- **Niederlage:** „Falls ihr **alle gleichzeitig besiegt** seid oder auf andere
  Weise **ohne Möglichkeit zurückzukehren vom Schlachtfeld entfernt** wurdet,
  verliert ihr die Partie!" `[DE S.22]` Im Endgegner-Kampf zusätzlich: **„Sobald
  der Sheriff besiegt wird, verliert ihr die Partie!"** `[DE S.23]` (§8.2).
- **Regelkonflikte:** `⚠️ NICHT IN DER DEUTSCHEN ANLEITUNG.` Die Regel
  „Widersprechen sich zwei Regeln, wird zugunsten des Bösewichts entschieden"
  stammt aus `[BR S.30 FAQ]`; eine Suche über alle 36 Seiten nach „zugunsten",
  „Widerspr" und „widersprech" ergibt **keinen Treffer**. Die deutsche
  Gedächtnisstütze kennt nur Reihenfolge-Entscheidungen „gemeinsam" `[DE S.32]`.
  Als englische FAQ-Regel führen, nicht als deutsche Regel.
- **Reihenfolge von Effekten:** „Bösewicht-Aktionen und Fähigkeiten sind
  **reaktionär**. Wird eine deiner Fähigkeiten durch die Bewegung eines
  Bösewichts ausgelöst oder weil du zu seinem Ziel wirst usw., tritt deine
  Fähigkeit **sofort** in Kraft. … erleidet er diese AUA **sofort, noch vor dem
  Rest der Bösewicht-Aktion**." `[DE S.32]`
- **Sich selbst ist man nie Ziel:** „Nein, du kannst nie als **angrenzend zu dir
  selbst** gelten". Und weiter gefasst: „Wenn ein Effekt meiner Ausrüstung „alle
  Dörfler in 3 Feldern Entfernung" als Ziel hat, hat er dann auch mich als Ziel?
  **Nein. Du bist nie innerhalb der Entfernung zu dir** und bist somit nie als
  mögliches Ziel wählbar. **Das gilt für Dörfler genauso wie für Bösewichte.**"
  `[DE S.32]` — die Regel gilt also nicht nur für „angrenzend", sondern für
  **jede** Entfernungsangabe.
- **Mehrere Effekte, die das Ziel ändern:** „Sind zur gleichen Zeit mehrere
  Effekte aktiv, die das Ziel ändern, gilt **immer der zuletzt aktivierte
  Effekt**." `[DE S.32]` Beispiel der Anleitung: aktiviert ein Dörfler
  „Blaulicht-Hut" und setzt danach **Alois Amboss** „Nerven aus Stahl" ein, „hat
  Alois Fähigkeit Vorrang".
- **„Die nächste Bösewicht-Aktion" heißt: die nächste, die wirklich ausgeführt
  wird** `[FAQ S.1]`: „Alois Amboss „Nerven aus Stahl": Diese Fähigkeit bezieht
  sich auf die **nächste ausgespielte** Bösewicht-Aktion. … immer wieder kann es
  sein, dass eine Bösewicht-Aktion aufgrund einer **nicht zutreffenden Bedingung
  nicht ausgeführt** wird und dafür eine neue gezogen wird. **Erst die, die dann
  auch wirklich ausgeführt wird**, ist für die Fähigkeit relevant."
- **Kosten in Wertform müssen zahlbar sein:** „Du **musst** deine BEW um 2
  verringern **können**, um [die Fähigkeit] aktivieren zu können." `[DE S.32]`

---

## 7. Nach dem Kampf (Bösewicht besiegt) — die 8 Schritte der Nachbereitung

„Sobald ihr dem Bösewicht so viel AUA zugefügt habt, dass sein **LEB unter 1**
reduziert werden würde, ist er **sofort besiegt** und der Kampf ist vorbei!"
`[DE S.22]`. Dann in genau dieser Reihenfolge `[DE S.22]`, `[DE S.36]`:

1. **Jeder: Wirf nicht abgeschlossene Heldentaten ab (optional).** „Du darfst
   jetzt beliebig viele nicht abgeschlossene Heldentaten, die du lieber nicht mehr
   behalten willst, abwerfen." Zu Beginn der nächsten Dorfphase wird wieder auf 3
   aufgefüllt (solo: auf 6, §2.2).
2. **Jeder: Nimm dir 6 Münzen** (solo: in den gemeinsamen Topf, §2.2).
3. **Erhaltet 1 Bösewicht-Ausrüstung.** „Hast du in dieser Runde von euch allen
   die **meisten Heldentaten abgeschlossen (Karten, nicht Heldenpunkte!)**? Dann
   darfst du **zufällig 1 davon ziehen**! Bei Gleichstand an Heldentaten wird
   gewürfelt. **Wer die höhere Zahl würfelt**, darf sich die Bösewicht-Ausrüstung
   schnappen. **Dörfler, die am Ende des Kampfes besiegt waren, können die
   Bösewicht-Ausrüstung nicht erhalten.**"
4. **Jeder: Lege deine abgeschlossenen Heldentaten zur Seite.** „Du brauchst sie
   noch für die Chance, vor dem Endgegner-Kampf der neue Sheriff zu werden!" Sie
   zählen also weiter für die **Sheriffwahl**, aber nicht mehr für die
   Beute-Auswertung der nächsten Runde. (Tischtipp: umdrehen, um sie nicht zu
   verwechseln `[E02 1:03:04]`.)
5. **Jeder: Setze deine Startwerte zurück** — in **zwei** Teilschritten:
   > „1. Setze deine Wert-Leisten wieder auf ihre **Startwerte** zurück. **Alle
   > Veränderungen, die du im Laufe des Kampfes erhalten hast, sind hiermit wieder
   > weg.** 2. Wende dann alle für dich geltenden **konstanten Wertveränderungen**
   > an. Du erkennst sie an der **schwarzen Markierung**." `[DE S.22]`

   Das ist der Schritt, der auch **LEB auf Max LEB** zurücksetzt (§6.6), und es
   ist der Schritt, der **Heldentaten-Belohnungen wieder abholt** (§4 Schritt 1).
   Kurzform `[DE S.36]`: „Setzt die Werte der Dörfler zurück. **Nur dauerhafte
   Wertänderungen bleiben erhalten.**"
6. **Entsorgt den Bösewicht.** „Legt die Bösewicht-Figur, Bösewicht-Plättchen,
   Bösewicht-Aktionen und das Bösewicht-Tableau zurück in die Schachtel." Dazu
   kampfeigene Sonderausrüstung. **Trophäen und Erweiterungs-Fortschritt werden
   hier NICHT eingetragen — das geschieht erst am Partieende** `[E02 1:04:22]`.
7. **Aktualisiert die „Wer ist dran?"-Leiste.** „Schiebt das oberste
   Dörfler-Plättchen an das untere Ende und rutscht dann alle Dörfler-Plättchen
   wieder nach oben auf. Lasst natürlich wie immer den obersten Platz für den
   Bösewicht frei."
8. **Kehrt ins Dorf zurück.** „Dreht das Zusatz-Brett auf die **Dorf-Seite** und
   beginnt die nächste Dorf-Phase."

**Solo zusätzlich:** „Am Ende jeder Kampf-Phase darfst du alle nicht
abgeschlossenen Heldentaten, die du nicht behalten möchtest, abwerfen"
`[DE S.34]` — das ist dasselbe wie Schritt 1, nur für die gemeinsame Auslage.

---

## 8. Der Endgegner-Kampf (4. Runde)

`[DE S.23]`

Der vierte Bösewicht kämpft nach eigenen Regeln. Der Bereich **unterhalb der
Schlachtfeld-Übersicht** auf der Tableau-Rückseite gilt jetzt — und **nur** jetzt
`[DE S.15]`. Die Anleitung nennt **sechs** Punkte; die deutschen
Abschnittsnamen sind **„AUFBAU"**, **„Der Weg zum Sieg"** (mit
**„Spezialaufgabe"**) und **„Euer Schicksal"** — nicht „HOW TO WIN", „Special
Objective", „THE RESULTS".

### 8.1 Zusätzlicher Aufbau `[DE S.23]`

1. **Endgegner-Terrain.** „Ihre Positionen werden durch **`EG`** (Endgegner)
   gekennzeichnet. Gibt es mehrere solcher Terrains, sind diese mit **`EG1`,
   `EG2`, `EG3` usw.** gekennzeichnet, um die **Reihenfolge ihrer Platzierung**
   anzuzeigen. **Die Anzahl der `EG`-Terrains wird in den meisten Fällen durch die
   Anzahl der mitspielenden Dörfler bestimmt**" (solo also 3). „Unter **AUFBAU**
   wird euch erklärt, welche Terrains ihr wie platzieren müsst."
2. **Der neue Sheriff** (§8.2) und ggf. „weitere unter „Aufbau" beschriebene
   Aufbau-Schritte".
3. **Dörfler- und Bösewicht-Fähigkeiten.** „Im Endgegner-Kampf können **neue**
   Dörfler- oder Bösewicht-Fähigkeiten ins Spiel kommen. Die sind wichtig,
   vergesst also nicht, sie auch anzuwenden!"
4. **„Der Weg zum Sieg".** „Hier erfahrt ihr, was ihr tun müsst, um den Endgegner
   zu besiegen! Zusätzlich hat jeder Endgegner-Kampf noch eine **optionale
   Spezialaufgabe**."
5. **„Euer Schicksal"** (§8.3).
6. **Schwäche.** „Bei den meisten Bösewichten ist die Schwäche immer die gleiche …
   **Einige wenige Bösewichte aber haben im Endgegner-Kampf eine andere
   Schwäche**." (§5.3)

Beispiel Handsy „The Hostile Hand Hijacking" `[Tableau Handsy, Rückseite]`:
5 Versteckte Bürger auf die `EG`-Felder; neuer Sheriff erhält die auf dem Tableau
genannte Besondere Ausrüstung „Warning Whistle"; Dörfler dürfen ihre BEW nutzen,
um **statt sich selbst** einen Versteckten Bürger zu bewegen; werden **alle 5**
getötet, verlieren die Dörfler.

### 8.2 Sheriffwahl `[DE S.23]`

> „Addiere alle **Heldenpunkte** (Heldenpunkte, **nicht** Heldentaten!) auf allen
> von dir **in der Partie** abgeschlossenen Heldentaten. Hast du insgesamt die
> meisten Heldenpunkte gesammelt? Dann wirst du zum neuen Sheriff!"

- **Zeitpunkt:** beim Aufbau des Endgegner-Kampfes.
- **Gleichstand:** „entscheidet ihr **gemeinsam**, wer davon der bessere Sheriff
  wäre. Werdet ihr euch nicht einig, würfelt ihr: **Wer höher würfelt**, wird
  Sheriff."
- Der Sheriff erhält die auf dem Tableau genannte **Besondere Ausrüstung**: „Als
  neuer Sheriff nimmst du dir die genannte **Besondere Ausrüstung**, die euch in
  diesem Endgegner-Kampf helfen wird." Sie ist „oftmals elementar wichtig für den
  Sieg". (Nicht „einzigartige Ausrüstung" — das ist kein Begriff der Anleitung.)
- **Niederlagebedingung, unbedingt und ohne Zeitpunktangabe:** „Denn eine Regel
  gilt für **jeden** Endgegner-Kampf: **Sobald der Sheriff besiegt wird, verliert
  ihr die Partie!**" `[DE S.23]`
  - Mehrere Tableaus formulieren es anders: „du verlierst, wenn der neue Sheriff
    **zu Beginn des Bösewicht-Zuges** besiegt ist" `[Tableau Handsy]`,
    `[Tableau Qing & Kween]`.
  - **Empfehlung:** als **sofort** implementieren und nur dort abweichen, wo ein
    Tableau es ausdrücklich anders druckt. `⚠️ UNSICHER:` die abweichende
    Tableau-Formulierung konnte nicht geprüft werden; die Anleitung stützt sie
    nicht.
- **Solo** entscheidet die Heldenpunktsumme genauso; der Sheriff ist der Dörfler
  mit den meisten Punkten und muss anschließend besonders geschützt werden
  `[E01 44:54]`.

### 8.3 Spezialaufgabe und „Euer Schicksal" `[DE S.23]`

> „Jeder Endgegner-Kampf kann auf **3 unterschiedliche Arten** enden: • ihr
> gewinnt die Partie **ODER** • ihr gewinnt die Partie und erfüllt zudem die
> Spezialaufgabe **ODER** • ihr verliert die Partie. Neben jeder Option findet ihr
> eine Nummer: Ist der Kampf vorbei, lest euch euer **Schicksal** im Abschnitt der
> entsprechenden Nummer **ab Seite 24** durch."

- Die **Spezialaufgabe** zu erfüllen „ändert … euer Schicksal und ihr schaltet
  **freischaltbare Ausrüstung** frei, die ihr danach in zukünftigen Partien nutzen
  dürft" — insbesondere die **Alternative Startausrüstung** eines Dörflers
  `[DE S.8]`, `[DE S.23]`.
- **Die Schicksale 01 ff. stehen auf `[DE S.24–29]`** und sind die **einzige**
  Quelle für die konkreten Freischaltungen (Beispiel Schicksal 02: „Ihr habt die
  alternative Startausrüstung für Finn Fischkopp freigeschaltet! … Laaaanger Aal
  und Fischstäbchen"). Sie sind hier **nicht abgeschrieben** — sechs Seiten
  Erzähltext plus Freischaltlisten gehören in die Partieende-Auswertung, nicht in
  eine Tischreferenz. Nachlesen in der Anleitung.

---

## 9. Erweiterung „Toller Trödel" (Odd Jobs) — Erstpartie

`[OJ S.4-10]`. Alle Komponenten tragen **`OJ`** oben links. Voll kombinierbar mit
Neue Nachbarn `[OJ S.4]`.

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
- Wird der Besitzer besiegt oder vom Schlachtfeld entfernt, **bleibt** das Token liegen.
- Wird die Karte im Kampf **abgeworfen**, wird das Token entfernt.
- **Am Kampfende gehen alle Token an ihre Besitzer zurück.**
- **Aufstellbare gelten nicht als Terrain** und blockieren keine Bewegung.

### 9.4 Weitere Odd-Jobs-Kartentypen

- **Odd-Jobs-Snacks:** werden **nicht abgeworfen**, sondern sind **einmal pro
  Kampf** nutzbar `[OJ S.5]`. (Unterschied zum Basisspiel, wo Snacks meist
  endgültig weg sind, §6.3.)
- **Karren-Ereignis-Ausrüstung (Cart Event Gear):** erscheint nur beim Einkaufen.
  Wird sie **außerhalb des Ladens** aufgedeckt, wird sie **abgeworfen** und durch
  die nächste Nachschubkarte ersetzt `[OJ S.5]`.
- **Schlüssel / Reparatur / Graben (Key, Repair, Dig):** Schlagworte unter dem
  Kartennamen. In Kombination mit bestimmter anderer Ausrüstung schalten sie über
  das **Händler-Journal** neue Ware frei `[OJ S.9]`.
- **Mehrere Fähigkeiten auf einer Karte:** trotzdem **nur eine pro Zug**
  aktivierbar `[OJ S.10 FAQ]` — das ist aber keine Odd-Jobs-Sonderregel, sondern
  eine **Grundregel** des Basisspiels `[DE S.21]`, siehe §6.3.

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
| Odd-Jobs-Snacks, Karren-Ereignis-Ausrüstung | Journaleinträge („Lies Journal XX") |
| | **Aufstellbare** — Regel §9.3 ist vollständig umsetzbar, die Karten sind aber **unerreichbar**: alle 24 Aufstellbar-Karten tragen die Nummern **73–161** und liegen damit im gesperrten Deck. In einer Erstpartie kann kein Aufstellbares gekauft werden (`docs/befund-beute-und-aufstellbares.md` §3.1). |
| | **Freischalten** und **Entsorgen** von Ausrüstung |
| Schlüssel/Reparatur/Graben **als Gegenstandstypen** | deren Auslösewirkung (verweist auf Journal-Nummern) |

**Praktische Folge:** Der Kartenpool bleibt **dauerhaft bei Nr. 1–30**; es gibt
**keinen Fortschritt zwischen Partien** über Odd Jobs. Karten mit farbigem
Balken am unteren Rand („D.I.Y. Scavenging") können ihre Freischaltwirkung
**nicht** entfalten — man kann sie benutzen, aber der Verweis ins Journal läuft
ins Leere. `⚠️ Empfehlung:` Solche Karten in der Engine als spielbar, aber mit
wirkungslosem Journal-Verweis modellieren, statt sie zu entfernen — sonst
verändert sich die Wahrscheinlichkeitsverteilung des Decks.

---

## 10. Erweiterung „Neue Nachbarn" (Foul Neighbors) — Erstpartie

*Hieß in diesen Unterlagen früher „Üble Nachbarn"; der Name ist am 2026-10-14 auf
den gedruckten deutschen Titel korrigiert `[NN S.1]`. **Dieser Abschnitt ist
NICHT gegen `[NN]` abgeglichen** (§13.10).*

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

> Bösewichte aus Neue Nachbarn haben **neben ihren BEW-/LEB-Werten** einen
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
- **In der Erstpartie ist genau EIN Fluch verfügbar: „Curse of the Bruised Peel",
  deutsch „Der Fluch der matschigen Haut".** Belegt `[NN S.5]`: „In dieser
  Erweiterung findet ihr insgesamt **21 Flüche**: 1 für jeden Bösewicht des
  Grundspiels und dieser Erweiterung sowie **Krummbiegels** ganz persönlichen
  Fluch. **Dieser ist der einzige Fluch, der schon zu Beginn freigeschaltet ist:
  Der Fluch der matschigen Haut.**" Alle anderen liegen gesperrt.
- **Wirkung laut Video:** Normalerweise werden alle Dörfler zwischen den Kämpfen
  **vollständig geheilt**. Mit diesem Fluch heilt man stattdessen nur **1 LEB** —
  bzw. **2 LEB**, wenn man besiegt wurde `[E01 36:16]`.
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

`[NN S.15]` Optional: den Bösewicht-Pool thematisch auf **ein** Nachbardorf
begrenzen. „Legt dazu zum Beginn der Partie nur Bösewicht-Plättchen des gewählten
Dorfes (natürlich verdeckt) auf die Kampf-Plätze."
- **Neblingen** (engl. Misty Bluff): Arnold Schmatz, Viktor Visage, Die weißen
  Herren, Fleckchen.
- **Sturzbrunn** (engl. Sprinkle Falls): Thea Kotta, Fritze Fischkopp,
  Dr. Bosskop, Rosa Voir & die WG.

Das erhöht auch die Chance, denselben Bösewicht dreimal zu besiegen und so Flüche
freizuschalten `[E01 38:43]`.

---

## 11. Dörfler — Werte und Karte

`[DE S.7-10]`

| Wert | Bedeutung |
|---|---|
| **LEB (HP)** | Lebenspunkte. Auf 0 oder weniger ⇒ **besiegt**, Figur vom Schlachtfeld entfernen `[DE S.35]`. Heilung nie über Max LEB. |
| **BEW (MVMT)** | Bewegungsvorrat **pro Zug**. 1 BEW = 1 orthogonales Feld. **Verbrauch im Kopf mitzählen, Marker nicht verschieben** — verändert aber ein **Effekt** den Wert, wird er sofort verschoben `[DE S.7]`, `[DE S.10]`. |
| **MUMM (MOX)** | Aktionspunkte **pro Zug**. Dasselbe Marker-Prinzip wie bei BEW. |
| **PRZ (ACC)** | Modifikator auf jeden Angriffswurf; **kann negativ sein** und wird dann abgezogen `[DE S.7]`. |

**Die Marker können die Leisten nie verlassen; Veränderungen darüber hinaus
verfallen** `[DE S.7]`.

- **Ausrüstungs-Slots:** „Beine, Brust, Kopf, Linke Hand, Rechte Hand und
  **Mitbringsel**" `[DE S.7]`; Glossar: „1 Bein, 1 Brust, 1 Kopf, 2 Hände und 1
  Mitbringsel" `[DE S.35]`. (Nicht „Zubehör".) **Pro Slot eine Ausrüstung.** Eine
  **Zweihandwaffe** belegt beide Handslots `[DE S.9]`.
- **Dörfler-Fähigkeiten gibt es in drei Sorten:** „Einige Fähigkeiten lassen sich
  **während der Dorf-Phase** nutzen, andere **im Kampf** und wieder andere sind
  **passiv**." `[DE S.7]` **Jede max. 1× pro Zug**, MUMM-Fähigkeiten nur im
  eigenen Zug `[DE S.20]`.
- **Startausrüstung** (grauer Rand) kann **nicht verkauft** werden `[DE S.12]`,
  **wohl aber abgeworfen** — „wie jede andere Ausrüstung auch" `[DE S.8]`.
  („Zerstört" ist kein Begriff der Anleitung.)
- **Alternative Startausrüstung** wird durch die **Spezialaufgabe** eines
  Endgegner-Kampfes freigeschaltet und steht danach zur Wahl `[DE S.6]`,
  `[DE S.8]`.
- **Die vier Ausrüstungsarten und ihre Rahmenfarben** `[DE S.8]`:
  **Startausrüstung** grau · **Tante Emma Ausrüstung** blau (der *Nachschub* ist
  der verdeckte Stapel daraus, `[DE S.35]`) · **Bösewicht-Ausrüstung** lila ·
  **Besondere Ausrüstung** gelb („lässt sich nicht kaufen. Man erhält sie nur
  unter besonderen Bedingungen"). „Einzigartig" ist **kein** Begriff der
  Anleitung.
- **Es gibt keine Obergrenze**, wie viel Ausrüstung ein Dörfler **besitzen** darf:
  „Du darfst **beliebig viel** Ausrüstung in deinem Besitz haben." `[DE S.9]`
- **Abgeworfene Ausrüstung ist endgültig verloren** („Abgeworfene Ausrüstung kommt
  aus dem Spiel! Lege sie zurück in die Spielschachtel" `[DE S.35]`). Wer etwas
  loswerden will, **verkauft** es lieber `[DE S.10]`.

**Deutsche Dörflernamen.** `[DE S.5]` nennt die **sieben** Basis-Dörfler
vollständig auf Deutsch: **Hennriette Heu, Omma Melba, Finn Fischkopp, Ludwig
Knilch, Alois Amboss, Siggi von Saumagen, Duo Dacapo.** Englische Namen nennt die
Anleitung **nie**, sie kann die Zuordnung also nicht auflösen.

| Englisch | Deutsch | Quelle |
|---|---|---|
| Henlo Bulwark | Hennriette Heu | `[Dorf-Ereignisse DE]`, `[E01 13:14]` |
| Granny Melba | Omma Melba | `[Dorf-Ereignisse DE]`, `[E01 13:04]` |
| Norman Fishboy | Finn Fischkopp | `[Dorf-Ereignisse DE]` |
| Georgie Irongut | Alois Amboss | `[Dorf-Ereignisse DE]` ⚠️ erschlossen |
| Blopsy Twins | Duo Dacapo | `[Dorf-Ereignisse DE]` ⚠️ erschlossen |
| Judy Marks (FN) | Frieda Paletti | `[Dorf-Ereignisse DE]` ⚠️ erschlossen |
| Fridgette Jones (FN) | Karla Kühl | `[E01 12:52]`, `[E02 …]` |
| Yancy Plover | ⚠️ **Ludwig Knilch** oder **Siggi von Saumagen** | Ausschluss über `[DE S.5]` |
| Quintus Binch | ⚠️ **Ludwig Knilch** oder **Siggi von Saumagen** | Ausschluss über `[DE S.5]` |

Durch Ausschluss bleiben für *Yancy Plover* und *Quintus Binch* genau diese
beiden deutschen Namen übrig; welcher welcher ist, bleibt offen (§13.6).

**Materialzahlen aus `[DE S.5]`** (nur die, die etwas belegen): 15× Start-,
**177× Tante Emma**-, **36× Bösewicht**-, **28× Besondere Ausrüstung**;
**180× Bösewicht-Aktion**, 20× Terrain-Karte, 100× Dorf-Ereignis, 75× Heldentat;
12 Bösewicht-Tableaus, 7 Dörfler-Tableaus, 49 doppelseitige Terrain-Plättchen,
5 Würfel, Schachtel mit freischaltbarer Ausrüstung (24 Karten). Das bestätigt
rechnerisch die **15 Aktionen pro Bösewicht** (180 / 12) und die **3 Beutestücke
pro Bösewicht** (36 / 12).

---

## 12. Kurzreferenz für die Engine

```
SETUP (9 Schritte, [DE S.6])
  Spielbrett + Zusatzbrett(Dorf-Phase) ; 4 Bösewichtplättchen verdeckt auf Kampf-Plätze
  3 Dörfler (solo) : Tableau, 4 Startwert-Marker, Figur, Startausrüstung
  Dörflerplättchen von oben nach unten auf Leiste, OBERSTER PLATZ = Bösewicht, frei
  Stapel mischen: Dorf-Ereignisse (solo ohne geheime!), Heldentaten, Nachschub
  je 1 Übersichtskarte + 10 Münzen   (solo: 30 Münzen gemeinsamer Topf)
  Solo: 6 offene gemeinsame Heldentaten | Tausch unter eigenen Dörflern (außer Start)

RUNDE r = 1..4
  DORFPHASE   (Shoppen-Reihenfolge: Leiste unten→oben)
    1 Heldentaten auffüllen  (regulär 3 verdeckt/Dörfler | solo 6 offen gemeinsam)
    2 je 1 Dorf-Ereignis, laut vorlesen (Ausnahme: geheime) und abhandeln, dann abwerfen
      Wurf = 1 W10, "(+BEW)" = AKTUELLER Wert
    3 Laden: 10 Karten Auslage, je Zug 1x kaufen ODER verkaufen (halber Wert abgerundet),
             Nachfüllen sofort, Erneuern 2 Münzen/Dörfler (KEINE Häufigkeitsgrenze)
    4 Auslage unter den Nachschub ; letzte Anlegekontrolle  -- ENDE Dorfphase

  KAMPFPHASE  (Kloppen-Reihenfolge: Leiste oben→unten, Bösewicht zuerst)
    Aufbau (10 Schritte, [DE S.13]):
      1 Brett auf Kampf-Phase wenden
      2 Bösewicht r aufdecken (oben→unten) → oberstes Feld der Leiste
      3 Tableau auf oberen Teil des Zusatzbretts
      4 15er-Aktionsdeck mischen → Feld "Ziehstapel"
      5 Schlachtfeld nach Schlachtfeld-Übersicht nachbauen
      6 Terrain-Karten offen auf die TERRAIN-Felder
      7 Dörfler in Kloppen-Reihenfolge auf freie D-Felder
      8 Bösewicht auf die B-Felder (2x2), Blick auf NAHESTEN Dörfler
      9 BEW/LEB aus der Spalte zur ANZAHL DÖRFLER (solo 3P) (Ausnahme Barry Bluff: Formel)
     10 r=4: AUFBAU-Anweisungen + EG-Felder + Sheriffwahl (höchste Heldenpunktsumme)
      dazu: Stufenfähigkeit = unterster sichtbarer Kampf-Platz, gilt den ganzen Kampf
            Bösewicht-Fähigkeit zu KAMPF-BEGINN prüfen ; ggf. Überfall-Karte(n) (FN)
    Schleife:
      Bösewicht: 1 Aktionskarte → Ziel → KRAWALL (oben→unten) → Nachspiel? → abwerfen
                 Nachspiel nur wenn: Wort fehlt UND Ziel hat 1+ AUA erlitten,
                                  ODER Wort steht da UND Bedingung erfüllt
                 BEW limitiert NUR den Krawall ; kürzester Weg, Schaden nur als Tiebreak
      Dörfler:   BEW+MUMM frei verplanen, beliebige Reihenfolge
      Wutausbruch: wenn LEB durch Schaden AUF ODER ÜBER eine Schwelle {18,12,7,4}
                 HINWEG REDUZIERT wird (Heilung genau AUF eine Schwelle bewaffnet sie
                 nicht neu) → Dörflerzug endet sofort / Bösewichtzug erst beenden,
                 dann 1 zusätzliche Bösewicht-Aktion
    Ende: Bösewicht LEB < 1 → Sieg ; alle gleichzeitig besiegt (oder Sheriff besiegt
          in r=4) → Niederlage

  NACHBEREITUNG (8 Schritte, [DE S.22])
    1 nicht abgeschlossene Heldentaten abwerfen (optional)
    2 je 6 Münzen
    3 Beute: meiste abgeschlossene Heldentaten dieser Runde (Karten!), nicht besiegt;
      Gleichstand: würfeln, HÖHERE Zahl gewinnt; 1 zufällige der 3
    4 abgeschlossene Heldentaten beiseite (zählen weiter für Sheriffwahl)
    5 Werte-Leisten auf STARTWERTE zurück, dann schwarz markierte Ausrüstungsboni
      wieder aufrechnen  → damit auch LEB = Max LEB, und Heldentaten-Boni sind WEG
    6 Bösewichtmaterial in die Schachtel  (Trophäen/Journal erst am PARTIEENDE!)
    7 Leiste rotieren (oberster nach unten, Bösewichtplatz frei lassen)
    8 Brett auf Dorf-Seite wenden
```

---

## 13. Was ich NICHT sicher klären konnte

1. ~~**Die drei Solo-Sonderregeln S1–S3**~~ — **GEKLÄRT.** Die deutsche
   Anleitung hat einen eigenen Solo-Abschnitt `[DE S.34]`, der alle drei wörtlich
   enthält. Es sind keine Hausregeln, sondern **die offizielle Solovariante**;
   §2.2 ist entsprechend neu geschrieben. **Offen bleibt nur:** ob auch später
   erworbenes Geld in den gemeinsamen Topf geht — die Anleitung regelt wörtlich
   nur die 30 **Start**münzen.
2. **Genauer Wortlaut des Fluchs „Curse of the Bruised Peel".** **TEILWEISE
   GEKLÄRT.** Der **deutsche Name ist jetzt belegt: „Der Fluch der matschigen
   Haut"**, und er ist **Krummbiegels persönlicher Fluch** — der einzige, der zu
   Partiebeginn freigeschaltet ist `[NN S.5]`. **Weiter offen bleibt der
   Effekttext**: er steht auf der Fluchkarte, die nur als deutsche Druckdatei
   (`FN_Curse_Cards_FRONT_DE_RZ_klein.pdf`) vorliegt und nicht gelesen wurde; die
   Wirkung in §10.3 stammt aus dem Video `[E01 36:16]`.
   Hinweis zum Modellieren: der Fluch überschreibt den **Werte-Reset** aus
   Nachbereitungsschritt 5 (§7), nicht einen separaten Heilungsschritt (§6.6).
3. ~~**Formulierung „Randale"**~~ — **GEKLÄRT.** Der Kartenabschnitt heißt
   **„Krawall"** `[DE S.16]`; „Randale" kommt auf keiner der 36 Seiten vor.
   Überall ersetzt.
4. **Sheriff-Niederlagebedingung:** **TEILWEISE GEKLÄRT.** Die Anleitung ist
   **unbedingt und ohne Zeitpunktangabe**: „Sobald der Sheriff besiegt wird,
   verliert ihr die Partie!" `[DE S.23]` — also **sofort**. Die abweichende
   Tableau-Formulierung („zu Beginn des Bösewicht-Zuges") konnte nicht geprüft
   werden und wird von der Anleitung **nicht** gestützt. **Als „sofort"
   implementieren**, und nur dort abweichen, wo ein Tableau es ausdrücklich
   anders druckt (§8.2).
5. **Zählen besiegte oder vom Schlachtfeld entfernte Dörfler für „Anzahl
   Dörfler"?** **TEILWEISE GEKLÄRT.** Für die drei Fälle, die in der Anleitung
   vorkommen, ist die Antwort klar, weil alle auf die **Besetzung der Partie**
   abstellen und nicht auf den Kampfstand: Bösewicht-Werte „abhängig von der
   Anzahl Dörfler **im Spiel**" `[DE S.13]` (einmal beim Aufbau festgelegt),
   Endgegner-Terrain „durch die Anzahl der **mitspielenden** Dörfler bestimmt"
   `[DE S.23]`, Laden erneuern „**pro Dörfler** 2 Münzen" `[DE S.12]` (in der
   Dorfphase, wo alle wieder dabei sind).
   **Offen bleibt** die Frage für **Kartentexte im Kampf** („je Dörfler", „alle
   Dörfler"). Einziger Anhaltspunkt: „Solange du vom Schlachtfeld entfernt bist,
   kannst du weder zum Ziel einer Bösewicht-Aktion werden" `[DE S.22]` — wer kein
   Ziel sein kann, dürfte auch nicht in eine Zielmenge zählen. Das deckt aber nur
   die Zielbestimmung, keine Mengenangaben in Effekten.
6. **Deutsche Namen von Yancy Plover und Quintus Binch.** **TEILWEISE GEKLÄRT.**
   `[DE S.5]` nennt alle sieben Basis-Dörfler auf Deutsch; durch Ausschluss
   bleiben **Ludwig Knilch** und **Siggi von Saumagen** — welcher welcher ist,
   bleibt offen. Die Anleitung nennt **keine englischen Namen**. Ein Abgleich der
   Schicksalstexte `[DE S.24–29]`, die deutsche Dörflernamen im Erzähltext
   nennen, mit den englischen „Results"-Texten könnte die Zuordnung liefern; das
   englische Heft liegt dafür nicht mehr vor.
   Die Zuordnungen von Georgie Irongut, Blopsy Twins und Judy Marks bleiben aus
   der Bedeutung erschlossen, nicht direkt belegt.
   Nebenbefund: die Anleitung schreibt den Bösewicht auf `[DE S.5]` **„WILLI
   WEDLER"**, auf `[DE S.33]` **„Willy Wedler"** — sie ist selbst inkonsistent,
   beide Schreibungen sind belegt.
7. ~~**Deutsche Namen von Deputy Waggums und Handsy** (Willi Wedler /
   Truthand) sind ebenfalls nur erschlossen~~ — **erledigt.** Belegt über den
   senkrechten Bösewichtnamen auf den Beutekarten, siehe §5.5 und
   `docs/befund-beute-und-aufstellbares.md` §2.4. Dort ebenfalls belegt:
   *Tartar Fishboy = Fritze Fisch**kopp*** und
   *The Door Knockers = Die weissen Herren*.
8. **Terrainkarten-Details.** **TEILWEISE GEKLÄRT.** Die Anleitung liefert
   **alle 20 Terrainnamen** des Grundspiels `[DE S.36]`, die **7 Terrains je
   Grundspiel-Bösewicht** `[DE S.33]` und die Arten-Grundregeln `[DE S.14]`.
   Die 20 Namen lauten: Dorfteich, **Marodes Farmhaus**, Rostige Schrottkarre,
   Werkzeugschuppen, Wunschbrunnen, Summender Bienenstock, **Miefiges
   Plumpsklo**, Pilzwäldchen, Altes Fass, Bärenfalle, **Sprengstoff & Auslöser**,
   Überwuchertes Maisfeld, Gemüsebeet, **Hütte des Dorfdoktors**, Holzzaun,
   Hohler Heuhaufen, Verwahrlostes Picknick, Dichter Wald, Trüber Fluss,
   Matschiger Graben.
   Damit sind vier frühere Namen korrigiert: „Wackelhof" → Marodes Farmhaus,
   „Plumpsklo" → Miefiges Plumpsklo, „TNT + Zünder" → Sprengstoff & Auslöser,
   „Arzthütte" → Hütte des Dorfdoktors. **„Schlammgraben" kommt in der Anleitung
   nicht vor** (0 Treffer) — die Terrain-Plättchen sind doppelseitig, die
   Rückseite könnte so heißen, ohne die Plättchen nicht prüfbar
   (`⚠️ NUR VIDEO: [E02 18:36]`).
   **Weiter offen** bleiben die **Kartentexte** der 20 Basis- und 13
   FN-Terrainkarten (Kosten, Interaktionen, Effekte). Dafür müssen
   `terrain_deck_FRONT_DE_V10` und `FN_terrain_deck_FRONT_DE` ausgewertet werden.
9. **Heldentaten- und Dorf-Ereignis-Decks** wurden nicht erfasst. Die
   **Anzahlen** sind bestätigt (`[DE S.5]`: 75× Heldentat, 100× Dorf-Ereignis,
   +5 Ereignisse aus FN), die **Karteninhalte** nicht. Die Kartenanatomie steht
   in der Anleitung: Heldentat = Name / Auftrag / Heldenpunkte / Belohnung
   `[DE S.11]`. Die Druckdaten liegen in `Downloads\` vor und extrahieren sauber
   als Text.
10. **Die Erweiterungen — §9 und §10 sind NICHT abgeglichen.** Die
    Grundspielanleitung behandelt **ausschließlich das Grundspiel**: „Überfall",
    „Fluch" und „Rolle" kommen auf den 36 Seiten nicht vor. Seit 2026-10-14 liegen
    aber die **deutschen Erweiterungsanleitungen** `[NN S.x]` (16 S.) und
    `[TT S.x]` (12 S.) vor — deutlich ausführlicher als `[FN]`/`[OJ]`. Ein
    eigener Durchgang wie der fürs Grundspiel steht aus. **Beim Eintragen schon
    aufgefallen (nicht erschöpfend, nicht eingearbeitet):**
    - **§10 kennt „Krummbiegel" nicht.** Er ist „Tante Emmas größter Konkurrent
      und Erzrivale", ein Händler für Flüche, und die Flüche der Erweiterung sind
      **seine** `[NN S.5]`, `[NN S.14]`. Die Trophäenwand schaltet sie frei: „mit
      jedem neuen Kopf an eurer Trophäenwand belegt der fiese Krummbiegel Heureka
      mit einem weiteren Fluch". **21 Flüche**, Schwierigkeit leicht/mittel/schwer
      (§10.3 sagt „1–3 Symbole").
    - **Deutsche Begriffe fehlen durchgehend in §9 und §10:** `Glaube` statt
      „Belief", `Kubus` statt „Strange Cube", `Aufstellbare Ausrüstung` statt
      „Aufstellbares/Deployable", `Laden-Ereignis` statt
      „Karren-Ereignis-Ausrüstung / Cart Event Gear", `Operation` /
      `Beutezug` (3 je Operation) / `Vorbereitung` / `Notiz` / `Aufleber` /
      `Tante Emmas Notizbuch` statt „Expedition / Ort / Vorbereitung /
      Journaleintrag / Sticker / Peddler's Journal", und die Register heißen
      **„Tante Emma Ausrüstung (TT)"** und **„Gesperrte Ausrüstung (TT)"**
      `[TT S.4-9]`, `[NN S.5-7]`.
    - **§9 fehlen zwei ganze Kartentypen bzw. Regeln** `[TT S.5]`:
      „**Beende deinen Zug:**"-Fähigkeiten (aktiv ausgelöst, **nur 1 pro Zug**,
      und zwar am Zugende) und die Einschränkung **„Aufstellbare Ausrüstung kann
      nur von dem Dörfler platziert werden, der sie besitzt"** (benutzen darf sie
      jeder, wer auf dem Plättchen steht).
    - **„1x pro Kampf" ist genauer geregelt als in §6.3** `[NN S.15]`: ein Effekt
      „1x pro Kampf" **ohne** weitere Kosten kann auch außerhalb des eigenen Zuges
      ausgelöst werden; **mit** weiteren Kosten („1 MUMM", „Snacken", „Abwerfen")
      nur im eigenen Zug. Gilt auch für „1x pro Runde".
    - **`[NN S.15]` enthält die 7 Terrains je Erweiterungs-Bösewicht** und
      bösewichtspezifische Klarstellungen — das Gegenstück zu `[DE S.33]` und
      direkt für `setups.scenario_data` verwertbar.
    - **`[NN S.16]` listet die 13 Terrainnamen der Erweiterung** auf Deutsch, was
      die Zahl „13 FN-Terrainkarten" in §13.8 bestätigt.
    - **`[NN S.8-11]` enthält die Schicksale 37 ff.** („die Einträge 1–36 findet
      ihr in der Anleitung des Grundspiels").
11. **Karten- und Tableaudaten.** Die Anleitung kann sie grundsätzlich nicht
    liefern: Terrain-Karten, Heldentaten, Dorf-Ereignisse, Bösewicht-Aktionen,
    Bösewicht-Ausrüstung und die Bösewicht-Tableaus (BEW/LEB-Zahlen,
    Schwächentexte, Stufen-Fähigkeiten, Schlachtfeld-Übersichten,
    Endgegner-Abschnitte). Dafür bleiben `[Tableau …]` und die deutschen
    Druckdaten die Quelle. **§5.5 ist davon komplett betroffen und wurde nicht
    gegengeprüft.**
12. **Aufdrucke auf dem Spielbrett.** Die Stufennamen **Rüpel** und **Halunke**
    sind inzwischen belegt `[NN S.15]`; **offen bleibt nur, welcher Platz 2 und
    welcher Platz 3 ist** (§5.2) — das steht auf dem Spielbrett. Ebenso offen: die
    Bezeichnungen der Leistenplätze.

## 5.10 Grundflächen: Bösewicht 2×2, Dörfler 1×1

Regelrelevant, weil daran Nachbarschaft, Bewegung und Deckung hängen. **Die
Anleitung belegt es jetzt in Prosa** — die frühere Foto-Herleitung ist nicht mehr
nötig.

> „Obwohl der Bösewicht im Gegensatz zu den Dörfler **2x2 Felder bedeckt**,
> funktioniert seine Bewegung dennoch sehr ähnlich: Bösewichte können sich auch
> nur horizontal oder vertikal auf angrenzende Felder bewegen. Da sie größer
> sind, entspricht **1 BEWEGUNG hier aber 1 angrenzenden Paar an Feldern**."
> `[DE S.17]`

Glossar: „Bösewicht bewegen: Mit 1 BEW bewegt sich der Bösewicht auf **ein
angrenzendes Paar an Feldern** (nicht diagonal)." `[DE S.35]`

- **Ein Bösewicht belegt vier Felder (2×2)** und hat damit **acht**
  Nachbarfelder, nicht vier. Bestätigt durch `[BR S.16]` („Ruffian Movement
  Examples").
- **Ein Dörfler belegt ein Feld (1×1)**: „Mit 1 BEW darfst du dich auf **ein**
  angrenzendes Feld bewegen (nicht diagonal)" `[DE S.35]`.
- **Auf den Szenariokarten (Schlachtfeld-Übersicht)** markiert der **`B`**-Kreis
  die 2×2-Fläche — „Platziert den Bösewicht auf **die Felder** mit dem großen B"
  `[DE S.13]`, also ausdrücklich mehrere Felder. Nachgemessen: Durchmesser rund
  1,8 Felder, Mittelpunkt auf einem Rasterkreuz. Die **`D`**-Kreise markieren
  **einzelne** Felder.
- **Für die Engine:** der Bösewicht wird über einen Feldbereich gesetzt
  (`J8:K9`), die Dörfler über einzelne Felder (M7.1).

**Offen:** ob Bösewichte mit ungewöhnlicher Gestalt (Ms. Falls & Co. als Turm,
The Door Knockers als Paar) ebenfalls 2×2 belegen, ist nicht geprüft — nur die
allgemeine Abbildung liegt vor.
