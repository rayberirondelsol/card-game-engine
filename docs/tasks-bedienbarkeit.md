# Aufgaben: Bedienbarkeit von Bibliothek und Zähler (Spec M8.5, M8.6)

Vertrag ist `docs/spec-setup-system.md`, Abschnitte **M8.5** und **M8.6**.
Nummern sind `N…` (Nachbesserung), damit sie weder mit T1–T9
(`docs/tasks-kampfvorbereitung.md`), G1–G6 (`docs/tasks-gelaendelage.md`),
F1–F4 (`docs/tasks-grundflaeche.md`), S1–S6 (`docs/tasks-szenarioflaeche.md`),
K… (`docs/tasks-gelaendekarten.md`), B1–B6 (`docs/tasks-blockaden.md`),
R… (`docs/tasks-rundenwende.md`) noch V… (`docs/tasks-gelaendeseite.md`)
kollidieren.

**Gilt für jede Aufgabe.** Wie in B: eine Fähigkeit ist erst fertig, wenn alle
Schichten stimmen, und **„nichts zu tun" ist eine gültige Antwort, aber nur eine
geprüfte** (N8). Beide Befunde sitzen im Client; die entscheidbaren Teile
wandern nach `client/src/utils/` bzw. `shared/` und werden aus `server/test/`
geprüft, weil der Client keine Testinfrastruktur hat (CLAUDE.md).

Tests laufen mit `cd server && npm test`, der Bau mit `cd client && npx vite build`.

---

## Vorab: sechs Stellen, an denen Spec und Auftrag nicht stimmen

### M8.5: Leerzeichen zu ignorieren reicht **fast**, aber nicht ganz

Der Auftrag fragt, ob `heuhaufen` in `HOHLERHOHLERHEUHAUFENHEUHAUFEN` als
Teilzeichenkette vorkommt. **Ja** — Abnahme 1 fällt mit reinem Zusammenschieben
und Kleinschreibung. Gedoppelt wird *jedes Wort für sich* (`A A B B`), nicht der
ganze Name, deshalb steht `heuhaufen` zweimal unzerteilt darin.

Der praktische Fall fällt trotzdem durch. Wer den **ganzen** Namen tippt, sucht
bei zwei Wörtern noch erfolgreich (`…hohler|heuhaufen…` steht am Stoß der
Doppelung), bei **drei** Wörtern nicht mehr:

```
"The Rooty Tooter" → thetherootyrootytootertooter
  ganze Anfrage "therootytooter" → nicht enthalten
  Wort für Wort   "the","rooty","tooter" → alle enthalten
```

Genau diese Karte wurde in der Partie nicht gefunden. Nötig ist deshalb **eine**
Zeile mehr als in der Spec: die Anfrage wird an Leerzeichen zerlegt, und **jedes**
Wort muss im zusammengeschobenen Namen vorkommen. Kein Ähnlichkeitsrechner,
keine Reihenfolge — `every` über `includes`.

### M8.5: „dieselbe Normalisierung wie bei den 33 Geländekarten" gibt es nicht

Die Spec beruft sich auf eine vorhandene Normalisierung. Die Geländekarten
werden in `shared/sequenceExecutor.js` über `norm` zugeordnet, und `norm` ist
`trim().toLowerCase()` — **ohne** Leerzeichenbehandlung (Zeile 131, benutzt in
Zeile 1120). Die 33 Namen waren von Hand bereinigt, mehr brauchte es dort nicht.
Es gibt also nichts wiederzuverwenden; die Suchnormalisierung ist neu.

Sie wird auch **nicht** in `norm` hineingezogen: `norm` entscheidet
Schritt-Zuordnungen (Asset, Zone, Raster, Zähler). Dort wäre „Leerzeichen sind
egal" keine Unempfindlichkeit, sondern eine stillschweigende Lockerung — zwei
Zonen „Hand 1" und „Hand1" wären plötzlich dieselbe.

### M8.6 Regel 1: die Trefferfläche existiert bereits

Die Sorge aus dem Auftrag ist unbegründet. Der Wert steht in einem eigenen
`<span data-testid="counter-value-…" class="… min-w-[40px] …">` zwischen den
beiden Knöpfen (`GameTable.jsx` ~4529). Er ist 40 Punkte breit, liegt **nicht**
unter den ±-Flächen und hat heute nur keinen `onClick`. Ein Klick genügt; es
braucht weder Doppelklick noch Kontextmenü noch Tastenkürzel.

### M8.6 Regel 1: rechnen muss dafür niemand — `counterValue` kann es schon

„Die Eingabe ersetzt den Wert" ist die schwächere von vier Lesarten, die
`shared/counters.js` seit M8.4 kennt (`counterValueForm`/`counterValue`): eine
Zahl setzt, `+6`/`-2` rechnet dazu, `max` setzt auf die Obergrenze. Der
Befundsatz „Ein Einkauf über 21 Münzen sind 21 Klicks" ist damit ein `+21`.
Das Feld fragt deshalb `counterValue` und legt keine zweite Rechnung daneben —
und der unlesbare Fall fällt mit derselben Antwort zusammen wie Abbrechen
(`null` → Wert bleibt), das ist Abnahme 2 ohne eigenen Zweig.

### M8.6 Regel 2: die Behauptung stimmt, und beide Wege lassen sich trennen

`createCounter` (`GameTable.jsx` ~1793) schreibt `value: 0` fest — der Befund
ist belegt. **Beide Wege laufen durch dieselbe Funktion:** `createCounter` und
`place_counter` (`shared/sequenceExecutor.js` Zeile 1199) rufen beide
`normalizeCounter`. Die Trennung darf deshalb **nicht** in `normalizeCounter`
liegen: dort gesetzt, bekäme ein `place_counter`-Schritt ohne `value`, aber mit
`max` plötzlich einen anderen Startwert, und Abnahme 6 fiele.

Sie liegt eine Ebene höher, im Aufrufer: `createCounter` rechnet den Startwert
aus (`newCounterValue(max)`) und übergibt ihn wie bisher als `value`.
`normalizeCounter` bleibt Zeichen für Zeichen dieselbe Funktion, `place_counter`
wird nicht angefasst. Die Regel gehört trotzdem nach `shared/counters.js` und
nicht in den Tisch, weil sie zum Zählermodell gehört und nur dort prüfbar ist.

### M8.5 Regel 3: `canStartPan` ist **nicht** die passende Form

Der Auftrag vermutet M2.13 als Vorbild. Die Bauform stimmt (eine reine Funktion,
mehrere Aufrufer), die Bedingung nicht. Es gibt zwei Radhorcher:

| Horcher | Bedingung heute | über der Liste |
|---|---|---|
| nativ `handleWheel`, auf Canvas **und** Container (Zeile 811/884) | keine — `e.preventDefault()` als erste Zeile | zoomt, und `preventDefault` erstickt das Scrollen |
| React `onWheel={handleGlobalWheel}` (Zeile 3887/4168) | `closest('[data-ui-element]')` → nichts tun | tut schon heute nichts |

Wer die Bedingung des React-Horchers in den nativen kopiert, **bricht das
Zoomen über dem Hauptplan**: Boards und Token tragen selbst
`data-ui-element="true"` — genau der Satz, auf dem M2.13 aufbaut. Heute zoomt
das Rad über dem bildschirmfüllenden Brett nur, *weil* der native Horcher nicht
fragt. Das wäre ein M2.13 zweiter Ordnung.

Die richtige Frage ist nicht „ist das Bedienoberfläche", sondern **„scrollt
darüber etwas"**: vom Ereignisziel nach oben bis zum Container, und wenn ein
Vorfahr überläuft *und* auf `auto`/`scroll` steht, gehört das Rad ihm. Das
bindet an keine Merkattribute, die man beim nächsten Panel vergisst — die
Ausprägung, die `docs/audit-dead-controls.md` sammelt — und deckt die
Kartenschublade, die Token-Legende und den Stapelbrowser in einem Zug ab.

`scrollHeight > clientHeight` allein genügt nicht: der `world-transform-wrapper`
erfüllt das (`absolute inset-0` über einem viel größeren Tisch) und würde das
Zoomen ganz abschalten. Die Overflow-Abfrage ist tragend, nicht Zierrat.

---

## N1 — Namen vergleichen, unempfindlich gegen das OCR

Neue Datei `client/src/utils/cardSearch.js`, nach dem Muster von `panTarget.js`
und `libraryShelf.js`: reine Logik im Client, geprüft aus `server/test/`.

- `squashName(s)` — kleinschreiben, alle Leerzeichen weg.
- `matchesCardSearch(name, query)` — die Anfrage an Leerzeichen zerlegt, jedes
  Wort einzeln zusammengeschoben, und **jedes** muss im zusammengeschobenen
  Namen vorkommen. Leere Anfrage heißt: alles passt.

**Abnahmekriterium.** `matchesCardSearch('HO H LE R HO H LE R HE UH A UF EN HE UH A UF EN', 'heuhaufen')`
ist wahr (Abnahme 1 der Spec), ebenso mit der Anfrage `Hohler Heuhaufen` und
`THE THE ROOTY ROOTY TOOTER TOOTER` / `The Rooty Tooter`; `'paulis'` findet
`PAULISPAULISGEBISSGEBISS` nicht aber `Heuhaufen`; eine leere Anfrage ist für
jeden Namen wahr.

---

## N2 — Das Suchfeld in der Bibliothek

`client/src/pages/GameTable.jsx`, Kartenschublade (~5231–5420). **Eine** Stelle:
die Bibliothek ist kein eigenes Bauteil, sondern steht inline in `GameTable`,
und sonst nirgends am Tisch. `GameDetail.jsx` hat eine eigene Kartenverwaltung
mit eigenem Zweck (Hochladen, Zuschneiden, Kategorien pflegen) — die Suche der
Spec ist die des Tisches und bleibt hier. `SetupSequenceEditor.jsx` wählt Karten
über Kategorienamen, nicht über eine Liste.

Ein `<input>` im Kopf der Schublade. Bei nicht leerer Eingabe tritt an die
Stelle der Kategorienliste **eine flache Trefferliste über `availableCards`**,
gleich ob die Kategorie aufgeklappt ist, und jeder Treffer trägt seinen
Kategorienamen (`Uncategorized`, wenn er keinen hat). Leere Eingabe: die
Schublade sieht aus wie bisher.

**Abnahmekriterium.** `document.querySelectorAll('input')` liefert am Tisch mit
offener Schublade mindestens ein Feld; mit Eingabe steht unter jedem Treffer
seine Kategorie; ohne Eingabe steht die Kategorienliste unverändert da;
`npx vite build` läuft durch.

---

## N3 — Wem das Mausrad gehört

Neue Datei `client/src/utils/wheelTarget.js`: `canZoomTable(target, container, overflowOf)`.
Läuft vom Ziel bis zum Container nach oben und antwortet `false`, sobald ein
Vorfahr überläuft (`scrollHeight > clientHeight`) **und** sein `overflow-y` auf
`auto` oder `scroll` steht. `overflowOf` ist einspeisbar (Vorgabe:
`getComputedStyle(el).overflowY`), damit die Regel ohne Browser prüfbar ist.

**Abnahmekriterium.** Ein Ziel in einem überlaufenden `overflow-y: auto`-Panel
gibt `false`; dasselbe Panel ohne Überlauf gibt `true`; ein überlaufender
Vorfahr mit `overflow: visible` (der `world-transform-wrapper`) gibt `true`; ein
Token mit `data-ui-element="true"` gibt `true` (M2.13 bleibt heil); der
Container selbst gibt `true`.

---

## N4 — Beide Radhorcher fragen dieselbe Stelle

`GameTable.jsx`: `handleWheel` (nativ) prüft `canZoomTable` **vor**
`e.preventDefault()` und kehrt sonst um; `handleGlobalWheel` (React) bekommt
dieselbe Frage zusätzlich zu seiner `data-ui-element`-Prüfung.

**Abnahmekriterium.** In `handleWheel` steht kein unbedingtes
`e.preventDefault()` mehr, beide Horcher rufen `canZoomTable`, und
`npx vite build` läuft durch.

---

## N5 — Ein Zähler mit Maximum startet voll

`shared/counters.js` bekommt `newCounterValue(max)`: die brauchbare Obergrenze
(über das vorhandene `counterMax`), sonst `0`. `createCounter` in
`GameTable.jsx` übergibt sie als `value` statt der festen `0`.

`normalizeCounter` und `place_counter` werden **nicht** angefasst.

**Abnahmekriterium.** `newCounterValue(14)` ist `14`, `newCounterValue('')`,
`newCounterValue(null)` und `newCounterValue('abc')` sind `0`; ein
`place_counter`-Schritt mit `value: 0` und `max: 14` legt weiterhin einen Zähler
auf `0` an (Abnahme 6 der Spec).

---

## N6 — Der Wert ist ein Eingabefeld

`GameTable.jsx`: der Wert-`<span>` bekommt `onClick`, das ihn gegen ein `<input>`
tauscht (Zustand `editingCounterId` + `editingCounterText`). Enter übernimmt,
Escape und Fokusverlust brechen ab — dieselbe Form wie die Notiz-Bearbeitung
(~4763), also mit `e.stopPropagation()` im `onKeyDown` statt eines Eintrags in
`ESCAPE_LAYERS`; die Liste bleibt unangetastet (M2.10).

Übernommen wird über `counterValue(counter, eingabe)` aus `shared/counters.js`.
`null` heißt: unverändert lassen.

**Abnahmekriterium.** `counterValue({value: 3}, '21')` ist `21`,
`counterValue({value: 3}, '+21')` ist `24`, `counterValue({value: 3, max: 14}, 'max')`
ist `14`, und `counterValue({value: 3}, 'Unsinn')` ist `null` (= abbrechen);
im Bauteil trägt der Wert ein `onClick` und `npx vite build` läuft durch.

---

## N7 — Die Ablage neuer Zähler bricht um

`createCounter`: `counters.length * 160` weicht `shelfSlot(counters.length)` aus
`client/src/utils/libraryShelf.js` — dieselbe Reihe, dieselbe Schranke,
dieselbe Entscheidung wie M8.1, und keine zweite Rechnung. Ein neuer Zähler
kann damit auf einer ausgelegten Karte landen; sichtbar und greifbar zu bleiben
ist mehr wert als überschneidungsfrei zu liegen (M8.1, M8.6 Regel 3).

**Abnahmekriterium.** `shelfSlot(11)` (der zwölfte Zähler) liegt innerhalb von
`x ≤ 700` und `y ≤ 1500`, und `shelfSlot(n)` verlässt den Tisch für kein `n`.

---

## N8 — Was die anderen Schichten nicht tun

| Schicht | Ergebnis |
|---|---|
| `shared/sequenceExecutor.js` | nichts zu tun — `place_counter` behält seinen Wert (N5), Suche und Rad sind keine Schrittfelder |
| `client/src/utils/sequenceSteps.js` | nichts zu tun — kein neues Schrittfeld |
| `getGameState`/`loadGameState` | nichts zu tun — kein neues Feld am Zähler; Wert und `max` laufen schon über `normalizeCounter` |
| Raum / `messageHandler.js` | nichts zu tun **und schon vorher kaputt**: `counter_update` ist eine der neun Aktionen, die kein Client sendet (`docs/audit-dead-controls.md` Fund 1). Ein gesetzter Wert erreicht die Mitspieler so wenig wie ein Klick auf `+` heute |

**Abnahmekriterium.** Für jede Zeile ein Beleg im Bericht.

---

## Offene Punkte aus der Planung

- **Der Tisch zoomt zweimal je Radrasterung.** Über der Leinwand feuern beide
  Horcher (nativ + React `onWheel`), der Zoomfaktor ist dort `1.1 × 1.1`, über
  einem Token nur `1.1`. Vorbestehend, nicht Teil von M8.5 — der Befund lautet
  „das Rad scrollt die Liste nicht", nicht „der Zoom ist zu schnell". Wer es
  anfasst, löscht einen der beiden Horcher und ändert damit das Zoomgefühl
  überall.
- **Die Suche sucht nur in der Kartenbibliothek.** Token-Legende und
  Asset-Vorräte haben dasselbe Problem in klein; M8.5 nennt nur die Karten.
