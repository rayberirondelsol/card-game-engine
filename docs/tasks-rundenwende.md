# Aufgaben: Kampfseite des Zusatz-Bretts und Dorfphase ab Runde 2 (Spec M7.5, M8.4)

Vertrag ist `docs/spec-setup-system.md`, Abschnitte **M7.5** (samt „Nachtrag zu
M7.5") und **M8.4**. Nummern sind `R…` (Rundenwende), damit sie weder mit
T1–T9 (`docs/tasks-kampfvorbereitung.md`), G1–G6
(`docs/tasks-gelaendelage.md`), F1–F4 (`docs/tasks-grundflaeche.md`), S1–S6
(`docs/tasks-szenarioflaeche.md`), K1–K6 (`docs/tasks-gelaendekarten.md`)
noch B1–B6 (`docs/tasks-blockaden.md`) kollidieren.

**Gilt für jede Aufgabe.** Wie in B, K, S, F und G: eine Fähigkeit ist erst
fertig, wenn alle vier Schichten stimmen, und **„nichts zu tun" ist eine gültige
Antwort, aber nur eine geprüfte.** Diesmal liegt der Schwerpunkt in Schicht 1
und 2 — drei neue bzw. erweiterte Schritte, die ohne Eintrag in Schicht 2 im
Editor nicht existieren würden (genau das Muster, das
`docs/audit-dead-controls.md` sammelt).

1. **Ausführung** — `shared/sequenceExecutor.js`, `shared/scenarioData.js`
2. **Schrittvokabular** — `client/src/utils/sequenceSteps.js`
3. **Editor / Tisch** — `client/src/components/SetupSequenceEditor.jsx`,
   `client/src/pages/GameTable.jsx`
4. **Serverrouten / Persistenz** — `server/src/routes/setups.js`, `rooms.js`

Tests laufen mit `cd server && npm test`.

**Reihenfolge und warum.** R1 zuerst, weil beide Spec-Abschnitte denselben
fehlenden Schritt brauchen — M7.5 trägt die Bösewichtwerte damit ein, M8.4
stellt damit zwölf Zähler zurück und füllt den Münztopf. R2 und R3 sind
unabhängig und klein und kommen danach in der Reihenfolge ihrer Spec-Abschnitte.
R4 danach, weil es den Wert liefert, den R1 schon lesen kann. R5 **nach** allen
vier, weil die Feldlisten dort „die Felder, die `applyStep` liest, eins zu eins"
sein müssen — vorher geschrieben wären sie eine Vermutung. R6 und R7 zum
Schluss, weil sich erst dann prüfen lässt, was die übrigen Schichten *nicht*
bekommen.

---

## Vorab: neun Stellen, an denen Spec und Auftrag nicht stimmen

Die Abschnitte stehen hier und nicht als Kommentar im Code, weil sie den
Zuschnitt der Aufgaben begründen.

### 1. Das Abräumen ist nicht *ein* Block — einer muss bleiben

M8.4 Schritt 1 will „Bösewichtmaterial wegräumen" von „Kampf beginnen" nach
„Dorfphase beginnen" verschieben. Die Aktion „Kampf beginnen" hat heute **sieben**
Abräumzeilen (T8 plus die aus K5):

```
1  clear_zone   Ladenauslage      → Stapel "Nachschub (Tante Emma)"
2  clear_zone   Bösewicht-Platz   → Zone "Besiegte Bösewichte"
3  clear_zone   Bösewicht-Tableau
4  clear_zone   Geländekarten
5  clear_grid   Kampffeld
6  remove_stack "Verhaltensdeck"
7  remove_stack "Überfall"
```

Zeile **1 gehört nicht dazu**. Sie ist Regelwerk **§4 Schritt 4.1** („Gesamte
Ladenauslage abräumen und unter den Nachschubstapel legen") — der *letzte*
Schritt der Dorfphase, unmittelbar vor dem Kampf, nicht der erste nach ihm.
Verschöbe man sie, räumte „Dorfphase beginnen" die Auslage ab, die sie zwei
Schritte später (M8.4 Schritt 7) gerade erst auslegt. Sie bleibt, wo sie ist.

Die Zeilen 2–7 wandern. Zeile 4 ist neu aus K5 und in der Spec nicht
aufgeführt; sie ist aber „Geländekarten" aus M8.4 Schritt 1 und gehört mit.

### 2. Der erste Kampf bricht **nicht** — Abnahme 5 und 6 sind beide haltbar

Die Sorge aus dem Auftrag ist unbegründet, und zwar nachweislich am Code:

- `clear_zone` auf eine **leere** Zone gibt den Zustand unverändert zurück und
  schreibt *keinen* Grund ins Protokoll („Eine leere Zone zu leeren ist
  gelungen, nicht gescheitert").
- `clear_grid` auf ein leeres Raster ebenso.
- `remove_stack` auf einen Stapel, den es nicht gibt, setzt nur `entry.reason`
  und bleibt `ok` — der Kommentar dort nennt genau diesen Fall: „der erste Kampf
  einer Partie räumt immer ein Deck weg, das es noch nicht gibt".

Auf einem frischen Tisch sind die sechs Zeilen also **Leerläufe**. Sie aus
„Kampf beginnen" zu entfernen ändert am ersten Kampf gar nichts.

**Was sich sehr wohl ändert, und was die Spec nicht sagt:** ab Runde 2 ist
„Dorfphase beginnen" **Pflicht**. Wer sie überspringt und gleich wieder „Kampf
beginnen" drückt, bekommt denselben Befund zurück, der den Nachtrag zu Abschnitt
11 ausgelöst hat: `reveal_next … skipped: zone "Bösewicht-Platz" is full (1)`.
Das ist gewollt — aber es ist eine Bedienregel, die vorher keine war.

### 3. M7.5 Regel 2 verdrahtet Townsfolk Tussle in den Code

„`build_scenario` setzt zwei Zähler: **Bösewicht: Bewegung** und **Bösewicht:
Leben**" — das ist derselbe Fehler, den K2 für den Zonennamen schon einmal
korrigiert hat. `Bösewicht: Leben` ist ein Townsfolk-Tussle-Begriff wie `B`,
`Kampffeld` und `Geländekarten`, und M7 sagt ausdrücklich: der Code weiß nichts
über Townsfolk Tussle.

Gebaut wird es wie dort: `build_scenario` **bindet** die Werte als Platzhalter
(R4), und zwei gewöhnliche `set_counter`-Schritte (R1) tragen sie ein. Name,
Ort und Höchstwert der beiden Zähler stehen damit im Setup, wo sie hingehören —
und M7.5 Abnahme 3 („nicht fest verdrahtet") ist wörtlich erfüllt statt nur
sinngemäß.

Nebeneffekt, der ein Problem löst, das die Spec nicht sieht: `place_counter`
legt **immer einen neuen** Zähler an (so steht es im Code, und so ist es
gemeint). Hätte `build_scenario` die beiden Zähler angelegt, lägen nach vier
Kämpfen acht davon übereinander, und es gäbe keinen Schritt, der sie wieder
wegnimmt. Ein einmal angelegter Zähler, den `set_counter` viermal überschreibt,
hat das Problem nicht.

### 4. „Höchstwert 12 / 24" ist die Länge der Leiste, nicht der Höchstwert

M7.5 Regel 2 gibt den beiden Zählern `max` 12 und 24. Das sind die **Felder der
aufgedruckten Leisten**. Der Höchstwert des Bösewichts ist nach §5.4 sein
**Startwert**: „Ein Bösewicht kann nicht über seinen Start-LEB hinaus geheilt
werden." Am Tisch stünde also „14 / 24", wo „14 / 14" richtig wäre.

Umgesetzt wird, was die Spec verlangt (12 und 24) — das ist eine Anzeige, keine
Regeldurchsetzung, und M4a sagt ausdrücklich, dass eine Obergrenze angezeigt und
nicht erzwungen wird. Aber es steht hier, damit es nicht als geprüft durchgeht.

### 5. Die Maße der beiden Buchseiten sind zu groß

Am Bild nachgemessen (`.../db4e659a-….png`, 751 × 2501, Asset 300 × 999, also
Maßstab 300/751 = 0,3995). Gemessen wurde die Fläche des cremefarbenen
Papiers, nicht der Buchdeckel:

| | Bildpixel | Bretteinheiten |
|---|---|---|
| ACTION-Seite, waagerecht | 62 … 347 | 24,8 … 138,6 |
| DISCARD-Seite, waagerecht | 400 … 692 | 159,8 … 276,4 |
| beide, senkrecht | 1445 … 1897 | 577,3 … 757,9 |

Daraus: **ACTION Mitte (82, 668), Fläche 114 × 180**; **DISCARD Mitte
(218, 668), Fläche 117 × 180**. Die Spec sagt (86, 675) bzw. (217, 675) und
124 × 184. Die x-Mitten stimmen auf ein bis vier Einheiten, die **Breite 124
reicht rechts zehn Einheiten in den Bundsteg**, und y liegt sieben Einheiten zu
tief. Korrigiert in R7.

**Die Leistenmaße dagegen stimmen.** Die weißen Ziffernreihen liegen auf
y = 2108 px (Bewegung) sowie 2289 px und 2372 px (Leben) — das sind **842**,
**914,5** und **947,5** Bretteinheiten gegen die 842, 917 und 949 der Spec. Die
x-Spanne 50…250 mit Schrittweite 18,2 bestätigt sich ebenfalls. Wer hier etwas
korrigiert, korrigiert kaputt.

### 6. `place_stack` kann keine Zone — der Schritt fehlt, nicht die Zone

Bestätigt am Code: `place_stack` liest `category`, `label`, `x`, `y`,
`faceDown`. Eine Zone kommt nicht vor. Der eigentliche Schritt ist also R3.

Die Zone `Aktionen` wird **trotzdem** gebraucht: sie hängt über `anchor` am
Zusatz-Brett, und nur dadurch wandert der Stapel mit, wenn das Brett verschoben
wird. Eine feste x/y wäre genau das, was M3a abschaffen wollte.

### 7. Was eine Zone einem Stapel nicht geben kann

`countInZone` liest `state.cards` und `state.tokens`. Die Karten eines Stapels
liegen in `stack.cards` und sind dort **unsichtbar** — dieselbe Tatsache, die
im Executor schon begründet, warum `clear_zone` einen Stapel nicht leeren kann.
Eine Kapazität kann einen Stapel also nicht zählen.

Die Zone gibt ihm deshalb **die Stelle**, mehr nicht. `accepts` wird trotzdem
geprüft: eine Zone, die keine Karten nimmt, nimmt auch keinen Kartenstapel —
das ist dieselbe Auskunft, nicht eine zweite Rechnung.

### 8. Der Ausgangswert steht schon im Aufbau — und die anderen drei brauchen kein `max`

Die Frage aus dem Auftrag, beantwortet: **nein.**

Ein `max` ist am Tisch eine Anzeige („2 / 3") und in Townsfolk Tussle der rote
Marker neben dem Lebensstein. BEW, ANG und VER haben keinen solchen Marker.
Bekämen sie ein `max`, stünde an neun Zählern eine Obergrenze, die das Spiel
nicht kennt — eine Behauptung, kein Wert.

Woher kommt der Ausgangswert dann? **Aus dem Autor, ein zweites Mal getippt.**
Neun `set_counter`-Schritte mit der Zahl, die auch im `value` des zugehörigen
`place_counter` steht. Das sieht nach Doppelung aus und ist keine: ein
Dorf-Ereignis auf schwarzem Grund erhöht einen Wert **dauerhaft** (§4 Schritt 2),
und dann ist der neue Ausgangswert genau das, was in der Rückstellung stehen
muss. Ein im Zähler mitgeführter, nirgends bearbeitbarer Startwert wäre nach dem
ersten solchen Ereignis still falsch.

Für **Leben** genügt `max` — und nur `value: "max"` überlebt ein im Spiel
gestiegenes Maximum, das M4a ausdrücklich vorsieht.

### 9. „Auffüllen auf sechs" kann das Vokabular bereits — knapp

M8.4 Abnahme 4 verlangt sechs offene Heldentaten und zehn Ladenkarten.
`deal_to_zone` teilt eine feste Anzahl aus, füllt also nicht auf. Es hört aber
auf die **Kapazität der Zielzone**: `zoneRoom` rechnet `capacity - taken`, und
`shareOut` legt nur so viele, wie Platz ist; der Rest bleibt im Stapel.

Eine `Heldentaten-Auslage` mit `capacity: 6` und `deal_to_zone count: 6` füllt
damit genau auf sechs auf. Der Preis: liegen schon welche, endet der Schritt als
`failed` mit „n of 6 cards stayed in the stack" im Protokoll. Das ist Rauschen
an einer Stelle, an der nichts schiefging — aber ein eigener Auffüll-Schritt
wäre eine zweite Rechnung neben `deal_to_zone`, und die will niemand. Bleibt so,
steht hier.

Beim Laden stellt sich die Frage nicht: „Kampf beginnen" räumt die Auslage
vorher vollständig ab, `deal_to_zone count: 10` trifft eine leere Zone.

---

## R1 — `set_counter`: ein Zähler bekommt einen Wert

**Ziel.** M8.4 Schritt 2 und 3, M7.5 Regel 2. Geprüft: das Vokabular kann einen
Zähler **anlegen** (`place_counter`, M4a) und sonst nichts. Es gibt keinen
Schritt, der einen vorhandenen Zähler auf einen Wert setzt, und `place_counter`
kann es nicht halb — es legt bedingungslos einen neuen an, ein zweiter Lauf
einen zweiten. `reveal_next` hat mit Zählern gar nichts zu tun.

**Umfang.** Neuer Schritt `set_counter { name, value }` in `applyStep`.

`value` hat vier Lesarten, und das ist eine Rechnung, keine vier:

| geschrieben | heißt |
|---|---|
| `14`, `"14"`, `"-2"` … als Zahl lesbar | genau dieser Wert |
| `"+6"` / `"-6"` mit **geschriebenem** Vorzeichen | um so viel ändern |
| `"max"` | auf den Höchstwert des Zählers |
| `"$LEB"` | erst ersetzen, dann eine der drei Zeilen darüber |

Der Platzhalter geht über `NAME_FIELDS`, wohin `value` neu aufgenommen wird —
„Platzhalter gelten in jedem Namensfeld" (M7), und `place_counter` mit einer
Zahl in `value` bleibt davon unberührt, weil `hasPlaceholder` nur Strings prüft.

Kein Zähler dieses Namens → `skipped`. `"max"` an einem Zähler ohne Obergrenze →
`skipped`. Ein Wert, der keine der vier Lesarten trifft (Barry Bluffs Formel) →
`skipped` mit dem Wert im Grund. Ein **gesperrter** Zähler wird nicht verändert,
wie überall sonst.

**Abnahme.** `set_counter "Henlo: Leben" value "max"` setzt den Zähler auf sein
`max`, auch wenn das im Spiel gestiegen ist; `value "+18"` erhöht den Münztopf
um achtzehn, ohne seinen Stand zu kennen; `value 4` setzt auf vier; ein Zähler,
den es nicht gibt, und eine Formel statt einer Zahl stehen mit Grund im
Protokoll und ändern nichts.

---

## R2 — `rotate_zone`: die Leiste rückt auf

**Ziel.** M8.4 Schritt 4, Regelwerk §7 Schritt 7 („Oberster Dörfler nach unten,
Rest rückt auf"). Auf der Kampfseite des Bretts steht es als Schritt 5 der
Nachkampfleiste: „Rotate the Beatin'/Buyin' Order".

**Umfang, geprüft:** es gibt nichts, was das halb kann. `reveal_next` liest
zwar `slotOrder` — genau die Reihenfolge, die hier gebraucht wird — verschiebt
aber ein einzelnes Objekt in eine *andere* Zone. `clear_zone` räumt aus.
Rotieren innerhalb derselben Zone kommt nicht vor.

Neuer Schritt `rotate_zone { zoneLabel }`: die Objekte der Zone in
`slotOrder` (dieselbe Funktion, die `reveal_next` benutzt — eine zweite
Reihenfolge daneben wäre eine zweite Antwort auf dieselbe Frage), ihre
Positionen um einen Platz zurückgedreht. Das erste Objekt bekommt die Stelle des
letzten, jedes weitere die seines Vorgängers.

Gedreht werden die **vorhandenen** Objekte auf **ihren eigenen** Stellen, nicht
die Plätze der Zone: die Buyin'-Leiste hat fünf Plätze, solo stehen drei Dörfler
darauf, und „nach unten" heißt ans Ende der drei, nicht auf Platz 5.

Gesperrt heißt gesperrt (wie `clear_zone`): gesperrte Objekte bleiben liegen,
stehen mit Namen im Protokoll und nehmen an der Drehung nicht teil. Leere Zone,
ein einzelnes Objekt → nichts zu tun, gelungen. Zone unbekannt → `skipped`.

**Abnahme.** Drei Dörfler auf den ersten drei Plätzen einer Leiste: nach
`rotate_zone` steht der erste auf dem dritten Platz und die beiden anderen sind
je einen aufgerückt. Dreimal hintereinander ergibt wieder den Ausgangszustand.
Ein gesperrter Dörfler bleibt stehen und steht im Protokoll.

---

## R3 — `place_stack` darf eine Zone als Ziel nehmen

**Ziel.** M7.5 Regel 1. Das Aktionsdeck liegt heute als Stapel `Verhaltensdeck`
auf fester Welt-x 1900 neben dem Brett und soll auf die ACTION-Buchseite.

**Umfang.** `place_stack` bekommt `targetZoneLabel`, nach demselben Muster wie
`place_asset`: mit Zone kommt die Stelle aus der Zone, ohne Zone aus `x`/`y`.
Die Zone ist der erste Platz, wenn sie welche hat, sonst ihre Mitte — dieselbe
Zeile, die `place_asset`, `deal_to_zone` und `clear_zone` schon benutzen.

`accepts` wird geprüft, die Kapazität nicht — siehe Vorab-Abschnitt 7. Zone
unbekannt oder weist Karten ab → `skipped`, und der Stapel liegt nicht; ein
Stapel klammheimlich in der Tischmitte ist schlimmer als ein gemeldeter.

**Abnahme.** `place_stack` mit `targetZoneLabel` legt den Stapel auf die Mitte
der Zone; verschiebt man das Ankerbrett und baut erneut auf, liegt er wieder auf
der Buchseite. Ohne Zone gilt weiter x/y, unverändert. Eine Zone, die keine
Karten nimmt, lässt den Stapel liegen — mit Grund im Protokoll.

---

## R4 — `build_scenario` bindet die Werte des Bösewichts

**Ziel.** Nachtrag zu M7.5. Die BEW/LEB-Werte stehen in §5.5 des Regelwerks,
nicht im Code, und gehören zu den Szenariodaten.

**Umfang.** Ein zweiter benannter Block neben `fields`:

```json
"Deputy Waggums": {
  "scenario": "…",
  "stats":  { "BEW": 6, "LEB": 14 },
  "terrain": [ … ],
  "fields":  { "B": "J8:K9", "D": [ … ] }
}
```

`build_scenario` bindet jeden Schlüssel daraus als Platzhalter — `BEW` → `$BEW`,
`LEB` → `$LEB` — **genau wie die einwertigen `fields`**. Kein zweiter
Bindemechanismus, kein Sonderfall nach Schlüsselnamen: der Code kennt `BEW` so
wenig wie er `B` kennt.

`final` bleibt additiv: ein `stats` dort gewinnt über das reguläre, wie bei
`fields`.

Ein Wert, der keine Zahl ist, wird gebunden wie jeder andere Text — Barry Bluffs
Formel landet als Zeichenkette im Platzhalter, `set_counter` liest sie nicht als
Zahl und überspringt sich mit Grund (R1). Der Aufbau scheitert daran nicht.

**`validateScenarioData` prüft `stats` nicht gegen das Raster.** Ein Wert ist
kein Feldname; ihn durch `badRange` zu schicken hieße, jede Zahl als fehlendes
Rasterfeld zu melden.

**Abnahme.** Nach `build_scenario` für Deputy Waggums ist `$BEW` = `6` und
`$LEB` = `14`; ein `set_counter` dahinter trägt sie ein. Ein Bösewicht ohne
`stats` bindet nichts, die folgenden `set_counter` werden übersprungen und das
Gelände liegt trotzdem. Ein Eintrag mit `stats` voller Zahlen erzeugt keine
Meldung in `validateScenarioData`.

---

## R5 — Die drei Schritte im Schrittvokabular

**Ziel.** Wer einen Schritt nur im Executor baut, hat ihn im Editor nicht.
`client/src/utils/sequenceSteps.js` ist das Vokabular, und
`server/test/sequence-steps.test.js` prüft es.

**Umfang.**

- `STEP_TYPES` bekommt `set_counter` (`name`, `value`) und `rotate_zone`
  (`zoneLabel`); `place_stack` bekommt `targetZoneLabel` in seine Feldliste.
- `stepFields` blendet bei `place_stack` `x`/`y` aus, sobald eine Zone gewählt
  ist — dieselbe Regel und derselbe Satz wie bei `place_asset`.
- `defaultStep`: `set_counter` ohne Namen und mit `value: 0` (der Name ist die
  eine Entscheidung, die der Schritt nicht vorwegnehmen darf, wie bei
  `place_counter`); `rotate_zone` mit der ersten Zone.
- `describeStep` sagt, **welche** der vier Lesarten von `value` gilt: „Set
  counter … to its maximum" / „… by 6" / „… to 4".
- `validateStep`: Name ist Pflicht; ein `value`, das keine der vier Lesarten
  trifft, ist ein Fehler. `zoneLabel` bei `rotate_zone` ist Pflicht — dieselbe
  Zeile wie bei `reveal_next` und `clear_grid`, wo die Zone bzw. das Raster
  *die* Adresse ist und nicht eine von dreien.
- Das Wertfeld von `set_counter` ist ein **Textfeld**, kein Zahlenfeld: `max`,
  `+18` und `$LEB` sind keine Zahlen. `place_counter` behält sein Zahlenfeld.

**Abnahme.** `sequence-steps.test.js` kennt die zwei neuen Typen; ein
`set_counter` ohne Namen und eines mit `value: "irgendwas"` werden gemeldet; ein
`place_stack` mit Zone zeigt kein x/y mehr; jede Zusammenfassung nennt die
gewählte Lesart.

---

## R6 — Was die anderen beiden Schichten nicht tun

**Ziel.** Geprüft festhalten, dass Editor, Tisch und Server nichts bekommen.

**Umfang, geprüft:**

- **Editor** (`SetupSequenceEditor.jsx`): zwei neue Feld-Renderer sind nötig —
  `value` muss bei `set_counter` ein Textfeld sein statt des Zahlenfelds von
  `place_counter`. Alles übrige (`name`, `zoneLabel`, `targetZoneLabel`) rendert
  bereits generisch. Der Typ-Auswahlknopf liest `STEP_TYPES` und braucht nichts.
- **Tisch** (`GameTable.jsx`): nichts. Zähler in `state.counters` rendert,
  speichert und lädt er seit M4a; `set_counter` ändert nur Zahlen darin.
  Stapelpositionen sind gewöhnliche x/y.
- **Server** (`setups.js`, `rooms.js`): nichts. `action_data` und
  `scenario_data` gehen untypisiert durch, und `rooms.js` reicht `zones`,
  `grids`, `cards`, `assets` und `scenarioData` bereits hinein.

**Abnahme.** Die drei Punkte stehen im Bericht, damit sie nicht in einem Commit
verschwinden.

---

## R7 — Was von Hand in die Daten muss

**Ziel.** Zonen sind Eingabe, kein Zustand (K5): kein Schritt legt eine an, und
es soll keinen geben. Aktionen und Szenariodaten ebenso.

Alles hier ist **Produktionssetup, kein Code**. Die Maße sind Bretteinheiten des
Zusatz-Bretts (300 × 999), Ursprung links oben.

### 1. Zwei Zonen auf der Kampfseite (Setup-Editor, `?mode=setup`)

| | `Aktionen` | `Ablage` |
|---|---|---|
| `accepts` | `['card']` | `['card']` |
| `capacity` | *keine* | *keine* |
| `layout` | `stack` | `stack` |
| `shape` | `rect` | `rect` |
| Anker | Zusatz-Brett | Zusatz-Brett |
| `relX` | 0,083 | 0,532 |
| `relY` | 0,579 | 0,579 |
| `relWidth` | 0,380 | 0,390 |
| `relHeight` | 0,180 | 0,180 |

Das entspricht den Kästen (25, 578) 114 × 180 und (159,5, 578) 117 × 180 auf dem
Brett. `layout: "stack"` bei beiden: ein Nachziehstapel und ein Ablagestapel
liegen aufeinander, nicht nebeneinander.

**Ausdrücklich hinnehmbar** (M7.5 sagt es selbst): beide Zonen liegen auch dann
dort, wenn das Brett die Dorfphase zeigt. Eine Zone hängt an einer Box, nicht an
einer Seite.

### 2. `scenario_data`: `stats` je Bösewicht

Neben `scenario`, `terrain` und `fields`, Spalte **3P** aus §5.5:

| Bösewicht | `"stats"` |
|---|---|
| Deputy Waggums | `{ "BEW": 6, "LEB": 14 }` |
| Virginia Fitz | `{ "BEW": 6, "LEB": 15 }` |
| The Bundits | `{ "BEW": 6, "LEB": 15 }` |

### 3. Zwei `place_counter` in den **Anfangsaufbau**

Nicht in eine Aktion — einmal angelegt, viermal überschrieben.

| `name` | `value` | `max` | Stelle |
|---|---|---|---|
| `Bösewicht: Bewegung` | 0 | 12 | Zusatz-Brett + (150, 842) |
| `Bösewicht: Leben` | 0 | 24 | Zusatz-Brett + (150, 916) |

x/y sind absolute Tischkoordinaten und damit die linke obere Ecke des
Zusatz-Bretts plus dem genannten Versatz (bei Maßstab 1:1, also Breite 300 am
Tisch). 150 ist die Mitte der Leiste, 842 und 916 sind die gemessenen Höhen der
Bewegungs- und der oberen Lebensreihe.

### 4. Aktion „Kampf beginnen": drei Zeilen weg, drei dazu

**Entfernen** (wandern nach „Dorfphase beginnen"): die sechs Abräumzeilen 2–7
aus dem Vorab-Abschnitt 1. **`clear_zone Ladenauslage → Nachschub bleibt`** —
das ist §4 Schritt 4.1.

**Ergänzen**, nach `place_stack "Verhalten: $revealedBase" → "Verhaltensdeck"`:

```
place_stack   category "Verhalten: $revealedBase", label "Verhaltensdeck",
              targetZoneLabel "Aktionen", faceDown  ← statt x 1900 / y …
shuffle       "Verhaltensdeck"
set_counter   "Bösewicht: Bewegung"  value "$BEW"   ← nach build_scenario
set_counter   "Bösewicht: Leben"     value "$LEB"   ← nach build_scenario
```

### 5. Neue Aktion „Dorfphase beginnen"

```
 1  clear_zone   Bösewicht-Platz    → Zone "Besiegte Bösewichte"
 2  clear_zone   Bösewicht-Tableau
 3  clear_zone   Geländekarten
 4  clear_zone   Ablage
 5  clear_grid   Kampffeld
 6  remove_stack "Verhaltensdeck"
 7  remove_stack "Überfall"
 8  set_counter  "<Dörfler 1>: Leben"    value "max"      ⎫
 9  set_counter  "<Dörfler 1>: Bewegung" value <Ausgang>  ⎪
10  set_counter  "<Dörfler 1>: Angriff"  value <Ausgang>  ⎪ je Dörfler vier,
11  set_counter  "<Dörfler 1>: Verteid." value <Ausgang>  ⎬ zwölf insgesamt;
…                                                        ⎪ die neun Zahlen
19  set_counter  "<Dörfler 3>: Verteid." value <Ausgang>  ⎭ stehen im Aufbau
20  set_counter  "Münzvorrat"            value "+18"
21  rotate_zone  "Buyin'/Beatin'-Leiste"
22  set_asset_face "Zusatz-Brett" faceDown        (Dorfphase)
23  deal_to_zone "Heldentaten"  count 6  → "Heldentaten-Auslage", offen
24  deal_to_zone "Nachschub (Tante Emma)" count 10 → "Nachschub-Auslage", offen
```

Zeile 4 ist neu und in M8.4 nicht genannt: die abgelegten Aktionskarten des
Bösewichts liegen in `Ablage` und blieben sonst liegen — genau der Befund, den
K5 für die Geländekartenreihe schon beschrieben hat.

Zeile 20 heißt **sechs je Dörfler** (§7 Schritt 2, solo in den gemeinsamen
Topf). Bei drei Dörflern achtzehn; wer mit anderer Besetzung spielt, ändert die
Zahl hier, so wie er die drei Dörflernamen in M4a ändert.

### 6. `Heldentaten-Auslage` bekommt `capacity: 6`

Sonst legt Zeile 23 jedes Mal sechs **zusätzliche** Karten aus. Siehe
Vorab-Abschnitt 9.

**Abnahme.** Die sechs Punkte stehen im Bericht. Ein Test baut die Wirkung nach,
soweit sie Code ist (R1–R4); die Daten selbst trägt der Mensch ein.
