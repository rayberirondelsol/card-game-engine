# Audit: unerreichbare und wirkungslose Fähigkeiten

Stand 2026-09-22, Client (`client/src/`) plus Endpunktabgleich. Anlass: fünf einzeln
gefundene Fälle, in denen eine fertige Fähigkeit keine Bedienung hatte.

## Das Muster

**Eine Fähigkeit wird in einer Schicht fertiggebaut und in der Nachbarschicht nicht
nachgezogen.** Handler ohne Bindung, Vokabelliste ohne den neuen Fall, Knopf ohne
Handler, geschriebenes Feld ohne Leser. Der Code ist nie falsch, er ist *unvollständig
verkabelt* — und weil jede Schicht für sich baut und testet, fällt es nicht auf.

Häufigste Ausprägung hier: **Vokabellisten, die hinter der Logik zurückbleiben.**
Zweite: **aufgegebene Features, deren Reste noch verdrahtet aussehen.**

## Funde, nach Auswirkung

### 1. Neun Mehrspieler-Aktionen, die kein Client je sendet
`server/src/websocket/messageHandler.js` implementiert und broadcastet sie,
`GameTable.jsx` ruft für keine `room.sendAction(...)` auf:

`card_play_from_hand` · `counter_update` · `dice_roll` · `note_edit` ·
`stack_move` · `stack_take_top` · `stack_create` · `stack_merge` · `stack_shuffle`

Die letzten drei haben auch clientseitig keinen Empfänger.

**Folge:** In einer Mehrspielerpartie sehen die anderen weder Stapel bilden, mischen,
teilen oder abheben, noch Würfelwürfe, Zähler, Notiz-Änderungen oder eine
ausgespielte Handkarte. Server-Logik und Broadcast sind fertig, nur der Auslöser fehlt.

Korrekt verdrahtet sind dagegen `drawCardsFromStack`, `handleCardDragEnd`, `createToken`.

### 2. Zonen-Kamerastart: geschrieben, nie gelesen
`cameraX` / `cameraY` / `cameraZoom` werden an drei Stellen geschrieben
(`zoneDraft.js` bei `createZone` und bei jedem Move/Resize, `ZoneEditor.jsx` bei den
Presets) und **nirgends im Repo gelesen** — nur in zwei Tests als Assertion.

Die Schaltfläche „Save Current View" (`ZoneEditor.jsx`) hat zusätzlich kein `onClick`.
Selbst mit Handler passierte nichts: es gibt keinen Konsumenten, der eine Kamera auf
eine Zone setzt. Der fehlende Handler ist die Spitze, nicht das Problem.

**Erledigt in M10.6** (`docs/tasks-ergonomie.md`, U3/U4) — aber **nicht durch
Wiederbeleben**. Die Felder sind gar keine gespeicherte Ansicht: `createZone`
setzt sie bei *jeder* Zone auf die Rechteckmitte, es gibt also keine Zone ohne
Kamera, und eine Auswahl daraus haette die vierzig Eintraege, die M10.6 Regel 3
ausdruecklich verbietet. Benannte Ansichten liegen jetzt am **Spielstand**
(`state_data.views`) und werden am Tisch angelegt; die Schaltflaeche ohne
Handler ist entfernt, die Zonenfelder bleiben tot und harmlos liegen.

### 3. ~~Kontextmenü kennt `customDie` nicht~~
~~Beim Rechtsklick auf einen Custom-Würfel wird `objType: 'customDie'` gesetzt, aber die
Objektliste im JSX und die Delete-Kette haben keinen solchen Zweig.~~

**Behoben in M2.11**, und das ist der Anlass für `client/src/utils/objectTypes.js`:
`objectLists` und `objectDeleters` führen alle acht Typen an einer Stelle, geprüft in
`server/test/object-types.test.js`. Alle drei Würfelsorten (`die`, `customDie`,
`hitDie`) haben Sperren und Löschen.

**Der Fund stand trotzdem noch hier** und hat M11.3 in die Irre geführt („das
Kontextmenü kennt `customDie` nicht" — das ist seit M2.11 falsch). Berichtigt bei
M11.3; die verbliebene Hälfte des Musters lag woanders: **Ziehen** und **Sperren**
waren zwei weitere if/else-Ketten in `GameTable.jsx`. Sie sind jetzt dieselbe Tabelle
(`objectSetters`), aus demselben Grund.

Dieselbe Klasse wie der Brett-Sperren-Fehler aus M2.6.

### 4. `card-split.js` ist nie registriert
Die Datei definiert `analyze-split`, `execute-split`, `auto-import` und
`upload-and-detect`, wird in `server/src/index.js` aber nicht importiert. Die ersten
drei existieren dupliziert in `cards.js` — darüber läuft das Feature.

Kein Funktionsverlust, aber **eine Landmine**: registriert man sie nachträglich,
wirft Fastify beim Start wegen doppelter Routen.

### 5. Kein Abmelden
`POST /api/auth/logout` existiert, wird nirgends aufgerufen, und es gibt **keinen
Abmelden-Knopf** in der Oberfläche. Eine Sitzung lässt sich nicht beenden.

### 6. Reste aufgegebener Features
- `HoverCard.jsx` (192 Zeilen) — importiert, nirgends gerendert; ersetzt durch die
  ALT-Lupe
- `mousePosition` — Setter nie aufgerufen, Wert nie gelesen
- `showHitDiceModal` + `dismissHitDiceModal()` — das Modal existiert nicht mehr.
  **Mit echtem Nebeneffekt:** `createHitDie` schließt das tote Modal statt des
  Würfel-Modals, aus dem es aufgerufen wird → nach dem Platzieren eines Hit-Würfels
  bleibt das Würfel-Modal offen.
- ~~`showToolbar` — `useState(true)`, Setter nie aufgerufen; es gibt kein
  Ausblenden~~ — **behoben in M10.8** (`docs/tasks-ergonomie.md`, U5): der
  Zustand war richtig, es fehlte nur der Aufrufer. Einklappen in der Leiste,
  Ausklappen ueber einen Griff ausserhalb.
- `useSwipeGesture.js` (253 Zeilen, drei Hooks) — kein Import; `GameTable` und
  `SwipeModal` haben je eigene Touch-Logik
- `touchUtils.js` — sieben exportierte Helfer ohne Aufrufer
- `detectedCorners` in `CameraCardScanner.jsx`, ungenutzte Importe in `GameTable.jsx`
  und `main.jsx`

## Geprüft und sauber

- `<button>` ohne `onClick`: außer „Save Current View" nur `type="submit"` in Formularen
- ~~`STEP_TYPES` gegen den Executor: 12 zu 12~~ — **ueberholt**, seit M8.4/M8.8/M8.9/M8.10 sind es mehr; die Gleichheit wird in `sequence-steps.test.js` gehalten
- `toggleLockObj`: Brett-Zweig vorhanden
- Zonen zeichnen: Handler hängen an der Zeichenfläche
- ~~Tastenkürzel-Legende gegen Listener: alle elf beidseitig~~ — **war falsch**, siehe Fund 11
- Props aller Komponenten in beide Richtungen
- Client-Aufrufe auf nicht existierende Endpunkte: keine
- Zonen-Eigenschaften `accepts`/`capacity`/`layout`/`snap`/`exclusive`/`anchor`: alle
  konsumiert

## Nicht geprüft

Serverinterne Toterkennung außerhalb der Endpunktliste, die `test-feature-*.mjs` im
Wurzelverzeichnis, CSS-only-Zustände.

---

## Nachtrag: Funde aus den Partien und den Umbauten M7.2–M8.11

### 7. Aktionen laufen im Mehrspieler-Raum gar nicht

`MultiplayerGame.jsx` liest `action_data` nie. „Kampf beginnen" und „Dorfphase
beginnen" gibt es dort also nicht — im Raum ist die Partie nicht führbar.
Dasselbe Muster wie Fund 1, eine Ebene höher.

### 8. Zonen werden nur im Raum gezeichnet

`ZoneOverlay` hängt in `GameTable.jsx` ausschließlich im `{room && (…)}`-Zweig.
**Am Hotseat-Tisch ist keine einzige Zone sichtbar** — weder Rahmen noch
Namensschild. Die Solopartie, für die das Ganze gebaut ist, sieht also nichts
von den vierzig Zonen. Raster haben für die Gegenrichtung ein `showInPlay`;
Zonen haben nichts Vergleichbares, weshalb im Raum umgekehrt **alle** gezeichnet
werden, auch die vierzehn Leisten-Zonen über dem Aufdruck.

### 9. `stack_move` und die stummen Kartenzüge

~~Der Empfänger für `stack_move` existiert, **der Client sendet es nie**.~~
**Teilweise behoben in M9.4** (`docs/tasks-stapel-und-zaehler.md`, H4): seit ein
Zug am Stapel den Stapel verschiebt, sendet `handleCardDragEnd` die Nachricht.
Der Empfänger taugte dabei **nicht**, wie er dastand — er suchte
`stacks.find(s => s.id === …)`, während jeder Stapel im System `stackId` heißt
(Executor, `getGameState`, `loadGameState`). Er hätte nie etwas gefunden:
Rundruf ja, gespeicherter Raumzustand nein. Betroffen waren auch
`stack_create`, `stack_merge`, `stack_take_top`, `stack_shuffle` und
`card_draw_to_hand`; alle sechs gehen jetzt über `findStack`.

Der Rest des Fundes steht unverändert: der **Mehrfachauswahl**-Zweig von
`handleCardDragEnd` sendet weiterhin **gar keine** Nachricht, im Raum bewegt
sich dabei nichts.
Und **Bretter und Textfelder haben überhaupt keine Bewegungsnachricht** — ein
im Raum verschobenes Brett zieht die daran verankerten Rasterfelder und Zonen
mit, ohne dass es jemand erfährt.

### 10. Die Brettliste `boards` lässt sich nicht füllen

Es gibt eine eigene Liste `boards`, die mit `zIndex: 1` gezeichnet wird, aber
`setBoards` wird nur beim Laden und Löschen gerufen. `place_asset` und
`build_scenario` schieben ausnahmslos in `state.tokens`. Hauptplan und
Zusatz-Brett sind also Token wie jedes andere Stück.

### 11. Die Tastenkürzel-Hilfe log an fünf Stellen

Nachgeprüft bei M8.9: `F` wirkt nur auf ausgewählte **Karten**, nie auf einen
Stapel — die Hilfe versprach „Flip card/stack". `1-9` sagt nicht, dass es auf
die **Hand** zieht. `Escape` und `Shift+Click` fehlten ganz, obwohl beide
Horcher existieren. „Click + Drag: Pan the table" gilt nur auf der leeren
Fläche (`canStartPan`). Berichtigt; die Zeile für das Aufdecken fehlt bewusst,
weil es keine Taste hat.

### 12. Zwei Ungenauigkeiten in der Zonenrechnung

`handleObjDragEnd` baut seine Liste der belegten Plätze mit `zoneContains`
statt mit `objectsInZone` — das **Ankerobjekt** der Zone wird mitgezählt.
Genau dagegen wurde `objectsInZone` gebaut. Und die vier Leisten-Zonen eines
Dörfler-Tableaus **überlappen sich** um rund zwei Einheiten; `zoneAt` nimmt die
zuletzt eingetragene, ein in den Überlappungsstreifen gezogener Marker rastet
also in die Nachbarleiste. Beides folgenlos, solange die Plätze weit genug
innen liegen — aber es ist Zufall, nicht Absicht.

### 13. Der Zählerabstand läuft ins Unendliche

`createCounter` rechnete `counters.length * 160`: ab dem sechsten Zähler stand
der nächste 800 Punkte rechts, ab dem zehnten außerhalb jedes Bildes.
Behoben in M8.6 über `shelfSlot`; hier notiert, weil es dieselbe Familie ist
wie M8.1 — eine Position aus einer unbegrenzten Listenlänge.
