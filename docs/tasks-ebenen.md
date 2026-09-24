# Aufgaben: Ebenen und der leere Tisch (Spec M9.1, M9.2)

Vertrag ist `docs/spec-setup-system.md`, Abschnitte **M9.1** und **M9.2**.
Nummern sind `Z…` (Zeichenreihenfolge), damit sie weder mit T1–T9
(`tasks-kampfvorbereitung.md`), G1–G6 (`tasks-gelaendelage.md`),
F1–F4 (`tasks-grundflaeche.md`), S1–S6 (`tasks-szenarioflaeche.md`),
K1–K6 (`tasks-gelaendekarten.md`), B1–B6 (`tasks-blockaden.md`),
R1–R7 (`tasks-rundenwende.md`), V1–V5 (`tasks-gelaendeseite.md`),
N1–N8 (`tasks-bedienbarkeit.md`), A1–A5 (`tasks-startausruestung.md`),
D1–D4 (`tasks-aufdecken.md`), L1–L6 (`tasks-marker.md`) noch E1–E…
(`tasks-dauerstapel.md`) kollidieren. `M` bleibt den Spec-Abschnitten.

**Gilt für jede Aufgabe.** Eine Fähigkeit ist erst fertig, wenn alle Schichten
stimmen, und **„nichts zu tun" ist eine gültige Antwort, aber nur eine
geprüfte.** Tests laufen mit `cd server && npm test`.

Schichten hier:

1. **Reine Logik** — `client/src/utils/tokenLayer.js`, `shared/tableState.js`
2. **Verdrahtung** — `client/src/pages/GameTable.jsx` (nur vom Vite-Build
   geprüft, der Client hat keine Testinfrastruktur)
3. **Serverroute** — `server/src/routes/saves.js`

---

## Vorab: vier Stellen, an denen der Auftrag nachgeschärft werden musste

### 1. „Je größer die Fläche, desto weiter hinten" ist für Karten zu grob — aber nicht falsch

Die Regel aus M8.2 ordnet **Flächen**, nicht Objekte: alle Token gleicher
Fläche bekommen **denselben** `z-index`, und darunter entscheidet das DOM.
Für Token trägt das. Für Karten nicht: Karten eines Decks sind alle gleich
groß, bekämen also alle dieselbe Zahl — und die Reihenfolge, die M8.9
(Nachtrag 2) gerade erst hergestellt hat, wäre wieder weg. Zwei offen
abgelegte Karten in derselben `layout: "stack"`-Zone liegen genau übereinander;
was oben liegt, sagt allein der `zIndex` der Karte.

**Die Regel bleibt, der Tie-Break wird benutzt.** M8.2 sagt selbst: „Bei
gleicher Fläche bleibt es beim bisherigen Verhalten." Das bisherige Verhalten
ist je Objektart ein anderes — bei Token die DOM-Reihenfolge, bei Karten ihre
eigene Reihe. Beides lässt sich in **eine** Zahl schreiben, wenn die Ordnung
**Objekte** durchnummeriert statt Flächen:

```
sortiere alle Tischobjekte nach Fläche absteigend,
bei gleicher Fläche in ihrer bisherigen Reihenfolge,
z = 20 + Position
```

Für Token ändert sich dadurch **nichts Sichtbares**: zwei gleich große Token
bekommen jetzt 24 und 25 statt zweimal 24, und der mit 25 ist derselbe, der
vorher als späterer im DOM oben lag (Abnahme 5, M8.2 Abnahme 4). Für Karten
fällt die eigene Reihe als Tie-Break hinein und bleibt damit erhalten.

Das ist **keine Sonderregel je Objektart**. Die einzige Angabe, die je
Objektart dazukommt, ist die **Fläche** — und die ist eine Messung, keine
Regel. Bei Token steht sie im Datensatz, bei Karten liefert sie `getCardDims`,
bei Würfel, Zähler, Notiz und Textfeld ist es der Kasten, den sie zeichnen.

### 2. Die feste Ablagestelle ist **nicht** der zweite Fehler

Der Auftrag vermutet, `shelfSlot` „breche in einen Bereich um, den ein Brett
überdeckt". Das stimmt nicht: `shelfSlot` läuft von `(250,300)` bis
`(700,1200)` — der Bereich liegt von Platz 0 an **vollständig** auf dem
Hauptplan (1200×1000 ab dem Ursprung). Es bricht nichts um; die Ablage lag noch
nie neben dem Brett.

Damit ist die feste Stelle aber auch nicht die Ursache. Sie entscheidet, **wo**
ein Ding liegt, nicht **ob** man es sieht und anfassen kann. Liegt es oben,
ist es auf dem Brett sichtbar und ziehbar — Abnahme 4 ist damit erfüllt.
**Eine Ursache, eine Änderung.**

Was bleibt, steht in **Z7** als geprüftes „nicht jetzt": `createDie`,
`createCustomDie` und `createHitDie` rechnen ihre Stelle aus `canvas.width/2`,
also aus einer **Bildschirm**breite in **Welt**koordinaten — ein eigener
Fehler, der mit M9.1 nichts zu tun hat und den `shelfSlot` nicht ohne weiteres
löst (vier Objektarten fingen dann alle bei Platz 0 an und lägen aufeinander).

### 3. Die Sperre gehört in den Speicherpfad — und zwar auf den Server

M9.2 Regel: „Ein Tisch, auf dem **nichts** liegt, überschreibt keinen
**gefüllten** Speicherstand." Der Client kann diese Regel gar nicht umsetzen:
er weiß nicht, was gespeichert **ist**. Nur die Route kennt beide Seiten.

`/play/<id>` ist der falsche Ort. Dort einen leeren Tisch abzuweisen, hieße das
Laden zu ändern — und M9.2 schiebt genau das ausdrücklich weg („Ob ‚Play Game'
zusätzlich den letzten Stand laden soll, ist eine zweite Frage").

Dazu kommt der eigentliche Befund: **der Client hat die Sperre schon, an einer
von zwei Stellen.** `performAutoSave` prüft auf leeren Tisch, der
`beforeunload`-Pfad daneben prüft **nichts** und schreibt beim Verlassen der
Seite ungefragt. Genau das passt zum Befund „binnen Sekunden leer": Tisch
aufmachen, wieder weg — und der leere Stand steht. Eine Sperre in der Route
fängt beide Pfade und jeden dritten, der später dazukommt.

Und die vorhandene Prüfung ist unvollständig: sie zählt `tableCards`,
`handCards`, `tokens`, `counters`, `dice`, `notes` — **nicht** `customDice`,
`hitDice`, `textFields`, `boards`. Ein Tisch mit nur eigenen Würfeln gilt ihr
als leer und wird nie gespeichert.

### 4. Es gibt mehr Objektarten als die fünf aus der Tabelle

Im `world-transform-wrapper` liegen **neun** Sorten, nicht fünf:

| Sorte | `z-index` vorher | Ursache |
|---|---|---|
| `boards` | `1` (inline) | – |
| `tableCards` | `card.zIndex`, eigene Reihe ab 1 | M9.1 |
| `textFields` | `15` (inline) | M9.1 |
| `counters` | `z-20` (Klasse) | M9.1 |
| `dice` | `z-20` | M9.1 |
| `customDiceOnTable` | `z-20` | M9.1 |
| `hitDice` | `z-20` | M9.1 |
| `notes` | `z-20` | M9.1 |
| `tokens` | `tokenLayers` → 20 … n | – |

`z-20` ist derselbe Wert wie der **größte** Token (der Hauptplan), und die
Token stehen im JSX **nach** Würfeln, Zählern und Notizen — bei gleichem Wert
gewinnt der spätere. Deshalb verschwindet ein Würfel unter dem Hauptplan,
obwohl beide „20" tragen. Das ist die genaue Mechanik des Befunds.

`boards` bleibt bei `1` — siehe **Z5**.

---

## Z1 — Die Ordnung nummeriert Objekte, nicht Flächen

`tokenLayers(tokens)` in `client/src/utils/tokenLayer.js` bildet Fläche →
`z-index`. Das wird zu `tableLayers(items)`: eine Liste von
`{ key, width, height, size? }` in der Reihenfolge, die bei gleicher Fläche
gelten soll, und heraus kommt `(key) => z`.

- Sortiert wird nach `tokenArea` absteigend, bei Gleichstand nach
  Eingabeposition aufsteigend (ausdrücklich, nicht auf die Stabilität von
  `Array#sort` vertrauend).
- `z = TOKEN_Z_FLOOR + Position`. `TOKEN_Z_FLOOR` bleibt 20: nach unten
  rutschte der Hauptplan unter die Raster-Überlagerung (`z-10`).
- Ein unbekannter `key` bekommt `TOKEN_Z_FLOOR` — derselbe Rückfall wie bisher.

`tokenLayers` wird **ersetzt**, nicht danebengestellt: zwei Antworten auf
dieselbe Frage sind genau das, was M8.2 vermeiden wollte.

`server/test/token-layer.test.js` zieht mit. Die eine Zusicherung, die auf der
Flächen-Semantik beruhte („zwei Stücke gleicher Größe bekommen **denselben**
Wert"), wird zu dem, was M8.2 Abnahme 4 wirklich verlangt: der spätere liegt
oben, der frühere darunter. Das Verhalten am Tisch ist unverändert.

**Abnahme.** M8.2 Abnahme 1–4 gelten weiter (Figur über Gelände, Hauptplan
hinter allem, Fläche statt Kante, leere Liste wirft nicht).

## Z2 — Karten behalten ihre Stapelreihenfolge

Karten gehen mit ihrer Anzeigefläche (`getCardDims`) in die Ordnung und
**nach `card.zIndex` aufsteigend sortiert**. Karten gleicher Größe landen damit
in derselben Reihenfolge, die ihre eigene Reihe vorgibt.

**Abnahme.**
1. Zwei gleich große Karten, `zIndex` 3 und 7: die mit 7 liegt oben.
2. Beide liegen über einem Token, das mehr Fläche belegt.

## Z3 — Die Bedienwidgets bekommen ihre gemessene Fläche

Würfel, Zähler, Notiz und Textfeld tragen keine Maße im Datensatz; ihr Kasten
steht im JSX. `WIDGET_BOX` in `tokenLayer.js` hält diese Maße — Messung, nicht
Regel, und an derselben Stelle wie die Ordnung, die sie liest:

| Sorte | Kasten | Quelle im JSX |
|---|---|---|
| `die` | 70×70 | `left: die.x - 35`, `minWidth: 70px` |
| `hitDie` | 76×84 | `left: die.x - 38`, `top: die.y - 42` |
| `customDie` | 80×96 | `left: die.x - 40`, `top: die.y - 48` |
| `counter` | 140×80 | `left: counter.x - 70`, `top: counter.y - 40` |
| `note` | 160×100 | `left: note.x - 80`, `top: note.y - 50` |
| `textField` | 160×40 | kein fester Kasten, Nennmaß |

**Abnahme.** Ein Würfel liegt über einem Zähler, ein Zähler über einer Notiz —
und alle vier über jedem Brett.

## Z4 — Verdrahtung am Tisch

`GameTable.jsx` baut die Liste einmal je Änderung (`useMemo`) und fragt an
jeder Zeichenstelle `layerZ(key)`. Schlüssel sind `token:<id>`,
`card:<tableId>`, `die:<id>`, `hitDie:<id>`, `customDie:<id>`, `counter:<id>`,
`note:<id>`, `textField:<id>` — mit Präfix, weil zwei Sorten sonst dieselbe
`id` tragen könnten.

Die Klasse `z-20` verschwindet an allen fünf Widget-Stellen und `zIndex: 15`
beim Textfeld: **zwei Werte an einem Element** war schon bei M8.2 der Grund,
die Klasse zu entfernen.

Unberührt bleibt `zIndex: isDragging ? 9999 : …` bei der Karte — der gezogene
Gegenstand liegt weiter über allem, und 9999 bleibt außer Reichweite
(die Ordnung zählt Objekte, nicht Pixel).

**Abnahme.** M9.1 Abnahme 1–5. `cd client && npx vite build` läuft durch.

## Z5 — `boards` bleiben bei `z-index: 1` (nichts zu tun, geprüft)

Die Board-Widgets sind das **größte**, was auf dem Tisch liegt; nach der Regel
gehören sie ganz nach hinten, und `1` **ist** ganz hinten. Sie in die Ordnung
zu nehmen, hieße sie auf ≥ 20 zu heben — also über die Raster-Überlagerung
(`z-10`) und über alles, was die Ordnung nicht kennt. Gewonnen wäre nichts.

Ein Nebeneffekt fällt trotzdem ab: Karten begannen bei `zIndex: 1` wie die
Bretter, und bei Gleichstand gewann das Brett (es steht später im JSX). Nach
Z4 liegen Karten bei ≥ 20 und damit sicher darüber.

## Z6 — Der leere Tisch überschreibt nichts (Server)

`shared/tableState.js`: `tableObjectCount(state)` zählt die Objektlisten eines
Spielstands (`cards`, `stacks`, `hand`, `counters`, `dice`, `hitDice`,
`customDice`, `notes`, `tokens`, `boards`, `textFields`) und nimmt sowohl das
Objekt als auch den JSON-Text, weil der Server ihn so speichert.
`isEmptyTableState(state)` ist `tableObjectCount(state) === 0`.

**Leer heißt keine Objekte**, nicht „keine Änderung": `camera`, `background`,
`stackNames` und `maxZIndex` zählen nicht mit. Ein Tisch, auf dem nur die
Kamera verschoben wurde, ist nicht leer — er hat Objekte.

`POST /api/games/:id/saves/auto` liest den vorhandenen Auto-Stand mit
(`SELECT id, state_data`) und antwortet **409**, wenn der eingehende Stand leer
und der vorhandene gefüllt ist. Der gespeicherte Stand bleibt unangetastet.

Die engst mögliche Fassung: leer über leer geht weiter durch, der erste
Auto-Stand eines neuen Spiels auch, und `POST /api/games/:id/saves` (der
ausdrückliche Befehl mit Namen) ist gar nicht betroffen.

**Abnahme.** M9.2 Abnahme 1–3.

## Z7 — Der Client schickt den leeren Stand gar nicht erst

Beide Client-Pfade (`performAutoSave` und `handleBeforeUnload`) fragen
dieselbe `isEmptyTableState` — die handgeschriebene Liste in `performAutoSave`
verschwindet damit samt ihrer vier Lücken (`customDice`, `hitDice`,
`textFields`, `boards`).

Das ist Gürtel **und** Hosenträger, und beides ist begründet: der Server ist
die Regel, der Client spart die sinnlose Anfrage — und der `beforeunload`-Pfad
ist der, der es zweimal verloren hat.

**Offen geblieben, ausdrücklich nicht jetzt:** `createDie`, `createCustomDie`
und `createHitDie` legen neue Würfel auf `canvas.width/2` — eine
Bildschirmbreite als Weltkoordinate. Wer weit gepannt hat, legt den Würfel
außer Sicht. `shelfSlot` wäre die vorhandene Antwort, braucht aber einen
**gemeinsamen** Zähler über Würfel, eigene Würfel, Trefferwürfel und Zähler,
sonst fangen vier Sorten bei Platz 0 an. Eigener Schritt.
