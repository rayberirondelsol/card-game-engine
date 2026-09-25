# Aufgaben: ein Token am Tisch drehen (Spec M13.1)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M13.1**. Nummern sind
`DR…` (zwei Buchstaben), weil A–H, J–L, N, P–Z in den übrigen `docs/tasks-*.md`
belegt sind; `M` bleibt den Meilensteinen, `I` und `O` sind als Ziffernzwillinge
vermieden. Damit kollidiert `DR` mit nichts.

**Gilt für jede Aufgabe.** Reine Logik gehört nach `shared/`, weil der Client
keine Testinfrastruktur hat (`CLAUDE.md`); geprüft wird sie aus `server/test/`.
Die Verdrahtung in `client/src/pages/GameTable.jsx` prüft `cd client && npx vite
build`. **„Nichts zu tun" ist eine gültige Antwort, aber nur eine geprüfte** —
für die Abnahmepunkte 3, 4 und 5 ist es die Antwort, und DR4 ist der Beleg.

Tests laufen mit `cd server && npm test` (Stand vorher: **964 grün**), der Bau
mit `cd client && npx vite build`.

---

## Wo die Spec nicht stimmt

Sechs Behauptungen aus dem Befund sind einzeln nachgeprüft worden. **Vier
stimmen, zwei nicht ganz**, und eine Abnahme stimmt nur in ihrem Wortlaut, nicht
in ihrer Absicht.

### Was stimmt

1. **`TokenShape` rendert `rotation` samt Maßtausch.** `GameTable.jsx:184`,
   Zweig `case 'image'`: `const swap = rotation === 90 || rotation === 270;`,
   und das `<img>` bekommt `width: swap ? h : w`, `height: swap ? w : h` plus
   `transform: translate(-50%, -50%) rotate(${rotation}deg)`. Die Token-Liste
   reicht `rotation={token.rotation || 0}` durch (`:5284`). Es ist nichts zu
   bauen.
2. **Der Kasten bleibt `w × h`, die Geometrie ist nicht betroffen.**
   `grep -n "rotation" shared/gridGeometry.js shared/anchoring.js
   shared/zoneGeometry.js` findet **null Treffer**. `snapInto`, `footprint`,
   `placeOnGrids` und `cellAt` rechnen ausschließlich mit `x/y/width/height/
   size`. Solange Drehen nur `rotation` schreibt, kann keine dieser Funktionen
   ein anderes Ergebnis liefern. Die Annahme, auf der die Kleinheit der Aufgabe
   beruht, **trägt**.
3. **Für Tokens gibt es keine Auswahl.** Es existiert genau ein
   Auswahl-Zustand, `selectedCards` (`GameTable.jsx:558`), und er hält
   `tableId`s von Karten. `E`/`Q` (`:4485`–`:4515`) lesen ihn. Nichts davon
   kennt Tokens; während des Ziehens gibt es nur `draggingObj`.
4. **`messageHandler.js` kennt vier Token-Aktionen**, `token_move`,
   `token_create`, `token_delete`, `token_flip` (`:55`–`:62`). Kein Drehen.

### Abweichung 1 — das Kontextmenü eines Tokens hat vier Einträge, nicht drei

Der Befund zählt „Lock, Flip (M3d) und Enlarge (M11.6)". Tatsächlich steht dort
(`GameTable.jsx:7481`–`7566`):

| Eintrag | Bedingung |
|---|---|
| Lock / Unlock | immer |
| 🔄 Flip | `shape === 'image'` **und** `backImageUrl` |
| Enlarge | `tokenPreview(token)` ist nicht `null` |
| Delete | immer |

**Delete** fehlt in der Aufzählung des Befunds, und **Flip ist enger gefasst**,
als der Befund es beschreibt: ein Bild-Token ohne Rückseite bekommt ihn nicht.

*Folge für die Aufgabe:* keine. Die neuen Einträge hängen laut Spec nur an
`shape === 'image'` — sie brauchen keine Rückseite, weil sich auch eine
einseitige Figur drehen lässt. Die Reihenfolge im Menü ist damit Lock, Flip,
**Links/Rechts herum**, Enlarge, Delete: die Dreh-Einträge stehen bei den
anderen bildbezogenen Aktionen und über der Löschzeile.

### Abweichung 2 — Karten drehen unbegrenzt, aber an **acht** Stellen

Der Befund stimmt in der Sache: keine der Karten-Drehungen normalisiert. Er
erweckt aber den Eindruck, es sei eine Stelle. Es sind vier Paare:

- `:1126` / `:1139` — Tastenkürzel `E`/`Q` im globalen Handler
- `:4347` / `:4356` — Doppelklick bzw. Radgeste
- `:4499` / `:4510` — `rotateSelectedCards`
- `:7212` / `:7228` — Kontextmenü der Karte

Alle acht schreiben `(c.rotation || 0) ± 90` roh. **Wird in dieser Aufgabe nicht
angefasst** (so die Spec) — festgehalten wird es, damit niemand glaubt, eine
Zeile reiche, wenn es später doch mitgezogen wird.

### Abweichung 3 — Abnahme 4 stimmt wörtlich, aber nicht in ihrer Absicht

> „Ein nicht quadratisches Geländeteil (z. B. `Holzzaun`, 200×50) zeigt nach 90°
> quer, ohne aus seinem Kasten zu laufen."

Wörtlich: **erfüllt**, und zwar schon heute. Nachgerechnet am Renderer: der
Kasten ist 200×50, das `<img>` bekommt bei `swap` die Maße 50×200, wird um 90°
gedreht und belegt danach auf dem Schirm exakt 200×50. Nichts läuft heraus, das
`overflow-hidden` des Kastens greift gar nicht erst.

Der Haken ist die Absicht. `object-fit: contain` passt ein 4∶1-Bild in einen
1∶4-Kasten ein — der Zaun wird auf **ein Viertel** seiner Länge gestaucht und
steht als schmaler Strich von 12,5×50 in der Mitte des 200×50-Kastens. Er zeigt
quer, aber er ist nicht mehr so lang wie vorher.

Das ist **kein Fehler dieser Aufgabe, sondern die Entscheidung aus M7.1**. Im
Szenario fällt es nicht auf, weil dort der *Autor* den Kasten mitdreht: ein quer
liegender Zaun wird auf einen 1×4-Feldbereich geschrieben, `rangeBox` gibt
50×200, und das Bild füllt ihn. Wer am Tisch dreht, ändert den Kasten nicht —
und **darf ihn nicht ändern**, denn `width`/`height` zu tauschen hieße, die
Feldbelegung zu tauschen, was Abnahme 3 („dieselben vier Felder") sofort
verletzte und `snapInto`/`footprint`/`placeOnGrids` doch anfasste.

**Abnahme 4 wird darum neu formuliert:**

> 4'. Ein nicht quadratisches Geländeteil (`Holzzaun`, 200×50) behält nach 90°
> seinen Kasten von 200×50 — `width`, `height`, `gridId` und `cell` sind
> unverändert —, und der Renderer tauscht für das Bild die Maße. Dass das Bild
> dabei eingepasst und damit kürzer wird, ist die Entscheidung aus M7.1 und
> **kein Mangel dieser Aufgabe**. Wer den Zaun in voller Länge quer liegen
> haben will, braucht einen eigenen Befund: „die Drehung dreht den Kasten mit",
> und der berührt Feldbelegung und Raster.

**Nachtrag.** Den hier geforderten eigenen Befund gibt es: er steht als
**M13.4** in `docs/spec-setup-system.md` („Ein gedrehter Zaun wird auf ein
Viertel gestaucht") und ist in `docs/tasks-kasten.md` umgesetzt. Damit ist
**Abnahme 4' überholt** — der Kasten dreht mit, `width` und `height` tauschen,
und der Feldbereich wird über `snapInto` neu bestimmt. Was bleibt: der Bösewicht
auf 2×2 liegt nach wie vor auf denselben vier Feldern (Abnahme 3), weil der
Tausch bei einem quadratischen Token ein Nullzug ist. Was in DR4 als Prüfung von
4' stand, ist in `token-rotate.test.js` entsprechend ersetzt (KA4).

### Lücke — was `nextRotation` bei einem unlesbaren Winkel tut, sagt die Spec nicht

`rotationOf` hat zwei Ausgänge: `0` für „steht nichts da" und **`null`** für
„steht etwas da, aber kein erlaubter Winkel" (`45`, `'abc'`, `360`). Die Spec
sagt nur, `nextRotation` lese ihren Eingang darüber.

**Entschieden:** `null` wird wie „steht nichts da" behandelt, also `0`. Ein
unlesbarer Winkel weiterzureichen hieße, ihn zu speichern — genau das, was
Punkt 3 der Spec für die Mehrspieler-Aktion verbietet. Und `360` als „Eingang"
ist kein Sonderfall, sondern der Normalfall: so sähe eine Karte aus, die
viermal gedreht wurde.

Daraus folgt auch, was „etwas anderes gibt den unveränderten Winkel zurück"
heißt: zurück kommt der **ausgelegte** Winkel (`rotationOf(current) ?? 0`),
nicht der rohe Eingang. `nextRotation(360, 0)` ist `0`, nicht `360`.

---

## DR1 — `nextRotation` in `shared/assetToken.js`

**Befund.** `shared/assetToken.js` hat `ROTATIONS = [0, 90, 180, 270]` und
`rotationOf(value)`. Es gibt keine Funktion, die von einem Winkel zum nächsten
kommt. Jeder Aufrufer müsste selbst rechnen — und würde dabei entweder
unbegrenzt hochzählen (wie die acht Karten-Stellen) oder eine zweite Auslegung
eines Winkels danebenstellen.

**Änderung.** Eine reine Funktion `nextRotation(current, step)` neben
`rotationOf`:

- Eingang über `rotationOf(current) ?? 0` — **keine zweite Auslegung**.
- `step` ist `+90` oder `−90`; alles andere gibt den ausgelegten Winkel
  unverändert zurück.
- Der Rücklauf läuft um: `270 + 90 → 0`, `0 − 90 → 270`.
- Das Ergebnis liegt immer in `ROTATIONS`.

**Abnahme.**
- `nextRotation(0, 90) === 90`, `nextRotation(270, 90) === 0`,
  `nextRotation(0, -90) === 270`, `nextRotation(90, -90) === 0`.
- Viermal `+90` von `0` ergibt wieder `0` (Spec-Abnahme 2), viermal `−90`
  ebenso.
- `nextRotation(undefined, 90) === 90` und `nextRotation(null, 90) === 90` —
  ein Token von vor M7.1 dreht sich wie eines von heute.
- `nextRotation(45, 90) === 90` und `nextRotation(360, 90) === 90` — ein
  unlesbarer Winkel gilt als `0`.
- `nextRotation(90, 45) === 90`, `nextRotation(90, 0) === 90`,
  `nextRotation(90, 180) === 90` — ein unbekannter Schritt ändert nichts.
- Jedes Ergebnis ist in `ROTATIONS` enthalten.

---

## DR2 — Zwei Dreh-Einträge im Kontextmenü eines Bild-Tokens

**Befund.** Das Kontextmenü eines Tokens (`GameTable.jsx:7473` ff.) kennt Lock,
Flip, Enlarge und Delete. Drehen fehlt. Das Menü ist zugleich die einzige Geste,
die mit Maus (Rechtsklick, `:5282`) **und** mit dem Finger (Langdruck,
`:2306`–`:2321`) geht — `E`/`Q` gehen nur mit Tastatur und hängen ohnehin an
`selectedCards`, die es für Tokens nicht gibt.

**Änderung.** Zwei Einträge im Block `contextMenu.objType === 'token'`, direkt
hinter Flip:

- Bedingung ist **nur** `shape === 'image'`. Ein Kreis oder Quadrat bekommt sie
  nicht — ein Knopf, der nichts Sichtbares tut, ist der Fehler aus
  `docs/audit-dead-controls.md`.
- `locked` wird **nicht** geprüft, wie schon bei Flip: gesperrt heißt
  unbeweglich, nicht undrehbar.
- Beide rufen `nextRotation(tok.rotation, ±90)`, setzen `rotation` lokal und
  schicken `{ type: 'token_rotate', token_id, rotation }`, wenn ein Raum da ist
  — dasselbe Muster wie der Flip-Eintrag daneben.
- Nichts außer `rotation` wird angefasst: kein `width`, kein `height`, kein
  `gridId`, kein `cell`.

**Abnahme.**
- `cd client && npx vite build` läuft ohne neue Warnung durch.
- Die Quelle von `GameTable.jsx` importiert `nextRotation` aus
  `shared/assetToken.js` und schickt `token_rotate` — geprüft als Quelltest in
  `server/test/`, nach dem Muster von `client-hygiene.test.js`, weil der Client
  keine Testinfrastruktur hat.
- Von Hand: Kontextmenü eines Bild-Tokens hat zwei Dreh-Einträge, das eines
  Kreis-Tokens keinen (Spec-Abnahme 1).

---

## DR3 — Die Mehrspieler-Aktion `token_rotate`

**Befund.** `messageHandler.js` kennt `token_move`, `token_create`,
`token_delete`, `token_flip` — kein Drehen. Der zweite Platz im Raum sähe eine
Drehung also nicht, und die Serverkopie des Spielstands (`room.boardState`) bliebe
auf dem alten Winkel stehen. Auf der Gegenseite fehlt der Zweig in der
Nachrichtenbehandlung des Tischs (`GameTable.jsx:3442`–`3460`).

**Änderung.** Gebaut wie `handleTokenFlip`:

- `handleTokenRotate(room, playerId, { token_id, rotation }, timestamp)` setzt
  `token.rotation` und sendet weiter.
- Ein Winkel, den `rotationOf` nicht passiert (`null`), wird **verworfen**: kein
  Schreiben, kein Broadcast. Der Client bietet nichts anderes an, aber darauf
  verlässt sich der Server nicht — dieselbe Haltung wie bei „verdeckt ohne
  Rückseite".
- `case 'token_rotate':` in der Verteilung.
- Im Tisch ein `case 'token_rotate':`, der `rotation` auf das Token legt.

**Abnahme.**
- `token_rotate` mit `90` setzt `rotation` auf der Serverkopie und meldet es dem
  zweiten Platz genau einmal (Spec-Abnahme 6).
- `token_rotate` mit `45`, `360` oder `'abc'` lässt die Serverkopie unverändert
  und meldet **nichts**.
- Die Nachricht trägt nur `type`, `token_id`, `rotation`, `from_player_id`,
  `timestamp` — nichts über Name oder Bild, wie bei `token_flip`.
- Ein unbekanntes `token_id` tut nichts und wirft nicht.

---

## DR4 — Belegen, dass Raster, Kasten und Speicherung nichts zu tun haben

**Befund.** Die Spec-Abnahmen 3, 4' und 5 behaupten, es sei nichts zu tun:

- 3: ein 2×2-Bösewicht liegt nach dem Drehen auf denselben vier Feldern,
  `gridAddress` meldet dieselbe Zelle;
- 4': ein 200×50-Geländeteil behält seinen Kasten;
- 5: nach Speichern und Laden steht der Winkel noch.

Behauptet ist das aus zwei Quellen — `grep` findet `rotation` nicht in
`shared/gridGeometry.js`, und `GameTable.jsx:3313` / `:3930` führen `rotation`
in **beiden** Feldlisten (Speichern und Laden), seit M7.1. Behauptungen sind
keine Abnahme.

**Änderung.** Keine am Code. Drei Prüfungen in `server/test/`, die scheitern,
wenn die Annahme später bricht:

- Ein Token vor und nach `{ ...t, rotation: nextRotation(t.rotation, 90) }`
  liefert bei `snapInto`/`gridAddress` dasselbe Feld und dieselbe Zelle.
- Ein 200×50-Token behält `width`, `height`, `gridId` und `cell` über vier
  Drehungen; nur `rotation` ändert sich.
- Ein Winkel aus `nextRotation` passiert `rotationOf` — damit ist er ein Wert,
  den Speichern (`rotation: t.rotation || 0`) und Laden unverändert
  durchreichen, und den `handleTokenRotate` aus DR3 annimmt.

**Abnahme.** Die drei Prüfungen laufen grün, ohne dass an `shared/gridGeometry.js`
oder an den Feldlisten eine Zeile geändert wurde.
