# Aufgaben: „Angelegt" und „weggepackt" (Spec M18)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M18**. Der Beleg steht in
`docs/partie9-bericht.md` (L1), die Regellage in `docs/tft-regeln.md`
(„Ausrüstungs-Slots", „Was gilt als weggepackt"). Die Vorgeschichte der
Datenänderungen an diesem Aufbau steht in `docs/tasks-partie7.md` (AS1–AS3),
die der Zonen in `docs/tasks-zonen.md` (AW–AY).

**Aufgabenbuchstaben.** `AA`–`AE` in `docs/tasks-partie5.md`, `AF`–`AN` in
`docs/tasks-partie6.md`, `AP`–`AV` in `docs/tasks-partie7.md`, `AW`–`AY` in
`docs/tasks-zonen.md`, `AZ`–`BB` in `docs/tasks-ansichten.md`, `BC`–`BG` in
`docs/tasks-partie9.md`. Hier geht es mit `BH` weiter.

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: **1143**, alle
grün). Bau: `cd client && npx vite build` — keine **neue** Warnung (zwei sind
vorbestehend). Der Client hat keine Testinfrastruktur (CLAUDE.md): reine
Rechnung gehört nach `shared/` oder in ein Skript und wird aus `server/test/`
geprüft. Es gibt genau eine Stelle je Sache (M6).

---

## Wo die Spec nicht stimmt

Sieben Stellen. Zwei davon sind Messfehler, auf denen der ganze Entwurf
aufsetzt (1 und 2); eine macht eine Abnahme unprüfbar, wie sie dasteht (5);
eine ist schon heute erfüllt und braucht keine Zeile Code (6).

### 1. Die Ausrüstungszone stößt **nicht** an das `Bösewicht-Tableau`

Die Spec und der Auftrag: „stößt genau an die Nachbarzone (Grannys endet bei
1890, `Bösewicht-Tableau` beginnt bei 1900)".

**Nachgemessen** (Aufbau `b1e10f4e-…`, Tableaus 300 × 400 bei x = 300/880/1460,
y = 1600):

| Zone | Kasten (Welt) |
|---|---|
| `Ausrüstung Dörfler 1` | x 150 … 730, **y 1808 … 2088** |
| `Ausrüstung Dörfler 2` | x 730 … 1310, y 1808 … 2088 |
| `Ausrüstung Dörfler 3` | x 1310 … **1890**, y 1808 … 2088 |
| `Bösewicht-Tableau` | x **1900** … 2200, **y 200 … 800** |

Die x-Zahlen stimmen, die Zonen haben aber **keinen gemeinsamen y-Bereich** —
sie liegen 1008 Punkte auseinander und könnten sich gar nicht berühren. Die
Breite von 580 ist trotzdem eine harte Grenze, nur aus einem anderen Grund:
es ist der **Abstand der drei Tableaus von Mitte zu Mitte**, und die
Nachbarzone, an die Dörfler 1 stößt, ist `Ausrüstung Dörfler 2`. Die Grenze
gilt, die Begründung nicht.

Nebenbefund: die Maße **580 × 280** sind richtig (DOM bei Zoom 0,66: 383 × 185
Bildschirmpunkte).

### 2. Nach unten ist Platz — 240 Weltpunkte, nicht null

Die Spec: „Nach unten ist kein Platz — die Ausrüstungsreihen lagen schon einmal
unterhalb des Fensterrandes (Partie 9, N6)."

N6 ist ein Befund aus **Partie 7**, und er ist seit `BB`
(`docs/tasks-ansichten.md`) behoben: der Aufbau bringt eine gespeicherte
Ansicht **„Dörfler"** mit, Mitte (1149,5 | 1675), Zoom 0,41. Bei Fenster
932 × 738 folgt daraus:

| Marke | Welt-y |
|---|---|
| oberer Fensterrand | 775 |
| heutige Unterkante der Ausrüstungszone | 2088 |
| **Oberkante der Werkzeugleiste** (Bildschirm y 637) | **2329** |
| unterer Fensterrand | 2575 |

Zwischen der heutigen Unterkante und der Werkzeugleiste liegen **240 freie
Weltpunkte** — 1,7 Kartenhöhen. Das ist kein Freibrief (zwei volle Kartenreihen
à 140 passen nicht), aber „kein Platz" ist falsch, und der ganze Entwurf hängt
daran. Die Werkzeugleiste ist außerdem nur 653 von 932 Punkten breit und deckt
die rechte Fensterseite nicht ab.

### 3. Die „fünf Spalten in zwei Reihen" stehen **nicht** in den Daten

Gefragt war, woher die Aufteilung kommt. Die Zone trägt nur
`layout: "grid"` und `capacity: 10`; die Spalten rechnet `zoneSlots` in
`shared/zoneGeometry.js` aus:

```
cols = round(sqrt(cap * w / h)) = round(sqrt(10 * 580 / 280)) = round(4,55) = 5
rows = ceil(10 / 5) = 2
```

Das heißt: **jede Änderung an Breite, Höhe oder Kapazität verschiebt die
Aufteilung still mit.** Eine Zone 580 × 140 mit `capacity: 5` ergibt
`round(sqrt(20,7)) = 5` Spalten in einer Reihe — das ist der Wert, auf den BH
baut, und er wird deshalb getestet und nicht geglaubt.

### 4. `capacity` + `layout` reichen; dem Zonenmodell fehlt nichts

Auch das war eine Frage. Antwort aus `zoneGeometry.js`:

- **Ein Platz:** `layout: "row"`, `capacity: 1` → `zoneSlots` liefert genau
  einen Punkt, `spread(zone,'row',0,1)` = die **Mitte** der Zone. Mit
  `snap: true` rastet die Karte mittig ein.
- **Zwei Plätze:** `layout: "row"`, `capacity: 2` → zwei Punkte bei ¼ und ¾ der
  Breite.
- **Abweisung:** `zoneRejects` fragt `zoneCapacity` gegen `countInZone`, und
  `countInZone` zählt bei festen Plätzen die **belegten Plätze** (M11.8). Die
  zweite Karte in `Kopf` wird mit `zone "…" is full (1)` abgewiesen; die Meldung
  läuft über dieselben Meldebänder, die M16.2 eingeführt hat
  (`issue-band-collapsed.test.js`).

**Es ist also kein Codeweg nötig, um die Zonen zu bauen.** Die Arbeit steckt in
der Geometrie und in deren Prüfung.

### 5. Abnahme 2 ist über das Namensschild **nicht** erfüllbar

„Eine Karte in `Kopf` ist auf einen Blick von einer im Vorrat zu unterscheiden
— bei dem Zoom, bei dem man spielt (um 40 %)."

Das Schild steht in Weltkoordinaten mit `fontSize: 11px` (ZoneOverlay.jsx) und
wird von der Kameraebene mitskaliert. Bei Zoom 0,41 sind das **4,5
Bildschirmpunkte Schrifthöhe** — unlesbar. Gemessen wurden außerdem die
Schildbreiten mit der echten Schrift (`600 11px Inter`, Polster 2/6):

| Schild | Breite (Welt) |
|---|---|
| `Ausrüstung Dörfler 1` | 115,1 |
| `Dörfler 1: Mitbringsel` | 117,6 |
| `Dörfler 1: Hände` | 93,2 |
| `Dörfler 1: Kopf` | 83,9 |

Die Abnahme bleibt wie sie ist, aber sie wird **nicht über den Namen** erfüllt,
sondern über drei Dinge, die bei 40 % noch tragen: der eigene **Rahmen** je
Slot, die **Farbe** (Slot-Zonen grün, Vorrat grau) und der **Abstand** — ein
Slot ist 193 Punkte breit bei 100 Punkten Karte, es bleiben 46,7 Punkte
farbiger Rand je Seite (18,7 Bildschirmpunkte bei 0,41). Zum Vergleich: in der
heutigen Zone liegen die Karten im Abstand 116, also 8 Punkte Rand — drei
Bildschirmpunkte, und damit der Grund, warum eine engere Aufteilung diese
Abnahme nicht erfüllen kann.

### 6. Abnahme 7 ist heute schon erfüllt — und wird es durch BH nicht weniger

„‚Dorfphase beginnen' räumt die Slot-Zonen **nicht** ab."

Die Aktion hat 45 Schritte (`setups.action_data`). Kein einziger nennt
`Ausrüstung Dörfler N`, und die drei `clear_table`-Schritte sind auf
Kategorien (`Aktionen: …`) bzw. auf die drei Dörfler-Figuren eingegrenzt.
`clear_zone` kommt siebenmal vor, auf `Bösewicht-Platz`,
`Bösewicht-Tableau`, `Terrain-Auslage`, `Ablage` und die drei Hände.

Die Abnahme wird deshalb **umformuliert**, damit sie prüfbar ist statt
beobachtbar: *Kein Schritt der Aktion „Dorfphase beginnen" nennt eine der
fünfzehn neuen Zonen, und kein `clear_table`-Schritt ohne Filter steht darin.*
Das ist eine Kontrollabfrage auf `action_data`, keine Codeänderung.

### 7. Zwei Kleinigkeiten, die der Vollständigkeit halber genannt sind

- **Die Fundstelle der sechs Slots.** Die Spec schreibt
  „Beine, Brust, Kopf, Linke Hand, Rechte Hand und Mitbringsel `[DE S.35]`".
  `docs/tft-regeln.md` führt genau diesen Wortlaut unter `[DE S.7]`; `[DE S.35]`
  ist die Glossarfassung „1 Bein, 1 Brust, 1 Kopf, 2 Hände und 1 Mitbringsel".
  Inhaltlich gleich, die Seitenzahl nicht.
- **Es sind sechs Kartenplätze, nicht fünf.** Die Spec rechnet mehrfach mit
  „fünf festen Plätzen"; `Hände` hat zwei. Das ändert die Flächenrechnung:
  sechs Plätze à 116 Punkten Mindestabstand brauchen 696 Punkte und passen
  deshalb **nicht** in eine Reihe von 580. Das ist der Grund für zwei Reihen in
  BH.
- **Die Abweisungsmeldung ist englisch** (Ä5/Ä6 der neunten Partie). Abnahme 3
  verlangt eine *sichtbare* Meldung, und die kommt — sie liest sich
  `zone "Dörfler 1: Kopf" is full (1)`. Die Übersetzung ist Ä6 und nicht Teil
  von M18.

---

## BH — Fünf Slot-Zonen je Dörfler, und der Vorrat daneben (M18, Daten)

**Befund (L1, M17.6).** Der Tisch kennt keinen Unterschied zwischen angelegter
und weggepackter Ausrüstung. Die Maschinerie dafür steht vollständig (siehe
„Wo die Spec nicht stimmt", 4) — es fehlen die Zonen.

**Die Aufteilung, und warum diese.** Der verfügbare Streifen ist 580 Punkte
breit (Tableau-Abstand, Befund 1) und reicht von y 1808 bis y 2329
(Werkzeugleiste, Befund 2) — **521 Punkte**. Hineingelegt werden

| | | |
|---|---|---|
| Reihe A, y 1808 … 1948 | `Dörfler N: Kopf` · `Dörfler N: Brust` · `Dörfler N: Beine` | je 193,33 × 140, `capacity: 1`, `layout: "row"` |
| Luft, y 1948 … 1970 | 22 Punkte | für die Schilder der Reihe B |
| Reihe B, y 1970 … 2110 | `Dörfler N: Hände` (386,67 × 140, `capacity: 2`) · `Dörfler N: Mitbringsel` (193,33 × 140, `capacity: 1`) | |
| Luft, y 2110 … 2132 | 22 Punkte | für das Schild des Vorrats |
| Vorrat, y 2132 … 2272 | `Ausrüstung Dörfler N`, 580 × 140, `capacity: 5`, `layout: "grid"` | |

Unterkante **2272**, also 57 Punkte über der Werkzeugleiste und 303 über dem
Fensterrand.

**Die 22 Punkte Luft sind kein Schönheitsrand, sondern die Bedingung dafür,
dass M16.1 hält.** `zoneLabelAbove` entscheidet „oben, außer wenn oben eine
andere Zone im Weg ist und unten keine" (`!hits(above) || hits(below)`). Ohne
Luft läge über Reihe B die Reihe A **und** unter ihr der Vorrat — die Regel
antwortet dann „oben", und das Schild der Reihe B stünde auf den unteren 21
Punkten der Karten in Reihe A. Genau der Fehler, den M16.1 behoben hat, nur
eine Etage tiefer. `ZONE_LABEL_HEIGHT` ist 21; 22 lässt einen Punkt Reserve.

**Zahlen, die geprüft und nicht geglaubt werden:**

- `193,33 ≥ 116` — der Platzabstand, bei dem sich zwei Karten (100 breit) nicht
  berühren. `Hände` setzt seine beiden Plätze auf ¼ und ¾ von 386,67, also
  **193,33 auseinander**.
- `140` ist genau die Kartenhöhe: eine Karte füllt die Reihe, ragt aber nicht in
  die nächste.
- Der Vorrat 580 × 140 mit `capacity: 5` ergibt über die Rechnung aus Befund 3
  **5 Spalten × 1 Reihe**, Abstand 116 — dieselbe Teilung wie heute, nur eine
  Reihe statt zwei.
- Das breiteste neue Schild misst 117,6 Punkte und beginnt 8 Punkte innerhalb
  der Zone; 125,6 < 193,33, also überlappt kein Schild den Nachbarn.

**Was verworfen wurde:**

1. **Obere Reihe wird Slots, untere bleibt Vorrat** (Vorschlag der Spec). Es
   sind sechs Kartenplätze, nicht fünf, und sie passen bei 116 Punkten Abstand
   nicht in 580 (Befund 7). Außerdem bliebe für `Kopf` nur ein 116 Punkte
   breiter Kasten um eine 100 Punkte breite Karte — 3 Bildschirmpunkte Rand bei
   40 %. Abnahme 2 wäre nicht erfüllbar (Befund 5).
2. **Alles in die heutigen 580 × 280 quetschen** (4 Slots à 116 oben, `Hände`
   als 116 × 280 rechts, Vorrat 464 × 140 links unten). Passt rechnerisch und
   kostet keinen Punkt nach unten — scheitert an denselben 3 Bildschirmpunkten,
   und die Schilder (bis 117,6 breit) überlappten sich bei 116 Punkten
   Zonenbreite gegenseitig.
3. **Vorrat bei `capacity: 10` lassen** (580 × 280). Dann endet der Streifen
   bei 2412, und die untere Kartenreihe liegt zu 58 % hinter der Werkzeugleiste
   — Ä5 der neunten Partie, mit Ansage gebaut.
4. **`Hände` als `layout: "stack"`.** Nimmt zwei Karten, zeigt aber nur die
   obere (6 Punkte Versatz). Dass eine Zweihandwaffe den zweiten Platz belegt,
   wäre dann gerade nicht zu sehen — der Zweck der Zone.
5. **Slot-Zonen auf das Tableau legen** (unter den Werteleisten ist y 1630 …
   1800 frei). Verdeckt den Aufdruck; Abnahme 1 verbietet es ausdrücklich.

**Was das kostet, und das gehört gesagt:** die Kapazität des Vorrats geht von
**10 auf 5**. In der Summe steigt sie trotzdem — 6 Slot-Plätze + 5 Vorrat =
**11** statt 10. Die Regel kennt keine Obergrenze des Besitzes `[BR S.8]`, und
auch die heutigen 10 waren schon eine. Ein Dörfler, der sieben Stücke besitzt
und **nichts** anlegt, stößt bei der sechsten Karte an; er bekommt dafür die
Meldung aus M16.2 und keine stumme Rückkehr. In Partie 7 war sieben das
beobachtete Maximum, und mit angelegter Ausrüstung liegen davon höchstens
eines im Vorrat.

**Änderung (Daten, kein Laufzeit-Code).** In `setups.zone_data` des Aufbaus
*TFT Kurzpartie* (`b1e10f4e-b8f2-4c2a-bb3e-54643944121b`, Spiel
`072123c0-cd97-4ffb-a330-369630fab93f`):

- fünfzehn neue Zonen (drei Dörfler × fünf), je am Tableau des Dörflers
  verankert (`98e26309-…`, `d4691079-…`, `bad13f49-…`), `shape: "rect"`,
  `type: "shared"`, `color: "green"`, `accepts: ["card"]`, `snap: true`;
- an den drei vorhandenen `Ausrüstung Dörfler N`: `relY` 1,02 → **1,83**,
  `relHeight` 0,7 → **0,35**, `capacity` 10 → **5**. `relX`, `relWidth`,
  `accepts`, `snap`, `layout`, `anchor` und die ID bleiben.

Relativwerte am Anker 300 × 400:

| Zone | relX | relY | relWidth | relHeight | capacity | layout |
|---|---|---|---|---|---|---|
| `Dörfler N: Kopf` | 0 | 1,02 | 0,644444… | 0,35 | 1 | row |
| `Dörfler N: Brust` | 0,644444… | 1,02 | 0,644444… | 0,35 | 1 | row |
| `Dörfler N: Beine` | 1,288888… | 1,02 | 0,644444… | 0,35 | 1 | row |
| `Dörfler N: Hände` | 0 | 1,425 | 1,288888… | 0,35 | 2 | row |
| `Dörfler N: Mitbringsel` | 1,288888… | 1,425 | 0,644444… | 0,35 | 1 | row |
| `Ausrüstung Dörfler N` | 0 | 1,83 | 1,933333… | 0,35 | 5 | grid |

Die Zahlen stehen **einmal**, in `scripts/equipment-zones.mjs`; derselbe
Baustein liefert die Zonen für den Trockenlauf, für das Schreiben und für den
Test (M6).

**Vorgehen** wie in `docs/tasks-partie7.md` (AS2): Trockenlauf vorab, dann
**eine** `db.transaction`, dann Kontrollausgabe. Gelesen und geschrieben wird
**nur `zone_data`** — `scenario_data` und `action_data` sind von anderen
Aufträgen angefasst worden, und wer die ganze Zeile zurückschreibt, überschreibt
sie.

**Abnahme.**
1. Test: die achtzehn Kästen aus `scripts/equipment-zones.mjs` überlappen
   einander nicht, keiner ragt über die 580 Punkte des Tableau-Abstands hinaus,
   keiner beginnt über y 1808 oder endet unter y 2329.
2. Test: `zoneSlots` liefert für `Kopf`, `Brust`, `Beine`, `Mitbringsel` genau
   einen Platz — die Mitte der Zone —, für `Hände` genau zwei im Abstand ≥ 116,
   für den Vorrat fünf im Abstand 116 in **einer** Reihe.
3. Test: `zoneRejects(Kopf, 'card', 1)` meldet `is full (1)`;
   `zoneRejects(Hände, 'card', 1)` meldet nichts, bei 2 meldet es `is full (2)`.
4. Test: `zoneLabelAbove` setzt für alle achtzehn Zonen das Schild **über** die
   Zone, und kein Schildstreifen (21 hoch, `max(Breite, 120)` breit)
   überschneidet den Kasten einer anderen Zone.
5. Trockenlauf vorab: die drei `Ausrüstung Dörfler N` tragen die heutigen Werte
   (`relY` 1,02, `relHeight` 0,7, `capacity` 10), es gibt 30 Zonen, und keine
   der fünfzehn neuen IDs ist vergeben — 0 Beanstandungen.
6. Kontrollausgabe nach dem Schreiben: 45 Zonen, die drei Vorräte tragen die
   neuen Werte, alle übrigen 27 Zonen sind unverändert.
7. Kontrollabfrage auf `action_data`: kein Schritt der Aktion „Dorfphase
   beginnen" nennt eine der fünfzehn neuen Zonen (ersetzt Abnahme 7 der Spec,
   siehe „Wo die Spec nicht stimmt", 6).
8. Sichtprüfung am laufenden Tisch bei Zoom ≈ 0,4: jeder Dörfler hat fünf
   beschriftete Slot-Zonen; eine Karte in `Kopf` ist von einer im Vorrat auf
   einen Blick zu unterscheiden; sieben Karten eines Dörflers ragen nicht zum
   Nachbarn; `Hände` nimmt zwei Karten, eine dritte wird sichtbar abgewiesen.
9. `cd client && npx vite build` bringt keine neue Warnung.

**Was nicht gebaut wird.** Keine Automatik: der Tisch rechnet kein MUMM ab,
verweigert keinen Tausch im Kampf und kennt das Merkmal „Seltsam" nicht. Er
zeigt, was wo liegt (§1 der Spec). Auch die Startausrüstung wird **nicht**
in die Slots verteilt — welcher Slot zu `BAUERNLATZHOSE` gehört, steht auf der
Karte und nicht in den Daten; die zwei `place_card`-Schritte je Dörfler zielen
weiter auf den Vorrat, und das Anlegen ist in der Dorfphase frei `[DE S.12]`.

---

## Nicht Teil dieser Liste

- **Ä6**, die englische Abweisungsmeldung. Sie wird durch BH häufiger zu sehen
  sein, ist aber ein eigener Befund der neunten Partie.
- **Der Zustand „weggepackt" als Kartenfeld.** Die Spec hat sich dagegen
  entschieden, und BH bestätigt die Entscheidung: es brauchte keine Zeile
  Laufzeit-Code.
- **Das Stapel-Kontextmenü (Ä1).** Es wächst durch die fünfzehn Zonen **nicht**
  — `revealZones` (`client/src/utils/revealToZone.js`) bietet, sobald es eine
  Zone mit `layout: "stack"` gibt, nur noch diese an; `Aktionen` und `Ablage`
  sind solche. Geprüft in `server/test/reveal-to-zone.test.js`.
