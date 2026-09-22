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

### 3. Kontextmenü kennt `customDie` nicht
Beim Rechtsklick auf einen Custom-Würfel wird `objType: 'customDie'` gesetzt, aber die
Objektliste im JSX und die Delete-Kette haben keinen solchen Zweig. Der Sperren-Knopf
beschriftet sich immer als „Lock", der Löschen-Knopf tut nichts und schließt nur das
Menü. Löschen geht noch über das ✕ am Würfel selbst.

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
- `showToolbar` — `useState(true)`, Setter nie aufgerufen; es gibt kein Ausblenden
- `useSwipeGesture.js` (253 Zeilen, drei Hooks) — kein Import; `GameTable` und
  `SwipeModal` haben je eigene Touch-Logik
- `touchUtils.js` — sieben exportierte Helfer ohne Aufrufer
- `detectedCorners` in `CameraCardScanner.jsx`, ungenutzte Importe in `GameTable.jsx`
  und `main.jsx`

## Geprüft und sauber

- `<button>` ohne `onClick`: außer „Save Current View" nur `type="submit"` in Formularen
- `STEP_TYPES` gegen den Executor: 12 zu 12, Feldlisten passen
- `toggleLockObj`: Brett-Zweig vorhanden
- Zonen zeichnen: Handler hängen an der Zeichenfläche
- Tastenkürzel-Legende gegen Listener: alle elf beidseitig
- Props aller Komponenten in beide Richtungen
- Client-Aufrufe auf nicht existierende Endpunkte: keine
- Zonen-Eigenschaften `accepts`/`capacity`/`layout`/`snap`/`exclusive`/`anchor`: alle
  konsumiert

## Nicht geprüft

Serverinterne Toterkennung außerhalb der Endpunktliste, die `test-feature-*.mjs` im
Wurzelverzeichnis, CSS-only-Zustände.
