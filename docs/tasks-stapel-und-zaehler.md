# Aufgaben: Stapel ziehen und Zähler tippen (Spec M9.4, M9.5)

Vertrag ist `docs/spec-setup-system.md`, Abschnitte **M9.4** und **M9.5**.
Nummern sind `H…` (Handgriffe), damit sie weder mit T1–T9
(`tasks-kampfvorbereitung.md`), G1–G6 (`tasks-gelaendelage.md`),
F1–F4 (`tasks-grundflaeche.md`), S1–S6 (`tasks-szenarioflaeche.md`),
K1–K6 (`tasks-gelaendekarten.md`), B1–B6 (`tasks-blockaden.md`),
R1–R7 (`tasks-rundenwende.md`), V1–V5 (`tasks-gelaendeseite.md`),
N1–N8 (`tasks-bedienbarkeit.md`), A1–A5 (`tasks-startausruestung.md`),
D1–D5 (`tasks-aufdecken.md`), E1–E5 (`tasks-dauerstapel.md`),
Z1–Z7 (`tasks-ebenen.md`), L1–L6 (`tasks-marker.md`) noch
P1–P4 (`tasks-vorbedingung.md`) kollidieren.

**Gilt für jede Aufgabe.** Eine Fähigkeit ist erst fertig, wenn alle Schichten
stimmen, und **„nichts zu tun" ist eine gültige Antwort, aber nur eine
geprüfte.**

Tests laufen mit `cd server && npm test`; die Verdrahtung prüft
`cd client && npx vite build`.

---

## Vorab: vier Stellen, an denen der Auftrag nicht stimmte

### 1. Das Abheben der obersten Karte ist **Absicht**, keine Panne

`actualCardDragStart` hat für Stapel ab zwei Karten einen eigenen Zweig:
`pendingStackRef` plus `pressHoldTimerRef` mit `PRESS_HOLD_DELAY = 500`. Wer
**hält**, zieht den ganzen Stapel (mit `triggerHaptic('longPress')`); wer
**sofort zieht**, hebt die oberste Karte ab. Das ist die Geste aus Tabletop
Simulator, sauber gebaut, mit Rückfallzweig und Tastempfindung.

Falsch ist nicht die Geste, sondern die **Verteilung**: der alltägliche Griff
(den Stapel woandershin legen) kostet eine halbe Sekunde Warten, der seltene
(eine Karte abheben) ist die Vorgabe. Am Tisch hat niemand eine halbe Sekunde
gewartet, also wurde dreimal die oberste Karte abgehoben.

**Darum wird die Geste nicht erfunden, sondern umgedreht** (H1): der Zug am
Stapel verschiebt den Stapel, und zwar ohne Wartezeit. Der Zeitgeber fällt
ersatzlos weg.

### 2. Für das Abheben braucht es **keine** neue Geste — es gibt sie dreimal

Spec M9.4 Abnahme 3 verlangt, dass das Abheben möglich bleibt. Es ist schon
dreifach möglich, und alle drei Wege stehen im Kontextmenü:

| Weg | Wohin die Karte kommt |
|---|---|
| `Draw Card` | auf die **Hand** (richtig für Ausrüstung, M8.9) |
| `Reveal Top Card to "…"` | **offen** in eine Kartenzone (M8.9) |
| `Split Stack` mit Anzahl 1 | **verdeckt** neben den Stapel — genau das, was der Zug vorher tat |

`performSplit(stackId, 1)` legt die oberste Karte um eine Kartenbreite plus 30
nach rechts und löst den Reststapel auf, wenn nur noch eine Karte übrig ist.
Das ist wortwörtlich das alte Zugverhalten — nur, dass man es jetzt
**absichtlich** auslöst.

Es fehlt also keine Fähigkeit, sondern ein Klick: `Split Stack` verlangt einen
Dialog und eine getippte Zahl für den häufigsten Fall. Darum ein Eintrag
`Take Top Card`, der `performSplit(sid, 1)` ruft (H3) — **kein** neuer Code,
der dasselbe ein zweites Mal tut.

### 3. Abnahme 4 geht, aber ein Stapel wird als fünfzehn Objekte gezählt

Die Sorge aus dem Auftrag — `countInZone` liest `state.cards`, und die Karten
eines Stapels liegen unsichtbar in `stack.cards` — gilt für den **Executor**,
nicht für den Tisch. Am Tisch gibt es kein `state.cards`: `tableCards` trägt
*alle* Karten, und ein Stapel ist nichts als ein gemeinsames Feld `inStack`.
Die Trennung in `cards` und `stacks[].cards` entsteht erst in `getGameState`
beim Speichern. `handleCardDragEnd` hat den Stapelfall bereits vollständig:
`mine` sind alle Karten des gezogenen Stapels, `others` der Rest, und der
Schnappwert verschiebt den ganzen Stapel um `snapDx/snapDy`.

**Abnahme 4 ist also erfüllt, sobald H1 steht** — mit einem Rest:

```js
const others = tableCards.filter(c => !mine.has(c.tableId));
const refusal = zoneRejects(dropZone, 'card', countInZone(dropZone, others, tokens));
```

Liegt in der Zielzone ein **anderer** Stapel mit fünfzehn Karten, zählt
`countInZone` fünfzehn Belegungen. Eine Zone mit `capacity: 1` weist den Zug
dann ab, obwohl nur ein Ding darin liegt. Dasselbe gilt für `taken`, aus dem
`snapInto` die freien Plätze ableitet. Ein Stapel ist **ein** Ding — das ist
die Regel aus M9.4 Abnahme 1 („samt aller Karten"), einmal weitergedacht (H2).

### 4. Backspace: das Feld **ist** ein `<input>`, der Horcher ist unschuldig

Die vermutete Ursache trägt nicht. Das Zählerfeld ist ein
`<input type="text">`, und der globale Horcher steigt bei
`INPUT`/`TEXTAREA` ohnehin aus (`GameTable.jsx:999`) — er sieht `Backspace`
gar nicht, und er behandelt es nirgends. Im ganzen `client/src` kommt
`Backspace` kein einziges Mal vor.

Die Ursache steht drei Zeilen weiter oben im Klassennamen: der Tischrahmen
trägt `select-none` (`GameTable.jsx:4273`), also `user-select: none`. Das
**vererbt sich in jedes Kind**, auch in Eingabefelder. Ein Feld, in dem keine
Auswahl entstehen kann, hat auch keine Einfügemarke, auf die sich `Backspace`,
`Entf` oder `Strg+A` beziehen könnten — Tippen hängt hinten an, Löschen tut
nichts. Genau das Bild aus dem Befund: „Nichts ist markiert, obwohl es markiert
aussieht."

**Das ist keine Zähler-Eigenheit.** Betroffen ist **jedes** Eingabefeld am
Tisch: Notiz, Textfeld, Speichern-Dialog, Zähler-Dialog, Würfel-Dialog,
Teilen-Dialog. Die Antwort gehört deshalb ins Stylesheet und nicht in den
Zähler (H5) — das ist die dritte Stelle mit demselben Muster, nach der der
Auftrag fragt, und es sind acht.

### 5. Regel 1 und die relative Eingabe widersprechen sich **nicht**

Der Auftrag vermutet einen Konflikt: wer `+2` tippen will, wolle den alten Wert
nicht ersetzen. Das stimmt nicht — `+2` **ist** die ganze Eingabe. Das Plus ist
kein Verweis auf den Feldinhalt, sondern ein geschriebenes Vorzeichen, das
`counterValueForm` als „um zwei" liest. Der alte Wert im Feld ist zu keinem
Zeitpunkt ein Operand.

Der Befund beweist es andersherum: aus `−2` wurde `−2−3`, **weil** der alte
Wert stehenblieb. `Number("-2-3")` ist `NaN`, also tat `Enter` nichts. Der
markierte Wert beim Öffnen ist nicht das Gegenteil der relativen Eingabe, er
ist ihre Voraussetzung.

Gegen ein **leeres** Feld entschieden: der alte Wert soll sichtbar sein, sonst
weiß niemand, worauf `+2` rechnet. Markiert und sichtbar ist beides.

---

## H1 — Der Zug am Stapel verschiebt den Stapel

`client/src/pages/GameTable.jsx`.

`actualCardDragStart` behält `pendingStackRef` (damit ein **Klick** ohne Weg
den Stapel nur auswählt und ihn nicht auf das Raster rückt), verliert aber den
Zeitgeber. `handleCardDragMove` startet beim ersten Zeigerweg über 5 px den Zug
des **ganzen** Stapels statt die oberste Karte abzulösen. `pressHoldTimerRef`
und `PRESS_HOLD_DELAY` entfallen samt ihrer vier Aufräumstellen.

`handleCardDragEnd` schickt den Zug als `stack_move` in den Raum (H4).

**Abnahmekriterium.** Ein Zug am Stapel bewegt ihn samt aller Karten; die Zahl
im Namensschild ändert sich nicht (M9.4 Abnahme 1 und 2). Ein Klick ohne Weg
wählt den Stapel aus und verschiebt ihn nicht. Ein Stapel in einer Zone rastet
auf deren Platz ein (Abnahme 4). `npx vite build` läuft durch.

## H2 — Ein Stapel ist **ein** Ding in der Zone

`client/src/utils/stackDrag.js` (neu, reine Logik) mit `zoneOccupants(cards)`:
je Stapel ein Vertreter, lose Karten wie bisher, Reihenfolge erhalten.
Verdrahtet in `handleCardDragEnd` für `countInZone(...)` und `taken`.

Geprüft aus `server/test/stack-drag.test.js`.

**Abnahmekriterium.** Ein Stapel mit fünfzehn Karten in einer Zone zählt als
eine Belegung, nicht als fünfzehn. Eine Zone mit `capacity: 1`, in der ein
Stapel liegt, weist einen zweiten ab — und eine mit `capacity: 2` nimmt ihn.

## H3 — `Take Top Card` im Kontextmenü

`client/src/pages/GameTable.jsx`, Stapelabschnitt des Kontextmenüs, direkt
über `Draw Card`. Ruft `performSplit(stackId, 1)` — die Funktion, die
`Split Stack` schon benutzt. Kein neuer Ablauf: ein Klick statt Dialog plus
getippter Eins.

**Abnahmekriterium.** Rechtsklick auf einen Stapel zeigt `Take Top Card`; ein
Klick legt die oberste Karte verdeckt neben den Stapel, der Rest bleibt liegen
(M9.4 Abnahme 3). Bei zwei Karten löst sich der Reststapel auf.

## H4 — `stack_move` kommt im Raum an

`client/src/pages/GameTable.jsx` sendet es; `server/src/websocket/messageHandler.js`
findet den Stapel wieder.

Der Empfänger aus `docs/audit-dead-controls.md` Fund 9 **taugt nicht so, wie er
dasteht**: `handleStackMove` sucht `room.boardState.stacks.find(s => s.id === stack_id)`,
aber jeder Stapel im System heißt `stackId` — so legt ihn `sequenceExecutor.js`
an (`place_stack`, `clear_zone`), so serialisiert ihn `getGameState`, so liest
ihn `loadGameState`. Ein `id` trägt kein einziger. Der Sendeteil hätte also
gesendet und der Server hätte nichts gefunden: der Rundruf wäre angekommen, der
gespeicherte Raumzustand nicht — ein später hinzukommender Spieler sähe den
Stapel an der alten Stelle.

Dasselbe gilt für `handleStackCreate`, `handleStackMerge`, `handleStackTakeTop`,
`handleStackShuffle` und `handleCardDrawToHand`. Ein gemeinsamer Helfer
`findStack(room, stackId)` statt sechsmal dieselbe falsche Zeile.

Geprüft aus `server/test/stack-move-room.test.js`.

**Abnahmekriterium.** `stack_move` verschiebt den Stapel in `room.boardState`
und wird an die übrigen Spieler gesendet. Ein Stapel mit `id` statt `stackId`
(falls ein alter Stand so etwas trägt) wird weiterhin gefunden.

## H5 — Eingabefelder am Tisch sind wieder Eingabefelder

`client/src/index.css`: `input, textarea` bekommen `user-select: text` zurück.

**Hier und nicht am Zähler.** `select-none` steht am Tischrahmen und vererbt
sich in alle acht Eingabefelder der Seite. Ein `select-text` am Zählerfeld
flickte eines davon und ließe sieben stehen — dieselbe Familie wie die vier
Zählerlisten, gegen die `shared/counters.js` gebaut wurde.

**Abnahmekriterium.** `Backspace` löscht ein Zeichen, `Strg+A` markiert den
Feldinhalt, ein Doppelklick markiert ein Wort — im Zählerfeld **und** im
Notiz-, Textfeld-, Speichern-, Zähler-, Würfel- und Teilen-Dialog. Ein Zug auf
der leeren Fläche markiert weiterhin keinen Tischtext.

## H6 — Das Zählerfeld sagt, was es kann, und was schiefging

`shared/counters.js` bekommt `counterEdit(counter, raw)`: entweder
`{ value }` oder `{ reason }`. Es rechnet **nichts** neben `counterValue` —
es fragt sie und übersetzt ihr `null` in eine Auskunft. Zwei Gründe gibt es:
ein unlesbarer Wert, und `max` an einem Zähler ohne Obergrenze.

`GameTable.jsx`: das Feld markiert beim Öffnen seinen Inhalt
(`onFocus` → `select()`), trägt einen Platzhalter `21, +21, -21, max`, und
`commitCounterEdit` meldet einen `reason` über `setSetupIssues` — denselben
Kasten, in dem schon eine abgewiesene Zone ihren Grund nennt.

Geprüft aus `server/test/counter-edit.test.js`.

**Eine Decke, die bleibt.** Am Feld lässt sich ein **negativer** Wert nicht
*setzen*: `-3` trägt ein geschriebenes Vorzeichen und rechnet, also ergibt es
auf `-2` die `-5`. Genau das verlangt M9.5 Abnahme 3, und `counterValueForm`
tut es seit M8.4 so. Wer wirklich auf `-3` will, tippt die Differenz — oder der
Aufbau setzt sie über `set_counter` mit der JSON-Zahl `-3`, die kein
geschriebenes Vorzeichen trägt. Eine dritte Schreibweise (`=-3`) wäre eine
vierte Lesart und stünde im Widerspruch zu vier Stellen, die die drei schon
kennen.

**Der Zähler wird an vier Stellen gebaut** (`createCounter`, `place_counter`,
`getGameState`, `loadGameState`). **Keine davon ist betroffen:** H6 fügt kein
Feld hinzu, es ändert nur, was beim Tippen aus einer Zeichenkette wird. Geprüft,
nicht angenommen.

**Abnahmekriterium.** Nach dem Öffnen ersetzt Tippen den alten Wert
(Abnahme 1). `−3` auf `−2` ergibt `−5`, `3` auf `−2` ergibt `3` (Abnahme 3).
`−2−3` lässt den Wert unverändert und sagt es im Meldekasten (Abnahme 4).
`max` an einem Zähler ohne Obergrenze ebenso. Der Platzhalter nennt die vier
Lesarten (Regel 3).

---

## Was bewusst **nicht** dazugehört

- **Die stummen Zweige aus Fund 9 im Übrigen.** Mehrfachauswahl, Bretter und
  Textfelder senden weiterhin keine Bewegungsnachricht. Das ist derselbe
  Befund, aber nicht dieser — hier wird `stack_move` verdrahtet, weil M9.4 den
  Zug am Stapel baut.
- **Eine Obergrenze erzwingen.** `+5` über das `max` hinaus bleibt erlaubt;
  Regeln durchzusetzen ist nicht Aufgabe des Tisches (M4a).
- **Der Zeitgeber auf Berührungsgeräten.** `TOUCH_TAP_THRESHOLD` (150 ms)
  unterscheidet Tippen von Ziehen und bleibt, wie er ist — er hängt nicht am
  Stapel, sondern an jeder Karte.
