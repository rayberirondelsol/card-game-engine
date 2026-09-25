# Aufgaben: die sechs Restbefunde der vierten Solopartie (Spec M11.4–M11.9)

Vertrag ist `docs/spec-setup-system.md`, Abschnitte **M11.4** bis **M11.9**.
Nummern sind `Q…`: T, G, F, S, K, B, R, V, N, A, D, E, Z, L, P, H, W, J, U, C,
X und Y sind in den übrigen `docs/tasks-*.md` belegt, `M` benennt die
Meilensteine, `I` und `O` sind Ziffernzwillinge — **`Q` ist der letzte freie
Buchstabe.** Wer nach diesem Stapel noch einen braucht, fängt zweistellig an.

**Gilt für jede Aufgabe.** Der entscheidbare Teil wandert nach `shared/` bzw.
`client/src/utils/` und wird aus `server/test/` geprüft, weil der Client keine
Testinfrastruktur hat (`CLAUDE.md`). Die Verdrahtung prüft nur
`cd client && npx vite build`. **„Nichts zu tun" ist eine gültige Antwort, aber
nur eine geprüfte** — für den gestrichelten Rand aus M11.9 ist es die Antwort,
und Q7 ist der Beleg.

Tests laufen mit `cd server && npm test` (Stand vorher: 904 grün), der Bau mit
`cd client && npx vite build`.

---

## Vorab: fünf Stellen, an denen Spec und Auftrag nicht stimmen

### M11.4: „Ausgangswert" ist das richtige Mittel, nicht der Schnappschuss

Der Auftrag stellt eine Alternative daneben: die Dorfphase könnte die
**aktuellen** Werte merken — vor dem Kampf sichern, danach zurücksetzen — und
käme ohne neues Feld aus. Sie ist geprüft und **fällt durch**, aus drei
Gründen:

1. **Sie verliert die Beute.** §7.3 gibt Bösewicht-Beute **nach** dem Kampf,
   also nach dem Zeitpunkt des Schnappschusses. Eine Ausrüstung, die dort
   gewonnen wird und BEW hebt, wäre in der nächsten Dorfphase wieder weg —
   wörtlich der Befund, nur eine Runde später.
2. **Sie ist nicht bearbeitbar, und genau das war der Fehler.** M8.4 hat gegen
   den mitgeführten Startwert argumentiert: „ein im Zähler mitgeführter,
   nirgends bearbeitbarer Startwert wäre nach dem ersten solchen Ereignis still
   falsch." M11.4 gibt selbst die Antwort: „Das ist der Fehler, nicht das
   Mitführen." Ein versteckter Schnappschuss ist derselbe Fehler **ohne**
   Reparaturweg — man sieht ihn nicht einmal.
3. **Sie ist nicht kleiner.** Sie braucht einen zweiten Speicher plus zwei
   Schritte (`snapshot`/`restore`) plus die Bindung an „Kampf beginnen". Der
   Ausgangswert ist ein Feld und eine fünfte Lesart eines vorhandenen Schritts.

Dazu das Bild am Tisch: das Dörfler-Tableau **druckt** die Startwerte, und die
Ausrüstungskarte liegt sichtbar daneben. Ein Ausgangswert, den man sieht und
ändert, ist die Übersetzung davon. Ein Schnappschuss hat am Tisch keine
Entsprechung.

### M11.4: es sind neun abgetippte Zahlen, nicht zwölf

Der Auftrag spricht von „den zwölf `set_counter`-Schritten mit abgetippten
Zahlen". Die Spec ist genauer (M11.4: „weil die **neun** Zahlen dort abgetippt
stehen", M8.4 Schritt 2: „Leben auf den Höchstwert, die übrigen drei auf ihren
Ausgangswert"). Zwölf Attributzähler sind drei Dörfler à vier Werte; drei davon
sind Leben und stehen bereits auf `"max"`. **Zu ändern sind neun Schritte, nicht
zwölf** — siehe die Eintragsliste unten.

### M11.4, Abnahme 4: der Ausgangswert kommt aus `place_counter`, und er wird nicht erfunden

Die Vermutung des Auftrags trifft zu: `place_counter` braucht ein Feld, und es
heißt `base`. Der naheliegende Kniff — „der Wert beim Anlegen *ist* der
Ausgangswert" — wurde **verworfen**: er machte Abnahme 3 („ein Zähler ohne
Ausgangswert verhält sich unverändert") gegenstandslos, weil dann jeder Zähler
einen hätte, und er gäbe dem Münztopf einen Ausgangswert von 0, auf den ihn
jeder Tippfehler zurückdrehen könnte. `base` ist optional und wird nirgends
abgeleitet.

### M11.8 ist **nicht** dieselbe Funktion wie M9.4

Der Auftrag vermutet, die Antwort sei „dieselbe Funktion, nicht eine neue".
Nachgesehen: M9.4/H2 hat `zoneOccupants` gebaut (`client/src/utils/
stackDrag.js`), und die beantwortet eine **andere** Frage — sie fasst die
fünfzehn Karten eines Stapels zu **einem** Ding zusammen. Sie sagt nichts
darüber, ob dieses Ding auf einem *Platz* liegt. Die fremde Karte aus M11.8 ist
eine einzelne, lose Karte; `zoneOccupants` gibt sie unverändert zurück, und sie
zählt weiterhin.

Gemeinsam ist die **Familie** (M8.1: „in einem Stapel liegt nichts frei";
M9.4: „was sich als ein Ding bewegt, zählt als ein Ding"), nicht die Funktion.
Neu ist deshalb eine — aber sie erfindet keine Toleranz, sondern benutzt die,
die `snapPoint` seit M2 für `taken` hat.

### M11.9: „in der Mitte" ist scharf zu fassen — aber nur mit einem Preis, und der gestrichelte Rand ist ein Phantom

Der Auftrag fragt beides zu Recht.

**Zur Mitte.** Ein 2×2-Stück hat tatsächlich keinen Mittelpunkt, der ein Feld
wäre — er liegt auf dem Kreuz. Genau **das** ist aber die Lösung und nicht das
Problem: ein 1×1-Dörfler sitzt auf einer Feldmitte, ein 2×2-Bösewicht auf einem
Kreuz, und beide können darum nie zusammenfallen. Ihr Abstand ist immer ein
halbes Feld je Achse. Die Regel „näher als ein halbes Feld am Mittelpunkt"
lautet damit ausgeschrieben: der Mittelpunkt des Bösewichts liegt **genau auf
der Ecke** des Dörflerkastens, und eine Ecke ist die schwächste Stelle eines
Kastens.

Und die Rückfrage des Auftrags — wirft das bei einem 1×1-Stück nicht alles um?
— beantwortet sich damit auch: **nein, weil das 1×1-Stück selbst das Maß ist.**
Seine „Mitte" ist sein ganzer Kasten bis auf den Rand, also genau der Bereich,
den es vorher schon gewonnen hat. Es verliert nichts; es bekommt nur einen
Mitbewerber um den Mittelpunkt des großen Stücks.

**Der Preis, ausgesprochen** (Q6): das Viertel des Dörflerfeldes, das am
Mittelpunkt des Bösewichts liegt, gehört danach dem Bösewicht. Das ist dieselbe
Teilung, die M10.1 zwischen zwei gleich großen Figuren schon vornimmt („jede
Hälfte gehört der näheren"), nur über die Flächengrenze hinweg. M8.2 bleibt
unberührt, weil eine Figur, die *auf* einem Geländeteil steht, dessen
Mittelpunkt nie näher hat als ihren eigenen — und bei gleichem Abstand (beide
Mittelpunkte aufeinander) weiterhin die kleinere Fläche gewinnt.

**Zum gestrichelten Rand.** Die Vermutung des Spielers ist geprüft und trifft
**nicht** zu (Q7). Eine Zone ohne feste Plätze (oder ohne `snap`) beansprucht
den Wurf gar nicht — `snapInto` fällt ans Raster durch, und wo keins liegt,
steht `snapped: false` und der Rand erscheint. Der **einzige** Fall, in dem er
in einer Zone ausbleibt, ist der, in dem die Zone dem Stück einen ihrer Plätze
gegeben hat. Dort ist kein Rand richtig: `offGrid` heißt „hat seinen Platz
verloren", nicht „steht auf keinem Rasterfeld". Sonst trüge jedes
Bösewicht-Tableau auf seiner Leiste dauerhaft einen Warnrand.

Abnahme 3 von M11.9 („Ein Stück ohne Rasterplatz hat den gestrichelten Rand,
auch in einer Zone") ist damit, **wörtlich gelesen, falsch gestellt** — sie
verlangte den Rand für jedes korrekt in einer Zone liegende Stück. Gelesen als
„auch in einer Zone verschwindet die Marke nicht stillschweigend" trägt sie,
und so ist sie geprüft.

---

## Q1 — Ein Zähler trägt einen Ausgangswert (M11.4)

**Warum.** Die Dorfphase setzt auf abgetippte Zahlen zurück und wirft damit
jeden dauerhaften Bonus weg. Der Ausgangswert gehört an den Zähler.

**Was.**

1. `shared/counters.js`: `normalizeCounter` führt `base` wie `max` — dieselbe
   Prüfung (`counterMax` liest beide Felder: „eine Zahl oder gar nichts"),
   und fehlt sie, fehlt das Feld.
2. `counterValueForm` bekommt die **fünfte** Lesart `'base'`; `counterValue`
   gibt dafür den Ausgangswert oder `null`, wenn es keinen gibt — genau wie
   `'max'` an einem Zähler ohne Obergrenze. Die vier vorhandenen bleiben.
3. `counterEdit` übersetzt beide Fälle in einen Satz für den Meldekasten
   (`counter has no starting value`), und der Hinweis auf eine unlesbare
   Eingabe zählt die fünfte Lesart mit auf.
4. `newCounterValue(max, base)`: ohne Obergrenze zählt der Ausgangswert.
   M8.6 Regel 2 (`max` gewinnt) bleibt, wie sie ist.

**Abnahme (Spec M11.4).** 2 → `"base"` setzt auf den Ausgangswert, `"max"`
weiterhin aufs Maximum. 3 → ein Zähler ohne Ausgangswert verhält sich
unverändert.

**Geprüft in** `server/test/counter-base.test.js`.

## Q2 — `place_counter` schreibt ihn, der Editor kennt ihn (M11.4)

**Warum.** Abnahme 4 setzt einen Ausgangswert voraus. Die zwölf Attributzähler
entstehen über `place_counter`, also steht er dort.

**Was.**

1. `shared/sequenceExecutor.js`, `place_counter`: `base: step.base` mit durch
   nach `normalizeCounter`. Nichts wird aus `value` abgeleitet.
2. `client/src/utils/sequenceSteps.js`: `place_counter` bekommt das Feld
   `base` (sechs statt fünf), `describeStep` sagt „back from 4", wenn es
   einen gibt, `validateStep` meldet ein `base`, das keine Zahl ist, mit
   demselben Satz wie bei `max`. Die Fehlermeldung von `set_counter` zählt
   `"base"` mit auf.
3. `client/src/components/SetupSequenceEditor.jsx`: ein Renderer `base`
   (Beschriftung „Start"), sonst zeichnete der Editor das Feld stillschweigend
   nicht — der Fund aus `docs/audit-dead-controls.md`.

**Abnahme (Spec M11.4).** 4 → die Dorfphase setzt auf den Ausgangswert zurück.

**Geprüft in** `server/test/counter-base.test.js` und
`server/test/sequence-steps.test.js` (angebaut).

## Q3 — Maximum und Ausgangswert sind am Tisch änderbar (M11.4)

**Warum.** Ausrüstung mit „+1 Max LEB" war nicht darstellbar; der Zähler zeigte
`4 / 3` und log. Und ein Ausgangswert, den man nicht ändern kann, ist nach dem
ersten schwarzen Dorf-Ereignis still falsch (M8.4).

**Was.** `GameTable.jsx`: der **vorhandene** Zähler-Dialog legt an *und*
bearbeitet — `editingCounterMetaId` sagt, welcher Fall gilt, `submitCounterModal`
ist der eine Knopf. Dazu ein Eintrag „Edit Name / Max / Start" im Kontextmenü
eines Zählers.

**Nicht am Widget selbst.** Es trägt schon Name, Wert und zwei 44-px-Knöpfe;
zwei weitere Eingabefelder machten es auf dem Tastfeld unbedienbar. Der Weg
über das Kontextmenü geht auf Touch über den Langdruck (M2.11).

**Abnahme (Spec M11.4).** 1 → beides lässt sich am Zähler ändern.

**Geprüft durch** `cd client && npx vite build` (die entscheidbare Hälfte steht
in Q1).

## Q4 — Das Aufdeck-Menü fragt die Brettseite (M11.5)

**Warum.** Das Ablegen respektiert die Seite seit M10.13, die Menüliste nicht —
dasselbe Muster wie in `docs/audit-dead-controls.md`: eine Fähigkeit, die in
der Nachbarschicht nicht angekommen ist.

**Was.**

1. `client/src/utils/revealToZone.js`: `revealZones` filtert über
   **`zoneRejects`** statt `zoneAccepts`. Das ist dieselbe Wache, die der
   Schritt dahinter gleich noch einmal befragt — eine Zone fällt also genau
   dann aus dem Menü, wenn der Griff an ihr scheitern würde. Eine eigene
   `facingAway`-Abfrage wäre eine zweite Lesart derselben Auskunft.
2. `GameTable.jsx`: `revealZones(tableZones)` statt `revealZones(zones)`.
   **Das ist die eigentliche Ursache**: `facingAway` ist ein Befund von
   `resolveZones`, und die rohe Zonenliste trägt es nie.

**Abnahme (Spec M11.5).** 1 → Dorfphase: Ladenauslage ja, Buchseiten nein.
2 → Kampfphase umgekehrt. 3 → Zonen ohne Seitenangabe stehen immer drin.

**Geprüft in** `server/test/reveal-to-zone.test.js` (angebaut).

## Q5 — Belegung zählt Plätze, nicht Rechtecke (M11.8)

**Warum.** Eine beiseitegelegte Bösewicht-Aktionskarte lag im Rechteck der
Heldentaten-Auslage, auf keinem ihrer sechs Plätze, zählte als Belegung und
verschob die Platzsuche.

**Was.**

1. `shared/zoneGeometry.js`: `onSlot(slot, o)` — die Prüfung, die `snapPoint`
   für `taken` seit jeher benutzt, steht jetzt einmal da statt zweimal;
   `freeSlots(zone, ...lists)` gibt die freien Plätze oder `null` (keine
   Plätze, oder Ablagestapel — dessen einer Platz nimmt beliebig viele);
   `countInZone` zählt bei Plätzen die **belegten Plätze**.
2. `objectsInZone` bleibt unverändert. Es beantwortet die andere Frage — *was*
   liegt hier —, und `clear_zone` soll die fremde Karte sehr wohl mitnehmen.
3. `shared/sequenceExecutor.js`: `zoneRoom` gibt zusätzlich die freien Plätze
   zurück, `spotFor` setzt das i-te Ding auf den i-ten **freien**. Damit
   entfällt der Klammergriff `slots[Math.min(start + i, slots.length - 1)]`,
   der überzählige Karten deckungsgleich auf den letzten Platz legte — an
   allen fünf Stellen (`deal_to_zone`, `draw_assets`, `clear_zone` mit Zone,
   Geländekarten, `place_card`).

**Abnahme (Spec M11.8).** 1 → die fremde Karte zählt nicht. 2 → zwei
ausgeteilte Karten landen nie deckungsgleich. 3 → eine Zone ohne feste Plätze
zählt unverändert.

**Bewusst hingenommen.** Eine von Hand *neben* einen Platz gelegte Karte zählt
nun nicht mehr — die Zone hält sie für leer und teilt darauf aus. Das ist
wörtlich Abnahme 1, und der Ausweg heißt `snap: true` (siehe C3/M10.11).

**Geprüft in** `server/test/zone-occupied-slots.test.js`.

## Q6 — Der Griff in die Mitte nimmt das große Stück (M11.9)

**Warum.** `pickTopmost` lässt die kleinere Fläche gewinnen; der Mittelpunkt
des Bösewichts liegt auf der Ecke des Dörflerkastens, und dort gewann bisher
der Dörfler.

**Was.** `client/src/utils/tokenLayer.js`, `pickTopmost` in zwei Durchgängen:
erst die Stücke unter dem Zeiger sammeln, dann **die Mitten**. „In der Mitte"
heißt: der Zeiger liegt je Achse weniger als ein halbes Feld vom Mittelpunkt
entfernt, und als Feldmaß dient die kürzeste Kante des kleinsten Stücks unter
dem Zeiger — mehr als ein Längenmaß hat die Trefferwahl nicht, und ein
geratenes wäre eines zuviel. Unter den Mitten entscheidet der nähere
Mittelpunkt, bei Gleichstand wieder die kleinere Fläche. Gibt es keine Mitte,
gilt die Ordnung von M8.2/M9.1/M10.1 unverändert.

**Abnahme (Spec M11.9).** 1 → der Griff in die Mitte nimmt den Bösewicht.
2 → der Griff auf dem Feld des Dörflers nimmt den Dörfler.

**Geprüft in** `server/test/pick-topmost.test.js` (angebaut; die sieben Fälle
von M10.1 und M8.2 laufen unverändert mit).

## Q7 — Der Beleg, dass der gestrichelte Rand in Zonen erscheint (M11.9)

**Warum.** „Nichts zu tun" gilt nur geprüft. Die Vermutung des Spielers wird
gegen die vorhandene Kette gefahren.

**Was.** Kein Code. `server/test/off-grid.test.js` fährt `snapInto`/`offGrid`
gegen drei Zonen: ohne Plätze → `snapped: false` → Rand; mit Plätzen →
`snapped: true` → kein Rand, und das ist richtig; ohne vorherige Adresse → kein
Rand (M10.10 Abnahme 3).

**Offen für den Auftraggeber.** Wenn der Rand am Tisch trotzdem ausblieb, lag
das Stück auf einem Zonenplatz — dann hat es einen Platz und ist nicht „vom
Raster". Wenn nicht, trug die Zone `snap: false` und einen Zonenplatz zugleich,
und dann steht der Befund in `setups.zone_data`, nicht im Code (vgl. C3/C4).

## Q8 — Escape schließt Vergrößerung und Views-Menü (M11.7)

**Was.** `client/src/utils/escapeLayers.js`: `cardPreview` **vor**
`contextMenu` (die Vergrößerung deckt den ganzen Bildschirm und liegt über dem
Menü, aus dem sie geöffnet wird), `viewsMenu` **nach** `cardDrawer` (eine
Klappliste, die keine Entscheidung verlangt). Die dreizehn vorhandenen behalten
ihre Reihenfolge. `GameTable.jsx` reicht beide Zustände hinein und schließt
sie.

**Abnahme (Spec M11.7).** 1, 2 → beide gehen zu. 3 → die Reihenfolge der
vorhandenen bleibt, geprüft als Filter über die alte Liste.

**Geprüft in** `server/test/escape-layers.test.js` (angebaut).

## Q9 — „Enlarge" gibt es auch für Tokens (M11.6)

**Was.**

1. `client/src/utils/tableObjectView.js`: `tokenPreview(token)` → `{ src,
   caption, ratio }` oder `null`. Welche **Seite** gezeigt wird, entscheidet
   hier nichts: `imageUrl` trägt sie bereits, weil `assetFace` sie beim
   Umdrehen tauscht (M3d). Die Bildunterschrift kommt aus `tableObjectView`,
   also gilt „verdeckt heißt überall verdeckt" auch hier.
2. `GameTable.jsx`: ein Menüeintrag „Enlarge" für Token **mit** Bild — ein
   geometrisches Token bildschirmfüllend zu zeigen bringt nichts, und ein
   Eintrag, der eine leere Fläche öffnet, ist der Fehler aus
   `docs/audit-dead-controls.md`. Dazu die Ansicht, in derselben Form wie die
   Kartenvorschau (74 vh, Bildunterschrift darunter).

**Abnahme (Spec M11.6).** 1 → das Menü hat „Enlarge". 2 → bildschirmfüllend.
3 → die obenliegende Seite.

**Geprüft in** `server/test/hidden-object-name.test.js` (angebaut).

---

## Was in die Produktionsdatenbank muss

Alles Folgende steht in `setups.sequence_data` des Townsfolk-Tussle-Setups und
wird im Sequenz-Editor (`?mode=setup`) eingetragen. **Ohne diese Einträge
ändert sich am Tisch nichts** — der Code kann den Ausgangswert, aber niemand
hat einen eingetragen.

### 1. Anfangsaufbau: neun `place_counter`-Schritte bekommen ein `base`

Die drei **Lebens**-Zähler brauchen keines (die Dorfphase setzt sie auf `max`).
Die übrigen neun bekommen im Feld **„Start"** dieselbe Zahl, die schon im Feld
„Value" steht:

| Zähler | Value | neu: Start |
|---|---|---|
| `<Dörfler 1>: BEW` | wie gehabt | dieselbe Zahl |
| `<Dörfler 1>: <Attribut 2>` | wie gehabt | dieselbe Zahl |
| `<Dörfler 1>: <Attribut 3>` | wie gehabt | dieselbe Zahl |
| `<Dörfler 2>: BEW` | wie gehabt | dieselbe Zahl |
| `<Dörfler 2>: <Attribut 2>` | wie gehabt | dieselbe Zahl |
| `<Dörfler 2>: <Attribut 3>` | wie gehabt | dieselbe Zahl |
| `<Dörfler 3>: BEW` | wie gehabt | dieselbe Zahl |
| `<Dörfler 3>: <Attribut 2>` | wie gehabt | dieselbe Zahl |
| `<Dörfler 3>: <Attribut 3>` | wie gehabt | dieselbe Zahl |

Die Lebenszähler (`… : Leben`) behalten ihr `max` und brauchen kein `base`.
Der Münzvorrat braucht keines — ihn setzt niemand zurück.

### 2. Aktion „Dorfphase beginnen": neun `set_counter`-Schritte auf `base`

Dieselben neun. Wo heute eine abgetippte Zahl steht, steht künftig das Wort
**`base`**:

| Schritt | vorher | nachher |
|---|---|---|
| `set_counter <Dörfler 1>: BEW` | `4` | `base` |
| `set_counter <Dörfler 1>: <Attribut 2>` | Zahl | `base` |
| `set_counter <Dörfler 1>: <Attribut 3>` | Zahl | `base` |
| `set_counter <Dörfler 2>: BEW` | Zahl | `base` |
| `set_counter <Dörfler 2>: <Attribut 2>` | Zahl | `base` |
| `set_counter <Dörfler 2>: <Attribut 3>` | Zahl | `base` |
| `set_counter <Dörfler 3>: BEW` | Zahl | `base` |
| `set_counter <Dörfler 3>: <Attribut 2>` | Zahl | `base` |
| `set_counter <Dörfler 3>: <Attribut 3>` | Zahl | `base` |

Die drei `set_counter … Leben` stehen bereits auf `max` und **bleiben, wie sie
sind** (M8.4 Schritt 2).

### 3. Nichts weiter

M11.5, M11.6, M11.7, M11.8 und M11.9 brauchen **keinen** Eintrag. Zwei
Einstellungen sind trotzdem einen Blick wert, weil sie den Nutzen der Arbeit
entscheiden:

- **`Nachschub-Auslage` und `Heldentaten-Auslage` sollten `snap: true` tragen**
  (Zoneneditor). Ohne das rasten von Hand zurückgelegte Karten nicht auf ihre
  Plätze ein, und seit Q5 zählen sie dann auch nicht mehr als Belegung. Das
  ist dieselbe offene Frage wie in C3/C4 zu M10.11.
- **`Nachschub-Auslage` braucht `anchorSide: 'back'`, `Aktionen` und `Ablage`
  `anchorSide: 'front'`** — sonst kann Q4 nichts aussortieren. Wenn das
  Aufdeck-Menü nach dem Einspielen immer noch alle drei anbietet, fehlt die
  Seitenangabe im Setup, nicht im Code.

### Zum Spielen am Tisch

Ausrüstung, die einen Wert dauerhaft hebt („+1 Max LEB", Sheriff-Puppe), wird
**von Hand** eingetragen: Rechtsklick auf den Zähler (auf Touch: Langdruck) →
„Edit Name / Max / Start" → Maximum bzw. Start um eins erhöhen. Das ist
ausdrücklich Handarbeit (M11.4 Regel 3) — wie am echten Tisch, wo die Karte
neben dem Tableau liegen bleibt.
