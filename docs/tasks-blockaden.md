# Aufgaben: Die zwei Blockaden aus der Solopartie (Spec M8.1, M8.2)

Vertrag ist `docs/spec-setup-system.md`, Abschnitte **M8.1** und **M8.2**.
Nummern sind `B…` (Blockade), damit sie weder mit T1–T9
(`docs/tasks-kampfvorbereitung.md`), G1–G6 (`docs/tasks-gelaendelage.md`),
F1–F4 (`docs/tasks-grundflaeche.md`) noch S1–S6
(`docs/tasks-szenarioflaeche.md`) kollidieren.

**Gilt für jede Aufgabe.** Wie in F, G und S: eine Fähigkeit ist erst fertig,
wenn alle Schichten stimmen, und **„nichts zu tun" ist eine gültige Antwort,
aber nur eine geprüfte.** Bei M8.1/M8.2 sitzt alles im Client — umso wichtiger,
dass die Nachbarschichten einmal ausdrücklich abgehakt werden (B6), denn genau
dieses Nichtnachziehen sammelt `docs/audit-dead-controls.md`.

1. **Ausführung** — `client/src/utils/` (reine Logik, aus `server/test/` geprüft)
2. **Tisch** — `client/src/pages/GameTable.jsx`
3. **Raum / Persistenz** — `server/src/websocket/messageHandler.js`,
   `server/src/routes/rooms.js`, `getGameState`/`loadGameState`

Tests laufen mit `cd server && npm test`.

---

## Vorab: fünf Stellen, an denen Spec und Auftrag nicht stimmen

Die Abschnitte stehen hier und nicht als Kommentar im Code, weil sie den
Zuschnitt der Aufgaben begründen.

### M8.1: es sind vier Karten je Zeile, nicht sechzehn

Die Spec schreibt „`y = 300 + Zeile * 180`, 16 je Zeile". Im Code steht

```js
const existingCount = tableCards.length;
const col = existingCount % 4;
const row = Math.floor(existingCount / 4);
```

also **vier** je Zeile. Die Zahl ist nicht kosmetisch: mit 16 je Zeile ergäben
296 Karten Zeile 18 und `y = 3540`, mit 4 je Zeile Zeile 74 und `y = 13 620` —
und nur die zweite Zahl passt zum Befund (`y = 14 289`, das ist Zeile 77 plus
Streuung). Der Befund ist belegt, die Formel in der Spec ist es nicht.

**Folge für Abnahme 2.** „Sechzehn freie Karten füllen die erste Zeile, die
siebzehnte beginnt die zweite — **unverändert**." Das Wort „unverändert" und
die Zahl 16 widersprechen sich. „Unverändert" gewinnt: geprüft wird, dass vier
freie Karten die erste Zeile füllen und die fünfte die zweite beginnt.

### M8.1: `tableCards` stimmt, `inStack` stimmt — und es gibt eine zweite Stelle

Beides aus dem Auftrag bestätigt sich:

- `tableCards` ist die Liste mit den Stapelkarten darin. Ein Stapel ist kein
  eigenes Objekt; er existiert nur als `inStack: <stackId>` auf jeder seiner
  Karten (`stackNames` hält bloß den Namen). `tableCards.filter(c => c.inStack)`
  ist der Stapelinhalt.
- **Dieselben drei Zeilen stehen ein zweites Mal**, in `placeCategoryAsStack`
  (Zeile 1114–1116), mit demselben Fehler: eine Kategorie, die als Stapel auf
  den Tisch kommt, zählt die 296 Stapelkarten genauso mit.

Repoweit sonst keine weitere Stelle: eine Suche nach `length % ` und
`length / 4` über `client/src`, `server/src` und `shared` findet nur diese zwei.

### M8.1: „nur freie Karten zählen" ist zu wenig, sonst liegen zwei Stapel aufeinander

Die Regel der Spec lautet „gezählt werden nur frei liegende Karten".
Buchstäblich umgesetzt bekäme `placeCategoryAsStack` **immer denselben Platz**:
ein Stapel erhöht die Zahl der freien Karten nicht. Wer zwei Kategorien
hintereinander auslegt, legt sie übereinander — ein neuer Fehler anstelle des
alten.

Gezählt wird deshalb, was auf dem Tisch **liegt**: jede freie Karte einzeln,
**jeder Stapel einmal**. Das ist dieselbe Aussage wie die der Spec („in einem
Stapel liegt nichts frei"), nur zu Ende gedacht, und es hält beide Aufrufer an
einer Rechnung.

**Folge für Abnahme 1.** „Bei 300 Karten in Stapeln … landet die erste gelegte
Karte in der ersten Zeile" gilt, solange die 300 Karten in bis zu vier Stapeln
liegen. Liegen sie in zwanzig, ist Zeile 5 die richtige Antwort, nicht Zeile 0
— zwanzig Stapel *liegen* auf dem Tisch. Geprüft wird beides: ein Stapel mit
300 Karten → Zeile 0; zwanzig Stapel → Zeile 5 und weiterhin im Bild.

### M8.2: der Hauptplan ist ein Token, kein Brett — die Regel trägt

Die Sorge aus dem Auftrag ist berechtigt, aber die Antwort fällt anders aus als
vermutet. Es gibt zwei Sorten, und der Hauptplan gehört nicht zu der, die man
erwartet:

- **`boards`** wird mit `zIndex: 1` gezeichnet, also ohnehin hinter allem. Die
  Liste lässt sich in der Oberfläche **gar nicht füllen**: `setBoards` wird nur
  beim Laden eines Spielstands und beim Löschen aufgerufen, kein Dialog und
  kein Sequenzschritt legt ein `board` an.
- **`place_asset` und `build_scenario` schieben ausnahmslos in `state.tokens`**
  (`shared/sequenceExecutor.js`, Zeilen 678 und 989). Hauptplan, Zusatz-Brett,
  Geländeteile, Bösewichte und Dörfler sind damit alle **Token** und tragen
  alle `z-20`.

Die Regel gilt also für den Hauptplan mit, und sie schiebt ihn nach ganz
hinten. Das ist richtig: 1200×1000 ist die größte Grundfläche am Tisch, und
alles, was darauf steht, gehört darüber. Die Geländeteile bekommen ihre Maße
aus `rangeBox` (`build_scenario`), also aus der tatsächlich belegten
Feldfläche — `width * height` ist dort keine Schätzung, sondern die Grundfläche
selbst.

### M8.2: der z-index reicht, und er fasst das Pannen nicht an

Trefferfläche und Zeichenreihenfolge hängen am selben Wert: was oben liegt,
bekommt den Zeiger. Eine reine `z-index`-Änderung erfüllt deshalb Abnahme 1–4,
und die zweite Ursache der Spec (das Geländeteil fängt auch über seinen
durchsichtigen Rändern ab) braucht keine eigene Behandlung — über dem Rand
liegt weiterhin nichts anderes, und daneben *soll* das Gelände gezogen werden
(Abnahme 3).

**M2.13 bleibt unberührt.** `canStartPan` prüft `[data-locked="true"]` am
Ereignisziel, nicht am z-index. Ein gesperrter Hauptplan fängt den Druck
weiterhin ab und pannt; steht eine Figur darauf, bekommt sie den Druck — was
bei einer gesperrten Figur wieder pannt. Die Regel „was nicht gezogen werden
kann, pannt" gilt danach für dasselbe Ziel wie vorher, nur ist das Ziel
manchmal ein anderes Objekt.

Damit sonst **nichts** kippt, wandert die Reihenfolge **nach oben**: die größte
Fläche behält die bisherige `20`, kleinere Stücke steigen auf 21, 22, … Nach
unten wäre der Hauptplan unter die Raster- und Widget-Ebenen gerutscht; nach
oben kann nichts darunterfallen, weil der bisherige Wert der Fußboden ist. Die
Token liegen in einem eigenen Stapelkontext (`world-transform-wrapper` trägt
ein `transform`), die Bedienleisten bei `z-30`/`z-40` sind von dort nicht
erreichbar.

---

## B1 — Ein Platz in der Ablagereihe, als eigene Funktion

Neue Datei `client/src/utils/libraryShelf.js`, nach dem Muster von
`panTarget.js` und `roomSocketUrl.js`: reine Logik im Client, geprüft aus
`server/test/`, weil es im Client keine Testinfrastruktur gibt.

Zwei Exporte, weil es zwei Fragen sind:

- `shelfCount(tableCards)` — wie viele Dinge liegen auf dem Tisch? Freie Karten
  einzeln, jeder Stapel einmal.
- `shelfSlot(index)` — wo liegt das n-te Ding? `x = 250 + Spalte * 150`,
  `y = 300 + Zeile * 180`, vier Spalten, und nach sechs Zeilen von vorn, damit
  die Reihe den sichtbaren Tisch nie verlässt.

**Abnahmekriterium.** `shelfCount` zählt 300 Karten in einem Stapel als 1 und
vier freie Karten als 4; `shelfSlot(0)` ist `{ x: 250, y: 300 }`, `shelfSlot(4)`
beginnt die zweite Zeile, und `shelfSlot(n)` liegt für jedes `n` von 0 bis
10 000 innerhalb von `y ≤ 1500`.

---

## B2 — `placeCardOnTable` zählt, was liegt

`client/src/pages/GameTable.jsx`, Zeile ~1077: die drei Zeilen
`existingCount / col / row` weichen `shelfSlot(shelfCount(tableCards))`. Die
Streuung von ±15 Punkten bleibt, wo sie ist — sie gehört zum Ablegen, nicht
zum Platz.

**Abnahmekriterium.** Bei 300 Karten in einem Stapel und keiner freien Karte
ergibt `shelfSlot(shelfCount(...))` die erste Zeile (`y = 300`), nicht Zeile 74.

---

## B3 — `placeCategoryAsStack` zählt dasselbe

Zeile ~1114, dieselben drei Zeilen, derselbe Ersatz — ohne Streuung, der Stapel
liegt genau auf seinem Platz.

**Abnahmekriterium.** Drei nacheinander ausgelegte Kategorien liegen auf drei
verschiedenen Plätzen, und keiner davon außerhalb des sichtbaren Tisches.

---

## B4 — Die Zeichenreihenfolge aus der Grundfläche

Neue Datei `client/src/utils/tokenLayer.js`, wieder reine Logik.
`tokenLayers(tokens)` gibt eine Funktion zurück, die zu einem Token seinen
z-index liefert: die Objekte werden nach belegter Fläche (`width * height`, mit
denselben Rückfällen, die der Tisch beim Zeichnen benutzt) gruppiert, die
größte Fläche bekommt den bisherigen Wert `20`, jede kleinere einen höheren.

Gleiche Fläche heißt gleicher z-index — dann entscheidet wie bisher die
Reihenfolge im DOM.

**Abnahmekriterium.** Für eine Figur 100×100 und ein Geländeteil 300×150 gilt
`z(Figur) > z(Gelände)`; zwei Stücke 142×142 bekommen denselben Wert; kein Wert
im Ergebnis ist kleiner als 20.

---

## B5 — Der Tisch benutzt sie

`GameTable.jsx`: `z-20` fällt aus der Klassenliste der Token, dafür kommt
`zIndex` aus `tokenLayers` in den `style`. Berechnet wird einmal je Änderung
der Tokenliste (`useMemo`), nicht je Token.

**Abnahmekriterium.** Das `z-20` steht nicht mehr in der Token-Klassenliste,
der `style` des Tokens trägt einen berechneten `zIndex`, und `npx vite build`
im `client` läuft durch.

---

## B6 — Was die anderen Schichten nicht tun

Ausdrücklich geprüft und begründet, statt stillschweigend ausgelassen:

| Schicht | Ergebnis |
|---|---|
| `client/src/utils/sequenceSteps.js` | nichts zu tun — beide Befunde betreffen kein Schrittfeld |
| `shared/sequenceExecutor.js` | nichts zu tun, **und nicht anzufassen**: der Aufbau setzt Koordinaten, keine Zeichenreihenfolge |
| Raum / `messageHandler.js` | nichts zu tun — der z-index wird weder gespeichert noch verschickt, er wird gezeichnet |
| `getGameState`/`loadGameState` | nichts zu tun — kein neues Feld am Objekt |

**Abnahmekriterium.** Für jede Zeile ein Beleg im Bericht.

---

## Offene Punkte aus der Planung

- **`createCounter` hat dasselbe Muster, aber nicht denselben Fehler.**
  `const offset = counters.length * 160` (Zeile 1793) rechnet eine Position aus
  einer Listenlänge, die niemand begrenzt: ab dem sechsten Zähler steht der
  nächste 800 Punkte rechts, ab dem zehnten außerhalb jedes Bildes. Es fehlt
  keine Filterung (Zähler stecken in keinen Stapeln), nur die Schranke. Nicht
  Teil von M8.1 — hier notiert, damit es nicht erst wieder am Tisch auffällt.
- **Die Ablagereihe überlappt sich ab dem 25. Ding.** Die Schranke aus B1 legt
  das 25. Ding wieder auf Platz 0. Sichtbar und greifbar zu bleiben ist mehr
  wert als überschneidungsfrei zu liegen; wer mehr Plätze braucht, erhöht die
  Zeilenzahl oder legt die Reihe an den Rand statt in die Mitte.
