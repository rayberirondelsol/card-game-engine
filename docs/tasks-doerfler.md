# Aufgaben: Ausrüstungsplätze am Tableaurand, Dörfler tauschen (Spec M26)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M26**. Die Datengrundlage
steht in `docs/doerflerdaten.md` (erhoben am 2026-11-06). Vorgeschichte der
Plätze: `docs/tasks-ausruestung.md` (BH, M18), `docs/tasks-partie13.md`
(CB, M23.2 — dort steht die Zahl „60"), `docs/tasks-partie12.md` (BV, der
Vorrat). Vorgeschichte der Sperre: M9.3 (`require_zone`), M19.5
(`require_counter`).

**Aufgabenbuchstaben.** `BX`–`CB` in `tasks-partie13.md` und
`tasks-spielstand.md`, `CC`–`CE` in `tasks-partie14.md` **und** (anders belegt)
in `tasks-kleinkram.md`, das bis `CH` reicht. Hier geht es mit **`CI`** weiter —
die doppelt vergebenen Buchstaben `BX`–`CE` bleiben, wie sie sind; sie
umzunummerieren hieße, die Verweise in zwölf Dokumenten anzufassen.

**Reihenfolge.** `CI` (Plätze) und `CJ` (Zähler) zuerst, sie gehören zusammen.
`CK` (Daten) vor `CL`/`CM`: der Tausch liest sie. `CN` zuletzt.

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: **1288**, alle
grün). Bau: `cd client && npx vite build` — keine **neue** Warnung (zwei sind
vorbestehend). Der Client hat keine Testinfrastruktur (CLAUDE.md): reine
Rechnung gehört nach `shared/` oder `client/src/utils/` und wird aus
`server/test/` geprüft. Es gibt genau **eine** Stelle je Sache (M6).

Datenänderungen gegen Spiel `072123c0-cd97-4ffb-a330-369630fab93f`, Aufbau
*TFT Kurzpartie* `b1e10f4e-b8f2-4c2a-bb3e-54643944121b`, nach
`docs/datenzugriff.md`: nur die Spalte lesen und schreiben, die gebraucht wird
(`zone_data`, `sequence_data`, `action_data`, `scenario_data` — **nie**
`state_data`), erst Trockenlauf, dann `db.transaction`, dann Kontrollausgabe.

---

## Wo die Spec nicht stimmt

Acht Stellen. Die ersten vier ändern den Entwurf: 1 verlangt eine zusätzliche
Aufgabe (`CJ`), 2 bis 4 machen aus „Dörfler tauschen" mehr als „Material
ersetzen" (`CL`, `CM`).

### 1. M26.1: beide Zahlen stimmen — sie messen verschiedene Dinge

Die Spec: „M18 hat ‚neben dem Tableau sind nur 60 Punkte frei' gemessen … Eine
der beiden stimmt nicht."

**Beide stimmen, und die zweite stammt nicht aus M18.** Nachgerechnet am Code
und an den Messwerten aus M23.2:

| Größe | Wert | Quelle |
|---|---|---|
| Tableaus | Mitten 300 / 880 / 1460, je 300 breit | `place_asset`, Schritte 27/33/39 |
| Lücke zwischen zwei Tableaus | 730 − 450 = **280** (x 450 … 730) | Rechnung |
| Zählerkasten | `left: x − 70`, **170** breit (Bewegung/Mumm/Präzision), **185** (zweizeiliger Lebenszähler) | `GameTable.jsx` (`counter.x - 70`, `min-w-[140px]` + `p-3` + Tasten), `partie13-daten.mjs` (`COUNTER_SIZE`, am laufenden Tisch gemessen) |
| Zähler von Henlo | `x = 580` → Kasten **510 … 680** | `sequence_data`, Schritte 30–32 |
| Rest neben dem Tableau | links 450 … 510 = **60**, rechts 680 … 730 = **50** | Rechnung |

Die „60" sind der **Rest, den die Zählerspalte übrig lässt**, nicht die Lücke.
Sie stehen in `docs/tasks-partie13.md` (Aufgabe CB: der erste Entwurf zielte auf
den Streifen zwischen Tableau und Zählerspalte, „er ist nicht 130 Punkte breit,
sondern 60") und in `scripts/partie13-daten.mjs`. `docs/tasks-ausruestung.md`
(M18) misst **gar nichts neben dem Tableau** — es nennt 580 als Abstand der
Tableaus und verwirft „Slots auf das Tableau legen"; die Seiten hat damals
niemand angesehen.

**Folge.** Zwei Karten (2 × 100) passen in 280 mit 80 Punkten Luft — **wenn die
Zähler nicht dort stehen.** Die Zählerspalte ist 170 breit; 2 × 100 + 170 = 370
> 280. Beides gleichzeitig geht nicht, und weil ein Zähler ein Bedienelement ist
(er deckt Karten ab, statt unter ihnen zu liegen), müssen **die Zähler** weichen,
nicht die Plätze. Das ist `CJ`.

### 2. M26.2: die 50 × 50-Figur ist **nicht** ungenutzt

`docs/doerflerdaten.md` (Abschnitt 0 und 7) sagt: die runde Figur „wird in
**keinem** Aufbau benutzt". Das gilt für `sequence_data`; es gilt **nicht** für
`action_data`. Nachgesehen in der Kurzpartie:

- **„Kampf beginnen"**, Schritte 12–14: `place_asset` `Henlo Bulwark` /
  `Fridgette Jones` / `Granny Melba` auf die Rasterfelder `$D1`/`$D2`/`$D3`.
- **„Dorfphase beginnen"**, Schritte 12–14: `clear_table` derselben drei Namen.

Es gibt also zwei Figuren je Dörfler mit zwei Aufgaben: der **46 × 46-Spielstein**
(`Henlo`) liegt auf der *Buyin'/Beatin'-Leiste* und zeigt die Zugreihenfolge, die
**50 × 50-Figur** (`Henlo Bulwark`) steht im Kampf auf dem Spielfeld. Keine ist
ein Überbleibsel der anderen. Ein Tausch muss **beide** ersetzen. Die Figur liegt
nur im Kampf auf dem Feld, und im Kampf wird nicht getauscht (Entscheidung 3);
der Tausch räumt sie darum nur ab, falls eine von Hand liegen geblieben ist.

### 3. M26.2: der Aufbau nennt die Dörfler beim Namen — ein Tausch bräche „Dorfphase beginnen"

Die Spec sieht einen Tausch als Ersetzen von Material am Tisch. Aber:

- **28 Schritte** von „Dorfphase beginnen" (2, 12–14, 17–28, 34–45) und **3** von
  „Kampf beginnen" (12–14) tragen `Henlo`, `Fridgette`, `Granny` als Text — die
  Zähler (`set_counter` „Henlo: Leben" `max`), die Figuren, die Wache über die
  drei Lebenszähler und die zwölf Marker mit ihrem Startwert als `slot`
  (3 / 5 / 2 / −1 …).
- Nach einem Tausch gegen Judy hält „Dorfphase beginnen" **schon an der Wache
  (Schritt 2)**: sie fragt nach „Henlo: Leben", den es nicht mehr gibt
  (`no counter named "Henlo: Leben"`, eine Bedingung, die sich nicht prüfen lässt,
  gilt nicht als erfüllt). Die Aktion tut **nichts** — kein Abräumen, keine neue
  Dorfphase —, und die Meldung nennt einen Zähler, nach dem der Spieler nie
  gefragt hat. Ohne die Wache wäre es schlimmer und leiser: die Zähler-Schritte
  würden übersprungen (`executeSequence` wirft nie), und die zwölf Marker sprängen
  auf **Henlos** Startwerte zurück (3 / 5 / 2 / −1), obwohl Judy sitzt. Beides ist
  als Test festgehalten (`server/test/villagers.test.js`).

Die Aktionen gehören zum Aufbau, nicht zum Spielstand (M22: „der Aufbau bleibt
die eine Quelle"). Sie lassen sich also nicht beim Tausch umschreiben. Sie
müssen den Dörfler **nach seinem Platz** benennen, nicht nach seinem Namen —
`CL`.

### 4. M26.2/M22: die Zonen hängen an der Asset-Id des Tableaus

`resolveZones` findet den Anker über `zone.anchor.assetId`. **36 Zonen**
(Leisten, Ausrüstungsplätze, Vorrat, Heldentaten, Ausliegend) hängen an den drei
Tableau-Assets `98e26309…`, `d4691079…`, `bad13f49…`. Ein getauschtes Tableau
(Judy: `b4d3265f…`) hat eine **andere Id** — alle Zonen des Platzes würden
`anchorMissing` und blieben an der Stelle ihrer letzten Auflösung. Das fällt
nicht auf, solange das Tableau an derselben Stelle liegt, und es fällt sofort
auf, sobald jemand es verschiebt.

Die Spec erwähnt es nicht. Lösung: das Tableau merkt sich, **welcher Platz** es
ist (`anchorId`, eine Zeile in `assetBox`), und die Zonen finden es weiter. Das
Feld muss durch `getGameState`/`loadGameState` (zwei Feldlisten in
`GameTable.jsx`), sonst überlebt der Tausch kein Speichern — Abnahme 5.

### 5. M26.1: „paarweise auf gleicher Höhe" stimmt für zwei der drei Paare

Aus dem Auftrag: links liegt der dritte Pfeil bei **0,844**, rechts bei
**0,826** — 7 Weltpunkte Unterschied, gemessen und bei allen neun gleich. Jeder
Platz bekommt **seine** Höhe; geglättet wird nichts.

Das hat eine zweite Folge, die die Spec nicht nennt: die Pfeilabstände sind
**eng** (0,337 · 0,353 links, 0,337 · 0,335 rechts, mal 400 = 134,8 · 141,2 ·
134,8 · **134,0** Punkte). Eine Karte ist 140 hoch. Zonen in Kartenhöhe
überlappten einander (Abnahme 1). Siehe `CI`, Höhe der Zone.

### 6. M26.2: „Startausrüstung = zwei Karten" gilt für sieben von neun

Aus `doerflerdaten.md` und dem Auftrag: Blopsy hat **drei** Stücke, Judy zwei
**plus drei Gemälde ohne Slot**. Die Daten tragen darum eine **Liste** mit
Slot, und „ohne Slot" ist ein gültiger Wert (Ziel: der Vorrat — dort liegt, was
ein Dörfler besitzt, aber nicht trägt; der Tableau-Kasten sagt „set them
nearby").

### 7. M26.2: „Die Spaltenenden geben das Maximum" gilt nur für drei von vier

Aus `doerflerdaten.md` Abschnitt 8.3: `max` am Lebenszähler ist der
**Startwert** (Regel „Maximales LEBEN"), nicht das Spaltenende 10. Bewegung,
Mumm und Präzision tragen **kein** `max`, nur `base`. Die Spaltenenden
(10 / 10 / 10 / 5, Minimum 1 / 1 / 1 / −4) stehen **nicht** in den Daten — sie
gelten für alle neun und sind nur ein Gültigkeitsbereich für den Test.

### 8. M26.2: Abnahme 5 meint einen Spielstand, nicht einen Aufbau

„Ein **Aufbau**, der danach gespeichert und neu geladen wird" — der Aufbau
ändert sich durch einen Tausch am Tisch nicht (M22). Gemeint ist ein
**Spielstand**. Die Abnahme wird so geprüft.

---

## Entscheidungen

Der Auftrag lässt drei offen; hier die Antworten.

**1. Der Streifen unter den Tableaus.** Die sechs Plätze gehen **weg** vom
Streifen. Dort bleiben **Vorrat** (`Ausrüstung Dörfler N`, 580 × 140, ein Stapel
ohne Obergrenze, M21.4) und die zwei **Ablagen** (`Erfüllte Heldentaten`,
`Ausliegend`, M23.2). Beide brauchen ihn weiter: der Vorrat ist Besitz, der nicht
getragen wird (und er nimmt Judys drei Gemälde auf), die Ablagen sind Stapel ohne
Obergrenze, die an **keinem** Tableaurand einen Aufdruck haben. Die zwei
freigewordenen Reihen (y 1808 … 2110) nehmen dafür die **Zähler**, die aus der
Lücke weichen müssen (`CJ`). Vorrat und Ablagen werden **nicht** nachgerückt: das
wären neun Zonen in Bewegung und eine neue Messung der gespeicherten Ansicht
„Dörfler" für eine Lücke von einer Reihe.

**2. Wie der Tausch ausgelöst wird: Kontextmenü am Tableau.** Verworfen:

- *Aufbau-Aktion „Dörfler tauschen"*: eine Aktion hat keine Parameter; „wer gegen
  wen" wären 3 Plätze × 6 Kandidaten = 18 Knöpfe oder ein Auswahlfeld, das es im
  Aktionsvokabular nicht gibt.
- *Schrittwort allein*: ein Schritt ist Daten, kein Bedienelement; wer tauscht,
  steht am Tisch und sieht das Tableau.
- *Schaltfläche in der Kopfleiste*: dort stehen Aktionen des Aufbaus; ein Tausch
  gehört **zu einem Tableau**.

**Gebaut:** das Schrittwort `swap_villager { seat, villager }` (Ausführung, eine
Stelle) **und** ein Kontextmenü-Eintrag am Tableau, der denselben Weg geht wie die
Aufbau-Aktionen (`runSetupAction` mit einer Aktion aus drei Schritten: Wache über
den Kampf, Wache über erspielte Werte, Tausch). Das Menü schreibt die Schritte, es
rechnet nichts — dasselbe Muster wie `revealPlan` (M8.9). Das Schrittwort steht im
Editor (`sequenceSteps.js`), damit ein Aufbau einen Dörfler auch fest vorgeben
kann.

**3. Die Sperre mitten in der Partie: zweistufig.**

- **Läuft ein Kampf** (`Bösewicht-Tableau` belegt): **gesperrt**, wie bei
  `require_zone`. Der Tausch hätte nichts, worauf er sich bezieht — Feld, Figur und
  Zugreihenfolge gehören zum Kampf —, und es gibt keine Antwort, die ein
  „Trotzdem" sinnvoll machte.
- **Hat der Dörfler schon gespielt** (ein Zähler steht nicht mehr auf seinem
  Startwert): **gewarnt**, mit Rückfrage („Trotzdem"), wie bei `require_counter`
  mit `confirm`. Ein Tausch in Runde 3 löscht erspielte Werte; das ist selten
  gewollt, aber der Tisch **kann es nicht wissen**: wer versehentlich Henlo statt
  Judy gewählt hat und in Runde 3 korrigieren will, soll es können, **nachdem** er
  gelesen hat, was verloren geht. Eine harte Sperre wäre eine Regel des Spiels, und
  der Tisch spielt nicht (§1).
- „Hat gespielt" ist ein **Zählerbefund**, kein Spielzustand: der Tisch kennt keine
  „erste Runde" (M19.5: „Den Zustand ‚besiegt' gibt es am Tisch nicht"). Darum
  kein Rundenzähler, sondern `require_counter` mit einer neuen Lesart `atStart`:
  jeder genannte Zähler steht auf seinem Ausgangswert (`base`, sonst `max`).

**Bekannte Grenze der zweiten Stufe:** gekaufte Ausrüstung, erfüllte Heldentaten
und Münzen sind kein Zählerstand dieses Dörflers und lösen die Warnung nicht aus.
Beim Tausch gehen nur die **Startausrüstung des alten Dörflers** (sie ist in den
Daten benannt) und seine Zähler weg; alles, was er dazugekauft hat, bleibt im
Vorrat liegen — es gehört nicht zur Startausrüstung, und der Tisch würde raten,
wem es danach gehört.

---

## CI — Die sechs Plätze stehen am Rand des Tableaus (M26.1)

**Befund.** `scripts/equipment-zones.mjs` legt fünf Zonen je Dörfler **unter** das
Tableau (`Kopf`/`Brust`/`Beine`, `Hände` mit zwei Plätzen, `Mitbringsel`). Das
Tableau trägt die Plätze aber **an den Längsseiten**, mit Pfeilen nach außen
(`doerflerdaten.md` 6). Die Höhen sind gemessen: 0,154 / 0,491 / 0,844 links,
0,154 / 0,491 / 0,826 rechts, bei allen neun gleich.

**Höhe der Zone.** Die Pfeilabstände sind 134,0 … 141,2 Punkte (Wo die Spec nicht
stimmt, 5). Ein Schild braucht 21 Punkte über der Zone (`ZONE_LABEL_HEIGHT`),
sonst setzt `zoneLabelAbove` es auf die Nachbarzone (M16.1). Also: **Zonenhöhe
112** (134,0 − 21 = 113 Obergrenze, ein Punkt Reserve), Mitte **auf dem Pfeil**.
Die Karte (140) ragt oben und unten je 14 Punkte über die Zone hinaus und
überdeckt ihre Nachbarkarte um 5 Punkte — das ist die Geometrie des Tableaus, nicht
der Zone. Die Zone ist der Fangkasten, die Karte wird auf ihre Mitte gesetzt
(`snap`).

**Breite.** 120 (`ZONE_LABEL_WIDTH`), unmittelbar **am Tableaurand**: links
`relX −0,4`, rechts `relX 1,0`, `relWidth 0,4`. Zwischen den Zonen zweier Nachbarn
bleiben 40 Punkte (450 … 570 und 610 … 730).

**Änderung (`zone_data`).**

- `equipmentZones()` liefert **21** statt 18: je Dörfler `Kopf`, `Brust`, `Beine`
  links, `Linke Hand`, `Rechte Hand`, `Mitbringsel` rechts, je `capacity: 1`,
  `layout: "row"`, `accepts: ["card"]`, `snap: true`, grün; die drei Vorräte
  unverändert. `Hände` fällt weg (Ids `zhaende1…3`).
- **Linke und Rechte Hand sind getrennte Zonen** — die Entscheidung aus M18 ist
  aufgehoben, mit dem Beleg: das Tableau führt sie getrennt, auf verschiedenen
  Höhen.
- Eine **Zweihandwaffe** liegt in `Rechte Hand`; dass sie auch die linke belegt,
  steht auf der Karte, **nicht** am Tisch. Bei zwei getrennten Zonen zu je einem
  Platz zeigt der Tisch es nicht, und er zeigte es auch bei `Hände` mit zwei
  Plätzen nicht (eine Karte, ein Platz belegt). Keine Regression, kein Gewinn.
  Einhandwaffen: die erste in `Rechte Hand`, die zweite in `Linke Hand`.
- `partie13-daten.mjs` (`CARD_SLOTS`) und `partie13-daten.test.js` ziehen mit: die
  Ziele der sechs Karten sind seit `CK` aus den Dörferdaten **abgeleitet**, nicht
  ein zweites Mal geschrieben.

**Abnahme.**
1. Jeder Dörfler hat sechs Zonen auf den Höhen seiner Aufdrucke, drei links, drei
   rechts; keine überlappt eine andere, ein Nachbartableau oder eine der übrigen
   Zonen (`server/test/equipment-zones.test.js`, neu geschrieben).
2. `Linke Hand` und `Rechte Hand` sind getrennt, je ein Platz.
3. Jede Zone liegt **außerhalb** der Tableau-Kanten und innerhalb des 580-Punkte-
   Feldes ihres Dörflers; jedes Schild hat oben Platz (`zoneLabelAbove === true`).
4. Die Zonen links von Dörfler 1 und rechts von Dörfler 3 liegen auf freier Fläche
   (kein Brett, kein Feld, keine Zone, kein Zähler).
5. Bei Spielzoom (um 40 %) ist am laufenden Tisch zu sehen, welche Karte zu
   welchem Aufdruck gehört (Sichtprüfung).

## CJ — Die Zähler weichen aus der Lücke (M26.1, Folge)

**Befund.** Die Zähler `Bewegung`/`Mumm`/`Präzision` stehen in der Lücke zwischen
zwei Tableaus (x 510 … 680, y 1480 … 1750) — genau dort, wo jetzt die rechten
Plätze des einen und die linken des anderen liegen (Wo die Spec nicht stimmt, 1).
Ein Zähler deckt die Karte darunter ab; der Platz wäre da und unbrauchbar.

**Änderung (`sequence_data`, neun `place_counter`; dazu vier `place_card`, siehe CI).** Die drei Zähler je Dörfler
rücken in die **erste freigewordene Reihe unter dem Tableau**, nebeneinander:
Kasten 185 breit (der breiteste), Abstand 195, Oberkante 1830. `x = Tableaumitte
− 80 + 195·i`, `y = 1870`:

| | Bewegung | Mumm | Präzision |
|---|---|---|---|
| Dörfler 1 (Mitte 300) | 220 | 415 | 610 |
| Dörfler 2 (Mitte 880) | 800 | 995 | 1190 |
| Dörfler 3 (Mitte 1460) | 1380 | 1575 | 1770 |

Die Lebenszähler (y −110, M23.5) bleiben. Zahlen und Kästen stehen **einmal** in
`scripts/doerfler-daten.mjs` (`COUNTER_ROW`), und der Tausch setzt neue Zähler
**auf die Stelle der alten** — er kennt keine eigene Koordinate.

**Abnahme.** Kein Zählerkasten überlappt eine Zone, ein Tableau oder einen anderen
Zähler (Test gegen alle Zonen und die Tableaukästen); alle neun liegen im Fenster
der gespeicherten Ansicht „Dörfler" (Mitte 1149,5 / 1675, Zoom 0,41,
932 × 738).

**Was das für gespeicherte Stände heißt.** Zonen und Zählerstellen sind
**Gerüst**, Karten und Zähler eines Spielstands sind **Stand** (M22). Ein alter
Spielstand (`Partie 14 …`) lädt die neuen Zonen, aber seine Karten und Zähler
liegen, wo sie lagen — die Ausrüstung außerhalb jeder Zone, die Zähler über den
neuen Plätzen. Das ist kein Fehler dieser Änderung, aber es ist **sichtbar**, und
es wird im Bericht gesagt. Die benannten Stände werden nicht angefasst.

## CK — Die Daten der neun Dörfler (M26.2)

**Befund.** Es gibt keine Stelle, an der „wer ist Henlo" steht. Startwerte,
Ausrüstung und Namen stecken verstreut in 40 Schritten der Kurzpartie
(`sequence_data` 24–50, 54–65) und in 31 Schritten der Aktionen.

**Änderung (`scenario_data.villagers`).** Neben `bosses` (M7) steht ein Abschnitt
`villagers`, geschrieben aus `scripts/doerfler-daten.mjs` (**eine** Quelle; das
Skript schreibt, der Test liest dieselbe Datei):

```
villagers: {
  fightZone: "Bösewicht-Tableau",
  seats: [ { anchor: "Tableau: Henlo Bulwark", zones: "Dörfler 1",
             markers: "Marker 1", vorrat: "Ausrüstung Dörfler 1" }, … ],
  roster: { "Henlo Bulwark": {
      short: "Henlo",
      start: { Leben: 3, Bewegung: 5, Mumm: 2, Präzision: -1 },
      gear: [ { card: "BAUERNLATZHOSE", slot: "Beine" },
              { card: "ROSTIGE SICHEL", slot: "Rechte Hand" } ] }, … }
}
```

- `start.Leben` ist **zugleich `max`** des Lebenszählers; die drei anderen sind
  `base`. Keine Spaltenenden in den Daten (Wo die Spec nicht stimmt, 7).
- Zähler heißen `<short>: <Wert>` (`Henlo: Präzision`), Marker `Marker <n>: <Wert>`
  nach dem **Platz**, Zonen `Dörfler <n>: <Wert>`.
- `gear[].slot` ist einer der sechs Plätze oder **fehlt** (Judys Gemälde → Vorrat).
- **Georgie Irongut trägt `unverified`** mit dem Satz aus `doerflerdaten.md` 5.5
  (Foto-Tableau, keine Gegenprobe, „einmal am gedruckten Tableau prüfen"). Der
  Tausch **meldet ihn** als Hinweis (`note`), er hält nicht an: die Werte sind
  übernommen, nur als ungeprüft markiert.
- Eingetragen werden **alle neun**; jeder von ihnen kann in der Kurzpartie sitzen.

**Prüfung** (`validateVillagers` in `shared/villagers.js`, wie
`validateScenarioData`; gegen die echte Assetliste und Kartenbibliothek): jedes
Tableau, jeder Spielstein, jede Figur, jeder Marker und jede Karte **gibt es** und
ist eindeutig; kein Startwert liegt außerhalb der Spalte (1…10, Präzision −4…5);
keine Karte gehört zwei Dörflern; die drei Startdörfler der Kurzpartie stimmen
**Zeichen für Zeichen** mit den Schritten 24–50 und 54–65 überein (die Gegenprobe
aus `doerflerdaten.md` 4, jetzt als Test).

**Abnahme.** `server/test/doerfler-daten.test.js`: alle Prüfungen grün gegen die
Bibliothek aus der Datenbank (als Fixture-Auszug, nicht aus dem Netz).

## CL — Der Aufbau nennt keinen Dörfler mehr beim Namen (M26.2, Wo die Spec nicht stimmt 3)

**Befund.** 31 Schritte der Aktionen tragen Dörflernamen und Startwerte.

**Änderung.**

1. **Executor:** vor jedem Lauf bindet `executeSequenceWithLog` die **Dörfler am
   Tisch** an Platzhalter, aus dem Zustand, nicht aus einem Gedächtnis: für Platz
   *n* `$V<n>` = Kurzname (`Henlo`), `$F<n>` = voller Name (`Henlo Bulwark`),
   `$V<n>LEB` / `BEW` / `MUM` / `PRZ` = Startwerte. Gebunden wird aus dem
   Tableau-Token am Platz (`label`; `anchorId`/`assetId` gegen `seats[n].anchor`).
   **Getrennt von `ctx.vars`**: `reveal_next` setzt `ctx.vars = {}` zurück (Zeile
   1286) und löschte die Dörfler mitten im Lauf von „Kampf beginnen".
2. **Daten (`action_data`):** „Kampf beginnen" 12–14 und „Dorfphase beginnen" 2,
   12–14, 17–28, 34–45 schreiben `$F1`, `$V1: Leben`, `slot: "$V1LEB"` usw. statt
   der Namen. Das ist eine Umschreibung von 31 Schritten **ohne** neuen Schritt.
3. **Nicht angefasst:** die **Aufbausequenz** (`sequence_data`). Sie stellt die
   drei Startdörfler hin, **bevor** es ein Tableau gibt, aus dem sich binden ließe;
   dass ihre Namen mit `roster` übereinstimmen, prüft der Test (CK).

**Abnahme.**
- Ohne Tausch läuft jede der beiden Aktionen **Wort für Wort** wie vorher (gleicher
  Endzustand, gleiches Protokoll) — als Vergleichstest gegen die Aktionen vor der
  Umschreibung.
- Nach einem Tausch trifft dieselbe Aktion die Zähler, Marker und Figuren des
  **neuen** Dörflers.
- Ein Platz ohne Tableau lässt seine Platzhalter ungebunden; die Schritte werden
  übersprungen und **sagen es** („$V3 is not bound"), statt Henlo zu raten.

## CM — Der Tausch: `swap_villager`, `anchorId`, `require_counter … atStart` (M26.2)

**Änderung (Executor, eine Stelle).**

`swap_villager { seat, villager }` — **alles oder nichts**: der Schritt arbeitet
auf einer Kopie des Zustands und gibt sie nur zurück, wenn jedes Teilstück
gelungen ist (wie `build_scenario`: ein halb getauschter Dörfler ist schlimmer als
keiner). Dann:

1. **Weg** (alles, was am alten Dörfler hängt): sein Tableau, sein Spielstein,
   seine Figur, seine vier Zähler, die Karten seiner Startausrüstung (nach
   `cardId`, wo auch immer sie liegen).
2. **Hin**, durch **dieselben Handler**, die ein Aufbau benutzt — es steht keine
   zweite Lesart des Legens daneben (M6): `place_asset` (Tableau **auf die Stelle
   des alten**, danach `anchorId` und `locked` vom alten; Spielstein auf die Stelle
   des alten; die vier Marker über `slot` auf den Startwert), `place_counter` (vier
   Zähler auf die Stellen der alten, `max` nur bei Leben, sonst `base`),
   `place_card` (je Stück in seinen Slot, ohne Slot in den Vorrat).
3. Danach bindet er die Platzhalter neu (CL).

Ist der neue Dörfler schon an einem anderen Platz, wird **abgewiesen** (zwei Henlos
gibt es nicht). Ist er schon an *diesem* Platz: nichts zu tun.

`require_counter` bekommt `atStart: true`: jeder genannte Zähler steht auf seinem
Ausgangswert (`base`, sonst `max`); sonst hält die Folge an, mit `confirm` als
Rückfrage. Keine zweite Wache.

`assetBox` liest `obj.anchorId || obj.assetId` (Wo die Spec nicht stimmt, 4). Ein
Tableau ohne `anchorId` verhält sich wie bisher.

**Abnahme.** `server/test/villagers.test.js`:
1. Nach `swap_villager` stehen Tableau, Spielstein und Startausrüstung des neuen
   Dörflers an den Plätzen des alten; die Karten liegen in ihren Slots, Judys
   Gemälde im Vorrat, Blopsys drei Stücke in drei Plätzen.
2. Seine vier Zähler heißen nach ihm und tragen Startwert (`max` nur bei Leben).
3. Die Marker stehen auf den Startwerten (`slot`).
4. Vom alten ist **nichts** übrig: kein Zähler, keine Karte, keine Figur, kein
   Spielstein, kein Tableau.
5. Die Zonen des Platzes lösen sich gegen das **neue** Tableau auf (`anchorMissing`
   bleibt aus) — auch nach `JSON.parse(JSON.stringify(state))`.
6. Ein gescheiterter Tausch (unbekannter Dörfler, fehlendes Asset) lässt den
   Zustand **Zeichen für Zeichen** unverändert.
7. Vorrat: gekaufte Ausrüstung bleibt liegen, die Startausrüstung geht.
8. Wache: bei belegtem `Bösewicht-Tableau` hält die Folge an; bei veränderten
   Zählern fragt sie; bei unveränderten läuft sie durch.
9. Georgie meldet seinen Hinweis, tauscht aber.

## CN — Der Griff am Tisch, das Vokabular, die Persistenz (M26.2)

**Änderung (Client).**

- `client/src/utils/swapVillager.js` (rein, aus `server/test/` geprüft):
  `swapChoices(villagers, tokens)` — wer am Tisch sitzt und wer zur Wahl steht (die
  sechs, die **nicht** sitzen); `swapAction(villagers, token, name)` — die Aktion
  mit ihren drei Schritten.
- Kontextmenü am Tableau-Token: je ein Eintrag „Swap villager → <Name>", nur wo
  `scenarioData.villagers` das Tableau kennt. Er ruft `runSetupAction` — dieselbe
  Maschinerie wie die Kopfleisten-Aktionen, mit **derselben** Rückfrage
  („Trotzdem", M19.5) und derselben Meldeleiste.
- `GameTable.jsx`: `anchorId` in beide Token-Feldlisten (Speichern/Laden).
- `sequenceSteps.js` + `SetupSequenceEditor.jsx`: `swap_villager` (Felder `seat`,
  `villager`, Validierung, Zeile, Vorgabe) und `atStart` an `require_counter`.

**Abnahme.**
1. `server/test/sequence-steps.test.js` kennt das neue Schrittwort in allen vier
   Schichten (Typliste, Felder, Zeile, Validierung).
2. Ein Spielstand, der nach einem Tausch gespeichert und neu geladen wird, zeigt
   den neuen Dörfler samt Zonen (Sichtprüfung, eigener Stand mit eigenem Namen).
3. **Sichtprüfung:** ein Dörfler wird am laufenden Tisch wirklich getauscht, bei
   Spielzoom um 40 %.

---

## Was hier nicht gebaut wird

- **Hookbox-Dörfler.** Ihre Tableaus stehen nicht in der Bibliothek
  (`doerflerdaten.md`, Ende).
- **Marker auf den aufgedruckten Kreisen je Tableau.** Es gibt **drei** Lagen der
  Wertespalten (`doerflerdaten.md` 6.3: „Wellenlinie" / gerade / Foto), die
  Leistenzonen sind je **Platz** gemessen — Plätze 1 und 3 wellig, 2 gerade. Ein
  Tausch über die Lagen hinweg (Henlo → Judy) legt den Marker bis zu **8
  Weltpunkte** neben den aufgedruckten Kreis (0,4 Zeilen von 20,6). Der Zähler
  daneben ist genau; der Marker ist Anzeige. Eine Messung je Tableau gehört in eine
  eigene Aufgabe, und sie ändert die Leistenzonen, nicht den Tausch.
- **Tausch im Raum.** Der Raum führt `sequence_data` aus (`POST
  /api/rooms/:code/start`), nicht Aktionen. Der Schritt läuft dort, wenn ihn ein
  Aufbau enthält; das Menü gibt es im Raum nicht.
- **Tausch im Aufbau *TFT Grundaufbau (Dorfphase)*.** Er hat keine
  Ausrüstungszonen und keine Dörferdaten.
- **Spielregeln.** Der Tisch entscheidet nicht, **wer** getauscht wird (§1).

---

## Stand nachher (2026-11-06)

**Tests:** 1288 → **1362**, alle grün (`cd server && npm test`). Neu: `doerfler-daten`
(19), `villagers` (36), `swap-villager` (8), `sequence-villager-steps` (8),
`equipment-zones` neu geschrieben (13, vorher 10). Bau: `cd client && npx vite build`,
dieselben zwei Warnungen wie vorher (doppeltes `data-testid`, Chunkgröße).

**Daten:** *TFT Kurzpartie* — `zone_data` 51 → 54 (18 Plätze, `Hände` weg, 33 Zonen
unberührt), `sequence_data` 13 Schritte (vier Karten, neun Zähler), `action_data` 31
Schritte, `scenario_data` + `villagers`. `state_data`, `grid_data` und alle
benannten Spielstände unverändert (Prüfsumme vor/nach gleich). Ein zweiter Lauf
des Skripts findet nichts mehr zu tun.

**Rauchtest in der Produktion** (nur lesend, mit dem ausgelieferten Executor und den
geschriebenen Daten): Aufbau 65 Schritte ohne Beanstandung → Tausch Platz 1 gegen
Judy und Platz 3 gegen Blopsy → *Kampf beginnen* stellt `Judy Marks`, `Fridgette
Jones`, `Blopsy Twins` auf K11/M11/H12 → *Dorfphase beginnen* setzt alle zwölf
Zähler zurück und räumt die Figuren ab.

**Sichtprüfung:** der Browser-Bereich war an `gaming.benjathi.de` **nicht angemeldet**
(leeres `localStorage`, Anmeldeseite); ein Passwort trägt der Agent nicht ein. Geprüft
wurde stattdessen eine **lokale Probeinstanz** (eigene Ports, eigene Datenbank aus
einem Auszug der Produktion, Testkonto, Bilder aus der Produktion), mit denselben
Daten und demselben Client, bei Fenster 932 × 742:

- Bei Spielzoom 41 % (Ansicht „Dörfler") stehen die Karten neben den Pfeilen ihres
  Aufdrucks; die gedruckten Beschriftungen sind dort nicht lesbar (3–4 Bildpunkte),
  die Zuordnung trägt die **Lage**, nicht der Text. Bei 82 % liegt jede Karte
  neben `Head Gear` / `Chest Gear` / `Leg Gear` bzw. `Left Hand` / `Right Hand` /
  `Accessory`.
- Echter Tausch am Tableau: Henlo → Norman (Platz 1), Fridgette → Judy (Platz 2).
  Zähler heißen um (`Norman: Mumm`, `Judy: Präzision 1`), die Fischmütze liegt in
  `Kopf`, Judys drei Gemälde im Vorrat, die Marker auf den Startwerten.
- Rückfrage: nach einem Klick auf einen Zähler fragt der Tausch („hat schon
  gespielt"); *Abbrechen* ändert nichts.
- Spielstand mit eigenem Namen gespeichert, Seite neu geladen, Stand geöffnet: die
  getauschten Dörfler, ihre Zonen und `anchorId` sind da; *Kampf beginnen* und
  *Dorfphase beginnen* laufen danach auf den **neuen** Dörflern.
- **Offen:** am laufenden Tisch der Produktion ist das Menü nicht angeschaut worden.
  Die sechs Einträge machen das Kontextmenü bei 742 Pixeln Höhe so hoch wie das
  Fenster (es scrollt, `menuPlacement` klemmt es). Brauchbar, nicht schön — ein
  Untermenü wäre die nächste Stufe.
