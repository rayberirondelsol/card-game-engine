# Aufgaben: Die oberste Karte offen aufdecken (Spec M8.9)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M8.9**. Nummern sind `D…`
(Aufdecken), damit sie weder mit T1–T9 (`tasks-kampfvorbereitung.md`),
G1–G6 (`tasks-gelaendelage.md`), F1–F4 (`tasks-grundflaeche.md`),
S1–S6 (`tasks-szenarioflaeche.md`), K1–K6 (`tasks-gelaendekarten.md`),
B1–B6 (`tasks-blockaden.md`), R1–R7 (`tasks-rundenwende.md`),
V1–V5 (`tasks-gelaendeseite.md`), N1–N8 (`tasks-bedienbarkeit.md`) noch
A1–A5 (`tasks-startausruestung.md`) kollidieren.

**Gilt für jede Aufgabe.** Wie in A, K, S, F und G: eine Fähigkeit ist erst
fertig, wenn alle vier Schichten stimmen, und **„nichts zu tun" ist eine gültige
Antwort, aber nur eine geprüfte.**

1. **Ausführung** — `shared/sequenceExecutor.js`
2. **Schrittvokabular** — `client/src/utils/sequenceSteps.js`
3. **Editor / Tisch** — `client/src/pages/GameTable.jsx`
4. **Serverrouten / Persistenz** — nichts zu tun, siehe unten

Tests laufen mit `cd server && npm test`.

---

## Vorab: drei Stellen, an denen M8.9 nicht stimmte

### Es braucht **keinen** neuen Schritt

M8.9 Regel 1 sagt: „Es gibt sie auch als Sequenzschritt, damit der Laden sie
zum Nachfüllen benutzen kann." Das klingt nach einer Lücke, ist aber keine.

`deal_to_zone` mit `count: 1` und `faceDown: false` tut **wortwörtlich**, was
M8.9 Regel 1 verlangt:

- Es sortiert `stack.cards` nach `zIndex` absteigend und nimmt die erste —
  also die **oberste** Karte. (`stack.cards` ist von unten nach oben sortiert,
  die oberste steht am Ende; über `zIndex` kommt dasselbe heraus, und die
  Sortierung ist die, die `place_stack` und `shuffle` schon herstellen.)
- Es legt sie über `zoneSlots`/`zoneCenter` in die Zielzone und setzt
  `faceDown: false`, `face_up: true` — offen.
- Es nimmt sie aus dem Stapel und räumt den Stapel ab, wenn er leer wird.
- Ein fehlender oder leerer Stapel ist `skipped` **mit Grund im Protokoll** —
  das ist Regel 3, unverändert und ohne eine Zeile Code.

Der Unterschied zu M8.8 ist der Punkt: dort **gab es** die Fähigkeit nicht
(eine Karte bei Namen aus der Bibliothek). Hier gibt es sie, sie hat nur kein
Bedienelement. Ein zweiter Schritt, der dasselbe tut, wäre ein Eintrag mehr im
Editor, eine Stelle mehr, an der er kaputtgeht, und eine Frage mehr für den
Autor („welcher von beiden?").

`defaultStep('deal_to_zone')` liefert ohnehin schon `count: 1, faceDown: false`
— der Aufdeck-Schritt ist die **Vorbelegung** des vorhandenen Schritts.

**Damit fällt die halbe Spec-Regel 1 weg**, und übrig bleiben das Bedienelement
(D3), die Hilfe (D4) — und ein Fehler, den erst die Prüfung von Abnahme 2
gezeigt hat (D2).

### Abnahme 2 war kaputt, aber anders als vermutet

Die Frage war, ob zwei offen abgelegte Karten „zu einem Stapel verschmelzen"
und die untere unsichtbar wird. Zwei Dinge sind zu unterscheiden:

1. **Verschmelzen zu einem `inStack`-Stapel** passiert **nicht**. Das macht im
   Client nur `handleCardDragEnd`, also das Ziehen von Hand. Der Executor legt
   Karten als einzelne Karten in `state.cards`; sie bleiben einzeln greifbar.

2. **Übereinanderliegen** passiert, und zwar absichtlich: `zoneSlots` liefert
   für `layout: "stack"` genau **einen** Platz, die Mitte. Jede neue Karte
   landet dort. Das ist **richtig** und steht so in M8.9 Regel 2 — ein
   Ablagestapel ist genau das. Die vorige Karte ist nicht weg, sie ist verdeckt.

**Kaputt war die Reihenfolge.** `deal_to_zone` reichte die Karte per Spread
weiter und ließ ihren `zIndex` *aus dem Stapel* stehen. Der fällt beim Abtragen
von oben mit jedem Griff: 3, dann 2, dann 1. Die zweite aufgedeckte Karte lag
damit **unter** der ersten und war unsichtbar — dasselbe Bild wie
„verschmolzen", aber ein anderer Grund. Wer eine Karte auf den Tisch legt, gibt
ihr einen Platz über allem, was schon liegt (D2).

### Regel 4 stimmt, aber die Hilfe hat mehr Löcher als die eine Zeile

Der Befund zu `F` ist richtig: der Horcher wirkt auf `selectedCards`, und ein
Stapel steht dort bei einem gewöhnlichen Klick nicht — `actualCardDragStart`
steigt bei 2+ Karten im Stapel vorher aus (Press-and-Hold), es wird also nichts
ausgewählt. (Nach einem *langen* Druck sind alle Stapelkarten ausgewählt, dann
flippt `F` sie alle einzeln. Auf diesen Zufall kann eine Hilfe nicht verweisen.)

Beim Durchgehen der übrigen zehn Zeilen (D4) kamen dazu:

- **`1-9` „Draw cards from stack"** sagt nicht, **wohin**. Es zieht auf die
  **Hand** — genau der Punkt, an dem M8.9 hängt.
- **`Escape`** fehlt ganz, obwohl M2.10 eine eigene Schichtenordnung dafür
  gebaut hat (`escapeTarget`, 13 Schichten).
- **`Shift+Click`** fehlt, obwohl der Horcher es neben `Ctrl+Click` kennt und
  es etwas anderes tut (hinzufügen statt umschalten, und beim Stapel den ganzen
  Stapel).
- **„Click + Drag: Pan the table"** stimmt nur auf der leeren Fläche; auf einer
  Karte zieht man die Karte (`canStartPan`, M2.13).
- `Q`/`E` versprechen nichts Falsches, sagen aber nicht, worauf sie wirken.

Richtig waren: `ALT`, `G`, `?`, `Scroll`, `Right-click`.

---

## D1 — Nachweisen, dass `deal_to_zone` der Aufdeck-Schritt ist

Keine Codeänderung. Ein Test hält fest, dass der vorhandene Schritt die
Abnahmen 1, 3 und 4 erfüllt, damit ihn niemand ein zweites Mal baut.

**Abnahmekriterium.** Ein `deal_to_zone` mit `count: 1`, `faceDown: false` und
der `Ablage` als Ziel legt die **oberste** Karte offen auf die Zonenmitte,
lässt den Rest im Stapel und landet auf keiner Hand. Ein leerer oder fehlender
Stapel meldet `skipped` mit Grund. `stepFields('deal_to_zone')` ist
`['stackLabel', 'count', 'targetZoneLabel', 'faceDown']`.

## D2 — Die aufgedeckte Karte liegt obenauf

`shared/sequenceExecutor.js`: `deal_to_zone` vergibt den `zIndex` der
ausgeteilten Karten neu — über allem, was schon in `state.cards` liegt, und
untereinander in der Reihenfolge des Austeilens. Neuer Helfer `topZIndex(state)`
neben `reassignZIndices`.

Die Änderung sitzt in `deal_to_zone`, nicht an der Aufrufstelle: **jede** Karte,
die einen Stapel verlässt, bringt den Fehler mit, nicht nur die aufgedeckte.
Der Laden, der zehn Karten in eine `row`-Zone austeilt, hat ihn auch — dort
fällt er nur nicht auf, weil die Karten nebeneinander liegen.

**Abnahmekriterium.** Zwei Griffe nacheinander legen die zweite Karte **über**
die erste; drei Griffe ergeben aufsteigende `zIndex` in der Reihenfolge des
Aufdeckens. Eine Karte, die schon am Tisch liegt (auch mit hohem `zIndex`),
bleibt darunter. Beide Karten liegen auf demselben Punkt und keine ist
verschwunden.

## D3 — Das Bedienelement am Stapel

`client/src/utils/revealToZone.js` (neu, reine Logik, geprüft aus
`server/test/reveal-to-zone.test.js`) + Verdrahtung in `GameTable.jsx`.

**Wo es hingehört: ins Kontextmenü, nicht auf eine Taste.** Eine Taste braucht
ein Ziel, und ein Stapel weiß nichts von Zonen. Die Zone zu raten wäre derselbe
Fehler wie „Draw Card legt auf die Hand" — eine Entscheidung, die das Programm
trifft und der Spieler ausbadet. Das Kontextmenü stellt die Frage, ohne einen
Klick zu kosten: es ist beim Rechtsklick ohnehin offen, und **die Wahl der Zone
*ist* der Klick**, der sonst „Reveal" hieße. Also ein Eintrag je Zielzone,
`Reveal Top Card to "Ablage"`, direkt unter „Draw Card".

**Woher es die Zonen kennt:** `revealZones(zones)` liefert die Zonen mit Namen,
die Karten nehmen — und wenn darunter welche mit `layout: "stack"` sind, **nur
diese**. Eine Zone, auf der jede neue Karte die vorige zudeckt, ist ein
Ablagestapel; das steht in M8.9 Regel 2 und ist keine Heuristik, sondern die
Definition. Im TFT-Setup bleibt damit genau ein Eintrag übrig: `Ablage`.
Gibt es keinen Ablagestapel, stehen alle Kartenzonen da — eine Liste ist besser
als ein Bedienelement, das gar nicht erscheint. Geraten wird nie: bei zwei
Ablagestapeln stehen beide da.

**Getan wird es vom Executor.** `runSetupAction` führt Sequenzschritte schon
gegen den laufenden Tisch aus (`getGameState` → `executeSequenceWithLog` →
`loadGameState`); `revealTopCardToZone` benutzt denselben Weg mit dem einen
Schritt aus `revealPlan`. Damit gilt am Tisch, was im Aufbau gilt, das Protokoll
(Regel 3) fällt ab, und es gibt keinen zweiten Weg, eine Karte vom Stapel in
eine Zone zu legen.

`revealPlan` hat genau eine eigene Entscheidung: ein von Hand
zusammengeschobener Stapel hat **keinen Namen**, und `deal_to_zone` adressiert
Stapel ausschließlich über den Namen. Er bekommt darum einen aus seiner
`stackId`, den der Tisch nach dem Griff wieder aus `stackNames` entfernt.

**Abnahmekriterium.** Rechtsklick auf den Verhaltensdeck-Stapel zeigt
`Reveal Top Card to "Ablage"`; ein Klick legt die oberste Karte offen dorthin.
Der nächste Griff legt die folgende Karte darüber. Beim leeren Stapel geschieht
nichts und das Protokollfeld meldet es. `cd client && npx vite build` läuft
durch.

## D4 — Die Tastenkürzel-Hilfe berichtigen

`GameTable.jsx`, Liste im `showShortcuts`-Überlagerung. Alle elf Zeilen gegen
den Horcher geprüft (siehe oben), nicht nur die `F`-Zeile.

Aufdecken bekommt **keine** Taste, und damit auch keine Zeile: ohne Zielzone
wäre sie geraten. Was die Hilfe stattdessen sagt, ist, dass das Kontextmenü sie
hat.

**Abnahmekriterium.** Keine Zeile der Hilfe verspricht etwas, das der Horcher
nicht tut; `Escape` und `Shift+Click` stehen drin; `1-9` sagt, wohin gezogen
wird.

## D5 — Die Daten

Keine Codeänderung, nichts an Serverrouten oder Persistenz: der Schritt ist
`deal_to_zone` und steht seit jeher in `sequence_data`.

Zum Nachfüllen des Ladens (M8.9 Regel 1, zweiter Halbsatz) ist einzutragen:

```json
{ "type": "deal_to_zone", "stackLabel": "Nachschub", "count": 1,
  "targetZoneLabel": "Ladenauslage", "faceDown": false }
```

**Abnahmekriterium.** Ein Bösewicht-Zug ist ein Rechtsklick und ein Klick.
