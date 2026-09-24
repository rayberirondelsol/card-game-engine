# Aufgaben: Marker auf den Leisten (Spec M8.10)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M8.10**. Nummern sind `L…`
(Leisten), damit sie weder mit T1–T9 (`tasks-kampfvorbereitung.md`),
G1–G6 (`tasks-gelaendelage.md`), F1–F4 (`tasks-grundflaeche.md`),
S1–S6 (`tasks-szenarioflaeche.md`), K1–K6 (`tasks-gelaendekarten.md`),
B1–B6 (`tasks-blockaden.md`), R1–R7 (`tasks-rundenwende.md`),
V1–V5 (`tasks-gelaendeseite.md`), N1–N8 (`tasks-bedienbarkeit.md`),
A1–A5 (`tasks-startausruestung.md`) noch D1–D4 (`tasks-aufdecken.md`)
kollidieren.

**Gilt für jede Aufgabe.** Wie in D, A, K, S, F und G: eine Fähigkeit ist erst
fertig, wenn alle vier Schichten stimmen, und **„nichts zu tun" ist eine gültige
Antwort, aber nur eine geprüfte.**

1. **Ausführung** — `shared/zoneGeometry.js`, `shared/sequenceExecutor.js`
2. **Schrittvokabular** — `client/src/utils/sequenceSteps.js`
3. **Editor / Tisch** — `client/src/components/SetupSequenceEditor.jsx`,
   `client/src/pages/GameTable.jsx`
4. **Serverrouten / Persistenz** — nichts zu tun, siehe L6

Tests laufen mit `cd server && npm test`.

---

## Vorab: fünf Stellen, an denen M8.10 nachgeschärft werden musste

### 1. Der Marker kommt nicht auf Feld N — `place_asset` zählt, es nummeriert nicht

M8.10 Regel 3 sagt „Der Aufbau setzt den Marker auf das Feld, das dem Startwert
entspricht", und Regel 1 sagt, den Mechanismus gebe es schon. Den halben.

`place_asset` mit `targetZoneLabel` rechnet den Platz aus der **Belegung**:

```js
const taken = occupancy(state, zone) - here;
target = slots ? slots[Math.min(taken, slots.length - 1)] : zoneCenter(zone);
```

Der erste Marker landet damit **immer auf Platz 0** — Feld 1 der Lebensleiste,
Feld −4 der Accuracy-Leiste. Es gibt keinen Weg, „Feld 15" zu sagen. Das ist
genau richtig für die Bosseleiste (vier gezogene Token füllen der Reihe nach),
und genau falsch für eine Leiste mit **einem** Marker auf **einem benannten**
Feld.

**Entschieden: ein neues Feld `slot` am vorhandenen Schritt**, kein neuer
Schritt.

- *Kein neuer Schritt* (`place_marker`): er täte, was `place_asset` tut —
  ein benanntes Asset in eine Zone legen —, nur mit einer zweiten Rechnung für
  die Stelle. M8.4 sagt dazu: „ein neuer Schritt ist in Ordnung, eine zweite
  Rechnung neben einer vorhandenen nicht."
- *Kein Name am Platz* (`slots: [{relX, relY, label: "15"}]` + `slotName` am
  Schritt): das wären 46 von Hand getippte Namen in den Zonendaten, die in 46
  Fällen von 46 genau die Zahl wiederholen, die ohnehin an der Position steht.
- *Keine Rechnung im Schritt* (`slotOffset`, `slotFirst`): eine Zahl, die der
  Autor pro Leiste einmal richtig raten muss, und die nichts prüft.

`slot` ist **die Nummer des Platzes**, nicht sein Index. Und jeder Platz hat
eine Nummer: die, die an ihm steht (`slots[i].n`), und sonst seine Position,
von 1 an. Eine Regel, zwei Fälle, kein Sonderfall im Code.

Ohne `slot` bleibt alles, wie es war — die Bosseleiste füllt weiter der Reihe
nach.

### 2. Die Accuracy-Null gehört in die Daten, nicht in den Code

M8.10 warnt: „Accuracy läuft von −4". Der Executor darf das nicht wissen; er
weiß nichts über Townsfolk Tussle (Nachtrag zu M7.5, und zweimal schon schief
gegangen).

Die Umrechnung findet deshalb **gar nicht statt**. Die Accuracy-Leiste trägt
ihre Feldnummern in den Zonendaten — `n: -4` bis `n: 5`, genau so, wie sie
aufgedruckt sind und wie sie in `varianten.json` stehen. Der Schritt schreibt
`slot: -1`, und das ist die Zahl, die auf dem Tableau steht. Niemand rechnet,
weder der Autor noch der Code.

Die Lebensleiste (1–24), die Bewegungsleiste (1–12) und Health/Movement/Moxie
der Dörfler (1–10) brauchen `n` gar nicht: dort **ist** die Position die Zahl.
Sie bekommen es trotzdem, weil die Messdaten es mitbringen und eine Zone, die
ihre Nummern nennt, sich selbst erklärt.

Die **Kehre** der Lebensleiste ist damit ebenfalls keine Regel, sondern eine
Koordinate: Feld 13 hat `relY` der unteren Reihe. Der Code sieht 24 Punkte.

### 3. Abnahme 6 stimmt nicht

> „Ein Marker auf der Accuracy-Leiste bei Wert −1 liegt **vier** Felder über dem
> untersten."

Die Leiste zählt −4, −3, −2, −1, 0 … Von unten gezählt ist −1 das **vierte
Feld**, also **drei** Felder über dem untersten. Vier darüber liegt die Null.

Der Test prüft, was die Messdaten sagen: `slot: -1` trifft den vierten Punkt
der Liste.

### 4. Zwei Wahrheiten bleiben zwei Wahrheiten — aber das Zurücksetzen ist gratis

Die Entscheidung in M8.10 („Zähler bleibt die Wahrheit, Marker schreibt nicht
zurück") wurde nachgerechnet, nicht geglaubt. Sie hält:

Die **Rückbindung** (Marker gezogen → Zähler schreibt mit) wäre allein
tatsächlich billig: `handleObjDragEnd` kennt nach `snapInto` die Zone und
könnte den getroffenen Platz melden — rund fünfzehn Zeilen im Client. Sie ist
aber **allein wertlos**. Ohne die Gegenrichtung (Zähler gesetzt → Marker
wandert) bliebe das Zurücksetzen der zwölf Attribute in der Dorfphase genau
das, was M8.10 schützen will, und würde zwölf Marker stehen lassen — eine
Abweichung, die schlimmer ist als die, die sie verhindern soll. Die
Gegenrichtung heißt: `set_counter` müsste eine Zone und ein Asset kennen. Dann
täte der Zählerschritt zwei Dinge, und die Bindung zwischen zwei Objekten, die
die Spec ausschließt, stünde doch da — nur verteilt auf zwei Schritte.

**Was stattdessen zu tun ist, kostet nichts:** die Dorfphasen-Aktion bekommt
neben ihren zwölf `set_counter` zwölf `place_asset … slot: <Startwert>`.
Derselbe Wert, dieselbe Sequenz, kein neuer Code. Danach stehen Zähler und
Marker wieder gleich. Auseinanderlaufen können sie dann nur noch durch einen
Zug von Hand — und das tun am echten Tisch der Stein und der Zettel auch.

Der offene Punkt aus M8.10 bleibt offen und wird durch diese Aufgaben nicht
kleiner. Er wird nur billiger zu ertragen.

### 5. Vierzehn Zonen sind unsichtbar — außer im Raum

Geprüft, weil M8.10 sonst vierzehn gestrichelte Rahmen über die aufgedruckten
Leisten legen würde:

- **Am Hotseat-Tisch werden Zonen gar nicht gezeichnet.** `ZoneOverlay` hängt
  in `GameTable.jsx` ausschließlich im `{room && (…)}`-Zweig. Solo sieht man
  keinen einzigen Rahmen — auch heute nicht.
- **Im Raum werden alle gezeichnet**, mit Rahmen *und* Namensschild. Vierzehn
  Leistenzonen ergäben dort vierzehn Rahmen und vierzehn Schilder über den
  Tableaus. Raster haben für genau diesen Fall ein `showInPlay`; Zonen haben
  nichts Vergleichbares.

Das ist ein **eigener Schnitt** und nicht Teil von M8.10: die Solopartie, um
die es hier geht, ist nicht betroffen, und ein Sichtbarkeitsschalter an der
Zone gehört in dieselbe Aufgabe wie der an den Rastern, nicht hierher. Es steht
hier, damit es nicht unbemerkt bleibt (L6).

---

## L1 — Ein Platz lässt sich bei seiner Nummer nennen

**Schicht 1.** `shared/zoneGeometry.js` bekommt **eine** neue Funktion:

```js
zoneSlotNumbered(zone, n) → { x, y } | null
```

Die Nummer eines Platzes ist `slots[i].n`, wenn dort eine Zahl steht, sonst
`i + 1`. Zonen ohne ausdrückliche Platzliste (`row`, `column`, `grid`, `stack`)
werden genauso adressiert — bei ihnen ist die Nummer immer die Position.

`zoneSlots` bleibt **unverändert**. Es gibt die Punkte zurück, die es immer
zurückgegeben hat; die Nummerierung ist eine zweite Frage an dieselbe Liste,
keine andere Antwort auf die erste. (Ein `n` an jedem zurückgegebenen Punkt
wäre die billigere Zeile gewesen und hätte jeden Aufrufer, der die Liste
vergleicht, mit einem Feld beschenkt, das er nicht bestellt hat.)

Eine Nummer, die es nicht gibt, ist `null` — nicht der nächstgelegene Platz.
Ein Marker auf Feld 13 einer Zwölferleiste ist ein Autorenfehler und gehört ins
Protokoll, nicht stillschweigend auf Feld 12.

**Abnahme:** `zoneSlotNumbered` trifft auf einer Liste mit `n: -4 … 5` bei `-1`
den vierten Punkt, auf einer Liste ohne `n` bei `15` den fünfzehnten, und gibt
bei `25` auf vierundzwanzig Plätzen `null`.

## L2 — `place_asset` legt auf einen genannten Platz

**Schicht 1.** Der Zonen-Zweig von `place_asset` liest `step.slot`:

- `slot` fehlt oder ist leer → **unverändert** der Reihe nach (`taken`).
- `slot` gesetzt → `zoneSlotNumbered`. Kein Treffer → Schritt übersprungen mit
  `zone "…" has no place "…"`.
- Annahme (`accepts`) und Kapazität werden wie bisher zuerst geprüft. Ein
  ausdrücklicher Platz umgeht keine Zonenregel.

`slot` kommt in `NAME_FIELDS`, damit `$LEB` und `$BEW` dort binden — das ist
der einzige Weg, wie die Werte des Bösewichts an die Leisten kommen (Nachtrag
zu M7.5: sie stehen in den Szenariodaten und binden wie ein `fields`-Eintrag).
Barry Bluffs Formel bleibt damit auch hier ein Text, der keine Zahl ist: der
Schritt wird übersprungen und sagt warum, statt zu raten.

**Abnahme:** Ein `place_asset` mit `slot: 15` legt den Marker auf den
fünfzehnten Platz; `slot: "$LEB"` nach `build_scenario` auf den Platz mit der
Nummer, die der Bösewicht hat; ohne `slot` bleibt das Verhalten der
Bosseleiste Zeile für Zeile dasselbe.

## L3 — Der Editor kennt `slot`

**Schicht 2 und 3.** `client/src/utils/sequenceSteps.js`:

- `slot` in die Feldliste von `place_asset`.
- `stepFields`: `slot` erscheint **nur** mit Zone. Ohne Zone gibt es keine
  Plätze, und ein Feld ohne Wirkung ist ein Versprechen, das der Aufbau nicht
  hält.
- `defaultStep`: `slot: ''` — leer heißt „der Reihe nach", und das ist die
  Vorgabe, die den vorhandenen Aufbauten entspricht.
- `describeStep`: „… in zone „X" on place 15".
- `validateStep`: eine ganze Zahl oder ein Platzhalter. Alles andere meldet der
  Editor, bevor der Aufbau läuft.

**Bewusst nicht geprüft:** ob es die Nummer in der genannten Zone gibt. Der
Editor bekommt heute nur die Zonen**namen** (`availableZoneLabels`), nicht die
Zonen — und der Executor meldet den Fall am Tisch mit demselben Satz. Für eine
Prüfung, die eine Nummer fängt, aber die *falsche* Nummer (Accuracy) nicht
fangen kann, ist das Durchreichen der ganzen Zonenliste zu teuer.

`SetupSequenceEditor.jsx` bekommt ein Zahlenfeld dafür. Kein Auswahlfeld: eine
Liste über vierundzwanzig Felder ist dieselbe Unbedienbarkeit wie die über 140
Rasterfelder (M7/T1), und die Zahl, die dort hingehört, steht auf dem Brett.

**Abnahme:** `stepFields` zeigt `slot` bei gesetzter Zone und verbirgt es ohne;
`describeStep` nennt den Platz; `validateStep` meldet `slot: "Feld 15"`.

## L4 — Die Leisten als Zonendaten

**Nichts zu bauen.** Die Zonen sind Daten und gehören in `setups.zone_data`,
nicht in den Code — dieselbe Regel wie beim Raster und bei den Szenariodaten.

Vierzehn Zonen: **drei Dörfler-Tableaus × vier Leisten**, dazu **zwei** am
Zusatz-Brett. Jede mit

- `layout: 'slots'`, `snap: true`, `accepts: ['asset']`,
- `anchor: { assetId, relX, relY, relWidth, relHeight }` — der **Kasten** der
  Leiste als Bruchteil der Assetbox (Zusatz-Brett 300 × 999, Dörfler-Tableau
  300 × 400),
- `slots: [{ n, relX, relY }, …]` — die gemessenen Feldmitten als Bruchteil der
  **Zonenbox**.

Zwei Umrechnungen, beide einmal ausgerechnet und nicht im Code:
Feld → Bruchteil des Kastens, Kasten → Bruchteil des Ankers.

Die Werte stehen in der Liste am Ende dieses Dokuments. Sie sind **unverändert**
aus `leisten.json` und `varianten.json` übernommen — nichts gemittelt, nichts
geradegezogen, der Zickzack der Variante A und die 0,35 Einheiten der
Variante-B-Null stehen drin.

**Zwei Dinge, die dazugehören und leicht untergehen:**

1. **Die Asset-Box muss das Seitenverhältnis der Messung haben.** Die
   Ankerbrüche sind Bruchteile der Box, die das Objekt am Tisch hat
   (`assetBox`). Trägt die `table_assets`-Zeile des Tableaus nicht 300 × 400
   (oder ein Vielfaches), sitzen alle vierzig Plätze verzogen. Seit M3c kommen
   `width`/`height` aus der Assetzeile — sie müssen dort also stimmen.
2. **Tableau und Zusatz-Brett gehören gesperrt** (`lock_asset`). Eine
   verankerte Zone wandert mit dem Brett, ihre **Inhalte nicht** — wer ein
   Tableau von Hand verschiebt, lässt vier Marker stehen. Das ist keine neue
   Eigenschaft und kein Fehler dieser Aufgabe, aber hier zum ersten Mal
   schmerzhaft.

## L5 — Die Marker-Assets

**Nichts zu bauen, und nichts zu raten.** `place_asset` adressiert **ein**
Asset bei Namen und **verschiebt** das vorhandene Token, wenn es schon liegt
(`findPlaced`). Vierzehn Marker heißen deshalb vierzehn `table_assets`-Zeilen
mit vierzehn verschiedenen Namen — ein Asset „Marker", vierzehnmal gelegt, wäre
ein Marker, der dreizehnmal umzieht.

Die Liste steht am Ende dieses Dokuments.

## L6 — Die vierte Schicht und die Oberfläche: nichts zu tun, geprüft

- **Persistenz.** `setups.zone_data` ist `TEXT`; die vierzehn Zonen mit
  zusammen 176 Plätzen sind rund 14 kB. Es gibt keine Zonenzahl im Schema, in
  den Routen (`server/src/routes/setups.js`) oder beim Laden im Raum
  (`server/src/routes/rooms.js`). Kein `bodyLimit` ist gesetzt, Fastifys
  Vorgabe (1 MB) ist um zwei Größenordnungen entfernt.
- **Einrasten von Hand.** `snapInto` verlangt `zone.snap` und eine nichtleere
  Platzliste — beides bringen die Zonendaten mit. `snapPoint` sucht den
  nächsten **freien** Platz, und `handleObjDragEnd` nimmt das gezogene Token
  aus `taken` heraus; bei einem Marker je Leiste sind alle Plätze frei.
  Abnahme 5 braucht **keinen Code**.
- **Zonen zeichnen.** Siehe „Vorab 5": solo unsichtbar, im Raum alle sichtbar.
  Eigener Schnitt.

**Zwei Befunde, die hier nicht behoben werden, aber notiert gehören:**

- `handleObjDragEnd` baut `taken` mit `zoneContains` statt mit
  `objectsInZone` — das **Ankerobjekt** der Zone wird also mitgezählt. Bei den
  Leisten geht es gut (die Mitte eines Tableaus liegt in keinem der vier
  Kästen), aber es ist dieselbe Doppelzählung, gegen die `objectsInZone`
  gebaut wurde.
- Die vier Leistenkästen eines Tableaus **überlappen sich** um rund zwei
  Einheiten (Health 164,06–192,57, Movement 190,75–219,35 …). `zoneAt` nimmt
  die **zuletzt** eingetragene Zone. Die Feldmitten liegen weit genug innen,
  dass kein Marker im Streifen landet; ein von Hand mitten in den Streifen
  gezogener Marker rastet aber in die Nachbarleiste. Die Kästen sind
  gemessene Werte und werden nicht beschnitten (M8.10: „Nichts wird
  geradegezogen").
