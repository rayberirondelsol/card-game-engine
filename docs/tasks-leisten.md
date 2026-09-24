# Aufgaben: Leisten über dem Tisch (Spec M11.1–M11.3)

Vertrag ist `docs/spec-setup-system.md`, Abschnitte **M11.1**, **M11.2** und
**M11.3**. Nummern sind `Y…`, weil T, G, F, S, K, B, R, V, N, A, D, E, Z, L, P,
H, W, J, U, C und X belegt sind und `M` den Spec-Abschnitten bleibt. `Y` und
nicht `I` oder `O`, weil `I1` und `O1` wie `11` und `01` aussehen — dieselbe
Begründung wie bei `J` und `U`.

**Gilt für jede Aufgabe.** Eine Fähigkeit ist erst fertig, wenn alle Schichten
stimmen, und „nichts zu tun" ist eine gültige Antwort, aber nur eine geprüfte.
Tests laufen mit `cd server && npm test`, der Bau mit `cd client && npx vite build`.
Was hier gebaut wird, muss auf einem Tastfeld genauso gehen wie mit der Maus.

Schichten hier:

1. **Reine Logik** — `shared/sequenceExecutor.js`,
   `client/src/utils/sequenceSteps.js`, `client/src/utils/objectTypes.js`
2. **Verdrahtung** — `client/src/pages/GameTable.jsx`,
   `client/src/components/SetupSequenceEditor.jsx` (der Client hat keine
   Testinfrastruktur, geprüft nur vom Vite-Build — **eine Ausnahme**, siehe Y2)

---

## Vorab: vier Stellen, an denen der Auftrag nachgeschärft werden musste

### 1. M11.1 Regel 3 ist keine Bauform, sondern eine Folge aus Regel 1 und 2

„Ein Klick, der nichts bewirkt, ist schlimmer als eine Fehlermeldung. Wo ein
Element verdeckt ist, darf der Klick nicht ins Leere gehen."

**Als eigene Vorrichtung ist das nicht umsetzbar.** Der Klick geht nämlich gar
nicht ins Leere — er trifft das Band, ein ganz normales Element. Dass der
Spieler etwas *darunter* meinte, weiß niemand. Wer es trotzdem bauen wollte,
müsste bei jedem Klick auf eine Leiste `document.elementsFromPoint` befragen,
den Stapel darunter nach etwas Bedienbarem durchsuchen und dann raten, ob der
Klick dorthin weitergereicht werden soll. Das Ergebnis wäre eine Leiste, deren
eigene Knöpfe manchmal nicht mehr funktionieren — ein zweiter Befund derselben
Art, nur schwerer zu finden.

**Erfüllt wird die Regel als Folge:** wenn kein Band ein Bedienelement
überdeckt (Regel 1) und jede Leiste sich wegräumen lässt (Regel 2), gibt es die
Lage nicht mehr, in der ein Klick ins Leere gehen kann. Genau so ist sie
umgesetzt. Sie bleibt eine Absichtserklärung — eine richtige.

### 2. M11.1 Befund B: der Tisch kennt keinen sichtbaren Bereich, den man versetzen könnte

Der Auftrag fragt, ob statt der Leiste der Tisch zu weit oben liegt, und ob ein
Versatz beim Einpassen die kleinere Antwort wäre.

**Es gibt kein Einpassen.** Weder `GameTable.jsx` noch ein Modul darunter
enthält eine Funktion, die den Tisch in den Bildausschnitt rechnet: die Kamera
wird frei geschwenkt und gezoomt, Startwerte kommen aus `state_data.views`
(M10.6) oder sind Vorgaben. Ein „Versatz beim Einpassen" hätte also nichts, wo
er hingehörte — man müsste das Einpassen erst erfinden, und dann würde es bei
jedem Schwenk wieder überschrieben. Das ist **mehr** Neues, nicht weniger.

Die Abnahme verlangt ohnehin das andere (Abnahme 2: „Die obere Zeile lässt sich
wegräumen und zurückholen"), und dafür gibt es seit M10.8 ein fertiges Muster
mit Knopf, Griff und 44 Pixeln. Zwei Zustände, zwei Knöpfe, kein neuer Begriff.

### 3. M11.2: das Zitat aus M8.4 steht nicht in M8.4

Die Spec schreibt: „M8.4 hat das ausdrücklich so gebaut: ‚`deal_to_zone` hört
auf die Kapazität der Zielzone und lässt den Rest im Stapel. Preis: liegen
schon welche, steht ein Protokolleintrag da. Ein eigener Auffüll-Schritt wäre
eine zweite Rechnung.'"

**Dieser Satz steht nirgends in M8.4** — dort steht nur „Heldentaten auf sechs
offene auffüllen (Solo-Regel S1)" als Schritt 6 der Dorfphase, also genau das
**Auffüllen**, das M11.2 vermisst. M8.4 hat das Verhalten nicht gewählt, es
hat es bestellt und nicht bekommen: die Zeile mit der Kapazitätsprüfung steht
als Kommentar im Executor (`A zone that does not take cards, or that is already
full, is not dealt into at all`) und stammt aus der Zonenrechnung, nicht aus
einer Entscheidung von M8.4.

**Damit gibt es kein Argument, das trägt oder nicht trägt.** Der einzige echte
Einwand ist der zweite Satz der Regel — „Eine zweite Rechnung neben
`zoneRoom`/`shareOut` soll es nicht werden" —, und der ist erfüllbar: `zoneRoom`
befragt `occupancy(state, zone)`, und genau die Funktion sagt auch, wie viele
schon liegen. Y3 rechnet nichts Zweites.

### 4. M11.3: die halbe Erklärung ist keine mehr — `audit-dead-controls.md` Fund 3 ist überholt

Die Spec beruft sich auf Fund 3 („das Kontextmenü kennt `customDie` nicht").
**Das ist seit M2.11 falsch.** `client/src/utils/objectTypes.js` führt alle acht
Objekttypen samt Löscher an einer Stelle, `server/test/object-types.test.js`
hält es fest, und `die`, `customDie` und `hitDie` stehen alle drei darin. Der
Fund wurde nur nie durchgestrichen. Berichtigt in Y4.

Die andere Hälfte — „und das Ziehen" — hält der Prüfung ebenfalls nicht stand:
beide Handler (`onMouseDown`, `onTouchStart`), der Nachschlag in `objLists`, der
Zweig in `handleObjDragMove` und der Rundruf in `handleObjDragEnd` waren für
alle drei Würfelsorten vorhanden. **Es gibt keinen fehlenden Zweig.** Was Y4
daraus macht, steht dort.

---

## Y1 — Kein Meldeband über einem Bedienelement

**Spec:** M11.1 Regel 1, Abnahme 1. **Schicht:** Verdrahtung.

**Ursache.** Drei Bänder standen auf einem geratenen Abstand:
`save-toast` (`fixed top-4 z-50`), `setup-issues` und `draw-toast` (beide
`fixed top-16 z-50`). Die Kopfleiste ist seit M8.10 **drei bis vier Zeilen
hoch** (Titelzeile, Aktionszeile, Setup-Banner, Token-Legende); `top-16` = 64 px
liegt mitten auf der Aktionszeile. `z-50` schlägt deren `z-40`.

Das ist **derselbe Fehler zum dritten Mal**. Die Kommentare im Code sagen es
selbst: das Setup-Banner lag „vorher `fixed top-4 right-4` und beanspruchte
damit einen Streifen, dessen Höhe es nie gemessen hat", die Token-Legende hing
„an `top: calc(4rem + …)` — derselbe geratene Streifen". Beide wurden von M2.8
in den **Fluss** der Kopfleiste geholt.

**Lösung.** Die drei Bänder werden ebenso zu Zeilen im Fluss derselben
Kopfleiste — als **letzte**, damit ein auftauchendes Band nichts verschiebt,
was schon dasteht. Eine Zeile im Fluss kann die Zeilen darüber nicht
überdecken, egal wie hoch sie wird, und `pointer-events-auto` am Band macht
sein × klickbar, wie bei Banner und Legende.

Nicht erfunden wird dabei: kein `pointer-events: none` auf dem Band (dann wäre
das × tot), keine höher gelegten Knöpfe (ein vierter geratener Abstand), kein
Wegschieben an den Bildrand.

## Y2 — Die obere Zeile lässt sich wegräumen

**Spec:** M11.1 Regel 2, Abnahme 2 und 3. **Schicht:** Verdrahtung.

`showTopBar` neben `showToolbar`, Einklappknopf am rechten Ende der Titelzeile,
Rückholgriff an derselben Stelle, wenn eingeklappt — Muster, Größe (44 px) und
Begründung von M10.8/U5 übernommen. Eingeklappt ist die Leiste **nicht da**,
womit auch Abnahme 3 fällt („ein Zug auf einer Rasterzeile … erreicht das
Raster — oder die Leiste ist dort nicht").

**Prüfung.** `server/test/table-bars.test.js` liest `GameTable.jsx` als Text.
Das ist eine Ausnahme von der Hausregel und wird hier begründet: was schiefgeht,
ist eine Stelle in der Auszeichnung, nicht eine Rechnung — ein reines Modul
hätte nichts, was es prüfen könnte. Der Test hält zwei Tatsachen fest: kein Band
steht wieder auf `fixed top-…`, und beide Leisten haben ein **Paar** aus
Einklappen und Zurückholen. Gegen den Stand vor dieser Änderung schlägt er in
allen drei Fällen fehl.

## Y3 — `deal_to_zone` kann auffüllen

**Spec:** M11.2, Abnahme 1–3. **Schicht:** reine Logik + Editor.

**Form: ein Feld `fill` am vorhandenen Schritt.** Nicht eine dritte Lesart von
`count`, und der Grund ist nicht Geschmack:

- **Eine negative Zahl ist nicht frei.** `count <= 0` heißt heute „der ganze
  Stapel" (`const wanted = count > 0 ? sorted.slice(0, count) : sorted`).
  `count: -6` hätte also schon eine Bedeutung; ihm eine zweite zu geben wäre
  die stille Umdeutung vorhandener Aufbauten.
- **Das Wort `fill` in `count`** machte aus einer Zahl eine Zahl-oder-Wort.
  `set_counter` hat genau das (R1/M8.4, vier Lesarten von `value`) und brauchte
  dafür eine eigene Formbestimmung (`counterValueForm`) plus eine Zeile in der
  Zusammenfassung, die sagt, welche Lesart gerade gilt — die Spec nennt das
  selbst als Kosten. Ein Zahlenfeld im Editor kann außerdem kein Wort liefern.
- **`fill` daneben** kostet: ein Wort in `STEP_TYPES`, ein `false` in
  `defaultStep`, einen Zweig in `describeStep`, ein Häkchen im Editor, drei
  Zeilen im Executor. `count` behält **eine** Bedeutung: sechs.

**Keine zweite Rechnung.** Abgezogen wird mit `occupancy(state, zone)` — genau
der Funktion, die `zoneRoom` zwei Zeilen darunter befragt. Die Prüfung steht
**vor** `zoneRoom`, weil eine volle Zone dort als Ablehnung zurückkäme und als
`skipped` im Protokoll landete: genau der Lärm, gegen den der Befund geht.
Liegt die Zahl schon aus, passiert nichts und steht nichts im Protokoll.

Die Beschriftung von `count` wechselt im Editor mit (`Cards` → `Up to`), und
die Zusammenfassung sagt `Fill zone "…" up to 6` statt `Deal 6 …` — sonst sähen
die beiden Lesarten in der Schrittliste gleich aus.

**Was offenbleibt:** der Haken muss am vorhandenen Schritt #23 der Dorfphase
einmal gesetzt werden. Das ist Spielstandsdaten (`setups.action_data`), keine
Codeänderung, und wird hier nicht angefasst.

## Y4 — Der Würfel: was wirklich fehlte

**Spec:** M11.3, Abnahme 1–3. **Schicht:** reine Logik + Verdrahtung.

**Abnahme 2 ist erfüllt, seit M2.11.** Rechtsklick auf jede der drei
Würfelsorten setzt `objType`, das Menü rendert Sperren und **Delete** aus
`objDeleters`, und `customDie` steht seit M2.11 in beiden Tabellen. Fund 3 des
Audits ist überholt und wird durchgestrichen.

**Abnahme 1 war verdrahtet.** Alle drei Sorten tragen `onMouseDown` *und*
`onTouchStart` auf `handleObjDragStart`, `objLists` kennt sie, `handleObjDragMove`
hatte für jede einen Zweig, `handleObjDragEnd` für zwei einen Rundruf. Es gibt
keinen fehlenden Zweig — der Befund lässt sich am Code nicht nachvollziehen,
und ohne Browser lässt er sich hier auch nicht nachstellen.

Was **bleibt**, sind zwei Ursachen, die beide nicht am Würfel hängen:

1. **Etwas lag darüber** — dieselbe Ursache wie M11.1 und M10.12. Ein Druck,
   der die Leiste trifft, erreicht weder `handleObjDragStart` noch
   `onContextMenu`; „kein Menü **und** kein Zug, aber der Roll-Knopf ist da"
   passt genau auf einen Würfel, der unter einer Leiste liegt. Y1 und Y2
   räumen das ab.
2. **Der Browser nahm den Wisch** — die Zeichenfläche trägt seit jeher
   `touch-action: none`, **kein einziges Tischobjekt** tut das. Auf einem
   Tastfeld darf der Browser einen Wisch über einem Würfel als Seitengeste
   nehmen und den angefangenen Zug mit `touchcancel` abbrechen. Eine Zeile am
   `world-transform-wrapper` deckt die ganze Kette ab (Karten, Token, Zähler,
   Notizen, Textfelder, alle drei Würfelsorten), statt acht Zeilen an acht
   Zeichenstellen.

**Und eine Vorbeugung, die der Befund verdient hat.** „Ein fehlender Zweig" war
die richtige Frage an der falschen Stelle: Ziehen und Sperren standen als
**zwei parallele if/else-Ketten** in `GameTable.jsx`, neben den beiden Tabellen
in `objectTypes.js`. Ein Typ, der in einer davon fehlt, ist unbeweglich bzw.
unsperrbar und sieht im JSX trotzdem fertig verdrahtet aus — Fund 3 noch einmal,
nur an der Bewegung. Beide Ketten sind jetzt `objectSetters` + `moveObject`,
geprüft in `server/test/object-types.test.js`. Das sind rund 30 Zeilen weniger
als vorher.

**Abnahme 3** (das Rollen bleibt) ist unberührt: an `rollDie`, `rollCustomDie`
und `rollHitDie` wurde nichts geändert.
