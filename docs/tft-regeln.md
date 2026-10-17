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
> so stand es bis 2026-10-14 in diesen Unterlagen. Die vier Kategorien der
> Produktionsdatenbank sind am 2026-10-17 nachgezogen (M24.1) und heißen jetzt
> `Dorf-Ereignisse (Neue Nachbarn)`, `Einzigartige Ausrüstung (Neue Nachbarn)`,
> `Gelände (Neue Nachbarn)` und `Startausrüstung (Neue Nachbarn)`.
> Auch die Anleitung selbst nennt sie so: „Flut ist ein Terrain aus der **Neue
> Nachbarn**-Erweiterung" `[DE S.32]`.
>
> **Abgleich der Erweiterungen 2026-10-14.** §9 (Toller Trödel) und §10 (Neue
> Nachbarn) sind jetzt ebenfalls geprüft — gegen die deutschen Anleitungen
> `[TT]` (12 S.) und `[NN]` (16 S.). Begründungen und Zitate stehen in
> `docs/regelabgleich-erweiterungen.md`. **Rangfolge:** `[FAQ]` → `[TT]`/`[NN]`
> → `[OJ]`/`[FN]`; die zehn Punkte, in denen die englischen Hefte **alleinige**
> Quelle bleiben, stehen in §0.

---

## 0. Quellen und Belegkonventionen

| Kürzel | Quelle |
|---|---|
| `[BR S.x]` | **Basis-Regelwerk** „Townsfolk Tussle – Rules & Results Booklet" (1st Ed., 32 S.), englisch. Kopie: `scratchpad/rules/base.pdf`, Textauszug `base.txt`. Seitenzahlen = Buchseiten = PDF-Seiten. |
| `[EXP S.4]` | **Expansion-Demo-Regelwerk**, Seite 4 „Base Game Rule Updates" — offizielle Regel-Updates, die in die **2. Edition** einfließen. Die deutsche Frosted-Games-Ausgabe entspricht diesem Stand (siehe §1.3). Kopie: `scratchpad/rules/expansion.pdf`. |
| `[FN S.x]` | **Foul Neighbors Rulebook** (dt. „Neue Nachbarn"), `C:\Users\benja\Downloads\Rulebook_FOULNEIGHBORS_Compressed.pdf`, englisch, 9 S. **Nachrangig gegenüber `[NN S.x]`** — aber in den unten genannten Punkten **weiterhin alleinige Quelle**. |
| `[OJ S.x]` | **Odd Jobs Rulebook** (dt. „Toller Trödel"), `C:\Users\benja\Downloads\Rulebook_ODDJOBS_compressed.pdf`, englisch, 7 S. **Nachrangig gegenüber `[TT S.x]`** — aber in den unten genannten Punkten **weiterhin alleinige Quelle**. |
| `[NN S.x]` | **Deutsche Anleitung „Neue Nachbarn"** (Frosted Games, 16 Seiten, inkl. Schicksale 37+), `C:\Users\benja\Downloads\Townsfolk_Tussle_Ueble_Nachbarn_Anleitung.pdf`. **Maßgeblich für §10**; deutlich ausführlicher als `[FN]`. Abgeglichen 2026-10-14. |
| `[TT S.x]` | **Deutsche Anleitung „Toller Trödel"** (Frosted Games, 12 Seiten), `C:\Users\benja\Downloads\Townsfolk_Tussle_Toller_Troedel_Anleitung.pdf`. **Maßgeblich für §9**; deutlich ausführlicher als `[OJ]`. Abgeglichen 2026-10-14. |
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

**Rangfolge bei den Erweiterungen:** `[FAQ]` → `[TT]` / `[NN]` → `[OJ]` / `[FN]`.
Die deutschen Hefte sind deutlich reicher und liefern alle Begriffe, Zahlen und
etwa zwei Dutzend Regeln, die im Englischen fehlen. **Sie ersetzen die englischen
aber nicht:** in den folgenden zehn Punkten ist `[OJ]` bzw. `[FN]` die **einzige**
Quelle (Einzelnachweise in `docs/regelabgleich-erweiterungen.md` §6.1):

1. **Frei-Feld-Definition bei Aufstellbaren** — „contains no terrain, characters,
   **other deployables**, etc." `[OJ S.3]`; `[TT S.5]` zählt andere Aufstellbare
   nicht mit auf, die englische Fassung ist die strengere (§9.3).
2. **Position der Rollenbezeichnung** auf der Karte („on the left side")
   `[OJ S.4]`; `[TT S.6]` nennt keine Position (§9.2).
3. **Baby's Bib** — kein MUMM fürs Wegpacken während der Fähigkeit `[OJ S.6]`.
4. **Bloody Debris** — „‚Missing HP' is your maximum HP minus your current HP"
   `[OJ S.6]`.
5. **Startkapital im 3-Runden-Modus** — „10 Coins (**15 Coins in 3-round mode**)"
   `[OJ S.7]`, `[FN S.9]`; die deutschen Kurzreferenzen nennen nur 10 Münzen.
6. **Wiederintegration der Bösewicht-Plättchen nach der Partie** — „you **may
   return** … or keep them integrated" `[FN S.3]`; `[NN S.4]` kennt den Satz nicht
   (§10.1).
7. **Flut-Terrain verdrängt andere Terraineffekte** — „removing the effects over
   other terrain on that square" `[FN S.8]` (§10.4).
8. **Die ausdrückliche Verneinung bei Theas Pflanzen** — „DMG from an action,
   **not a terrain piece**" `[FN S.8]`; `[NN S.15]` formuliert es nur positiv
   (§10.4).
9. **Die englischen Schlüsselwörter** (cast/lure in/thrash,
   dunk/force-feed/sharpen cleaver, sulk/spritz/shock, embody) `[FN S.4]` — für
   die Zuordnung zu Tableau- und TTS-Daten unverzichtbar (§10.4).
10. **Die englischen Fluch- und Bösewichtnamen der Trophäenwand** `[FN S.7-8]` —
    die Namensbrücke deutsch/englisch (§10.3).

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
| Münzen **abwerfen** (= zurück in den Vorrat) | — | discard coins |
| Münzen **zahlen** (mit Folgetext) | — | pay coins |

**Begriffe der Erweiterungen** — die deutschen Namen stehen in `[TT]` und
`[NN]`; was in diesen Unterlagen früher englisch oder selbst übersetzt stand, ist
am 2026-10-14 nachgezogen worden (§9, §10):

| Deutsch | Englisch | Quelle |
|---|---|---|
| *— nur Neue Nachbarn —* | | |
| Überfall-Effekt / Überfall-Karte | Ambush | `[NN S.5]` |
| Register **„Flüche – Gesperrt"** / **„Flüche – Freigeschaltet"** | Curses – Locked / Unlocked | `[NN S.4]` |
| Krummbiegel (der Fluchhändler) | Barnaby | `[NN S.14]` |
| Fluch der matschigen Haut (der Startfluch) | Curse of the Bruised Peel | `[NN S.5]` |
| **Glaube** (Marker) | Belief | `[NN S.6]` |
| **Kubus** (Besondere Ausrüstung) / **bekehrt** (Zustand) | Strange Cube / converted | `[NN S.6]` |
| Wasser-Plättchen / Flut-Terrain | water token / Flood terrain | `[NN S.5-6]` |
| Krankheits-Plättchen | disease token | `[NN S.7]` |
| **Kostüm-Fetzen** / Tableau **„Fleckchens Kostüm"** | costume pieces / costume mat | `[NN S.6]` |
| **Verkörpern** | embody | `[NN S.7]` |
| Köderstulle (zählt **nie** als Figur) | Bait Sandwich | `[NN S.6]` |
| Neblingen / Sturzbrunn (Nachbardörfer) | Misty Bluff / Sprinkle Falls | `[NN S.3]` |
| *— nur Toller Trödel —* | | |
| Rolle / Rollenkarte | Role | `[TT S.6]` |
| **Aufstellbare Ausrüstung** (+ Plättchen) | Deployable | `[TT S.5]` |
| **Laden-Ereignis** (Merkmal) | Cart Event Gear | `[TT S.5]` |
| **Fummelei / Bastelei / Buddelei** (Merkmale) | Key / Repair / Dig | `[TT S.9]` |
| „**Beende deinen Zug**" (Auslösezeitpunkt) | End your turn | `[TT S.5]` |
| **Tante Emmas Notizbuch** | Peddler's Journal | `[TT S.8]` |
| **Operation** → 3 **Beutezüge** → **Vorbereitung** → **Aufgaben** | expedition → locations → preparation → tasks | `[TT S.8]` |
| **Aufkleber** / **Notiz XX** | sticker / Journal XX | `[TT S.8-9]` |
| Register **„Tante Emma Ausrüstung (TT)"** / **„Gesperrte Ausrüstung (TT)"** / **„Müll (TT)"** | Peddler Gear / Locked / Trash (Odd Jobs) | `[TT S.4, S.9]` |

*Zwei Inkonsistenzen der Hefte selbst:* `[TT S.12]` schreibt in der
Kurzreferenz „**Sticker**" statt Aufkleber, `[TT S.10]` „Gesperrt (TT)" statt
„Gesperrte Ausrüstung (TT)".

**„Einzigartige Ausrüstung" ist kein Regelbegriff.** Der feststehende Begriff ist
**Besondere Ausrüstung** — Komponentenliste `[TT S.2]` („4x Besondere
Ausrüstung"), `[NN S.2]` („33x Besondere Ausrüstung"), Regeltext `[TT S.7]`.

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
> **Engine, erledigt am 2026-10-14:** Szenariodaten, Spec, Tests und Kommentare
> stehen jetzt durchgehend auf `D`/`B`/`EG`. Die Produktionsdaten führten `D`
> und `B` ohnehin schon richtig; nur `FF` war der Ausreißer. Wer einen
> Endgegner-Aufbau baut, bindet also `$EG1`…`$EG5`, **nicht** `$FF1`.

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

**Zusätzlich bei Neue Nachbarn — ein echter Aufbauschritt, kein Hinlegen:** den
**Überfall-Effekt** vom Bösewicht-Tableau (unterhalb BEW/LEB) **sofort
ausführen**; dadurch kommen 1 oder mehr **Überfall-Karten** ins Spiel, die aus
den Bösewicht-Aktionen herausgesucht und **offen in die Nähe des Zusatz-Bretts**
gelegt werden. Sie enthalten **meist weitere Aufbauschritte und / oder
Sonderregeln** — die müssen vor dem ersten Zug abgearbeitet sein `[NN S.5]`,
`[NN S.16]`. Die Kurzreferenz setzt den Schritt zwischen Schritt 4 und 5 („Legt
das entsprechende Bösewicht-Tableau und die zugehörigen Bösewicht-Aktionen auf
das Zusatz-Brett. → Legt entsprechende Überfall-Karte(n) offen aus.")
`[NN S.16]`. Siehe §10.2. Die Grundspielanleitung kennt diesen Schritt nicht.

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
    (dt. **Maskenlos** und **Die Gurte der Maske** `[NN S.7]`, `[NN S.15]`. Die
    englische Formulierung „in play" ist genau die, die §10.2 richtigstellt: der
    Überfall ist ein **auszuführender Aufbauschritt**, kein Zustand.)
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
- **Patches / Fleckchen:** hat mit LEB 1/2/2/3 absurd wenige Lebenspunkte — der
  Kampf läuft stattdessen über seine **Kostüm-Fetzen** (9 Stück, `[NN S.2]`,
  `[NN S.6]`) und die Überfallkarte „9 lives" `[Tableau Patches]`, `[FN S.7]`
  (deutscher Kartenname in `[NN]` nicht genannt). Dazu die Aktion
  **Katerstimmung**, die sein **Max LEB** erhöht, ohne sein LEB mitzuheben
  `[NN S.15]` (§10.4).

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
| Barry Bluff | Viktor Visage | **höchste Dörfler-BEW +1** | **Summe aller Dörfler-LEB +3** | **Maskenlos** + **Die Gurte der Maske** |
| Ernie Offal | Arnold Schmatz | 5/5/5/5 | 12/18/21/24 | **Hauptgericht** |
| Red Atrocious | Dr. Bosskop | 5/6/8/8 | 13/17/20/24 | **Pestdoktor** |
| Tilda Fields | Thea Kotta | 2/3/3/4 | 10/15/20/24 | ⚠️ dt. Name unbelegt (en. „Living Garden") |
| Tartar Fishboy | Fritze Fischkopp | 9/9/9/9 | 13/17/20/23 | **Fischer Fritze fischt** ⚠️ |
| The Door Knockers | Die weißen Herren | 5/5/6/7 | 10/15/18/21 | ⚠️ dt. Name unbelegt (en. „One of Us") |
| Ms. Falls & Co. | Rosa Voir & die WG | 4/4/5/5 | 13/17/20/23 (die „Company" beginnt mit **3 LEB je Dörfler** und ist das eigentliche Angriffsziel) | **WG-Terror** |
| Patches | Fleckchen | 7/8/8/9 | 1/2/2/3 (Kostüm-Fetzen ersetzen LEB) | ⚠️ dt. Name unbelegt (en. „9 lives") |

**Die Überfall-Kartennamen auf Deutsch** stammen aus `[NN S.6-7]` und
`[NN S.15]`. Für **Thea Kotta**, **Die weißen Herren** und **Fleckchen** nennt
die deutsche Anleitung **keinen** Namen — dort stehen weiterhin die vom Tableau
abgelesenen englischen (`[Tableau …]`), ungeprüft.
`⚠️ UNSICHER:` Bei **Fritze Fischkopp** widersprechen sich die Quellen —
`[NN S.6]` nennt die Überfall-Karte **„Fischer Fritze fischt"**, vom Tableau war
„Angry Angler" abgelesen. Entweder ein zweiter Kartenname oder ein Lesefehler;
hier nicht entscheidbar. (Für Rosa Voir stand bei uns „Shocking Guests" — belegt
ist **„WG-Terror"** `[NN S.7]`.)

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
Dr. Bosskop, Rosa Voir & die WG. Die **Trophäenwand** `[NN S.12-13]` bestätigt
sie noch einmal zusammen mit allen zwölf Grundspielnamen.

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
| **Aufstellbare Ausrüstung platzieren** (Toller Trödel) | **kostenlos**, auf 1 angrenzendes **freies** Feld; **nur der Besitzer** darf platzieren, max. 2 eigene gleichzeitig im Spiel `[TT S.5]` (§9.3) |
| **„Beende deinen Zug"-Fähigkeit auslösen** (Toller Trödel) | aktiv ausgelöst, **nur 1 davon pro Zug**, und zwar **am Zugende** `[TT S.5]` (siehe unten) |

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
  nur eine Erweiterungs-FAQ (`[TT S.10]` wiederholt sie).
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

**„1× pro Kampf" und „1× pro Runde" — wann der Effekt liegen darf.** Diese
Zeitpunktregel steht **wortgleich in beiden Erweiterungsanleitungen**
`[TT S.10]`, `[NN S.15]` und ist damit keine Erweiterungssonderregel, sondern die
Auslegung einer Grundspielformulierung:

> „Gilt ein Effekt „1x pro Kampf", kann dieser **nicht (nur) aktiv im eigenen
> Zug** ausgelöst werden, sondern kann – je nach Effekt-Text – **auch zu anderen
> Zeitpunkten** ausgelöst werden. Effekte, die „1x pro Kampf" (**MIT weiteren
> Kosten**, zum Beispiel „1 MUMM", „Snacken" oder „Abwerfen") ausgelöst werden,
> können **nur in deinem Zug** ausgelöst werden." `[TT S.10]`

`[NN S.15]` ergänzt: „**Gilt auch für ‚1x pro Runde'.**"

Entscheidend am Tisch: ein „1× pro Kampf"-Effekt **ohne** weitere Kosten ist auch
als **Reaktion im Bösewicht-Zug** nutzbar; **mit** weiteren Kosten nur im eigenen
Zug.

**„Beende deinen Zug" (Toller Trödel)** ist ein **eigener Auslösezeitpunkt mit
eigener Obergrenze** `[TT S.5]`:

> „Manch Ausrüstung – vor allem die vom Tüftler! – haben Fähigkeiten die du
> auslösen kannst, indem du **deinen Zug beendest**. Aber Achtung: Diese
> Fähigkeiten löst du **aktiv** aus und kannst somit **immer nur 1 dieser
> Fähigkeiten pro Zug** auslösen – und zwar wann? Genau, **am Ende**!"

Und `[TT S.10]`: „Diese Anweisung ist **aktiv** und hast du mehrere dieser Karten,
gilt das Beenden des Zuges **nicht für alle gleichzeitig**." Die Grenze ist also
**1 pro Zug insgesamt**, unabhängig von der Regel „jede Ausrüstung max. 1× pro
Zug".

**„Tappen" (Quer legen)** — *Tischkonvention, keine gedruckte Regel*:
Ausrüstung, deren Fähigkeit „einmal pro Kampf" gilt, wird nach Gebrauch **um 90°
gedreht**, damit man sie nicht erneut nutzt. Zum nächsten Kampf wird alles wieder
gerade gelegt `[E02 27:29]`. Regeltechnisch gilt schlicht: **jede Fähigkeit max.
1× pro Zug, sofern nicht anders angegeben** `[DE S.21]`; steht „einmal pro Kampf"
auf der Karte, gilt das. **Achtung:** viele Snack-Karten des Basisspiels sagen
stattdessen **abwerfen** — die sind dann endgültig weg `[E02 27:41]`
(Toller-Trödel-Snacks werden dagegen **nicht** abgeworfen; ihre
Nutzungsbegrenzung steht auf der Karte, §9.4).

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
  die Heilung. (Ausnahme: der **Fluch der matschigen Haut**, §10.3 — dort ist
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
  - **Drei Tableaus formulieren es anders** — belegt: „du verlierst, wenn der
    neue Sheriff **zu Beginn des Bösewicht-Zuges** besiegt ist"
    `[Tableau Handsy]`, `[Tableau Qing & Kween]`, `[Tableau The Bundits]`.
    The Bundits druckt wörtlich: „You lose if all townsfolk are knocked out,
    **or if the new sheriff is knocked out at the start of the Ruffian's
    turn**." — am Tisch gelesen in Partie 11
    (`docs/partie11-bericht.md`, Abschnitt 3).
  - **Empfehlung:** als **sofort** implementieren und nur dort abweichen, wo ein
    Tableau es ausdrücklich anders druckt. Genau dieser Fall ist jetzt dreifach
    belegt; die Anleitung stützt die abweichende Formulierung weiterhin nicht,
    die Tableaus tun es.
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
- **Die Schicksale 37–60 stehen in der Erweiterungsanleitung** `[NN S.8–11]`:
  „Diese Seiten enthalten die Schicksale eurer Partien, wenn ihr es bis zu einem
  **Neue Nachbarn-Endgegner** geschafft habt (**die Einträge 1-36 findet ihr in
  der Anleitung des Grundspiels**). Lest immer nur den Eintrag, der zu eurem
  Schicksal gehört!" Das bestätigt die Rechnung unabhängig: 12
  Grundspiel-Bösewichte × 3 Ausgänge = 36, 8 NN-Bösewichte × 3 = 24.
  Die dort freigeschaltete Ausrüstung ist die **Faltschachtel mit 16 Karten**,
  siehe §10.6.

---

## 9. Erweiterung „Toller Trödel" (Odd Jobs) — Erstpartie

> **Abgeglichen 2026-10-14** gegen die deutsche Anleitung `[TT]` (12 S.). Die
> Begründungen und wörtlichen Zitate stehen in
> `docs/regelabgleich-erweiterungen.md`. **`[TT]` ist ab jetzt die maßgebliche
> Quelle**; `[OJ]` bleibt für die Punkte in §0 zitierbar. Die FAQ sagt zu dieser
> Erweiterung **nichts** (0 Treffer für „Toller Trödel", „Rolle",
> „Aufstellbar", „Notizbuch", „Fummelei", „Bastelei", „Buddelei").

„Karten der Toller Trödel-Erweiterung erkennt ihr immer schnell an dem **‚TT' in
der linken oberen Ecke**" `[TT S.4]` (die englische Ausgabe `OJ`). Voll
kombinierbar mit Neue Nachbarn: „die beiden Erweiterungen sind komplett
kompatibel" `[TT S.4]`.

### 9.1 Der Laden

- **Das Nachschubdeck des Grundspiels wird komplett ersetzt:** „Ihr verwendet bei
  einer Partie mit dieser Erweiterung **nicht** die Ausrüstungen des Grundspiels,
  sondern immer **ausschließlich** die Karten hinter dem Trenner **Tante Emma
  Ausrüstung (TT)** – und **nur diese**!" `[TT S.4]`
  `⚠️ NUR VIDEO:` Dass die ersetzte Grundspiel-Ausrüstung am **blauen Rand** zu
  erkennen ist und „in die Schachtel" kommt, steht in **keinem** Heft — nur
  `[E01 26:51]`. Die Regel selbst ist belegt, die Begründung über die Randfarbe
  nicht.
- **Vor der ersten Partie einsortieren:** „Legt die Karten mit den Zahlen **1–30**
  hinter den Trenner **Tante Emma Ausrüstung (TT)** und die übrigen – **ohne sie zu
  mischen!** – hinter den Trenner **Gesperrte Ausrüstung (TT)**" `[TT S.4]`. In der
  Erstpartie umfasst der Nachschub „nur läppische **30** Ausrüstungen" `[TT S.5]`.
  (Die Register heißen so — nicht „Peddler Gear (Odd Jobs)" / „Locked (Odd
  Jobs)". Der Müll-Trenner heißt **„Müll (TT)"** `[TT S.9]`; `[TT S.10]` schreibt
  einmal „Gesperrt (TT)" statt „Gesperrte Ausrüstung (TT)" — die Anleitung ist
  selbst inkonsistent.)
- **Die Zahl steht oben rechts** und ist der Schlüssel für alles Weitere: „Oben
  rechts findet ihr immer die Zahl einer Ausrüstung. Super praktisch beim
  freischalten und entsorgen!" `[TT S.9]`
- **Die Ausnahme reicht über das Grundspiel hinaus:** „**Ausnahme:** Durch
  Spezialaufgaben in Endgegner-Kämpfen freigeschaltete Tante Emma Ausrüstung **des
  Grundspiels sowie anderer Erweiterungen** lässt sich auch mit der Toller
  Trödel-Tante Emma Ausrüstung kombinieren! Mischt sie also gerne einfach dazu."
  `[TT S.4]` — betrifft also auch die 16 Karten aus Neue Nachbarn (§10.6).
- **Zur Ladenmechanik schweigt `[TT]`.** Es regelt nur die **Zusammensetzung** des
  Nachschubdecks. **§4 Schritt 3 gilt unverändert** `[DE S.12]`: 10 Karten Auslage,
  sofortiges Nachfüllen, Erneuern für 2 Münzen pro Dörfler. (Die frühere
  Formulierung „Ansonsten gelten die normalen Ladenregeln" suggerierte, die
  TT-Anleitung bestätige die Übernahme — sie sagt dazu nichts.)
- **Beim Spielaufbau** liegen „die neuen – und ganz schön großen – **Rollenkarten**
  neben den Toller Trödel-Nachschub" `[TT S.4]`.

### 9.2 Rollen

`[TT S.6-7]`

- **Höchstens zwei Rollen pro Karte:** „auf der meisten Toller
  Trödel-Ausrüstung findet ihr **eine oder zwei** Rollen" `[TT S.6]`. Für die
  Engine: das Rollenfeld einer Karte hat **maximal zwei** Einträge.
  Dass die Rollenbezeichnung **am linken Rand** steht, sagt nur `[OJ S.4]` („on
  the left side of the card"); `[TT S.6]` nennt **keine Position**.
- **Besitzen genügt:** „Sobald du mindestens **3 Ausrüstung einer Rolle** besitzt
  (**egal ob angelegt oder nicht**), nimmst du die zu dieser Ausrüstung passende
  Rolle an." `[TT S.6]` Man sucht sie „aus dem Stapel heraus".
- **Immer nur 1 Rolle, wer zuerst kommt:** „Sobald du eine Rolle annimmst, ist
  diese **für alle anderen nicht mehr verfügbar**. Falls du genug Ausrüstung in
  deinem Besitz hast, um zwei oder mehr Rollen anzunehmen, **musst du dich für 1
  dieser Rollen entscheiden**." `[TT S.6]`
- **Rollenwechsel ist der einzige Verlustweg — und gibt die Rolle wieder frei:**
  „Sobald du **drei oder mehr** Ausrüstungen einer **anderen** Rolle im Besitz
  hast, darfst du dich entscheiden, diese neue Rollenkarte annehmen oder die
  aktuelle Rolle zu behalten. **Dies ist die einzige Möglichkeit, eine Rolle zu
  verlieren**, nachdem du sie angenommen hast." `[TT S.6]` Und: „Wenn du eine Rolle
  abwirfst, lege sie **zurück auf den Stapel mit den verfügbaren Rollen**."
  `[TT S.6]` → **Die abgegebene Rolle steht wieder allen offen**, ein Mitspieler
  kann sie übernehmen.
- **Ausrüstung verlieren kostet die Rolle nicht:** „Selbst wenn du Ausrüstung
  abwirfst oder verkaufst und so weniger als 3 Ausrüstungen deiner Rolle besitzt,
  **bleibt die Rolle bei dir**, bis du eine neue Rolle annimmst." `[TT S.6]`
- **Drei Arten von Rollenfähigkeiten:** „Eine Rolle kann euch **passive
  Fähigkeiten, aktivierbare Fähigkeiten sowie Besondere Ausrüstung** geben. Passive
  Fähigkeiten … sind immer aktiv. Aktivierbare Fähigkeiten … darfst du **nur 1x pro
  eigenem Zug** nutzen." `[TT S.7]`
  Zwei Korrekturen gegenüber früher: es heißt **Besondere Ausrüstung** (der
  feststehende Begriff, §1.1 — „einzigartige Ausrüstung" kommt in keiner deutschen
  Anleitung vor), und die Grenze ist **1× pro eigenem Zug**, also **nicht** im Zug
  eines anderen Dörflers.
- **Rollensynergie ist Absicht:** „Rollen funktionieren meist gut mit der
  Ausrüstung, durch die du sie angenommen hast. **Der Tüftler** zum Beispiel kann
  Marker von Ausrüstung entfernen, um damit coole neue Ausrüstung herstellen."
  `[TT S.7]`

**Die deutschen Rollennamen** (bisher nirgends belegt) und die Hinweise dazu
`[TT S.7]`, `[TT S.10]`:

| Rolle (dt.) | engl. | Regelhinweis `[TT S.10]` |
|---|---|---|
| **Tüftler** | Tinkerer | Fähigkeiten über **„Beende deinen Zug"** (§6.3); „hast du mehrere dieser Karten, gilt das Beenden des Zuges **nicht für alle gleichzeitig**". Viel Tüftler-Ausrüstung hat 2 Fähigkeiten — trotzdem nur 1 pro Zug. |
| **Müllkipper** | Trashlord | „Münzen, die du für die Fähigkeit auf deiner Rolle abwirfst, legst du **in den Vorrat**. Sie gehen **nicht** an den Dörfler, der die Ausrüstung verkauft oder abwirft." |
| **Die Kolonie** | Colony | „Du bist Die Kolonie und wurdest besiegt? Dann **giltst du für diesen Kampf nicht mehr als Dörfler** (außer fürs **Rammen**). Wenn alle anderen Dörfler besiegt sind, **verliert ihr also trotzdem**." |
| **Maskottchen** | Mascot | hat meistens 2 Fähigkeiten — „jede Ausrüstung nur 1x pro Zug … (es sei denn, es steht anders da)". |
| **Koch** | Cook | „**Jedes Mal**, wenn du etwas snackst, darf **1 anderer** Dörfler ebenfalls den (**gesamten**) dadurch ausgelösten Effekt ausführen. Dieser führt den Effekt aber **erst zu Beginn seines Zuges** aus. ‚1x pro Kampf' wird dabei natürlich **ignoriert**." (Der Zeitpunkt steht **nur** deutsch; `[OJ S.6]` nennt ihn nicht.) |
| **Schnüffler** | Detective | „Die meiste Schnüffler-Ausrüstung dreht sich um **Bösewicht-Aktionen**. Denk dran, dass die Bösewicht-Aktionen **neu gemischt** werden, sobald der **Ziehstapel leer** ist." |
| **Ungezähmte** | *(in `[OJ]` nicht vorhanden)* | „Nutzt du eine Fähigkeit mit den Kosten ‚**Füge dir 1 AUA zu**', darfst du ihren Effekt auch dann nutzen, wenn du dieses AUA **verhinderst oder auf 0 reduzierst**." |
| **Rotzgöre** | Instigator | Beispiel für eine **passive** Rolle `[TT S.7]`. |

Es gibt **20 Rollen** `[TT S.2]`; die übrigen 12 druckt die Anleitung
absichtlich nicht ab.

### 9.3 Aufstellbare Ausrüstung

`[TT S.5]`

- **Karte und Plättchen gehören zusammen:** „Wenn du Aufstellbare Ausrüstung
  erhältst, nimm dir **immer auch das zugehörige Plättchen**. Sonst kannst du da nix
  mit machen!" Und: „Aufstellbare Ausrüstungen lassen sich **nie anlegen**. Wir
  empfehlen, sie **oberhalb** eurer Dörfler-Tableaus auszulegen, mit dem
  entsprechenden Plättchen darauf."
- **Platzieren:** „In deinem Zug kannst du das Plättchen einer deiner Aufstellbaren
  Ausrüstungen **kostenlos** auf 1 zu dir **angrenzendes freies Feld** platzieren."
- **Freies Feld:** „Aufstellbare Ausrüstung kannst du nur auf **freie Felder**
  (ohne Terrain, ohne Figuren und ohne Sahnesoße!) platzieren" `[TT S.5]` — deckt
  sich mit dem Glossar `[DE S.35]`. **`[TT]` zählt andere Aufstellbare nicht mit
  auf, `[OJ S.3]` schon:** „contains no terrain, characters, **other deployables**,
  etc." Die **englische, strengere** Fassung sollte gelten; ein Feld mit einem
  anderen Aufstellbaren ist dann nicht frei. `⚠️ Nur `[OJ]``
- **Kein Zurücknehmen, kein Umsetzen:** „Einmal platziert, kannst du das Plättchen
  bis zum Ende des Kampfes **nicht zurücknehmen und nicht neu platzieren**." Das
  Umplatzierungsverbot ist die eigentliche Spielbeschränkung.
- **Besitz unbegrenzt, Auslage begrenzt:** „Du darfst **beliebig viel** Aufstellbare
  Ausrüstung besitzen, darfst aber **nur maximal 2 davon gleichzeitig auf dem
  Spielfeld** haben."
- **Nur der Besitzer platziert, benutzen darf jeder:** „**Aufstellbare Ausrüstung
  kann nur von dem Dörfler platziert werden, der sie besitzt**, kann aber – einmal
  platziert – von **jedem** Dörfler genutzt werden."
- **Benutzen heißt: drauf stehen — und dann gilt Als-ob-Besitz:** „Um die meinste
  [sic] Aufstellbare Ausrüstung zu nutzen, **musst du auf ihrem Plättchen stehen**.
  Tust du das, kannst du die Fähigkeit oder Angriffswerte (falls vorhanden) der
  Aufstellbaren Ausrüstung nutzen, **als wäre sie in deinem Besitz**."
  Engine-relevant: solange man auf dem Plättchen steht, zählt die Karte für Werte,
  Rollen-Sets und alles, was auf „Besitz" abfragt.
  Der Vorbehalt ist **konkret**: „Manche Aufstellbare Ausrüstung, wie zum Beispiel
  diese **Prügelscheuche**, haben Effekte, **die auf andere Weise aktiviert
  werden**." (Nicht pauschal „sofern die Karte nichts anderes sagt".)
- **Eigene Aufstellbare nur von angrenzenden Feldern angreifbar** (nur deutsch
  belegt, `[TT S.11]`): „Sheriff-„Piñata" / „Sheriff"-Piñata / Prügelscheuche: Diese
  Aufstellbare Ausrüstung kannst du **nur von angrenzenden Feldern aus angreifen,
  nicht vom Feld aus, auf dem sie platziert sind**."
- **Besitzer weg, Plättchen bleibt:** „Wenn du vom Spielbrett entfernt wirst (zum
  Beispiel weil du besiegt wirst), **bleibt** deine Aufstellbare Ausrüstung auf dem
  Schlachtfeld."
- **Karte abwerfen entfernt das Plättchen:** „Wirfst du eine Aufstellbare Ausrüstung
  ab, entferne **sofort** das dazugehörige Plättchen vom Schlachtfeld."
- **Am Kampfende zurück:** „Nimm am Ende des Kampfes die Plättchen deiner
  Aufstellbaren Ausrüstung **zurück zu dir**."
- **Nie Terrain:** „Plättchen von Aufstellbarer Ausrüstung zählen **nie als
  Terrain** und blockieren **keine** Bewegung." Deshalb nehmen sie auch **durch
  Wasser** keinen Schaden an ihrer Fähigkeit (§10.4, `[NN S.15]`).

### 9.4 Weitere Kartentypen und Merkmale

- **Toller-Trödel-Snacks — keine Deckregel, ein Kartenfeld:** „Im Grundspiel war es
  so: Wenn ihr was snackt, ist es weg. **Bei Toller Trödel ist das nicht immer so**,
  jedoch könnt ihr Snacks trotzdem **oft** nur 1x pro Kampf nutzen. **Steht aber
  immer dabei!** Und das ‚Abwerfen' eben nicht mehr." `[TT S.5]`
  → Sie werden beim Snacken **nicht abgeworfen**; eine Nutzungsbegrenzung gilt aber
  **nicht pauschal**, sondern steht **auf der Karte**. Für die Engine: kein globaler
  „1× pro Kampf"-Zähler für alle TT-Snacks, sondern ein Kartenfeld. (Das englische
  Heft formuliert es fälschlich als Pauschale: „can only be used once per fight"
  `[OJ S.3]`.)
- **Laden-Ereignis** (engl. Cart Event Gear — „Karren-Ereignis-Ausrüstung" war eine
  Eigenübersetzung): „**Laden-Ereignisse** sind eine neue Ausrüstungsart. Sie haben
  das **Merkmal Laden-Ereignis** und sie drehen sich meist um Karten in Tante Emmas
  Laden. Wenn ihr mal außerhalb von Tante Emmas Laden besuchen ein Laden-Ereignis
  vom Nachschub zieht oder aufdeckt, **werft es einfach ab und zieht neu**."
  `[TT S.5]` — der Bezugspunkt ist der Dorfphasen-Schritt „Tante Emmas Laden
  besuchen" (§4 Schritt 3).
- **Fummelei / Bastelei / Buddelei** (engl. Key / Repair / Dig): „Auf einigen
  Ausrüstungskarten findet ihr die **Merkmale Fummelei, Bastelei und Buddelei**.
  Diese können in Kombination mit anderen Ausrüstungen genutzt werden, um an neue
  Ausrüstung zu gelangen, indem ihr sie **auffummelt, zusammenbastelt oder
  ausbuddelt**." Und: „Buddelei, Bastelei und Fummelei findet ihr immer **bei den
  Merkmalen** der Ausrüstung." `[TT S.9]`
  Sie schalten über Tante Emmas Notizbuch neue Ware frei (§9.5).
  `⚠️ ABGELEITET:` Die Zuordnung **Fummelei = Key** folgt aus dem identischen
  Beispiel in beiden Heften (Bobby Pin ist ein Key `[OJ S.5]`, die Treue Haarklammer
  hat das Merkmal Fummelei `[TT S.9]`); **Buddelei = Dig** aus der Wortbedeutung,
  **Bastelei = Repair** nur durch Ausschluss. Keine Quelle stellt die drei Paare
  ausdrücklich gegenüber.
- **„Beende deinen Zug"** ist ein eigener Fähigkeitstyp mit eigener Obergrenze —
  siehe §6.3, weil die Regel dort hingehört.
- **Mehrere Fähigkeiten auf einer Karte:** trotzdem nur eine pro Zug — „Nein, du
  darfst pro Zug immer nur **1 Fähigkeit pro Ausrüstung** nutzen" `[TT S.10]`. Keine
  Sonderregel, sondern eine **Grundregel** des Grundspiels `[DE S.21]`, siehe §6.3.
- **Einzelne Kartenhinweise** `[TT S.11]` sind Kartendaten und hier nicht
  abgeschrieben. Zwei davon stehen **nur englisch** und sind darum notiert:
  „You do not need to pay MOX to unequip **Baby's Bib** while using its ability"
  und „**‚Missing HP'** is your maximum HP minus your current HP" `[OJ S.6]` — in
  `[TT S.11]` **nicht enthalten**. Umgekehrt nur deutsch: „Springfrohe Flöhe /
  Glücks-Egel / Pilzansammlung: Du musst den entsprechenden Wert entsprechend
  **verringern können**, um die Fähigkeit aktivieren zu können" `[TT S.11]`, und
  bei „Uuh, ne Bonuskarte!": „Danach geht es **in Shoppen-Reihenfolge** weiter"
  `[TT S.11]` (`[OJ S.6]` nennt nur den Vorrang des Besitzers).

### 9.5 Was ohne Tante Emmas Notizbuch gilt — **uns fehlt das Heft**

**Tante Emmas Notizbuch** (engl. Peddler's Journal) ist ein eigenes Heft und
**liegt uns nicht vor**. `[TT S.8-9]` beschreibt nur seine Struktur:

**Operation → 3 Beutezüge → je 1 Vorbereitung → mehrere Aufgaben → Aufkleber →
Notiz.** (Nicht „Expedition / Ort / Sticker / Journaleintrag".)

- „Vorne im Notizheft findet ihr die von Tante Emma geplanten **Operationen**.
  **Jede Operation besteht aus 3 Beutezügen.**" `[TT S.8]`
- „Die Operationen dieser Kampagne werden **immer nacheinander** ausgeführt. …
  ist erst somit nur die **Erste Operation „Nahes Holungsgebiet"** für euch
  relevant. Sobald ihr deren 3 Beutezüge durchgeführt habt, weiht euch Tante Emma
  in die Details der nächsten Operation ein." `[TT S.8]` (Zweiter belegter
  Beutezugname: **„Die Saumagen-Festung ausrauben"** `[TT S.10]`.)
- „Jeder Beutezug hat dann seine **eigene Vorbereitung**, die ihr erst abschließen
  müsst, um den Beutezug durchzuführen. **Ihr dürft die Vorbereitungen aller 3
  Beutezüge eurer Operation gleichzeitig und in beliebiger Reihenfolge
  abschließen.**" `[TT S.8]`
- „Jede **Vorbereitung** besteht aus mehren **Aufgaben**." Die zwei Zeitpunkte
  `[TT S.8]`, `[TT S.12]`: **Zu Beginn einer Partie** „überprüft ihr immer, welche
  Aufgaben der aktuellen Operation noch offen sind"; **am Ende einer Partie (egal
  ob gewonnen oder verloren)** „überprüft jeder welche Aufgaben er erfüllt hat und
  klebt dort je 1 Aufkleber auf. Bei Aufgaben mit mehreren Felder, klebt **jeder
  der sie erfüllt** je 1 Aufkleber auf. **Eine Aufgabe ist abgeschlossen, wenn auf
  jedem ihrer Felder 1 Aufkleber klebt.**"
- Ist eine Vorbereitung fertig: „Lest die **Notiz** mit der entsprechenden Nummer
  vor" `[TT S.8]`. „Die meisten Einträge führen dazu, dass Ausrüstung **entsorgt**
  und / oder **freigeschaltet** wird." `[TT S.9]`
- **Drei verschiedene Anweisungen, nicht eine** `[TT S.9]`:
  - **entsorgen** → „legt diese Ausrüstung hinter den Trenner **Müll (TT)**. Sie
    ist damit **dauerhaft** aus eurer Toller Trödel-Tante Emma Ausrüstung entfernt!"
  - **freischalten** → „sucht die Ausrüstung mit der entsprechenden Zahl hinter dem
    Trenner Gesperrte Ausrüstung (TT) heraus und **mischt sie direkt in euren
    Nachschub** (es sei denn es steht anders da)."
  - **freischalten & erhalten** → „nimmt **der Dörfler, der die Ausrüstung
    freigeschaltet hat**, sie nach dem Heraussuchen direkt **in seinen Besitz** …
    **Am Ende der Partie** fügt ihr sie dann eurem Stapel mit Toller Trödel-Tante
    Emma Ausrüstung hinzu."
- **„Selbst ist der Dörfler!"** `[TT S.9]` — der Weg an Ausrüstung **ohne** eine
  Operation: „In dieser Erweiterung gibt es Ausrüstungen mit einem **gelben
  Balken** um unteren Rand … Führt ihr die Anweisung darauf aus, könnt ihr damit
  **noch innerhalb der Partie** neue Ausrüstung freischalten." (Nicht „farbiger
  Balken", nicht „D.I.Y. Scavenging" — das sind die englischen Formulierungen
  `[OJ S.5]`.) Die Freischaltung wirkt **mitten in der laufenden Partie**.

**Ohne das Notizbuch gilt für eine Erstpartie:**

| Funktioniert vollständig | Funktioniert nicht |
|---|---|
| TT-Nachschubdeck **Nr. 1–30** als Laden | Operationen, Beutezüge, Vorbereitungen, Aufgaben |
| **Rollen** und Rollenkarten | Aufkleber am Partieende |
| TT-Snacks, Laden-Ereignisse, „Beende deinen Zug" | **Notizen** („Lies Notiz XX") |
| | **Aufstellbare Ausrüstung** — Regel §9.3 ist vollständig umsetzbar, die Karten sind aber **unerreichbar**: alle 24 tragen die Nummern **73–161** und liegen damit im gesperrten Deck. In einer Erstpartie kann kein Aufstellbares gekauft werden. `⚠️ ABGELEITET` aus eigener Kartenauswertung (`docs/befund-beute-und-aufstellbares.md` §3.1); `[TT S.2]` belegt nur die **Anzahl 24**, keine Nummern. |
| | **Freischalten**, **Freischalten & Erhalten** und **Entsorgen** |
| Fummelei / Bastelei / Buddelei **als Merkmale** | deren Auslösewirkung (verweist auf Notiz-Nummern) |

**Praktische Folge:** Der Kartenpool bleibt **dauerhaft bei Nr. 1–30**; es gibt
**keinen Fortschritt zwischen Partien** über Toller Trödel. Karten mit gelbem
Balken am unteren Rand können ihre Freischaltwirkung **nicht** entfalten — man
kann sie benutzen, aber der Verweis in die Notiz läuft ins Leere.
`⚠️ Empfehlung:` Solche Karten in der Engine als spielbar, aber mit wirkungslosem
Notiz-Verweis modellieren, statt sie zu entfernen — sonst verändert sich die
Wahrscheinlichkeitsverteilung des Decks.

*Nicht aufgenommen, weil ohne das Notizbuch gegenstandslos:* die Wahl unter 3
Aufkleberfarben und das Zurücksetzen der Kampagne `[TT S.10]`, sowie die
Empfehlungen, die Rollenkarte über das Bild auf dem Dörfler-Tableau zu legen und
Rollen erst beim Annehmen anzusehen `[TT S.6-7]` — Tischkosmetik.

---

## 10. Erweiterung „Neue Nachbarn" (Foul Neighbors) — Erstpartie

*Hieß in diesen Unterlagen früher „Üble Nachbarn"; der Name ist am 2026-10-14 auf
den gedruckten deutschen Titel korrigiert `[NN S.1]`.*

> **Abgeglichen 2026-10-14** gegen die deutsche Anleitung `[NN]` (16 S.). Die
> Begründungen und wörtlichen Zitate stehen in
> `docs/regelabgleich-erweiterungen.md`. **`[NN]` ist ab jetzt die maßgebliche
> Quelle**; `[FN]` bleibt für die Punkte in §0 zitierbar.

Alle Komponenten tragen **`NN`** oben links `[NN S.4]` (die englische Ausgabe
`FN`). Voll kombinierbar mit Toller Trödel: „die beiden Erweiterungen sind
komplett kompatibel" `[NN S.4]`.

### 10.1 Aufbau (einmalig und je Partie)

`[NN S.4]`

- **8 neue Bösewicht-Plättchen**: „Legt beim Bestücken der Kampf-Plätze die 8
  Bösewicht-Plättchen aus dieser Erweiterung zu den Bösewicht-Plättchen des
  Grundspiels" `[NN S.4]` → insgesamt **20 Bösewichte**. Dass man sie nach der
  Partie integriert lassen **oder** wieder trennen darf, steht nur im englischen
  Heft `[FN S.3]`; `[NN S.4]` rahmt es als Entscheidung **beim Aufbau jeder
  Partie**. Ergebnis dasselbe, Belegstelle bleibt `[FN S.3]`.
- **2 neue Dörfler**: **Frieda Paletti** (engl. Judy Marks) und **Karla Kühl**
  (engl. Fridgette Jones). **Nicht einfach „normal wählbar":** „Baut alles wie
  gewohnt auf und **achtet auf die besondere Aufbauanweisung auf dem
  Dörfler-Tableau von Karla Kühl**" `[NN S.4]`.
  `⚠️ OFFEN:` Was diese Aufbauanweisung besagt, steht nur auf dem Tableau und
  liegt nicht vor. Ihre Fähigkeiten: Frieda **„Kuss der Muse"** (schenkt anderen
  Dörflern im Kampf **Gemälde**), Karla **„Einpacken"** (gewährt
  **Unterschlupf**, „So seid ihr vorübergehend vor AUA geschützt") `[NN S.7]`.
- **5 neue Dorf-Ereignisse** in den Dorf-Ereignis-Stapel mischen `[NN S.4]`.
- **9 Überfall-Karten** „(**die mit dem coolen Blut!**) … jeweils zu den
  Bösewicht-Aktionen des zugehörigen Bösewichts" sortieren `[NN S.4]` —
  **jedes Deck hat danach 15 Karten** (120 Bösewicht-Aktionen / 8 Bösewichte,
  `[NN S.2]`; so auch `[FN S.3]`).
- **Fleckchens Kostüm NICHT ausbrechen:** „**Nehmt nicht die Kostüm-Plättchen aus
  dem Tableau von Fleckchens Kostüm heraus.** Alle anderen Plättchen könnt ihr
  aus den Tableaus drücken und entsprechend einsortieren" `[NN S.4]`. Die Teile
  heißen **Kostüm-Fetzen**, es sind **9** („1 Fleckchens Kostüm **mit 9
  Kostüm-Fetzen**" `[NN S.2]`), und sie bleiben „am besten **bis zu eurem ersten
  Kampf gegen Fleckchen**" im Tableau `[NN S.6]`.
- **Flüche:** „Legt alle Flüche hinter den Trenner **Flüche – Gesperrt**. Legt
  daraufhin nur den **Fluch der matschigen Haut** hinter den Trenner **Flüche –
  Freigeschaltet**" `[NN S.4]`. (Register heißen so — nicht „Curses –
  Locked/Unlocked".)
- **Wasser-/Glaube-Vorrat:** ein Satz von **70 doppelseitigen Plättchen** für
  **beide** Marker `[NN S.2]`. Der Vorrat ist damit endlich, und das ist
  spielrelevant (§10.4).

### 10.2 Überfall

Jeder Bösewicht aus Neue Nachbarn hat einen **Überfall-Effekt**, gedruckt
**unterhalb** der Werte für BEW und LEB auf seinem Tableau `[NN S.5]`.

> „Jeder neue Bösewicht hat einen Überfall-Effekt. **Ihr führt diesen immer
> sofort beim Aufbau des Kampfes aus** und je nach Bösewicht kommen dadurch
> **1 oder mehr Überfall-Karten** ins Spiel. Sie enthalten meist weitere
> Aufbauschritte und / oder Sonderregeln, die speziell für den Kampf gegen
> diesen Bösewicht gelten." `[NN S.5]`

**Der Überfall ist ein auszuführender Aufbauschritt, kein Zustand.** Die
frühere Formulierung („der Kampf beginnt mit der genannten Aktionskarte bereits
im Spiel", aus `[FN S.3]`) war falsch: wer die Karte nur hinlegt und losspielt,
überspringt die Aufbauschritte, die **auf** der Karte stehen. `[NN S.5]` warnt
ausdrücklich: „Lest euch die Überfall-Karten **immer gut durch**, sie sind oft
ganz schön wichtig für den Kampf!"

- **Effekt und Karte sind zwei Dinge:** der Effekt steht auf dem **Tableau**, die
  Karte(n) werden „aus den Bösewicht-Aktionen **heraus**[gesucht]" `[NN S.5]`.
- Ablage: **offen** „in die **Nähe des Zusatz-Bretts**" `[NN S.5]`, `[NN S.16]`
  („Legt entsprechende Überfall-Karte(n) **offen** aus.") — **nicht** auf das
  Schlachtfeld und nicht an den Hauptplan.
- Die Überfall-Karten sind Teil der **120 Bösewicht-Aktionen** der Erweiterung
  (15 pro Deck) und beim Aufbau an ihrem Blutrand zu erkennen: „Nehmt die 9
  Überfall-Karten (**die mit dem coolen Blut!**)" `[NN S.4]`.
- Ein Bösewicht kann **mehrere** Überfall-Karten haben — Viktor Visage hat zwei:
  **„Maskenlos"** und **„Die Gurte der Maske"** `[NN S.7]`, `[NN S.15]`.
- Die Überfall-Karte ist der Ort, an dem die **Schlüsselwörter** des Bösewichts
  erklärt werden: „Um ein Schlüsselwort auszuführen, befolgt die Anweisung genau
  wie auf [der] Überfall-Karte … beschrieben" `[NN S.6]` (§10.4).
- **Die Bösewichte des Grundspiels haben keinen Überfall** — der Schritt entfällt
  dann `[E01 1:15:41]`.
- **Mehr NN-Zusatzschritte als diesen gibt es in der Kampf-Phase nicht.** Die
  Kurzreferenz `[NN S.16]` markiert in der Kampf-Phase genau **einen** blauen
  Schritt (die Überfall-Karten), in der Vorbereitung „Wählt 1 freigeschalteten
  Fluch für eure Partie (**optional**)" und nach der Partie „Klebt pro besiegtem
  Bösewicht 1 entsprechende Trophäe".

### 10.3 Krummbiegels Flüche — in der Erstpartie fast alle gesperrt

`[NN S.4-5, S.14]`

**Krummbiegel** (engl. Barnaby) ist „Tante Emmas größter Konkurrent und
**Erzrivale**! … ein schurkischer Händler, der sich ganz und gar auf die
**Beschwörung und den Verkauf** feinster und fiesester Flüche spezialisiert hat"
`[NN S.14]`. Die Flüche der Erweiterung sind **seine**.

- Flüche sind eine **optionale Schwierigkeitserhöhung**: „Viel zu einfach? Wählt
  **1 freigeschalteten Fluch** für eure Partie (**optional**)" `[NN S.16]`.
  Verfügbar sind nur die hinter dem Trenner **Flüche – Freigeschaltet** `[NN S.4]`.
- Auslage: „Legt den gewählten Fluch – **sofern nicht anders vorgegeben** – für
  die ganze Partie **für alle offen** aus" `[NN S.4]`. Der Vorbehalt gehört dazu;
  „offen" heißt **sichtbar**. Die Aktivitätsaussage steht separat: „Ein Fluch ist
  **immer für alle Dörfler aktiv**, also behaltet ihn während der gesamten Partie
  im Blick und im Kopf" `[NN S.5]`.
- Drei Schwierigkeitsgrade: „von (leicht) über (mittel) bis (schwer)" `[NN S.5]`
  (als Symbole gedruckt, 1–3).
- **In der Erstpartie ist genau EIN Fluch verfügbar: der „Fluch der matschigen
  Haut".** `[NN S.5]`: „In dieser Erweiterung findet ihr insgesamt **21 Flüche**:
  1 für jeden Bösewicht des Grundspiels und dieser Erweiterung **sowie
  Krummbiegels ganz persönlichen Fluch**. **Dieser ist der einzige Fluch, der
  schon zu Beginn freigeschaltet ist: Der Fluch der matschigen Haut.**"
  → Er ist **Krummbiegels eigener** und **keinem Bösewicht zugeordnet**; über die
  Trophäenwand kann er folglich **nicht** ein zweites Mal freigeschaltet werden.
  (Die frühere Lesung „Curse of the Bruised **Peel** = matschige **Schale**" ist
  erledigt: es heißt **Haut**.)
- **Wirkung — weiterhin offen.** `⚠️ UNSICHER:` **Keine** der Anleitungen druckt
  einen einzigen Fluchtext ab; `[NN S.14]` listet nur die 20 Namen, `[NN S.5]` nur
  die Schwierigkeitsstufen. Die Wirkung („zwischen den Kämpfen heilt man nur
  **1 LEB**, bzw. **2 LEB** wenn man besiegt wurde") stammt allein aus dem Video
  `[E01 36:16]`, ebenso die Einordnung als 3-Sterne-Fluch und „für die erste
  Partie nicht zu empfehlen" `[E01 36:33]`. `⚠️ NUR VIDEO`. Hinweis zum
  Modellieren: der Fluch überschreibt den **Werte-Reset** aus
  Nachbereitungsschritt 5 (§7), nicht einen separaten Heilungsschritt (§6.6).

**Freischaltung weiterer Flüche — Trophäenwand** `[NN S.12-14]`:

- **Am Ende jeder Partie** (Sieg oder Niederlage): „Klebt **pro besiegtem
  Bösewicht 1** entsprechende Trophäe an eure Trophäenwand" `[NN S.16]`.
- **Die Reihenfolge ist der Mechanismus:** „Klebt am Ende jeder Partie die
  **nächste** Trophäe (**in numerisch aufsteigender Reihenfolge**) jedes gerade
  besiegten Bösewichts an die Trophäenwand. **Beim 3. Sieg** über einen Bösewicht
  klebt ihr somit dessen abgetrennten Kopf an die Wand" `[NN S.12]`. Der Kopf beim
  dritten Sieg ist also **Folge** der Klebeordnung, keine Zusatzregel.
- „Immer wenn der Kopf eines Bösewichts an die Trophäenwand geklebt wird, legt die
  Fluch-Karte dieses Bösewichts … aus dem Fach **„Flüche – Gesperrt"** in das Fach
  **„Flüche – Freigeschaltet"**. Ist ein Fluch einmal freigeschaltet, könnt ihr
  ihn in **allen zukünftigen Partien** verwenden" `[NN S.14]`.
- **In einer einzelnen Partie mit 4 verschiedenen Bösewichten wird also nie ein
  Fluch freigeschaltet** — man braucht drei Siege über **denselben** `[E01 38:05]`.

**Die 20 Flüche mit deutschen Namen** `[NN S.14]` (englische Namen `[FN S.7]`):

| Bösewicht | Fluch (dt.) | engl. |
|---|---|---|
| Arnold Schmatz | Appetit auf Dörfler | Taste for Townsfolk |
| Thea Kotta | Balance der Natur | Nature's Rebellion |
| Fleckchen | Leben und Leben lassen | Fading Lifespan |
| Dr. Bosskop | Virenschleuder | Disease Carriers |
| Bert Doofis | Terror-Touristen | Wave of Tourism |
| Jupp Karre | Seelsorgen | Stubborn Spirits |
| Nönigin & Könich | Weniger ist mehr | Gear Shortages |
| Viktoria Spitz | Wurfwaffen-Wahnsinn | Overzealous Attacks |
| Fritze Fischkopp | Zornaroma | Alluring Scent |
| Die weißen Herren | Ein Kubus, sie zu knechten | Cube-Wielding Ruffians |
| Rosa Voir & die WG | Blitz & Donner | Storm Chasers |
| Viktor Visage | Gesichtsblind | Face Blindness |
| Die Karnoven | Diebische Dörfler | Frantic Looting |
| Schnarchbert | Heldenmüd | Fight Fatigue |
| Penny Gönnzales | Geld oder Leben | Greed Pains |
| Truthand | 1000 mal berührt | Sprouting Hand Disorder |
| Fürst Wetternich | Nordwind | Violent Winds |
| Rüdiger Schreck | Herrschaft der Krähen | Looming Crows |
| Freddy Froschmilch | Morgenmuffel | Hopping Pox |
| Willy Wedler | Falsches Mitleid | False Empathy |

Plus Krummbiegels Fluch der matschigen Haut = **21**. *Nebenbefund:* `[NN S.14]`
schreibt **„WILLY WEDLER"**, die Trophäenwand `[NN S.13]` **„WILLI WEDLER"** —
dieselbe Inkonsistenz wie `[DE S.5]` / `[DE S.33]`, siehe §13.6.

### 10.4 Neue Marker und Mechaniken

`[NN S.5-7, S.15]`

#### Wasser

- **Platzieren ist eine Handlungsregel, keine Aufzählung:** „Wenn ihr Wasser auf
  einem Feld platzieren sollt, nehmt ihr 1 Wasser-Plättchen **aus dem Vorrat** und
  legt es auf dieses Feld – **egal ob frei, mit Terrain oder mit Figur**. **Soll
  Wasser auf eine Figur platziert werden, platziert es immer auf das entsprechende
  Tableau.**" `[NN S.5]` Es gibt also **keine** Frei-Feld-Bedingung, und Wasser
  „auf einer Figur" liegt physisch **auf deren Tableau** — daran hängen Effekte
  („Zu viel Wasser auf deinem Dörfler-Tableau und DU wirst zum neuen
  Lieblings-Mobbing-Ziel", `[NN S.7]`).
- **Leerer Vorrat:** „Sollt ihr Wasser platzieren, aber es gibt kein Wasser mehr
  im Vorrat, **platziert kein Wasser**." `[NN S.5]` Der Vorrat sind 70 Plättchen,
  geteilt mit Glaube `[NN S.2]`.
- **Am Kampfende zurück in den Vorrat, nicht „entfernt":** „**Wichtig: Legt am Ende
  eines Kampfes immer alles Wasser (auch von den Dörfler-Tableaus) in den Vorrat
  zurück.**" `[NN S.5]` Der Einschluss der Dörfler-Tableaus ist ausdrücklich.
- **Der Zielraum ist bösewichtabhängig** — `[NN S.15]` schränkt die allgemeine
  Regel pro Bösewicht ein:

  | Bösewicht | Wasser darf gelegt werden auf |
  |---|---|
  | Dr. Bosskop | freie Felder **sowie Terrain-Felder** |
  | Thea Kotta | **Pflanzen-Terrain-Karten** |
  | Rosa Voir & die WG | **Dörfler-Tableaus** sowie **Rosa Voirs Bösewicht-Tableau** |
  | Arnold Schmatz | **freie Felder** |
  | Fritze Fischkopp | freie Felder **sowie Terrain-Felder** |

  Die weißen Herren, Fleckchen und Viktor Visage haben **keine** Wasserzeile — sie
  nutzen kein Wasser. Für die Engine: „platziere Wasser" ist **kein globaler**
  Zielraum.
- **Aufstellbare Ausrüstung aus Toller Trödel ist wasserfest** (die einzige
  kreuzweise Erweiterungsregel, gilt auch für §9.3): „**Aufstellbare Ausrüstung aus
  der Toller Trödel-Erweiterung gelten nicht als Terrain** und verlieren somit
  **durch Wasser auf ihrem Feld nicht ihre Fähigkeit** und können weiterhin
  aktiviert werden." `[NN S.15]`
- Nur englisch belegt: Wasser **verdrängt** andere Terraineffekte auf dem Feld —
  „Water tokens will convert a square into Flood terrain, **removing the effects
  over other terrain** on that square" `[FN S.8]`. `[NN S.15]` sagt das nicht.

#### Glaube und Kubus (nur Die weißen Herren)

- „**Glaube** taucht **nur im Kampf gegen die weißen Herren** auf. Je mehr ihr
  davon habt, desto stärker seid ihr versucht, das großartige Produkt der weißen
  Herren zu nutzen: **Den Kubus!**" `[NN S.6]`
- **Der Kubus ist eine Karte, kein Marker, und der Zustand heißt „bekehrt":**
  „Wenn du genug Glaube gesammelt hast, **wirst du bekehrt**! **Nimm dir dafür
  sofort 1 Besondere Ausrüstung Kubus.** Dadurch **verlierst du die Kontrolle über
  deinen Spielzug** und versuchst deine **kubuslosen nicht bekehrten** Freunde zu
  töten." `[NN S.6]` → Angriffsziele sind **nur** die kubuslosen, nicht bekehrten
  Mitdörfler; bekehrte Mitspieler sind **keine** Ziele.
- **Besiegtwerden wirft Glaube nicht ab:** „Wenn du besiegt wirst, wirf deinen
  gesammelten Glaube **nicht** ab. Wirf deinen Glaube nur ab, wenn ein Effekt es
  besagt **oder am Ende des Kampfes**." `[NN S.15]`
- **Am Kampfende zurück in die Auslage:** „Legt am Ende des Kampfes allen Glaube
  **in die Auslage** zurück." `[NN S.6]` (Nicht „entfernt" — `[FN S.4]` sagt
  „removed from play", die deutsche Fassung ist die genauere, gleiche Logik wie
  beim Wasser: endlicher, geteilter Vorrat.)

#### Krankheiten (nur Dr. Bosskop)

- **Besitz = Krankheit:** „**Sobald du ein entsprechendes Krankheits-Plättchen
  besitzt, hast du die dazugehörige Krankheit.** Von nun an erleidest du – wenn
  diese auf Dr. Bosskops Bösewicht-Aktionen vorkommt – deren spaßige Symptome."
  `[NN S.7]`
- **Abwerfen hat ein Ziel:** „Wenn ihr eine Krankheit abwerft, legt sie **zurück
  auf Dr. Bosskops Überfall-Karte Pestdoktor**." `[NN S.15]` Das ist der
  Nachziehstapel — Krankheiten können also wieder auftauchen.
- **Besiegt = alle ab:** „Wenn du besiegt wirst, **wirf alle** deine bis dahin
  gesammelten Krankheits-Plättchen **ab**." `[NN S.15]`
- **Harte Obergrenze 3:** „Die Angabe ‚3 oder mehr' bei der Bösewicht-Aktion
  **Mutation** bezieht einen möglichen Endgegner-Kampf mit ein. **Im normalen
  Kampf kann ein Dörfler nicht mehr als 3 Krankheiten haben.**" `[NN S.15]`
- **Wurminfekt** nur im Endgegner-Kampf: „… werden **nur im Endgegner-Kampf**
  gegen Dr. Bosskop verwendet und können **nicht auf andere Weise** erhalten
  werden." `[NN S.15]`
- Weiteres zu Dr. Bosskop `[NN S.15]`: seine **Rüpel- und Halunke-Fähigkeiten**
  „lösen **jedes Mal beim Erreichen der Bedingung** wieder aus" (§5.2); Wasser aus
  der Aktion **Infektiöser Schleim** „hat **nur den Effekt, der auf der Karte
  steht**".

#### Masken und Verkörpern (nur Viktor Visage)

- „Wird eine Maske aufgesetzt, **legt ihr sie auf Viktors Überfall-Karte
  Maskenlos**. Er trägt jetzt diese Maske. Viktor kann **immer nur 1 Maske
  gleichzeitig** tragen." `[NN S.7]`
- **Verkörpern** (engl. embody): „Wenn Viktor **Verkörpert**, aktiviert ihr immer
  den Verkörpern-Effekt auf der **gerade getragenen** Maske (oder den
  Verkörpern-Effekt auf **Maskenlos**, wenn Viktor gerade **keine** Maske trägt)."
  `[NN S.7]`
- **Maske abreißen:** „Viktor hat eine zweite Überfall-Karte: **Die Gurte der
  Maske**. Anstatt Viktor selbst anzugreifen, könnt ihr auch Die Gurte der Maske
  angreifen. **Nach 2 erfolgreichen Angriffen** darauf, fällt die Maske zu Boden
  und wird **aus dem Spiel entfernt**." `[NN S.7]` Und `[NN S.15]`: „Wenn ihr den
  **zweiten Marker** von Viktors Überfall-Karte Die Gurte der Maske entfernt, werft
  ihr die getragene Maske **nicht nur ab, sondern entfernt sie für die Partie aus
  dem Spiel**."
  `⚠️ NUR VIDEO:` dass Viktor beim Maskenverlust **sofort Schaden** nimmt
  (`[E02 33:26]`, `[E02 45:25]`), steht **in keinem** Heft — weder `[NN S.7/15]`
  noch `[FN S.8]`. **Unbelegt.**

#### Fleckchens Kostüm

- Im Kampf „zieht ihr ihm dann – **Fetzen für Fetzen** – langsam und schmerzvoll –
  sein Kostüm über die Ohren" `[NN S.6]`.
- **Nach dem Kampf zurück:** „Legt nach dem Kampf alle **Kostüm-Fetzen** wieder
  zurück ins Tableau **Fleckchens Kostüm**." `[NN S.6]` (9 Fetzen, `[NN S.2]`.)
- **Katerstimmung — Max LEB und LEB sind entkoppelt** `[NN S.15]`: „Wenn ihr
  Fleckchens **Max. LEB** erhöht, markiert euch das am besten mit einem Marker
  neben seinem Wert für Max. LEB, **erhöht aber nicht sofort sein LEB!** Erst wenn
  Fleckchens LEB wieder **auf sein Max. LEB gesetzt** wird, setzt ihr sein LEB ab
  jetzt auf den neuen Max LEB-Wert."

#### Theas Pflanzen

- Die Kinder heißen **Doofsterglocke**, **Rangelblume** und
  **Wehtuh-Fratzenfalle** (engl. Doofadil / Marigoon / Cleatus Guytrap); belegt
  doppelt über `[NN S.7]` und die Terrainlisten `[NN S.15]`, `[NN S.16]`.
- **Sie sind Hindernis-Terrain** — damit greifen die Bewegungsregeln für
  Hindernis-Terrain (§1.1, `[DE S.14]`) automatisch: „**Ihre Kinder sind
  Hindernis-Terrains.** Bei der Bewegung **blockieren sie sich also, wodurch sie
  sich gegenseitig um sich herum bewegen müssen**. Figuren aber (**inkl. Thea!**)
  werden von ihnen **gerammt**." `[NN S.7]` (**gerammt**, nicht „gerempelt" —
  Rammen ist der Regelbegriff, §1.1.)
- Blockierter Laufweg: „Ist das der Fall, versucht ein Kind trotzdem, sich mit
  seiner Bewegung **so weit wie möglich seinem Ziel zu nähern**." `[NN S.7]`
- **Gießen:** „Platziert **jedes Mal**, wenn Thea in einer Bösewicht-Aktion
  **gießt**, **je 1 Wasser auf die 3 Terrain-Karten** ihrer geliebten Kinder."
  `[NN S.7]`
- **„Bewegt Thea so weit wie möglich vom Ziel weg" ist eine volle Bewegung:**
  „Hier führt Thea eine **volle Bewegung** durch, bei der sie sich so bewegt, dass
  sie am Ende ihrer Bewegung (**abhängig von ihrem BEW-Wert**) **maximal weit** vom
  Ziel entfernt steht." `[NN S.15]`
- **AUA durch Pflanzen zählt als Aktions-AUA:** „Wenn dir **innerhalb einer
  Bösewicht-Aktion** Pflanzen-Terrain AUA zufügt, gilt dies als **durch
  Bösewicht-Aktion zugefügtes AUA**." `[NN S.15]` Engine-relevant: entscheidet,
  welche Schutzeffekte greifen. (`[FN S.8]` formuliert es verneinend — „DMG from an
  action, **not a terrain piece**" — gleiche Wirkung.)

#### Schlüsselwörter der Bösewichte

Jede Schlüsselwortgruppe wird **auf der Überfall-Karte** erklärt: „Um ein
Schlüsselwort auszuführen, befolgt die Anweisung genau wie auf [der]
Überfall-Karte … beschrieben" `[NN S.6]`.

| Bösewicht | Schlüsselwörter (dt.) | engl. `[FN S.4]` | Überfall-Karte |
|---|---|---|---|
| Fritze Fischkopp | Auswerfen, Anlocken, **Fluten** | cast, lure in, thrash | Fischer Fritze fischt |
| Arnold Schmatz | Schmoren, Mästen, Klinge wetzen | dunk, force-feed, sharpen cleaver | Hauptgericht |
| Rosa Voir & die WG | Schluchzen, **Flennen**, Donnerwetter | sulk, spritz, shock | WG-Terror |
| Viktor Visage | **Verkörpern** | embody | Maskenlos |

- **Fluten:** „Fritze ist ein Meeresbewohner … **Er kann sich daher nur auf Wasser
  bewegen** und platziert Wasser auf Feldern, um – langsam aber stetig – das ganze
  Schlachtfeld in **Flut-Terrain** zu verwandeln." `[NN S.6]`
  („Fluten" ≠ „thrash" — die Fassungen weichen in der Wortwahl ab, die Mechanik
  ist dieselbe.)
- **Flennen bei Wassermangel:** „Wenn bei **Flennen** nicht genug Wasser für alle
  von Flennen betroffenen Dörfler liegt, **entscheidet gemeinsam**, wer sich das
  Wasser nimmt. Wenn bei Flennen **kein** Wasser auf Rosas Bösewicht-Tableau liegt,
  **nimmt sich kein Dörfler Wasser**." `[NN S.15]`
- **Rosa gibt Wasser weiter:** „Rosa [wird] immer wieder versuchen, **Wasser, das
  auf ihr liegt, an euch abzugeben**." `[NN S.7]`

#### Köderstulle und weitere Einzelregeln

- **Die Köderstulle ist nie eine Figur** — harte Ausnahme zur Glossardefinition
  „Figur = Dörfler **und** Bösewichte" (§1.1, `[DE S.35]`): „**Wichtig: Wenn ein
  Effekt auf Figuren abzielt, zählt die Köderstulle (auch wenn ihr die
  Köderstulle-Figur nutzt) nie als Figur.**" `[NN S.6]`
- **Arnolds Verdauungspause:** „Bösewicht-Aktion **Verdauungspause**: Solange sie
  **offen vor dir** ausliegt, kosten dich Fähigkeiten / Angreifen / Interaktion
  etc., die eigentlich **0 MUMM** kostet **trotzdem 2 MUMM**." `[NN S.15]`
- **Dorf-Ereignis „Ausschlafen" im Endgegner-Kampf gegen Die weißen Herren:**
  „Liegt das Dorf-Ereignis **Ausschlafen** vor dem Sheriff, wenn Die weißen Herren
  euer Endgegner sind, **ignoriert dieser den Effekt von Ausschlafen**."
  `[NN S.15]`

#### Errata zu einer Bösewicht-Aktion

**`[FAQ S.2]`, Bösewicht-Aktion „Der perfekte Wurf" (Neue Nachbarn):** Beide
„Dann, Einholen"-Effekte gehören zum Zweig **„Runterschlucken:"**. Entscheidet
sich der Dörfler für **„Rausziehen:"**, **finden sie nicht statt**. Die Bewegung
am Ende der Karte findet in **beiden** Fällen statt. Die Karte liegt auch im
Errata-Pack bei.
`⚠️ OFFEN:` Zu welchem Bösewicht die Karte gehört, nennt die FAQ nicht; die
Schlüsselwörter der NN-Anleitung decken „Einholen" nicht ab (Fritzes drei sind
Auswerfen / Anlocken / Fluten).

### 10.5 Spielvariante „Invasion des Nachbardorfs"

`[NN S.15]` Optional: den Bösewicht-Pool thematisch auf **ein** Nachbardorf
begrenzen. „Legt dazu zum Beginn der Partie **nur** Bösewicht-Plättchen des
gewählten Dorfes (**natürlich verdeckt**) auf die Kampf-Plätze."
**„Verdeckt" gehört dazu** — lägen sie offen, wäre die Gegnerreihenfolge bekannt
und die Variante ein anderes Spiel.

- **Neblingen** (engl. Misty Bluff): Arnold Schmatz, Viktor Visage, Die weißen
  Herren, Fleckchen.
- **Sturzbrunn** (engl. Sprinkle Falls): Thea Kotta, Fritze Fischkopp,
  Dr. Bosskop, Rosa Voir & die WG.

Das erhöht auch die Chance, denselben Bösewicht dreimal zu besiegen und so Flüche
freizuschalten `[E01 38:43]`.

### 10.6 Spezialaufgaben-Tracker — die 16 freischaltbaren Karten

`[NN S.11]`. Die Erweiterung bringt **1 Faltschachtel mit freischaltbarer
Ausrüstung (16 Karten)** `[NN S.2]` mit — „schaut **unter den Einsatz der
Schachtel**!" `[NN S.8]`. Freigeschaltet wird über die **Spezialaufgabe** des
Endgegner-Kampfes (§8.3).

| Bösewicht | freischaltbare Ausrüstung |
|---|---|
| Fleckchen | Herr Hottehü, Herr Greifmann |
| Die weißen Herren | Rhombus, Pyramide |
| Thea Kotta | Kecke Hecke, Knospenkranz |
| Dr. Bosskop | Abgefüllte Jugend, Schweißband |
| Fritze Fischkopp | Angelhakenanzug, Flaschenpost |
| Rosa Voir & die WG | Starkstromkabel, Schleudersitz |
| Viktor Visage | Tintenkleckser, Alte Maske |
| Arnold Schmatz | Heureka-Pfännchen, Schmatz-Spieße |

**Zwei Paare sind alternative Startausrüstung statt Nachschub:** Karla Kühl →
Starkstromkabel + Schleudersitz `[NN S.9]`, Frieda Paletti → Tintenklekser +
Alte Maske `[NN S.10]`. Die übrigen werden „unter eure Tante Emma Ausrüstung"
gemischt `[NN S.11]`. *(Schreibweise: `[NN S.10]` „Tintenklekser", `[NN S.11]`
„Tintenkleckser" — die Anleitung ist selbst inkonsistent.)*

**In der Erstpartie ist keine davon verfügbar** — alle 16 setzen einen
abgeschlossenen Endgegner-Kampf mit erfüllter Spezialaufgabe voraus.

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
            Bösewicht-Fähigkeit zu KAMPF-BEGINN prüfen
      NN-Zusatzschritt nach 4: Überfall-Effekt vom Tableau (unter BEW/LEB) AUSFÜHREN
            → 1+ Überfall-Karte(n) aus dem Aktionsdeck, OFFEN neben das Zusatzbrett;
              deren eigene Aufbauschritte/Sonderregeln VOR dem ersten Zug abarbeiten
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
    6 Bösewichtmaterial in die Schachtel  (Trophäen/Notizbuch erst am PARTIEENDE!)
      NN: alles Wasser (auch von den Dörfler-Tableaus) zurück in den VORRAT;
          Glaube zurück in die Auslage; Kostüm-Fetzen zurück ins Tableau
      TT: eigene Aufstellbaren-Plättchen zurück zum Besitzer
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
2. **Wirkung des Fluchs der matschigen Haut.** **Name geklärt, Wirkung offen.**
   Der Name ist belegt — **„Fluch der matschigen Haut"** `[NN S.4]`, `[NN S.5]` —
   und er ist **Krummbiegels eigener**, keinem Bösewicht zugeordnet und der
   einzige, der zu Partiebeginn freigeschaltet ist. **Die Wirkung bleibt offen:**
   **keine** der vier Erweiterungsanleitungen druckt einen einzigen Fluchtext ab
   (`[NN S.14]` listet nur die 20 Namen, `[NN S.5]` nur die Schwierigkeitsstufen).
   Die Angabe in §10.3 stammt allein aus dem Video `[E01 36:16]` und bleibt
   `⚠️ UNSICHER` / `⚠️ NUR VIDEO`. Der Text steht auf der Fluchkarte, die nur als
   deutsche Druckdatei (`FN_Curse_Cards_FRONT_DE_RZ_klein.pdf`) vorliegt und nicht
   gelesen wurde.
   Hinweis zum Modellieren: der Fluch überschreibt den **Werte-Reset** aus
   Nachbereitungsschritt 5 (§7), nicht einen separaten Heilungsschritt (§6.6).
3. ~~**Formulierung „Randale"**~~ — **GEKLÄRT.** Der Kartenabschnitt heißt
   **„Krawall"** `[DE S.16]`; „Randale" kommt auf keiner der 36 Seiten vor.
   Überall ersetzt.
4. ~~**Sheriff-Niederlagebedingung**~~ — **GEKLÄRT.** Die Anleitung ist
   **unbedingt und ohne Zeitpunktangabe**: „Sobald der Sheriff besiegt wird,
   verliert ihr die Partie!" `[DE S.23]` — also **sofort**. Die abweichende
   Tableau-Formulierung („zu Beginn des Bösewicht-Zuges") ist **geprüft**: sie
   steht auf **drei** Tableaus — Handsy, Qing & Kween und **The Bundits**, das
   in Partie 11 am Tisch lag (`docs/partie11-bericht.md`, Abschnitt 3). Die
   Anleitung stützt sie nicht, die Tableaus drucken sie. **Handlungsempfehlung
   unverändert:** als „sofort" implementieren und nur dort abweichen, wo ein
   Tableau es ausdrücklich anders druckt (§8.2).
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
   **Die zwei Dörfler aus Neue Nachbarn sind eingegrenzt, nicht belegt:**
   `[NN S.4]` nennt **Frieda Paletti** und **Karla Kühl**, `[FN S.3]` **Judy
   Marks** und **Fridgette Jones** — welcher welche ist, sagt keine der beiden
   Quellen. *Fridgette → Kühl* liegt nahe, *Judy Marks → Frieda Paletti* folgt
   dann durch Ausschluss. `⚠️ ABGELEITET`
   Nebenbefund: die Anleitung schreibt den Bösewicht auf `[DE S.5]` **„WILLI
   WEDLER"**, auf `[DE S.33]` **„Willy Wedler"** — sie ist selbst inkonsistent,
   beide Schreibungen sind belegt.
7. ~~**Deutsche Namen von Deputy Waggums und Handsy** (Willi Wedler /
   Truthand) sind ebenfalls nur erschlossen~~ — **erledigt.** Belegt über den
   senkrechten Bösewichtnamen auf den Beutekarten, siehe §5.5 und
   `docs/befund-beute-und-aufstellbares.md` §2.4. Dort ebenfalls belegt:
   *Tartar Fishboy = Fritze Fisch**kopp*** und
   *The Door Knockers = Die wei**ß**en Herren* (so auch `[NN S.15]`, `[NN S.12]`).
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
   **Die 13 Terrainnamen von Neue Nachbarn sind jetzt belegt** `[NN S.16]`:
   Wäscheleine, Köderstulle, Rasenmäher, Lagerfeuerchen, **Doofsterglocke**,
   **Rangelblume**, Foodtruck, Günnis Kneipe, **Wehtuh-Fratzenfalle**,
   **Flut (3×)**, Matschpfütze, Die Wolken-Gang, Kochtopf. 13 Karten bei **15
   Plättchen** (Flut dreifach) — was `[NN S.2]` („13× Terrain-Karte", „20
   doppelseitige Terrain-Plättchen") erklärt. Die drei Pflanzen sind
   Theas Kinder und **Hindernis-Terrain** (§10.4).
   `⚠️ UNSICHER:` `[NN S.15]` nennt für Dr. Bosskop **„Gammliges Plumpsklo"**,
   für Die weißen Herren / Fleckchen / Viktor Visage **„Miefiges Plumpsklo"** —
   zwei verschiedene Terrains oder ein Setzfehler, mit den vorliegenden Quellen
   nicht entscheidbar.
   `[FAQ S.2]` stellt klar, dass **„Matschiger Graben" auf den Aktionskarten
   „Tragisches Froschkonzert" und „Milchiger Morast" falsch** ist („Es ist der
   **Trübe Fluss** gemeint") — das Terrain selbst bleibt gültig, es steht in
   Fritze Fischkopps Terrainliste `[NN S.15]`.
   **Weiter offen** bleiben die **Kartentexte** der 20 Basis- und 13
   NN-Terrainkarten (Kosten, Interaktionen, Effekte). Dafür müssen
   `terrain_deck_FRONT_DE_V10` und `FN_terrain_deck_FRONT_DE` ausgewertet werden.
9. **Heldentaten- und Dorf-Ereignis-Decks** wurden nicht erfasst. Die
   **Anzahlen** sind bestätigt (`[DE S.5]`: 75× Heldentat, 100× Dorf-Ereignis,
   +5 Ereignisse aus FN), die **Karteninhalte** nicht. Die Kartenanatomie steht
   in der Anleitung: Heldentat = Name / Auftrag / Heldenpunkte / Belohnung
   `[DE S.11]`. Die Druckdaten liegen in `Downloads\` vor und extrahieren sauber
   als Text.
10. ~~**Die Erweiterungen — §9 und §10 sind NICHT abgeglichen**~~ —
    **erledigt am 2026-10-14.** §9 ist gegen `[TT]` (12 S.), §10 gegen `[NN]`
    (16 S.) abgeglichen; Begründungen und Zitate in
    `docs/regelabgleich-erweiterungen.md`. Die deutschen Begriffe,
    „Beende deinen Zug", die Platzierungsbeschränkung bei Aufstellbaren, die
    „1× pro Kampf"-Zeitpunktregel (jetzt §6.3), die Fluchliste, die
    Trophäenwandordnung, die Wasserregeln und die bösewichtspezifischen
    Klarstellungen sind eingetragen. **Was aus diesem Durchgang offen bleibt:**
    - **Tante Emmas Notizbuch liegt weiter nicht vor.** `[TT S.8-9]` beschreibt
      nur die Struktur; belegt sind zwei Beutezugnamen („Nahes Holungsgebiet",
      „Die Saumagen-Festung ausrauben"), die übrigen nicht (§9.5).
    - **Keine Fluchtexte, keine Rollenkartentexte, keine Überfall-Kartentexte.**
      Von den 20 Rollen zeigt `[TT S.7]` zwei als Beispielgrafik (Rotzgöre,
      Tüftler), ohne Textlayer; die übrigen 18 sind absichtlich nicht abgedruckt
      („Ey, nix verraten!"). Keine der 9 Überfall-Karten und keine der 21
      Fluchkarten ist abgedruckt.
    - **Karla Kühls besondere Aufbauanweisung** steht nur auf ihrem Tableau
      `[NN S.4]` (§10.1).
    - **Die Nummern der 24 Aufstellbaren** (73–161) sind eigene Kartenauswertung,
      keine Heftangabe (§9.5).
    - **Die Zuordnung der FAQ-Errata „Der perfekte Wurf"** zu einem Bösewicht
      (§10.4).
    - **„Gammliges" vs. „Miefiges Plumpsklo"** (§13.8).
    - **Die 7 Terrains je Erweiterungs-Bösewicht** `[NN S.15]` sind
      **Szenariodaten** und gehören in `setups.scenario_data`, nicht hierher —
      das Gegenstück zu `[DE S.33]`, vollständig und direkt verwertbar. Eigener
      Auftrag.
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
