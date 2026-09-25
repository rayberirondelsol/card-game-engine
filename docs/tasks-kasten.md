# Aufgaben: der Kasten dreht mit (Spec M13.4)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M13.4**. Nummern sind
`KA…` (zwei Buchstaben), weil A–H, J–L, N, P–Z als einzelne Buchstaben und `DR`
als Paar in den übrigen `docs/tasks-*.md` belegt sind. `KA` kollidiert mit
nichts.

**Vorgeschichte.** M13.1 (`docs/tasks-drehen.md`) hat das Drehen gebaut: es
schreibt heute **nur** `rotation`. Abweichung 3 dort hat den Befund erhoben, der
jetzt M13.4 ist — ein `Holzzaun` von 200×50 steht nach 90° quer, aber auf ein
Viertel gestaucht, weil `object-fit: contain` ein 4∶1-Bild in einen 1∶4-Kasten
einpasst. Die dort formulierte Abnahme 4' („der Kasten bleibt 200×50") ist damit
**überholt**; ein Nachtrag steht in `docs/tasks-drehen.md`.

**Gilt für jede Aufgabe.** Reine Logik gehört nach `shared/`, weil der Client
keine Testinfrastruktur hat (`CLAUDE.md`); geprüft wird sie aus `server/test/`.
Die Verdrahtung in `client/src/pages/GameTable.jsx` prüft `cd client && npx vite
build` — zwei Warnungen sind vorbestehend (doppeltes `data-testid`, Chunk-Größe),
eine dritte wäre ein Fehler.

Tests laufen mit `cd server && npm test` (Stand vorher: **980 grün**,
danach **994**).

---

## Wo die Spec nicht stimmt

Sechs Behauptungen sind einzeln am Code nachgerechnet worden. **Vier stimmen**,
zwei sind zu ungenau, und eine Abnahme ist so, wie sie dasteht, nicht erfüllbar.

### Was stimmt

1. **An `TokenShape` ist nichts zu ändern.** Nachgerechnet an
   `GameTable.jsx:318`: der Kasten ist `w × h`, das `<img>` bekommt bei
   `swap` (90/270) `width: h`, `height: w` und `rotate(90deg)`. Steht der Kasten
   auf 50×200, bekommt das Bild 200×50, gedreht belegt es 50×200 — es füllt den
   Kasten genau, `object-fit: contain` staucht nichts mehr. Die `swap`-Zeile aus
   M7.1 ist richtig; ihr fehlte nur ein Kasten, der mitgedreht hat.
2. **`snapInto` kann ohne `cell` aufgerufen werden und zentriert dann.** Ohne
   `cell` ist `held` in `snapToGrid` `null`, die Grundfläche kommt aus
   `footprint(grid, size)`, und `rangeAt` rechnet
   `round(x / cellW − cols / 2)` — der Bereich wird um den Punkt zentriert,
   genau wie beim Ziehen von Hand. Läuft er über den Rand, antwortet `rangeAt`
   `null` und `snapInto` liefert `snapped: false`.
3. **Ein Token an einer Karte behält Ort und Bindung — die Regel gibt es
   schon.** `handleObjDragEnd` (`GameTable.jsx:2392`) setzt beim Anhängen
   ausdrücklich `gridId: null, cell: null`: Anhängen ist die genauere Aussage
   und löscht die Rasteradresse. Ein angehängtes Token trägt also gar keine, und
   die Bedingung „nur wo eine Rasteradresse dasteht" deckt Abnahme 5 bereits ab.
   Die ausdrückliche `attachedTo`-Abfrage bleibt trotzdem stehen: sie kostet
   nichts und schreibt die Regel dorthin, wo man sie sucht.
4. **Abnahme 6 (Speichern/Laden) verlangt keine Zeile.** Beide Feldlisten
   (`:3303`/`:3313`/`:3316` und `:3929`/`:3937`/`:3938`) führen `width`,
   `height`, `rotation`, `gridId`, `cell` und `offGrid` seit M7.1 bzw. M10.10,
   und `placeOnGrids` rechnet die Maße eines *Bereichs* beim Laden ohnehin aus
   dem Feldnamen nach. Ein gedrehter Zaun auf `C2:C5` kommt als 50×200 zurück.

### Abweichung 1 — „wo ein Raster darunter liegt" ist die falsche Bedingung

Die Spec sagt, `rotatePlacement` gebe `x`, `y`, `gridId`, `cell`, `offGrid`
zurück, „wo ein Raster darunter liegt". Wörtlich genommen wäre das eine
geometrische Frage (`gridAt(grids, x, y)`) — und damit ein Fehler.

`snapInto` hält Zonenplätze ausdrücklich über dem Raster („ZONE PLACES BEAT THE
GRID") und schreibt einem Objekt auf einem Zonenplatz `gridId: null, cell: null`.
Ein Bösewicht im Bosse-Balken liegt also auf einem Zonenplatz, obwohl unter ihm
ein Raster gezeichnet sein kann. Würde `rotatePlacement` geometrisch fragen,
spränge er beim Drehen vom Balken auf das Feld darunter.

**Richtig ist die Bedingung am Objekt:** neu eingerastet wird nur, wenn das Token
`gridId` **und** `cell` trägt. Damit ist auch die Frage nach `taken` beantwortet
— die schon belegten Plätze einer Zone braucht `rotatePlacement` **nicht**, weil
es nie einen Zonenplatz sucht. `zone` und `taken` kommen nicht vor, und das ist
kein Loch in der Spec, sondern die Folge daraus, dass Drehen ein Token nicht aus
seiner Zone nimmt.

### Abweichung 2 — die getauschten Maße kommen nicht doppelt, aber auch nicht immer

Gefragt war, ob `snapToGrid` die Maße schon zurückschreibt und
`rotatePlacement` sie damit doppelt vorgäbe. **Die Antwort ist: nein, und die
Umkehrung ist das Problem.** `snapToGrid` schreibt `width`/`height` nur unter
`if (ranged)` — also nur, wenn der getroffene Bereich mehr als ein Feld hat.
Ein Token, das nach der Drehung auf **einem** Feld liegt (oder auf gar keinem
Raster), bekommt von dort **keine** Maße.

`rotatePlacement` muss die getauschten Maße darum selbst setzen, und das
Ergebnis von `snapInto` muss darüber gelegt werden, nicht darunter: auf einem
Raster mit anderer Feldgröße sind die Feldmaße die richtige Antwort (ein
200×50-Zaun über einem 60er-Raster wird 60×180, nicht 50×200) — dieselbe
Vorrangregel, die `placeOnGrids` beim Laden anwendet. Reihenfolge ist hier
Verhalten, nicht Geschmack.

### Abweichung 3 — Abnahme 2 ist so nicht erfüllbar

> „2. Zweimal 90° bringt ihn in die Waagerechte zurück, mit `width` 200 und
> `height` 50."

Die Maße stimmen. **Der Ort nicht.** Nachgerechnet auf einem 50er-Raster mit
einem Zaun auf `A3:D3` (Mitte 100/125):

| Schritt | Feldbereich | Mitte | Maße |
|---|---|---|---|
| Ausgangslage | `A3:D3` | 100 / 125 | 200 × 50 |
| nach 90° | `C2:C5` | 125 / 150 | 50 × 200 |
| nach 180° | `B4:E4` | 150 / 175 | 200 × 50 |

Der Grund steht in der Spec selbst, im Abschnitt „Nicht in dieser Aufgabe": ein
Bereich aus vier mal einem Feld hat seine Mitte auf einer Feldgrenze, einer aus
einem mal vier Feldern auf einer Feldmitte. Beim Paritätswechsel gibt es keinen
ganzzahligen Mittelpunkt, und `rangeAt` rundet — immer in dieselbe Richtung.
Der Zaun wandert deshalb je Vierteldrehung ein halbes Feld nach rechts unten.

Das ließe sich nur beheben, indem der Bereich um seinen **eigenen** Mittelpunkt
transponiert wird — und genau das schließt die Spec aus. Die Abnahme wird darum
neu formuliert:

> 2'. Zweimal 90° bringt den Zaun in die Waagerechte zurück: `width` 200,
> `height` 50, und er liegt wieder über vier Felder waagerecht. Sein Ort darf
> dabei um ein halbes Feld je Vierteldrehung gewandert sein — beim Wechsel
> zwischen gerader und ungerader Feldzahl gibt es keinen ganzzahligen
> Mittelpunkt, und das Verschieben auf den nächsten gültigen Bereich ist
> dieselbe Rechnung wie beim Ziehen von Hand. Wer das nicht will, braucht die
> Transposition um den eigenen Mittelpunkt, die die Spec ausdrücklich
> ausschließt.

### Entscheidung — `rotatePlacement` gehört nach `shared/gridGeometry.js`

Die Spec sagt nur `shared/`. In Frage kamen zwei Module:

- **`assetToken.js`** kennt kein Raster und importiert nichts. Es beantwortet
  „was ist ein Token" und „welcher Winkel steht da" (`rotationOf`,
  `nextRotation`). Die Funktion dorthin zu legen hieße, `gridGeometry.js` von
  dort zu importieren — und damit Rasterwissen in das Modul zu ziehen, das der
  „Add Token"-Dialog gerade deshalb benutzt, weil es keins hat.
- **`gridGeometry.js`** ist bereits das Modul über *Platzierung*: `snapInto`,
  `offGrid`, `placeOnGrids`, `gridAddress`. Es importiert `anchoring.js` und
  `zoneGeometry.js`; `assetToken.js` importiert nichts, ein Import von dort ist
  also zyklenfrei.

Ein drittes Modul für eine Funktion wäre eine Datei mehr ohne Gegenwert.
**`rotatePlacement` kommt nach `shared/gridGeometry.js`** und holt sich
`nextRotation` aus `assetToken.js` — die eine Winkelauslegung bleibt die eine.

---

## KA1 — `rotatePlacement` in `shared/gridGeometry.js`

**Befund.** Drehen schreibt heute nur `rotation` (M13.1/DR2). Der Kasten bleibt
`w × h`, und ein nicht quadratisches Bild wird in seinen ungedrehten Kasten
eingepasst — der `Holzzaun` (200×50) steht nach 90° als 12,5×50-Strich in der
Mitte. Es gibt keine Funktion, die sagt, was nach einer Drehung am Token gilt.

**Änderung.** Eine reine Funktion `rotatePlacement(token, { grids, step })`,
die das zurückgibt, was danach am Token gilt:

- `rotation` über `nextRotation(token.rotation, step)` — keine zweite
  Winkelrechnung.
- Ist `step` keine Vierteldrehung, gilt gar nichts weiter: zurück kommt nur der
  unveränderte Winkel. `nextRotation` sagt das bereits.
- Sonst tauschen `width` und `height` (Rückfall auf `size` für Token aus
  Ständen vor M3c).
- Trägt das Token `attachedTo` oder keine Rasteradresse (`gridId` **und**
  `cell`), ist Schluss: Ort, Bindung und Feldname bleiben.
- Sonst fragt sie `snapInto` mit den **getauschten** Maßen und **ohne** den
  alten Feldnamen. Es gibt weiterhin eine Einrastrechnung.
- Rastet es ein, gelten dessen `x`, `y`, `gridId`, `cell` und — wo ein Bereich
  herauskommt — dessen Maße **über** den getauschten (Abweichung 2);
  `offGrid: false`.
- Rastet es nicht ein (der gedrehte Bereich liefe über den Rand), gilt
  `gridId: null, cell: null, offGrid: true`; Ort und Winkel bleiben. Gelesen
  wird das über `offGrid(token, hit)`, nicht über ein zweites Auswerten von
  `snapped`.

**Abnahme.**
- Ein `Holzzaun` (200×50) auf `A3:D3` eines 50er-Rasters liegt nach 90° auf
  `C2:C5`, misst 50×200 und ist nicht gestaucht (Spec-Abnahme 1).
- Zweimal 90° gibt 200×50 und einen waagerechten Vierfeld-Bereich zurück; der
  Ort darf um ein halbes Feld je Drehung gewandert sein (Abnahme 2').
- Ein Bösewicht (100×100) auf `C3:D4` liegt nach jeder Drehung auf `C3:D4`, mit
  gleicher Mitte und gleichen Maßen (Spec-Abnahme 3).
- Ein Zaun auf `A1:D1` (an der obersten Zeile) liefe gedreht über den Rand:
  `rotation` steht, `offGrid` ist `true`, `gridId`/`cell` sind `null`, `x`/`y`
  unverändert (Spec-Abnahme 4).
- Ein Token mit `attachedTo` behält `x`, `y`, `attachedTo` und `attachedCorner`;
  nur `rotation` und die Maße ändern sich (Spec-Abnahme 5).
- Ein Token ohne Raster unter sich behält `x`/`y`; `gridId`/`cell` bleiben
  `null`, `offGrid` wird nicht gesetzt.
- Ein Token, das nur `size` trägt, bekommt getauschte Maße aus `size`.
- `step: 180`, `0` oder `undefined` ändern weder Maße noch Ort.

---

## KA2 — Der Tisch dreht über `rotatePlacement`

**Befund.** Die beiden Dreh-Einträge im Kontextmenü (`GameTable.jsx:7539` ff.,
M13.1/DR2) setzen `rotation` und sonst nichts — der Kommentar darüber sagt es
ausdrücklich: „Gedreht wird **nur** `rotation`". Genau das ist der Befund von
M13.4.

**Änderung.** `turn(step)` legt statt des Winkels das Ergebnis von
`rotatePlacement(tok, { grids: tableGrids, step })` auf das Token und schickt es
mit — Ort und Adresse wie bei `token_move`, über `gridAddress`, damit nicht zwei
Listen nebeneinander stehen. Der Kommentar über dem Block wird auf M13.4
umgeschrieben; die Bedingungen (`shape === 'image'`, kein `locked`) bleiben.

**Abnahme.**
- `cd client && npx vite build` läuft ohne **neue** Warnung durch.
- Quelltest in `server/test/` (Muster `client-hygiene.test.js`): `GameTable.jsx`
  importiert `rotatePlacement` aus `shared/gridGeometry.js`, ruft es im
  Dreh-Zweig auf und schickt die Adresse über `gridAddress` mit.
- Der Tisch rechnet den Winkel nicht mehr selbst in den `setTokens`-Aufruf —
  `nextRotation` wird im Dreh-Zweig nicht mehr direkt aufgerufen.

---

## KA3 — `token_rotate` überträgt die Platzierung, nicht nur den Winkel

**Befund.** `handleTokenRotate` (`messageHandler.js:341`) setzt `token.rotation`
und sendet `{ token_id, rotation }`. Dreht der erste Platz einen Zaun, sähe der
zweite ihn gedreht, aber in der alten Größe auf dem alten Feld — und beim
nächsten Laden zöge `placeOnGrids` ihn dorthin zurück. Dasselbe Loch, das
`token_move` mit `gridAddress` schon geschlossen hat.

**Änderung.** `handleTokenRotate` nimmt zusätzlich `x`, `y` und die
Adressfelder über `gridAddress(payload)` — **ein** zweiter Handler wird nicht
gebaut, und die Feldliste ist dieselbe wie bei `token_move`.

- Der Winkel geht weiter durch `rotationOf`; Unlesbares wird verworfen.
- Fehlen `x`/`y`, bleiben sie unangetastet: ein älterer Client, der nur den
  Winkel schickt, darf den Ort nicht löschen (dieselbe Haltung wie bei den
  Adressfeldern).
- Der Broadcast trägt nur, was drinstand — weder Name noch Bild, wie bisher.
- Im Tisch legt der `case 'token_rotate'` dasselbe an: `rotation`, `x`/`y` wenn
  da, `gridAddress(msg)`.

**Abnahme.**
- `token_rotate` mit `rotation`, `x`, `y`, `gridId`, `cell`, `width`, `height`,
  `offGrid` setzt alle acht auf der Serverkopie und meldet sie weiter
  (Spec-Abnahme 6).
- `token_rotate` mit nur `rotation` setzt nur den Winkel; `x`, `y`, `gridId`
  und `cell` bleiben stehen, und die Nachricht trägt genau die fünf Felder von
  M13.1 (`type`, `token_id`, `rotation`, `from_player_id`, `timestamp`).
- Ein unlesbarer Winkel wird weiterhin verworfen: keine Adresse wird
  geschrieben, nichts gemeldet.
- Ein unbekanntes `token_id` tut nichts und wirft nicht.

---

## KA4 — Die überholte Festschreibung von Abnahme 4' ersetzen

**Befund.** Zwei Prüfungen in `server/test/token-rotate.test.js` schreiben die
Entscheidung aus M13.1 fest:

- „ein 200x50-Geländeteil behält seinen Kasten über vier Drehungen" behauptet
  `width`, `height`, `gridId` und `cell` unverändert. Der Test bleibt grün,
  weil er auf einem Objektliteral rechnet und nicht auf Produktionscode — er
  sagt ab sofort etwas Falsches über den Tisch.
- der Quelltest „der Tisch dreht über `nextRotation`" sucht einen Aufruf, den
  KA2 entfernt. Bliebe er stehen, hielte er den Import am Leben, der nach KA2
  niemanden mehr bedient — genau die tote Verdrahtung aus
  `docs/audit-dead-controls.md`.

**Änderung.** Beide gehen auf M13.4 über: der erste durch `rotatePlacement`
(die Maße tauschen, der Feldbereich dreht mit), der zweite sucht
`rotatePlacement` aus `shared/gridGeometry.js` und verlangt zusätzlich, dass
`nextRotation` im Tisch **nicht mehr** vorkommt — die eine Winkelrechnung steht
dann nur noch in `rotatePlacement`. Die Abnahme für den **Bösewicht** (2×2,
M13.1-Abnahme 3) bleibt Wort für Wort stehen — sie gilt unverändert, und dass
sie das tut, ist der Kern der Sache.

**Abnahme.** `cd server && npm test` ist vollständig grün, und kein Test
behauptet mehr, der Kasten bleibe beim Drehen stehen.
