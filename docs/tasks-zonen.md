# Aufgaben: Befunde des Zonen-Durchgangs (Spec M16.1–M16.3)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M16**. Die Belege stehen in
`docs/partie8-zonen.md` (F1, F2, F3). Die unmittelbare Vorgeschichte — wie die
Zonen überhaupt an den Hotseat-Tisch kamen, woher `zoneShownInPlay` kommt und
warum vierzehn Markerleisten still sind — steht in `docs/tasks-partie7.md`,
Abschnitte AS1–AS3.

**Aufgabenbuchstaben.** `AA`–`AE` in `docs/tasks-partie5.md`, `AF`–`AN` in
`docs/tasks-partie6.md`, `AP`–`AV` in `docs/tasks-partie7.md`. Hier geht es mit
`AW` weiter.

**Reihenfolge.** `AW` (M16.1) zuerst, dann `AX` (M16.3), dann `AY` (M16.2).

**Gilt für jede Aufgabe.** Erst der rote Test, dann die kleinste Änderung, die
ihn grün macht. Tests: `cd server && npm test` (Stand vorher: **1097**, alle
grün). Bau: `cd client && npx vite build` — keine **neue** Warnung (zwei sind
vorbestehend). Der Client hat keine Testinfrastruktur (CLAUDE.md): reine
Rechnung gehört nach `shared/` und wird aus `server/test/` geprüft — **die Lage
des Namensschilds ist so eine Rechnung** und gehört nicht als Zahl ins JSX.
Jede Geste gilt für Maus, Tastatur **und** Touch. Es gibt genau eine Stelle je
Sache (M6).

**Keine Datenänderung.** Alle drei Punkte sind Code. Die 30 Zonen des Aufbaus
`b1e10f4e-…` bleiben, wie AS2/AS3 sie hinterlassen haben; nachgemessen wurde
nur, nichts geschrieben.

---

## Wo die Spec nicht stimmt

Fünf Stellen. Eine dreht die Antwort auf die wichtigste Frage um (M16.3), eine
macht eine Abnahme unerfüllbar und wird neu formuliert (M16.3 Abnahme 3), eine
widerspricht einer früheren, ausdrücklich begründeten Entscheidung (M16.2
Abnahme 3).

### 1. M16.3 — `showInPlay` schaltet **nur** die Darstellung ab. Das Einrasten rastet

Die Spec fragt: „ob das Einrasten bei einer unsichtbaren Zone überhaupt
stattfindet — der Befund (‚blieb lose liegen') könnte heißen, dass
`showInPlay: false` nicht nur die Darstellung abschaltet. Dann ist **das** der
Fehler."

**Es ist nicht der Fehler.** `zoneShownInPlay` wird im ganzen Projekt an genau
zwei Stellen gelesen, und beide zeichnen: `GameTable.jsx` Zeile 8403 (die
Bedingung des Zonen-Blocks) und Zeile 8421 (der Filter am `<ZoneOverlay/>`).
Die Trefferrechnung fragt nicht danach — `zoneAt` prüft `facingAway` und
`zoneContains`, `snapInto`/`snapPoint`/`zoneSlots` kennen das Feld nicht. Eine
Zone mit `showInPlay: false` nimmt, zählt, weist ab und rastet ein wie jede
andere. Partie 8 bestätigt das selbst („Einrasten beim Ziehen funktioniert — in
der Ausrüstungszone wie auf der unsichtbaren Markerleiste").

**Der wirkliche Grund, warum der Marker lose liegenblieb, ist Geometrie.**
Eingerastet wird, wenn der **Mittelpunkt** des Stücks beim Loslassen *in* der
Zone liegt (`zoneAt` → `zoneContains`). Gemessen an der echten Zone, um die es
ging (`Dörfler 2: Bewegung`, Fridgettes BEW-Spur, aus `zone_data` über den
Anker `Tableau: Fridgette Jones`, 300 × 400):

| Spur (Fridgette) | x | Breite |
|---|---|---|
| Leben | 157,0 | 21,6 |
| Bewegung | 189,4 | 21,7 |
| Mumm | 221,8 | 21,7 |
| Präzision | 254,3 | 22,0 |

Also **21,7 Weltpunkte breit**, Abstand von Spur zu Spur **32,4**, freier Raum
zwischen zwei Spuren **10,7**. Bei 43 % Arbeitszoom sind 9 Bildschirmpunkte
`9 / 0,43 = 20,9` Weltpunkte: der Mittelpunkt landete 20,9 − 10,85 ≈ **10
Weltpunkte außerhalb** der Spur, und zwar im Zwischenraum. `zoneAt` gab `null`,
`snapInto` fand kein Raster, das Stück blieb am Fallpunkt liegen. Genau so
steht es im Bericht.

Nebenbei korrigiert: die Spur ist nicht „~29 Weltpunkte" breit, sondern 21,7
(Fridgette) bzw. 28,6 (Henlo und Granny, Abstand dort 26,7 — deren Spuren
überlappen sich sogar um 1,9 Punkte). Bei 43 % sind das 9,3 bzw. 12,3
Bildschirmpunkte.

### 2. M16.3 Abnahme 3 ist unerfüllbar und wäre schädlich — neu formuliert

Abnahme 3 fordert: „Ein Marker, der neun Punkte neben seiner Spur losgelassen
wird, rastet darauf ein." Das lässt sich nicht bauen, ohne ihn auf die
**falsche** Spur zu rasten.

Rechnung, mit den Zahlen von oben: eine Toleranz, die 20,9 Weltpunkte neben der
BEW-Spur noch greift, reicht über die MUM-Spur hinweg (deren Rand liegt 10,7
Punkte neben dem BEW-Rand, ihre Mitte 32,4 Punkte neben der BEW-Mitte). Auch
die Regel „nimm die **nächste** Zone" hilft nicht: ein Punkt 20,9 Weltpunkte
rechts der BEW-Mitte ist 10,05 Punkte von BEW entfernt und **1,7** von MUM —
nächste Zone ist MUM. Bei Henlo und Granny ist es schlimmer, dort liegen die
Spuren 26,7 auseinander und berühren sich.

Ein Marker, der still auf die Nachbarspur rastet, **verfälscht einen Wert**
(Partie 7 hat genau damit einen Kampf in falscher Reihenfolge gespielt). Lose
liegenbleiben sieht man; die falsche Spur sieht man nicht. Eine Toleranz, die
beweisbar eindeutig bleibt, darf höchstens den halben Zwischenraum messen —
5,35 Weltpunkte, bei 43 % Zoom **2 Bildschirmpunkte**. Dafür lohnt kein Code.

**Neu formuliert (Abnahme 3').** Während ein Stück gezogen wird, ist die Spur,
auf die es soll, als Rahmen zu sehen; ein Marker, der **auf** dem sichtbaren
Rahmen losgelassen wird, rastet ein. Eine Toleranz *neben* der Spur gibt es
nicht, und zwar begründet: vier Spuren im Abstand von 26,7 bzw. 32,4
Weltpunkten lassen keine zu, die nicht die Nachbarspur mitnimmt.

Damit bleibt M16.3 die Änderung, die die Spec selbst nennt — Sichtbarkeit beim
Ziehen — und sie ist nicht „die halbe Antwort", sondern die ganze: der Befund
F3 sagt es im letzten Satz selbst, „man vermisst sie — nicht als Kasten,
sondern als Rückmeldung".

### 3. M16.1 — „darüber kein Platz" gibt es in Weltkoordinaten nicht; den Fall, der zählt, gibt es

Die Spec sagt: „Wo darüber kein Platz ist (eine Zone am oberen Rand des
Bretts), darunter." Einen oberen Brettrand gibt es im Code nicht. Es gibt keine
Weltgrenze, keine Kamerabeschränkung (kein `clamp`, kein `WORLD_*`,
`panPosition` ist unbeschränkt), und seit AS1 trägt keine Kameraebene mehr
`overflow-hidden` — ein Schild bei negativem `y` wird ganz normal gezeichnet.
„Ins Leere stoßen" kann es also nicht.

**Der Fall, der stattdessen zählt, ist nachgemessen und tritt genau einmal
auf:** das Schild über dem oberen Rand einer Zone kann in die **Fläche einer
anderen Zone** fallen — und damit auf ein Stück, das dort liegt. Das ist
derselbe Fehler, nur umgezogen. Aus dem laufenden Tisch (DOM, Weltkoordinaten):

* `Buyin'/Beatin'-Leiste`: Kasten bei y = 212,4
* `Bösewicht-Platz`: Kasten y = 149,2 … 198,8, x = 165,2 … 214,8
* Schild: 19 Weltpunkte hoch (einzeilig), 2 Punkte Abstand, Versatz x + 8
  → Schildstreifen y = 191,4 … 210,4, x ab 163,2

Überschneidung mit `Bösewicht-Platz`: **7,4 von 49,6 Punkten = 15 % des
Bösewicht-Plättchens** — genau die Zahl, die die Spec bei `Besiegte Bösewichte`
als Fehler listet. „Immer darüber" tauscht den Fehler also, es behebt ihn
nicht.

**Also:** über den Rand, und dorthin **darunter**, wo der Streifen darüber die
Fläche einer anderen Zone schneiden würde. Das ist die Zwei-Fälle-Regel der
Spec mit der einzigen Bedingung, die sich in Weltkoordinaten überhaupt rechnen
lässt. Für `Buyin'/Beatin'-Leiste` ist unten frei (Kasten endet bei 486,8; die
nächste Zone, `Bösewicht-Leiste`, beginnt bei 633,6).

### 4. M16.1 — das Schild bricht heute um, und das verdoppelt seine Höhe

Nicht in der Spec, aber Teil derselben Rechnung: das Schild hat keine eigene
Breite und steht im Kasten der Zone, also bricht es um, sobald der Name breiter
ist als die Zone. Gemessen am laufenden Tisch: 19 Weltpunkte hoch bei einer
Zeile, **33 bei zwei** — und zwei Zeilen hat es bei `Bösewicht-Leiste`,
`Buyin'/Beatin'-Leiste` und `Bösewicht-Platz`, also bei genau den schmalen
Leisten, um die es geht. Außerhalb des Kastens muss der Umbruch weg
(`whitespace-nowrap`), sonst bleibt der Streifen über der Zone mal 21, mal 35
Punkte hoch und die Rechnung hätte zwei Antworten. Einzeilig sind alle
vierzehn Schilder des Tisches 85–118 Weltpunkte breit (gemessen).

Nebeneffekt, nicht Ziel: F5 (`Bösewicht-Platz`, Schild 91 breit bei 49,6
Zonenbreite) ist damit kosmetisch erledigt — der Überhang liegt dann neben der
Zone statt über ihrem Inhalt.

### 5. M16.2 — die Meldung ist nicht an der falschen Stelle, sie ist bei eingeklappter Leiste **gar nicht da**

Die Spec sagt, „zone is full (10)" erscheine „im einklappbaren Kopfbereich". Im
Code ist es schärfer: der Block steht in `GameTable.jsx` **innerhalb von
`{showTopBar && (<>`** (Zeile 5692 bis 6027). Eingeklappt wird er nicht
verdeckt, er wird nicht gerendert. Dasselbe gilt für die beiden Nachbarn
(`saveToast`, `drawToast`) — es sind drei Meldebänder in einem Zweig.

Das ist gut, denn es macht die Änderung klein: das Band **ist** die Stelle aus
M12.1, es muss nur aus dem einklappbaren Zweig heraus. Kein zweiter Meldeweg,
nichts Neues daneben (M6). Der Weg stimmt übrigens auch schon: das abgewiesene
Ziehen setzt `setSetupIssues` (Zeile 1757), es ist also **nicht** stumm,
sondern unsichtbar.

**M16.2 Abnahme 3 widerspricht M12.1 Abnahme 3 — neu formuliert.** M16.2 will
„sie verschwindet von selbst", M12.1 hat ausdrücklich das Gegenteil entschieden
(„Eine Meldung wegzunehmen, bevor sie gelesen ist, wäre schlimmer") und M12.1
Abnahme 2 bot beides als **oder** an: „verschwindet von selbst, **oder** liegt
nicht über dem Tisch". Umgesetzt ist die zweite Hälfte — das Band ist
durchlässig, `pointer-events-auto` steht nur am ×. Ein Zeitgeber nur für
abgewiesene Ablagen wäre eine zweite Antwort auf die Frage, wann dieses Band
geht.

**Neu formuliert (Abnahme 3').** Das Band blockiert den Tisch nicht (durchlässig
wie seit M12.1) und geht mit einem Klick auf sein ×; es verschwindet nicht von
selbst, weil dasselbe Band das Protokoll eines Aufbaus trägt (M11.2: sechzehn
Zeilen) und M12.1 Abnahme 3 das verbietet.

---

## AW — Das Namensschild steht außerhalb der Zone (M16.1)

### AW1 — Wo das Schild hängt, ist eine Rechnung

**Befund (F1).** `ZoneOverlay.jsx` Zeile 46 setzt das Schild mit
`absolute top-1 left-2` **in** den Kasten der Zone, also auf Platz 1. Bei
`Buyin'/Beatin'-Leiste` verdeckt es 73 % des obersten
Reihenfolge-Plättchens — und die Reihenfolge ist der einzige Zweck dieser
Leiste. Dieselbe Ursache bei vier weiteren Zonen (55 / 15 / 13 / 9 %).

**Änderung.** `shared/zoneGeometry.js` bekommt die Rechnung, nicht das JSX:

* `ZONE_LABEL_HEIGHT = 21` — 19 Weltpunkte einzeiliges Schild (gemessen) + 2
  Punkte Luft.
* `ZONE_LABEL_WIDTH = 120` — die Breite des Streifens, gegen den geprüft wird;
  das breiteste Schild des Tisches misst 118 (gemessen, einzeilig).
* `zoneLabelAbove(zone, zones)` → `true`, wenn der Streifen über dem oberen Rand
  der Zone die Fläche **keiner anderen** Zone schneidet; sonst `false`
  (= darunter). Geprüft wird gegen Kästen, nicht gegen Formen: das Schild ist
  ein Rechteck. `facingAway`-Zonen zählen nicht mit — sie sind nicht da
  (M10.13). Schneidet es oben **und** unten, bleibt es oben: dann ist keine
  Seite besser, und oben ist die Regel.

`ZoneOverlay` liest das Ergebnis und setzt `bottom: '100%'` bzw. `top: '100%'`
samt Abstand, dazu `whitespace-nowrap` (siehe „Wo die Spec nicht stimmt", 4).
Es bekommt dafür einen Prop `all` (alle aufgelösten Zonen, Vorgabe = `zones`):
der Streifen muss auch gegen die vierzehn stillgelegten Leisten geprüft werden,
denn auch auf denen liegen Stücke.

**Abnahme.**
1. `zoneLabelAbove` ist `true` für eine Zone, über der nichts liegt, und
   `false`, wenn eine andere Zone den Streifen schneidet — mit den gemessenen
   Zahlen von `Buyin'/Beatin'-Leiste` und `Bösewicht-Platz` als Testfall (Test).
2. `facingAway`-Zonen und die Zone selbst drängen ihr eigenes Schild nicht nach
   unten (Test).
3. Quellentest: in `ZoneOverlay.jsx` steht keine Zahl für die Schildlage, das
   Schild trägt `whitespace-nowrap`, und seine Lage kommt aus
   `zoneLabelAbove`.
4. `cd client && npx vite build` bringt keine neue Warnung.
5. Am Tisch ist das oberste Plättchen der `Buyin'/Beatin'-Leiste` vollständig zu
   sehen, und kein Schild liegt auf dem Bösewicht-Plättchen (Sichtprüfung).

---

## AX — Beim Ziehen sind die Zonen zu sehen (M16.3)

### AX1 — Ein Zustand „es wird gezogen", der alle Arten deckt

**Befund (F3).** Vierzehn Markerleisten sind seit AS3 `showInPlay: false`. Das
war richtig — aber man legt dort jetzt blind ab. Das Einrasten selbst ist in
Ordnung (siehe „Wo die Spec nicht stimmt", 1); was fehlt, ist das Ziel.

Es gibt **vier** Zugzustände in `GameTable.jsx`, nicht einen:
`draggingCard` (Karte oder Stapel am Tisch, Zeile 574), `draggingObj`
(Token, Zähler, Würfel, Eigenwürfel, Notiz, Brett, Zeile 663),
`draggingFromHand` (Hand → Tisch, Zeile 780) und `draggingHandCard`
(Umsortieren **innerhalb** der Hand, Zeile 628). Eine Sichtbarkeit, die nur an
`draggingObj` hängt, greift bei Karten nicht.

**Die eine Stelle, an der alle drei Tisch-Züge zusammenlaufen, gibt es schon:**
`handleGlobalMove` (Zeile 2725) verteilt auf `handleCardDragMove`,
`handleObjDragMove` und `handleHandToTableDragMove` — ein Zweig, drei Arten,
Maus und Touch über `handleGlobalMouseMove`/`handleGlobalTouchMove`.
`draggingHandCard` gehört nicht dazu: es ordnet in der Handleiste um und legt
nichts auf den Tisch.

**Änderung.** Ein Zustand `dragActive`, gesetzt in `handleGlobalMove` in genau
dem Zweig, der einen Zug weitergibt, zurückgesetzt in `handleGlobalEnd` und in
`handleGlobalTouchCancel` (dort, wo jeder andere Zugzustand auch zurückgesetzt
wird). **Im Bewegungs-, nicht im Druckereignis**: ein Klick auf eine Karte
setzt `draggingCard`, ohne dass etwas gezogen wird — sonst blitzen die Zonen
bei jedem Klick auf.

Der Zonen-Block zeichnet dann `dragActive || zoneShownInPlay(z)`. Das Schild
bleibt an `zoneShownInPlay` gebunden: zwölf Leistenschilder über drei Tableaus
waren der Grund für AS3 („ein unleserlicher grauer Fleck über genau dem
Aufdruck, den sie beschreiben"), und während des Ziehens wäre er genau dort, wo
man hinsieht. Gezogen wird auf einen **Rahmen**, nicht auf einen Namen.

Kein Filter nach `accepts`: der dazu nötige „welche Art wird gerade gezogen"
wäre ein fünfter Zustand, und eine Zone zu zeigen, die das Stück nicht nimmt,
ist keine falsche Aussage über den Tisch. Abnahme 1 fordert, dass alle
annehmenden Zonen zu sehen sind — das ist erfüllt, wenn alle zu sehen sind.

**Abnahme.**
1. `zoneShownInPlay` bleibt unverändert (die vorhandenen Tests in
   `server/test/zone-in-play.test.js` laufen weiter).
2. Quellentest: der Zonen-Block zeichnet bei `dragActive` auch stillgelegte
   Zonen; `dragActive` wird in `handleGlobalMove` gesetzt und in
   `handleGlobalEnd` **und** `handleGlobalTouchCancel` zurückgesetzt; das Schild
   hängt weiter allein an `zoneShownInPlay`.
3. `cd client && npx vite build` bringt keine neue Warnung.
4. Am Tisch: beim Ziehen einer Karte **und** beim Ziehen eines Markers
   erscheinen die Rahmen aller dreißig Zonen, nach dem Loslassen sind sie
   wieder wie vorher (Sichtprüfung, Maus und Touch).
5. Ein Marker, der auf dem sichtbaren Rahmen seiner Spur losgelassen wird,
   rastet ein (Abnahme 3', Sichtprüfung).

---

## AY — Die abgewiesene Ablage meldet sich auch bei eingeklappter Leiste (M16.2)

### AY1 — Das Meldeband verlässt den einklappbaren Zweig

**Befund (F2).** Die elfte Ausrüstungskarte wird abgewiesen, die Meldung
„zone ‚Ausrüstung Dörfler 1' is full (10)" entsteht auch — aber die drei
Meldebänder stehen in `GameTable.jsx` innerhalb von `{showTopBar && (<>`
(Zeile 5692–6027). Eingeklappt existieren sie nicht. Die Rolle empfiehlt
einzuklappen; wer das tut, sieht keine Meldung.

**Änderung.** Die drei Bänder (`saveToast`, `setupIssues`, `drawToast`) wandern
aus dem `showTopBar`-Zweig heraus, **hinter** den Chevron-Block aus M11.1 — als
letzte Zeilen im Fluss desselben Behälters. Damit gilt M11.1 Regel 1 weiter
(eine Zeile im Fluss kann die Zeilen darüber nicht überdecken) und M12.1 bleibt
wie es ist (Körper durchlässig, `pointer-events-auto` nur am ×). Alle drei, weil
es ein Block ist und zwei zurückzulassen die Unstimmigkeit wäre.

Die Meldung nennt Zone und Kapazität schon heute — `zoneRejects` baut den Satz,
und dieselbe Funktion antwortet dem Aufbau, dem Aufdeck-Menü und dem Ziehen
(M6). Nichts daran wird angefasst, auch nicht die Sprache: englische Meldung
zwischen deutschen Zonennamen ist richtig gesehen (F2, „Nebenbei"), aber das
ist der ganze Tisch, nicht diese Zone, und keine Aufgabe aus M16.

**Abnahme.**
1. Quellentest: die drei Meldebänder liegen **nicht** mehr innerhalb des
   `showTopBar`-Zweigs, und der Zweig schließt vor ihnen.
2. `zoneRejects` nennt Zone und Kapazität (vorhandener Test, bleibt grün).
3. `cd client && npx vite build` bringt keine neue Warnung.
4. Am Tisch, Kopfleiste eingeklappt: eine elfte Karte in
   `Ausrüstung Dörfler 1` ziehen → die Karte springt zurück **und** das Band
   steht sichtbar da, mit Zone und Kapazität; ein Klick auf × nimmt es weg
   (Sichtprüfung, Abnahme 3').
