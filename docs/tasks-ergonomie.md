# Aufgaben: Ergonomie am vollen Tisch (Spec M10.6–M10.9)

Vertrag ist `docs/spec-setup-system.md`, Abschnitte **M10.6**, **M10.7**,
**M10.8** und **M10.9**. Nummern sind `U…`, weil T, G, F, S, K, B, R, V, N, A,
D, E, Z, L, P, H, W und J belegt sind und `M` den Spec-Abschnitten bleibt. `U`
und nicht `I` oder `O`, weil `I1` und `O1` wie `11` und `01` aussehen — dieselbe
Begründung wie bei `J`.

**Gilt für jede Aufgabe.** Eine Fähigkeit ist erst fertig, wenn alle Schichten
stimmen, und „nichts zu tun" ist eine gültige Antwort, aber nur eine geprüfte.
Tests laufen mit `cd server && npm test`, der Bau mit `cd client && npx vite build`.

**Gilt für alle vier Befunde:** was hier gebaut wird, muss auf einem Tastfeld
genauso gehen wie mit der Maus. Die Engine hat neunzehn Berührungshandler,
Langdruck-Vorschau, Langdruck-Menü und Doppeltipp — eine Fähigkeit, die nur
eine Taste kennt, ist auf dem Tastfeld keine.

Schichten hier:

1. **Reine Logik** — `client/src/utils/panTarget.js`, `client/src/utils/tableViews.js`,
   `client/src/utils/cardDrop.js`
2. **Verdrahtung** — `client/src/pages/GameTable.jsx`, `client/src/components/ZoneEditor.jsx`
   (nur vom Vite-Build geprüft, der Client hat keine Testinfrastruktur)

---

## Vorab: fünf Stellen, an denen der Auftrag nachgeschärft werden musste

### 1. M10.6 — die Zonenfelder sind keine gespeicherte Ansicht, sondern eine ausgerechnete Mitte

Der Auftrag fragt, ob die Zone der richtige Träger ist. **Sie ist es nicht**,
und der Beweis steht im Schreiber selbst:

```js
// zoneDraft.js, createZone – bei *jeder* neuen Zone
const c = zoneCenter(zone);
zone.cameraX = Math.round(c.x);
zone.cameraY = Math.round(c.y);
zone.cameraZoom = 1.0;
```

und beim Verschieben und beim Skalieren dasselbe (`geometry()`). Die Felder
sind **nie leer**. Sie tragen keine Entscheidung eines Menschen, sondern die
Mitte des Rechtecks bei Zoom 1 — eine Zahl, die man aus `x/y/width/height`
jederzeit wieder ausrechnen könnte.

Damit ist **M10.6 Abnahme 3 mit diesen Feldern unerfüllbar**: „Zonen ohne
Ansicht stehen nicht in der Auswahl" — es gibt keine Zone ohne Ansicht. Die
Auswahl hätte genau die vierzig Einträge, die die Regel selbst als „schlimmer
als das Problem" bezeichnet. Ein `cameraSaved: true` daneben würde es
reparieren, aber nur den Symptomteil.

Der zweite, größere Einwand: **was gebraucht wird, sind keine Zonen.** Der
Befund nennt „Hauptplan y 60–1060" und „Dörflerbereich y 1400–1800". Für den
Dörflerbereich gibt es keine Zone; um eine zu bekommen, müsste man ein leeres
Rechteck über vier Tableaus legen — und ein solches Rechteck ist am Tisch
**kein stummer Merkzettel**, sondern ein Ablageziel: `zoneAt` findet es,
`zoneRejects` befragt es, `snapInto` rastet hinein, und laut
`audit-dead-controls.md` Fund 12 nimmt `zoneAt` bei Überlappung ohnehin die
zuletzt eingetragene. Man bezahlt eine Ansicht mit einem Loch im Ablageverhalten.

Der dritte: **der Ort stimmt auch nicht.** „Save Current View" steht im
`ZoneEditor`, und der ist nur über `?mode=setup` erreichbar (CLAUDE.md) — am
Spieltisch gibt es ihn nicht. Der Befund ist aber ein Befund **aus der Partie**:
fünfzehn Ausflüge in einem Kampf. Wer die Ansicht braucht, sitzt am Tisch und
kann sie dort nicht anlegen.

**Der richtige Träger ist das Spiel, nicht die Zone** — eine kurze Liste
benannter Ansichten `{label, x, y, zoom}`. Und sie kostet **keine Migration**:
`state_data` ist beim Server ein undurchsichtiger JSON-Text, in dem schon
`camera`, `background`, `stackNames` und `maxZIndex` stehen. Eine Liste mehr
ist eine Zeile in `getGameState` und eine in `loadGameState`; sie wird
mitgespeichert, mit-autogespeichert und mitgeladen, je Spielstand.

**Die toten Zonenfelder bleiben, wo sie sind** (zwei Tests halten sie fest,
und sie stören nichts). Der Knopf „Save Current View" **geht**: ein Knopf ohne
Handler, dessen Versprechen woanders eingelöst wird, ist die schlechteste der
drei möglichen Fassungen.

### 2. M10.7 — die mittlere Maustaste ist seit jeher verdrahtet

Die Regel verlangt „einen Weg, von jeder Stelle aus zu schwenken … die mittlere
Maustaste ist die gewohnte". Sie ist bereits da, an beiden Stellen:

```js
if (e.button === 1 || (e.button === 0 && canStartPan(e.target, canvas, container)))
```

(`handleMouseDown`, nativ auf Leinwand und Container) und wörtlich noch einmal
in `handleGlobalStart` (React, auf dem Container). `handleObjDragStart` und
`handleCardDragStart` steigen bei `e.button !== 0` aus — die mittlere Taste
zieht also nichts und pant von überall, **heute schon**.

Der Befund hat trotzdem recht, nur an drei kleineren Stellen:

- Die **Tastenkürzel-Hilfe nennt sie nicht.** Sie sagt „Drag empty table: Pan
  the table" — genau die Einschränkung, an der der Spieler gescheitert ist.
  Dasselbe Muster wie Fund 11 im Audit.
- Es fehlt das `preventDefault`. Auf Windows startet der Browser bei der
  mittleren Taste die Bildlauf-Automatik samt eigenem Zeiger.
- **Auf einem Tastfeld und auf einem Trackpad gibt es sie nicht**, und das ist
  der eigentliche Rest des Befundes.

### 3. M10.7 — zwei Finger sind der falsche Weg, und zwar nachweisbar

Die naheliegende Berührungsgeste kollidiert hier zweifach mit vorhandenen
Handlern, nicht theoretisch:

- `handleGlobalTouchStart` belegt **zwei Finger bereits doppelt**: ohne
  gezogene Karte Kneifzoom, mit gezogener Karte **Drehen um 90°** (links/rechts
  vom haltenden Finger). Ein Schwenk mit zwei Fingern, der auf einem Objekt
  beginnt, ist genau der Fall „Karte hängt am ersten Finger" — er würde die
  Karte drehen.
- Der erste Finger startet auf einem Token sofort einen Zug
  (`handleObjDragStart`), auf einer Karte nach `TOUCH_TAP_THRESHOLD`. Wenn der
  zweite Finger ankommt, ist der Zug schon offen; er müsste zurückgenommen
  werden, und das ist genau die Rücknahme, die den Dreh-Zweig kaputtmacht.

Ein Langdruck auf leerer Fläche hilft nicht: **leere Fläche ist das, was der
Spieler nicht findet** — das ist der Befund. Auf vollem Grund kollidiert er mit
der Langdruck-Vorschau und dem Langdruck-Menü.

**Gewählt ist deshalb ein Schwenkmodus**: ein Knopf in der Werkzeugleiste
(Hand), der so lange gilt, bis man ihn wieder ausschaltet. Er ist langweilig,
er ist sichtbar, er kollidiert mit keiner einzigen Geste, er hilft auch dem
Trackpad ohne mittlere Taste — und er ist **weniger Code als jede Geste**.

### 4. M10.7 — `canStartPan` und die Tastenprüfung sind zwei Antworten auf dieselbe Frage

`e.button === 1` steht an zwei Stellen **neben** `canStartPan`, nicht darin.
Ein dritter Weg (der Schwenkmodus) daneben wäre die dritte Antwort. Die
Tastennummer und der Modus wandern deshalb **in** `canStartPan`; die Aufrufer
fragen dieselbe Stelle, genau wie M2.13 es für die drei Zeigersorten schon
verlangt hat.

### 5. M10.9 — ja, wieder ein Langdruck, und warum er hier anders liegt

M9.4 hat den Langdruck gestrichen, weil er **am Anfang** jedes Zuges saß: wer
einen Stapel nur verschieben wollte — der alltägliche Griff — musste eine halbe
Sekunde warten, bevor überhaupt etwas geschah. Der teure Weg war der häufige.

Das Halten **beim Ablegen** kehrt genau das um. Wer gewöhnlich ablegt, lässt
los und zahlt nichts; die Wartezeit zahlt nur, wer stapeln will, und das ist
der seltene Fall. Es gibt keine Wartezeit vor der ersten Bewegung, keine vor
dem Aufnehmen, keine beim Schwenken.

Zwei Bedingungen, damit daraus nicht wieder M10.4 wird:

- **Nichts passiert stumm.** Die Zielkarte leuchtet auf, bevor man loslässt —
  dieselbe Hervorhebung, die ein Zielstapel schon bekommt
  (`stackDropTarget`). Wer zögert, sieht was gleich geschieht und zieht weiter.
- **Nur über einer Karte.** Über leerer Fläche tut das Halten nichts.

Der zweite Weg, den Regel 4 ohnehin verlangt („wo es ein Menü gibt, steht er
darin"), ist derselbe in langsam: ein Eintrag im Kartenmenü, das auf Berührung
der Langdruck öffnet.

---

## U1 — Eine Antwort auf „darf das schwenken?" (reine Logik)

`client/src/utils/panTarget.js`, dieselbe Funktion, ein vierter Parameter:

```js
canStartPan(target, canvas, container, { button = 0, panMode = false } = {})
```

- `panMode` → **immer** wahr. Der Modus ist der Zusatz aus M10.7 Regel; solange
  er läuft, schwenkt jeder Zug, auch über einem Objekt.
- `button === 1` → wahr, unabhängig vom Ziel. Das ist die Zeile, die bisher
  zweimal **neben** dem Aufruf stand.
- Jede andere Taste (rechts, vierte, fünfte) → falsch. Bisher entschied das
  der Aufrufer, und der native Horcher ließ `e.button === 2` durch die
  `preventDefault`-Zeile daneben laufen.
- Ohne Optionen verhält sich alles exakt wie bisher (M10.7 Abnahme 2) — die
  Berührungsaufrufer übergeben keine Taste.
- M2.13 unverändert: gesperrtes Objekt schwenkt weiterhin ohne Zusatz
  (Abnahme 3).

**Abnahme.**
1. `panMode` schwenkt über jeder Stelle, auch über einem Objekt und ohne
   Container. Die Werkzeugleiste bleibt dabei bedienbar, ohne Sonderregel: ein
   Schwenk ohne Weg bewegt die Kamera um null, und der Klick geht durch.
2. Die mittlere Taste schwenkt über einem Objekt.
3. Die rechte Taste schwenkt nie.
4. Ohne Optionen antwortet die Funktion wie vor dieser Aufgabe (alle
   bestehenden Fälle in `pan-target.test.js` bleiben gültig).

## U2 — Verdrahtung Schwenken

`GameTable.jsx`:

- `panMode`-Zustand plus `panModeRef` (die nativen Horcher aus dem `useEffect`
  sehen den Zustand sonst nicht).
- Beide Aufrufer geben `{ button: e.button, panMode }` mit und verlieren ihre
  eigene `e.button === 1`-Prüfung.
- `e.preventDefault()` bei der mittleren Taste — gegen die Bildlauf-Automatik.
- `handleCardDragStart` und `handleObjDragStart` steigen bei `panMode` aus.
  Sonst zöge ein Zug auf einer Karte die Karte **und** den Tisch.
- Ein Knopf in der Werkzeugleiste (Hand), sichtbar eingerastet, wenn der Modus
  läuft.
- Zwei Zeilen in der Tastenkürzel-Hilfe: die mittlere Maustaste und der Knopf.
  Die Zeile „Drag empty table" bleibt — sie stimmt ja.

**Abnahme.** M10.7 Abnahme 1–3. `npx vite build` läuft durch.

## U3 — Benannte Ansichten (reine Logik)

`client/src/utils/tableViews.js`:

```js
normalizeViews(raw)               // → [{label, x, y, zoom}]
putView(views, label, camera)     // hinzufügen oder gleichnamige ersetzen
removeView(views, label)
```

- `normalizeViews` wirft weg, was keine brauchbare Stelle hat (`NaN`, fehlendes
  `x`, leeres Label) und klemmt den Zoom in `ZOOM_MIN`…`ZOOM_MAX` aus
  `cameraZoom.js` — eine Ansicht mit Zoom 40 wäre nicht anspringbar. Ein
  unlesbarer Spielstand gibt eine leere Liste, statt zu werfen.
- `putView` **ersetzt** bei gleichem Label, statt zu doppeln: „Schlachtfeld"
  zweimal in der Auswahl ist derselbe Fehler wie vierzig Zonen, nur kleiner.
  Die Reihenfolge bleibt dabei erhalten — wer eine Ansicht nachbessert, sucht
  sie danach an derselben Stelle.
- Obergrenze **acht**. Zwei, drei werden gebraucht; acht ist reichlich und
  hält die Auswahl auf einen Blick.

**Abnahme.**
1. Eine leere/unlesbare Eingabe gibt `[]` und wirft nicht.
2. Ein zweites `putView` mit demselben Label ersetzt, verdoppelt nicht, und
   lässt die Reihenfolge stehen.
3. Ein unbrauchbarer Zoom wird geklemmt, eine unbrauchbare Stelle fällt heraus.
4. Über der Obergrenze wächst die Liste nicht weiter.

## U4 — Verdrahtung Ansichten

`GameTable.jsx`:

- `views`-Zustand, in `getGameState` hinein und aus `loadGameState` heraus
  (über `normalizeViews`, weil ein Spielstand alles enthalten kann).
- Ein Knopf in der Werkzeugleiste öffnet die Liste: je Ansicht ein Eintrag zum
  **Anspringen** (Kamera setzen, `renderCanvas`), daneben ein ✕ zum Löschen,
  darunter „Save current view" mit `window.prompt` für den Namen.
- Die Liste ist leer, wenn nichts gespeichert ist — M10.6 Abnahme 3 und 4
  fallen damit zusammen: ohne gespeicherte Ansicht gibt es keinen Eintrag und
  verhält sich alles wie bisher.

`ZoneEditor.jsx`: der Knopf „Save Current View" samt Überschrift entfällt
(`audit-dead-controls.md` Fund 2).

**Bewusst nicht gemacht:** Ansichten je Zone, Ansichten im Setup-Editor,
Umbenennen, Sortieren, ein Tastenkürzel je Ansicht, und die Auswahl steht
**nicht** in `ESCAPE_LAYERS` — die Liste ist laut ihrem eigenen Kommentar eine
Spec-Entscheidung und wird von `escape-layers.test.js` festgehalten. Und die vorhandenen
`cameraX`/`cameraY`/`cameraZoom` werden **nicht** gelesen — Begründung in
Vorab 1.

**Abnahme.** M10.6 Abnahme 1–4, mit „Zone" ersetzt durch „Ansicht" (Vorab 1).
`npx vite build` läuft durch.

## U5 — Die Werkzeugleiste klappt weg

`showToolbar` gibt es seit jeher als Zustand, der Setter wurde nie gerufen
(`audit-dead-controls.md` Fund 6). Er wird jetzt gerufen:

- Ein schmaler Griff **außerhalb** des `{showToolbar && …}`-Zweigs, an
  derselben Kante wie die Leiste (unten mittig bzw. links mittig im
  Querformat). Er trägt `data-ui-element`, ist also weder Schwenk- noch
  Zoomfläche, und erfüllt die 44-Pixel-Mindestgröße wie die anderen Knöpfe —
  er ist der einzige Weg zurück (M10.8 Abnahme 3).
- Kein gespeicherter Zustand: nicht je Spiel, nicht je Gerät, nicht im
  Spielstand. Die Regel erlaubt das ausdrücklich („überlebt einen Neuaufbau
  nicht zwingend"), und alles andere wäre die Frage „je Spiel oder je Gerät?",
  die niemand gestellt hat.

**Abnahme.** M10.8 Abnahme 1–3. `npx vite build` läuft durch.

## U6 — Welche Karte liegt darunter? (reine Logik)

`client/src/utils/cardDrop.js` bekommt die beiden Kandidatenlisten, die
`stackAt` füttern — bisher stand die eine als `dropCandidates` in
`GameTable.jsx` und war damit ungeprüft:

```js
stackCandidates(cards, ownStackId)   // je Stapel ein Eintrag
looseCandidates(cards, excludeIds)   // je lose Karte ein Eintrag
```

Beide liefern `{id, x, y, w, h}` mit den Anzeigemaßen aus `getCardDims`, beide
gehen in dasselbe `stackAt`. **Keine zweite Geometrie**: „liegt die Karte auf
der anderen?" ist dieselbe Frage wie „liegt sie auf dem Stapel?", und M10.4/J1
hat sie schon beantwortet.

- `stackCandidates` nimmt je `inStack` den ersten Eintrag und lässt den eigenen
  Stapel aus, wie bisher.
- `looseCandidates` nimmt nur Karten **ohne** `inStack` und lässt die
  übergebenen `excludeIds` aus — die gezogene Karte und, bei Mehrfachauswahl,
  die mitgezogenen.
- Beide vertragen `null`, eine leere Liste und Karten ohne Maße.

**Abnahme.**
1. Zwei Karten desselben Stapels geben **einen** Kandidaten.
2. Der eigene Stapel ist nie dabei; die ausgeschlossenen Karten sind es nicht.
3. Eine Karte in einem Stapel ist kein loser Kandidat.
4. Karten ohne Maße bekommen 100 × 140 (`getCardDims`).
5. `null`/`undefined` geben `[]` und werfen nicht.

## U7 — Verdrahtung Stapeln: Halten beim Ablegen

`GameTable.jsx`:

- In `handleCardDragMove` wird bei **jeder** echten Bewegung (mehr als 3 Pixel
  seit dem letzten Mal) ein Zeitgeber neu gestellt. Bleibt der Zeiger
  `MERGE_HOLD_DELAY` (600 ms) stehen, läuft er ab und setzt `mergeTarget` auf
  die lose Karte unter dem Rasterpunkt (`stackAt` + `looseCandidates`). Kein
  Abfragen der Uhr beim Loslassen: **was leuchtet, ist was passiert.**
- `handleCardDragEnd` stapelt die gezogene Karte mit `mergeTarget`, wenn dort
  etwas steht und kein Zielstapel gewonnen hat. Der Stapel entsteht über
  dieselbe Funktion wie `G` — `groupSelectedCards` bekommt dafür einen Kern
  `stackCards(ids)` und bleibt sonst, wie es ist.
- Der `mergeTarget` leuchtet wie ein Zielstapel (`stackDropTarget`-Rahmen), und
  er wird bei Beginn, Ende und Abbruch des Zuges gelöscht.
- Kartenmenü: „Stack with card below" — nur sichtbar, wenn wirklich eine Karte
  darunter liegt, und über denselben `stackCards`-Kern. Das ist der Weg für
  Berührung ohne Zeitdruck und Regel 4s „steht im Menü".
- Tastenkürzel-Hilfe: eine Zeile „Hold over another card, then release".

Zwei Dinge fielen beim Bauen an:

- **Das Halten sagt die Absicht, die endgültige Stelle sagt die Geometrie.**
  Die Vorschau rechnet mit dem Rasterpunkt; ein Zonenplatz kann die Karte
  beim Loslassen noch verschieben. Beim Stapeln wird deshalb ein zweites Mal
  gefragt, diesmal mit `finalX`/`finalY` — sonst risse das Stapeln die Karte
  aus dem Zonenplatz, und das wäre M10.4 noch einmal, nur andersherum.
- **Die Hervorhebung loser Karten war kaputt.** `isDropTarget` lautete
  `stackDropTarget === stackId`; lose Karten werden mit `stackId === null`
  gezeichnet, und `stackDropTarget` ist null, solange nichts gezogen wird.
  **Jede** lose Karte lag dauerhaft im grünen Leuchten und um 5 % vergrößert
  da. Das fällt hier auf, weil genau dieses Leuchten jetzt etwas aussagt.

**Bewusst nicht gemacht:** kein neues Kürzel, keine Änderung an `G`, kein
Verschmelzen ohne Halten (M10.4 bleibt, Abnahme 3), kein Halten über einem
**Stapel** — dorthin tritt man wie bisher sofort bei.

**Abnahme.** M10.9 Abnahme 1–4. `npx vite build` läuft durch.
