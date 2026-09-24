# Aufgaben: Eine Aktion mit einer Vorbedingung (Spec M9.3)

Vertrag ist `docs/spec-setup-system.md`, Abschnitt **M9.3**. Nummern sind `P…`
(Prüfung), damit sie weder mit T, G, F, S, K, B, R, V, N, A, D, L noch E
kollidieren.

**Gilt für jede Aufgabe.** Wie in den vorigen Paketen: eine Fähigkeit ist erst
fertig, wenn alle Schichten stimmen, und „nichts zu tun" ist eine gültige
Antwort, aber nur eine geprüfte.

1. **Ausführung** — `shared/sequenceExecutor.js`
2. **Schrittvokabular** — `client/src/utils/sequenceSteps.js`
3. **Editor / Tisch** — `client/src/components/SetupSequenceEditor.jsx`
4. **Daten** — `setups.action_data` in der Produktionsdatenbank

Tests laufen mit `cd server && npm test`.

**Reihenfolge und warum.** P1 zuerst, weil P2 die Feldliste „eins zu eins zu
dem, was `applyStep` liest" nur schreiben kann, wenn `applyStep` es schon
liest. P3 danach, weil es P2 voraussetzt und nebenbei drei vorhandene
Schritttypen repariert. P4 zum Schluss: erst wenn der Schritt existiert, kann
man ihn eintragen.

---

## Vorab: fünf Stellen, an denen Spec und Auftrag nicht stimmen

### 1. Die Vorbedingung gehört **nicht** an die Aktion, sondern in die Sequenz

Der Auftrag lässt beides offen und nennt für das Feld an der Aktion das
bessere Argument („ehrlicher, weil es für die ganze Aktion gilt"). Trotzdem
gewinnt der Schritt, und zwar aus einem Grund, der in beiden Argumenten nicht
vorkommt:

**Die Aktion ist nicht die einzige Sequenz.** Es gibt drei Aufrufstellen —
Aufbau am Tisch, Aktion am Tisch, Raumstart — und nur *eine* davon hat
überhaupt ein Objekt mit `label` und `steps`. Der Anfangsaufbau
(`setups.sequence_data`) und der Raumstart führen eine nackte Schrittliste
aus. Ein Feld an der Aktion schützt also genau ein Drittel der Wege; ein
Schritt schützt alle drei, ohne dass irgendwo eine zweite Prüfung danebensteht.

Dazu kommt das Praktische: ein Feld an der Aktion braucht Code in
`GameTable.jsx` (`runSetupAction`), in `MultiplayerGame.jsx` (wo Aktionen laut
`docs/audit-dead-controls.md` Fund 7 gar nicht laufen) und im Aktions-Editor.
Ein Schritt braucht den Executor, die Vokabelliste und einen Renderer.

Das Ehrlichkeitsargument bleibt gültig und wird durch die **Stelle** eingelöst:
eine Vorbedingung ist Schritt 1, und der Protokolleintrag sagt ausdrücklich,
dass sie die ganze Aktion angehalten hat („16 further steps skipped").

### 2. Schritt 1 ist Schritt 1, nicht Schritt 2

Der Auftrag sagt, die Prüfung fehle „genau dazwischen" — zwischen
`clear_zone Nachschub-Auslage` und `reveal_next`. Das widerspricht Regel 1
(„werden **alle** Schritte übersprungen") und Abnahme 1 („legt nichts auf das
Brett"): `clear_zone` wäre dann schon gelaufen. Die Prüfung steht **vor** dem
Abräumen der Auslage. Auf einem Tisch ohne Dorfphase ist die Auslage ohnehin
leer, der Unterschied ist also nur in der Regel sichtbar — aber die Regel ist
der Vertrag.

### 3. „Bösewicht-Platz ist belegt" ist die falsche Bedingung

Die naheliegende Lesart von „der vorige Kampf ist noch aufgebaut" — der
besiegte Bösewicht steht noch auf seinem Platz — trifft den Fall **nicht**.
Schritt 11 der Aktion (`place_asset "$revealed"` → Kampffeld, Feld `$B`)
**nimmt den Bösewicht wieder vom Platz** und stellt ihn aufs Kampffeld. Die
Zone `Bösewicht-Platz` ist während des ganzen Kampfes leer. Genau deshalb hat
in der gespielten Partie nicht sie gemeldet, sondern das Tableau.

Was den ganzen Kampf über liegen bleibt und die Dorfphase wegräumt, ist:

| Kandidat | liegt während des Kampfes | wird von „Dorfphase beginnen" geräumt | Art |
|---|---|---|---|
| `Bösewicht-Tableau` | ja, unangetastet | Zeile 2 | Zone |
| Raster `Kampffeld` | ja (Gelände + Figuren) | Zeile 5 | Raster |
| Stapel `Verhaltensdeck` | ja | Zeile 6 | Stapel |
| `Zusatz-Brett` auf Kampfseite | ja | Zeile 22 | Assetseite |

Alle vier treffen. Gewählt ist **`Bösewicht-Tableau`**, weil es eine Zone ist
(eine Prüfart statt vier) und weil es das einzige der vier ist, das im Kampf
niemand anfasst: das Tableau ist ein Nachschlagewerk neben dem Brett, keine
Spielfläche. Damit ist die Meldung aus der Partie — `zone "Bösewicht-Tableau"
is full (1)` — im Ergebnis dieselbe Zone wie vorher. Die Spec nennt das
„Zufall, nicht Absicht", und das stimmt für den **Mechanismus** (ein Schritt,
der zufällig als Erster umfällt); für die **Marke** stimmt es nicht.

### 4. Der Text kommt aus den Daten, nicht aus dem Code

Regel 2 verlangt „Erst die Dorfphase beginnen". Der Executor weiß nichts über
Townsfolk Tussle (M7). Also hat der Schritt ein Feld `message`, das der Autor
im Setup schreibt — dieselbe Stelle, an der schon `Bösewicht-Platz`,
`Kampffeld` und `$B` stehen. Ohne `message` schreibt der Executor eine
Diagnose (`zone "X" is not empty`); der Editor meldet das Fehlen als Problem,
damit es beim Schreiben auffällt und nicht am Tisch.

### 5. „Dorfphase beginnen" braucht die Gegenrichtung

Der Auftrag fragt danach, und die Antwort ist ja. „Dorfphase beginnen" vor dem
ersten Kampf (oder zweimal hintereinander) räumt nichts ab, setzt Zähler auf
Werte, die sie schon haben — und **legt achtzehn Münzen in den Topf** und
**dreht die Reihenfolge-Leiste**. Beides ist stiller Schaden.

Die Bedingung ist dieselbe Zone, nur andersherum: `Bösewicht-Tableau` muss
**belegt** sein. Deshalb hat der Schritt ein Feld `expect` mit zwei Werten
statt zu heißen `require_empty`. Zwei Werte, ein Zweig — das ist billiger als
ein zweiter Schritttyp.

Ein dritter Kandidat wurde geprüft und **verworfen**: „Kampf beginnen" beim
fünften Druck, wenn kein Bösewicht mehr verdeckt liegt. Der Fall erzeugt heute
rund dreizehn Protokollzeilen („$revealed is not bound"), wäre also ein echter
Gewinn — aber `Bösewicht-Leiste` ist dann **nicht leer**: der
Kurzpartie-Marker liegt offen darauf. „Zone belegt" trifft den Fall also
nicht, und eine Bedingung „es liegt noch etwas Verdecktes darin" wäre ein
dritter Zustand für einen einzigen Nutzer. Bleibt offen.

---

## P1 — `require_zone` im Executor

**Ziel.** Ein Schritt, der eine Zone prüft und bei nicht erfüllter Bedingung
die **ganze übrige Sequenz** anhält — mit genau einem Protokolleintrag.

**Umfang.** `shared/sequenceExecutor.js`.

- Neuer Fall `require_zone { zoneLabel, expect: 'empty' | 'occupied', message }`.
  Gezählt wird mit `objectsInZone` — dieselbe Rechnung wie `clear_zone` und
  `rotate_zone`, also ohne das Ankerobjekt der Zone.
- Erfüllt → der Schritt ist `ok` und tut nichts.
- Nicht erfüllt, Zone unbekannt, oder `expect` unlesbar → `skipped` mit
  `message` als Grund (ersatzweise einer Diagnose) **und** `ctx.halted = true`.
- Die Schleife in `executeSequenceWithLog` bricht bei `ctx.halted` ab und hängt
  an denselben Eintrag, wie viele Schritte dadurch ausgefallen sind. **Keine
  weiteren Einträge** — die Oberfläche zeigt `log.filter(e => e.status !== 'ok')`,
  und sechzehn Zeilen „übersprungen" wären lauter als das Problem.
- `executeSequence` wirft weiterhin nie (Regel 3): das Anhalten ist ein `break`,
  kein `throw`.

**Abnahme.** Test `server/test/sequence-require-zone.test.js`:
zwei aufeinanderfolgende „Kampf beginnen" decken beim zweiten Mal keinen
Bösewicht auf; das Protokoll hat genau einen Eintrag ungleich `ok`; der Grund
ist die Meldung aus den Daten; nach dem Abräumen läuft dieselbe Sequenz
vollständig durch; der Rückgabewert von `executeSequence` ist der unveränderte
Zustand.

---

## P2 — `require_zone` im Schrittvokabular

**Ziel.** Der Schritt existiert im Editor. Ohne diesen Eintrag ist er eine
Fähigkeit, die niemand anlegen kann (das Muster aus `audit-dead-controls.md`).

**Umfang.** `client/src/utils/sequenceSteps.js`.

- `STEP_TYPES`: `{ value: 'require_zone', label: 'Require Zone',
  fields: ['zoneLabel', 'expect', 'message'] }` — die Felder, die `applyStep`
  liest, eins zu eins.
- `defaultStep`: erste Zone, `expect: 'empty'`, leere `message`.
- `describeStep`: eine Zeile, die beide Hälften nennt — Bedingung und was
  passiert, wenn sie nicht gilt.
- `validateStep`: `zoneLabel` ist Pflicht (greift schon über den vorhandenen
  Zweig), `expect` muss einer der zwei Werte sein, und eine fehlende `message`
  wird gemeldet — sie ist der Unterschied zwischen einer Auskunft und einer
  Diagnose (Regel 2).

**Abnahme.** `server/test/sequence-steps.test.js` wächst um die Fälle; der
vorhandene Test „a step type only has the fields its handler reads" bleibt grün.

---

## P3 — Das Feld `zoneLabel` bekommt im Editor einen Renderer

**Fund (neu, nicht in der Spec).** `SetupSequenceEditor.jsx` hat Renderer für
zwanzig Felder, aber **keinen für `zoneLabel`**. `fields.map(f => render[f]?.())`
zeichnet dafür nichts. Betroffen sind schon heute `reveal_next`, `rotate_zone`
und `clear_zone`: **ihre Quellzone lässt sich im Editor nicht setzen.** Das ist
Fund 14 in der Reihe aus `docs/audit-dead-controls.md` — und ohne die Behebung
wäre `require_zone` der vierte Fall.

**Umfang.** `client/src/components/SetupSequenceEditor.jsx`: ein Renderer
`zoneLabel` neben dem vorhandenen `targetZoneLabel` — dieselbe Auswahlliste,
aber ohne den leeren Eintrag (bei `zoneLabel` ist „keine" keine gültige Wahl,
das sagt `validateStep` schon). Dazu ein Renderer `expect` und einer für
`message`.

**Abnahme.** `npx vite build` im Client läuft durch; die Felder stehen in
`stepFields` und haben je einen Renderer (in P2s Test mitgeprüft, soweit ohne
Client-Testinfrastruktur möglich).

---

## P4 — Die zwei Einträge in der Produktionsdatenbank (Daten, kein Code)

**Umfang.** Keine Codeänderung. In `setups.action_data`:

1. **„Kampf beginnen"** bekommt als **neuen Schritt 1** (vor
   `clear_zone Nachschub-Auslage`):
   `require_zone` · Zone `Bösewicht-Tableau` · `expect: empty` ·
   Meldung „Erst die Dorfphase beginnen — der vorige Kampf steht noch."
2. **„Dorfphase beginnen"** bekommt als **neuen Schritt 1** (vor
   `clear_zone Bösewicht-Platz`):
   `require_zone` · Zone `Bösewicht-Tableau` · `expect: occupied` ·
   Meldung „Erst einen Kampf beginnen — es gibt noch nichts abzuräumen."

**Abnahme.** Die vier Punkte aus M9.3 am echten Tisch: zweimal „Kampf
beginnen" deckt beim zweiten Mal nichts auf, die Meldung sagt, was zu tun ist,
nach „Dorfphase beginnen" läuft alles unverändert, und der erste Kampf einer
Partie ist unverändert.
